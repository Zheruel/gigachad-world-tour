"""Bake night-train NPC atlases at their on-screen 2x size so the game blits them 1:1.

The canvas uses nearest-neighbour sampling, so drawing a 224px cell at 184px drops and
doubles pixel columns. Run after build_train_rebuild / build_train_presentation /
build_train_cast_polish, which still write the larger cells.
Idempotent: an atlas already at its display size is left alone.
"""
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT

OUT = ROOT / 'assets/stages/night_train/rebuild'
# atlas: (source cell w, h) -> display cell w, h in device pixels (2x the logical draw size in js/train.js)
ATLASES = {'passengers': ((224, 256), (186, 212)), 'passenger_seated': ((224, 224), (162, 162)),
           'passenger_reaction': ((224, 224), (162, 162))}


def main():
    for name, ((cw, ch), (dw, dh)) in ATLASES.items():
        path = OUT / f'{name}.png'; im = Image.open(path).convert('RGBA')
        if im.height == dh:
            continue
        n = im.width // cw; out = Image.new('RGBA', (dw * n, dh))
        for i in range(n):
            c = im.crop((i * cw, 0, (i + 1) * cw, ch)).resize((dw, dh), Image.Resampling.LANCZOS)
            a = np.array(c); a[a[:, :, 3] < 40] = 0; out.alpha_composite(Image.fromarray(a), (i * dw, 0))
        out.save(path); print(name, im.size, '->', out.size)


if __name__ == '__main__':
    main()
