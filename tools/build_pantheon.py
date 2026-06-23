#!/usr/bin/env python3
"""Compose grand 2.5D buildings for the summit: The Pantheon (domed, grandest)
and an upgraded Temple of Zeus (tiered steps + pediment). Reuses the real marble
column sprite. Saves into apps/client/public/assets/props and writes previews.

Run: .venv/bin/python tools/build_pantheon.py
"""
import os
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROPS = os.path.join(ROOT, "apps/client/public/assets/props")
PREVIEW = os.path.join(ROOT, "tools/preview")
os.makedirs(PREVIEW, exist_ok=True)

MARBLE = (234, 226, 204, 255)
MARBLE_L = (247, 242, 227, 255)
MARBLE_D = (196, 184, 153, 255)
MARBLE_DD = (152, 140, 112, 255)
GOLD = (214, 170, 70, 255)
GOLD_L = (247, 216, 132, 255)
GOLD_D = (150, 110, 40, 255)
NAVY = (32, 50, 90, 255)
DOORDK = (24, 20, 30, 255)
DOOR = (40, 34, 48, 255)
SHADOW = (18, 16, 24, 90)


def load_col(scale):
    col = Image.open(os.path.join(PROPS, "column.png")).convert("RGBA")
    return col.resize((int(col.width * scale), int(col.height * scale)), Image.NEAREST)


def steps(d, cx, base_top, half_w, base_h, tiers=4):
    """Draw a wide tiered stylobate centered at cx, top at base_top."""
    th = base_h // tiers
    for i in range(tiers):
        yy = base_top + i * th
        inset = i * 10
        x0, x1 = cx - half_w - 40 + inset, cx + half_w + 40 - inset
        d.rectangle([x0, yy, x1, yy + th + 1], fill=MARBLE if i % 2 == 0 else MARBLE_D)
        d.line([(x0, yy), (x1, yy)], fill=MARBLE_L)


def frieze(d, x0, x1, y):
    d.rectangle([x0, y, x1, y + 9], fill=NAVY)
    for gx in range(int(x0) + 4, int(x1) - 6, 16):
        d.rectangle([gx, y + 2, gx + 8, y + 7], outline=GOLD)


def pediment(d, cx, base_y, half_w, h, emblem="bolt"):
    apex = (cx, base_y - h)
    left = (cx - half_w, base_y)
    right = (cx + half_w, base_y)
    d.polygon([apex, left, right], fill=MARBLE)
    d.polygon([(apex[0], apex[1] + 7), (left[0] + 16, left[1] - 4), (right[0] - 16, right[1] - 4)],
              fill=MARBLE_L)
    d.line([left, apex], fill=GOLD, width=2)
    d.line([apex, right], fill=GOLD, width=2)
    d.line([left, right], fill=GOLD, width=2)
    cy = base_y - h // 2 + 2
    if emblem == "bolt":
        bolt = [(cx + 3, cy - 16), (cx - 9, cy + 2), (cx, cy + 2),
                (cx - 5, cy + 16), (cx + 11, cy - 6), (cx + 2, cy - 6)]
        d.polygon(bolt, fill=GOLD_L, outline=GOLD)
    elif emblem == "sun":
        d.ellipse([cx - 11, cy - 11, cx + 11, cy + 11], fill=GOLD_L, outline=GOLD)
        for a in range(0, 360, 30):
            import math
            dx, dy = math.cos(math.radians(a)), math.sin(math.radians(a))
            d.line([(cx + dx * 12, cy + dy * 12), (cx + dx * 18, cy + dy * 18)], fill=GOLD, width=2)


def colonnade(img, col, cx, col_top, n, step):
    total = n * step - (step - col.width)
    x = cx - total // 2
    for _ in range(n):
        img.alpha_composite(col, (int(x), col_top))
        x += step


def doorway(d, cx, top, bottom, w):
    d.rectangle([cx - w // 2, top, cx + w // 2, bottom], fill=DOORDK)
    d.rectangle([cx - w // 2 + 5, top + 6, cx + w // 2 - 5, bottom - 2], fill=DOOR)
    d.rectangle([cx - w // 2, top, cx + w // 2, bottom], outline=MARBLE_D)
    # gold lintel
    d.rectangle([cx - w // 2 - 3, top - 6, cx + w // 2 + 3, top], fill=GOLD)


def compose_temple_zeus():
    scale = 0.46
    col = load_col(scale)
    cw, ch = col.width, col.height
    n = 6
    step = cw + 18
    span = n * step - 18
    half_w = span // 2
    pad = 30
    base_h = 34
    ent_h = 22
    ped_h = int(span * 0.26)
    W = span + pad * 2 + 80
    H = ped_h + ent_h + ch + base_h + 20
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W // 2
    ground_y = H - 4
    d.ellipse([cx - half_w - 50, ground_y - 14, cx + half_w + 50, ground_y + 5], fill=SHADOW)
    base_top = ground_y - base_h
    col_top = base_top - ch
    ent_top = col_top - ent_h
    steps(d, cx, base_top, half_w, base_h, tiers=4)
    colonnade(img, col, cx, col_top, n, step)
    d.rectangle([cx - half_w - 16, ent_top, cx + half_w + 16, col_top], fill=MARBLE_L)
    d.rectangle([cx - half_w - 16, col_top - 5, cx + half_w + 16, col_top], fill=MARBLE_D)
    frieze(d, cx - half_w - 8, cx + half_w + 8, ent_top + 7)
    pediment(d, cx, ent_top, half_w + 16, ped_h, emblem="bolt")
    doorway(d, cx, col_top + 8, base_top, step)
    img.save(os.path.join(PROPS, "temple_zeus.png"))
    print("temple_zeus", W, H)
    return img


def compose_pantheon():
    scale = 0.5
    col = load_col(scale)
    cw, ch = col.width, col.height
    n = 8
    step = cw + 16
    span = n * step - 16
    half_w = span // 2
    pad = 36
    base_h = 44
    ent_h = 26
    ped_h = int(span * 0.16)
    dome_ry = int(span * 0.34)
    dome_rx = int(span * 0.40)
    W = span + pad * 2 + 110
    H = dome_ry + ped_h + ent_h + ch + base_h + 30
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx = W // 2
    ground_y = H - 4
    d.ellipse([cx - half_w - 70, ground_y - 18, cx + half_w + 70, ground_y + 6], fill=SHADOW)
    base_top = ground_y - base_h
    col_top = base_top - ch
    ent_top = col_top - ent_h
    roof_y = ent_top  # top of entablature; dome rises behind from here

    # --- grand dome rising behind the portico ---
    drum_h = 16
    drum_top = roof_y - 6
    # drum (cylinder base of dome)
    d.rectangle([cx - dome_rx, drum_top - drum_h, cx + dome_rx, drum_top], fill=MARBLE_D)
    d.rectangle([cx - dome_rx, drum_top - drum_h, cx + dome_rx, drum_top - drum_h + 4], fill=MARBLE)
    # dome (half ellipse)
    dome_cy = drum_top - drum_h
    d.pieslice([cx - dome_rx, dome_cy - dome_ry, cx + dome_rx, dome_cy + dome_ry],
               180, 360, fill=MARBLE)
    # shading on right half
    d.pieslice([cx - dome_rx, dome_cy - dome_ry, cx + dome_rx, dome_cy + dome_ry],
               300, 360, fill=MARBLE_D)
    # ribs
    for f in (-0.7, -0.35, 0.0, 0.35, 0.7):
        rx = int(cx + f * dome_rx)
        d.line([(cx, dome_cy - dome_ry), (rx, dome_cy)], fill=MARBLE_DD)
    d.arc([cx - dome_rx, dome_cy - dome_ry, cx + dome_rx, dome_cy + dome_ry], 180, 360, fill=GOLD)
    # gold finial
    d.ellipse([cx - 6, dome_cy - dome_ry - 12, cx + 6, dome_cy - dome_ry], fill=GOLD_L, outline=GOLD)
    d.rectangle([cx - 2, dome_cy - dome_ry - 20, cx + 2, dome_cy - dome_ry - 10], fill=GOLD)

    # --- base / colonnade / entablature ---
    steps(d, cx, base_top, half_w, base_h, tiers=5)
    colonnade(img, col, cx, col_top, n, step)
    d.rectangle([cx - half_w - 18, ent_top, cx + half_w + 18, col_top], fill=MARBLE_L)
    d.rectangle([cx - half_w - 18, col_top - 6, cx + half_w + 18, col_top], fill=MARBLE_D)
    frieze(d, cx - half_w - 10, cx + half_w + 10, ent_top + 8)

    # low pediment in front of the dome
    pediment(d, cx, ent_top, half_w + 18, ped_h, emblem="sun")

    # grand double doorway
    doorway(d, cx, col_top + 10, base_top, step + 8)

    img.save(os.path.join(PROPS, "pantheon.png"))
    print("pantheon", W, H)
    return img


def preview(imgs, out):
    pad = 20
    W = sum(i.width for i in imgs) + pad * (len(imgs) + 1)
    H = max(i.height for i in imgs) + pad * 2
    bg = Image.new("RGBA", (W, H), (90, 140, 80, 255))
    x = pad
    for im in imgs:
        bg.alpha_composite(im, (x, H - pad - im.height))
        x += im.width + pad
    bg = bg.resize((bg.width * 2, bg.height * 2), Image.NEAREST)
    bg.convert("RGB").save(out)


if __name__ == "__main__":
    t = compose_temple_zeus()
    p = compose_pantheon()
    preview([p, t], os.path.join(PREVIEW, "buildings.png"))
    print("wrote", os.path.join(PREVIEW, "buildings.png"))
