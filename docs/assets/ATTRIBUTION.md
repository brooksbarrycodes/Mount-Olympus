# Asset Attribution & Licensing

Every visual asset that ships in the runtime must be listed here **before** it is
referenced by code, with its source, author, license, and whether the license
permits commercial / profit-making use.

## Current runtime art

| Asset set | Source | Author | License | Commercial OK | Files | Modifications |
|-----------|--------|--------|---------|---------------|-------|---------------|
| Ancient Greek Mythology tileset 32x32 (columns, statues, fountains, braziers, altars, pottery, marble) | itch.io — SakPix | SakPix | Paid pack — **verify license terms on pack page** | Verify | `apps/client/public/assets/props/*` (extracted/recomposed) | Sliced into individual sprites via `tools/tileslice.py`; temple/HQ facades recomposed via `tools/build_assets.py` |
| Fantasy Grasslands (terrain, trees, bushes) | itch.io — Fantasy Grasslands pack | see pack page | **Verify license terms on pack page** | Verify | `apps/client/public/assets/tiles/{grass,grass2,dirt}.png`, `props/{olive_tree,tree_green,bush,stump,rock}.png` | 32px ground tiles cropped; props extracted |
| Rocky Pines (rocky/pine terrain accents) | itch.io — Rocky Pines pack | see pack page | **Verify license terms on pack page** | Verify | `apps/client/public/assets/props/cypress.png` (+ staged accents) | Extracted sprites |
| Animated Characters Pack (staged, not yet shipped) | itch.io — Animated Characters Pack | see pack page | **Verify license terms on pack page** | Verify | `apps/client/public/assets/characters/{model,villagers}.png` | Staged only; runtime characters are still project-owned procedural art |
| Olympus procedural pixel-art (player + Zeus characters, marble floor tiles, altar, amphora, effects, UI) | Original to this project | This project | Original work (project-owned) | Yes | `apps/client/src/game/art/*` | Generated at runtime onto canvas textures |
| HUD iconography (coins, sigils, prompts) | Original to this project | This project | Original work (project-owned) | Yes | `apps/client/src/ui/*` (CSS/SVG) | n/a |

> ACTION REQUIRED: the four itch.io packs above are purchased third-party art.
> Before any public/commercial release, confirm each pack's exact author + license
> text from its itch.io page (and bundled readme), fill in the Author/License/
> Commercial columns, and add required credits to an in-app Credits screen.

## Verified candidate packs (for a future art upgrade)

These were checked during planning and look suitable. Verify the exact license
text on each page again before downloading, and add a row to the table above
when any of their files actually ship.

| Pack | URL | License (reported) | Notes |
|------|-----|--------------------|-------|
| LPC compatible Ancient Greek Architecture | https://opengameart.org/content/lpc-compatible-ancient-greek-architecture | CC-BY 4.0 / OGA-BY 3.0 / GPL 3.0 | Doric/Ionic/Corinthian columns, roofs, pottery, altars. Prefer CC-BY/OGA-BY; avoid GPL path unless accepted. |
| Classical Temple Tiles | https://opengameart.org/content/classical-temple-tiles | Verify on page | 16x16 Parthenon-style temple, maintained + ruined. |
| Land of Pixels — Ancient Greeks tileset (top-down) | https://marceles.itch.io/land-of-pixels-ancient-greeks-inspired-tileset-top-down | CC-BY 4.0 (reported) | 16/32/48px terrain, houses, temples, columns, markets. Name-your-own-price. |
| Ancient Greek Mythology tileset 32x32 (SakPix) | https://sakpix.itch.io/ancient-greek-mythology-top-down-pixel-art-tileset-32x32 | Paid; verify | 300+ assets. Only use with explicit purchase + license approval. |

## Attribution checklist (when adding a third-party asset)

1. Confirm the license permits commercial use (this product is profit-oriented).
2. Record source URL, author, license, and files used in the table above.
3. Note any modifications (resizing, recoloring, extrusion).
4. If attribution is required (CC-BY/OGA-BY), surface credits in an in-app
   "Credits" screen and keep this file as the source of truth.
