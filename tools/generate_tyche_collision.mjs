/**
 * Rasterize Tyche collision polygons → 4px walk grid + debug overlay.
 * Run: node tools/generate_tyche_collision.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const WORLD_W = 920;
const WORLD_H = 575;
const CELL = 4;
const COLS = Math.ceil(WORLD_W / CELL);
const ROWS = Math.ceil(WORLD_H / CELL);

const RAW_PATH = path.join(ROOT, "tools/interiors/tyche_collision_raw.json");
const BACK_PATH = path.join(ROOT, "apps/client/public/assets/interior/tyche_room_back.png");
const OUT_JSON = path.join(ROOT, "apps/client/src/game/world/tycheCollision.json");
const OUT_DEBUG = path.join(ROOT, "tools/preview/tyche_collision_debug.png");

const raw = JSON.parse(fs.readFileSync(RAW_PATH, "utf8"));
const scaleX = WORLD_W / raw.sourceSize.w;
const scaleY = WORLD_H / raw.sourceSize.h;

/** Scale source polygon to world coords. */
function toWorld(poly) {
  return poly.map(([x, y]) => [x * scaleX, y * scaleY]);
}

/** Ray-cast point-in-polygon (world coords). */
function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Rasterize polygon into grid (sets cells where polygon covers cell center). */
function rasterizePoly(grid, poly, value) {
  const xs = poly.map((p) => p[0]);
  const ys = poly.map((p) => p[1]);
  const minGx = Math.max(0, Math.floor(Math.min(...xs) / CELL));
  const maxGx = Math.min(COLS - 1, Math.ceil(Math.max(...xs) / CELL));
  const minGy = Math.max(0, Math.floor(Math.min(...ys) / CELL));
  const maxGy = Math.min(ROWS - 1, Math.ceil(Math.max(...ys) / CELL));

  for (let gy = minGy; gy <= maxGy; gy++) {
    for (let gx = minGx; gx <= maxGx; gx++) {
      const cx = gx * CELL + CELL / 2;
      const cy = gy * CELL + CELL / 2;
      if (pointInPoly(cx, cy, poly)) grid[gy * COLS + gx] = value;
    }
  }
}

// Start fully blocked
const grid = new Uint8Array(COLS * ROWS).fill(1);

// Walkable floor wins first
for (const w of raw.walkable) {
  rasterizePoly(grid, toWorld(w.polygon), 0);
}

// Obstacles block on top
for (const o of raw.obstacles) {
  rasterizePoly(grid, toWorld(o.polygon), 1);
}

// Validate key points (world coords)
const checks = [
  { name: "entry", x: 460, y: 490, wantBlocked: false },
  { name: "trading_desk_approach", x: 460, y: 420, wantBlocked: false },
  { name: "back_wall", x: 460, y: 155, wantBlocked: true },
  { name: "ceiling", x: 460, y: 74, wantBlocked: true },
  { name: "desk_center_top", x: 460, y: 370, wantBlocked: true },
];

for (const c of checks) {
  const gx = Math.floor(c.x / CELL);
  const gy = Math.floor(c.y / CELL);
  const blocked = grid[gy * COLS + gx] === 1;
  if (blocked !== c.wantBlocked) {
    console.warn(`WARN: ${c.name} at (${c.x},${c.y}) blocked=${blocked}, expected ${c.wantBlocked}`);
  } else {
    console.log(`OK: ${c.name}`);
  }
}

// Run-length encode blocked cells (row-major)
const runs = [];
for (let gy = 0; gy < ROWS; gy++) {
  let gx = 0;
  while (gx < COLS) {
    if (grid[gy * COLS + gx] === 1) {
      const start = gx;
      while (gx < COLS && grid[gy * COLS + gx] === 1) gx++;
      runs.push([start, gy, gx - start]);
    } else {
      gx++;
    }
  }
}

const out = {
  cellSize: CELL,
  width: WORLD_W,
  height: WORLD_H,
  cols: COLS,
  rows: ROWS,
  runs,
};

fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
fs.mkdirSync(path.dirname(OUT_DEBUG), { recursive: true });
fs.writeFileSync(OUT_JSON, JSON.stringify(out, null, 2) + "\n");
console.log(`Wrote ${OUT_JSON} (${runs.length} blocked runs)`);

// Debug overlay: red blocked cells on scaled backdrop
const backMeta = await sharp(BACK_PATH).metadata();
const backBuf = await sharp(BACK_PATH)
  .resize(WORLD_W, WORLD_H, { fit: "fill" })
  .ensureAlpha()
  .raw()
  .toBuffer();

const overlay = Buffer.from(backBuf);
for (let gy = 0; gy < ROWS; gy++) {
  for (let gx = 0; gx < COLS; gx++) {
    if (grid[gy * COLS + gx] !== 1) continue;
    const x0 = gx * CELL;
    const y0 = gy * CELL;
    for (let dy = 0; dy < CELL; dy++) {
      for (let dx = 0; dx < CELL; dx++) {
        const x = x0 + dx;
        const y = y0 + dy;
        if (x >= WORLD_W || y >= WORLD_H) continue;
        const i = (y * WORLD_W + x) * 4;
        overlay[i] = Math.min(255, overlay[i] + 120);
        overlay[i + 1] = Math.floor(overlay[i + 1] * 0.4);
        overlay[i + 2] = Math.floor(overlay[i + 2] * 0.4);
        overlay[i + 3] = 255;
      }
    }
  }
}

await sharp(overlay, { raw: { width: WORLD_W, height: WORLD_H, channels: 4 } })
  .png()
  .toFile(OUT_DEBUG);

console.log(`Wrote ${OUT_DEBUG} (backdrop ${backMeta.width}x${backMeta.height})`);
