#!/usr/bin/env python3
"""Sheets, GIFs and the walk kymograph from tools/verification/lair_lion_review.cjs.

  ./.venv/bin/python tools/verification/lair_lion_sheets.py [dir]
    -> contact_poses_{1x,2x}.png, <seq>.gif, <seq>_strip.png (one tile per change of
       drawing, with the tick), walk_kymograph.png and a paw-slip figure on stdout

The kymograph stacks, one row per tick, the floor band under the lion (the bottom 3 logical
px) from the 1x walk: a paw that is down draws a vertical stripe, and a paw that skates
draws a slanted one.
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

D = Path(sys.argv[1] if len(sys.argv) > 1 else "tmp/review/lair_lion")
RIG = json.loads(re.search(r"LION_RIG = (\{.*\});", Path("js/lion_rig.js").read_text(), re.S).group(1))


def sheet(scale):
    where = {l.split()[0]: l.split()[1:] for l in (D / "poses.txt").read_text().split("\n") if l.strip()}
    tiles = []
    for p in RIG["poses"]:
        f = D / f"pose_{p}_{scale}x.png"
        if not f.exists():
            continue
        x, y, cam = (float(v) for v in where[p])
        cx = round(x - cam)
        box = [c * scale for c in (cx - 90, round(y) - 100, cx + 90, round(y) + 8)]
        im = Image.open(f).convert("RGB").crop(box)
        ImageDraw.Draw(im).text((4, 2), p, fill=(255, 255, 0))
        tiles.append(im)
    cols = 8
    w, h = tiles[0].size
    out = Image.new("RGB", (w * cols, h * ((len(tiles) + cols - 1) // cols)), (0, 0, 0))
    for i, t in enumerate(tiles):
        out.paste(t, ((i % cols) * w, (i // cols) * h))
    if scale == 1:
        out = out.resize((out.width * 2, out.height * 2), Image.NEAREST)
    out.save(D / f"contact_poses_{scale}x.png")


def load(name):
    files = sorted((D / name).glob("*.png"))
    log = [l.split() for l in (D / name / "log.txt").read_text().split("\n") if l.strip()]
    return files, log


def seq(name, every_ms, half=90):
    files, log = load(name)
    if not files:
        return
    frames = []
    for f, (state, pose, x, y, cam, face) in zip(files, log):
        im = Image.open(f).convert("RGB")
        s = im.width // 480
        cx = round(float(x) - float(cam))
        box = ((cx - half) * s, 120 * s, (cx + half) * s, 250 * s)
        frames.append((im.crop(box), pose, state))
    frames[0][0].save(D / f"{name}.gif", save_all=True, append_images=[f for f, _, _ in frames[1:]],
                      duration=every_ms, loop=0)
    keep = [i for i in range(len(frames)) if i == 0 or frames[i][1] != frames[i - 1][1]]
    # a walk changes drawing every few ticks: one cycle is enough for the strip
    keep = keep[:24]
    w, h = frames[0][0].size
    cols = 6
    strip = Image.new("RGB", (w * cols, h * ((len(keep) + cols - 1) // cols)))
    for n, i in enumerate(keep):
        t = frames[i][0].copy()
        ImageDraw.Draw(t).text((4, 2), f"{i} {frames[i][1]}", fill=(255, 255, 0))
        strip.paste(t, ((n % cols) * w, (n // cols) * h))
    strip.save(D / f"{name}_strip.png")


def kymograph(name="walk"):
    files, log = load(name)
    rows, xs = [], []
    for f, (state, pose, x, y, cam, face) in zip(files, log):
        a = np.asarray(Image.open(f).convert("RGB")).astype(int)
        fy = round(float(y))
        rows.append(a[fy - 3:fy])
        xs.append((pose, float(x) - float(cam)))
    k = np.concatenate([r for r in rows], 0).astype(np.uint8)
    img = Image.fromarray(k).resize((k.shape[1] * 2, k.shape[0] * 2), Image.NEAREST)
    img.save(D / f"{name}_kymograph.png")
    # paw slip: while a walk frame is held the lion's x must not change; and between frames
    # the planted paw must stay put, which the rig's measured strides guarantee
    held = sum(1 for i in range(1, len(xs)) if xs[i][0] == xs[i - 1][0] and xs[i][0][0] in "wr"
               and abs(xs[i][1] - xs[i - 1][1]) > 1e-6)
    print(f"{name}: {len(xs)} ticks, x moved while a gait frame was held on {held} ticks")


if __name__ == "__main__":
    sheet(2)
    sheet(1)
    for name, ms in (("getup", 33), ("walk", 17), ("run", 17), ("turn", 17),
                     ("liedown", 33), ("approach", 33), ("scatter", 50)):
        if (D / name).exists():
            seq(name, ms)
    kymograph("walk")
    kymograph("run")
    print(sorted(p.name for p in D.glob("*.gif")))
