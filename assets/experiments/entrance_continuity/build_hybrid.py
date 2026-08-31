#!/usr/bin/env python3
"""Composite pose-conditioned CHAD cels over one immutable motorcycle plate."""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
BIKE_SHEET = ROOT / "inputs/fixed_bike_4x1.png"
FOREGROUND_SHEET = ROOT / "inputs/fixed_bike_foreground_4x1.png"
OUTPUT = ROOT / "outputs/hybrid_locked_bike_4x1.png"

COLS = 4
CELL = (384, 1024)
TARGET_STANDING_HEIGHT = 344
GROUND_Y = 653
PLANTED_FOOT_X = [163, 163, 165, 166]


def split(sheet: Image.Image) -> list[Image.Image]:
    return [sheet.crop((index * CELL[0], 0, (index + 1) * CELL[0], CELL[1])) for index in range(COLS)]


def alpha_box(image: Image.Image) -> tuple[int, int, int, int]:
    box = image.getchannel("A").getbbox()
    if box is None:
        raise ValueError("empty hero cell")
    return box


def foot_anchor(image: Image.Image) -> float:
    alpha = np.asarray(image.getchannel("A"))
    ys, xs = np.nonzero(alpha > 96)
    bottom = ys.max()
    bottom_band = xs[ys >= bottom - max(5, round(image.height * .045))]
    return float(np.median(bottom_band))


bike_cells = split(Image.open(BIKE_SHEET).convert("RGBA"))
foreground_cells = split(Image.open(FOREGROUND_SHEET).convert("RGBA"))

hero_crops = [
    (lambda image: image.crop(alpha_box(image)))(
        Image.open(ROOT / f"processed/hero_only/hero_{index}.png").convert("RGBA")
    )
    for index in range(1, COLS + 1)
]
reference_height = hero_crops[-1].height
scale = TARGET_STANDING_HEIGHT / reference_height

result = Image.new("RGBA", (CELL[0] * COLS, CELL[1]), (255, 0, 255, 255))
for index, (hero, bike, foreground) in enumerate(zip(hero_crops, bike_cells, foreground_cells)):
    scaled = hero.resize(
        (round(hero.width * scale), round(hero.height * scale)),
        Image.Resampling.LANCZOS,
    )
    x = round(PLANTED_FOOT_X[index] - foot_anchor(scaled))
    y = GROUND_Y - scaled.height
    cell = bike.copy()
    cell.alpha_composite(scaled, (x, y))
    cell.alpha_composite(foreground)
    result.alpha_composite(cell, (index * CELL[0], 0))

result.convert("RGB").save(OUTPUT)
print(f"wrote {OUTPUT} with one locked bike plate; hero scale {scale:.4f}")
