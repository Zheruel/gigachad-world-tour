"""Scale the authored porter cart and thrown wrench to their measured runtime footprints."""
from pathlib import Path
from PIL import Image
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/dirty_delhi/street_cast/performances'
OUT = ROOT / 'assets/stages/dirty_delhi/cast'


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for source, name, size in [('heavy/cart.png', 'porter_cart.png', (249, 94)),
                               ('docker/wrench.png', 'docker_wrench.png', (60, 16))]:
        im = alpha(Image.open(SOURCE / source).convert('RGBA'))
        im = im.crop(im.getbbox()).resize(size, Image.Resampling.LANCZOS)
        edges(alpha(im)).save(OUT / name)
        print(f'{name}: {size[0]}×{size[1]}')


if __name__ == '__main__':
    main()
