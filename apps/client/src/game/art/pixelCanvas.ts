/**
 * Tiny helper for drawing crisp pixel-art onto an offscreen canvas. Everything
 * is drawn at native (low) resolution; Phaser's `pixelArt: true` handles the
 * crisp upscaling when the camera zooms.
 */
export class PixelCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly ctx: CanvasRenderingContext2D;
  readonly w: number;
  readonly h: number;

  constructor(width: number, height: number) {
    this.w = width;
    this.h = height;
    this.canvas = document.createElement("canvas");
    this.canvas.width = width;
    this.canvas.height = height;
    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("2D canvas context unavailable");
    ctx.imageSmoothingEnabled = false;
    this.ctx = ctx;
  }

  /** Fill a pixel-aligned rectangle. */
  px(x: number, y: number, w: number, h: number, color: string): this {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
    return this;
  }

  /** Single pixel. */
  dot(x: number, y: number, color: string): this {
    return this.px(x, y, 1, 1, color);
  }

  /** Horizontal line. */
  hline(x: number, y: number, len: number, color: string): this {
    return this.px(x, y, len, 1, color);
  }

  /** Vertical line. */
  vline(x: number, y: number, len: number, color: string): this {
    return this.px(x, y, 1, len, color);
  }

  /** Filled circle (pixel-stepped). */
  circle(cx: number, cy: number, r: number, color: string): this {
    this.ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const span = Math.floor(Math.sqrt(r * r - y * y));
      this.ctx.fillRect(Math.round(cx - span), Math.round(cy + y), span * 2 + 1, 1);
    }
    return this;
  }

  /** Circle outline ring. */
  ring(cx: number, cy: number, r: number, color: string): this {
    this.ctx.fillStyle = color;
    for (let a = 0; a < 360; a += 6) {
      const rad = (a * Math.PI) / 180;
      this.dot(Math.round(cx + Math.cos(rad) * r), Math.round(cy + Math.sin(rad) * r), color);
    }
    return this;
  }

  /** Vertical gradient fill across the whole canvas. */
  gradientV(top: string, bottom: string, x = 0, y = 0, w = this.w, h = this.h): this {
    const g = this.ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, top);
    g.addColorStop(1, bottom);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(x, y, w, h);
    return this;
  }

  /** Deterministic value noise sprinkle, useful for texturing tiles. */
  speckle(colors: string[], density: number, seed = 1): this {
    let s = seed * 9301 + 49297;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    const count = Math.floor(this.w * this.h * density);
    for (let i = 0; i < count; i++) {
      const x = Math.floor(rng() * this.w);
      const y = Math.floor(rng() * this.h);
      const c = colors[Math.floor(rng() * colors.length)];
      this.dot(x, y, c);
    }
    return this;
  }

  clear(): this {
    this.ctx.clearRect(0, 0, this.w, this.h);
    return this;
  }
}
