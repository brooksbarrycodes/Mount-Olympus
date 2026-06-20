import Phaser from "phaser";

/**
 * Smooth, game-like camera. Follows the player with a little lag and supports
 * mouse-wheel / trackpad-pinch zoom toward a target zoom that is eased every
 * frame (no on-screen zoom UI). `roundPixels` on the follow keeps pixel art
 * crisp without the tile seams you get from a free-floating fractional camera.
 */
export class CameraSystem {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private targetZoom: number;
  // min: full Mount Olympus world-map view; max: close-up walkable view
  private readonly minZoom = 0.32;
  private readonly maxZoom = 4.5;

  constructor(
    scene: Phaser.Scene,
    follow: Phaser.GameObjects.GameObject,
    worldW: number,
    worldH: number,
  ) {
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, worldW, worldH);
    this.cam.setRoundPixels(true);
    this.cam.startFollow(follow, true, 0.12, 0.12);

    this.targetZoom = 2.6;
    this.cam.setZoom(this.targetZoom);

    scene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown[], _dx: number, dy: number) => {
        // scale the step by current zoom so the far end of the (now much wider)
        // range still feels responsive instead of crawling
        this.targetZoom = Phaser.Math.Clamp(
          this.targetZoom - dy * 0.0012 * this.targetZoom,
          this.minZoom,
          this.maxZoom,
        );
      },
    );
  }

  update(): void {
    const z = this.cam.zoom;
    if (Math.abs(z - this.targetZoom) > 0.001) {
      this.cam.setZoom(Phaser.Math.Linear(z, this.targetZoom, 0.12));
    }
  }

  /** Brief screen shake / flash hook for divine moments (used later). */
  flash(): void {
    this.cam.flash(220, 255, 244, 207);
  }
}
