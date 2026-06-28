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

/** The Olympian council - each god heads one of the Archon's businesses. Distinct
 *  cloak/hair palettes keep them readable as a row of seated attendees. */
export const GOD_COLORS: Record<string, CharColors> = {
  athena: {
    cloak: "#d8dce6",
    cloakShade: "#b3b9c8",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#4a3a28",
    hairShade: "#352a1d",
    trim: P.gold,
    bearded: false,
    aura: "rgba(201,209,230,0.16)",
  },
  hermes: {
    cloak: "#5fae8c",
    cloakShade: "#3f8268",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#6b4a2b",
    hairShade: "#4f3620",
    trim: P.goldLight,
    bearded: false,
  },
  hephaestus: {
    cloak: "#b5532b",
    cloakShade: "#8a3d1f",
    skin: "#cf9a6e",
    skinShade: "#a8764f",
    hair: "#2c2420",
    hairShade: "#1c1714",
    trim: P.bronze,
    bearded: true,
  },
  poseidon: {
    cloak: "#2f7d8c",
    cloakShade: "#205b66",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#b9c7cc",
    hairShade: "#93a4ab",
    trim: P.gold,
    bearded: true,
    aura: "rgba(52,179,201,0.18)",
  },
  demeter: {
    cloak: "#c8a24a",
    cloakShade: "#a07f33",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#7a3f24",
    hairShade: "#5a2d19",
    trim: "#e7d27a",
    bearded: false,
  },
  apollo: {
    cloak: "#f4ecd6",
    cloakShade: "#d8caa0",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#e8c662",
    hairShade: "#c79f3e",
    trim: P.gold,
    bearded: false,
    aura: "rgba(255,216,106,0.2)",
  },
  oracle: {
    cloak: "#7a5cc4",
    cloakShade: "#574191",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#d7d2e6",
    hairShade: "#aaa3c4",
    trim: "#c9b3ff",
    bearded: false,
    aura: "rgba(170,140,255,0.22)",
  },
  tyche: {
    cloak: "#2a9d8f",
    cloakShade: "#1f7369",
    skin: P.skin,
    skinShade: P.skinShade,
    hair: "#e8c962",
    hairShade: "#c79f3e",
    trim: P.gold,
    bearded: false,
    aura: "rgba(42,157,143,0.2)",
  },
};

/** Look up the color set for an Opp id (defaults to a Zeus-like divine set). */
export function charColorsFor(oppId: string): CharColors {
  if (oppId === "player") return PLAYER_COLORS;
  if (oppId === "zeus") return ZEUS_COLORS;
  return GOD_COLORS[oppId] ?? ZEUS_COLORS;
}

/**
 * Draw one character frame at (ox, 0). Used both for the packed sprite sheet
 * (textures.ts) and standalone UI portraits (OppPortrait.tsx).
 */
export function drawCharFrame(
  pc: PixelCanvas,
  ox: number,
  c: CharColors,
  dir: "down" | "up" | "side" | "sit" | "sitSide",
  step: number,
): void {
  const cx = ox + FRAME_W / 2;

  if (dir === "sit") {
    drawSeatedFrame(pc, ox, c);
    return;
  }
  if (dir === "sitSide") {
    drawSeatedSideFrame(pc, ox, c);
    return;
  }

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

/**
 * A forward-facing SEATED pose: the figure sits with thighs forward and shins
 * tucked down, robe draped over the lap, so characters can occupy a chair. Drawn
 * a touch lower than the standing frames so the seat lands on a chair cushion.
 */
function drawSeatedFrame(pc: PixelCanvas, ox: number, c: CharColors): void {
  const cx = ox + FRAME_W / 2;
  const headY = 10;

  if (c.aura) {
    pc.circle(cx, headY + 2, 9, c.aura);
  }

  // shins + sandals tucked below the lap
  pc.px(cx - 4, 25, 3, 4, c.cloakShade);
  pc.px(cx + 1, 25, 3, 4, c.cloakShade);
  pc.px(cx - 4, 29, 3, 1, P.sandal);
  pc.px(cx + 1, 29, 3, 1, P.sandal);

  // lap (robe draped over the thighs)
  pc.px(cx - 6, 22, 12, 5, c.cloak);
  pc.px(cx - 6, 22, 12, 1, c.cloakShade);
  pc.px(cx - 6, 26, 12, 1, c.cloakShade);

  // torso
  pc.px(cx - 5, 14, 10, 9, c.cloak);
  pc.px(cx - 5, 14, 10, 2, c.trim);
  pc.vline(cx - 5, 14, 9, c.cloakShade);
  pc.vline(cx + 4, 14, 9, c.cloakShade);

  // arms resting on the lap
  pc.px(cx - 7, 16, 3, 7, c.skin);
  pc.px(cx + 5, 16, 3, 7, c.skin);
  pc.px(cx - 7, 22, 3, 1, c.skinShade);
  pc.px(cx + 5, 22, 3, 1, c.skinShade);

  // head
  pc.px(cx - 4, headY, 8, 7, c.skin);
  pc.px(cx - 4, headY, 8, 1, c.skinShade);

  // hair
  pc.px(cx - 5, headY - 2, 10, 4, c.hair);
  pc.px(cx - 5, headY - 2, 10, 1, c.hairShade);
  pc.dot(cx - 2, headY + 3, P.outline);
  pc.dot(cx + 1, headY + 3, P.outline);

  if (c.bearded) {
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

/**
 * A SIDE-PROFILE seated pose facing RIGHT: back against the chair (left), thighs
 * forward to the right, shin tucked down, one arm resting on the lap. Mirror with
 * flipX for a left-facing seat. Used for the table-side council chairs.
 */
function drawSeatedSideFrame(pc: PixelCanvas, ox: number, c: CharColors): void {
  const cx = ox + FRAME_W / 2;
  const headY = 8;

  if (c.aura) {
    pc.circle(cx + 1, headY + 2, 9, c.aura);
  }

  // contact shadow
  pc.px(ox + 5, 30, 14, 2, P.shadow);

  // thigh: robe draped horizontally forward (to the right)
  pc.px(cx - 3, 21, 9, 4, c.cloak);
  pc.px(cx - 3, 21, 9, 1, c.cloakShade);
  pc.px(cx - 3, 24, 9, 1, c.cloakShade);

  // shin + sandal dropping at the knee (front/right)
  pc.px(cx + 4, 25, 3, 4, c.cloakShade);
  pc.px(cx + 4, 29, 4, 1, P.sandal);

  // torso leaning back against the chair (back edge on the left)
  pc.px(cx - 4, 13, 8, 9, c.cloak);
  pc.px(cx - 3, 13, 7, 2, c.trim);
  pc.vline(cx - 4, 13, 9, c.cloakShade);

  // near arm + forearm resting on the lap
  pc.px(cx + 1, 15, 3, 6, c.skin);
  pc.px(cx + 1, 20, 4, 2, c.skin);
  pc.px(cx + 1, 21, 4, 1, c.skinShade);

  // head in profile (face toward the right)
  pc.px(cx - 2, headY, 7, 7, c.skin);
  pc.px(cx - 2, headY, 7, 1, c.skinShade);
  pc.dot(cx + 5, headY + 4, c.skinShade); // chin/jaw hint

  // hair across the top + back of the head (left)
  pc.px(cx - 3, headY - 2, 8, 4, c.hair);
  pc.px(cx - 3, headY - 2, 8, 1, c.hairShade);
  pc.px(cx - 3, headY, 2, 5, c.hair);

  // eye
  pc.dot(cx + 2, headY + 3, P.outline);

  if (c.bearded) {
    pc.px(cx + 1, headY + 5, 4, 5, c.hairShade);
    pc.px(cx + 2, headY + 9, 3, 2, c.hair);
    pc.px(cx + 1, headY + 5, 4, 1, P.beard);
  }

  if (c.aura) {
    pc.dot(cx + 2, headY - 3, P.divineGlow);
    pc.dot(cx - 2, headY - 2, P.gold);
    pc.dot(cx + 5, headY - 2, P.gold);
  }
}
