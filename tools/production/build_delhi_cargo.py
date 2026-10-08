"""Dirty Delhi cargo bales (ic_cargo / ic_cargo_b): a crisper rebuild of build_india_props_life.py's cut.

Same source (chapter_street.png, magenta key), canvas (102x84, feet on the bottom row) and physical scale as
that builder, but hardened before scaling, BOX-downscaled (premultiplied, so no key or light halo), toned a
little deeper toward the stage's quay shading and given sprite_edges' closed dark outline. Run after
build_india_props_life.py if that is ever re-run.
  .venv/bin/python tools/production/build_delhi_cargo.py
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image, ImageFilter
sys.path.insert(0, str(Path(__file__).parent))
from build_train_rebuild import keyed
from build_india_props_life import prop_silhouette
import sprite_edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/props/chapter_street.png'
OUT = ROOT / 'assets/stages/india/props'
BOX = (1160, 1536)          # the cargo column of the street props sheet; rows 0-512 intact, 512-1024 broken
W, H = 50, 42               # logical footprint (js/india_assets.js INDIA_PROPS.ic_cargo)
LOOK = dict(gamma=1.18, knee=.62, comp=.85, sat=1.1, white=.25)


def box_down(im, size):
    """Premultiplied BOX resample: transparent pixels contribute no colour to the rim."""
    a = np.array(im).astype(float); al = a[:, :, 3:] / 255
    pm = Image.fromarray((a[:, :, :3] * al).round().astype(np.uint8)).resize(size, Image.Resampling.BOX)
    am = Image.fromarray(a[:, :, 3].astype(np.uint8)).resize(size, Image.Resampling.BOX)
    rgb = np.array(pm).astype(float); A = np.array(am).astype(float)
    rgb = np.where(A[..., None] > 0, rgb * 255 / np.maximum(A[..., None], 1), 0)
    return Image.fromarray(np.dstack([rgb.clip(0, 255), A]).round().astype(np.uint8))


def main():
    src = Image.open(SRC).convert('RGB')
    cells = []
    for row in range(2):
        c = keyed(src.crop((BOX[0], row * 512, BOX[1], (row + 1) * 512)))
        c = sprite_edges.alpha(c)                       # hard silhouette before any scaling
        cells.append(prop_silhouette(c))
    scale = min((W * 2 - 4) / cells[0].width, (H * 2 - 2) / cells[0].height)
    size = (max(W * 2, round(max(c.width for c in cells) * scale) + 4), max(H * 2, round(max(c.height for c in cells) * scale) + 2))
    size = (size[0] + size[0] % 2, size[1] + size[1] % 2)
    for broken, c in enumerate(cells):
        c = box_down(c, (max(1, round(c.width * scale)), max(1, round(c.height * scale))))
        rgb = c.convert('RGB').filter(ImageFilter.UnsharpMask(1, 70, 2)); c = Image.merge('RGBA', (*rgb.split(), c.getchannel('A')))   # BOX softens the planks
        a = np.array(c); a[:, :, 3] = np.where(a[:, :, 3] >= 128, 255, 0); a[a[:, :, 3] == 0, :3] = 0
        a = sprite_edges.tone(a, **LOOK)
        f = Image.new('RGBA', size); f.alpha_composite(Image.fromarray(a), ((size[0] - c.width) // 2, size[1] - c.height))
        sprite_edges.edges(f).save(OUT / ('ic_cargo' + ('_b' if broken else '') + '.png'))
        print('ic_cargo' + ('_b' if broken else ''), size)


if __name__ == '__main__':
    main()
