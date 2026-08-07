#!/usr/bin/env python3
"""Build the continuous, fixed-camera Stage 1 entrance frames."""

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "entrance_v3"
OUTPUT = ROOT / "assets" / "story" / "entrance_v3"

CANVAS = (277, 186)
SOURCE_CELL = (444, 296)
GROUND_Y = 182
BIKE_FRONT_X = 248


def cells(sheet: Image.Image, columns: int, rows: int) -> list[Image.Image]:
    """Crop equal grid cells while keeping a shared camera and scale."""
    result = []
    for row in range(rows):
        for column in range(columns):
            x0 = round(column * sheet.width / columns)
            x1 = round((column + 1) * sheet.width / columns)
            y0 = round(row * sheet.height / rows)
            y1 = round((row + 1) * sheet.height / rows)
            cell = sheet.crop((
                x0, y0, x1, y1,
            ))
            # Model output dimensions can land one or two pixels away from the
            # requested grid. Normalize only the shared camera height first.
            scale = SOURCE_CELL[1] / cell.height
            cell = cell.resize((round(cell.width * scale), SOURCE_CELL[1]), Image.Resampling.LANCZOS)
            # The performance sheet uses wider cells than the dismount sheet.
            # Crop its fixed central camera before scaling so the motorcycle and
            # hero retain the same physical size in both sequences.
            if cell.width > SOURCE_CELL[0]:
                left = (cell.width - SOURCE_CELL[0]) // 2
                cell = cell.crop((left, 0, left + SOURCE_CELL[0], SOURCE_CELL[1]))
            elif cell.width < SOURCE_CELL[0]:
                padded = Image.new("RGBA", SOURCE_CELL, (0, 0, 0, 0))
                padded.alpha_composite(cell, ((SOURCE_CELL[0] - cell.width) // 2, 0))
                cell = padded
            if cell.size != SOURCE_CELL:
                raise ValueError(f"Unexpected source cell size {cell.size}")
            result.append(cell)
    return result


def production_frame(cell: Image.Image) -> Image.Image:
    resized = cell.resize(CANVAS, Image.Resampling.LANCZOS)
    resized = resized.filter(ImageFilter.UnsharpMask(radius=0.4, percent=45, threshold=2))
    bbox = resized.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Generated entrance cell contains no visible subject")
    # The motorcycle front wheel/fender is the rightmost opaque feature in
    # every authored pose, so this is a more reliable lock than centering a
    # changing human silhouette.
    x = BIKE_FRONT_X - bbox[2]
    y = GROUND_Y - bbox[3]
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(resized, (x, y))
    return frame


def save_sequence(source: str, columns: int, rows: int, prefix: str) -> int:
    sheet = Image.open(SOURCE / source).convert("RGBA")
    sequence = cells(sheet, columns, rows)
    for index, cell in enumerate(sequence, 1):
        production_frame(cell).save(OUTPUT / f"{prefix}_{index:02}.png", optimize=True)
    return len(sequence)


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    dismount = save_sequence("dismount_sheet.png", 4, 3, "dismount")
    performance = save_sequence("performance_sheet.png", 3, 3, "performance")
    print(f"Built {dismount} dismount and {performance} performance frames at {CANVAS}")


if __name__ == "__main__":
    build()
