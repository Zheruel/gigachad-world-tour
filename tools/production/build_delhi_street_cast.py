"""Register Dirty Delhi's street cast (the ic_ families of the Delhi waves) from GPT sheets.

Sources in assets/sources/production/stages/dirty_delhi/street_cast/, 4x4 cells facing right:
<name>_a  idle 0-1, block 2, attack windup 3, walk 4-11, strike 12, recovery 13, hurt 14, down 15
<name>_b  get-up 0-3, daze 4-7, launched 8, hurt low 9, specials 10-15 (EXTRA below)
<name>_c  more specials (snatcher: dodge, taunt, carry, spun; thela: push walk 0-7 behind the cart
          rig, ram 8-10, stuck 11, shove 12-13, belly barge 14-15)
<name>_d  redraws that keep the props in the right hands: idle 0 (scale reference), then per EXTRA
<name>_e  second redraws, idle 0 then: snatcher stab lunge 1-2; cook cooker smash 1-2; cricketer hurt
          low 1; crew block 1
Same registration as the night-train passengers: one scale per sheet, one sole line, pelvis anchored.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from build_train_passengers import cells, register, FRAMES

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/street_cast'
# source name -> (runtime set, walk-cycle height in 2x pixels); CHAD stands 178
CAST = {
    'tout': ('ic_brawler', 170), 'snatcher': ('ic_runner', 162), 'cricketer': ('ic_enforcer', 180),
    'thela': ('ic_heavy', 184), 'cook': ('ic_kitchen', 168), 'crew': ('ic_docker', 170),
}
A = {'idle': [0, 1], 'block': [2], 'walk': list(range(4, 12)), 'atk': [3, 12, 13], 'hurt': [14], 'down': [15]}
B = {'getup': [0, 1, 2, 3], 'stagger_polish': [4, 5, 6, 7], 'fall': [8]}
a = lambda *ids: [('a', i) for i in ids]
b = lambda *ids: [('b', i) for i in ids]
c = lambda *ids: [('c', i) for i in ids]
d = lambda *ids: [('d', i) for i in ids]
e = lambda *ids: [('e', i) for i in ids]
EXTRA = {
    'tout': {'hurt': a(14) + b(9), 'grab': d(1) + b(12), 'taunt': b(11),
             'super_reaction': b(9) + a(14) + b(13, 9, 8, 14, 8) + a(15)},
    'snatcher': {'atk': a(3) + e(2) + a(13), 'getup': b(0, 1) + d(2) + b(2), 'hurt': a(14) + d(3), 'run': b(10, 11, 12, 11), 'kick': b(13), 'snatch': b(14), 'carry': b(15) + c(2),
                 'dodge': c(0), 'taunt': c(1)},
    'cricketer': {'hurt': a(14) + e(1), 'stagger_polish': d(1, 2, 3, 4), 'charge': d(5), 'taunt': b(11), 'slam': b(12, 13), 'stuck': b(14),
                  'super_reaction': e(1) + a(14) + b(8) + e(1) + b(8, 15, 8) + a(15)},
    'thela': {'hurt': a(14) + b(9), 'call': b(10), 'taunt': b(11), 'push': c(*range(8)), 'ram': c(8, 9, 10),
              'stuck': c(11), 'shove': c(12, 13), 'barge': c(14, 15),
              'super_reaction': b(9) + a(14) + b(12, 9, 13, 14, 8) + a(15)},
    'cook': {'atk': a(3) + e(1, 2), 'hurt': a(14) + d(2), 'whistle': b(10, 11), 'jet': d(3, 3), 'reseal': b(14),
             'taunt': b(15), 'super_reaction': d(2) + a(14) + b(8) + d(2) + b(8) + a(14) + b(8) + a(15)},
    'crew': {'block': e(1), 'hurt': a(14) + b(9), 'throw': b(10, 11), 'lever': b(12), 'taunt': b(13),
             'super_reaction': b(9) + a(14) + b(8, 9, 8, 14, 8) + b(15)},
}
# Sheet c has no idle: these upright cells stand about as tall as the idle on sheet a.
C_UPRIGHT = {'snatcher': [1], 'thela': [12]}
MATCH = {('snatcher', 'b'): 1.05, ('snatcher', 'c'): 1.05}  # (name, sheet): scale trim after review at gameplay scale
FLOOR_STATES = {'down', 'fall', 'super_reaction'}


def wood(im):
    """The push poses came with a blue handle stub between the fists: it becomes the cart's wood."""
    q = np.array(im); r, g, b = (q[:, :, c].astype(int) for c in range(3))
    blue = (q[:, :, 3] > 0) & (b > r + 30) & (b > g + 20)
    lum = (r * .3 + g * .59 + b * .11) / 255
    q[blue, :3] = (np.clip(lum[blue] * 1.2, 0, 1)[:, None] * np.array([150, 96, 52])).astype(np.uint8)
    return Image.fromarray(q)


def build(name, manifest):
    runtime, height = CAST[name]
    sheets = {s: cells(SRC / f'{name}_{s}.png') for s in 'abcde' if (SRC / f'{name}_{s}.png').exists()}
    med = lambda sheet, ids: np.median([sheets[sheet][i].height for i in ids])
    k = {'a': height / med('a', A['walk'])}
    # Sheet b has no walk: its daze loop stands about as tall as the idle on sheet a.
    k['b'] = k['a'] * med('a', A['idle']) / med('b', B['stagger_polish']) * .97
    if 'c' in sheets:
        k['c'] = k['a'] * med('a', A['idle']) / med('c', C_UPRIGHT[name])
    for s in 'de':  # redraw sheets open on the same idle as sheet a
        if s in sheets:
            k[s] = k['a'] * sheets['a'][0].height / sheets[s][0].height
    for sheet in k:
        k[sheet] *= MATCH.get((name, sheet), 1)
    states = {**{s: a(*ids) for s, ids in A.items()}, **{s: b(*ids) for s, ids in B.items()}, **EXTRA[name]}
    folder = FRAMES / runtime; folder.mkdir(exist_ok=True)
    for old in folder.glob('*.png'):
        old.unlink()
    for state, refs in states.items():
        for sheet, i in refs:
            path = folder / f'{sheet}_{i:02d}.png'
            if not path.exists():
                im = register(sheets[sheet][i], k[sheet], 'down' if state in FLOOR_STATES else state)
                (wood(im) if (name, sheet) == ('thela', 'c') else im).save(path)
    manifest[runtime] = {s: [f'{runtime}/{sh}_{i:02d}.png' for sh, i in refs] for s, refs in states.items()}
    print(name, {s: round(v, 3) for s, v in k.items()})


def main(names=None):
    path = FRAMES / 'manifest.json'; manifest = json.loads(path.read_text())
    for name in names or CAST:
        build(name, manifest)
    path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
