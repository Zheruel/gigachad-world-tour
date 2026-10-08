"""Register the kitchen vendor, Ghee Pappu (dirty_delhi/vendor_kitchen sources), and his arena props.

Character sheets live in vendor_kitchen/pappu/: true-alpha GPT Image edits of the original magenta
sheets (same names and cell layout) repainted in CHAD's arcade rendering (cel shading, deep skin
shadows, closed dark outline), plus the phase-3 twins and new poses:
  base, walk, attacks, power, react, intro, finish 4x4; stir, work 4x2; tween, moves3 2x2;
  settle, step, situp, rise 2x1; idle3 4x1 and walk3 4x2 (the last order's panting idle and walk, edits of
  the restyled base/walk); moves3: last-order roar, skimmer palm slap, tug the buried skimmer out,
  press-up off the chained belly flop; counter (flat on his back, head left) and dunked (finisher 1
  without the skimmer) single poses; grab (finisher 0: yanked off balance by the vest, skimmer flailing
  behind him); lick 4x1 (the licking taunt: raise, lick, savour, smack and beckon); bump 3x1 (belly bump: lean back, thrust, rock back). The post-dunk burns in finish, situp
  and counter are soot smears and scalds on the face, chest and vest front (no spotted skin).
Poses are cut by component centroid and registered on a 448x300 canvas (2x): pelvis (lower-body
centroid) at x=224, soles (lowest opaque row) at y=292, so every pose stands on the same line.
Alpha is hardened at the source (sprite_edges.alpha), poses are box-downscaled and every registered
frame gets sprite_edges.edges() for a clean closed outline. Scale comes from the base idle (STAND),
trimmed per sheet (MATCH) and per cell (CELL_K) after review at gameplay scale; NUDGE moves a pose.

props.png 4x2: kadai, kadai on fire, kadai spilled, (cells 3-6 unused), and a 2x2 of naan /
spinning naan / chilli bottle / pakora. Each prop becomes a strip of equal cells, feet on the
strip's bottom row, at one uniform scale.

fx.png 4x2: four frames of the fire breath (mouth at the left), two of a
burning glob (unused), the oil splash and the skimmer's crater; oil.png 4x1: the flying glob
of hot oil. Each row keeps its cells' own registration and is sized to the game's reach.

boss_rebuild/vendor_props.png 4x2 (drawn facing left) becomes finishers/vendor_props.png, 128px
cells: the finisher's dented pot is cell 7. skimmer.png / skimmer_long.png (loose skimmer props)
and tawa_patch.png are kept as built from the earlier sheets.
"""
from pathlib import Path
import fcntl
import json
import numpy as np
from PIL import Image, ImageFilter
from keying import key, components
from build_station_life import despill
from sprite_edges import alpha as true_alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/vendor_kitchen'
PAPPU = SRC / 'pappu'  # the character sheets (true alpha)
OUT = ROOT / 'assets/frames/ic_vendor'
STAGE = ROOT / 'assets/stages/dirty_delhi/vendor'
STAND = 204  # idle stance crown-to-sole height at 2x: CHAD is 178; Pappu stands a little over him, twice as wide
SIZE, SOLE, CENTRE = (448, 300), 292, 224
PROP_K = .5

SHEETS = dict.fromkeys(('base', 'walk', 'attacks', 'power', 'react', 'intro', 'finish'), (4, 4))
SHEETS['stir'] = (4, 2)  # the intro's frying loop at the kadai
SHEETS['work'] = (4, 2)  # working the kadai before the fling
SHEETS['tween'] = (2, 2)  # intro inbetweens: rise from the fry, 3/4 turn, recover from the spit, plant the skimmer
SHEETS['settle'] = (2, 1)  # intro end: lower the skimmer, settle into the fighting idle
SHEETS['step'] = (2, 1)  # intro: stepping in between the settle cells (cell 0 used)
SHEETS['situp'] = (2, 1)  # finisher: propped on an elbow, then half up, between lying (7) and slumped (8)
SHEETS['idle3'] = (4, 1)  # the last order: panting idle (edit of the restyled base idles)
SHEETS['walk3'] = (4, 2)  # the last order: panting walk (edit of the restyled walk)
SHEETS['moves3'] = (2, 2)  # last-order roar, skimmer palm slap, tug the buried skimmer, press-up off a chained flop
SHEETS['counter'] = (1, 1)  # finisher: flat on his back on the counter, head left (toward the kadai once mirrored)
SHEETS['dunked'] = (1, 1)  # finisher 1 without the skimmer (he lets go of it going into the oil)
SHEETS['grab'] = (1, 1)  # finisher 0: hauled forward by the vest, off balance, skimmer flailing behind
SHEETS['bump'] = (3, 1)  # belly bump: lean back, thrust the belly, rock back
SHEETS['rise'] = (2, 1)  # finisher 20-21: blackened, sitting up with a hand to his head, then up on one knee on the skimmer
SHEETS['sooty'] = (2, 1)  # finisher 3-4: the dazed stagger (finish 3, 4) with the dunk's scorch and soot kept on face and scalp
SHEETS['lick'] = (4, 1)  # the licking taunt: raise the skimmer, lick it, savour it, smack his lips and beckon
SHEETS['haul'] = (2, 1)  # finisher 22-23: yanked out of the kadai by the legs, flipping over: tipped 45 degrees, then flat on his back
STATES = {
    'idle': [('base', i) for i in range(4)],
    'walk': [('walk', i) for i in range(8)],
    'hurt': [('base', 10), ('base', 11)],
    'stagger_polish': [('base', 10), ('base', 12), ('base', 13), ('base', 12)],
    'taunt': [('base', 14)],
    'block': [('base', 15)],
    'lick': [('lick', i) for i in range(4)],  # taunt beat: raise, lick, savour, smack lips and beckon (the old single taunt pose is the peak)
    'string': [('attacks', i) for i in range(7)],
    'naan': [('attacks', 7), ('attacks', 8)],
    'scoop': [('attacks', 9), ('attacks', 10), ('attacks', 11)],
    'hotfoot': [('attacks', 12), ('attacks', 13)],
    'blind': [('attacks', 14), ('attacks', 15)],
    'rage': [('power', i) for i in (6, 7, 8, 9)],
    'breath': [('power', i) for i in (10, 11, 12)],
    'flop': [('power', i) for i in (13, 14, 15)],
    'fall': [('react', 0)],
    'down': [('react', 1)],
    'getup': [('react', 2), ('react', 3)],
    'flopup': [('react', 4), ('react', 5), ('moves3', 3)],  # 2: the press-up bouncing into a chained flop
    'heavy': [('react', 6)],
    'guardbreak': [('react', 7)],
    'idle3': [('idle3', i) for i in range(4)],
    'walk3': [('walk3', i) for i in range(8)],
    'lastorder': [('moves3', 0), ('moves3', 1)],  # roar, skimmer palm slap
    'tug': [('moves3', 2)],
    'bump': [('bump', i) for i in range(3)],  # ripping the buried skimmer back out of the street
    'intro': [('intro', i) for i in range(12)] + [('tween', i) for i in range(4)] + [('settle', 0), ('settle', 1), ('step', 0)],  # 12-18: inbetweens (18 steps between 16 and 17)
    'fry': [('stir', i) for i in range(8)],  # dip, stir, stir, lift, shake, tip, lower, wipe
    'dip': [('work', i) for i in range(6)],  # plunge, drag, drag back, heave, dig, haul up the heap
    'turn': [('work', 6)],  # turning with the dripping skimmer, into the fling
    # 12-13: hauling out over the kadai rim, hopping down; 14-15: sitting up; 16-17: 6 and 7 again (kept so
    # the indices after them hold); 18: 1 without the skimmer, once it's dropped in the oil; 19: flat on the counter;
    # 20-21: pushing up off the street after the hop down (blackened get-up); 22-23: flipped over as he is hauled out
    'finisher': [('grab', 0)] + [('sooty', i - 3) if i in (3, 4) else ('finish', i) for i in range(1, 14)] + [('situp', 0), ('situp', 1), ('finish', 6), ('finish', 7), ('dunked', 0), ('counter', 0), ('rise', 0), ('rise', 1), ('haul', 0), ('haul', 1)],
}
MATCH = {'walk': .92, 'attacks': 1.05, 'finish': .98, 'idle3': .5, 'walk3': .7, 'moves3': .54, 'dunked': .205, 'counter': .26, 'stir': .855, 'work': .855, 'intro': 1.07, 'tween': .636, 'settle': .64, 'step': .515, 'situp': .35, 'grab': .31, 'bump': .52, 'rise': .456, 'sooty': .456, 'haul': .45, 'lick': .51}  # sheet: scale trim against the base idle, after review at gameplay scale
# (sheet, cell): scale trim for single poses drawn off the sheet's scale (head and sandal size
# against idle, at gameplay scale)
CELL_K = {('settle', 0): .95, ('react', 6): 1.05, ('react', 7): 1.05, ('intro', 2): 1.05, ('attacks', 10): 1.1, ('attacks', 11): 1.1, ('moves3', 2): 1.12,
          **{('stir', i): .95 for i in range(4, 8)},
          # The added intro inbetweens were drawn larger than the approved base.
          # Match head, shoulders and sandals, leaving bends and raised arms intact.
          # Crown-to-sole is 199–203px for these upright poses, against the 204px idle.
          **{('tween', i): .9 for i in range(4)}, ('step', 0): .94}
NUDGE = {('step', 0): (-12, 0), ('tween', 0): (10, 0), ('tween', 1): (12, 0), ('tween', 2): (-10, 0), ('tween', 3): (-6, 0), **{('walk3', i): (8, 0) for i in range(8)}}  # (sheet, cell): (dx, dy) in 2x pixels: the inbetweens split the stance change between their neighbours; the
# last order's hunched walk leans its pelvis estimate back: its lungi is set over the panting idle's
ERASE = {}  # (state, frame): stray generated specks, 2x frame box
GAIN = {}  # sheet: RGB gain to match the key light of the other sheets
SPLIT = {'attacks': [(900, 902, 0, 330)]}  # sheet: (y0, y1, x0, x1) source rows cleared where two cells' figures touch
ROW_EDGES = {'react': (420, 800, 1000)}  # sheet: source y where each row after the first starts, when figures overhang the even grid
LOCK_HEAD = {}  # state: (cols, depth) for lock_head, when a loop redraws his face
MIRROR = set()  # (sheet, cell) generated facing left
BODY_ONLY = {('intro', 5), ('finish', 12), ('finish', 13)}
SMOKE = {('finish', 12), ('finish', 13)}  # the spat pakora is drawn by the game


def cells(name):
    cols, rows = SHEETS[name]
    a = np.array(true_alpha(Image.open(PAPPU / f'{name}.png'))); h, w = a.shape[:2]
    for y0, y1, x0, x1 in SPLIT.get(name, ()):
        a[y0:y1, x0:x1] = 0
    groups = {i: [] for i in range(cols * rows)}
    for part in components(a[:, :, 3] > 24):
        if len(part) < 40:
            continue
        cy, cx = part.mean(0)
        row = int(np.searchsorted(ROW_EDGES[name], cy, 'right')) if name in ROW_EDGES else int(cy // (h / rows))
        groups[row * cols + int(cx // (w / cols))].append(part)
    out = {}
    for i, parts in groups.items():
        if not parts:
            continue
        # The body plus sizeable detached pieces near it (naan, steam, a flying towel);
        # thin motion lines and specks are dropped, the game draws its own.
        body = max(parts, key=len); y0, x0 = body.min(0) - 40; y1, x1 = body.max(0) + 40
        keep = np.zeros((h, w), bool)
        for p in parts:
            near = ((p[:, 0] >= y0) & (p[:, 0] <= y1) & (p[:, 1] >= x0) & (p[:, 1] <= x1)).any()
            if p is body or (len(p) >= 400 and near and (name, i) not in BODY_ONLY):
                keep[p[:, 0], p[:, 1]] = True
        c = a.copy(); c[~keep] = 0
        if (name, i) in SMOKE:  # drawn smoke curls off him: the game draws its own
            rgb = c[:, :, :3].astype(int); c[(rgb.max(2) - rgb.min(2) < 26) & (rgb.mean(2) > 110)] = 0
        pose = Image.fromarray(c); pose = pose.crop(pose.getbbox())
        out[i] = pose
    return out


def pelvis_x(im):
    a = np.array(im)[:, :, 3] > 64; ys, xs = np.where(a)
    top, bottom = ys.min(), ys.max(); band = (ys >= top + (bottom - top) * .45) & (ys <= top + (bottom - top) * .7)
    return float(np.median(xs[band]))


def scaled(im, k):
    """Props and fx from the magenta sheets."""
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
    # Re-crisp the colour after the resize so clusters read like CHAD's hand-placed pixels
    # (alpha stays untouched: sharpening it would draw a dark rim).
    rgb = im.convert('RGB').filter(ImageFilter.UnsharpMask(1, 70, 2)); rgb.putalpha(im.getchannel('A')); im = rgb
    a = np.array(im); a[a[:, :, 3] < 40] = 0; a[:, :, 3][a[:, :, 3] > 0] = 255
    return Image.fromarray(degrade(a))


def boxed(im, k):
    """A pose at gameplay scale: box filter (LANCZOS rings a light halo into the outline), then binary alpha."""
    a = np.array(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.BOX))
    a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); a[a[:, :, 3] == 0] = 0
    return Image.fromarray(a)


def deskim(im):
    """The skimmer's perforations come out lilac (the generator's see-through holes, hardened): nothing on Pappu is
    purple, so purplish pixels become the iron's dark warm brown at their own brightness (shading kept)."""
    a = np.array(im).astype(float); r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (a[..., 3] > 0) & (r > g + 10) & (b > g + 10); lum = r * .3 + g * .59 + b * .11
    for k, f in enumerate((.95, .72, .55)):
        a[..., k][m] = lum[m] * f
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def register(im, k, nudge=(0, 0)):
    """Pelvis on x=224, the lowest opaque row (his soles standing: the skimmer never hangs below them;
    whatever he rests on otherwise) on y=292, so every pose stands on the same street line."""
    im = deskim(boxed(im, k)); im = im.crop(im.getbbox()); out = Image.new('RGBA', SIZE)
    out.alpha_composite(im, (round(CENTRE - pelvis_x(im) + nudge[0]), SOLE - im.height + nudge[1]))
    return out


def lock_head(frames, cols=(204, 264), depth=34):
    """Breathing idles share the first idle's face, so the loop never redraws his features: the
    head (crown down to the moustache) is replaced, at the best-matching offset within 3px."""
    ref = np.array(frames[0]); top = int(np.where(ref[:, :, 3] > 64)[0].min()); x0, x1 = cols
    head = ref[top:top + depth, x0:x1]
    for n in range(1, len(frames)):
        a = np.array(frames[n]).astype(int)
        dy, dx = min(((dy, dx) for dy in range(-3, 4) for dx in range(-3, 4)),
                     key=lambda o: np.abs(a[top + o[0]:top + o[0] + depth, x0 + o[1]:x1 + o[1], :3] - head[:, :, :3]).mean())
        a[top + dy:top + dy + depth, x0 + dx:x1 + dx] = head
        frames[n] = Image.fromarray(a.astype(np.uint8))
    return frames


def lock_feet(frames):
    """A loop on the spot: every frame's back heel is set on the first frame's."""
    heel = lambda f: int(np.where(np.array(f)[SOLE - 16:, :, 3] > 64)[1].min())
    x0 = heel(frames[0]); out = []
    for f in frames:
        c = Image.new('RGBA', SIZE); c.alpha_composite(f, (x0 - heel(f), 0)); out.append(c)
    return out








def strip(images, name):
    """Equal cells, each image centred with its bottom on the cell's bottom row."""
    w = max(i.width for i in images) + 4; h = max(i.height for i in images) + 2
    out = Image.new('RGBA', (w * len(images), h))
    for n, i in enumerate(images):
        out.alpha_composite(i, (n * w + (w - i.width) // 2, h - i.height))
    out.save(STAGE / f'{name}.png')
    return [w // 2, h // 2]


def props():
    a = degrade(despill(np.array(key(Image.open(SRC / 'props.png'))))); h, w = a.shape[:2]; cw, ch = w // 4, h // 2
    def cell(i, box=None, solid=False):
        c = a[i // 4 * ch:(i // 4 + 1) * ch, i % 4 * cw:(i % 4 + 1) * cw].copy()
        if box:
            x0, y0, x1, y1 = box; m = np.zeros(c.shape[:2], bool); m[y0:y1, x0:x1] = True; c[~m] = 0
        m = c[:, :, 3] > 24; parts = [p for p in components(m) if len(p) > 60]
        if solid:  # the body alone: generated speed lines key out pink
            r, g, b = (c[:, :, k].astype(int) for k in range(3))
            m &= ~((r > g + 30) & (b > g + 10)); parts = [max(components(m), key=len)]
        keep = np.zeros_like(m)
        for p in parts:
            keep[p[:, 0], p[:, 1]] = True
        c[~keep] = 0; im = Image.fromarray(c)
        return scaled(im.crop(im.getbbox()), PROP_K)
    half = cw // 2
    sizes = {
        'kadai': strip([cell(i) for i in (0, 1, 2)], 'kadai'),
        'items': strip([cell(7, (x, y, x + half, y + half), solid=True) for y in (0, half) for x in (0, half)], 'items'),
    }
    return sizes




def tone_match(im, ref):
    """A generated cell rendered paler than its neighbours: each channel's mean and spread over the
    figure matched to the reference cell's."""
    a = np.array(im).astype(float); r = np.array(ref).astype(float); m, n = a[..., 3] > 64, r[..., 3] > 64
    for k in range(3):
        c = a[..., k]; c[m] = (c[m] - c[m].mean()) / c[m].std() * r[..., k][n].std() + r[..., k][n].mean()
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))




def tawa_patch():
    """tawa_patch.png: bare tawa over the kitchen set's back puri (set cell 0, source px from (180, 270)),
    for the finisher, where that flat puri sits on Pappu's bald crown like a cap. A smooth surface fitted to
    the surrounding iron, a little grain, feathered past the puri's rim; the front puris are left alone."""
    a = np.array(Image.open(ROOT / 'assets/stages/india/cinematics/kitchen_set.png').convert('RGBA'))[270:312, 180:276].astype(float)
    r, g, b, al = (a[..., k] for k in range(4)); Y, X = np.mgrid[:a.shape[0], :a.shape[1]]
    e = ((X - 47.5) / 40) ** 2 + ((Y - 23) / 15) ** 2
    front = np.zeros(e.shape, bool)
    for fx, fy, rx, ry in ((22, 43.5, 34, 11.5), (106, 44.5, 38, 14)):
        front |= ((X - fx) / rx) ** 2 + ((Y - fy) / ry) ** 2 <= 1
    lum = r * .3 + g * .59 + b * .11
    ring = (e > 1.1) & (e < 2.2) & (al > 250) & (lum < 75) & ~((r > 90) & (r > b + 35))
    A = np.c_[X[ring], Y[ring], X[ring] * Y[ring], X[ring] ** 2, Y[ring] ** 2, np.ones(ring.sum())]
    out = np.zeros_like(a); grain = np.random.default_rng(3).normal(0, 2.5, e.shape)
    for k in range(3):
        c = np.linalg.lstsq(A, a[..., k][ring], rcond=None)[0]
        out[..., k] = (c[0] * X + c[1] * Y + c[2] * X * Y + c[3] * X ** 2 + c[4] * Y ** 2 + c[5]) * .9 + grain
    out[..., 3] = np.clip((1.15 - e) / .2, 0, 1) * ((e <= 1.15) & (al > 200) & ~front) * 255
    Image.fromarray(out.clip(0, 255).astype(np.uint8)).save(STAGE / 'tawa_patch.png')












def depink(im):
    """Drop keyed-edge pixels still tinted magenta (fire and smoke have no purple)."""
    a = np.array(im); r, g, b = (a[:, :, k].astype(int) for k in range(3))
    a[(r > g + 25) & (b > g + 25)] = 0
    return Image.fromarray(a)






def degrade(a):
    """Nothing in the kitchen is purple: magenta spill at the key edge goes, and purple-tinted
    smoke and steam become neutral grey of the same brightness."""
    solid = a[:, :, 3] > 0; edge = ~solid
    for _ in range(2):
        edge = edge | np.roll(edge, 1, 0) | np.roll(edge, -1, 0) | np.roll(edge, 1, 1) | np.roll(edge, -1, 1)
    r, g, b = (a[:, :, k].astype(int) for k in range(3))
    purple = solid & (r > g + 18) & (b > g + 18)
    a[purple & edge & (r > g + 45) & (b > g + 45)] = 0
    grey = purple & (a[:, :, 3] > 0); lum = (r * .3 + g * .59 + b * .11).clip(0, 255).astype(np.uint8)
    for k in range(3):
        a[:, :, k][grey] = lum[grey]
    return a


def fx():
    def sheet(name, cols, rows):
        a = degrade(despill(np.array(key(Image.open(SRC / name))))); h, w = a.shape[:2]; cw, ch = w // cols, h // rows
        return [Image.fromarray(a[i // cols * ch:(i // cols + 1) * ch, i % cols * cw:(i % cols + 1) * cw].copy()) for i in range(cols * rows)]
    def row(cells, name, width):
        boxes = [c.getbbox() for c in cells]
        box = (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))
        ims = [depink(scaled(c.crop(box), width / (box[2] - box[0]))) for c in cells]
        out = Image.new('RGBA', (ims[0].width * len(ims), ims[0].height))
        for n, im in enumerate(ims):
            out.alpha_composite(im, (n * ims[0].width, 0))
        out.save(STAGE / f'{name}.png')
        return list(ims[0].size)
    cell, oil = sheet('fx.png', 4, 2), sheet('oil.png', 4, 1)
    return {'breath': row(cell[:4], 'breath', 150), 'glob': row(oil, 'glob', 24),
            'splash': row(cell[6:7], 'splash', 48), 'crater': row(cell[7:8], 'crater', 60)}


def pots():
    a = despill(np.array(key(Image.open(SRC.parent / 'boss_rebuild/vendor_props.png').convert('RGB'))))
    h, w = a.shape[:2]; sheet = Image.new('RGBA', (512, 256))
    for i in range(8):
        c = Image.fromarray(a[i // 4 * h // 2:(i // 4 + 1) * h // 2, i % 4 * w // 4:(i % 4 + 1) * w // 4]).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        c = c.resize((128, 128), Image.Resampling.LANCZOS); q = np.array(c); q[q[:, :, 3] < 60] = 0; q[:, :, 3][q[:, :, 3] > 0] = 255
        sheet.alpha_composite(Image.fromarray(q), (i % 4 * 128, i // 4 * 128))
    sheet.save(ROOT / 'assets/stages/dirty_delhi/finishers/vendor_props.png')


def steel_pot(frame):
    """The steel pot that lands on his head (finisher 9), cut off that frame above its brim (the line where the brim
    sits on his scalp) with its steam curl left behind, so the pot falling in (vendor_finisher.js) is the one he wears."""
    x0, y0 = 186, 126; q = np.array(frame.crop((x0, y0, 252, 178)))
    yy, xx = np.mgrid[0:q.shape[0], 0:q.shape[1]]
    q[yy > (170 - y0) + (xx + x0 - 188) * 8 / 60] = 0  # below the brim: his head
    q[(xx + x0 > 233) & (yy + y0 < 135)] = 0  # the steam curl
    r, g = q[:, :, 0].astype(int), q[:, :, 1].astype(int)
    q[(r > 2.2 * g + 20) & (yy > 36)] = 0  # his red scarf under the brim
    edges(Image.fromarray(q)).save(STAGE.parent / 'finishers/vendor_pot.png')


def main(props_too=False):
    """Pappu's frames and his ic_vendor manifest entry; --props also rebuilds the kitchen props and fx strips."""
    OUT.mkdir(parents=True, exist_ok=True); STAGE.mkdir(parents=True, exist_ok=True)
    poses = {name: cells(name) for name in SHEETS if (PAPPU / f'{name}.png').exists()}
    for sheet, cell in MIRROR:
        poses[sheet][cell] = poses[sheet][cell].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    for sheet, gain in GAIN.items():
        for cell, im in poses[sheet].items():
            q = np.array(im).astype(float); q[:, :, :3] *= gain; poses[sheet][cell] = Image.fromarray(q.clip(0, 255).astype(np.uint8))
    k = STAND / poses['base'][0].height; scales = dict.fromkeys(SHEETS, k)
    for sheet, f in MATCH.items():
        scales[sheet] *= f
    states, built = {}, {}
    for state, refs in STATES.items():
        if any(sheet not in poses for sheet, _ in refs):
            print('missing sheet for', state); continue
        frames = [register(poses[sheet][cell], scales[sheet] * CELL_K.get((sheet, cell), 1), NUDGE.get((sheet, cell), (0, 0))) for sheet, cell in refs]
        if state in LOCK_HEAD:
            frames = lock_head(frames, *LOCK_HEAD[state])
        if state in ('fry', 'dip'):
            frames = lock_feet(frames)
        for (st, n), (x0, y0, x1, y1) in ERASE.items():
            if st == state:
                q = np.array(frames[n]); q[y0:y1, x0:x1] = 0; frames[n] = Image.fromarray(q)
        built[state] = frames
    # Other builders share the manifest, and unrelated local frame edits must survive.
    with (ROOT / 'assets/frames/.manifest.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        for state, frames in built.items():
            files = []
            for n, frame in enumerate(frames):
                f = f'{state}_{n:02}.png'
                edges(frame).save(OUT / f)
                files.append(f'ic_vendor/{f}')
            states[state] = files
        steel_pot(edges(built['finisher'][9]))
        manifest = json.loads((ROOT / 'assets/frames/manifest.json').read_text())
        manifest['ic_vendor'] = {**{k:v for k,v in manifest.get('ic_vendor',{}).items() if k not in STATES}, **states}
        (ROOT / 'assets/frames/manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    info = {'scale': round(k, 3), 'walk': round(float(scales['walk']), 3)}
    if props_too:
        info.update(props=props(), fx=fx()); pots(); tawa_patch()
    print(json.dumps(info))


if __name__ == '__main__':
    import sys
    main('--props' in sys.argv)
