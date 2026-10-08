"""Shera finisher victim cells (enraged look), registered as nr_neta_guard `rage_finish` (11 cells).

Sources in assets/sources/production/stages/night_train/neta/shera/ (GPT Image, true alpha, facing right):
  finish_a.png   gut 1, gut 2, gut 3, rib crunch, kneel sway          (edit of the concept strip in the rage look)
  finish_b1.png  jaw snap, airborne rising, airborne falling           (edits of finish_a, F2)
  finish_b2.png  back landing, KO twitch A, KO twitch B                (edits of finish_a, F2)
Cells: assets/frames/nr_neta_guard/fin_00..10.png on the 552x410 Shera canvas (sole 402, bottom centre anchor).
Standing poses register on the boots; kneel, airborne and lying poses on their box centre with the bottom on
the sole (js/train_neta_cinematics.js places them). Run standalone (writes the manifest under flock) or via
build_train_shera_moves.register(), which calls register() so a Shera rebuild keeps the state.
"""
from pathlib import Path
import fcntl
import json
import sys
import numpy as np

sys.path.insert(0, str(Path(__file__).parent))
import build_train_neta as B
from build_train_passengers import scaled

KEY = 'nr_neta_guard'
SRC = B.SRC / 'shera'
# strip -> pose count, scale to 2x game size, poses registered on the boots
STRIPS = {'finish_a': dict(n=5, k=.49, feet={0, 1, 2, 3}),
          'finish_b1': dict(n=3, k=.48),
          'finish_b2': dict(n=3, k=.48)}


def register(manifest):
    from build_train_shera_moves import split
    spec = B.CAST[KEY]; folder = B.FRAMES / KEY; size, sole = spec['size'], spec['sole']
    cells = []
    for name, st in STRIPS.items():
        path = SRC / f'{name}.png'
        if not path.exists():
            return manifest
        for j, pose in enumerate(split(path, st['n'])):
            im = scaled(pose, st['k'] * B.SHERA_SCALE)
            x = B.feet_x(im) if j in st.get('feet', ()) else im.width / 2
            cells.append((im, x))
    for i, (im, x) in enumerate(cells):
        B.place(im, (max(size[0], 2 * int(np.ceil(max(x, im.width - x))) + 16), size[1]), sole, x, None, KEY).save(folder / f'fin_{i:02d}.png')
    manifest[KEY]['rage_finish'] = [f'{KEY}/fin_{i:02d}.png' for i in range(len(cells))]
    print('rage_finish', len(cells), 'cells', [c[0].size for c in cells])
    return manifest


def main():
    path = B.FRAMES / 'manifest.json'
    with open(B.FRAMES / '.manifest.lock', 'w') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        manifest = json.loads(path.read_text())
        register(manifest)
        path.write_text(json.dumps(manifest, indent=2) + '\n')


if __name__ == '__main__':
    main()
