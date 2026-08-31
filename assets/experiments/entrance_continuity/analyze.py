#!/usr/bin/env python3
"""Measure locked-region stability in motorcycle entrance sprite-sheet trials."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parent
TRIALS = {
    "baseline_production": (ROOT / "inputs/production_dismount_guide.png", 3, 2),
    "gpt_reference_locked": (ROOT / "outputs/gpt_reference_locked_3x2.png", 3, 2),
    "gpt_fixed_bike_edit": (ROOT / "outputs/gpt_fixed_bike_edit_3x2.png", 3, 2),
    "gpt_focused_swing": (ROOT / "outputs/gpt_focused_swing_4x1.png", 4, 1),
    "gpt_skeleton_conditioned": (ROOT / "outputs/gpt_skeleton_conditioned_4x1.png", 4, 1),
    "hybrid_locked_bike": (ROOT / "outputs/hybrid_locked_bike_4x1.png", 4, 1),
}


def cells(path: Path, columns: int, rows: int) -> list[np.ndarray]:
    image = np.asarray(Image.open(path).convert("RGB"), dtype=np.int16)
    height, width = image.shape[:2]
    result = []
    for row in range(rows):
        for column in range(columns):
            y0, y1 = round(row * height / rows), round((row + 1) * height / rows)
            x0, x1 = round(column * width / columns), round((column + 1) * width / columns)
            result.append(image[y0:y1, x0:x1])
    return result


def foreground(image: np.ndarray) -> np.ndarray:
    key = np.array([255, 0, 255], dtype=np.int16)
    return np.max(np.abs(image - key), axis=2) > 48


def measure(path: Path, columns: int, rows: int) -> dict[str, float | list[float]]:
    frames = cells(path, columns, rows)
    top_lines = []
    front_boxes = []
    front_regions = []
    for image in frames:
        mask = foreground(image)
        ys, xs = np.nonzero(mask)
        top_lines.append(float(ys.min() / image.shape[0]))

        # The lower-right part of every cell contains the front wheel/fork and
        # is not crossed by the dismounting leg. It is the best common locked
        # region available without semantic segmentation.
        y0 = round(image.shape[0] * .50)
        x0 = round(image.shape[1] * .55)
        region = image[y0:, x0:]
        region_mask = foreground(region)
        rys, rxs = np.nonzero(region_mask)
        front_boxes.append([
            float((rxs.min() + x0) / image.shape[1]),
            float((rys.min() + y0) / image.shape[0]),
            float((rxs.max() + x0) / image.shape[1]),
            float((rys.max() + y0) / image.shape[0]),
        ])
        front_regions.append(region)

    shape = np.array(front_boxes)
    shape_jitter = float(np.mean(np.std(shape, axis=0)))
    top_jitter = float(np.std(top_lines))
    consecutive_differences = []
    for left, right in zip(front_regions, front_regions[1:]):
        union = foreground(left) | foreground(right)
        delta = np.abs(left - right).mean(axis=2)
        consecutive_differences.append(float(delta[union].mean() / 255.0))
    return {
        "front_geometry_jitter": round(shape_jitter, 4),
        "front_pixel_change_mean": round(float(np.mean(consecutive_differences)), 4),
        "front_pixel_change_each_transition": [round(value, 4) for value in consecutive_differences],
        "subject_top_jitter": round(top_jitter, 4),
    }


print(json.dumps({name: measure(*spec) for name, spec in TRIALS.items()}, indent=2))
