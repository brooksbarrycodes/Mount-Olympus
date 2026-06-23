import type { OppDef, OppDialogData } from "@/types/game";
import { locations } from "./world/olympusWorld";
import { agentApi } from "@/net/agentApi";

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
 * Zeus, the Oracle, and Apollo) and gracefully falling back to the local mock
 * if the server is unreachable or the Opp has no backend agent. This is what
 * makes the gods "real" while keeping the game fully playable offline.
 */
export async function resolveReply(def: OppDef, message: string): Promise<string> {
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
