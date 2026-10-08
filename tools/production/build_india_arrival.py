#!/usr/bin/env python3
"""Kesarganj airstrip arrival: night plate, night-graded jet, rural approach vista and the redirection throw.

Sources: assets/sources/travel/india/ (true-alpha GPT sheets already hardened by gen.sh / sprite_edges.alpha()).
Sprite cells are authored at 2x (drawn at .5); CHAD stands 178 cell px tall like the gameplay frames.
`build_india_arrival.py chad` rebuilds only the two CHAD sheets and prints SPIN.grip for js/airport.js.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from build_airport import read, save, OUT, ROOT, SRC
from keying import components
from sprite_edges import edges
from chad_palette import lock
import sys; sys.path.insert(0, str(ROOT / 'tools/verification'))
import chad_identity_check as CI

OFFICIAL_H = 166  # standing official, a head shorter and much wider than CHAD


def plate():
    # 3:1 source -> 2x of the 1280-wide scene; the ground line (source y 530) lands on the scene's y 190.
    src = read('india', 'arrival_terminal'); s = 2560 / src.width
    # The apron comes from a registered repaint of the same plate (clean wet asphalt, same joints and reflections),
    # blended in just below the terminal's footing; everything above stays the approved plate.
    tarmac = read('india', 'arrival_terminal_tarmac').resize(src.size, Image.Resampling.LANCZOS)
    mask = Image.new('L', src.size); ImageDraw.Draw(mask).rectangle((0, 536, src.width, src.height), fill=255)
    for i in range(10): ImageDraw.Draw(mask).line((0, 526 + i, src.width, 526 + i), fill=round(255 * (i + 1) / 11))
    src = Image.composite(tarmac, src, mask)
    im = src.resize((2560, round(src.height * s)), Image.Resampling.LANCZOS)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=55, threshold=3))
    top = round(530 * s) - 380
    # The sky above the crop (with the moon) is only seen in the wide landing shot, drawn above the plate.
    save(im.crop((0, 0, 2560, top)), 'india', 'arrival_terminal_sky')
    im = im.crop((0, top, 2560, top + 540)); save(im, 'india', 'arrival_terminal')
    ground = Image.new('RGBA', im.size); ground.paste(im.crop((0, 380, 2560, 540)), (0, 380)); save(ground, 'india', 'arrival_terminal_ground')


def _edge(s, dy, dx, k):
    """1 on the silhouette edge that faces (dy, dx), fading to 0 over k px inward."""
    h, w = s.shape; out = np.zeros((h, w))
    for i in range(1, k + 1):
        sh = np.zeros_like(s)
        sh[max(-dy * i, 0):h + min(-dy * i, 0), max(-dx * i, 0):w + min(-dx * i, 0)] = s[max(dy * i, 0):h + min(dy * i, 0), max(dx * i, 0):w + min(dx * i, 0)]
        out = np.maximum(out, (s & ~sh) * (1 - (i - 1) / k))
    return out


def _sodium(a, s):
    """Midnight grade shared by every view of CHAD's white-and-gold jet (the sunset art the player boarded): the
    sunset cast is taken out, the white paint becomes a moonlit pale cool grey (about 65% of its day luminance, still
    the lightest thing on the apron), the black stripe stays dark and the gold trim keeps a gold hue, a little darker.
    On top: a warm sodium rim from the terminal lamps (right and top) and a warm bounce under the belly from the wet,
    lamp-lit tarmac. `s` is the union silhouette the light maps come from."""
    right = np.maximum(_edge(s, 0, 1, 7), _edge(s, -1, 1, 5) * .8); top = _edge(s, -1, 0, 5); bottom = _edge(s, 1, 0, 9)
    x = np.linspace(0, 1, s.shape[1])[None, :]; sodium = np.array([1., .6, .26])
    a = a.astype(float); rgb = a[:, :, :3] / 255; lum = rgb @ np.array([.3, .59, .11])
    mx, mn = rgb.max(2), rgb.min(2); sat = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    hue = np.degrees(np.arctan2(np.sqrt(3) * (rgb[..., 1] - rgb[..., 2]), 2 * rgb[..., 0] - rgb[..., 1] - rgb[..., 2])) % 360
    ramp = lambda v, lo, hi: np.clip((v - lo) / (hi - lo), 0, 1)
    # Gold: saturated warm pixels (trim, engine rings, window rims); the sunset-tinted white paint is far less saturated.
    gold = ramp(sat, .5, .66) * ((hue < 60) | (hue > 340)) * ramp(mx, .22, .38)
    paint = np.array([.86, .9, 1.]) * (.68 * lum ** 1.05)[..., None]           # moonlit, neutral-cool
    metal = np.array([1., .77, .36]) * (.8 * mx ** 1.1)[..., None]              # gold hue, modestly darker
    base = paint * (1 - gold[..., None]) + metal * gold[..., None]
    rim = (right * (.25 + .75 * x ** 1.3) + top * .35 * (.3 + .7 * x))[..., None] * np.clip(lum * 1.6, 0, 1)[..., None]
    bounce = (bottom * .45)[..., None] * (.4 + .6 * lum[..., None])
    field = (np.clip((lum - .45) / .55, 0, 1) ** 1.4 * (.03 + .12 * x ** 1.6))[..., None]
    a[:, :, :3] = np.clip(base + sodium * (rim * 1.1 + bounce * .6 + field), 0, 1) * 255
    return a.round().astype(np.uint8)


def night_jet():
    # The approved sunset jet, relit for midnight: dark moonlit body, a warm sodium rim along the top and nose (the
    # terminal lamps are to the right) and a warm bounce under the belly from the wet, lamp-lit tarmac. The light maps
    # come from the union of body and gear so the layers stay seamless.
    raw = {n: np.array(Image.open(OUT / 'airport' / f'departure_jet_{n}.png').convert('RGBA')) for n in ('body', 'open', 'gear')}
    s = (raw['body'][:, :, 3] >= 128) | (raw['gear'][:, :, 3] >= 128)
    for name, a in raw.items():
        save(Image.fromarray(_sodium(a, s)), 'india', f'arrival_jet_{name}')
    # The approach shot's rear view of the same jet gets the same grade, so the two shots match.
    rear = np.array(Image.open(OUT / 'airport' / 'jet_rear.png').convert('RGBA'))
    save(Image.fromarray(_sodium(rear, rear[:, :, 3] >= 128)), 'india', 'arrival_jet_rear')
    # Approach shot: the rear view of the same jet and the dust clouds, moonlit.
    for src, dst, warmth in (('cloud_dust', 'cloud_night', 0),):
        a = np.array(Image.open(OUT / 'airport' / f'{src}.png').convert('RGBA')).astype(float); rgb = a[:, :, :3] / 255
        lum = rgb @ np.array([.3, .59, .11])
        out = np.array([.36, .36, .6]) * lum[..., None] ** 1.2 + rgb * .1 + np.array([1., .62, .3]) * np.clip((lum - .6) / .4, 0, 1)[..., None] * warmth
        a[:, :, :3] = np.clip(out, 0, 1) * 255
        if warmth: save(Image.fromarray(a.round().astype(np.uint8)), 'india', dst); continue
        # Soft cloud bank: translucent, feathered to nothing at the (cropped) bottom and thinning at the top.
        y = np.linspace(0, 1, a.shape[0])[:, None]
        a[:, :, 3] *= .7 * np.clip((1 - y) / .45, 0, 1) ** 1.5 * np.clip(y / .12, 0, 1)
        Image.fromarray(a.round().astype(np.uint8)).save(OUT / 'india' / f'{dst}.png', optimize=True)


def vista():
    im = read('india', 'approach_vista').resize((1280, 720), Image.Resampling.LANCZOS); save(im, 'india', 'approach_vista')
    # Near layer: the dark foreground canopy and huts, cut along their skyline so it can slide faster.
    ridge = [(0, 438), (70, 430), (150, 440), (215, 452), (262, 432), (318, 452), (350, 505), (420, 512), (470, 530), (540, 520),
             (600, 532), (660, 522), (720, 540), (800, 556), (860, 575), (930, 560), (990, 552), (1060, 556), (1120, 542), (1190, 548), (1280, 536)]
    mask = Image.new('L', im.size); ImageDraw.Draw(mask).polygon(ridge + [(1280, 720), (0, 720)], fill=255)
    near = im.copy(); near.putalpha(mask); save(near, 'india', 'approach_vista_near')


def figures(name, centres):
    """Split a sheet into frames: every component goes to the nearest expected frame centre (x)."""
    src = np.array(read('india', name)); s = src[:, :, 3] >= 128; frames = [np.zeros_like(src) for _ in centres]
    for part in components(s):
        if len(part) < 40: continue
        cx = part[:, 1].mean(); i = int(np.argmin([abs(cx - c) for c in centres]))
        frames[i][part[:, 0], part[:, 1]] = src[part[:, 0], part[:, 1]]
    out = []
    for f in frames:
        im = Image.fromarray(f); out.append(im.crop(im.getbbox()))
    return out


def boots(im, band=26):
    """Column runs of the lowest `band` rows: [(x0, x1), ...] left to right."""
    a = np.array(im)[:, :, 3] >= 128; b = a[-band:].any(0); runs = []; s = None
    for x, v in enumerate(list(b) + [False]):
        if v and s is None: s = x
        if not v and s is not None:
            if x - s > 6: runs.append((s, x))
            s = None
    return runs


def atlas(frames, cell, anchors, scale, key, bottom=None):
    """Scale frames, put each anchor (source px, relative to the cropped frame) at cell (ax, ay), then edges()."""
    cw, ch = cell['size']; ax, ay = cell['anchor']; sheet = Image.new('RGBA', (cw * len(frames), ch))
    for i, (f, (x, y)) in enumerate(zip(frames, anchors)):
        im = f.resize((round(f.width * scale), round(f.height * scale)), Image.Resampling.LANCZOS)
        px, py = round(ax - x * scale), round(ay - y * scale)
        assert px >= 0 and py >= 0 and px + im.width <= cw and py + im.height <= ch, (key, i, px, py, im.size, cell)
        c = Image.new('RGBA', (cw, ch)); c.alpha_composite(im, (px, py))
        # Binary silhouette first: Lanczos ringing below alpha 128 would otherwise become a detached outer ring.
        c.putalpha(c.getchannel('A').point(lambda v: 255 if v >= 128 else 0)); sheet.alpha_composite(edges(c), (i * cw, 0))
    save(sheet, 'india', key)


def grip(im, key, reach=22):
    """Centroid of the silhouette pixels within `reach` px of its extreme along key(y, x) (a fist, an open hand)."""
    a = np.array(im)[:, :, 3] >= 128; ys, xs = np.nonzero(a); v = key(ys.astype(float), xs.astype(float))
    m = v >= v.max() - reach
    return xs[m].mean(), ys[m].mean()


def centroid(im):
    ys, xs = np.nonzero(np.array(im)[:, :, 3] >= 128); return xs.mean(), ys.mean()


# CHAD's throw (chad_redirect, 320x256 cells, feet at 160,248) and follow-through (chad_redirect_after, 224x256, feet at
# 104,248) are GPT Image redraws of each approved pose from the gold refs (chad_style.md): sources/travel/india/<key>/NN.png,
# one hardened-alpha generation per cell. Cells whose hair is the top of the figure are scaled by crown (hair top to sole,
# the approved cell's crown kept within 172-178); cells with a fist over the head by leg length (jeans top to sole, as in
# the approved cell) times the sheet's median crown/leg ratio, so CHAD is one size throughout. Then feet registration,
# binary alpha, edges() and chad_palette.lock() (gold 48 colours, coloured sel-out).
CHAD_CELLS = {
    'chad_redirect': dict(size=(320, 256), anchor=(160, 248), crown={0: 176, 1: 177, 2: 172, 3: 173, 4: 172, 11: 172, 12: 178, 14: 172},
                          legs=[105, 108, 100, 105, 100, 107, 99, 106, 103, 106, 105, 98, 107, 104, 100, 105, 105]),
    'chad_redirect_after': dict(size=(224, 256), anchor=(104, 248), crown={0: 172, 1: 172, 2: 172, 3: 178, 4: 178, 5: 177},
                                legs=[101, 104, 104, 104, 107, 104]),
}


def _chad_figure(path):
    """The generated figure: its largest opaque region plus the detached bits (fingers, chain) inside its box, cropped."""
    a = np.array(Image.open(path).convert('RGBA')); s = a[..., 3] >= 128; parts = [p for p in components(s) if len(p) >= 200]
    main = max(parts, key=len); y0, x0 = main.min(0) - 40; y1, x1 = main.max(0) + 40; keep = np.zeros(s.shape, bool)
    for p in parts:
        if ((p[:, 0] >= y0) & (p[:, 0] <= y1) & (p[:, 1] >= x0) & (p[:, 1] <= x1)).all(): keep[p[:, 0], p[:, 1]] = True
    a[~keep] = 0; im = Image.fromarray(a); return im.crop(im.getbbox())


def _legs(im):
    """Jeans top to sole, in the image's px."""
    a = np.array(im); m = a[..., 3] >= 128; L, C, h = CI.lch(CI.lab(a[..., :3]))
    j = m & (h >= 235) & (h < 310) & (C >= 12) & (L >= 3); rows = np.nonzero(j.sum(1) >= max(3, a.shape[1] // 40))[0]
    return np.nonzero(m.any(1))[0].max() + 1 - rows.min()


# GPT draws CHAD's hips, legs and head about a tenth wider than the gold sprites even when told not to; the downscale
# takes that out (gold bulk, figure area / crown^2, is .21; unsqueezed regens read .26-.30 on the upright cells).
CHAD_SQUEEZE = .9


def _chad_cell(f, k, size, anchor):
    im = f.resize((round(f.width * k * CHAD_SQUEEZE), round(f.height * k)), Image.Resampling.LANCZOS); b = boots(im); fx = (b[0][0] + b[-1][1]) / 2
    c = Image.new('RGBA', size); c.paste(im, (round(anchor[0] - fx), anchor[1] - im.height), im)
    c.putalpha(c.getchannel('A').point(lambda v: 255 if v >= 128 else 0)); return c


def chad_sheet(key, srcs=None, write=True):
    """Build a CHAD sheet from its per-cell generations (`srcs` overrides the source paths, e.g. to try candidates)."""
    spec = CHAD_CELLS[key]; size, anchor = spec['size'], spec['anchor']; cw, ch = size
    srcs = srcs or [SRC / 'india' / key / f'{i:02d}.png' for i in range(len(spec['legs']))]
    figs = [_chad_figure(p) for p in srcs]
    k = {}
    for i, target in spec['crown'].items():
        k[i] = spec['legs'][i] / _legs(figs[i])
        for _ in range(3):
            k[i] *= target / CI.measure(np.array(_chad_cell(figs[i], k[i], size, anchor)))['crown']
    ratio = float(np.median([k[i] * _legs(figs[i]) / spec['legs'][i] for i in spec['crown']]))
    sheet = Image.new('RGBA', (cw * len(figs), ch)); cells = []
    for i, f in enumerate(figs):
        c = lock(edges(_chad_cell(f, k.get(i, ratio * spec['legs'][i] / _legs(f)), size, anchor)))
        sheet.alpha_composite(c, (i * cw, 0)); cells.append(c)
    if write: save(sheet, 'india', key)
    return cells


def chad():
    """Both CHAD sheets; returns his grip point per spin cell (cell px) for SPIN.grip in js/airport.js."""
    cells = chad_sheet('chad_redirect')
    # Ready (no grip yet), catch and A (reaching fist), turn and B (fist up-front), then the fist overhead, snap open.
    x, xy, up, ul = (lambda y, x: x), (lambda y, x: x - y), (lambda y, x: -y), (lambda y, x: -x - y)
    keys = [x, x, x, xy, xy, up, up, up, up, ul, ul, lambda y, x: .5 * x - y, x, up, xy, lambda y, x: .25 * x - y, up]
    # Follow-through, on the same feet centre: watch, dust off (two brushes), settle, light up, puff.
    chad_sheet('chad_redirect_after')
    return [[round(gx), round(gy)] for c, k in zip(cells, keys) for gx, gy in [grip(c, k, 8)]]


def redirection():
    """The Change of Scenery. CHAD pivots in place on planted boots (chad_redirect); the official is a separate layer
    (official_held) registered on his caught fist, so the renderer can lock that fist into CHAD's grip every tick
    and turn the body continuously around it. Prints the grip points and body angles that js/airport.js uses."""
    out = {'chad': chad()}
    # Official: wait / halt / fee / demand (base sheet), then fury / lunge / lunge-full (lunge sheet, idle dropped).
    # Each sheet is scaled by its own standing pose. Standing frames anchor on the feet centre; lunge frames keep
    # the rear shoe where the standing rear shoe was, so the reach travels forward from his post.
    lunge = figures('official_lunge', [196, 640, 1150, 1824]); k = OFFICIAL_H / lunge[0].height
    lunge = [f.resize((round(f.width * k), round(f.height * k)), Image.Resampling.LANCZOS) for f in lunge]
    base = figures('official', [220, 820, 1340, 1920]); kb = OFFICIAL_H / base[0].height
    base = [f.resize((round(f.width * kb), round(f.height * kb)), Image.Resampling.LANCZOS) for f in base]
    anchors, rear = [], []
    for f in base:
        b = boots(f, 12); c = (b[0][0] + b[-1][1]) / 2; anchors.append((c, f.height)); rear.append(c - b[0][0])
    for f in lunge[1:]:
        anchors.append((boots(f, 12)[0][0] + sum(rear) / len(rear), f.height))
    atlas(base + lunge[1:], {'size': (320, 224), 'anchor': (96, 216)}, anchors, 1, 'official')
    full = lunge[3]; gx, gy = grip(full, lambda y, x: x); ax, ay = anchors[-1]; cx, cy = centroid(full)
    out['lunge_grip'] = [round(gx - ax + 96), round(gy - ay + 216)]
    out['lunge_angle'] = round(float(np.degrees(np.arctan2(-(cy - gy), -(cx - gx)))), 1)  # flipped in the scene
    # Held and swung: every frame registered on the caught fist at the cell centre. The straight-legged vertical
    # pose (legs up, arm below the head) is about 1.3x his standing height from shoe to fist.
    held = figures('official_held', [240, 646, 987, 1254, 1629, 2010]); kh = OFFICIAL_H * 1.3 / held[2].height
    fists = [lambda y, x: -x, lambda y, x: y - x, lambda y, x: y, lambda y, x: y, lambda y, x: x, None]
    pts, angles = [], []
    for f, key in zip(held, fists):
        c = centroid(f); g = grip(f, key) if key else c; pts.append(g)
        angles.append(round(float(np.degrees(np.arctan2(-(c[1] - g[1]), c[0] - g[0]))), 1) if key else 0)
    atlas(held, {'size': (448, 448), 'anchor': (224, 224)}, pts, kh, 'official_held')
    out['held_angle'] = angles
    out['held_com'] = [[round((c[0] - g[0]) * kh), round((c[1] - g[1]) * kh)] for f, g in zip(held, pts) for c in [centroid(f)]]
    tumble = figures('official_tumble', [190, 500, 830, 1300, 1600, 1960])
    atlas(tumble, {'size': (192, 192), 'anchor': (96, 96)}, [(f.width / 2, f.height / 2) for f in tumble], k * .95, 'official_tumble')
    print(out)


if __name__ == '__main__':
    if sys.argv[1:] == ['chad']: print({'chad': chad()})  # CHAD sheets only
    else: plate(); night_jet(); vista(); redirection()
