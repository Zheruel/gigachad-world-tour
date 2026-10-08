#!/usr/bin/env python3
"""Heads of CHAD sheet cells next to gold (sidle1, swlk3) at 5x, dark and light rows: hair colour/shape, face and shades.

  .venv/bin/python tools/verification/chad_head_compare.py OUT.png SHEET.png:WxH:i,j [SHEET.png:WxH:i ...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]


def head(a, h=44, w=52):
    """Crop around the topmost opaque run (the crown) of a cell: h rows down, w columns centred on it."""
    m = a[..., 3] > 127; ys, xs = np.nonzero(m); top = ys.min()
    cols = np.nonzero(m[top:top + 4].any(0))[0]; cx = int(cols.mean())
    out = np.zeros((h, w, 4), np.uint8); y0, x0 = top - 2, cx - w // 2
    sub = a[max(0, y0):y0 + h, max(0, x0):x0 + w]
    out[max(0, -y0):max(0, -y0) + sub.shape[0], max(0, -x0):max(0, -x0) + sub.shape[1]] = sub
    return out


def main():
    out = Path(sys.argv[1]); tiles = []
    for g in ('chad_sidle1', 'chad_swlk3', 'chad_victory'):
        tiles.append((g.replace('chad_', 'gold '), head(np.array(Image.open(ROOT / f'assets/frames/{g}.png').convert('RGBA')))))
    for spec in sys.argv[2:]:
        f, cell, idx = spec.split(':'); cw, ch = map(int, cell.split('x')); im = np.array(Image.open(f).convert('RGBA'))
        for i in map(int, idx.split(',')):
            c = im[(i * cw // im.shape[1]) * ch:(i * cw // im.shape[1] + 1) * ch, (i * cw) % im.shape[1]:(i * cw) % im.shape[1] + cw]
            tiles.append((f'{Path(f).stem}[{i}]', head(c)))
    z = 5; tw, th = 52 * z + 8, 44 * z + 16
    sheet = Image.new('RGB', (tw * len(tiles) + 8, th * 2 + 8), (0, 0, 0))
    for r, (bg, ink) in enumerate((((32, 36, 44), (230, 230, 230)), ((236, 232, 220), (20, 20, 20)))):
        ImageDraw.Draw(sheet).rectangle((0, r * (th + 8), sheet.width, r * (th + 8) + th), fill=bg)
        for k, (tag, a) in enumerate(tiles):
            t = Image.fromarray(a).resize((52 * z, 44 * z), Image.Resampling.NEAREST)
            sheet.paste(t, (8 + k * tw, r * (th + 8) + 14), t); ImageDraw.Draw(sheet).text((8 + k * tw, r * (th + 8) + 1), tag, fill=ink)
    sheet.save(out)


if __name__ == '__main__':
    main()
