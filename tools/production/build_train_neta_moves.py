"""Run-2 Netaji cells (nr_neta/m_*.png) on top of build_train_neta.py's sheet cells.

Sources: assets/sources/production/stages/night_train/neta/moves/*.png, GPT Image strips facing right with hardened
alpha (gen_image.sh). Each strip is sliced into poses, scaled to Netaji's 80 px standing height (2x cells, 400x300,
sole row 293), registered on the anchor that stays still through the move (see ANCHORS), toned (TONE nr_neta) and
outlined with edges(). New moves get new state names; walk/backpedal/guardbreak/lob/getup/hurt/wobble/duck replace the
sheet cells in place (same cell count and meaning, so existing pose tables keep working).

Run on its own to rebuild only these cells (takes the manifest flock):  .venv/bin/python tools/production/build_train_neta_moves.py
build_train_neta.py calls register() right after it rebuilds nr_neta.
"""
from pathlib import Path
import fcntl
import json
import numpy as np
from PIL import Image
from keying import components
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/neta/moves'
FRAMES = ROOT / 'assets/frames'
KEY = 'nr_neta'
SIZE, SOLE, CX = (400, 300), 293, 200
IDLE = 'a_00'  # the stance every planted move registers against

# strip -> (pose count, scale to 2x cells). Scales were set by matching each strip's standing pose to the idle's
# height and head size at game scale (see tools/verification/neta_moves_check.py for the side-by-side).
STRIPS = {
    'climb_start': (3, .26), 'climb_loop': (4, .26), 'swing': (3, .32), 'whip': (3, .31), 'whip_strike': (1, .31 * .5124),
    'flee_run': (6, .46), 'glance_hatch': (3, .28), 'shout': (3, .28), 'walk': (8, .598), 'dizzy': (5, .345), 'run': (8, .56),
    'shove': (2, .25), 'grit': (3, .36), 'shot': (3, .32), 'beg': (5, .366), 'backpedal': (4, .367), 'guardbreak': (1, .188),
    'lob_fix': (1, ('cell', 'k_12')), 'getup_fix': (1, ('cell', 'b_00')), 'run_fix': (1, ('like', 'run', 2)),
    'draw': (1, ('cell', 'a_00')),
    # Roof duel (the pathetic coward): roof_*.png strips, one per move
    'roof_tremble': (4, .30), 'roof_aimshake': (4, .32), 'roof_click': (4, .30), 'roof_fumble': (6, .36), 'roof_whimper': (4, .30),
    'roof_cower': (4, .30), 'roof_tantrum': (6, .37), 'roof_wheeze': (4, .31), 'roof_crawl': (6, .43),
    'roof_trip': (5, .42), 'roof_bribe': (4, .30), 'roof_laugh': (4, .30), 'roof_downed': (4, .33),
    'roof_v2_shot': (6, ('standing', 0)), 'roof_v2_swing': (6, ('standing', 0)), 'roof_v4_grit': (6, ('standing', 0)),
    'roof_v3_shove': (6, ('standing', 0, 1.06)),
    'roof_v5_grit_windup': (2, ('standing', 0)),
}
# Back views drawn slimmer than his front (N2): widened about the centre before scaling.
WIDEN = {('climb_loop', i): 1.1 for i in range(4)} | {('climb_start', 2): 1.1}

# state -> cells. A cell is (strip, pose index, anchor) or an existing sheet cell name ('a_00').
# Anchors (x, all feet on the sole unless noted):
#   'low'   lower-body centroid (bottom 20%) on the idle's
#   'back'  back heel (leftmost sole pixel) on the idle's: the planted foot of forward-stepping attacks
#   'feet'  midpoint of the soles on the idle's
#   'torso' upper-body centroid on the idle's (runs: the body stays level while the legs cycle)
#   'hang'  climb: centred, highest fist top at HANG_Y (y) so a rung-stepped y keeps the grip on the rung
HANG_Y = 112  # lowest hanging foot (reach cells, 183 px) still closes inside the 300-row cell
STATES = {
    'climb_start': [('climb_start', 0, 'feet'), ('climb_start', 1, 'feet'), ('climb_start', 2, 'feet')],
    'climb_back': [('climb_loop', i, 'hang') for i in range(4)],
    'swing_full': [('@', 'c_00', 'back'), ('swing', 0, 'back'), ('swing', 1, 'back'), ('@', 'c_02', 'back'), ('swing', 2, 'feet')],
    'whip_full': [('whip', 0, 'back'), ('whip_strike', 0, 'back'), ('whip', 2, 'back')],
    'flee_run': [('flee_run', i, 'torso') for i in range(6)],
    'flee_glance': [('glance_hatch', 0, 'torso')],
    'shout': [('shout', i, 'feet') for i in range(3)],
    'run': [('run_fix' if i == 2 else 'run', 0 if i == 2 else i, 'torso') for i in range(8)],
    'walk': [('walk', i, 'low') for i in range(8)],
    'dizzy': [('dizzy', i, 'back') for i in range(1, 5)],
    'shove_full': [('@', 'g_05', 'back'), ('@', 'l_04', 'back'), ('shove', 0, 'back'), ('shove', 1, 'back')],
    'grit_full': [('grit', i, 'back') for i in range(3)],
    'recoil': [('shot', 2, 'back')],
    'beg': [('beg', i, 'feet') for i in range(4)],
    'backpedal': [('backpedal', i, 'low') for i in range(4)],
    'guardbreak': [('guardbreak', 0, 'back')],
    'draw': [('draw', 0, 'feet')],
    'lob': [('lob_fix', 0, 'back@k_12')],
    'getup': [('getup_fix', 0, 'toe@b_00'), ('@', 'b_01', 'feet'), ('@', 'b_02', 'feet'), ('@', 'b_03', 'feet')],
    'r_tremble': [('roof_tremble', i, 'feet') for i in range(4)],
    'r_aim': [('roof_aimshake', i, 'back') for i in range(4)],
    'r_click': [('roof_click', i, 'back') for i in range(4)],
    'r_fumble': [('roof_fumble', i, 'feet') for i in range(6)],
    'r_whimper': [('roof_whimper', i, 'back') for i in range(4)],
    'r_cower': [('roof_cower', i, 'feet') for i in range(4)],
    'r_tantrum': [('roof_tantrum', i, 'feet^') for i in range(5)],
    'r_wheeze': [('roof_wheeze', i, 'torso') for i in range(4)],
    'r_crawl': [('roof_crawl', i, 'torso') for i in range(6)],
    'r_trip': [('roof_trip', i, 'torso^') for i in range(5)],
    'r_bribe': [('roof_bribe', i, 'back') for i in range(4)],
    'r_laugh': [('roof_laugh', i, 'feet') for i in range(4)],
    'r_downed': [('roof_downed', i, 'torso') for i in range(4)],
    'r_shot': [('roof_v2_shot', i, 'back') for i in range(6)],
    'r_swing': [('roof_v2_swing', i, 'back') for i in range(6)],
    'r_grit': [('roof_v4_grit', 5, 'back'), ('roof_v5_grit_windup', 0, 'back'), ('roof_v5_grit_windup', 1, 'back'),
               ('roof_v4_grit', 3, 'back'), ('roof_v4_grit', 4, 'back'), ('roof_v4_grit', 5, 'back')],
    'r_shove': [('roof_v3_shove', i, 'back') for i in range(6)],
}
# Re-registered sheet cells ('@', cell, anchor): the runtime cell shifted whole pixels onto the idle's anchor.
STATES |= {
    'hurt': [('@', 'a_13', 'feet'), ('@', 'a_14', 'feet')],
    'wobble': ['i_02', ('@', 'i_03', 'feet')],
}
# Shared cells (state -> the state whose cells it reuses).
ALIAS = {}


def _crop(im):
    """Crop to the figure, remembering where its soles sat in the strip (info['bottom']) for the '^' lift anchors."""
    b = im.getbbox(); c = im.crop(b); c.info['bottom'] = b[3]; return c


def slice_strip(path, n):
    """Poses of a strip, left to right, by blobs: the big blobs are the figures (blobs whose columns overlap merge),
    every small blob (sweat, grit, notes) joins the nearest figure. Falls back to column runs when the blobs do not
    give n figures."""
    im = Image.open(path).convert('RGBA'); a = np.array(im); mask = a[:, :, 3] >= 128
    if n == 1:
        return [_crop(im)]
    parts = [q for q in components(mask) if len(q) >= 30]
    big = max(len(q) for q in parts); rng = lambda q: (q[:, 1].min(), q[:, 1].max())
    groups = sorted([[q] for q in parts if len(q) >= .12 * big], key=lambda g: rng(g[0])[0])  # noqa
    span = lambda g: (min(rng(q)[0] for q in g), max(rng(q)[1] for q in g))
    merged = True
    while merged and len(groups) > 1:
        merged = False
        for i in range(len(groups) - 1):
            (a0, a1), (b0, b1) = span(groups[i]), span(groups[i + 1])
            if min(a1, b1) - max(a0, b0) > .5 * min(a1 - a0, b1 - b0):  # one inside the other: a split figure
                groups[i] += groups.pop(i + 1); merged = True; break
    while len(groups) > n:
        gaps = [span(groups[i + 1])[0] - span(groups[i])[1] for i in range(len(groups) - 1)]
        i = int(np.argmin(gaps)); groups[i] += groups.pop(i + 1)
    if len(groups) != n:
        return slice_columns(im, mask, n)
    figs = [np.concatenate(g) for g in groups]
    for q in parts:
        if len(q) < .12 * big:  # nearest figure pixel in the blob's own rows (a stray foot joins its own leg)
            y0, y1 = q[:, 0].min() - 12, q[:, 0].max() + 12; c = q[:, 1].mean(); d = []
            for f in figs:
                xs = f[(f[:, 0] >= y0) & (f[:, 0] <= y1), 1]
                d.append(np.abs(xs - c).min() if len(xs) else 1e9)
            groups[int(np.argmin(d))].append(q)
    out = []
    for g in groups:
        m = np.zeros_like(mask)
        for q in g:
            m[q[:, 0], q[:, 1]] = True
        c = a.copy(); c[~m] = 0; c = Image.fromarray(c); out.append(_crop(c))
    return out


def slice_columns(im, a, n):
    col = a.sum(0) > 0; segs = []; x = 0
    while x < len(col):
        if col[x]:
            s = x
            while x < len(col) and col[x]:
                x += 1
            segs.append([s, x])
        x += 1
    segs = [s for s in segs if a[:, s[0]:s[1]].sum() > 400]
    while len(segs) > n:
        gaps = [segs[i + 1][0] - segs[i][1] for i in range(len(segs) - 1)]
        i = int(np.argmin(gaps)); segs[i] = [segs[i][0], segs[i + 1][1]]; del segs[i + 1]
    while len(segs) < n:
        i = max(range(len(segs)), key=lambda k: segs[k][1] - segs[k][0]); s0, s1 = segs[i]; L = s1 - s0
        c = s0 + L // 5 + int(np.argmin(a[:, s0 + L // 5:s1 - L // 5].sum(0))); segs[i:i + 1] = [[s0, c], [c, s1]]
    out = []
    for s0, s1 in segs:
        c = im.crop((s0, 0, s1, im.height)); out.append(_crop(c))
    return out


def solid(im):
    return np.array(im)[:, :, 3] >= 128


def metric(im, anchor):
    a = solid(im); ys, xs = np.nonzero(a); top, bot = ys.min(), ys.max(); h = bot - top
    if anchor == 'low':
        return xs[ys >= bot - h * .2].mean()
    if anchor in ('back', 'feet'):
        sel = ys >= bot - max(3, h * .04); fx = xs[sel]
        return fx.min() if anchor == 'back' else (fx.min() + fx.max()) / 2
    if anchor == 'toe':
        return xs[ys >= bot - h * .3].max()
    if anchor == 'torso':
        return xs[ys < top + h * .55].mean()
    raise ValueError(anchor)


def fist_top(im):
    return int(np.nonzero(solid(im).any(1))[0][0])


_idle = {}


def idle_metric(anchor):
    if anchor not in _idle:
        _idle[anchor] = metric(Image.open(FRAMES / KEY / f'{IDLE}.png'), anchor)
    return _idle[anchor]


def shifted(name, anchor):
    im = Image.open(FRAMES / KEY / f'{name}.png').convert('RGBA'); dx = int(round(idle_metric(anchor) - metric(im, anchor)))
    out = Image.new('RGBA', SIZE); out.alpha_composite(im, (dx, 0)); return out


def scale_of(strip, i, poses):
    """One uniform scale per strip. 'standing' matches the first standing pose, with optional prop-height
    compensation; 'cell' matches one edited cell; 'like' matches a related strip's pose."""
    k = STRIPS[strip][1]
    if isinstance(k, (int, float)):
        return k
    if k[0] == 'cell':
        b = Image.open(FRAMES / KEY / f'{k[1]}.png').getbbox(); return (b[3] - b[1]) / poses[strip][i].height
    if k[0] == 'standing':
        b = Image.open(FRAMES / KEY / f'{IDLE}.png').getbbox()
        return (b[3] - b[1]) / poses[strip][k[1]].height * (k[2] if len(k) > 2 else 1)
    return scale_of(k[1], k[2], poses) * poses[k[1]][k[2]].height / poses[strip][i].height


def cell(strip, i, anchor, poses):
    """anchor 'm' puts metric m on the idle's; 'm@c_00' on that runtime cell's (edits that replace a cell)."""
    if strip == '@':
        return shifted(i, anchor)
    im = poses[strip][i]; k = scale_of(strip, i, poses); wx = WIDEN.get((strip, i), 1)
    # anchor 'm^': as 'm', but a pose off the strip's ground line (a hop, a stamp, a tumble) keeps its height above it
    lift = 0
    if anchor.endswith('^'):
        anchor = anchor[:-1]; lift = round((max(p.info['bottom'] for p in poses[strip]) - im.info['bottom']) * k)
    im = alpha(im.resize((max(1, round(im.width * k * wx)), max(1, round(im.height * k))), Image.LANCZOS))
    im = im.crop(im.getbbox())
    out = Image.new('RGBA', SIZE); grounded = anchor != 'hang'
    if anchor == 'hang':
        x, y = CX - im.width / 2, HANG_Y - fist_top(im)
    else:
        m, _, ref = anchor.partition('@')
        target = metric(Image.open(FRAMES / KEY / f'{ref}.png'), m) if ref else idle_metric(m)
        x, y = target - metric(im, m), SOLE - im.height - lift
    out.alpha_composite(im, (int(round(x)), int(round(y))))
    q = np.array(out)
    for part in components(q[:, :, 3] > 0):
        if len(part) < 30:
            q[part[:, 0], part[:, 1]] = 0
    out = edges(Image.fromarray(q), look=KEY)
    if grounded:  # soles on the sheet cells' last row (SOLE - 1), whatever the outline pass added
        dy = SOLE - lift - out.getbbox()[3]
        if dy:
            q = np.zeros_like(np.array(out)); src = np.array(out)
            q[max(0, dy):SIZE[1] + min(0, dy)] = src[max(0, -dy):SIZE[1] - max(0, dy)]; out = Image.fromarray(q)
    return out


def register(manifest, folder=None, selected=None):
    """Build the m_* cells into `folder` (default assets/frames/nr_neta) and point the manifest's states at them."""
    specs = {st: spec for st, spec in STATES.items() if selected is None or st in selected}
    needed = {c[0] for spec in specs.values() for c in spec if not isinstance(c, str) and c[0] != '@'}
    for strip in list(needed):
        k = STRIPS[strip][1]
        if isinstance(k, tuple) and k[0] == 'like':
            needed.add(k[1])
    poses = {s: slice_strip(SRC / f'{s}.png', n) for s, (n, _) in STRIPS.items() if s in needed and (SRC / f'{s}.png').exists()}
    folder = Path(folder or FRAMES / KEY); folder.mkdir(parents=True, exist_ok=True)
    for old in folder.glob('m_*.png') if selected is None else [f for st in specs for f in folder.glob(f'm_{st}_*.png')]:
        old.unlink()
    states = manifest.setdefault(KEY, {})
    for st, spec in specs.items():
        files = []
        for j, c in enumerate(spec):
            if isinstance(c, str):
                files.append(f'{KEY}/{c}.png'); continue
            if c[0] != '@' and c[0] not in poses:
                break
            name = f'm_{st}_{j:02d}.png'; cell(*c, poses).save(folder / name); files.append(f'{KEY}/{name}')
        else:
            states[st] = files
            continue
        print('skip', st, '(source missing)')
    for st, src in ALIAS.items():
        if src in states and any('/m_' in f for f in states[src]):
            states[st] = list(states[src])
    # Sheet cells a move state re-registered or replaced (e.g. i_03, k_12) are no longer referenced: drop them.
    used = {f.split('/')[-1] for v in states.values() for f in v}
    for old in folder.glob('[a-z]_[0-9][0-9].png') if selected is None else []:
        if old.name not in used:
            old.unlink()
    print('nr_neta moves', {s: len(states[s]) for s in specs if s in states})
    return manifest


def main():
    import sys
    selected = set(sys.argv[1:]) or None
    if selected and not selected <= STATES.keys():
        raise ValueError('Unknown states: ' + ', '.join(selected - STATES.keys()))
    path = FRAMES / 'manifest.json'
    with open(FRAMES / '.manifest.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest = json.loads(path.read_text())
        # register() re-registers sheet cells and then prunes them, so rebuild them first.
        from build_train_neta import CAST, build
        if selected is None:
            build(KEY, CAST[KEY], manifest)
        register(manifest, selected=selected)
        path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
