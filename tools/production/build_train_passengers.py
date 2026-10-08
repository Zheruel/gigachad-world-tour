"""Register the Night Train's regular enemies from their GPT sheets.

Each character has two 4x4 sheets in assets/sources/production/stages/night_train/passengers/:
<name>_a (idle, block, walk, attack, hurt, down) and <name>_b (get-up, daze, launch, specials); an optional <name>_c adds extra poses. Every pose keeps one scale per sheet and stands on
one sole line, anchored on the pelvis so nothing swims between frames.
Usage: build_train_passengers.py [name ...]  (default: every family)
"""
from pathlib import Path
import fcntl
import json
import numpy as np
from PIL import Image
from keying import key, components
from build_station_life import despill
from build_vendor_kitchen import degrade
from brass_badge import brass, plates
from sprite_edges import edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/passengers'
FRAMES = ROOT / 'assets/frames'
SIZE, SOLE = (360, 300), 293
# source name -> (runtime set, walk-cycle height in 2x pixels; shield/trunk carriers include their load)
CAST = {
    'brawler': ('nr_brawler', 164), 'chai': ('nr_chai', 162), 'paan': ('nr_paan', 152), 'tte': ('nr_tte', 176),
    'rack': ('nr_rack', 156), 'commando': ('nr_commando', 170), 'captain': ('nr_captain', 178),
}
UNARMED = {}
# Families with a third sheet of extra poses (<name>_c); its scale matches these upright cells to the idle on sheet a.
EXTRA_SHEET = {'paan': [0, 1, 2, 15]}
A = {'idle': [0, 1], 'block': [2], 'jump': [6], 'walk': list(range(4, 12)), 'atk': [3, 12, 13], 'hurt': [14], 'down': [15]}
B = {'getup': [0, 1, 2, 3], 'stagger_polish': [4, 5, 6, 7], 'fall': [8]}
C = {}
EXTRA = {
    # Sheet e: one short walking step (contact, toe-off, trail, trail, lift, passing, knee-up, reach, reach, heel strike) looped, so
    # the planted foot is locked with his walkBeat. Sheet d: a two-beat taunt. Sheet c: hurt and down with the gamcha
    # tied on, and every move's own wind-up:
    # atk = cocked fist, lead jab, rear cross, guard; kick = knee chamber, extension, recoil; shove = crouched palms.
    'brawler': {'walk': [('e', i) for i in (0, 1, 2, 3, 4, 8, 5, 6, 9, 7)], 'jump': [('d', 1)], 'hurt': [('c', 8), ('b', 9)], 'down': [('c', 9)],
                'atk': [('c', 10), ('a', 12), ('c', 11), ('a', 0)], 'shove': [('c', 15), ('b', 10)], 'taunt': [('d', 8), ('d', 9)],
                'kick': [('c', 13), ('b', 15), ('c', 14)],
                'super_reaction': [('b', 9), ('c', 8), ('b', 12), ('b', 9), ('b', 13), ('b', 8), ('b', 8), ('c', 9)]},
    # One prop layout throughout: open can in the back hand, strap can at the hip, paper cup in the front hand.
    # The lob reads atk 1 (wind-up) then 2 (release); the bonk swings over the top (c 1) before it lands.
    # He stays down in the pose his get-up starts from. Sheet c: bonk mid-swing, super recoils; d: daze sway loop, taunt (a mock toast, then a laugh);
    # w: walk, near leg leading on row 1 (contact, toe-off, passing), far leg leading on row 2 (contact, passing, reach).
    'chai': {'walk': [('w', 0), ('w', 1), ('w', 2), ('w', 7), ('e', 1), ('w', 6)], 'down': [('b', 0)], 'dead': [('f', 0)], 'atk': [('a', 3), ('b', 13), ('b', 14)], 'swing': [('a', 3), ('c', 1), ('a', 12), ('a', 13)],
             'hurt': [('a', 14), ('b', 9)], 'taunt': [('d', 4), ('d', 5)], 'stagger_polish': [('d', i) for i in range(4)], 'reload': [('b', 11), ('b', 12)], 'hop': [('b', 15)],
             'super_reaction': [('c', 7), ('a', 14), ('c', 4), ('c', 7), ('c', 5), ('b', 8), ('c', 6), ('b', 0)]},
    # Sheet c: pop, three chew beats, inhale / expel / follow-through, two-cell wipe and taunt, one-box jab, hurt recovery, a super recoil.
    'paan': {'atk': [('a', 3), ('a', 12), ('c', 10)], 'hurt': [('a', 14), ('c', 12)], 'pop': [('c', 13), ('c', 14)],
             'chew': [('c', 0), ('c', 1), ('c', 2)], 'puff': [('c', 3)], 'spit': [('c', 4), ('c', 5)], 'wipe': [('c', 6), ('c', 7)],
             'taunt': [('c', 8), ('c', 9)],
             'super_reaction': [('b', 9), ('c', 11), ('a', 14), ('b', 9), ('b', 8), ('b', 8), ('b', 8), ('a', 15)]},
    # Sheet c: trunk-dash second stride and skid (0-1), slam lift and recovery (2-3), disarmed stumble (4-5), trunk pickup (6),
    # a stepping walk (8-15). Sheet d re-draws every trunk-carrying reaction with the full-size trunk: down (0), flight (1),
    # daze (2-5), overhead and impact (6-7), taunts (8-9), recoils (10-12), dash contact (13), sitting up (15).
    # Sheet e: a trunk-less shuffle (0-7), setting the trunk down / taking it up for the taunt (8-9), trunk-less recoils (10-11),
    # kneeling and sitting with the trunk (12-13), trunk-less look-round (14).
    # Sheet t is the trunk alone, drawn by the game when a guard break knocks it loose.
    'tte': {'walk': [('c', i) for i in range(8, 16)], 'hurt': [('d', 11), ('b', 15)], 'down': [('d', 0)], 'fall': [('d', 1)],
            'getup': [('d', 0), ('d', 15), ('b', 2), ('b', 3)], 'stagger_polish': [('d', i) for i in range(2, 6)],
            'bump': [('b', 9), ('b', 10), ('c', 0), ('d', 13), ('c', 1)],
            'guardbreak': [('b', 11)], 'disarmed': [('c', 4), ('c', 5)], 'pickup': [('c', 6), ('b', 3)],
            'slam': [('c', 2), ('d', 6), ('d', 7), ('c', 3)], 'taunt': [('d', 8), ('d', 9)], 'trunk': [('t', i) for i in range(4)],
            'shuffle': [('e', i) for i in range(8)], 'settrunk': [('g', 0), ('g', 1)], 'dhurt': [('e', 10), ('e', 11)], 'dlook': [('e', 14)], 'tbarge': [('e', 14), ('e', 15), ('e', 7)],
            'super_reaction': [('d', 10), ('d', 11), ('d', 12), ('d', 11), ('d', 1), ('d', 1), ('d', 1), ('d', 0)]},
    # Sheet c: perch breath/glance/flinch (0-3), berth leap (4), pounce (5), unused mantle (6), sack wind-up/strike (7-8),
    # old taunt (9-10), low and high recoils (11-12), uppercut launch (13), old down (14), slinging (15).
    # Sheet d: a walk with passing steps (0-7); sheet e: the climb onto a berth (hang, pull-up, press, knee over; row 1).
    # Sheet f: sack-aloft taunt grin/laugh in one hand (0-7), down in striped shorts (8-11), tipping off a berth (12-15).
    # One pillowcase: in hand, his back is bare.
    'rack': {'walk': [('d', i) for i in range(8)], 'jump': [('c', 4)], 'atk': [('a', 3), ('a', 12), ('c', 8)],
             'hurt': [('a', 14), ('c', 12)], 'hurtlow': [('c', 11)], 'down': [('f', 9)], 'tip': [('f', 13)],
             'perch': [('c', 0), ('c', 1), ('c', 2)], 'perchhurt': [('c', 3)], 'leap': [('c', 4)], 'pounce': [('c', 5)],
             'hang': [('e', 0)], 'climb': [('b', 11)], 'pullup': [('e', 1)], 'mantle': [('e', 2), ('e', 3)], 'drop': [('b', 12)], 'land': [('b', 13)],
             'run': [('b', 14)], 'swing': [('c', 15), ('c', 7), ('c', 8)], 'sling': [('c', 15)], 'taunt': [('f', 1), ('f', 5)],
             'super_reaction': [('c', 11), ('a', 14), ('c', 12), ('a', 14), ('b', 8), ('b', 8), ('c', 13), ('f', 9)]},
    # Sheet w (5x5): the guard walk, 20 cells: two steps of heel strike, toe-off, heel-flick, passing, reach with a GPT
    # in-between after each (even cells the keys, odd the in-betweens), spliced at one scale; WOFF keeps the torso steady
    # and the planted boot receding ~4.5 px a cell (the walk beats in js/enemies.js).
    # Sheet c: re-drawn walk (0-7), chop (8), re-cock (9), lunge coil (10), sweep drop/extend/rise (11-13),
    # baton point taunt (14), second low chop (15). Sheet d (rear-hand redraws): guard (0, scale), baton-point
    # taunt (2), trailing-baton sweep (5), rear-hand lunge thrust (9). The baton never changes hands.
    # Sheet s: guard idle (0, scale), lane side-step (1-2), cover shuffle-step (3-5, unused), deflected recoil (6), reel back (7),
    # hunched catch (8), crouched daze sway (9-11), baton-in-palm taunt (13-14, unused), low lunge recovery (15).
    # Sheet u (3x3): the cover shuffle, one boot sliding while the other stays planted: wide (0), rear boot sliding in a
    # quarter (1, the guard stance nearest the idle's: the end cell) and half way (2), feet together (3), front boot sliding
    # out (4-5).
    # Sheet t: guard (0, scale), taunt: baton raised, slapped into the palm, chin up with it on the shoulder (1-3), side-step
    # planted wide and the far boot drawn in (4-5), baton cocked on the way up (6), wind-up tremble (7, unused: a lurch).
    'commando': {'idle': [('a', 0)], 'walk': [('w', i) for i in range(20)], 'block': [('b', 11)], 'hurt': [('a', 14), ('b', 9)],
                 'call': [('b', 10), ('a', 2)], 'cover': [('b', 11)], 'baton': [('a', 3), ('c', 8), ('c', 9), ('c', 15), ('a', 13)],
                 'lunge': [('c', 10), ('d', 9), ('s', 15)], 'sweep': [('c', 11), ('d', 5), ('c', 13)], 'taunt': [('t', 1), ('t', 2), ('t', 3)],
                 'step': [('u', i) for i in range(6)], 'sidestep': [('s', 1), ('t', 4), ('t', 5), ('s', 2)], 'recoil': [('s', 6)], 'batonup': [('t', 6), ('z', 3)],
                 'stagger_polish': [('s', 7), ('s', 9), ('s', 10), ('s', 8)],
                 'super_reaction': [('b', 9), ('a', 14), ('b', 9), ('b', 9), ('b', 8), ('b', 8), ('b', 8), ('a', 15)]},
    # Sheet k (drawn at the idle's bulk): idle (0, scale), guard side-step: near boot out, wide, far boot in (1-3), taser aim
    # tremble (4, 5 unused), lowering after the shot (6), lowered (7), charge set (8-10, unused: the taser went missing).
    # Sheet j (2x2, scaled to the charge start c 9): charge set behind the shield, rear-boot paw, rock (0-2), taser at the hip.
    # Sheet l: the walk behind the shield, two steps of contact, toe-off, passing, reach (spliced from GPT takes at one scale).
    # Sheet c: old walk, bash coil, charge set + run, radio, shield-rap taunt; sheet d: get-up and hurt with the taser
    # kept in hand, the crash off the carriage end, the guard-break recovery, a second radio call.
    # Sheet v (drawn at the idle's bulk): idle (0, scale), reel and daze with the shield low (1-4), get-up hauling the
    # shield off the floor, kneeling, rising (5-7), radio: handset up, shouting, waving the backup in (8-10), taser
    # recoil (11, unused: too wild), three-stride shield-charge run (12-14). Sheet x (2x2): idle (0, scale), the taser's
    # recoil as the barbs fire (1).
    'captain': {'walk': [('l', i) for i in range(8)], 'jump': [('c', 2)], 'atk': [('c', 8), ('a', 12), ('a', 13)],
                'hurt': [('a', 14), ('d', 2)], 'down': [('d', 0)], 'getup': [('d', 1), ('v', 5), ('v', 6), ('v', 7)], 'taser': [('b', 9), ('b', 10), ('x', 1), ('y', 9), ('k', 6), ('k', 7)],
                'call': [('v', 8), ('v', 9), ('v', 10)], 'charge': [('c', 9), ('v', 12), ('v', 13), ('v', 14)], 'chargeset': [('j', 0), ('j', 1), ('j', 2)],
                'sidestep': [('k', 1), ('k', 2), ('k', 3), ('a', 0)], 'stunned': [('d', 6)],
                'stagger_polish': [('v', 3), ('v', 1), ('v', 2), ('v', 4)],
                'guardbreak': [('b', 13), ('d', 7)], 'taunt': [('c', 13), ('t', 0), ('c', 14)],
                'super_reaction': [('d', 2), ('a', 14), ('b', 13), ('d', 2), ('b', 8), ('b', 8), ('b', 8), ('d', 0)]},
}
# Cells drawn facing the wrong way for their neighbours (the get-up must continue the knockdown).
MIRROR = set()
# Per-sheet scale trims after review at gameplay scale (the daze-to-idle estimate misreads crouched idles).
MATCH = {('rack', 'e'): 1.38, ('commando', 'b'): 1.17, ('commando', 'c'): .96, ('commando', 'w'): .92, ('captain', 'c'): .97, ('captain', 'l'): .927, ('captain', 'k'): .98, ('captain', 'g'): .84, ('tte', 'c'): .96}
UNARMED_EXTRA = {}
# Per-cell scale trims on top of the sheet scale, for single cells drawn smaller than their neighbours.
SCALE = {('captain', 'b', 9): 1.06, ('captain', 'b', 10): 1.06,   # the taser aim at the idle's bulk
         ('commando', 'w', 4): .978, ('commando', 'w', 14): .978,   # straight-leg passing: a 2 px bob, not 4
         ('commando', 'w', 7): 1.03, ('commando', 'w', 19): 1.03,
         ('commando', 'w', 8): .975, ('commando', 'w', 18): .985,
         ('captain', 'y', 9): 1.06, ('captain', 'k', 1): .985, ('captain', 'l', 5): 1.019}   # aim tremble as b 9; side-step and walk head heights   # the reach sits between its neighbours' head heights   # in-betweens drawn crouched: no 3 px dip
# Extra re-drawn sheets per family: letter -> (cells on it, reference sheet, reference cells). The sheet is
# scaled so the median height of its cells matches the reference's; EXTRA then maps states onto it.
MORE = {'rack': {'c': ([8, 12, 15], 'a', [12, 14, 0]), 'd': (range(8), 'a', A['walk']), 'e': ([3, 7, 11, 15], 'c', [0, 1]), 'f': (range(8), 'c', [9, 10])}, 'chai': {'c': ([4], 'a', [14]), 'w': ((0, 1, 2, 4, 6, 7), 'a', A['walk']), 'd': ([1], 'b', [5]), 'e': ([1], 'w', (0, 1, 2, 4, 6, 7))}, 'tte': {'c': (range(8, 16), 'a', A['walk']), 'd': (range(2, 6), 'a', A['idle']), 'e': (range(8), 'c', [5]), 'g': ([1], 'd', [8])}, 'brawler': {'c': (range(8), 'a', A['walk']), 'd': (range(8), 'a', A['walk']), 'e': (range(10), 'a', A['walk'])}, 'commando': {'c': (range(8), 'a', A['walk']), 'd': ([0], 'a', [0]), 'w': (range(20), 'a', A['walk']), 's': ([0], 'a', [0]), 't': ([0], 'a', [0]), 'u': (range(6), 'a', [0])},
        'captain': {'c': (range(8), 'a', A['walk']), 'd': ([12, 13], 'a', A['idle']), 'g': ([0], 'b', [2]), 'l': (range(8), 'a', A['walk']), 't': ([0], 'c', [14]), 'j': ([0], 'c', [9]), 'k': ([0], 'a', [0]), 'v': ([0], 'a', [0]), 'x': ([0], 'a', [0])}}
# Extra sheets drawn on a 2x2 grid instead of 4x4 (the TTE's trunk set-down / lift for his taunt).
GRID = {('commando', 'w'): 5, ('commando', 'u'): 3, ('captain', 'j'): 2, ('captain', 'x'): 2, ('captain', 'g'): 2, ('captain', 't'): 2, ('tte', 'g'): 2}
# Upright cells that stay pelvis-anchored inside a FLOOR state (the standing recoils of a super_reaction).
PELVIS = {('chai', 'c', 4), ('chai', 'c', 7), ('paan', 'b', 9), ('paan', 'c', 11)}
# Registration nudges in 2x pixels after review (a get-up that must continue the knockdown; the brawler's walk
# leans into each push-off so, with his walkBeat timing in js/enemies.js, the planted foot holds still; his front
# kick keeps the standing foot where the knee chamber put it).
# The commando's 20-cell guard walk (2x px): WOFF shifts the cell, WSHEAR leans the body above the belt (head x steady),
# WLEGS swings the legs under the belt so the planted boot recedes an even ~4.5 logical px a cell (the walk beats).
WOFF = [0, 0, -1, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]
WSHEAR = [-1, 0, 0, -2, -1, -1, 0, -1, 2, 1, -2, -2, 1, -1, -1, -2, 1, 2, 5, 2]
WLEGS = [-3, 3, -2, 0, 6, -3, 3, 4, -6, 3, 0, 3, 0, -1, 5, -2, 2, -5, -5, 1]
SHEAR = {**{('commando', 'w', i): (s, l) for i, (s, l) in enumerate(zip(WSHEAR, WLEGS))},
         **{('commando', 'u', i): (0, l) for i, l in enumerate((7, 2, 1, 1, -7, -4))},   # cover shuffle: boot lock at ~6 px beats
         ('captain', 'y', 9): (3, 0), ('commando', 'z', 3): (-3, 0)}   # the baton wind-up drawn back 1.5 px: its tremble   # the taser aim leant 1.5 px into the shot: a tremble on the same boots
# ALIAS: (family, new sheet) -> sheet whose cells it registers again (a variant of a cell under its own keys).
ALIAS = {('captain', 'y'): 'b', ('commando', 'z'): 'a'}
OFFSET = {**{('captain', 'l', i): (dx, 0) for i, dx in enumerate((3, -3, -6, 1, 5, -1, -4, 4))},   # shield walk: boot recedes 9.5-13 px a cell (walkBeat)
          **{('commando', 'w', i): (dx, 0) for i, dx in enumerate(WOFF)},   # guard walk (WOFF above)
          ('commando', 't', 5): (-6, 0),   # side-step feet closing: 3 px back under the planted boot (t_04->t_05 soles 7 -> 4 px, world)
          ('paan', 'b', 0): (-18, 0), **{('brawler', 'e', i): (dx, 0) for i, dx in enumerate((0, 2, -1, -4, -4, 2, -1, 3, -1, 0))}, ('brawler', 'b', 15): (-10, 0), ('tte', 'd', 15): (4, 0), ('tte', 'b', 2): (12, 0),   # get-up: the trunk is dragged in a few px a cell, never jumps
          # TTE walk: small pelvis sway so each planted shoe holds still against a 6px-per-cell floor (measured in world space).
          **{('tte', 'c', 8 + i): (dx, 0) for i, dx in enumerate((0, 4, -3, -1, 2, 1, -6, 6))},
          # TTE disarmed shuffle: same idea against a 10px-per-cell floor (SHUFFLE in js/train_tte.js).
          **{('tte', 'e', i): (dx, 0) for i, dx in enumerate((-1, 9, -4, 1, -5, -2, -2, 2))}}
# Idle breath drawn from the first idle cell: chest and head rise this many 2x pixels over a still belt and
# feet, so the two idle frames register exactly (a second generated cell never lines up to the pixel).
BREATHE = {'chai': 3, 'commando': 4, 'captain': 4, 'tte': 3}
SMEAR = set()  # names whose strike cell (a 12) carries a pink swoosh to strip; the game draws its own
FLOOR = {'down', 'fall', 'perch', 'perchhurt', 'hang', 'climb', 'pullup', 'mantle', 'leap', 'pounce', 'tip', 'drop', 'super_reaction', 'trunk'}  # not pelvis-anchored or not grounded
# Loose-prop sheets per family: letter -> (cells per side, reference cell, its height in 2x px). The TTE's trunk,
# knocked out of his hands, is drawn by the game on its own; its scale matches the trunk he carries.
PROPS = {'tte': {'t': (2, 1, 94)}, 'chai': {'f': (1, 0, 52)}}
# Per-family repaint of every keyed sheet before it is cut (e.g. the TTE's flag-like ribbon becomes a brass plate).
PAINT = {'tte': lambda a: brass(a, 4)}
# Pale badge cards the colour test misses, by rough box on the source sheet (the TTE's sheet b draws them white and saffron).
PLATES = {('tte', 'b'): [(424, 169, 435, 185), (784, 134, 793, 151), (1071, 83, 1083, 98), (473, 729, 486, 745), (1066, 709, 1077, 725), (1103, 997, 1114, 1012)],
          ('tte', 'd'): [(94, 1009, 108, 1021)]}


def cells(path, smear=None, grid=4, paint=None):
    a = np.array(key(Image.open(path))); h, w = a.shape[:2]
    if smear is not None:
        r, g, b = (a[:, :, k].astype(int) for k in range(3)); y0, x0 = smear // 4 * h // 4, smear % 4 * w // 4
        pink = (r > 110) & (b > 110) & (g < r - 8) & (g < b - 8)
        pink[:y0] = False; pink[y0 + h // 4:] = False; pink[:, :x0] = False; pink[:, x0 + w // 4:] = False
        a[pink] = 0
    a = degrade(despill(a))
    if paint:
        a = paint(a)
    groups = {i: [] for i in range(grid * grid)}
    for part in components(a[:, :, 3] > 24):
        if len(part) >= 40:
            cy, cx = part.mean(0); groups[min(grid - 1, int(cy // (h / grid))) * grid + min(grid - 1, int(cx // (w / grid)))].append(part)
    out = {}
    for i, parts in groups.items():
        if not parts:
            continue
        # The body and sizeable pieces near it (a flung chappal, tea, a tiffin lid); specks go.
        body = max(parts, key=len); y0, x0 = body.min(0) - 40; y1, x1 = body.max(0) + 40
        keep = np.zeros((h, w), bool)
        for p in parts:
            near = ((p[:, 0] >= y0) & (p[:, 0] <= y1) & (p[:, 1] >= x0) & (p[:, 1] <= x1)).any()
            if p is body or (len(p) >= 300 and near):
                keep[p[:, 0], p[:, 1]] = True
        c = a.copy(); c[~keep] = 0; pose = Image.fromarray(c); out[i] = pose.crop(pose.getbbox())
    return out


def pelvis_x(im):
    a = np.array(im)[:, :, 3] > 64; ys, xs = np.where(a)
    top, bottom = ys.min(), ys.max(); band = (ys >= top + (bottom - top) * .45) & (ys <= top + (bottom - top) * .7)
    return float(np.median(xs[band]))


def scaled(im, k):
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
    a = np.array(im); a[a[:, :, 3] < 40] = 0; a[:, :, 3][a[:, :, 3] > 0] = 255
    return Image.fromarray(degrade(a))


def breathe(im, n):
    """Lift the upper body n px: rows above the chest move n, easing to 0 at the belt (row remap, no resampling)."""
    a = np.array(im); ys = np.where(a[:, :, 3].any(1))[0]; top, bot = ys.min(), ys.max()
    chest, belt = top + (bot - top) * .3, top + (bot - top) * .5
    out = np.zeros_like(a)
    for y in range(a.shape[0]):
        d = n if y < chest else n * (belt - y) / (belt - chest) if y < belt else 0
        src = min(a.shape[0] - 1, round(y + d))
        out[y] = a[src]
    return Image.fromarray(out)


def register(im, k, state, off=(0, 0), shear=(0, 0)):
    im = scaled(im, k); out = Image.new('RGBA', SIZE)
    x = SIZE[0] / 2 - (im.width / 2 if state in FLOOR else pelvis_x(im))
    out.alpha_composite(im, (round(x) + off[0], SOLE - im.height + off[1]))
    q = np.array(out)
    # shear (upper, lower): lean the body above the belt (0 at the belt, `upper` px at the head top) and swing the legs
    # under it (0 at the belt, `lower` px at the soles) - a walk cell's head and boots re-timed without moving the belt
    top = SOLE - im.height; belt = SOLE - round(im.height * .5)
    for y in range(top, SOLE + 1) if any(shear) else ():
        q[y] = np.roll(q[y], round(shear[0] * (belt - y) / (belt - top) if y < belt else shear[1] * (y - belt) / (SOLE - belt)), axis=0)
    for part in components(q[:, :, 3] > 0):
        if len(part) < 30:  # stray specks left by a swoosh or the key
            q[part[:, 0], part[:, 1]] = 0
    return Image.fromarray(q)


def build(name, manifest):
    runtime, height = CAST[name]
    paint = PAINT.get(name)
    def painter(sheet):
        boxes = PLATES.get((name, sheet))
        return (lambda a: plates(paint(a) if paint else a, boxes)) if boxes else paint
    sheets = {'a': cells(SRC / f'{name}_a.png', 12 if name in SMEAR else None, paint=painter('a')), 'b': cells(SRC / f'{name}_b.png', paint=painter('b'))}
    if name in UNARMED or name in EXTRA_SHEET:
        sheets['c'] = cells(SRC / f'{name}_c.png', paint=paint)
    for n, sheet, i in MIRROR:
        if n == name:
            sheets[sheet][i] = sheets[sheet][i].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    med = lambda sheet, ids: np.median([sheets[sheet][i].height for i in ids])
    k = {'a': height / med('a', A['walk'])}
    if name in UNARMED:
        k['c'] = UNARMED[name][1] / med('c', C['walk'])
        # Sheet b is load-free, so its daze loop is measured against the unarmed idle.
        k['b'] = k['c'] * med('c', C['idle']) / med('b', B['stagger_polish']) * .97
    else:
        # Sheet b has no walk: its daze loop stands about as tall as the idle on sheet a.
        k['b'] = k['a'] * med('a', A['idle']) / med('b', B['stagger_polish']) * .97
    if name in EXTRA_SHEET:
        k['c'] = k['a'] * med('a', A['idle']) / med('c', EXTRA_SHEET[name])
    for sheet in k:
        k[sheet] *= MATCH.get((name, sheet), 1)
    for sheet, (ids, ref, ref_ids) in MORE.get(name, {}).items():
        sheets[sheet] = cells(SRC / f'{name}_{sheet}.png', grid=GRID.get((name, sheet), 4), paint=painter(sheet))
        k[sheet] = k[ref] * med(ref, ref_ids) / med(sheet, ids) * MATCH.get((name, sheet), 1)
    for (n, alias), src in ALIAS.items():   # a second registration of a sheet's cells (its own SHEAR/OFFSET keys)
        if n == name:
            sheets[alias], k[alias] = sheets[src], k[src]
    for sheet, (grid, i, px) in PROPS.get(name, {}).items():
        sheets[sheet] = cells(SRC / f'{name}_{sheet}.png', grid=grid)
        k[sheet] = px / sheets[sheet][i].height
    sets = {runtime: {**{s: [('a', i) for i in ids] for s, ids in A.items()}, **{s: [('b', i) for i in ids] for s, ids in B.items()}, **EXTRA[name]}}
    if name in UNARMED:
        shared = {s: sets[runtime][s] for s in ('getup', 'stagger_polish', 'fall', 'jump', 'down')}
        sets[UNARMED[name][0]] = {**shared, **{s: [('c', i) for i in ids] for s, ids in C.items()}, **UNARMED_EXTRA[name]}
    for key, states in sets.items():
        folder = FRAMES / key; folder.mkdir(exist_ok=True)
        for old in folder.glob('*.png'):
            old.unlink()
        for refs in states.values():
            for sheet, i in refs:
                if not (folder / f'{sheet}_{i:02d}.png').exists():
                    state = 'idle' if (name, sheet, i) in PELVIS else next(s for s, r in states.items() if (sheet, i) in r)
                    pose = register(sheets[sheet][i], k[sheet] * SCALE.get((name, sheet, i), 1), state, OFFSET.get((name, sheet, i), (0, 0)), SHEAR.get((name, sheet, i), (0, 0)))
                    edges(pose, look=key).save(folder / f'{sheet}_{i:02d}.png')  # tone (TONE), clean key fringe, closed dark outline
        manifest[key] = {s: [f'{key}/{sh}_{i:02d}.png' for sh, i in refs] for s, refs in states.items()}
        if name in BREATHE and key == runtime:
            first = manifest[key]['idle'][0]
            edges(breathe(Image.open(FRAMES / first), BREATHE[name])).save(folder / 'idle_breath.png')
            manifest[key]['idle'] = [first, f'{key}/idle_breath.png']
            # the breath replaces the second idle cell: drop it unless another state still uses it
            used = {f for refs in manifest[key].values() for f in refs}
            for p in folder.glob('*.png'):
                if f'{key}/{p.name}' not in used:
                    p.unlink()
    print(name, {s: round(v, 3) for s, v in k.items()})


def main(names=None):
    path = FRAMES / 'manifest.json'
    # Families are polished in parallel: hold the manifest for the whole read-build-write.
    with open(FRAMES / '.manifest.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest = json.loads(path.read_text())
        for name in names or CAST:
            build(name, manifest)
        path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    import sys
    main(sys.argv[1:])
