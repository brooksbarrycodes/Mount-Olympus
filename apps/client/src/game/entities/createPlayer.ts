import Phaser from "phaser";
import type { Direction } from "@/types/game";
import { TX, ANIM, CHAR_ROW, FRAMES_PER_ROW } from "../art/keys";

/**
 * The player's avatar: an arcade-physics sprite with a soft shadow, 4-way
 * movement, and directional idle/walk animations. Depth tracks world-Y so the
 * player correctly sorts in front of / behind props and buildings.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private facing: Direction = "down";
  private moving = false;
  private sprinting = false;
  readonly speed = 165;
  readonly sprintMultiplier = 1.8;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.shadow = scene.add
      .image(x, y + 13, TX.shadow)
      .setDepth(1)
      .setAlpha(0.8);

    this.sprite = scene.physics.add.sprite(x, y, TX.player, CHAR_ROW.idleDown * FRAMES_PER_ROW);
    this.sprite.setOrigin(0.5, 0.9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(12, 8).setOffset(6, 22);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.play(ANIM.playerIdleDown);
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  /** Apply a normalized movement vector (each component in [-1, 1]). */
  move(vx: number, vy: number, sprint = false): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const speed = this.speed * (sprint && (vx !== 0 || vy !== 0) ? this.sprintMultiplier : 1);
    body.setVelocity(vx * speed, vy * speed);

    const wasMoving = this.moving;
    this.moving = vx !== 0 || vy !== 0;
    const wasSprinting = this.sprinting;
    this.sprinting = sprint && this.moving;

    let nextFacing = this.facing;
    if (Math.abs(vx) > Math.abs(vy)) {
      nextFacing = "side";
      this.sprite.setFlipX(vx < 0);
    } else if (vy < 0) {
      nextFacing = "up";
    } else if (vy > 0) {
      nextFacing = "down";
    }

    if (nextFacing !== this.facing || this.moving !== wasMoving || this.sprinting !== wasSprinting) {
      this.facing = nextFacing;
      this.playState();
    }
  }

  private playState(): void {
    const map: Record<Direction, { idle: string; walk: string }> = {
      down: { idle: ANIM.playerIdleDown, walk: ANIM.playerWalkDown },
      up: { idle: ANIM.playerIdleUp, walk: ANIM.playerWalkUp },
      side: { idle: ANIM.playerIdleSide, walk: ANIM.playerWalkSide },
    };
    const a = map[this.facing];
    this.sprite.play(this.moving ? a.walk : a.idle, true);
    // legs churn faster when sprinting
    this.sprite.anims.timeScale = this.moving && this.sprinting ? 1.6 : 1;
  }

  /** Teleport to a fixed spot, stop, and face a direction (used when sitting). */
  snapTo(x: number, y: number, facing: Direction = "down", seated = false): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
    this.facing = facing;
    this.moving = false;
    this.sprinting = false;
    if (facing === "side") this.sprite.setFlipX(false);
    if (seated) {
      this.sprite.anims.stop();
      this.sprite.setFrame(CHAR_ROW.sit * FRAMES_PER_ROW);
    } else {
      this.playState();
    }
    this.sync();
  }

  /** Keep shadow + depth in sync; call every frame. */
  sync(): void {
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 4);
    this.sprite.setDepth(this.sprite.y);
  }

  /** Scale sprite + shadow for interiors with larger character proportions. */
  setDisplayScale(scale: number): void {
    this.sprite.setScale(scale);
    this.shadow.setScale(scale);
  }
}
