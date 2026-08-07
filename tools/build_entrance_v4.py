#!/usr/bin/env python3
"""Cut the single hero master sheet used by the fixed-bike entrance."""

from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "ai" / "entrance_v4" / "hero_master_sheet.png"
OUTPUT = ROOT / "assets" / "story" / "entrance_v4"
CANVAS = (277, 186)
GROUND_Y = 181
SCALE = 0.55

# The model respected the 5x3 reading order but allowed a few poses to cross
# the notional cell borders. These connected-subject bounds recover each whole
# hero instead of slicing on the grid and accidentally borrowing a neighbour.
SOURCE_BOXES = [
    (104, 38, 286, 276), (434, 45, 611, 279), (747, 28, 894, 278),
    (1043, 28, 1209, 280), (1329, 44, 1518, 299),
    (82, 327, 290, 580), (373, 332, 655, 567), (737, 327, 960, 572),
    (1079, 338, 1251, 575), (1378, 344, 1540, 580),
    (113, 602, 281, 907), (405, 612, 606, 901), (759, 611, 886, 910),
    (1040, 616, 1180, 911), (1311, 633, 1509, 910),
]


def production_frame(subject: Image.Image) -> Image.Image:
    resized = subject.resize(
        (round(subject.width * SCALE), round(subject.height * SCALE)),
        Image.Resampling.LANCZOS,
    )
    resized = resized.filter(ImageFilter.UnsharpMask(radius=0.4, percent=45, threshold=2))
    bbox = resized.getchannel("A").getbbox()
    if bbox is None:
        raise ValueError("Hero sheet cell contains no visible subject")
    x = round(CANVAS[0] / 2 - (bbox[0] + bbox[2]) / 2)
    y = GROUND_Y - bbox[3]
    frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    frame.alpha_composite(resized, (x, y))
    return frame


def build() -> None:
    OUTPUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SOURCE).convert("RGBA")
    frames = []
    for box in SOURCE_BOXES:
        pad = 4
        crop = sheet.crop((box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad))
        frames.append(production_frame(crop))
    for index, frame in enumerate(frames, 1):
        frame.save(OUTPUT / f"hero_{index:02}.png", optimize=True)
    print(f"Built {len(frames)} fixed-scale hero frames at {CANVAS}")


if __name__ == "__main__":
    build()
