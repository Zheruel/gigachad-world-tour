#!/usr/bin/env python3
"""Crop a HUD portrait out of a green-screen character reference.

Finds the subject by chroma-keying the green background, takes a square around
the head (top of the subject bounding box), and quantizes it to 48x48.

Usage: make_portrait.py REF.png OUT.png [--size 48] [--zoom 1.15]
"""
import argparse
from PIL import Image


def key_green(img):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 90 and g > r + 40 and g > b + 40:
                px[x, y] = (0, 0, 0, 0)
    return img


def main():
    p = argparse.ArgumentParser()
    p.add_argument("src")
    p.add_argument("dst")
    p.add_argument("--size", type=int, default=48)
    p.add_argument("--zoom", type=float, default=1.15)
    p.add_argument("--colors", type=int, default=32)
    p.add_argument("--bg", default="#100a0c")
    args = p.parse_args()

    img = key_green(Image.open(args.src))
    bbox = img.getchannel("A").getbbox()
    if not bbox:
        raise SystemExit("no subject found")
    l, t, r, b = bbox
    head_h = int((b - t) * 0.19 * args.zoom)
    cx = (l + r) // 2
    # search the top rows for the head's own horizontal centre
    px = img.load()
    xs = [x for x in range(l, r) if any(px[x, y][3] > 16 for y in range(t, min(b, t + head_h)))]
    if xs:
        cx = (xs[0] + xs[-1]) // 2
    half = head_h // 2
    box = (cx - half, t - int(head_h * 0.08), cx + half, t - int(head_h * 0.08) + head_h)
    crop = img.crop(box)
    flat = Image.new("RGB", crop.size, args.bg)
    flat.paste(crop, (0, 0), crop)
    flat = flat.resize((args.size * 4, args.size * 4), Image.LANCZOS)
    flat = flat.resize((args.size, args.size), Image.LANCZOS)
    q = flat.quantize(colors=args.colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    q.save(args.dst)
    print(f"saved {args.dst} ({q.width}x{q.height})")


if __name__ == "__main__":
    main()
