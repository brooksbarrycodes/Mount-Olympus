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
  // Interior furniture (large source art keyed down to room scale)
  [TX.councilTable]: 0.26,
  [TX.councilTableLong]: 0.265,
  [TX.throne]: 0.1,
  [TX.councilSeat]: 0.058,
  [TX.councilChairSide]: 0.055,
  [TX.commandDesk]: 0.11,
  [TX.candelabra]: 0.066,
  [TX.wallRelief]: 0.07,
};

/** Buildings / landmarks. `x,y` are world-space base (bottom-center) points. */
export const locations: LocationDef[] = [
  {
    id: "pantheon",
    name: "The Pantheon",
    textureKey: TX.pantheon,
    x: 1800,
    y: 760,
    scale: 0.46,
    enterable: true,
    description:
      "The grand seat of Olympus, crowning the peak: mission hall, ledger shrine, and approvals.",
    doorOffsetY: 30,
  },
  {
    id: "temple-zeus",
    name: "Temple of Zeus",
    textureKey: TX.templeZeus,
    x: 1330,
    y: 1150,
    scale: 0.34,
    enterable: true,
    description: "Zeus's sanctuary. Speak with the overseer and read his decrees.",
    doorOffsetY: 24,
  },
  {
    id: "temple-tyche",
    name: "Temple of Tyche",
    textureKey: TX.templeTyche,
    x: 2480,
    y: 1180,
    scale: 0.34,
    enterable: true,
    description: "Fortune's shrine and the cross-venue arb trading desk.",
    doorOffsetY: 24,
  },
];

/** Empty buildable plots advertising future growth (reserved god-regions). */
export const templePlots: Array<{ x: number; y: number }> = [
  { x: 2820, y: 1560 },
  { x: 760, y: 1760 },
  { x: 1240, y: 1900 },
  { x: 2380, y: 1860 },
];

/** Plaza areas (world-space). Each carries a painterly AI mosaic/garden floor
 *  overlay (organic edges blend onto grass); `floor` is the texture key. */
export const plazas: Array<{ x: number; y: number; w: number; h: number; floor: string }> = [
  // Pantheon terrace crowning the summit
  { x: 1490, y: 470, w: 620, h: 450, floor: TX.floorPantheon },
  // Temple of Zeus sanctuary terrace
  { x: 1130, y: 990, w: 410, h: 320, floor: TX.floorTemple },
  // Temple of Tyche — Fortune terrace (east agora)
  { x: 2330, y: 990, w: 340, h: 300, floor: TX.floorFortune },
  // Central agora
  { x: 1560, y: 1180, w: 480, h: 360, floor: TX.floorAgora },
  // Garden of the Muses (west)
  { x: 620, y: 1200, w: 320, h: 240, floor: TX.floorGarden },
];

/** Large painterly ground-detail patches (meadows, rocky outcrops, tilled fields)
 *  scattered across the open fields to kill empty grass and add charm. Positions
 *  are CENTERS; `w` is display width (height derived from each texture's aspect).
 *  These render below props/scatter so tufts and trees layer on top naturally. */
export const groundPatches: Array<{ key: string; x: number; y: number; w: number; flip?: boolean }> = [
  // --- west fields ---
  { key: TX.patchMeadow, x: 360, y: 600, w: 360 },
  { key: TX.patchRocks, x: 820, y: 470, w: 300 },
  { key: TX.patchField, x: 300, y: 1010, w: 300 },
  { key: TX.patchMeadow, x: 520, y: 1770, w: 380, flip: true },
  { key: TX.patchRocks, x: 980, y: 1900, w: 300, flip: true },
  { key: TX.patchField, x: 260, y: 1500, w: 280 },
  // --- east fields ---
  { key: TX.patchMeadow, x: 2780, y: 580, w: 360, flip: true },
  { key: TX.patchRocks, x: 3180, y: 860, w: 300 },
  { key: TX.patchField, x: 3180, y: 860, w: 300 },
  { key: TX.patchMeadow, x: 2640, y: 1520, w: 380 },
  { key: TX.patchRocks, x: 3180, y: 1800, w: 320, flip: true },
  { key: TX.patchField, x: 2480, y: 1880, w: 280, flip: true },
  // --- southern belt ---
  { key: TX.patchMeadow, x: 1480, y: 1820, w: 420 },
  { key: TX.patchRocks, x: 2080, y: 1880, w: 300 },
];

/** Aspect ratio (height / width) per patch texture, from the keyed source art. */
export const PATCH_RATIO: Record<string, number> = {
  [TX.patchMeadow]: 0.7,
  [TX.patchRocks]: 0.8,
  [TX.patchField]: 0.77,
};

/** Winding dirt roads as polylines; the scene stamps soft path patches along
 *  each so roads curve naturally (Stardew-style) instead of hard rectangles.
 *  The summit itself is reached by the grand staircase (see olympusBlueprint). */
export const pathways: Array<Array<{ x: number; y: number }>> = [
  // spawn -> agora -> foot of the grand staircase (stops at the foot; the stairs
  // themselves are marble, so the dirt road must not climb onto them)
  [
    { x: 1800, y: 1700 },
    { x: 1808, y: 1580 },
    { x: 1796, y: 1460 },
    { x: 1800, y: 1340 },
    { x: 1795, y: 1180 },
  ],
  // agora -> Temple of Zeus
  [
    { x: 1780, y: 1320 },
    { x: 1640, y: 1296 },
    { x: 1500, y: 1268 },
    { x: 1390, y: 1238 },
    { x: 1330, y: 1210 },
  ],
  // agora -> Garden of the Muses (west)
  [
    { x: 1640, y: 1330 },
    { x: 1420, y: 1372 },
    { x: 1160, y: 1356 },
    { x: 940, y: 1320 },
    { x: 800, y: 1300 },
  ],
  // agora -> eastern groves -> Temple of Tyche
  [
    { x: 2010, y: 1334 },
    { x: 2230, y: 1322 },
    { x: 2440, y: 1300 },
    { x: 2560, y: 1250 },
    { x: 2480, y: 1210 },
  ],
  // Temple of Zeus -> Garden of the Muses
  [
    { x: 1300, y: 1250 },
    { x: 1120, y: 1290 },
    { x: 940, y: 1300 },
    { x: 820, y: 1308 },
  ],
  // spawn -> southern shore (east)
  [
    { x: 1830, y: 1680 },
    { x: 2060, y: 1740 },
    { x: 2320, y: 1790 },
    { x: 2540, y: 1820 },
  ],
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
  // ---- Pantheon forecourt (crowning the summit terrace) ----
  { key: TX.statueLion, x: 1560, y: 905, solid: true },
  { key: TX.statueGriffin, x: 2040, y: 905, solid: true },
  { key: TX.brazier, x: 1690, y: 880, solid: true },
  { key: TX.brazier, x: 1910, y: 880, solid: true },
  { key: TX.altar, x: 1800, y: 905 },
  { key: TX.columnGold, x: 1500, y: 830, solid: true },
  { key: TX.columnGold, x: 2100, y: 830, solid: true },
  { key: TX.column, x: 1480, y: 640, solid: true },
  { key: TX.column, x: 2120, y: 640, solid: true },
  { key: TX.cypress, x: 1460, y: 560 },
  { key: TX.cypress, x: 2140, y: 560 },
  { key: TX.cypress, x: 1690, y: 510 },
  { key: TX.cypress, x: 1910, y: 510 },
  { key: TX.flowersWhite, x: 1620, y: 900 },
  { key: TX.flowersWhite, x: 1980, y: 900 },

  // ---- Temple of Zeus sanctuary ----
  { key: TX.column, x: 1170, y: 1070, solid: true },
  { key: TX.column, x: 1490, y: 1070, solid: true },
  { key: TX.brazierTripod, x: 1230, y: 1150, solid: true },
  { key: TX.brazierTripod, x: 1430, y: 1150, solid: true },
  { key: TX.statueGoddess, x: 1150, y: 1250, solid: true },
  { key: TX.statueHorse, x: 1520, y: 1250, solid: true },
  { key: TX.amphora, x: 1200, y: 1210 },
  { key: TX.amphora, x: 1470, y: 1210 },
  { key: TX.cypress, x: 1120, y: 1010 },
  { key: TX.cypress, x: 1540, y: 1010 },
  { key: TX.flowersPurple, x: 1260, y: 1230 },
  { key: TX.flowersPurple, x: 1410, y: 1230 },

  // ---- Temple of Tyche sanctuary (east agora) ----
  { key: TX.column, x: 2370, y: 1070, solid: true },
  { key: TX.column, x: 2590, y: 1070, solid: true },
  { key: TX.brazierTripod, x: 2410, y: 1150, solid: true },
  { key: TX.brazierTripod, x: 2550, y: 1150, solid: true },
  { key: TX.statueGoddess, x: 2410, y: 1250, solid: true },
  { key: TX.statueHorse, x: 2550, y: 1250, solid: true },
  { key: TX.cypress, x: 2320, y: 1010 },
  { key: TX.cypress, x: 2640, y: 1010 },
  { key: TX.amphora, x: 2420, y: 1210 },
  { key: TX.amphora, x: 2540, y: 1210 },
  { key: TX.flowersYellow, x: 2460, y: 1230 },
  { key: TX.flowersWhite, x: 2500, y: 1230 },

  // ---- Central agora ----
  // y pushed down so the basin (origin is bottom-center) sits concentric on the
  // sundial hub at world ~(1802,1366) rather than floating above it
  { key: TX.fountain, x: 1802, y: 1399, solid: true },
  { key: TX.statueGoddess, x: 1620, y: 1250, solid: true },
  { key: TX.statueAthena, x: 1980, y: 1250, solid: true },
  { key: TX.column, x: 1600, y: 1500, solid: true },
  { key: TX.column, x: 2000, y: 1500, solid: true },
  { key: TX.columnGold, x: 1600, y: 1230, solid: true },
  { key: TX.columnGold, x: 2000, y: 1230, solid: true },
  { key: TX.bush, x: 1690, y: 1500 },
  { key: TX.bush, x: 1910, y: 1500 },
  { key: TX.amphora, x: 1650, y: 1430 },
  { key: TX.amphora, x: 1950, y: 1430 },
  { key: TX.flowersPurple, x: 1720, y: 1300 },
  { key: TX.flowersYellow, x: 1880, y: 1300 },
  { key: TX.flowersYellow, x: 1700, y: 1420 },
  { key: TX.flowersPurple, x: 1900, y: 1420 },

  // ---- Garden of the Muses (west) ----
  { key: TX.pool, x: 700, y: 1320, solid: true },
  { key: TX.column, x: 620, y: 1250, solid: true },
  { key: TX.columnBroken, x: 900, y: 1250, solid: true },
  { key: TX.statueHorse, x: 760, y: 1410, solid: true },
  { key: TX.blossomTree, x: 560, y: 1240 },
  { key: TX.oliveTree, x: 920, y: 1380 },
  { key: TX.flowersPurple, x: 640, y: 1380 },
  { key: TX.flowersWhite, x: 820, y: 1380 },
  { key: TX.flowersYellow, x: 700, y: 1250 },
  { key: TX.bush, x: 600, y: 1420 },
  { key: TX.bush, x: 880, y: 1420 },

  // ---- NW forest ----
  { key: TX.cypress, x: 300, y: 640 },
  { key: TX.oliveTree, x: 440, y: 560 },
  { key: TX.treeGreen, x: 600, y: 640 },
  { key: TX.cypress, x: 220, y: 820 },
  { key: TX.oliveTree, x: 380, y: 900 },
  { key: TX.treeGreen, x: 560, y: 860 },
  { key: TX.blossomTree, x: 720, y: 760 },
  { key: TX.treeGreen, x: 180, y: 1080 },
  { key: TX.oliveTree, x: 360, y: 1160 },
  { key: TX.cypress, x: 540, y: 1120 },
  { key: TX.bush, x: 300, y: 980 },
  { key: TX.bush, x: 660, y: 980 },
  { key: TX.rock, x: 480, y: 760 },
  { key: TX.stump, x: 620, y: 1080 },
  { key: TX.flowersWhite, x: 420, y: 700 },
  { key: TX.flowersYellow, x: 560, y: 1000 },

  // ---- SW woods ----
  { key: TX.cypress, x: 260, y: 1420 },
  { key: TX.oliveTree, x: 440, y: 1560 },
  { key: TX.treeGreen, x: 620, y: 1640 },
  { key: TX.blossomTree, x: 380, y: 1720 },
  { key: TX.treeGreen, x: 820, y: 1700 },
  { key: TX.oliveTree, x: 1020, y: 1640 },
  { key: TX.cypress, x: 200, y: 1640 },
  { key: TX.bush, x: 520, y: 1680 },
  { key: TX.bush, x: 720, y: 1560 },
  { key: TX.rock, x: 340, y: 1560 },
  { key: TX.columnBroken, x: 480, y: 1760 },
  { key: TX.flowersPurple, x: 640, y: 1720 },

  // ---- NE forest + olive hills ----
  { key: TX.oliveTree, x: 2360, y: 600 },
  { key: TX.cypress, x: 2540, y: 680 },
  { key: TX.treeGreen, x: 2720, y: 760 },
  { key: TX.oliveTree, x: 2900, y: 640 },
  { key: TX.cypress, x: 3080, y: 760 },
  { key: TX.treeGreen, x: 2480, y: 900 },
  { key: TX.blossomTree, x: 2680, y: 980 },
  { key: TX.oliveTree, x: 2960, y: 980 },
  { key: TX.bush, x: 2560, y: 820 },
  { key: TX.bush, x: 2860, y: 860 },
  { key: TX.rock, x: 2460, y: 760 },
  { key: TX.stump, x: 2780, y: 880 },
  { key: TX.flowersYellow, x: 2620, y: 720 },
  { key: TX.flowersWhite, x: 2980, y: 880 },

  // ---- E / SE groves near the shore ----
  { key: TX.cypress, x: 2520, y: 1240 },
  { key: TX.oliveTree, x: 2720, y: 1320 },
  { key: TX.blossomTree, x: 2520, y: 1460 },
  { key: TX.treeGreen, x: 2740, y: 1540 },
  { key: TX.oliveTree, x: 2400, y: 1640 },
  { key: TX.cypress, x: 2640, y: 1720 },
  { key: TX.treeGreen, x: 2940, y: 1300 },
  { key: TX.bush, x: 2480, y: 1360 },
  { key: TX.bush, x: 2820, y: 1440 },
  { key: TX.rock, x: 2600, y: 1180 },
  { key: TX.columnBroken, x: 2520, y: 1720 },
  { key: TX.flowersPurple, x: 2680, y: 1620 },

  // ---- S meadow band (between agora and spawn) ----
  { key: TX.treeGreen, x: 1480, y: 1740 },
  { key: TX.oliveTree, x: 2120, y: 1720 },
  { key: TX.blossomTree, x: 1320, y: 1640 },
  { key: TX.cypress, x: 2240, y: 1640 },
  { key: TX.bush, x: 1560, y: 1640 },
  { key: TX.bush, x: 2080, y: 1600 },
  { key: TX.flowersYellow, x: 1640, y: 1680 },
  { key: TX.flowersWhite, x: 2000, y: 1700 },
  { key: TX.rock, x: 1400, y: 1560 },

  // ---- mid-field copses to break open space ----
  { key: TX.treeGreen, x: 1180, y: 760 },
  { key: TX.cypress, x: 1060, y: 620 },
  { key: TX.oliveTree, x: 1280, y: 900 },
  { key: TX.bush, x: 1160, y: 980 },
  { key: TX.blossomTree, x: 2300, y: 1080 },
  { key: TX.bush, x: 2340, y: 1180 },
  { key: TX.rock, x: 1120, y: 1440 },
  { key: TX.flowersPurple, x: 1040, y: 900 },
];
