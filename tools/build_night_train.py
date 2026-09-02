#!/usr/bin/env python3
"""Build THE NIGHT TRAIN wall/floor plates from the approved d2 views.

Derived from build_dirty_delhi.py, with one structural difference: views of the train
paint everything OUTSIDE it - the carriage windows, the open vestibule door, the sky
over the roof - as flat chroma green, and this stitcher keys that to transparency so
js/train.js can scroll the world past behind the plate on the train's own clock. The
wall plate is therefore RGBA, quantized with FASTOCTREE (MEDIANCUT is RGB only).

19 screens = 9120 logical px. One view = one screen; areas repeat views mirrored.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "d2"
OUTPUT = ROOT / "assets" / "stages" / "night_train"

VIEW_W = 960
OVERLAP = 96
SOURCE_VIEW_W = VIEW_W + OVERLAP
WALL_H = 362
FLOOR_H = 178
COLORS = 192

# (file, curb_y, floor detail, mirrored, keyed) - one row per SCREEN, in route order.
VIEWS = (
    # ---- the forecourt and the ticket hall: x 0-1920 ----
    ("wall_fore_a.png",  None, "station", False, False),   # s0  the taxi rank
    ("wall_fore_b.png",  None, "station", False, False),   # s1  the entrance
    ("wall_hall_a.png",  None, "station", False, False),   # s2  the grilles
    ("wall_hall_a.png",  None, "station", True,  False),   # s3
    # ---- the footbridge: x 1920-2400 ----
    ("wall_bridge.png",  None, "station", False, False),   # s4
    # ---- the parcel dock: x 2400-3360 ----
    ("wall_dock_a.png",  None, "station", False, False),   # s5  the stacks
    ("wall_dock_b.png",  None, "station", False, False),   # s6  the ramp
    # ---- platform 1: x 3360-4800 (the rake is a wall-plane sprite) ----
    ("wall_plat_a.png",  None, "station", False, False),   # s7  the board
    ("wall_plat_b.png",  None, "station", False, False),   # s8
    ("wall_plat_b.png",  None, "station", True,  False),   # s9  the whistle
    # ---- the carriages: x 4800-7680 ----
    ("wall_vest_a.png",  None, "train",   False, True),    # s10 the cut
    ("wall_gen.png",     None, "train",   False, True),    # s11 general
    ("wall_gen.png",     None, "train",   True,  True),    # s12
    ("wall_pantry.png",  None, "train",   False, True),    # s13 the pantry
    ("wall_ac.png",      None, "train",   False, True),    # s14 the AC coach
    ("wall_vest_b.png",  None, "train",   False, True),    # s15 THE TTE
    # ---- the roof: x 7680-9120 ----
    ("wall_roof_a.png",  None, "roof",    False, True),    # s16 the ladder
    ("wall_roof_b.png",  None, "roof",    False, True),    # s17
    ("wall_roof_c.png",  None, "roof",    False, True),    # s18 BIRJU
)

DETAIL = {"station": "floor_station.png", "train": "floor_train.png", "roof": "floor_roof.png"}
DETAIL_MIX = {"station": 0.16, "train": 0.30, "roof": 0.40}
FLOOR_MATCH = {"station": 0.30, "train": 0.70, "roof": 0.80}
AREA_JOINS = (2, 4, 5, 7, 10, 17, 18)   # 16 is the ladder: a cut, never a blend


def finish(image):
    image = ImageEnhance.Color(image).enhance(1.03)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    return image.filter(ImageFilter.UnsharpMask(radius=0.65, percent=45, threshold=3))


def key_mask(source, tol=70):
    """Alpha for a view: 0 where the generator painted chroma green."""
    r, g, b = source.split()
    w, h = source.size
    mask = Image.new("L", (w, h), 255)
    px = mask.load()
    rp, gp, bp = r.load(), g.load(), b.load()
    for y in range(h):
        for x in range(w):
            gv = gp[x, y]
            if gv > 110 and gv > rp[x, y] + tol and gv > bp[x, y] + tol:
                px[x, y] = 0
    # a hard key wobbles at the edge of a window frame; soften one pixel
    return mask.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.8))


def dark_mask(wall, floor_row):
    """The roof views come back with a black sky rather than green. Anything near
    black above `floor_row` (the top of the coach roof) is sky, and the outside layer
    should show through it. The roof's own dark seams sit below that row and stay."""
    arr = np.asarray(wall.convert("RGB")).astype(np.int16)
    lum = arr.max(axis=2)
    alpha = np.clip((lum - 40) * (255 / 50), 0, 255)   # the haze goes too: the runtime paints it
    # ease into the opaque roof over the last hundred rows so the haze has no shelf
    h = alpha.shape[0]
    ease = np.clip((np.arange(h) - (floor_row - 20)) / 20, 0, 1)[:, None]
    alpha = alpha + (255 - alpha) * ease
    alpha[floor_row:, :] = 255
    return Image.fromarray(alpha.astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(1.2))


def fill_keyed(floor, mask):
    """A door or window hole that reaches below the curb leaves chroma in the floor
    band. Fill it from the nearest floor pixel to the left on the same row."""
    arr = np.asarray(floor.convert("RGB")).copy()
    keyed = np.asarray(mask) < 128
    if not keyed.any():
        return floor
    h, w = keyed.shape
    idx = np.where(keyed, 0, np.arange(w)[None, :])
    idx = np.maximum.accumulate(idx, axis=1)
    # a hole at the left edge has nothing on its left: take from the right instead
    ridx = np.where(keyed, w - 1, np.arange(w)[None, :])
    ridx = np.minimum.accumulate(ridx[:, ::-1], axis=1)[:, ::-1]
    use_right = keyed & (idx == 0) & ~keyed[:, :1]
    src = np.where(use_right, ridx, idx)
    rows = np.arange(h)[:, None]
    arr = arr[rows, src]
    return Image.fromarray(arr, "RGB")


def find_curb(source):
    grey = source.convert("L").resize((64, source.height), Image.Resampling.LANCZOS)
    rows = [sum(grey.crop((0, y, 64, y + 1)).getdata()) / 64 for y in range(source.height)]
    lo, hi = int(source.height * 0.45), int(source.height * 0.80)
    best, best_d = lo, -1.0
    for y in range(lo, hi):
        d = abs(rows[y + 1] - rows[y - 1])
        if d > best_d:
            best_d, best = d, y
    return best


def feather_from_previous(image, previous, width):
    sample = 24
    pm = ImageStat.Stat(previous.crop((previous.width - sample, 0, previous.width, previous.height)).convert("RGB")).mean
    cm = ImageStat.Stat(image.crop((0, 0, sample, image.height)).convert("RGB")).mean
    offsets = [max(-42, min(42, round(a - b))) for a, b in zip(pm, cm)]
    rgb = image.convert("RGB")
    channels = [c.point(lambda v, s=o: max(0, min(255, v + s))) for c, o in zip(rgb.split(), offsets)]
    adjusted = Image.merge("RGB", channels)
    ramp = Image.new("L", (image.width, 1), 0)
    ramp.putdata([round(255 * (1 - x / max(1, width - 1))) if x < width else 0 for x in range(image.width)])
    out = Image.composite(adjusted, rgb, ramp.resize(image.size))
    if image.mode == "RGBA":
        out = out.convert("RGBA")
        out.putalpha(image.getchannel("A"))
    return out


def add_floor_detail(floor, detail, index, mix):
    source = detail.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if index & 1 else detail
    return Image.blend(floor, source.resize(floor.size, Image.Resampling.LANCZOS), mix)


def match_to_wall(floor, wall, strength, mask=None):
    y0 = int(wall.height * 0.66)
    band = wall.convert("RGB").crop((0, y0, wall.width, wall.height))
    band_mask = mask.crop((0, y0, wall.width, wall.height)) if mask is not None else None
    if band_mask is not None and ImageStat.Stat(band_mask).mean[0] < 8:
        band_mask = None   # a keyed screen with almost no wall: match to whatever is there
    target = ImageStat.Stat(band, band_mask).mean
    current = ImageStat.Stat(floor).mean
    channels = []
    for chan, t, c in zip(floor.split(), target, current):
        k = 1.0 + strength * ((t / max(1.0, c)) - 1.0)
        channels.append(chan.point(lambda v, k=k: max(0, min(255, round(v * k)))))
    return Image.merge("RGB", channels)


def stitch(parts, height, mode):
    raw_width = VIEW_W * len(parts) + OVERLAP
    result = Image.new(mode, (raw_width, height))
    result.paste(parts[0], (0, 0))
    ramp = Image.new("L", (SOURCE_VIEW_W, 1), 255)
    ramp.putdata([round(255 * x / max(1, OVERLAP - 1)) if x < OVERLAP else 255 for x in range(SOURCE_VIEW_W)])
    mask = ramp.resize((SOURCE_VIEW_W, height))
    for index, part in enumerate(parts[1:], 1):
        if mode == "RGBA":
            # the ramp must not fade a keyed hole back in: multiply it by the part's own alpha
            m = Image.composite(mask, Image.new("L", mask.size, 0), part.getchannel("A").point(lambda v: 255 if v > 8 else 0))
            base = result.crop((index * VIEW_W, 0, index * VIEW_W + SOURCE_VIEW_W, height))
            merged = Image.composite(part, base, m)
            result.paste(merged, (index * VIEW_W, 0))
        else:
            result.paste(part, (index * VIEW_W, 0), mask)
    inset = OVERLAP // 2
    return result.crop((inset, 0, inset + VIEW_W * len(parts), height))


def build():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    details = {}
    for key, name in DETAIL.items():
        path = SOURCE / name
        details[key] = Image.open(path).convert("RGB") if path.exists() else None

    raw, sources = [], []
    for filename, curb_y, _detail, mirror, _keyed in VIEWS:
        source = Image.open(SOURCE / filename).convert("RGB")
        if mirror:
            source = source.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        sources.append(source)
        raw.append(curb_y if curb_y else find_curb(source))

    bounds = [0, *AREA_JOINS, len(VIEWS)]
    curbs = list(raw)
    for lo, hi in zip(bounds, bounds[1:]):
        group = sorted(raw[lo:hi])
        median = group[len(group) // 2]
        for i in range(lo, hi):
            curbs[i] = median

    walls, floors = [], []
    for index, (filename, curb_y, detail_key, mirror, keyed) in enumerate(VIEWS):
        source = sources[index]
        width, height = source.size
        seam = curbs[index]
        inset = 6
        wall = source.crop((inset, 0, width - inset, seam))
        floor = source.crop((inset, seam, width - inset, height))
        alpha = key_mask(wall).resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS) if keyed else None
        floor_key = key_mask(floor).resize((SOURCE_VIEW_W, FLOOR_H), Image.Resampling.LANCZOS) if keyed else None
        wall = finish(wall.resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS))
        if keyed and detail_key == "roof":
            alpha = ImageChops.multiply(alpha, dark_mask(wall, WALL_H - 50))
        floor = finish(floor.resize((SOURCE_VIEW_W, FLOOR_H), Image.Resampling.LANCZOS))
        if floor_key is not None:
            floor = fill_keyed(floor, floor_key)
        if details.get(detail_key) is not None:
            floor = add_floor_detail(floor, details[detail_key], index, DETAIL_MIX[detail_key])
        hard = alpha.point(lambda v: 255 if v > 128 else 0) if alpha is not None else None
        # the floor takes its cast from the opaque wall, never from the chroma
        floor = match_to_wall(floor, wall, FLOOR_MATCH[detail_key], hard)
        if alpha is not None:
            # despill: a keyed pixel keeps no green under its alpha, or the window edge fringes
            wall = Image.composite(wall, Image.new("RGB", wall.size, (8, 10, 18)), hard)
        wall = wall.convert("RGBA")
        wall.putalpha(alpha if alpha is not None else Image.new("L", wall.size, 255))
        if index in AREA_JOINS and walls:
            wall = feather_from_previous(wall, walls[-1], 90)
            floor = feather_from_previous(floor, floors[-1], 190)
        walls.append(wall)
        floors.append(floor)

    stage_w = VIEW_W * len(VIEWS)
    wall_plate = stitch(walls, WALL_H, "RGBA")
    floor_plate = stitch(floors, FLOOR_H, "RGB")

    # the cut lands on a hard dark join: the vestibule is a different world from the platform
    cut = VIEW_W * 10
    shade = Image.new("RGBA", floor_plate.size, (0, 0, 0, 0))
    ImageDraw.Draw(shade).rectangle((cut - 40, 0, cut + 40, FLOOR_H), fill=(4, 4, 10, 140))
    shade = shade.filter(ImageFilter.GaussianBlur(radius=18))
    floor_plate = Image.alpha_composite(floor_plate.convert("RGBA"), shade).convert("RGB")

    wall_q = wall_plate.quantize(colors=COLORS, method=Image.Quantize.FASTOCTREE, dither=Image.Dither.NONE)
    floor_q = floor_plate.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    wall_q.save(OUTPUT / "wall.png", optimize=True)
    floor_q.save(OUTPUT / "floor.png", optimize=True)

    outside = SOURCE / "outside.png"
    if outside.exists():
        img = Image.open(outside).convert("RGB")
        # a wall-band-sized tile: the wall band is 362 device px, the tile keeps its aspect
        img = finish(img.resize((round(img.width * WALL_H * 1.3 / img.height), round(WALL_H * 1.3)), Image.Resampling.LANCZOS))
        img.quantize(colors=96, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).save(OUTPUT / "outside.png", optimize=True)

    route = Image.new("RGB", (stage_w, WALL_H + FLOOR_H), (20, 40, 80))
    route.paste(wall_plate, (0, 0), wall_plate)
    route.paste(floor_plate, (0, WALL_H))
    route.resize((3040, 180), Image.Resampling.LANCZOS).save(OUTPUT / "route_preview.png", optimize=True)

    drift = [abs(curbs[i] - curbs[i - 1]) for i in range(1, len(curbs))]
    print(f"raw curb rows: {raw}")
    print(f"curb rows:     {curbs}")
    print(f"Built {len(VIEWS)} screens: {stage_w}x{WALL_H} wall "
          f"({(OUTPUT / 'wall.png').stat().st_size / 1e6:.1f} MB), {stage_w}x{FLOOR_H} floor "
          f"({(OUTPUT / 'floor.png').stat().st_size / 1e6:.1f} MB); worst curb drift {max(drift)} px")


if __name__ == "__main__":
    build()
