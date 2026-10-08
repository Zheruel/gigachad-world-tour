"""Register the boss-finisher effect sheets (assets/sources/production/fx/finisher_*).

Punch burst (additive, black ground): each 3x2 cell is re-centred on its white-hot core
so the burst anchors on the fist. Debris burst (magenta ground): keyed and anchored at
the eruption base, bottom centre of the cell.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from keying import key

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/fx'
OUT = ROOT / 'assets/fx'


def split(im):
    a = np.array(im); h, w = a.shape[:2]
    return [a[r * h // 2:(r + 1) * h // 2, c * w // 3:(c + 1) * w // 3] for r in range(2) for c in range(3)]


def punch(scale=.5, radius=420):
    cells = split(Image.open(SRC / 'finisher_punch.png').convert('RGB')); core = None
    size = round(radius * 2 * scale); sheet = Image.new('RGB', (size * 3, size * 2))
    for i, c in enumerate(cells):
        hot = c.min(2) > 235; c[c.max(2) < 24] = 0
        if hot.sum() > 20:
            ys, xs = np.where(hot); core = (xs.mean(), ys.mean())
        pad = np.zeros((c.shape[0] + radius * 2, c.shape[1] + radius * 2, 3), np.uint8); pad[radius:-radius, radius:-radius] = c
        x, y = round(core[0]) + radius, round(core[1]) + radius
        cell = Image.fromarray(pad[y - radius:y + radius, x - radius:x + radius]).resize((size, size), Image.Resampling.LANCZOS)
        sheet.paste(cell, (i % 3 * size, i // 3 * size))
    sheet.save(OUT / 'finisher_punch.png')


def debris(scale=.5, cell=512, base=490):
    a = np.array(key(Image.open(SRC / 'finisher_debris.png'))); rgb = a[:, :, :3].astype(int)
    tint = (np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1] > 12) & (a[:, :, 3] > 0)  # magenta-tinted dust edges
    a[tint, :3] = (rgb[tint].mean(1, keepdims=True) * np.array([1.0, .96, .88])).astype(np.uint8)
    cells = split(Image.fromarray(a)); size = round(cell * scale)
    sheet = Image.new('RGBA', (size * 3, size * 2))
    for i, c in enumerate(cells):
        ys, xs = np.where(c[:, :, 3] > 40); bottom = ys.max(); bx = np.median(xs[ys > bottom - 40])
        out = Image.new('RGBA', (cell, cell)); out.alpha_composite(Image.fromarray(c), (round(cell / 2 - bx), base - bottom))
        sheet.alpha_composite(out.resize((size, size), Image.Resampling.LANCZOS), (i % 3 * size, i // 3 * size))
    sheet.save(OUT / 'finisher_debris.png')


if __name__ == '__main__':
    punch(); debris()
