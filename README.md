# Olympus Opp UI

A Greek-gods-themed, game-like command center for AI "Opps" (agents). The first
version is a Mount Olympus overworld you walk around in, built to feel like a 2D
game (Stardew Valley / Terraria vibe) rather than a web dashboard.

This is the visual + interaction foundation. Real autonomous agents, profit
automation (Etsy/TikTok), microphone input, and agent voices come later; the
codebase is structured so they can be added cleanly.

## Tech stack

- React + TypeScript + Vite (app shell + HUD overlays)
- Phaser 3 (game canvas: map, camera, sprites, movement, interactions)
- A small typed event bridge connects Phaser and React without per-frame React re-renders

## Project layout

```
apps/client/            # the game client
  src/game/             # Phaser: config, scenes, systems, entities, world data
  src/ui/               # React overlays: HUD, dialogs, hotbar
docs/                   # vision, progress log, asset attribution + pipeline
```

## Commands

From the repo root:

```bash
npm install        # install dependencies
npm run dev        # start the dev server (Vite)
npm run build      # type-check + production build
npm run typecheck  # TypeScript check only
npm run preview    # preview the production build
```

## Controls

- `W A S D` / arrow keys: move your character
- Mouse wheel / pinch: zoom in and out (no on-screen zoom bar)
- `E`: interact when a prompt appears (talk to an Opp, enter a building)
- `Esc`: close the interaction dialog

## Manual test checklist

1. Load the app — Mount Olympus overworld appears (not a dashboard).
2. Move the player with WASD; camera follows smoothly.
3. Zoom out to the full Mount Olympus world-map view, then back in to a
   close-up walkable view — smoothly, with the mouse wheel.
4. Walk near Zeus — an `E: Talk to Zeus` prompt appears.
5. Press `E` — a centered dialog opens with status + chat at the bottom.
6. Send a mock chat message.
7. Open the Hall of Allies from the hotbar and select Zeus.
8. Walk to the Headquarters door and press `E` to enter, then exit.
9. Walk to the Temple of Zeus door and press `E` to enter, then exit.
10. Confirm the Drachmas counter is visible in the HUD.

## Assets & licensing

World art (terrain, props, buildings) comes from licensed itch.io pixel-art
packs; the player + Zeus characters and a few effects are original procedural
art. See [docs/assets/ATTRIBUTION.md](docs/assets/ATTRIBUTION.md) for sources and
the per-pack license verification still required before commercial release, and
[docs/assets/ASSET_PIPELINE.md](docs/assets/ASSET_PIPELINE.md) for how assets are
processed (`tools/tileslice.py`, `tools/build_assets.py`).

## Known limitations (first version)

- Opps are driven by mock state data, not real agents.
- No microphone capture or text-to-speech yet (the dialog reserves space for it).
- Building interiors are foundational placeholders.
