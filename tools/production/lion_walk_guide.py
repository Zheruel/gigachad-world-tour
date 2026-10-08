#!/usr/bin/env python3
"""The lair lion's walk, drawn one frame at a time.

GPT Image will not keep a walk's leg phases coherent across a sheet, so each frame is a
separate edit of the standing lion (the roar sheet's first pose, scaled onto a 1536x1024
canvas) with a coded pose guide: his faded body, the old legs cut away, and four coloured
legs placed by a lateral-sequence walk (hind, front, other hind, other front; each paw on
the floor for 60% of the cycle and sliding back evenly while it is).

  guide <base.png> <outdir>          write g0..g7.png, the per-frame guides
  sheet <out.png> <f0.png> .. <f7>   true up the planted paws and pack the chosen frames
                                     into the 4x2 source sheet build_lair_lion.py reads

Frames are chosen by how close their planted paws land to the guide's and by the body
matching the base. They still land a few pixels off, and a paw that is on the floor in two
frames must move back by exactly the stride between them or it skates. So TRACKS lists,
per leg, the frames it is planted in and roughly where (read off the chosen frames); one
common stride and a landing spot per leg are fitted to them, and each planted paw is slid
to its fitted spot with a warp that fades out up the leg, so the hip and shoulder stay put.
The builder then levels the floor and measures the (now even) strides.
"""
import math
import sys

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, __import__('os').path.dirname(__file__))
from slice_sheet import components  # noqa: E402

L, DUTY, FLOOR = 300, 0.6, 940
# phase offset, hip/shoulder on the base canvas, guide colour, hind or front
LEGS = {
    "far_hind": (0.5, (600, 700), (150, 150, 235), "h"),
    "far_front": (0.75, (880, 700), (235, 150, 150), "f"),
    "near_hind": (0.0, (560, 705), (20, 20, 170), "h"),
    "near_front": (0.25, (920, 705), (170, 20, 20), "f"),
}


def paw(f, off):
    p = (f / 8 + off) % 1
    if p < DUTY:
        return L / 2 - (p / DUTY) * L, 0.0
    q = (p - DUTY) / (1 - DUTY)
    return -L / 2 + q * L, -90 * math.sin(math.pi * q)


def guide(base_path, outdir):
    base = Image.open(base_path).convert("RGBA")
    faded = base.copy()
    faded.putalpha(faded.getchannel("A").point(lambda v: v * 0.45))
    cut = Image.new("L", base.size, 255)
    ImageDraw.Draw(cut).rectangle((400, 745, 1100, 1024), fill=0)
    faded.putalpha(Image.composite(faded.getchannel("A"), Image.new("L", base.size, 0), cut))
    for f in range(8):
        g = Image.new("RGBA", base.size, (255, 255, 255, 255))
        g.alpha_composite(faded)
        d = ImageDraw.Draw(g)
        bob = 6 * math.cos(2 * math.pi * f / 4)
        d.line((0, FLOOR + 6, base.width, FLOOR + 6), fill=(160, 160, 160), width=3)
        for name in ("far_hind", "far_front", "near_hind", "near_front"):
            off, (tx, ty), col, kind = LEGS[name]
            fx, fy = paw(f, off)
            top, end = (tx, ty + bob), (tx + fx, FLOOR + fy)
            vx, vy = end[0] - top[0], end[1] - top[1]
            if kind == "h":
                j1 = (top[0] + vx * .40 + 45, top[1] + vy * .42)
                j2 = (top[0] + vx * .78 - 35, top[1] + vy * .75)
            else:
                j1 = (top[0] + vx * .42 - 25, top[1] + vy * .45)
                j2 = (top[0] + vx * .88 + (12 if fy < 0 else 0), top[1] + vy * .85)
            d.line([top, j1, j2, end], fill=col, width=34 if "near" in name else 26, joint="curve")
            d.ellipse((end[0] - 38, end[1] - 24, end[0] + 38, end[1] + 6), fill=col)
        d.text((20, 20), "FRAME %d of 8" % (f + 1), fill=(0, 0, 0))
        g.convert("RGB").save(f"{outdir}/g{f}.png")


# leg: hip or shoulder on the base canvas, and {frame: approx paw x} while planted, in order
TRACKS = {
    "NH": ((560, 745), [(0, 693), (1, 663), (2, 572), (3, 549), (4, 460)]),
    "FF": ((880, 745), [(2, 1057), (3, 988), (4, 936), (5, 883), (6, 821)]),
    "FH": ((600, 745), [(4, 754), (5, 715), (6, 672), (7, 530), (0, 498)]),
    "NF": ((920, 745), [(6, 1059), (7, 991), (0, 945), (1, 915), (2, 835)]),
}


def floor_runs(a):
    m = a[..., 3] > 128
    colb = np.where(m.any(0), m.shape[0] - 1 - np.argmax(m[::-1], 0), 0)
    xs = np.nonzero(colb > colb.max() - 40)[0]
    runs, s, p = [], xs[0], xs[0]
    for q in xs[1:]:
        if q - p > 3:
            runs.append((s, p))
            s = q
        p = q
    runs.append((s, p))
    return [(s, p, int(colb[s:p + 1].max())) for s, p in runs if p - s > 8]


def fit_tracks(frames):
    """Snap TRACKS to the measured paw runs, then fit x = land - stride * k per leg."""
    runs = [floor_runs(f) for f in frames]
    obs = {}
    for leg, (top, pts) in TRACKS.items():
        obs[leg] = []
        for k, (f, x) in enumerate(pts):
            r = min(runs[f], key=lambda r: abs((r[0] + r[1]) / 2 - x))
            obs[leg].append((k, f, r))
    # least squares: one stride, one landing x per leg
    rows, rhs, legs = [], [], list(obs)
    for i, leg in enumerate(legs):
        for k, f, r in obs[leg]:
            row = [0.0] * (len(legs) + 1)
            row[i], row[-1] = 1.0, -k
            rows.append(row)
            rhs.append((r[0] + r[1]) / 2)
    sol = np.linalg.lstsq(np.array(rows), np.array(rhs), rcond=None)[0]
    moves = {f: [] for f in range(len(frames))}
    for i, leg in enumerate(legs):
        for k, f, r in obs[leg]:
            dx = sol[i] - sol[-1] * k - (r[0] + r[1]) / 2
            moves[f].append((TRACKS[leg][0], r, dx, leg[0] == "N"))
    return moves, float(sol[-1])


def leg_mask(a, run, y_cut):
    """The lower leg that ends in the paw run: the art is outlined in near-black, so the
    lit fill of one leg is its own region even where it crosses another. Every fill region
    touching the paw's bottom box, grown by a few pixels to take its outline."""
    s, p, bot = run
    x0, x1 = max(0, s - 160), min(a.shape[1], p + 160)
    sub = a[y_cut:bot + 1, x0:x1].astype(int)
    fill = (sub[..., 3] > 128) & (sub[..., :3].mean(2) > 70)
    keep = np.zeros(fill.shape, bool)
    for c in components(fill, min_pixels=4):
        if ((c["ys"] >= fill.shape[0] - 45) & (c["xs"] + x0 >= s) & (c["xs"] + x0 <= p)).any():
            keep[c["ys"], c["xs"]] = True
    # grow into the dark outline only (never into another leg's fill), about two art pixels
    dark = (sub[..., 3] > 0) & ~fill
    grown = keep.copy()
    for _ in range(12):
        g = grown.copy()
        g[1:] |= grown[:-1]; g[:-1] |= grown[1:]; g[:, 1:] |= grown[:, :-1]; g[:, :-1] |= grown[:, 1:]
        grown = keep | (g & dark)
    m = np.zeros(a.shape[:2], bool)
    m[y_cut:bot + 1, x0:x1] = grown
    return m


def nudge(a, moves):
    """Slide each planted paw by dx, the lower leg sheared so the move fades to nothing at
    the knee. Near legs are drawn back over everything, far legs only into empty space."""
    a = a.copy()
    for (tx, ty), run, dx, near in moves:
        bot = run[2]
        y_cut = bot - 150
        m = leg_mask(a, run, y_cut)
        pix = a.copy()
        a[m] = 0
        ys, xs = np.nonzero(m)
        t = np.clip((ys - y_cut) / (bot - 45 - y_cut), 0, 1)
        nx = xs + np.round(dx * t * t * (3 - 2 * t)).astype(int)
        ok = (nx >= 0) & (nx < a.shape[1])
        ys, xs, nx = ys[ok], xs[ok], nx[ok]
        if not near:
            free = a[ys, nx, 3] == 0
            ys, xs, nx = ys[free], xs[free], nx[free]
        a[ys, nx] = pix[ys, xs]
    return a


def sheet(out, frames):
    raws = [np.asarray(Image.open(p).convert("RGBA")) for p in frames]
    moves, stride = fit_tracks(raws)
    print("stride %.1f px (canvas)" % stride)
    for f in sorted(moves):
        print(f, ["%+.0f" % m[2] for m in moves[f]])
    crops = [Image.fromarray(nudge(a, moves[f])) for f, a in enumerate(raws)]
    crops = [c.crop(c.getbbox()) for c in crops]
    cw = max(c.width for c in crops) + 80
    ch = max(c.height for c in crops) + 80
    s = Image.new("RGBA", (cw * 4, ch * 2), (0, 0, 0, 0))
    for i, c in enumerate(crops):
        s.paste(c, ((i % 4) * cw + 40, (i // 4) * ch + ch - 40 - c.height))
    s.save(out)


if __name__ == "__main__":
    if sys.argv[1] == "guide":
        guide(sys.argv[2], sys.argv[3])
    else:
        sheet(sys.argv[2], sys.argv[3:])
