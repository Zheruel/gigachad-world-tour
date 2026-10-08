"""Repaint the TTE's striped ribbon badge as a brass Indian Railways name plate.

GPT draws the lapel badge as a red/white/blue ribbon rack that reads as a national
flag. Each striped cluster is replaced by a solid brass plate: dark rim, lit bevel,
engraved name bar. Module: brass(rgba_array, reach) -> rgba_array.
CLI: brass_badge.py in.png out.png [reach]
"""
import numpy as np
from PIL import Image, ImageFilter
from keying import components


def flag_mask(a):
    r, g, b = (a[:, :, k].astype(int) for k in range(3))
    red = (r > 180) & (r - g > 50) & (b >= g - 5) & (b < r - 30)  # bright red/pink stripes; skin keeps b < g
    pale = (r > 170) & (r - g > 25) & (b > g + 3)                   # washed-out pink stripes; the cream shirt keeps b < g
    blue = (b > r + 20) & (b > g + 5) & (b > 100)
    red |= pale
    return (red | blue) & (a[:, :, 3] > 0)


def plate(a, y0, x0, y1, x1):
    h, w = y1 - y0 + 1, x1 - x0 + 1
    rim = max(1, round(min(h, w) / 12))
    ys = np.arange(h)[:, None] / max(1, h - 1)
    base = np.array([206, 160, 58], float)
    body = np.clip(base * (1.15 - .4 * ys)[..., None], 0, 255) * np.ones((1, w, 1))
    body[:rim * 2, :] = [248, 222, 130]                      # lit top bevel
    body[:, :rim] = np.minimum(body[:, :rim] * 1.12, 255)    # lit left edge
    body[-rim * 2:, :] = [138, 96, 34]                       # shaded bottom lip
    cy, bar = h // 2, max(1, round(h / 7))
    body[cy - bar // 2:cy - bar // 2 + bar, rim * 2:w - rim * 2] = [60, 40, 22]  # engraved name bar
    body[[0, -1], :] = [30, 22, 14]; body[:, [0, -1]] = [30, 22, 14]           # dark outline
    a[y0:y1 + 1, x0:x1 + 1, :3] = body.astype(np.uint8)
    a[y0:y1 + 1, x0:x1 + 1, 3] = 255


def brass(a, reach=4, min_n=4):
    a = a.copy(); m = flag_mask(a)
    if not m.any():
        return a
    size = 2 * reach + 1
    grown = np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(size))) > 0
    for part in components(grown):
        inside = m[part[:, 0], part[:, 1]]
        if inside.sum() < min_n:
            continue
        # the white stripes between the coloured ones belong to the badge too
        near = np.array(Image.fromarray((m * 255).astype('uint8')).filter(ImageFilter.MaxFilter(max(3, reach | 1)))) > 0
        r, g, b = (a[part[:, 0], part[:, 1], k].astype(int) for k in range(3))
        white = (np.minimum(np.minimum(r, g), b) > 150) & (np.maximum(np.maximum(r, g), b) - np.minimum(np.minimum(r, g), b) < 70)
        pts = part[inside | (white & near[part[:, 0], part[:, 1]])]
        y0, x0 = pts.min(0); y1, x1 = pts.max(0)
        if y1 - y0 < 2 or x1 - x0 < 2:
            continue
        plate(a, y0, x0, y1, x1)
    return a


if __name__ == '__main__':
    import sys
    im = np.array(Image.open(sys.argv[1]).convert('RGBA'))
    Image.fromarray(brass(im, int(sys.argv[3]) if len(sys.argv) > 3 else 4)).save(sys.argv[2])


def plates(a, boxes, pad=5):
    """Plate the light card found inside each rough (x0, y0, x1, y1) box - for badges drawn pale enough to escape flag_mask."""
    a = a.copy(); r, g, b = (a[:, :, k].astype(int) for k in range(3))
    card = (a[:, :, 3] > 0) & ((np.minimum(np.minimum(r, g), b) > 185) | ((r > 200) & (r - b > 60) & (g < 205) & (g > 90)))
    for x0, y0, x1, y1 in boxes:
        sub = card[y0 - pad:y1 + pad + 1, x0 - pad:x1 + pad + 1]
        ys, xs = np.nonzero(sub)
        if len(ys) < 6:
            continue
        plate(a, y0 - pad + ys.min(), x0 - pad + xs.min(), y0 - pad + ys.max(), x0 - pad + xs.max())
    return a
