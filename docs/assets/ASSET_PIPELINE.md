# Asset Pipeline

How art gets into the game.

## Current approach: licensed pixel-art packs + procedural characters

The world art (terrain, props, buildings) is sourced from licensed itch.io
pixel-art packs and processed into game-ready PNGs under
`apps/client/public/assets/`. Player + Zeus characters and a few small
effects/UI bits stay procedurally generated (the user liked their sizing/look,
and keeping them as code avoids extra licensing + stays crisp). The game config
sets `pixelArt: true`, so everything scales up crisply across the zoom range.

### Runtime layout (`apps/client/public/assets/`)

- `tiles/` — seamless 32x32 ground tiles: `grass.png`, `grass2.png`,
  `dirt.png`, `marble.png` (marble is procedurally generated to tile cleanly).
- `props/` — extracted/recomposed sprites: columns, statues, fountains, pools,
  braziers, trees, bushes, rocks, stumps, plus the composed `temple_zeus.png`
  and `hq.png` building facades.
- `characters/` — staged pack character sheets (`model.png`, `villagers.png`),
  not yet wired into the runtime.

### Processing tools (`tools/`, need a local `.venv` with Pillow)

- `tools/tileslice.py` — analyze + slice sheets: `grid_map`, `preview`,
  `extract` (connected-component object extraction), `contact` (contact sheets).
- `tools/build_assets.py` — final build: crop seamless ground tiles, generate
  seamless marble, copy/rename curated props, and compose the `temple_zeus.png`
  / `hq.png` facades from scaled column sprites + drawn marble.

Run order: extract packs → `tileslice.py` to inspect/extract → `build_assets.py`
to produce the files committed under `public/assets/`.

### Code wiring

- `art/keys.ts` — `TX` texture keys + `IMAGE_ASSETS` (key → public URL) manifest;
  also character spritesheet frame/row constants.
- `art/textures.ts` — `loadWorldImages(scene)` (preload real PNGs),
  `generateProcedural(scene)` (characters/effects/altar/amphora),
  `registerAnimations(scene)`.
- `scenes/BootScene.ts` — `preload()` loads images; `create()` generates
  procedural art + anims, then starts the overworld.
- `world/olympusWorld.ts` — wide (non-square) map data, `PROP_SCALE` defaults,
  building defs (bottom-origin + `scale`), plazas/paths/decor/plots.

Texture keys are stable, so adding/swapping art is a data change (manifest +
world data) without touching scene logic. To later swap characters to the pack
sheets, load `characters/*.png` as spritesheets under the existing `TX.player` /
`TX.zeus` keys and drop the procedural painters.

## Pixel-art rendering notes (Phaser)

- `pixelArt: true` keeps textures crisp (nearest-neighbor scaling).
- Large source sprites are scaled down via `PROP_SCALE` / per-item `scale` so
  props stay proportional to the (small) characters.
- Buildings/props use a bottom-center origin with `depth = y` for correct
  top-down overlap sorting.

## Pixel-art rendering notes (Phaser)

- `pixelArt: true` keeps textures crisp (nearest-neighbor scaling).
- Tileset sheets and the interior marble floor use explicit `NEAREST` filtering
  via `configurePixelArtTextures()` in `BootScene` (prevents GPU bleed at tile edges).
- Camera follow uses smoothing with fractional zoom; `CameraSystem.update()` snaps
  scroll to the world pixel grid at the current zoom to prevent tile seam lines.
- The overworld has a solid grass-colored underfill rect beneath the tilemap so any
  remaining 1px gap reads as ground instead of the canvas sky color.
- Avoid enabling `roundPixels` globally — on recent Phaser it can reintroduce
  jitter with zoomed camera-follow. Per-camera `setRoundPixels(true)` plus scroll
  snap is the intended approach.
