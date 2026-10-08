"""Rebuild Delhi play props from the selected source without nearest-neighbour aliasing.

Sizes working tables and carts against CHAD, preserving aspect and ground registration.
The opening cinematic keeps its original assets; these copies are selected during Delhi play.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent))
from build_india_props_life import cut, prop_silhouette, SIZES
from sprite_edges import edges, tone

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/dirty_delhi/props/chapter_street.png'
OUT = ROOT / 'assets/stages/dirty_delhi/props'
PROPS = [('ic_stall', 0, 490), ('ic_cart', 490, 934),
         ('ic_boiler', 934, 1160), ('ic_cargo', 1160, 1536)]
PLAY_SCALE = {'ic_stall': 1.5, 'ic_cart': 1.4, 'ic_boiler': 1, 'ic_cargo': 1.2}


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE)
    for name, left, right in PROPS:
        pair = [prop_silhouette(cut(source, (left, row * 512, right, (row + 1) * 512)))
                for row in range(2)]
        w, h = SIZES[name]
        factor = PLAY_SCALE[name]
        scale = min((w * 2 - 4) / pair[0].width, (h * 2 - 2) / pair[0].height) * factor
        size = (max(round(w * 2 * factor), round(max(c.width for c in pair) * scale) + 4),
                max(round(h * 2 * factor), round(max(c.height for c in pair) * scale) + 2))
        size = tuple(v + v % 2 for v in size)
        for broken, cell in enumerate(pair):
            dims = tuple(max(1, round(v * scale)) for v in cell.size)
            cell = cell.convert('RGBa').resize(dims, Image.Resampling.BOX).convert('RGBA')
            a = np.array(cell)
            a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
            a[a[:, :, 3] == 0, :3] = 0
            # Let the brass/paint read on the dark paving without whitening it.
            if name in ('ic_cart', 'ic_boiler'):
                a = tone(a, gamma=.92, knee=.62, comp=.95, sat=1, white=.5)
            canvas = Image.new('RGBA', size)
            canvas.alpha_composite(Image.fromarray(a), ((size[0] - dims[0]) // 2, size[1] - dims[1]))
            target = OUT / (name + ('_b' if broken else '') + '.png')
            edges(canvas, threshold=128).save(target, optimize=True)
            print(target.relative_to(ROOT), size)


if __name__ == '__main__':
    build()
