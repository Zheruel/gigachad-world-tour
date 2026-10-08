#!/usr/bin/env python3
"""Register the Closer's authored performance without changing other families."""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw
from build_india_cast import grid, register
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/closer'
FRAMES = ROOT / 'assets/frames'
REVIEW = ROOT / 'tmp/review/refund-boss'


def build():
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=SOURCE)
    args = parser.parse_args()
    REVIEW.mkdir(parents=True, exist_ok=True)
    changes = {}
    report = {}
    for variant in ['intact', 'damaged']:
        key = 'ic_closer' + ('_damaged' if variant == 'damaged' else '')
        out = FRAMES / key
        out.mkdir(exist_ok=True)
        files = {}
        scales = {}
        kinds = [('combat', 3, [0, 1, 5, 11]),
                                      ('utility', 3, [0, 1, 8, 9, 10, 11]),
                                      ('performance', 4, list(range(9)))]
        if (args.source / f'{variant}_pushgait.png').exists():
            kinds.append(('pushgait', 2, list(range(8))))
        for kind, rows, standing in kinds:
            cells = grid(alpha(Image.open(args.source / f'{variant}_{kind}.png')),
                         [list(range(r * 4, r * 4 + 4)) for r in range(rows)])
            assert set(cells) == set(range(rows * 4)), (key, kind, sorted(cells))
            # One measured anatomical scale for the whole sheet. Crouches,
            # windups and recovery never stretch to match a standing pose.
            target = 172 if kind == 'pushgait' else 192
            scale = target / float(np.median([cells[i].height for i in standing]))
            scales[kind] = round(scale, 6)
            files[kind] = []
            for i in range(rows * 4):
                frame = edges(register(cells[i], scale, kind == 'performance' and i < 8))
                if kind == 'pushgait':
                    # Lock the external cabinet contact instead of centering
                    # each stride on a different arrangement of swinging legs.
                    a = np.array(frame)
                    r, g, b = a[:, :, :3].astype(float).transpose(2, 0, 1)
                    skin = (a[:, :, 3] > 128) & (r > 80) & (r > g * 1.25) & (g > b * 1.15)
                    skin[140:] = False
                    ys, xs = np.where(skin)
                    assert len(xs) > 10, (key, kind, i, 'no palm pixels')
                    shift = 208 - int(xs.max())
                    planted = Image.new('RGBA', frame.size)
                    planted.alpha_composite(frame, (shift, 0))
                    frame = planted
                name = f'{key}/v2_{kind}_{i:02}.png'
                frame.save(FRAMES / name, optimize=True)
                files[kind].append(name)
        c, u, p = (files[k] for k in ['combat', 'utility', 'performance'])
        changes[key] = {
            'walk': p[:8], 'run': p[:8], 'idle': [p[8]], 'block': [p[9]],
            'hurt': p[10:12], 'stagger': p[10:13], 'getup': [p[14], p[15], p[8]],
            'boxing': c, 'atk': c[:9], 'punch': c[:9], 'ram': c[:9],
            'handset': u[:4], 'shove': u[4:8], 'call': u[8:12],
            'phasebreak': [p[10], p[11], p[12], p[13], p[15], p[8]],
            'seated': [p[14]],
        }
        if 'pushgait' in files:
            changes[key]['pushgait'] = files['pushgait']
        report[key] = {'frames': sum(map(len, files.values())), 'scales': scales}
        plate = Image.open(ROOT / 'assets/stages/refund_tower/executive.png').convert('RGB')
        plate = plate.resize((810, 270), Image.Resampling.LANCZOS)
        chad = Image.open(FRAMES / 'chad_sidle1.png').convert('RGBA')
        allfiles = c + u + p + files.get('pushgait', [])
        sheet = Image.new('RGB', (480 * 4, 288 * ((len(allfiles) + 3) // 4)), '#191b1c')
        draw = ImageDraw.Draw(sheet)
        for n, name in enumerate(allfiles):
            x, y = n % 4 * 480, n // 4 * 288
            sheet.paste(plate.crop((150, 0, 630, 270)), (x, y))
            f = Image.open(FRAMES / name).convert('RGBA')
            f = f.resize((f.width // 2, f.height // 2), Image.Resampling.NEAREST)
            hero = chad.resize((chad.width // 2, chad.height // 2), Image.Resampling.NEAREST)
            sheet.paste(hero, (x + 120 - hero.width // 2, y + 230 - hero.height + 4), hero)
            sheet.paste(f, (x + 310 - f.width // 2, y + 230 - f.height + 4), f)
            draw.text((x + 8, y + 273), Path(name).stem, fill='#efd5a4')
        sheet.save(REVIEW / f'{key}-all-native.png')
        sheet.resize((sheet.width * 2, sheet.height * 2), Image.Resampling.NEAREST).save(REVIEW / f'{key}-all-2x.png')
    # Merge under the same lock used by the other asset builders. No family,
    # source artwork or old fallback frame is removed.
    with (FRAMES / '.manifest.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest_path = FRAMES / 'manifest.json'
        manifest = json.loads(manifest_path.read_text())
        for key, states in changes.items():
            manifest[key] = {**manifest.get(key, {}), **states}
        manifest_path.write_text(json.dumps(manifest, indent=2) + '\n')
    (REVIEW / 'registration.json').write_text(json.dumps(report, indent=2) + '\n')
    print(json.dumps(report))


if __name__ == '__main__':
    build()
