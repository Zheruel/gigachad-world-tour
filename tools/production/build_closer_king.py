#!/usr/bin/env python3
"""Build the redesigned Closer (scam king): slice GPT sheets, register frames, props and arena art.

Sources: assets/sources/production/stages/refund_tower/overhaul/closer_king/{identity,intact,damaged,props,plate}.
  python tools/production/build_closer_king.py sprites [--register]   # ic_closer / ic_closer_damaged frames
  python tools/production/build_closer_king.py arena                  # plate, set states, props, screens
Every sheet is a 4x2 grid read row-major. One body scale per sheet, taken from its upright reference
pose, so crouches never become giant bodies. Attacks keep the rear (planted) heel fixed; walks and
reactions register on the torso. Per-pose corrections live in <variant>/registration.json.
"""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw
from build_delhi_cast_performances import cells
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/closer_king'
REVIEW = ROOT / 'tmp/review/closer-king'
FRAMES = ROOT / 'assets/frames'
SIZE, SOLE, CX = (448, 300), 293, 224
# Upright standing height at 2x (CHAD stands ~178): a head taller than CHAD. WIDE thickens the build
# (a heavy boss mass, like the Delhi vendor). The guard crouch is measured from the identity sheet.
STAND, WIDE = 222, 1.07


def rs(im, k):
    return im.resize((round(im.width * k * WIDE), round(im.height * k)), Image.Resampling.LANCZOS)
# sheet: (reference cell, reference kind, registration mode)
SHEETS = {
    'walk': (2, 'stand', 'torso'), 'boxing': (0, 'guard', 'rear'), 'cross': (6, 'block', 'rear'),
    'phone': (6, 'stand', 'rear'), 'push': (None, 'push', 'palm'), 'deal': (0, 'stand', 'rear'),
    'reactions': (None, 'match', 'torso'), 'intro': (2, 'stand', 'torso'), 'seated': (6, 'stand', 'torso'),
    'phasebreak': (0, 'stand', 'torso'), 'finisher': (None, 'match', 'torso'),
}
REF = lambda sheet, ids: [(sheet, i) for i in ids]
STATES = {
    'idle': REF('boxing', [0, 1]), 'block': REF('cross', [6]),
    'walk': REF('walk', range(8)), 'run': REF('walk', range(8)),
    'boxing': REF('boxing', range(8)), 'cross': REF('cross', range(6)), 'stumble': REF('cross', [7]),
    'atk': REF('boxing', [2, 3, 4]), 'punch': REF('boxing', [2, 3, 4]), 'ram': REF('push', [0, 1, 2]),
    'handset': REF('phone', [0, 1, 2, 3]), 'reload': REF('phone', [4, 5]), 'call': REF('phone', [6, 7]),
    'pushgait': REF('push', range(8)), 'shove': REF('push', [0, 4]),
    'deal': REF('deal', range(8)),
    'hurt': REF('reactions', [0, 1]), 'stagger': REF('reactions', [2, 3]),
    'fall': REF('reactions', [4, 5]), 'down': REF('reactions', [6]), 'dead': REF('reactions', [6]),
    'getup': REF('reactions', [7]) + REF('intro', [0, 1]),
    'taunt': REF('intro', range(2, 8)),
    'seated': REF('seated', range(8)),
    'phasebreak': REF('phasebreak', range(8)),
    'finish': REF('finisher', range(8)),  # damaged only: the finisher's victim performance
}


def height(im):
    a = np.array(im)[..., 3] > 0
    ys = np.where(a.any(1))[0]
    return ys[-1] - ys[0] + 1


def guard_ratio():
    """Guard-stance height / standing height, from the identity sheet (poses 1 and 2)."""
    parts = cells(SOURCE / 'identity/identity.png', 3, 1)
    return height(parts[0]) / height(parts[1])


def rear_heel(im):
    a = np.array(im)[..., 3] > 0
    rows = np.where(a.any(1))[0]
    foot = a[rows[-1] - 10:rows[-1] + 1]
    return float(np.where(foot.any(0))[0].min())


def torso(im):
    a = np.array(im)[..., 3] > 0
    ys, xs = np.where(a)
    band = (ys > im.height * .30) & (ys < im.height * .55)
    return float(np.median(xs[band]))


PALM = 56  # 2x px: the pushing palms' front edge ahead of the frame centre (the safe's rear face)


def palm(im):
    a = np.array(im)[..., 3] > 0
    rows = np.where(a.any(1))[0]; top, h = rows[0], rows[-1] - rows[0]
    band = a[top + int(h * .2):top + int(h * .5)]
    return float(np.where(band.any(0))[0].max()) - PALM


def place(im, scale, x_of, offset=(0, 0), floor=False):
    im = rs(im, scale)
    im = edges(alpha(im))
    x = round(CX - x_of(im)) + offset[0]
    y = SOLE - im.getbbox()[3] + offset[1] if not floor else SOLE - im.height + offset[1]
    if x < 0 or x + im.width > SIZE[0] or y < -4:
        raise ValueError(f'frame exceeds canvas: {im.size} at {(x, y)}')
    out = Image.new('RGBA', SIZE)
    out.alpha_composite(im, (x, y) if y >= 0 else (x, 0))
    return out


def ko_eye(im):
    """The out-cold pose was drawn with a cartoon spiral eye that reads as a monocle at game scale:
    repaint it as the shut, bruised eye the slumped pose already has."""
    a = np.array(im).astype(int); rgb, al = a[..., :3], a[..., 3] > 128
    sat = rgb.max(2) - rgb.min(2); x0, y0, x1, y1 = im.getbbox()
    head = np.zeros(al.shape, bool); head[y0:y0 + (y1 - y0) // 2, x0:x0 + (x1 - x0) // 3] = True
    light = head & al & (sat < 28) & (rgb.max(2) > 125)
    if light.sum() < 6: return im
    ys, xs = np.nonzero(light)
    # The spiral is the densest light cluster (the grey hair streak is sparse and longer).
    near = ((ys[:, None] - ys[None]) ** 2 + (xs[:, None] - xs[None]) ** 2 <= 25).sum(1)
    cy, cx = ys[near.argmax()], xs[near.argmax()]; keep = (ys - cy) ** 2 + (xs - cx) ** 2 <= 64
    cy, cx = ys[keep].mean(), xs[keep].mean(); r = max(np.ptp(ys[keep]), np.ptp(xs[keep])) / 2 + 3.5
    yy, xx = np.mgrid[:al.shape[0], :al.shape[1]]
    # An oval, lumpy swelling (wider than tall), not a disc.
    lump = 1 + .12 * np.sin(np.arctan2(yy - cy, xx - cx) * 3 + 1.3)
    d = np.sqrt(((yy - cy) / .8) ** 2 + ((xx - cx) / 1.2) ** 2) / lump; disc = al & (d <= r) & ((sat < 40) | (d <= r * .7))
    # Puffy lid: skin-lit dome over the spiral, bruise bleeding softly into the cheek (no hard rim).
    q = np.clip(d / r, 0, 1)[..., None]
    lid_col = np.array([214, 132, 84]) * (1 - q ** 1.6) + np.array([172, 92, 78]) * q ** 1.6
    a[..., :3] = np.where(disc[..., None], lid_col.round(), a[..., :3])
    halo = al & (d > r) & (d <= r + 4) & ~disc
    k = (0.45 * (1 - (d - r) / 4))[..., None]
    a[..., :3] = np.where(halo[..., None], (a[..., :3] * (1 - k) + np.array([110, 52, 78]) * k).round(), a[..., :3])
    slit = disc & (np.abs(yy - cy - .5 - (xx - cx) ** 2 / (5 * r)) <= .6) & (np.abs(xx - cx) <= r * 1.1)
    a[slit, :3] = (58, 22, 30)
    return Image.fromarray(a.astype(np.uint8))


def build(variant, ratio):
    folder = SOURCE / variant
    key = 'ic_closer' + ('_damaged' if variant == 'damaged' else '')
    target = REVIEW / key; target.mkdir(parents=True, exist_ok=True)
    fix = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
    poses, scales = {}, {}
    order = [s for s in SHEETS if (folder / f'{s}.png').exists() or (variant == 'damaged' and (SOURCE / 'intact' / f'{s}.png').exists() and s in ('seated', 'phasebreak'))]
    for sheet in order:
        path = folder / fix.get(f'{sheet}_source', f'{sheet}.png')
        if not path.exists(): path = SOURCE / 'intact' / f'{sheet}.png'
        src = cells(path, 4, 2)
        if sheet == 'walk' and fix.get('walk_repair_source'):
            repair = cells(folder / fix['walk_repair_source'], 2, 2)
            repair_scale = height(src[2]) / height(repair[0])
            for source_i, target_i in enumerate((2, 3, 6, 7)):
                im = repair[source_i]
                src[target_i] = im.resize((round(im.width*repair_scale),round(im.height*repair_scale)),Image.Resampling.LANCZOS)
        if sheet == 'deal' and (folder / 'deal-offer.png').exists():
            # Pose 0 re-drawn as a chest-high offered handshake; matched to the original pose's standing height.
            offer = cells(folder / 'deal-offer.png', 4, 2)[0]; k0 = height(src[0]) / height(offer)
            src[0] = offer.resize((round(offer.width * k0), round(offer.height * k0)), Image.Resampling.LANCZOS)
        ref, kind, mode = SHEETS[sheet]
        if kind == 'push':
            # Leaning push: scale so the shoe-to-shoulder silhouette matches the walk's body width.
            scale = scales.get('walk', 1) * fix.get(f'{sheet}_scale', 1.0)
        elif kind == 'match':
            scale = scales.get('boxing', 1) * fix.get(f'{sheet}_scale', 1.0)
        else:
            want = STAND * (ratio if kind in ('guard', 'block') else 1)
            scale = want / height(src[ref]) * fix.get(f'{sheet}_scale', 1.0)
        scales[sheet] = scale
        anchor = None
        for i, image in src.items():
            spec = fix.get(f'{sheet}_{i:02d}', {})
            k = scale * spec.get('scale', 1)
            if mode == 'rear':
                if anchor is None:
                    s0 = rs(src[0], scale)
                    anchor = torso(s0) - rear_heel(s0)
                x_of = lambda im: rear_heel(im) + anchor
            else:
                x_of = palm if mode == 'palm' else torso
            frame = place(image, k, x_of, tuple(spec.get('offset', [0, 0])), spec.get('floor', False))
            if sheet == 'finisher' and i == 7: frame = ko_eye(frame)
            frame.save(target / f'{sheet}_{i:02d}.png', optimize=True)
            poses[sheet, i] = frame
        for name, color in [('dark', '#16191e'), ('light', '#d7d0c2')]:
            board = Image.new('RGBA', (SIZE[0] * 4, SIZE[1] * 2), color)
            draw = ImageDraw.Draw(board)
            for i in src:
                x, y = i % 4 * SIZE[0], i // 4 * SIZE[1]
                board.alpha_composite(poses[sheet, i], (x, y)); draw.line((x, y + SOLE, x + SIZE[0], y + SOLE), fill='#444')
                draw.text((x + 8, y + 8), str(i), fill='#b59774')
            board.save(REVIEW / f'{variant}-{sheet}-{name}.png')
    states = {state: [f'{key}/king_{s}_{i:02d}.png' for s, i in refs]
              for state, refs in STATES.items() if all((s, i) in poses for s, i in refs)}
    return key, states


def register(changes):
    with (FRAMES / '.manifest.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = FRAMES / 'manifest.json'; manifest = json.loads(path.read_text())
        for key, states in changes.items():
            (FRAMES / key).mkdir(exist_ok=True)
            for file in {f for files in states.values() for f in files}:
                source = REVIEW / key / Path(file).name.removeprefix('king_')
                (FRAMES / file).write_bytes(source.read_bytes())
            manifest[key] = states  # the redesign replaces every state of the old Closer
        pending = FRAMES / 'manifest.closer.pending.json'
        pending.write_text(json.dumps(manifest, indent=2) + '\n'); pending.replace(path)


# ---- gaits -------------------------------------------------------------------------------------
def grounded(path):
    """Sole groups touching the registered floor, left to right (2x px)."""
    a = np.asarray(Image.open(path).convert('RGBA'))[..., 3] >= 128
    xs = np.flatnonzero(a[SOLE - 6:SOLE + 1].any(axis=0))
    groups = np.split(xs, np.flatnonzero(np.diff(xs) > 14) + 1)
    return [(int(g.min()) + int(g.max())) / 2 for g in groups if len(g) >= 4]


def gait(files):
    """8-pose cycle, double support at poses 0 and 4. Facing right, the planted shoe slides back each pose:
    beat[i] = logical travel from pose i to i+1 (the front shoe while planted, the rear one at a support change)."""
    soles = [grounded(FRAMES / f) for f in files]; beat = []
    for i in range(8):
        j = (i + 1) % 8
        here, there = soles[i][-1], (soles[j][0] if j in (0, 4) else soles[j][-1])
        beat.append(round(max(.5, (here - there) / 2), 3))
    return {'beat': beat, 'contacts': [0, 4], 'starts': [[0], [4]]}


def write_gaits(keys):
    manifest = json.loads((FRAMES / 'manifest.json').read_text()); path = ROOT / 'js/refund_gait_data.js'
    text = path.read_text(); data = json.loads(text.split('export const REFUND_GAITS=')[1].strip().rstrip(';'))
    for key in keys:
        if key in manifest and 'walk' in manifest[key]:
            # The vault rush is a scrambling shove with no clean double support: an even cadence reads best.
            data[key] = {'walk': gait(manifest[key]['walk']), 'push': {'beat': [6.0] * 8, 'contacts': [0, 4], 'starts': [[0], [4]]}}
            print(key, data[key])
    path.write_text(text.split('export const REFUND_GAITS=')[0] + 'export const REFUND_GAITS=' + json.dumps(data, separators=(',', ':')) + ';\n')


# ---- arena ------------------------------------------------------------------------------------
OVERHAUL = SOURCE.parent
STAGE = ROOT / 'assets/stages/refund_tower/closer'
# Props sheet (row-major blobs) -> name, target 1x size (w or h) and which dimension sets the scale.
PROPS = [('throne', 'h', 88), ('desk', 'w', 108), ('desk_broken', None, 'desk'), ('vault', 'h', 80),
         ('vault_dented', None, 'vault'), ('vault_burst', None, 'vault'), ('display', 'h', 80), ('display_broken', None, 'display')]
ITEMS = [('handset', 'w', 22), ('handset_v', 'h', 22), ('shades', 'w', 15), ('sleeve', 'h', 22),
         ('button', 'w', 5), ('bundle', 'w', 14), ('note', 'w', 12), ('giftcard', 'w', 11)]


def label(mask):
    """4-connected components of a small boolean mask (no scipy here)."""
    lab = np.zeros(mask.shape, int); k = 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]: continue
        k += 1; lab[y0, x0] = k; stack = [(y0, x0)]
        while stack:
            y, x = stack.pop()
            for v, u in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= v < mask.shape[0] and 0 <= u < mask.shape[1] and mask[v, u] and not lab[v, u]:
                    lab[v, u] = k; stack.append((v, u))
    return lab, k


def blobs(path, n):
    """The n largest separately drawn objects on a transparent sheet, row-major."""
    im = Image.open(path).convert('RGBA'); arr = np.array(im); a = arr[..., 3] > 0
    f = 4; small = a[:a.shape[0] // f * f, :a.shape[1] // f * f].reshape(a.shape[0] // f, f, a.shape[1] // f, f).any((1, 3))
    lab, k = label(small)
    full = np.zeros(a.shape, int); full[:lab.shape[0] * f, :lab.shape[1] * f] = np.kron(lab, np.ones((f, f), int))
    sizes = np.array([(full == i).sum() for i in range(1, k + 1)])
    keep = list(np.argsort(sizes)[::-1][:n] + 1)
    centre = lambda m: np.array([c.mean() for c in np.nonzero(m)])
    # Debris (coins, shards, notes) joins the object it lies nearest to.
    owner = {i: i for i in keep}
    for i in range(1, k + 1):
        if i in owner: continue
        ys, xs = np.nonzero(lab == i)
        owner[i] = min(keep, key=lambda j: np.min(np.abs(np.nonzero(lab == j)[0][:, None] - ys[None, :1]) + np.abs(np.nonzero(lab == j)[1][:, None] - xs[None, :1])))
    out = []
    for i in keep:
        m = np.isin(full, [j for j, o in owner.items() if o == i]) & a
        ys, xs = np.nonzero(m); box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
        part = arr.copy(); part[..., 3] = np.where(m, part[..., 3], 0)
        out.append((box, Image.fromarray(part).crop(box)))
    rows = im.height / 2
    out.sort(key=lambda o: (int((o[0][1] + o[0][3]) / 2 // rows), o[0][0]))
    return [o[1] for o in out]


def cutouts(sheet, spec, n):
    STAGE.mkdir(parents=True, exist_ok=True); parts = blobs(sheet, n); scales = {}
    for (name, dim, size), im in zip(spec, parts):
        if dim is None: k = scales[size]
        else: k = 2 * size / (im.height if dim == 'h' else im.width)
        scales[name] = k
        out = edges(alpha(im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)))
        out = out.crop(out.getbbox()); out.save(STAGE / f'{name}.png', optimize=True)
        print(name, out.size)


def screens():
    im = Image.open(SOURCE / 'plate/screens.png').convert('RGB'); cw, ch = im.width / 4, im.height / 3
    atlas = Image.new('RGB', (4 * 128, 3 * 82))
    for i in range(12):
        x, y = i % 4 * cw, i // 4 * ch
        cell = im.crop((round(x + 6), round(y + 30), round(x + cw - 6), round(y + ch - 30)))
        atlas.paste(cell.resize((128, 82), Image.Resampling.LANCZOS), (i % 4 * 128, i // 4 * 82))
    atlas.save(STAGE / 'screens.png', optimize=True)


WALL = (1100, 36, 1570, 344)  # 2x plate box of the screen wall (CLOSER_WALL in js/closer_arena.js)


def wall_set():
    base = plate_image().crop(WALL); w, h = base.size
    x = np.arange(w)[None, :]; y = np.arange(h)[:, None]
    edge = np.minimum(np.minimum(x, w - 1 - x), np.minimum(y, h - 1 - y)); feather = np.clip(edge / 14, 0, 1)
    strip = Image.new('RGBA', (w * 4, h)); strip.paste(base.convert('RGBA'), (0, 0))
    for i in (1, 2, 3):
        path = SOURCE / f'plate/wall{i}.png'
        if not path.exists(): continue
        state = np.array(Image.open(path).convert('RGB').resize((w, h), Image.Resampling.LANCZOS)).astype(float)
        mix = state * feather[..., None] + np.array(base).astype(float) * (1 - feather[..., None])
        strip.paste(Image.fromarray(mix.astype('uint8')).convert('RGBA'), (w * i, 0))
    strip.save(STAGE / 'wall_set.png', optimize=True)


def plate_image():
    return Image.open(SOURCE / 'plate/plate-v1.png').convert('RGB').resize((1620, 540), Image.Resampling.LANCZOS)


PORTRAIT = (610, 70, 180)  # 2x executive panel box of its framed portrait; inner canvas (52,40)-(143,145)


def plate():
    """Install the closing room, its join and the executive portrait as selected overhaul sources."""
    import shutil
    from build_refund_overhaul import build
    shutil.copy(SOURCE / 'plate/plate-v1.png', OVERHAUL / 'areas/closer-king.png')
    shutil.copy(SOURCE / 'plate/join.png', OVERHAUL / 'joins/executive_closer-king.png')
    src = Image.open(OVERHAUL / 'areas/executive-v1.png').convert('RGB'); k = src.width / 1620
    x0, y0, size = PORTRAIT
    paint = Image.open(SOURCE / 'plate/exec-portrait.png').convert('RGB').resize((round(size * k),) * 2, Image.Resampling.LANCZOS)
    mask = Image.new('L', paint.size); ImageDraw.Draw(mask).rectangle([round(v * k) for v in (52, 40, 143, 145)], fill=255)
    from PIL import ImageFilter
    mask = mask.filter(ImageFilter.GaussianBlur(2 * k))
    src.paste(paint, (round(x0 * k), round(y0 * k)), mask); src.save(OVERHAUL / 'areas/executive-king.png', optimize=True)
    sel_path = OVERHAUL / 'selection.json'
    with (OVERHAUL / '.selection.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        sel = json.loads(sel_path.read_text())
        sel.update({'closer': 'closer-king.png', 'executive': 'executive-king.png', 'executive_closer': 'executive_closer-king.png'})
        sel_path.write_text(json.dumps(sel, indent=2) + '\n')
    build()


def desk_empty():
    """The desk during his intro call: the phone's handset is off its cradle (in his hand). Only the phone
    corner of props/desk-empty.png replaces the registered desk; its generated cord is dropped (code draws it)."""
    a = np.array(Image.open(SOURCE / 'props/desk-empty.png').convert('RGBA')); a[:300, 345:445, 3] = 0
    im = Image.fromarray(a); im = im.crop(im.getbbox())
    desk = Image.open(STAGE / 'desk.png').convert('RGBA'); new = alpha(im.resize(desk.size, Image.Resampling.LANCZOS))
    box = (0, 0, 58, 40); desk.paste(new.crop(box), box[:2]); edges(alpha(desk)).save(STAGE / 'desk_empty.png', optimize=True)


def arena():
    plate(); cutouts(SOURCE / 'props/props.png', PROPS, 8); cutouts(SOURCE / 'props/items.png', ITEMS, 8)
    screens(); wall_set(); desk_empty()


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('what', choices=['sprites', 'arena'])
    parser.add_argument('--register', action='store_true'); parser.add_argument('--variant', choices=['intact', 'damaged'])
    args = parser.parse_args(); REVIEW.mkdir(parents=True, exist_ok=True)
    if args.what == 'arena': return arena()
    ratio = guard_ratio()
    changes = dict(build(v, ratio) for v in ([args.variant] if args.variant else ['intact', 'damaged']) if (SOURCE / v).exists())
    if args.register: register(changes); write_gaits(changes)
    print(json.dumps({'guard_ratio': round(ratio, 3), **{k: {s: len(f) for s, f in st.items()} for k, st in changes.items()}}))


if __name__ == '__main__': main()
