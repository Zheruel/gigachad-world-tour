#!/usr/bin/env python3
"""Checks on the lair lion's built art and rig (assets/lair/lion_*.png, js/lion_rig.js)
against the clips in js/hub.js.

  ./.venv/bin/python tools/verification/lair_lion_rig_check.py [--sheet out.png]

- slip: in the walk and the bound, a paw down in two frames running moves back by the
  frame's stride to within SLIP logical px (so x in step with it leaves it planted).
- turn: a turn on the spot travels at most TURN_TRAVEL; land: a paw stays planted through
  each frame of the landing.
- overlap: every change of drawing the clips make, laid over each other with the rig's
  edge shift, shares at least MIN_IOU of its silhouette (a lower figure reads as a cut).
--sheet writes every pose with its shadow marked, for eyeballing; --lineup the
concept beside every pose at 1x and 2x, on dark and light (<out>_1x.png, <out>_2x.png).
"""
import json
import re
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "production"))
from build_lair_lion import paws  # noqa: E402

RS = 2
SLIP = {"walk": 1.5, "run": 3.0}
MIN_IOU = 0.55
TURN_TRAVEL = 6.0
LAND_SLIP = 3.0

rig = json.loads(re.search(r"LION_RIG = (\{.*\});", Path("js/lion_rig.js").read_text(), re.S).group(1))
img = {p: Image.open(f"assets/lair/lion_{p}.png").convert("RGBA") for p in rig["poses"]}
fails = []


def mask(p):
    return np.asarray(img[p].getchannel("A")) > 128


def edge(a, b):
    e = rig["edge"]
    return e.get(f"{a}>{b}", -e[f"{b}>{a}"] if f"{b}>{a}" in e else 0)


# ---- slip
for g, l in (("walk", "w"), ("run", "r")):
    st = rig[g]["stride"]
    worst = 0
    for i in range(8):
        a, b = f"{l}{i}", f"{l}{(i + 1) % 8}"
        # frames share the canvas, so x on the canvas is x in the world plus the stride
        pa, pb = paws(img[a]), paws(img[b])
        slips = [abs((x - y) / RS - st[i]) for x in pa for y in pb if -4 <= (x - y) / RS <= 34]
        if slips:
            s = min(slips)
            worst = max(worst, s)
            if s > SLIP[g]:
                fails.append(f"slip {a}>{b}: planted paw moves {s:.1f} px against the stride {st[i]}")
    print(f"{g}: worst planted-paw slip {worst:.1f} logical px")

# ---- a turn on the spot: in, flip, out travels twice (edge + front pivot)
for a, b in (("turn", "turn_front"), ("sit_turn", "sit_front")):
    travel = 2 * (edge(a, b) + rig["pivot"].get(b, 0))
    print(f"{a}: travels {travel:.1f} logical px")
    if abs(travel) > TURN_TRAVEL:
        fails.append(f"turn {a}: travels {travel:.1f} px")

# ---- the landing: some paw stays planted (within LAND_SLIP) through each change of drawing
# (from r_land: into it he is still carried forward, reaching a paw out to brake)
land = ["r_land", "r_land2", "r_land3", "stand"]
for a, b in zip(land, land[1:]):
    if b not in img:
        continue
    d = edge(a, b) * RS
    s_ = min(abs(x - (y + d)) for x in paws(img[a]) for y in paws(img[b])) / RS
    print(f"land {a}>{b}: nearest paw moves {s_:.1f} logical px")
    if s_ > LAND_SLIP:
        fails.append(f"land {a}>{b}: no paw stays planted ({s_:.1f} px)")

# ---- overlap across every change of drawing in the clips
src = Path("js/hub.js").read_text()
block = src[src.index("const C = {"):src.index("};", src.index("const C = {"))]
FROM = dict(re.findall(r"(\w+): '(\w+)'", src[src.index("const FROM = {"):src.index("};", src.index("const FROM = {"))]))
pairs = set()
for name, body in re.findall(r"^\s+(\w+): (\[.*?\]\]),?$", block, re.M | re.S):
    seq = [FROM.get(name)] + re.findall(r"\['(\w+)', \d+", body)
    for a, b in zip(seq, seq[1:]):
        if a and a != b:
            pairs.add((a, b))
for g, l in (("walk", "w"), ("run", "r")):
    for i in rig[g]["stop"] + rig[g].get("start", []):
        pairs.add(("stand", f"{l}{i}"))
low = []
for a, b in sorted(pairs):
    ma, mb = mask(a), np.roll(mask(b), int(round(edge(a, b) * RS)), 1)
    iou = (ma & mb).sum() / max(1, (ma | mb).sum())
    low.append((iou, a, b))
    if iou < MIN_IOU:
        fails.append(f"overlap {a}>{b}: {iou:.2f}")
low.sort()
print("lowest overlaps:", ", ".join(f"{a}>{b} {i:.2f}" for i, a, b in low[:6]))

if "--sheet" in sys.argv:
    out = sys.argv[sys.argv.index("--sheet") + 1]
    tiles = []
    for p in rig["poses"]:
        t = Image.new("RGBA", img[p].size, (60, 60, 70, 255))
        t.alpha_composite(img[p])
        d = ImageDraw.Draw(t)
        w, h = t.size
        c, hw = rig["shadow"][p]
        d.line((w / 2 + c * RS - hw * RS, h - 2, w / 2 + c * RS + hw * RS, h - 2), fill=(0, 255, 0, 255), width=2)
        d.text((3, 3), p, fill=(255, 255, 0, 255))
        tiles.append(t)
    cols = 8
    tw, th = tiles[0].size
    s = Image.new("RGBA", (tw * cols, th * ((len(tiles) + cols - 1) // cols)))
    for i, t in enumerate(tiles):
        s.paste(t, ((i % cols) * tw, (i // cols) * th))
    s.save(out)

if "--lineup" in sys.argv:
    # the concept first, then every pose, at game scale (1x) and 2x, on dark and on light:
    # one identity across all of them, clean edges on both
    out = sys.argv[sys.argv.index("--lineup") + 1]
    concept = Image.open("assets/sources/production/lair/lion_concept.png").convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT)
    items = [("concept", concept)] + [(p, img[p].crop(img[p].getbbox())) for p in rig["poses"]]
    cols = 8
    for scale in (1, 2):
        cw, ch = 180 * scale // 1, 110 * scale // 1
        rows = (len(items) + cols - 1) // cols
        sheet = Image.new("RGBA", (cw * cols, ch * rows * 2), (0, 0, 0, 255))
        for band, bg in enumerate(((34, 24, 20, 255), (226, 220, 206, 255))):
            for i, (name, im) in enumerate(items):
                t = im.resize((im.width * scale // 2, im.height * scale // 2), Image.NEAREST if scale == 2 else Image.LANCZOS)
                tile = Image.new("RGBA", (cw, ch), bg)
                tile.alpha_composite(t, ((cw - t.width) // 2, ch - t.height - 4))
                ImageDraw.Draw(tile).text((3, 2), name, fill=(255, 200, 0, 255) if band == 0 else (120, 40, 0, 255))
                sheet.paste(tile, ((i % cols) * cw, (band * rows + i // cols) * ch))
        sheet.save(out.replace(".png", f"_{scale}x.png"))

print("\n".join("FAIL " + f for f in fails) or "PASS all")
sys.exit(1 if fails else 0)
