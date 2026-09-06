"""Extract generated arcade wordmarks, preserving counters and black outlines."""
from pathlib import Path
import numpy as np
from PIL import Image
from build_airport import key

ROOT = Path(__file__).resolve().parents[2]
NAMES = ('night-train', 'dirty-delhi', 'world-tour', 'stage-clear', 'game-over', 'act-one-india')
source = key(Image.open(ROOT / 'assets/sources/ui/headings/arcade-wordmarks.png'))
ink = np.asarray(source.getchannel('A')).max(axis=1) > 0
edges = np.diff(np.r_[False, ink, False].astype(int))
rows = list(zip(np.where(edges == 1)[0], np.where(edges == -1)[0]))
assert len(rows) == len(NAMES), rows
for name, (top, bottom) in zip(NAMES, rows):
    crop = source.crop((0, int(top), source.width, int(bottom)))
    crop = crop.crop(crop.getbbox())
    width = 768 if name == 'night-train' else 360 if name == 'act-one-india' else 640
    crop = crop.resize((width, round(crop.height * width / crop.width)), Image.Resampling.LANCZOS)
    crop.putalpha(crop.getchannel('A').point(lambda a: 255 if a >= 128 else 0))
    crop.save(ROOT / f'assets/ui/headings/{name}.png', optimize=True)
