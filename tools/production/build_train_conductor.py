"""Register the Head Conductor (night-train mid-boss) and his props from eleven GPT sheets.

Sources in assets/sources/production/stages/night_train/conductor/, 4x4 cells, all facing right:
box       idle 0-1, box block 2, count 3, walk 4-11, hurt high/low 12-13, gloat 14, pick up box 15
extra     box idle 0 (scale match), stamp wind-up with the box kept under the arm 1, box idle stamp up 2,
          box-free idle 3-4 (stamp raised in the front hand, as he walks), spare 5
seize     box idle 0 (scale match), seize thrust holding the open box forward 1, lid cracked 2, seize wind-up 3
attacks   stamp raise/slam/press 0-2, seize open/thrust 3-4, set box down 5, box swing 6-8,
          chain reach/yank 9-10, re-hook 11-12, dive 13, sprawl on box 14, point 15
walk      stride with the box 0-7 and without it 8-15 (one scale): contact 0/8, down 1/9, rear foot lifted 2/10
stride_*  in-betweens drawn from walk 2 and walk 0: passing (swing foot beside the planted ankle) 0-3,
          reach (swing foot forward in the air) 4-7, box and box-free. One step: contact, down, lift,
          passing, reach, then contact again with the other leg; walk beats in train_conductor.js
free      (box on the floor) idle 0-1, block 2, hurt 3/13, chain look-up 4, chain reach/yank 5-6,
          re-hook 7-8, stamp raise/slam/press 9-11, point 12
misc      get-up 0-3, daze 4-7, down 8, VOID stun 9, seated count/look 10-11, rise 12, demand 13
finisher  fare-paid reactions 0-11, cash box closed/open 12-13, stamp 14, wad 15
hazards   mail sack 0, card drawer 1, ticket cabinet 2, ledgers 3, hazard toolbox 4, tiffin hamper 5,
          stamp tray 6, spilled bin 7 (none may read as the navy contraband trunk)
One scale per sheet: the box sheet's walk sets it (CHAD stands 178 at 2x) and each other sheet is
matched through a standing pose it shares with the box sheet. Soles on one line, pelvis anchored
except floor and airborne poses.
"""
from pathlib import Path
import fcntl
import json
import numpy as np
from PIL import Image
from keying import key, components
from build_station_life import despill
from sprite_edges import edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/conductor'
FRAMES = ROOT / 'assets/frames'
STAGE = ROOT / 'assets/stages/night_train/rebuild'
SIZE, SOLE = (400, 300), 293
WALK = 176
SHEETS = ('box', 'walk', 'stride_box', 'stride_free', 'extra', 'seize', 'attacks', 'free', 'misc', 'finisher')
# Stray pieces the sheet draws beside a pose (centre x, y in the source): the finisher's flying
# stamp is its own effect in the game.
DROP = {'finisher': [(317, 717)]}
# Two sets share state names: nr_conductor holds the box, nr_conductor_free has dropped it.
SHARED = {
    'pickup': [('box', 15)], 'dive': [('attacks', 13)], 'sprawl': [('attacks', 14)],
    'getup': [('misc', i) for i in range(4)], 'stagger_polish': [('misc', i) for i in range(4, 8)],
    'down': [('misc', 8)], 'void': [('misc', 9)], 'finisher': [('finisher', i) for i in range(12)],
}
BOX = {
    'idle': [('box', 0), ('box', 1)], 'block': [('box', 2)], 'count': [('box', 3)],
    'walk': [('walk', 0), ('walk', 1), ('walk', 2), ('stride_box', 1), ('stride_box', 7)], 'hurt': [('box', 12), ('box', 13)], 'victory': [('box', 14)],
    'stamp': [('extra', 1), ('attacks', 1), ('attacks', 2)], 'seize': [('seize', 3), ('seize', 1)],
    'swing': [('attacks', i) for i in (6, 7, 8)], 'chain': [('attacks', 9), ('attacks', 10)],
    'rehook': [('attacks', 11), ('attacks', 12)], 'point': [('attacks', 15)], **SHARED,
}
FREE = {
    'idle': [('extra', 3), ('extra', 4)], 'block': [('free', 2)], 'hurt': [('free', 3), ('free', 13)],
    'walk': [('walk', 8), ('walk', 9), ('walk', 10), ('stride_free', 0), ('stride_free', 4)], 'stamp': [('free', i) for i in (9, 10, 11)],
    'chain': [('free', 5), ('free', 6)], 'rehook': [('free', 7), ('free', 8)], 'point': [('free', 12)], **SHARED,
}
# Intro strip (320x240 cells), indices read by train_conductor.js and train.js: seated count,
# seated look, rise x2, idle x2, demand, idle, seated look x2, gloat, count.
INTRO = [('misc', 10), ('misc', 11), ('misc', 12), ('misc', 12), ('box', 0), ('box', 1), ('misc', 13), ('box', 0),
         ('misc', 11), ('misc', 11), ('box', 14), ('box', 3)]
FLOOR = {('attacks', 13), ('attacks', 14), ('misc', 0), ('misc', 1), ('misc', 8)} | {('finisher', i) for i in (8, 9, 10, 11)}
# Standing poses shared with the box sheet (same stance) that carry its scale across.
MATCH = {'extra': (0, 0), 'seize': (0, 0), 'attacks': (15, 0), 'free': (0, 0), 'misc': (13, 0), 'finisher': (2, 0)}
TRIM = {'finisher': .97}   # the startled stance crouches a little


def clean(a):
    """Magenta spill off the rim; purple-tinted edge pixels become neutral."""
    a = despill(a); r, g, b = (a[:, :, k].astype(int) for k in range(3))
    purple = (a[:, :, 3] > 0) & (r > g + 40) & (b > g + 40) & (b > r - 60)
    a[purple & (r * .3 + g * .59 + b * .11 > 150)] = 0
    purple &= a[:, :, 3] > 0
    lum = (r * .3 + g * .59 + b * .11).clip(0, 255).astype(np.uint8)
    for k in range(3):
        a[:, :, k][purple] = lum[purple]
    return a


# Sheets with no green props: a yellow-green rim left where magenta mixed into a gap is keyed out.
DEGREEN = {'extra', 'free', 'attacks', 'misc', 'walk', 'seize'}


def degreen(a):
    r, g, b = (a[:, :, k].astype(int) for k in range(3)); solid = a[:, :, 3] > 0; near = ~solid
    for _ in range(9):
        near = near | np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
    a[solid & near & (g > b + 30) & (g > r)] = 0
    return a


# The extra sheet's box-free idles keep a keyed-magenta smear (purple-grey) in the gap behind the
# receipt ribbon; the conductor has no purple anywhere, so tinted pixels there are background.
DEPURPLE = {'extra'}


def depurple(a, src):
    # Judged on the raw sheet: key() greys out half-magenta pixels, which hides the haze.
    r, g, b = (src[:, :, k].astype(int) for k in range(3))
    a[(r > g + 24) & (b > g + 24) & (abs(r - b) < 90)] = 0
    return a


def desmear(im):
    """Box-free idles: grey haze left in the gap behind the receipt ribbon (rear half only, away from the
    steel chain). Mid-grey, unsaturated pixels near the background go; the cream ribbon, dark cloth, skin
    and gold cuffs are out of range."""
    a = np.array(im); rgb = a[:, :, :3].astype(int); lum = rgb.mean(2); sat = rgb.max(2) - rgb.min(2)
    solid = a[:, :, 3] > 0; near = ~solid
    for _ in range(4):
        near = near | np.roll(near, 1, 0) | np.roll(near, -1, 0) | np.roll(near, 1, 1) | np.roll(near, -1, 1)
    rear = np.zeros_like(solid); rear[:, :int(a.shape[1] * .42)] = True
    olive = rgb[:, :, 2] < rgb[:, :, 1] - 6   # his trousers and coat are olive-black; the haze is not
    a[solid & near & rear & (lum < 205) & (sat < 34) & ((lum > 62) | ((lum > 30) & ~olive))] = 0
    # Then 1px pink/green key specks at the edge and loose pixels (gold cuffs are neither hue; red handle fails pink).
    r, g, b = (rgb[:, :, k] for k in range(3)); solid = a[:, :, 3] > 0
    tint = ((r > g + 12) & (b > g + 8)) | ((g > r + 12) & (g > b + 12))
    edge = ~solid
    edge = edge | np.roll(edge, 1, 0) | np.roll(edge, -1, 0) | np.roll(edge, 1, 1) | np.roll(edge, -1, 1)
    nb = sum(np.roll(np.roll(solid, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - solid
    a[solid & ((edge & tint) | (nb <= 2))] = 0
    # A thin key-glint streak between the stamp fist and the chest: strands with air on opposite sides.
    for _ in range(2):
        air = a[:, :, 3] == 0; solid = ~air
        thin = (np.roll(air, 1, 0) & np.roll(air, -1, 0)) | (np.roll(air, 1, 1) & np.roll(air, -1, 1))
        glint = tint | ((r > 140) & (g > 120) & (b < 110))
        a[solid & thin & glint] = 0
    # ...and the lemon-yellow/pink glint itself, grown in from the air (cuff gold is darker and more orange).
    air = a[:, :, 3] == 0
    lemon = ((r > 190) & (g > r * .88) & (b < 70)) | ((r > 180) & (r > g + 40) & (b > g + 5))
    hit = lemon & (np.roll(air, 1, 0) | np.roll(air, -1, 0) | np.roll(air, 1, 1) | np.roll(air, -1, 1))
    for _ in range(4):
        hit = hit | (lemon & (np.roll(hit, 1, 0) | np.roll(hit, -1, 0) | np.roll(hit, 1, 1) | np.roll(hit, -1, 1)))
    a[hit] = 0
    # Mauve key haze (bg-tinted cloth/ribbon edge): warm grey with blue at least near green; skin, cuffs,
    # cream ribbon, receipts and the red handle all fall outside the band.
    lum2 = rgb.mean(2); mauve = (r - g > 10) & (r - g < 60) & (b >= g - 16) & (lum2 > 90) & (lum2 < 215)
    for _ in range(2):
        air = a[:, :, 3] == 0
        a[mauve & (np.roll(air, 1, 0) | np.roll(air, -1, 0) | np.roll(air, 1, 1) | np.roll(air, -1, 1))] = 0
    solid = a[:, :, 3] > 0
    nb = sum(np.roll(np.roll(solid, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)) - solid
    a[solid & (nb <= 2)] = 0
    return Image.fromarray(a)


def cells(sheet):
    im = Image.open(SRC / f'{sheet}.png'); a = np.array(key(im))
    a = clean(depurple(a, np.array(im.convert('RGB'))) if sheet in DEPURPLE else a)
    if sheet in DEGREEN:
        a = degreen(a)
    h, w = a.shape[:2]
    groups = {i: [] for i in range(16)}
    for part in components(a[:, :, 3] > 24):
        cy, cx = part.mean(0)
        if any(abs(cx - x) < 24 and abs(cy - y) < 24 for x, y in DROP.get(sheet, ())):
            continue
        if len(part) >= 30:
            cy, cx = part.mean(0); groups[min(3, int(cy // (h / 4))) * 4 + min(3, int(cx // (w / 4)))].append(part)
    out = {}
    for i, parts in groups.items():
        if not parts:
            continue
        body = max(parts, key=len); y0, x0 = body.min(0) - 40; y1, x1 = body.max(0) + 40
        keep = np.zeros((h, w), bool)
        for p in parts:
            near = ((p[:, 0] >= y0) & (p[:, 0] <= y1) & (p[:, 1] >= x0) & (p[:, 1] <= x1)).any()
            if p is body or (len(p) >= 60 and near):
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
    return Image.fromarray(a)


def register(im, k, floor, size=SIZE, sole=SOLE):
    im = scaled(im, k); out = Image.new('RGBA', size)
    x = size[0] / 2 - (im.width / 2 if floor else pelvis_x(im))
    out.alpha_composite(im, (round(x), sole - im.height))
    q = np.array(out)
    for part in components(q[:, :, 3] > 0):
        if len(part) < 24:
            q[part[:, 0], part[:, 1]] = 0
    return edges(Image.fromarray(q))  # clean key fringe, closed dark outline


def strip(images, slot):
    """Props side by side in square slots, each centred on the slot floor."""
    out = Image.new('RGBA', (slot * len(images), slot))
    for n, im in enumerate(images):
        out.alpha_composite(im, (n * slot + (slot - im.width) // 2, slot - im.height - 2))
    return out


def main():
    poses = {s: cells(s) for s in SHEETS}
    for i in (3, 4):
        poses['extra'][i] = desmear(poses['extra'][i])
    box = poses['box']; k = {'box': WALK / np.median([box[i].height for i in range(4, 12)])}
    for s, (mine, ref) in MATCH.items():
        k[s] = k['box'] * box[ref].height / poses[s][mine].height * TRIM.get(s, 1)
    # Both walks share one sheet and one scale, so dropping the box never pops his size mid-stride.
    walk = poses['walk']; k['walk'] = WALK / np.median([walk[i].height for i in range(8)])
    # The in-betweens are drawn a little larger: matched to the walk they were drawn from.
    for s, base in (('stride_box', 0), ('stride_free', 8)):
        k[s] = k['walk'] * np.median([walk[base + i].height for i in range(4)]) / np.median([p.height for p in poses[s].values()])
    folder = FRAMES / 'nr_conductor'; folder.mkdir(exist_ok=True)
    for old in folder.glob('*.png'):
        old.unlink()
    sets = {'nr_conductor': BOX, 'nr_conductor_free': FREE}; written = set(); out = {}
    for key, table in sets.items():
        out[key] = {}
        for state, refs in table.items():
            for s, i in refs:
                stem = f'{s}_{i:02d}'
                if stem not in written:
                    register(poses[s][i], k[s], (s, i) in FLOOR).save(folder / f'{stem}.png'); written.add(stem)
            out[key][state] = [f'nr_conductor/{s}_{i:02d}.png' for s, i in refs]
    path = FRAMES / 'manifest.json'
    with open(FRAMES / '.manifest.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest = json.loads(path.read_text()); manifest.update(out)
        path.write_text(json.dumps(manifest, indent=2) + '\n')
    intro = Image.new('RGBA', (320 * len(INTRO), 240))
    for n, (s, i) in enumerate(INTRO):
        intro.alpha_composite(register(poses[s][i], k[s], False, (320, 240), 233), (n * 320, 0))
    intro.save(STAGE / 'conductor_intro.png')
    # Props at gameplay scale (drawn at half size like the frames).
    fin = poses['finisher']
    kb = 72 / fin[12].width  # as wide as the box he lifts in the pick-up pose
    edges(scaled(fin[12], kb)).save(STAGE / 'conductor_box.png')
    edges(scaled(fin[13], kb)).save(STAGE / 'conductor_box_open.png')
    edges(scaled(fin[14], 44 / fin[14].width)).save(STAGE / 'conductor_stamp.png')
    edges(scaled(fin[15], 36 / fin[15].height)).save(STAGE / 'conductor_wad.png')
    # Sliding office hazards share one scale: the card drawer is knee high on CHAD, low enough to jump.
    haz = cells('hazards'); kh = 92 / haz[1].width
    strip([edges(scaled(haz[i], kh)) for i in range(8)], 128).save(STAGE / 'conductor_hazards.png')
    print({s: round(v, 3) for s, v in k.items()}, round(kh, 3))
    print('hazards', [(round(h.width * kh / 2), round(h.height * kh / 2)) for h in (haz[i] for i in range(8))])


if __name__ == '__main__':
    main()
