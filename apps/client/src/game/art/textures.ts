import Phaser from "phaser";
import { palette as P } from "./palette";
import { PixelCanvas } from "./pixelCanvas";
import { TX, ANIM, IMAGE_ASSETS, FRAME_W, FRAME_H, FRAMES_PER_ROW, CHAR_ROW } from "./keys";
import {
  type CharColors,
  drawCharFrame,
  PLAYER_COLORS,
  ZEUS_COLORS,
} from "./character";

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
  const frameCount = 12;
  const pc = new PixelCanvas(FRAME_W * frameCount, FRAME_H);

  const layout: Array<{ row: number; dir: "down" | "up" | "side"; steps: number[] }> = [
    { row: CHAR_ROW.idleDown, dir: "down", steps: [0, 0] },
    { row: CHAR_ROW.walkDown, dir: "down", steps: [1, -1] },
    { row: CHAR_ROW.idleUp, dir: "up", steps: [0, 0] },
    { row: CHAR_ROW.walkUp, dir: "up", steps: [1, -1] },
    { row: CHAR_ROW.idleSide, dir: "side", steps: [0, 0] },
    { row: CHAR_ROW.walkSide, dir: "side", steps: [1, -1] },
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

function makeCloud(scene: Phaser.Scene): void {
  const pc = new PixelCanvas(80, 36);
  const clumps: Array<[number, number, number]> = [
    [28, 22, 12],
    [44, 18, 14],
    [58, 24, 11],
    [40, 26, 16],
  ];
  for (const [cx, cy, r] of clumps) pc.circle(cx, cy, r, "rgba(232,238,250,0.42)");
  for (const [cx, cy, r] of clumps) pc.circle(cx, cy - 2, r - 3, "rgba(255,255,255,0.55)");
  register(scene, TX.cloud, pc);
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

/* ----------------------------------------------------------------- PUBLIC */

/** Generate the procedural textures (characters, dressing, effects, UI). */
export function generateProcedural(scene: Phaser.Scene): void {
  makeAltar(scene);
  makeAmphora(scene);
  makeTemplePlot(scene);

  makeCharacter(scene, TX.player, PLAYER_COLORS);
  makeCharacter(scene, TX.zeus, ZEUS_COLORS);

  makeShadow(scene);
  makeGlow(scene);
  makeSpark(scene);
  makeCoin(scene);
  makeCloud(scene);
  makeInteractPrompt(scene);
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

  if (!scene.anims.exists(ANIM.coinSpin)) {
    scene.anims.create({
      key: ANIM.coinSpin,
      frames: scene.anims.generateFrameNumbers(TX.coin, { start: 0, end: 5 }),
      frameRate: 10,
      repeat: -1,
    });
  }
}
