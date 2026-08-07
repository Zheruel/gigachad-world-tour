#!/usr/bin/env python3
"""Composite every background actor onto the real stage at its authored position.

Placement can only be judged against the art it sits in front of - whether a stall
holder lines up with a stall, whether someone on the street is standing at a sensible
depth, whether anything overlaps a pillar. This rebuilds the scene exactly as
drawStage does (wall, then tiled floor, then actors) and writes one crop per actor.

  preview_crowd.py            -> /tmp/crowd/<kind>_<x>.png plus a contact sheet
"""
import os
import re
import sys

from PIL import Image

RS = 2
FLOOR_Y = 181          # logical: where the facades meet the street
W, H = 480, 270        # logical view
FLOOR_W = 1350         # logical tile period
OUT = "/tmp/crowd/"


def crowd_from_stage():
    src = open("js/stages.js").read()
    block = src[src.index("crowd: ["):src.index("waves: [")]
    out = []
    for line in block.splitlines():
        m = re.search(r"kind: '(\w+)', x: (\d+), y: (\d+)", line)
        if not m:
            continue
        out.append({
            "kind": m.group(1), "x": int(m.group(2)), "y": int(m.group(3)),
            "flip": "flip: true" in line,
            "patrol": "patrol:" in line,
        })
    return out


def build_scene():
    wall = Image.open("assets/bg_delhi_wall.png").convert("RGBA")
    floor = Image.open("assets/bg_delhi_floor.png").convert("RGBA")
    scene = Image.new("RGBA", (wall.width, H * RS), (0, 0, 0, 255))
    scene.paste(wall, (0, 0))
    x = 0
    while x < scene.width:
        scene.paste(floor, (x, FLOOR_Y * RS))
        x += floor.width
    return scene


def main():
    os.makedirs(OUT, exist_ok=True)
    scene = build_scene()
    actors = crowd_from_stage()
    shots = []
    for a in actors:
        frames = sorted(f for f in os.listdir("assets/npc")
                        if f.startswith(a["kind"]) and f[len(a["kind"]):-4].isdigit())
        if not frames:
            print(f"  no art for {a['kind']}")
            continue
        img = Image.open("assets/npc/" + frames[0]).convert("RGBA")
        if a["flip"]:
            img = img.transpose(Image.FLIP_LEFT_RIGHT)
        shot = scene.copy()
        shot.alpha_composite(img, (a["x"] * RS - img.width // 2, a["y"] * RS - img.height))
        # a view-sized crop centred on the actor
        cx = min(max(a["x"] * RS - W * RS // 2, 0), scene.width - W * RS)
        crop = shot.crop((cx, 0, cx + W * RS, H * RS))
        name = f"{a['kind']}_{a['x']}{'_patrol' if a['patrol'] else ''}"
        crop.save(f"{OUT}{name}.png")
        shots.append((name, crop))
        print(f"  {name}")

    # contact sheet, two per row, halved
    if shots:
        tw, th = W * RS // 2, H * RS // 2
        cols = 2
        rows = (len(shots) + cols - 1) // cols
        sheet = Image.new("RGB", (tw * cols, th * rows), (12, 10, 16))
        for i, (name, c) in enumerate(shots):
            sheet.paste(c.resize((tw, th), Image.LANCZOS).convert("RGB"),
                        ((i % cols) * tw, (i // cols) * th))
        sheet.save(f"{OUT}_sheet.png")
        print(f"\ncontact sheet: {OUT}_sheet.png  ({sheet.width}x{sheet.height})")


if __name__ == "__main__":
    main()
