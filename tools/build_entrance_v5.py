#!/usr/bin/env python3
"""Build the V5 entrance from hero-only sheets and one immutable motorcycle."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
AI = ROOT / "assets" / "ai" / "entrance_v5"
OUT = ROOT / "assets" / "story" / "entrance_v5"
BIKE_SOURCE = ROOT / "assets" / "ai" / "entrance_v2" / "motorcycle_parked.png"

CANVAS = (277, 186)
GROUND = 181
STANDING_HEIGHT = 126


def remove_green(image: Image.Image) -> Image.Image:
    """Key a generated green gradient without leaving a green fringe."""
    rgba = image.convert("RGBA")
    pixels = []
    for red, green, blue, _ in rgba.getdata():
        dominance = green - max(red, blue)
        if green > 72 and dominance >= 48:
            alpha = 0
        elif green > 66 and dominance > 14:
            alpha = round(255 * (dominance - 14) / 34)
            alpha = 255 - max(0, min(255, alpha))
        else:
            alpha = 255
        if alpha:
            # Edge decontamination prevents the generated green screen from
            # becoming a visible outline in the game.
            green = min(green, round((red + blue) / 2) + 18)
        pixels.append((red, green, blue, alpha))
    rgba.putdata(pixels)
    return rgba


def cells(
    sheet: Image.Image,
    columns: int,
    rows: int,
    row_edges: list[int] | None = None,
) -> list[Image.Image]:
    result = []
    for row in range(rows):
        y0 = row_edges[row] if row_edges else round(row * sheet.height / rows)
        y1 = row_edges[row + 1] if row_edges else round((row + 1) * sheet.height / rows)
        for column in range(columns):
            x0 = round(column * sheet.width / columns)
            x1 = round((column + 1) * sheet.width / columns)
            result.append(sheet.crop((x0, y0, x1, y1)))
    return result


def subject_box(cell: Image.Image) -> tuple[int, int, int, int]:
    alpha = cell.getchannel("A").point(lambda value: 255 if value >= 32 else 0)
    box = alpha.getbbox()
    if box is None:
        raise ValueError("An entrance cell contains no visible hero")
    return box


def normalize_group(group: list[Image.Image], scale: float) -> list[Image.Image]:
    normalized = []
    for cell in group:
        box = subject_box(cell)
        crop = cell.crop((box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3))
        size = (round(crop.width * scale), round(crop.height * scale))
        sprite = crop.resize(size, Image.Resampling.LANCZOS)
        sprite = sprite.filter(ImageFilter.UnsharpMask(radius=.4, percent=48, threshold=2))
        sprite_box = subject_box(sprite)
        frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = round(CANVAS[0] / 2 - (sprite_box[0] + sprite_box[2]) / 2)
        y = GROUND - sprite_box[3]
        frame.alpha_composite(sprite, (x, y))
        normalized.append(frame)
    return normalized


def normalize_bike() -> tuple[Image.Image, Image.Image]:
    source = Image.open(BIKE_SOURCE).convert("RGBA")
    box = source.getchannel("A").getbbox()
    if box is None:
        raise ValueError("Motorcycle source has no alpha subject")
    bike = source.crop(box)
    target_width = 208
    scale = target_width / bike.width
    bike = bike.resize((target_width, round(bike.height * scale)), Image.Resampling.LANCZOS)
    bike = bike.filter(ImageFilter.UnsharpMask(radius=.45, percent=55, threshold=2))
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    left = round((CANVAS[0] - bike.width) / 2)
    top = GROUND - bike.height
    frame.alpha_composite(bike, (left, top))

    # A small immutable foreground lip lets the hero sit inside the one bike,
    # rather than appearing pasted over it. It is cut from the same pixels.
    mask = Image.new("L", CANVAS, 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon([(75, 103), (126, 99), (151, 111), (142, 126), (90, 123)], fill=255)
    draw.polygon([(139, 87), (188, 79), (207, 101), (190, 124), (144, 119)], fill=255)
    draw.polygon([(177, 65), (216, 62), (221, 98), (188, 101)], fill=255)
    foreground = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    foreground.paste(frame, (0, 0), Image.composite(frame.getchannel("A"), Image.new("L", CANVAS, 0), mask))
    return frame, foreground


def contact_sheet(frames: list[Image.Image], bike: Image.Image) -> Image.Image:
    thumb_w, thumb_h = 277, 186
    sheet = Image.new("RGBA", (thumb_w * 5, thumb_h * 4), (21, 17, 25, 255))
    for index, frame in enumerate(frames):
        x = (index % 5) * thumb_w
        y = (index // 5) * thumb_h
        sheet.alpha_composite(bike, (x, y))
        sheet.alpha_composite(frame, (x, y))
    return sheet


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    # GPT Image kept clean columns but let the third and fourth rows rise above
    # the mathematical quarters. These measured valleys preserve whole heads
    # without borrowing pixels from the adjacent pose.
    master = cells(
        remove_green(Image.open(AI / "hero_master_sheet_chroma.png")),
        5,
        4,
        row_edges=[0, 257, 501, 738, 1024],
    )
    first_master = cells(
        remove_green(Image.open(AI / "hero_master_sheet_first_chroma.png")),
        5,
        4,
        row_edges=[0, 257, 501, 738, 1024],
    )
    dismount = cells(remove_green(Image.open(AI / "dismount_sheet_chroma.png")), 4, 2)

    master_scale = STANDING_HEIGHT / (subject_box(master[19])[3] - subject_box(master[19])[1])
    dismount_scale = STANDING_HEIGHT / (subject_box(dismount[7])[3] - subject_box(dismount[7])[1])
    master_frames = normalize_group(master, master_scale)
    first_master_frames = normalize_group(first_master, master_scale)
    dismount_frames = normalize_group(dismount, dismount_scale)

    # The first generation's shoulder-flex silhouette is stronger; use that
    # one cel while retaining the corrected sheet's cleaner cigar and guard.
    master_frames[17] = first_master_frames[17]

    # Five approach poses, eight explicitly continuous dismount poses, and
    # seven performance/guard poses. The bike is never part of a hero frame.
    production = master_frames[:5] + dismount_frames + master_frames[13:20]
    if len(production) != 20:
        raise AssertionError("V5 entrance must contain exactly 20 hero cels")

    for index, frame in enumerate(production, 1):
        frame.save(OUT / f"hero_{index:02}.png", optimize=True)
    bike, foreground = normalize_bike()
    bike.save(OUT / "motorcycle_base.png", optimize=True)
    foreground.save(OUT / "motorcycle_foreground.png", optimize=True)
    contact_sheet(production, bike).save(OUT / "contact_sheet.png", optimize=True)

    manifest = {
        "version": 5,
        "totalFrames": 720,
        "heroFrames": [f"hero_{index:02}.png" for index in range(1, 21)],
        "motorcycle": "motorcycle_base.png",
        "foreground": "motorcycle_foreground.png",
        "sources": {
            "approachAndPerformance": "assets/ai/entrance_v5/hero_master_sheet_chroma.png",
            "dismount": "assets/ai/entrance_v5/dismount_sheet_chroma.png",
        },
        "timeline": [
            [0, 23, "empty street"], [24, 107, "ride-in"],
            [108, 139, "rear-wheel skid"], [140, 167, "settle and idle"],
            [168, 287, "kill switch and near-side dismount"],
            [288, 395, "cigar inhale and exhale"],
            [396, 431, "shoulder roll and knuckle crack"],
            [432, 479, "ready stance transition"],
            [480, 716, "guard and voice hold"], [717, 719, "control handoff"],
        ],
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Built {len(production)} V5 hero frames; scales master={master_scale:.4f}, dismount={dismount_scale:.4f}")


if __name__ == "__main__":
    build()
