import { useEffect, useRef } from "react";
import { PixelCanvas } from "@/game/art/pixelCanvas";
import { drawCharFrame, charColorsFor } from "@/game/art/character";
import { FRAME_W, FRAME_H } from "@/game/art/keys";

interface Props {
  oppId: string;
  /** On-screen size in px (square-ish). */
  size?: number;
}

/**
 * A small animated pixel portrait of an Opp "moving around in place": a gentle
 * idle bob plus an occasional turn/step, drawn with the same character art used
 * for the in-game sprite. Rendered to a crisp, nearest-neighbor scaled canvas.
 */
export function OppPortrait({ oppId, size = 96 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    const colors = charColorsFor(oppId);
    const dirs = ["down", "side", "down", "up"] as const;
    let raf = 0;
    const start = performance.now();

    const render = (now: number) => {
      const t = (now - start) / 1000;
      // idle bob (sub-pixel rounded), occasional direction change + step
      const bob = Math.round(Math.sin(t * 2.4) * 1);
      const dir = dirs[Math.floor(t / 2.2) % dirs.length];
      const step = Math.sin(t * 3) > 0.6 ? 1 : Math.sin(t * 3) < -0.6 ? -1 : 0;

      const pc = new PixelCanvas(FRAME_W, FRAME_H);
      drawCharFrame(pc, 0, colors, dir, dir === "side" ? step : 0);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = Math.floor(size / FRAME_H);
      const drawW = FRAME_W * scale;
      const drawH = FRAME_H * scale;
      const dx = Math.round((canvas.width - drawW) / 2);
      const dy = Math.round((canvas.height - drawH) / 2) + bob * scale;
      ctx.drawImage(pc.canvas, dx, dy, drawW, drawH);
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [oppId, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="opp-portrait-canvas"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
