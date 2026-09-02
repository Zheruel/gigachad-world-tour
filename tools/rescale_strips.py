#!/usr/bin/env python3
"""Bring a strip that came back at the wrong scale onto its family's scale.

The generator draws each strip on its own; a two-pose strip fills the sheet and comes
out larger than a four-pose one. For a family with one full-length pose per strip the
length of that pose is the invariant, so each strip is scaled by the ratio of its
reference frame's width to the family reference's width.

    rescale_strips.py --dir assets/ai/d2frames/ gai idle1 hurt:hurt2 kick:kick3

scales every gai_hurtN.png by width(gai_idle1) / width(gai_hurt2), and so on.
Run it after slice_sheet.py and before process_char.py; check_cast_scale.py then reports
only the pose differences that are real.
"""
import argparse
from pathlib import Path

import numpy as np
from PIL import Image


def body_width(path):
    im = np.asarray(Image.open(path).convert("RGB")).astype(int)
    r, g, b = im[..., 0], im[..., 1], im[..., 2]
    body = ~((g > 110) & (g > r + 70) & (g > b + 70))
    xs = np.where(body)[1]
    return xs.max() - xs.min() + 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dir", default="assets/ai/d2frames/")
    ap.add_argument("family")
    ap.add_argument("ref", help="the family reference frame, e.g. idle1")
    ap.add_argument("strips", nargs="+", help="strip:frame pairs, e.g. hurt:hurt2")
    a = ap.parse_args()
    d = Path(a.dir)
    ref_w = body_width(d / f"{a.family}_{a.ref}.png")
    for spec in a.strips:
        strip, frame = spec.split(":")
        factor = ref_w / body_width(d / f"{a.family}_{frame}.png")
        files = sorted(d.glob(f"{a.family}_{strip}[0-9]*.png"))
        for f in files:
            im = Image.open(f)
            im.resize((round(im.width * factor), round(im.height * factor)), Image.Resampling.LANCZOS).save(f)
        print(f"{a.family} {strip}: x{factor:.3f} over {len(files)} frames")


if __name__ == "__main__":
    main()
