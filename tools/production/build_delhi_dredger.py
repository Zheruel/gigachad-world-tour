"""Register THE THEKEDAR and the dredger's grab, sludge and thrown props from GPT sheets.

Sources in assets/sources/production/stages/dirty_delhi/dredger/, 4x4 cells:
The Thekedar is a scrawny, stooped crane operator who drags a wrench too heavy for him.
thekedar_a  idle 0-1, taunt 2, walkie call 3, walk 4-11, hurt high/low 12-13, down 14, block 15
thekedar_b  wrench windup/swing/raise/slam 0-3, sack lift/throw 4-5, gloat 6, crushed 7,
            leap 8, landing 9, cower 10, victory 11, cab lever/yank/shout/glass hit 12-15
thekedar_c  get-up 0-3, daze 4-7, sand-blind 8-9, launched 10, wrench stuck 11, cab moods 12-15
thekedar_d  cab spit/jeer 0-1, ladder climb 2-5, flinch 6-7, overbalanced 8, winded 9,
            knocked off the ladder 10, standing jeer/spit 13-14 (11, 12 and 15 unused)
grab        clamshell closed/half/open/dump 0-3, stuck/full/battered/wrecked 4-7,
            sludge blob/splat/puddle/dry 8-11, wrench 12-13, sand sack/burst 14-15
One scale for every Thekedar sheet (MATCH trims a sheet drawn larger); soles on one line, pelvis anchored except floor, air
and cab poses. Every grab cell hangs from the same hazard plate, so the cable never jumps.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from keying import key, components
from build_train_conductor import clean, pelvis_x, scaled

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/dredger'
FRAMES = ROOT / 'assets/frames'
SIZE, SOLE = (400, 300), 293
WALK = 160  # walk-cycle height at 2x (stooped, a head under CHAD); CHAD stands 178
STATES = {
    'idle': [('a', 0), ('a', 1)], 'taunt': [('a', 2)], 'call': [('a', 3)], 'walk': [('a', i) for i in range(4, 12)],
    'hurt': [('a', 12), ('a', 13)], 'down': [('a', 14)], 'block': [('a', 15)],
    'wrench': [('b', i) for i in range(4)], 'sack': [('b', 4), ('b', 5)], 'gloat': [('b', 6)], 'crushed': [('b', 7)],
    'leap': [('b', 8)], 'land': [('b', 9)], 'cower': [('b', 10)], 'victory': [('b', 11)], 'cab': [('b', i) for i in range(12, 16)],
    'getup': [('c', i) for i in range(4)], 'stagger_polish': [('c', i) for i in range(4, 8)], 'sandblind': [('c', 8), ('c', 9)],
    'fall': [('c', 10)], 'stuck': [('c', 11)], 'cabmood': [('c', i) for i in range(12, 16)],
    'cabjeer': [('d', 0), ('d', 1)], 'climb': [('d', i) for i in range(2, 6)], 'flinch': [('d', 6), ('d', 7)],
    'wobble': [('d', 8)], 'winded': [('d', 9)], 'falloff': [('d', 10)], 'jeer': [('d', 13), ('d', 14)],
}
STATE_K = {'stagger_polish': .84}  # state: scale trim where a sheet's cells were drawn larger than the fighter (the daze stood a head over his idle)
MATCH = {}  # sheet: scale trim to sheet a after review at gameplay scale (head and slipper size)
FLOOR = {('a', 14), ('b', 7), ('b', 8), ('c', 0), ('c', 1), ('c', 10), ('d', 10)} | {('b', i) for i in range(12, 16)} | {('c', i) for i in range(12, 16)} | {('d', 0), ('d', 1)}
GRAB = ['closed', 'half', 'open', 'dump', 'stuck', 'full', 'battered', 'wrecked']
FX = {'blob': 8, 'splat': 9, 'puddle': 10, 'dry': 11, 'wrench': 12, 'wrench_b': 13, 'sack': 14, 'burst': 15}
GRAB_W, GRAB_CANVAS, SHACKLE = 196, (300, 320), 8   # closed grab width at 2x; shackle top row


def sheet_cells(path, min_part=30):
    a = clean(np.array(key(Image.open(path)))); h, w = a.shape[:2]
    groups = {i: [] for i in range(16)}
    for part in components(a[:, :, 3] > 24):
        if len(part) >= min_part:
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
        c = a.copy(); c[~keep] = 0; im = Image.fromarray(c); out[i] = im.crop(im.getbbox())
    return out


def register(im, k, floor, size=SIZE, sole=SOLE):
    im = scaled(im, k); out = Image.new('RGBA', size)
    x = size[0] / 2 - (im.width / 2 if floor else pelvis_x(im))
    out.alpha_composite(im, (round(x), sole - im.height))
    q = np.array(out)
    for part in components(q[:, :, 3] > 0):
        if len(part) < 24:
            q[part[:, 0], part[:, 1]] = 0
    return Image.fromarray(q)


def stripe(im):
    """Centre x and top y of the yellow-and-black hazard plate every grab cell carries."""
    q = np.array(im).astype(int); y = (q[:, :, 3] > 64) & (q[:, :, 0] > 170) & (q[:, :, 1] > 120) & (q[:, :, 2] < 90)
    ys, xs = np.where(y); return float(np.median(xs)), int(np.percentile(ys, 2))


def main():
    manifest = json.loads((FRAMES / 'manifest.json').read_text())
    sheets = {s: sheet_cells(SRC / f'thekedar_{s}.png') for s in 'abcd' if (SRC / f'thekedar_{s}.png').exists()}
    k = WALK / np.median([sheets['a'][i].height for i in range(4, 12)])
    k = {s: k * MATCH.get(s, 1) for s in sheets}
    folder = FRAMES / 'dl_thekedar'; folder.mkdir(exist_ok=True)
    for old in folder.glob('*.png'):
        old.unlink()
    states, written = {}, set()
    for state, refs in STATES.items():
        refs = [(s, i) for s, i in refs if s in sheets and i in sheets[s]]
        if not refs:
            continue
        for s, i in refs:
            stem = f'{s}_{i:02d}'
            if stem not in written:
                q = np.array(register(sheets[s][i], k[s] * STATE_K.get(state, 1), (s, i) in FLOOR)); r, gg, b = (q[:, :, c].astype(int) for c in range(3))
                pink = (q[:, :, 3] > 0) & (r > gg + 10) & (b > gg + 10)  # key-tinted sand spray and dizzy rings
                lum = (r * .3 + gg * .59 + b * .11) / 255
                q[pink, :3] = (np.clip(lum[pink] * 1.1, 0, 1)[:, None] * np.array([226, 196, 150])).astype(np.uint8)
                Image.fromarray(q).save(folder / f'{stem}.png'); written.add(stem)
        states[state] = [f'dl_thekedar/{s}_{i:02d}.png' for s, i in refs]
    manifest['dl_thekedar'] = states
    # The grab: one scale, the shackle on one point, so the cable never jumps between cells.
    g = sheet_cells(SRC / 'grab.png'); kg = GRAB_W / g[0].width
    folder = FRAMES / 'dl_grab'; folder.mkdir(exist_ok=True)
    for old in folder.glob('*.png'):
        old.unlink()
    grab = {}
    _, plate = stripe(scaled(g[0], kg)); plate += SHACKLE  # where the plate sits under the shackle
    for i, name in enumerate(GRAB):
        im = scaled(g[i], kg); out = Image.new('RGBA', GRAB_CANVAS); sx, sy = stripe(im)
        out.alpha_composite(im, (round(GRAB_CANVAS[0] / 2 - sx), plate - sy))
        q = np.array(out); r, gg, b = (q[:, :, c].astype(int) for c in range(3))
        pink = (q[:, :, 3] > 0) & (r > gg + 10) & (b > gg + 10)  # rose-tinted steam off the key
        lum = (r * .3 + gg * .59 + b * .11).clip(0, 255).astype(np.uint8)
        for c in range(3):
            q[:, :, c][pink] = lum[pink]
        Image.fromarray(q).save(folder / f'{name}.png'); grab[name] = [f'dl_grab/{name}.png']
    for name, i in FX.items():
        im = scaled(g[i], kg * (.55 if name.startswith(('wrench', 'sack', 'burst')) else .8)); out = Image.new('RGBA', (im.width + 8, im.height + 8))
        out.alpha_composite(im, (4, 4)); out.save(folder / f'{name}.png'); grab[name] = [f'dl_grab/{name}.png']
    manifest['dl_grab'] = grab
    # Boss-bar portrait: the registered idle head, so the HUD face is the fighter's face.
    idle = Image.open(FRAMES / 'dl_thekedar/a_00.png'); q = np.array(idle)[:, :, 3] > 64
    ys, xs = np.where(q); top = int(ys.min()); cx = int(np.median(xs[ys < top + 40]))
    head = idle.crop((cx - 32, top - 4, cx + 32, top + 60)); pic = Image.new('RGBA', head.size, (18, 13, 16, 255))
    pic.alpha_composite(head); pic.convert('RGB').resize((48, 48), Image.LANCZOS).save(ROOT / 'assets/ui/portrait_thekedar.png')
    (FRAMES / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n')
    print({s: round(v, 3) for s, v in k.items()}, round(kg, 3), sorted(states))
    # The fight in-betweens and finisher frames live in these folders too: re-register them after the rebuild.
    import build_dredger_finish; build_dredger_finish.main()
    import build_dredger_phases; build_dredger_phases.main()   # the magnet, scrap, hook frames and the embedded stuck grab


if __name__ == '__main__':
    main()
