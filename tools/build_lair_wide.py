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
          "assets/ai/lair_room5/panel_c.png",
          "assets/ai/lair_room5/panel_d.png")
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
    """Repaint every window in the plate as tall bays instead of the generated cage.

    The generator draws the mullions at whatever pitch it feels like, panel B's grid does
    not line up with panel C's where they meet, and the bars came out 5 logical px thick -
    together that is a cage in front of the one thing the room is built around. The
    opening itself is already a clean rectangle of alpha, so the grid inside it is pure
    geometry and is better painted than generated.

    The floor's reflection of the old mullions is repainted at the new pitch too, or the
    granite goes on reflecting a window that is no longer there.
    """
    a = np.asarray(wall).copy()
    f = np.asarray(floor).copy()
    hole = a[..., 3] == 0
    STEEL, LIT = (8, 8, 11, 255), (26, 26, 34, 255)
    JAMB, HEAD, POST = 4 * RS, 5 * RS, 3 * RS
    BAY_W = 74 * RS       # target bay; the count is rounded from the opening's own width
    openings, bars = [], []

    # One opening per window. The bedroom has its own corner glass, and taking the
    # bounding box of every hole at once - which is what this did when there was only the
    # one - would paint a single window straight across the wall between them.
    #
    # The generated mullions are opaque, so the glass of ONE window already arrives as a
    # dozen separate runs. Anything parted by less than a wall is the same window: merge
    # across gaps under MERGE, split on anything wider.
    MERGE = 60 * RS
    cols = np.flatnonzero(hole.any(0))
    if len(cols):
        for run in np.split(cols, np.flatnonzero(np.diff(cols) > 1) + 1):
            lo, hi = int(run[0]), int(run[-1]) + 1
            if openings and lo - openings[-1][1] < MERGE:
                openings[-1] = (openings[-1][0], hi)
            else:
                openings.append((lo, hi))
        openings = [o for o in openings if o[1] - o[0] > 40 * RS]

    for x0, x1 in openings:
        # Median, not min: a stray fragment at a panel join reaches higher than the real
        # head, and taking the min would drop the head rail 13px.
        tops = [int(np.flatnonzero(hole[:, x])[0]) for x in range(x0, x1) if hole[:, x].any()]
        y0 = int(np.median(tops))
        bays = max(1, round((x1 - x0) / BAY_W))

        a[y0:, x0:x1] = 0
        # a panel leaves stray transparent fragments above the head; they were part of its
        # own window and are holes in the wall once the head rail moves
        above = a[:y0, x0:x1]
        above[above[..., 3] == 0] = STEEL
        mine = [(x0, x0 + JAMB), (x1 - JAMB, x1)]
        inner0, inner1 = x0 + JAMB, x1 - JAMB
        for i in range(1, bays):
            c = inner0 + round((inner1 - inner0) * i / bays)
            mine.append((c - POST // 2, c - POST // 2 + POST))
        for bx0, bx1 in mine:
            a[y0:, bx0:bx1] = STEEL
            a[y0:, bx0:bx0 + 1] = LIT   # one lit edge, so a post is not a flat black slab
        a[y0:y0 + HEAD, x0:x1] = STEEL
        a[y0:y0 + 1, x0:x1] = LIT
        bars += mine
        print(f"  window: {bays} bays across logical {x0 // RS}-{x1 // RS}, head at y {y0 // RS}")

        # ---- and the same posts reflected in the granite ----
        depth = 96      # how far down the floor the old streaks reach before they fade out
        band = f[:depth, x0:x1].astype(int)
        # erase: every column becomes the median of the 12 either side of it, which is the
        # granite without the streak, then paint the new posts back in.
        med = np.median(np.stack([np.roll(band, s, axis=1) for s in range(-12, 13)]), axis=0)
        f[:depth, x0:x1] = med.astype(np.uint8)
        for bx0, bx1 in mine:
            for y in range(depth):
                t = 1 - y / depth
                row = f[y, bx0:bx1].astype(int)
                f[y, bx0:bx1] = (row * (1 - 0.55 * t * t)).astype(np.uint8)

    # the openings are the one thing js/hub.js cannot measure for itself at runtime
    print("  OPENINGS for js/hub.js: "
          + str([[x0 // RS, x1 // RS] for x0, x1 in openings]))
    return Image.fromarray(a, "RGBA"), Image.fromarray(f, floor.mode)


def blank_bay(wall):
    """Erase the picture bay's inset moulding, because the tank now covers most of it.

    The cherub portrait that hung here is gone and the aquarium takes the wall. It does
    not take ALL of it - the humidor stands in the last 60 logical px - so the bay's gold
    inset would otherwise be left as a frame with its left half missing, which reads as
    damage rather than as panelling.

    Filled by iterated dilation from the wood at the edges of each line, NOT by sampling a
    fixed direction: the inset has horizontal lines and vertical ones, and sampling up and
    down (the obvious first try) finds nothing but more gold when the line is vertical.
    """
    # Only the strip that will still be VISIBLE: the tank covers device 282-842 and the
    # humidor stands over 844-956, so everything left of 836 is hidden anyway and is left
    # alone - including the brass picture light, which this would otherwise melt.
    X0, X1, Y0, Y1 = 836, 962, 58, 274
    a = np.asarray(wall).copy()
    region = a[Y0:Y1, X0:X1, :3].astype(float)
    r, g, b = region[..., 0], region[..., 1], region[..., 2]
    hole = (r > 78) & (r > b + 24) & (g > b + 8)
    # the moulding carries a dark shadow line beside it; take that with it or the frame
    # leaves its own outline behind
    grown = hole.copy()
    for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
        grown |= np.roll(np.roll(hole, dy, 0), dx, 1)
    hole = grown
    total = int(hole.sum())
    for _ in range(30):
        if not hole.any():
            break
        # average of the four neighbours that are already wood
        acc = np.zeros_like(region)
        cnt = np.zeros(hole.shape)
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1)):
            sh = np.roll(np.roll(region, dy, 0), dx, 1)
            ok = ~np.roll(np.roll(hole, dy, 0), dx, 1)
            acc += sh * ok[..., None]
            cnt += ok
        fill = hole & (cnt > 0)
        region[fill] = (acc[fill] / cnt[fill][..., None])
        hole = hole & ~fill
    a[Y0:Y1, X0:X1, :3] = region.round().clip(0, 255).astype(np.uint8)
    print(f"  picture bay blanked: {total} moulding px filled from the wood beside them")
    return Image.fromarray(a, "RGBA")


def widen_alcove(wall):
    """Turn the trophy bay and the dead bay next to it into ONE long lit niche.

    An earlier pass cloned the niche into the bay next door, which gave two niches with a
    pilaster between them. One unit reads better and a country's relics no longer risk
    being split across the pier - but a niche cannot simply be stretched, because its
    frame mouldings and the bolts on them would stretch with it.

    So it is rebuilt: the frame slices come off the real niche unscaled, and the interior
    is tiled from HALF of the real interior, every other copy mirrored. Mirroring is what
    makes the seams free - a mirrored copy's left edge is the same column of pixels as its
    neighbour's right edge, by construction. The half is then squashed by a few percent so
    a whole number of them fills the run exactly; that is invisible on wood and on soft
    lamp pools, where a partial tile at one end would not be.
    """
    SRC_X0, SRC_X1, Y0, Y1 = 1240, 1510, 52, 348
    DST_X0, DST_X1 = 955, 1497        # the dead bay's left frame to the niche's right one
    # The frame slice has to reach past BOTH mouldings - the outer frame line at 1248 and
    # the inner one at 1260 - or the inner moulding rides along on every tile and reappears
    # as a post standing in the middle of the hall.
    F = 26
    unit = wall.crop((SRC_X0, Y0, SRC_X1, Y1))
    left = unit.crop((0, 0, F, unit.height))
    body = unit.crop((F, 0, unit.width - F, unit.height))
    half = body.crop((0, 0, body.width // 2, body.height))

    run = (DST_X1 - DST_X0) - 2 * F
    n = max(1, round(run / half.width))
    tile_w = run / n
    out = wall.copy()
    out.paste(left, (DST_X0, Y0))
    for i in range(n):
        piece = half if i % 2 == 0 else half.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        x0 = DST_X0 + F + round(i * tile_w)
        x1 = DST_X0 + F + round((i + 1) * tile_w)
        out.paste(piece.resize((x1 - x0, piece.height), Image.Resampling.LANCZOS), (x0, Y0))
    out.paste(left.transpose(Image.Transpose.FLIP_LEFT_RIGHT), (DST_X1 - F, Y0))
    print(f"  trophy hall: logical {DST_X0 / RS:.1f}-{DST_X1 / RS:.1f}, "
          f"{n} tiles squashed {100 * (tile_w / half.width - 1):+.1f}%")
    return out


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
    if len(seams) != len(PANELS):
        seams = (list(seams) + [seams[-1]] * len(PANELS))[:len(PANELS)]
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
    wall = blank_bay(widen_alcove(wall))
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


def stitch_sky(srcs, centre, feather):
    """Band-crop each panel and stitch them into one tiling layer."""
    parts = [finish(sky_band(p, centre)) for p in srcs]
    for i in range(1, len(parts)):
        parts[i] = feather_from_previous(parts[i], parts[i - 1], feather)
    # stitch() expects SOURCE_VIEW_W-wide parts; pad each by the overlap
    parts = [p.resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS) for p in parts]
    return stitch(parts, WALL_H)


def build_sky(far_centre=0.5, near_centre=0.46):
    """Both layers are stitched from panels, and NEAR additionally gets its sky keyed out
    so the far city shows through it.

    Each layer has to be wider than the camera drags it or it repeats inside a single pan:
    at HUB_WIDTH 1920 the camera travels 1440, so FAR (0.20) needs > 288 logical and NEAR
    (0.42) needs > 605. Two 480-wide panels each gives 960, which clears both.
    """
    for name, srcs, centre, colors, feather, key in (
            ("far", ["far_a.png", "far_b.png"], far_centre, 128, 120, False),
            ("near", ["near.png", "near_b.png"], near_centre, 96, 90, True)):
        paths = [SKY_DIR + s for s in srcs]
        paths = [p for p in paths if os.path.exists(p)]
        if not paths:
            continue
        layer = stitch_sky(paths, centre, feather)
        if key:
            layer = key_glass(layer)
        quantized(layer, colors).save(f"assets/bg_lair_sky_{name}.png")
        drag = round(1440 * (0.20 if name == "far" else 0.42))
        print(f"sky {name}: {layer.width}x{WALL_H} ({layer.width // RS} logical, tiles; "
              f"camera drags it {drag} - {'ok' if layer.width // RS > drag else 'REPEATS'})")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    # one per panel; zip() would silently drop a panel if this list were ever short
    p.add_argument("--seams", nargs="*", type=float, default=[0.74] * len(PANELS),
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
