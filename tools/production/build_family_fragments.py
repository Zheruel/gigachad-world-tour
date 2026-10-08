"""Per-family knockout debris: a 4x2 GPT sheet on magenta -> assets/fx/fragments/<runtime>.png (4x2 cells of 128px).

Same layout as assets/fx/arcade_fragments.png (0 leg, 1 torso, 2 arm, 3 shoe, then accessories), so defeat_fx.js
can swap the generic jeans-and-boots pieces for the family's own clothes. One uniform scale keeps pieces in proportion.
Usage: build_family_fragments.py <source name> <runtime key>   e.g. paan nr_paan
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
from keying import key, components
from build_station_life import despill

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/passengers'
OUT = ROOT / 'assets/fx/fragments'
CELL, FILL = 128, 116


def build(name, runtime):
    a = despill(np.array(key(Image.open(SRC / f'{name}_fragments.png'))))
    # Clear lenses and glints pick the background up as a lilac tint: turn anything magenta-cast into cool glass grey.
    rgb = a[:, :, :3].astype(int); tint = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    cast = (tint > 22) & (a[:, :, 3] > 0); lum = rgb.mean(2)
    a[cast, 0] = np.clip(lum[cast] * .92, 0, 255); a[cast, 1] = np.clip(lum[cast] * .98, 0, 255); a[cast, 2] = np.clip(lum[cast] * 1.08, 0, 255)
    h, w = a.shape[:2]; pieces = {}
    cell = lambda cy, cx: min(1, int(cy // (h / 2))) * 4 + min(3, int(cx // (w / 4)))
    parts = [p for p in components(a[:, :, 3] > 24) if len(p) >= 200]
    big = [(p[::7], cell(*p.mean(0))) for p in parts if len(p) >= 1500]
    for part in parts:
        # A small bit (chain link, ember, stray note) goes with the piece whose outline is nearest, even across a cell line.
        c = part.mean(0)
        i = cell(*c) if len(part) >= 1500 or not big else min(big, key=lambda b: np.hypot(*(b[0] - c).T).min())[1]
        pieces.setdefault(i, []).append(part)
    crops = {}
    for i, parts in pieces.items():
        keep = np.zeros((h, w), bool)
        for p in parts:
            keep[p[:, 0], p[:, 1]] = True
        c = a.copy(); c[~keep] = 0; im = Image.fromarray(c); crops[i] = im.crop(im.getbbox())
    k = FILL / max(max(im.size) for im in crops.values())
    sheet = Image.new('RGBA', (CELL * 4, CELL * 2))
    for i, im in crops.items():
        im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
        q = np.array(im); q[q[:, :, 3] < 40] = 0; q[:, :, 3][q[:, :, 3] > 0] = 255
        sheet.alpha_composite(Image.fromarray(q), (i % 4 * CELL + (CELL - im.width) // 2, i // 4 * CELL + (CELL - im.height) // 2))
    OUT.mkdir(parents=True, exist_ok=True); sheet.save(OUT / f'{runtime}.png'); print(runtime, sorted(crops), round(k, 3))


if __name__ == '__main__':
    build(*sys.argv[1:3])
