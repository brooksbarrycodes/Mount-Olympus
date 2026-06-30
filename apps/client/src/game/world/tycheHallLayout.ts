/** Measured layout for Temple of Tyche interior (920×575 world, art scaled from 1536×960). */
export const TYCHE_HALL = {
  width: 920,
  height: 575,
  /** Display scale for 1536×960 source art → world bounds */
  artScale: 920 / 1536,
  /** Viewport never shows world above this Y (below back-wall ledge). */
  northClipY: 148,
  /** Player foot cannot go north of back-wall base. */
  walkMinY: 168,
  entry: { x: 460, y: 490 },
  exit: { x: 460, y: 555 },
  tradingDesk: { x: 460, y: 385 },
  occupant: { x: 335, y: 310 },
} as const;
