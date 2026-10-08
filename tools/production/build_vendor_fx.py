"""Ghee Pappu's kitchen effects (dirty_delhi/vendor_kitchen/kitchen_*.png) as game strips.

Sources: steam, flame, burner and oil are drawn on black (their brightness becomes alpha, colour
is un-premultiplied); puri is on magenta. Every cell of a sheet is cut on one shared box so
the anchor (steam and flame base, burner ring, puri sole, oil ellipse) stays registered, then
scaled to its 2x game size. Output: assets/stages/dirty_delhi/vendor/kitchen_<name>.png.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from keying import key

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/vendor_kitchen'
OUT = ROOT / 'assets/stages/dirty_delhi/vendor'
# name: (cols, rows, keyed on black, 2x cell width, frames used)
SHEETS = {'steam': (4, 2, True, 96, 8), 'flame': (4, 2, True, 48, 8), 'burner': (4, 2, True, 64, 8),
          'puri': (4, 1, False, 44, 4), 'oil': (4, 2, True, 110, 8)}


def from_black(a, gain):
    """Light on black to straight alpha: alpha from the brightest channel, colour divided out."""
    rgb = a[:, :, :3].astype(float); m = rgb.max(2)
    al = np.clip(m * gain / 255, 0, 1); lo = al < .06
    col = np.clip(rgb / np.maximum(al, 1e-3)[:, :, None], 0, 255); al[lo] = 0
    return np.dstack([col, al * 255]).astype(np.uint8)


def clean_steam(a):
    """The steam sheet has red and yellow specks at its edges: pull everything to warm cream."""
    rgb = a[:, :, :3].astype(float); lum = rgb @ [.3, .55, .15]
    cream = np.array([255, 236, 204.]); t = np.clip(lum / 230, .82, 1)[:, :, None]
    a[:, :, :3] = (cream * t).astype(np.uint8); return a


def cut(name):
    cols, rows, black, width, n = SHEETS[name]
    im = Image.open(SRC / f'kitchen_{name}.png').convert('RGB')
    if black:
        a = from_black(np.array(im), {'steam': 1.6, 'flame': 3, 'burner': 1.8, 'oil': 4}[name])
        if name == 'steam':
            a = clean_steam(a)
        if name == 'burner':  # the ring only; the game lays its own glow under it
            a[np.array(im)[:, :, 1] < 64] = 0
        if name == 'oil':  # the ellipse is solid: only its black surround is dropped
            a[:, :, 3] = np.where(a[:, :, 3] > 40, 255, 0)
    else:
        a = np.array(key(im))
    h, w = a.shape[:2]; ch, cw = h // rows, w // cols
    cells = [a[i // cols * ch:(i // cols + 1) * ch, i % cols * cw:(i % cols + 1) * cw].copy() for i in range(n)]
    for c in cells:  # a sliver of the neighbour on the cell border
        c[:3] = c[-3:] = 0; c[:, :3] = c[:, -3:] = 0
    if name in ('burner', 'oil'):  # cells drift within the grid: centre each ring or ellipse on its rim
        for j, c in enumerate(cells):
            m = c[:, :, 3] > 0; rows = np.where(m.sum(1) > m.sum(1).max() * .3)[0]; xs = np.where(m[rows].any(0))[0]
            dy, dx = ch // 2 - (rows.min() + rows.max()) // 2, cw // 2 - (xs.min() + xs.max()) // 2
            cells[j] = np.roll(c, (dy, dx), (0, 1))
    if name == 'puri':  # every stage of the puff grows from the same spot on the tawa: bottom-centre
        for j, c in enumerate(cells):
            ys, xs = np.where(c[:, :, 3] > 0)
            cells[j] = np.roll(c, (ch - 8 - ys.max(), cw // 2 - (xs.min() + xs.max()) // 2), (0, 1))
    boxes = [Image.fromarray(c).getbbox() for c in cells]
    if name == 'oil':  # the ellipse itself, not the bubbles popping above it
        rows = [np.where((c[:, :, 3] > 0).sum(1) > (c[:, :, 3] > 0).sum(1).max() * .3)[0] for c in cells]
        boxes = [(b[0], r.min(), b[2], r.max() + 1) for b, r in zip(boxes, rows)]
    box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
    k = width / (box[2] - box[0]); size = (width, max(1, round((box[3] - box[1]) * k)))
    out = Image.new('RGBA', (size[0] * n, size[1]))
    for i, c in enumerate(cells):
        f = Image.fromarray(c).crop(box).resize(size, Image.Resampling.LANCZOS)
        if not black or name == 'oil':
            q = np.array(f); q[q[:, :, 3] < 110] = 0; q[:, :, 3][q[:, :, 3] > 0] = 255; f = Image.fromarray(q)
        out.alpha_composite(f, (i * size[0], 0))
    out.save(OUT / f'kitchen_{name}.png')
    return list(size)


if __name__ == '__main__':
    print(json.dumps({n: cut(n) for n in SHEETS if (SRC / f'kitchen_{n}.png').exists()}))
