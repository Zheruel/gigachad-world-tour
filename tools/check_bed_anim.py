#!/usr/bin/env python3
"""Frame-by-frame check on the built bed sprites.

Two things can only be judged by comparing frames, and neither is visible in a still:

  * does the FURNITURE hold still? Anything that changes below the mattress line is the
    bed twitching, which is what the strip versions did.
  * does the animation FLOW? A pose the room steps to should differ from its neighbour
    by a believable amount - a few percent is someone shifting, a third of the frame is
    a cut to a different picture.

  ./.venv/bin/python tools/check_bed_anim.py
"""
import os
import sys

import numpy as np
from PIL import Image

OUT = "assets/lair/"
FURNITURE_BAND = 0.88      # below this is the carved base - the mattress/base edge


def load():
    names = sorted(n for n in os.listdir(OUT)
                   if n.startswith("bed_") and n[4].isdigit())
    return names, [np.asarray(Image.open(OUT + n).convert("RGBA")).astype(int)
                   for n in names]


def main():
    names, fs = load()
    if len(fs) < 2:
        print("need at least two frames")
        return 1
    h, w = fs[0].shape[:2]
    band = int(h * FURNITURE_BAND)
    print(f"{len(fs)} frames, {w}x{h} device ({w // 2}x{h // 2} logical)\n")

    print("furniture below y=%d must not move:" % band)
    worst = 0.0
    for n, f in zip(names[1:], fs[1:]):
        d = np.abs(f - fs[0])[..., :3].sum(2)
        moved = (d[band:] > 40).sum() / d[band:].size * 100
        worst = max(worst, moved)
        print(f"  {n} vs {names[0]}: {moved:5.2f}% of the bed differs"
              f"   {'ok' if moved < 0.5 else 'BED IS MOVING'}")

    # measured against the area the occupants and their bedding actually cover, not the
    # whole upper band - a percentage of mostly-empty sheet says nothing
    moving = np.zeros(fs[0].shape[:2], bool)
    for f in fs[1:]:
        moving |= np.abs(f - fs[0])[..., :3].sum(2) > 40
    area = max(1, moving.sum())
    print(f"\nflow - change as a share of the {area} px the occupants move over:")
    for i in range(len(fs) - 1):
        d = np.abs(fs[i + 1] - fs[i])[..., :3].sum(2)
        share = (d[moving] > 40).sum() / area * 100
        # a posture change - sitting up to lying down - legitimately moves most of a
        # body, so a big number here is only a problem if the two poses are unrelated
        note = ("barely moves" if share < 12 else
                "a shift" if share < 45 else
                "a posture change - fine between neighbours, jarring between strangers")
        print(f"  {names[i]} -> {names[i + 1]}: {share:5.1f}%   {note}")

    # the sprite must not have transparent gaps along its own base, or the bed looks cut
    alpha = fs[0][..., 3] > 128
    base_rows = alpha[int(h * 0.9):]
    print(f"\nbase row coverage {base_rows.any(0).sum() / w * 100:.0f}% of the width")
    print(f"worst furniture movement {worst:.2f}%")
    return 0


if __name__ == "__main__":
    sys.exit(main())
