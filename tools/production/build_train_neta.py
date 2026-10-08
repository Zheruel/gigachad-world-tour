"""Register the Night Train final boss duo, Netaji and his bodyguard Shera, from their GPT sheets.

Sources in assets/sources/production/stages/night_train/neta/, 4x4 cells, facing right:
guard_a  idle 0-1, block 2, hook windup 3, walk 4-11, hook 12, backhand 13, hurt 14, down 15
guard_b  hammer windup/smash/recover 0-2, charge brace/run 3-5, wall-crash 6, quake jump/land 7-8,
         count cash 9-10, catch bundle 11, pocket it 12, flex 13, pay-me taunt 14, gut hurt 15
guard_c  get-up 0-3, daze 4-7, launched 8, guard break 9, kneel 10, palm out 11, neck crack 12,
         knuckle crack 13, point 14, hit from behind 15
guard_d  finisher reactions 0-8 (offer, empty hand, doubled, head whipped, woozy, uppercut, rising,
         falling, KO), then battered: haul up 9, kneel 10, limp 11-12, palm out 13, shoved 14, topple 15
neta_a   idle 0-1, briefcase block 2, aim 3, waddle 4-11, fire 12, head hurt 13, belly hurt 14, down 15
neta_b   get-up 0-3, daze 4-7, launched 8, cower 9, peek 10, pull cash 11, lob 12, scurry 13-14, panic 15
neta_c   briefcase swing 0-2, grit fling 3, backpedal 4-5, reload 6, kneel offer 7, fling 8, pistol whip 9,
         guard break 10, laugh 11, shove 12, point 13, fan 14, slap bundle 15
neta_d   look back 0, trip 1, belly-flop 2, hands and knees 3, crawl 4-7, kneel up 8, climb 9-12,
         pant 13, cornered 14, sit dazed 15
neta_e   knockout reactions 0-9, wobble 10, swat 11, hide 12, clutch 13, finger wag 14, mop brow 15
guard_e  walk 0-7 (contact/down/passing/up), daze 8-11, hammer windup/smash/recover in the hook stance 12-14,
         quake landing 15
guard_f  turn from behind 0, front-on 1, bull paw 2, run 3-4, skid 5, pre-jump squat 6, stomp 7, rise 8,
         hammer tremble 9, hook retract 10, low pay palm 11, neck crack 12, knuckle crack 13, face hit 14, pick up 15
guard_g  battered (drawn facing left, mirrored here): haul over the roof edge 0-2 (cut at the edge), kneel 3,
         push up 4, sway 5, limp 6-8, head rub 9, palm at chest height 10, shocked 11
guard_h  pay: near palm open at belt height 0, the same palm holding the brick 1
neta_f   walk 0-7, scurry 8-11, backpedal 12-15
neta_g   level fire 0, cornered 1, pistol-whip 2, panic 3, grit 4, shove 5, kneel offer/fling 6-7, laugh 8,
         fan 9, pull/lob standing 10-11, shod climb 12-13, pant 14, idle 15 (revolver always in the front hand)
neta_h   shod ladder climb 4-7 (fists on the rungs), idle 12-15
neta_i   punch-drunk wobble 2-3 (shades crooked), idle 12-15
neta_l   reload 0-3, shove wind-up/contact/recoil hop 4-6, laugh 7, rise from kneel 8, pistol-whip contact 9,
         gantry duck 10, dusting hands 11, lean-out peek 12, balance wobble 13
neta_k   garland pluck 0, grit fling 1, grit wind-up 2, lob 12-15 (revolver tucked, case on the rear wrist,
         one planted stance so the toss and the grit never shift his feet)
props    cash bricks 0-2, medal note 3, rupee pendant 4, loafer 5, briefcase 6-7, revolver 8,
         knuckles 9, vest scrap 10, torn note 11, shades 12-13, garland heap 14, casing 15
Each costume keeps one scale per sheet (walk cycle on sheet a; standing poses match the others to it)
and stands on one sole line anchored on the body so nothing swims between frames.
"""
from pathlib import Path
import fcntl
import json
import numpy as np
from PIL import Image, ImageOps
from build_train_passengers import cells, scaled
from keying import components
from sprite_edges import edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/neta'
FRAMES = ROOT / 'assets/frames'
STAGE = ROOT / 'assets/stages/night_train/rebuild'
r = lambda s, *ids: [(s, i) for i in ids]
SHERA_SCALE = 113 / 135  # every Shera strip scale (sheets, move strips, finisher) is authored for 135 px
# runtime set -> sheet prefix, canvas, sole line, walk height at 2x (CHAD stands 178), body band, states
CAST = {
    # Shera stands 113 logical px (~1.2x CHAD; SHERA_SCALE of the 135 px run-2 build) on the 135 px canvas.
    'nr_neta_guard': dict(prefix='guard', size=(552, 410), sole=402, walk=round(278 * SHERA_SCALE), band=(.62, .88), states={
        'idle': r('a', 0, 1), 'block': r('a', 2), 'walk': r('e', *range(8)), 'hook': r('a', 3, 12, 13) + r('f', 10),
        'hurt': r('a', 14) + r('c', 15), 'down': r('a', 15), 'getup': r('c', 0, 1, 2, 3), 'stagger_polish': r('e', 8, 9, 10, 11),
        'fall': r('c', 8), 'guardbreak': r('c', 9), 'hammer': r('e', 12, 13, 14) + r('f', 9), 'crash': r('b', 6),
        'quake': r('b', 7) + r('e', 15) + r('f', 6, 7, 8), 'count': r('b', 9, 10), 'catch': r('b', 11), 'pocket': r('b', 12), 'flex': r('b', 13),
        'taunt': r('b', 14), 'gut': r('b', 15), 'kneel': r('c', 10),
        'point': r('c', 14), 'finisher': r('d', *range(9)),
        'battered': r('g', 3, 6, 8, 10) + r('d', 14, 15) + r('g', 4, 5, 7, 9, 11),
        'turn': r('f', 0, 1), 'charge': r('b', 3, 4, 5) + r('f', 2, 3, 4, 5), 'pay': r('h', 0, 1), 'neck': r('c', 12) + r('f', 12),
        'knuckles': r('c', 13) + r('f', 13), 'facehit': r('f', 14), 'stoop': r('f', 15),
    }),
    'nr_neta': dict(prefix='neta', size=(400, 300), sole=293, walk=166, band=(.5, .9), states={
        'idle': r('a', 0, 1), 'block': r('a', 2), 'aim': r('a', 3), 'walk': r('f', *range(8)), 'fire': r('g', 0),
        'hurt': r('a', 13, 14), 'down': r('a', 15), 'getup': r('b', 0, 1, 2, 3), 'stagger_polish': r('b', 4, 5, 6, 7),
        'fall': r('b', 8), 'cower': r('b', 9), 'lob': r('k', 12),
        'scurry': r('f', 8, 9, 10, 11), 'panic': r('g', 3), 'swing': r('c', 0, 1, 2), 'grit': r('k', 2, 1), 'backpedal': r('f', 12, 13, 14, 15),
        'reload': r('c', 6) + r('l', 0, 1, 2, 3), 'kneel': r('g', 6, 7) + r('l', 8), 'whip': r('g', 2) + r('l', 9),
        'guardbreak': r('c', 10), 'laugh': r('g', 8) + r('l', 7), 'shove': r('g', 5) + r('l', 4, 5, 6),
        'dust': r('l', 11), 'balance': r('l', 13), 'point': r('c', 13), 'fan': r('g', 9), 'slap': r('c', 15),
        'flee': r('d', *range(9)), 'climb': r('h', 4, 5, 6, 7), 'pant': r('g', 14),
        'cornered': r('g', 1), 'sit': r('d', 15),
        'ko': r('e', *range(10)), 'wobble': r('i', 2, 3), 'clutch': r('e', 13),
        'wag': r('e', 14), 'mop': r('e', 15),
    }),
}
# sheet -> (its standing cells, sheet a cells they match, trim): the same standing height sets the ratio.
REF = {
    'guard': {'b': ([10, 12, 14], [4, 5, 6, 7, 8, 9, 10, 11], 1.02), 'c': ([4, 5, 6, 7], [4, 5, 6, 7, 8, 9, 10, 11], 1.02),
              'd': ([0, 1, 4], [4, 5, 6, 7, 8, 9, 10, 11], 1.0), 'e': ([0, 1, 2, 3, 4, 5, 6, 7], [4, 5, 6, 7, 8, 9, 10, 11], 1.0),
              'f': ([12, 13], [4, 5, 6, 7, 8, 9, 10, 11], .99), 'g': ([5, 9, 10, 11], [4, 5, 6, 7, 8, 9, 10, 11], .955),
              'h': ([0, 1], [0, 1], 1.0)},
    'neta': {'b': ([4, 5, 6, 7], [0, 1], 1.0), 'c': ([13, 14, 15], [0, 1], 1.0), 'd': ([0, 14], [0, 1], 1.0),
             'e': ([13, 14, 15], [0, 1], 1.0), 'f': (list(range(8)), list(range(4, 12)), 1.0), 'g': ([15], [0, 1], 1.0),
             'l': ([3, 11], [0, 1], 1.0), **{s: ([12, 13, 14, 15], [0, 1], 1.0) for s in 'hik'}},
}
# Lying, airborne or hanging cells: centred on their bounding box instead of the body.
FLOOR = {'guard': {('g', 0), ('g', 1), ('g', 2), ('a', 15), ('c', 0), ('c', 8), ('d', 6), ('d', 7), ('d', 8), ('d', 9), ('d', 14), ('d', 15)},
         'neta': {('a', 15), ('b', 0), ('b', 8), ('d', 1), ('d', 2), ('d', 3), ('d', 4), ('d', 5), ('d', 6), ('d', 7),
                  *(('e', i) for i in range(2, 10))}}
# Ladder cells hang from the rungs: x on the torso (the kurta between chest and hips), y on the far fist
# (HANG_TOP px above the sole line) so the grip stays on a rung while the legs change.
# GPT drew these bigger than their sheet's reference row: scale each to the height of the named cell.
MATCH = {('k', 0): ('k', 12), ('k', 1): ('k', 12), ('k', 2): ('k', 12)}
# Extra per-cell scale: the old battered shove/topple cells were drawn a size up from the rest of sheet d.
TRIM = {('d', 14): .92, ('d', 15): .92}
# Sheets drawn facing left: mirrored on import so every registered cell faces right.
MIRROR = {'guard': 'g'}
TORSO = HANG = {('h', 4), ('h', 5), ('h', 6), ('h', 7)}
HANG_TOP = 154
# Shera's planted-feet poses (stance, pound string, quake landing) register on the midpoint of his boots so
# neither foot slides from the hooks into the hammer.
FEET = {('k', 0), ('k', 1), ('k', 2), ('k', 12), ('a', 0), ('a', 1), ('a', 2), ('a', 3), ('a', 12), ('a', 13), ('e', 12), ('e', 13), ('e', 14), ('e', 15), ('c', 10), ('f', 9), ('f', 10), ('h', 0), ('h', 1)}


def feet_x(im):
    a = np.array(im)[:, :, 3] > 64; ys, xs = np.where(a); bottom = ys.max()
    sel = ys >= bottom - im.height * .05
    return (xs[sel].min() + xs[sel].max()) / 2


def body_x(im, band, prefix):
    """Horizontal body anchor: median of the body's pixels in a height band (thighs for Shera, the kurta for
    Netaji so the briefcase and the revolver arm never pull it)."""
    a = np.array(im); solid = a[:, :, 3] > 64
    if prefix == 'neta':
        rr, g, b = (a[:, :, k].astype(int) for k in range(3))
        cream = solid & (rr > 165) & (g > 150) & (b > 110) & (rr - b < 90) & (abs(rr - g) < 40)
        if cream.sum() > 200:
            solid = cream
    ys, xs = np.where(solid); top, bottom = ys.min(), ys.max()
    sel = (ys >= top + (bottom - top) * band[0]) & (ys <= top + (bottom - top) * band[1])
    return float(np.median(xs[sel] if sel.any() else xs))


def fist_top(im):
    """Top of the far (left, gun-free) fist of a climbing cell."""
    a = np.array(im)[:, :im.width // 2, 3] > 64
    return int(np.where(a.any(1))[0][0])


def place(im, size, sole, x_anchor, top=None, look=None):
    out = Image.new('RGBA', size)
    out.alpha_composite(im, (round(size[0] / 2 - x_anchor), sole - im.height if top is None else sole + top))
    q = np.array(out)
    for part in components(q[:, :, 3] > 0):
        if len(part) < 30:
            q[part[:, 0], part[:, 1]] = 0
    return edges(Image.fromarray(q), look=look)  # tone (TONE), clean key fringe, closed dark outline


def build(key, spec, manifest):
    p = spec['prefix']
    sheets = {s: cells(SRC / f'{p}_{s}.png') for s in 'abcdefghikl' if (SRC / f'{p}_{s}.png').exists()}
    for s in MIRROR.get(p, ''):
        sheets[s] = {i: ImageOps.mirror(im) for i, im in sheets[s].items()}
    med = lambda s, ids: np.median([sheets[s][i].height for i in ids])
    k = {'a': spec['walk'] / med('a', range(4, 12))}
    for s, (ids, ref, trim) in REF[p].items():
        k[s] = k['a'] * med('a', ref) / med(s, ids) * trim
    folder = FRAMES / key; folder.mkdir(exist_ok=True)
    for old in folder.glob('[a-z]_[0-9][0-9].png'):  # sheet cells only; m_* cells belong to build_train_neta_moves
        old.unlink()
    for refs in spec['states'].values():
        for s, i in refs:
            out = folder / f'{s}_{i:02d}.png'
            if out.exists():
                continue
            im = scaled(sheets[s][i], k[s] * TRIM.get((s, i), 1) * (sheets[MATCH[s, i][0]][MATCH[s, i][1]].height / sheets[s][i].height if (s, i) in MATCH else 1))
            x = (im.width / 2 if (s, i) in FLOOR[p] else body_x(im, (.22, .5), p) if p == 'neta' and (s, i) in TORSO
                 else feet_x(im) if (s, i) in FEET and (p == 'guard' or s == 'k') else body_x(im, spec['band'], p))
            place(im, spec['size'], spec['sole'], x, -HANG_TOP - fist_top(im) if p == 'neta' and (s, i) in HANG else None, key).save(out)
    manifest[key] = {st: [f'{key}/{s}_{i:02d}.png' for s, i in refs] for st, refs in spec['states'].items()}
    print(key, {s: round(v, 3) for s, v in k.items()})


def props():
    """16 props in 128px slots at 2x (longest side 120), plus the lair relic (the open cash briefcase)."""
    sheet = cells(SRC / 'props.png'); strip = Image.new('RGBA', (128 * 16, 128))
    for i in range(16):
        im = sheet[i]; s = 120 / max(im.size); im = edges(scaled(im, s))
        strip.alpha_composite(im, (i * 128 + (128 - im.width) // 2, (128 - im.height) // 2))
    strip.save(STAGE / 'neta_props.png')
    relic = sheet[7]; relic = edges(scaled(relic, 40 / relic.width)); relic.save(STAGE / 'relic_neta.png')


def main(only=None):
    """`build_train_neta.py nr_neta_guard` rebuilds one cast set only (no props)."""
    path = FRAMES / 'manifest.json'
    with open(FRAMES / '.manifest.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest = json.loads(path.read_text())
        for key, spec in CAST.items():
            if not only or key in only:
                build(key, spec, manifest)
                if key == 'nr_neta':  # run-2 Netaji moves (climb, run, roof moveset, prop fixes) on top of the sheets
                    from build_train_neta_moves import register
                    register(manifest)
                if key == 'nr_neta_guard':  # run-2 Shera: enraged sheet edits and the new move strips
                    from build_train_shera_moves import register as register_shera
                    register_shera(manifest)
        path.write_text(json.dumps(manifest, indent=2) + '\n')
    if not only:
        props()


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
