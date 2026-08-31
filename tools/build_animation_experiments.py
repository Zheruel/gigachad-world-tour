#!/usr/bin/env python3
"""Build final-size animation-pipeline experiments for the lair review.

This keeps generated source art immutable under
assets/experiments/animation_pipeline/generated and writes registered,
shared-palette frames under processed.  It intentionally compares:

  current       the production asset set
  direct sheet  one prompt asked to solve design and motion at once
  hybrid sheet  one strong single-pose anchor, then a sheet derived from it

The baitfish is a different scale problem.  At seven logical pixels high the body
must never redraw, so its experiment uses one generated anchor and derives only a
one-device-pixel tail twitch in code.
"""
from __future__ import annotations

import json
import os
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image

from build_lair_extras import (
    RS, SOFA_H, best_shift, biggest_blob, finish_set, keyed, place, register, rescale,
)
from process_char import hard_alpha, key_green
from slice_sheet import components


ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / "assets/experiments/animation_pipeline"
GEN = BASE / "generated"
OUT = BASE / "processed"
BASELINE = BASE / "baseline"


def checker_to_alpha(image: Image.Image) -> Image.Image:
    """Flood away a baked near-white checkerboard without erasing white subjects.

    Some built-in generations preview as transparent but arrive as RGB with the
    transparency checker baked in.  The subject's dark outline closes its white fur
    or bright skin off from the image edge, so connected-background removal is safe.
    """
    if image.mode == "RGBA" and image.getchannel("A").getextrema()[0] < 255:
        return image

    rgb = np.asarray(image.convert("RGB"))
    hi = rgb.min(axis=2) >= 232
    neutral = (rgb.max(axis=2) - rgb.min(axis=2)) <= 16
    candidate = hi & neutral
    h, w = candidate.shape
    outside = np.zeros((h, w), dtype=bool)
    q: deque[tuple[int, int]] = deque()

    for x in range(w):
        if candidate[0, x]: q.append((0, x))
        if candidate[h - 1, x]: q.append((h - 1, x))
    for y in range(h):
        if candidate[y, 0]: q.append((y, 0))
        if candidate[y, w - 1]: q.append((y, w - 1))

    while q:
        y, x = q.popleft()
        if outside[y, x] or not candidate[y, x]:
            continue
        outside[y, x] = True
        if y: q.append((y - 1, x))
        if y + 1 < h: q.append((y + 1, x))
        if x: q.append((y, x - 1))
        if x + 1 < w: q.append((y, x + 1))

    rgba = np.dstack((rgb, np.where(outside, 0, 255))).astype(np.uint8)
    return hard_alpha(Image.fromarray(rgba, "RGBA"), 110)


def trim(image: Image.Image) -> Image.Image:
    image = checker_to_alpha(image)
    box = image.getchannel("A").getbbox()
    return image.crop(box) if box else image


def split_grid(path: Path, cols: int, rows: int) -> list[Image.Image]:
    image = checker_to_alpha(Image.open(path))
    cw, ch = image.width // cols, image.height // rows
    frames = []
    for row in range(rows):
        for col in range(cols):
            x0, y0 = col * cw, row * ch
            x1 = image.width if col == cols - 1 else (col + 1) * cw
            y1 = image.height if row == rows - 1 else (row + 1) * ch
            frames.append(trim(image.crop((x0, y0, x1, y1))))
    return frames


def split_green_grid(path: Path, cols: int, rows: int) -> list[Image.Image]:
    image = hard_alpha(key_green(Image.open(path), tol=40), 110)
    cw, ch = image.width // cols, image.height // rows
    frames = []
    for row in range(rows):
        for col in range(cols):
            x0, y0 = col * cw, row * ch
            x1 = image.width if col == cols - 1 else (col + 1) * cw
            y1 = image.height if row == rows - 1 else (row + 1) * ch
            frames.append(trim(image.crop((x0, y0, x1, y1))))
    return frames


def keep_scene_components(image: Image.Image, ratio: float = 0.06) -> Image.Image:
    """Drop slivers borrowed from a neighbouring grid cell, keeping sofa + table."""
    alpha = np.asarray(image.getchannel("A")) > 16
    blobs = components(alpha, min_pixels=8)
    if not blobs:
        return image
    limit = max(len(blob["xs"]) for blob in blobs) * ratio
    keep = np.zeros_like(alpha)
    for blob in blobs:
        if len(blob["xs"]) >= limit:
            keep[blob["ys"], blob["xs"]] = True
    pixels = np.asarray(image).copy()
    pixels[~keep, 3] = 0
    return trim(Image.fromarray(pixels, "RGBA"))


def rescale_set(frames: list[Image.Image], target_h: int) -> list[Image.Image]:
    factor = target_h / max(frame.height for frame in frames)
    out = []
    for frame in frames:
        w, h = max(1, round(frame.width * factor)), max(1, round(frame.height * factor))
        out.append(frame.resize((w * 3, h * 3), Image.Resampling.LANCZOS)
                         .resize((w, h), Image.Resampling.LANCZOS))
    return out


def rescale_factor(frames: list[Image.Image], factor: float) -> list[Image.Image]:
    out = []
    for frame in frames:
        w, h = max(1, round(frame.width * factor)), max(1, round(frame.height * factor))
        out.append(frame.resize((w * 3, h * 3), Image.Resampling.LANCZOS)
                         .resize((w, h), Image.Resampling.LANCZOS))
    return out


def left_bottom_place(frames: list[Image.Image], pad: int = 2) -> list[Image.Image]:
    """Register furniture sets on their invariant left edge and floor line."""
    w = max(frame.width for frame in frames) + pad * 2
    h = max(frame.height for frame in frames) + pad
    out = []
    for frame in frames:
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(frame, (pad, h - frame.height), frame)
        out.append(canvas)
    return out


def torso_place(frames: list[Image.Image], pad: int = 2) -> list[Image.Image]:
    """Ground the paws but lock horizontal registration to the ribcage.

    Paw extrema are animation, not an anchor.  Re-centring on them makes a correct
    in-place walk slide left and right.  The central upper silhouette is the torso and
    stays close to the animal's centre of mass throughout a prowl.
    """
    anchors = []
    for frame in frames:
        alpha = np.asarray(frame.getchannel("A")) > 128
        h, w = alpha.shape
        torso = alpha.copy()
        torso[:, :int(w * 0.24)] = False
        torso[:, int(w * 0.76):] = False
        torso[int(h * 0.62):] = False
        ys, xs = np.nonzero(torso)
        anchors.append(float(xs.mean()) if len(xs) else w / 2)
    left = max(anchors)
    right = max(frame.width - x for frame, x in zip(frames, anchors))
    w = int(round(left + right)) + pad * 2
    h = max(frame.height for frame in frames) + pad
    out = []
    for frame, anchor in zip(frames, anchors):
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        canvas.paste(frame, (int(round(pad + left - anchor)), h - frame.height), frame)
        out.append(canvas)
    return out


def save_set(name: str, frames: list[Image.Image], colors: int) -> list[Image.Image]:
    directory = OUT / name
    directory.mkdir(parents=True, exist_ok=True)
    # A shorter regenerated set must not leave a stale numbered frame behind.
    for path in directory.glob("*.png"):
        path.unlink()
    finished = finish_set(frames, colors)
    for i, frame in enumerate(finished):
        frame.save(directory / f"{i}.png")
    return finished


def alpha_churn(frames: list[Image.Image]) -> list[float]:
    masks = [np.asarray(frame.getchannel("A")) > 128 for frame in frames]
    return [100 * (masks[i] ^ masks[(i + 1) % len(masks)]).sum()
            / max(1, masks[i].sum()) for i in range(len(masks))]


def body_churn(frames: list[Image.Image], tail_fraction: float = 0.28) -> list[float]:
    """Silhouette change after excluding the deliberately animated left tail fan."""
    masks = [np.asarray(frame.getchannel("A")) > 128 for frame in frames]
    x = int(masks[0].shape[1] * tail_fraction)
    bodies = [mask[:, x:] for mask in masks]
    return [100 * (bodies[i] ^ bodies[(i + 1) % len(bodies)]).sum()
            / max(1, bodies[i].sum()) for i in range(len(bodies))]


def lower_band_churn(frames: list[Image.Image], start: float = 0.55) -> list[float]:
    masks = [np.asarray(frame.getchannel("A")) > 128 for frame in frames]
    y = int(masks[0].shape[0] * start)
    ref = masks[0][y:]
    return [100 * (ref ^ mask[y:]).sum() / max(1, ref.sum()) for mask in masks]


def lock_couch(frames: list[Image.Image]) -> list[Image.Image]:
    """Freeze the fixture while allowing skin pixels from the moving arm over it.

    The lower half, far sofa arm, and side table are invariants.  In the upper middle,
    restore only dark pixels when the new frame is also dark/empty; this fills leather
    that a moving arm uncovered without painting the sofa over the arm itself.
    """
    base = np.asarray(frames[0]).copy()
    h, w = base.shape[:2]
    yy, xx = np.mgrid[:h, :w]
    base_lum = base[..., :3].mean(axis=2)
    base_alpha = base[..., 3] > 16
    hard_lock = (yy >= int(h * 0.52)) | (xx < int(w * 0.20)) | (xx >= int(w * 0.80))
    out = [frames[0]]
    for frame in frames[1:]:
        pixels = np.asarray(frame).copy()
        lum = pixels[..., :3].mean(axis=2)
        alpha = pixels[..., 3] > 16
        leather = base_alpha & (base_lum < 78) & ((lum < 105) | ~alpha)
        mask = hard_lock | leather
        pixels[mask] = base[mask]
        out.append(Image.fromarray(pixels, "RGBA"))
    return out


def dilate(mask: np.ndarray, steps: int = 1) -> np.ndarray:
    """Small dependency-free binary dilation used to grow an actor matte."""
    out = mask.copy()
    for _ in range(steps):
        p = np.pad(out, 1)
        out = (p[1:-1, 1:-1] | p[:-2, 1:-1] | p[2:, 1:-1]
               | p[1:-1, :-2] | p[1:-1, 2:])
    return out


def actor_matte(empty: Image.Image, pose: Image.Image) -> np.ndarray:
    """Recover CHAD from a full-scene pose without inheriting redrawn leather.

    The generated source does not contain layers.  Strong skin, denim and blond pixels
    form a conservative seed; only nearby pixels that substantially differ from the
    canonical empty fixture may join it.  This captures dark vest/boots/outlines while
    keeping the sofa's changing highlights out of the matte.
    """
    e = np.asarray(empty).astype(np.int32)
    p = np.asarray(pose).astype(np.int32)
    opaque = p[..., 3] > 16
    empty_opaque = e[..., 3] > 16
    rgb = p[..., :3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    diff = np.sqrt(((p[..., :3] - e[..., :3]) ** 2).sum(axis=2))

    skin = (r > 92) & (r > g * 1.13) & (g > b * 1.12)
    denim = (b > 56) & (b > r * 1.10) & (b > g * 1.03)
    blond = (r > 125) & (g > 88) & (b < 115) & (r > g * 1.06)
    seed = opaque & (skin | denim | blond | ~empty_opaque)

    h, w = opaque.shape
    yy, xx = np.mgrid[:h, :w]
    # Nothing above the couch back can be furniture, so keep the full vertical range;
    # excluding the top 8% clipped the blond crown in the first matte pass.
    actor_zone = (xx > w * .19) & (xx < w * .72)
    candidate = opaque & actor_zone & ((diff > 27) | ~empty_opaque)
    matte = seed & actor_zone
    # Grow only through pixels that differ from the canonical plate. Limited growth
    # reaches black clothing without flooding along small leather redraws.
    for _ in range(11):
        matte |= dilate(matte) & candidate
    matte = dilate(matte, 1) & opaque & actor_zone
    # Reject the long sofa seam and isolated tuft highlights that differ enough to join
    # the foreground candidate. This union follows the only regions CHAD can occupy
    # across the seven authored poses: upper body/arms, then trousers and boots.
    anatomy_zone = (
        ((xx > w * .34) & (xx < w * .59) & (yy < h * .66))
        | ((xx > w * .19) & (xx < w * .43) & (yy > h * .12) & (yy < h * .58))
        | ((xx > w * .50) & (xx < w * .72) & (yy > h * .10) & (yy < h * .64))
        | ((xx > w * .31) & (xx < w * .70) & (yy > h * .39))
    )
    return matte & anatomy_zone


def canonical_couch(frames: list[Image.Image]) -> list[Image.Image]:
    """Composite every moving pose over the exact same empty sofa/table pixels."""
    empty = frames[0]
    e = np.asarray(empty)
    out = [empty]
    for pose in frames[1:]:
        p = np.asarray(pose)
        matte = actor_matte(empty, pose)
        pixels = e.copy()
        pixels[matte] = p[matte]
        out.append(Image.fromarray(pixels, "RGBA"))
    return out


def generated_set(stem: str, cols: int, rows: int, target_h: int,
                  furniture: bool = False) -> list[Image.Image]:
    frames = split_grid(GEN / f"{stem}.png", cols, rows)
    frames = ([keep_scene_components(frame) for frame in frames] if furniture
              else [biggest_blob(frame) for frame in frames])
    frames = rescale_set(frames, target_h)
    frames = left_bottom_place(frames) if furniture else torso_place(frames)
    return save_set(stem, frames, 72 if furniture else 48)


def current_set(name: str, paths: list[Path], furniture: bool = False) -> list[Image.Image]:
    frames = [Image.open(path).convert("RGBA") for path in paths]
    # Production frames already share a canvas and palette; copy them verbatim.
    directory = OUT / name
    directory.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames):
        frame.save(directory / f"{i}.png")
    return frames


def tail_from_anchor(stem: str, target_h: int, output: str) -> list[Image.Image]:
    anchor = trim(Image.open(GEN / f"{stem}.png").convert("RGBA"))
    anchor = rescale_set([anchor], target_h)[0]
    anchor = hard_alpha(anchor, 90)
    canvas = Image.new("RGBA", (anchor.width + 4, anchor.height + 4), (0, 0, 0, 0))
    canvas.paste(anchor, (2, 2), anchor)
    base = canvas

    # The generated anchors face right, so the tail fan occupies the leftmost sixth.
    # Leave the root fixed and move only the fan by one device pixel.
    alpha = np.asarray(base.getchannel("A")) > 128
    xs = np.flatnonzero(alpha.any(axis=0))
    cut = int(xs.min() + max(2, (xs.max() - xs.min() + 1) * 0.16))
    fan = base.crop((0, 0, cut, base.height))
    tail = []
    for dy in (-1, 0, 1, 0):
        frame = base.copy()
        clear = Image.new("RGBA", (cut, base.height), (0, 0, 0, 0))
        frame.paste(clear, (0, 0))
        frame.paste(fan, (0, dy), fan)
        tail.append(frame)

    directory = OUT / output
    directory.mkdir(parents=True, exist_ok=True)
    # The generated anchors already carry a navy edge. Adding the project's generic
    # one-pixel outline here would consume too much of a 10-13px-high fish.
    prepped = [hard_alpha(frame, 90) for frame in tail]
    alphas = [frame.getchannel("A") for frame in prepped]
    montage = Image.new("RGB", (sum(frame.width for frame in prepped),
                                max(frame.height for frame in prepped)))
    x = 0
    rgbs = []
    for frame, alpha in zip(prepped, alphas):
        rgb = Image.new("RGB", frame.size, (0, 0, 0))
        rgb.paste(frame.convert("RGB"), (0, 0), alpha)
        montage.paste(rgb, (x, 0)); x += rgb.width
        rgbs.append(rgb)
    palette = montage.quantize(colors=18, method=Image.MEDIANCUT, dither=Image.NONE)
    finished = []
    for i, (rgb, alpha) in enumerate(zip(rgbs, alphas)):
        frame = rgb.quantize(palette=palette, dither=Image.NONE).convert("RGBA")
        frame.putalpha(alpha)
        frame.save(directory / f"{i}.png")
        finished.append(frame)
    return finished


def fish_from_anchor() -> tuple[list[Image.Image], list[Image.Image],
                                list[Image.Image], list[Image.Image]]:
    old = tail_from_anchor("fish-anchor", 14, "fish-tail")
    static = save_set("fish-static", [old[1].copy() for _ in range(4)], 12)
    sardine = tail_from_anchor("fish-sardine-v2", 13, "fish-sardine-v2")
    sprat = tail_from_anchor("fish-sprat-v2", 10, "fish-sprat-v2")
    return static, old, sardine, sprat


def couch_midpoints() -> tuple[list[Image.Image], list[Image.Image]]:
    """Interleave three one-at-a-time midpoint edits with the stable source poses."""
    src = ROOT / "assets/ai/lair"
    empty = keyed(str(src / "lounge_empty.png"))
    ref = keyed(str(src / "lounge_chad.png"))
    raw = [
        ref,
        keyed(str(GEN / "couch-mid-01.png")),
        keyed(str(src / "smoke_1.png")),
        keyed(str(GEN / "couch-mid-12.png")),
        keyed(str(src / "smoke_2.png")),
        keyed(str(GEN / "couch-mid-23.png")),
        keyed(str(src / "smoke_3.png")),
    ]
    band = int(ref.height * 0.55)
    aligned = [ref]
    for frame in raw[1:]:
        canvas = Image.new("RGBA", ref.size, (0, 0, 0, 0))
        canvas.paste(frame, (0, ref.height - frame.height), frame)
        dx, dy = best_shift(ref, canvas, band, limit=14)
        shifted = Image.new("RGBA", ref.size, (0, 0, 0, 0))
        shifted.paste(canvas, (dx, dy), canvas)
        aligned.append(shifted)
    factor = SOFA_H * RS / empty.height
    scaled = [rescale(empty, factor)] + [rescale(frame, factor) for frame in aligned]
    registered, _ = register(scaled)
    midpoint = save_set("couch-midpoints", registered[1:], 72)
    composited = save_set("couch-canonical", canonical_couch(registered)[1:], 72)
    return midpoint, composited


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    current_tiger = current_set(
        "tiger-current",
        [BASELINE / f"tiger-walk/{i}.png" for i in range(6)],
    )
    tiger_direct = generated_set("tiger-sheet-direct", 4, 2, 116)
    tiger_hybrid = generated_set("tiger-sheet-hybrid", 4, 2, 116)
    current_tiger_rest = current_set(
        "tiger-rest-current",
        [BASELINE / f"tiger-rest/{i}.png" for i in range(5)],
    )
    tiger_rest_raw = [biggest_blob(frame) for frame in
                      split_green_grid(GEN / "tiger-rest-hybrid.png", 3, 2)[:5]]
    tiger_rest_scaled = rescale_factor(tiger_rest_raw, 116 / tiger_rest_raw[4].height)
    tiger_rest = save_set("tiger-rest-hybrid", place(tiger_rest_scaled), 48)

    current_couch = current_set(
        "couch-current",
        [BASELINE / f"couch/{i}.png" for i in range(4)],
        furniture=True,
    )
    couch_direct = generated_set("couch-sheet-direct", 3, 2, 126, furniture=True)
    couch_hybrid = generated_set("couch-sheet-hybrid", 3, 2, 126, furniture=True)
    couch_locked = save_set("couch-hybrid-locked", lock_couch(couch_hybrid), 72)
    couch_mids, couch_canonical = couch_midpoints()

    current_fish = current_set(
        "fish-current",
        [BASELINE / f"fish/{i}.png" for i in range(4)],
    )
    fish_static, fish_tail, fish_sardine, fish_sprat = fish_from_anchor()

    metrics = {
        "tiger": {
            "current_alpha_churn": alpha_churn(current_tiger),
            "direct_alpha_churn": alpha_churn(tiger_direct),
            "hybrid_alpha_churn": alpha_churn(tiger_hybrid),
        },
        "tigerRest": {
            "current_alpha_churn": alpha_churn(current_tiger_rest),
            "hybrid_alpha_churn": alpha_churn(tiger_rest),
        },
        "couch": {
            "current_lower_band_drift": lower_band_churn(current_couch),
            "direct_lower_band_drift": lower_band_churn(couch_direct),
            "hybrid_lower_band_drift": lower_band_churn(couch_hybrid),
            "locked_lower_band_drift": lower_band_churn(couch_locked),
            "midpoint_lower_band_drift": lower_band_churn(couch_mids),
            "canonical_lower_band_drift": lower_band_churn(couch_canonical),
        },
        "fish": {
            "current_alpha_churn": alpha_churn(current_fish),
            "current_body_churn": body_churn(current_fish),
            "static_alpha_churn": alpha_churn(fish_static),
            "static_body_churn": body_churn(fish_static),
            "tail_only_alpha_churn": alpha_churn(fish_tail),
            "tail_only_body_churn": body_churn(fish_tail),
            "sardine_alpha_churn": alpha_churn(fish_sardine),
            "sprat_alpha_churn": alpha_churn(fish_sprat),
            "mixed_alpha_churn": [
                (a + b) / 2 for a, b in
                zip(alpha_churn(fish_sardine), alpha_churn(fish_sprat))
            ],
            "mixed_body_churn": [
                (a + b) / 2 for a, b in
                zip(body_churn(fish_sardine), body_churn(fish_sprat))
            ],
        },
    }
    (BASE / "metrics.json").write_text(json.dumps(metrics, indent=2) + "\n")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
