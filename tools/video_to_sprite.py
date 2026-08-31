#!/usr/bin/env python3
"""Turn an image-to-video result into registered game-ready sprite candidates.

This is deliberately an ingestion/cleanup tool, not a claim that every video frame is
usable. It samples more frames than the final animation needs, keys a chroma background,
keeps the main connected subject, selects evenly spaced candidates, applies one scale
and one registration rule, then quantizes the whole sequence against one palette.

Example:
  ./.venv/bin/python tools/video_to_sprite.py tiger-prowl.mp4 \
    assets/experiments/video/tiger-prowl --frames 8 --target-height 116 --anchor torso
"""
from __future__ import annotations

import argparse
import json
import shutil
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from build_animation_experiments import rescale_set, torso_place, trim
from build_lair_extras import biggest_blob, finish_set, place
from process_char import hard_alpha, key_green


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("video", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("--frames", type=int, default=8,
                        help="final evenly spaced candidate count (default: 8)")
    parser.add_argument("--scan-fps", type=float, default=12,
                        help="temporary extraction rate before selection (default: 12)")
    parser.add_argument("--target-height", type=int, required=True,
                        help="maximum subject height in device pixels")
    parser.add_argument("--anchor", choices=("torso", "feet"), default="torso")
    parser.add_argument("--key-tolerance", type=int, default=52,
                        help="green-screen tolerance (default: 52)")
    parser.add_argument("--colors", type=int, default=48)
    return parser.parse_args()


def extract(video: Path, directory: Path, fps: float) -> list[Path]:
    if not shutil.which("ffmpeg"):
        raise SystemExit("ffmpeg is required but was not found on PATH")
    pattern = directory / "%05d.png"
    subprocess.run([
        "ffmpeg", "-v", "error", "-i", str(video),
        "-vf", f"fps={fps}", str(pattern),
    ], check=True)
    return sorted(directory.glob("*.png"))


def choose(paths: list[Path], count: int) -> list[Path]:
    if len(paths) < count:
        raise SystemExit(f"video yielded {len(paths)} frames; need at least {count}")
    if count == 1:
        return [paths[len(paths) // 2]]
    return [paths[round(i * (len(paths) - 1) / (count - 1))]
            for i in range(count)]


def prepare(path: Path, tolerance: int) -> Image.Image:
    image = Image.open(path).convert("RGBA")
    # Video formats do not preserve alpha. A solid green generation background is the
    # predictable interchange format and survives ordinary video compression well.
    image = hard_alpha(key_green(image, tol=tolerance), 105)
    return trim(biggest_blob(image))


def main() -> None:
    args = parse_args()
    if not args.video.is_file():
        raise SystemExit(f"video not found: {args.video}")
    if args.frames < 2:
        raise SystemExit("--frames must be at least 2")
    args.output.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory(prefix="gachi-video-sprites-") as temp:
        extracted = extract(args.video, Path(temp), args.scan_fps)
        selected = choose(extracted, args.frames)
        frames = [prepare(path, args.key_tolerance) for path in selected]

    frames = rescale_set(frames, args.target_height)
    frames = torso_place(frames) if args.anchor == "torso" else place(frames)
    frames = finish_set(frames, args.colors)
    for i, frame in enumerate(frames):
        frame.save(args.output / f"{i}.png")

    metadata = {
        "source": str(args.video),
        "frames": args.frames,
        "scan_fps": args.scan_fps,
        "target_height": args.target_height,
        "anchor": args.anchor,
        "key_tolerance": args.key_tolerance,
        "colors": args.colors,
        "note": "Review every candidate frame manually; do not install raw video frames.",
    }
    (args.output / "pipeline.json").write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"wrote {args.frames} registered frames to {args.output}")


if __name__ == "__main__":
    main()
