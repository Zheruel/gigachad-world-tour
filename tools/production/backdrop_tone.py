"""Background-extra integration: sit a registered sprite strip into the plate behind it.

Fighters keep CHAD's closed dark outline; extras behind the fight lane should read as part of the
painting without being dimmed. backdrop() works on a whole strip at once (every frame gets the same
grade, so nothing flickers between cells):
  1. soften the outline: the outer 1 px ring moves `rim` of the way toward a slightly darkened
     local interior colour (a soft painted edge instead of a black line);
  2. light it like the plate: tint by `cast` of the plate's lamp-lit colour (its chromaticity only,
     luminance kept), so extras pick up the scene's colour cast;
  3. ease micro-contrast and chroma a touch (`contrast`, `sat`, ~.9 for near extras, lower only
     for far ones), then scale luminance by `level` (1 = the sprite's own value range).
plate_light() samples the lamp-lit colour and luminance of the plate region behind the extra.
Run sprite_edges.edges() before backdrop() so fringes are clean before the outline is softened.
"""
import numpy as np
from PIL import Image
from sprite_edges import LUM, _depth, _mean


def plate_light(plate, box):
    """(lit RGB 0-255, lit luminance 0-1) of `plate` (path or image) inside box = (x0, y0, x1, y1)
    in plate pixels: the mean of the brighter half, i.e. the surfaces the lamps actually reach."""
    im = plate if isinstance(plate, Image.Image) else Image.open(plate)
    px = np.array(im.convert('RGB').crop(box), float).reshape(-1, 3); lum = px @ LUM
    lit = px[lum >= np.median(lum)].mean(0); return lit, float(lit @ LUM) / 255


def backdrop(im, light, rim=.55, cast=.3, contrast=.9, sat=.95, level=1.):
    """im: RGBA strip (binary alpha). light: plate lamp-lit RGB 0-255. Returns a new RGBA image."""
    a = np.array(im.convert('RGBA')); s = a[:, :, 3] > 0
    rgb = a[:, :, :3].astype(float)
    d = _depth(s, 3)
    inner, has = _mean(rgb, s & (d >= 2), 2)
    # Outer ring, and the second ring where it is still darker than the body (GPT's 2 px lines).
    ring = s & (d == 1) & has; rgb[ring] += (inner[ring] * .7 - rgb[ring]) * rim
    ring2 = s & (d == 2) & has & ((rgb @ LUM) < (inner @ LUM) * .7)
    rgb[ring2] += (inner[ring2] * .8 - rgb[ring2]) * rim * .6
    lum = np.maximum(rgb @ LUM, 1e-3)
    # Hue of the lamp light only, capped so a strongly coloured plate (the AC coach's violet) warms
    # or cools the figure without staining skin and whites.
    tint = np.asarray(light, float); tint = 1 + np.clip(tint / max(tint @ LUM, 1e-3) - 1, -.4, .4)
    out = rgb * ((1 - cast) + cast * tint)
    out *= (lum / np.maximum(out @ LUM, 1e-3))[..., None]
    m = lum[s].mean(); tl = np.maximum(m + (lum - m) * contrast, 1)
    out *= (tl / lum)[..., None]
    out = tl[..., None] + (out - tl[..., None]) * sat
    out *= level
    a[:, :, :3] = np.where(s[..., None], out.clip(0, 255).round(), 0).astype(np.uint8)
    return Image.fromarray(a)
