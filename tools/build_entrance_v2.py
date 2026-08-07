#!/usr/bin/env python3
"""Build the locked-scale motorcycle entrance sprites from the approved model sheet."""

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "entrance_v2"
OUTPUT = ROOT / "assets" / "story" / "entrance_v2"

CANVAS = (277, 186)
GROUND_Y = 179
MAX_SUBJECT_H = 176


def alpha_bbox(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 20 else 0)
    bbox = alpha.getbbox()
    if bbox is None:
        raise ValueError("Generated entrance cell contains no visible subject")
    return bbox


def sheet_cells(sheet: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    cells = []
    for row in range(rows):
        y0 = round(row * sheet.height / rows)
        y1 = round((row + 1) * sheet.height / rows)
        for column in range(columns):
            x0 = round(column * sheet.width / columns)
            x1 = round((column + 1) * sheet.width / columns)
            cells.append(sheet.crop((x0, y0, x1, y1)))
    return cells


def normalize_cells(cells: list[Image.Image]) -> list[Image.Image]:
    boxes = [alpha_bbox(cell) for cell in cells]
    widest = max(box[2] - box[0] for box in boxes)
    tallest = max(box[3] - box[1] for box in boxes)
    scale = min((CANVAS[0] - 8) / widest, MAX_SUBJECT_H / tallest)

    normalized = []
    for cell, box in zip(cells, boxes):
        size = (round(cell.width * scale), round(cell.height * scale))
        resized = cell.resize(size, Image.Resampling.LANCZOS)
        resized = resized.filter(ImageFilter.UnsharpMask(radius=0.45, percent=55, threshold=2))
        frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = round((CANVAS[0] - resized.width) / 2)
        y = GROUND_Y - round(box[3] * scale)
        frame.alpha_composite(resized, (x, y))
        normalized.append(frame)

    print(
        f"Entrance model sheet: scale={scale:.4f}, "
        f"source subject max={widest}x{tallest}, output={CANVAS[0]}x{CANVAS[1]}"
    )
    return normalized


def normalize_parked(source: Image.Image, target_width: int = 210) -> Image.Image:
    box = alpha_bbox(source)
    subject = source.crop(box)
    scale = target_width / subject.width
    size = (target_width, round(subject.height * scale))
    subject = subject.resize(size, Image.Resampling.LANCZOS)
    subject = subject.filter(ImageFilter.UnsharpMask(radius=0.45, percent=55, threshold=2))
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(
        subject,
        (round((CANVAS[0] - subject.width) / 2), GROUND_Y - subject.height),
    )
    return frame


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE / "controlled_swagger_sheet.png").convert("RGBA")
    frames = normalize_cells(sheet_cells(sheet, 4, 2))
    for index, frame in enumerate(frames, 1):
        frame.save(OUTPUT / f"chad_motor_v2_{index}.png", optimize=True)

    parked = Image.open(SOURCE / "motorcycle_parked.png").convert("RGBA")
    normalize_parked(parked).save(OUTPUT / "motorcycle_parked_v2.png", optimize=True)

    standing_sheet = Image.open(SOURCE / "controlled_swagger_standing.png").convert("RGBA")
    standing = normalize_cells(sheet_cells(standing_sheet, 3, 2))
    for index, frame in enumerate(standing, 1):
        frame.save(OUTPUT / f"chad_stand_v2_{index}.png", optimize=True)

    print(
        f"Built {len(frames)} motorcycle frames, {len(standing)} standing frames, "
        "and one parked motorcycle"
    )


if __name__ == "__main__":
    build()
