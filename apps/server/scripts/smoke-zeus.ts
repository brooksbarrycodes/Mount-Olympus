/**
 * Backend smoke test for live Zeus. Run while the agent server is up:
 *   npm run smoke:zeus --workspace apps/server
 */

const BASE = (process.env.AGENT_API ?? "http://localhost:8787").replace(/\/$/, "");

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg: string): void {
  console.log(`OK: ${msg}`);
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) fail(`GET ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `${res.status}`;
    try {
      const err = (await res.json()) as { error?: string };
      if (err.error) detail = err.error;
    } catch {
      /* ignore */
    }
    fail(`POST ${path} -> ${detail}`);
  }
  return (await res.json()) as T;
}

interface Health {
  ok: boolean;
  adapterMode: string;
  llmLive: boolean;
}

interface ZeusResponse {
  reply: string;
  toolsUsed: string[];
  costUsd: number;
  provider: "mock" | "anthropic";
  llmLive: boolean;
  sessionId?: number;
}

interface SessionSummary {
  id: number;
  title: string;
  messageCount: number;
}

interface SessionDetail {
  session: {
    id: number;
    title: string;
    messageCount: number;
    messages: { role: string; content: string }[];
  };
}

async function main(): Promise<void> {
  console.log(`Smoke-testing Zeus at ${BASE}\n`);

  const health = await get<Health>("/health");
  if (!health.ok) fail("/health returned ok:false");
  ok(`/health ok (adapterMode=${health.adapterMode}, llmLive=${health.llmLive})`);

  if (!health.llmLive) {
    fail("llmLive is false — set ADAPTER_MODE=real and ANTHROPIC_API_KEY in apps/server/.env, then restart");
  }

  const { session } = await post<{ session: SessionSummary }>("/zeus/sessions", {});
  const sessionId = session.id;
  ok(`created session ${sessionId}`);

  const ping = await post<ZeusResponse>("/zeus/message", {
    sessionId,
    message: "Are you connected to a real model? Answer in one sentence, plainly.",
  });

  if (ping.provider !== "anthropic") fail(`expected provider anthropic, got ${ping.provider}`);
  if (ping.costUsd <= 0) fail(`expected costUsd > 0, got ${ping.costUsd}`);
  if (/archon/i.test(ping.reply)) fail("reply contains stylized 'Archon' language");
  if (/mock council voice/i.test(ping.reply)) fail("reply contains mock template footer");
  ok(`live reply (${ping.costUsd.toFixed(4)} USD): ${ping.reply.slice(0, 120)}…`);

  const ledger = await post<ZeusResponse>("/zeus/message", {
    sessionId,
    message: "Use your ledger_summary tool and tell me our exact profit and margin right now.",
  });

  const hasLedgerTool = ledger.toolsUsed.includes("ledger_summary");
  const hasNumbers = /\$[\d,]+/.test(ledger.reply) && /margin/i.test(ledger.reply);
  if (!hasLedgerTool && !hasNumbers) {
    fail(`expected ledger tool or financial figures in reply, tools=[${ledger.toolsUsed.join(", ")}]`);
  }
  ok(`ledger check passed (tool=${hasLedgerTool}); snippet: ${ledger.reply.slice(0, 120)}…`);

  const memory = await post<ZeusResponse>("/zeus/message", {
    sessionId,
    message: "Remember this: my codename for this test is SmokeBrook. Reply with OK only.",
  });
  if (!/ok/i.test(memory.reply)) {
    fail(`expected short OK acknowledgment, got: ${memory.reply.slice(0, 80)}`);
  }
  ok("stored context message in session");

  const recall = await post<ZeusResponse>("/zeus/message", {
    sessionId,
    message: "What codename did I give you in this chat?",
  });
  if (!/smokebrook/i.test(recall.reply)) {
    fail(`expected Zeus to recall SmokeBrook from session context, got: ${recall.reply.slice(0, 120)}`);
  }
  ok(`session memory works: ${recall.reply.slice(0, 80)}…`);

  const { sessions } = await get<{ sessions: SessionSummary[] }>("/zeus/sessions");
  const found = sessions.find((s) => s.id === sessionId);
  if (!found) fail("session not found in list");
  if (found.messageCount < 6) fail(`expected at least 6 messages stored, got ${found.messageCount}`);
  if (found.title === "New chat") fail("expected session title to be set after first exchange");
  ok(`session listed with title "${found.title}" (${found.messageCount} messages)`);

  const detail = await get<SessionDetail>(`/zeus/sessions/${sessionId}`);
  if (detail.session.messages.length < 6) {
    fail(`expected at least 6 messages in session detail, got ${detail.session.messages.length}`);
  }
  ok(`GET /zeus/sessions/:id returned ${detail.session.messages.length} messages`);

  const bad = await fetch(`${BASE}/zeus/message`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ message: "no session id" }),
  });
  if (bad.status !== 404) fail(`expected 404 without sessionId, got ${bad.status}`);
  ok("rejects message without sessionId");

  const openingSession = (await post<{ session: SessionSummary }>("/zeus/sessions", {})).session;
  const before = (await get<SessionDetail>(`/zeus/sessions/${openingSession.id}`)).session
    .messages.length;
  const opening = await post<{ text: string; sessionId: number }>("/zeus/opening", {
    sessionId: openingSession.id,
  });
  if (!opening.text.trim()) fail("opening text was empty");
  if (!/brooks/i.test(opening.text)) fail(`opening should address Brooks, got: ${opening.text}`);
  const after = (await get<SessionDetail>(`/zeus/sessions/${openingSession.id}`)).session.messages
    .length;
  if (after !== before + 1) fail(`expected opening to append one message, ${before} -> ${after}`);
  ok(`opening: ${opening.text.slice(0, 80)}…`);

  const ttsRes = await fetch(`${BASE}/zeus/tts`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ text: "Hello Brooks, systems are online." }),
  });
  if (ttsRes.status === 502) {
    const err = (await ttsRes.json()) as { error?: string };
    console.log(`SKIP: TTS not configured (${err.error ?? "no key"})`);
  } else if (!ttsRes.ok) {
    fail(`POST /zeus/tts -> ${ttsRes.status}`);
  } else {
    const buf = Buffer.from(await ttsRes.arrayBuffer());
    if (buf.length < 100) fail(`expected mp3 bytes, got ${buf.length}`);
    ok(`TTS returned ${buf.length} bytes (audio/mpeg)`);
  }

  console.log("\nAll Zeus smoke checks passed.");
}

main().catch((err) => {
  console.error("FAIL:", err);
  process.exit(1);
});
