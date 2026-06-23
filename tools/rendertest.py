#!/usr/bin/env python3
"""Offline validator for terrain tile indices. Composites a tiny sample map from
the real tilesets so we can confirm grass/cliff/water indices BEFORE wiring the
Phaser autotiler. Run: .venv/bin/python tools/rendertest.py
"""
import os
from PIL import Image

T = 32
TS = "apps/client/public/assets/tilesets"


def load(name):
    img = Image.open(os.path.join(TS, name)).convert("RGBA")
    return img, img.width // T


def tile(sheet, cols, col, row):
    return sheet.crop((col * T, row * T, col * T + T, row * T + T))


def main():
    ground, gc = load("ground.png")
    cliffs, cc = load("cliffs.png")
    water, wc = load("water.png")
    rocky, rc = load("rocky.png")
    stairs, sc = load("greek_stairs.png")

    W, H = 26, 18
    out = Image.new("RGBA", (W * T, H * T), (70, 120, 70, 255))

    grass = tile(ground, gc, 21, 5)
    grass2 = tile(ground, gc, 23, 5)
    darkgrass = tile(ground, gc, 21, 9)
    dirt = tile(ground, gc, 21, 13)

    # base grass fill
    for y in range(H):
        for x in range(W):
            out.alpha_composite(grass2 if (x + y) % 7 == 0 else grass, (x * T, y * T))

    # ---- plateau from rocky.png: grass surface (top rim + interior) with a
    # 3-row-tall front cliff face below. Surface spans rows y0..yb; the front
    # face occupies yb+1..yb+3. Gives a grand 2.5D mountain ledge.
    def rk(c, r):
        return tile(rocky, rc, c, r)

    def colpick(x, x0, x1, left, mid, right):
        return left if x == x0 else (right if x == x1 else mid)

    def st(c, r):
        return tile(stairs, sc, c, r)

    def stairway(gx0, gw, top_y, h):
        # marble staircase: top row, repeated treads, bottom row; any width/height
        for i in range(h):
            sr = 5 if i == 0 else (10 if i == h - 1 else 7)
            yy = top_y + i
            for j in range(gw):
                c = 1 if j == 0 else (6 if j == gw - 1 else 3)
                out.alpha_composite(st(c, sr), ((gx0 + j) * T, yy * T))

    def plateau(x0, y0, x1, yb, gap=None, face_h=3):
        in_gap = lambda x: gap is not None and gap[0] <= x < gap[0] + gap[1]
        for y in range(y0, yb + 1):
            for x in range(x0, x1 + 1):
                if y == y0:
                    out.alpha_composite(rk(colpick(x, x0, x1, 5, 6, 9), 0), (x * T, y * T))
                else:
                    c = colpick(x, x0, x1, 5, 6, 9)
                    out.alpha_composite(rk(c, 1), (x * T, y * T))
        for i in range(face_h):
            srow = 4 if i == 0 else (6 if i == face_h - 1 else 5)
            yy = yb + 1 + i
            for x in range(x0, x1 + 1):
                # render the wall under the gap too; the staircase draws on top so
                # its transparent balustrade edges reveal wall (not grass)
                c = colpick(x, x0, x1, 5, 6, 9)
                out.alpha_composite(rk(c, srow), (x * T, yy * T))
        if gap is not None:
            # one extra step past the cliff base so the staircase lands on ground
            stairway(gap[0], gap[1], yb + 1, face_h + 1)

    plateau(1, 1, 22, 4, gap=(7, 10), face_h=6)

    # ---- pond: deep-water blob set (cols 0-2 rows 3-5) which is a self-contained
    # pond (open water center + shallow shore ring)
    def pondt(c, r):
        return tile(water, wc, c, r)

    def pond(x0, y0, x1, y1):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                c = 0 if x == x0 else (2 if x == x1 else 1)
                r = 3 if y == y0 else (5 if y == y1 else 4)
                out.alpha_composite(pondt(c, r), (x * T, y * T))

    pond(20, 12, 24, 15)

    # dark-grass + dirt swatches bottom-left for reference
    for i in range(3):
        out.alpha_composite(darkgrass, ((1 + i) * T, 16 * T))
        out.alpha_composite(dirt, ((5 + i) * T, 16 * T))

    big = out.resize((W * T * 2, H * T * 2), Image.NEAREST)
    big.convert("RGB").save("tools/preview/rendertest.png")
    print("wrote tools/preview/rendertest.png", big.size)


if __name__ == "__main__":
    main()
