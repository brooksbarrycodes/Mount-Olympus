import Phaser from "phaser";

/**
 * Keyboard input: WASD / arrow keys produce a normalized movement vector, and
 * `E` fires an interact callback (edge-triggered). Movement can be disabled
 * while a dialog is open so the player doesn't slide around behind the overlay.
 */
export class InputSystem {
  private readonly kb: Phaser.Input.Keyboard.KeyboardPlugin;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private readonly keyW: Phaser.Input.Keyboard.Key;
  private readonly keyA: Phaser.Input.Keyboard.Key;
  private readonly keyS: Phaser.Input.Keyboard.Key;
  private readonly keyD: Phaser.Input.Keyboard.Key;
  private readonly keyShift: Phaser.Input.Keyboard.Key;
  private enabled = true;

  constructor(scene: Phaser.Scene, onInteract: () => void) {
    const kb = scene.input.keyboard;
    if (!kb) throw new Error("Keyboard input unavailable");
    this.kb = kb;

    this.cursors = kb.createCursorKeys();
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyShift = kb.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);
    // capture E too so the interact press never types an "e" into a chat field
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.E);

    kb.on("keydown-E", () => {
      if (this.enabled) onInteract();
    });
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    // While a dialog is open, release Phaser's global key capture so the chat
    // input receives WASD/E/arrows normally; re-capture them for gameplay after.
    if (enabled) this.kb.enableGlobalCapture();
    else this.kb.disableGlobalCapture();
  }

  /** True while the player is holding Shift to sprint (and input is enabled). */
  isSprinting(): boolean {
    return this.enabled && this.keyShift.isDown;
  }

  moveVector(): { x: number; y: number } {
    if (!this.enabled) return { x: 0, y: 0 };

    let x = 0;
    let y = 0;
    if (this.keyA.isDown || this.cursors.left.isDown) x -= 1;
    if (this.keyD.isDown || this.cursors.right.isDown) x += 1;
    if (this.keyW.isDown || this.cursors.up.isDown) y -= 1;
    if (this.keyS.isDown || this.cursors.down.isDown) y += 1;

    // normalize diagonals so movement speed is constant
    if (x !== 0 && y !== 0) {
      const inv = 1 / Math.sqrt(2);
      x *= inv;
      y *= inv;
    }
    return { x, y };
  }
}
