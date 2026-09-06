#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]

def main():
    source = ROOT / 'assets/sources/ui/direction_arrow.png'
    image = Image.open(source)
    if image.mode != 'RGBA':
        raise ValueError('The selected arrow must have native transparent alpha')
    mask = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    image = image.crop(mask.getbbox())
    image = image.resize((84, round(84 * image.height / image.width)), Image.Resampling.LANCZOS)
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    image = image.convert('RGB').quantize(colors=32, dither=Image.Dither.NONE).convert('RGBA')
    image.putalpha(alpha)
    target = ROOT / 'assets/ui/direction_arrow.png'
    image.save(target, optimize=True)
    print(target.relative_to(ROOT), image.size)

if __name__ == '__main__':
    main()
