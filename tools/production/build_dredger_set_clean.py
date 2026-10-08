#!/usr/bin/env python3
"""The Dredger's rig (ic_dredger_set, 4 damage states in a 2x2 atlas) without its light matte fringe.

The magenta-keyed source leaves a bright 1 px ring round the lattice, bollards, pipes and the barge
baseline (ring luminance ~110 against ~35 inside), and drawing the 768x512 cells at 260x174 smeared it
into a halo for the whole boss fight. This recipe rebuilds the atlas exactly as build_india_setpieces.py
does (same extraction, one shared scale), then per cell:
  1. sprite_edges.alpha() at threshold 128;
  2. defringe: the 2 px band touching transparency takes the colour of the nearest interior pixel
     (depth >= 3), grown outward ring by ring, so no key or matte colour survives into the scale;
  3. premultiplied BOX downscale to 520x348 (2x of the drawn 260x174; BOX, not LANCZOS: no ringing);
  4. sprite_edges.edges() for a clean closed dark outline.
Writes assets/stages/india/cinematics/dredger_set.png (1040x696; js/india_cinematics.js draws cells at
260x174 from the atlas size, so nothing else changes). build_india_setpieces.py calls this for the rig.
Usage: build_dredger_set_clean.py
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_india_setpieces import extract, SOURCE, OUT  # noqa: E402
from sprite_edges import alpha, edges  # noqa: E402

SRC_CELL = (768, 512)      # the setpiece builder's cell (shared scale across damage states)
CELL = (520, 348)          # runtime cell: 2x of the 260x174 draw size
LUM = np.array([.3, .59, .11])


def atlas_cells():
    """The four registered 768x512 cells, as build_india_setpieces.build('dredger_set', ..., neutral=True)."""
    im = Image.open(SOURCE / 'dirty_delhi/cinematics/dredger_set.png'); cells = []
    for row in range(2):
        for col in range(2):
            box = (round(col * im.width / 2), round(row * im.height / 2), round((col + 1) * im.width / 2), round((row + 1) * im.height / 2))
            cells.append(extract(im.crop(box), True))
    boxes = [c.getbbox() for c in cells]
    scale = min(min((SRC_CELL[0] - 8) / (b[2] - b[0]), (SRC_CELL[1] - 8) / (b[3] - b[1])) for b in boxes)
    out = []
    for c, b in zip(cells, boxes):
        c = c.crop(b); c = c.resize((round(c.width * scale), round(c.height * scale)), Image.Resampling.NEAREST)
        cv = Image.new('RGBA', SRC_CELL); cv.alpha_composite(c, ((SRC_CELL[0] - c.width) // 2, SRC_CELL[1] - c.height - 2)); out.append(cv)
    return out


def erode(m):
    return m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)


def defringe(im, band=2):
    """Rebuild the `band` px edge ring from the nearest interior colour (grown outward one ring a pass)."""
    a = np.array(im); s = a[:, :, 3] > 0; inner = s.copy()
    for _ in range(band):
        inner = erode(inner)
    known = inner.copy(); rgb = a[:, :, :3].astype(float); todo = s & ~known
    while todo.any():
        acc = np.zeros(rgb.shape); n = np.zeros(s.shape)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                if dy or dx:
                    k = np.roll(np.roll(known, dy, 0), dx, 1); n += k; acc += np.roll(np.roll(rgb, dy, 0), dx, 1) * k[:, :, None]
        grow = todo & (n > 0)
        if not grow.any():
            break
        rgb[grow] = acc[grow] / n[grow][:, None]; known |= grow; todo &= ~grow
    # Keep the ring's own shading where it was already darker than its interior (real outline pixels).
    orig = a[:, :, :3].astype(float); ring = s & ~inner
    darker = ring & (orig @ LUM <= rgb @ LUM)
    rgb[darker] = orig[darker]
    a[:, :, :3] = rgb.clip(0, 255).round().astype(np.uint8); return Image.fromarray(a)


def box_scale(im, size):
    b = np.array(im.convert('RGBa').resize(size, Image.Resampling.BOX).convert('RGBA'))
    b[:, :, 3] = np.where(b[:, :, 3] >= 128, 255, 0); b[b[:, :, 3] == 0, :3] = 0; return Image.fromarray(b)


def main():
    atlas = Image.new('RGBA', (CELL[0] * 2, CELL[1] * 2)); rings = []
    for i, c in enumerate(atlas_cells()):
        c = defringe(alpha(c, 128))
        c = edges(box_scale(c, CELL))
        a = np.array(c); s = a[:, :, 3] > 0; L = a[:, :, :3] @ LUM
        rings.append((L[s & ~erode(s)].mean(), L[erode(erode(s))].mean()))
        atlas.alpha_composite(c, (i % 2 * CELL[0], i // 2 * CELL[1]))
    atlas.save(OUT / 'dredger_set.png', optimize=True)
    print('dredger_set:', atlas.size, 'edge-ring / interior luminance per cell:', [(round(r), round(n)) for r, n in rings])


if __name__ == '__main__':
    main()
