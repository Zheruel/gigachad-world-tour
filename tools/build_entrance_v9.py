#!/usr/bin/env python3
"""Register the entrance cels on the motorcycle.

The V8 cels came from two sheets and every cell drew the bike at its own size and
height, so the bike is the register: every cel is scaled so its front wheel has one
radius, moved so that wheel sits on one spot, and stretched about it so the rear tyre
sits on one spot too. Only the three riding cels ship (RIDE): the arrival swaps the
rider for the game's own CHAD under a dust burst, so no dismount cels are needed. The
rest are still registered because the reference cel's rear tyre is the template, and
they land on the contact sheet for review.

Reads assets/story/entrance_v8/combined_*.png, writes assets/story/entrance_v9/.
tools/build_entrance_bike.py adds the parked bike on the same register.
"""

from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets/story/entrance_v8"
OUT = ROOT / "assets/story/entrance_v9"
CANVAS = (277, 196)
REF = 15                    # the cleanest parked bike: the register
WHEEL_X, WHEEL_BOTTOM = 193, 181   # where the front tyre meets the street, every cel
REAR_X = 70                 # where the rear tyre starts; the short-wheelbase sheet is stretched to it
REAR_TMPL = (138, 184, 70, 120)   # y0, y1, x0, x1 of the reference rear tyre after registration
# the drift cels foreshorten the bike toward camera; the lean is done in code instead
DROP = {3, 4, 5}
RIDE = (1, 2, 6)            # cruising, braking, settling: the cels that ship


def gray(img):
    a = np.array(img.convert("RGBA")).astype(float)
    return a[..., :3].mean(-1) * (a[..., 3] / 255), a[..., 3]


def ncc(g, tmpl):
    """Normalised cross-correlation map (FFT), valid positions only."""
    H, W = g.shape
    h, w = tmpl.shape
    tn = tmpl - tmpl.mean()
    tnorm = np.sqrt((tn * tn).sum()) + 1e-9
    num = np.fft.irfft2(np.fft.rfft2(g) * np.conj(np.fft.rfft2(tn, g.shape)), g.shape)[:H - h + 1, :W - w + 1]
    ones = np.ones((h, w))
    s1 = np.fft.irfft2(np.fft.rfft2(g) * np.conj(np.fft.rfft2(ones, g.shape)), g.shape)[:H - h + 1, :W - w + 1]
    s2 = np.fft.irfft2(np.fft.rfft2(g * g) * np.conj(np.fft.rfft2(ones, g.shape)), g.shape)[:H - h + 1, :W - w + 1]
    var = np.maximum(s2 - s1 * s1 / (h * w), 1e-6)
    return num / (np.sqrt(var) * tnorm)


def front_wheel(fr, tmpl, scales):
    """Best (score, scale, cx, bottom) of the reference front wheel over the cel at each scale."""
    best = (-1, 1.0, 0, 0)
    h, w = tmpl.shape
    for s in scales:
        img = fr.resize((round(fr.width * s), round(fr.height * s)), Image.Resampling.LANCZOS)
        g, a = gray(img)
        m = ncc(g, tmpl)
        m[:, : m.shape[1] // 2] = -1          # the front wheel is in the right half
        m[:100, :] = -1
        y, x = np.unravel_index(np.argmax(m), m.shape)
        if m[y, x] > best[0]:
            best = (float(m[y, x]), s, x + w // 2, y + h)
    return best


def rear_x(canvas, tmpl):
    """Left edge of the rear tyre: the reference rear wheel matched over the left half."""
    g, _ = gray(canvas)
    m = ncc(g, tmpl)
    m[:, m.shape[1] // 2:] = -1
    m[:110, :] = -1
    y, x = np.unravel_index(np.argmax(m), m.shape)
    return int(x), float(m[y, x])


def register_rear(canvas, tmpl):
    """Stretch the cel about the front wheel so the rear tyre starts at REAR_X.

    Two sheets drew the bike with different wheelbases; a few px of aspect on the whole
    cel is invisible at game scale, a rear wheel that slides 15 px is not.
    """
    rx, c = rear_x(canvas, tmpl)
    k = (WHEEL_X - REAR_X) / max(1, WHEEL_X - rx)
    if c < 0.55 or abs(k - 1) < 0.03:      # the standing rider hides the tyre; those cels are the reference sheet
        return canvas
    w, h = canvas.size
    left = canvas.crop((0, 0, WHEEL_X, h)).resize((round(WHEEL_X * k), h), Image.Resampling.LANCZOS)
    right = canvas.crop((WHEEL_X, 0, w, h))
    out = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    out.paste(left, (WHEEL_X - left.width, 0), left)
    out.paste(right, (WHEEL_X, 0), right)
    print(f"   rear {rx} -> {REAR_X} (x{k:.3f}, match={c:.2f})")
    return out


def load_frames():
    return [Image.open(SRC / f"combined_{i:02}.png").convert("RGBA") for i in range(1, 20)]


def front_template(frames):
    g_ref, _ = gray(frames[REF - 1])
    return g_ref[128:184, 165:222]


SCALES = [round(0.85 + 0.025 * k, 3) for k in range(17)]


def register_front(fr, tmpl, scales=SCALES, label=""):
    """The cel scaled and placed so its front tyre sits at (WHEEL_X, WHEEL_BOTTOM)."""
    c, scale, cx, ybot = front_wheel(fr, tmpl, scales)
    print(f"{label:>2} match={c:.2f} scale={scale:.3f} wheel=({cx},{ybot})")
    w, h = fr.size
    rig = fr.resize((round(w * scale), round(h * scale)), Image.Resampling.LANCZOS)
    rig = rig.filter(ImageFilter.UnsharpMask(radius=.4, percent=40, threshold=2))
    canvas = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    dx = WHEEL_X - cx
    dy = WHEEL_BOTTOM - ybot
    canvas.alpha_composite(rig, (dx, dy)) if dx >= 0 and dy >= 0 else canvas.paste(rig, (dx, dy), rig)
    return canvas


def rear_template(frames, tmpl):
    g_reg, _ = gray(register_front(frames[REF - 1], tmpl, label="ref"))
    return g_reg[REAR_TMPL[0]:REAR_TMPL[1], REAR_TMPL[2]:REAR_TMPL[3]]


def build():
    OUT.mkdir(parents=True, exist_ok=True)
    frames = load_frames()
    tmpl = front_template(frames)
    rear_tmpl = rear_template(frames, tmpl)
    out = []
    for i, fr in enumerate(frames, 1):
        if i in DROP:
            continue
        out.append(register_rear(register_front(fr, tmpl, label=str(i)), rear_tmpl))

    kept = [i for i in range(1, len(frames) + 1) if i not in DROP]
    for n, src_index in enumerate(kept, 1):
        path = OUT / f"combined_{n:02}.png"
        if src_index in RIDE:
            out[n - 1].save(path, optimize=True)
        elif path.exists():
            path.unlink()
    cols = 4
    rows = (len(out) + cols - 1) // cols
    sheet = Image.new("RGBA", (CANVAS[0] * cols, CANVAS[1] * rows), (21, 17, 25, 255))
    for n, fr in enumerate(out):
        sheet.alpha_composite(fr, ((n % cols) * CANVAS[0], (n // cols) * CANVAS[1]))
    sheet.save(OUT / "contact_sheet.png", optimize=True)
    print(f"wrote {len(RIDE)} riding cels and the contact sheet to {OUT}")


if __name__ == "__main__":
    build()
