/**
 * Heuristic validator: reject flat-façade building sprites before keyout.
 * Run: node tools/validate_building_2_5d.mjs path/to/building_front.png
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("Usage: node tools/validate_building_2_5d.mjs <building_front.png>");
  process.exit(2);
}

function isMagenta(r, g, b, a, br, bg, bb) {
  if (a < 32) return true;
  const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
  const magentaish = r > 150 && b > 140 && g < 120 && r - g > 55 && b - g > 40;
  return d < 110 || magentaish;
}

function spanWidth(rows, x0, x1, minAlpha = 64) {
  let minX = Infinity;
  let maxX = -Infinity;
  for (const row of rows) {
    for (let x = x0; x <= x1; x++) {
      if (row[x].a >= minAlpha) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
      }
    }
  }
  if (minX === Infinity) return 0;
  return maxX - minX + 1;
}

function verticalExtent(rows, x0, x1, minAlpha = 64) {
  let minY = Infinity;
  let maxY = -Infinity;
  for (let yi = 0; yi < rows.length; yi++) {
    for (let x = x0; x <= x1; x++) {
      if (rows[yi][x].a >= minAlpha) {
        minY = Math.min(minY, yi);
        maxY = Math.max(maxY, yi);
      }
    }
  }
  if (minY === Infinity) return 0;
  return maxY - minY + 1;
}

const { data, info } = await sharp(src).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H, channels: C } = info;

const corners = [
  [1, 1],
  [W - 2, 1],
  [1, H - 2],
  [W - 2, H - 2],
];
let br = 0,
  bg = 0,
  bb = 0;
for (const [x, y] of corners) {
  const i = (y * W + x) * C;
  br += data[i];
  bg += data[i + 1];
  bb += data[i + 2];
}
br = Math.round(br / 4);
bg = Math.round(bg / 4);
bb = Math.round(bb / 4);

let minX = W,
  minY = H,
  maxX = 0,
  maxY = 0;
const pixels = [];

for (let y = 0; y < H; y++) {
  const row = [];
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * C;
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];
    const bgPx = isMagenta(r, g, b, a, br, bg, bb);
    row.push({ a: bgPx ? 0 : a, r, g, b });
    if (!bgPx && a >= 64) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  pixels.push(row);
}

if (minX > maxX) {
  console.error("FAIL: no building pixels detected (empty or all magenta)");
  process.exit(1);
}

const bW = maxX - minX + 1;
const bH = maxY - minY + 1;
const relRows = pixels.slice(minY, maxY + 1).map((row) => row.slice(minX, maxX + 1));

// Roof band: top 35% of building bbox
const roofBandEnd = Math.max(1, Math.floor(bH * 0.35));
const roofRows = relRows.slice(0, roofBandEnd);
const roofSpan = spanWidth(roofRows, 0, bW - 1);
const roofSpanRatio = roofSpan / bW;

// Depth band: upper 20–45% of building (above typical pediment baseline)
const depthStart = Math.floor(bH * 0.2);
const depthEnd = Math.floor(bH * 0.45);
const depthRows = relRows.slice(depthStart, Math.max(depthStart + 1, depthEnd));
const depthExtent = verticalExtent(depthRows, 0, bW - 1);
const depthRatio = depthExtent / bH;

const MIN_ROOF_SPAN = 0.55;
const MIN_DEPTH_RATIO = 0.08;
const MIN_TOP_RIDGE_SPAN = 0.35; // top 12% — flat pediment apex is tiny
const MIN_UPPER_PLATEAU = 0.45; // avg span in 5–25% band — receding roof stays wide

const failures = [];

// Top ridge: max row span in top 12%
const ridgeEnd = Math.max(1, Math.floor(bH * 0.12));
let maxRidgeSpan = 0;
for (let yi = 0; yi < ridgeEnd; yi++) {
  maxRidgeSpan = Math.max(maxRidgeSpan, spanWidth([relRows[yi]], 0, bW - 1));
}
const ridgeRatio = maxRidgeSpan / bW;

// Upper plateau: average row span in 5–25% height band
const plateauStart = Math.floor(bH * 0.05);
const plateauEnd = Math.floor(bH * 0.25);
const plateauRows = relRows.slice(plateauStart, Math.max(plateauStart + 1, plateauEnd));
let plateauSum = 0;
for (const row of plateauRows) {
  plateauSum += spanWidth([row], 0, bW - 1);
}
const plateauAvg = plateauRows.length ? plateauSum / plateauRows.length / bW : 0;

if (roofSpanRatio < MIN_ROOF_SPAN) {
  failures.push(
    `roof band spans ${(roofSpanRatio * 100).toFixed(0)}% of building width (need ≥${MIN_ROOF_SPAN * 100}%) — likely flat pediment only`,
  );
}
if (depthRatio < MIN_DEPTH_RATIO) {
  failures.push(
    `upper mass vertical extent is ${(depthRatio * 100).toFixed(1)}% of height (need ≥${MIN_DEPTH_RATIO * 100}%) — likely no receding roof volume`,
  );
}
if (ridgeRatio < MIN_TOP_RIDGE_SPAN) {
  failures.push(
    `top ridge spans ${(ridgeRatio * 100).toFixed(0)}% of width (need ≥${MIN_TOP_RIDGE_SPAN * 100}%) — likely flat pediment apex only`,
  );
}
if (plateauAvg < MIN_UPPER_PLATEAU) {
  failures.push(
    `upper roof plateau averages ${(plateauAvg * 100).toFixed(0)}% width (need ≥${MIN_UPPER_PLATEAU * 100}%) — likely triangular pediment not receding roof`,
  );
}

console.log(`Building bbox: ${bW}x${bH} (from ${path.basename(src)})`);
console.log(`Roof band span: ${(roofSpanRatio * 100).toFixed(1)}% width`);
console.log(`Top ridge span: ${(ridgeRatio * 100).toFixed(1)}% width`);
console.log(`Upper plateau avg: ${(plateauAvg * 100).toFixed(1)}% width`);
console.log(`Upper mass depth: ${(depthRatio * 100).toFixed(1)}% height`);

if (failures.length) {
  console.error("FAIL — flat façade suspected:");
  for (const f of failures) console.error(`  • ${f}`);
  console.error("Regenerate with docs/assets/BUILDING_2.5D_SPEC.md (receding roof planes required).");
  process.exit(1);
}

console.log("PASS — roof mass heuristics OK");
process.exit(0);
