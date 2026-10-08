"""CHAD's gameplay frames (assets/frames) registered exactly as the game registers them
(js/aiframes.js normalize): x on the lower-body centroid (torso for walk/run), feet on the
frame's last opaque row. Cutscenes that reuse these frames stay pixel-identical to play."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
TORSO = ('swlk', 'srun')


def frame(name):
    """(image, anchor x, feet y) for chad_<name>.png."""
    im = Image.open(ROOT / f'assets/frames/chad_{name}.png').convert('RGBA')
    al = np.array(im)[:, :, 3] > 16; ys, xs = np.where(al); top, feet = ys.min(), ys.max()
    h = feet - top + 1
    rows = (ys <= top + int(h * .42)) if name.startswith(TORSO) else (ys >= top + int(h * .4))
    return im, float(xs[rows].mean()), int(feet)


def hips(im):
    """Median x of the top band of his jeans: a steadier pivot for close-ups, where a centroid
    that includes the stance of the legs makes the belt buckle drift between poses."""
    a = np.array(im).astype(int); jeans = (a[:, :, 3] > 100) & (a[:, :, 2] > a[:, :, 0] + 25)
    ys, xs = np.where(jeans); return float(np.median(xs[ys < ys.min() + 7]))
