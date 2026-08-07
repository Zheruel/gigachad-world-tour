#!/usr/bin/env python3
"""Build the non-repeating Stage 1 wall/floor plates from approved ImageGen views."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageStat


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "bazaar_v2"
OUTPUT = ROOT / "assets" / "stages" / "bazaar_v2"

# Each view covers 500 logical pixels (1,000 authored pixels).  The seam is the
# top edge of its curb in the full-resolution source; normalizing it keeps the
# combat floor fixed even though the generated architecture varies naturally.
VIEWS = (
    ("01_arrival_anchor.png", 588),
    ("02_arrival_opening.png", 590),
    ("03_outer_anchor.png", 650),
    ("04_outer_tailors.png", 650),
    ("05_core_anchor.png", 584),
    ("06_core_wholesale.png", 590),
    ("07_rickshaw_anchor.png", 584),
    ("08_rickshaw_meters.png", 588),
    ("09_meter_yard_approach.png", 576),
    ("10_meter_yard_boss.png", 584),
)

VIEW_W = 1000
OVERLAP = 96
SOURCE_VIEW_W = VIEW_W + OVERLAP
WALL_H = 362
FLOOR_H = 178


def finish(image: Image.Image) -> Image.Image:
    """Keep the warm painted detail while preventing a soft resized result."""
    image = ImageEnhance.Color(image).enhance(1.03)
    image = ImageEnhance.Contrast(image).enhance(1.035)
    return image.filter(ImageFilter.UnsharpMask(radius=0.65, percent=45, threshold=3))


def feather_from_previous(image: Image.Image, previous: Image.Image, width: int) -> Image.Image:
    """Ease an exposure jump at a generated plate boundary without ghosting geometry."""
    sample = 24
    previous_mean = ImageStat.Stat(previous.crop((previous.width - sample, 0, previous.width, previous.height))).mean
    current_mean = ImageStat.Stat(image.crop((0, 0, sample, image.height))).mean
    offsets = [max(-42, min(42, round(a - b))) for a, b in zip(previous_mean, current_mean)]
    adjusted_channels = []
    for channel, offset in zip(image.split(), offsets):
        adjusted_channels.append(channel.point(lambda value, shift=offset: max(0, min(255, value + shift))))
    adjusted = Image.merge("RGB", adjusted_channels)

    ramp = Image.new("L", (image.width, 1), 0)
    ramp.putdata([round(255 * (1 - x / max(1, width - 1))) if x < width else 0 for x in range(image.width)])
    mask = ramp.resize(image.size)
    return Image.composite(adjusted, image, mask)


def add_floor_detail(floor: Image.Image, detail: Image.Image, index: int) -> Image.Image:
    """Bake restrained lived-in grime into the floor instead of floating props over it."""
    source = detail.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if index & 1 else detail
    source = source.resize(floor.size, Image.Resampling.LANCZOS)
    # The generated pass supplies organic variation; the original plate keeps
    # perspective, identity and most of its value structure.
    return Image.blend(floor, source, 0.13 if index < 8 else 0.16)


def stitch(parts: list[Image.Image], height: int) -> Image.Image:
    """Crossfade neighboring generated views inside a real overlap region."""
    raw_width = VIEW_W * len(parts) + OVERLAP
    result = Image.new("RGB", (raw_width, height))
    result.paste(parts[0], (0, 0))
    ramp = Image.new("L", (SOURCE_VIEW_W, 1), 255)
    ramp.putdata([
        round(255 * x / max(1, OVERLAP - 1)) if x < OVERLAP else 255
        for x in range(SOURCE_VIEW_W)
    ])
    mask = ramp.resize((SOURCE_VIEW_W, height))
    for index, part in enumerate(parts[1:], 1):
        result.paste(part, (index * VIEW_W, 0), mask)
    inset = OVERLAP // 2
    return result.crop((inset, 0, inset + VIEW_W * len(parts), height))


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    walls: list[Image.Image] = []
    floors: list[Image.Image] = []
    market_detail = Image.open(SOURCE / "market_floor_detail.png").convert("RGB")
    yard_detail = Image.open(SOURCE / "yard_floor_detail.png").convert("RGB")

    for index, (filename, curb_y) in enumerate(VIEWS):
        source = Image.open(SOURCE / filename).convert("RGB")
        width, height = source.size
        if not 0 < curb_y < height:
            raise ValueError(f"Invalid curb seam {curb_y} for {filename} ({height}px high)")

        # Trim only the tiny generation safety margin at either side. Keeping
        # almost the whole view preserves the intended one-screen composition.
        inset = 6
        wall = source.crop((inset, 0, width - inset, curb_y))
        floor = source.crop((inset, curb_y, width - inset, height))
        wall = finish(wall.resize((SOURCE_VIEW_W, WALL_H), Image.Resampling.LANCZOS))
        floor = finish(floor.resize((SOURCE_VIEW_W, FLOOR_H), Image.Resampling.LANCZOS))
        floor = add_floor_detail(floor, market_detail if index < 8 else yard_detail, index)

        # The boss plate opens from a dark structural pier into the lit arena.
        # Feather only the exposure at that join; cross-dissolving the art would
        # create doubled masonry and compromise the intentionally clean arena.
        if filename == "10_meter_yard_boss.png":
            wall = feather_from_previous(wall, walls[-1], 90)
            floor = feather_from_previous(floor, floors[-1], 190)
        walls.append(wall)
        floors.append(floor)

    stage_w = VIEW_W * len(VIEWS)
    wall_plate = stitch(walls, WALL_H)
    floor_plate = stitch(floors, FLOOR_H)

    # Turn the final source-image boundary into a motivated shadow cast by the
    # tall depot pier. This masks the unavoidable texture discontinuity while
    # strengthening the visual threshold into Raja's arena.
    boss_join = VIEW_W * 9
    shadow = Image.new("RGBA", floor_plate.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.polygon(
        ((boss_join - 70, 0), (boss_join + 75, 0),
         (boss_join + 235, FLOOR_H), (boss_join - 175, FLOOR_H)),
        fill=(18, 12, 8, 78),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=22))
    floor_plate = Image.alpha_composite(floor_plate.convert("RGBA"), shadow).convert("RGB")

    wall_plate.save(OUTPUT / "wall.png", optimize=True)
    floor_plate.save(OUTPUT / "floor.png", optimize=True)

    route = Image.new("RGB", (stage_w, WALL_H + FLOOR_H))
    route.paste(wall_plate, (0, 0))
    route.paste(floor_plate, (0, WALL_H))
    route.resize((2500, 135), Image.Resampling.LANCZOS).save(
        OUTPUT / "route_preview.png", optimize=True
    )

    print(f"Built {len(VIEWS)} views: {stage_w}x{WALL_H} wall, {stage_w}x{FLOOR_H} floor")


if __name__ == "__main__":
    build()
