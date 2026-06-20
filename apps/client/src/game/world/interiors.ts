import { TX } from "../art/keys";

/**
 * Interior room definitions for enterable buildings. Foundational for v1: each
 * is a bounded marble room dressed with props + labeled placards that name the
 * features coming later (mission board, ledger shrine, decree board, etc.).
 * Driven by data so new interiors are added without touching the scene.
 */

export interface InteriorProp {
  key: string;
  x: number;
  y: number;
  /** Optional display scale override (else PROP_SCALE default). */
  scale?: number;
}

export interface Placard {
  x: number;
  y: number;
  title: string;
  subtitle: string;
}

export interface InteriorDef {
  id: string;
  name: string;
  width: number;
  height: number;
  accent: string;
  /** Where the player appears when entering. */
  entry: { x: number; y: number };
  /** The exit mat (walk here + E to leave). */
  exit: { x: number; y: number };
  props: InteriorProp[];
  placards: Placard[];
  /** An Opp present inside this room (by id), with a position. */
  occupant?: { oppId: string; x: number; y: number };
}

export const interiors: Record<string, InteriorDef> = {
  hq: {
    id: "hq",
    name: "Main Headquarters",
    width: 640,
    height: 460,
    accent: "#3a5d9c",
    entry: { x: 320, y: 400 },
    exit: { x: 320, y: 432 },
    props: [
      { key: TX.column, x: 96, y: 150 },
      { key: TX.column, x: 544, y: 150 },
      { key: TX.brazier, x: 150, y: 210 },
      { key: TX.brazier, x: 490, y: 210 },
      { key: TX.amphora, x: 120, y: 360 },
      { key: TX.amphora, x: 520, y: 360 },
    ],
    placards: [
      { x: 200, y: 150, title: "Mission Board", subtitle: "Active directives & queue" },
      { x: 320, y: 130, title: "Ledger Shrine", subtitle: "Drachma income & spend" },
      { x: 440, y: 150, title: "Approvals Table", subtitle: "Pending Opp requests" },
      { x: 320, y: 240, title: "Command Upgrades", subtitle: "Coming soon" },
    ],
  },
  "temple-zeus": {
    id: "temple-zeus",
    name: "Temple of Zeus",
    width: 700,
    height: 480,
    accent: "#f5c84c",
    entry: { x: 350, y: 420 },
    exit: { x: 350, y: 452 },
    props: [
      { key: TX.column, x: 110, y: 150 },
      { key: TX.column, x: 250, y: 150 },
      { key: TX.column, x: 450, y: 150 },
      { key: TX.column, x: 590, y: 150 },
      { key: TX.brazier, x: 250, y: 250 },
      { key: TX.brazier, x: 450, y: 250 },
      { key: TX.altar, x: 350, y: 230 },
      { key: TX.statueGoddess, x: 150, y: 330 },
      { key: TX.statueAthena, x: 550, y: 330 },
    ],
    placards: [
      { x: 350, y: 120, title: "Throne of Zeus", subtitle: "The overseer presides" },
      { x: 350, y: 320, title: "Decree Board", subtitle: "Pantheon-wide orders" },
    ],
    occupant: { oppId: "zeus", x: 350, y: 280 },
  },
};
