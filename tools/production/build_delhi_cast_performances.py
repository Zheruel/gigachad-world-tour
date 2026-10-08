"""Register the approved Delhi cast without changing other families.

GPT sources: performances/<family>/{locomotion,combat,reactions}.png.
Default grid: 4×4; registration.json _layout and _count support longer cycles.
Preview first; --register updates the manifest under its shared lock.
With --only, replace only the states supplied by that reviewed sheet.
"""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw
from keying import components
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/dirty_delhi/street_cast'
OUT = ROOT / 'tmp/review/delhi-cast/production'
SIZE, SOLE = (360, 300), 293
FAMILIES = {'brawler': 'ic_brawler', 'snatcher': 'ic_runner', 'enforcer': 'ic_enforcer',
            'heavy': 'ic_heavy', 'kitchen': 'ic_kitchen', 'docker': 'ic_docker'}
loc = lambda *ids: [('locomotion', i) for i in ids]
act = lambda *ids: [('combat', i) for i in ids]
react = lambda *ids: [('reactions', i) for i in ids]
unarmed = lambda *ids: [('unarmed', i) for i in ids]
grab = lambda *ids: [('grab', i) for i in ids]
COMMON = {'revamp_idle': loc(0), 'idle': loc(0, 1), 'block': loc(2), 'walk': loc(*range(4, 16)),
          'hurt': react(1, 2), 'stagger_polish': react(3, 4, 5, 6),
          'fall': react(7, 8), 'down': react(10), 'dead': react(10),
          'getup': react(10, 11, 12, 13, 14) + loc(0),
          'super_reaction': react(1, 2, 3, 4, 7, 8, 9, 10)}
MOVES = {
 'brawler': {'atk': act(1, 2, 7), 'string_full': act(1, 2, 3, 4, 5, 6, 7),
             'shove': act(8, 9, 10, 11), 'grab': act(12, 13), 'taunt': act(14, 15)},
 'snatcher': {'atk': act(1, 4, 7), 'kick': act(1, 2, 3, 4, 5, 6, 7),
              'snatch': act(8, 9), 'taunt': act(10), 'dodge': act(11),
              'run': act(12, 13, 14, 15), 'carry': act(12, 13, 14, 15)},
 'enforcer': {'atk': act(1, 3, 6), 'drive': act(1, 2, 3, 4, 5, 6),
              'charge': act(7, 8), 'slam': act(9, 10, 11, 12),
              'stuck': act(13, 14), 'taunt': act(15)},
 'heavy': {'idle': unarmed(0, 1), 'block': unarmed(2), 'walk': unarmed(*range(4, 16)),
           'getup': react(10, 11, 12, 13, 14) + unarmed(0), 'push': loc(*range(4, 16)),
           'push_idle': loc(0, 1), 'atk': act(2, 3, 5), 'shove': act(2, 3, 4, 5),
           'barge': act(6, 7, 8, 9), 'ram': act(10, 11, 12, 13),
           'stuck': act(13, 14), 'call': act(15), 'taunt': act(15)},
 'kitchen': {'atk': act(1, 3, 5), 'ladle': act(1, 2, 3, 4, 5),
             'whistle': act(6, 7, 8), 'jet': act(9, 10, 11),
             'reseal': act(12, 13, 14), 'taunt': act(15)},
 'docker': {'atk': act(1, 4, 7), 'wrench': act(1, 2, 3, 4, 5, 6, 7),
            'throw': act(8, 9, 10, 11, 12, 13), 'lever': act(14), 'taunt': act(15)},
}


def cells(path, cols=4, rows=4, *, count=None):
    """Assign connected silhouettes to grid cells, preserving complete limbs."""
    im = alpha(Image.open(path).convert('RGBA'))
    a = np.array(im); h, w = a.shape[:2]
    count = cols * rows if count is None else count
    if not 1 <= count <= cols * rows:
        raise ValueError(f'{path}: invalid cell count {count} for {cols}×{rows}')
    groups = {i: [] for i in range(count)}
    for part in components(a[..., 3] > 0):
        if len(part) < 30:
            continue
        cy, cx = part.mean(0)
        index = min(rows - 1, int(cy * rows / h)) * cols + min(cols - 1, int(cx * cols / w))
        if index < count:
            groups[index].append(part)
    out = {}
    for i, parts in groups.items():
        if not parts:
            raise ValueError(f'{path}: empty cell {i}')
        body = max(parts, key=len)
        if len(body) < 800:
            raise ValueError(f'{path}: no full body in cell {i}')
        keep = np.zeros((h, w), bool)
        y0, x0 = body.min(0) - 35; y1, x1 = body.max(0) + 35
        for p in parts:
            if p is body or (len(p) > 60 and ((p[:, 0] >= y0) & (p[:, 0] <= y1) &
                                             (p[:, 1] >= x0) & (p[:, 1] <= x1)).any()):
                keep[p[:, 0], p[:, 1]] = True
        b = a.copy(); b[~keep] = 0
        c = Image.fromarray(b); out[i] = c.crop(c.getbbox())
    return out


def register(im, scale, floor=False, offset=(0, 0)):
    im = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
    im = edges(alpha(im))
    a = np.array(im)[..., 3] > 0
    ys, xs = np.where(a)
    band = (ys > im.height * .40) & (ys < im.height * .62)
    center = im.width / 2 if floor else float(np.median(xs[band]))
    x = round(SIZE[0] / 2 - center) + offset[0]
    y = SOLE - im.height + offset[1]
    if x < 0 or x + im.width > SIZE[0] or y < 0:
        raise ValueError(f'Frame exceeds canvas: {im.size} at {(x, y)}')
    out = Image.new('RGBA', SIZE)
    out.alpha_composite(im, (x, y))
    return out


def build(family, only=None):
    selected = json.loads((SOURCE / 'selected/selection.json').read_text())['selections'][family]
    folder = SOURCE / 'performances' / family
    corrections = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
    names = ['locomotion', 'combat', 'reactions'] + (['unarmed'] if family == 'heavy' else [])
    if family == 'brawler' and (folder / 'grab.png').exists(): names.append('grab')
    if (folder / 'settle.png').exists(): names.append('settle')
    layout = corrections.get('_layout', {})
    counts = corrections.get('_count', {})
    sheets = {name: cells(folder / f'{name}.png', *(layout.get(name, [2, 1] if name == 'grab' else [4, 4])), count=counts.get(name))
              for name in only or names}
    states = {**COMMON, **MOVES[family]}
    if 'locomotion' in sheets:
        states['push' if family == 'heavy' else 'walk'] = loc(*range(4, len(sheets['locomotion'])))
    if family == 'heavy' and 'unarmed' in sheets:
        states['walk'] = unarmed(*range(4, len(sheets['unarmed'])))
    if family == 'brawler' and 'grab' in sheets: states['grab'] = grab(0, 1)
    if 'settle' in sheets: states['stance_settle'] = [('settle', i) for i in range(1, 6)]
    runtime = FAMILIES[family]
    dest = OUT / runtime; dest.mkdir(parents=True, exist_ok=True)
    registered, measurements = {}, {}
    for name, poses in sheets.items():
        # One scale per sheet, calibrated on its approved idle, including the same held tool.
        scale = selected['height_at_2x'] / poses[0].height
        for i, im in poses.items():
            key = f'{name}_{i:02d}'
            spec = corrections.get(key, {})
            pose_scale = scale * spec.get('scale', 1)
            floor = name == 'reactions' and 7 <= i <= 12
            frame = register(im, pose_scale, floor, tuple(spec.get('offset', [0, 0])))
            if family == 'brawler':
                from repair_delhi_brawler_heads import overlay_head
                frame = overlay_head(frame, key, folder / 'head_consistency')
            frame.save(dest / f'{key}.png'); registered[(name, i)] = frame
            measurements[key] = {'height': im.height, 'width': im.width,
                                  'scale': round(pose_scale, 5), 'bbox': frame.getbbox()}
        # Every source cell shown at registered game size on both edge backgrounds.
        for bg in ('dark', 'light'):
            review = Image.new('RGBA', (SIZE[0] * 4, SIZE[1] * ((len(poses) + 3) // 4)), '#15191d' if bg == 'dark' else '#d6d0c6')
            draw = ImageDraw.Draw(review)
            for i in poses:
                x, y = i % 4 * SIZE[0], i // 4 * SIZE[1]
                review.alpha_composite(registered[(name, i)], (x, y))
                draw.text((x + 8, y + 8), str(i), fill='#c69b62' if bg == 'dark' else '#39332b')
            review.save(OUT / f'{family}-{name}-{bg}.png')
    measure_path = dest / 'measurements.json'
    old = json.loads(measure_path.read_text()) if measure_path.exists() else {}
    measure_path.write_text(json.dumps({**old, **measurements}, indent=2) + '\n')
    return {state: [f'{runtime}/delhi_{s}_{i:02d}.png' for s, i in refs]
            for state, refs in states.items() if all(s in sheets for s, _ in refs)}


def main():
    p = argparse.ArgumentParser(); p.add_argument('families', nargs='*', choices=list(FAMILIES))
    p.add_argument('--only', choices=['locomotion', 'combat', 'reactions', 'unarmed', 'grab', 'settle']); p.add_argument('--register', action='store_true')
    args = p.parse_args(); names = args.families or list(FAMILIES)
    manifest_updates = {FAMILIES[n]: build(n, [args.only] if args.only else None) for n in names}
    if args.register:
        frames = ROOT / 'assets/frames'
        with (frames / '.manifest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            manifest = json.loads((frames / 'manifest.json').read_text())
            for runtime, states in manifest_updates.items():
                for file in {f for files in states.values() for f in files}:
                    src = OUT / runtime / Path(file).name.removeprefix('delhi_')
                    (frames / file).parent.mkdir(exist_ok=True)
                    (frames / file).write_bytes(src.read_bytes())
                manifest[runtime] = {**manifest[runtime], **states} if args.only else states
            pending = frames / 'manifest.delhi.pending.json'
            pending.write_text(json.dumps(manifest, indent=2) + '\n')
            pending.replace(frames / 'manifest.json')
    print(json.dumps({key: {state: len(files) for state, files in states.items()}
                      for key, states in manifest_updates.items()}))


if __name__ == '__main__':
    main()
