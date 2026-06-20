import Phaser from "phaser";
import type { InteractionKind, InteractionTarget } from "@/types/game";
import { TX } from "../art/keys";

/** A point in the world the player can act on when close enough. */
export interface Interactable {
  kind: InteractionKind;
  refId: string;
  label: string;
  range: number;
  getPos: () => { x: number; y: number };
}

/**
 * Tracks the single best (closest, in-range) interactable near the player and
 * shows a floating `E` prompt above it. Only one prompt is ever visible, so the
 * player always knows exactly what `E` will do.
 */
export class InteractionSystem {
  private readonly prompt: Phaser.GameObjects.Container;
  private readonly label: Phaser.GameObjects.Text;
  private interactables: Interactable[] = [];
  private current: Interactable | null = null;

  constructor(scene: Phaser.Scene) {
    const key = scene.add.image(0, 0, TX.interactPrompt).setOrigin(0.5, 0.5);
    this.label = scene.add
      .text(13, 0, "", {
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "11px",
        color: "#fff4cf",
        stroke: "#241c12",
        strokeThickness: 3,
      })
      .setOrigin(0, 0.5);

    this.prompt = scene.add.container(0, 0, [key, this.label]);
    this.prompt.setDepth(100000).setVisible(false);
    this.prompt.setData("baseScale", 1);

    // gentle bob
    scene.tweens.add({
      targets: this.prompt,
      y: "+=3",
      duration: 620,
      yoyo: true,
      repeat: -1,
      ease: "Sine.inOut",
    });
  }

  setInteractables(list: Interactable[]): void {
    this.interactables = list;
  }

  getCurrent(): InteractionTarget | null {
    if (!this.current) return null;
    return { kind: this.current.kind, label: this.current.label, refId: this.current.refId };
  }

  update(playerX: number, playerY: number, zoom: number): void {
    let best: Interactable | null = null;
    let bestDist = Infinity;

    for (const it of this.interactables) {
      const pos = it.getPos();
      const d = Phaser.Math.Distance.Between(playerX, playerY, pos.x, pos.y);
      if (d <= it.range && d < bestDist) {
        best = it;
        bestDist = d;
      }
    }

    this.current = best;

    if (!best) {
      this.prompt.setVisible(false);
      return;
    }

    const pos = best.getPos();
    this.label.setText(best.label);
    // keep the prompt a roughly constant on-screen size across zoom levels
    this.prompt.setScale(1.1 / zoom);
    this.prompt.setPosition(pos.x - 9 / zoom, pos.y - 34);
    this.prompt.setVisible(true);
  }

  destroy(): void {
    this.prompt.destroy();
  }
}
