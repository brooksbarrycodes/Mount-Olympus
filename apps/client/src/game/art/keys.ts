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

  // Interior furniture (AI-generated 2.5D, keyed)
  councilTable: "tx-council-table",
  councilTableLong: "tx-council-table-long",
  throne: "tx-throne",
  councilSeat: "tx-council-seat",
  councilChairSide: "tx-council-chair-side",
  commandDesk: "tx-command-desk",
  candelabra: "tx-candelabra",
  wallRelief: "tx-wall-relief",

  // Buildings (loaded composed images)
  headquarters: "tx-headquarters",
  pantheon: "tx-pantheon",
  templeZeus: "tx-temple-zeus",
  templePlot: "tx-temple-plot",

  // Ground overlays (AI-generated painterly mosaics / patches)
  floorPantheon: "tx-floor-pantheon",
  floorTemple: "tx-floor-temple",
  floorAgora: "tx-floor-agora",
  floorGarden: "tx-floor-garden",
  pondWater: "tx-pond-water",
  patchMeadow: "tx-patch-meadow",
  patchRocks: "tx-patch-rocks",
  patchField: "tx-patch-field",
  shrinePlot: "tx-shrine-plot",

  // Characters (procedural spritesheets)
  player: "tx-player",
  zeus: "tx-zeus",
  athena: "tx-athena",
  hermes: "tx-hermes",
  hephaestus: "tx-hephaestus",
  poseidon: "tx-poseidon",
  demeter: "tx-demeter",
  apollo: "tx-apollo",
  oracle: "tx-oracle",

  // Effects / UI (procedural)
  shadow: "tx-shadow",
  glow: "tx-glow",
  spark: "tx-spark",
  coin: "tx-coin",
  interactPrompt: "tx-interact-prompt",
  cloud: "tx-cloud",
  cloud2: "tx-cloud-2",
  cloud3: "tx-cloud-3",
  waterfall: "tx-waterfall",

  // ground detail scatter (soften hard edges + fill open space)
  tuft: "tx-tuft",
  tuft2: "tx-tuft-2",
  fern: "tx-fern",
  flowersWhite: "tx-flowers-white",
  flowersPurple: "tx-flowers-purple",
  flowersYellow: "tx-flowers-yellow",
  pebbles: "tx-pebbles",
  reeds: "tx-reeds",
  lily: "tx-lily",
  pathStamp: "tx-path-stamp",
  godray: "tx-godray",
} as const;

/** All cloud texture variants, for randomized drifting clouds. */
export const CLOUD_KEYS = [TX.cloud, TX.cloud2, TX.cloud3] as const;

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
  [TX.pantheon]: "assets/props/pantheon.png",
  [TX.templeZeus]: "assets/props/temple_zeus.png",
  [TX.floorPantheon]: "assets/ground/pantheon_floor.png",
  [TX.floorTemple]: "assets/ground/temple_floor.png",
  [TX.floorAgora]: "assets/ground/agora_floor.png",
  [TX.floorGarden]: "assets/ground/garden_floor.png",
  [TX.pondWater]: "assets/ground/pond_water.png",
  [TX.patchMeadow]: "assets/ground/patch_meadow.png",
  [TX.patchRocks]: "assets/ground/patch_rocks.png",
  [TX.patchField]: "assets/ground/patch_field.png",
  [TX.shrinePlot]: "assets/ground/shrine_plot.png",

  [TX.councilTable]: "assets/interior/council_table.png",
  [TX.councilTableLong]: "assets/interior/council_table_long.png",
  [TX.throne]: "assets/interior/throne.png",
  [TX.councilSeat]: "assets/interior/council_seat.png",
  [TX.councilChairSide]: "assets/interior/council_chair_side.png",
  [TX.commandDesk]: "assets/interior/command_desk.png",
  [TX.candelabra]: "assets/interior/candelabra.png",
  [TX.wallRelief]: "assets/interior/wall_relief.png",
};

/**
 * Terrain tilesets loaded as whole sheets and sliced by Phaser's tilemap into
 * 32x32 tiles. Tile indices used by the autotiler are row*columns+col, so the
 * column counts below must match the source PNG widths.
 */
export const TS = {
  ground: "ts-ground",
  rocky: "ts-rocky",
  water: "ts-water",
  stairs: "ts-stairs",
} as const;

export const TILESET_ASSETS: Record<string, string> = {
  [TS.ground]: "assets/tilesets/ground.png",
  [TS.rocky]: "assets/tilesets/rocky.png",
  [TS.water]: "assets/tilesets/water.png",
  [TS.stairs]: "assets/tilesets/greek_stairs.png",
};

export const TILESET_COLUMNS: Record<string, number> = {
  [TS.ground]: 33,
  [TS.rocky]: 42,
  [TS.water]: 24,
  [TS.stairs]: 48,
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
  waterfall: "waterfall-flow",
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
  sit: 6, // forward-facing seated (head of table)
  sitSide: 7, // side-facing seated (table-side chairs), faces right; flipX for left
} as const;

export const FRAMES_PER_ROW = 2;
