# Olympus Interior Art Spec

**Mandatory pre-read** before generating or replacing any interior room art (Tyche hall, future temple interiors).

---

## Anti-slice policy (critical)

**Never** crop overlapping rectangles from one composed room image and re-stack them in Phaser. That duplicates pixels at misaligned positions and produces visible stair-step glitches.

| Wrong | Right |
|-------|-------|
| 7+ overlapping crops from one reference | One full backdrop PNG at native resolution |
| `setDisplaySize()` stretch to fit room | Scale backdrop with `setScale(artScale)` to world bounds |
| Sharp `fit:"fill"` resize then slice | AI regenerate at target size from reference |
| Desk/floor/dais as re-crops of backdrop | Foreground overlay only (keyed alpha) for y-sort |

---

## Tyche hall asset model

| Asset | File | Role |
|-------|------|------|
| Backdrop | `tyche_room_back.png` | Full room composition including static ticker band; depth 0 |
| Foreground | `tyche_room_fore.png` | Optional ledger/amphora rail; magenta-keyed; depth = y |

Target room size: **1536×960** source art, displayed at **920×575** world (`artScale = 920/1536`).

**No animated ticker overlay in Phaser** — the ticker is baked into the backdrop only.

---

## Tyche room bounds

| Field | File | Purpose |
|-------|------|---------|
| `northClipY` | `tycheHallLayout.ts` | Camera never scrolls above this Y |
| `walkMinY` | `tycheHallLayout.ts` | Player cannot walk north of back-wall base |

Tune both after art changes by walking to the back wall in-game.

---

## Collision pipeline

Collision is **not** hand-measured AABB boxes. Use the vision + raster pipeline:

1. Read [`tools/interiors/tyche_collision_prompt.md`](../../tools/interiors/tyche_collision_prompt.md)
2. Segment the final backdrop → save [`tools/interiors/tyche_collision_raw.json`](../../tools/interiors/tyche_collision_raw.json)
3. `node tools/generate_tyche_collision.mjs` → writes `tycheCollision.json` + debug PNG
4. Review [`tools/preview/tyche_collision_debug.png`](../../tools/preview/tyche_collision_debug.png) — red = blocked
5. In-game verify with `?debugCollision=1` on the client URL

Runtime: [`WalkGridCollision.ts`](../../apps/client/src/game/systems/WalkGridCollision.ts) samples a 4px blocked grid on the player foot hitbox.

---

## Generation workflow

1. Read this spec + [`references/Tyche's temple.png`](../../references/Tyche's%20temple.png)
2. AI-generate backdrop (exact layout match, no characters, no HUD)
3. AI-generate foreground-only layer on flat magenta `#FF00FF` (optional)
4. `node tools/process_tyche_interior.mjs` — keyout fore, validate dims
5. Update collision polygons → `node tools/generate_tyche_collision.mjs`
6. Tune `northClipY` / `walkMinY` in `tycheHallLayout.ts` if needed
7. QA: no ceiling artifacts, player visible on entry rug, desk/wall collision aligns

Prompts: `tools/interiors/prompts.json`

---

## Rendering

- Painterly interior backdrops use **LINEAR** texture filter (see `configurePixelArtTextures`)
- Pixel tilesets and characters stay **NEAREST**
- Player depth = `sprite.y`; backdrop fixed low depth; foreground overlay depth = y
- Opaque ceiling cap rect at `northClipY` hides any backdrop artifacts above the playable room

---

## Pipeline tools

| Tool | Purpose |
|------|---------|
| `tools/process_tyche_interior.mjs` | Keyout fore + dim validation |
| `tools/generate_tyche_collision.mjs` | Polygon → 4px walk grid + debug overlay |
| `tools/process_tyche_assets.mjs` | Exterior/terrace only (`--exterior-only`) |
