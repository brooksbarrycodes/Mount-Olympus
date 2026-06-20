import type { LocationDef } from "@/types/game";
import { TX } from "../art/keys";

/**
 * Data-driven description of Mount Olympus. The scene renders entirely from this
 * file, so adding temples/props/plazas later never requires touching scene
 * logic. The map is a wide rectangle (not square) with generous room to grow:
 * the Temple of Zeus crowns a marble terrace up top, the Main HQ sits to the
 * west, and a central agora with a grand fountain links them.
 */

export const WORLD = {
  width: 3600,
  height: 2240,
  tile: 32,
} as const;

export const PLAYER_SPAWN = { x: 1800, y: 1660 } as const;

/** Default display scale per prop texture (sprites are large source art). */
export const PROP_SCALE: Record<string, number> = {
  [TX.column]: 0.42,
  [TX.columnGold]: 0.42,
  [TX.columnIonic]: 0.42,
  [TX.columnBroken]: 0.4,
  [TX.statue]: 0.38,
  [TX.statueZeus]: 0.52,
  [TX.statueLion]: 0.42,
  [TX.statueGriffin]: 0.42,
  [TX.statueGoddess]: 0.4,
  [TX.statueHorse]: 0.44,
  [TX.statueAthena]: 0.4,
  [TX.fountain]: 0.46,
  [TX.fountainJet]: 0.46,
  [TX.pool]: 0.46,
  [TX.brazier]: 0.34,
  [TX.brazierTripod]: 0.38,
  [TX.cypress]: 0.46,
  [TX.oliveTree]: 0.6,
  [TX.blossomTree]: 0.52,
  [TX.treeGreen]: 0.6,
  [TX.bush]: 0.7,
  [TX.rock]: 1.6,
  [TX.stump]: 1.0,
  [TX.altar]: 1.0,
  [TX.amphora]: 1.0,
};

/** Buildings / landmarks. `x,y` are world-space base (bottom-center) points. */
export const locations: LocationDef[] = [
  {
    id: "temple-zeus",
    name: "Temple of Zeus",
    textureKey: TX.templeZeus,
    x: 1800,
    y: 640,
    scale: 0.92,
    enterable: true,
    description: "A grand sanctuary crowning Olympus. Speak with Zeus and read his decrees.",
    doorOffsetY: 26,
  },
  {
    id: "hq",
    name: "Main Headquarters",
    textureKey: TX.headquarters,
    x: 880,
    y: 1180,
    scale: 0.85,
    enterable: true,
    description: "Your command hall: mission board, ledger shrine, approvals.",
    doorOffsetY: 24,
  },
];

/** Empty buildable plots advertising future growth (reserved god-regions). */
export const templePlots: Array<{ x: number; y: number }> = [
  { x: 2900, y: 760 },
  { x: 3120, y: 1180 },
  { x: 2820, y: 1560 },
  { x: 760, y: 1760 },
  { x: 1240, y: 1900 },
  { x: 2380, y: 1860 },
];

/** Marble plaza rectangles (world-space), drawn over the grass base. */
export const plazas: Array<{ x: number; y: number; w: number; h: number }> = [
  // Temple of Zeus terrace (sacred heart of Olympus)
  { x: 1480, y: 520, w: 640, h: 420 },
  // Central agora
  { x: 1560, y: 1180, w: 480, h: 360 },
  // HQ forecourt
  { x: 700, y: 1180, w: 360, h: 260 },
];

/** Path segments (world-space rectangles) connecting key places. */
export const paths: Array<{ x: number; y: number; w: number; h: number }> = [
  { x: 1770, y: 940, w: 60, h: 260 }, // temple -> agora
  { x: 1060, y: 1280, w: 520, h: 56 }, // HQ -> agora
  { x: 1770, y: 1500, w: 60, h: 200 }, // agora -> spawn
  { x: 1280, y: 1500, w: 540, h: 52 }, // agora -> west groves
];

export interface DecorItem {
  key: string;
  x: number;
  y: number;
  /** Optional per-item display scale override (else PROP_SCALE default). */
  scale?: number;
  /** If set, this prop blocks movement (collider at its base). */
  solid?: boolean;
}

/** Decorative + interactive-looking props. Origin is bottom-center per item. */
export const decor: DecorItem[] = [
  // ---- Temple of Zeus terrace ----
  { key: TX.statueZeus, x: 1800, y: 770, solid: true },
  { key: TX.brazier, x: 1610, y: 770, solid: true },
  { key: TX.brazier, x: 1990, y: 770, solid: true },
  { key: TX.statueLion, x: 1520, y: 900, solid: true },
  { key: TX.statueGriffin, x: 2080, y: 900, solid: true },
  { key: TX.column, x: 1540, y: 600, solid: true },
  { key: TX.column, x: 2060, y: 600, solid: true },
  { key: TX.columnGold, x: 1540, y: 760, solid: true },
  { key: TX.columnGold, x: 2060, y: 760, solid: true },
  { key: TX.altar, x: 1800, y: 900 },
  { key: TX.cypress, x: 1470, y: 560 },
  { key: TX.cypress, x: 2130, y: 560 },
  { key: TX.cypress, x: 1700, y: 520 },
  { key: TX.cypress, x: 1900, y: 520 },

  // ---- Central agora ----
  { key: TX.fountain, x: 1800, y: 1340, solid: true },
  { key: TX.statueGoddess, x: 1620, y: 1240, solid: true },
  { key: TX.statueAthena, x: 1980, y: 1240, solid: true },
  { key: TX.column, x: 1600, y: 1480, solid: true },
  { key: TX.column, x: 2000, y: 1480, solid: true },
  { key: TX.bush, x: 1700, y: 1500 },
  { key: TX.bush, x: 1900, y: 1500 },
  { key: TX.amphora, x: 1640, y: 1420 },
  { key: TX.amphora, x: 1960, y: 1420 },

  // ---- HQ forecourt ----
  { key: TX.column, x: 740, y: 1220, solid: true },
  { key: TX.column, x: 1020, y: 1220, solid: true },
  { key: TX.brazierTripod, x: 760, y: 1320, solid: true },
  { key: TX.brazierTripod, x: 1000, y: 1320, solid: true },
  { key: TX.statueHorse, x: 880, y: 1400, solid: true },
  { key: TX.pool, x: 620, y: 1360, solid: true },
  { key: TX.amphora, x: 700, y: 1260 },
  { key: TX.amphora, x: 1060, y: 1260 },

  // ---- Groves & nature (frames the playable space) ----
  { key: TX.cypress, x: 360, y: 720 },
  { key: TX.oliveTree, x: 520, y: 640 },
  { key: TX.treeGreen, x: 680, y: 700 },
  { key: TX.oliveTree, x: 240, y: 1020 },
  { key: TX.cypress, x: 300, y: 1320 },
  { key: TX.treeGreen, x: 460, y: 1560 },
  { key: TX.oliveTree, x: 640, y: 1640 },
  { key: TX.blossomTree, x: 980, y: 1620 },
  { key: TX.treeGreen, x: 1180, y: 760 },
  { key: TX.cypress, x: 1080, y: 600 },
  { key: TX.oliveTree, x: 2380, y: 640 },
  { key: TX.cypress, x: 2560, y: 720 },
  { key: TX.treeGreen, x: 2720, y: 980 },
  { key: TX.blossomTree, x: 2500, y: 1240 },
  { key: TX.oliveTree, x: 2680, y: 1480 },
  { key: TX.cypress, x: 2400, y: 1640 },
  { key: TX.treeGreen, x: 1500, y: 1780 },
  { key: TX.oliveTree, x: 2100, y: 1760 },
  { key: TX.blossomTree, x: 1300, y: 1180 },

  { key: TX.bush, x: 1280, y: 1000 },
  { key: TX.bush, x: 2320, y: 1020 },
  { key: TX.bush, x: 1480, y: 1640 },
  { key: TX.bush, x: 2160, y: 1500 },
  { key: TX.stump, x: 520, y: 880 },
  { key: TX.stump, x: 2600, y: 1180 },
  { key: TX.rock, x: 1180, y: 1420 },
  { key: TX.rock, x: 2460, y: 880 },
  { key: TX.rock, x: 700, y: 980 },
  { key: TX.columnBroken, x: 2520, y: 1700 },
  { key: TX.columnBroken, x: 420, y: 1700 },
];
