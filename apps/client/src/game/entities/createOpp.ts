import Phaser from "phaser";
import type { OppDef } from "@/types/game";
import { TX, ANIM, CHAR_ROW, FRAMES_PER_ROW } from "../art/keys";

/**
 * A non-player Opp. Wanders gently around its spawn so the world feels alive,
 * carries a soft shadow, and (for divine Opps like Zeus) a pulsing glow. The
 * scene reads `sprite` for interaction proximity + speech-bubble anchoring.
 */
export class Opp {
  readonly def: OppDef;
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly glow?: Phaser.GameObjects.Image;

  private readonly home: { x: number; y: number };
  private target: { x: number; y: number };
  private pauseUntil = 0;
  private readonly speed = 38;
  private radius: number;
  /** When true, wander is suspended (the scene is scripting this Opp). */
  seating = false;

  constructor(scene: Phaser.Scene, def: OppDef) {
    this.def = def;
    this.home = { x: def.spawn.x, y: def.spawn.y };
    this.target = { ...this.home };
    this.radius = def.wanderRadius ?? 0;

    // divine Opps carry a soft pulsing glow (Zeus brightest)
    if (def.id === "zeus" || def.divineGlow) {
      this.glow = scene.add
        .image(def.spawn.x, def.spawn.y - 4, TX.glow)
        .setDepth(0)
        .setScale(def.id === "zeus" ? 1.3 : 1.0)
        .setAlpha(def.id === "zeus" ? 0.55 : 0.32)
        .setBlendMode(Phaser.BlendModes.ADD);
    }

    this.shadow = scene.add
      .image(def.spawn.x, def.spawn.y + 13, TX.shadow)
      .setDepth(1)
      .setAlpha(0.8);

    this.sprite = scene.physics.add.sprite(
      def.spawn.x,
      def.spawn.y,
      def.textureKey,
      CHAR_ROW.idleDown * FRAMES_PER_ROW,
    );
    this.sprite.setOrigin(0.5, 0.9);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(14, 10).setOffset(5, 20);
    this.sprite.setImmovable(true);
    body.setAllowGravity(false);
    this.sprite.setData("oppId", def.id);

    this.playIdle();
  }

  /** Play this Opp's standing idle (Zeus breathes; gods bob; others static). */
  private playIdle(): void {
    if (this.def.textureKey === TX.zeus) {
      this.sprite.play(ANIM.zeusIdle, true);
    } else if (this.sprite.scene.anims.exists(`idle:${this.def.textureKey}`)) {
      this.sprite.play(`idle:${this.def.textureKey}`, true);
    } else {
      this.sprite.anims.stop();
      this.sprite.setFrame(CHAR_ROW.idleDown * FRAMES_PER_ROW);
    }
  }

  /** Walk toward a point at wander speed; returns true once arrived (and stops). */
  walkToward(x: number, y: number): boolean {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const dx = x - this.sprite.x;
    const dy = y - this.sprite.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 3) {
      body.setVelocity(0, 0);
      return true;
    }
    const v = this.speed * 1.6;
    body.setVelocity((dx / dist) * v, (dy / dist) * v);
    if (Math.abs(dx) > 2) this.sprite.setFlipX(dx < 0);
    this.shadow.setPosition(this.sprite.x, this.sprite.y + 4);
    this.glow?.setPosition(this.sprite.x, this.sprite.y - 4);
    this.sprite.setDepth(this.sprite.y);
    return false;
  }

  /** Snap to a fixed spot and stop wandering (used to seat gods at the table). */
  seatAt(x: number, y: number, faceLeft: boolean): void {
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.reset(x, y);
    body.setVelocity(0, 0);
    this.home.x = x;
    this.home.y = y;
    this.target = { x, y };
    this.sprite.setFlipX(faceLeft);
    this.shadow.setPosition(x, y + 4);
    this.glow?.setPosition(x, y - 4);
    this.sprite.setDepth(this.sprite.y);
    // adopt the side-facing seated pose; flipX (set above from faceLeft) mirrors
    // it so a left-side chair has the god looking left and a right-side chair right.
    this.sprite.anims.stop();
    this.sprite.setFrame(CHAR_ROW.sitSide * FRAMES_PER_ROW);
  }

  /** Resume gentle wandering around a new home point (stands back up). */
  releaseFrom(x: number, y: number, radius: number): void {
    this.home.x = x;
    this.home.y = y;
    this.radius = radius;
    this.target = { x, y };
    this.seating = false;
    this.playIdle();
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  update(time: number): void {
    if (this.seating) return;
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;

    if (this.radius > 0) {
      const dx = this.target.x - this.sprite.x;
      const dy = this.target.y - this.sprite.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 4 || time < this.pauseUntil) {
        body.setVelocity(0, 0);
        if (time >= this.pauseUntil && dist < 4) {
          // reached target: pause, then choose a new wander point
          this.pauseUntil = time + 1200 + Math.random() * 2600;
          const a = Math.random() * Math.PI * 2;
          const r = Math.random() * this.radius;
          this.target = {
            x: this.home.x + Math.cos(a) * r,
            y: this.home.y + Math.sin(a) * r,
          };
        }
      } else {
        body.setVelocity((dx / dist) * this.speed, (dy / dist) * this.speed);
        if (this.sprite.anims.currentAnim?.key !== ANIM.zeusIdle) {
          this.sprite.setFlipX(dx < 0);
        }
      }
    }

    this.shadow.setPosition(this.sprite.x, this.sprite.y + 4);
    this.sprite.setDepth(this.sprite.y);

    if (this.glow) {
      this.glow.setPosition(this.sprite.x, this.sprite.y - 4);
      this.glow.setAlpha(0.42 + Math.sin(time / 420) * 0.16);
    }
  }
}
