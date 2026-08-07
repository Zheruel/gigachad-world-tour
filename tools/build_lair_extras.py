#!/usr/bin/env python3
"""The two lair sprite sets whose frames have to register with each other.

process_props.py sizes every sprite on its own, which is right for objects that never
share a screen position. These two do:

  lounge  an empty sofa and the same sofa with CHAD sitting in it, swapped in place.
          Scaled independently the furniture would jump when he sits down, so both are
          scaled by ONE factor measured off the empty sofa and aligned on the footprint
          - the bottom band, which is the sofa and the side table in both pictures and
          therefore is not dragged sideways by CHAD's arm.

  dog     a six frame walk cycle plus a sit pose. One factor for all seven, measured
          off the tallest walk frame, then every frame bottom-anchored and centred on
          its own lower body so the dog does not bob or slide.

  tiger   the same as the dog, plus a lying pose. White on purpose: the room is walnut
          and black granite and a dark animal sinks into it.

  tank    the shark and one piranha, both swim cycles. Centred rather than
          bottom-anchored - nothing in water stands on anything.

  curl    the dumbbell rack and the bench press, each one strip: the rig alone followed
  bench   by three poses of CHAD working it. Generating them as a strip is what the
          lounge should have done - the model repeats the equipment instead of
          re-inventing it, so the frames register before any alignment happens.

  bed     the master suite's emperor size and the two lounging in it, six poses off TWO
          strips of three. Same reason as the gym rigs, plus stabilise() - see there.
          NOTE the outputs are bed_0..5.png and share a prefix with the bedroom props
          bed_fire/bed_rug/bed_wardrobe/bed_nightstand, which process_props.py owns.
          `rm assets/lair/bed_*.png` takes all of them.

  ./.venv/bin/python tools/build_lair_extras.py [lounge|dog|tiger|tank|curl|bench|bed]
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline
from slice_sheet import components, cut_points

RS = 2
SRC = "assets/ai/lair/"
OUT = "assets/lair/"

SOFA_H = 46      # logical height of the empty sofa + side table
DOG_H = 40       # logical height of the standing dog
DOG_SIT_H = 46   # a doberman sits up taller than it stands; and it is its own
                 # generation, so it does not share the walk sheet's scale
TIGER_H = 58     # shoulder-to-ground on a big cat, against CHAD's 96
TIGER_SIT_H = 70
TIGER_LIE_H = 32
SHARK_H = 26     # nose-to-tail comes out around 4x this
SHOAL_H = 6
BED_W = 190      # a king size is what says 'king': its LENGTH against CHAD's 96
# where the two of them lie, as fractions of the built frame: clear of the footboard,
# the headboard posts and the whole carved base, all of which come from frame 0
BED_SLEEPER_BOX = (0.13, 0.20, 0.97, 0.64)
CURL_RIG_H = 38  # the dumbbell rack alone; set so CHAD beside it comes out at his 96
BENCH_RIG_H = 62 # the bench plus its posts and the racked bar


def keyed(path):
    return hard_alpha(subject(key_green(Image.open(path), tol=40)), 128)


def rescale(img, factor):
    w, h = max(1, round(img.width * factor)), max(1, round(img.height * factor))
    return img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def finish(img, colors=40):
    """Outline + quantize, the same treatment process_props.py gives a prop."""
    img = outline(hard_alpha(img, 110))
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    q.putalpha(alpha)
    return q


def foot_centre(img, band=0.25):
    """Horizontal centre of the bottom `band` of the silhouette."""
    a = np.asarray(img.getchannel("A")) > 128
    rows = a[int(a.shape[0] * (1 - band)):]
    cols = np.where(rows.any(0))[0]
    return float(cols.mean()) if len(cols) else img.width / 2


def biggest_blob(img):
    """Keep only the largest connected shape. A cut can clip a leg off the pose next
    door; the dog is one blob, the stray leg is another."""
    a = np.asarray(img.getchannel("A")) > 16
    comps = components(a, min_pixels=8)
    if len(comps) > 1:
        keep = max(comps, key=lambda c: len(c['xs']))
        m = np.zeros_like(a)
        m[keep['ys'], keep['xs']] = True
        px = np.asarray(img).copy()
        px[~m, 3] = 0
        img = Image.fromarray(px)
    return subject(img)


def place(frames, pad=2):
    """Bottom-anchor and foot-centre a set of frames onto one shared canvas."""
    cx = [foot_centre(f) for f in frames]
    left = max(c for c in cx)
    right = max(f.width - c for f, c in zip(frames, cx))
    w = int(round(left + right)) + pad * 2
    h = max(f.height for f in frames) + pad
    out = []
    for f, c in zip(frames, cx):
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(f, (int(round(pad + left - c)), h - f.height), f)
        out.append(canvas)
    return out


def rig_anchor(img, band=0.15, side="left"):
    """One edge of the furniture and its floor line: the outermost opaque column on
    `side`, and the lowest opaque row within `band` of the sprite from that edge.

    Both are furniture in every pose of a set, which bottom-anchoring the whole sprite
    is not - that registers CHAD's boots, and they hang below the sofa's legs, so the
    sofa floats up five pixels the moment he sits down. `side` picks the edge the
    equipment is actually on: the sofa and the bench are drawn at the left of their
    poses, the dumbbell rack at the right."""
    a = np.asarray(img.getchannel("A")) > 128
    cols = np.flatnonzero(a.any(0))
    w = max(1, int(img.width * band))
    if side == "left":
        edge = int(cols[0])
        end = a[:, edge:edge + w]
    else:
        edge = int(cols[-1])
        end = a[:, max(0, edge - w):edge + 1]
    return edge, int(np.flatnonzero(end.any(1))[-1])


def register(frames, side="left", pad=2):
    """Lay a set of frames onto one shared canvas with their rig anchors coincident.

    Returns the frames and the canvas overhang below the rig's floor line, which is what
    js/hub.js has to add to WALL_BASE so the equipment stands on the floor rather than
    CHAD's boots doing it."""
    anchors = [rig_anchor(f, side=side) for f in frames]
    ax = max(x for x, _ in anchors)
    ay = max(y for _, y in anchors)
    w = ax + max(f.width - x for f, (x, _) in zip(frames, anchors)) + pad
    h = ay + max(f.height - y for f, (_, y) in zip(frames, anchors)) + pad
    out = []
    for f, (x, y) in zip(frames, anchors):
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(f, (ax - x, ay - y), f)
        out.append(canvas)
    return out, h - ay


def build_lounge():
    empty = keyed(SRC + "lounge_empty.png")
    chad = keyed(SRC + "lounge_chad.png")
    factor = SOFA_H * RS / empty.height
    empty, chad = rescale(empty, factor), rescale(chad, factor)

    (empty, chad), _ = register([empty, chad])
    os.makedirs(OUT, exist_ok=True)
    for name, img in (("lounge_empty", empty), ("lounge_chad", chad)):
        finish(img, 48).save(f"{OUT}{name}.png")
        print(f"{OUT}{name}.png  {img.width}x{img.height}  "
              f"(logical {round(img.width / RS)}x{round(img.height / RS)})")


def slice_strip(path, n, blob=True):
    """Cut an n-pose strip. A nose or a tail bridges the gutter often enough that
    splitting on fully empty columns merges poses, so cut_points looks near each
    expected boundary instead, and biggest_blob drops any limb the cut clipped off the
    pose next door.

    blob=False for the gym rigs: the man and his equipment are two separate shapes in
    the same pose, and keeping only the biggest would throw the equipment away."""
    sheet = hard_alpha(key_green(Image.open(path), tol=40), 128)
    mask = np.asarray(sheet.getchannel("A")) > 16
    edges = [0] + cut_points(mask, n) + [sheet.width]
    cells = [sheet.crop((edges[i], 0, edges[i + 1], sheet.height)) for i in range(n)]
    return [biggest_blob(c) if blob else subject(c) for c in cells]


def build_walker(prefix, walk_h, extras):
    """A walk strip plus standalone poses. The cycle shares one scale so the animal
    does not pulse; each extra pose is its own generation and so gets its own factor,
    targeted at the height that pose should be."""
    frames = slice_strip(SRC + prefix + "_walk.png", 6)
    frames = place([rescale(f, walk_h * RS / max(f.height for f in frames))
                    for f in frames])
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(frames):
        finish(f).save(f"{OUT}{prefix}_{i}.png")
    print(f"{OUT}{prefix}_0..5.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})")
    for pose, h in extras.items():
        img = keyed(f"{SRC}{prefix}_{pose}.png")
        img = place([rescale(img, h * RS / img.height)])[0]
        finish(img).save(f"{OUT}{prefix}_{pose}.png")
        print(f"{OUT}{prefix}_{pose}.png  {img.width}x{img.height}  "
              f"(logical {round(img.width / RS)}x{round(img.height / RS)})")


def build_rig(prefix, rig_h, side):
    """A gym station: one strip holding the rig alone and then three poses of CHAD on it.

    Scaled by the RIG, not by the tallest frame - the equipment is the thing that has to
    stay the size the room was laid out for, and CHAD's raised arms would otherwise
    shrink the whole station every time he lifts. One strip means the rig is already
    identical in all four poses, so `register` only has to line the anchors up.
    """
    frames = slice_strip(SRC + prefix + ".png", 4, blob=False)
    factor = rig_h * RS / frames[0].height
    frames, floor_pad = register([rescale(f, factor) for f in frames], side=side)
    os.makedirs(OUT, exist_ok=True)
    names = [prefix + "_empty"] + [f"{prefix}_{i}" for i in range(3)]
    for name, f in zip(names, frames):
        finish(f, 48).save(f"{OUT}{name}.png")
    print(f"{OUT}{prefix}_*.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})  "
          f"y = WALL_BASE + {round(floor_pad / RS)}")


def best_shift(base, other, band, limit=6):
    """Translation that best lines `other` up with `base`, judged on `band` only.

    The band is the furniture - the part that is supposed to be identical - so the
    people moving about above it cannot drag the alignment around."""
    a = (np.asarray(base.getchannel("A")) > 128)[band:]
    best, bestdx, bestdy = -1, 0, 0
    for dy in range(-limit, limit + 1):
        for dx in range(-limit, limit + 1):
            b = (np.asarray(other.getchannel("A")) > 128)[band:]
            b = np.roll(np.roll(b, dy, axis=0), dx, axis=1)
            score = (a & b).sum() - (a ^ b).sum()
            if score > best:
                best, bestdx, bestdy = score, dx, dy
    return bestdx, bestdy


def stabilise(frames, box):
    """Take the FURNITURE from one frame and let only the occupants vary.

    Asked for the same bed six times the model draws six subtly different beds - the
    valance, the carving, the posts and the colours all breathe - and against a still
    room that reads as the whole bed morphing every time someone rolls over. Prompting
    does not fix it and neither does alignment, because the drift is in the drawing and
    not in the placement: measured on the built frames, more than half of the difference
    between poses is in the bed BASE, which is supposed to be identical.

    So the pixels settle it. Frame 0 is the bed. Every frame contributes only `box`, the
    band the sleepers lie in, given as (x0, y0, x1, y1) fractions of the frame - a
    diff-derived box is no use here because the frames differ everywhere.
    """
    w, h = frames[0].size
    x0, y0, x1, y1 = (round(box[0] * w), round(box[1] * h),
                      round(box[2] * w), round(box[3] * h))
    out = []
    for f in frames:
        canvas = frames[0].copy()
        canvas.paste(f.crop((x0, y0, x1, y1)), (x0, y0))
        out.append(canvas)
    print(f"  stabilised: bed from frame 0, sleepers from a {x1 - x0}x{y1 - y0} "
          f"box at ({x0},{y0})")
    return out


def build_bed():
    """The bed and its two sleepers, six poses off TWO strips of three.

    Three per sheet because cell width is the budget for how long the bed can be drawn:
    six cells in a 1536px sheet is 256px each and the bed comes back as tall as it is
    long. The second sheet takes the first as a reference so it draws the same bed.

    Scaled by WIDTH, not height: it is a king size, and what says so is its length
    against CHAD's 96. Aligned on the footboard end, then stabilised so the furniture
    comes from a single frame - see stabilise() for why that is not optional.
    """
    frames = (slice_strip(SRC + "bed.png", 3, blob=False)
              + slice_strip(SRC + "bed_b.png", 3, blob=False))
    # The model does not always draw the bed to the same proportions - one pose came back
    # 11% longer than its five siblings at the same height. That is a different bed, not a
    # different scale, so aligning cannot fix it. Every frame is resized to ONE size
    # instead, taken from the median aspect: an 11% squeeze on a bed is invisible, and it
    # keeps all six poses where dropping the odd ones out would leave four.
    aspect = sorted(f.width / f.height for f in frames)[len(frames) // 2]
    size = (BED_W * RS, round(BED_W * RS / aspect))
    frames = [f.resize((size[0] * 3, size[1] * 3), Image.LANCZOS).resize(size, Image.LANCZOS)
              for f in frames]
    frames, floor_pad = register(frames, side="left")
    # then shave off any residual drift, judged on the base band - the part that is
    # supposed to be identical - so the sleepers cannot drag the alignment around
    base_band = int(frames[0].height * 0.55)
    fixed = [frames[0]]
    for f in frames[1:]:
        dx, dy = best_shift(frames[0], f, base_band)
        canvas = Image.new("RGBA", frames[0].size, (0, 0, 0, 0))
        canvas.paste(f, (dx, dy), f)
        fixed.append(canvas)
    frames = fixed
    frames = stabilise(frames, BED_SLEEPER_BOX)
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(frames):
        finish(f, 56).save(f"{OUT}bed_{i}.png")
    print(f"{OUT}bed_0..{len(frames) - 1}.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})  "
          f"y = WALL_BASE + {round(floor_pad / RS)}")

def build_curl():
    # the rack sits to CHAD's right in every pose, so it is the right edge that registers
    build_rig("gym_curl", CURL_RIG_H, "right")


def build_bench():
    build_rig("gym_bench", BENCH_RIG_H, "left")


def build_dog():
    build_walker("dog", DOG_H, {"sit": DOG_SIT_H})


def build_tiger():
    build_walker("tiger", TIGER_H, {"sit": TIGER_SIT_H, "lie": TIGER_LIE_H})


def build_tank():
    """The swimmers are centred on the canvas, not bottom-anchored: nothing in water
    stands on anything, and the shark's tail sweep must not shunt the body up and down.
    """
    os.makedirs(OUT, exist_ok=True)
    for name, target in (("shark", SHARK_H), ("shoal", SHOAL_H)):
        frames = slice_strip(SRC + name + ".png", 4)
        factor = target * RS / max(f.height for f in frames)
        frames = [rescale(f, factor) for f in frames]
        w = max(f.width for f in frames) + 2
        h = max(f.height for f in frames) + 2
        for i, f in enumerate(frames):
            canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            canvas.paste(f, ((w - f.width) // 2, (h - f.height) // 2), f)
            finish(canvas).save(f"{OUT}{name}_{i}.png")
        print(f"{OUT}{name}_0..3.png  {w}x{h}  "
              f"(logical {round(w / RS)}x{round(h / RS)})")


if __name__ == "__main__":
    jobs = sys.argv[1:] or ["lounge", "dog", "tiger", "tank", "curl", "bench", "bed"]
    for j in jobs:
        {"lounge": build_lounge, "dog": build_dog, "tiger": build_tiger,
         "tank": build_tank, "curl": build_curl, "bench": build_bench,
         "bed": build_bed}[j]()
