#!/usr/bin/env python3
"""Build the final game-ready assets for the Olympus restyle.

- Crops seamless 32x32 ground tiles from the pack sheets.
- Copies chosen extracted prop sprites (by index) with clean names.
- Composes the Temple of Zeus and Main HQ facades from real marble columns
  plus drawn marble structure (base, entablature, pediment, lightning emblem).

Run: .venv/bin/python tools/build_assets.py
"""
import glob
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(ROOT, "apps/client/public/assets")
GK = os.path.join(PUB, "greek")
GR = os.path.join(PUB, "grassland")
EXT = os.path.join(ROOT, "tools/extracted")
TILES = os.path.join(PUB, "tiles")
PROPS = os.path.join(PUB, "props")
os.makedirs(TILES, exist_ok=True)
os.makedirs(PROPS, exist_ok=True)

T = 32


def sheet(name):
    return Image.open(os.path.join(GK, name)).convert("RGBA")


def cell(img, cx, cy, w=1, h=1):
    return img.crop((cx * T, cy * T, (cx + w) * T, (cy + h) * T))


# ---------------------------------------------------------------- ground tiles
def build_tiles():
    ground = Image.open(os.path.join(GR, "ground.png")).convert("RGBA")
    # right-side fill columns are solid grass / dirt (verified by classifier)
    cell(ground, 25, 5).save(os.path.join(TILES, "grass.png"))
    cell(ground, 28, 5).save(os.path.join(TILES, "grass2.png"))
    cell(ground, 22, 13).save(os.path.join(TILES, "dirt.png"))
    # clean, seamless marble generated to match the temple marble color
    _marble_tile((232, 224, 201), (245, 240, 224), (205, 194, 165)).save(
        os.path.join(TILES, "marble.png"))
    _marble_tile((224, 215, 190), (240, 233, 214), (198, 186, 156)).save(
        os.path.join(TILES, "marble2.png"))


def _marble_tile(base, light, dark):
    import random
    random.seed(7)
    im = Image.new("RGBA", (T, T), base + (255,))
    px = im.load()
    for _ in range(46):
        x, y = random.randrange(T), random.randrange(T)
        px[x, y] = (light if random.random() < 0.5 else dark) + (255,)
    d = ImageDraw.Draw(im)
    # subtle paver seam along two edges so large floors read as tiled marble
    d.line([(0, 0), (T - 1, 0)], fill=dark + (110,))
    d.line([(0, 0), (0, T - 1)], fill=dark + (110,))
    d.line([(1, 1), (T - 1, 1)], fill=light + (90,))
    return im


def tiled_preview(tile_name, out, n=5, scale=6):
    im = Image.open(os.path.join(TILES, tile_name)).convert("RGBA")
    big = Image.new("RGBA", (im.width * n, im.height * n))
    for y in range(n):
        for x in range(n):
            big.alpha_composite(im, (x * im.width, y * im.height))
    big = big.resize((big.width * scale, big.height * scale), Image.NEAREST)
    big.convert("RGB").save(out)


# ----------------------------------------------------------------------- props
def pick(srcdir, index, dest):
    matches = glob.glob(os.path.join(EXT, srcdir, f"{index:02d}_*.png"))
    if not matches:
        print("  MISSING", srcdir, index)
        return None
    im = Image.open(matches[0]).convert("RGBA")
    im.save(os.path.join(PROPS, dest))
    print(f"  prop {dest:28s} {im.width}x{im.height}  <- {srcdir}/{os.path.basename(matches[0])}")
    return im


def build_props():
    # columns
    pick("pillars", 20, "column.png")
    pick("pillars", 22, "column_gold.png")
    pick("pillars", 24, "column_ionic.png")
    pick("pillars", 26, "column_broken.png")
    # statues
    pick("statues", 4, "statue_zeus.png")
    pick("statues", 15, "statue_lion.png")
    pick("statues", 16, "statue_griffin.png")
    pick("statues", 7, "statue_goddess.png")
    pick("statues", 9, "statue_horse.png")
    pick("statues", 17, "statue_athena.png")
    # fountains
    pick("fountains", 16, "fountain.png")
    pick("fountains", 5, "fountain_jet.png")
    pick("fountains", 9, "pool.png")
    # braziers
    pick("braziers", 1, "brazier.png")
    pick("braziers", 9, "brazier_tripod.png")
    # trees (greek)
    pick("trees", 1, "cypress.png")
    pick("trees", 18, "olive_tree.png")
    pick("trees", 25, "blossom_tree.png")
    # grajo decorations
    pick("gdecor", 0, "tree_green.png")
    pick("gdecor", 10, "bush.png")
    pick("gdecor", 43, "rock.png")
    pick("gdecor", 22, "stump.png")


# --------------------------------------------------------------- building bake
MARBLE = (232, 224, 201, 255)
MARBLE_L = (245, 240, 224, 255)
MARBLE_D = (193, 181, 150, 255)
MARBLE_DD = (150, 138, 110, 255)
GOLD = (214, 170, 70, 255)
GOLD_L = (245, 214, 130, 255)
NAVY = (34, 52, 92, 255)
SHADOW = (18, 16, 24, 90)


def rrect(d, box, fill):
    d.rectangle(box, fill=fill)


def compose_temple(columns=6, gap=70, out="temple_zeus.png", omega=False, scale=0.42):
    col = Image.open(os.path.join(PROPS, "column.png")).convert("RGBA")
    cw = int(col.width * scale)
    ch = int(col.height * scale)
    col = col.resize((cw, ch), Image.NEAREST)

    pad = 26
    span = columns * cw + (columns - 1) * (gap - cw if gap > cw else 18)
    step = cw + 18
    span = columns * step - 18
    base_h = 26
    ent_h = 22
    ped_h = int(span * 0.22)
    W = span + pad * 2
    H = ped_h + ent_h + ch + base_h + 16
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    ground_y = H - 4
    # ground shadow
    d.ellipse([pad - 6, ground_y - 14, W - pad + 6, ground_y + 4], fill=SHADOW)

    base_top = ground_y - base_h
    col_top = base_top - ch
    ent_top = col_top - ent_h
    ped_base = ent_top

    # stepped stylobate base
    for i, inset in enumerate((0, 8, 16)):
        yy = base_top + i * (base_h // 3)
        rrect(d, [pad - 18 + inset, yy, W - pad + 18 - inset, yy + base_h // 3 + 1],
              MARBLE_D if i % 2 else MARBLE)
        d.line([(pad - 18 + inset, yy), (W - pad + 18 - inset, yy)], fill=MARBLE_L)

    # columns
    x = pad
    for _ in range(columns):
        img.alpha_composite(col, (x, col_top))
        x += step

    # entablature beam
    rrect(d, [pad - 14, ent_top, W - pad + 14, col_top], MARBLE_L)
    rrect(d, [pad - 14, ent_top, W - pad + 14, ent_top + 4], MARBLE)
    rrect(d, [pad - 14, col_top - 5, W - pad + 14, col_top], MARBLE_D)
    # frieze band
    band_y = ent_top + 7
    rrect(d, [pad - 6, band_y, W - pad + 6, band_y + 8], NAVY)
    for gx in range(pad, W - pad, 16):
        d.rectangle([gx, band_y + 2, gx + 8, band_y + 6], outline=GOLD)

    # pediment (triangle)
    apex = (W // 2, ped_base - ped_h)
    left = (pad - 14, ped_base)
    right = (W - pad + 14, ped_base)
    d.polygon([apex, left, right], fill=MARBLE)
    d.polygon([apex, left, right], outline=GOLD)
    # inner shading
    d.polygon([(apex[0], apex[1] + 6), (left[0] + 14, left[1] - 4), (right[0] - 14, right[1] - 4)],
              fill=MARBLE_L)
    # cornice line
    d.line([left, right], fill=GOLD, width=2)

    # lightning emblem / omega in tympanum
    cx = W // 2
    cy = ped_base - ped_h // 2
    if omega:
        d.ellipse([cx - 12, cy - 12, cx + 12, cy + 12], outline=GOLD, width=2)
        d.text((cx - 5, cy - 8), "Ω", fill=GOLD)
    else:
        bolt = [(cx + 2, cy - 14), (cx - 8, cy + 1), (cx - 1, cy + 1),
                (cx - 4, cy + 14), (cx + 9, cy - 5), (cx + 1, cy - 5)]
        d.polygon(bolt, fill=GOLD_L, outline=GOLD)

    # grand doorway (dark, between center columns)
    door_w = step
    door_x = W // 2 - door_w // 2
    rrect(d, [door_x, base_top - ch + 8, door_x + door_w, base_top], (26, 22, 30, 255))
    rrect(d, [door_x + 4, base_top - ch + 14, door_x + door_w - 4, base_top - 2], (40, 34, 46, 255))
    d.rectangle([door_x, base_top - ch + 8, door_x + door_w, base_top], outline=MARBLE_D)

    img.save(os.path.join(PROPS, out))
    print(f"  built {out}: {W}x{H}")


def build_buildings():
    compose_temple(columns=6, out="temple_zeus.png", omega=False, scale=0.46)
    compose_temple(columns=4, out="hq.png", omega=True, scale=0.36)


if __name__ == "__main__":
    print("tiles:")
    build_tiles()
    for t in ("grass", "marble", "dirt"):
        tiled_preview(t + ".png", os.path.join(ROOT, "tools/preview/tiled_" + t + ".png"))
    print("props:")
    build_props()
    print("buildings:")
    build_buildings()
    print("done")
