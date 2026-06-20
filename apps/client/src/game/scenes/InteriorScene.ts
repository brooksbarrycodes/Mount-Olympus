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
import { buildOppDialogData, generateReply } from "../dialog";

interface InteriorData {
  locationId: string;
  returnX: number;
  returnY: number;
}

/**
 * A bounded interior room you walk around in. Entering/leaving is a real scene
 * transition (camera fade), not a web modal. The occupant Opp (e.g. Zeus inside
 * his temple) can be talked to here just like in the overworld.
 */
export class InteriorScene extends Phaser.Scene {
  private def!: InteriorDef;
  private entryData!: InteriorData;
  private player!: Player;
  private occupant?: Opp;
  private inputSystem!: InputSystem;
  private interaction!: InteractionSystem;
  private cameraSystem!: CameraSystem;
  private leaving = false;
  private readonly handlers: Array<() => void> = [];

  constructor() {
    super("InteriorScene");
  }

  init(data: InteriorData): void {
    this.entryData = data;
    this.leaving = false;
  }

  create(): void {
    const def = interiors[this.entryData.locationId];
    if (!def) {
      this.returnToOverworld();
      return;
    }
    this.def = def;

    this.physics.world.setBounds(0, 0, def.width, def.height);
    this.buildRoom(def);

    this.player = new Player(this, def.entry.x, def.entry.y);

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

    this.inputSystem = new InputSystem(this, () => this.handleInteract());
    this.interaction = new InteractionSystem(this);
    this.interaction.setInteractables(this.buildInteractables());

    this.cameraSystem = new CameraSystem(this, this.player.sprite, def.width, def.height);

    this.registerBridge();
    this.cameras.main.fadeIn(260, 10, 8, 14);

    bridge.emit("game:location", { id: def.id, label: def.name });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());
  }

  /* ------------------------------------------------------------------ room */

  private buildRoom(def: InteriorDef): void {
    // floor
    this.add.tileSprite(0, 0, def.width, def.height, TX.marbleFloor).setOrigin(0, 0).setDepth(-100);

    // back wall band
    this.add.rectangle(0, 0, def.width, 64, 0x2a2622).setOrigin(0, 0).setDepth(-95);
    this.add.rectangle(0, 60, def.width, 6, 0xb07c16, 0.5).setOrigin(0, 0).setDepth(-94);

    // border walls (visual + collider)
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

    // placards
    for (const p of def.placards) {
      this.add
        .rectangle(p.x, p.y, 116, 30, 0x141823, 0.82)
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

    // props (real pixel-art sprites scaled to room proportions)
    for (const prop of def.props) {
      const sprite = this.add.image(prop.x, prop.y, prop.key).setOrigin(0.5, 1);
      const scale = prop.scale ?? PROP_SCALE[prop.key] ?? 1;
      if (scale !== 1) sprite.setScale(scale);
      sprite.setDepth(prop.y);
    }

    // exit mat
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
    return list;
  }

  /* ------------------------------------------------------------ interaction */

  private handleInteract(): void {
    const target = this.interaction.getCurrent();
    if (!target) return;

    if (target.kind === "exit") {
      this.returnToOverworld();
    } else if (target.kind === "talk") {
      const def = getOpp(target.refId);
      if (def) {
        this.inputSystem.setEnabled(false);
        bridge.emit("game:dialog-open", buildOppDialogData(def));
      }
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

    bridge.on("ui:close-dialog", onClose);
    bridge.on("ui:send-chat", onChat);
    bridge.on("ui:talk", onTalk);
    this.handlers.push(
      () => bridge.off("ui:close-dialog", onClose),
      () => bridge.off("ui:send-chat", onChat),
      () => bridge.off("ui:talk", onTalk),
    );
  }

  private teardown(): void {
    for (const off of this.handlers) off();
    this.handlers.length = 0;
    this.interaction?.destroy();
  }

  update(time: number): void {
    if (this.leaving) return;
    const v = this.inputSystem.moveVector();
    this.player.move(v.x, v.y);
    this.player.sync();
    this.occupant?.update(time);
    this.cameraSystem.update();
    this.interaction.update(this.player.x, this.player.y, this.cameras.main.zoom);
  }
}
