#!/usr/bin/env python3
"""Process effect, pickup and HUD art into game sprites.

Sized per item from the logical footprint the game draws it at. Sets that animate
(flame, powder, samosa, gas, bird) share one scale and one palette so they do not
pop between frames, exactly like the character pipeline.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
from PIL import Image
from process_char import key_green, subject, hard_alpha, outline, build_palette

RS = 2
SRC = "assets/ai/fx/"
OUT = "assets/fx/"

# name -> (logical height, frame count, outline?)
ITEMS = {
    "pick_chilli": (13, 1, True),
    "pick_lassi": (15, 1, True),
    "pick_chaat": (13, 1, True),
    "samosa": (12, 4, True),
    "powder": (20, 3, False),
    "flame": (18, 4, False),
    "gas": (26, 3, False),
    "bird": (13, 3, True),
    "puddle": (11, 1, False),
    "hud_life": (18, 1, False),

}


def scaled(img, h):
    w = max(1, round(img.width * h / img.height))
    return img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def quantize(img, pal):
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(palette=pal, dither=Image.NONE).convert("RGBA")
    q.putalpha(alpha)
    return q


def process(name):
    h, n, ol = ITEMS[name]
    files = [f"{SRC}{name}.png"] if n == 1 else [f"{SRC}{name}{i}.png" for i in range(1, n + 1)]
    files = [f for f in files if os.path.exists(f)]
    if not files:
        print(f"SKIP {name}")
        return
    cut = [hard_alpha(subject(key_green(Image.open(f), tol=40)), 128) for f in files]

    # one scale for the whole set, measured off frame 1
    factor = (h * RS) / cut[0].height
    frames = []
    for im in cut:
        w2 = max(1, round(im.width * factor))
        h2 = max(1, round(im.height * factor))
        frames.append(im.resize((w2 * 3, h2 * 3), Image.LANCZOS).resize((w2, h2), Image.LANCZOS))
    frames = [hard_alpha(f, 110) for f in frames]
    if ol:
        frames = [outline(f) for f in frames]

    pal = build_palette(frames, 24)
    os.makedirs(OUT, exist_ok=True)
    for i, f in enumerate(frames, 1):
        dst = f"{OUT}{name}.png" if n == 1 else f"{OUT}{name}{i}.png"
        quantize(f, pal).save(dst)
    print(f"{name:<12} {len(frames)} frame(s)  {frames[0].width}x{frames[0].height}"
          f"  (logical {round(frames[0].width / RS)}x{h})")


if __name__ == "__main__":
    for k in (sys.argv[1:] or ITEMS):
        process(k)
