#!/usr/bin/env python3
"""Lock CHAD art to the gold standard's 48-colour palette (chad_sidle / idle_shades / swlk / victory share it exactly).

lock(im, match=True, selout=True): RGBA in, RGBA out, alpha and silhouette untouched. With match, skin and jeans pixels are first
tone-matched to the gold ramps (lightness histogram matched to gold, then gold's chroma/hue at that lightness), which
restores the pale peach highlights and brown shadows GPT oranges lose; then every opaque pixel snaps to the nearest gold
colour in Lab. With selout, near-black outline pixels (GPT ink) become gold's coloured sel-out: the darkened local
colour (brown-red on skin, navy on jeans, black on the vest), as in the gold frames. Hair is not re-toned (GPT hair is golden; regenerate or edit it), only snapped.
Use on 2x cells after registration and edges(); then check with tools/verification/chad_identity_check.py.

  .venv/bin/python tools/production/chad_palette.py IN.png OUT.png [--no-match] [--no-selout]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'verification'))
import chad_identity_check as C  # noqa: E402


def _ramps():
    """Gold skin / jeans pixel Lab samples (all gold frames)."""
    out = {'skin': [], 'jeans': []}
    for p in C.GOLD:
        a = np.array(Image.open(p).convert('RGBA')); lab = C.lab(a[..., :3])[a[..., 3] > 127]
        cl = C.classes(lab)
        for k in out:
            out[k].append(lab[cl[k]])
    return {k: np.concatenate(v) for k, v in out.items()}


_R = None


def _match(lab, sel, ref):
    """Histogram-match L of lab[sel] to ref's L, then take ref's median a/b at that L."""
    L = lab[sel, 0]; order = np.argsort(np.argsort(L)); q = (order + .5) / len(L)
    newL = np.quantile(ref[:, 0], q)
    bins = np.linspace(ref[:, 0].min(), ref[:, 0].max(), 17); idx = np.clip(np.digitize(ref[:, 0], bins) - 1, 0, 15)
    ab = np.array([np.median(ref[idx == i, 1:], 0) if (idx == i).any() else [np.nan, np.nan] for i in range(16)])
    ctr = (bins[:-1] + bins[1:]) / 2; ok = ~np.isnan(ab[:, 0])
    a = np.interp(newL, ctr[ok], ab[ok, 0]); b = np.interp(newL, ctr[ok], ab[ok, 1])
    lab[sel] = np.stack([newL, a, b], -1)


def _selout(labI, m):
    """Outer-ring pixels darker than L 12 -> interior neighbour colour at .38 L and .75 chroma (gold's sel-out)."""
    r = C.ring(m); inner = m & ~r & ~C.ring(m & ~r); acc = np.zeros(labI.shape); n = np.zeros(m.shape)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            ok = np.roll(np.roll(inner, dy, 0), dx, 1); acc += np.roll(np.roll(labI, dy, 0), dx, 1) * ok[..., None]; n += ok
    fix = r & (labI[..., 0] < 12) & (n > 0)
    labI[fix] = acc[fix] / n[fix, None] * np.array([.38, .75, .75])


def lock(im, match=True, selout=True):
    global _R
    a = np.array(im.convert('RGBA')); m = a[..., 3] > 127
    if not m.any():
        return Image.fromarray(a)
    labI = C.lab(a[..., :3])
    if selout:
        _selout(labI, m)
    lab = labI[m]
    if match:
        _R = _R or _ramps(); cl = C.classes(lab)
        for k in ('skin', 'jeans'):
            if cl[k].sum() >= 25:
                _match(lab, cl[k], _R[k])
    pal_lab = C.gold_palette(); pal_rgb = _gold_rgb()
    d = ((lab[:, None, :] - pal_lab[None]) ** 2).sum(-1)
    a[m, :3] = pal_rgb[d.argmin(1)]
    return Image.fromarray(a)


_RGB = None


def _gold_rgb():
    global _RGB
    if _RGB is None:
        cols = set()
        for p in C.GOLD:
            x = np.array(Image.open(p).convert('RGBA')); cols |= set(map(tuple, x[x[..., 3] > 127][:, :3]))
        _RGB = np.array(sorted(cols), np.uint8)  # same order as C.gold_palette()
    return _RGB


if __name__ == '__main__':
    args = [x for x in sys.argv[1:] if not x.startswith('--')]
    lock(Image.open(args[0]), '--no-match' not in sys.argv, '--no-selout' not in sys.argv).save(args[1])
