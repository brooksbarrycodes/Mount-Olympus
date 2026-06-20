/**
 * Shared Olympus color palette. Keeping every painter on one palette is what
 * makes the procedurally generated art look cohesive. Colors are CSS strings so
 * they can be used directly with a 2D canvas context.
 */
export const palette = {
  // Sky / atmosphere
  skyHigh: "#2a3a6b",
  skyLow: "#46618f",
  cloud: "#cdd9f0",
  cloudShadow: "#9fb2d6",

  // Grass / foliage
  grass: "#5a8f4e",
  grassLight: "#6fa85e",
  grassDark: "#3f7140",
  foliage: "#3f7a3a",
  foliageDark: "#2c5a2c",
  oliveLeaf: "#7c9a5a",
  trunk: "#6b4a2b",
  trunkDark: "#4f3620",

  // Marble / stone (temples, paths, HQ)
  marble: "#e9e6da",
  marbleLight: "#f7f5ee",
  marbleShade: "#cdc8b8",
  marbleDeep: "#a89f8a",
  stone: "#b9b2a0",
  stoneDark: "#8a8270",
  stoneEdge: "#6f6754",

  // Path
  path: "#cbb890",
  pathLight: "#ddcaa0",
  pathDark: "#a9966c",

  // Gold / bronze / drachma
  gold: "#f5c84c",
  goldLight: "#ffe7a7",
  goldDeep: "#b07c16",
  bronze: "#c98b3a",
  bronzeDark: "#8a5a22",

  // Divine accents
  divine: "#ffe9a8",
  divineGlow: "#fff4cf",
  lightning: "#fff7d6",
  aura: "#9ad7ff",

  // Cloth / characters
  skin: "#e3b48c",
  skinShade: "#c8946c",
  toga: "#f2efe6",
  togaShade: "#cfcabb",
  zeusRobe: "#f0e7c8",
  zeusRobeShade: "#cdbf94",
  hair: "#5a4632",
  hairLight: "#7a6043",
  zeusHair: "#ece6d6",
  zeusHairShade: "#c4bca6",
  beard: "#e8e2d2",
  sandal: "#7a5a36",

  // Player accents (a mortal "Archon" in deep blue + bronze)
  playerCloak: "#3a5d9c",
  playerCloakShade: "#2c4677",
  playerTrim: "#f5c84c",

  // UI shadow / outline
  outline: "#241c12",
  shadow: "rgba(20, 16, 10, 0.35)",
} as const;

export type PaletteColor = keyof typeof palette;
