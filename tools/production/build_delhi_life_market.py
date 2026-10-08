#!/usr/bin/env python3
"""Build the Delhi market's background life (js/delhi_life_market.js) from GPT Image strips.

Sources: assets/sources/production/stages/dirty_delhi/market_life/<name>.png, raw true-alpha GPT
strips (8 poses of one person left to right; hanging/foreground sheets for scenery).
Actors: each strip is hardened with sprite_edges.alpha() at source size, split into poses by empty
columns, registered on a part that must not move (feet for stall workers, hips for walkers, wheels
for the cyclist) with the soles on one line, BOX-downscaled so pose 0 stands `height` logical px
tall, re-thresholded, outlined with edges() and graded into the plate behind it (backdrop()).
Every strip is written at 2x as equal cells with the anchor at the bottom centre, 2 px up, and
the cell size is printed for MARKET_SHEETS in js/delhi_life_market.js.
Usage: build_delhi_life_market.py [name ...]   (default: everything)
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from sprite_edges import alpha as cut_alpha, edges  # noqa: E402
from backdrop_tone import backdrop, plate_light  # noqa: E402

SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/market_life'
OUT = ROOT / 'assets/stages/dirty_delhi/market_life'
PLATES = ROOT / 'assets/stages/dirty_delhi/rebuild'

# name: (logical height of pose 0's box, anchor band as fractions of the box height (rows whose
# alpha centre is the anchor), plate, logical plate box whose lamp light it takes, backdrop kw)
ACTORS = {
    'kebab':   (74, (.93, 1.), 'food', (80, 90, 250, 200), dict(level=.74, cast=.35)),
    'stirrer': (76, (.93, 1.), 'food', (400, 90, 600, 200), dict(level=.72, cast=.35)),
    'chai':    (72, (.93, 1.), 'bazaar', (630, 90, 780, 200), dict(level=.72, cast=.3)),
    'cloth':   (76, (.93, 1.), 'bazaar', (100, 100, 260, 200), dict(level=.74, cast=.3)),
    'elec':    (56, (.9, 1.), 'bazaar', (400, 100, 500, 200), dict(level=.72, cast=.3)),
    'fruit':   (72, (.93, 1.), 'market', (560, 100, 720, 200), dict(level=.72, cast=.3)),
    'porter':  (96, (.45, .62), 'bazaar', (0, 100, 810, 205), dict(level=.7, cast=.3)),
    'shopper': (80, (.35, .55), 'bazaar', (0, 100, 810, 205), dict(level=.72, cast=.3)),
    'cyclist': (78, (.62, 1.), 'food', (0, 100, 810, 205), dict(level=.7, cast=.3)),
    'teaboy':  (72, (.35, .55), 'food', (0, 100, 810, 205), dict(level=.72, cast=.3)),
    'saree':   (77, (.35, .55), 'market', (400, 100, 810, 205), dict(level=.72, cast=.3)),
    'rickshaw': (84, (.7, 1.), 'bazaar', (0, 100, 810, 205), dict(level=.7, cast=.3)),
    # The kachori halwai on his stool at the kachori shop front (vendor plate, world x ~2530).
    'kachori': (54, (.93, 1.), 'vendor', (40, 90, 160, 200), dict(level=.72, cast=.35)),
    # Stall keepers of the market row's side stalls (js/delhi_life_market.js KEEPERS; the stalls are
    # rampage/side_stalls.png): 10 poses in 2 rows of 5 - work, startled (6), cowering (7) and the two
    # aftermath poses (8-9) they use behind their wrecked stalls.
    'halwai':  (62, (.93, 1.), 'market', (60, 100, 200, 200), dict(level=.74, cast=.3)),
    'butcher': (64, (.93, 1.), 'market', (400, 100, 540, 200), dict(level=.74, cast=.3)),
}
# Sheets laid out as a grid (rows of poses): name: (rows, poses).
GRID = {'halwai': (2, 10), 'butcher': (2, 10)}
# Static props that stand in front of an actor: name: (logical width, plate, logical plate box, backdrop kw).
PROPS = {'kachori_prop': (30, 'vendor', (40, 90, 160, 200), dict(level=.74, cast=.35))}


def prop(name):
    """One whole prop: alpha hardened at source size, BOX-scaled to `width` logical px, outlined, graded."""
    width, plate, box, kw = PROPS[name]
    a = np.array(cut_alpha(Image.open(SRC / f'{name}.png'))); ys, xs = np.where(a[:, :, 3] > 0)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; s = width * 2 / a.shape[1]
    w, h = round(a.shape[1] * s), round(a.shape[0] * s)
    b = np.array(Image.fromarray(a).convert('RGBa').resize((w, h), Image.Resampling.BOX).convert('RGBA'))
    b[:, :, 3] = np.where(b[:, :, 3] >= 128, 255, 0); b[b[:, :, 3] == 0, :3] = 0
    cv = np.zeros((h + 4, w + 4, 4), np.uint8); cv[2:h + 2, 2:w + 2] = b
    light = plate_light(PLATES / f'{plate}.png', tuple(v * 2 for v in box))[0]
    backdrop(edges(Image.fromarray(cv)), light, **kw).save(OUT / f'{name}.png', optimize=True)
    print(f"{name}: {w + 4}x{h + 4} (2x), bottom centre is its foot")


def unstack(a, rows):
    """A grid sheet as one row: the `rows` bands (split at the widest empty row runs) side by side."""
    occ = a[:, :, 3].any(1); ys = np.where(occ)[0]; runs = []; start = None
    for y in range(ys[0], ys[-1] + 1):
        if not occ[y] and start is None:
            start = y
        if occ[y] and start is not None:
            runs.append((y - start, (start + y) // 2)); start = None
    cuts = [0, *sorted(c for _, c in sorted(runs, reverse=True)[:rows - 1]), a.shape[0]]
    bands = []
    for y0, y1 in zip(cuts, cuts[1:]):
        b = a[y0:y1]; yy = np.where(b[:, :, 3].any(1))[0]; bands.append(b[yy[0]:yy[-1] + 1])
    h = max(b.shape[0] for b in bands); gap = np.zeros((h, 40, 4), np.uint8)
    out = []
    for b in bands:
        out += [np.pad(b, ((h - b.shape[0], 0), (0, 0), (0, 0))), gap]
    return np.concatenate(out[:-1], 1)


def poses(a, n=8, gap=5):
    """Split a strip into n poses at runs of >= gap empty columns (small detached bits join the nearest)."""
    occ = a[:, :, 3].any(0); segs = []; x = 0; w = len(occ)
    while x < w:
        if not occ[x]:
            x += 1; continue
        s = x
        while x < w and (occ[x] or occ[x:x + gap].any()):
            x += 1
        segs.append([s, x])
    while len(segs) > n:  # merge the narrowest into its closest neighbour
        i = min(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0])
        j = i - 1 if i == len(segs) - 1 or (i > 0 and segs[i][0] - segs[i - 1][1] < segs[i + 1][0] - segs[i][1]) else i + 1
        lo, hi = sorted((i, j)); segs[lo] = [segs[lo][0], segs[hi][1]]; del segs[hi]
    count = (a[:, :, 3] > 0).sum(0)
    while len(segs) < n:  # two poses touching (a fan, a paddle): cut the widest at its thinnest column
        i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0]); s0, s1 = segs[i]
        lo, hi = s0 + (s1 - s0) * 3 // 10, s0 + (s1 - s0) * 7 // 10; cut = lo + int(np.argmin(count[lo:hi]))
        segs[i:i + 1] = [[s0, cut], [cut, s1]]
    return segs


def measure(a, seg, band):
    x0, x1 = seg; m = a[:, x0:x1, 3] > 0; ys = np.where(m.any(1))[0]; top, sole = ys[0], ys[-1]
    h = sole - top; r0, r1 = int(top + band[0] * h), int(top + band[1] * h) + 1
    xs = np.where(m[r0:r1])[1]
    return x0 + xs.mean(), top, sole


def actor(name):
    height, band, plate, box, kw = ACTORS[name]
    restyled = SRC / 'chad_style' / f'{name}.png'
    im = cut_alpha(Image.open(restyled if restyled.exists() else SRC / f'{name}.png')); a = np.array(im)
    rows, n = GRID.get(name, (1, 8))
    if rows > 1:
        a = unstack(a, rows)
    segs = poses(a, n); ms = [measure(a, s, band) for s in segs]
    s = height * 2 / (ms[0][2] - ms[0][1])            # source px -> 2x runtime px
    half = max(max(ax - sg[0], sg[1] - ax) for sg, (ax, _, _) in zip(segs, ms)) * s
    tall = max(sole - top for _, top, sole in ms) * s
    cw = int(np.ceil(half)) * 2 + 4; ch = int(np.ceil(tall)) + 6; ch += ch % 2
    strip = Image.new('RGBA', (cw * len(segs), ch))
    for i, (sg, (ax, top, sole)) in enumerate(zip(segs, ms)):
        only = np.zeros_like(a); only[:, sg[0]:sg[1]] = a[:, sg[0]:sg[1]]   # never a neighbour's sliver
        l, b = ax - cw / 2 / s, sole + 1 + 2 / s
        cell = Image.fromarray(only).crop((round(l), round(b - ch / s), round(l + cw / s), round(b)))
        cell = cell.resize((cw, ch), Image.Resampling.BOX)
        c = np.array(cell); c[:, :, 3] = np.where(c[:, :, 3] >= 128, 255, 0); c[c[:, :, 3] == 0, :3] = 0
        strip.paste(edges(Image.fromarray(c)), (i * cw, 0))
    light = plate_light(PLATES / f'{plate}.png', tuple(v * 2 for v in box))[0]
    backdrop(strip, light, **kw).save(OUT / f'{name}.png', optimize=True)
    print(f"{name}: cells {cw}x{ch} (2x), {len(segs)} poses, scale {s:.3f}")


# The intact side stalls' front plane (rampage/side_stalls.png cells 0-1, 2x) for the keepers who stand
# inside them: the awning down to its fringe, the counter from its top edge (row C) down, and in item
# boxes above it the things standing on the counter (sweet piles, the kadhai, the block and bowl): each
# column from its first run of pixels brighter than the dark back wall down. The game lays these pixels
# over the keeper, so he stands behind the counter and its goods.
# cell: (awning colour test, fringe search rows, counter row C, item boxes [(x0, x1, top row)], back-wall luminance).
STALL_FRONT = {
    0: (lambda r, g, b: (r > 120) & (b > 60) & (r - g > 50), 110, 160, [(0, 128, 124), (128, 152, 146), (152, 224, 124)], 62),
    1: (lambda r, g, b: (b > 90) & (b - r > 20), 100, 196, [(74, 136, 158), (136, 182, 162)], 52),
}


def keeper_front():
    im = np.array(Image.open(ROOT / 'assets/stages/dirty_delhi/rampage/side_stalls.png').convert('RGBA'))
    cw = im.shape[1] // 3; out = np.zeros((im.shape[0], cw * 2, 4), np.uint8)
    for i, (awning, rows, c0, boxes, wall) in STALL_FRONT.items():
        c = im[:, i * cw:(i + 1) * cw].astype(int); h = c.shape[0]; r, g, b = c[:, :, 0], c[:, :, 1], c[:, :, 2]
        lum = r * .3 + g * .59 + b * .11; m = np.zeros((h, cw), bool)
        aw = awning(r, g, b) & (c[:, :, 3] > 0)
        for x in range(cw):   # down to the fringe's lowest awning pixel in this column (and its outline)
            ys = np.where(aw[:rows, x])[0]
            if len(ys):
                m[:ys.max() + 3, x] = True
        m[c0:] = True
        lit = lum > wall
        for x0, x1, top in boxes:
            tops = []
            for x in range(x0, x1):
                run = lit[top:c0, x] & np.roll(lit[top:c0, x], -1) & np.roll(lit[top:c0, x], -2)
                ys = np.where(run[:-2])[0]; tops.append(top + ys[0] if len(ys) else c0)
            tops = np.array(tops)   # a 9-column median drops thin strands (strings, cloth tails) off the skyline
            tops = np.array([np.median(tops[max(0, k - 4):k + 5]) for k in range(len(tops))]).astype(int)
            for x, t in zip(range(x0, x1), tops):
                m[t:c0, x] = True
        m &= c[:, :, 3] > 0
        cell = im[:, i * cw:(i + 1) * cw].copy(); cell[~m] = 0
        out[:, i * cw:(i + 1) * cw] = cell
    Image.fromarray(out).save(OUT / 'keeper_front.png', optimize=True)
    print(f'keeper_front: 2 cells {cw}x{im.shape[0]} (2x), side_stalls cells 0-1')


# Hanging props: one row of separate pieces, each hung from its top point. Cells keep that point at
# the top centre so the game can rotate them about it.
HANGS = {'hang': (6, 50, 'bazaar', (0, 80, 810, 200), dict(level=.8, cast=.3, rim=.35))}


def hangers(name):
    n, height, plate, box, kw = HANGS[name]
    a = np.array(cut_alpha(Image.open(SRC / f'{name}.png'))); segs = poses(a, n)
    tops = []; cells = []
    for sg in segs:
        m = a[:, sg[0]:sg[1], 3] > 0; ys = np.where(m.any(1))[0]; top = ys[0]
        xs = np.where(m[top:top + 6])[1]; tops.append((sg[0] + xs.mean(), top, ys[-1]))
    s = height * 2 / max(b - t for _, t, b in tops)
    half = max(max(ax - sg[0], sg[1] - ax) for sg, (ax, _, _) in zip(segs, tops)) * s
    cw = int(np.ceil(half)) * 2 + 4; ch = int(np.ceil(height * 2)) + 4
    strip = Image.new('RGBA', (cw * n, ch))
    for i, (sg, (ax, top, _)) in enumerate(zip(segs, tops)):
        only = np.zeros_like(a); only[:, sg[0]:sg[1]] = a[:, sg[0]:sg[1]]
        l = ax - cw / 2 / s
        cell = Image.fromarray(only).crop((round(l), round(top - 1 / s), round(l + cw / s), round(top - 1 / s + ch / s)))
        c = np.array(cell.resize((cw, ch), Image.Resampling.BOX)); c[:, :, 3] = np.where(c[:, :, 3] >= 128, 255, 0)
        c[c[:, :, 3] == 0, :3] = 0; strip.paste(edges(Image.fromarray(c)), (i * cw, 0))
    backdrop(strip, plate_light(PLATES / f'{plate}.png', tuple(v * 2 for v in box))[0], **kw).save(OUT / f'{name}.png', optimize=True)
    print(f"{name}: cells {cw}x{ch} (2x), {n} pieces")


# Foreground overhead pieces (a 2x2 sheet): each hangs from the top edge of its quadrant. They are
# cut on alpha, trimmed to their own box, scaled to fit (width, height) logical px and darkened into near-camera
# shadow (the lamps only rim them), then written as separate files fg_<piece>.png.
FG = {'fg': [('wires', 230, 62), ('tarp', 170, 72), ('garland', 170, 64), ('bracket', 90, 62)]}


def foreground(name):
    a = np.array(cut_alpha(Image.open(SRC / f'{name}.png'))); h, w = a.shape[:2]
    for q, (piece, width, height) in enumerate(FG[name]):
        r, c = divmod(q, 2); part = a[r * h // 2:(r + 1) * h // 2, c * w // 2:(c + 1) * w // 2].copy()
        ys, xs = np.where(part[:, :, 3] > 0); part = part[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        im = Image.fromarray(part); s = min(width * 2 / im.width, height * 2 / im.height)
        im = im.resize((round(im.width * s), round(im.height * s)), Image.Resampling.BOX)
        c2 = np.array(im); c2[:, :, 3] = np.where(c2[:, :, 3] >= 128, 255, 0); c2[c2[:, :, 3] == 0, :3] = 0
        c2 = np.array(edges(Image.fromarray(c2))).astype(float)
        lum = c2[:, :, :3] @ [.3, .59, .11]
        # Near-camera shadow: compress everything toward a warm near-black, keep the brightest rims.
        k = np.clip((lum - 90) / 120, 0, 1)[..., None]
        c2[:, :, :3] = c2[:, :, :3] * (.34 + .5 * k) * np.array([1.0, .9, .8])
        Image.fromarray(c2.clip(0, 255).astype(np.uint8)).save(OUT / f'fg_{piece}.png', optimize=True)
        print(f"fg_{piece}: {c2.shape[1]}x{c2.shape[0]} (2x)")


# Wheels that turn in the game (js/delhi_life_market.js WHEELS): each wheel is fitted as a circle
# from the tyre's outer edge (pose 0). 'spokes': the painted spokes (thin structures inside the rim)
# are cleared from every pose, so the game draws turning spokes behind the frame, chain and legs.
# 'glint': the dense painted wheel stays and <name>_spin.png masks its dark interior (legs excluded)
# for the turning highlights the game lays over it. Prints the fitted centres for WHEELS.
WHEELS = {'cyclist': dict(rim=5, mode='spokes'), 'rickshaw': dict(rim=6, mode='spokes')}


def fit_circle(pts):
    p = np.array(pts, float); x, y = p[:, 0], p[:, 1]
    c = np.linalg.lstsq(np.c_[2 * x, 2 * y, np.ones(len(x))], x * x + y * y, rcond=None)[0]
    return c[0], c[1], float(np.sqrt(c[2] + c[0] ** 2 + c[1] ** 2))


def morph(m, grow):
    o = m.copy()
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sh = np.roll(np.roll(m, dy, 0), dx, 1); o = (o | sh) if grow else (o & sh)
    return o


def wheels(name):
    rim, mode = WHEELS[name]['rim'], WHEELS[name]['mode']
    im = np.array(Image.open(OUT / f'{name}.png').convert('RGBA'))
    cw = im.shape[1] // 8
    a = im[:, :cw, 3] > 128; bot = np.nonzero(a.any(1))[0].max(); rows = range(bot - 45, bot - 3)
    left = [(np.nonzero(a[y])[0].min(), y) for y in rows if a[y].any()][:30]
    right = [(np.nonzero(a[y])[0].max(), y) for y in rows if a[y].any()][:30]
    soles = [(x, np.nonzero(a[:, x])[0].max()) for x in range(cw) if a[:, x].any()]
    fits = [fit_circle(left + [q for q in soles if q[0] < cw * .4 and q[1] > bot - 25]),
            fit_circle(right + [q for q in soles if q[0] > cw * .6 and q[1] > bot - 25])]
    yy, xx = np.mgrid[:im.shape[0], :cw]
    disc = np.zeros_like(a)
    for cx, cy, r in fits:
        d = np.hypot(xx - cx, yy - cy); disc |= (d < r - rim) & (d > (3.2 if mode == 'spokes' else 0))
    mask = np.zeros(im.shape[:2], np.uint8)
    for f in range(im.shape[1] // cw):
        c = im[:, f * cw:(f + 1) * cw]; al = c[:, :, 3] > 128
        if mode == 'spokes':
            c[al & disc & ~morph(morph(al, False), True)] = 0
        else:
            mask[:, f * cw:(f + 1) * cw] = np.where(al & disc & (c[:, :, :3].mean(2) < 55), 255, 0)
    if mode == 'spokes':
        Image.fromarray(im).save(OUT / f'{name}.png', optimize=True)
    else:
        m = np.zeros(im.shape, np.uint8); m[:, :, :3] = 255; m[:, :, 3] = mask
        Image.fromarray(m).save(OUT / f'{name}_spin.png', optimize=True)
    print(f"{name} wheels (2x cell px, centre x, y, inner r):",
          [(round(cx + .5, 1), round(cy + .5, 1), round(r - rim, 1)) for cx, cy, r in fits])


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    names = sys.argv[1:] or [*ACTORS, *PROPS, *HANGS, *FG, 'keeper_front']
    for n in names:
        if n == 'elec':
            from build_delhi_welder import build as welder
            welder()
            continue
        if n == 'fruit' and (SRC / 'chad_style/fruit_v2.png').exists():
            from build_delhi_fruit_seller import build
            build()
            continue
        # Accepted vehicle grids have a wheelbase registration recipe and wider cells.
        # Dispatch before the legacy actor/spoke passes so a full rebuild preserves them.
        if n in ('cyclist', 'rickshaw') and (SRC / 'chad_style' / f'{n}_v2.png').exists():
            from build_delhi_market_vehicles import build as vehicle
            vehicle(n)
            continue
        if n == 'keeper_front':
            keeper_front(); continue
        if not (SRC / f'{n}.png').exists():
            print(f'skip {n}: no source'); continue
        (actor if n in ACTORS else prop if n in PROPS else hangers if n in HANGS else foreground)(n)
        if n in WHEELS:
            wheels(n)
