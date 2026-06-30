/**
 * Process Tyche temple EXTERIOR assets only (magenta keyout + validation).
 * Interior: use tools/process_tyche_interior.mjs
 * Run: node tools/process_tyche_assets.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const GEN = path.join(ROOT_DIR, ".cursor-gen");
const OUT_PROPS = path.join(ROOT_DIR, "apps/client/public/assets/props");
const OUT_GROUND = path.join(ROOT_DIR, "apps/client/public/assets/ground");
const VALIDATOR = path.join(__dirname, "validate_building_2_5d.mjs");
const PROMPTS = JSON.parse(
  fs.readFileSync(path.join(__dirname, "buildings", "prompts.json"), "utf8"),
);

for (const d of [GEN, OUT_PROPS, OUT_GROUND]) {
  fs.mkdirSync(d, { recursive: true });
}

function validateBuilding(srcPath) {
  const r = spawnSync(process.execPath, [VALIDATOR, srcPath], { encoding: "utf8" });
  process.stdout.write(r.stdout ?? "");
  process.stderr.write(r.stderr ?? "");
  return r.status === 0;
}

async function keyout(srcPath) {
  const { data, info } = await sharp(srcPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
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

  const isBg = (r, g, b) => {
    const d = Math.abs(r - br) + Math.abs(g - bg) + Math.abs(b - bb);
    const magentaish = r > 150 && b > 140 && g < 120 && r - g > 55 && b - g > 40;
    return d < 110 || magentaish;
  };

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * C;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      if (isBg(r, g, b)) {
        data[i + 3] = 0;
      } else if (r - g > 35 && b - g > 25 && r > 130 && b > 120) {
        const ng = (r + b) >> 1;
        data[i] = (r + ng) >> 1;
        data[i + 1] = (g + ng) >> 1;
        data[i + 2] = (b + ng) >> 1;
        data[i + 3] = 150;
      }
    }
  }
  return sharp(Buffer.from(data), { raw: { width: W, height: H, channels: C } }).trim();
}

async function keyoutJob(srcName, dstPath, { validate = false } = {}) {
  const candidates = [
    path.join(GEN, srcName),
    path.join(
      "C:/Users/brook/.cursor/projects/c-Users-brook-Mount-Olympus-Mount-Olympus/assets",
      srcName,
    ),
  ];
  const src = candidates.find((p) => fs.existsSync(p));
  if (!src) {
    console.warn(`SKIP keyout: ${srcName} not found`);
    return false;
  }
  if (validate && !validateBuilding(src)) {
    console.error(`Aborting keyout for ${srcName}: 2.5D validation failed.`);
    process.exit(1);
  }
  const img = await keyout(src);
  const buf = await img.png().toBuffer();
  fs.writeFileSync(dstPath, buf);
  const meta = await sharp(dstPath).metadata();
  console.log(`keyout ${path.basename(dstPath)}: ${meta.width}x${meta.height}`);
  return true;
}

async function main() {
  console.log("Exterior-only pipeline. Interior: node tools/process_tyche_interior.mjs");
  console.log(PROMPTS.temple_tyche_exterior);
  console.log("");

  await keyoutJob("temple_tyche_front.png", path.join(OUT_PROPS, "temple_tyche.png"), {
    validate: true,
  });
  await keyoutJob("fortune_terrace_front.png", path.join(OUT_GROUND, "fortune_terrace_floor.png"));

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
