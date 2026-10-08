"""Night-train props and effects from one GPT sheet (night_train/fx/props.png, 4x4 cells):
chai gob 0-3 (recoloured milky tea), [old chai splash/puddle 4-7, unused], floor trunk closed/tumbling/front/burst 8-11,
notes 12-13, wad 14, whistle 15. Written at 2x into equal-width strips.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from keying import key, components
from build_train_conductor import clean

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/fx/props.png'
OUT = ROOT / 'assets/stages/night_train/rebuild'
# name: (cells, width of the widest cell at 2x)
# (cells 4-7, the old static chai puddle, are superseded by build_chai_puddle.py)
STRIPS = {'chai_gob': ([0, 1, 2, 3], 34), 'prop_nr_case': ([8], 84), 'prop_nr_case_b': ([11], 96)}


def cells():
    a = clean(np.array(key(Image.open(SRC)))); h, w = a.shape[:2]; out = {}
    r, g, b = (a[:, :, k].astype(int) for k in range(3)); pink = (a[:, :, 3] > 0) & (r > g + 12) & (b > g + 12)  # rose-tinted steam
    lum = (r * .3 + g * .59 + b * .11).clip(0, 255).astype(np.uint8)
    for k in range(3):
        a[:, :, k][pink] = lum[pink]
    groups = {i: [] for i in range(16)}
    for part in components(a[:, :, 3] > 24):
        if len(part) >= 20:
            cy, cx = part.mean(0); groups[min(3, int(cy // (h / 4))) * 4 + min(3, int(cx // (w / 4)))].append(part)
    for i, parts in groups.items():
        c = np.zeros_like(a)
        for p in parts:
            c[p[:, 0], p[:, 1]] = a[p[:, 0], p[:, 1]]
        im = Image.fromarray(c); out[i] = im.crop(im.getbbox())
    return out


def hsv(a):
    rgb = a[:, :, :3].astype(float) / 255; mx, mn = rgb.max(2), rgb.min(2); d = mx - mn + 1e-6
    r, g, b = rgb[:, :, 0], rgb[:, :, 1], rgb[:, :, 2]
    h = np.where(mx == r, (g - b) / d % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    return h, np.where(mx > 0, d / (mx + 1e-6), 0), mx


def tea(a, smin=.55):
    """Fire-orange liquid becomes milky chai: same shading, less saturation, a browner hue."""
    h, s, v = hsv(a); m = (a[:, :, 3] > 0) & (h > 8) & (h < 55) & (s > smin)
    t = np.array([.86, .66, .45])  # milky tea at full value
    k = (v * .92)[..., None] * t; mix = np.clip((s - smin) / .3, 0, 1)[..., None] * .8
    out = a[:, :, :3] * (1 - mix) + k * 255 * mix
    a[:, :, :3][m] = out[m].astype(np.uint8)
    return a


def steel(a):
    """Green trunk paint becomes the grey steel of the trunk he throws."""
    h, s, v = hsv(a); m = (a[:, :, 3] > 0) & (h > 60) & (h < 170) & (s > .12)
    lum = (a[:, :, 0] * .3 + a[:, :, 1] * .59 + a[:, :, 2] * .11)
    for k, c in enumerate((.95, 1.0, 1.08)):
        a[:, :, k][m] = np.clip(lum[m] * c * 1.1, 0, 255).astype(np.uint8)
    return a


def main():
    src = cells()
    for name, (ids, width) in STRIPS.items():
        k = width / max(src[i].width for i in ids)
        ims = [src[i].resize((round(src[i].width * k), round(src[i].height * k)), Image.Resampling.LANCZOS) for i in ids]
        cw, ch = max(im.width for im in ims), max(im.height for im in ims)
        strip = Image.new('RGBA', (cw * len(ims), ch))
        for n, im in enumerate(ims):  # bottom-centred: puddles sit on the floor, gobs share a centre
            strip.alpha_composite(im, (n * cw + (cw - im.width) // 2, ch - im.height))
        q = np.array(strip); q[q[:, :, 3] < 40] = 0; q[:, :, 3][q[:, :, 3] > 0] = 255
        if name.startswith('chai'):
            r, g, b = (q[:, :, k].astype(int) for k in range(3))
            h, sat, _ = hsv(q)
            salmon = (q[:, :, 3] > 0) & ((r - g > 24) & (np.abs(g - b) < 30) & (g > 110) | ((h < 16) | (h > 300)) & (sat > .12))  # rose steam over hot liquid
            lum = (r * .3 + g * .59 + b * .11).clip(0, 255).astype(np.uint8)
            for k in range(3):
                q[:, :, k][salmon] = lum[salmon]
            q = tea(q)
        if name.startswith('prop_nr_case'):
            q = steel(q)
        Image.fromarray(q).save(OUT / f'{name}.png')


if __name__ == '__main__':
    main()
