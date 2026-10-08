#!/usr/bin/env python3
"""The lair lion: every pose and in-between on ONE canvas, plus the rig table js/lion_rig.js.

Sources (GPT Image, true alpha, 4x2 animation sheets read row-major) in
assets/sources/production/lair/:
  lion_lie.png    lie, lie_lift, wake (the rest of that sheet is unused)
  lion_stretch.png  (sphinx), stretch_lift, stretch_in, stretch, stretch_out, stretch_up,
                  (stand, tail flick): the stretch in small steps, lying to nearly standing
  lion_sit.png    sit, (4 unused sitting variants), sit_turn, sit_up
  lion_x_*.png    single in-betweens (EXTRAS below): rise1/1b/2, bow_a/a2/b/c, r_land/2/3, and the
                  symmetric front views turn_front and sit_front that a turn flips on
  lion_roar.png   stand, (5 unused standing variants), turn, stand_sit (the file keeps its old
                  name; he no longer roars)
  lion_walk.png   w0..w7, an in-place walk: each frame a GPT Image edit of the standing
                  pose over a coded leg-phase guide (tools/production/lion_walk_guide.py),
                  so the body is the same drawing in every frame and only the legs move
  lion_run.png    r0..r7, an in-place bound for scattering and catching up
  lion_concept.png  the approved concept (golden lion, full light mane, dark aviators, gold
                  Cuban chain with a lion-head medallion, no cigar): the identity every sheet
                  was restyled to (GPT Image edits, the sheet as target and this as reference;
                  walk and run four frames at a time, tools/production/lion_grid_sheet.py) and
                  the colour statistics every sheet is matched to

Scale. Each sheet came back at its own resolution. The walk sets the size (LION_H, paw to
mane top, against CHAD's 96); the other sheets are scaled by the pose in them that shares a
silhouette with it (the standing frame of the stand and lie sheets, the sit against the
standing height), with the factors in SCALE checked by eye on a lineup at game scale.

Registration. Every pose is drawn centred on the canvas (mass centre; the walk and run on
their upper body, so the torso holds still while the legs cycle) and bottom-anchored on one
ground line. Poses that share a body are then locked together: the lying family on
everything below the neck, a shift baked into the PNGs. Between families - lying to rising, sit to
getting up, getting up to standing, standing to the walk - the part that stays planted is
locked instead and the shift is written to LION_EDGE: hub.js moves the lion's world x by it
at the moment the pose changes, so the planted paws or haunches stay exactly where they
were and nothing cuts.

The walk's legs are levelled first: each frame's planted paws are brought to one floor by
resampling the rows below the belly, and a one-pixel body bob (high at mid-stance) is put
in the same way; the two halves of the walk (drawn four frames at a time) are brought to one
stance width (STANCE), and run paws drawn a hair above the floor are put down on it. The walk and run strides are then measured the same way: after torso registration a planted
paw slides back by the stride between two frames, and hub.js advances x by exactly that at
each frame switch (and not between), so the paws stay put on the floor.

Also measured here: the floor shadow per pose, the turn pivots and the walk/run frames
closest to the standing pose (where he may stop).

  ./.venv/bin/python tools/production/build_lair_lion.py
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
import sprite_edges
from slice_sheet import components, box_distance

RS = 2
SRC = "assets/sources/production/lair/"
OUT = "assets/lair/"
RIG = "js/lion_rig.js"
TURN_IOU = 0.57     # the least overlap a turn's 3/4 -> front change may have
LION_H = 74          # logical standing height of the walk, paw to mane top: CHAD is 96
PAD = 3
STANCE = 1.04       # walk stance correction, see main

SHEETS = {
    "lie": ["lie", "lie_lift", "wake", None, None, None, None, None],
    "stretch": [None, "stretch_lift", "stretch_in", "stretch", "stretch_out", "stretch_up", None, None],
    "sit": ["sit", None, None, None, None, "sit_turn", "sit_up", None],
    "roar": ["stand", None, None, None, None, None, "turn", "stand_sit"],
    "walk": [f"w{i}" for i in range(8)],
    "run": [f"r{i}" for i in range(8)],
}
# In-betweens drawn one at a time (GPT Image edits with the two neighbouring frames as
# references), from lion_x_<name>.png: scaled to a height between the two neighbours'
# (fraction t of the way from a to b) after those are scaled, times an optional factor.
EXTRAS = {
    "rise1": ("wake", "sit", 1 / 3), "rise1b": ("wake", "sit", .5), "rise2": ("wake", "sit", 2 / 3),     # up to sit, and back
    # the full bow's raised tail makes it tall for its body: the bows are sized down to match
    "bow_a": ("stretch_in", "stretch", .5, .95), "bow_a2": ("stretch_in", "stretch", .75, .90),
    "bow_b": ("stretch", "stretch_out", .5, .87), "bow_c": ("stretch", "stretch_out", .4, .96),
    "r_land": ("r3", "stand", .5), "r_land2": ("r3", "stand", .75), "r_land3": ("r3", "stand", .875),                                        # the bound pulls up
    "turn_front": ("stand", "stand", 0), "sit_front": ("sit", "sit", 0),  # symmetric, flipped on
}
# Poses drawn a little tall or short for their neighbours, fitted to them the same way.
FIT = {"stand_sit": ("stand", "sit", .5), "turn": ("stand", "stand", 0), "sit_turn": ("sit", "sit", 0)}

# Scale of each sheet, as the target height (2x px) of its reference pose.
SCALE = {
    "walk": ("w0", None),                 # None: max walk height -> LION_H
    "roar": ("stand", 1.00),              # standing = the walk's height
    "lie": (7, 0.96),                     # index 7: the sheet's own standing frame (dropped)
    "stretch": (6, 1.04),                 # and this one's
    "sit": ("sit", 0.985),                # sitting up he is about as tall as standing
    "run": ("r0", 0.92),                  # stretched out mid-bound, head lowered
}

# Members baked onto a family anchor, on the region that does not move between them.
# (The turns are not: a turn round is a mirror image about the body's centre, so the
# front view stays mass-centred like the side views either side of it.)
FAMILIES = [
    ("lie", ["lie_lift", "wake"], "body"),
]
# Cross-family transitions and the part that stays planted through them.
EDGES = [
    # the rise: the hind end stays put while he pushes up, the chest while he sits back
    ("wake", "rise1", "hind"), ("rise1", "rise1b", "upper"), ("rise1b", "rise2", "upper"), ("rise2", "sit", "front"),
    # the stretch: front paws stay put while the rump goes up into the bow, the hind
    # paws while he comes up out of it
    ("wake", "stretch_lift", "front"), ("stretch_lift", "stretch_in", "front"),
    ("stretch_in", "bow_a", "front"), ("bow_a", "bow_a2", "front"), ("bow_a2", "stretch", "front"),
    ("stretch", "bow_c", "hind"), ("bow_c", "bow_b", "paws"), ("bow_b", "stretch_out", "paws"),
    ("stretch_out", "stretch_up", "hind"), ("stretch_up", "stand", "paws"),
    ("sit", "sit_up", "front"), ("sit_up", "stand", "front"),
    ("stand", "stand_sit", "front"), ("stand_sit", "sit", "front"),
    ("r3", "r_land", "upper"), ("r_land", "r_land2", "upper"), ("r_land2", "r_land3", "upper"), ("r_land3", "stand", "paws"),
]


def slice_grid(path, n=8, rows=2):
    """n poses as the n largest connected shapes, in reading order (row, then x). Small
    loose pieces (a lock of mane, a tail tuft) join the nearest body."""
    a = np.asarray(Image.open(path).convert("RGBA"))
    mask = a[..., 3] > 128
    comps = components(mask, min_pixels=4)
    mains = sorted(comps, key=lambda c: c["area"], reverse=True)[:n]
    H = a.shape[0]
    mains.sort(key=lambda c: (int(((c["box"][1] + c["box"][3]) / 2) / (H / rows)),
                              (c["box"][0] + c["box"][2]) / 2))
    groups = [[m] for m in mains]
    ids = {id(c) for c in mains}
    for c in comps:
        if id(c) in ids:
            continue
        i = min(range(n), key=lambda k: box_distance(c["box"], mains[k]["box"]))
        if box_distance(c["box"], mains[i]["box"]) < 30 ** 2:
            groups[i].append(c)
    out = []
    for g in groups:
        m = np.zeros_like(mask)
        for c in g:
            m[c["ys"], c["xs"]] = True
        px = a.copy()
        px[~m] = 0
        f = Image.fromarray(px)
        out.append(f.crop(f.getbbox()))
    return out


def rescale(img, k):
    return img.resize((max(1, round(img.width * k)), max(1, round(img.height * k))), Image.LANCZOS)


def stats(frames):
    px = np.concatenate([np.asarray(f)[..., :3][np.asarray(f)[..., 3] > 128] for f in frames]).astype(float)
    return px.mean(0), px.std(0)


def colour_match(frames, ref_stats):
    """Per-channel mean/std transfer onto the reference sheet, so the five generations
    are one animal in one light."""
    ms, ss = stats(frames)
    mr, sr = ref_stats
    out = []
    for f in frames:
        a = np.asarray(f).astype(float)
        a[..., :3] = np.clip((a[..., :3] - ms) / ss * sr + mr, 0, 255)
        out.append(Image.fromarray(a.astype(np.uint8)))
    return out


def mask(img):
    return np.asarray(img.getchannel("A")) > 128


def centre_x(img, top=1.0):
    a = mask(img)
    rows = np.nonzero(a.any(1))[0]
    y0, y1 = rows[0], rows[-1]
    a = a[: int(y0 + (y1 - y0) * top) + 1]
    return float(np.nonzero(a)[1].mean())


def region(a, kind):
    """Region of the canvas, from pose `a`'s silhouette box, that stays put."""
    m = mask(a)
    ys, xs = np.nonzero(m)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    w, h = x1 - x0, y1 - y0
    r = np.zeros_like(m)
    box = {
        "paws": (0, 1, .86, 1),
        "body": (0, .62, .55, 1),
        "hind": (0, .40, .70, 1),
        "front": (.55, 1, .80, 1),
        "upper": (0, 1, 0, .55),
    }[kind]
    r[int(y0 + h * box[2]):int(y0 + h * box[3]) + 1, int(x0 + w * box[0]):int(x0 + w * box[1]) + 1] = True
    return r


def best_dx(a, b, kind, limit=120):
    """dx that best lays b over a inside a's `kind` region (ground lines already agree)."""
    ma, mb, r = mask(a), mask(b), region(a, kind)
    best, bd = -1e18, 0
    for dx in range(-limit, limit + 1):
        s = np.roll(mb, dx, 1)
        score = (ma & s & r).sum() - ((ma ^ s) & r).sum()
        if score > best:
            best, bd = score, dx
    return bd


def shift(img, dx):
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(img, (dx, 0))
    return out


def shadow(img):
    """The floor shadow sits under the body's mass, not under whichever paws are down: the
    centre and spread of the lower half of the silhouette (a gait then smooths these over
    its cycle, see main)."""
    m = mask(img)
    ys = np.nonzero(m.any(1))[0]
    lower = m[(ys[0] + ys[-1]) // 2:]
    xs = np.nonzero(lower)[1]
    lo, hi = np.percentile(xs, 8), np.percentile(xs, 92)
    return float(xs.mean()), float((hi - lo) / 2)


def paws(img):
    m = mask(img)
    b = np.nonzero(m.any(1))[0][-1]
    cols = np.nonzero(m[b - 2:b + 1].any(0))[0]
    runs, s, p = [], cols[0], cols[0]
    for q in cols[1:]:
        if q - p > 2:
            runs.append((s + p) / 2)
            s = q
        p = q
    runs.append((s + p) / 2)
    return runs


def strides(frames, reach=40):
    """Per transition i -> i+1: how far the planted paws slide back (2x px). A paw is taken
    as planted in both frames when a paw in i+1 sits 0-`reach` px behind it."""
    out = []
    for i in range(len(frames)):
        p, q = paws(frames[i]), paws(frames[(i + 1) % len(frames)])
        moves = []
        for x in p:
            back = [x - y for y in q if -2 <= x - y <= reach]
            if back:
                moves.append(min(back))
        out.append(float(np.median(moves)) if moves else None)
    good = [s for s in out if s is not None]
    fill = float(np.median(good)) if good else 12.0
    return [fill if s is None else s for s in out]


def contacts(img, band=40):
    """Paws touching (or near) the floor: (x centre, bottom y) of each run of columns whose
    lowest opaque pixel is within `band` px of the lowest one."""
    m = mask(img)
    colb = np.where(m.any(0), m.shape[0] - 1 - np.argmax(m[::-1], 0), 0)
    xs = np.nonzero(colb > colb.max() - band)[0]
    runs, s, p = [], xs[0], xs[0]
    for q in xs[1:]:
        if q - p > 3:
            runs.append((s, p))
            s = q
        p = q
    runs.append((s, p))
    return [((s + p) / 2, int(colb[s:p + 1].max())) for s, p in runs if p - s > 8]


def level_legs(frames, bob=5.0, belly=0.74):
    """Walk frames share one body, but each generation put the floor a little higher or
    lower. Resample every frame's rows below the belly so its planted paws (the median
    contact) land on the common floor, raised by a small bob: highest on frames 2 and 6
    (legs under him), lowest on 0 and 4 (legs spread). Pixels left below the floor are the
    odd paw drawn low: they are clipped flat, which reads as planted."""
    tops, floors = [], []
    for f in frames:
        m = mask(f)
        tops.append(int(np.nonzero(m.any(1))[0][0]))
        c = contacts(f, 20)
        floors.append(float(np.median([b for _, b in c])))
    H0 = float(np.median([fl - t for fl, t in zip(floors, tops)]))
    out = []
    for i, (f, t, fl) in enumerate(zip(frames, tops, floors)):
        target = H0 - bob * np.cos(np.pi * i / 2)            # body height above the floor
        yb = int(t + (fl - t) * belly)
        a = np.asarray(f)
        top_part, legs = a[:yb], a[yb:]
        new_h = max(1, int(round((t + target - yb) * legs.shape[0] / (fl - yb))))
        legs = np.asarray(Image.fromarray(legs).resize((a.shape[1], new_h), Image.LANCZOS))
        cut = int(round(t + target)) + 1 - yb                  # rows down to the floor
        legs = legs[:cut]
        b = np.concatenate([top_part, legs], 0)
        out.append(Image.fromarray(b).crop(Image.fromarray(b).getbbox()))
    return out


def plant(img, tol=3):
    """Paws drawn a hair above the floor (within `tol` 2x px) are put down on it: each such
    column's lowest pixel is repeated down to the floor line, so a paw that is meant to be
    planted reads (and measures) as planted."""
    a = np.asarray(img).copy()
    m = a[..., 3] > 128
    colb = np.where(m.any(0), m.shape[0] - 1 - np.argmax(m[::-1], 0), -1)
    floor = colb.max()
    for x in np.nonzero((colb >= floor - tol) & (colb < floor))[0]:
        a[colb[x] + 1:floor + 1, x] = a[colb[x], x]
    return Image.fromarray(a)


def widen_legs(img, k, belly=0.74):
    """Scale the legs' stance by k (about the legs' centre), from nothing at the belly line
    to k at the floor, so the body above is untouched and the legs just splay a little."""
    a = np.asarray(img)
    m = a[..., 3] > 128
    ys = np.nonzero(m.any(1))[0]
    y0, y1 = ys[0], ys[-1]
    yb = int(y0 + (y1 - y0) * belly)
    cx = float(np.nonzero(m[yb:])[1].mean())
    pad = int(a.shape[1] * abs(k - 1)) + 2
    a = np.pad(a, ((0, 0), (pad, pad), (0, 0)))
    cx += pad
    out = a.copy()
    xs = np.arange(a.shape[1], dtype=float)
    for y in range(yb, y1 + 1):
        s = 1 + (k - 1) * (y - yb) / max(1, y1 - yb)
        src = cx + (xs - cx) / s
        i0 = np.clip(np.floor(src).astype(int), 0, a.shape[1] - 2)
        f = (src - i0)[:, None]
        row = a[y].astype(float)
        v = row[i0] * (1 - f) + row[i0 + 1] * f
        out[y] = np.clip(np.round(v), 0, 255).astype(np.uint8)
    im = Image.fromarray(out)
    return im.crop(im.getbbox())


def pivot(img):
    """Mass centre x of a pose, from the canvas centre (2x px): a flip mirrors about the
    canvas centre, so turning on the spot moves x by twice this."""
    return float(np.nonzero(mask(img))[1].mean()) - img.width / 2


def main():
    raw = {k: slice_grid(SRC + f"lion_{k}.png") for k in SHEETS}
    raw["walk"] = level_legs(raw["walk"])
    # the walk's two halves were drawn four frames at a time: w4-7 came back with a stance
    # about a tenth narrower than w0-3, which skates the paws at the seams; meet halfway
    raw["walk"] = [widen_legs(f, STANCE if i >= 4 else 1 / STANCE) for i, f in enumerate(raw["walk"])]
    # one animal in one light: every sheet takes the approved concept's colour statistics
    ref = stats([Image.open(SRC + "lion_concept.png").convert("RGBA")])
    raw = {k: colour_match(v, ref) for k, v in raw.items()}

    walk_h = LION_H * RS
    kw = walk_h / max(f.height for f in raw["walk"])
    poses, unscaled = {}, {}
    for sheet, names in SHEETS.items():
        frames = raw[sheet]
        refname, rel = SCALE[sheet]
        if rel is None:
            k = kw
        else:
            idx = refname if isinstance(refname, int) else names.index(refname)
            k = walk_h * rel / frames[idx].height
        for n, f in zip(names, frames):
            if n:
                poses[n] = sprite_edges.alpha(rescale(f, k))
                unscaled[n] = f
    for i in range(8):
        poses[f"r{i}"] = plant(poses[f"r{i}"])
    ref_stats = ref
    for n, (a, b, t, *k) in list(EXTRAS.items()) + list(FIT.items()):
        f = unscaled[n] if n in FIT else colour_match(
            [Image.open(SRC + f"lion_x_{n}.png").convert("RGBA")], ref_stats)[0]
        f = f.crop(f.getbbox())
        target = poses[a].height + (poses[b].height - poses[a].height) * t
        poses[n] = sprite_edges.alpha(rescale(f, target / f.height * (k[0] if k else 1)))

    # one canvas: bottom on the ground line, centred (walk/run on the upper body)
    cx = {n: centre_x(f, .5 if n[0] in "wr" and n[1:].isdigit() else 1.0) for n, f in poses.items()}
    half = int(np.ceil(max(max(c, f.width - c) for (n, f), c in zip(poses.items(), cx.values())))) + PAD + 30
    w = half * 2
    h = max(f.height for f in poses.values()) + PAD
    P = {}
    for n, f in poses.items():
        c = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        c.paste(f, (int(round(half - cx[n])), h - f.height), f)
        P[n] = c

    for anchor, members, kind in FAMILIES:
        for n in members:
            P[n] = shift(P[n], best_dx(P[anchor], P[n], kind))

    edge = {}
    for a, b, kind in EDGES:
        edge[f"{a}>{b}"] = best_dx(P[a], P[b], kind) / RS
    # A turn goes 3/4 -> front -> flip -> front -> mirrored 3/4, and its edge is applied on the
    # way in and again (reversed, facing the other way) on the way out, so he travels twice
    # the edge plus the front frame's pivot. Take the smallest travel that still overlaps.
    for a, b in (("turn", "turn_front"), ("sit_turn", "sit_front")):
        pv = pivot(P[b])
        for d in sorted(range(-40, 41), key=abs):
            dx = int(round(d - pv))
            ma, mb = mask(P[a]), np.roll(mask(P[b]), dx, 1)
            if (ma & mb).sum() / max(1, (ma | mb).sum()) >= TURN_IOU:
                edge[f"{a}>{b}"] = dx / RS
                break
    # the gaits: a stop frame is one whose legs are closest to the standing pose
    gait = {}
    for g, n in (("walk", "w"), ("run", "r")):
        names = [f"{n}{i}" for i in range(8)]
        fr = [P[x] for x in names]
        st = strides(fr, 40 if g == "walk" else 64)
        near = []
        for x in names:
            # the walk is the standing drawing with new legs, so it locks on the body
            dx = best_dx(P["stand"], P[x], "upper")
            a, b = mask(P["stand"]), np.roll(mask(P[x]), dx, 1)
            lo = int(h * .6)
            iou = (a[lo:] & b[lo:]).sum() / max(1, (a[lo:] | b[lo:]).sum())
            near.append((iou, x, dx))
            edge[f"stand>{x}"] = dx / RS
        near.sort(reverse=True)
        # the bound stops on its gathered frame (legs under him), into the landing skid
        stop = [3] if g == "run" else [int(x[1:]) for _, x, _ in near[:2]]
        gait[g] = {"stride": [round(s / RS, 2) for s in st], "stop": stop}
        if g == "run":
            # a sprint of a set length may spring off from stand into any bound frame
            # that shares enough of his silhouette, so its length can be planned to a frame
            full = []
            for x in names:
                a, b = mask(P["stand"]), np.roll(mask(P[x]), int(round(edge[f"stand>{x}"] * RS)), 1)
                full.append((a & b).sum() / max(1, (a | b).sum()))
            gait[g]["start"] = [i for i, v in enumerate(full) if v >= .6 or i in stop]

    os.makedirs(OUT, exist_ok=True)
    for f in os.listdir(OUT):
        if f.startswith("lion_") and f.endswith(".png"):
            os.remove(OUT + f)
    sh = {}
    for n, img in P.items():
        img = sprite_edges.edges(img)
        img.save(f"{OUT}lion_{n}.png")
        c, hw = shadow(img)
        sh[n] = [round((c - w / 2) / RS, 1), round(hw / RS, 1)]
    # a gait's shadow is its cycle's, nudged a little by each frame
    for l in "wr":
        fr = [sh[f"{l}{i}"] for i in range(8)]
        mc, mh = np.mean([c for c, _ in fr]), np.mean([hw for _, hw in fr])
        for i in range(8):
            c, hw = sh[f"{l}{i}"]
            sh[f"{l}{i}"] = [round(.75 * mc + .25 * c, 1), round(.75 * mh + .25 * hw, 1)]
    rig = {
        "poses": sorted(P),
        "pivot": {n: round(pivot(P[n]) / RS, 1) for n in ("turn", "sit_turn", "turn_front", "sit_front")},
        "edge": {k: round(v, 1) for k, v in edge.items()},
        "walk": gait["walk"],
        "run": gait["run"],
        "shadow": sh,
    }
    with open(RIG, "w") as out:
        out.write("// GENERATED by tools/production/build_lair_lion.py - do not edit by hand.\n")
        out.write("// Logical px, from the canvas's bottom centre, art facing right. edge['a>b']: how far\n")
        out.write("// the lion's x moves forward when pose a becomes b (b>a is the negative).\n")
        out.write("export const LION_RIG = " + json.dumps(rig, indent=1) + ";\n")
    print(f"{OUT}lion_*.png  {len(P)} poses  {w}x{h}  (logical {w / RS:g}x{h / RS:g})")
    print("walk", gait["walk"], "\nrun", gait["run"])
    print("edges", rig["edge"])


if __name__ == "__main__":
    main()
