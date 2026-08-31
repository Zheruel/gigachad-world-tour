#!/usr/bin/env python3
"""Build the DIRTY DELHI wall/floor plates from the approved d1 views.

Derived from build_bazaar_v2.py, which still builds the old stage-1 plate and must
keep working - the two differ structurally, not by parameter: this route is six areas
of unequal length across 26 screens, some views repeat inside an area, and the whole
thing is quantized because a 24960x362 RGB plate is ~19 MB blocking loadAssets().

One view = one screen = 480 logical px. Views repeat within an area (mirrored, so the
seam is free by construction) rather than being stretched: forcing a 1536-wide
generation across two screens is a 2.3x aspect distortion, which is exactly what made
the first Tokyo plate read as mush.

ONE floor plate, not two. The market-to-drain-to-river transition is painted inside
views 10-17 by the generator, so `floorW` equals the stage width and neither plane
ever tiles. Two floor plates would need a per-band clip in drawStage and would leave
a hard vertical cut in the one surface the player stares at while fighting.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "d1"
OUTPUT = ROOT / "assets" / "stages" / "dirty_delhi"

VIEW_W = 960            # device px = 480 logical = exactly one screen
OVERLAP = 96
SOURCE_VIEW_W = VIEW_W + OVERLAP
WALL_H = 362            # 181 logical, the facade band
FLOOR_H = 178           # 89 logical, the street band
COLORS = 192            # swept against the drain, which has the smoothest gradients

# (file, curb_y, floor detail, mirrored) - one row per SCREEN, in route order.
# curb_y is the top of the kerb in the full-resolution source. Normalising it is what
# keeps the combat floor fixed while the generated architecture varies.
# The `mirror` column is how an area covers more screens than it has generations: a
# mirrored copy's left edge is the same column of pixels as its neighbour's right edge.
VIEWS = (
    # ---- the market run: x 0-2400 ----
    ("wall_market_a.png",   None, "market", False),   # s0   the quiet end, the arrival
    ("wall_market_b.png",   None, "market", False),   # s1   spice merchants
    ("wall_market_a.png",   None, "market", True),    # s2
    ("wall_market_b.png",   None, "market", True),    # s3
    ("wall_market_c.png",   None, "market", False),   # s4   the square - PAPPU's arena
    # ---- the food lane: x 2400-3360 ----
    ("wall_food_a.png",     None, "market", False),   # s5   griddles and smoke
    ("wall_food_b.png",     None, "market", False),   # s6   the tandoor end
    # ---- the wire market: x 3360-5280 ----
    ("wall_wire_a.png",     None, "market", False),   # s7   the cable tangle comes down
    ("wall_wire_a.png",     None, "market", True),    # s8
    ("wall_wire_b.png",     None, "market", False),   # s9   shutters down - LANGDA's arena
    ("wall_wire_c.png",     None, "market", False),   # s10  the street runs into the arch
    # ---- the drain: x 5280-8640, seven screens of nothing ----
    ("wall_drain_a.png",    None, "drain",  False),   # s11  inside, the market behind
    ("wall_drain_b.png",    None, "drain",  False),   # s12
    ("wall_drain_b.png",    None, "drain",  True),    # s13
    ("wall_drain_c.png",    None, "drain",  False),   # s14  the collapse
    ("wall_drain_c.png",    None, "drain",  True),    # s15
    ("wall_drain_b.png",    None, "drain",  False),   # s16
    ("wall_drain_d.png",    None, "drain",  False),   # s17  the river end, light changes
    # ---- the ghat: x 8640-11040 ----
    ("wall_ghat_a.png",     None, "river",  False),   # s18  the outfall
    ("wall_ghat_b.png",     None, "river",  False),   # s19  the dhobi ghat
    ("wall_ghat_b.png",     None, "river",  True),    # s20
    ("wall_ghat_c.png",     None, "river",  False),   # s21  steps and the beached boat
    ("wall_ghat_d.png",     None, "river",  False),   # s22  the derelict stretch
    # ---- the pontoon: x 11040-12480 ----
    ("wall_pontoon_a.png",  None, "river",  False),   # s23  boats lashed together
    ("wall_pontoon_b.png",  None, "river",  False),   # s24  the spoil yard
    ("wall_pontoon_c.png",  None, "river",  False),   # s25  THE DREDGER
)

DETAIL = {"market": "floor_market.png", "drain": "floor_drain.png", "river": "floor_river.png"}
DETAIL_MIX = {"market": 0.13, "drain": 0.30, "river": 0.26}
FLOOR_MATCH = {"market": 0.25, "drain": 0.85, "river": 0.70}

# Where two AREAS meet. These are the only hard joins - a join inside an area is nearly
# free because the model drew both views against the same description. Each one gets an
# exposure feather, and the plate rules want an architectural divider there anyway.
AREA_JOINS = (5, 7, 11, 18, 23)


def finish(image: Image.Image) -> Image.Image:
    """Keep the painted detail while preventing a soft resized result."""
    image = ImageEnhance.Color(image).enhance(1.03)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    return image.filter(ImageFilter.UnsharpMask(radius=0.65, percent=45, threshold=3))


def find_curb(source: Image.Image) -> int:
    """Locate the kerb by the strongest horizontal luminance edge in the lower half.

    Every prompt asks for a level kerb with empty ground below it, so the biggest
    row-to-row change down there is that line. Searching only the lower half matters
    for the same reason the bed's cut is constrained to its lower quarter: unconstrained
    it finds the awning line instead and the whole street sits at the wrong height.
    """
    grey = source.convert("L").resize((64, source.height), Image.Resampling.LANCZOS)
    rows = [sum(grey.crop((0, y, 64, y + 1)).getdata()) / 64 for y in range(source.height)]
    lo, hi = int(source.height * 0.45), int(source.height * 0.80)
    best, best_d = lo, -1.0
    for y in range(lo, hi):
        d = abs(rows[y + 1] - rows[y - 1])
        if d > best_d:
            best_d, best = d, y
    return best


def feather_from_previous(image: Image.Image, previous: Image.Image, width: int) -> Image.Image:
    """Ease an exposure jump at a join without ghosting the geometry."""
    sample = 24
    pm = ImageStat.Stat(previous.crop((previous.width - sample, 0, previous.width, previous.height))).mean
    cm = ImageStat.Stat(image.crop((0, 0, sample, image.height))).mean
    offsets = [max(-42, min(42, round(a - b))) for a, b in zip(pm, cm)]
    channels = [c.point(lambda v, s=o: max(0, min(255, v + s))) for c, o in zip(image.split(), offsets)]
    adjusted = Image.merge("RGB", channels)
    ramp = Image.new("L", (image.width, 1), 0)
    ramp.putdata([round(255 * (1 - x / max(1, width - 1))) if x < width else 0 for x in range(image.width)])
    return Image.composite(adjusted, image, ramp.resize(image.size))


def add_floor_detail(floor: Image.Image, detail: Image.Image, index: int, mix: float) -> Image.Image:
    """Bake restrained lived-in grime in rather than floating props over it."""
    source = detail.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if index & 1 else detail
    return Image.blend(floor, source.resize(floor.size, Image.Resampling.LANCZOS), mix)


def match_to_wall(floor: Image.Image, wall: Image.Image, strength: float) -> Image.Image:
    """Pull the floor band toward the colour of the wall standing on it.

    Asked for "an empty ground surface a fighter can walk across", the generator draws
    dry brown dirt whatever the room is - so the first build had a sandy road running
    through a flooded culvert and out along a poisoned river. Rather than hand-tinting
    each area, grade every floor toward the bottom third of its OWN wall: that band is
    the light the plate actually has at ground level, so the floor cannot disagree with
    the room it is in however the room changes.
    """
    band = wall.crop((0, int(wall.height * 0.66), wall.width, wall.height))
    target = ImageStat.Stat(band).mean
    current = ImageStat.Stat(floor).mean
    channels = []
    for chan, t, c in zip(floor.split(), target, current):
        k = 1.0 + strength * ((t / max(1.0, c)) - 1.0)
        channels.append(chan.point(lambda v, k=k: max(0, min(255, round(v * k)))))
    return Image.merge("RGB", channels)


def stitch(parts: list[Image.Image], height: int) -> Image.Image:
    raw_width = VIEW_W * len(parts) + OVERLAP
    result = Image.new("RGB", (raw_width, height))
    result.paste(parts[0], (0, 0))
    ramp = Image.new("L", (SOURCE_VIEW_W, 1), 255)
    ramp.putdata([round(255 * x / max(1, OVERLAP - 1)) if x < OVERLAP else 255
                  for x in range(SOURCE_VIEW_W)])
    mask = ramp.resize((SOURCE_VIEW_W, height))
    for index, part in enumerate(parts[1:], 1):
        result.paste(part, (index * VIEW_W, 0), mask)
    inset = OVERLAP // 2
    return result.crop((inset, 0, inset + VIEW_W * len(parts), height))


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    details = {}
    for key, name in DETAIL.items():
        path = SOURCE / name
        details[key] = Image.open(path).convert("RGB") if path.exists() else None

    # ONE curb row per AREA, not per view. Each view's wall band is squeezed from
    # (0..curb) into 362px, so a view cut at 627 and its neighbour cut at 724 come out
    # with architecture 15% different in size - measured, that was the worst join in
    # the first build. Taking the area's median holds masonry scale constant inside an
    # area and only lets it change where a divider is already hiding the join.
    raw: list[int] = []
    sources: list[Image.Image] = []
    for filename, curb_y, _detail, mirror in VIEWS:
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

    walls: list[Image.Image] = []
    floors: list[Image.Image] = []

    for index, (filename, curb_y, detail_key, mirror) in enumerate(VIEWS):
        source = sources[index]
        width, height = source.size
        seam = curbs[index]

        inset = 6
        wall = source.crop((inset, 0, width - inset, seam))
        floor = source.crop((inset, seam, width - inset, height))
        wall = finish(wall.resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS))
        floor = finish(floor.resize((SOURCE_VIEW_W, FLOOR_H), Image.Resampling.LANCZOS))
        if details.get(detail_key) is not None:
            floor = add_floor_detail(floor, details[detail_key], index, DETAIL_MIX[detail_key])
        # The market's own road is already right, so it is left alone; the drain and the
        # river are graded hard onto the light their own wall has at ground level.
        floor = match_to_wall(floor, wall, FLOOR_MATCH[detail_key])

        if index in AREA_JOINS and walls:
            wall = feather_from_previous(wall, walls[-1], 90)
            floor = feather_from_previous(floor, floors[-1], 190)
        walls.append(wall)
        floors.append(floor)

    stage_w = VIEW_W * len(VIEWS)
    wall_plate = stitch(walls, WALL_H)
    floor_plate = stitch(floors, FLOOR_H)

    # The drain mouth is a real threshold in the fiction, so the plate carries a
    # motivated shadow across it rather than a texture discontinuity.
    arch = VIEW_W * 11
    shadow = Image.new("RGBA", floor_plate.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).polygon(
        ((arch - 90, 0), (arch + 95, 0), (arch + 255, FLOOR_H), (arch - 195, FLOOR_H)),
        fill=(6, 10, 9, 96))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=26))
    floor_plate = Image.alpha_composite(floor_plate.convert("RGBA"), shadow).convert("RGB")

    # Quantized and SAVED as a palette image. build_bgs.py quantizes and then throws the
    # palette away with .convert("RGB"), which is why bg_delhi_wall.png is still 24-bit.
    wall_q = wall_plate.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    floor_q = floor_plate.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
    wall_q.save(OUTPUT / "wall.png", optimize=True)
    floor_q.save(OUTPUT / "floor.png", optimize=True)

    route = Image.new("RGB", (stage_w, WALL_H + FLOOR_H))
    route.paste(wall_plate, (0, 0))
    route.paste(floor_plate, (0, WALL_H))
    route.resize((3120, 135), Image.Resampling.LANCZOS).save(OUTPUT / "route_preview.png", optimize=True)

    drift = [abs(curbs[i] - curbs[i - 1]) for i in range(1, len(curbs))]
    print(f"raw curb rows:  {raw}")
    wall_mb = (OUTPUT / "wall.png").stat().st_size / 1e6
    floor_mb = (OUTPUT / "floor.png").stat().st_size / 1e6
    print(f"Built {len(VIEWS)} screens: {stage_w}x{WALL_H} wall ({wall_mb:.1f} MB), "
          f"{stage_w}x{FLOOR_H} floor ({floor_mb:.1f} MB)")
    print(f"curb rows: {curbs}")
    print(f"worst curb drift at a join: {max(drift)} source px "
          f"({max(drift) * WALL_H / max(curbs):.1f} device px after normalising)")


if __name__ == "__main__":
    build()
