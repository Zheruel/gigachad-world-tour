#!/usr/bin/env python3
"""Register the Closer overhaul at one body scale per authored sheet."""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw
from build_delhi_cast_performances import cells, register, SIZE
from build_refund_performances import skull_x
from refund_gait_registration import walk_scale, place_sole

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/boss'
REVIEW = ROOT / 'tmp/review/refund-overhaul/boss'
FRAMES = ROOT / 'assets/frames'
REF = lambda sheet, ids: [(sheet, i) for i in ids]
STATES = {
    'idle': REF('boxing', [0, 10]), 'block': REF('boxing', [10]),
    'walk': REF('walkpolish', range(2, 22)), 'run': REF('walkpolish', range(2, 22)),
    'boxing': REF('boxing', range(16)), 'atk': REF('boxing', [1, 3, 7]),
    'punch': REF('boxing', [1, 3, 7]), 'ram': REF('boxing', [1, 3, 7]),
    'cross': REF('cross', range(8)),
    'handset': REF('utility', [1, 2, 3, 4]),
    'reload': REF('utility', [5, 6, 0]),
    'call': REF('utility', [7, 8, 9, 10]),
    'shove': REF('utility', [11, 12, 13, 14]),
    'pushgait': REF('pushpolish', range(2, 22)),
    'hurt': REF('reactions', [1, 2]), 'stagger': REF('reactions', [2, 3, 4]),
    'phasebreak': REF('reactions', [3, 7, 4, 6, 8, 9]),
    'fall': REF('reactions', [10, 11, 12]),
    'down': REF('reactions', [13]), 'dead': REF('reactions', [13]),
    'getup': REF('getup', range(1, 8)) + REF('boxing', [0]),
}


def build(variant):
    folder = SOURCE / variant
    key = 'ic_closer' + ('_damaged' if variant == 'damaged' else '')
    target = REVIEW / key; target.mkdir(parents=True, exist_ok=True)
    correction = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
    poses, measures = {}, {}
    for sheet in ['walkpolish', 'boxing', 'cross', 'utility', 'pushpolish', 'reactions', 'getup']:
        path = folder / correction.get('_source', {}).get(sheet, f'{sheet}.png')
        if not path.exists(): continue
        cols, rows = (4, 6) if sheet in ['walkpolish', 'pushpolish'] else (4, 2) if sheet in ['cross', 'getup'] else (4, 4)
        if sheet in correction.get('_trim', []):
            full = Image.open(path).convert('RGBA')
            cropped = target / f'{sheet}-source-trim.png'
            full.crop(full.getbbox()).save(cropped)
            path = cropped
        source = cells(path, cols, rows)
        for patch in correction.get('_patches', {}).get(sheet, []):
            replacements = cells(folder / patch['file'], *patch.get('layout', [2, 1]))
            common_scale = source[patch['scale_from']].height / replacements[0].height if 'scale_from' in patch else None
            selected = [replacements[i] for i in patch.get('indices', list(replacements))]
            for target, replacement in zip(patch['targets'], selected):
                k = common_scale or source[target].height / replacement.height
                source[target] = replacement.resize((round(replacement.width*k), round(replacement.height*k)), Image.Resampling.LANCZOS)
        # Cell zero is the same upright guard in every action family; walk cell
        # zero is full-height heel contact. Crouches never become giant bodies.
        scale = 192 / source[0].height
        gait_anchor = None
        for i, image in source.items():
            spec = correction.get(f'{sheet}_{i:02d}', {})
            pose_scale = walk_scale(image, 192, i) if sheet == 'walkpolish' and 2 <= i <= 21 and correction.get('_gait_height_template') else scale * spec.get('scale', 1)
            frame = register(image, pose_scale,
                             sheet == 'getup' and 1 <= i <= 5 or sheet == 'reactions' and 10 <= i <= 15,
                             tuple(spec.get('offset', [0, 0])))
            if sheet == 'walkpolish' and 2 <= i <= 21:
                head = skull_x(frame)
                if gait_anchor is None: gait_anchor = head
                aligned = Image.new('RGBA', SIZE)
                aligned.alpha_composite(frame, (round(gait_anchor-head), 0))
                frame = aligned
            if sheet == 'pushpolish' and i != 0 or sheet == 'utility' and 11 <= i <= 13:
                a = np.array(frame); r, g, b = a[..., :3].astype(int).transpose(2, 0, 1)
                skin = (a[..., 3] > 0) & (r > 75) & (r > g * 1.22) & (g > b * 1.12)
                skin[170:] = False
                ys, xs = np.where(skin)
                if len(xs) < 10: raise ValueError(f'{key}/{sheet}/{i}: missing palm')
                shifted = Image.new('RGBA', SIZE)
                # Cabinet is 49px ahead, 66px wide: rear face is 16px ahead.
                shifted.alpha_composite(frame, (212 - int(xs.max()), 0)); frame = shifted
            frame = place_sole(frame, spec.get('sole_shift', 0), 192)
            frame.save(target / f'{sheet}_{i:02d}.png', optimize=True)
            poses[sheet, i] = frame
            measures[f'{sheet}_{i:02d}'] = {'scale': scale, 'source': image.size, 'bbox': frame.getbbox()}
        for name, color in [('dark', '#16191e'), ('light', '#d7d0c2')]:
            board = Image.new('RGBA', (SIZE[0]*cols, SIZE[1]*rows), color)
            draw = ImageDraw.Draw(board)
            for i in source:
                x, y = i%cols*SIZE[0], i//cols*SIZE[1]
                board.alpha_composite(poses[sheet, i], (x, y)); draw.text((x+8, y+8), str(i), fill='#b59774')
            board.save(REVIEW / f'{variant}-{sheet}-{name}.png')
    (target / 'measurements.json').write_text(json.dumps(measures, indent=2)+'\n')
    states = {state: [f'{key}/overhaul_{s}_{i:02d}.png' for s, i in refs]
              for state, refs in STATES.items() if all((s, i) in poses for s, i in refs)}
    return key, states


def main():
    parser = argparse.ArgumentParser(); parser.add_argument('--register', action='store_true')
    parser.add_argument('--variant', choices=['intact', 'damaged'])
    args = parser.parse_args(); REVIEW.mkdir(parents=True, exist_ok=True)
    changes = dict(build(v) for v in ([args.variant] if args.variant else ['intact', 'damaged']))
    if args.register:
        with (FRAMES / '.manifest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            path = FRAMES / 'manifest.json'; manifest = json.loads(path.read_text())
            for key, states in changes.items():
                (FRAMES / key).mkdir(exist_ok=True)
                for file in {f for files in states.values() for f in files}:
                    source = REVIEW / key / Path(file).name.removeprefix('overhaul_')
                    (FRAMES / file).write_bytes(source.read_bytes())
                manifest[key] = {**manifest.get(key, {}), **states}
            pending = FRAMES / 'manifest.closer.pending.json'
            pending.write_text(json.dumps(manifest, indent=2)+'\n'); pending.replace(path)
    print(json.dumps({key: {s: len(files) for s, files in states.items()} for key, states in changes.items()}))


if __name__ == '__main__': main()
