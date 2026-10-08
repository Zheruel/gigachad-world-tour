#!/usr/bin/env python3
"""Register the Closer's matching defeat art; leave all other finishers intact."""
from pathlib import Path
import fcntl
import json
import re
import numpy as np
from PIL import Image
from build_india_cast import grid, register
from build_india_finishers import SHEETS
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/closer/cascade.png'
OUT = ROOT / 'assets/stages/india/cinematics'
FRAMES = ROOT / 'assets/frames'


def build():
    cells = grid(alpha(Image.open(SOURCE)), [list(range(r * 4, r * 4 + 4)) for r in range(3)])
    assert set(cells) == set(range(12)), sorted(cells)
    spec = SHEETS['closer_cascade']
    body_height = float(np.median([cells[i].height for i in spec['standing']]))
    scale = min(192 / body_height, 248 / max(im.width for im in cells.values()))
    atlas = Image.new('RGBA', (1024, 768))
    frames = []
    for i, im in sorted(cells.items()):
        hx, hy = spec['hips'][i]
        # The edit references the already registered atlas, whose first three
        # left-facing poses were mirrored in its original build.
        if i in spec['mirror']:
            hx = 1 - hx
        size = (round(im.width * scale), round(im.height * scale))
        x = max(0, min(256 - size[0], round(128 - hx * size[0])))
        y = 248 - size[1]
        assert min(x, y) >= 0 and x + size[0] <= 256, (i, size, x, y)
        tile = Image.new('RGBA', (256, 256))
        tile.alpha_composite(im.resize(size, Image.Resampling.LANCZOS), (x, y))
        tile = edges(alpha(tile, speck=3))
        atlas.alpha_composite(tile, (i % 4 * 256, i // 4 * 256))
        frames.append({'index': i, 'name': spec['names'][i],
                       'hip': [round((x + hx * size[0]) / 2, 2), round((y + hy * size[1]) / 2, 2)],
                       'bounds': [x / 2, y / 2, size[0] / 2, size[1] / 2]})
    atlas.save(OUT / 'closer_cascade.png', optimize=True)
    registration_path = OUT / 'registration.json'
    contract = json.loads(registration_path.read_text())
    contract['sheets']['closer_cascade'] = {'path': 'assets/stages/india/cinematics/closer_cascade.png',
        'rows': 3, 'standingHeight': round(body_height * scale / 2, 2), 'scale': round(scale, 6), 'frames': frames}
    registration_path.write_text(json.dumps(contract, indent=2) + '\n')
    anchors_path = ROOT / 'js/india_cinematic_anchors.js'
    source = anchors_path.read_text()
    match = re.search(r'export const CINEMATIC_ANCHORS = (.*);', source)
    assert match, 'anchor table must retain its generated JSON declaration'
    anchors = json.loads(match.group(1))
    anchors['closer_cascade'] = {'rows': 3, 'hip': [f['hip'] for f in frames], 'hands': [None] * 12}
    anchors_path.write_text(source[:match.start(1)] + json.dumps(anchors, separators=(',', ':')) + source[match.end(1):])
    updates = {}
    for key in ['ic_closer', 'ic_closer_damaged']:
        fall, down = [], []
        for state, indices in [('fall', [4, 8]), ('down', [11])]:
            for i in indices:
                frame = edges(register(cells[i], scale, wide=True))
                name = f'{key}/v2_cascade_{i:02}.png'
                frame.save(FRAMES / name, optimize=True)
                (fall if state == 'fall' else down).append(name)
        updates[key] = {'fall': fall, 'down': down}
    with (FRAMES / '.manifest.lock').open('a') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        path = FRAMES / 'manifest.json'
        manifest = json.loads(path.read_text())
        for key, states in updates.items():
            manifest[key].update(states)
        path.write_text(json.dumps(manifest, indent=2) + '\n')
    print(json.dumps({'poses': len(frames), 'bodyHeight': round(body_height * scale / 2, 2), 'scale': round(scale, 6)}))


if __name__ == '__main__':
    build()
