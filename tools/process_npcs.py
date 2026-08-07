#!/usr/bin/env python3
"""Process background-actor sprites so they belong in the street.

Reviewing the actors against the real plate turned up four faults, all of them here
rather than in the placement:

  1. The old version boosted saturation 1.35x and contrast 1.12x, because the sprites
     looked bleached when viewed in isolation. Against a dark graded backdrop that is
     exactly backwards - it pushed them further from the plate. They are now graded
     ONTO the plate's own exposure and light by tone.match_tone.
  2. The set was scaled by a factor measured off frame 1, then any frame that came out
     taller was clamped - which changed its aspect ratio. That was the barber's 78 ->
     83.5px height pop. One factor now comes off the median frame, and nothing is
     clamped.
  3. Frames were centred on their bounding box, so an extended arm shifted the whole
     body. Same class of bug as the walk waddle. They are now centred on the part of
     the body the loop holds still - see body_centre.
  4. Every actor was one size regardless of depth. A man behind the kerb and a man
     walking the street are at different distances and cannot be the same height.

A kind's loop frames and its react frames are processed as ONE family - one scale
factor, one palette - so an actor never changes size or colour when it reacts.

  process_npcs.py             process everything
  process_npcs.py --check     just report, touch nothing
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline, build_palette
from tone import band_stats, match_tone, report

RS = 2
SRC = "assets/ai/npc/"
OUT = "assets/npc/"
WALL = "assets/bg_delhi_wall.png"
FLOOR = "assets/bg_delhi_floor.png"
HERO = 96                      # CHAD's logical height, the scale everything reads against

# Actors that travel. Everything else is drawn with its feet planted, which changes
# where a frame should be registered from - see body_centre.
WALKERS = {"porter", "cow", "rick"}

# Reviewed frame by frame and accepted, with the reason. A flag nobody has looked at
# is a bug; a flag somebody looked at and left is a note, and it should say so rather
# than being silenced by moving the threshold until it goes away.
NOTED = {
    "chai": "the stream of tea falls through the lower band - that is the animation",
    "porter": "a walk cycle, and the legs are the only thing moving",
}


def load_meta():
    """Read KIND_META out of js/crowd.js.

    The size an actor is baked to and the size the lab checks it against have to be
    the same number. Keeping a copy here would let them drift silently, and a drift
    of a few pixels is exactly the kind of thing nobody notices until every actor
    looks subtly wrong, so the game's own table is the single source.
    """
    src = open("js/crowd.js").read()
    block = src[src.index("export const KIND_META"):src.index("export const PLANES")]
    kinds = {}
    for m in re.finditer(
            r"(\w+):\s*\{\s*plane:\s*'(\w+)',\s*pose:\s*([\d.]+),\s*band:\s*'(\w+)'", block):
        kinds[m.group(1)] = (m.group(2), float(m.group(3)), m.group(4))
    planes = dict(re.findall(r"(\w+):\s*([\d.]+)",
                             re.search(r"PLANES = \{([^}]*)\}", src).group(1)))
    return kinds, {k: float(v) for k, v in planes.items()}


KINDS, PLANES = load_meta()


def logical_height(kind):
    plane, frac, _ = KINDS[kind]
    return round(HERO * PLANES[plane] * frac)


def bands():
    # The band a body is actually seen against: the shopfronts for anything standing,
    # the road tile for anything lying on it.
    return {
        "wall": band_stats(WALL, 100 * RS, 181 * RS),
        "floor": band_stats(FLOOR, 0, 60 * RS),
    }


def lower_delta(a, b):
    """Fraction of the lower body that changes between two frames.

    This is the measure that diagnosed CHAD's walk, and it is the honest one here too.
    Trying to score an actor by how much its drawn HEIGHT changes cannot separate a
    size pop from a raised arm, and every rule for finding the head has to be retuned
    between a standing man and one sitting cross legged. It is also chasing a defect
    that no longer exists: within a sheet the generator draws every pose at one scale,
    and one factor is now applied per sheet, so a size pop is structurally impossible.

    What is still worth asking is whether the parts that are supposed to hold still
    do. Every one of these loops is drawn with the feet planted, so for anything but a
    walker this should be close to zero.
    """
    def lower(im):
        m = np.asarray(im.convert("RGBA"))[..., 3] > 16
        return m[int(m.shape[0] * 0.55):]

    la, lb = lower(a), lower(b)
    # Best of a one-pixel alignment. Rescaling a sheet lands a silhouette half a pixel
    # either way, and a straight XOR then reports the resulting outline ring as motion -
    # on a tall thin figure the perimeter is most of the lower body, so a man whose
    # legs are pixel-identical inside scored 0.27. Allowing a 1px shift asks the
    # question that actually matters: does the SHAPE change, or has it just moved?
    best = 1.0
    pad = np.pad(lb, 1)
    for dy in (0, 1, 2):
        for dx in (0, 1, 2):
            sb = pad[dy:dy + la.shape[0], dx:dx + la.shape[1]]
            union = (la | sb).sum()
            if union:
                best = min(best, float((la ^ sb).sum() / union))
    return best


def body_centre(im, walker=False):
    """Horizontal centroid of whichever part of this actor is meant to hold still.

    The full bounding box moves whenever a limb extends - the chai wallah's arm alone
    shifted him 3 logical px - so registration is taken from a band, not the box.
    Which band depends on the loop. CHAD's walk had to be anchored on the torso
    because his legs swing under him; these stall loops are the exact opposite, drawn
    so the feet never move while the arms work, so their base is the stable mass.
    Only the actors that actually travel get the torso anchor.
    """
    a = np.asarray(im)
    m = a[..., 3] > 16
    ys = np.nonzero(m.any(axis=1))[0]
    if not len(ys):
        return im.width / 2
    top, bot = ys.min(), ys.max()
    span = max(1, bot - top)
    band = (m[top:top + max(1, int(span * 0.42))] if walker
            else m[bot - max(1, int(span * 0.22)):bot + 1])
    xs = np.nonzero(band)[1]
    return xs.mean() if len(xs) else im.width / 2


def frames_of(kind, react=False):
    out, i = [], 1
    tag = "_r" if react else ""
    while os.path.exists(f"{SRC}{kind}{tag}{i}.png"):
        out.append(f"{SRC}{kind}{tag}{i}.png")
        i += 1
    return out


def scaled(im, factor):
    """Two-step downscale; a single resize smears the detail that reads as pixel art."""
    w = max(1, round(im.width * factor))
    h = max(1, round(im.height * factor))
    return im.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def process(kind, band, check=False):
    loop, react = frames_of(kind), frames_of(kind, True)
    if not loop:
        print(f"SKIP {kind} (no frames)")
        return
    h = logical_height(kind) * RS

    def to_size(files):
        """Scale a sheet's frames so the actor's BODY lands at h.

        Measured off the body rather than any single frame's bounding box - the chai
        wallah lifts his pot well above his own head - and off the median rather than
        one frame, so a stray outlier cannot set the size. Nothing is clamped
        afterwards: clamping a frame that came out taller is what changed its aspect
        ratio and made the barber's height pop.

        The loop and the react pose come off different sheets, which the generator
        does not draw at the same size, so each sheet gets its own factor onto the
        same target. That is what stops an actor resizing the moment it flinches.
        """
        if not files:
            return []
        ims = [hard_alpha(subject(key_green(Image.open(f), tol=40)), 128) for f in files]
        # the MEDIAN frame height, not the tallest: one frame where the chai wallah
        # holds his pot above his head must not shrink the whole man to fit it
        ref = float(np.median([im.height for im in ims]))
        return [scaled(im, h / ref) for im in ims]

    cut = to_size(loop) + to_size(react)

    graded = [match_tone(im, band) for im in cut]
    finished = [outline(hard_alpha(im, 110)) for im in graded]
    pal = build_palette(finished, 32)

    if check:
        for i, im in enumerate(finished, 1):
            tag = f"{kind}{i}" if i <= len(loop) else f"{kind}_r{i - len(loop)}"
            print("  " + report(im, band, tag))
        return finished

    os.makedirs(OUT, exist_ok=True)
    maxw = max(im.width for im in finished)
    canvas_h = max(im.height for im in finished)
    for i, im in enumerate(finished):
        canvas = Image.new("RGBA", (maxw + 2, canvas_h), (0, 0, 0, 0))
        # centred on the body, not the bounding box, and sharing one ground line
        dx = round((maxw + 2) / 2 - body_centre(im, kind in WALKERS))
        canvas.paste(im, (max(0, min(maxw + 2 - im.width, dx)), canvas_h - im.height), im)
        alpha = canvas.getchannel("A")
        rgb = Image.new("RGB", canvas.size, (0, 0, 0))
        rgb.paste(canvas.convert("RGB"), (0, 0), alpha)
        q = rgb.quantize(palette=pal, dither=Image.NONE).convert("RGBA")
        q.putalpha(alpha)
        name = f"{kind}{i + 1}" if i < len(loop) else f"{kind}_r{i - len(loop) + 1}"
        q.save(f"{OUT}{name}.png")
    print(f"{kind:<9} {len(loop)}+{len(react)}r  {maxw + 2}x{canvas_h}  "
          f"(logical {round((maxw + 2) / RS)}x{round(canvas_h / RS)}, plane {KINDS[kind][0]})")
    return finished


def stability(kind):
    """Does anything move between frames that should not?"""
    ims = [Image.open(f"{OUT}{kind}{i + 1}.png").convert("RGBA")
           for i in range(len(frames_of(kind)))
           if os.path.exists(f"{OUT}{kind}{i + 1}.png")]
    if len(ims) < 2:
        return None
    walker = kind in WALKERS
    cs = [body_centre(im, walker) for im in ims]
    drift = max(abs(cs[i] - cs[i - 1]) for i in range(1, len(cs))) / RS
    legs = max(lower_delta(ims[i - 1], ims[i]) for i in range(1, len(ims)))
    return legs, drift


if __name__ == "__main__":
    check = "--check" in sys.argv
    names = [a for a in sys.argv[1:] if not a.startswith("--")] or list(KINDS)
    bs = bands()
    for k in names:
        plane, _, band = KINDS[k]
        print(f"\n{k}  plane={plane}  band={band}  target height {logical_height(k)}px")
        process(k, bs[band], check)
        s = stability(k)
        if s:
            legs, drift = s
            # A walker's legs are meant to change; a stall holder's are not. 0.20 is
            # set against the benchmark from CHAD's animation work, where his best
            # hand-checked idle measured 0.18 - a cap below the known-good figure only
            # produces flags nobody can act on.
            cap = 0.55 if k in WALKERS else 0.20
            over = legs > cap or drift > 2
            flag = "" if not over else ("   <-- " + NOTED[k] if k in NOTED else "   <-- moves")
            print(f"  stability: lower body {legs:.2f} (cap {cap:.2f})  "
                  f"drift {drift:.1f}px{flag}")
