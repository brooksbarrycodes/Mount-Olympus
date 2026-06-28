import type { OppDef, OppDialogData } from "@/types/game";
import { locations } from "./world/olympusWorld";
import { agentApi } from "@/net/agentApi";

/** Map server session messages to the in-dialog chat thread. */
export function sessionToChatMessages(
  messages: { role: "user" | "assistant"; content: string }[],
  greeting: string,
): { from: "you" | "opp"; text: string }[] {
  if (messages.length === 0) return [{ from: "opp", text: greeting }];
  return messages.map((m) => ({
    from: m.role === "user" ? ("you" as const) : ("opp" as const),
    text: m.content,
  }));
}

/** Send a Zeus message within a session and return the reply text (with error surfacing). */
export async function resolveZeusReply(sessionId: number, message: string): Promise<string> {
  try {
    const res = await agentApi.zeusMessage(sessionId, message);
    if (!res.reply?.trim()) {
      return "Zeus returned an empty reply. Try again.";
    }
    if (res.provider === "mock") {
      return (
        `[Offline mock mode — set ADAPTER_MODE=real and ANTHROPIC_API_KEY in apps/server/.env, then restart.]\n\n` +
        res.reply
      );
    }
    return res.reply;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return (
      `Couldn't reach Zeus (${msg}). ` +
      `Make sure npm run dev is running and http://localhost:8787/health shows llmLive: true.`
    );
  }
}

/** Build the payload the React dialog needs from an Opp definition. */
export function buildOppDialogData(def: OppDef): OppDialogData {
  const home = def.homeLocationId
    ? locations.find((l) => l.id === def.homeLocationId)
    : undefined;

  return {
    oppId: def.id,
    name: def.name,
    title: def.title,
    domain: def.domain,
    accent: def.accent,
    status: def.status,
    activity: def.activity,
    task: def.task,
    textureKey: def.textureKey,
    greeting: def.greeting,
    enterTemple: home ? { locationId: home.id, label: `Enter ${home.name}` } : undefined,
  };
}

/**
 * Resolve an Opp's reply, preferring the live agent server (real reasoning for
 * Zeus, the Oracle, and Apollo). Zeus never falls back to stylized offline mock
 * lines — errors and mock-mode are surfaced clearly instead.
 */
export async function resolveReply(def: OppDef, message: string, sessionId?: number): Promise<string> {
  if (def.id === "zeus") {
    if (sessionId === undefined) {
      return "No active chat session. Close and reopen the dialog, or start a new chat.";
    }
    return resolveZeusReply(sessionId, message);
  }

  try {
    const reply = await agentApi.replyFor(def.id, message);
    if (reply && reply.trim()) return reply;
  } catch {
    // server down or errored -> fall through to the offline mock
  }
  return generateReply(def, message);
}

/**
 * Mock reply generator. Used as the offline fallback for `resolveReply` and for
 * Opps that have no backend agent yet.
 */
export function generateReply(def: OppDef, message: string): string {
  const m = message.toLowerCase().trim();

  if (/(profit|drachma|money|earn|revenue)/.test(m)) {
    return "Drachmas flow to those who plan. I will route the next venture to a worthy Opp.";
  }
  if (/(help|how|what can|who are you)/.test(m)) {
    return `I am ${def.name}. I oversee the Pantheon and assign missions. Summon allies, and I shall command them.`;
  }
  if (/(task|mission|work|do)/.test(m)) {
    return `My current decree: ${def.task ?? def.activity} It proceeds well.`;
  }
  if (/(hello|hi|hey|greetings)/.test(m)) {
    return "Greetings, Archon. Olympus heeds your will.";
  }
  if (m.length === 0) {
    return "Speak, and Olympus listens.";
  }
  return "So it shall be. The Pantheon bends to your command, Archon.";
}

/**
 * A council-meeting response, spoken in-character about the Archon's topic. Each
 * god frames the topic through their own domain/business so the discussion reads
 * like a real council. Swap for live model output later.
 */
export function councilReply(def: OppDef, topic: string): string {
  const t = topic.toLowerCase().trim();
  const domain = def.businessId ?? "venture";
  const lead = `${def.name} of the ${domain}:`;

  if (t.length === 0) {
    return `${lead} name the matter, Archon, and I shall counsel you.`;
  }
  if (/(profit|revenue|money|drachma|margin|sales)/.test(t)) {
    return `${lead} my ledgers trend upward. I can squeeze more margin if you let me reprice.`;
  }
  if (/(cost|expense|spend|budget|cut)/.test(t)) {
    return `${lead} I will trim what I can without starving growth. Give me a target and it is done.`;
  }
  if (/(grow|growth|scale|expand|launch|new)/.test(t)) {
    return `${lead} I am ready to expand. Point me at the opportunity and I will seize it.`;
  }
  if (/(risk|problem|issue|delay|fail)/.test(t)) {
    return `${lead} there are risks, but none I cannot weather with your backing.`;
  }
  return `${lead} on "${topic}" — ${def.task ?? def.activity} I will align it to your will.`;
}
