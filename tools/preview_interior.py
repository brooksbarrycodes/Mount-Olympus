#!/usr/bin/env python3
"""Offline schematic of the Pantheon command-hall interior.

Composites the keyed interior PNGs at the same positions/scales the Phaser
`buildPantheon` uses, so the table / seats / head chair / desk / throne / candle
layout can be eyeballed before loading the dev server. Mirrors preview_map.py.

Run: .venv/bin/python tools/preview_interior.py
Output: tools/preview/pantheon_interior.png
"""
import math
import os

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ART = os.path.join(ROOT, "apps/client/public/assets/interior")
OUT_DIR = os.path.join(ROOT, "tools/preview")

# --- room + layout (must match interiors.ts `pantheon` + InteriorScene) ---
W, H = 920, 720
TABLE = dict(x=460, y=462, w=158, h=252)
SEATS_PER_SIDE = 3
HEAD_SEAT = (460, 326)
DESK = (460, 250)
THRONE = (460, 150)
CANDELABRA = [(300, 250), (620, 250), (120, 470), (800, 470), (200, 640), (720, 640)]
BRAZIERS = [(150, 250), (770, 250)]
COLONNADE = [(sx, sy) for sx in (66, W - 66) for sy in (220, 380, 540)]

# scale = PROP_SCALE applied to the source PNG size
SCALES = {
    "council_table_long.png": 0.265,
    "command_desk.png": 0.11,
    "throne.png": 0.1,          # dais throne *1.25, head chair *0.92 handled below
    "council_chair_side.png": 0.055,
    "candelabra.png": 0.066,
}


def load(name, scale):
    img = Image.open(os.path.join(ART, name)).convert("RGBA")
    w = max(1, int(img.width * scale))
    h = max(1, int(img.height * scale))
    return img.resize((w, h), Image.LANCZOS)


def paste_anchor(base, img, x, y, ax=0.5, ay=1.0):
    """Paste img so (x,y) sits at anchor (ax,ay) of the image."""
    px = int(x - img.width * ax)
    py = int(y - img.height * ay)
    base.alpha_composite(img, (px, py))


def compute_seats():
    cx, cy, w, h = TABLE["x"], TABLE["y"], TABLE["w"], TABLE["h"]
    SRC_W, SRC_H = 597, 954
    TOP_SRC, FRONT_SRC = 8, 667
    L_TOP, L_FRONT, R_TOP, R_FRONT = 79, 5, 516, 591
    tuck = 4
    sx, sy_ = w / SRC_W, h / SRC_H
    top = cy - h / 2
    per = SEATS_PER_SIDE
    seats = []
    for i in range(per):
        f = 0.15 + ((i / (per - 1)) * 0.5 if per > 1 else 0.25)
        seat_y = top + f * h
        py = (seat_y - cy) / sy_ + SRC_H / 2
        t = min(1.0, max(0.0, (py - TOP_SRC) / (FRONT_SRC - TOP_SRC)))
        left_edge = cx + (L_TOP + (L_FRONT - L_TOP) * t - SRC_W / 2) * sx
        right_edge = cx + (R_TOP + (R_FRONT - R_TOP) * t - SRC_W / 2) * sx
        seats.append((left_edge - tuck, seat_y, False))
        seats.append((right_edge + tuck, seat_y, True))
    return seats


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    base = Image.new("RGBA", (W, H), (233, 230, 218, 255))  # marble floor
    d = ImageDraw.Draw(base)

    # dome / ceiling band
    d.rectangle([0, 0, W, 96], fill=(27, 39, 66, 255))
    d.ellipse([460 - 260, 18 - 75, 460 + 260, 18 + 75], outline=(214, 170, 70), width=2)
    d.ellipse([460 - 24, 16 - 24, 460 + 24, 16 + 24], fill=(14, 23, 48), outline=(245, 217, 138), width=3)

    # central mosaic medallion footprint
    cx, cy, tw, th = TABLE["x"], TABLE["y"], TABLE["w"], TABLE["h"]
    med = max(tw, th) * 1.5
    d.ellipse([cx - med / 2, cy - med / 2, cx + med / 2, cy + med / 2],
              outline=(214, 170, 70), width=3)

    # dais steps
    for i in range(3):
        w = 320 - i * 36
        yy = 120 + i * 14
        d.rectangle([cx - w / 2, yy - 8, cx + w / 2, yy + 8],
                    fill=(205, 200, 184) if i % 2 else (233, 230, 218))

    # colonnade markers
    for (sx, sy) in COLONNADE:
        d.ellipse([sx - 6, sy - 6, sx + 6, sy + 6], fill=(150, 150, 140))

    # braziers
    for (sx, sy) in BRAZIERS:
        d.ellipse([sx - 9, sy - 9, sx + 9, sy + 9], fill=(255, 178, 74))

    # candelabra
    cand = load("candelabra.png", SCALES["candelabra.png"])
    for (sx, sy) in CANDELABRA:
        paste_anchor(base, cand, sx, sy)

    # dais throne + desk
    throne_dais = load("throne.png", SCALES["throne.png"] * 1.25)
    paste_anchor(base, throne_dais, THRONE[0], THRONE[1])
    desk = load("command_desk.png", SCALES["command_desk.png"])
    paste_anchor(base, desk, DESK[0], DESK[1])

    # side chairs tucked at the table edges (left faces right, right faces left)
    seats = compute_seats()
    chair = load("council_chair_side.png", SCALES["council_chair_side.png"])
    chair_flipped = chair.transpose(Image.FLIP_LEFT_RIGHT)
    for (sx, sy, face_left) in seats:
        paste_anchor(base, chair_flipped if face_left else chair, sx, sy + 8, ax=0.5, ay=0.9)
    # table on top
    table = load("council_table_long.png", SCALES["council_table_long.png"])
    paste_anchor(base, table, cx, cy, ax=0.5, ay=0.5)
    # seat markers (empty for now; gods return one at a time)
    for (sx, sy, _f) in seats:
        d.ellipse([sx - 5, sy - 5, sx + 5, sy + 5], outline=(120, 120, 120), width=2)

    # head chair + player marker
    head = load("throne.png", SCALES["throne.png"] * 0.92)
    paste_anchor(base, head, HEAD_SEAT[0], HEAD_SEAT[1] + 10, ax=0.5, ay=0.9)
    d.ellipse([HEAD_SEAT[0] - 7, HEAD_SEAT[1] - 7, HEAD_SEAT[0] + 7, HEAD_SEAT[1] + 7],
              fill=(245, 200, 76), outline=(20, 20, 20))
    d.text((HEAD_SEAT[0] - 12, HEAD_SEAT[1] + 8), "YOU", fill=(20, 20, 20))

    # room border
    d.rectangle([0, 0, W - 1, H - 1], outline=(28, 26, 22), width=6)

    out = os.path.join(OUT_DIR, "pantheon_interior.png")
    base.convert("RGB").save(out)
    print("wrote", out, base.size)


if __name__ == "__main__":
    main()
