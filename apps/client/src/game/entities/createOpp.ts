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
  private readonly radius: number;

  constructor(scene: Phaser.Scene, def: OppDef) {
    this.def = def;
    this.home = { x: def.spawn.x, y: def.spawn.y };
    this.target = { ...this.home };
    this.radius = def.wanderRadius ?? 0;

    if (def.id === "zeus") {
      this.glow = scene.add
        .image(def.spawn.x, def.spawn.y - 4, TX.glow)
        .setDepth(0)
        .setScale(1.3)
        .setAlpha(0.55)
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

    if (def.textureKey === TX.zeus) {
      this.sprite.play(ANIM.zeusIdle);
    }
  }

  get x(): number {
    return this.sprite.x;
  }
  get y(): number {
    return this.sprite.y;
  }

  update(time: number): void {
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
