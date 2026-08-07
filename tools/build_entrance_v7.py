#!/usr/bin/env python3
"""Build the 16-cel cinematic entrance from one combined master sheet."""

from collections import deque
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "entrance_v7" / "combined_master_sheet.png"
OUTPUT = ROOT / "assets" / "story" / "entrance_v7"
CANVAS = (277, 186)
GROUND = 181
TARGET_MAX_HEIGHT = 142
ROW_EDGES = [0, 314, 627, 900, 1254]


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    alpha = image.getchannel("A").point(lambda value: 255 if value >= 28 else 0)
    box = alpha.getbbox()
    if box is None:
        raise ValueError("Combined entrance cell contains no visible rig")
    return box


def keep_main_rig(image: Image.Image) -> Image.Image:
    """Remove isolated key-removal flecks without losing cigar details."""
    alpha = image.getchannel("A")
    joined = alpha.point(lambda value: 255 if value >= 28 else 0).filter(ImageFilter.MaxFilter(11))
    width, height = joined.size
    data = joined.tobytes()
    seen = bytearray(width * height)
    largest: list[int] = []
    for start, value in enumerate(data):
        if value == 0 or seen[start]:
            continue
        seen[start] = 1
        queue = deque([start])
        component = []
        while queue:
            index = queue.popleft()
            component.append(index)
            x, y = index % width, index // width
            for neighbor in (
                index - 1 if x else -1,
                index + 1 if x + 1 < width else -1,
                index - width if y else -1,
                index + width if y + 1 < height else -1,
            ):
                if neighbor >= 0 and data[neighbor] and not seen[neighbor]:
                    seen[neighbor] = 1
                    queue.append(neighbor)
        if len(component) > len(largest):
            largest = component
    keep = bytearray(width * height)
    for index in largest:
        keep[index] = 255
    original = alpha.tobytes()
    cleaned_alpha = Image.frombytes(
        "L", (width, height), bytes(original[i] if keep[i] else 0 for i in range(len(keep)))
    )
    cleaned = image.copy()
    cleaned.putalpha(cleaned_alpha)
    return cleaned


def sheet_cells(sheet: Image.Image) -> list[Image.Image]:
    result = []
    for row in range(4):
        y0 = ROW_EDGES[row]
        y1 = ROW_EDGES[row + 1]
        for column in range(4):
            x0 = round(column * sheet.width / 4)
            x1 = round((column + 1) * sheet.width / 4)
            result.append(sheet.crop((x0, y0, x1, y1)))
    return result


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE).convert("RGBA")
    cells = [keep_main_rig(cell) for cell in sheet_cells(source)]
    boxes = [alpha_box(cell) for cell in cells]
    max_height = max(box[3] - box[1] for box in boxes)
    max_width = max(box[2] - box[0] for box in boxes)
    scale = min(TARGET_MAX_HEIGHT / max_height, (CANVAS[0] - 8) / max_width)

    frames = []
    for cell, box in zip(cells, boxes):
        crop = cell.crop((box[0] - 3, box[1] - 3, box[2] + 3, box[3] + 3))
        rig = crop.resize(
            (round(crop.width * scale), round(crop.height * scale)),
            Image.Resampling.LANCZOS,
        )
        rig = rig.filter(ImageFilter.UnsharpMask(radius=.4, percent=48, threshold=2))
        rig_box = alpha_box(rig)
        frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = round(CANVAS[0] / 2 - (rig_box[0] + rig_box[2]) / 2)
        y = GROUND - rig_box[3]
        frame.alpha_composite(rig, (x, y))
        frames.append(frame)

    for index, frame in enumerate(frames, 1):
        frame.save(OUTPUT / f"combined_{index:02}.png", optimize=True)

    contact = Image.new("RGBA", (CANVAS[0] * 4, CANVAS[1] * 4), (21, 17, 25, 255))
    for index, frame in enumerate(frames):
        contact.alpha_composite(frame, ((index % 4) * CANVAS[0], (index // 4) * CANVAS[1]))
    contact.save(OUTPUT / "contact_sheet.png", optimize=True)
    print(f"Built {len(frames)} combined V7 frames at shared scale {scale:.4f}")


if __name__ == "__main__":
    build()
