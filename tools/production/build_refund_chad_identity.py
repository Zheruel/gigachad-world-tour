#!/usr/bin/env python3
"""Refund Tower "Callback" intro CHAD cells (callback-chad.png, 4x3 of 560x300) redrawn on the gameplay identity
(chad_sidle / swlk / victory).

Sources: assets/sources/production/stages/refund_tower/overhaul/callback/identity/NN.png, one true-alpha GPT edit per
cell of the previous atlas, with the gold frames as identity references. Each cell keeps the previous cell's hip line
(jeans_x) and sole, so the intro's paths, cords and the tossed headset still line up. Solo cells are scaled to a
gold crown (CROWN); paired cells to the previous cell's height. Then binary alpha, edges() and chad_palette.lock(); the paired grab cells keep the caller's own colours. The previous atlas is
read from git, so a rebuild is repeatable. Check with:
  .venv/bin/python tools/verification/chad_identity_check.py assets/stages/refund_tower/overhaul/callback-chad.png --cell 560x300 --scale 1

  .venv/bin/python tools/production/build_refund_chad_identity.py
"""
import io
import subprocess
import numpy as np
from PIL import Image, ImageFilter
import build_india_arrival
from build_india_arrival import _chad_figure, CI, ROOT
from build_refund_callback import jeans_x
from sprite_edges import edges
from chad_palette import lock

SRC = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/callback/identity'
OUT = ROOT / 'assets/stages/refund_tower/overhaul/callback-chad.png'
BASE = '2b97026'
CW, CH = 560, 300
# Gold crowns (2x px, hair top to sole): standing 176-178, mid-stride 169-173; the lunge (7) and the reach (8) lean.
CROWN = {0: 171, 1: 177, 2: 172, 3: 177, 7: 138, 8: 165, 9: 177, 10: 177, 11: 177}
# Paired cells: scaled to the previous cell's height, unsqueezed, so the caller keeps his size; his columns (cell px) keep
# their generated colours.
CALLER = {4: (300, CW), 5: (300, CW), 6: (0, 250)}


def place(f, k, squeeze, anchor):
    im = f.resize((round(f.width * k * squeeze), round(f.height * k)), Image.Resampling.LANCZOS)
    im.putalpha(im.getchannel('A').point(lambda v: 255 if v >= 128 else 0))
    c = Image.new('RGBA', (CW, CH)); c.paste(im, (round(anchor[0] - jeans_x(im)), anchor[1] - im.height), im)
    return c


def build():
    rel = OUT.relative_to(ROOT)
    old = Image.open(io.BytesIO(subprocess.run(['git', 'show', f'{BASE}:{rel}'], cwd=ROOT, check=True, capture_output=True).stdout)).convert('RGBA')
    sheet = old.copy()
    cells = {i: old.crop((i % 4 * CW, i // 4 * CH, i % 4 * CW + CW, i // 4 * CH + CH)) for i in range(12)}
    figs = {i: _chad_figure(SRC / f'{i:02d}.png') for i in range(12) if (SRC / f'{i:02d}.png').exists()}
    sq = 1.  # the gold frames are not squeezed; GPT's side views here are not wider than them
    anchors = {i: (jeans_x(c.crop(c.getbbox())) + c.getbbox()[0], c.getbbox()[3]) for i, c in cells.items()}
    for i, f in figs.items():
        if i in CALLER:
            b = cells[i].getbbox(); k = (b[3] - b[1]) / f.height; s = 1
        else:
            k = CROWN[i] / f.height; s = sq
            for _ in range(3):
                k *= CROWN[i] / CI.measure(np.array(place(f, k, s, anchors[i])))['crown']
        c = edges(place(f, k, s, anchors[i]))
        out = lock(c)
        if i in CALLER:
            a = np.asarray(c).astype(int); m = np.zeros((CH, CW), np.uint8); x0, x1 = CALLER[i]; m[:, x0:x1] = 255
            m[(a[..., 2] > a[..., 0] + 35) & (a[..., 2] > a[..., 1] + 10)] = 0  # CHAD's denim
            m = np.asarray(Image.fromarray(m).filter(ImageFilter.GaussianBlur(1.5)))[..., None] / 255.
            o = np.asarray(out).astype(float); o[..., :3] = o[..., :3] * (1 - m) + a[..., :3] * m
            out = Image.fromarray(o.round().astype('uint8'))
        box = (i % 4 * CW, i // 4 * CH, i % 4 * CW + CW, i // 4 * CH + CH)
        sheet.paste(Image.new('RGBA', (CW, CH)), box); sheet.paste(out, box)
        print(f'callback-chad[{i}] k {k:.3f}')
    sheet.save(OUT, optimize=True)


if __name__ == '__main__':
    build()
