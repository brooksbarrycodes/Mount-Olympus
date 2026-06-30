/**
 * Composite building preview on grass background for scale check.
 * Run: node tools/preview_building.mjs temple_tyche
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const PREVIEW = path.join(__dirname, "preview");
const PROPS = path.join(ROOT, "apps/client/public/assets/props");

const name = process.argv[2] ?? "temple_tyche";
const src = path.join(PROPS, `${name}.png`);
if (!fs.existsSync(src)) {
  console.error(`Missing ${src}`);
  process.exit(1);
}

fs.mkdirSync(PREVIEW, { recursive: true });

const meta = await sharp(src).metadata();
const scale = name === "pantheon" ? 0.46 : 0.34;
const w = Math.round(meta.width * scale);
const h = Math.round(meta.height * scale);

const grass = await sharp({
  create: { width: 800, height: 600, channels: 3, background: { r: 96, g: 146, b: 84 } },
})
  .png()
  .toBuffer();

const building = await sharp(src).resize(w, h, { kernel: sharp.kernel.nearest }).png().toBuffer();

const out = path.join(PREVIEW, `${name}_scaled_preview.png`);
await sharp(grass)
  .composite([{ input: building, left: Math.round(400 - w / 2), top: 600 - h - 40 }])
  .png()
  .toFile(out);

console.log(`Wrote ${out} (${w}x${h} at scale ${scale})`);
