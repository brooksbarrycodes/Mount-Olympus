/**
 * Smoke test for treasury + missions REST endpoints.
 * Run while the agent server is up:
 *   npm run smoke:treasury --workspace apps/server
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
  if (!res.ok) fail(`POST ${path} -> ${res.status}`);
  return (await res.json()) as T;
}

async function main(): Promise<void> {
  const summary = await get<{ balance: number; negative: boolean }>("/treasury/summary");
  ok(`treasury summary balance=${summary.balance} negative=${summary.negative}`);

  await post("/treasury/cost", {
    label: "Smoke test cost",
    amountUsd: 0.01,
    category: "other",
    attributedGodId: "archon",
  });
  ok("recorded manual cost");

  const { entries } = await get<{ entries: Array<{ label: string }> }>("/treasury/entries");
  assertEntry(entries, "Smoke test cost");

  const { missions } = await get<{ missions: Array<{ id: number; title: string }> }>("/missions");
  ok(`missions list (${missions.length} active)`);

  await post("/missions", { title: "Smoke mission", dueInDays: 3 });
  const after = await get<{ missions: Array<{ title: string }> }>("/missions");
  assertEntry(after.missions, "Smoke mission");
  ok("created mission");

  console.log("All treasury smoke checks passed.");
}

function assertEntry<T extends { label?: string; title?: string }>(
  list: T[],
  needle: string,
): void {
  if (!list.some((e) => e.label === needle || e.title === needle)) {
    fail(`expected entry "${needle}" not found`);
  }
}

void main().catch((err) => fail(String(err)));
