import type { OppDef } from "@/types/game";
import { TX } from "../art/keys";

/**
 * Mock Opp roster. First version ships Zeus (the overseer). Adding future Opps
 * is purely data: give them a spawn, texture, chatter, and status. The scene,
 * interaction system, speech bubbles, and Hall of Allies all read from here.
 */
export const opps: OppDef[] = [
  {
    id: "zeus",
    name: "Zeus",
    title: "King of Olympus - Pantheon Overseer",
    domain: "Oversees every Opp, sets decrees, and routes missions.",
    textureKey: TX.zeus,
    accent: "#f5c84c",
    spawn: { x: 1760, y: 880 },
    wanderRadius: 56,
    status: "overseeing",
    activity: "Surveying Olympus and issuing decrees to the Pantheon.",
    task: "Decree: Establish the Olympus command network",
    greeting:
      "Welcome, Archon. Olympus is yours to command. Build your Hall, and the Pantheon shall follow.",
    homeLocationId: "temple-zeus",
    chatter: [
      "The Pantheon stirs...",
      "Build your Hall with care.",
      "I am watching every Opp.",
      "Drachmas shall flow like rivers.",
      "Summon your allies when ready.",
    ],
  },
];

export function getOpp(id: string): OppDef | undefined {
  return opps.find((o) => o.id === id);
}
