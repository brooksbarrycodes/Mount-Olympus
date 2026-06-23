#!/usr/bin/env python3
"""Asset analysis helpers for the Olympus restyle.

Classifies 32x32 cells of a sheet by dominant hue + alpha coverage, and can
export an enlarged, grid-labeled preview PNG so tiles can be chosen reliably
without a GUI. Run with the project venv: .venv/bin/python tools/tileslice.py
"""
import sys
from PIL import Image, ImageDraw

TILE = 32


def classify(rgba):
    r, g, b, a = rgba
    if a < 40:
        return "."  # empty
    mx = max(r, g, b)
    mn = min(r, g, b)
    # grayscale-ish
    if mx - mn < 26:
        if mx > 200:
            return "M"  # marble / near white
        if mx > 110:
            return "s"  # stone gray
        return "k"  # dark
    if g >= r and g >= b and g > 70 and (g - b) > 12:
        return "G"  # green / grass
    if b >= r and b >= g and b > 90:
        return "W"  # water / blue
    if r > g > b and r > 110:
        return "d"  # dirt / brown / gold
    return "x"  # mixed


def cell_stats(img, cx, cy):
    px = img.load()
    rs = gs = bs = a_cov = n = 0
    for y in range(cy * TILE, cy * TILE + TILE):
        for x in range(cx * TILE, cx * TILE + TILE):
            r, g, b, a = px[x, y]
            n += 1
            if a > 40:
                rs += r
                gs += g
                bs += b
                a_cov += 1
    if a_cov == 0:
        return (0, 0, 0, 0.0)
    return (rs // a_cov, gs // a_cov, bs // a_cov, a_cov / n)


def grid_map(path):
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    cols, rows = W // TILE, H // TILE
    print(f"{path}  {W}x{H}  cols={cols} rows={rows}")
    lines = []
    for ry in range(rows):
        row = []
        for cx in range(cols):
            r, g, b, cov = cell_stats(img, cx, ry)
            row.append("." if cov < 0.05 else classify((r, g, b, 255)))
        lines.append("".join(row))
    print("\n".join(lines))


def preview(path, out, scale=6, maxcols=48, maxrows=48, offx=0, offy=0):
    """Enlarged, grid-labeled preview. Labels show ABSOLUTE tile col,row so a
    cropped region (offx/offy) still maps back to real sheet indices."""
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    tcols, trows = W // TILE, H // TILE
    cols = min(tcols - offx, maxcols)
    rows = min(trows - offy, maxrows)
    crop = img.crop((offx * TILE, offy * TILE, (offx + cols) * TILE, (offy + rows) * TILE))
    big = crop.resize((cols * TILE * scale, rows * TILE * scale), Image.NEAREST)
    bg = Image.new("RGBA", big.size, (40, 40, 48, 255))
    bg.alpha_composite(big)
    d = ImageDraw.Draw(bg)
    for cx in range(cols + 1):
        d.line([(cx * TILE * scale, 0), (cx * TILE * scale, rows * TILE * scale)], fill=(255, 0, 128, 180))
    for ry in range(rows + 1):
        d.line([(0, ry * TILE * scale), (cols * TILE * scale, ry * TILE * scale)], fill=(255, 0, 128, 180))
    for ry in range(rows):
        for cx in range(cols):
            d.text((cx * TILE * scale + 2, ry * TILE * scale + 1), f"{cx + offx},{ry + offy}", fill=(255, 255, 0, 255))
    bg.convert("RGB").save(out)
    print("wrote", out, bg.size, f"region off=({offx},{offy}) {cols}x{rows} of {tcols}x{trows}")


def _components(mask, W, H, gap):
    """Union-find connected components over an alpha mask, dilated by `gap`
    so pieces of one object (with small transparent seams) merge together."""
    parent = list(range(W * H))

    def find(i):
        while parent[i] != i:
            parent[i] = parent[parent[i]]
            i = parent[i]
        return i

    def union(a, b):
        ra, rb = find(a), find(b)
        if ra != rb:
            parent[ra] = rb

    for y in range(H):
        for x in range(W):
            if not mask[y * W + x]:
                continue
            for dy in range(-gap, gap + 1):
                for dx in range(-gap, gap + 1):
                    nx, ny = x + dx, y + dy
                    if 0 <= nx < W and 0 <= ny < H and mask[ny * W + nx]:
                        union(y * W + x, ny * W + nx)
    boxes = {}
    for y in range(H):
        for x in range(W):
            if not mask[y * W + x]:
                continue
            r = find(y * W + x)
            if r not in boxes:
                boxes[r] = [x, y, x, y]
            else:
                b = boxes[r]
                b[0] = min(b[0], x)
                b[1] = min(b[1], y)
                b[2] = max(b[2], x)
                b[3] = max(b[3], y)
    return list(boxes.values())


def extract(path, outdir, gap=3, minw=10, minh=10):
    import os
    os.makedirs(outdir, exist_ok=True)
    img = Image.open(path).convert("RGBA")
    W, H = img.size
    px = img.load()
    # downscale alpha to a coarse grid for speed (4px buckets)
    step = 2
    gw, gh = W // step, H // step
    mask = [0] * (gw * gh)
    for gy in range(gh):
        for gx in range(gw):
            a = 0
            for yy in range(step):
                for xx in range(step):
                    if px[gx * step + xx, gy * step + yy][3] > 30:
                        a = 1
                        break
                if a:
                    break
            mask[gy * gw + gx] = a
    boxes = _components(mask, gw, gh, gap)
    boxes = [b for b in boxes if (b[2] - b[0]) * step >= minw and (b[3] - b[1]) * step >= minh]
    boxes.sort(key=lambda b: (b[1], b[0]))
    meta = []
    for i, b in enumerate(boxes):
        x0, y0, x1, y1 = b[0] * step, b[1] * step, (b[2] + 1) * step, (b[3] + 1) * step
        crop = img.crop((x0, y0, x1, y1))
        name = f"{i:02d}_{x0}-{y0}_{x1-x0}x{y1-y0}.png"
        crop.save(os.path.join(outdir, name))
        meta.append((name, x0, y0, x1 - x0, y1 - y0))
    print(f"{path}: {len(meta)} objects -> {outdir}")
    for m in meta:
        print("  ", m)


def contact(indir, out, cols=8, cell=96):
    import os
    files = sorted(f for f in os.listdir(indir) if f.endswith(".png"))
    rows = (len(files) + cols - 1) // cols
    sheet = Image.new("RGBA", (cols * cell, rows * cell), (40, 40, 48, 255))
    d = ImageDraw.Draw(sheet)
    for i, f in enumerate(files):
        im = Image.open(os.path.join(indir, f)).convert("RGBA")
        s = min((cell - 16) / im.width, (cell - 24) / im.height, 4)
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.NEAREST)
        cx, cy = (i % cols) * cell, (i // cols) * cell
        sheet.alpha_composite(im, (cx + (cell - im.width) // 2, cy + 4))
        d.text((cx + 2, cy + cell - 12), f.split("_")[0], fill=(255, 255, 0, 255))
        d.rectangle([cx, cy, cx + cell - 1, cy + cell - 1], outline=(255, 0, 128, 120))
    sheet.convert("RGB").save(out)
    print("wrote", out, sheet.size, len(files), "objects")


if __name__ == "__main__":
    cmd = sys.argv[1]
    if cmd == "map":
        grid_map(sys.argv[2])
    elif cmd == "preview":
        preview(sys.argv[2], sys.argv[3], *[int(x) for x in sys.argv[4:]])
    elif cmd == "extract":
        extract(sys.argv[2], sys.argv[3], *[int(x) for x in sys.argv[4:]])
    elif cmd == "contact":
        contact(*([sys.argv[2], sys.argv[3]] + [int(x) for x in sys.argv[4:]]))
