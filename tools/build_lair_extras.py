#!/usr/bin/env python3
"""The two lair sprite sets whose frames have to register with each other.

process_props.py sizes every sprite on its own, which is right for objects that never
share a screen position. These two do:

  lounge  an empty sofa and the same sofa with CHAD sitting in it, swapped in place.
          Scaled independently the furniture would jump when he sits down, so both are
          scaled by ONE factor measured off the empty sofa and aligned on the footprint
          - the bottom band, which is the sofa and the side table in both pictures and
          therefore is not dragged sideways by CHAD's arm.

  tiger   a six frame prowl plus a five pose rest strip (lie, wake, sit, stretch,
          snarl), all eleven on one canvas and one palette so he neither hops nor
          changes colour when he lies down. White on purpose: the room is walnut and
          black granite and a dark animal sinks into it.

  tank    the shark's swim cycle. Centred rather than
          bottom-anchored - nothing in water stands on anything.

  bed     the master suite's emperor size and the two lounging in it, six poses off TWO
          strips of three. Same reason as the gym rigs, plus stabilise() - see there.
          NOTE the outputs are bed_0..5.png and share a prefix with the bedroom props
          bed_fire/bed_rug/bed_wardrobe/bed_nightstand, which process_props.py owns.
          `rm assets/lair/bed_*.png` takes all of them.

  ./.venv/bin/python tools/build_lair_extras.py [lounge|tiger|tank|bed]
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

SMOKE_POSES = 4  # lounge_chad is pose 0 of the smoke; smoke_1..3 are the draw
SOFA_H = 46      # logical height of the empty sofa + side table
TIGER_H = 58     # shoulder-to-ground on a big cat, against CHAD's 96
SHARK_H = 42     # sized against the widened tank; ~57 logical nose to tail
FIRE_W = 32      # the firebox interior is 59x35 logical; the flames clip at the lintel
FENDER = (1530, 148, 68, 20)   # must match FENDER in js/hub.js
BED_W = 140      # bed length. The art is 2:1, so this puts the headboard near 70 -
                 # a solid shape beside CHAD's 96 rather than a long thin slab


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
    process_char.py's one-palette-per-character.

    The palette is taken from ALL the frames together, not from frame 0. Frame 0 of the
    lounge set is the EMPTY sofa, so a frame-0 palette had no skin tones in it at all and
    CHAD came out at (163,97,64) against his standing sprite's (204,130,67) - grey and
    sickly, and no amount of extra colours fixed it because the colours being added were
    more leather.
    """
    prepped = [outline(hard_alpha(f, 110)) for f in frames]
    alphas = [f.getchannel("A") for f in prepped]
    rgbs = []
    for f, a in zip(prepped, alphas):
        rgb = Image.new("RGB", f.size, (0, 0, 0))
        rgb.paste(f.convert("RGB"), (0, 0), a)
        rgbs.append(rgb)
    montage = Image.new("RGB", (sum(r.width for r in rgbs), max(r.height for r in rgbs)))
    x = 0
    for r in rgbs:
        montage.paste(r, (x, 0)); x += r.width
    ref = montage.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)
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
    """The empty sofa, and CHAD smoking on it in four poses.

    The sit used to be ONE still frame with particles over it, which is not an animation.
    One generation per pose against pose 0 - a strip cannot hold a 141-logical sofa steady
    across four cells, and the sofa moving is the one thing that would be unforgivable.

    Two alignments, and they are different on purpose:
      * empty and pose 0 are separate generations, so they only agree via rig_anchor
        (register), the same as the gym rigs.
      * poses 1-3 were generated FROM pose 0, so they are aligned on the sofa's own lower
        band by best_shift - never on the bbox. Pose 3 tips his head back and blows a plume
        which grows the bbox upward by 160px, and cropping to the bbox would slide the whole
        sofa down by that much. Pasting bottom-left onto pose 0's canvas first drops that
        plume off the top for free, which is what we want: the plume is procedural, so it
        carries on across the frame changes rather than popping in and out with one of them.

    ONE factor for all of them, off the EMPTY sofa's height - taking it off pose 0 makes the
    whole suite 26% small, because his head sticks up out of it.
    """
    empty = keyed(SRC + "lounge_empty.png")
    ref = keyed(SRC + "lounge_chad.png")
    factor = SOFA_H * RS / empty.height
    band = int(ref.height * 0.55)

    poses = [ref]
    for i in (1, 2, 3):
        p = keyed(SRC + f"smoke_{i}.png")
        canvas = Image.new("RGBA", ref.size, (0, 0, 0, 0))
        canvas.paste(p, (0, ref.height - p.height), p)
        dx, dy = best_shift(ref, canvas, band, limit=10)
        shifted = Image.new("RGBA", ref.size, (0, 0, 0, 0))
        shifted.paste(canvas, (dx, dy), canvas)
        poses.append(shifted)

    scaled = [rescale(empty, factor)] + [rescale(p, factor) for p in poses]
    scaled, _ = register(scaled)
    os.makedirs(OUT, exist_ok=True)
    done = finish_set(scaled, 72)   # 96 allocated MORE to the leather and came out worse
    names = ["lounge_empty"] + [f"lounge_smoke_{i}" for i in range(SMOKE_POSES)]
    for name, img in zip(names, done):
        img.save(f"{OUT}{name}.png")
    print(f"{OUT}lounge_empty + lounge_smoke_0..3  {done[0].width}x{done[0].height}  "
          f"(logical {round(done[0].width / RS)}x{round(done[0].height / RS)})")
    a = np.asarray(done[1].getchannel("A")) > 128
    b2 = int(done[1].height * 0.55)
    for i, f in enumerate(done[2:], 1):
        b = np.asarray(f.getchannel("A")) > 128
        d = (a[b2:] ^ b[b2:]).sum() / max(1, a[b2:].sum()) * 100
        print(f"  pose {i}: sofa differs {d:.2f}%  {'ok' if d < 3 else 'SOFA IS MOVING'}")


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


def build_tiger():
    """The six frame prowl and the five rest poses, on ONE canvas and ONE palette.

    The old set was three separate generations and came out as three different animals:
    the walk frames' fur measured (238,234,234), neutral white, and the sit was
    (249,235,214) - cream - with 16.2% of its pixels brown against the walk's 5%, because
    it had been drawn a different harness. So the rest poses are one strip generated
    against a frame of the finished walk, and everything is quantized together here.

    Scaled by a STANDING pose, never by each pose's own target height. The last rest pose
    is the tiger standing square and snarling, so matching its height to the walk's makes
    the sit, the lie and the stretch come out at whatever they should be RELATIVE to that.
    Told their heights instead, a lying tiger and a sitting one end up the same size - the
    same mistake that made a police cap the size of a payphone on the trophy shelf.

    place() puts all eleven on one canvas with one ground line, so the room can swap poses
    without any y bookkeeping and he cannot hop when he sits down.
    """
    walk = slice_strip(SRC + "tiger_walk.png", 6)
    walk = [rescale(f, TIGER_H * RS / max(g.height for g in walk)) for f in walk]
    rest = slice_strip(SRC + "tiger_rest.png", 5)
    rest = [rescale(f, max(g.height for g in walk) / rest[4].height) for f in rest]
    frames = finish_set(place(walk + rest), 48)
    names = [str(i) for i in range(6)] + ["lie", "wake", "sit", "stretch", "snarl"]
    os.makedirs(OUT, exist_ok=True)
    for name, f in zip(names, frames):
        f.save(f"{OUT}tiger_{name}.png")
    print(f"{OUT}tiger_*.png  {frames[0].width}x{frames[0].height}  "
          f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})")


def build_tank():
    """The swimmers are centred on the canvas, not bottom-anchored: nothing in water
    stands on anything, and the shark's tail sweep must not shunt the body up and down.
    """
    os.makedirs(OUT, exist_ok=True)
    for name, target in (("shark", SHARK_H),):
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



BOTTLE_H = 23        # the plate's shelf bay is logical 45-68.5; nothing may touch the shelf above
BAR_ROW_W = 120      # BAR in js/hub.js is [0, 132]; the lit shelves run to 120
# His standing sprite, measured off assets/frames/ via the manifest: a 192-device canvas
# with the body 178 of it and the feet 4 up from the bottom. The drink is drawn where the
# player would be, so it has to agree with these, not with HEIGHTS.player - scaling the
# set by its own tallest pose made him 6.7% too tall, because pose 3 holds the glass up
# over his head and that is not part of a man's height.
CHAD_BODY = 178
CHAD_FOOT = 4


def _bottles(name):
    """Every bottle in one generated row, cut on its own empty columns.

    slice_strip is no use here: it wants a known pose count at a known pitch, and these
    are a dozen objects of a dozen widths. They were asked for with a gap between them
    precisely so the gaps could do the cutting."""
    sheet = hard_alpha(key_green(Image.open(SRC + name + ".png"), tol=40), 128)
    mask = np.asarray(sheet.getchannel("A")) > 16
    cols, runs, start = mask.any(0), [], None
    for i, v in enumerate(cols):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i)); start = None
    if start is not None:
        runs.append((start, len(cols)))
    return [subject(sheet.crop((a, 0, b, sheet.height))) for a, b in runs if b - a > 8]


def build_bar():
    """Two rows of varied bottles, laid out here rather than generated at width.

    The plate paints three shelves of near-identical amber bottles. Replacing them means
    covering the shelf exactly: a row generated as one image comes back at whatever aspect
    it likes (3.8 and 4.3 here, against the shelf's 5.0), so it either fails to reach the
    end of the shelf or has to be stretched, and a stretched bottle is a fat bottle.
    Cutting the bottles apart and dealing them out is the only way to hit a width.

    ONE scale for all of them, taken from the tallest: the generated bottles differ in
    height on purpose, and normalising each to the bay would give a row of identical
    heights, which is the thing being fixed.
    """
    pool = _bottles("bar_top") + _bottles("bar_low")
    factor = BOTTLE_H * RS / max(b.height for b in pool)
    pool = [rescale(b, factor) for b in pool]
    # deal alternately, so two bottles from the same generation never sit side by side
    rows = [pool[0::2], pool[1::2]]
    os.makedirs(OUT, exist_ok=True)
    for name, row in zip(("bar_bottles_top", "bar_bottles_low"), rows):
        w, h = BAR_ROW_W * RS, BOTTLE_H * RS
        used = sum(b.width for b in row)
        gap = (w - used) / (len(row) + 1)
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        x = gap
        for b in row:
            canvas.paste(b, (round(x), h - b.height), b)   # they stand on the shelf
            x += b.width + gap
        finish(canvas, 48).save(f"{OUT}{name}.png")
        print(f"{OUT}{name}.png  {w}x{h} (logical {BAR_ROW_W}x{BOTTLE_H})  "
              f"{len(row)} bottles, {gap / RS:.1f} logical apart")


def build_bardrink():
    """CHAD's five-pose drink. Not a station in the gym sense - the bar counter is painted
    into the plate, so there is no rig in the set and this is only him. He is drawn at the
    player's own x with the player hidden, so the set has to agree with his standing sprite
    on scale and on where his middle is: one factor off the TALLEST pose (pose 4 tips his
    head back, so taking it off any other pose would shrink him), then register on the
    torso so the raised arm cannot swing his body sideways.
    """
    frames = slice_strip(SRC + "bar_drink.png", 5)
    # ONE factor, off pose 0 - the only pose that is just him standing
    factor = CHAD_BODY / frames[0].height
    frames = [rescale(f, factor) for f in frames]
    w = max(f.width for f in frames) + 4
    h = max(f.height for f in frames) + CHAD_FOOT + 2
    out = []
    # ONE x offset for all five, taken from pose 0. His back is the leftmost point of
    # every pose because his feet and hips never move, so the crops already share an
    # origin; re-centring each pose on its own torso would slide his boots across the
    # floor as the glass goes up.
    band = np.asarray(frames[0].getchannel("A"))[: int(frames[0].height * 0.55)] > 16
    dx = round(w / 2 - np.where(band.any(0))[0].mean())
    for f in frames:
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(f, (dx, h - CHAD_FOOT - f.height), f)
        out.append(canvas)
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(finish_set(out, 48)):
        f.save(f"{OUT}bar_drink_{i}.png")
    print(f"{OUT}bar_drink_0..4.png  {w}x{h}  (logical {round(w / RS)}x{round(h / RS)})")


# The tank's brass surround, lifted out of the plate and rebuilt bigger. Source bounds are
# the frame's outer edge in assets/bg_lair_wall.png; TANK_OUT is where it goes now.
TANK_SRC = (282, 60, 623, 328)          # device, in the plate
TANK_OUT = (282, 54, 940, 338)          # device: logical 141-470 x 27-169
TANK_CORNER = 26                        # the corner plates, which must NOT be scaled


def build_tankframe():
    """Rebuild the aquarium's frame at the new size as a nine-slice.

    The tank is now most of the lounge wall, and a frame cannot simply be scaled: the
    corner plates and their bolts would stretch into ovals. Nine-slice instead - corners
    verbatim, the four edges stretched along their own axis only, and the middle dropped
    entirely so drawTank can paint the water at whatever size the frame ended up.

    It is a SPRITE, not a plate edit. The old frame stays painted in the wall underneath
    and is simply covered, which means the wall behind never has to be repaired.
    """
    src = Image.open("assets/bg_lair_wall.png").convert("RGBA").crop(TANK_SRC)
    sw, sh = src.size
    dw, dh = TANK_OUT[2] - TANK_OUT[0], TANK_OUT[3] - TANK_OUT[1]
    c = TANK_CORNER
    out = Image.new("RGBA", (dw, dh), (0, 0, 0, 0))
    # corners, verbatim
    out.paste(src.crop((0, 0, c, c)), (0, 0))
    out.paste(src.crop((sw - c, 0, sw, c)), (dw - c, 0))
    out.paste(src.crop((0, sh - c, c, sh)), (0, dh - c))
    out.paste(src.crop((sw - c, sh - c, sw, sh)), (dw - c, dh - c))
    # edges, stretched along their own axis
    top = src.crop((c, 0, sw - c, c)).resize((dw - 2 * c, c), Image.Resampling.LANCZOS)
    bot = src.crop((c, sh - c, sw - c, sh)).resize((dw - 2 * c, c), Image.Resampling.LANCZOS)
    lef = src.crop((0, c, c, sh - c)).resize((c, dh - 2 * c), Image.Resampling.LANCZOS)
    rig = src.crop((sw - c, c, sw, sh - c)).resize((c, dh - 2 * c), Image.Resampling.LANCZOS)
    out.paste(top, (c, 0)); out.paste(bot, (c, dh - c))
    out.paste(lef, (0, c)); out.paste(rig, (dw - c, c))
    # the glass, punched out: everything inside the brass. The frame's inner edge is the
    # last column of each edge slice, so the hole is the frame thickness in from each side.
    inner = 30
    hole = Image.new("RGBA", (dw - 2 * inner, dh - 2 * inner), (0, 0, 0, 0))
    out.paste(hole, (inner, inner))
    finish(out, 48).save(f"{OUT}tank_frame.png")
    print(f"{OUT}tank_frame.png  {dw}x{dh}  (logical {dw // RS}x{dh // RS}), "
          f"glass {(dw - 2 * inner) // RS}x{(dh - 2 * inner) // RS}")


FISH_H, CRAB_H = 7, 12   # a mackerel at 5 was a grey smudge; its bars need 7


def head_row(img, frac=0.34):
    """The mean row of the leading third of a swimmer - which is its head.

    A fish's own bounding box is NOT its centreline: the tail swings out of plane, so the
    two frames with the body curved measure 15 device px tall and the two with it straight
    measure 11. Centring each frame on its own box therefore put the head at row 5.9 in
    two frames and 7.97 in the other two, and the whole shoal bobbed a logical pixel up
    and down at half the swim rate - which is what reads as flicker.
    """
    a = np.asarray(img.getchannel("A")) > 128
    ys, xs = np.nonzero(a)
    cut = int(xs.max() - (xs.max() - xs.min() + 1) * frac)
    sel = a.copy()
    sel[:, :cut] = False
    return np.nonzero(sel)[0].mean()


def build_tenants():
    """The tank's other residents.

    Each is registered differently because each is doing a different thing:

      fish  on its HEAD. It swims, so nothing about it stands on anything, but its head is
            the one part the swim cycle was drawn to hold still.
      crab  bottom-anchored and centred, like a walker: it walks the sand, and a body that
            rises and falls as its legs gather is a crab walking rather than a fault.
    """
    os.makedirs(OUT, exist_ok=True)
    for name, target, mode in (("baitfish", FISH_H, "head"), ("crab", CRAB_H, "bottom")):
        frames = slice_strip(SRC + name + ".png", 4)
        factor = target * RS / max(f.height for f in frames)
        frames = [rescale(f, factor) for f in frames]
        w = max(f.width for f in frames) + 2
        h = max(f.height for f in frames) + 4
        heads = [head_row(f) for f in frames] if mode == "head" else None
        out = []
        for i, f in enumerate(frames):
            canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            if mode == "bottom":
                y = h - f.height - 1
            elif mode == "head":
                y = int(round(h / 2 - heads[i]))
            else:
                y = (h - f.height) // 2
            canvas.paste(f, ((w - f.width) // 2, max(0, min(y, h - f.height))), f)
            out.append(canvas)
        frames = out
        for i, f in enumerate(finish_set(frames, 40)):
            f.save(f"{OUT}{name}_{i}.png")
        print(f"{OUT}{name}_0..3.png  {frames[0].width}x{frames[0].height}  "
              f"(logical {round(frames[0].width / RS)}x{round(frames[0].height / RS)})  "
              f"churn {churn(frames)}")


def churn(frames):
    """How much of the silhouette changes between consecutive frames of a cycle.

    The number you cannot get by looking, and the one that says whether a small sprite is
    swimming or flickering. CHAD's jab reads well at 15%; the first baitfish cycle ran
    31-41% on an 11x9 sprite - the two frames with the body curved were 20 px long and the
    two with it straight were 22, so the whole fish pulsed rather than its tail moving.
    """
    a = [np.asarray(f.getchannel("A")) > 128 for f in frames]
    steps = [(a[i] ^ a[(i + 1) % len(a)]).sum() / max(a[i].sum(), 1) for i in range(len(a))]
    return " ".join("%.0f%%" % (100 * s) for s in steps)



if __name__ == "__main__":
    jobs = sys.argv[1:] or ["lounge", "tiger", "tank", "bed", "fire", "fender",
                            "bar", "bardrink", "tankframe", "tenants"]
    for j in jobs:
        {"lounge": build_lounge, "tiger": build_tiger,
         "bar": build_bar, "bardrink": build_bardrink,
         "tankframe": build_tankframe, "tenants": build_tenants,
         "tank": build_tank,
         "bed": build_bed, "fire": build_fire, "fender": build_fender}[j]()
