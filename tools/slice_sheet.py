#!/usr/bin/env python3
"""Cut a generated sprite sheet into individual frames.

The sheet is asked for with a clear band of flat green between poses, so the cut
points are the empty columns. Every frame is then placed on a canvas of one shared
size, aligned on a common ground line and on its own body centre, which is what stops
the character bouncing and sliding when the frames are played back.

  slice_sheet.py assets/ai/sheet/jab.png chad_sjab --expect 4
"""
import argparse
from collections import deque
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from process_char import key_green, hard_alpha

OUT = "assets/ai/chad/"


def bridge_detached_limbs(mask, radius=18):
    """Join tiny horizontal gaps before looking for gutters.

    Image generators sometimes leave a few green pixels between a wrist and a
    fist.  The old gutter finder treated that gap as the boundary between poses,
    which literally moved the fist into the following frame.  A horizontal
    dilation is used only for choosing cuts; the original pixels are still used
    for the actual crop.
    """
    bridged = mask.copy()
    for d in range(1, radius + 1):
        bridged[:, d:] |= mask[:, :-d]
        bridged[:, :-d] |= mask[:, d:]
    return bridged


def components(mask, min_pixels=8):
    """Return 8-connected foreground components as pixel coordinate arrays."""
    h, w = mask.shape
    seen = np.zeros_like(mask, dtype=bool)
    out = []
    for sy, sx in zip(*np.nonzero(mask & ~seen)):
        if seen[sy, sx]:
            continue
        q = deque([(int(sy), int(sx))])
        seen[sy, sx] = True
        ys, xs = [], []
        while q:
            y, x = q.popleft()
            ys.append(y); xs.append(x)
            for yy in range(max(0, y - 1), min(h, y + 2)):
                for xx in range(max(0, x - 1), min(w, x + 2)):
                    if mask[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        q.append((yy, xx))
        if len(xs) >= min_pixels:
            out.append({
                'ys': np.asarray(ys, dtype=np.int32),
                'xs': np.asarray(xs, dtype=np.int32),
                'area': len(xs),
                'box': (min(xs), min(ys), max(xs), max(ys)),
            })
    return out


def box_distance(a, b):
    ax0, ay0, ax1, ay1 = a
    bx0, by0, bx1, by1 = b
    dx = max(0, ax0 - bx1, bx0 - ax1)
    dy = max(0, ay0 - by1, by0 - ay1)
    return dx * dx + dy * dy


def component_groups(mask, n):
    """Group pixels by figure, even when neighbouring poses overlap in x.

    Vertical cuts cannot separate a fully extended arm from the next pose when
    their x-ranges overlap.  The figures are still disconnected on the green
    screen, so keep the N largest components as bodies and attach small loose
    pieces (a fist, boot buckle, etc.) to the nearest body.
    """
    comps = components(mask)
    if len(comps) < n:
        return None
    mains = sorted(comps, key=lambda c: c['area'], reverse=True)[:n]
    # ImageGen may choose 5/3/3 or 4/3/4 layouts even when asked for a grid.
    # Reading order is still top-to-bottom, left-to-right; sorting globally by
    # x scrambled idle, hurt and attack poses into one animation.
    rows = 3 if n <= 11 else 4
    row_h = mask.shape[0] / rows
    mains.sort(key=lambda c: (
        int(((c['box'][1] + c['box'][3]) / 2) / row_h),
        (c['box'][0] + c['box'][2]) / 2,
    ))
    groups = [[m] for m in mains]
    main_ids = {id(c) for c in mains}
    for c in comps:
        if id(c) in main_ids:
            continue
        best = min(range(n), key=lambda i: box_distance(c['box'], mains[i]['box']))
        groups[best].append(c)
    return groups


def cut_points(mask, n):
    """Find the n-1 gutters between poses.

    Splitting on runs of empty columns fails as soon as a limb reaches across the
    gap - an extended jab bridges two cells and they merge into one. Since the pose
    count is known, look near each expected boundary instead and cut at the emptiest
    column there, which is the gutter whether or not it is fully empty.
    """
    counts = mask.sum(axis=0).astype(int)
    w = mask.shape[1]
    cuts = []
    for i in range(1, n):
        centre = round(w * i / n)
        # A fully extended arm can travel almost half a cell past the nominal
        # boundary. Search a full half-cell on either side so we find the gap
        # after the fist rather than cutting through the forearm.
        half = max(8, round(w / (n * 2)))
        lo, hi = max(1, centre - half), min(w - 1, centre + half)
        window = counts[lo:hi]
        # Every combat sheet faces right. If a detached right fist creates two
        # equally empty gaps, the later gap is the real between-pose gutter;
        # choosing numpy's first minimum cuts at the wrist.
        minima = np.flatnonzero(window == window.min())
        cuts.append(lo + int(minima[-1]))
    return cuts


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("sheet")
    ap.add_argument("prefix")
    ap.add_argument("--expect", type=int, default=0, help="expected frame count")
    ap.add_argument("--gap", type=int, default=28, help="min empty columns between frames")
    ap.add_argument("--min-width", type=int, default=40)
    ap.add_argument("--out", default=OUT, help="output directory")
    a = ap.parse_args()

    img = hard_alpha(key_green(Image.open(a.sheet), tol=40), 128)
    arr = np.asarray(img)
    # Some generations use pure-white cell gutters despite the requested green
    # screen. They are layout marks, not sprite pixels; leaving them opaque made
    # a whole grid become one of the extracted "poses".
    rgb = arr[:, :, :3].astype(np.int16)
    near_white = (rgb.min(axis=2) > 165) & ((rgb.max(axis=2) - rgb.min(axis=2)) < 22)
    long_row = near_white.sum(axis=1) > arr.shape[1] * 0.08
    long_col = near_white.sum(axis=0) > arr.shape[0] * 0.08
    white_gutter = near_white & (long_row[:, None] | long_col[None, :])
    mask = (arr[:, :, 3] > 16) & ~white_gutter

    n = a.expect
    if not n:
        print("--expect is required (the pose count in the sheet)")
        sys.exit(1)
    groups = component_groups(mask, n)
    if groups is None:
        print(f"could not find {n} disconnected figures - check the sheet by eye")
        sys.exit(1)
    print(f"{os.path.basename(a.sheet)}: {len(groups)}/{n} component-grouped frames")

    # Build each crop from its own components, not a vertical slice. This keeps
    # an extended fist attached even when it overlaps the next pose in x.
    crops, feet, mids = [], [], []
    rgba = np.asarray(img).copy()
    rgba[white_gutter, 3] = 0
    for group in groups:
        gm = np.zeros_like(mask, dtype=bool)
        for c in group:
            gm[c['ys'], c['xs']] = True
        ys_all, xs_all = np.nonzero(gm)
        x0, x1 = xs_all.min(), xs_all.max()
        top, bot = ys_all.min(), ys_all.max()
        crop_arr = rgba[top:bot + 1, x0:x1 + 1].copy()
        local = gm[top:bot + 1, x0:x1 + 1]
        crop_arr[~local, 3] = 0
        crops.append(Image.fromarray(crop_arr, 'RGBA'))
        feet.append(bot - top)
        band = local[:max(1, int((bot - top) * 0.42))]
        band_xs = np.nonzero(band)[1]
        mids.append(band_xs.mean() if len(band_xs) else local.shape[1] / 2)

    cw = max(c.width for c in crops) + 40
    ch = max(f for f in feet) + 20
    os.makedirs(a.out, exist_ok=True)
    for i, (c, foot, mid) in enumerate(zip(crops, feet, mids), 1):
        canvas = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
        # align every frame on one ground line and on its own upper-body centre
        canvas.paste(c, (int(cw / 2 - mid), int(ch - 10 - foot)), c)
        canvas.save(f"{a.out}{a.prefix}{i}.png")
    print(f"  wrote {len(crops)} x {cw}x{ch} -> {a.out}{a.prefix}N.png")


if __name__ == "__main__":
    main()
