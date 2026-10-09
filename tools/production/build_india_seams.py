#!/usr/bin/env python3
"""Seamless joins between the 810-px India panels (Delhi, Refund Tower).

  prep:  for every join, the last 480 px (2x) of the left plate next to the first 480 px of the right plate, read from
         git BASE (the plates as generated) -> assets/sources/production/stages/<family>/seams/<stage>_<i>_in.png
  GPT:   one opaque 16:9 edit per join that repaints the centre so floor, walls, ceiling and light run continuously
         (refs: the join, then both full plates) -> <stage>_<i>[_vN].png (latest wins)
  apply: each repaint is aligned and graded to the plates, then switched in hard along a minimum-difference path on
         each side of the join (image quilting: the cut runs where repaint and plate already agree, so nothing is
         double-exposed); the plates' outer parts stay untouched.

  .venv/bin/python tools/production/build_india_seams.py prep|apply
"""
import io
import subprocess
import sys
import numpy as np
from pathlib import Path
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
BASE = '2b97026'
STAGES = {
    'delhi': ('dirty_delhi', ['market', 'bazaar', 'food', 'vendor', 'culvert', 'ghat', 'wharf', 'pontoon']),
    'refund': ('refund_tower', ['office', 'annex', 'calling', 'calling_east', 'servers', 'records', 'executive', 'closer']),
}
HALF, CUT = 480, (16, 170)  # 2x px: crop half-width; band (from the crop edge) the cut may take: outside the old edge-blend ghosts ~270 px into each plate


def plate_path(stage, name):
    if stage == 'refund' and name == 'closer':
        return ROOT / 'assets/stages/refund_tower/scam_king/room.png'
    return ROOT / ('assets/stages/dirty_delhi/rebuild' if stage == 'delhi' else 'assets/stages/refund_tower/overhaul') / f'{name}.png'


def original(path):
    out = subprocess.run(['git', 'show', f'{BASE}:{path.relative_to(ROOT)}'], cwd=ROOT, check=True, capture_output=True).stdout
    return Image.open(io.BytesIO(out)).convert('RGB')


def seams_dir(stage):
    return ROOT / 'assets/sources/production/stages' / STAGES[stage][0] / 'seams'


def joins():
    for stage, (_, names) in STAGES.items():
        for i in range(1, len(names)):
            yield stage, i, names[i - 1], names[i]


def prep():
    for stage, i, a, b in joins():
        d = seams_dir(stage); d.mkdir(parents=True, exist_ok=True)
        L, R = original(plate_path(stage, a)), original(plate_path(stage, b))
        j = Image.new('RGB', (2 * HALF, 540)); j.paste(L.crop((1620 - HALF, 0, 1620, 540)), (0, 0)); j.paste(R.crop((0, 0, HALF, 540)), (HALF, 0))
        j.save(d / f'{stage}_{i}_in.png')
        L.save(d / f'{stage}_{i}_left.png'); R.save(d / f'{stage}_{i}_right.png')


def align(g, ref):
    """GPT redraws the whole frame with a small zoom/shift: fit scale + offset (outer quarters, grey, 1/4 res) and
    resample g onto ref's grid."""
    q = lambda im: np.asarray(im.convert('L').resize((im.width // 4, im.height // 4), Image.Resampling.BOX), float)
    r = q(ref); h, w = r.shape; m = np.zeros_like(r); m[:, :w // 4] = m[:, -w // 4:] = 1; m[:8] = m[-8:] = 0
    best = (1e18, 1, 1, 0, 0)
    for sx in np.arange(.95, 1.051, .0075):
        for sy in np.arange(.95, 1.051, .0075):
            gi = g.resize((round(g.width * sx), round(g.height * sy)), Image.Resampling.BILINEAR)
            a = q(gi)
            for dx in range(-6, 7):
                for dy in range(-6, 7):
                    ox, oy = (a.shape[1] - w) // 2 + dx, (a.shape[0] - h) // 2 + dy
                    if ox < 0 or oy < 0 or ox + w > a.shape[1] or oy + h > a.shape[0]:
                        continue
                    e = (((a[oy:oy + h, ox:ox + w] - r) ** 2) * m).sum()
                    if e < best[0]:
                        best = (e, sx, sy, ox, oy)
    _, sx, sy, ox, oy = best
    gi = g.resize((round(g.width * sx), round(g.height * sy)), Image.Resampling.LANCZOS)
    print(f'  align sx {sx:.3f} sy {sy:.3f} off {ox * 4},{oy * 4}')
    return gi.crop((ox * 4, oy * 4, ox * 4 + ref.width, oy * 4 + ref.height))


def cut(cost):
    """Top-to-bottom path of least summed cost (moves <=1 px per row); returns its column per row."""
    h, w = cost.shape; acc = cost.copy(); back = np.zeros((h, w), int)
    for y in range(1, h):
        prev = np.stack([np.r_[np.inf, acc[y - 1, :-1]], acc[y - 1], np.r_[acc[y - 1, 1:], np.inf]])
        k = prev.argmin(0); back[y] = k - 1; acc[y] += prev[k, np.arange(w)]
    path = np.zeros(h, int); path[-1] = acc[-1].argmin()
    for y in range(h - 1, 0, -1):
        path[y - 1] = path[y] + back[y, path[y]]
    return path


def apply():
    plates = {}
    for stage, (_, names) in STAGES.items():
        for n in names:
            plates[stage, n] = np.asarray(original(plate_path(stage, n))).astype(float)
    for stage, i, a, b in joins():
        vs = sorted(seams_dir(stage).glob(f'{stage}_{i}_v[0-9].png')) or [seams_dir(stage) / f'{stage}_{i}.png']
        src = vs[-1]  # latest accepted repaint
        if not src.exists():
            continue
        L, R = plates[stage, a], plates[stage, b]
        j = np.concatenate([L[:, -HALF:], R[:, :HALF]], 1)
        ref = Image.fromarray(j.astype('uint8'))
        g = align(Image.open(src).convert('RGB').resize((2 * HALF, 540), Image.Resampling.LANCZOS), ref)
        g = np.asarray(g).astype(float)
        # match the repaint's grade to the plates (per-channel mean/std over the outer quarters)
        o = np.r_[0:HALF // 2, 3 * HALF // 2:2 * HALF]
        g = (g - g[:, o].mean((0, 1))) / (g[:, o].std((0, 1)) + 1e-6) * j[:, o].std((0, 1)) + j[:, o].mean((0, 1))
        d = np.abs(g - j).sum(2)
        d = np.asarray(Image.fromarray(d.clip(0, 765) / 3).convert('F').resize((d.shape[1], d.shape[0])), float)
        a0, a1 = CUT; xs = np.arange(2 * HALF)[None, :]
        lp = cut(d[:, a0:a1]) + a0; rp = cut(d[:, 2 * HALF - a1:2 * HALF - a0]) + 2 * HALF - a1
        m = ((xs >= lp[:, None]) & (xs < rp[:, None])).astype(float)
        m = np.asarray(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.BoxBlur(1)), float)[..., None] / 255
        j = j * (1 - m) + g * m
        print(f'  cuts L {lp.min()}-{lp.max()} R {rp.min()}-{rp.max()}  cost {d[np.arange(540), lp].mean():.1f}/{d[np.arange(540), rp].mean():.1f}')
        L[:, -HALF:], R[:, :HALF] = j[:, :HALF], j[:, HALF:]
        print('join', stage, i, a, '|', b)
    for (stage, n), p in plates.items():
        Image.fromarray(p.round().clip(0, 255).astype('uint8')).save(plate_path(stage, n), optimize=True)


if __name__ == '__main__':
    {'prep': prep, 'apply': apply}[sys.argv[1]]()
