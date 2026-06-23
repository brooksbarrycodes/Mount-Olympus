#!/usr/bin/env python3
"""Offline schematic of the Mount Olympus overworld, parsed straight from the
TS data files, so layout/density/overlaps can be QA'd without a browser.

Run: .venv/bin/python tools/preview_map.py
"""
import os
import re
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORLD_TS = os.path.join(ROOT, "apps/client/src/game/world/olympusWorld.ts")
BP_TS = os.path.join(ROOT, "apps/client/src/game/world/olympusBlueprint.ts")
OUT = os.path.join(ROOT, "tools/preview/map_schematic.png")

w = open(WORLD_TS).read()
bp = open(BP_TS).read()


def block(text, name, end=None):
    i = text.index(f"export const {name}")
    j = len(text) if end is None else text.index(f"export const {end}", i)
    return text[i:j]


WORLD_W = int(re.search(r"width:\s*(\d+)", block(w, "WORLD")).group(1))
WORLD_H = int(re.search(r"height:\s*(\d+)", block(w, "WORLD")).group(1))
TILE = 32
S = 0.25  # schematic scale

img = Image.new("RGB", (int(WORLD_W * S), int(WORLD_H * S)), (96, 146, 84))
d = ImageDraw.Draw(img, "RGBA")


def sx(x):
    return int(x * S)


# ----- plateau (summit) + ponds from blueprint -----
plat = block(bp, "plateaus", "ponds")
for m in re.finditer(r"x:\s*(\d+),\s*y:\s*(\d+),\s*w:\s*(\d+),\s*h:\s*(\d+)", plat):
    x, y, pw, ph = (int(v) for v in m.groups())
    d.rectangle([sx(x * TILE), sx(y * TILE), sx((x + pw) * TILE), sx((y + ph) * TILE)],
                fill=(120, 170, 110, 255))
pond_b = block(bp, "ponds")
_pond_png = os.path.join(ROOT, "apps/client/public/assets/ground/pond_water.png")
for m in re.finditer(r"x:\s*(\d+),\s*y:\s*(\d+),\s*w:\s*(\d+),\s*h:\s*(\d+)", pond_b):
    x, y, pw, ph = (int(v) for v in m.groups())
    ww, wh = pw * TILE + 64, ph * TILE + 56
    pim = Image.open(_pond_png).convert("RGBA").resize((sx(ww), sx(wh)), Image.LANCZOS)
    cx, cy = (x + pw / 2) * TILE, (y + ph / 2) * TILE
    img.paste(pim, (sx(cx - ww / 2), sx(cy - wh / 2)), pim)

# ----- ground-detail patches (paste real keyed art) -----
GROUND = os.path.join(ROOT, "apps/client/public/assets/ground")
PATCHES = {"patchMeadow": ("patch_meadow.png", 0.70),
           "patchRocks": ("patch_rocks.png", 0.80),
           "patchField": ("patch_field.png", 0.77)}
for m in re.finditer(r"key:\s*TX\.(\w+),\s*x:\s*(\d+),\s*y:\s*(\d+),\s*w:\s*(\d+)",
                     block(w, "groundPatches", "PATCH_RATIO")):
    k, px_, py_, pw_ = m.group(1), int(m.group(2)), int(m.group(3)), int(m.group(4))
    if k in PATCHES:
        fn, ratio = PATCHES[k]
        ph_ = int(pw_ * ratio)
        pa = Image.open(os.path.join(GROUND, fn)).convert("RGBA").resize((sx(pw_), sx(ph_)), Image.LANCZOS)
        img.paste(pa, (sx(px_ - pw_ / 2), sx(py_ - ph_ / 2)), pa)

# ----- plazas (paste the real keyed floor overlays) -----
FLOORS = {
    "floorPantheon": "pantheon_floor.png", "floorTemple": "temple_floor.png",
    "floorAgora": "agora_floor.png", "floorGarden": "garden_floor.png",
}
for m in re.finditer(
    r"x:\s*(\d+),\s*y:\s*(\d+),\s*w:\s*(\d+),\s*h:\s*(\d+),\s*floor:\s*TX\.(\w+)",
    block(w, "plazas", "pathways"),
):
    x, y, pw, ph, fk = int(m.group(1)), int(m.group(2)), int(m.group(3)), int(m.group(4)), m.group(5)
    f = FLOORS.get(fk)
    if f:
        fl = Image.open(os.path.join(GROUND, f)).convert("RGBA").resize((sx(pw), sx(ph)), Image.LANCZOS)
        img.paste(fl, (sx(x), sx(y)), fl)
    else:
        d.rectangle([sx(x), sx(y), sx(x + pw), sx(y + ph)], fill=(225, 220, 205, 235))

# ----- pathways -----
_ps = w.index("export const pathways")
paths_blk = w[_ps:w.index("export interface DecorItem", _ps)]
for line in re.findall(r"\[([^\[\]]*\{[^\[\]]*)\]", paths_blk):
    pts = [(int(a), int(b)) for a, b in re.findall(r"x:\s*(\d+),\s*y:\s*(\d+)", line)]
    if len(pts) >= 2:
        d.line([(sx(x), sx(y)) for x, y in pts], fill=(196, 168, 120, 255), width=max(2, int(34 * S)))

# ----- decor dots, colored by type -----
COLORS = {
    "cypress": (40, 90, 50), "oliveTree": (90, 130, 70), "blossomTree": (220, 150, 190),
    "treeGreen": (50, 110, 60), "bush": (70, 130, 70),
    "flowersWhite": (245, 245, 235), "flowersPurple": (150, 110, 200),
    "flowersYellow": (240, 210, 80),
    "statue": (210, 200, 170), "column": (235, 230, 215), "brazier": (220, 140, 60),
    "fountain": (120, 180, 230), "pool": (120, 180, 230), "altar": (235, 225, 200),
    "rock": (130, 130, 130), "stump": (120, 90, 60), "amphora": (180, 120, 70),
}


def color_for(key):
    for k, c in COLORS.items():
        if k.lower() in key.lower():
            return c
    return (200, 60, 60)


decor_blk = w[w.index("export const decor"):]
for m in re.finditer(r"key:\s*TX\.(\w+),\s*x:\s*(\d+),\s*y:\s*(\d+)", decor_blk):
    key, x, y = m.group(1), int(m.group(2)), int(m.group(3))
    c = color_for(key)
    r = 4 if "tree" in key.lower() or "ress" in key.lower() or "olive" in key.lower() or "blossom" in key.lower() else 3
    d.ellipse([sx(x) - r, sx(y) - r, sx(x) + r, sx(y) + r], fill=c + (255,))

# ----- reserved temple plots (paste the shrine-foundation overlay) -----
_shrine = os.path.join(GROUND, "shrine_plot.png")
for m in re.finditer(r"\{\s*x:\s*(\d+),\s*y:\s*(\d+)\s*\}", block(w, "templePlots", "plazas")):
    px_, py_ = int(m.group(1)), int(m.group(2))
    pw_, ph_ = 248, int(248 * 0.668)
    spim = Image.open(_shrine).convert("RGBA").resize((sx(pw_), sx(ph_)), Image.LANCZOS)
    img.paste(spim, (sx(px_ - pw_ / 2), sx(py_ - ph_ / 2)), spim)

# ----- buildings (paste the real keyed PNGs) -----
PROPS = os.path.join(ROOT, "apps/client/public/assets/props")
FILES = {"The Pantheon": "pantheon.png", "Temple of Zeus": "temple_zeus.png"}
loc_blk = block(w, "locations", "templePlots")
for m in re.finditer(r"name:\s*\"([^\"]+)\"[\s\S]*?x:\s*(\d+),\s*y:\s*(\d+),\s*scale:\s*([\d.]+)",
                     loc_blk):
    name, x, y, sc = m.group(1), int(m.group(2)), int(m.group(3)), float(m.group(4))
    f = FILES.get(name)
    if not f:
        continue
    b = Image.open(os.path.join(PROPS, f)).convert("RGBA")
    bw, bh = int(b.width * sc * S), int(b.height * sc * S)
    b = b.resize((bw, bh), Image.LANCZOS)
    img.paste(b, (sx(x) - bw // 2, sx(y) - bh), b)

img = img.resize((img.width * 2, img.height * 2), Image.NEAREST)
img.save(OUT)
print("wrote", OUT, img.size)
