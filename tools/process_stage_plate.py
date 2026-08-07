#!/usr/bin/env python3
"""Split an ImageGen stage plate into natural-seam wall and looping floor assets."""
import argparse
from PIL import Image, ImageEnhance

p = argparse.ArgumentParser()
p.add_argument("src")
p.add_argument("name")
p.add_argument("--seam", type=float, default=.72)
a = p.parse_args()
img = Image.open(a.src).convert("RGB")
w, h = img.size
sy = int(h * a.seam)
wall = img.crop((0, 0, w, sy)).resize((3584 * 3, 362 * 3), Image.Resampling.LANCZOS).resize((3584, 362), Image.Resampling.LANCZOS)
wall = ImageEnhance.Contrast(ImageEnhance.Color(wall).enhance(1.08)).enhance(1.05)
floor_src = img.crop((0, sy, w, h)).resize((960, 178), Image.Resampling.LANCZOS)
floor = Image.new("RGB", (1920, 178))
floor.paste(floor_src, (0, 0))
floor.paste(floor_src.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (960, 0))
wall.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB").save(f"assets/bg_{a.name}_wall.png")
floor.quantize(colors=72, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB").save(f"assets/bg_{a.name}_floor.png")
print(f"{a.name}: seam {sy}/{h}, wall 3584x362, floor 1920x178")
