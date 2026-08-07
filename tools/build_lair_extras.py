#!/usr/bin/env python3
"""The two lair sprite sets whose frames have to register with each other.

process_props.py sizes every sprite on its own, which is right for objects that never
share a screen position. These two do:

  lounge  an empty sofa and the same sofa with CHAD sitting in it, swapped in place.
          Scaled independently the furniture would jump when he sits down, so both are
          scaled by ONE factor measured off the empty sofa and aligned on the footprint
          - the bottom band, which is the sofa and the side table in both pictures and
          therefore is not dragged sideways by CHAD's arm.

  tiger   a six frame walk cycle plus sit and lying poses. One factor for all of the
          walk, measured off the tallest frame, then every frame bottom-anchored and
          centred on its own lower body so he does not bob or slide. White on purpose:
          the room is walnut and black granite and a dark animal sinks into it.

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

  ./.venv/bin/python tools/build_lair_extras.py [lounge|tiger|tank|curl|bench|bed]
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
TIGER_H = 58     # shoulder-to-ground on a big cat, against CHAD's 96
TIGER_SIT_H = 70
TIGER_LIE_H = 32
SHARK_H = 26     # nose-to-tail comes out around 4x this
SHOAL_H = 6
FIRE_W = 32      # the firebox interior is 59x35 logical; the flames clip at the lintel
FENDER = (1530, 148, 68, 20)   # must match FENDER in js/hub.js
BED_W = 140      # bed length. The art is 2:1, so this puts the headboard near 70 -
                 # a solid shape beside CHAD's 96 rather than a long thin slab
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


def base_junction(frame):
    """The row where the mattress meets the carved wooden base.

    The sharpest drop in row-mean luminance - cream bedding above, dark walnut below -
    searched only in the LOWER QUARTER of the sprite. Unconstrained it picked 57% of the
    height in one set of poses and 86% in the next; the base is always near the bottom,
    and it is the base that matters because it is the biggest dark mass in the sprite and
    the place shading drift shows up worst.
    """
    a = np.asarray(frame).astype(float)
    opaque = a[..., 3] > 128
    lum = a[..., 0] * .3 + a[..., 1] * .6 + a[..., 2] * .1
    rows = np.array([lum[y][opaque[y]].mean() if opaque[y].sum() > 10 else 0.0
                     for y in range(a.shape[0])])
    lo, hi = int(a.shape[0] * .70), int(a.shape[0] * .93)
    return lo + int(np.argmin(np.diff(rows)[lo:hi])) + 1


def match_exposure(frame, ref, band):
    """Pull `frame` onto `ref`'s exposure, fitted on the furniture band alone.

    The poses come back with identical GEOMETRY but not identical shading - the same
    pixel of the carved base measured (48,8,4) in one pose and (114,48,21) in another,
    which on screen is the bed's woodwork brightening and dimming every time they move.
    A per-channel gain and offset fitted on the part that is supposed to be identical
    fixes that without touching a single edge, which compositing would.
    """
    a = np.asarray(frame).astype(float)
    b = np.asarray(ref).astype(float)
    mask = (a[..., 3] > 128) & (b[..., 3] > 128)
    mask[:band] = False
    if mask.sum() < 500:
        return frame
    out = a.copy()
    for c in range(3):
        x, y = a[..., c][mask], b[..., c][mask]
        var = x.var()
        gain = 1.0 if var < 1e-6 else np.clip(np.cov(x, y)[0, 1] / var, 0.6, 1.7)
        offset = y.mean() - gain * x.mean()
        out[..., c] = np.clip(a[..., c] * gain + offset, 0, 255)
    return Image.fromarray(out.astype(np.uint8), "RGBA")


def finish_set(frames, colors=56):
    """finish() every frame against ONE shared palette.

    Quantising each frame on its own gives each its own palette, and then every pixel of
    the bed shifts a little from pose to pose - measured at 22-32% of the furniture
    differing, which on screen is the whole bed shimmering as they move. Same rule as
    process_char.py's one-palette-per-character: the palette comes from frame 0 and
    everything else is mapped onto it.
    """
    prepped = [outline(hard_alpha(f, 110)) for f in frames]
    alphas = [f.getchannel("A") for f in prepped]
    rgbs = []
    for f, a in zip(prepped, alphas):
        rgb = Image.new("RGB", f.size, (0, 0, 0))
        rgb.paste(f.convert("RGB"), (0, 0), a)
        rgbs.append(rgb)
    ref = rgbs[0].quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
    out = []
    for rgb, a in zip(rgbs, alphas):
        q = rgb.quantize(palette=ref, dither=Image.NONE).convert("RGBA")
        q.putalpha(a)
        out.append(q)
    return out


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


def build_bed():
    """The master suite's bed, one generation per pose from assets/ai/lair/bed/.

    No compositing and no per-frame alignment, because there is nothing to correct:
    every pose is generated against p0 with an instruction not to move or redraw the
    furniture, and tools/check_bed_poses.py measures the result at 0.1% furniture drift.
    That is the whole trick - the frames are cropped to ONE shared box rather than each
    to its own bbox, so a pose where an arm reaches further left cannot shift the bed.

    What this replaced: a six-pose strip (cells too narrow to draw a long bed), then two
    three-pose strips (the sheets disagreed about the bed), then compositing the
    furniture out of one frame - which held the bed still and left a hard horizontal seam
    across the mattress where the box edge cut through drapery.
    """
    src = SRC + "bed/"
    names = sorted(n for n in os.listdir(src) if n.endswith(".png"))
    keyed_frames = [hard_alpha(key_green(Image.open(src + n), tol=40), 128) for n in names]

    # one box for all of them: the union of every pose's ink
    boxes = [np.asarray(f.getchannel("A")) > 128 for f in keyed_frames]
    any_ink = np.zeros_like(boxes[0])
    for m in boxes:
        any_ink |= m
    ys, xs = np.where(any_ink)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    frames = [f.crop(box) for f in keyed_frames]

    # The generations land within a pixel of each other but not always ON it, and a 1px
    # jiggle in a bed that is otherwise perfectly still is more obvious than a big one.
    # Judged on the furniture band so her arms cannot drag the alignment.
    band = int(frames[0].height * 0.55)
    aligned = [frames[0]]
    for f in frames[1:]:
        dx, dy = best_shift(frames[0], f, band, limit=3)
        canvas = Image.new("RGBA", frames[0].size, (0, 0, 0, 0))
        canvas.paste(f, (dx, dy), f)
        aligned.append(canvas)
    frames = aligned

    # The poses agree on geometry but not on shading - the same pixel of the carved base
    # came back (48,8,4) in one pose and (114,48,21) in another, which on screen is the
    # woodwork brightening every time they move. A global exposure fit does not fix it
    # because the variation is local, so the base is taken from p0 for every frame. The
    # cut is at the mattress/base junction, a real horizontal edge in the art.
    cut = base_junction(frames[0])
    print(f"  carved base from pose 0 below row {cut} of {frames[0].height} "
          f"({round(100 * cut / frames[0].height)}%, the mattress/base edge)")
    fixed = [frames[0]]
    for f in frames[1:]:
        c = f.copy()
        c.paste(frames[0].crop((0, cut, f.width, f.height)), (0, cut))
        fixed.append(c)
    frames = fixed

    factor = BED_W * RS / frames[0].width
    frames = [rescale(f, factor) for f in frames]
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(finish_set(frames, 56)):
        f.save(f"{OUT}bed_{i}.png")
    # the bed's own floor line is the bottom of the shared box
    print(f"{OUT}bed_0..{len(frames) - 1}.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})  "
          f"{len(frames)} poses, last is the greeting")

def build_fender():
    """Cut the fireplace's brass fender out of the wall plate as its own sprite.

    The fender is painted INTO the plate, so a fire drawn over the plate covers it and
    reads as burning in front of the fireplace instead of inside it. Blitting the whole
    band back over the fire would paint the dark firebox back too, so only the bright
    brass is kept and everything darker is dropped to transparent.
    """
    plate = Image.open("assets/bg_lair_wall.png").convert("RGBA")
    x, y, w, h = (v * RS for v in FENDER)
    band = np.asarray(plate.crop((x, y, x + w, y + h))).astype(int)
    lum = band[..., 0] * .3 + band[..., 1] * .6 + band[..., 2] * .1
    band[..., 3] = np.where(lum > 42, 255, 0)      # brass rail in, dark firebox out
    out = Image.fromarray(band.astype(np.uint8), "RGBA")
    os.makedirs(OUT, exist_ok=True)
    out.save(f"{OUT}fender.png")
    kept = (band[..., 3] > 0).mean() * 100
    print(f"{OUT}fender.png  {out.width}x{out.height}  "
          f"(logical {FENDER[2]}x{FENDER[3]}, {kept:.0f}% brass)")


def build_fire():
    """The fireplace fire: four frames off one reference, logs still, flames moving.

    Same shape as build_bed and for the same reason - a shared crop box so the logs
    cannot shift, and one shared palette so the embers do not shimmer between frames.
    """
    src = SRC + "fire/"
    names = sorted(n for n in os.listdir(src) if n.endswith(".png"))
    keyed_frames = [hard_alpha(key_green(Image.open(src + n), tol=40), 128) for n in names]
    any_ink = np.zeros(np.asarray(keyed_frames[0].getchannel("A")).shape, bool)
    for f in keyed_frames:
        any_ink |= np.asarray(f.getchannel("A")) > 128
    ys, xs = np.where(any_ink)
    box = (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)
    frames = [f.crop(box) for f in keyed_frames]
    frames = [rescale(f, FIRE_W * RS / frames[0].width) for f in frames]

    # Same story as the bed: told four times to draw the identical log stack the model
    # draws four similar ones, measured at 15% of the log band differing, and logs that
    # reshape themselves every frame are exactly what makes a fire look wrong. So the
    # logs come from frame 0 and only the flame above them moves. The cut is the sharpest
    # brightness drop down the sprite - flame above, charred wood below - which is a real
    # edge in the art.
    a0 = np.asarray(frames[0]).astype(float)
    opaque = a0[..., 3] > 128
    lum = a0[..., 0] * .3 + a0[..., 1] * .6 + a0[..., 2] * .1
    rows = np.array([lum[y][opaque[y]].mean() if opaque[y].sum() > 4 else 0.0
                     for y in range(a0.shape[0])])
    lo, hi = int(a0.shape[0] * .35), int(a0.shape[0] * .75)
    cut = lo + int(np.argmin(np.diff(rows)[lo:hi])) + 1
    print(f"  logs from frame 0 below row {cut} of {frames[0].height} "
          f"({round(100 * cut / frames[0].height)}%, the flame/log edge)")
    fixed = [frames[0]]
    for f in frames[1:]:
        c = f.copy()
        c.paste(frames[0].crop((0, cut, f.width, f.height)), (0, cut))
        fixed.append(c)
    frames = fixed

    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(finish_set(frames, 32)):
        f.save(f"{OUT}fire_{i}.png")
    print(f"{OUT}fire_0..{len(frames) - 1}.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})")


def build_curl():
    # the rack sits to CHAD's right in every pose, so it is the right edge that registers
    build_rig("gym_curl", CURL_RIG_H, "right")


def build_bench():
    build_rig("gym_bench", BENCH_RIG_H, "left")


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
    jobs = sys.argv[1:] or ["lounge", "tiger", "tank", "curl", "bench", "bed", "fire", "fender"]
    for j in jobs:
        {"lounge": build_lounge, "tiger": build_tiger,
         "tank": build_tank, "curl": build_curl, "bench": build_bench,
         "bed": build_bed, "fire": build_fire, "fender": build_fender}[j]()
