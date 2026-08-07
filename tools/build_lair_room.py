#!/usr/bin/env python3
"""Split the lair hub plate into wall and floor assets.

Like process_stage_plate.py, but the hub is one 960-logical-px room rather than a
street, so there is no horizontal stretch and no mirrored floor tile.
"""
import argparse
from PIL import Image, ImageEnhance

RS = 2
WIDTH = 960 * RS          # HUB_WIDTH in js/hub.js
WALL_H = 181 * RS         # FLOOR_Y
FLOOR_H = (270 - 181) * RS

p = argparse.ArgumentParser()
p.add_argument("src", nargs="?", default="assets/ai/lair_room/room_a.png")
p.add_argument("--seam", type=float, default=0.72)
a = p.parse_args()

img = Image.open(a.src).convert("RGB")
w, h = img.size
sy = int(h * a.seam)


def resample(im, size):
    """Two-step downscale; a single resize smears the pixel detail away."""
    return im.resize((size[0] * 3, size[1] * 3), Image.Resampling.LANCZOS) \
             .resize(size, Image.Resampling.LANCZOS)


wall = resample(img.crop((0, 0, w, sy)), (WIDTH, WALL_H))
wall = ImageEnhance.Contrast(ImageEnhance.Color(wall).enhance(1.08)).enhance(1.05)
floor = resample(img.crop((0, sy, w, h)), (WIDTH, FLOOR_H))

# more colours than the street plates get: the neon gradients band at 128.
wall.quantize(colors=160, method=Image.Quantize.MEDIANCUT,
              dither=Image.Dither.NONE).convert("RGB").save("assets/bg_lair_wall.png")
floor.quantize(colors=96, method=Image.Quantize.MEDIANCUT,
               dither=Image.Dither.NONE).convert("RGB").save("assets/bg_lair_floor.png")
print(f"lair: src {a.src}, seam {sy}/{h}, wall {WIDTH}x{WALL_H}, floor {WIDTH}x{FLOOR_H}")
