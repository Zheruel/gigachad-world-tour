"""Register the Refund Tower cast (the ic_ office families) and their desk performances from GPT sheets.

Sources in assets/sources/production/stages/refund_tower/cast/, 4x4 cells:
<name>_a  idle 0-1, block 2, windup 3, walk 4-11, strike/follow 12-13, hurt 14, down 15
<name>_b  get-up 0-3, daze 4-7, launched 8, low hurt 9, specials 10-15
<name>_c  (desk workers) seated from behind 0-3, rise 4-7, step 8-10, stance 11
Same registration as the train and Delhi casts: one scale per character, one sole line,
pelvis anchored. Desk frames keep the office atlas layout (288x236 cells, feet on 230).
"""
from pathlib import Path
import fcntl
import io
import json
import sys
import numpy as np
from PIL import Image
import build_train_passengers as passengers
from keying import components
from build_train_passengers import cells, register, scaled, pelvis_x, FRAMES, SIZE, SOLE
from sprite_edges import alpha, edges


def edge_degrade(a):
    """The caller's lavender shirt and the team lead's pink one are real colours: only the
    magenta-tinted key edge goes, interiors keep their hue."""
    solid = a[:, :, 3] > 0; edge = ~solid
    for _ in range(2):
        edge = edge | np.roll(edge, 1, 0) | np.roll(edge, -1, 0) | np.roll(edge, 1, 1) | np.roll(edge, -1, 1)
    r, g, b = (a[:, :, k].astype(int) for k in range(3))
    a[solid & edge & (r > g + 45) & (b > g + 45)] = 0
    return a


full_degrade = passengers.degrade  # cells() and scaled() look the name up at call time

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/refund_tower/cast'
RESTYLED = SRC / 'chad_style'
OUT = ROOT / 'assets/stages/refund_tower'
# source name -> (runtime set, walk-cycle height in 2x pixels); CHAD stands 178
CAST = {
    'caller': ('ic_headset', 172), 'kid': ('ic_operator', 164), 'itguy': ('ic_thrower', 168),
    'guard': ('ic_security', 176), 'recovery': ('ic_cabinet', 196), 'lead': ('ic_lead', 172),
}
A = {'idle': [0, 1], 'block': [2], 'walk': list(range(4, 12)), 'atk': [3, 12, 13], 'hurt': [14], 'down': [15]}
B = {'getup': [0, 1, 2, 3], 'stagger_polish': [4, 5, 6, 7], 'fall': [8], 'jump': [8]}
HEAVY_HITS = [('b', 9), ('a', 14), ('b', 12), ('b', 9), ('b', 13), ('b', 14), ('b', 15), ('a', 15)]
EXTRA = {
    'caller': {'hurt': [('a', 14), ('b', 9)], 'grab': [('b', 10)], 'taunt': [('b', 11)], 'super_reaction': HEAVY_HITS},
    'kid': {'hurt': [('a', 14), ('b', 9)], 'dodge': [('b', 10)], 'taunt': [('b', 11)],
            'run': [('b', 12), ('b', 13), ('b', 14), ('b', 13)], 'kick': [('a', 3), ('b', 15)]},
    'itguy': {'hurt': [('a', 14), ('b', 9)], 'throw': [('b', 10), ('b', 11)], 'super_reaction': HEAVY_HITS},
    # His beret flies off in a_14 and would pop straight back on: he doubles over instead.
    'guard': {'hurt': [('b', 9), ('b', 9)], 'taunt': [('b', 10)], 'jab': [('b', 11), ('b', 11)], 'super_reaction': HEAVY_HITS},
    'recovery': {'hurt': [('a', 14), ('b', 9)], 'taunt': [('b', 10)], 'ram': [('b', 12), ('b', 13), ('b', 14)],
                 'punch': [('a', 3), ('a', 12), ('a', 13)], 'call': [('b', 15)]},
    # His clipboard swaps arms in the two passing-up cells; the loop reuses the passing poses instead.
    'lead': {'walk': [('a', i) for i in (4, 5, 6, 5, 8, 9, 10, 9)], 'hurt': [('a', 14), ('b', 9)], 'call': [('b', 11), ('b', 10), ('b', 10)], 'taunt': [('b', 11)], 'super_reaction': HEAVY_HITS},
}
SMEAR = {'guard'}  # their strike cell (a 12) carries a pink swoosh; the game draws its own
HOT_PINK = {'lead'}
# Nothing on these two is purple: tinted key left between limbs goes grey like the train cast.
NO_PURPLE = {'kid', 'itguy'}
# Per-frame cleanup after registration (see tidy()).
TIDY = {
    ('guard', 'a_12'): 'swoosh',                            # GPT's pink motion streaks off the lathi tip
    ('caller', 'a_14'): 'loose', ('lead', 'b_06'): 'clipboard',  # a spare headset / a second clipboard on the floor
    ('itguy', 'a_12'): 'specks', ('itguy', 'a_13'): 'specks',  # flying key caps read as dirt at game scale
}
# Where a pose overlaps the cell above: a magenta cut (row, x0, x1) separates the two silhouettes.
CUTS = {'lead_b': [(973, 1090, 1260), (974, 1090, 1260), (975, 1090, 1260)]}
# The guard's dropped lathi lies under his boots while dazed; he stands on the floor, not on it.
FLOOR_STICK = {('guard', 'b', i) for i in range(4, 8)}
FLOOR = {'down', 'fall', 'jump', 'super_reaction'}
# Desk atlas: one row per worker type in the order india_office.js seats them.
DESK = ['caller', 'kid', 'itguy']
SEATED = [0, 1, 2, 3]              # typing, typing, desk business, alert
RISE = [4, 5, 5, 6, 7, 8, 10, 11]  # rise frames 0-7 as officeWorkerPose plays them
RISE_BLEND = [0, .5, .5, 1, 1, 1, 1, 1]
SEAT_H = 146  # seated height at 2x: head and shoulders over the chair back


def load(stem, smear=None):
    native = RESTYLED / f'{stem}.png'
    if native.exists():
        # New paintings use native alpha, so the lavender shirt and warm skin
        # never pass through a colour key or its grey fringe correction.
        im = alpha(Image.open(native)); a = np.array(im); h, w = a.shape[:2]
        groups = {i: [] for i in range(16)}
        for part in components(a[:, :, 3] > 0):
            if len(part) < 40:
                continue
            cy, cx = part.mean(0)
            groups[min(3, int(cy / (h / 4))) * 4 + min(3, int(cx / (w / 4)))].append(part)
        out = {}
        for i, parts in groups.items():
            if not parts:
                continue
            body = max(parts, key=len); y0, x0 = body.min(0) - 32; y1, x1 = body.max(0) + 32
            keep = np.zeros(a.shape[:2], bool)
            for part in parts:
                near = ((part[:, 0] >= y0) & (part[:, 0] <= y1) & (part[:, 1] >= x0) & (part[:, 1] <= x1)).any()
                if part is body or (len(part) >= 160 and near):
                    keep[part[:, 0], part[:, 1]] = True
            q = a.copy(); q[~keep] = 0; pose = Image.fromarray(q)
            out[i] = pose.crop(pose.getbbox())
        expected = range(12 if stem.endswith('_c') else 16)
        missing = [i for i in expected if i not in out]
        if missing:
            raise ValueError(f'{native.name}: missing poses {missing}')
        passengers.degrade = lambda q: q
        return out
    passengers.degrade = full_degrade if stem.split('_')[0] in NO_PURPLE else edge_degrade
    im = Image.open(SRC / f'{stem}.png').convert('RGB'); q = np.array(im)
    for y, x0, x1 in CUTS.get(stem, ()):
        q[y, x0:x1] = (255, 0, 255)
    if stem.split('_')[0] in HOT_PINK:
        # Enclosed hot-pink shirt highlights reach the key threshold; the backdrop seen
        # through gaps is pure magenta (r ~ b, g ~ 0). Only the pink-leaning islands stay.
        c = q.astype(int); tint = np.minimum(c[:, :, 0], c[:, :, 2]) - c[:, :, 1]
        for part in components(tint > 100):
            r, g, b = np.median(c[part[:, 0], part[:, 1]], 0)
            if len(part) < 20000 and (r - b > 30 or g > 35):
                ys, xs = part[:, 0], part[:, 1]
                q[ys, xs, 1] = np.clip(np.minimum(c[ys, xs, 0], c[ys, xs, 2]) - 95, 0, 255)
    buf = io.BytesIO(); Image.fromarray(q).save(buf, 'PNG'); buf.seek(0)
    return cells(buf, smear)


def native_scaled(im, k):
    """Keep true-alpha paintings opaque without growing their resampled silhouette."""
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
    return alpha(im, threshold=128, speck=1)


def native_register(im, k, state):
    im = native_scaled(im, k); out = Image.new('RGBA', SIZE)
    x = SIZE[0] / 2 - (im.width / 2 if state == 'down' else pelvis_x(im))
    out.alpha_composite(im, (round(x), SOLE - im.height))
    return out


def tidy(f, op):
    parts = components(f[:, :, 3] > 0); body = max(parts, key=len)
    if op == 'swoosh':
        r, g, b = (f[:, :, k].astype(int) for k in range(3)); cols = np.arange(f.shape[1])[None, :]
        streak = (f[:, :, 3] > 0) & (cols >= 250) & (((r > g + 30) & (b > g + 10)) | ((b > 140) & (r > 180) & (g > 150)))
        f[streak] = 0; parts = components(f[:, :, 3] > 0); body = max(parts, key=len)
        op = 'specks'
    if op == 'clipboard':  # it touches his shoe, so it is cut by position: floor level, behind his heel
        f[270:, :125] = 0; return f
    for part in parts:
        if part is not body and (op == 'loose' or len(part) < 400):
            f[part[:, 0], part[:, 1]] = 0
    return f


def blue_rim(f):
    """Sheet b lit him with a blue rim sheet a never had: fold it back into his dark tee."""
    r, g, b = (f[:, :, k].astype(int) for k in range(3)); rim = (f[:, :, 3] > 0) & (b > r + 20) & (b > g + 10)
    lum = (r * .3 + g * .59 + b * .11)[rim] * .8; f[rim, 0] = lum; f[rim, 1] = lum; f[rim, 2] = lum * 1.04
    return f


def drop_stick(im):
    """Cut the source rows from the top of a long golden bar down: the stick and its outline go."""
    q = np.array(im); r, g, b = (q[:, :, k].astype(int) for k in range(3))
    gold = (q[:, :, 3] > 0) & (r > 150) & (g > 100) & (b < 90) & (r - b > 80)
    rows = np.where(gold.sum(1) > q.shape[1] * .3)[0]
    q[max(0, rows.min() - 6):] = 0
    return Image.fromarray(q).crop(Image.fromarray(q).getbbox())


def desk(a, ka, name):
    """Native seated/rise performances keep one body scale; older keyed art blends
    its oversized sitter into the gameplay scale while he is half up."""
    c = load(f'{name}_c')
    native = (RESTYLED / f'{name}_c.png').exists()
    reference = A['idle'] if native else A['walk']
    k_stand = ka * np.median([a[i].height for i in reference]) / c[7].height
    k_seat = SEAT_H / np.median([c[i].height for i in SEATED])
    frames = []
    for n, i in enumerate(SEATED + RISE):
        w = 0 if n < 4 else RISE_BLEND[n - 4]
        # A natural seated adult gets shorter by bending his legs; his head and
        # hands keep the combat family's scale throughout the rise.
        scaler = native_scaled if native else scaled
        scale = k_stand if native else k_seat + (k_stand - k_seat) * w
        # The aisle uses the approved combat walk and guard directly, keeping
        # identity and physical scale exact as entry hands over to the fighter.
        combat_pose = {8: 4, 10: 5, 11: 0}.get(i) if native else None
        im = native_scaled(a[combat_pose], ka) if combat_pose is not None else scaler(c[i], scale)
        f = Image.new('RGBA', (288, 236))
        f.alpha_composite(im, (round(144 - pelvis_x(im)), 230 - im.height)); frames.append(f)
    return [edges(f, threshold=128) for f in frames]


def atlas(frames, cols, path):
    w, h = frames[0].size; im = Image.new('RGBA', (w * cols, h * ((len(frames) + cols - 1) // cols)))
    for i, f in enumerate(frames):
        im.alpha_composite(f, (i % cols * w, i // cols * h))
    im.save(path, optimize=True)


def main(names=None):
    selected = set(names or CAST)
    if selected - CAST.keys():
        raise ValueError(f'Unknown Refund families: {sorted(selected - CAST.keys())}')
    path = FRAMES / 'manifest.json'; manifest = json.loads(path.read_text())
    seated, standing = [], []
    for name, (runtime, height) in CAST.items():
        if name not in selected:
            if name in DESK:
                row = DESK.index(name)
                for sheet, count, into in [('office_life', 4, seated), ('office_stand', 8, standing)]:
                    atlas_im = Image.open(OUT / f'{sheet}.png').convert('RGBA')
                    into.extend(atlas_im.crop((i * 288, row * 236, (i + 1) * 288, (row + 1) * 236)) for i in range(count))
            continue
        a, b = load(f'{name}_a', 12 if name in SMEAR else None), load(f'{name}_b')
        if not (RESTYLED / f'{name}_b.png').exists():
            b.update({i: drop_stick(b[i]) for n, s, i in FLOOR_STICK if n == name})
        ka = height / np.median([a[i].height for i in A['walk']])
        # Native sheets end getup in an upright guard; hunched daze poses must stay shorter.
        if (RESTYLED / f'{name}_b.png').exists():
            kb = ka * np.median([a[i].height for i in A['idle']]) / b[3].height
        else:
            kb = ka * np.median([a[i].height for i in A['idle']]) / np.median([b[i].height for i in B['stagger_polish']]) * .97
        states = {s: [('a', i) for i in ids] for s, ids in A.items()}
        states.update({s: [('b', i) for i in ids] for s, ids in B.items()})
        states.update(EXTRA[name])
        folder = FRAMES / runtime; folder.mkdir(exist_ok=True)
        for old in folder.glob('*.png'):
            old.unlink()
        written = set()
        for state, refs in states.items():
            for sheet, i in refs:
                stem = f'{sheet}_{i:02d}'
                if stem in written:
                    continue
                native = (RESTYLED / f'{name}_{sheet}.png').exists()
                registrar = native_register if native else register
                f = np.array(registrar((a if sheet == 'a' else b)[i], ka if sheet == 'a' else kb, 'down' if state in FLOOR else state))
                if not native and (name, stem) in TIDY:
                    f = tidy(f, TIDY[name, stem])
                if name == 'recovery' and sheet == 'b':
                    f = blue_rim(f)
                edges(Image.fromarray(f), threshold=128, look=runtime).save(folder / f'{stem}.png'); written.add(stem)
        manifest[runtime] = {s: [f'{runtime}/{sh}_{i:02d}.png' for sh, i in refs] for s, refs in states.items()}
        if name in DESK:
            f = desk(a, ka, name); seated += f[:4]; standing += f[4:]
    if selected.intersection(DESK):
        atlas(seated, 4, OUT / 'office_life.png'); atlas(standing, 8, OUT / 'office_stand.png')
    path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    with (FRAMES / '.manifest.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        main(sys.argv[1:] or None)
