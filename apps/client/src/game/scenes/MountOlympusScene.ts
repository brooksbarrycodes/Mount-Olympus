import Phaser from "phaser";
import { bridge } from "../EventBridge";
import { TX, TS, CLOUD_KEYS } from "../art/keys";
import { palette as P } from "../art/palette";
import {
  WORLD,
  PLAYER_SPAWN,
  locations,
  templePlots,
  plazas,
  pathways,
  decor,
  PROP_SCALE,
  groundPatches,
  PATCH_RATIO,
} from "../world/olympusWorld";
import { COLS, ROWS, plateaus, ponds } from "../world/olympusBlueprint";

const TREE_KEYS = new Set<string>([TX.cypress, TX.oliveTree, TX.blossomTree, TX.treeGreen]);
// small ground detail that should NOT cast a contact shadow
const FLOWER_KEYS = new Set<string>([
  TX.flowersWhite,
  TX.flowersPurple,
  TX.flowersYellow,
  TX.tuft,
  TX.tuft2,
  TX.fern,
  TX.pebbles,
  TX.reeds,
  TX.lily,
]);
const SCATTER_DETAILS = [
  TX.tuft,
  TX.tuft,
  TX.tuft2,
  TX.tuft2,
  TX.fern,
  TX.pebbles,
  TX.flowersWhite,
  TX.flowersPurple,
  TX.flowersYellow,
];
import { paintGround, stampPlateau, stampPond } from "../world/Autotiler";
import { opps as oppDefs, getOpp } from "../world/agentStates";
import { Player } from "../entities/createPlayer";
import { Opp } from "../entities/createOpp";
import { InputSystem } from "../systems/InputSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { InteractionSystem, type Interactable } from "../systems/InteractionSystem";
import { SpeechBubbleSystem } from "../systems/SpeechBubbleSystem";
import { buildOppDialogData, generateReply, resolveReply } from "../dialog";

interface OverworldData {
  spawnX?: number;
  spawnY?: number;
}

/**
 * The Mount Olympus overworld. Renders entirely from `olympusWorld.ts`, hosts
 * the player + Opps, and wires `E`-to-interact (talk / enter building) plus
 * in-world speech bubbles. Communicates with React only through the bridge.
 */
export class MountOlympusScene extends Phaser.Scene {
  private player!: Player;
  private opps: Opp[] = [];
  private inputSystem!: InputSystem;
  private cameraSystem!: CameraSystem;
  private interaction!: InteractionSystem;
  private speech!: SpeechBubbleSystem;
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private clouds: Phaser.GameObjects.Image[] = [];
  private dustAccum = 0;
  private spawn: { x: number; y: number } = { x: PLAYER_SPAWN.x, y: PLAYER_SPAWN.y };
  private readonly handlers: Array<() => void> = [];

  constructor() {
    super("MountOlympusScene");
  }

  init(data: OverworldData): void {
    // scenes are reused across restarts (e.g. returning from an interior), so
    // reset per-run collections to avoid accumulating stale destroyed objects
    this.opps = [];
    this.clouds = [];
    this.spawn = {
      x: data.spawnX ?? PLAYER_SPAWN.x,
      y: data.spawnY ?? PLAYER_SPAWN.y,
    };
  }

  create(): void {
    this.physics.world.setBounds(0, 0, WORLD.width, WORLD.height);

    this.solids = this.physics.add.staticGroup();
    this.buildTerrain();
    this.buildBuildings();
    this.buildDecor();
    this.buildGodrays();
    this.buildClouds();

    this.player = new Player(this, this.spawn.x, this.spawn.y);
    this.physics.add.collider(this.player.sprite, this.solids);

    this.spawnOpps();

    this.inputSystem = new InputSystem(this, () => this.handleInteract());
    this.cameraSystem = new CameraSystem(this, this.player.sprite, WORLD.width, WORLD.height);

    this.interaction = new InteractionSystem(this);
    this.interaction.setInteractables(this.buildInteractables());

    this.speech = new SpeechBubbleSystem(this, this.opps);

    this.registerBridge();
    this.cameras.main.fadeIn(260, 10, 8, 14);
    this.emitInitialState();

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  /* --------------------------------------------------------------- terrain */

  private buildTerrain(): void {
    // Solid grass underfill so any sub-pixel tile gap reads as ground, not sky.
    const grassFill = Phaser.Display.Color.HexStringToColor(P.grass).color;
    this.add
      .rectangle(0, 0, WORLD.width, WORLD.height, grassFill)
      .setOrigin(0, 0)
      .setDepth(-101);

    const map = this.make.tilemap({
      tileWidth: WORLD.tile,
      tileHeight: WORLD.tile,
      width: COLS,
      height: ROWS,
    });
    const groundTs = map.addTilesetImage("ground", TS.ground, WORLD.tile, WORLD.tile);
    const rockyTs = map.addTilesetImage("rocky", TS.rocky, WORLD.tile, WORLD.tile);
    const waterTs = map.addTilesetImage("water", TS.water, WORLD.tile, WORLD.tile);
    const stairsTs = map.addTilesetImage("stairs", TS.stairs, WORLD.tile, WORLD.tile);

    const groundLayer = map.createBlankLayer("ground", groundTs!, 0, 0);
    const waterLayer = map.createBlankLayer("water", waterTs!, 0, 0);
    const rockyLayer = map.createBlankLayer("rocky", rockyTs!, 0, 0);
    const stairsLayer = map.createBlankLayer("stairs", stairsTs!, 0, 0);
    for (const layer of [groundLayer, waterLayer, rockyLayer, stairsLayer]) {
      layer?.setCullPadding(2);
    }
    groundLayer?.setDepth(-100);
    waterLayer?.setDepth(-98);
    rockyLayer?.setDepth(-96);
    stairsLayer?.setDepth(-95);

    if (groundLayer) paintGround(groundLayer, COLS, ROWS);

    if (rockyLayer) {
      for (const p of plateaus) {
        for (const box of stampPlateau(rockyLayer, stairsLayer, p, WORLD.tile)) {
          this.addSolid(box.cx, box.cy, box.w, box.h);
        }
      }
    }
    if (waterLayer) {
      for (const pond of ponds) {
        const box = stampPond(waterLayer, pond, WORLD.tile);
        this.addSolid(box.cx, box.cy, box.w, box.h);
        // painterly water + shore overlay (extends a little onto the grass)
        const ww = pond.w * WORLD.tile;
        const wh = pond.h * WORLD.tile;
        this.add
          .image(pond.x * WORLD.tile + ww / 2, pond.y * WORLD.tile + wh / 2, TX.pondWater)
          .setDisplaySize(ww + 64, wh + 56)
          .setDepth(-94);
      }
    }

    // winding dirt roads stamped along polylines (under marble plazas)
    this.buildPaths();

    // painterly mosaic / garden floors (organic edges blend onto grass)
    for (const p of plazas) {
      this.add
        .image(p.x + p.w / 2, p.y + p.h / 2, p.floor)
        .setDisplaySize(p.w, p.h)
        .setDepth(-90);
    }
    // reserved "future temple" plots: cohesive AI marble shrine-foundation overlay
    for (const plot of templePlots) {
      this.add
        .image(plot.x, plot.y, TX.shrinePlot)
        .setOrigin(0.5, 0.5)
        .setDisplaySize(248, 248 * 0.668)
        .setDepth(-88);
    }

    this.buildPathBlends();
    this.buildPatches();
    this.buildScatter();
  }

  /** Large painterly ground-detail patches (meadows, rocky outcrops, fields) that
   *  enrich the open fields. They sit just above the tilemap and plaza floors but
   *  below paths/props so tufts and trees still layer over them. */
  private buildPatches(): void {
    for (const p of groundPatches) {
      const h = p.w * (PATCH_RATIO[p.key] ?? 0.75);
      const spr = this.add.image(p.x, p.y, p.key).setOrigin(0.5, 0.5).setDisplaySize(p.w, h).setDepth(-89);
      if (p.flip) spr.setFlipX(true);
    }
  }

  /* ------------------------------------------------------------------ paths */

  /** Faint dirt "worn entry" where the main roads lap onto the marble plaza rims
   *  (depth -89, just above the mosaic) so roads flow in rather than being cut by
   *  a hard mosaic edge. Kept low-alpha so the marble still reads clean. */
  private buildPathBlends(): void {
    const entries: Array<{ x: number; y: number; dx: number; dy: number }> = [
      { x: 1800, y: 1188, dx: 0, dy: 1 }, // agora north (from spawn road)
      { x: 1574, y: 1356, dx: 1, dy: 0 }, // agora west (garden/temple roads)
      { x: 2026, y: 1352, dx: -1, dy: 0 }, // agora east (groves road)
      { x: 1404, y: 1252, dx: -0.5, dy: -0.86 }, // Temple of Zeus SE entry
      { x: 902, y: 1320, dx: -1, dy: 0 }, // Garden of the Muses east entry
    ];
    let seed = 71;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (const e of entries) {
      for (let i = 0; i < 3; i++) {
        const k = i * 15;
        this.add
          .image(e.x + e.dx * k, e.y + e.dy * k, TX.pathStamp)
          .setDepth(-89)
          .setScale(1.0 + rng() * 0.3)
          .setAngle(rng() * 360)
          .setAlpha(0.42 - i * 0.1);
      }
    }
  }

  private buildPaths(): void {
    let seed = 13;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (const line of pathways) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = line[i];
        const b = line[i + 1];
        const dist = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
        const steps = Math.max(2, Math.round(dist / 9));
        for (let s = 0; s <= steps; s++) {
          const t = s / steps;
          const x = a.x + (b.x - a.x) * t + (rng() - 0.5) * 6;
          const y = a.y + (b.y - a.y) * t + (rng() - 0.5) * 6;
          const stamp = this.add
            .image(x, y, TX.pathStamp)
            .setDepth(-91)
            .setScale(0.85 + rng() * 0.5);
          stamp.setAngle(rng() * 360);
          stamp.setAlpha(0.95);
        }
      }
    }
  }

  /* --------------------------------------------------------------- scatter */

  /** Sprinkle grass tufts, ferns, flowers and pebbles across open grass to kill
   *  empty space and soften hard tile edges. Deterministic so it never shifts. */
  private buildScatter(): void {
    let seed = 91;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

    // keep detail off marble, water, the mountain and building footprints
    const blockers: Array<{ x: number; y: number; w: number; h: number }> = [
      ...plazas,
      { x: 1440, y: 360, w: 720, h: 760 }, // summit + cliff
      { x: 1056, y: 736, w: 256, h: 224 }, // west pond
      { x: 2208, y: 736, w: 256, h: 224 }, // east pond
    ];
    for (const loc of locations) {
      const w = 320 * (loc.scale ?? 1);
      blockers.push({ x: loc.x - w / 2, y: loc.y - 320, w, h: 340 });
    }
    const blocked = (x: number, y: number) =>
      blockers.some((b) => x >= b.x - 8 && x <= b.x + b.w + 8 && y >= b.y - 8 && y <= b.y + b.h + 8);

    let placed = 0;
    let tries = 0;
    while (placed < 520 && tries < 4000) {
      tries++;
      const x = 60 + rng() * (WORLD.width - 120);
      const y = 80 + rng() * (WORLD.height - 140);
      if (blocked(x, y)) continue;
      const key = SCATTER_DETAILS[Math.floor(rng() * SCATTER_DETAILS.length)];
      const spr = this.add
        .image(x, y, key)
        .setOrigin(0.5, 1)
        .setDepth(y - 1)
        .setScale(0.8 + rng() * 0.7);
      if (rng() > 0.5) spr.setFlipX(true);
      placed++;
    }
  }

  /* ------------------------------------------------------------- buildings */

  private buildBuildings(): void {
    for (const loc of locations) {
      const img = this.add.image(loc.x, loc.y, loc.textureKey).setOrigin(0.5, 1);
      if (loc.scale && loc.scale !== 1) img.setScale(loc.scale);
      // soft cast shadow seats the building on the ground
      this.addGroundShadow(loc.x, loc.y - 6, img.displayWidth * 0.74, loc.y - 1);
      // origin is bottom-center, so depth tracks the base for correct sorting
      img.setDepth(loc.y);

      const footW = img.displayWidth * 0.62;
      const footH = 26;
      // collider sits across the building base; the door sits below it (front)
      this.addSolid(loc.x, loc.y - footH / 2, footW, footH);
    }
  }

  /** Soft elliptical contact shadow that grounds props/buildings on the terrain. */
  private addGroundShadow(x: number, y: number, w: number, depth: number): void {
    this.add
      .image(x, y, TX.shadow)
      .setOrigin(0.5, 0.5)
      .setDisplaySize(w, Math.max(8, w * 0.28))
      .setAlpha(0.3)
      .setDepth(depth);
  }

  /* ----------------------------------------------------------------- decor */

  private buildDecor(): void {
    for (const item of decor) {
      const sprite = this.add.image(item.x, item.y, item.key).setOrigin(0.5, 1);
      const scale = item.scale ?? PROP_SCALE[item.key] ?? 1;
      if (scale !== 1) sprite.setScale(scale);
      // contact shadow grounds the prop (skip the small flower clusters)
      if (!FLOWER_KEYS.has(item.key)) {
        this.addGroundShadow(item.x, item.y - 2, sprite.displayWidth * 0.6, item.y - 1);
      }
      sprite.setDepth(item.y);

      // gentle breeze sway for foliage (pivots at the trunk base via origin)
      if (TREE_KEYS.has(item.key)) {
        this.tweens.add({
          targets: sprite,
          angle: { from: -1.4, to: 1.4 },
          duration: 2200 + Math.random() * 1600,
          yoyo: true,
          repeat: -1,
          ease: "Sine.InOut",
          delay: Math.random() * 1500,
        });
      }

      if (item.solid) {
        const w = Math.min(sprite.displayWidth * 0.5, 44);
        this.addSolid(item.x, item.y - 6, w, 12);
      }
    }
  }

  /* -------------------------------------------------------------- god-rays */

  private buildGodrays(): void {
    const beams: Array<[number, number, number, number]> = [
      [1740, 360, 18, 1.4],
      [1860, 360, -16, 1.7],
      [1800, 340, 4, 2.1],
      [900, 980, 14, 1.2],
      [2500, 980, -12, 1.2],
    ];
    for (const [x, y, angle, scale] of beams) {
      const ray = this.add
        .image(x, y, TX.godray)
        .setOrigin(0.5, 0)
        .setAngle(angle)
        .setScale(scale, scale)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.12)
        .setDepth(70000);
      this.tweens.add({
        targets: ray,
        alpha: { from: 0.08, to: 0.2 },
        duration: 3200 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  /* ------------------------------------------------------------ footstep dust */

  private spawnDust(x: number, y: number): void {
    const puff = this.add
      .image(x + (Math.random() - 0.5) * 6, y, TX.cloud3)
      .setTint(0xcbb890)
      .setAlpha(0.4)
      .setScale(0.12)
      .setDepth(y - 2);
    this.tweens.add({
      targets: puff,
      scale: 0.3,
      alpha: 0,
      duration: 360,
      ease: "Quad.Out",
      onComplete: () => puff.destroy(),
    });
  }

  /* ---------------------------------------------------------------- clouds */

  private buildClouds(): void {
    let seed = 7;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 14; i++) {
      const key = CLOUD_KEYS[Math.floor(rng() * CLOUD_KEYS.length)];
      const cloud = this.add
        .image(rng() * WORLD.width, rng() * WORLD.height, key)
        .setDepth(80000)
        .setAlpha(0.32 + rng() * 0.3)
        .setScale(1.5 + rng() * 2.2);
      cloud.setFlipX(rng() > 0.5);
      cloud.setData("speed", 4 + rng() * 10);
      this.clouds.push(cloud);
    }
  }

  /* ------------------------------------------------------------------ opps */

  private spawnOpps(): void {
    for (const def of oppDefs) {
      const opp = new Opp(this, def);
      this.opps.push(opp);
      this.physics.add.collider(this.player.sprite, opp.sprite);
    }
  }

  private buildInteractables(): Interactable[] {
    const list: Interactable[] = [];

    for (const opp of this.opps) {
      list.push({
        kind: "talk",
        refId: opp.def.id,
        label: `Talk to ${opp.def.name}`,
        range: 56,
        getPos: () => ({ x: opp.x, y: opp.y }),
      });
    }

    for (const loc of locations) {
      if (!loc.enterable) continue;
      list.push({
        kind: "enter",
        refId: loc.id,
        label: `Enter ${loc.name}`,
        range: 54,
        getPos: () => ({ x: loc.x, y: loc.y + loc.doorOffsetY }),
      });
    }
    return list;
  }

  /* --------------------------------------------------------------- helpers */

  private addSolid(cx: number, cy: number, w: number, h: number): void {
    const rect = this.add.rectangle(cx, cy, w, h);
    this.physics.add.existing(rect, true);
    this.solids.add(rect);
  }

  private handleInteract(): void {
    const target = this.interaction.getCurrent();
    if (!target) return;

    if (target.kind === "talk") {
      const def = getOpp(target.refId);
      if (def) {
        this.inputSystem.setEnabled(false);
        bridge.emit("game:dialog-open", buildOppDialogData(def));
      }
    } else if (target.kind === "enter") {
      this.enterLocation(target.refId);
    }
  }

  private enterLocation(locationId: string): void {
    const loc = locations.find((l) => l.id === locationId);
    if (!loc) return;
    const returnX = loc.x;
    const returnY = loc.y + loc.doorOffsetY + 24;
    this.cameras.main.fadeOut(240, 10, 8, 14);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("InteriorScene", { locationId, returnX, returnY });
    });
  }

  /* ----------------------------------------------------------------- bridge */

  private registerBridge(): void {
    const onClose = () => this.inputSystem.setEnabled(true);
    const onChat = ({ oppId, text }: { oppId: string; text: string }) => {
      const def = getOpp(oppId);
      if (!def) return;
      resolveReply(def, text)
        .then((reply) => bridge.emit("game:opp-reply", { oppId, text: reply }))
        .catch((err) => {
          const fallback =
            def.id === "zeus"
              ? `Couldn't reach Zeus (${err instanceof Error ? err.message : String(err)}).`
              : generateReply(def, text);
          bridge.emit("game:opp-reply", { oppId, text: fallback });
        });
    };
    const onTalk = ({ oppId }: { oppId: string }) => {
      const def = getOpp(oppId);
      if (def) {
        this.inputSystem.setEnabled(false);
        bridge.emit("game:dialog-open", buildOppDialogData(def));
      }
    };
    const onEnter = ({ locationId }: { locationId: string }) => this.enterLocation(locationId);

    bridge.on("ui:close-dialog", onClose);
    bridge.on("ui:send-chat", onChat);
    bridge.on("ui:talk", onTalk);
    bridge.on("ui:enter-location", onEnter);
    this.handlers.push(
      () => bridge.off("ui:close-dialog", onClose),
      () => bridge.off("ui:send-chat", onChat),
      () => bridge.off("ui:talk", onTalk),
      () => bridge.off("ui:enter-location", onEnter),
    );
  }

  private teardown(): void {
    for (const off of this.handlers) off();
    this.handlers.length = 0;
    this.interaction?.destroy();
  }

  private emitInitialState(): void {
    bridge.emit("game:ready", undefined);
    bridge.emit("game:location", { id: "overworld", label: "Mount Olympus" });
    bridge.emit("game:hud", {
      drachmas: 0,
      drachmasMonthNet: 0,
      drachmasWeekNet: 0,
      drachmasNegative: false,
      drachmasRate: 0,
      alerts: 2,
      alliesOnline: this.opps.length,
      missions: [],
      locationLabel: "Mount Olympus",
    });
    bridge.emit(
      "game:allies",
      this.opps.map((o) => ({
        id: o.def.id,
        name: o.def.name,
        title: o.def.title,
        status: o.def.status,
        accent: o.def.accent,
      })),
    );
  }

  update(time: number, delta: number): void {
    const v = this.inputSystem.moveVector();
    const sprinting = this.inputSystem.isSprinting();
    this.player.move(v.x, v.y, sprinting);
    this.player.sync();

    // footstep dust while moving (kicks up faster when sprinting)
    if (v.x !== 0 || v.y !== 0) {
      this.dustAccum += delta;
      const cadence = sprinting ? 70 : 130;
      if (this.dustAccum >= cadence) {
        this.dustAccum = 0;
        this.spawnDust(this.player.x, this.player.y + 2);
      }
    }

    for (const opp of this.opps) opp.update(time);

    const dt = delta / 1000;
    for (const cloud of this.clouds) {
      cloud.x += (cloud.getData("speed") as number) * dt;
      if (cloud.x - cloud.displayWidth > WORLD.width) cloud.x = -cloud.displayWidth;
    }

    this.cameraSystem.update();
    const zoom = this.cameras.main.zoom;
    this.interaction.update(this.player.x, this.player.y, zoom);
    this.speech.update(time, zoom);
  }
}
