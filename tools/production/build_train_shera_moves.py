"""Run-2 Shera (nr_neta_guard) cells on top of his sheets, called by build_train_neta.py after the sheet cells.

Sources in assets/sources/production/stages/night_train/neta/:
guard_r<x>.png   GPT edits of guard_<x> (a, b, c, e, f): the same 16 cells and poses in his phase-2 look (strong
                 red-orange flush with veins, torn vest, ripped trousers). Registered as r<x>_NN like the sheet cells,
                 scaled cell by cell to the calm sheet so the two looks swap without a size pop.
shera/<name>.png  true-alpha one-row strips, facing right, one pose per figure (new moves). Registered as <name>_NN.
Every derivable calm state gets a `rage_<state>` twin.
"""
from pathlib import Path
import numpy as np
from PIL import Image
import build_train_neta as B
from build_train_passengers import cells, scaled
from keying import components

KEY = 'nr_neta_guard'
RAGE = {'ra': 'a', 'rb': 'b', 'rc': 'c', 're': 'e', 'rf': 'f'}
# Calm-only states (cash business, the finisher and the battered roof epilogue) get no enraged twin. Flex is not one:
# it is also the enraged quake tell.
CALM_ONLY = {'finisher', 'battered', 'pay', 'count', 'catch', 'pocket', 'taunt', 'point', 'stoop'}
# Enraged states the fight asks for by name, picked from the edited sheets.
RAGE_PICK = {'rage_hurt': [('ra', 14), ('rc', 15)], 'rage_out': [('re', 8), ('re', 9)]}

# name -> source strip, pose count, scale to 2x game size, planted poses (register on the boots), per-pose sole
# nudges (px at 2x, + = down) and the states it feeds (pose indices). Strips are split on the n largest blobs.
STRIPS = {
    'palm': dict(n=4, k=.50, feet={0, 1, 2, 3}, states={'palmcatch': [0, 1, 2, 3]}),                    # tell, catch, pull, headbutt
    'shove': dict(n=4, k=.48, states={'shove': [0, 1], 'stumble': [2], 'stumble_recover': [3]}),
    'hug': dict(n=6, k=.62, states={'hug': [0, 1, 2, 3, 4, 5]}),                     # spread, lunge, squeeze x2, slam x2
    'roar': dict(n=3, k=.42, states={'roar': [0, 2], 'rage_roar': [1, 2]}),          # calm brace, enraged brace, roar
    'chain': dict(n=5, k=.60, states={'chain': [0, 1, 2, 3, 4]}),                    # rip, windup, sweep x2, snag (own forearm)
    'hurl': dict(n=3, k=.52, states={'hurl': [0, 1, 2]}),                            # grab, lift, throw; trunk = prop_nr_case size
    'rage_palm': dict(n=4, k=.485, twin='palm', states={'rage_palmcatch': [0, 1, 2, 3]}),
    'rage_shove': dict(n=4, k=.475, twin='shove', states={'rage_shove': [0, 1], 'rage_stumble': [2], 'rage_stumble_recover': [3]}),
    'rage_hug': dict(n=6, k=.62, twin='hug', states={'rage_hug': [0, 1, 2, 3, 4, 5]}),
}
STRIP_SRC = B.SRC / 'shera'


def base(s, i):
    return (RAGE.get(s, s), i)


def split(path, n):
    """One-row strip -> n poses left to right (each the n largest blobs plus the specks nearest it)."""
    a = np.array(Image.open(path).convert('RGBA')); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0)
    comps = sorted((c for c in components(a[:, :, 3] > 0) if len(c) >= 40), key=len, reverse=True)
    seeds = sorted(comps[:n], key=lambda c: c[:, 1].mean()); cx = [c[:, 1].mean() for c in seeds]
    groups = [[c] for c in seeds]
    for c in comps[n:]:
        groups[int(np.argmin([abs(c[:, 1].mean() - v) for v in cx]))].append(c)
    out = []
    for g in groups:
        m = np.zeros(a.shape[:2], bool)
        for c in g:
            m[c[:, 0], c[:, 1]] = True
        q = a.copy(); q[~m] = 0; im = Image.fromarray(q); out.append(im.crop(im.getbbox()))
    return out


def anchor(im, s, i, spec):
    """The sheet builder's horizontal anchor for cell (s, i)."""
    return (im.width / 2 if (s, i) in B.FLOOR['guard'] else B.feet_x(im) if (s, i) in B.FEET
            else B.body_x(im, spec['band'], 'guard'))


def twin(im, calm, x_calm, floor):
    """Anchor for an enraged edit of a calm pose: keep the calm cell's boots (or, lying down, its box centre) in place."""
    if floor:
        return im.width / 2
    return B.feet_x(im) - (B.feet_x(calm) - x_calm)


def fit(im, size, x):
    """Widen the canvas symmetrically when a long reach (chain, lunge) would clip; the anchor stays centred."""
    half = int(np.ceil(max(x, im.width - x))) + 8
    return (max(size[0], 2 * half), size[1])


def register(manifest):
    spec = B.CAST[KEY]; folder = B.FRAMES / KEY; size, sole = spec['size'], spec['sole']
    for old in [*folder.glob('r[a-z]_[0-9][0-9].png'), *(f for n in STRIPS for f in folder.glob(f'{n}_[0-9][0-9].png'))]:
        old.unlink()
    # Enraged sheet edits: scale each to its calm sheet cell by cell (median height ratio), then register the same way.
    have = {r: s for r, s in RAGE.items() if (B.SRC / f'guard_{r}.png').exists()}
    if have:
        sheets = {s: cells(B.SRC / f'guard_{s}.png') for s in {*have.values(), 'a'}}
        sheets.update({r: cells(B.SRC / f'guard_{r}.png') for r in have})
        med = lambda s, ids: np.median([sheets[s][i].height for i in ids])
        k = {'a': spec['walk'] / med('a', range(4, 12))}
        for s, (ids, ref, trim) in B.REF['guard'].items():
            if s in sheets:
                k[s] = k['a'] * med('a', ref) / med(s, ids) * trim
        for r, s in have.items():
            common = [i for i in sheets[s] if i in sheets[r] and base(r, i) not in B.FLOOR['guard']]
            k[r] = k[s] * float(np.median([sheets[s][i].height / sheets[r][i].height for i in common]))
        done = set()
        states = {f'rage_{st}': refs for st, refs in spec['states'].items() if st not in CALM_ONLY}
        states = {st: [(('r' + s), i) for s, i in refs] for st, refs in states.items() if all('r' + s in have for s, _ in refs)}
        states.update({st: refs for st, refs in RAGE_PICK.items() if all(s in have for s, _ in refs)})
        for st, refs in states.items():
            for r, i in refs:
                if (r, i) in done or i not in sheets[r]:
                    continue
                s = have[r]; im = scaled(sheets[r][i], k[r] * B.TRIM.get((s, i), 1))
                calm = scaled(sheets[s][i], k[s] * B.TRIM.get((s, i), 1))
                x = twin(im, calm, anchor(calm, s, i, spec), (s, i) in B.FLOOR['guard'])
                B.place(im, size, sole, x, None, KEY).save(folder / f'{r}_{i:02d}.png'); done.add((r, i))
            manifest[KEY][st] = [f'{KEY}/{r}_{i:02d}.png' for r, i in refs if (r, i) in done]
        print('rage', {r: round(v, 3) for r, v in k.items() if r in have})
    # New move strips (calm strips first: their enraged twins copy the registration).
    placed = {}
    for name, st in STRIPS.items():
        path = STRIP_SRC / f'{name}.png'
        if not path.exists():
            continue
        poses = split(path, st['n']); k = st['k'] * B.SHERA_SCALE; mate = placed.get(st.get('twin'))
        if mate:  # enraged edit of a calm strip: its scale from the calm poses' heights, pose by pose
            k = STRIPS[st['twin']]['k'] * B.SHERA_SCALE * float(np.median([c.height / p.height for c, p in zip(mate['src'], poses)]))
        placed[name] = {'src': poses, 'cells': []}
        for j, pose in enumerate(poses):
            im = scaled(pose, k)
            if mate:  # boots land where the calm pose's boots do
                x = twin(im, *mate['cells'][j], False)
            else:
                x = B.feet_x(im) if j in st.get('feet', ()) else B.body_x(im, spec['band'], 'guard')
                x += st.get('dx', {}).get(j, 0)
            placed[name]['cells'].append((im, x))
            canvas = fit(im, size, x)
            B.place(im, canvas, sole + st.get('dy', {}).get(j, 0), x, None, KEY).save(folder / f'{name}_{j:02d}.png')
        for state, ids in st['states'].items():
            manifest[KEY][state] = [f'{KEY}/{name}_{j:02d}.png' for j in ids]
        print(name, len(poses), 'poses, k', round(k, 3))
    import build_shera_finisher  # finisher victim cells (rage_finish), owned by the finisher builder
    build_shera_finisher.register(manifest)
    # Headless finisher cells (build_shera_decap.py) stay registered when the sheets are rebuilt.
    decap = [f'decap_{i:02d}.png' if (folder / f'decap_{i:02d}.png').exists() else f'fin_{i:02d}.png' for i in range(11)]
    if any(f.startswith('decap_') for f in decap):
        manifest[KEY]['rage_decap'] = [f'{KEY}/{f}' for f in decap]
    return manifest
