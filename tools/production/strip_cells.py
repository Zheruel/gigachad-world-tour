"""Slice a GPT sprite strip (true alpha) into its N figures, left to right. Figures are the N largest connected
regions (found on a 4x-reduced, slightly dilated mask, so touching limbs of neighbours stay apart only when they
do not touch); loose bits (smoke wisps, a flying shoe, notes) join the nearest figure.

  from strip_cells import cells;  cells(Image, n) -> [RGBA crop, ...] (tight bbox each)
  .venv/bin/python tools/production/strip_cells.py STRIP.png N   (prints each cell's bbox)
"""
import sys
import numpy as np
from PIL import Image
from keying import components

R = 4


def labels(alpha, n):
    m = alpha > 127
    h, w = m.shape; H, W = -(-h // R), -(-w // R)
    small = np.zeros((H, W), bool)
    for dy in range(R):
        for dx in range(R):
            sub = m[dy::R, dx::R]; small[:sub.shape[0], :sub.shape[1]] |= sub
    parts = components(small)
    figs = parts[:n]; lab = np.full((H, W), -1)
    for i, p in enumerate(figs):
        lab[p[:, 0], p[:, 1]] = i
    boxes = [(p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max()) for p in figs]
    for p in parts[n:]:
        cy, cx = p[:, 0].mean(), p[:, 1].mean()
        d = [max(0, y0 - cy, cy - y1) ** 2 + max(0, x0 - cx, cx - x1) ** 2 for y0, x0, y1, x1 in boxes]
        lab[p[:, 0], p[:, 1]] = int(np.argmin(d))
    order = np.argsort([b[1] + b[3] for b in boxes])
    remap = np.full(n + 1, -1); remap[order] = np.arange(len(order))
    full = np.repeat(np.repeat(lab, R, 0), R, 1)[:h, :w]
    full = np.where(full >= 0, remap[np.maximum(full, 0)], -1)
    full[~m] = -1
    return full


def cells(im, n):
    a = np.array(im.convert('RGBA')); lab = labels(a[..., 3], n); out = []
    for i in range(n):
        c = a.copy(); c[lab != i] = 0
        c = Image.fromarray(c); out.append(c.crop(c.getbbox()))
    return out


if __name__ == '__main__':
    for c in cells(Image.open(sys.argv[1]), int(sys.argv[2])):
        print(c.size)
