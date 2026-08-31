#!/usr/bin/env python3
"""Normalize every continuity trial to the entrance runtime frame contract."""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parent
PROJECT = ROOT.parents[2]
OUTPUT = ROOT / "review_frames"
CANVAS = (277, 186)
GROUND = 181
TARGET_MAX_HEIGHT = 142

TRIALS = [
    {
        "id": "baseline",
        "name": "Current production V8",
        "kind": "files",
        "paths": [PROJECT / f"assets/story/entrance_v8/combined_{index:02}.png" for index in range(8, 14)],
        "verdict": "Current benchmark",
        "note": "Best existing hand-selected V7/V8 dismount; some redraw and leg-path popping remain.",
    },
    {
        "id": "reference_locked",
        "name": "GPT reference-locked redraw",
        "kind": "grid",
        "path": ROOT / "processed/gpt_reference_locked_alpha.png",
        "columns": 3, "rows": 2, "count": 6,
        "verdict": "Worse",
        "note": "Strong prose constraints, but the airborne leg holds and the whole rig drifts.",
    },
    {
        "id": "fixed_bike_prompt",
        "name": "GPT “fixed bike” edit",
        "kind": "grid",
        "path": ROOT / "processed/gpt_fixed_bike_edit_alpha.png",
        "columns": 3, "rows": 2, "count": 6,
        "verdict": "Bike was still redrawn",
        "note": "Proves that telling GPT not to alter pixels does not make a complex prop immutable.",
    },
    {
        "id": "focused_prose",
        "name": "Focused four-cel prose strip",
        "kind": "grid",
        "path": ROOT / "processed/gpt_focused_swing_alpha.png",
        "columns": 4, "rows": 1, "count": 4,
        "verdict": "Stable but skips motion",
        "note": "Larger cells stabilize scale, but two nearly identical airborne poses jump to landing.",
    },
    {
        "id": "skeleton_combined",
        "name": "Skeleton-conditioned combined rig",
        "kind": "grid",
        "path": ROOT / "processed/gpt_skeleton_conditioned_alpha.png",
        "columns": 4, "rows": 1, "count": 4,
        "verdict": "Best one-shot GPT result",
        "note": "The explicit joint path improves the leg arc and character scale, but GPT still redraws the bike.",
    },
    {
        "id": "hero_only",
        "name": "Skeleton-conditioned CHAD layer",
        "kind": "files",
        "paths": [ROOT / f"processed/hero_only/hero_{index}.png" for index in range(1, 5)],
        "verdict": "Best controllable source layer",
        "note": "CHAD only. Intended to be composited over a canonical prop rather than shipped alone.",
        "targetHeight": 178,
    },
    {
        "id": "hybrid",
        "name": "CHAD layer + immutable bike",
        "kind": "grid",
        "path": ROOT / "processed/hybrid_locked_bike_alpha.png",
        "columns": 4, "rows": 1, "count": 4,
        "verdict": "Best production method",
        "note": "The bike is truly identical. The provisional joint scaffold still needs a cleaner saddle/hip path.",
    },
]


def grid_cells(path: Path, columns: int, rows: int, count: int) -> list[Image.Image]:
    sheet = Image.open(path).convert("RGBA")
    result = []
    for index in range(count):
        column, row = index % columns, index // columns
        x0 = round(column * sheet.width / columns)
        x1 = round((column + 1) * sheet.width / columns)
        y0 = round(row * sheet.height / rows)
        y1 = round((row + 1) * sheet.height / rows)
        result.append(sheet.crop((x0, y0, x1, y1)))
    return result


def subject(image: Image.Image) -> Image.Image:
    box = image.getchannel("A").point(lambda value: 255 if value >= 32 else 0).getbbox()
    if box is None:
        raise ValueError("empty review frame")
    return image.crop(box)


manifest = []
for trial in TRIALS:
    if trial["kind"] == "grid":
        raw = grid_cells(trial["path"], trial["columns"], trial["rows"], trial["count"])
    else:
        raw = [Image.open(path).convert("RGBA") for path in trial["paths"]]
    crops = [subject(image) for image in raw]
    target_height = trial.get("targetHeight", TARGET_MAX_HEIGHT)
    scale = min(
        target_height / max(image.height for image in crops),
        (CANVAS[0] - 8) / max(image.width for image in crops),
    )
    destination = OUTPUT / trial["id"]
    destination.mkdir(parents=True, exist_ok=True)
    frame_paths = []
    for index, image in enumerate(crops, 1):
        resized = image.resize(
            (round(image.width * scale), round(image.height * scale)),
            Image.Resampling.LANCZOS,
        ).filter(ImageFilter.UnsharpMask(radius=.4, percent=48, threshold=2))
        frame = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
        x = round((CANVAS[0] - resized.width) / 2)
        frame.alpha_composite(resized, (x, GROUND - resized.height))
        filename = f"frame_{index:02}.png"
        frame.save(destination / filename, optimize=True)
        frame_paths.append(f"assets/experiments/entrance_continuity/review_frames/{trial['id']}/{filename}")
    manifest.append({
        "id": trial["id"],
        "name": trial["name"],
        "verdict": trial["verdict"],
        "note": trial["note"],
        "frames": frame_paths,
        "scale": round(scale, 4),
    })

(OUTPUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
print(f"wrote {sum(len(trial['frames']) for trial in manifest)} review frames across {len(manifest)} trials")
