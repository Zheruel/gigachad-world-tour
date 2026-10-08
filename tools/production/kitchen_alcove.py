"""Replace the gas cylinder and hose painted in the kitchen set's under-counter alcove (Ghee Pappu's stall
no longer has a gas bottle) with steel dabbas, in damage states 0-2.

Sources: assets/sources/production/stages/dirty_delhi/cinematics/kitchen_alcove_{0,1,2}.png, GPT Image edits
of each runtime cell (768x512 atlas cell over a dark ground) with only the alcove repainted. Each is box-downscaled
to the cell and pasted over the alcove box alone, feathered, and only where the plate is already opaque, so the
set's silhouette, grade and everything else stay untouched. Idempotent: run after build_india_setpieces.py.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/cinematics'
PLATE = ROOT / 'assets/stages/india/cinematics/kitchen_set.png'
CELL = (768, 512)
BOX = {0: (240, 396, 420, 496), 1: (240, 380, 420, 484), 2: (200, 384, 410, 496)}  # cell px: the alcove


def main():
    atlas = Image.open(PLATE).convert('RGBA'); a = np.array(atlas).astype(float)
    for i, (x0, y0, x1, y1) in BOX.items():
        src = SRC / f'kitchen_alcove_{i}.png'
        if not src.exists():
            continue
        ox, oy = i % 2 * CELL[0], i // 2 * CELL[1]
        edit = np.array(Image.open(src).convert('RGB').resize(CELL, Image.Resampling.BOX)).astype(float)
        m = Image.new('L', CELL); m.paste(255, (x0, y0, x1, y1)); m = np.array(m.filter(ImageFilter.GaussianBlur(3))) / 255
        cell = a[oy:oy + CELL[1], ox:ox + CELL[0]]
        m = m * (cell[:, :, 3] == 255)
        cell[:, :, :3] = cell[:, :, :3] * (1 - m[..., None]) + edit * m[..., None]
    Image.fromarray(a.round().clip(0, 255).astype(np.uint8)).save(PLATE)
    print('patched', PLATE.relative_to(ROOT))


if __name__ == '__main__':
    main()
