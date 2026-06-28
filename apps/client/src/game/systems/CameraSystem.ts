import Phaser from "phaser";

/**
 * Smooth, game-like camera. Follows the player with a little lag and supports
 * mouse-wheel / trackpad-pinch zoom toward a target zoom that is eased every
 * frame (no on-screen zoom UI).
 *
 * Crucially, the minimum zoom is computed dynamically so the world ALWAYS fills
 * the viewport - you can never zoom/scroll far enough to reveal the empty sky
 * background behind the map. It is recomputed on resize so the guarantee holds
 * at any window size.
 */
export class CameraSystem {
  private readonly cam: Phaser.Cameras.Scene2D.Camera;
  private readonly scene: Phaser.Scene;
  private readonly worldW: number;
  private readonly worldH: number;
  private targetZoom: number;
  private minZoom = 0.32;
  private readonly maxZoom = 4.5;
  private readonly onResize: () => void;

  constructor(
    scene: Phaser.Scene,
    follow: Phaser.GameObjects.GameObject,
    worldW: number,
    worldH: number,
  ) {
    this.scene = scene;
    this.worldW = worldW;
    this.worldH = worldH;
    this.cam = scene.cameras.main;
    this.cam.setBounds(0, 0, worldW, worldH);
    this.cam.setRoundPixels(true);
    this.cam.startFollow(follow, true, 0.12, 0.12);

    this.recomputeMinZoom();
    // start a bit closer than the world-map view, clamped to the valid range
    this.targetZoom = Phaser.Math.Clamp(2.6, this.minZoom, this.maxZoom);
    this.cam.setZoom(this.targetZoom);

    scene.input.on(
      Phaser.Input.Events.POINTER_WHEEL,
      (_p: Phaser.Input.Pointer, _o: unknown[], _dx: number, dy: number) => {
        // Multiplicative zoom: each notch scales zoom by a constant factor, so
        // it feels equally fast at every level and crossing the whole range
        // (close-up <-> full map) only takes a few scrolls. Clamp per-event so a
        // big trackpad fling can't overshoot wildly.
        const step = Phaser.Math.Clamp(dy * 0.006, -0.5, 0.5);
        this.targetZoom = Phaser.Math.Clamp(
          this.targetZoom * Math.exp(-step),
          this.minZoom,
          this.maxZoom,
        );
      },
    );

    this.onResize = () => this.recomputeMinZoom();
    scene.scale.on(Phaser.Scale.Events.RESIZE, this.onResize);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      scene.scale.off(Phaser.Scale.Events.RESIZE, this.onResize);
    });
  }

  /**
   * The smallest zoom at which the world still covers the whole viewport in
   * BOTH axes (use the larger ratio so neither edge exposes the background).
   * Clamp the current target up if the window grew past the old minimum.
   */
  private recomputeMinZoom(): void {
    const vw = this.scene.scale.gameSize.width || this.cam.width;
    const vh = this.scene.scale.gameSize.height || this.cam.height;
    const fill = Math.max(vw / this.worldW, vh / this.worldH);
    // tiny epsilon so rounding never leaves a 1px sky sliver
    this.minZoom = Math.min(this.maxZoom, fill + 0.001);
    if (this.targetZoom < this.minZoom) this.targetZoom = this.minZoom;
    if (this.cam.zoom < this.minZoom) this.cam.setZoom(this.minZoom);
  }

  update(): void {
    const z = this.cam.zoom;
    if (Math.abs(z - this.targetZoom) > 0.001) {
      // snappier follow so zoom tracks the scroll wheel instead of drifting
      this.cam.setZoom(Phaser.Math.Linear(z, this.targetZoom, 0.22));
    }
    this.snapScrollToPixelGrid();
  }

  /** Align scroll to the world pixel grid at the current zoom (prevents tile seams). */
  private snapScrollToPixelGrid(): void {
    const z = this.cam.zoom;
    if (z <= 0) return;
    this.cam.setScroll(
      Math.round(this.cam.scrollX * z) / z,
      Math.round(this.cam.scrollY * z) / z,
    );
  }

  /** Brief screen shake / flash hook for divine moments (used later). */
  flash(): void {
    this.cam.flash(220, 255, 244, 207);
  }
}
