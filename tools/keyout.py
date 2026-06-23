#!/usr/bin/env python3
"""Reusable magenta background remover for AI-generated game assets.

Generate an asset isolated on a flat bright-magenta background, then run this to
key out the background, de-fringe the pink halo, and trim to content.

CLI:
  .venv/bin/python tools/keyout.py SRC.png DST.png            # single file
  .venv/bin/python tools/keyout.py --preview-bg 96,146,84 ...  # green preview too

Also importable: `from keyout import keyout_image`.
"""
import os
import sys
from PIL import Image

GEN_DIR = (
    "/Users/brooksbarry/.cursor/projects/"
    "Users-brooksbarry-Desktop-Gamified-AI-Agents/assets"
)


def keyout_image(src_path: str) -> Image.Image:
    """Return an RGBA image with the magenta background removed + trimmed."""
    im = Image.open(src_path).convert("RGBA")
    px = im.load()
    W, H = im.size
    corners = [px[1, 1], px[W - 2, 1], px[1, H - 2], px[W - 2, H - 2]]
    br = sum(c[0] for c in corners) // 4
    bg = sum(c[1] for c in corners) // 4
    bb = sum(c[2] for c in corners) // 4

    def is_bg(r, g, b):
        d = abs(r - br) + abs(g - bg) + abs(b - bb)
        magentaish = r > 150 and b > 140 and g < 120 and (r - g) > 55 and (b - g) > 40
        return d < 110 or magentaish

    for y in range(H):
        for x in range(W):
            r, g, b, a = px[x, y]
            if is_bg(r, g, b):
                px[x, y] = (r, g, b, 0)
            elif (r - g) > 35 and (b - g) > 25 and r > 130 and b > 120:
                ng = (r + b) // 2
                px[x, y] = ((r + ng) // 2, (g + ng) // 2, (b + ng) // 2, 150)

    bbox = im.getbbox()
    if bbox:
        im = im.crop(bbox)
    return im


def resolve(path: str) -> str:
    """Allow passing just a filename that lives in the AI generation folder."""
    if os.path.isfile(path):
        return path
    cand = os.path.join(GEN_DIR, path)
    return cand if os.path.isfile(cand) else path


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    preview_bg = None
    for a in argv:
        if a.startswith("--preview-bg"):
            preview_bg = tuple(int(v) for v in a.split("=", 1)[1].split(","))
    if len(args) < 2:
        print("usage: keyout.py SRC DST [--preview-bg=r,g,b]")
        return 1
    src, dst = resolve(args[0]), args[1]
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    im = keyout_image(src)
    im.save(dst)
    print(f"{os.path.basename(dst)}: {im.size}")
    if preview_bg:
        bgimg = Image.new("RGBA", im.size, preview_bg + (255,))
        bgimg.alpha_composite(im)
        prev = os.path.join("tools/preview", os.path.basename(dst).replace(".png", "_keyed.png"))
        os.makedirs("tools/preview", exist_ok=True)
        bgimg.convert("RGB").save(prev)
        print("preview:", prev)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
