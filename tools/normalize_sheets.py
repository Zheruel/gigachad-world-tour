#!/usr/bin/env python3
"""Bring sheet-sliced frames onto the same scale as the single-generation frames.

Sheets give excellent consistency WITHIN a sheet - the model lays the poses out as a
set - but nothing makes two different sheets agree on how big the character is, and
process_char.py applies one scale factor to every frame of a character. So each sheet
family is rescaled by a single factor first, measured off a pose that is directly
comparable across families: the standing guard.

Rescaling a family by ONE factor is what preserves the within-sheet consistency that
made sheets worth using.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from process_char import key_green, subject

SRC = "assets/ai/chad/"

# family prefix -> (frame count, index of the most "standing" pose, its height
# relative to a true standing pose)
FAMILIES = {
    "chad_sidle": (4, 1, 1.00),    # pose 1 is standing at rest
    "chad_sjab": (4, 1, 1.00),     # pose 1 is the standing guard
    "chad_shook": (4, 1, 1.00),
    "chad_supper": (4, 1, 1.00),
    # the walk has no standing pose; its tallest frame is the passing pose, which
    # sits a touch under standing height
    "chad_swlk": (6, None, 0.97),
    "chad_srun": (6, None, 0.95),
}
REFERENCE = "chad_gidle1.png"      # the single-generation standing pose


def subj_h(path):
    return subject(key_green(Image.open(path), tol=40)).height


def main():
    target = subj_h(SRC + REFERENCE)
    print(f"reference standing height: {target}px  ({REFERENCE})")
    for prefix, (n, ref_idx, rel) in FAMILIES.items():
        files = [f"{SRC}{prefix}{i}.png" for i in range(1, n + 1)]
        files = [f for f in files if os.path.exists(f)]
        if not files:
            print(f"SKIP {prefix}")
            continue
        if ref_idx:
            measured = subj_h(files[ref_idx - 1])
        else:
            measured = max(subj_h(f) for f in files)
        factor = (target * rel) / measured
        for f in files:
            # RGBA, not RGB: the slicer writes transparency, and flattening it here
            # turns the padding black, which key_green cannot remove - every frame
            # then crops to the full canvas and gets clamped to the same height.
            im = Image.open(f).convert("RGBA")
            w, h = int(round(im.width * factor)), int(round(im.height * factor))
            im.resize((w, h), Image.LANCZOS).save(f)
        print(f"{prefix:<14} {len(files)} frames  measured {measured}px  x{factor:.3f}")


if __name__ == "__main__":
    main()
