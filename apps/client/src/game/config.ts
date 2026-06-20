import Phaser from "phaser";
import { palette as P } from "./art/palette";
import { BootScene } from "./scenes/BootScene";
import { MountOlympusScene } from "./scenes/MountOlympusScene";
import { InteriorScene } from "./scenes/InteriorScene";

/**
 * Build a Phaser game config bound to a specific parent element. `pixelArt`
 * keeps procedurally generated textures crisp when the camera zooms. We do NOT
 * set `roundPixels` globally — on recent Phaser it can reintroduce jitter with
 * zoomed camera-follow; the scene rounds its follow target instead.
 */
export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    parent,
    backgroundColor: P.skyLow,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: 0 },
        debug: false,
      },
    },
    render: {
      antialias: false,
      pixelArt: true,
    },
    scene: [BootScene, MountOlympusScene, InteriorScene],
  };
}
