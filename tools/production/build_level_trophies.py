"""Build approved level trophies for the lair shelf and gallery."""
import argparse
from pathlib import Path
from PIL import Image
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
parser = argparse.ArgumentParser()
parser.add_argument('stage', choices=('train', 'delhi', 'refund'))
args = parser.parse_args()
source = ROOT / f'assets/sources/production/lair/trophies/{args.stage}.png'
out = ROOT / 'assets/lair/trophies'
out.mkdir(parents=True, exist_ok=True)
im = alpha(Image.open(source).convert('RGBA'))
im = im.crop(im.getbbox())
for suffix, height in (('', 48), ('-detail', 192)):
    size = (round(im.width * height / im.height), height)
    result = edges(alpha(im.resize(size, Image.Resampling.LANCZOS), speck=1))
    result.save(out / f'{args.stage}{suffix}.png')
    print(args.stage + suffix, size)
