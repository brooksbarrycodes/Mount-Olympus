import Phaser from "phaser";
import { bridge } from "../EventBridge";
import { TX } from "../art/keys";
import { interiors, type InteriorDef } from "../world/interiors";
import { PROP_SCALE } from "../world/olympusWorld";
import { getOpp } from "../world/agentStates";
import { Player } from "../entities/createPlayer";
import { Opp } from "../entities/createOpp";
import { InputSystem } from "../systems/InputSystem";
import { InteractionSystem, type Interactable } from "../systems/InteractionSystem";
import { CameraSystem } from "../systems/CameraSystem";
import { SpeechBubbleSystem } from "../systems/SpeechBubbleSystem";
import { buildOppDialogData, generateReply, resolveReply } from "../dialog";

interface InteriorData {
  locationId: string;
  returnX: number;
  returnY: number;
}

interface Seat {
  x: number;
  y: number;
  faceLeft: boolean;
}

/** What the player is currently doing while seated (drives which overlay closes). */
type SeatMode = "none" | "gathering" | "meeting" | "desk";

/**
 * A bounded interior room you walk around in. The Pantheon is a bespoke command
 * hall: a council table where the gods gather for meetings and a back desk that
 * opens the business dashboard. Other interiors (temples) use the generic dress.
 */
export class InteriorScene extends Phaser.Scene {
  private def!: InteriorDef;
  private entryData!: InteriorData;
  private player!: Player;
  private occupant?: Opp;
  private gods: Opp[] = [];
  private seats: Seat[] = [];
  private wanderHomes: Array<{ x: number; y: number }> = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private inputSystem!: InputSystem;
  private interaction!: InteractionSystem;
  private cameraSystem!: CameraSystem;
  private speech?: SpeechBubbleSystem;
  private leaving = false;
  private seatMode: SeatMode = "none";
  private readonly handlers: Array<() => void> = [];

  constructor() {
    super("InteriorScene");
  }

  init(data: InteriorData): void {
    this.entryData = data;
    this.leaving = false;
    this.gods = [];
    this.seats = [];
    this.wanderHomes = [];
    this.seatMode = "none";
  }

  create(): void {
    const def = interiors[this.entryData.locationId];
    if (!def) {
      this.returnToOverworld();
      return;
    }
    this.def = def;

    this.physics.world.setBounds(0, 0, def.width, def.height);
    this.solids = this.physics.add.staticGroup();

    if (def.theme === "pantheon") {
      this.buildPantheon(def);
    } else {
      this.buildRoom(def);
    }

    this.player = new Player(this, def.entry.x, def.entry.y);
    this.physics.add.collider(this.player.sprite, this.solids);

    if (def.occupant) {
      const oppDef = getOpp(def.occupant.oppId);
      if (oppDef) {
        this.occupant = new Opp(this, {
          ...oppDef,
          spawn: { x: def.occupant.x, y: def.occupant.y },
          wanderRadius: 28,
        });
        this.physics.add.collider(this.player.sprite, this.occupant.sprite);
      }
    }

    if (def.theme === "pantheon") {
      this.spawnCouncil(def);
    }

    this.inputSystem = new InputSystem(this, () => this.handleInteract());
    this.interaction = new InteractionSystem(this);
    this.interaction.setInteractables(this.buildInteractables());

    this.cameraSystem = new CameraSystem(this, this.player.sprite, def.width, def.height);

    this.registerBridge();
    this.cameras.main.fadeIn(260, 10, 8, 14);

    bridge.emit("game:location", { id: def.id, label: def.name });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  /* ----------------------------------------------------------- generic room */

  private buildRoom(def: InteriorDef): void {
    const accent = Phaser.Display.Color.HexStringToColor(def.accent).color;
    const rug = Phaser.Display.Color.HexStringToColor(def.rug).color;

    this.add.tileSprite(0, 0, def.width, def.height, TX.marbleFloor).setOrigin(0, 0).setDepth(-100);

    this.add
      .rectangle(28, 80, def.width - 56, def.height - 120)
      .setStrokeStyle(2, 0xb07c16, 0.5)
      .setOrigin(0, 0)
      .setDepth(-99);

    const cx = def.width / 2;
    const ry = def.height / 2 + 40;
    this.add.ellipse(cx, ry, def.width * 0.5, def.height * 0.42, rug, 0.5).setDepth(-98);
    this.add
      .ellipse(cx, ry, def.width * 0.5, def.height * 0.42)
      .setStrokeStyle(3, 0xd6aa46, 0.8)
      .setDepth(-97);
    this.add
      .ellipse(cx, ry, def.width * 0.3, def.height * 0.26)
      .setStrokeStyle(2, 0xd6aa46, 0.6)
      .setDepth(-97);
    this.add.circle(cx, ry, 10, 0xd6aa46, 0.85).setDepth(-97);

    this.add.rectangle(0, 0, def.width, 86, 0x241f1b).setOrigin(0, 0).setDepth(-95);
    this.add.rectangle(0, 60, def.width, 18, 0x22345c).setOrigin(0, 0).setDepth(-94);
    for (let x = 16; x < def.width - 12; x += 26) {
      this.add.rectangle(x, 64, 14, 10).setStrokeStyle(1, 0xd6aa46, 0.8).setOrigin(0, 0).setDepth(-93);
    }
    this.add.rectangle(0, 84, def.width, 4, 0xb07c16, 0.7).setOrigin(0, 0).setDepth(-93);

    for (let x = 70; x <= def.width - 70; x += 120) {
      const col = this.add.image(x, 150, TX.column).setOrigin(0.5, 1).setDepth(120);
      col.setScale(PROP_SCALE[TX.column] ?? 0.42);
    }

    this.buildBanners(def, accent);

    if (def.dais) {
      const { x, y, w, statue } = def.dais;
      for (let i = 0; i < 3; i++) {
        this.add
          .rectangle(x, y + i * 12, w - i * 28, 14, i % 2 ? 0xcdc8b8 : 0xe9e6da)
          .setDepth(y - 40 + i);
      }
      const s = this.add.image(x, y - 6, statue).setOrigin(0.5, 1).setDepth(y);
      s.setScale((PROP_SCALE[statue] ?? 0.5) * 1.15);
      this.add.rectangle(x, y - 30, 64, 70, 0x2a2622).setOrigin(0.5, 1).setDepth(y - 41);
      this.add.rectangle(x, y - 30, 64, 70).setStrokeStyle(2, 0xd6aa46, 0.8).setOrigin(0.5, 1).setDepth(y - 40);
    }

    for (const b of def.braziers) this.addBrazier(b.x, b.y);

    for (const gx of [def.width * 0.28, def.width * 0.72]) {
      this.add
        .image(gx, 86, TX.godray)
        .setOrigin(0.5, 0)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.1)
        .setAngle(8)
        .setScale(1.1, 1.6)
        .setDepth(60000);
    }

    this.buildWalls(def);
    this.buildPlacards(def);
    this.buildProps(def);
    this.buildExitMat(def);
  }

  /* ----------------------------------------------------- Pantheon command hall */

  private buildPantheon(def: InteriorDef): void {
    const accent = Phaser.Display.Color.HexStringToColor(def.accent).color;
    const W = def.width;

    // polished marble floor + warm tint
    this.add.tileSprite(0, 0, W, def.height, TX.marbleFloor).setOrigin(0, 0).setDepth(-100);
    this.add.rectangle(0, 0, W, def.height, 0x2a2140, 0.12).setOrigin(0, 0).setDepth(-99.5);

    // gold inlaid border
    this.add
      .rectangle(26, 96, W - 52, def.height - 130)
      .setStrokeStyle(2, 0xd6aa46, 0.45)
      .setOrigin(0, 0)
      .setDepth(-99);

    // central sun-mosaic medallion under the table
    if (def.table) {
      const med = Math.max(def.table.w, def.table.h) * 1.5;
      this.add
        .image(def.table.x, def.table.y, TX.floorPantheon)
        .setDisplaySize(med, med)
        .setAlpha(0.92)
        .setDepth(-98);
      this.add
        .ellipse(def.table.x, def.table.y, med, med)
        .setStrokeStyle(3, 0xd6aa46, 0.7)
        .setDepth(-97);
    }

    this.buildDome(def);

    // back colonnade along the side walls (frames the hall, not the center)
    for (const sx of [66, W - 66]) {
      for (const sy of [220, 380, 540]) {
        const col = this.add.image(sx, sy, TX.column).setOrigin(0.5, 1).setDepth(sy);
        col.setScale(PROP_SCALE[TX.column] ?? 0.42);
      }
    }

    // gold wall-relief medallions
    if (def.reliefs) {
      for (const rx of def.reliefs) {
        this.add
          .image(rx, 50, TX.wallRelief)
          .setOrigin(0.5, 0.5)
          .setScale(PROP_SCALE[TX.wallRelief] ?? 0.07)
          .setDepth(-92);
      }
    }

    this.buildBanners(def, accent);
    this.buildDais(def);
    this.buildTable(def);

    for (const b of def.braziers) this.addBrazier(b.x, b.y);
    if (def.candelabra) for (const c of def.candelabra) this.addCandelabra(c.x, c.y);

    this.buildWalls(def);
    this.buildPlacards(def);
    this.buildProps(def);
    this.buildExitMat(def);
  }

  /** Coffered dome band + oculus light beam and drifting dust motes. */
  private buildDome(def: InteriorDef): void {
    const W = def.width;
    const cx = W / 2;

    // dark coffered ceiling band
    this.add.rectangle(0, 0, W, 96, 0x1b2742).setOrigin(0, 0).setDepth(-95);
    // concentric dome rings suggesting a cupola seen from below
    for (let i = 0; i < 4; i++) {
      this.add
        .ellipse(cx, 18, 520 - i * 110, 150 - i * 30)
        .setStrokeStyle(2, 0xd6aa46, 0.32 + i * 0.06)
        .setDepth(-94);
    }
    // coffer studs
    for (let x = 24; x < W - 16; x += 30) {
      this.add
        .rectangle(x, 70, 16, 12)
        .setStrokeStyle(1, 0xd6aa46, 0.5)
        .setOrigin(0, 0)
        .setDepth(-93);
    }
    this.add.rectangle(0, 92, W, 4, 0xd6aa46, 0.7).setOrigin(0, 0).setDepth(-93);

    if (!def.oculus) return;

    // oculus eye
    this.add.circle(cx, 16, 24, 0x0e1730).setDepth(-94);
    this.add.circle(cx, 16, 24).setStrokeStyle(3, 0xf5d98a, 0.8).setDepth(-93);
    const eye = this.add
      .image(cx, 16, TX.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xfff0c0)
      .setScale(1.6)
      .setAlpha(0.7)
      .setDepth(-93);
    this.tweens.add({
      targets: eye,
      alpha: { from: 0.5, to: 0.85 },
      duration: 2600,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });

    // light beam down onto the table
    const beamY = def.table ? def.table.y : def.height * 0.6;
    this.add
      .image(cx, 24, TX.godray)
      .setOrigin(0.5, 0)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.14)
      .setScale(2.4, (beamY - 24) / 120)
      .setDepth(59000);

    // drifting dust motes inside the beam
    for (let i = 0; i < 14; i++) {
      const mx = cx + (Math.random() - 0.5) * 150;
      const my = 40 + Math.random() * (beamY - 60);
      const mote = this.add
        .image(mx, my, TX.spark)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setAlpha(0.15 + Math.random() * 0.2)
        .setScale(0.4 + Math.random() * 0.5)
        .setDepth(59001);
      this.tweens.add({
        targets: mote,
        y: my + 40 + Math.random() * 40,
        x: mx + (Math.random() - 0.5) * 30,
        alpha: 0,
        duration: 4000 + Math.random() * 4000,
        repeat: -1,
        ease: "Sine.InOut",
        onRepeat: () => {
          mote.y = 40 + Math.random() * 60;
          mote.setAlpha(0.15 + Math.random() * 0.2);
        },
      });
    }
  }

  /** Raised back dais carrying the command desk. */
  private buildDais(def: InteriorDef): void {
    if (!def.throne && !def.desk) return;
    const cx = def.throne?.x ?? def.desk?.x ?? def.width / 2;

    // marble step platform
    for (let i = 0; i < 3; i++) {
      this.add
        .rectangle(cx, 120 + i * 14, 320 - i * 36, 16, i % 2 ? 0xcdc8b8 : 0xe9e6da)
        .setDepth(110 + i);
    }

    if (def.desk) {
      const d = this.add
        .image(def.desk.x, def.desk.y, TX.commandDesk)
        .setOrigin(0.5, 1)
        .setScale(PROP_SCALE[TX.commandDesk] ?? 0.11)
        .setDepth(def.desk.y);
      this.addSolid(def.desk.x, def.desk.y - 14, d.displayWidth * 0.82, 26);
      // warm reading glow over the desk
      const g = this.add
        .image(def.desk.x, def.desk.y - 30, TX.glow)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(0xffd98a)
        .setAlpha(0.22)
        .setScale(2.0)
        .setDepth(def.desk.y - 1);
      this.tweens.add({
        targets: g,
        alpha: { from: 0.16, to: 0.3 },
        duration: 1800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  /** Long council table with chairs tucked along both sides + the head throne. */
  private buildTable(def: InteriorDef): void {
    if (!def.table) return;
    const { x: cx, y: cy, w, h } = def.table;

    // contact shadow beneath the table
    this.add.ellipse(cx, cy + h * 0.46, w * 1.55, h * 0.3, 0x000000, 0.22).setDepth(cy - h / 2 - 2);

    // chairs tucked at the table edges (left chairs face right, right chairs face
    // left via flipX). Rendered BELOW the table depth so the tabletop overlaps and
    // they read as pulled under the table.
    const chairDepth = cy - h / 2 - 1;
    this.seats = this.computeSeats(def);
    for (const seat of this.seats) {
      this.add
        .image(seat.x, seat.y + 8, TX.councilChairSide)
        .setOrigin(0.5, 0.9)
        .setFlipX(seat.faceLeft)
        .setScale(PROP_SCALE[TX.councilChairSide] ?? 0.055)
        .setDepth(chairDepth);
    }

    // the grand long table (drawn over the tucked-in chairs)
    this.add
      .image(cx, cy, TX.councilTableLong)
      .setOrigin(0.5, 0.5)
      .setScale(PROP_SCALE[TX.councilTableLong] ?? 0.265)
      .setDepth(cy);

    // table collider (kept inside the seat columns so occupants can approach)
    this.addSolid(cx, cy, w * 0.9, h * 0.88);

    // the player's head chair at the head of the table (faces down the table)
    if (def.headSeat) {
      this.add
        .image(def.headSeat.x, def.headSeat.y + 10, TX.throne)
        .setOrigin(0.5, 0.9)
        .setScale((PROP_SCALE[TX.throne] ?? 0.1) * 0.92)
        .setDepth(def.headSeat.y - 1);
    }
  }

  /**
   * Council seats down each long edge, hugging the table. The table is drawn in
   * perspective (its top is narrower than its front), so each row's chair x is
   * derived from the measured tabletop trapezoid - the higher (further) the row,
   * the more the chair moves toward the center to stay tucked under the edge.
   */
  private computeSeats(def: InteriorDef): Seat[] {
    if (!def.table) return [];
    const { x: cx, y: cy, w, h } = def.table;
    const per = def.seatsPerSide ?? 3;

    // source PNG + measured tabletop trapezoid (opaque-pixel edges)
    const SRC_W = 597;
    const SRC_H = 954;
    const TOP_SRC = 8; // top of the tabletop surface
    const FRONT_SRC = 667; // front edge where the legs begin
    const L_TOP = 79;
    const L_FRONT = 5;
    const R_TOP = 516;
    const R_FRONT = 591;
    const tuck = 4; // how far the chair center sits outside the edge

    const sx = w / SRC_W;
    const sy = h / SRC_H;
    const top = cy - h / 2;
    const seats: Seat[] = [];

    for (let i = 0; i < per; i++) {
      // rows spread across the tabletop sides (avoid the legs near the foot)
      const f = 0.15 + (per > 1 ? (i / (per - 1)) * 0.5 : 0.25);
      const seatY = top + f * h;
      const py = (seatY - cy) / sy + SRC_H / 2;
      const t = Math.min(1, Math.max(0, (py - TOP_SRC) / (FRONT_SRC - TOP_SRC)));
      const leftEdge = cx + (L_TOP + (L_FRONT - L_TOP) * t - SRC_W / 2) * sx;
      const rightEdge = cx + (R_TOP + (R_FRONT - R_TOP) * t - SRC_W / 2) * sx;
      seats.push({ x: leftEdge - tuck, y: seatY, faceLeft: false }); // left looks right
      seats.push({ x: rightEdge + tuck, y: seatY, faceLeft: true }); // right looks left
    }
    return seats;
  }

  /* ----------------------------------------------------------- shared pieces */

  private buildBanners(def: InteriorDef, accent: number): void {
    for (const bx of def.banners) {
      this.add.rectangle(bx, 96, 30, 96, accent, 0.92).setOrigin(0.5, 0).setDepth(-92);
      this.add.rectangle(bx, 96, 30, 96).setStrokeStyle(2, 0xd6aa46, 0.7).setOrigin(0.5, 0).setDepth(-91);
      this.add.circle(bx, 196, 10, 0xd6aa46, 0.9).setDepth(-91);
      const tail = this.add.triangle(bx, 192, -15, 0, 15, 0, 0, 16, accent, 0.92).setDepth(-91);
      this.tweens.add({
        targets: tail,
        scaleX: { from: 0.86, to: 1.1 },
        duration: 1600 + Math.random() * 600,
        yoyo: true,
        repeat: -1,
        ease: "Sine.InOut",
      });
    }
  }

  private addBrazier(x: number, y: number): void {
    const glow = this.add
      .image(x, y - 6, TX.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffb24a)
      .setAlpha(0.4)
      .setScale(2.4)
      .setDepth(y - 1);
    this.tweens.add({
      targets: glow,
      alpha: { from: 0.28, to: 0.5 },
      scale: { from: 2.2, to: 2.7 },
      duration: 700 + Math.random() * 400,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
    this.add.image(x, y, TX.brazier).setOrigin(0.5, 1).setDepth(y).setScale(PROP_SCALE[TX.brazier] ?? 0.34);
  }

  private addCandelabra(x: number, y: number): void {
    const stand = this.add
      .image(x, y, TX.candelabra)
      .setOrigin(0.5, 1)
      .setScale(PROP_SCALE[TX.candelabra] ?? 0.066)
      .setDepth(y);
    const topY = y - stand.displayHeight * 0.86;
    const flame = this.add
      .image(x, topY, TX.glow)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setTint(0xffc25a)
      .setAlpha(0.5)
      .setScale(1.1)
      .setDepth(y + 1);
    this.tweens.add({
      targets: flame,
      alpha: { from: 0.32, to: 0.62 },
      scaleX: { from: 0.9, to: 1.2 },
      scaleY: { from: 1.0, to: 1.25 },
      duration: 320 + Math.random() * 260,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut",
    });
  }

  private buildWalls(def: InteriorDef): void {
    const wall = 0x1c1a16;
    const t = 10;
    for (const [x, y, w, h] of [
      [0, 0, def.width, t],
      [0, def.height - t, def.width, t],
      [0, 0, t, def.height],
      [def.width - t, 0, t, def.height],
    ] as const) {
      this.add.rectangle(x, y, w, h, wall).setOrigin(0, 0).setDepth(50000);
    }
  }

  private buildPlacards(def: InteriorDef): void {
    for (const p of def.placards) {
      this.add
        .rectangle(p.x, p.y, 124, 30, 0x141823, 0.82)
        .setStrokeStyle(1, 0xffffff, 0.18)
        .setDepth(p.y);
      this.add
        .text(p.x, p.y - 6, p.title, {
          fontFamily: "Georgia, serif",
          fontSize: "11px",
          color: "#fff4cf",
        })
        .setOrigin(0.5)
        .setDepth(p.y + 1);
      this.add
        .text(p.x, p.y + 7, p.subtitle, {
          fontFamily: "Georgia, serif",
          fontSize: "8px",
          color: "#cdc8b8",
        })
        .setOrigin(0.5)
        .setDepth(p.y + 1);
    }
  }

  private buildProps(def: InteriorDef): void {
    for (const prop of def.props) {
      const sprite = this.add.image(prop.x, prop.y, prop.key).setOrigin(0.5, 1);
      const scale = prop.scale ?? PROP_SCALE[prop.key] ?? 1;
      if (scale !== 1) sprite.setScale(scale);
      sprite.setDepth(prop.y);
    }
  }

  private buildExitMat(def: InteriorDef): void {
    const accentColor = Phaser.Display.Color.HexStringToColor(def.accent).color;
    this.add
      .rectangle(def.exit.x, def.exit.y, 48, 16, accentColor, 0.35)
      .setStrokeStyle(1, 0xffffff, 0.3)
      .setDepth(2);
    this.add
      .text(def.exit.x, def.exit.y + 16, "Exit", {
        fontFamily: "Georgia, serif",
        fontSize: "9px",
        color: "#f4efe1",
      })
      .setOrigin(0.5)
      .setDepth(3);
  }

  /** Invisible static collider rectangle. */
  private addSolid(cx: number, cy: number, w: number, h: number): void {
    const zone = this.add.rectangle(cx, cy, w, h, 0xff0000, 0);
    this.physics.add.existing(zone, true);
    this.solids.add(zone);
  }

  /* -------------------------------------------------------------- the gods */

  private spawnCouncil(def: InteriorDef): void {
    if (!def.attendees) return;
    this.gods = [];
    this.wanderHomes = [];
    // gods mill just below the table, each near their own seat's side, so
    // "calling a meeting" walks them straight to their chair (never across it)
    const baseY = def.table ? def.table.y + def.table.h / 2 + 64 : def.height - 110;
    def.attendees.forEach((id, i) => {
      const oppDef = getOpp(id);
      if (!oppDef) return;
      const seat = this.seats[i];
      const hx = seat ? Phaser.Math.Clamp(seat.x, 130, def.width - 130) : 200 + i * 90;
      const hy = baseY + (i % 2 === 0 ? -14 : 14);
      const god = new Opp(this, {
        ...oppDef,
        spawn: { x: hx, y: hy },
        wanderRadius: 16,
      });
      this.physics.add.collider(this.player.sprite, god.sprite);
      this.gods.push(god);
      this.wanderHomes.push({ x: hx, y: hy });
    });
    this.speech = new SpeechBubbleSystem(this, this.gods);
  }

  private buildInteractables(): Interactable[] {
    const list: Interactable[] = [
      {
        kind: "exit",
        refId: this.def.id,
        label: "Leave",
        range: 36,
        getPos: () => this.def.exit,
      },
    ];

    if (this.occupant) {
      const occ = this.occupant;
      list.push({
        kind: "talk",
        refId: occ.def.id,
        label: `Talk to ${occ.def.name}`,
        range: 52,
        getPos: () => ({ x: occ.x, y: occ.y }),
      });
    }

    for (const god of this.gods) {
      list.push({
        kind: "talk",
        refId: god.def.id,
        label: `Talk to ${god.def.name}`,
        range: 46,
        getPos: () => ({ x: god.x, y: god.y }),
      });
    }

    if (this.def.headSeat) {
      const hasGods = (this.def.attendees?.length ?? 0) > 0;
      list.push({
        kind: "enter",
        refId: "table-head",
        label: hasGods ? "Take your seat & call a meeting" : "Take your seat at the head",
        range: 54,
        getPos: () => this.def.headSeat!,
      });
    }
    if (this.def.desk) {
      list.push({
        kind: "enter",
        refId: "command-desk",
        label: "Sit & review your businesses",
        range: 54,
        getPos: () => ({ x: this.def.desk!.x, y: this.def.desk!.y + 30 }),
      });
    }

    return list;
  }

  /* ------------------------------------------------------------ interaction */

  private handleInteract(): void {
    const target = this.interaction.getCurrent();
    if (!target) return;

    if (target.kind === "exit") {
      this.returnToOverworld();
      return;
    }

    if (target.kind === "talk") {
      const def = getOpp(target.refId);
      if (def) {
        this.inputSystem.setEnabled(false);
        bridge.emit("game:dialog-open", buildOppDialogData(def));
      }
      return;
    }

    if (target.kind === "enter") {
      if (target.refId === "table-head") this.beginMeeting();
      else if (target.refId === "command-desk") this.sitAtDesk();
    }
  }

  private beginMeeting(): void {
    if (this.seatMode !== "none" || !this.def.headSeat) return;
    this.seatMode = "gathering";
    this.player.snapTo(this.def.headSeat.x, this.def.headSeat.y, "down", true);
    this.inputSystem.setEnabled(false);
    // freeze wander so the scene can script each god to its seat
    for (const god of this.gods) god.seating = true;
  }

  private sitAtDesk(): void {
    if (this.seatMode !== "none" || !this.def.desk) return;
    this.seatMode = "desk";
    this.player.snapTo(this.def.desk.x, this.def.desk.y + 30, "up");
    this.inputSystem.setEnabled(false);
    bridge.emit("game:open-dashboard", undefined);
  }

  private endSeated(): void {
    if (this.seatMode === "none") return;
    const wasMeeting = this.seatMode === "meeting" || this.seatMode === "gathering";
    this.seatMode = "none";
    this.inputSystem.setEnabled(true);
    if (wasMeeting) {
      this.gods.forEach((god, i) => {
        const home = this.wanderHomes[i] ?? { x: god.x, y: god.y };
        god.releaseFrom(home.x, home.y, 16);
      });
    }
  }

  private returnToOverworld(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.cameras.main.fadeOut(240, 10, 8, 14);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start("MountOlympusScene", {
        spawnX: this.entryData.returnX,
        spawnY: this.entryData.returnY,
      });
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
        .catch(() => bridge.emit("game:opp-reply", { oppId, text: generateReply(def, text) }));
    };
    const onTalk = ({ oppId }: { oppId: string }) => {
      const def = getOpp(oppId);
      if (def) {
        this.inputSystem.setEnabled(false);
        bridge.emit("game:dialog-open", buildOppDialogData(def));
      }
    };
    const onCloseDash = () => this.endSeated();
    const onEndMeeting = () => this.endSeated();

    bridge.on("ui:close-dialog", onClose);
    bridge.on("ui:send-chat", onChat);
    bridge.on("ui:talk", onTalk);
    bridge.on("ui:close-dashboard", onCloseDash);
    bridge.on("ui:end-meeting", onEndMeeting);
    this.handlers.push(
      () => bridge.off("ui:close-dialog", onClose),
      () => bridge.off("ui:send-chat", onChat),
      () => bridge.off("ui:talk", onTalk),
      () => bridge.off("ui:close-dashboard", onCloseDash),
      () => bridge.off("ui:end-meeting", onEndMeeting),
    );
  }

  private teardown(): void {
    for (const off of this.handlers) off();
    this.handlers.length = 0;
    this.interaction?.destroy();
  }

  update(time: number): void {
    if (this.leaving) return;

    if (this.seatMode === "gathering") {
      this.stepGathering();
    } else if (this.seatMode === "none") {
      const v = this.inputSystem.moveVector();
      this.player.move(v.x, v.y, this.inputSystem.isSprinting());
    }

    this.player.sync();
    this.occupant?.update(time);
    for (const god of this.gods) god.update(time);
    this.speech?.update(time, this.cameras.main.zoom);
    this.cameraSystem.update();
    this.interaction.update(this.player.x, this.player.y, this.cameras.main.zoom);
  }

  /** Drive every god toward its assigned seat; open the meeting once all sit. */
  private stepGathering(): void {
    let allSeated = true;
    this.gods.forEach((god, i) => {
      const seat = this.seats[i];
      if (!seat) return;
      const target = { x: seat.x, y: seat.y - 4 };
      if (god.walkToward(target.x, target.y)) {
        god.seatAt(target.x, target.y, seat.faceLeft);
      } else {
        allSeated = false;
      }
    });

    if (allSeated) {
      this.seatMode = "meeting";
      bridge.emit("game:open-meeting", {
        attendees: this.def.attendees ?? this.gods.map((g) => g.def.id),
      });
    }
  }
}
