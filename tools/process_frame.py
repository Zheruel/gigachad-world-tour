#!/usr/bin/env python3
"""Process an AI-generated frame into a game sprite.

Chroma-keys the green background to transparency, crops to the subject,
resizes to the target height with feet anchored at the bottom, and
quantizes the palette.

Usage:
  process_frame.py IN OUT --height 48 [--maxw 40] [--colors 24]
"""
import argparse
from PIL import Image


def key_green(img, tol=90):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            # green dominant -> background
            if g > 90 and g > r + 40 and g > b + 40:
                px[x, y] = (0, 0, 0, 0)
    return img


def autocrop(img):
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def despill(img):
    # reduce green spill on edge pixels
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a and g > r and g > b:
                px[x, y] = (r, max(r, b), b, a)
    return img


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--height", type=int, default=48)
    p.add_argument("--maxw", type=int, default=48)
    p.add_argument("--colors", type=int, default=24)
    args = p.parse_args()

    img = Image.open(args.src)
    img = key_green(img)
    img = despill(img)
    img = autocrop(img)

    w, h = img.size
    scale = args.height / h
    nw = max(1, round(w * scale))
    if nw > args.maxw:  # too wide: rescale to fit width instead
        scale = args.maxw / w
        nw = args.maxw
    nh = max(1, round(h * scale))
    img = img.resize((nw, nh), Image.LANCZOS)

    # feet anchored: canvas is nw wide x target height, image bottom-aligned
    canvas = Image.new("RGBA", (nw, max(nh, args.height)), (0, 0, 0, 0))
    canvas.paste(img, (0, canvas.height - nh), img)

    q = canvas.convert("RGB").quantize(colors=args.colors, method=Image.MEDIANCUT, dither=Image.NONE)
    out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    out.paste(q.convert("RGB"), (0, 0))
    out.putalpha(canvas.getchannel("A"))
    out.save(args.dst)
    print(f"saved {args.dst} ({out.width}x{out.height})")


if __name__ == "__main__":
    main()
