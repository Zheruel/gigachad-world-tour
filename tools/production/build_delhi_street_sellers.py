#!/usr/bin/env python3
"""Build the Delhi market's front-row street sellers (pani puri, sugarcane press, vegetable seller,
pakora fryer) as a static prop plus an 8-pose seller strip, replacing the two-pose cells of
assets/stages/dirty_delhi/rampage/street_vendors.png in play (js/delhi_life_market.js draws them).

Sources (GPT Image, true alpha): assets/sources/production/stages/dirty_delhi/market_life/
  seller_<name>.png       8 poses of the seller alone (6 work, startled, cowering)
  seller_<name>_prop.png  the old cell with the seller painted out (cart, press, produce, wok)
Registration is against the old cell (work pose, 2x runtime px, bottom centre = the seller's world
anchor), so the new pair lands exactly where the old art stood:
  * the prop is scaled and placed by alpha correlation with the old cell (FFT over offsets, a scale sweep);
  * pose 0 by correlation with the old seller's visible pixels (the old cell minus the new prop);
  * poses 1-7 on pose 0's lower body (feet, stool or seated hips), so the seller never slides.
Alpha is hardened at source size, scaled with a premultiplied BOX, re-hardened, colour-matched to the
old cell (per-channel mean/std, partial) and outlined with sprite_edges.edges().
Writes assets/stages/dirty_delhi/market_life/seller_<name>.png (8 cells) and seller_<name>_prop.png,
all on one canvas: the old cell grown by PAD (2x px) on each side; prints the numbers the game uses.
Sugarcane: the press's flywheel is cut from the prop into seller_sugarcane_wheel.png (the game turns it
with the crank poses) and the fixed crank rod above it is removed (the seller's hand carries the grip).
Usage: build_delhi_street_sellers.py [name ...]
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from sprite_edges import alpha as cut_alpha, edges  # noqa: E402
from keying import components  # noqa: E402

SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/market_life'
OUT = ROOT / 'assets/stages/dirty_delhi/market_life'
OLD = ROOT / 'assets/stages/dirty_delhi/rampage/street_vendors.png'
CW, CH = 208, 176                 # old cell, 2x px
PAD = (40, 70, 40, 0)             # left, top, right, bottom growth of the canvas (2x px)
NAMES = ['panipuri', 'sugarcane', 'veggie', 'pakora']   # old sheet column order
# Lower-body band that stays planted (fraction of pose 0's height from the bottom).
BAND = {'panipuri': .16, 'sugarcane': .14, 'veggie': .3, 'pakora': .22}


def old_cell(i, row=0):
    a = np.array(Image.open(OLD).convert('RGBA'))[row * CH:(row + 1) * CH, i * CW:(i + 1) * CW].copy()
    a[a[:, :, 3] < 128] = 0; return a


def box_scale(a, s):
    im = Image.fromarray(a).convert('RGBa'); w, h = max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))
    b = np.array(im.resize((w, h), Image.Resampling.BOX).convert('RGBA'))
    b[:, :, 3] = np.where(b[:, :, 3] >= 128, 255, 0); b[b[:, :, 3] == 0, :3] = 0; return b


def trim(a):
    ys, xs = np.where(a[:, :, 3] > 0); return a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]


def xcorr(img, ker):
    """Full cross-correlation of a small mask ker over img: out[y, x] = sum(img[y:y+h, x:x+w] * ker)."""
    H, Wd = img.shape; h, w = ker.shape; sh = (H + h, Wd + w)
    f = np.fft.irfft2(np.fft.rfft2(img, sh) * np.conj(np.fft.rfft2(ker, sh)), sh)
    return f[:H - h + 1, :Wd - w + 1]


def place(weight, part, scales, grid=16):
    """Best (score, scale, y, x) of the scaled part's alpha over the weight map (canvas coords)."""
    best = None
    for s in scales:
        p = box_scale(part, s); m = (p[:, :, 3] > 0).astype(float)
        if m.shape[0] >= weight.shape[0] or m.shape[1] >= weight.shape[1]:
            continue
        c = xcorr(weight, m); y, x = np.unravel_index(np.argmax(c), c.shape)
        if best is None or c[y, x] > best[0]:
            best = (c[y, x], s, y, x)
    return best


def paste(canvas, p, y, x):
    h, w = p.shape[:2]; view = canvas[y:y + h, x:x + w]; m = p[:, :, 3] > 0; view[m] = p[m]


def match_colour(a, ref, k=.6):
    """Move a's opaque pixels toward ref's per-channel mean/std by k."""
    s, r = a[:, :, 3] > 0, ref[:, :, 3] > 0
    if not s.any() or not r.any():
        return a
    out = a.copy().astype(float)
    for c in range(3):
        v = out[:, :, c][s]; mu, sd = v.mean(), v.std() + 1e-3; rm, rs = ref[:, :, c][r].mean(), ref[:, :, c][r].std()
        out[:, :, c][s] = v + k * ((v - mu) / sd * rs + rm - v)
    out[:, :, :3] = out[:, :, :3].clip(0, 255); return out.astype(np.uint8)


def split(src, n=8):
    """The n poses of a strip: its n largest parts (bodies, in x order); smaller parts (drips, crumbs,
    a dropped tool) join the body whose box is nearest horizontally."""
    parts = components(src[:, :, 3] > 0); bodies = parts[:n]
    while min(map(len, bodies)) < sorted(map(len, bodies))[n // 2] * .3:
        # Two poses touching (a skimmer reaching the next pose): cut the biggest at its thinnest column.
        parts.append(bodies.pop()); big = max(range(len(bodies)), key=lambda i: len(bodies[i])); b = bodies.pop(big)
        x0, x1 = b[:, 1].min(), b[:, 1].max(); cnt = np.bincount(b[:, 1] - x0); lo, hi = len(cnt) * 3 // 10, len(cnt) * 7 // 10
        cut = x0 + lo + int(np.argmin(cnt[lo:hi])); bodies += [b[b[:, 1] < cut], b[b[:, 1] >= cut]]
    parts = sorted(parts[n:], key=len, reverse=True) if len(parts) > n else []
    bodies = sorted(bodies, key=lambda p: p[:, 1].mean())
    groups = [[b] for b in bodies]; boxes = [(b[:, 1].min(), b[:, 1].max()) for b in bodies]
    for p in parts:
        if len(p) < 12:
            continue
        cx = p[:, 1].mean(); k = min(range(n), key=lambda i: max(boxes[i][0] - cx, cx - boxes[i][1], 0)); groups[k].append(p)
    out = []
    for g in groups:
        pix = np.concatenate(g); a = np.zeros_like(src); a[pix[:, 0], pix[:, 1]] = src[pix[:, 0], pix[:, 1]]; out.append(trim(a))
    return out


def build(name):
    i = NAMES.index(name); old = old_cell(i)
    Wc, Hc = CW + PAD[0] + PAD[2], CH + PAD[1] + PAD[3]
    oldc = np.zeros((Hc, Wc, 4), np.uint8); oldc[PAD[1]:PAD[1] + CH, PAD[0]:PAD[0] + CW] = old
    O = oldc[:, :, 3] > 0
    # Prop: +1 on the old cell, -2 off it.
    prop_src = trim(np.array(cut_alpha(Image.open(SRC / f'seller_{name}_prop.png'))))
    weight = np.where(O, 1., -2.)
    est = (O.any(0).sum() * .9) / prop_src.shape[1]
    _, sp, py, px = place(weight, prop_src, np.linspace(est * .8, est * 1.2, 21))
    _, sp, py, px = place(weight, prop_src, np.linspace(sp * .97, sp * 1.03, 13))
    prop = box_scale(prop_src, sp); P = np.zeros((Hc, Wc), bool); P[py:py + prop.shape[0], px:px + prop.shape[1]] = prop[:, :, 3] > 0
    # Seller: the old seller is what the prop does not explain.
    src = np.array(cut_alpha(Image.open(SRC / f'seller_{name}.png'))); frames = split(src)
    Op = O & ~P
    weight = np.where(Op, 2., np.where(P, 0., -2.))
    est = (np.ptp(np.where(Op)[0]) + 1) / frames[0].shape[0]
    _, ss, fy, fx = place(weight, frames[0], np.linspace(est * .7, est * 1.4, 29))
    _, ss, fy, fx = place(weight, frames[0], np.linspace(ss * .97, ss * 1.03, 13))
    scaled = [box_scale(f, ss) for f in frames]
    # Lower-body registration of every pose on pose 0 (correlate the bottom band), sole lines equal.
    ref = scaled[0]; rh = ref.shape[0]; band = max(6, round(rh * BAND[name]))
    rb = (ref[-band:, :, 3] > 0).astype(float); placed = [(fy, fx)]
    for f in scaled[1:]:
        fb = (f[-band:, :, 3] > 0).astype(float); padw = 60
        big = np.zeros((band, rb.shape[1] + 2 * padw)); big[:, padw:padw + rb.shape[1]] = np.where(rb > 0, 1., -.5)
        c = xcorr(big, fb) if fb.shape[1] <= big.shape[1] else np.zeros((1, 1))
        dx = int(np.argmax(c[0])) - padw if c.size > 1 else (rb.shape[1] - fb.shape[1]) // 2
        placed.append((fy + rh - f.shape[0], fx + dx))
    # Canvas frames, colour-matched to the old art, outlined.
    oldp = oldc.copy(); oldp[~Op] = 0
    oldprop = oldc.copy(); oldprop[~(O & P)] = 0
    prop = match_colour(prop, oldprop, .5)
    strip = np.zeros((Hc, Wc * 8, 4), np.uint8)
    for k, (f, (y, x)) in enumerate(zip(scaled, placed)):
        cnv = np.zeros((Hc, Wc, 4), np.uint8)
        f = f[max(0, -y):, max(0, -x):]; y, x = max(0, y), max(0, x); f = f[:Hc - y, :Wc - x]
        paste(cnv, f, y, x); strip[:, k * Wc:(k + 1) * Wc] = cnv
    strip = match_colour(strip, oldp, .5)
    Image.fromarray(np.array(edges(Image.fromarray(strip)))).save(OUT / f'seller_{name}.png', optimize=True)
    pc = np.zeros((Hc, Wc, 4), np.uint8); paste(pc, prop, py, px)
    if name == 'sugarcane':
        pc = sugarcane_wheel(pc)
    Image.fromarray(np.array(edges(Image.fromarray(pc)))).save(OUT / f'seller_{name}_prop.png', optimize=True)
    print(f'{name}: canvas {Wc}x{Hc} (2x), prop scale {sp:.3f} at {px},{py}; seller scale {ss:.3f}; offsets {placed}')


# The press's flywheel in canvas px: an upright ellipse seen at an angle (centre x, y, radii x, y).
WHEEL = (169, 141, 14, 27)


def sugarcane_wheel(pc):
    """Cut the flywheel (wheel colours inside its ellipse; the steel cup in front stays in the prop) into
    seller_sugarcane_wheel.png, stretched to a circle so the game can turn it and squash it back."""
    cx, cy, rx, ry = WHEEL; h, w = pc.shape[:2]; yy, xx = np.mgrid[:h, :w]
    ell = ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1
    rgb = pc[:, :, :3].astype(int); steel = (rgb.max(2) - rgb.min(2) < 40) & (rgb.mean(2) > 90)
    m = ell & ~steel & (pc[:, :, 3] > 0)
    crop = np.zeros((2 * ry + 1, 2 * rx + 1, 4), np.uint8); sub = m[cy - ry:cy + ry + 1, cx - rx:cx + rx + 1]
    crop[sub] = pc[cy - ry:cy + ry + 1, cx - rx:cx + rx + 1][sub]
    circ = Image.fromarray(crop).resize((2 * ry + 1, 2 * ry + 1), Image.Resampling.NEAREST)
    edges(circ).save(OUT / 'seller_sugarcane_wheel.png', optimize=True)
    pc = pc.copy(); pc[m] = 0
    print(f'  wheel ellipse at canvas ({cx},{cy}) radii {rx}x{ry}, sprite {2 * ry + 1}px square')
    return pc


if __name__ == '__main__':
    for n in sys.argv[1:] or NAMES:
        build(n)
