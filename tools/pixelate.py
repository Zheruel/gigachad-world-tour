#!/usr/bin/env python3
"""Convert AI-generated art into SNES-style game assets.

Downscales to a target pixel size and quantizes to a limited palette so the
result sits naturally next to the hand-authored pixel art.

Usage:
  pixelate.py IN OUT --size WxH [--colors N] [--dither] [--transparent HEX]
"""
import argparse
from PIL import Image


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--size", required=True, help="WxH target pixels, e.g. 320x112")
    p.add_argument("--colors", type=int, default=32)
    p.add_argument("--dither", action="store_true", help="Floyd-Steinberg dithering")
    p.add_argument("--crop", help="crop box before resize: L,T,R,B (fractions 0-1)")
    args = p.parse_args()

    w, h = (int(v) for v in args.size.lower().split("x"))
    img = Image.open(args.src).convert("RGB")

    if args.crop:
        L, T, R, B = (float(v) for v in args.crop.split(","))
        W, H = img.size
        img = img.crop((int(L * W), int(T * H), int(R * W), int(B * H)))

    # Two-step downscale keeps detail readable at tiny sizes.
    img = img.resize((w * 4, h * 4), Image.LANCZOS)
    img = img.resize((w, h), Image.LANCZOS)

    dither = Image.FLOYDSTEINBERG if args.dither else Image.NONE
    img = img.quantize(colors=args.colors, method=Image.MEDIANCUT, dither=dither)
    img = img.convert("RGB")
    img.save(args.dst)
    print(f"saved {args.dst} ({w}x{h}, {args.colors} colors)")


if __name__ == "__main__":
    main()
