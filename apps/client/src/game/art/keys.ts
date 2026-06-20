/**
 * String keys for every texture and animation. World art (terrain, props,
 * buildings) is loaded from real pixel-art PNGs under `public/assets`; only
 * characters + small effects/UI remain procedurally generated. Keys stay stable
 * so game code never hardcodes file paths.
 */
export const TX = {
  // Terrain (32x32 tiles, loaded images)
  grass: "tx-grass",
  grassAlt: "tx-grass-alt",
  dirt: "tx-dirt",
  marbleFloor: "tx-marble-floor",
  pathTile: "tx-path",

  // Props (loaded images)
  column: "tx-column",
  columnGold: "tx-column-gold",
  columnIonic: "tx-column-ionic",
  columnBroken: "tx-column-broken",
  statue: "tx-statue",
  statueZeus: "tx-statue-zeus",
  statueLion: "tx-statue-lion",
  statueGriffin: "tx-statue-griffin",
  statueGoddess: "tx-statue-goddess",
  statueHorse: "tx-statue-horse",
  statueAthena: "tx-statue-athena",
  fountain: "tx-fountain",
  fountainJet: "tx-fountain-jet",
  pool: "tx-pool",
  brazier: "tx-brazier",
  brazierTripod: "tx-brazier-tripod",
  cypress: "tx-cypress",
  oliveTree: "tx-olive-tree",
  blossomTree: "tx-blossom-tree",
  treeGreen: "tx-tree-green",
  bush: "tx-bush",
  rock: "tx-rock",
  stump: "tx-stump",

  // Procedural props kept (small dressing)
  altar: "tx-altar",
  amphora: "tx-amphora",

  // Buildings (loaded composed images)
  headquarters: "tx-headquarters",
  templeZeus: "tx-temple-zeus",
  templePlot: "tx-temple-plot",

  // Characters (procedural spritesheets)
  player: "tx-player",
  zeus: "tx-zeus",

  // Effects / UI (procedural)
  shadow: "tx-shadow",
  glow: "tx-glow",
  spark: "tx-spark",
  coin: "tx-coin",
  interactPrompt: "tx-interact-prompt",
  cloud: "tx-cloud",
} as const;

/** Real-image asset manifest: texture key -> public URL. Loaded in BootScene. */
export const IMAGE_ASSETS: Record<string, string> = {
  [TX.grass]: "assets/tiles/grass.png",
  [TX.grassAlt]: "assets/tiles/grass2.png",
  [TX.dirt]: "assets/tiles/dirt.png",
  [TX.pathTile]: "assets/tiles/dirt.png",
  [TX.marbleFloor]: "assets/tiles/marble.png",

  [TX.column]: "assets/props/column.png",
  [TX.columnGold]: "assets/props/column_gold.png",
  [TX.columnIonic]: "assets/props/column_ionic.png",
  [TX.columnBroken]: "assets/props/column_broken.png",
  [TX.statue]: "assets/props/statue_goddess.png",
  [TX.statueZeus]: "assets/props/statue_zeus.png",
  [TX.statueLion]: "assets/props/statue_lion.png",
  [TX.statueGriffin]: "assets/props/statue_griffin.png",
  [TX.statueGoddess]: "assets/props/statue_goddess.png",
  [TX.statueHorse]: "assets/props/statue_horse.png",
  [TX.statueAthena]: "assets/props/statue_athena.png",
  [TX.fountain]: "assets/props/fountain.png",
  [TX.fountainJet]: "assets/props/fountain_jet.png",
  [TX.pool]: "assets/props/pool.png",
  [TX.brazier]: "assets/props/brazier.png",
  [TX.brazierTripod]: "assets/props/brazier_tripod.png",
  [TX.cypress]: "assets/props/cypress.png",
  [TX.oliveTree]: "assets/props/olive_tree.png",
  [TX.blossomTree]: "assets/props/blossom_tree.png",
  [TX.treeGreen]: "assets/props/tree_green.png",
  [TX.bush]: "assets/props/bush.png",
  [TX.rock]: "assets/props/rock.png",
  [TX.stump]: "assets/props/stump.png",

  [TX.headquarters]: "assets/props/hq.png",
  [TX.templeZeus]: "assets/props/temple_zeus.png",
};

export const ANIM = {
  playerIdleDown: "player-idle-down",
  playerIdleUp: "player-idle-up",
  playerIdleSide: "player-idle-side",
  playerWalkDown: "player-walk-down",
  playerWalkUp: "player-walk-up",
  playerWalkSide: "player-walk-side",

  zeusIdle: "zeus-idle",
  coinSpin: "coin-spin",
} as const;

/**
 * Character spritesheet frame layout. Each character sheet is a horizontal strip
 * of FRAME_W x FRAME_H frames in this row order, 2 frames per row.
 */
export const FRAME_W = 24;
export const FRAME_H = 32;

export const CHAR_ROW = {
  idleDown: 0,
  walkDown: 1,
  idleUp: 2,
  walkUp: 3,
  idleSide: 4,
  walkSide: 5,
} as const;

export const FRAMES_PER_ROW = 2;
