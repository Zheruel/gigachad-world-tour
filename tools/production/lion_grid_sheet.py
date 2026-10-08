#!/usr/bin/env python3
"""Gait sheets for the lair lion in and out of 2x2 grids, for GPT Image edits that restyle
four frames at a time (a whole 8-frame gait is too wide for one edit to keep the legs).

  grid  <cells_dir> <letter> <out_prefix>   w0..w3 -> <out_prefix>0.png, w4..w7 -> <out_prefix>1.png
  sheet <grid0.png> <grid1.png> <out.png>   the two edited grids back into one 4x2 sheet in
                                            frame order, bottom-aligned per row, which is what
                                            build_lair_lion.py slices (lion_walk.png, lion_run.png)
"""
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_lair_lion import slice_grid  # noqa: E402

GAP = 60


def grid(cells, out):
    cells = [c.crop(c.getbbox()) for c in cells]
    w, h = max(c.width for c in cells), max(c.height for c in cells)
    im = Image.new("RGBA", (2 * w + 3 * GAP, 2 * h + 3 * GAP), (0, 0, 0, 0))
    for k, c in enumerate(cells):
        im.alpha_composite(c, (GAP + (k % 2) * (w + GAP) + (w - c.width) // 2,
                               GAP + (k // 2) * (h + GAP) + h - c.height))
    im.save(out)


def sheet(grids, out):
    frames = [f for g in grids for f in slice_grid(g, n=4, rows=2)]
    frames = [f.crop(f.getbbox()) for f in frames]
    w, h = max(f.width for f in frames), max(f.height for f in frames)
    im = Image.new("RGBA", (4 * w + 5 * GAP, 2 * h + 3 * GAP), (0, 0, 0, 0))
    for k, f in enumerate(frames):
        im.alpha_composite(f, (GAP + (k % 4) * (w + GAP) + (w - f.width) // 2,
                               GAP + (k // 4) * (h + GAP) + h - f.height))
    im.save(out)


if __name__ == "__main__":
    cmd, *a = sys.argv[1:]
    if cmd == "grid":
        d, letter, prefix = a
        for half in (0, 1):
            grid([Image.open(f"{d}/{letter}{i}.png").convert("RGBA") for i in range(half * 4, half * 4 + 4)],
                 f"{prefix}{half}.png")
    elif cmd == "sheet":
        sheet(a[:2], a[2])
