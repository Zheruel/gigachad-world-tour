#!/usr/bin/env python3
"""Separate Rana's two chain poses that the component slicer joined together."""
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/frames/rana_5.png"
OUT = ROOT / "assets/frames"


def save_pose(name, box):
    source = Image.open(SRC).convert("RGBA")
    pose = source.crop(box)
    alpha_box = pose.getchannel("A").getbbox()
    if not alpha_box:
        raise RuntimeError(f"empty Rana pose: {name}")
    pose = pose.crop(alpha_box)
    canvas = Image.new("RGBA", (pose.width + 4, source.height), (0, 0, 0, 0))
    canvas.alpha_composite(pose, (2, source.height - 3 - pose.height))
    canvas.save(OUT / name)


def main():
    # A small overlap retains each chain end; the opaque character bodies do
    # not overlap even though the chain/spark components connected the poses.
    save_pose("rana_chain_lash.png", (0, 0, 142, 216))
    save_pose("rana_chain_slam.png", (132, 0, 286, 216))


if __name__ == "__main__":
    main()
