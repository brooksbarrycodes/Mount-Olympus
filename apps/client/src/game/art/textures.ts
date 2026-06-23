import Phaser from "phaser";
import { palette as P } from "./palette";
import { PixelCanvas } from "./pixelCanvas";
import {
  TX,
  ANIM,
  IMAGE_ASSETS,
  TILESET_ASSETS,
  FRAME_W,
  FRAME_H,
  FRAMES_PER_ROW,
  CHAR_ROW,
} from "./keys";
import {
  type CharColors,
  drawCharFrame,
  PLAYER_COLORS,
  ZEUS_COLORS,
  GOD_COLORS,
} from "./character";

/** Procedural character texture key per god id (matches the agentStates roster). */
const GOD_TEXTURES: Record<string, string> = {
  athena: TX.athena,
  hermes: TX.hermes,
  hephaestus: TX.hephaestus,
  poseidon: TX.poseidon,
  demeter: TX.demeter,
  apollo: TX.apollo,
  oracle: TX.oracle,
};

/**
 * Art pipeline. World art (terrain tiles, props, buildings) is loaded from real
 * pixel-art PNGs sourced from licensed packs (see docs/assets). Characters and a
 * few small effects/UI bits remain procedurally generated so they stay crisp and
 * dependency-free. `loadWorldImages` runs in preload; `generateProcedural` +
 * `registerAnimations` run in create once the loader has finished.
 */

/** Queue every real-image asset for loading. Call from a scene `preload`. */
export function loadWorldImages(scene: Phaser.Scene): void {
  for (const [key, url] of Object.entries(IMAGE_ASSETS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
  // terrain tilesets are loaded as plain images; the tilemap slices them
  for (const [key, url] of Object.entries(TILESET_ASSETS)) {
    if (!scene.textures.exists(key)) scene.load.image(key, url);
  }
}

function register(scene: Phaser.Scene, key: string, pc: PixelCanvas): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  scene.textures.addCanvas(key, pc.canvas);
}

function registerSheet(
  scene: Phaser.Scene,
  key: string,
  pc: PixelCanvas,
  frameW: number,
  frameH: number,
  frameCount: number,
): void {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const tex = scene.textures.addCanvas(key, pc.canvas);
  if (!tex) return;
  for (let i = 0; i < frameCount; i++) {
    tex.add(i, 0, i * frameW, 0, frameW, frameH);
  }
}

/* ----------------------------------------------- small procedural dressing */

function makeAltar(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(28, 22);
  pc.px(2, 8, 24, 12, P.marble);
  pc.px(2, 8, 24, 2, P.marbleLight);
  pc.px(0, 18, 28, 4, P.marbleShade);
  pc.px(4, 4, 20, 4, P.marbleShade);
  pc.px(4, 4, 20, 1, P.marbleLight);
  pc.px(12, 0, 4, 4, P.gold);
  pc.dot(13, -0, P.goldLight);
  pc.px(11, 2, 6, 2, P.goldDeep);
  register(scene, TX.altar, pc);
}

function makeAmphora(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(14, 20);
  pc.circle(7, 11, 5, P.bronze);
  pc.circle(6, 10, 4, P.bronzeDark);
  pc.px(5, 2, 4, 6, P.bronze);
  pc.px(4, 1, 6, 2, P.bronzeDark);
  pc.px(6, 16, 2, 3, P.bronzeDark);
  pc.dot(3, 8, P.bronzeDark);
  pc.dot(10, 8, P.bronzeDark);
  pc.px(4, 10, 6, 1, P.goldDeep);
  register(scene, TX.amphora, pc);
}

function makeTemplePlot(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(96, 64);
  pc.px(4, 40, 88, 20, P.marbleShade);
  pc.px(4, 40, 88, 3, P.marble);
  pc.px(6, 44, 84, 14, P.path);
  pc.speckle([P.pathDark, P.pathLight], 0.08, 9);
  for (const [x, y] of [
    [6, 42],
    [84, 42],
    [6, 54],
    [84, 54],
  ] as const) {
    pc.px(x, y, 6, 6, P.stone);
    pc.px(x, y, 6, 1, P.marbleLight);
  }
  for (let i = 0; i < 4; i++) {
    const cx = 18 + i * 20;
    pc.px(cx, 18, 6, 24, "rgba(233,230,218,0.22)");
  }
  register(scene, TX.templePlot, pc);
}

/* -------------------------------------------------------------- characters */

function makeCharacter(scene: Phaser.Scene, key: string, c: CharColors): void {
  const frameCount = 16;
  const pc = new PixelCanvas(FRAME_W * frameCount, FRAME_H);

  const layout: Array<{
    row: number;
    dir: "down" | "up" | "side" | "sit" | "sitSide";
    steps: number[];
  }> = [
    { row: CHAR_ROW.idleDown, dir: "down", steps: [0, 0] },
    { row: CHAR_ROW.walkDown, dir: "down", steps: [1, -1] },
    { row: CHAR_ROW.idleUp, dir: "up", steps: [0, 0] },
    { row: CHAR_ROW.walkUp, dir: "up", steps: [1, -1] },
    { row: CHAR_ROW.idleSide, dir: "side", steps: [0, 0] },
    { row: CHAR_ROW.walkSide, dir: "side", steps: [1, -1] },
    { row: CHAR_ROW.sit, dir: "sit", steps: [0, 0] },
    { row: CHAR_ROW.sitSide, dir: "sitSide", steps: [0, 0] },
  ];

  for (const { row, dir, steps } of layout) {
    for (let f = 0; f < FRAMES_PER_ROW; f++) {
      const frameIndex = row * FRAMES_PER_ROW + f;
      drawCharFrame(pc, frameIndex * FRAME_W, c, dir, steps[f]);
    }
  }

  registerSheet(scene, key, pc, FRAME_W, FRAME_H, frameCount);
}

/* ----------------------------------------------------------- effects / ui */

function makeShadow(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(24, 10);
  pc.ctx.fillStyle = P.shadow;
  pc.ctx.beginPath();
  pc.ctx.ellipse(12, 5, 11, 4, 0, 0, Math.PI * 2);
  pc.ctx.fill();
  register(scene, TX.shadow, pc);
}

function makeGlow(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(64, 64);
  const g = pc.ctx.createRadialGradient(32, 32, 2, 32, 32, 32);
  g.addColorStop(0, "rgba(255,244,207,0.85)");
  g.addColorStop(0.4, "rgba(245,200,76,0.35)");
  g.addColorStop(1, "rgba(245,200,76,0)");
  pc.ctx.fillStyle = g;
  pc.ctx.fillRect(0, 0, 64, 64);
  register(scene, TX.glow, pc);
}

function makeSpark(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(6, 6);
  pc.circle(3, 3, 2, P.divineGlow);
  pc.dot(3, 3, "#ffffff");
  register(scene, TX.spark, pc);
}

function makeCoin(scene: Phaser.Scene): void {
  const frames = 6;
  const pc = new PixelCanvas(16 * frames, 16);
  const widths = [10, 7, 4, 1, 4, 7];
  for (let f = 0; f < frames; f++) {
    const ox = f * 16 + 8;
    const halfW = widths[f];
    if (halfW <= 1) {
      pc.px(ox - 1, 3, 2, 10, P.goldDeep);
      continue;
    }
    for (let y = -6; y <= 6; y++) {
      const span = Math.floor(halfW * Math.sqrt(Math.max(0, 1 - (y * y) / 49)));
      pc.px(ox - span, 8 + y, span * 2 + 1, 1, P.gold);
    }
    pc.px(ox - Math.max(1, halfW - 2), 5, 2, 2, P.goldLight);
    pc.px(ox - 1, 5, 2, 6, P.goldDeep);
    if (halfW >= 7) {
      pc.dot(ox, 8, P.goldDeep);
      pc.dot(ox - 2, 8, P.goldLight);
      pc.dot(ox + 2, 8, P.goldLight);
    }
  }
  registerSheet(scene, TX.coin, pc, 16, 16, frames);
}

function makeCloud(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  clumps: Array<[number, number, number]>,
): void {
  const pc = new PixelCanvas(w, h);
  // layered puffs (soft base -> body -> top highlight) fully inside the canvas
  for (const [cx, cy, r] of clumps) pc.circle(cx, cy, r, "rgba(201,214,239,0.50)");
  for (const [cx, cy, r] of clumps) pc.circle(cx, cy - 2, r - 2, "rgba(238,244,255,0.72)");
  for (const [cx, cy, r] of clumps) pc.circle(cx, cy - 4, Math.max(2, r - 6), "rgba(255,255,255,0.9)");
  register(scene, key, pc);
}

function makeClouds(scene: Phaser.Scene): void {
  makeCloud(scene, TX.cloud, 96, 60, [
    [28, 34, 16],
    [48, 28, 20],
    [68, 34, 16],
    [48, 38, 14],
  ]);
  makeCloud(scene, TX.cloud2, 140, 56, [
    [34, 32, 16],
    [60, 26, 18],
    [86, 30, 17],
    [110, 34, 13],
    [64, 38, 14],
  ]);
  makeCloud(scene, TX.cloud3, 72, 52, [
    [26, 30, 14],
    [42, 26, 16],
    [56, 32, 13],
  ]);
}

function makeInteractPrompt(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(16, 16);
  pc.px(1, 1, 14, 14, P.outline);
  pc.px(2, 2, 12, 12, P.marbleLight);
  pc.px(2, 2, 12, 2, P.marble);
  pc.px(2, 11, 12, 3, P.marbleShade);
  pc.px(5, 4, 6, 1, P.outline);
  pc.px(5, 4, 1, 7, P.outline);
  pc.px(5, 7, 5, 1, P.outline);
  pc.px(5, 10, 6, 1, P.outline);
  register(scene, TX.interactPrompt, pc);
}

/* --------------------------------------------------- ground detail scatter */

function makeGroundDetails(scene: Phaser.Scene): void {
  // small grass tuft
  {
    const pc = new PixelCanvas(12, 10);
    pc.px(2, 6, 1, 3, P.grassDark);
    pc.px(3, 4, 1, 5, P.grass);
    pc.px(4, 5, 1, 4, P.grassLight);
    pc.px(6, 3, 1, 6, P.grass);
    pc.px(7, 5, 1, 4, P.grassDark);
    pc.px(8, 4, 1, 5, P.grassLight);
    pc.px(9, 6, 1, 3, P.grass);
    register(scene, TX.tuft, pc);
  }
  // wider tuft
  {
    const pc = new PixelCanvas(16, 12);
    const blades: Array<[number, number, string]> = [
      [2, 4, P.grassDark],
      [4, 6, P.grass],
      [5, 3, P.grassLight],
      [7, 5, P.grass],
      [8, 2, P.grassLight],
      [9, 6, P.grassDark],
      [11, 4, P.grass],
      [13, 6, P.grassLight],
    ];
    for (const [x, h, c] of blades) pc.px(x, 11 - h, 1, h, c);
    register(scene, TX.tuft2, pc);
  }
  // fern (taller)
  {
    const pc = new PixelCanvas(14, 16);
    pc.px(6, 6, 1, 9, P.foliageDark);
    for (const [dx, dy] of [
      [-3, 8],
      [3, 8],
      [-4, 11],
      [4, 11],
      [-2, 5],
      [2, 5],
    ] as const) {
      pc.px(6 + dx, dy, 3, 1, P.foliage);
      pc.dot(6 + dx + (dx < 0 ? 0 : 2), dy - 1, P.oliveLeaf);
    }
    pc.px(5, 3, 3, 4, P.foliage);
    pc.px(6, 2, 1, 2, P.oliveLeaf);
    register(scene, TX.fern, pc);
  }
  // flower clusters (shared base + colored blooms)
  const flower = (key: string, petal: string, petalHi: string, center: string) => {
    const pc = new PixelCanvas(14, 12);
    // green base
    for (const [x, h] of [
      [3, 5],
      [6, 6],
      [9, 5],
    ] as const)
      pc.px(x, 11 - h, 1, h, P.grass);
    pc.px(4, 8, 1, 3, P.grassDark);
    pc.px(8, 8, 1, 3, P.grassLight);
    // blooms
    for (const [cx, cy] of [
      [3, 4],
      [7, 2],
      [10, 5],
      [6, 6],
    ] as const) {
      pc.px(cx - 1, cy, 3, 1, petal);
      pc.px(cx, cy - 1, 1, 3, petal);
      pc.dot(cx, cy, center);
      pc.dot(cx - 1, cy - 1, petalHi);
    }
    register(scene, key, pc);
  };
  flower(TX.flowersWhite, "#f3efe4", "#ffffff", P.gold);
  flower(TX.flowersPurple, "#8d6fc4", "#b79ce6", P.goldLight);
  flower(TX.flowersYellow, "#f2c84a", "#ffe89a", "#b07c16");
  // pebbles
  {
    const pc = new PixelCanvas(14, 8);
    pc.circle(4, 5, 2, P.stoneDark);
    pc.circle(4, 4, 1, P.stone);
    pc.circle(9, 6, 2, P.stoneEdge);
    pc.circle(9, 5, 1, P.stone);
    pc.dot(11, 4, P.stoneDark);
    register(scene, TX.pebbles, pc);
  }
  // reeds (pond edge)
  {
    const pc = new PixelCanvas(12, 18);
    for (const [x, h, c] of [
      [2, 12, P.foliageDark],
      [4, 16, P.foliage],
      [6, 13, P.oliveLeaf],
      [8, 17, P.foliage],
      [10, 11, P.foliageDark],
    ] as const)
      pc.px(x, 17 - h, 1, h, c);
    pc.px(4, 1, 1, 3, P.bronzeDark);
    pc.px(8, 0, 1, 3, P.bronze);
    register(scene, TX.reeds, pc);
  }
  // lily pad
  {
    const pc = new PixelCanvas(14, 8);
    pc.circle(7, 4, 4, P.foliage);
    pc.circle(7, 3, 3, P.oliveLeaf);
    pc.px(7, 4, 5, 1, "rgba(40,70,40,0.6)");
    pc.dot(5, 2, "#f2a6c4");
    register(scene, TX.lily, pc);
  }
  // soft dirt path stamp (feathered edges blend onto grass)
  {
    const pc = new PixelCanvas(40, 26);
    pc.circle(20, 13, 14, "rgba(120,104,74,0.22)");
    pc.circle(20, 13, 12, "rgba(160,142,104,0.6)");
    pc.circle(20, 12, 11, P.path);
    pc.circle(20, 11, 8, P.pathLight);
    pc.speckle([P.pathDark, P.pathLight, P.path], 0.12, 5);
    register(scene, TX.pathStamp, pc);
  }
  // god-ray beam (soft additive gold)
  {
    const pc = new PixelCanvas(48, 220);
    pc.gradientV("rgba(255,245,205,0.30)", "rgba(255,245,205,0.0)", 0, 0, 48, 220);
    register(scene, TX.godray, pc);
  }
}

function makeWaterfall(scene: Phaser.Scene): void {
  const fw = 28;
  const fh = 104;
  const frames = 4;
  const pc = new PixelCanvas(fw * frames, fh);
  const cols = [
    "rgba(190,224,242,0.85)",
    "rgba(127,182,221,0.85)",
    "rgba(234,246,255,0.9)",
    "rgba(160,205,235,0.8)",
  ];
  for (let f = 0; f < frames; f++) {
    const ox = f * fw;
    // base sheet
    pc.px(ox + 3, 0, fw - 6, fh, "rgba(150,196,228,0.55)");
    pc.px(ox + 4, 0, fw - 8, 3, "rgba(240,250,255,0.95)"); // lip foam
    // vertical streaks, shifted per frame to animate flow
    for (let x = 0; x < fw - 6; x += 3) {
      const c = cols[(x + f) % cols.length];
      const shift = (f * 7 + x * 3) % 12;
      for (let y = shift; y < fh; y += 12) {
        pc.px(ox + 3 + x, y, 2, 7, c);
      }
    }
    // foam pool at base
    for (let i = 0; i < 5; i++) {
      const fx = ox + 4 + ((f * 5 + i * 6) % (fw - 10));
      pc.circle(fx, fh - 5 - (i % 2) * 3, 3, "rgba(240,250,255,0.85)");
    }
  }
  registerSheet(scene, TX.waterfall, pc, fw, fh, frames);
}

/* ----------------------------------------------------------------- PUBLIC */

/** Generate the procedural textures (characters, dressing, effects, UI). */
export function generateProcedural(scene: Phaser.Scene): void {
  makeAltar(scene);
  makeAmphora(scene);
  makeTemplePlot(scene);

  makeCharacter(scene, TX.player, PLAYER_COLORS);
  makeCharacter(scene, TX.zeus, ZEUS_COLORS);
  for (const [id, tx] of Object.entries(GOD_TEXTURES)) {
    makeCharacter(scene, tx, GOD_COLORS[id]);
  }

  makeShadow(scene);
  makeGlow(scene);
  makeSpark(scene);
  makeCoin(scene);
  makeClouds(scene);
  makeInteractPrompt(scene);
  makeGroundDetails(scene);
  makeWaterfall(scene);
}

export function registerAnimations(scene: Phaser.Scene): void {
  const charAnims: Array<[string, number[], number, number]> = [
    [ANIM.playerIdleDown, [CHAR_ROW.idleDown * 2], 2, -1],
    [ANIM.playerWalkDown, [CHAR_ROW.walkDown * 2, CHAR_ROW.walkDown * 2 + 1], 8, -1],
    [ANIM.playerIdleUp, [CHAR_ROW.idleUp * 2], 2, -1],
    [ANIM.playerWalkUp, [CHAR_ROW.walkUp * 2, CHAR_ROW.walkUp * 2 + 1], 8, -1],
    [ANIM.playerIdleSide, [CHAR_ROW.idleSide * 2], 2, -1],
    [ANIM.playerWalkSide, [CHAR_ROW.walkSide * 2, CHAR_ROW.walkSide * 2 + 1], 8, -1],
  ];

  for (const [key, frames, rate, repeat] of charAnims) {
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: frames.map((f) => ({ key: TX.player, frame: f })),
      frameRate: rate,
      repeat,
    });
  }

  if (!scene.anims.exists(ANIM.zeusIdle)) {
    scene.anims.create({
      key: ANIM.zeusIdle,
      frames: [
        { key: TX.zeus, frame: CHAR_ROW.idleDown * 2 },
        { key: TX.zeus, frame: CHAR_ROW.walkDown * 2 },
      ],
      frameRate: 1.6,
      repeat: -1,
      yoyo: true,
    });
  }

  // gentle idle "breathing" for each god (keyed by texture so the Opp can find it)
  for (const tx of Object.values(GOD_TEXTURES)) {
    const key = `idle:${tx}`;
    if (scene.anims.exists(key)) continue;
    scene.anims.create({
      key,
      frames: [
        { key: tx, frame: CHAR_ROW.idleDown * 2 },
        { key: tx, frame: CHAR_ROW.walkDown * 2 },
      ],
      frameRate: 1.6,
      repeat: -1,
      yoyo: true,
    });
  }

  if (!scene.anims.exists(ANIM.coinSpin)) {
    scene.anims.create({
      key: ANIM.coinSpin,
      frames: scene.anims.generateFrameNumbers(TX.coin, { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
  }

  if (!scene.anims.exists(ANIM.waterfall)) {
    scene.anims.create({
      key: ANIM.waterfall,
      frames: scene.anims.generateFrameNumbers(TX.waterfall, { start: 0, end: 3 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}
