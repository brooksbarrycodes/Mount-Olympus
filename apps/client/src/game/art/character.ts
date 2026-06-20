import { palette as P } from "./palette";
import { PixelCanvas } from "./pixelCanvas";
import { FRAME_W } from "./keys";

/** Per-character color set, shared by the in-game sprite sheet and UI portraits. */
export interface CharColors {
  cloak: string;
  cloakShade: string;
  skin: string;
  skinShade: string;
  hair: string;
  hairShade: string;
  trim: string;
  bearded: boolean;
  aura?: string;
}

export const PLAYER_COLORS: CharColors = {
  cloak: P.playerCloak,
  cloakShade: P.playerCloakShade,
  skin: P.skin,
  skinShade: P.skinShade,
  hair: P.hair,
  hairShade: P.hairLight,
  trim: P.playerTrim,
  bearded: false,
};

export const ZEUS_COLORS: CharColors = {
  cloak: P.zeusRobe,
  cloakShade: P.zeusRobeShade,
  skin: P.skin,
  skinShade: P.skinShade,
  hair: P.zeusHair,
  hairShade: P.zeusHairShade,
  trim: P.gold,
  bearded: true,
  aura: "rgba(154,215,255,0.18)",
};

/** Look up the color set for an Opp id (defaults to a Zeus-like divine set). */
export function charColorsFor(oppId: string): CharColors {
  if (oppId === "player") return PLAYER_COLORS;
  return ZEUS_COLORS;
}

/**
 * Draw one character frame at (ox, 0). Used both for the packed sprite sheet
 * (textures.ts) and standalone UI portraits (OppPortrait.tsx).
 */
export function drawCharFrame(
  pc: PixelCanvas,
  ox: number,
  c: CharColors,
  dir: "down" | "up" | "side",
  step: number,
): void {
  const cx = ox + FRAME_W / 2;
  const headY = 7;

  if (c.aura) {
    pc.circle(cx, headY + 2, 9, c.aura);
  }

  pc.px(ox + 6, 29, 12, 3, P.shadow);

  const legY = 24;
  const lShift = step;
  pc.px(cx - 4 + (dir === "side" ? -lShift : 0), legY, 3, 6, c.cloakShade);
  pc.px(cx + 1 + (dir === "side" ? lShift : 0), legY, 3, 6, c.cloakShade);
  pc.px(cx - 4, legY + 6, 3, 1, P.sandal);
  pc.px(cx + 1, legY + 6, 3, 1, P.sandal);

  pc.px(cx - 5, 13, 10, 12, c.cloak);
  pc.px(cx - 5, 13, 10, 2, c.trim);
  pc.vline(cx - 5, 13, 12, c.cloakShade);
  pc.vline(cx + 4, 13, 12, c.cloakShade);
  pc.px(cx - 1, 16, 2, 9, c.cloakShade);

  if (dir === "side") {
    pc.px(cx + 2, 15, 3, 8, c.skin);
    pc.px(cx + 2 + step, 22, 3, 2, c.skinShade);
  } else {
    pc.px(cx - 7, 15, 3, 8, c.skin);
    pc.px(cx + 5, 15, 3, 8, c.skin);
  }

  pc.px(cx - 4, headY, 8, 7, c.skin);
  pc.px(cx - 4, headY, 8, 1, c.skinShade);

  pc.px(cx - 5, headY - 2, 10, 4, c.hair);
  pc.px(cx - 5, headY - 2, 10, 1, c.hairShade);
  if (dir !== "up") {
    if (dir === "down") {
      pc.dot(cx - 2, headY + 3, P.outline);
      pc.dot(cx + 1, headY + 3, P.outline);
    } else {
      pc.dot(cx + 2, headY + 3, P.outline);
    }
  } else {
    pc.px(cx - 5, headY, 10, 5, c.hair);
  }

  if (c.bearded && dir !== "up") {
    pc.px(cx - 4, headY + 5, 8, 5, c.hairShade);
    pc.px(cx - 3, headY + 9, 6, 2, c.hair);
    pc.px(cx - 4, headY + 5, 8, 1, P.beard);
  }

  if (c.aura) {
    pc.dot(cx, headY - 3, P.divineGlow);
    pc.dot(cx - 3, headY - 2, P.gold);
    pc.dot(cx + 3, headY - 2, P.gold);
  }
}
