#!/usr/bin/env python3
"""Did each bed pose actually hold the bed still?

Every pose in assets/ai/lair/bed/ is generated against p0 with an instruction not to
move or redraw the furniture. The model obeys that unevenly, and the failure is not
visible at a glance in a 1536x1024 green plate - it shows up later as the bed twitching
between frames. So measure it: after keying and translation-aligning on the bed's own
base band, how much of the FURNITURE still differs from p0?

  ./.venv/bin/python tools/check_bed_poses.py [--verbose]

A pose over the fail threshold should be deleted and regenerated, not patched.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from process_char import key_green, subject, hard_alpha

SRC = "assets/ai/lair/bed/"
# the bottom of the sprite is base, footboard and the lower posts: pure furniture, and
# the part that must not move. The occupants never reach into it.
FURNITURE_BAND = 0.62
GOOD, POOR = 1.5, 4.0      # % of furniture pixels differing from p0


def keyed(path):
    return hard_alpha(subject(key_green(Image.open(path), tol=40)), 128)


def align(base, other, band, limit=10):
    """Integer translation that best lines `other` up with `base` over the band."""
    a = (np.asarray(base.getchannel("A")) > 128)[band:]
    b0 = np.asarray(other.getchannel("A")) > 128
    best, shift = None, (0, 0)
    for dy in range(-limit, limit + 1):
        for dx in range(-limit, limit + 1):
            b = np.roll(np.roll(b0, dy, axis=0), dx, axis=1)[band:]
            score = (a & b).sum() - (a ^ b).sum()
            if best is None or score > best:
                best, shift = score, (dx, dy)
    return shift


def main(verbose=False):
    names = sorted(n for n in os.listdir(SRC) if n.endswith(".png"))
    if not names:
        print("no poses in " + SRC)
        return 1
    frames = {n: keyed(SRC + n) for n in names}
    base = frames["p0.png"]
    w, h = base.size
    print(f"p0.png  reference  {w}x{h}  (bed {w}x{h} after keying)")

    worst = 0.0
    for n in names:
        if n == "p0.png":
            continue
        f = frames[n]
        # scale to the reference first: a resize is drift too, and it is the one thing
        # translation cannot take out
        scale = (f.width / base.width, f.height / base.height)
        f = f.resize(base.size, Image.LANCZOS)
        band = int(h * FURNITURE_BAND)
        dx, dy = align(base, f, band)
        a = np.asarray(base.getchannel("A")) > 128
        b = np.roll(np.roll(np.asarray(f.getchannel("A")) > 128, dy, axis=0), dx, axis=1)
        fur = (a[band:] ^ b[band:]).sum() / max(1, a[band:].sum()) * 100
        verdict = "ok" if fur < GOOD else ("marginal" if fur < POOR else "REGENERATE")
        worst = max(worst, fur)
        print(f"{n}  scale {scale[0]:.3f}x{scale[1]:.3f}  shift ({dx:+d},{dy:+d})  "
              f"furniture differs {fur:5.2f}%  {verdict}")
        if verbose and fur >= GOOD:
            ys, xs = np.where(a[band:] ^ b[band:])
            print(f"      worst rows {ys.min() + band}-{ys.max() + band}, "
                  f"cols {xs.min()}-{xs.max()}")
    print(f"\nworst furniture drift {worst:.2f}%  "
          f"(under {GOOD}% is safe to composite with no seam)")
    return 0


if __name__ == "__main__":
    sys.exit(main("--verbose" in sys.argv))
