import type { OppDef, OppDialogData } from "@/types/game";
import { locations } from "./world/olympusWorld";

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
 * Mock reply generator. Real Opps will plug their own reasoning in here later;
 * for now Zeus answers in-character with light awareness of the message.
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
