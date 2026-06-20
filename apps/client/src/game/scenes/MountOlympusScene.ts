import Phaser from "phaser";
import { bridge } from "../EventBridge";
import { TX } from "../art/keys";
import {
  WORLD,
  PLAYER_SPAWN,
  locations,
  templePlots,
  plazas,
  paths,
  decor,
  PROP_SCALE,
} from "../world/olympusWorld";
import { opps as oppDefs, getOpp } from "../world/agentStates";
import { Player } from "../entities/createPlayer";
import { Opp } from "../entities/createOpp";
import { InputSystem } from "../systems/InputSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { InteractionSystem, type Interactable } from "../systems/InteractionSystem";
import { SpeechBubbleSystem } from "../systems/SpeechBubbleSystem";
import { buildOppDialogData, generateReply } from "../dialog";

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

    this.buildTerrain();
    this.solids = this.physics.add.staticGroup();
    this.buildBuildings();
    this.buildDecor();
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
    this.add.tileSprite(0, 0, WORLD.width, WORLD.height, TX.grass).setOrigin(0, 0).setDepth(-100);

    let seed = 1337;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 260; i++) {
      const x = Math.floor(rng() * WORLD.width);
      const y = Math.floor(rng() * WORLD.height);
      this.add.image(x, y, TX.grassAlt).setDepth(-99).setAlpha(0.55 + rng() * 0.35);
    }

    for (const p of plazas) {
      this.add.tileSprite(p.x, p.y, p.w, p.h, TX.marbleFloor).setOrigin(0, 0).setDepth(-90);
    }
    for (const p of paths) {
      this.add.tileSprite(p.x, p.y, p.w, p.h, TX.pathTile).setOrigin(0, 0).setDepth(-89);
    }
    for (const plot of templePlots) {
      this.add.image(plot.x, plot.y, TX.templePlot).setOrigin(0.5, 1).setDepth(plot.y);
    }
  }

  /* ------------------------------------------------------------- buildings */

  private buildBuildings(): void {
    for (const loc of locations) {
      const img = this.add.image(loc.x, loc.y, loc.textureKey).setOrigin(0.5, 1);
      if (loc.scale && loc.scale !== 1) img.setScale(loc.scale);
      // origin is bottom-center, so depth tracks the base for correct sorting
      img.setDepth(loc.y);

      const footW = img.displayWidth * 0.62;
      const footH = 26;
      // collider sits across the building base; the door sits below it (front)
      this.addSolid(loc.x, loc.y - footH / 2, footW, footH);
    }
  }

  /* ----------------------------------------------------------------- decor */

  private buildDecor(): void {
    for (const item of decor) {
      const sprite = this.add.image(item.x, item.y, item.key).setOrigin(0.5, 1);
      const scale = item.scale ?? PROP_SCALE[item.key] ?? 1;
      if (scale !== 1) sprite.setScale(scale);
      sprite.setDepth(item.y);

      if (item.solid) {
        const w = Math.min(sprite.displayWidth * 0.5, 44);
        this.addSolid(item.x, item.y - 6, w, 12);
      }
    }
  }

  /* ---------------------------------------------------------------- clouds */

  private buildClouds(): void {
    let seed = 7;
    const rng = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 7; i++) {
      const cloud = this.add
        .image(rng() * WORLD.width, rng() * WORLD.height, TX.cloud)
        .setDepth(80000)
        .setAlpha(0.5)
        .setScale(2 + rng() * 2.5);
      cloud.setData("speed", 5 + rng() * 9);
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
      this.time.delayedCall(420, () => {
        bridge.emit("game:opp-reply", { oppId, text: generateReply(def, text) });
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
      drachmas: 12480,
      drachmasRate: 34,
      alerts: 2,
      alliesOnline: this.opps.length,
      missions: [
        { id: "hq", label: "Establish Olympus HQ", done: true },
        { id: "zeus", label: "Meet Zeus", done: false },
        { id: "temple", label: "Inspect the Temple of Zeus", done: false },
      ],
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
    this.player.move(v.x, v.y);
    this.player.sync();

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
