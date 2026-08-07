#!/usr/bin/env python3
"""Turn the raw foreground generations into the near-camera layer.

Foreground pieces are graded DOWN, not matched. Everything else in the scene is
pulled onto the plate's own exposure so it sits in the world; these have the opposite
job. They are between the camera and the fight, out of the light the street is lit by,
and the eye reads "closer" mostly from them being darker and flatter than the backdrop.
Graded to the same exposure as the wall they would just look like more wall.

Anchors matter here: a piece hanging from the top is positioned by its top edge and a
piece standing at the bottom by its base, which is off the bottom of the screen.
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline
from tone import band_stats, match_tone

RS = 2
SRC = "assets/ai/fg/"
OUT = "assets/fg/"
WALL = "assets/bg_delhi_wall.png"
LAIR_WALL = "assets/bg_lair_wall.png"
# Pieces that belong to THE LAIR rather than the street, so they are graded down from
# the lair's plate. Picked per name rather than passed in: a --wall that applied to a
# whole run once regraded the entire Delhi foreground against the penthouse.
LAIR = {"fg_table", "fg_lamp", "fg_weights"}

# name -> logical height. Widths follow from the art.
SIZES = {
    "wires": 66, "tarp": 60, "garland": 74, "banner": 58,
    "fg_crates": 72, "fg_bike": 58, "fg_bins": 52, "fg_stall": 62,
    "fg_table": 30, "fg_lamp": 62, "fg_weights": 34,
}

# How far below the backdrop each piece sits. The hanging pieces are silhouetted
# against the sky and the standing ones against a lit street, so they need different
# amounts of darkening to read as equally close.
# The lair is lit from behind by a sunset, so its foreground pieces read as close at a
# much smaller drop than a piece silhouetted against a bright Delhi street does.
LIFT = {"wires": 0.34, "tarp": 0.46, "garland": 0.52, "banner": 0.50,
        "fg_table": 0.95, "fg_lamp": 0.88, "fg_weights": 0.92}
DEFAULT_LIFT = 0.58


def process(name, wall=None):
    src = SRC + name + ".png"
    if not os.path.exists(src):
        print(f"SKIP {name}")
        return
    band = band_stats(wall or (LAIR_WALL if name in LAIR else WALL), 100 * RS, 181 * RS)
    h = SIZES[name] * RS
    img = hard_alpha(subject(key_green(Image.open(src), tol=40)), 128)
    w = max(1, round(img.width * h / img.height))
    img = img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)
    img = match_tone(img, band, lift=LIFT.get(name, DEFAULT_LIFT), chroma=0.30, contrast=0.85)
    img = outline(hard_alpha(img, 110))
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(colors=32, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGBA")
    q.putalpha(alpha)
    os.makedirs(OUT, exist_ok=True)
    q.save(f"{OUT}{name}.png")
    print(f"{name:<11} {q.width}x{q.height}  (logical {round(q.width / RS)}x{SIZES[name]})")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("names", nargs="*")
    p.add_argument("--wall", help="override the plate to grade down from")
    a = p.parse_args()
    for n in (a.names or SIZES):
        process(n, a.wall)
