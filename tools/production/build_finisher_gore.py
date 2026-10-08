"""Shera finisher gore sheet: mouth-blood bursts, blood arcs, teeth and rib/jaw crack stars.

Source: assets/sources/production/stages/night_train/fx/shera_finisher_gore.png (GPT Image, true alpha):
  row 1: six blood bursts, small to large   row 2: three blood arcs   row 3: four teeth, three crack stars.
Output: assets/fx/finisher_gore.png, a 4x4 grid of 128x128 cells at 2x (64 logical), each sprite centred:
  0-5 bursts (spray to +x), 6-8 arcs (rising to +x), 9-12 teeth (molar, molar, incisor, incisor), 13-15 crack stars.
js/finisher_fx.js (gore, bloodSpray, crackFlash, teeth) reads the cells.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from keying import components
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/fx/shera_finisher_gore.png'
OUT = ROOT / 'assets/fx/finisher_gore.png'
CELL = 128
# Row bands in the source (y ranges), expected sprite counts per row, and the 2x scale per group.
ROWS = [((120, 420), 6), ((520, 780), 3), ((860, 1140), 7)]
SCALE = {'burst': .24, 'arc': .24, 'tooth': .11, 'crack': .34}


def groups(a, y0, y1, n):
    """Blobs in a row band, clustered left to right into n sprites by the widest x gaps."""
    m = a[:, :, 3] >= 128; m[:y0] = False; m[y1:] = False
    parts = [p for p in components(m) if len(p) >= 6]
    spans = sorted(((p[:, 1].min(), p[:, 1].max(), p) for p in parts), key=lambda s: s[0])
    # merge overlapping x spans, then cut at the n-1 widest gaps
    merged = []
    for lo, hi, p in spans:
        if merged and lo <= merged[-1][1] + 2:
            merged[-1][1] = max(merged[-1][1], hi); merged[-1][2].append(p)
        else:
            merged.append([lo, hi, [p]])
    gaps = sorted(range(1, len(merged)), key=lambda i: merged[i][0] - merged[i - 1][1], reverse=True)[:n - 1]
    cuts = sorted(gaps); out = []; start = 0
    for c in cuts + [len(merged)]:
        mask = np.zeros(m.shape, bool)
        for _, _, ps in merged[start:c]:
            for p in ps:
                mask[p[:, 0], p[:, 1]] = True
        q = a.copy(); q[~mask] = 0; im = Image.fromarray(q); out.append(im.crop(im.getbbox())); start = c
    return out


def main():
    a = np.array(alpha(Image.open(SRC), 128, speck=6))
    rows = [groups(a, y0, y1, n) for (y0, y1), n in ROWS]
    kinds = ['burst'] * 6 + ['arc'] * 3 + ['tooth'] * 4 + ['crack'] * 3
    sprites = rows[0] + rows[1] + rows[2]
    sheet = Image.new('RGBA', (CELL * 4, CELL * 4))
    for i, (im, kind) in enumerate(zip(sprites, kinds)):
        k = SCALE[kind]; im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
        q = np.array(im); q[:, :, 3] = np.where(q[:, :, 3] >= 110, 255, 0); q[q[:, :, 3] == 0] = 0
        im = edges(Image.fromarray(q))
        assert im.width <= CELL and im.height <= CELL, (i, im.size)
        sheet.alpha_composite(im, ((i % 4) * CELL + (CELL - im.width) // 2, (i // 4) * CELL + (CELL - im.height) // 2))
    sheet.save(OUT)
    print(OUT, [s.size for s in sprites])


if __name__ == '__main__':
    main()
