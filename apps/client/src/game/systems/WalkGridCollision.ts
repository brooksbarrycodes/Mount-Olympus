import Phaser from "phaser";

export interface TycheCollisionData {
  cellSize: number;
  width: number;
  height: number;
  cols: number;
  rows: number;
  runs: number[][];
}

/**
 * Bitmap walkability grid for Tyche interior (~4px cells).
 * Blocked cells are run-length encoded; walkable cells are implicit.
 */
export class WalkGridCollision {
  private readonly cellSize: number;
  private readonly cols: number;
  private readonly rows: number;
  private readonly blocked: Set<number>;

  constructor(data: TycheCollisionData) {
    this.cellSize = data.cellSize;
    this.cols = data.cols;
    this.rows = data.rows;
    this.blocked = new Set();

    for (const [startGx, gy, len] of data.runs) {
      for (let i = 0; i < len; i++) {
        this.blocked.add(gy * this.cols + (startGx + i));
      }
    }
  }

  isBlocked(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.cols * this.cellSize || y >= this.rows * this.cellSize) {
      return true;
    }
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    if (gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows) return true;
    return this.blocked.has(gy * this.cols + gx);
  }

  private isFootBlocked(body: Phaser.Physics.Arcade.Body): boolean {
    const y = body.bottom;
    const cx = body.center.x;
    const samples = [body.left + 2, cx, body.right - 2];
    return samples.some((x) => this.isBlocked(x, y));
  }

  /** Revert axis movement when the foot hitbox enters a blocked cell. */
  resolvePlayerBody(body: Phaser.Physics.Arcade.Body, _prevFootX: number, _prevFootY: number): void {
    if (!this.isFootBlocked(body)) return;

    const curX = body.x;
    const curY = body.y;
    const vx = body.velocity.x;
    const vy = body.velocity.y;

    body.x = body.prev.x;
    body.y = curY;
    if (!this.isFootBlocked(body)) {
      body.velocity.x = 0;
      return;
    }

    body.x = curX;
    body.y = body.prev.y;
    if (!this.isFootBlocked(body)) {
      body.velocity.y = 0;
      return;
    }

    body.x = body.prev.x;
    body.y = body.prev.y;
    body.setVelocity(0, 0);
    if (vx !== 0 || vy !== 0) body.setVelocity(0, 0);
  }

  /** Dev overlay — draw blocked cells in red. */
  drawDebug(scene: Phaser.Scene, depth: number): void {
    for (let gy = 0; gy < this.rows; gy++) {
      for (let gx = 0; gx < this.cols; gx++) {
        if (!this.blocked.has(gy * this.cols + gx)) continue;
        scene.add
          .rectangle(
            gx * this.cellSize + this.cellSize / 2,
            gy * this.cellSize + this.cellSize / 2,
            this.cellSize,
            this.cellSize,
            0xff0000,
            0.35,
          )
          .setDepth(depth);
      }
    }
  }
}
