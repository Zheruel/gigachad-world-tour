#!/usr/bin/env python3
"""Night-train CHAD cutscene cells (station intro chad_entry / chad_cinema, boarding chad_board) redrawn on the
gameplay identity (chad_sidle / swlk / victory).

Sources: assets/sources/production/stages/night_train/chad_identity/<sheet>/<cell>.png, one true-alpha GPT edit per
pose of the previous cell, with the gold frames as identity and muscle reference. Each cell keeps the previous
cell's feet anchor, so the cutscene paths, the ladder clip and the cigar smoke keep working. Upright cells are
scaled to the gold crown (standing or mid-stride); the others by leg length (jeans top to sole) taken from the
previous cell, corrected by that sheet's crown error. Then the India-arrival finish (without its horizontal
squeeze, tuned on side views; these cells are mostly front-on): binary alpha, edges(), chad_palette.lock() (the
cigar ember keeps its own colour). Prints the cigar ember per cell (logical px from the feet, for ST_TEETH in
js/story.js). The previous cells are read from git HEAD, so a rebuild is repeatable. Then check the cells with
tools/verification/chad_identity_check.py SHEET --cell WxH.

  .venv/bin/python tools/production/build_train_chad_identity.py [entry|cinema|board ...]
"""
import io
import subprocess
import sys
import numpy as np
from PIL import Image
import build_india_arrival
from build_india_arrival import _chad_figure, _legs, _chad_cell, boots, CI, ROOT
from sprite_edges import edges
from chad_palette import lock

SRC = ROOT / 'assets/sources/production/stages/night_train/chad_identity'
OUT = ROOT / 'assets/stages/night_train/rebuild'
# Gold crowns (2x px, hair top to sole): standing 176-178, mid-stride 169-173.
CROWN, STRIDE = 176, 171
build_india_arrival.CHAD_SQUEEZE = 1.
SHEETS = {
    # cell size, cells redrawn, crown per upright cell (the rest are scaled by leg length)
    'entry': dict(size=(224, 224), cells=[0, 1, 2, 3, 4, 5, 6], crown={0: STRIDE, 1: STRIDE, 2: CROWN, 5: CROWN, 6: CROWN}),
    'cinema': dict(size=(224, 224), cells=[0, 1, 2, 3, 6, 7], crown={0: STRIDE, 1: STRIDE, 2: STRIDE, 3: STRIDE, 6: CROWN, 7: CROWN}),
    'board': dict(size=(224, 240), cells=[0, 1, 2, 3, 4, 5], crown={0: CROWN, 5: CROWN}),
}
# The sheets as they were before the redraw (their cells give the poses' anchors and scale).
BASE = '9cc5bc1'


def ember(a):
    """Cigar ember on a source-resolution generation: hot red-orange that CHAD's skin never reaches."""
    r, g, b = (a[..., i].astype(int) for i in range(3))
    return (a[..., 3] > 127) & (r > 200) & (g < 110) & (b < 40) & (r - g > 120)


def ember_cell(f, k, size, anchor):
    """The source ember carried through _chad_cell's resize and placement: a cell-sized mask."""
    w, h = round(f.width * k), round(f.height * k)
    im = f.resize((w, h), Image.Resampling.LANCZOS); b = boots(im); fx = (b[0][0] + b[-1][1]) / 2
    m = Image.fromarray(ember(np.array(f)).astype(np.uint8) * 255).resize((w, h), Image.Resampling.BOX)
    c = Image.new('L', size); c.paste(m, (round(anchor[0] - fx), anchor[1] - h))
    return np.array(c) > 60


def build(name):
    spec = SHEETS[name]; cw, ch = spec['size']
    path = (OUT / f'chad_{name}.png').relative_to(ROOT)
    old = Image.open(io.BytesIO(subprocess.run(['git', 'show', f'{BASE}:{path}'], cwd=ROOT, check=True, capture_output=True).stdout)).convert('RGBA')
    sheet = old.copy()
    olds = {i: old.crop((i * cw, 0, i * cw + cw, ch)) for i in spec['cells']}
    figs = {i: _chad_figure(SRC / name / f'{i}.png') for i in spec['cells']}
    # The previous cells' own crown error, from their upright cells.
    fix = float(np.median([spec['crown'][i] / CI.measure(np.array(olds[i]))['crown'] for i in spec['crown']]))
    for i in spec['cells']:
        o = olds[i]; ob = o.crop(o.getbbox()); feet = boots(ob)
        anchor = (o.getbbox()[0] + (feet[0][0] + feet[-1][1]) / 2, o.getbbox()[3])
        if i in spec['crown']:
            k = spec['crown'][i] / figs[i].height
            for _ in range(3):
                k *= spec['crown'][i] / CI.measure(np.array(_chad_cell(figs[i], k, (cw, ch), anchor)))['crown']
        else:
            legs = _legs(ob) / ob.height, _legs(figs[i]) / figs[i].height
            # A dark vest edge read as jeans throws the leg length off; the whole figure is the safer measure then.
            k = (_legs(ob) / _legs(figs[i]) if abs(legs[1] / legs[0] - 1) < .15 else ob.height / figs[i].height) * fix
        c = _chad_cell(figs[i], k, (cw, ch), anchor)
        a = np.array(c); hot = ember_cell(figs[i], k, (cw, ch), anchor) & (a[..., 3] > 0)
        c = np.array(lock(edges(Image.fromarray(a))))
        # The ember is the brightest hot colour of the source, not a palette snap.
        c[hot, :3] = (255, 96, 24); c[hot, 3] = 255
        sheet.paste(Image.fromarray(c), (i * cw, 0))
        tip = np.argwhere(hot)
        tip = None if not len(tip) else [round((tip[:, 1].mean() - cw / 2) / 2, 1), round((tip[:, 0].mean() - ch) / 2, 1)]
        print(f'{name}[{i}] k {k:.3f} ember {tip}')
    sheet.save(OUT / f'chad_{name}.png')


if __name__ == '__main__':
    for n in sys.argv[1:] or SHEETS:
        build(n)
