# Tyche Interior Collision — Vision Segmentation Prompt

Use this prompt with the backdrop PNG [`tyche_room_back.png`](../../apps/client/public/assets/interior/tyche_room_back.png) (1536×960 source pixels).

## Task

Trace walkable floor and solid obstacles in the room image. Output **only** valid JSON matching the schema below. Coordinates are in **source pixel space** (1536 wide × 960 tall). Polygons are clockwise, tight to visible geometry.

## Rules

1. **Walkable** = visible floor tiles the player can stand on (entry rug, main hall floor, paths between desks).
2. **Obstacles** = everything else the player must not enter:
   - Back wall and upper architecture (including ticker/ceiling band above the back wall)
   - Left and right walls (full height, perspective taper)
   - All desk/counter **tops and fronts** (center trading desk, left/right workstations)
   - Pillars, ledges, railings, amphora bases, chair backs blocking path
3. Ceiling band above the back wall is **blocked** (not walkable).
4. Do not include HUD, characters, or text overlays.
5. Floor polygon wins where it overlaps obstacle polygons (floor cuts doorways into walls).

## Output schema

```json
{
  "sourceSize": { "w": 1536, "h": 960 },
  "obstacles": [
    { "id": "unique_id", "type": "wall|desk|prop", "polygon": [[x, y], ...] }
  ],
  "walkable": [
    { "id": "main_floor", "polygon": [[x, y], ...] }
  ]
}
```

## Validation checkpoints (world coords = source × 920/1536, 575/960)

| Point | World (920×575) | Source (1536×960) | Must be |
|-------|-----------------|-------------------|---------|
| Entry spawn | (460, 490) | (768, 818) | walkable |
| Trading desk | (460, 385) | (768, 643) | walkable (approach from south) |
| Back wall center | (460, 155) | (768, 259) | blocked |
| Above ceiling clip | (460, 74) | (768, 124) | blocked |

Save output to [`tyche_collision_raw.json`](tyche_collision_raw.json), then run:

```bash
node tools/generate_tyche_collision.mjs
```

Review [`tools/preview/tyche_collision_debug.png`](../preview/tyche_collision_debug.png) before committing.
