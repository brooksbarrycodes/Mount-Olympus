#!/usr/bin/env python3
"""Turn the AI-generated temple renders (flat magenta background) into clean
transparent building sprites for the game. Keys out the magenta, de-fringes the
pink halo, trims to the content, and saves into public/assets/props.

Run: .venv/bin/python tools/keyout_buildings.py
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GEN = os.path.join(ROOT, ".cursor-gen")  # overwritten below
PROPS = os.path.join(ROOT, "apps/client/public/assets/props")
PREVIEW = os.path.join(ROOT, "tools/preview")
os.makedirs(PREVIEW, exist_ok=True)

SRC = "/Users/brooksbarry/.cursor/projects/Users-brooksbarry-Desktop-Gamified-AI-Agents/assets"

JOBS = [
    ("temple_zeus_front.png", "temple_zeus.png"),
    ("pantheon_front.png", "pantheon.png"),
]


def keyout(src_path):
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    W, H = im.size
    # sample background from the four corners (median-ish)
    corners = [px[1, 1], px[W - 2, 1], px[1, H - 2], px[W - 2, H - 2]]
    br = sum(c[0] for c in corners) // 4
    bg = sum(c[1] for c in corners) // 4
    bb = sum(c[2] for c in corners) // 4

    def is_bg(r, g, b):
        # close to the sampled magenta, OR clearly "pink/magenta" (r&b high, g low)
        d = abs(r - br) + abs(g - bg) + abs(b - bb)
        magentaish = (r > 150 and b > 140 and g < 120 and (r - g) > 55 and (b - g) > 40)
        return d < 110 or magentaish

    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b):
                px[x, y] = (r, g, b, 0)
            elif (r - g) > 35 and (b - g) > 25 and r > 130 and b > 120:
                # de-fringe: pull pink halo toward neutral marble + drop alpha
                ng = (r + b) // 2
                px[x, y] = ((r + ng) // 2, (g + ng) // 2, (b + ng) // 2, 150)

    # trim to content
    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    return im


for src, dst in JOBS:
    im = keyout(os.path.join(SRC, src))
    out = os.path.join(PROPS, dst)
    im.save(out)
    # preview on green so transparency reads
    bg = Image.new("RGBA", im.size, (96, 146, 84, 255))
    bg.alpha_composite(im)
    bg.convert("RGB").save(os.path.join(PREVIEW, dst.replace(".png", "_keyed.png")))
    print(f"{dst}: {im.size}")
