/**
 * Process Tyche interior: resize backdrop, keyout foreground, extract ticker.
 * Run: node tools/process_tyche_interior.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const GEN = path.join(ROOT, ".cursor-gen");
const OUT = path.join(ROOT, "apps/client/public/assets/interior");
const CURSOR_ASSETS = path.join(
  "C:/Users/brook/.cursor/projects/c-Users-brook-Mount-Olympus-Mount-Olympus/assets",
);

const ROOM_W = 1536;
const ROOM_H = 960;

for (const d of [GEN, OUT]) fs.mkdirSync(d, { recursive: true });

function findSrc(name) {
  const candidates = [
    path.join(GEN, name),
    path.join(CURSOR_ASSETS, name),
  ];
  const hit = candidates.find((p) => fs.existsSync(p));
  if (!hit) throw new Error(`Missing source: ${name}`);
  if (hit !== path.join(GEN, name)) fs.copyFileSync(hit, path.join(GEN, name));
  return path.join(GEN, name);
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

async function main() {
  const backSrc = findSrc("tyche_room_back.png");
  const foreSrc = findSrc("tyche_room_fore.png");

  // Normalize backdrop to exact room dimensions (AI output varies)
  await sharp(backSrc)
    .resize(ROOM_W, ROOM_H, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toFile(path.join(OUT, "tyche_room_back.png"));

  const backMeta = await sharp(path.join(OUT, "tyche_room_back.png")).metadata();
  console.log(`tyche_room_back: ${backMeta.width}x${backMeta.height}`);

  const foreKeyed = await keyout(foreSrc);
  const foreBuf = await foreKeyed.png().toBuffer();
  const foreMeta0 = await sharp(foreBuf).metadata();
  const foreW = ROOM_W;
  const foreFullH = Math.round((foreW / foreMeta0.width) * foreMeta0.height);
  const foreFull = await sharp(foreBuf)
    .resize(foreW, foreFullH, { fit: "fill", kernel: sharp.kernel.lanczos3 })
    .png()
    .toBuffer();
  // Keep bottom strip only (rail, amphora) — exclude duplicate desk/chair from fore pass
  const foreStripH = Math.min(320, foreFullH);
  await sharp(foreFull)
    .extract({ left: 0, top: foreFullH - foreStripH, width: foreW, height: foreStripH })
    .png()
    .toFile(path.join(OUT, "tyche_room_fore.png"));
  const foreMeta = await sharp(path.join(OUT, "tyche_room_fore.png")).metadata();
  console.log(`tyche_room_fore (keyed strip): ${foreMeta.width}x${foreMeta.height}`);

  const layout = {
    roomW: ROOM_W,
    roomH: ROOM_H,
  };
  fs.writeFileSync(
    path.join(ROOT, "apps/client/src/game/world/tycheHallLayout.json"),
    JSON.stringify(layout, null, 2),
  );

  if (backMeta.width !== ROOM_W || backMeta.height !== ROOM_H) {
    console.warn(`WARN: backdrop dims ${backMeta.width}x${backMeta.height} != ${ROOM_W}x${ROOM_H}`);
    process.exit(1);
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
