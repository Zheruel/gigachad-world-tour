#!/usr/bin/env python3
"""Turn raw prop generations into game-ready sprites.

Same treatment as the character pipeline (chroma key, hard alpha, outline,
quantize) but sized per prop from the logical footprint in js/props.js, and
scaled by HEIGHT so a prop always sits at the right size against a fighter.
Output is at RS device pixels per logical pixel.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline

RS = 2
SRC = "assets/ai/props/"
OUT = "assets/props/"

# name -> (logical width, logical height) from PROP_TYPES in js/props.js
SIZES = {
    "crate": (30, 32),
    "matka": (24, 26),
    "tyres": (32, 34),
    "table": (44, 30),
    "sign": (40, 22),
    "rickshaw": (96, 80),
    "cart": (58, 44),
    "bag": (30, 84),
}

# The lair fixtures get the same treatment but are not breakable props, so they live
# in their own directory rather than PROP_TYPES. Mirror of LAIR_ART in js/hub.js.
LAIR_SRC = "assets/ai/lair/"
LAIR_OUT = "assets/lair/"
LAIR = {
    "worldmap": (85, 48),
    "arcade": (34, 68),
    "hifi": (28, 60),
    # The gym in front of the glass. The two usable stations are not here - they are
    # sprite SETS and tools/build_lair_extras.py builds them. These are the kit standing
    # between them. World scale is ~50 logical px per metre.
    "gym_plates": (34, 56),
    "gym_kettles": (56, 26),
    # the widened room: a cigar cabinet and the painting
    "humidor": (36, 88),
    "portrait": (106, 84),
    # exactly the run from the ceiling bracket to the bag's collar, so it never tiles
    "bag_chain": (10, 100),
    # One relic per boss, standing in the alcove. Every bay is ~32 logical of headroom
    # (SHELVES in js/hub.js is measured off the plate's glass shelf lines), so these
    # clear it with a little air above.
    "relic_raja": (22, 26),
    "relic_mirchi": (22, 26),
    "relic_refund": (20, 26),
    "relic_yadav": (22, 26),
    "relic_rana": (26, 26),
    "bar_stools": (44, 40),
    "gloves": (20, 30),
    # the master suite. The bed itself is a strip and comes from build_lair_extras.py.
    "bed_wardrobe": (60, 96),
    "bed_nightstand": (44, 40),
    "bed_rug": (126, 54),   # sized by HEIGHT here; the width follows the art
}


def scaled(img, h):
    """Two-step downscale keeps the detail that a single resize smears away."""
    w = max(1, round(img.width * h / img.height))
    return img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def process(name, broken, sizes=SIZES, src_dir=SRC, out_dir=OUT):
    src = src_dir + name + ("_b" if broken else "") + ".png"
    if not os.path.exists(src):
        print(f"SKIP {src}")
        return
    lw, lh = sizes[name]
    # a broken prop is rubble: it sits lower and spreads wider
    th = int(lh * (0.45 if broken else 1.0) * RS)
    img = hard_alpha(subject(key_green(Image.open(src), tol=40)), 128)
    img = scaled(img, th)
    img = hard_alpha(img, 110)
    img = outline(img)
    # MEDIANCUT only takes RGB, so quantize the colour and re-attach the alpha
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(colors=40, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    q.putalpha(alpha)
    os.makedirs(out_dir, exist_ok=True)
    dst = out_dir + name + ("_b" if broken else "") + ".png"
    q.save(dst)
    print(f"{dst:<34} {q.width}x{q.height}  (logical {round(q.width / RS)}x{round(q.height / RS)})")


if __name__ == "__main__":
    names = sys.argv[1:] or list(SIZES) + list(LAIR)
    for n in names:
        if n in LAIR:
            process(n, False, LAIR, LAIR_SRC, LAIR_OUT)
        else:
            process(n, False)
            process(n, True)
