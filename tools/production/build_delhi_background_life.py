"""Match the foreground bazaar sellers to the surrounding dusk light during play.

The opening cinematic continues to use the original registered seller strips.
"""
from pathlib import Path
import sys
from PIL import Image
sys.path.insert(0, str(Path(__file__).parent))
from backdrop_tone import backdrop, plate_light

ROOT = Path(__file__).resolve().parents[2]
DIR = ROOT / 'assets/stages/dirty_delhi/market_life'


def build():
    light = plate_light(ROOT / 'assets/stages/dirty_delhi/rebuild/bazaar.png', (150, 280, 780, 475))[0]
    for name in ['seller_pakora', 'seller_pakora_prop', 'seller_sugarcane',
                 'seller_sugarcane_prop', 'seller_sugarcane_wheel']:
        source = Image.open(DIR / f'{name}.png')
        backdrop(source, light, level=.93, cast=.2, contrast=.92, sat=.95, rim=.35).save(
            DIR / f'play_{name}.png', optimize=True)
        print('play_' + name, source.size)


if __name__ == '__main__':
    build()
