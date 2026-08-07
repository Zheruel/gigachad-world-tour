#!/usr/bin/env python3
"""Turn a character's raw AI frames into a consistent game sprite sheet.

Per-frame processing (what process_frame.py did) makes every pose a different
size and a different palette, which reads as amateur next to a real SNES sheet.
This processes a whole character at once:

  * chroma-key + despill the green screen, hard alpha (no fringe)
  * measure the reference pose once, then scale EVERY frame by that same
    factor, so the character never grows or shrinks between poses
  * bottom-anchor each frame on a canvas of the character's fixed height
  * quantize every frame against ONE shared palette built from all of them
  * keep the natural silhouette edge (no artificial contour)

Usage:
  process_char.py CHAR --height 48 [--ref idle] [--colors 22] [--src-prefix hero]
"""
import argparse
import glob
import os
from PIL import Image, ImageFilter

SRC_DIR = "assets/ai/frames/"
OUT_DIR = "assets/frames/"
OUTLINE = (26, 16, 22)


def key_green(img, tol=40):
    img = img.convert("RGBA")
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if g > 90 and g > r + tol and g > b + tol:
                px[x, y] = (0, 0, 0, 0)
            elif a and g > r and g > b:  # despill edge pixels
                px[x, y] = (r, max(r, b), b, a)
    return img


def subject(img):
    bbox = img.getchannel("A").getbbox()
    return img.crop(bbox) if bbox else img


def hard_alpha(img, cut=128):
    a = img.getchannel("A").point(lambda v: 255 if v >= cut else 0)
    img.putalpha(a)
    return img


def scaled(img, factor):
    w = max(1, round(img.width * factor))
    h = max(1, round(img.height * factor))
    # two-step downscale keeps detail readable at sprite sizes
    return img.resize((w * 3, h * 3), Image.LANCZOS).resize((w, h), Image.LANCZOS)


def outline(img, colour=OUTLINE):
    """Wrap the opaque silhouette in a 1px dark border."""
    a = img.getchannel("A")
    grown = a.filter(ImageFilter.MaxFilter(3))
    ring = Image.eval(grown, lambda v: 255 if v > 0 else 0)
    ring = Image.composite(Image.new("L", img.size, 0), ring, a)
    out = Image.new("RGBA", img.size, (0, 0, 0, 0))
    out.paste(Image.new("RGBA", img.size, colour + (255,)), (0, 0), ring)
    out.paste(img, (0, 0), a)
    return out


def build_palette(frames, colors):
    strip = Image.new("RGB", (sum(f.width for f in frames), max(f.height for f in frames)), (0, 0, 0))
    x = 0
    for f in frames:
        bg = Image.new("RGB", f.size, (0, 0, 0))
        bg.paste(f.convert("RGB"), (0, 0), f.getchannel("A"))
        strip.paste(bg, (x, 0))
        x += f.width
    return strip.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("char")
    p.add_argument("--height", type=int, required=True, help="canvas height = the game's HEIGHTS entry")
    p.add_argument("--fill", type=float, default=0.94, help="fraction of the canvas the reference pose occupies")
    p.add_argument("--ref", default="idle")
    p.add_argument("--colors", type=int, default=22)
    p.add_argument("--src-prefix", default=None)
    p.add_argument("--out-prefix", default=None)
    p.add_argument("--outline", action="store_true", help="legacy opt-in contour")
    p.add_argument("--no-outline", action="store_true", help="accepted for older build scripts; now the default")
    p.add_argument("--src-dir", default=SRC_DIR, help="where the raw AI frames live")
    args = p.parse_args()

    src_prefix = args.src_prefix or args.char
    out_prefix = args.out_prefix or args.char
    paths = sorted(glob.glob(f"{args.src_dir}{src_prefix}_*.png"))
    if not paths:
        raise SystemExit(f"no frames for {src_prefix}")

    keyed = {}
    for path in paths:
        name = os.path.basename(path)[len(src_prefix) + 1:-4]
        keyed[name] = hard_alpha(subject(key_green(Image.open(path))))

    ref = keyed.get(args.ref) or keyed[sorted(keyed)[0]]
    factor = (args.height * args.fill) / ref.height

    scaled_frames = {}
    for name, img in keyed.items():
        s = scaled(img, factor)
        # a pose wider than it is tall (knockdowns, flying kicks) can overflow the
        # canvas width; that is fine, we only clamp the height
        if s.height > args.height:
            s = scaled(img, factor * (args.height / s.height))
        scaled_frames[name] = hard_alpha(s)

    if args.outline:
        scaled_frames = {k: outline(v) for k, v in scaled_frames.items()}

    pal_img = build_palette(list(scaled_frames.values()), args.colors)
    os.makedirs(OUT_DIR, exist_ok=True)
    for name, img in scaled_frames.items():
        canvas = Image.new("RGBA", (img.width + 2, args.height), (0, 0, 0, 0))
        canvas.paste(img, (1, args.height - 3 - img.height), img)
        rgb = Image.new("RGB", canvas.size, (0, 0, 0))
        rgb.paste(canvas.convert("RGB"), (0, 0), canvas.getchannel("A"))
        q = rgb.quantize(palette=pal_img, dither=Image.NONE).convert("RGB")
        out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
        out.paste(q, (0, 0))
        out.putalpha(canvas.getchannel("A"))
        out.save(f"{OUT_DIR}{out_prefix}_{name}.png")
    print(f"{out_prefix}: {len(scaled_frames)} frames, scale {factor:.3f}, "
          f"ref {args.ref} -> {round(ref.height * factor)}px of {args.height}px canvas")


if __name__ == "__main__":
    main()
