import Phaser from "phaser";
import { loadWorldImages, generateProcedural, registerAnimations, configurePixelArtTextures } from "../art/textures";

/**
 * Loads real pixel-art world assets, then generates the procedural characters +
 * effects, registers animations, and hands off to the overworld. Asset creation
 * happens exactly once so the main scene can assume every key exists.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  preload(): void {
    loadWorldImages(this);
  }

  create(): void {
    generateProcedural(this);
    configurePixelArtTextures(this);
    registerAnimations(this);
    this.scene.start("MountOlympusScene");
  }
}
