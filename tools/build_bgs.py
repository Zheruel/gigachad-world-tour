#!/usr/bin/env python3
"""Assemble AI room art into game-ready stage strips.

A stage wall is a single strip WIDTH x 150 in 1:1 world space, built from
panels cropped out of 1536x1024 generations. Each panel crops a band whose
bottom sits exactly on the room's floor line, so no vertical squashing is
needed, then downscales to PANEL_W x 150.

Floor tiles are built mirrored (A + flip(A)) so they tile seamlessly.
"""
import sys
import numpy as np
from PIL import Image, ImageEnhance

PANEL_H = 362   # logical 181 x RS
FLOOR_H = 178   # logical 89 x RS


def panel(src, floor_y, panel_w, x0=0.0, x1=1.0, flip=False):
    """Crop the band above floor_y with the right aspect, scaled to panel_w x 150."""
    img = Image.open(src).convert("RGB")
    W, H = img.size
    left, right = int(x0 * W), int(x1 * W)
    band_w = right - left
    band_h = int(round(band_w * PANEL_H / panel_w))
    top = max(0, floor_y - band_h)
    img = img.crop((left, top, right, floor_y))
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    img = img.resize((panel_w * 3, PANEL_H * 3), Image.LANCZOS)
    return img.resize((panel_w, PANEL_H), Image.LANCZOS)


def match_stats(img, mean, std):
    """Pull a panel's per-channel mean and spread onto a shared target.

    Adjacent plates come out of the generator at different exposures and colour
    temperatures; without this the join is a hard tonal step that no amount of
    blending hides.
    """
    a = np.asarray(img, dtype=np.float32)
    for c in range(3):
        m, sd = a[..., c].mean(), a[..., c].std()
        if sd < 1e-3:
            continue
        a[..., c] = (a[..., c] - m) / sd * std[c] + mean[c]
    return np.clip(a, 0, 255)


def build_wall(out, width, panels, colors=96, bright=1.0, overlap=150):
    """Stitch panels into one strip with no visible joins.

    Panels are laid at a pitch of (panel_w - overlap) so consecutive panels share a
    band, and that band is cross-faded with a linear ramp. The old version butted
    them edge to edge and then darkened the seam, which drew a vertical bar exactly
    where the cut was.
    """
    imgs = []
    for spec in panels:
        imgs.append(panel(*spec[:-1], **spec[-1]) if isinstance(spec[-1], dict) else panel(*spec))

    # One shared colour target. The mean is averaged so exposure and temperature
    # line up across the join, but the spread targets the punchier end of the set -
    # averaging the standard deviation too flattens every plate to the dullest one,
    # which drains the whole street.
    arrs = [np.asarray(p, dtype=np.float32) for p in imgs]
    mean = np.mean([a.reshape(-1, 3).mean(axis=0) for a in arrs], axis=0)
    std = np.percentile([a.reshape(-1, 3).std(axis=0) for a in arrs], 80, axis=0)
    arrs = [match_stats(p, mean, std) for p in imgs]

    acc = np.zeros((PANEL_H, width, 3), dtype=np.float32)
    wsum = np.zeros((1, width, 1), dtype=np.float32)

    x, i = 0, 0
    while x < width:
        a = arrs[i % len(arrs)]
        pw = a.shape[1]
        take = min(pw, width - x)
        ramp = np.ones(pw, dtype=np.float32)
        if i > 0:                                   # fade in across the shared band
            ramp[:overlap] = np.linspace(0.0, 1.0, overlap)
        if x + pw < width:                          # fade out into the next panel
            ramp[-overlap:] = np.minimum(ramp[-overlap:], np.linspace(1.0, 0.0, overlap))
        r = ramp[:take].reshape(1, take, 1)
        acc[:, x:x + take] += a[:, :take] * r
        wsum[:, x:x + take] += r
        x += pw - overlap
        i += 1

    strip = Image.fromarray(np.clip(acc / np.maximum(wsum, 1e-3), 0, 255).astype(np.uint8))
    # normalising toward a shared target costs some bite; put it back
    strip = ImageEnhance.Color(strip).enhance(1.22)
    strip = ImageEnhance.Contrast(strip).enhance(1.10)
    if bright != 1.0:
        strip = ImageEnhance.Brightness(strip).enhance(bright)
    q = strip.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    q.save(out)
    print(f"saved {out} ({q.width}x{q.height}) - {i} panels, {overlap}px cross-fade")


def build_floor(out, src, top, bottom, colors=64, bright=1.0, tile_w=900):
    img = Image.open(src).convert("RGB")
    W, H = img.size
    img = img.crop((0, int(top * H), W, int(bottom * H)))
    if bright != 1.0:
        img = ImageEnhance.Brightness(img).enhance(bright)
    hw = tile_w // 2
    half = img.resize((hw * 3, FLOOR_H * 3), Image.LANCZOS).resize((hw, FLOOR_H), Image.LANCZOS)
    tile = Image.new("RGB", (tile_w, FLOOR_H))
    tile.paste(half, (0, 0))
    tile.paste(half.transpose(Image.FLIP_LEFT_RIGHT), (hw, 0))
    q = tile.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    q.save(out)
    print(f"saved {out} ({q.width}x{q.height})")


A = "assets/ai/"

JOBS = {
    "dungeon": lambda: (
        build_wall("assets/bg_dungeon_wall.png", 3800, [
            (A + "bg_dungeon_a.png", 690, 1268),
            (A + "bg_dungeon_b.png", 660, 1268),
            (A + "bg_dungeon_c.png", 700, 1264),
        ]),
        build_floor("assets/bg_dungeon_floor.png", A + "bg_dungeon_floor.png", 0.04, 1.0, bright=1.35, tile_w=3600),
    ),
    "locker": lambda: (
        build_wall("assets/bg_locker_wall.png", 4000, [
            (A + "bg_locker_a.png", 700, 1000),
            (A + "bg_sauna_a.png", 836, 1000),
            (A + "bg_locker_b.png", 700, 1000),
            (A + "bg_sauna_b.png", 819, 1000),
        ]),
        build_floor("assets/bg_locker_floor.png", A + "bg_sauna_floor.png", 0.04, 1.0, bright=1.15, tile_w=3600),
    ),
    "oil": lambda: (
        build_wall("assets/bg_oil_wall.png", 4000, [
            (A + "bg_oil_a.png", 690, 1334),
            (A + "bg_oil_b.png", 690, 1334),
            (A + "bg_oil_a.png", 690, 1332, {"flip": True}),
        ]),
        build_floor("assets/bg_oil_floor.png", A + "bg_oil_floor.png", 0.04, 1.0, bright=1.25, tile_w=3600),
    ),
    "arena": lambda: (
        build_wall("assets/bg_arena_wall.png", 4200, [
            (A + "bg_arena_a.png", 700, 1400),
            (A + "bg_arena_b.png", 700, 1400),
            (A + "bg_arena_a.png", 700, 1400, {"flip": True}),
        ]),
        build_floor("assets/bg_arena_floor.png", A + "bg_arena_floor.png", 0.04, 1.0, tile_w=3600),
    ),
    "gym": lambda: (
        build_wall("assets/bg_wall.png", 3600, [
            (A + "bg_gymwall.png", 700, 1200, {"x0": 0.0, "x1": 1.0}),
            (A + "bg_gymwall.png", 700, 1200, {"x0": 0.0, "x1": 1.0, "flip": True}),
            (A + "bg_gymwall.png", 700, 1200, {"x0": 0.0, "x1": 1.0}),
        ]),
        build_floor("assets/bg_floor.png", A + "bg_gymfloor2.png", 0.04, 1.0, tile_w=3600),
    ),
    # STAGE 1 - CHANDNI CHOWK. 2700 logical x RS = 5400 wide, 362 tall.
    # The second number per panel is the source y of the kerb line: the crop
    # bottom sits exactly there so every panel's street lines up.
    "delhi": lambda: (
        build_wall("assets/bg_delhi_wall.png", 5400, [
            (A + "bg_delhi3_a.png", 780, 780),
            (A + "bg_delhi3_d.png", 785, 780),
            (A + "bg_delhi3_c.png", 775, 780),
            (A + "bg_delhi3_b.png", 785, 780),
            (A + "bg_delhi3_e.png", 780, 780),
            (A + "bg_delhi3_c.png", 775, 780, {"flip": True}),
            (A + "bg_delhi3_a.png", 780, 780, {"flip": True}),
        ], bright=1.06),
        build_floor("assets/bg_delhi_floor.png", A + "bg_delhi3_floor.png", 0.30, 1.0, bright=1.24, tile_w=2700),
    ),
    "title": lambda: pixel_art(A + "title_keyart2.png", "assets/title_art.png", 640, 372, 96),
    "ending": lambda: pixel_art(A + "ending_art.png", "assets/ending_art.png", 640, 372, 96),
}


def pixel_art(src, dst, w, h, colors):
    img = Image.open(src).convert("RGB")
    W, H = img.size
    target = w / h
    if W / H > target:  # crop width
        nw = int(H * target)
        img = img.crop(((W - nw) // 2, 0, (W + nw) // 2, H))
    else:
        nh = int(W / target)
        img = img.crop((0, 0, W, nh))
    img = img.resize((w * 4, h * 4), Image.LANCZOS).resize((w, h), Image.LANCZOS)
    q = img.quantize(colors=colors, method=Image.MEDIANCUT, dither=Image.NONE).convert("RGB")
    q.save(dst)
    print(f"saved {dst} ({w}x{h})")


if __name__ == "__main__":
    names = sys.argv[1:] or list(JOBS)
    for n in names:
        JOBS[n]()
