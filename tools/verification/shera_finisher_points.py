"""Measure the Shera finisher cells (nr_neta_guard rage_finish): mouth (red cluster at the head), front surface at
CHAD's fist heights and the head centre. Logical px from the anchor (facing right: +dx forward, up above the sole).
Used to author MOUTH/FRONT/HEAD in js/train_neta_cinematics.js; rerun after rebuilding the cells."""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
cells = json.loads((ROOT / 'assets/frames/manifest.json').read_text())['nr_neta_guard']['rage_finish']
out = []
for i, f in enumerate(cells):
    a = np.array(Image.open(ROOT / 'assets/frames' / f).convert('RGBA')).astype(int); h, w = a.shape[:2]
    solid = a[..., 3] > 0; ys, xs = np.where(solid); x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    lying = (x1 - x0) > (y1 - y0) * 1.25
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    red = solid & (r > 110) & (g < 70) & (b < 70) & (r > 2 * g)
    head = np.zeros_like(solid)
    if lying: head[:, x0:x0 + (x1 - x0) // 4] = True
    else: head[y0:y0 + (y1 - y0) * 2 // 5] = True
    ry, rx = np.where(red & head)
    mouth = [round((rx.mean() - w / 2) / 2, 1), round((402 - ry.mean()) / 2, 1)] if len(rx) else None
    skin = solid & head & (r > 180) & (g > 70) & (b < 120) & (r - b > 90)
    sy, sx = np.where(skin)
    hc = [round((sx.mean() - w / 2) / 2, 1), round((402 - sy.mean()) / 2, 1)] if len(sx) else None
    front = {}
    for up in (60, 68, 76, 88):
        row = solid[max(0, 402 - 2 * up - 2):402 - 2 * up + 2]
        cols = np.where(row.any(0))[0]
        front[up] = round((cols.max() - w / 2) / 2, 1) if len(cols) else None
    out.append(dict(i=i, w=w, box=[round((x0 - w / 2) / 2), round((x1 - w / 2) / 2), round((402 - y1) / 2), round((402 - y0) / 2)], mouth=mouth, head=hc, front=front))
for o in out: print(json.dumps(o))
