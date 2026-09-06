#!/usr/bin/env python3
"""Grade a sprite so it belongs in the plate it stands in front of.

Sprites come off the generator on flat green under even light. Dropped onto a
heavily graded backdrop they are brighter, cleaner and more contrasty than
everything around them, which is what makes them read as stickers no matter where
they are placed - measured on the Delhi street, the spice merchant sat at luminance
110 against a wall at 56, with 17% of his pixels above 200 where the wall has 1.4%.

The grade is deliberately not a straight per-channel mean match. The Delhi facade
band averages R70 G43 B25, and pulling every sprite's channels onto that turns the
whole crowd orange. Instead luminance is matched exactly and chroma is only pulled
partway toward the scene's tint, so a blue lungi stays blue while still sitting
under the same evening light as the wall behind it.
"""
import numpy as np
from PIL import Image

LUMA = (0.299, 0.587, 0.114)


def luminance(a):
    return a[..., 0] * LUMA[0] + a[..., 1] * LUMA[1] + a[..., 2] * LUMA[2]


def band_stats(path, y0, y1, x0=None, x1=None):
    """Mean, std and tint of a horizontal band of a background plate."""
    a = np.asarray(Image.open(path).convert("RGB"), dtype=np.float32)
    a = a[y0:y1, x0:x1] if x0 is not None else a[y0:y1]
    lum = luminance(a)
    mean = a.reshape(-1, 3).mean(0)
    return {
        "lum": float(lum.mean()),
        "std": float(lum.std()),
        "p99": float(np.percentile(lum, 99)),
        "tint": mean / max(mean.mean(), 1e-3),      # normalised colour cast
        "hot": float((lum > 200).mean() * 100),
    }


def subject_stats(img):
    """The same numbers for the opaque pixels of an RGBA sprite."""
    a = np.asarray(img.convert("RGBA"), dtype=np.float32)
    m = a[..., 3] > 128
    if not m.any():
        return None
    px = a[..., :3][m]
    lum = luminance(px)
    mean = px.mean(0)
    return {
        "lum": float(lum.mean()),
        "std": float(lum.std()),
        "p99": float(np.percentile(lum, 99)),
        "tint": mean / max(mean.mean(), 1e-3),
        "hot": float((lum > 200).mean() * 100),
        "n": int(m.sum()),
    }


def rolloff(lum, knee, ceiling):
    """Soft-knee highlight compression: everything above the knee is squeezed into
    the space left below the ceiling, so nothing clips flat to white."""
    out = lum.copy()
    hi = lum > knee
    if hi.any() and ceiling > knee:
        span = max(lum.max() - knee, 1e-3)
        out[hi] = knee + (lum[hi] - knee) / span * (ceiling - knee)
    return out


def match_tone(img, band, lift=1.15, chroma=0.35, contrast=1.0):
    """Pull an RGBA sprite onto a background band's exposure and light.

    lift     how much brighter than the band the subject sits. A figure needs to
             read against its backdrop, so it is graded slightly above it - but by
             15%, not the 100% it arrives at.
    chroma   how far the sprite's colour is dragged toward the scene's tint. 0 keeps
             the generator's colours, 1 makes everything the colour of the wall.
    contrast cap on internal contrast, as a multiple of the band's. A sprite is never
             allowed to be more contrasty than the plate it stands in.
    """
    a = np.asarray(img.convert("RGBA"), dtype=np.float32)
    alpha = a[..., 3]
    m = alpha > 128
    if not m.any():
        return img
    rgb = a[..., :3]
    lum = luminance(rgb)
    sm, ss = lum[m].mean(), max(lum[m].std(), 1e-3)

    target_m = band["lum"] * lift
    target_s = min(ss, band["std"] * contrast)
    graded = (lum - sm) / ss * target_s + target_m
    graded = rolloff(graded, band["p99"] * 0.75, band["p99"])
    graded = np.clip(graded, 2, 255)

    # re-expose by gain so hue and saturation survive the luminance move
    gain = np.where(lum > 1e-3, graded / np.maximum(lum, 1e-3), 1.0)[..., None]
    out = rgb * gain

    # then drag the colour partway toward the scene's cast
    if chroma > 0:
        grey = luminance(out)[..., None]
        tinted = grey * band["tint"][None, None, :]
        out = out * (1 - chroma) + tinted * chroma

    out = np.clip(out, 0, 255)
    res = np.dstack([out, alpha]).astype(np.uint8)
    res[~m] = 0
    return Image.fromarray(res, "RGBA")


def report(img, band, label=""):
    """One line saying whether a sprite belongs in the band, and why not."""
    s = subject_stats(img)
    if not s:
        return f"{label:<12} EMPTY"
    dl = (s["lum"] - band["lum"]) / max(band["lum"], 1e-3) * 100
    bad = []
    if abs(dl) > 25:
        bad.append("exposure")
    if s["hot"] > 2 and band["hot"] < 2:
        bad.append("blown highlights")
    if s["std"] > band["std"] * 1.35:
        bad.append("over-contrast")
    tag = "FAIL " + "+".join(bad) if bad else "ok"
    return (f"{label:<12} lum {s['lum']:5.1f} vs {band['lum']:5.1f} ({dl:+5.1f}%)  "
            f"std {s['std']:5.1f} vs {band['std']:5.1f}  hot {s['hot']:4.1f}%  {tag}")
