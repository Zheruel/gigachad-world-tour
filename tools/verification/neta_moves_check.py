"""Netaji (nr_neta) cell QA: registration, foot-onion pairs, edges on dark/light, game-scale sheets and loops.

  .venv/bin/python tools/verification/neta_moves_check.py [--out DIR] [--preview DIR]

--preview DIR reads m_* cells and states.json from a preview build (build_train_neta_moves.register into DIR)
instead of assets/frames. Writes to DIR/check (default tmp/review/neta_moves): one 2x sheet per state on the real
plate next to CHAD (96 px), onion pairs, edges_dark_light.png and a 2x GIF per animated state. Exits 1 on a failure:
missing/odd-sized cells, a grounded cell off the sole row, or an onion pair whose planted feet move > 3 logical px.
"""
import argparse
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
FR = ROOT / 'assets/frames'
PLATES = ROOT / 'tmp/review/shera_rework/audit_netaji'
FONT = ImageFont.truetype('/System/Library/Fonts/Menlo.ttc', 13)
CHAD = FR / 'chad_sidle1.png'
SOLE = 293
# (state a, index, state b, index, metric): consecutive cells whose planted feet must not jump.
PAIRS = [
    ('idle', 0, 'hurt', 0, 'feet'), ('hurt', 0, 'hurt', 1, 'feet'), ('hurt', 1, 'idle', 0, 'feet'),
    ('getup', 1, 'getup', 2, 'feet'), ('getup', 3, 'idle', 0, 'feet'),
    ('wobble', 1, 'idle', 0, 'feet'), ('wobble', 0, 'wobble', 1, 'feet'),
    ('walk', 7, 'backpedal', 0, 'low'), ('backpedal', 3, 'walk', 0, 'low'), ('walk', 0, 'idle', 0, 'low'),
    ('swing_full', 4, 'idle', 0, 'feet'), ('idle', 0, 'swing_full', 0, 'back'), ('whip_full', 2, 'idle', 0, 'back'),
    ('idle', 0, 'whip_full', 0, 'back'), ('shove_full', 2, 'idle', 0, 'back'), ('grit_full', 2, 'idle', 0, 'back'),
    ('idle', 0, 'grit_full', 0, 'back'),
    ('dizzy', 3, 'idle', 0, 'back'), ('guardbreak', 0, 'dizzy', 0, 'back'),
    ('shout', 2, 'shout', 0, 'feet'), ('draw', 0, 'aim', 0, 'feet'), ('idle', 0, 'draw', 0, 'feet'),
]
# Cells that are not standing on the sole row (lying, climbing, airborne run poses are allowed a lift).
OFF_SOLE = {'climb_back': {0, 1, 2, 3}, 'down': {0}, 'fall': {0}, 'r_trip': {0, 1, 2, 4}, 'r_tantrum': {0, 1, 3, 4}}  # roof stumble/tantrum hops; flat or stomping poses sit up to 1 px high
PLATE = {'climb_start': 'private', 'climb_back': 'private', 'flee_run': 'private', 'flee_glance': 'private', 'shout': 'private'}


def metric(a, m):
    ys, xs = np.nonzero(a); top, bot = ys.min(), ys.max(); h = bot - top
    if m == 'low':
        return xs[ys >= bot - h * .2].mean()
    sel = ys >= bot - max(3, h * .04); fx = xs[sel]
    return fx.min() if m == 'back' else (fx.min() + fx.max()) / 2


def plate(kind, s):
    p = PLATES / f'plate_{kind}_{s}x.png'
    return Image.open(p).convert('RGBA') if p.exists() else Image.new('RGBA', (480 * s, 270 * s), (70, 52, 60, 255))


def blit(dst, cell, x, y, s, face=1):
    if face < 0:
        cell = cell.transpose(Image.FLIP_LEFT_RIGHT)
    if s == 1:
        cell = cell.resize((cell.width // 2, cell.height // 2), Image.LANCZOS)
    w, h = cell.width / s, cell.height / s
    dst.alpha_composite(cell, (int(round((x - w / 2) * s)), int(round((y - h + 4) * s))))


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--out'); ap.add_argument('--preview'); ap.add_argument('--states')
    o = ap.parse_args()
    man = json.loads((FR / 'manifest.json').read_text())['nr_neta']
    pre = Path(o.preview) if o.preview else None
    if pre:
        man = {**man, **json.loads((pre / 'states.json').read_text())}
    out = Path(o.out or (pre / 'check' if pre else ROOT / 'tmp/review/neta_moves')); out.mkdir(parents=True, exist_ok=True)

    def load(f):
        p = pre / Path(f).name if pre and (pre / Path(f).name).exists() and Path(f).name.startswith('m_') else FR / f
        return Image.open(p).convert('RGBA')
    fails = []
    cells = {st: [load(f) for f in fs] for st, fs in man.items()}
    focus = o.states.split(',') if o.states else [s for s, fs in man.items() if any(Path(f).name.startswith('m_') for f in fs)]
    for st in focus:
        for i, c in enumerate(cells.get(st, [])):
            if c.size != (400, 300):
                fails.append(f'{st}[{i}] size {c.size}')
            b = c.getbbox()
            if b and b[3] != SOLE and i not in OFF_SOLE.get(st, set()):
                fails.append(f'{st}[{i}] bottom {b[3]} (sole row {SOLE - 1})')
    # climb: the highest fist sits on one row in every hand-over-hand cell, so a rung-stepped y keeps the grip
    tops = [int(np.nonzero((np.array(c)[:, :, 3] > 64).any(1))[0][0]) for c in cells.get('climb_back', [])]
    if tops and max(tops) - min(tops) > 2:
        fails.append(f'climb_back fist rows {tops}')
    # onion pairs
    rows = []
    for a, i, b, j, m in PAIRS:
        if a not in cells or b not in cells or (a not in focus and b not in focus):
            continue
        A, B = cells[a][i % len(cells[a])], cells[b][j % len(cells[b])]
        d = (metric(np.array(B)[:, :, 3] > 64, m) - metric(np.array(A)[:, :, 3] > 64, m)) / 2
        ok = abs(d) <= 3
        if not ok:
            fails.append(f'onion {a}[{i}]->{b}[{j}] {m} {d:+.1f} px')
        tint = lambda c, col: Image.fromarray(np.dstack([np.full(c.size[::-1] + (3,), col, np.uint8), (np.array(c)[:, :, 3] * .55).astype(np.uint8)]))
        im = Image.new('RGBA', (400, 330), (28, 28, 34, 255)); im.alpha_composite(tint(A, (230, 90, 80))); im.alpha_composite(tint(B, (80, 200, 230)))
        ImageDraw.Draw(im).text((4, 304), f'{a}[{i}]>{b}[{j}] {m} {d:+.1f}px {"ok" if ok else "FAIL"}', font=FONT, fill=(255, 255, 120) if ok else (255, 80, 80))
        rows.append(im)
    if rows:
        n = 5; sh = Image.new('RGBA', (400 * n, 330 * ((len(rows) + n - 1) // n)))
        for k, im in enumerate(rows):
            sh.alpha_composite(im, ((k % n) * 400, (k // n) * 330))
        sh.convert('RGB').save(out / 'onion_pairs.png')
    # per-state sheets at 2x and loops
    chad = Image.open(CHAD).convert('RGBA'); frames_all = []
    for st in focus:
        cs = cells[st]; kind = PLATE.get(st, 'roof'); y = 240 if kind == 'private' else 214
        panels = []
        for i, c in enumerate(cs):
            p = plate(kind, 2); blit(p, chad, 150, y, 2); blit(p, c, 215, y, 2)
            p = p.crop((90 * 2, (y - 150) * 2, 300 * 2, (y + 12) * 2)); ImageDraw.Draw(p).text((4, 4), f'{st}[{i}] {Path(man[st][i]).name}', font=FONT, fill=(255, 255, 120))
            panels.append(p)
        sh = Image.new('RGBA', (sum(p.width for p in panels), panels[0].height)); x = 0
        for p in panels:
            sh.alpha_composite(p, (x, 0)); x += p.width
        sh.convert('RGB').save(out / f'state_{st}_2x.png')
        if len(panels) > 1:
            fr = [p.convert('RGB').convert('P', palette=Image.ADAPTIVE, colors=255) for p in panels]
            fr[0].save(out / f'loop_{st}_2x.gif', save_all=True, append_images=fr[1:], duration=110, loop=0, disposal=2)
        frames_all += [c for c, f in zip(cs, man[st]) if Path(f).name.startswith('m_')]
    if frames_all:
        crops = [c.crop(c.getbbox()) for c in frames_all]; W = sum(c.width + 6 for c in crops) + 6; H = max(c.height for c in crops) + 12
        per = 12; lines = [crops[k:k + per] for k in range(0, len(crops), per)]
        W = max(sum(c.width + 6 for c in l) + 6 for l in lines)
        sh = Image.new('RGBA', (W, 2 * H * len(lines)))
        for li, l in enumerate(lines):
            for bi, bg in enumerate(((30, 30, 36, 255), (225, 225, 225, 255))):
                y0 = (li * 2 + bi) * H; sh.paste(bg, (0, y0, W, y0 + H)); x = 6
                for c in l:
                    sh.alpha_composite(c, (x, y0 + H - 6 - c.height)); x += c.width + 6
        sh.convert('RGB').save(out / 'edges_dark_light.png')
    print(f'{len(focus)} states checked -> {out}')
    for f in fails:
        print('FAIL', f)
    sys.exit(1 if fails else 0)


if __name__ == '__main__':
    main()
