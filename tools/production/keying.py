"""Magenta-matte extraction shared by recent GPT Image sheets."""
import numpy as np
from PIL import Image, ImageFilter


def key(im, hard=110, soft=40):
    """Remove flat magenta, then repaint the magenta-tinted rim from interior pixels."""
    a = np.array(im.convert('RGBA'))
    rgb = a[:, :, :3].astype(int)
    tint = np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1]
    a[tint > hard, 3] = 0
    solid = a[:, :, 3] > 0
    inner = np.array(Image.fromarray((solid * 255).astype('uint8')).filter(ImageFilter.MinFilter(5))) > 0
    rim = solid & ~inner
    a[rim & (tint > soft + 30), 3] = 0
    rim = (a[:, :, 3] > 0) & ~inner
    fringe = rim & (tint > soft)
    total = np.zeros(rgb.shape, float); count = np.zeros(tint.shape)
    for dy in range(-3, 4):
        for dx in range(-3, 4):
            ok = np.roll(inner & (tint <= soft), (dy, dx), (0, 1))
            total += np.roll(rgb, (dy, dx), (0, 1)) * ok[:, :, None]; count += ok
    fix = fringe & (count > 0)
    a[fix, :3] = (total[fix] / count[fix, None]).astype('uint8')
    a[fringe & (count == 0), 3] = 0
    return Image.fromarray(a)


def components(mask):
    """4-connected opaque regions as lists of (y, x) index arrays, largest first."""
    from collections import deque
    remaining = mask.copy(); out = []
    h, w = mask.shape
    for y, x in zip(*np.where(mask)):
        if not remaining[y, x]:
            continue
        q = deque([(y, x)]); remaining[y, x] = False; pix = []
        while q:
            yy, xx = q.popleft(); pix.append((yy, xx))
            for ny, nx in ((yy+1, xx), (yy-1, xx), (yy, xx+1), (yy, xx-1)):
                if 0 <= ny < h and 0 <= nx < w and remaining[ny, nx]:
                    remaining[ny, nx] = False; q.append((ny, nx))
        out.append(np.array(pix))
    return sorted(out, key=len, reverse=True)


def keep_main(im, near=24, min_area=60):
    """Keep the largest region plus sizeable regions within `near` px of it (held props)."""
    a = np.array(im); parts = components(a[:, :, 3] > 24)
    if not parts:
        return im
    main = parts[0]; y0, x0 = main.min(0) - near; y1, x1 = main.max(0) + near
    keep = np.zeros(a.shape[:2], bool); keep[main[:, 0], main[:, 1]] = True
    for part in parts[1:]:
        if len(part) >= min_area and ((part[:, 0] >= y0) & (part[:, 0] <= y1) & (part[:, 1] >= x0) & (part[:, 1] <= x1)).any():
            keep[part[:, 0], part[:, 1]] = True
    a[~keep] = 0
    return Image.fromarray(a)
