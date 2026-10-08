"""Restore CHAD limbs cropped out of runtime frames: raised fists cut by the 192px canvas
(upper 4, combo_power_b 6/7), jab fists the source art cut at its edge (sjab 2/3, sources
since completed with GPT Image) and Ragnarok legs the sheet slicer cut at cell borders.

The runtime frame keeps its pixels; the missing rows are recovered from the full
source, scaled and aligned to the frame by least-squares match, above a taller canvas.
The states load at source scale (PRESERVE_SOURCE_SCALE), so feet stay registered.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from keying import components

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production'
FIXES = {'chad_supper4.png': 'chad/chad_supper4.png',
         'chad_combo_power_b_6.png': 'chad_v4/combo_power_b_6.png',
         'chad_combo_power_b_7.png': 'chad_v4/combo_power_b_7.png'}
PAD = 24
SHEET_CUTS = {'chad_ragnarok_air_2.png': ('ragnarok_air_v4', 1), 'chad_ragnarok_air_3.png': ('ragnarok_air_v4', 2),
              'chad_ragnarok_air_5.png': ('ragnarok_air_v4', 4), 'chad_ragnarok_ground_4.png': ('ragnarok_ground_v4', 3)}
JABS = {'chad_sjab2.png': 'chad/chad_sjab2.png', 'chad_sjab3.png': 'chad/chad_sjab3.png'}


def fix(name, source):
    frame = np.array(Image.open(ROOT / 'assets/frames' / name).convert('RGBA'))
    if not (frame[0, :, 3] > 0).any():
        return False  # already restored
    src = Image.open(SRC / source).convert('RGBA'); src = src.crop(src.getbbox())
    ys, xs = np.where(frame[:, :, 3] > 0); bottom = ys.max()
    best = None
    # Match on the lower body (legs and torso are intact): scale by visible width near the feet.
    for h in range(bottom + 1, bottom + 60):
        s = src.resize((max(1, round(src.width * h / src.height)), h), Image.Resampling.LANCZOS); a = np.array(s)
        for dx in range(-6, 7):
            x0 = xs.min() + dx
            if x0 < 0 or x0 + a.shape[1] > frame.shape[1] + 8:
                continue
            y0 = bottom + 1 - h
            region = frame[max(0, y0) + 60:bottom + 1, x0:x0 + a.shape[1], 3].astype(int) > 0
            cand = a[max(0, y0) + 60 - y0:, :region.shape[1], 3] > 0
            cand = cand[:region.shape[0]]
            score = (region != cand).sum()
            if best is None or score < best[0]:
                best = (score, a, x0, y0)
    _, a, x0, y0 = best
    out = np.zeros((frame.shape[0] + PAD, frame.shape[1], 4), np.uint8); out[PAD:] = frame
    for y in range(a.shape[0]):
        ty = y0 + y + PAD
        if ty >= PAD + 1 or ty < 0:
            continue
        for x in range(a.shape[1]):
            tx = x0 + x
            if 0 <= tx < out.shape[1] and a[y, x, 3] > 40:
                out[ty, tx] = a[y, x]
    Image.fromarray(out).save(ROOT / 'assets/frames' / name)
    return True


def green_key(im):
    a = np.array(im.convert('RGBA')); r, g, b = (a[:, :, i].astype(int) for i in range(3))
    a[(g > r + 60) & (g > b + 60)] = 0
    spill = (a[:, :, 3] > 0) & (g > np.maximum(r, b) + 12)
    a[spill, 1] = np.maximum(r, b)[spill]
    return a


def restore_from_sheet(name, sheet, cell, cols=8):
    """Paste the parts of the sheet pose the slicer cut off; widen both sides so the body stays centred."""
    frame = np.array(Image.open(ROOT / 'assets/frames' / name).convert('RGBA'))
    if not (frame[:, :2, 3] > 0).any() and not (frame[:, -2:, 3] > 0).any():
        return False  # already restored
    a = green_key(Image.open(SRC / 'sheet' / f'{sheet}.png')); cw = a.shape[1] / cols
    parts = [p for p in components(a[:, :, 3] > 40) if len(p) > 500]
    pose = max((p for p in parts if cell * cw <= p[:, 1].mean() < (cell + 1) * cw), key=len)
    y0, x0 = pose.min(0); y1, x1 = pose.max(0) + 1
    crop = np.zeros((y1 - y0, x1 - x0, 4), np.uint8); crop[pose[:, 0] - y0, pose[:, 1] - x0] = a[pose[:, 0], pose[:, 1]]
    src = Image.fromarray(crop)
    ys, xs = np.where(frame[:, :, 3] > 0); fh = ys.max() - ys.min() + 1
    best = None
    for h in range(fh - 2, fh + 40):  # the frame lost width, not height, but allow for a cut foot
        s = np.array(src.resize((max(1, round(src.width * h / src.height)), h), Image.Resampling.LANCZOS))
        right = xs.max() - s.shape[1] + 1
        for dx in range(-4, 5):
            for dy in range(-4, 5):
                ox, oy = right + dx, ys.max() - h + 1 + dy
                cand = np.zeros(frame.shape[:2], bool)
                sy0, sx0 = max(0, -oy), max(0, -ox)
                ty0, tx0 = oy + sy0, ox + sx0
                hh = min(s.shape[0] - sy0, frame.shape[0] - ty0); ww = min(s.shape[1] - sx0, frame.shape[1] - tx0)
                if hh <= 0 or ww <= 0:
                    continue
                cand[ty0:ty0 + hh, tx0:tx0 + ww] = s[sy0:sy0 + hh, sx0:sx0 + ww, 3] > 0
                score = (cand != (frame[:, :, 3] > 0)).sum()
                if best is None or score < best[0]:
                    best = (score, s, ox, oy)
    _, s, ox, oy = best
    pad = max(0, -ox, ox + s.shape[1] - frame.shape[1]) + 2
    out = np.zeros((frame.shape[0], frame.shape[1] + pad * 2, 4), np.uint8); out[:, pad:pad + frame.shape[1]] = frame
    for y in range(s.shape[0]):
        ty = oy + y
        if not 0 <= ty < frame.shape[0]:
            continue
        for x in range(s.shape[1]):
            tx = ox + x + pad
            if s[y, x, 3] > 40 and out[ty, tx, 3] == 0 and not pad + 2 <= tx < pad + frame.shape[1] - 2:
                out[ty, tx] = s[y, x]
    Image.fromarray(out).save(ROOT / 'assets/frames' / name)
    return True


def extend_right(name, source):
    """Paste the completed fist right of the frame's cut edge; pad both sides so the body stays centred."""
    frame = np.array(Image.open(ROOT / 'assets/frames' / name).convert('RGBA'))
    if not (frame[:, -2:, 3] > 0).any():
        return False  # already extended
    src = Image.open(SRC / source).convert('RGBA'); src = src.crop(src.getbbox())
    ys, xs = np.where(frame[:, :, 3] > 0); h = ys.max() - ys.min() + 1
    s = np.array(src.resize((max(1, round(src.width * h / src.height)), h), Image.Resampling.LANCZOS))
    body = frame[ys.min():ys.max() + 1, :frame.shape[1] - 6, 3] > 0
    best = None
    for dx in range(-6, 7):
        x0 = xs.min() + dx
        cand = np.zeros_like(body); w = min(s.shape[1], body.shape[1] - x0)
        if x0 < 0 or w <= 0:
            continue
        cand[:, x0:x0 + w] = s[:, :w, 3] > 0
        score = (cand != body).sum()
        if best is None or score < best[0]:
            best = (score, x0)
    x0 = best[1]; pad = max(0, x0 + s.shape[1] - frame.shape[1]) + 2
    out = np.zeros((frame.shape[0], frame.shape[1] + pad * 2, 4), np.uint8); out[:, pad:pad + frame.shape[1]] = frame
    edge = frame.shape[1] - 4
    for y in range(s.shape[0]):
        for x in range(s.shape[1]):
            if x0 + x >= edge and s[y, x, 3] > 40:
                out[ys.min() + y, pad + x0 + x] = s[y, x]
    Image.fromarray(out).save(ROOT / 'assets/frames' / name)
    return True


if __name__ == '__main__':
    for name, source in FIXES.items():
        print(name, fix(name, source))
    for name, source in JABS.items():
        print(name, extend_right(name, source))
    for name, (sheet, cell) in SHEET_CUTS.items():
        print(name, restore_from_sheet(name, sheet, cell))
