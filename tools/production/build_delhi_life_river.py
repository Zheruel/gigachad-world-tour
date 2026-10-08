#!/usr/bin/env python3
"""Dirty Delhi river side (culvert, ghat, wharf, pontoon): background life, swinging plate layers and
foreground pieces for js/delhi_life_river.js.

Sources: assets/sources/production/stages/dirty_delhi/river/*.png, GPT Image sheets on true alpha
(already hardened by gen_image.sh) and three opaque plate repairs (patch_*.png: a crop of the plate
with one hanging object painted out).
  * Pose sheets are split into grid cells, cleaned of specks and slivers, registered on a part that
    must not move (the washing stone, the bucket, the basket, the boat hull; walks on the torso and
    their own sole line), scaled with BOX (after the alpha was hardened, so no light halo), re-hardened,
    outlined with sprite_edges.edges() and graded into the plate behind them (backdrop_tone.backdrop).
    Each writes a strip of equal cells at 2x; the anchor (feet / keel / body) is the bottom centre.
  * Plate repairs: the difference between the plate crop and its repair marks the object. The object
    is cut from the plate (hard alpha) as a layer the game sways, and the repair is written as a
    feathered overlay drawn over the plate under it, so the plate PNGs themselves stay untouched.
Writes assets/stages/dirty_delhi/river/*.png and prints the numbers js/delhi_life_river.js uses.
Usage: build_delhi_life_river.py [name ...]   (default: everything)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image
sys.path.insert(0, str(Path(__file__).resolve().parent))
from keying import components
from sprite_edges import edges, LUM
from backdrop_tone import backdrop, plate_light

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/river'
PLATES = ROOT / 'assets/stages/dirty_delhi/rebuild'
OUT = ROOT / 'assets/stages/dirty_delhi/river'


def gaps(occupied, n):
    """Split points at the centres of the n widest empty runs strictly inside the occupied span."""
    idx = np.where(occupied)[0]; runs = []; start = None
    for i in range(idx[0], idx[-1] + 1):
        if not occupied[i] and start is None:
            start = i
        if occupied[i] and start is not None:
            runs.append((i - start, (start + i) // 2)); start = None
    return sorted(c for _, c in sorted(runs, reverse=True)[:n])


def cells(name, cols, rows, path=None):
    """Cut a pose sheet at its empty gutters (GPT does not lay out an exact grid): rows first, then the
    columns of each row band."""
    a = np.array(Image.open(path or SRC / f'{name}.png').convert('RGBA')); a[a[:, :, 3] < 128] = 0; h, w = a.shape[:2]
    op = a[:, :, 3] > 0; ys = [0, *gaps(op.sum(1) > 2, rows - 1), h]; out = []
    for y0, y1 in zip(ys, ys[1:]):
        xs = [0, *gaps(op[y0:y1].sum(0) > 2, cols - 1), w]
        out += [a[y0:y1, x0:x1].copy() for x0, x1 in zip(xs, xs[1:])]
    return out


def coherent_cells(path, count, rows=1):
    """Isolate complete figures by connected bodies when their horizontal bounds overlap."""
    a = np.array(Image.open(path).convert('RGBA'))
    parts = [p for p in components(a[:, :, 3] >= 128) if len(p) > 1000]
    if len(parts) != count:
        raise ValueError(f'{path}: expected {count} complete figures, got {len(parts)}')
    parts.sort(key=lambda p: (min(rows - 1, int(p[:, 0].min() * rows / a.shape[0])), p[:, 1].min()))
    result = []
    for part in parts:
        y0, x0 = part.min(0); y1, x1 = part.max(0) + 1
        frame = np.zeros_like(a)
        frame[part[:, 0], part[:, 1]] = a[part[:, 0], part[:, 1]]
        result.append(frame[y0:y1, x0:x1])
    return result


def clean(a, min_area=120, keep_small=False):
    """Binary alpha; drop specks and slivers of neighbouring cells (small parts touching the border)."""
    a = a.copy(); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); h, w = a.shape[:2]
    parts = components(a[:, :, 3] > 0); keep = np.zeros((h, w), bool); big = len(parts[0]) if parts else 0
    for p in parts:
        border = p[:, 0].min() < 3 or p[:, 1].min() < 3 or p[:, 0].max() > h - 4 or p[:, 1].max() > w - 4
        if (len(p) >= min_area or keep_small) and not (border and len(p) < big * .3):
            keep[p[:, 0], p[:, 1]] = True
    a[~keep] = 0; return a


def pad(cs, n=48):
    h = max(c.shape[0] for c in cs); w = max(c.shape[1] for c in cs)
    return [np.pad(c, ((n, n + h - c.shape[0]), (n, n + w - c.shape[1]), (0, 0))) for c in cs]


def shift(a, dy, dx):
    return np.roll(np.roll(a, dy, 0), dx, 1)


def corr(ref, a, box, r=40):
    """Integer (dy, dx) aligning a to ref by alpha overlap inside box (fractions x0, y0, x1, y1)."""
    h, w = ref.shape[:2]; x0, y0, x1, y1 = round(box[0] * w), round(box[1] * h), round(box[2] * w), round(box[3] * h)
    m0 = ref[y0:y1, x0:x1, 3] > 0; A = a[:, :, 3] > 0

    def score(dy, dx):
        m = shift(A, dy, dx)[y0:y1, x0:x1]; return (m & m0).sum() - (m ^ m0).sum()
    best = max(((score(dy, dx), dy, dx) for dy in range(-r, r + 1, 4) for dx in range(-r, r + 1, 4)))
    _, by, bx = best
    best = max(((score(dy, dx), dy, dx) for dy in range(by - 3, by + 4) for dx in range(bx - 3, bx + 4)))
    return best[1], best[2]


def sole(a):
    return np.where(a[:, :, 3] > 0)[0].max()


def prop(pred, region, mode='base'):
    """Anchor on a prop that must not move: the largest part of pixels matching pred(rgb) inside region
    (fractions x0, y0, x1, y1 of the cell's content box). mode 'base': centre of its bottom rows, on its bottom; 'bow': its
    right-most point in x, its bottom in y."""
    def f(c):
        h, w = c.shape[:2]; ys, xs = np.where(c[:, :, 3] > 0); bx, by, bw, bh = xs.min(), ys.min(), np.ptp(xs) + 1, np.ptp(ys) + 1
        x0, y0, x1, y1 = bx + round(region[0] * bw), by + round(region[1] * bh), bx + round(region[2] * bw), by + round(region[3] * bh)
        rgb = c[:, :, :3].astype(float); m = np.zeros((h, w), bool)
        m[y0:y1, x0:x1] = (c[y0:y1, x0:x1, 3] > 0) & pred(rgb[y0:y1, x0:x1])
        p = components(m)[0]; ys, xs = p[:, 0], p[:, 1]; b = ys.max()
        return (xs.max() if mode == 'bow' else np.median(xs[ys >= b - 6])), b
    return f


grey = lambda rgb: (rgb.max(2) - rgb.min(2) < 34) & (rgb @ LUM > 45)
wicker = lambda rgb: (rgb[:, :, 0] - rgb[:, :, 2] > 40) & (rgb @ LUM > 60)
solid = lambda rgb: np.ones(rgb.shape[:2], bool)


def register(cs, box=None, ref=0, walk=False, core=False, anchor=None):
    """Align cells on a fixed part: anchor (prop()) or alpha correlation in box; walks on the torso (box)
    plus each frame's own sole line. core: centre on the eroded body mass (birds: the wings move)."""
    cs = pad([clean(c) for c in cs]); out = []
    if anchor:
        rx, ry = anchor(cs[ref])
        for c in cs:
            ax, ay = anchor(c); out.append(shift(c, round(ry - ay), round(rx - ax)))
        return out
    if core:
        for c in cs:
            s = c[:, :, 3] > 0; e = s.copy()
            for _ in range(10):
                e = e & np.roll(e, 1, 0) & np.roll(e, -1, 0) & np.roll(e, 1, 1) & np.roll(e, -1, 1)
            ys, xs = np.where(e if e.sum() > 50 else s); cy, cx = cs[0].shape[0] // 2, cs[0].shape[1] // 2
            out.append(shift(c, round(cy - ys.mean()), round(cx - xs.mean())))
        return out
    for c in cs:
        dy, dx = corr(cs[ref], c, box); c = shift(c, dy, dx)
        if walk:
            c = shift(c, sole(cs[ref]) - sole(c), 0)
        out.append(c)
    return out


def box_scale(a, s):
    """Premultiplied BOX downscale (no ringing, no colour bleeding from transparent pixels), re-hardened."""
    im = Image.fromarray(a).convert('RGBa'); w, h = max(1, round(a.shape[1] * s)), max(1, round(a.shape[0] * s))
    b = np.array(im.resize((w, h), Image.Resampling.BOX).convert('RGBA')); b[:, :, 3] = np.where(b[:, :, 3] >= 128, 255, 0)
    b[b[:, :, 3] == 0, :3] = 0; return b


HEADROOM = 8  # 2x px of clear space over the tallest pose (a raised rod or cloth keeps its outline)


def strip(frames, s, plate=None, box=None, **grade):
    """Registered frames -> one strip of equal cells at 2x; anchor bottom centre. Returns (image, cw, ch)."""
    al = np.any([f[:, :, 3] > 0 for f in frames], 0); ys, xs = np.where(al)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sc = [box_scale(f[y0:y1, x0:x1], s) for f in frames]
    ch = max(c.shape[0] for c in sc) + HEADROOM; cw = max(c.shape[1] for c in sc); cw += cw % 2 + 2; ch += ch % 2
    out = Image.new('RGBA', (cw * len(sc), ch))
    for i, c in enumerate(sc):
        out.alpha_composite(Image.fromarray(c), (i * cw + (cw - c.shape[1]) // 2, ch - c.shape[0]))
    out = edges(out)
    if plate:
        out = backdrop(out, plate_light(PLATES / f'{plate}.png', box)[0], **grade)
    return out, cw, ch


def save(name, frames, s, **kw):
    im, cw, ch = strip(frames, s, **kw); im.save(OUT / f'{name}.png', optimize=True)
    print(f'{name}: {len(frames)} frames, cell {cw}x{ch} (2x px) = {cw // 2}x{ch // 2} logical')
    return im, cw, ch


def height(frames):
    return max(np.ptp(np.where(f[:, :, 3] > 0)[0]) + 1 for f in frames)


# Graded into the lit part of the plate behind each extra (plate 2x px boxes). Dusk riverside light is
# low and orange, the culvert is lit by one bulb.
def dhobi():
    """The washing stone is drawn once (dhobi_stone.png) and cut out of every pose; the man is registered
    on his planted rear (left) foot, so neither the stone nor his feet move between poses."""
    raw = pad([clean(c) for c in cells('dhobi', 4, 2)]); stone = prop(grey, (.4, .6, 1, 1))
    # Stone of pose 0 (a clean pose: the laundry is up) as the mask, placed on each pose's own stone.
    ref = raw[0]; h, w = ref.shape[:2]; ys, xs = np.where(ref[:, :, 3] > 0)
    bx, by, bw, bh = xs.min(), ys.min(), np.ptp(xs) + 1, np.ptp(ys) + 1
    rgb = ref[:, :, :3].astype(float); m = np.zeros((h, w), bool); x0, y0 = bx + round(.4 * bw), by + round(.6 * bh)
    m[y0:, x0:] = (ref[y0:, x0:, 3] > 0) & grey(rgb[y0:, x0:])
    part = components(m)[0]; mask = np.zeros((h, w), bool); mask[part[:, 0], part[:, 1]] = True
    ys2, xs2 = np.where(mask); sy0, sy1, sx0, sx1 = ys2.min(), ys2.max() + 1, xs2.min(), xs2.max() + 1
    mask[sy0:sy1, sx0:sx1] |= ref[sy0:sy1, sx0:sx1, 3] > 0         # the whole stone box (outline and all)
    grow = mask.copy()
    for _ in range(3):
        grow = grow | np.roll(grow, 1, 0) | np.roll(grow, -1, 0) | np.roll(grow, 1, 1) | np.roll(grow, -1, 1)
    rx, ry = stone(ref); stone_px = np.zeros_like(ref); stone_px[mask] = ref[mask]
    men = []
    for c in raw:
        ax, ay = stone(c); g = shift(grow, round(ay - ry), round(ax - rx)); c = c.copy()
        light = c[:, :, :3].astype(float) @ LUM > 150                   # laundry lying on the stone stays
        c[g & ~light] = 0; men.append(clean(c))
    # Register on the rear foot: the left-most sole pixels (bottom 6 rows) and the sole line.
    def rear(c):
        ys, xs = np.where(c[:, :, 3] > 0); b = ys.max(); low = xs[ys >= b - 5]; return np.percentile(low, 10), b
    fx, fy = rear(men[0]); out = []
    for c in men:
        ax, ay = rear(c); out.append(shift(c, round(fy - ay), round(fx - ax)))
    s = 140 / height(out[:1])  # standing man ~70 logical on the ghat quay
    grade = dict(plate='ghat', box=(900, 280, 1300, 380), level=.8, cast=.35, contrast=.9, sat=.9)
    # One strip for the man and one cell for the stone, cropped on the same union box so they register.
    frames = out + [stone_px]; al = np.any([f[:, :, 3] > 0 for f in frames], 0); ys, xs = np.where(al)
    Y0, Y1, X0, X1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    sc = [box_scale(f[Y0:Y1, X0:X1], s) for f in frames]
    ch = max(c.shape[0] for c in sc) + HEADROOM; cw = max(c.shape[1] for c in sc); cw += cw % 2 + 2; ch += ch % 2
    for name, group in (('dhobi', sc[:-1]), ('dhobi_stone', sc[-1:])):
        im = Image.new('RGBA', (cw * len(group), ch))
        for i, c in enumerate(group):
            im.alpha_composite(Image.fromarray(c), (i * cw + (cw - c.shape[1]) // 2, ch - c.shape[0]))
        im = backdrop(edges(im), plate_light(PLATES / 'ghat.png', grade['box'])[0], **{k: v for k, v in grade.items() if k not in ('plate', 'box')})
        im.save(OUT / f'{name}.png', optimize=True)
        print(f'{name}: {len(group)} frames, cell {cw}x{ch} (2x px)')


def fisher():
    # Register the seated body on the crate's base. Extract one crate and bucket so the furniture
    # cannot change shape or rock as the fisherman reels, looks back, or crouches.
    src = SRC / 'chad_style/fisher.png'
    if not src.exists():
        f = register(cells('fisher', 4, 2), anchor=prop(grey, (.55, .6, 1, 1)))
        return save('fisher', f, 112 / height(f[:1]), plate='pontoon', box=(300, 280, 800, 360), level=.8, cast=.35, contrast=.9, sat=.9)
    raw = pad([clean(c) for c in cells('fisher', 4, 2, path=src)])
    props = None; poses = []
    for c in raw:
        op = c[:, :, 3] > 0; ys, xs = np.where(op); base = ys.max()
        xs = np.where(op[base - 5])[0]
        crate = np.split(xs, np.where(np.diff(xs) > 2)[0] + 1)[0]
        left, right = int(crate.min()), int(crate.max()) + 5
        top = np.where(op[:, left:left + 10])[0].min()
        bucket = op & grey(c[:, :, :3].astype(float))
        bucket[:base - 85] = False; bucket[:, :right + 25] = False
        p = components(bucket)[0]; by, bx = p.min(0); ey, ex = p.max(0) + 1
        mask = np.zeros_like(op)
        mask[top:base + 1, left:right] = True
        mask[by - 12:base + 1, bx - 5:ex + 12] = True
        furniture = np.zeros_like(c); furniture[mask] = c[mask]
        man = c.copy(); man[mask] = 0
        if props is None:
            props = furniture; anchor = (left, base)
        poses.append(shift(man, anchor[1] - base, anchor[0] - left))
    # A shared union gives actor and furniture identical registration and cell dimensions.
    im, cw, ch = strip(poses + [props], 112 / height(raw[:1]), plate='pontoon',
                       box=(300, 280, 800, 360), level=.8, cast=.35, contrast=.9, sat=.9)
    im.crop((0, 0, cw * 8, ch)).save(OUT / 'fisher.png', optimize=True)
    im.crop((cw * 8, 0, cw * 9, ch)).save(OUT / 'fisher_props.png', optimize=True)
    print(f'fisher: 8 poses + fixed furniture, cell {cw}x{ch} (2x px)')


def ragpicker():
    f = register(cells('ragpicker', 4, 2), anchor=prop(wicker, (.62, .6, 1, 1)))  # the basket
    s = 96 / height(f[:1])  # crouched with his sack, ~48 logical
    save('ragpicker', f, s, plate='culvert', box=(700, 150, 900, 300), level=.72, cast=.45, contrast=.88, sat=.85)


def boatman():
    f = register(cells('boatman', 3, 2), anchor=prop(solid, (.55, .7, 1, 1), 'bow'))  # the bow
    s = 96 / height(f[:1])  # distant river boat, ~48 logical with the oarsman
    save('boatman', f, s, plate='ghat', box=(900, 240, 1400, 300), level=.72, cast=.4, contrast=.85, sat=.85)


def carrier(name, alarm, h2x, plate, box):
    """A load carrier: an 8-pose walk (torso-registered, own sole line) plus two alarm poses (look back,
    duck) scaled to the walk's size and set on its sole line under the walk's hips."""
    restyled = SRC / 'chad_style' / f'{name}.png'
    coherent = coherent_cells(restyled, 10, rows=2) if name == 'carrier_basket' and restyled.exists() else None
    walk = coherent[:8] if coherent else cells(name, 4, 2) if name.startswith('porter') else cells(name, 8, 1)
    f = register(walk, box=(.2, 0, .8, .45), walk=True)
    refined_alarm = SRC / 'chad_style' / f'{alarm}.png'
    separate_alarm = coherent and refined_alarm.exists()
    al = [clean(c) for c in (coherent_cells(refined_alarm, 2) if separate_alarm else coherent[8:] if coherent else cells(alarm, 2, 1))]
    k = 1 if coherent and not separate_alarm else height(f[:1]) / height(al[:1])
    al = [box_scale(c, k) for c in al]
    # Feet centred under pose 0's feet, soles on its sole line.
    def feet(c):
        ys, xs = np.where(c[:, :, 3] > 0); b = ys.max(); return np.median(xs[ys >= b - 12]), b
    fx, fy = feet(f[0]); H, Wd = f[0].shape[:2]; out = list(f)
    for c in al:
        ax, ay = feet(c); cnv = np.zeros((H, Wd, 4), np.uint8); dy, dx = round(fy - ay), round(fx - ax)
        ys, xs = np.where(c[:, :, 3] > 0); ys2, xs2 = ys + dy, xs + dx; ok = (ys2 >= 0) & (ys2 < H) & (xs2 >= 0) & (xs2 < Wd)
        cnv[ys2[ok], xs2[ok]] = c[ys[ok], xs[ok]]; out.append(cnv)
    s = h2x / height(out[:1])
    im, cw, ch = save(name, out, s, plate=plate, box=box, level=.8, cast=.35, contrast=.9, sat=.9)
    # Forward speed: the planted (lowest) foot slides back by speed x ticks each frame while the body
    # is held; report its per-frame travel (2x px) for js/delhi_life_river.js.
    a = np.array(im); lows = []
    for i in range(8):
        c = a[:, i * cw:(i + 1) * cw, 3] > 0; ys, xs = np.where(c); b = ys.max(); lows.append(np.median(xs[ys >= b - 2]))
    back = [lows[i] - lows[i + 1] for i in range(7)]
    print(f'  {name} planted-foot x per frame (2x px): {[round(v) for v in lows]}; back-steps {[round(v, 1) for v in back]}')


def porter():
    carrier('porter', 'porter_alarm', 150, 'wharf', (400, 300, 1100, 360))       # ~75 logical with the sack


def hem(name):
    """Median sole-to-shorts-hem height over the walk (source px): the legs are the one part the loaded
    and the empty porter share, so it carries the scale from one sheet to the other."""
    out = []
    for c in (clean(c) for c in cells(name, 4, 2)):
        ys = np.where(c[:, :, 3] > 0)[0]; rgb = c[:, :, :3].astype(float)
        g = (c[:, :, 3] > 0) & (rgb.max(2) - rgb.min(2) < 40) & (rgb @ LUM > 110)
        out.append(ys.max() - np.where(g)[0].max())
    return float(np.median(out))


def porter_empty():
    """The wharf porter walking back to the boat for the next sack (a GPT edit of the loaded sheet: the sack
    folded over his shoulder, arms swinging), at the loaded porter's scale (matched on the legs)."""
    tall = lambda n: height([clean(c) for c in cells(n, 4, 2)][:1])
    h2x = 150 * tall('porter_empty') / tall('porter') * hem('porter') / hem('porter_empty')
    carrier('porter_empty', 'porter_empty_alarm', round(h2x), 'wharf', (400, 300, 1100, 360))


def deckhand():
    """Boatman coiling rope on a moored boat (B-27 at the wharf, one on the ghat): registered on his back
    heel (the right-most sole pixel; the coil and rope never reach it) and the sole line."""
    def heel(c):
        ys, xs = np.where(c[:, :, 3] > 0); b = ys.max(); return xs[ys >= b - 5].max(), b
    f = register(cells('deckhand', 4, 2), anchor=heel)
    s = 72 / height(f[:1])  # ~36 logical standing on a moored boat
    save('deckhand', f, s, plate='wharf', box=(200, 250, 700, 330), level=.74, cast=.4, contrast=.88, sat=.88)


def coolie():
    carrier('carrier_coolie', 'carrier_coolie_alarm', 148, 'culvert', (600, 200, 1000, 400))


def basket():
    carrier('carrier_basket', 'carrier_basket_alarm', 146, 'ghat', (900, 280, 1300, 380))


def blobs(name, n):
    """The n largest separate subjects of a sheet (birds overlap in projection), in reading order."""
    a = np.array(Image.open(SRC / f'{name}.png').convert('RGBA')); a[a[:, :, 3] < 128] = 0
    parts = components(a[:, :, 3] > 0)[:n]; boxes = [(p[:, 0].min(), p[:, 0].max(), p[:, 1].min(), p[:, 1].max(), p) for p in parts]
    rows = sorted(boxes, key=lambda b: b[0]); mid = a.shape[0] / 2
    order = sorted(boxes, key=lambda b: ((b[0] + b[1]) / 2 > mid, b[2])); out = []
    for y0, y1, x0, x1, p in order:
        c = np.zeros((y1 - y0 + 1, x1 - x0 + 1, 4), np.uint8); c[p[:, 0] - y0, p[:, 1] - x0] = a[p[:, 0], p[:, 1]]; out.append(c)
    return out


def kites():
    f = register(blobs('kites', 8), core=True)
    s = 44 / max(np.ptp(np.where(c[:, :, 3] > 0)[1]) + 1 for c in f)  # wingspan ~22 logical
    save('kites', f, s, plate='pontoon', box=(0, 0, 1620, 200), level=.78, cast=.3, contrast=.9, sat=.9)


def gulls():
    """Black-headed gulls over the pontoon water: 0-3 flap cycle, 4 glide, 5 bank, 6 landing, 7 perched."""
    f = register(blobs('gulls', 8), core=True)
    s = 36 / max(np.ptp(np.where(c[:, :, 3] > 0)[1]) + 1 for c in f)  # widest spread ~18 logical
    im, cw, ch = save('gulls', f, s, plate='pontoon', box=(0, 0, 1620, 260), level=.8, cast=.3, contrast=.9, sat=.9)
    a = np.array(im)[:, 7 * cw:8 * cw, 3] > 0; ys, xs = np.where(a)
    print(f'  gulls: perched feet at cell ({np.median(xs[ys >= ys.max() - 2]):.1f}, {ys.max() + 1}) 2x px')


def netcaster():
    """Cast-net fisherman standing in the moored skiff on the pontoon water: registered on his dhoti (the
    net swings wide and drops as low as his feet) with each pose's soles on one line."""
    def dhoti(c):
        rgb = c[:, :, :3].astype(float); a = c[:, :, 3] > 0
        m = a & (rgb.min(2) > 150) & (rgb.max(2) - rgb.min(2) < 50); ys, xs = np.where(m); cx = np.median(xs)
        sk = a & (np.abs(np.arange(c.shape[1])[None, :] - cx) < 40); b = np.where(sk.any(1))[0].max()
        return cx, b
    f = register([np.pad(c, ((160, 160), (160, 160), (0, 0))) for c in blobs('netcaster', 8)], anchor=dhoti)  # room for the shift
    s = 80 / height(f[:1])  # ~40 logical standing
    save('netcaster', f, s, plate='pontoon', box=(400, 240, 1300, 380), level=.74, cast=.4, contrast=.88, sat=.88)


def polecarry():
    """Two coolies carrying a slung crate on a bamboo pole along the wharf and pontoon quays: an 8-frame walk
    registered on the pole and shoulders, each frame's soles on one line. (The front man wears olive, not
    the sack porter's red: the source sheet is a GPT Image recolour edit of the first one.)"""
    f = register(cells('polecarry', 4, 2), box=(.05, 0, .95, .3), walk=True)
    s = 124 / height(f[:1])  # ~62 logical, pole to soles (behind the fighters' lane)
    im, cw, ch = save('polecarry', f, s, plate='wharf', box=(400, 300, 1100, 380), level=.8, cast=.35, contrast=.9, sat=.9)
    a = np.array(im); lows = []
    for i in range(8):
        c = a[:, i * cw:(i + 1) * cw, 3] > 0; ys, xs = np.where(c); b = ys.max(); lows.append(np.median(xs[ys >= b - 2]))
    print(f'  polecarry lowest-sole x per frame (2x px): {[round(v) for v in lows]}')


def single(name, width, plate, box, **grade):
    """One whole subject (all its parts) scaled to `width` 2x px; hanging/standing is up to the game."""
    a = clean(np.array(Image.open(SRC / f'{name}.png').convert('RGBA')), keep_small=True)
    save(name, [a], width / (np.ptp(np.where(a[:, :, 3] > 0)[1]) + 1), plate=plate, box=box, **grade)


def debris():
    f = [np.pad(c, ((8, 8), (8, 8), (0, 0))) for c in blobs('debris', 6)]
    # Each item on its own waterline (bottom), centred; ~12 logical wide.
    frames = []
    for c in f:
        c = box_scale(c, 24 / (np.ptp(np.where(c[:, :, 3] > 0)[1]) + 1)); frames.append(c)
    ch = max(c.shape[0] for c in frames); cw = max(c.shape[1] for c in frames); cw += cw % 2 + 2; ch += ch % 2
    out = Image.new('RGBA', (cw * len(frames), ch))
    for i, c in enumerate(frames):
        out.alpha_composite(Image.fromarray(c), (i * cw + (cw - c.shape[1]) // 2, ch - c.shape[0]))
    out = backdrop(edges(out), plate_light(PLATES / 'pontoon.png', (0, 260, 1620, 360))[0], level=.72, cast=.35, contrast=.9, sat=.85)
    out.save(OUT / 'debris.png', optimize=True); print(f'debris: 6 frames, cell {cw}x{ch} (2x px)')


# Foreground pieces sit nearer the camera than the fighters, out of the low sun: darker, cooler rims.
FG = dict(level=.52, cast=.25, contrast=.95, sat=.9)


# Plate repairs: [source crop in plate 2x px, the object's region inside the crop (x0, y0, x1, y1)]
PATCHES = {
    'laundry': ('ghat', (300, 100, 600, 400), (80, 110, 240, 220)),
    'crate': ('wharf', (1350, 40, 1620, 310), (140, 10, 270, 230)),
    'chains': ('ghat', (1380, 40, 1620, 280), (165, 55, 240, 175)),
}


def patch(name):
    plate, (cx0, cy0, cx1, cy1), (ox0, oy0, ox1, oy1) = PATCHES[name]
    orig = np.array(Image.open(PLATES / f'{plate}.png').convert('RGB').crop((cx0, cy0, cx1, cy1))).astype(float)
    rep = np.array(Image.open(SRC / f'patch_{name}.png').convert('RGB').resize((cx1 - cx0, cy1 - cy0), Image.Resampling.BOX)).astype(float)
    d = np.abs(orig - rep).sum(2); m = np.zeros(d.shape, bool); m[oy0:oy1, ox0:ox1] = d[oy0:oy1, ox0:ox1] > 70
    # Close small gaps, keep the sizeable parts only.
    for _ in range(2):
        m = m | np.roll(m, 1, 0) | np.roll(m, -1, 0) | np.roll(m, 1, 1) | np.roll(m, -1, 1)
    for _ in range(2):
        m = m & np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1)
    keep = np.zeros_like(m)
    for p in components(m):
        if len(p) >= 60:
            keep[p[:, 0], p[:, 1]] = True
    if name == 'laundry':  # cloths hang solid from the line: fill each column between its top and bottom
        for x in range(ox0, ox1):
            ys = np.where(keep[:, x])[0]
            if len(ys):
                keep[ys.min():ys.max() + 1, x] = True
    obj = np.dstack([orig, keep * 255.]).astype(np.uint8)
    # Repair overlay: the mask grown 3 px, feathered 2 px more, so the swinging object uncovers only repair.
    grow = keep.copy()
    for _ in range(3):
        grow = grow | np.roll(grow, 1, 0) | np.roll(grow, -1, 0) | np.roll(grow, 1, 1) | np.roll(grow, -1, 1)
    feather = grow.astype(float)
    for _ in range(2):
        feather = (feather + np.roll(feather, 1, 0) + np.roll(feather, -1, 0) + np.roll(feather, 1, 1) + np.roll(feather, -1, 1)) / 5
    feather = np.maximum(feather, grow)
    fill = np.dstack([rep, feather * 255]).astype(np.uint8)
    # Even crops so both land on whole logical pixels.
    ys, xs = np.where(feather > 0); y0, y1, x0, x1 = ys.min() & ~1, (ys.max() + 2) & ~1, xs.min() & ~1, (xs.max() + 2) & ~1
    Image.fromarray(fill[y0:y1, x0:x1]).save(OUT / f'{name}_fill.png', optimize=True)
    obj = obj[y0:y1, x0:x1]
    if name == 'crate':
        # The crane lowers its load: the chain from the first big link down (columns 205-240, from row
        # 94) and the slings and crate (from row 146) go to crate_load.png; the skyline scraps behind the
        # slings (saturated orange) stay with the gantry. js/delhi_life_river.js tiles the 36-row link
        # period into the gap as the load drops.
        r, g = obj[..., 0].astype(int), obj[..., 1].astype(int)
        load = np.zeros(obj.shape[:2], bool); load[94:, 205:241] = True; load[168:, 165:] = True
        for y in range(146, 168):  # the slings fan out from the hook to the crate's corners
            load[y, int(211 - (y - 146) * 1.8):int(239 + (y - 146) * 1.45)] = True
        orange = (r > g * 1.6) & (r > 110); load &= ~(orange & (np.arange(len(obj))[:, None] < 166) & (np.arange(len(obj))[:, None] >= 146))
        load[94:146, 205:241] &= ~orange[94:146, 205:241]; load[94:146, 212:235] = True  # links, not the scraps beside them
        load &= obj[..., 3] > 0
        Image.fromarray(np.where(load[..., None], obj, 0).astype(np.uint8)).save(OUT / 'crate_load.png', optimize=True)
        obj = np.where(load[..., None], 0, obj).astype(np.uint8)
    Image.fromarray(obj).save(OUT / f'{name}.png', optimize=True)
    # Separate parts (one per cloth / chain) for per-piece sway: logical boxes relative to the layer.
    parts = [p for p in components(keep[y0:y1, x0:x1]) if len(p) >= 60]
    boxes = sorted([(int(p[:, 1].min()) // 2, int(p[:, 0].min()) // 2, (int(p[:, 1].max()) + 2) // 2, (int(p[:, 0].max()) + 2) // 2) for p in parts])
    print(f'{name}: layer at plate logical ({(cx0 + x0) // 2},{(cy0 + y0) // 2}) size {(x1 - x0) // 2}x{(y1 - y0) // 2}; parts {boxes}')


def sleeper():
    """A labourer asleep on a charpai against the vendor-row wall by the culvert door: registered on the cot
    (its right-hand post: the right-most pixel and the bottom of the right-most columns; his feet only reach
    below the rail when he sits up, in the middle), so the cot never moves between poses."""
    def post(c):
        ys, xs = np.where(c[:, :, 3] > 0); r = xs.max(); col = ys[xs >= r - 14]; return r, col.max()
    f = register(cells('sleeper', 4, 2), anchor=post)
    s = 160 / (np.ptp(np.where(f[0][:, :, 3] > 0)[1]) + 1)   # the cot ~80 logical long, at the back pavement
    save('sleeper', f, s, plate='vendor', box=(1300, 220, 1620, 400), level=.7, cast=.45, contrast=.88, sat=.85)


def washer():
    """An old man washing at the culvert's leaking pipe: registered on his bucket (base centre) and the sole
    line (the lowest pixel: his feet, or the bucket's base; the bucket lifts only a hair in pose 5)."""
    bucket = prop(grey, (.5, .55, 1, 1))
    def anchor(c):
        x, _ = bucket(c); return x, np.where(c[:, :, 3] > 0)[0].max()
    f = register(cells('washer', 4, 2), anchor=anchor)
    s = 140 / height(f[3:4])  # standing upright ~70 logical, like the culvert coolie
    save('washer', f, s, plate='culvert', box=(400, 200, 900, 400), level=.66, cast=.5, contrast=.86, sat=.82)


def dog():
    """A street dog lying by the bins: registered on its rump (the left-most pixel of its lower third) and the
    ground line, so only the head, ears and legs move."""
    def rump(c):
        ys, xs = np.where(c[:, :, 3] > 0); lo = ys >= ys.max() - np.ptp(ys) // 3; return xs[lo].min(), ys.max()
    f = register(cells('dog', 4, 2), anchor=rump)
    s = 66 / (np.ptp(np.where(f[3][:, :, 3] > 0)[1]) + 1)   # lying with its head up ~33 logical long
    save('dog', f, s, plate='vendor', box=(1300, 220, 1620, 400), level=.72, cast=.45, contrast=.88, sat=.85)


def smoker():
    """An old watchman smoking a beedi on an upturned crate in the culvert: registered on the crate (the left-most
    pixel of the bottom rows, and the ground line). Prints each pose's ember (the beedi's glowing tip) in 2x px
    from the cell's bottom centre, where js/delhi_life_river.js lets its smoke curl up."""
    def crate(c):
        ys, xs = np.where(c[:, :, 3] > 0); b = ys.max(); return xs[ys >= b - 20].min(), b
    f = register(cells('smoker', 4, 2), anchor=crate)
    s = 104 / height(f[:1])  # seated ~52 logical
    im, cw, ch = save('smoker', f, s, plate='culvert', box=(400, 200, 900, 400), level=.66, cast=.5, contrast=.86, sat=.82)
    a = np.array(im).astype(int); out = []
    for i in range(8):
        c = a[:, i * cw:(i + 1) * cw]; hot = (c[:, :, 3] > 0) & (c[:, :, 0] > 150) & (c[:, :, 0] - c[:, :, 2] > 90) & (c[:, :, 1] < c[:, :, 0] * .75)
        ys, xs = np.where(hot); out.append((round(xs.mean() - cw / 2), round(ys.mean() - ch)) if len(xs) else None)
    print(f'  smoker embers (2x px from bottom centre): {out}')


BUILD = {'tug': lambda: single('tug', 170, 'ghat', (820, 200, 1620, 260), level=.62, cast=.45, contrast=.8, sat=.8),
         'debris': debris,
         'fg_hook': lambda: single('fg_hook', 64, 'wharf', (1200, 0, 1620, 200), **FG),
         'fg_bollard': lambda: single('fg_bollard', 230, 'ghat', (800, 360, 1620, 480), **FG),
         'fg_rail': lambda: single('fg_rail', 220, 'pontoon', (0, 330, 1620, 480), **FG),
         'fg_pipe': lambda: single('fg_pipe', 640, 'culvert', (700, 60, 900, 200), **dict(FG, level=.6, cast=.4)),
         'gulls': gulls, 'netcaster': netcaster, 'polecarry': polecarry,
         'skiff': lambda: single('skiff', 180, 'pontoon', (400, 240, 1300, 380), level=.66, cast=.42, contrast=.84, sat=.84),
         'dhobi': dhobi, 'fisher': fisher, 'ragpicker': ragpicker, 'boatman': boatman, 'porter': porter, 'porter_empty': porter_empty, 'deckhand': deckhand, 'kites': kites,
         'carrier_coolie': coolie, 'carrier_basket': basket, 'sleeper': sleeper, 'washer': washer, 'dog': dog, 'smoker': smoker,
         **{f'patch_{n}': (lambda n=n: patch(n)) for n in PATCHES}}

if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    for n in sys.argv[1:] or BUILD:
        BUILD[n]()
