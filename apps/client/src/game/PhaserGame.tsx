import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "./config";
import { startBackgroundMusic } from "@/audio/backgroundMusic";

/**
 * Owns the entire Phaser lifecycle. One game instance is created on mount and
 * destroyed on unmount. No other React component needs to know Phaser exists;
 * communication happens through the shared event bridge.
 */
export function PhaserGame() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || gameRef.current) return;

    const stopMusic = startBackgroundMusic();
    const game = new Phaser.Game(createGameConfig(container));
    gameRef.current = game;

    return () => {
      stopMusic();
      game.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} className="phaser-root" aria-hidden="true" />;
}
