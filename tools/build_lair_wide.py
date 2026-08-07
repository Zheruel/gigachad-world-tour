#!/usr/bin/env python3
"""Stitch THE LAIR's three panels into one 1440-logical-px room, and key the glass out.

Replaces build_lair_room.py, which took a single generation and stretched it across the
whole room. Modelled on build_bazaar_v2.py rather than build_bgs.py: build_bgs cycles
and mirrors its panels to fill a requested width, which is right for a street you run
past and wrong for a room, where it would duplicate the trophy alcove. Here each panel
appears exactly once, in order.

Two things the room needs that a street does not:

  * The window is generated as flat chroma green and keyed to transparent, so the
    skyline can live on its own parallax layer behind the plate. Nothing behind glass
    can move while the view is painted into the wall.
  * Exposure is matched edge-locally (feather_from_previous) rather than by pulling
    every panel onto one global mean. The room is deliberately lit warm on the left and
    cold at the window; a global match would average that away.

The city behind the glass is built here too, as two layers at different parallax. A
whole 1536x1024 generation squashed into a 1920x362 strip is a 3.5x aspect distortion,
which is what made the first city plate look squashed; sky_band() crops the band that
scales uniformly instead.

  ./.venv/bin/python tools/build_lair_wide.py [--seams A B C] [--near-centre F]
"""
import argparse
import os
import sys

sys.path.insert(0, os.path.dirname(__file__))
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageStat

RS = 2
PANELS = ("assets/ai/lair_room5/panel_a.png",
          "assets/ai/lair_room5/panel_b.png",
          "assets/ai/lair_room5/panel_c.png")
SKY_DIR = "assets/ai/lair_sky/"

VIEW_W = 480 * RS            # each panel covers 480 logical px
OVERLAP = 96                 # device px of cross-fade, trimmed to VIEW_W after
SOURCE_VIEW_W = VIEW_W + OVERLAP
WALL_H = 181 * RS            # FLOOR_Y
FLOOR_H = (270 - 181) * RS


def resample(im, size):
    """Two-step downscale; a single resize smears the pixel detail away."""
    return im.resize((size[0] * 3, size[1] * 3), Image.Resampling.LANCZOS) \
             .resize(size, Image.Resampling.LANCZOS)


def finish(im):
    """Recover the bite the downscale costs without cranking saturation."""
    im = ImageEnhance.Color(im).enhance(1.06)
    im = ImageEnhance.Contrast(im).enhance(1.04)
    return im.filter(ImageFilter.UnsharpMask(radius=0.65, percent=45, threshold=3))


def feather_from_previous(image, previous, width):
    """Ease an exposure step at a join without cross-dissolving the geometry."""
    sample = 24
    prev_mean = ImageStat.Stat(previous.crop(
        (previous.width - sample, 0, previous.width, previous.height))).mean
    cur_mean = ImageStat.Stat(image.crop((0, 0, sample, image.height))).mean
    offsets = [max(-42, min(42, round(a - b))) for a, b in zip(prev_mean, cur_mean)]
    channels = [c.point(lambda v, s=o: max(0, min(255, v + s)))
                for c, o in zip(image.split(), offsets)]
    adjusted = Image.merge("RGB", channels)
    ramp = Image.new("L", (image.width, 1), 0)
    ramp.putdata([round(255 * (1 - x / max(1, width - 1))) if x < width else 0
                  for x in range(image.width)])
    return Image.composite(adjusted, image, ramp.resize(image.size))


def stitch(parts, height):
    """Cross-fade neighbouring panels inside a real overlap, then trim to exact width."""
    result = Image.new("RGB", (VIEW_W * len(parts) + OVERLAP, height))
    result.paste(parts[0], (0, 0))
    ramp = Image.new("L", (SOURCE_VIEW_W, 1), 255)
    ramp.putdata([round(255 * x / max(1, OVERLAP - 1)) if x < OVERLAP else 255
                  for x in range(SOURCE_VIEW_W)])
    mask = ramp.resize((SOURCE_VIEW_W, height))
    for i, part in enumerate(parts[1:], 1):
        result.paste(part, (i * VIEW_W, 0), mask)
    inset = OVERLAP // 2
    return result.crop((inset, 0, inset + VIEW_W * len(parts), height))


def key_glass(img):
    """Punch the chroma-green window out of the finished wall.

    Keyed after the stitch, not per panel, so a link that straddles a join cannot end
    up half transparent. The despill matters: green fringing on the black mullions is
    the one artefact that would show against the skyline behind them.
    """
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    green = (g > 90) & (g > r + 40) & (g > b + 40)
    out = np.dstack([a, np.where(green, 0, 255)]).astype(np.uint8)
    # despill the edge pixels that survived
    spill = ~green & (g > r) & (g > b)
    out[..., 1] = np.where(spill, np.maximum(r, b), out[..., 1])
    print(f"  keyed {green.mean() * 100:.1f}% of the wall to glass")
    return Image.fromarray(out, "RGBA")


def fill_glass_reflection(img):
    """The green window reflects onto the polished floor, and the floor cannot be
    transparent - there is nothing behind it. Replace the green with the granite from
    the same row; lairAmbient paints the city's real reflection back at runtime."""
    a = np.asarray(img.convert("RGB"), dtype=np.int16)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    # The reflection in polished granite is a long way down from the source green -
    # [0,54,0] and darker - so this tests green *dominance*, not brightness. Cyan neon
    # has g close to b and the wood has r above g, so neither is caught.
    green = (g > r + 12) & (g > b + 12) & (g > 12)
    if not green.any():
        return img
    # take the anti-aliased edge with it
    grown = Image.fromarray((green * 255).astype(np.uint8), "L").filter(ImageFilter.MaxFilter(3))
    green = np.asarray(grown) > 0
    out = a.copy()
    for y in range(a.shape[0]):
        row, mask = a[y], green[y]
        if not mask.any():
            continue
        clean = row[~mask]
        fill = clean.mean(0) if len(clean) else np.array([20, 16, 26])
        out[y][mask] = fill
    print(f"  filled {green.mean() * 100:.1f}% of the floor where the glass reflected")
    return Image.fromarray(out.astype(np.uint8), "RGB")


def rebuild_window(wall, floor):
    """Repaint the window as five tall bays instead of the generated 9x4 cage.

    The generator draws the mullions at whatever pitch it feels like, panel B's grid does
    not line up with panel C's where they meet, and the bars came out 5 logical px thick -
    together that is a cage in front of the one thing the room is built around. The
    opening itself is already a clean rectangle of alpha, so the grid inside it is pure
    geometry and is better painted than generated.

    The floor's reflection of the old mullions is repainted at the new pitch too, or the
    granite goes on reflecting a window that is no longer there.
    """
    a = np.asarray(wall).copy()
    hole = a[..., 3] == 0
    cols = np.flatnonzero(hole.any(0))
    x0, x1 = int(cols[0]), int(cols[-1]) + 1
    # Median, not min: one column near the panel B join has a fragment reaching higher
    # than the real head, and taking the min would drop the head rail 13px.
    tops = [int(np.flatnonzero(hole[:, x])[0]) for x in range(x0, x1) if hole[:, x].any()]
    y0 = int(np.median(tops))

    STEEL, LIT, STEEL_FILL = (8, 8, 11, 255), (26, 26, 34, 255), (8, 8, 11, 255)
    JAMB, HEAD, POST, BAYS = 4 * RS, 5 * RS, 3 * RS, 5

    a[y0:, x0:x1] = 0
    # panel B leaves a couple of stray transparent fragments above the head; they were
    # part of its own window and are holes in the wall once the head rail moves.
    above = a[:y0, x0:x1]
    above[above[..., 3] == 0] = STEEL_FILL
    bars = [(x0, x0 + JAMB), (x1 - JAMB, x1)]
    inner0, inner1 = x0 + JAMB, x1 - JAMB
    for i in range(1, BAYS):
        c = inner0 + round((inner1 - inner0) * i / BAYS)
        bars.append((c - POST // 2, c - POST // 2 + POST))
    for bx0, bx1 in bars:
        a[y0:, bx0:bx1] = STEEL
        a[y0:, bx0:bx0 + 1] = LIT      # one lit edge, so a post is not a flat black slab
    a[y0:y0 + HEAD, x0:x1] = STEEL
    a[y0:y0 + 1, x0:x1] = LIT
    print(f"  window: {BAYS} bays across logical {x0 // RS}-{x1 // RS}, head at y {y0 // RS}")

    # ---- and the same posts reflected in the granite ----
    f = np.asarray(floor).copy()
    depth = 96          # how far down the floor the old streaks reach before they fade out
    band = f[:depth, x0:x1].astype(int)
    # erase: every column becomes the median of the 12 either side of it, which is the
    # granite without the streak, then paint the new posts back in.
    med = np.median(np.stack([np.roll(band, s, axis=1) for s in range(-12, 13)]), axis=0)
    f[:depth, x0:x1] = med.astype(np.uint8)
    for bx0, bx1 in bars:
        for y in range(depth):
            t = 1 - y / depth
            row = f[y, bx0:bx1].astype(int)
            f[y, bx0:bx1] = (row * (1 - 0.55 * t * t)).astype(np.uint8)
    return Image.fromarray(a, "RGBA"), Image.fromarray(f, floor.mode)


def quantized(img, colors):
    """MEDIANCUT only takes RGB, so quantize the colour and re-attach the alpha."""
    if img.mode != "RGBA":
        return img.quantize(colors=colors, method=Image.Quantize.MEDIANCUT,
                            dither=Image.Dither.NONE).convert("RGB")
    alpha = img.getchannel("A")
    rgb = Image.new("RGB", img.size, (0, 0, 0))
    rgb.paste(img.convert("RGB"), (0, 0), alpha)
    q = rgb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT,
                     dither=Image.Dither.NONE).convert("RGBA")
    q.putalpha(alpha)
    return q


def build_room(seams, key=True):
    walls, floors = [], []
    for name, seam in zip(PANELS, seams):
        src = Image.open(name).convert("RGB")
        w, h = src.size
        sy = int(h * seam)
        wall = finish(resample(src.crop((0, 0, w, sy)), (SOURCE_VIEW_W, WALL_H)))
        floor = finish(resample(src.crop((0, sy, w, h)), (SOURCE_VIEW_W, FLOOR_H)))
        if walls:
            wall = feather_from_previous(wall, walls[-1], 90)
            floor = feather_from_previous(floor, floors[-1], 190)
        walls.append(wall)
        floors.append(floor)

    wall = stitch(walls, WALL_H)
    floor = stitch(floors, FLOOR_H)
    if key:
        wall = key_glass(wall)
        floor = fill_glass_reflection(floor)
        wall, floor = rebuild_window(wall, floor)
    quantized(wall, 160).save("assets/bg_lair_wall.png")
    quantized(floor, 96).save("assets/bg_lair_floor.png")
    print(f"lair: wall {wall.width}x{WALL_H}, floor {floor.width}x{FLOOR_H} "
          f"({wall.width // RS} logical - HUB_WIDTH in js/hub.js)")


def sky_band(src, centre=0.5):
    """Crop the band that scales to VIEW_W x WALL_H with NO aspect distortion.

    Squashing a whole 1536x1024 generation into a 1920x362 strip is a 3.5x distortion,
    which is what made the first city plate look squashed and mushy. The band height is
    derived from the output aspect instead, so the downscale is uniform and the detail
    survives it.
    """
    img = Image.open(src).convert("RGB")
    band_h = min(img.height, round(img.width * WALL_H / VIEW_W))
    top = max(0, min(img.height - band_h, round(img.height * centre - band_h / 2)))
    return resample(img.crop((0, top, img.width, top + band_h)), (VIEW_W, WALL_H))


def build_sky(far_centre=0.5, near_centre=0.46):
    """FAR is two panels stitched; NEAR is one panel with the sky keyed out of it, so
    the far city shows through and the two move at different speeds."""
    far = [f"{SKY_DIR}far_a.png", f"{SKY_DIR}far_b.png"]
    if all(os.path.exists(p) for p in far):
        parts = [finish(sky_band(p, far_centre)) for p in far]
        parts[1] = feather_from_previous(parts[1], parts[0], 120)
        # stitch() expects SOURCE_VIEW_W-wide parts; pad each by the overlap
        parts = [p.resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS) for p in parts]
        quantized(stitch(parts, WALL_H), 128).save("assets/bg_lair_sky_far.png")
        print(f"sky far:  {VIEW_W * 2}x{WALL_H} ({VIEW_W * 2 // RS} logical, tiles)")

    near_src = f"{SKY_DIR}near.png"
    if os.path.exists(near_src):
        near = key_glass(finish(sky_band(near_src, near_centre)))
        quantized(near, 96).save("assets/bg_lair_sky_near.png")
        print(f"sky near: {VIEW_W}x{WALL_H} ({VIEW_W // RS} logical, tiles)")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--seams", nargs=3, type=float, default=[0.74, 0.74, 0.74],
                   help="floor seam per panel, as a fraction of that panel's height")
    p.add_argument("--far-centre", type=float, default=0.5,
                   help="where in the far city generation the visible band sits")
    # 0.46 lands the near layer's roof line low in the band. Centre it and the rooftops
    # sit half way up the glass and hide the far city, which is the view.
    p.add_argument("--near-centre", type=float, default=0.46)
    p.add_argument("--no-key", action="store_true",
                   help="skip the glass key (the fallback if a panel's window is not green)")
    a = p.parse_args()
    p2 = None
    build_room(a.seams, key=not a.no_key)
    build_sky(a.far_centre, a.near_centre)
