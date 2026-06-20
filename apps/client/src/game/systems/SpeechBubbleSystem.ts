import Phaser from "phaser";
import type { Opp } from "../entities/createOpp";

interface BubbleState {
  opp: Opp;
  container: Phaser.GameObjects.Container;
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  visible: boolean;
  nextToggle: number;
  index: number;
}

/**
 * Floating speech bubbles above Opps. Each Opp cycles through its `chatter`
 * lines on its own staggered timer, so the world feels alive without spamming
 * the screen. Bubbles counter-scale with camera zoom to stay readable.
 */
export class SpeechBubbleSystem {
  private readonly bubbles: BubbleState[] = [];

  constructor(scene: Phaser.Scene, opps: Opp[]) {
    opps.forEach((opp, i) => {
      const bg = scene.add.graphics();
      const text = scene.add
        .text(0, 0, "", {
          fontFamily: "Georgia, 'Times New Roman', serif",
          fontSize: "11px",
          color: "#f4efe1",
          align: "center",
          wordWrap: { width: 150 },
        })
        .setOrigin(0.5, 0.5);

      const container = scene.add.container(opp.x, opp.y, [bg, text]);
      container.setDepth(90000).setVisible(false);

      this.bubbles.push({
        opp,
        container,
        bg,
        text,
        visible: false,
        nextToggle: 800 + i * 900 + Math.random() * 1500,
        index: Math.floor(Math.random() * Math.max(1, opp.def.chatter.length)),
      });
    });
  }

  private redraw(b: BubbleState): void {
    const padX = 7;
    const padY = 5;
    const w = Math.ceil(b.text.width) + padX * 2;
    const h = Math.ceil(b.text.height) + padY * 2;
    const x = -w / 2;
    const y = -h / 2;

    b.bg.clear();
    // soft shadow
    b.bg.fillStyle(0x000000, 0.28);
    b.bg.fillRoundedRect(x + 1, y + 2, w, h, 6);
    // bubble body
    b.bg.fillStyle(0x141823, 0.92);
    b.bg.fillRoundedRect(x, y, w, h, 6);
    b.bg.lineStyle(1, 0xffffff, 0.18);
    b.bg.strokeRoundedRect(x, y, w, h, 6);
    // tail
    b.bg.fillStyle(0x141823, 0.92);
    b.bg.fillTriangle(-4, y + h - 1, 4, y + h - 1, 0, y + h + 5);
  }

  update(time: number, zoom: number): void {
    for (const b of this.bubbles) {
      if (time >= b.nextToggle) {
        if (b.visible) {
          b.visible = false;
          b.container.setVisible(false);
          b.nextToggle = time + 2600 + Math.random() * 3200;
        } else {
          const lines = b.opp.def.chatter;
          if (lines.length > 0) {
            b.text.setText(lines[b.index % lines.length]);
            b.index += 1;
            this.redraw(b);
            b.visible = true;
            b.container.setVisible(true);
            b.nextToggle = time + 2800 + Math.random() * 1400;
          } else {
            b.nextToggle = time + 4000;
          }
        }
      }

      if (b.visible) {
        const headOffset = 40;
        b.container.setScale(1 / zoom);
        b.container.setPosition(b.opp.x, b.opp.y - headOffset);
      }
    }
  }
}
