#!/usr/bin/env python3
"""Crop the stage plate at each background actor's position.

The crops are fed to the generator as reference images. Matching an actor to the
plate in post can only rescale what came back; handing the model the exact stall it
has to stand in gets the palette, the grade and the light direction right at source,
which is the difference between a figure that belongs and one that is pasted on.

  npc_refs.py            -> assets/ai/npcref/<kind>_<x>.png
"""
import os
import re

from PIL import Image

RS = 2
FLOOR_Y = 181          # logical: where the facades meet the street
OUT = "assets/ai/npcref/"
PAD = 200              # device px of context either side


def crowd_from_stage():
    src = open("js/stages.js").read()
    block = src[src.index("crowd: ["):src.index("waves: [")]
    out = []
    for line in block.splitlines():
        m = re.search(r"kind: '(\w+)', x: (\d+), y: (\d+)", line)
        if m:
            out.append((m.group(1), int(m.group(2)), int(m.group(3))))
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    wall = Image.open("assets/bg_delhi_wall.png").convert("RGB")
    floor = Image.open("assets/bg_delhi_floor.png").convert("RGB")
    scene = Image.new("RGB", (wall.width, 270 * RS))
    scene.paste(wall, (0, 0))
    for x in range(0, scene.width, floor.width):
        scene.paste(floor, (x, FLOOR_Y * RS))

    seen = set()
    for kind, x, _y in crowd_from_stage():
        if kind in seen:
            continue
        seen.add(kind)
        cx = x * RS
        box = (max(0, cx - PAD), 0, min(scene.width, cx + PAD), 250 * RS)
        scene.crop(box).save(f"{OUT}{kind}.png")
        print(f"  {kind} @ {x}")


if __name__ == "__main__":
    main()
