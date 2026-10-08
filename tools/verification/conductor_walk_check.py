"""The conductor's walk beats (js/train_conductor.js WALK_BEAT) match the planted shoe's drawn travel.

For each pair of consecutive walk cells the grounded shoe is matched between the two frames; its
backward travel (logical px) is the ground that cell covers. Beat errors above 3 px would skate.
"""
import json, re, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
FRAMES = ROOT / 'assets/frames'
src = (ROOT / 'js/train_conductor.js').read_text()
beats = {k: json.loads(v) for k, v in re.findall(r'(nr_conductor(?:_free)?):(\[[\d.,]+\])', re.search(r'const WALK_BEAT=\{([^}]*)\}', src).group(1))}
manifest = json.loads((FRAMES / 'manifest.json').read_text())


def alpha(f):
    return np.array(Image.open(FRAMES / f))[:, :, 3] > 0


def boots(a, y0=284, y1=294):
    xs = np.where(a[y0:y1].any(0))[0]; out = []; s = p = xs[0]
    for x in xs[1:]:
        if x > p + 3: out.append((s, p)); s = x
        p = x
    out.append((s, p)); return [r for r in out if r[1] - r[0] > 8]


def travel(A, B):
    best = (0, 0)
    for x0, x1 in boots(A):
        T = A[266:294, x0 - 4:x1 + 5]
        for s in range(-80, 20):
            W = B[266:294, x0 - 4 + s:x1 + 5 + s]
            if x0 - 4 + s < 0 or W.shape != T.shape: continue
            iou = (T & W).sum() / max(1, (T | W).sum())
            if iou > best[0] and -s >= -2: best = (iou, -s / 2)
    return best


fail = False
for key, beat in beats.items():
    cells = [alpha(f) for f in manifest[key]['walk']]
    assert len(cells) == len(beat), (key, len(cells), len(beat))
    for i, A in enumerate(cells):
        iou, d = travel(A, cells[(i + 1) % len(cells)])
        err = abs(beat[i] - d); fail |= err > 3 or iou < .7
        print(f'{key} cell {i}: drawn {d:+.1f} beat {beat[i]} err {err:.1f} iou {iou:.2f}')
if fail:
    sys.exit('FAIL: walk beats drift from the drawn stride')
print('PASS: planted shoe holds within 3 px')
