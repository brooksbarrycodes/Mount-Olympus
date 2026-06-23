import { WORLD } from "./olympusWorld";

/**
 * Terrain blueprint for Mount Olympus, expressed on the tile grid. The scene
 * turns this into Phaser tilemap layers via the Autotiler. Coordinates are in
 * TILES (WORLD.tile px each). Keeping elevation/water here (separate from props
 * in olympusWorld.ts) means the mountain's shape can evolve without touching
 * scene logic.
 */

export const TILE = WORLD.tile;
export const COLS = Math.floor(WORLD.width / TILE); // 112
export const ROWS = Math.floor(WORLD.height / TILE); // 70

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A raised grass terrace. `x,y,w,h` is the surface; a cliff face `faceH` rows
 *  tall (default 3) is drawn below it. `gaps` cut walkable openings into that
 *  face; each carries a grand staircase that descends the full face height, so
 *  the cliff flanks the steps the whole way down (no open gap beside them). */
export interface Plateau extends TileRect {
  faceH?: number;
  gaps?: Array<{ x: number; w: number }>;
}

/**
 * Tiers that build the mountain. The summit terrace carries the sacred complex
 * (Temple of Zeus / future Pantheon) at the top-center; its front cliff has a
 * central gap aligned with the approach path so players climb up to it.
 */
export const plateaus: Plateau[] = [
  // Summit terrace — widened to tiles x44..69 (px 1408..2208) so the cypresses
  // and columns flanking the Pantheon sit fully on the terrace instead of hanging
  // off the edge. A tall 6-row cliff face (px 928..1120) gives it real mountain
  // height, with a monumental central staircase (10 wide, centered ~x1792) carved
  // into it from terrace down to the agora level.
  { x: 44, y: 12, w: 25, h: 17, faceH: 6, gaps: [{ x: 51, w: 10 }] },
];

/** Ponds flanking the sacred terrace — visible in the central play area. */
export const ponds: TileRect[] = [
  { x: 34, y: 24, w: 6, h: 5 }, // west of the terrace
  { x: 70, y: 24, w: 6, h: 5 }, // east of the terrace
];
