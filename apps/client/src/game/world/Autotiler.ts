import Phaser from "phaser";
import type { Plateau, TileRect } from "./olympusBlueprint";

/**
 * Stamps terrain into Phaser tilemap layers using tile indices verified offline
 * against the source sheets (see tools/rendertest.py). Each layer is backed by a
 * single tileset so a tile index equals row*columns+col within that sheet.
 */

const G_COLS = 33;
const R_COLS = 42;
const W_COLS = 24;
const S_COLS = 48;

const gi = (c: number, r: number) => r * G_COLS + c;
const ri = (c: number, r: number) => r * R_COLS + c;
const wi = (c: number, r: number) => r * W_COLS + c;
const si = (c: number, r: number) => r * S_COLS + c;

/** ground.png — plain fills. */
export const GROUND = {
  grass: gi(21, 5),
  grass2: gi(23, 5),
  dark: gi(21, 9),
  dirt: gi(21, 13),
} as const;

/**
 * rocky.png — plateau pieces. The grass top uses a back rim + body rows; the
 * front cliff face is built from three source rows (top transition / mid wall /
 * base) where the mid wall repeats so the face can be any height.
 */
const ROCKY = {
  rim: [ri(5, 0), ri(6, 0), ri(9, 0)], // [left, mid, right]
  body: [ri(5, 1), ri(6, 1), ri(9, 1)],
  faceCols: [5, 6, 9] as const, // left / mid / right columns of the cliff face
  faceRow: (i: number, h: number) => (i === 0 ? 4 : i === h - 1 ? 6 : 5),
  faceTile: (tri: number, i: number, h: number) =>
    ri(ROCKY.faceCols[tri], ROCKY.faceRow(i, h)),
} as const;

/** water.png — self-contained pond (open water + shallow shore ring). */
const POND = {
  tl: wi(0, 3), t: wi(1, 3), tr: wi(2, 3),
  l: wi(0, 4), c: wi(1, 4), r: wi(2, 4),
  bl: wi(0, 5), b: wi(1, 5), br: wi(2, 5),
} as const;

/**
 * greek_stairs.png — a 6-wide grand marble staircase descending southward
 * (post | 4 treads | post). Three source rows give the top, a repeatable tread,
 * and the bottom, so it can fill a cliff face of any height.
 */
const STAIRS = {
  rows: { top: 5, tread: 7, bottom: 10 },
  // left balustrade post | repeated seamless tread (col 3) | right post
  col: (j: number, w: number) => (j === 0 ? 1 : j === w - 1 ? 6 : 3),
} as const;

const DEFAULT_FACE_ROWS = 3;

/** Axis-aligned collider box in world pixels (center + size). */
export interface Box {
  cx: number;
  cy: number;
  w: number;
  h: number;
}

type Layer = Phaser.Tilemaps.TilemapLayer;

/** Fill the base ground layer with grass + light, deterministic variation. */
export function paintGround(layer: Layer, cols: number, rows: number, seed = 1337): void {
  let s = seed;
  const rng = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const roll = rng();
      const idx = roll > 0.86 ? GROUND.grass2 : GROUND.grass;
      layer.putTileAt(idx, x, y);
    }
  }
}

function colPick<T>(x: number, x0: number, x1: number, left: T, mid: T, right: T): T {
  if (x === x0) return left;
  if (x === x1) return right;
  return mid;
}

/**
 * Stamp a raised plateau. `p` describes the grass SURFACE (in tiles); a 3-row
 * cliff face is drawn directly below it. Returns colliders for the face (minus
 * any gaps) and the left/right drop-off walls. tile = pixel size of one tile.
 */
export function stampPlateau(
  layer: Layer,
  stairsLayer: Layer | null,
  p: Plateau,
  tile = 32,
): Box[] {
  const x0 = p.x;
  const x1 = p.x + p.w - 1;
  const y0 = p.y;
  const y1 = p.y + p.h - 1;

  const faceRows = Math.max(2, p.faceH ?? DEFAULT_FACE_ROWS);

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const idx =
        y === y0
          ? colPick(x, x0, x1, ROCKY.rim[0], ROCKY.rim[1], ROCKY.rim[2])
          : colPick(x, x0, x1, ROCKY.body[0], ROCKY.body[1], ROCKY.body[2]);
      layer.putTileAt(idx, x, y);
    }
  }

  const isGap = (x: number) =>
    (p.gaps ?? []).some((g) => x >= g.x && x < g.x + g.w);

  // front cliff face (any height); the mid wall row repeats so a tall cliff
  // flanks the staircase its full height. The wall is rendered UNDER the gap too
  // (not skipped): the staircase draws on top, so its transparent balustrade
  // edges reveal stone wall rather than the grass layer beneath.
  for (let i = 0; i < faceRows; i++) {
    const yy = y1 + 1 + i;
    for (let x = x0; x <= x1; x++) {
      const tri = colPick(x, x0, x1, 0, 1, 2);
      layer.putTileAt(ROCKY.faceTile(tri, i, faceRows), x, yy);
    }
  }

  // grand staircase descending each gap. It runs one row PAST the cliff base so
  // the bottom step lands on the ground (otherwise the wall-base row peeks
  // through the partly-transparent bottom step).
  if (stairsLayer) {
    for (const g of p.gaps ?? []) {
      const h = faceRows + 1;
      for (let i = 0; i < h; i++) {
        const yy = y1 + 1 + i;
        const sr =
          i === 0 ? STAIRS.rows.top : i === h - 1 ? STAIRS.rows.bottom : STAIRS.rows.tread;
        for (let j = 0; j < g.w; j++) {
          stairsLayer.putTileAt(si(STAIRS.col(j, g.w), sr), g.x + j, yy);
        }
      }
    }
  }

  // colliders --------------------------------------------------------------
  const boxes: Box[] = [];
  const faceTop = (y1 + 1) * tile;
  const faceH = faceRows * tile;

  // face segments split around gaps
  let segStart = x0;
  for (let x = x0; x <= x1 + 1; x++) {
    const gap = x <= x1 && isGap(x);
    if (gap || x > x1) {
      if (x > segStart) {
        const left = segStart * tile;
        const right = x * tile;
        boxes.push({ cx: (left + right) / 2, cy: faceTop + faceH / 2, w: right - left, h: faceH });
      }
      segStart = x + 1;
    }
  }

  // left / right drop-off walls along the surface height
  const surfTop = y0 * tile;
  const surfH = p.h * tile;
  boxes.push({ cx: x0 * tile + tile / 2, cy: surfTop + surfH / 2, w: tile, h: surfH });
  boxes.push({ cx: (x1 + 1) * tile - tile / 2, cy: surfTop + surfH / 2, w: tile, h: surfH });

  return boxes;
}

/** Stamp a self-contained pond. Returns one collider over the open water. */
export function stampPond(layer: Layer, p: TileRect, tile = 32): Box {
  const x0 = p.x;
  const x1 = p.x + p.w - 1;
  const y0 = p.y;
  const y1 = p.y + p.h - 1;

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const left = x === x0;
      const right = x === x1;
      const top = y === y0;
      const bot = y === y1;
      let idx = POND.c;
      if (top && left) idx = POND.tl;
      else if (top && right) idx = POND.tr;
      else if (bot && left) idx = POND.bl;
      else if (bot && right) idx = POND.br;
      else if (top) idx = POND.t;
      else if (bot) idx = POND.b;
      else if (left) idx = POND.l;
      else if (right) idx = POND.r;
      layer.putTileAt(idx, x, y);
    }
  }

  // collider covers the inner open water (leave a 1-tile shore walkable)
  const cx = (x0 + 0.5 + x1 + 0.5) / 2 * tile;
  const cy = (y0 + 0.5 + y1 + 0.5) / 2 * tile;
  return { cx, cy, w: Math.max(tile, (p.w - 1) * tile), h: Math.max(tile, (p.h - 1) * tile) };
}
