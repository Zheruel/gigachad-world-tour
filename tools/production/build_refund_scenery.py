#!/usr/bin/env python3
"""Join selected call-centre rooms using authored connecting architecture.

Each selected repair contains the right half of one room and the left half
of its neighbour. A short edge blend preserves the original outer wall;
the central doorway and continuous floor are opaque replacement painting.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/rebuild'
OUT = ROOT / 'assets/stages/refund_tower'
NAMES = ['office', 'annex', 'calling', 'calling_east', 'servers', 'records', 'executive', 'closer']

def fit(path):
    return ImageOps.fit(Image.open(path).convert('RGB'), (1620, 540),
                        method=Image.Resampling.LANCZOS, centering=(.5, .72))

def build():
    route = Image.new('RGB', (1620 * len(NAMES), 540))
    for i, name in enumerate(NAMES):
        route.paste(fit(SOURCE / f'{name}.png'), (i * 1620, 0))
    for i, (left, right) in enumerate(zip(NAMES, NAMES[1:]), 1):
        path = SOURCE / 'joins' / f'{left}_{right}.png'
        if not path.exists():
            continue
        x = np.arange(1620)
        alpha = np.minimum(np.minimum(x / 130, (1619-x) / 130), 1).clip(0, 1)
        alpha = alpha * alpha * (3 - 2 * alpha)
        mask = Image.fromarray(np.tile((alpha*255).astype('uint8'), (540, 1)))
        route.paste(fit(path), (i*1620-810, 0), mask)
    OUT.mkdir(parents=True, exist_ok=True)
    for i, name in enumerate(NAMES):
        route.crop((i*1620, 0, (i+1)*1620, 540)).save(OUT / f'{name}.png', optimize=True)
    print('Refund Tower: seven authored room connections')
    # Local workstation repairs retain these exact connected panel boundaries.
    from build_india_workstations import backgrounds
    backgrounds()

if __name__ == '__main__':
    build()
