import Phaser from "phaser";
import type {
  HudState,
  OppDialogData,
  AllySummary,
  HotbarAction,
} from "@/types/game";

/**
 * Typed event contract between the Phaser game and React overlays.
 *
 * Direction convention:
 *  - `game:*`  emitted by Phaser, consumed by React
 *  - `ui:*`    emitted by React, consumed by Phaser
 *
 * We use a single shared emitter (the template pattern) so neither side needs a
 * reference to the other. React never reads Phaser state directly, and Phaser
 * never triggers React re-renders except through these (infrequent) events.
 */
export interface GameEventMap {
  // Phaser -> React
  "game:hud": HudState;
  "game:allies": AllySummary[];
  "game:dialog-open": OppDialogData;
  "game:dialog-close": undefined;
  "game:location": { id: string; label: string };
  "game:opp-reply": { oppId: string; text: string };
  "game:ready": undefined;
  /** Open the command desk business dashboard. */
  "game:open-dashboard": undefined;
  /** Open the oversight control center (approvals, autonomy, kill switch). */
  "game:open-control": undefined;
  /** Open the council meeting overlay with the gods who took their seats. */
  "game:open-meeting": { attendees: string[] };

  // React -> Phaser
  "ui:talk": { oppId: string };
  "ui:close-dialog": undefined;
  "ui:enter-location": { locationId: string };
  "ui:hotbar": { action: HotbarAction };
  "ui:send-chat": { oppId: string; text: string };
  /** Close the command desk dashboard (player stands up). */
  "ui:close-dashboard": undefined;
  /** Close the oversight control center. */
  "ui:close-control": undefined;
  /** End the council meeting (gods rise, player stands up). */
  "ui:end-meeting": undefined;
}

type Handler<T> = (payload: T) => void;

class TypedEmitter {
  private readonly emitter = new Phaser.Events.EventEmitter();

  on<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): this {
    this.emitter.on(event, handler as (...args: unknown[]) => void);
    return this;
  }

  once<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): this {
    this.emitter.once(event, handler as (...args: unknown[]) => void);
    return this;
  }

  off<K extends keyof GameEventMap>(event: K, handler: Handler<GameEventMap[K]>): this {
    this.emitter.off(event, handler as (...args: unknown[]) => void);
    return this;
  }

  emit<K extends keyof GameEventMap>(event: K, payload: GameEventMap[K]): void {
    this.emitter.emit(event, payload);
  }

  removeAll(): void {
    this.emitter.removeAllListeners();
  }
}

/** Shared singleton bridge. */
export const bridge = new TypedEmitter();
