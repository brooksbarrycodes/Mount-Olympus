# Olympus Building 2.5D Art Spec

**Mandatory pre-read** before generating or replacing any overworld building exterior
(Pantheon, Temple of Zeus, Temple of Tyche, future temples).

The game renders buildings as single PNG sprites with **bottom-center origin** and
`depth = y` for y-sort occlusion. The sprite must read as a **volumetric 2.5D
structure**, not a flat architectural elevation poster.

---

## What "Olympus 2.5D" means

This is **not** isometric 3/4 view. It is **not** orthographic front elevation.
It is the Stardew Valley / Greek RPG overworld sprite grammar used by Pantheon and
Temple of Zeus:

| Must show | Must NOT show |
|-----------|---------------|
| Front portico (columns, doors, pediment emblem) | Flat wallpaper façade with no roof volume |
| **Receding roof** — gable side planes OR dome/cupola mass **behind** the pediment | Pediment triangle filled like a 2D shape with nothing above/behind it |
| Roof ridgeline / eaves depth visible above column capitals | "Head-on elevation" / blueprint / poster view |
| Tiered stylobate steps with visible tread depth | Only steps in perspective while upper structure is flat |
| Isolated on flat magenta `#FF00FF`, painterly pixel art | Characters, ground plane, cast shadows baked in |

### Anatomical reference

See `tools/build_pantheon.py` — the Pantheon composer draws the **dome rising
behind the portico**, with a low pediment in front. Zeus uses a gabled pediment
with visible roof mass. Both share the same camera family.

```
        ___ridgeline___
       /               \
      /  ROOF PLANES    \   ← must be visible (side slopes or dome)
     /___________________\
    |  pediment / emblem  |
    |  columns   doors    |
    |_____steps steps_____|
```

**Failure mode (Tyche v1):** steps show tread depth, but the upper structure is a
flat front wall + flat pediment triangle — no roof volume. That is **REJECT**.

Steps-only depth is **not** partial success.

---

## Pass / fail checklist

### REJECT (do not keyout, regenerate)

- [ ] Roof is only a flat pediment triangle fill with no receding planes above it
- [ ] No roof mass visible behind/above the entablature
- [ ] Prompt used "head-on", "front elevation", "orthographic", or "flat façade"
- [ ] Building reads as a 2D poster pasted on the map
- [ ] `node tools/validate_building_2_5d.mjs <src.png>` exits non-zero

### ACCEPT

- [ ] Receding gable roof planes OR dome/cupola volume visible behind pediment
- [ ] Roof ridgeline and eaves depth visible above column capitals
- [ ] Steps + portico + roof all read as one cohesive 2.5D volume
- [ ] Validator PASS
- [ ] Keyed PNG trimmed and placed under `apps/client/public/assets/props/`

---

## Canonical AI prompt template

Copy this block for new building exteriors. Replace the theming sentence per god.

```
Painterly pixel-art Greek [BUILDING NAME] overworld sprite for a top-down RPG,
full 2.5D volume matching Pantheon/Temple of Zeus camera: front portico faces
viewer BUT receding gabled roof planes visible behind the pediment (show roof
ridgeline, side roof slopes, eaves depth — NOT a flat front elevation). [THEME:
materials, pediment emblem, column order, banners]. Wide tiered marble steps with
tread depth. Isolated building only, no ground, no characters, flat magenta
background #FF00FF.
```

### Temple of Tyche (canonical)

```
Painterly pixel-art Greek temple overworld sprite for a top-down RPG, full 2.5D
volume matching Pantheon/Temple of Zeus camera: front portico faces viewer BUT
receding gabled roof planes visible behind the pediment (show roof ridgeline, side
roof slopes, eaves depth — NOT a flat front elevation). Temple of Tyche:
teal-green marble accents, white ionic columns, gold fortune wheel and coin stacks
in pediment, teal banners with wheel motifs, wide tiered marble steps with tread
depth. Isolated building only, no ground, no characters, flat magenta background
#FF00FF.
```

Stored in repo: `tools/buildings/prompts.json` → `temple_tyche_exterior`.

---

## Anti-patterns (known mistakes)

| Mistake | Why it fails |
|---------|--------------|
| "head-on front elevation" in prompt | Produces flat 2D façade; roof invisible |
| "2.5D steps" without roof volume | Steps-only depth — user rejects this |
| Copying interior reference as exterior | Interior is room wallpaper; exterior needs overworld camera |
| Skipping validator | Flat façades reach the game and waste regen credits |

---

## Pipeline (always follow this order)

1. **Read this spec** (Cursor rule enforces this)
2. **Generate** source on magenta → `.cursor-gen/<name>_front.png`
3. **Validate** → `node tools/validate_building_2_5d.mjs .cursor-gen/<name>_front.png`
4. **Keyout** → `tools/keyout_buildings.py` or `node tools/process_tyche_assets.mjs --exterior-only`
5. **Preview** → composite beside Zeus at map scale; tune `scale` in `olympusWorld.ts` if bbox changed
6. **QA in-game** → walk behind/ in front of roof mass (y-sort), path to door clear

### Tools

| Tool | Purpose |
|------|---------|
| `tools/validate_building_2_5d.mjs` | Reject flat façades before keyout (roof band ≥55% width, top ridge ≥35%, upper plateau avg ≥45%, upper mass depth ≥8%) |
| `tools/keyout_buildings.py` | Magenta keyout for Pantheon / Zeus / Tyche props |
| `tools/process_tyche_assets.mjs` | Tyche keyout + interior slice (`--exterior-only` skips interior) |
| `tools/preview_map.py` | Overworld schematic (requires Python venv) |

---

## On-map scale (current)

| Building | Texture key | Scale | Base position |
|----------|-------------|-------|---------------|
| Pantheon | `TX.pantheon` | 0.46 | (1800, 760) |
| Temple of Zeus | `TX.templeZeus` | 0.34 | (1330, 1150) |
| Temple of Tyche | `TX.templeTyche` | 0.34 | (2480, 1180) |

Nudge scale only if a regenerated sprite's trimmed bbox differs significantly from
the previous asset.
