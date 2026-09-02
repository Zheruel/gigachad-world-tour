#!/usr/bin/env python3
"""Blend an inpainted crop back into a stage plate.

The generator reproduces a crop with one thing removed (tools/gen_d1_props.sh inpaint);
it is close but not pixel-identical, so only the masked region is taken from it, feathered,
and the rest of the plate stays exactly as it was. Usage:

  patch_plate.py PLATE INPAINT X Y SIZE X0 Y0 X1 Y1

PLATE is the plate to patch in place, INPAINT the generated square, X/Y/SIZE the crop's
origin and side in plate pixels, and X0..Y1 the mask rectangle in the inpaint's own pixels.
"""
import sys
from PIL import Image, ImageDraw, ImageFilter

plate_path, inpaint_path = sys.argv[1], sys.argv[2]
x, y, size = (int(v) for v in sys.argv[3:6])
mx0, my0, mx1, my1 = (int(v) for v in sys.argv[6:10])
plate = Image.open(plate_path)
mode = plate.mode
rgb = plate.convert("RGB")
inp = Image.open(inpaint_path).convert("RGB")
mask = Image.new("L", inp.size, 0)
ImageDraw.Draw(mask).rectangle((mx0, my0, mx1, my1), fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(18)).resize((size, size), Image.LANCZOS)
inp = inp.resize((size, size), Image.LANCZOS)
region = rgb.crop((x, y, x + size, y + size))
rgb.paste(Image.composite(inp, region, mask), (x, y))
if mode == "P":
    rgb = rgb.quantize(colors=192, method=Image.MEDIANCUT, dither=Image.NONE)
rgb.save(plate_path)
print(f"patched {plate_path} at {x},{y} ({size}px)")
