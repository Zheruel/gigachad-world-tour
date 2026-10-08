"""Register the station's background life and foreground depth pieces.

Sources: assets/sources/production/stages/night_train/station/*.png, GPT Image grids on
magenta. Every subject is cut per cell, keyed, registered on a part that must not move
(luggage, bedding, feet, the fan rod...), scaled to one world scale (standing adult 152px,
like station_life.png) and written as a strip of equal cells at display size, so the
game blits them 1:1. Cells put the anchor (feet/wheels/perch) at the bottom centre, 2px up;
the fan and the foreground lantern hang from the top centre.
Idle and extra poses (*_idle.png, *_extra.png, reader_alert.png) are true-alpha grids cut with
sprite_edges.alpha(). The people are then graded into their plate (BLEND, backdrop_tone.py).
Writes assets/stages/night_train/rebuild/st_*.png and prints each strip's cell size.
Usage: build_station_life.py [people] [scenery]  (default both).
"""
import numpy as np
from PIL import Image
from keying import key, components
from build_train_rebuild import ROOT
from sprite_edges import alpha as cut_alpha, edges
from backdrop_tone import backdrop, plate_light

SRC = ROOT / 'assets/sources/production/stages/night_train/station'
OUT = ROOT / 'assets/stages/night_train/rebuild'
TINT = np.array([.96, .93, .98]) * .74  # night lamplight, like the station_life actors (brightness .72)


def despill(a):
    """Neutralise the magenta left in thin parts (spokes, chains) that key() cannot repaint."""
    solid = a[:, :, 3] > 0; near = ~solid
    for _ in range(3):
        near = near | np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
    rgb = a[:, :, :3].astype(int); spill = np.clip(np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1], 0, None) * (solid & near)
    rgb[:, :, 0] -= spill; rgb[:, :, 2] -= spill; a[:, :, :3] = rgb.clip(0, 255); return a


def grid(name, cols, rows):
    a = despill(np.array(key(Image.open(SRC / f'{name}.png').convert('RGB'))))
    h, w = a.shape[:2]
    return [a[round(r * h / rows):round((r + 1) * h / rows), round(c * w / cols):round((c + 1) * w / cols)] for r in range(rows) for c in range(cols)]


def clean(a, min_area=150):
    """Drop specks, GPT's little motion marks, grid hairlines and slivers of neighbouring
    cells. Parts are found on solid alpha (faint fringes bridge them), then regrown."""
    a = a.copy(); a[a[:, :, 3] < 40] = 0; keep = np.zeros(a.shape[:2], bool); h, w = a.shape[:2]
    parts = components(a[:, :, 3] > 160); big = max(len(p) for p in parts)
    for p in parts:
        edge = p[:, 0].min() < 16 or p[:, 1].min() < 16 or p[:, 0].max() > h - 17 or p[:, 1].max() > w - 17
        thin = min(np.ptp(p[:, 0]), np.ptp(p[:, 1])) < 7
        if len(p) >= min_area and not ((edge or thin) and len(p) < big * .25):
            keep[p[:, 0], p[:, 1]] = True
    for _ in range(3):  # regrow the soft rim (padded, so nothing wraps across the cell)
        k = np.pad(keep, 1); keep = k[1:-1, 1:-1] | k[:-2, 1:-1] | k[2:, 1:-1] | k[1:-1, :-2] | k[1:-1, 2:]
    a[~keep] = 0; return a


def corr_shift(ref, a, rows, r=24):
    """Integer shift aligning a to ref by alpha overlap inside a band of rows (fractions)."""
    y0, y1 = (round(ref.shape[0] * f) for f in rows); m0 = ref[y0:y1, :, 3] > 64; best = (-1e9, 0, 0)
    for dy in range(-r, r + 1, 2):
        for dx in range(-r, r + 1, 2):
            m = np.roll(np.roll(a[:, :, 3] > 64, dy, 0), dx, 1)[y0:y1]; s = (m & m0).sum() - (m ^ m0).sum()
            if s > best[0]:
                best = (s, dy, dx)
    _, dy0, dx0 = best
    for dy in range(dy0 - 1, dy0 + 2):
        for dx in range(dx0 - 1, dx0 + 2):
            m = np.roll(np.roll(a[:, :, 3] > 64, dy, 0), dx, 1)[y0:y1]; s = (m & m0).sum() - (m ^ m0).sum()
            if s > best[0]:
                best = (s, dy, dx)
    return best[1:]


def anchor(a, mode):
    """(x, y) anchor of a frame in source pixels."""
    ys, xs = np.where(a[:, :, 3] > 64); b = ys.max()
    if mode == 'feet':  # centre of the lowest 6% of the figure, on its baseline
        band = ys >= b - (b - ys.min()) * .06; return float(np.median(xs[band])), b
    if mode == 'top':  # hanging objects: centre of the top 8%, at the top
        t = ys.min(); band = ys <= t + (b - t) * .08; return float(np.median(xs[band])), t
    return (xs.min() + xs.max()) / 2, b


def strip(frames, scale, hang=False, darken=None):
    """Scale registered frames (list of (array, ax, ay) in source px) into equal display cells."""
    ims = []
    for a, ax, ay in frames:
        im = Image.fromarray(a).resize((round(a.shape[1] * scale), round(a.shape[0] * scale)), Image.Resampling.LANCZOS)
        b = np.array(im); rgb = b[:, :, :3] * (TINT if darken is None else darken); b[:, :, :3] = np.clip(rgb, 0, 255).astype('uint8')
        b[b[:, :, 3] < 40] = 0; ims.append((Image.fromarray(b), ax * scale, ay * scale))
    # Cell extents around the anchor, even-sized so logical draw sizes are whole pixels.
    left = max(ax - im.getbbox()[0] for im, ax, ay in ims); right = max(im.getbbox()[2] - ax for im, ax, ay in ims)
    up = max(ay - im.getbbox()[1] for im, ax, ay in ims); down = max(im.getbbox()[3] - ay for im, ax, ay in ims)
    half = int(np.ceil(max(left, right))) + 2; cw = half * 2 + (half * 2) % 2
    if hang:
        ch = int(np.ceil(down)) + 4; ch += ch % 2; oy = 2
    else:
        ch = int(np.ceil(up)) + 4; ch += ch % 2; oy = ch - 2
    out = Image.new('RGBA', (cw * len(ims), ch))
    for i, (im, ax, ay) in enumerate(ims):
        out.alpha_composite(im, (round(i * cw + cw / 2 - ax), round(oy - ay)))
    return out, cw, ch


def register(cells, mode, rows=None, ref=0, ground=False):
    """Align cells to cells[ref]: by correlation in a band of rows, else by anchors.
    ground: keep the correlated x but stand each frame on its own sole line (walks)."""
    cells = [clean(c) for c in cells]; h = min(c.shape[0] for c in cells); w = min(c.shape[1] for c in cells)
    cells = [np.pad(c[:h, :w], ((32, 32), (32, 32), (0, 0))) for c in cells]; out = []  # room to shift without wrapping
    rax, ray = anchor(cells[ref], 'box' if rows and mode == 'feet' else mode)
    for c in cells:
        if rows:
            dy, dx = corr_shift(cells[ref], c, rows); c = np.roll(np.roll(c, dy, 0), dx, 1); out.append((c, rax, anchor(c, 'feet')[1] if ground else ray))
        else:
            ax, ay = anchor(c, mode); out.append((c, ax, ay))
    return out


def save(name, frames, scale, bright=1, **kw):
    if bright != 1:
        kw['darken'] = TINT * bright
    im, cw, ch = strip(frames, scale, **kw)
    if name in BLEND:
        im = blend(name, im)
    im.save(OUT / f'st_{name}.png'); print(f'st_{name}', len(frames), cw, ch)


def firm_edge(a):
    """Old station_life.png frames were keyed off white: shave the light 1px fringe and
    firm the new rim slightly darker, like the thin outlines of the rest of the cast."""
    a = a.copy(); solid = a[:, :, 3] > 0; inner = solid.copy()
    for d in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        inner &= np.roll(solid, d, (0, 1))
    a[solid & ~inner] = 0; solid = inner; inner = solid.copy()
    for d in [(1, 0), (-1, 0), (0, 1), (0, -1)]:
        inner &= np.roll(solid, d, (0, 1))
    rim = solid & ~inner; a[rim, :3] = (a[rim, :3] * .78).astype('uint8'); return a


def agrid(name, cols, rows):
    """A true-alpha GPT grid (no key colour): binary alpha, rim repainted, split into cells."""
    a = np.array(cut_alpha(Image.open(SRC / f'{name}.png'))); h, w = a.shape[:2]
    return [a[round(r * h / rows):round((r + 1) * h / rows), round(c * w / cols):round((c + 1) * w / cols)] for r in range(rows) for c in range(cols)]


def settle(cells, rows, ref=0, ground=False):
    """Register idle/extra cells on their planted part: feet anchors first (GPT cells drift more
    than corr_shift searches), then alpha correlation in the band of rows. Returns (a, ax, ay);
    ground: each frame stands on its own sole line (poses that bend the knees or lift a foot)."""
    cells = [clean(c) for c in cells]; h = min(c.shape[0] for c in cells); w = min(c.shape[1] for c in cells)
    cells = [np.pad(c[:h, :w], ((64, 64), (64, 64), (0, 0))) for c in cells]
    rax, ray = anchor(cells[ref], 'feet'); out = []
    for c in cells:
        ax, ay = anchor(c, 'feet'); c = np.roll(np.roll(c, round(ray - ay), 0), round(rax - ax), 1)
        dy, dx = corr_shift(cells[ref], c, rows, r=8); c = np.roll(np.roll(c, dy, 0), dx, 1)
        out.append((c, rax, anchor(c, 'feet')[1] if ground else ray))
    return out


def match_tone(a, ref, keep=None):
    """Second-generation poses joining an existing routine: match their luminance mean/spread and
    chroma to the routine's pixels (ref), so the strip reads as one sheet before it is graded.
    keep: pixels left untouched (lit lamp flames)."""
    L = np.array([.3, .59, .11])
    def stats(x):
        px = x[x[:, :, 3] > 64, :3].astype(float); l = px @ L
        return l.mean(), l.std(), np.abs(px - l[:, None]).mean(0) + 1e-3, (px - l[:, None]).mean(0)
    m1, s1, c1, h1 = stats(ref); m2, s2, c2, h2 = stats(a)
    a = a.copy(); rgb = a[:, :, :3].astype(float); l = rgb @ L
    new = (np.clip(m1 + (l - m2) * s1 / s2, 0, 255)[..., None] + (rgb - l[..., None] - h2) * (c1 / c2) + h1).clip(0, 255)
    if keep is not None:
        new[keep] = rgb[keep]
    a[:, :, :3] = new.astype(np.uint8); return a


def height(a):
    ys = np.where(a[:, :, 3] > 64)[0]; return ys.max() - ys.min() + 1


# Background integration (tools/production/backdrop_tone.py): the runtime plate each extra stands
# in front of, the logical plate box around it (x0, y0, x1, y1) whose lamp-lit colour it takes, and
# its backdrop() settings. level restores each sheet to the value range of the lit plate around it
# (GPT sources come in brighter than the station); the soft outline, lamp cast and a slight ease of
# micro-contrast do the blending, so faces and costume colours stay readable.
BLEND = {
    'queue_man': ('hall', (600, 100, 690, 215), dict(level=.8)),
    'queue_woman': ('hall', (690, 100, 780, 215), dict(level=.8)),
    'worker': ('hall', (340, 90, 420, 205), dict(level=.62)),
    'family': ('platform', (150, 110, 270, 205), dict(level=.68)),
    'sleeper': ('platform', (460, 140, 580, 205), dict(level=.92, contrast=.85)),
    'porter': ('platform', (75, 100, 940, 205), dict(level=.92)),
    'guard': ('platform', (320, 90, 400, 205), dict(level=.6)),
    'reader': ('ac', (355, 110, 415, 195), dict(level=.62, cast=.15)),
}


def blend(name, im):
    plate, (x0, y0, x1, y1), kw = BLEND[name]
    return backdrop(edges(im), plate_light(OUT / f'{plate}.png', (x0 * 2, y0 * 2, x1 * 2, y1 * 2))[0], **kw)


def idle(name, src, cols, rows, target, band, order=None):
    """A GPT idle sheet on true alpha, registered on its planted part and scaled so frame 0
    stands `target` display px tall, graded into its plate."""
    cells = agrid(src, cols, rows)
    if order:
        cells = [cells[i] for i in order]
    fr = settle(cells, band); scale = target / height(fr[0][0])
    im, cw, ch = strip(fr, scale, darken=np.ones(3))
    blend(name, im).save(OUT / f'st_{name}.png'); print(f'st_{name}', len(fr), cw, ch)


def routine(name, row, extra, rows=(.74, .98)):
    """A 12-frame GPT routine scaled to the legacy actor's height and feet, followed by extra poses
    (startled, lantern wave...) from a second GPT sheet, matched to the routine's frame 0 height via
    the extra sheet's neutral pose, all in the legacy 200px display cells, then graded as a strip.
    extra: (source, cols, rows, neutral cell, [cells appended as frames 12...])."""
    old = np.array(Image.open(OUT / 'station_life.png').convert('RGBA'))[row * 200:(row + 1) * 200]
    ys = np.where(old[:, :200, 3] > 64)[0]; scale = (ys.max() - ys.min() + 1)
    cells = grid(name, 4, 3)
    for c in cells:  # no magenta in these costumes: neutralise any tint left inside (watch chain)
        rgb = c[:, :, :3].astype(int); spill = np.clip(np.minimum(rgb[:, :, 0], rgb[:, :, 2]) - rgb[:, :, 1], 0, None)
        rgb[:, :, 0] -= spill; rgb[:, :, 2] -= spill; c[:, :, :3] = rgb.clip(0, 255)
    cells = register(cells, 'feet', rows=rows, ground=True)
    ys = np.where(cells[0][0][:, :, 3] > 64)[0]; scale /= ys.max() - ys.min() + 1
    xs = np.where(old[:, :200, 3] > 64)[1]; ox = float(np.median(xs[np.where(old[:, :200, 3] > 64)[0] >= 186]))
    src, ecols, erows, neutral, picks = extra
    ex = agrid(src, ecols, erows); ex = settle([ex[neutral]] + [ex[i] for i in picks], (.88, .99), ground=True)
    escale = scale * height(cells[0][0]) / height(ex[0][0])
    out = Image.new('RGBA', (200 * (12 + len(picks)), 200))
    for i, (a, ax, ay, k) in enumerate([(*c, scale) for c in cells] + [(*c, escale) for c in ex[1:]]):
        im = Image.fromarray(a).resize((round(a.shape[1] * k), round(a.shape[0] * k)), Image.Resampling.LANCZOS)
        b = np.array(im); b[b[:, :, 3] < 40] = 0
        out.alpha_composite(Image.fromarray(b), (round(i * 200 + ox - ax * k), round(194 - ay * k)))
    o = np.array(out); o[:, 2400:] = match_tone(o[:, 2400:], o[:, :2400]); out = blend(name, Image.fromarray(o))
    out.save(OUT / f'st_{name}.png'); print(f'st_{name}', 12 + len(picks), round(scale, 3), round(escale, 3))


def reader():
    """Seated reader in the AC coach (js/train_life.js row 2): 8 GPT idle poses and 4 startled
    poses (a second sheet, sized on its paper-up peek against idle frame 0 and toned to the idle
    poses), in the legacy 200px cells on the legacy reader's seat line."""
    old = np.array(Image.open(OUT / 'station_life.png').convert('RGBA'))[400:600]
    o = old[:, :200]; ys, xs = np.where(o[:, :, 3] > 64); b = ys.max(); ox = float(np.median(xs[ys >= b - 6]))
    idle, alert = agrid('reader_idle', 4, 2), agrid('reader_alert', 4, 1)
    r = height(clean(idle[0])) / height(clean(alert[3]))
    alert = [np.array(Image.fromarray(c).resize((round(c.shape[1] * r), round(c.shape[0] * r)), Image.Resampling.LANCZOS)) for c in alert]
    fr = settle(idle + alert, (.85, .99)); k = height(o) / height(fr[0][0])
    out = Image.new('RGBA', (200 * 12, 200))
    for i, (a, ax, ay) in enumerate(fr):
        im = Image.fromarray(a).resize((round(a.shape[1] * k), round(a.shape[0] * k)), Image.Resampling.LANCZOS)
        c = np.array(im); c[c[:, :, 3] < 40] = 0; out.alpha_composite(Image.fromarray(c), (round(i * 200 + ox - ax * k), round(b - ay * k)))
    q = np.array(out); q[:, 1600:] = match_tone(q[:, 1600:], q[:, :1600])
    blend('reader', Image.fromarray(q)).save(OUT / 'st_reader.png'); print('st_reader', 12, round(k, 3))


def people():
    """Background extras. Hall worker and platform guard: 12-frame routines plus startled poses
    (worker 12-14, guard 12-13) and the guard's lantern wave for the arrival (14-17)."""
    routine('worker', 0, ('worker_extra', 4, 2, 3, [0, 1, 2]))
    routine('guard', 1, ('guard_extra', 4, 2, 7, [0, 1, 2, 3, 4, 5]))
    if (SRC / 'reader_idle.png').exists():
        reader()
    # Idle loops (8 poses each, registered on the feet / the family's sack and trunk); frame 0
    # keeps the old extras' display height.
    idle('queue_man', 'queue_man_idle', 4, 2, 156, (.86, .99))
    idle('queue_woman', 'queue_woman_idle', 4, 2, 157, (.86, .99))
    idle('family', 'family_idle', 4, 2, 123, (.72, .99))
    p = grid('people', 4, 3)
    save('sleeper', register(p[4:8], 'feet', rows=(.7, .98)), .44)
    q = grid('porter', 4, 2)
    # Frames 0-5 walk, 6 settles the trunk, 7 wipes his brow; x from the head load, y from the soles.
    save('porter', register(q, 'feet', rows=(.0, .22), ground=True), .41, bright=.9)


def main(parts=('people', 'scenery')):
    if 'people' in parts:
        people()
    if 'scenery' not in parts:
        return
    a = grid('animals', 4, 2)
    save('crow', register(a[4:8], 'feet'), .12)
    hl = grid('hall', 4, 3)
    save('fan', register(hl[8:12], 'top', rows=(.0, .2)), .31, hang=True, bright=.8)
    # Goods train for the far track, as separate vehicles (build_station_freight.py).
    from build_station_freight import main as freight
    freight()
    f = grid('foreground', 4, 1)
    save('fg_column', register([f[0]], 'feet'), .61, darken=np.array([.42, .38, .36]))
    save('fg_lantern', register([f[1]], 'top'), .3, hang=True, darken=np.array([.75, .7, .66]))
    save('fg_pillar', register([f[3]], 'feet'), .61, darken=np.array([.42, .38, .36]))


if __name__ == '__main__':
    import sys
    main(sys.argv[1:] or ('people', 'scenery'))  # e.g. `people` rebuilds only the extras
