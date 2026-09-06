#!/usr/bin/env python3
"""Export the selected native-alpha elevator/city artwork at authored game scale."""
from pathlib import Path
from PIL import Image
from build_travel import source_path, output_path

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/travel'
OUT = ROOT / 'assets/travel'

def export(image, destination, width):
    image = image.convert('RGBA')
    # Generated transparent RGB is irrelevant; use native alpha for bounds.
    mask = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    box = mask.getbbox()
    if not box:
        raise ValueError(f'Empty selected sprite: {destination}')
    image = image.crop(box)
    size = (width, round(width * image.height / image.width))
    image = image.resize(size, Image.Resampling.LANCZOS)
    alpha = image.getchannel('A').point(lambda a: 255 if a >= 128 else 0)
    image = image.convert('RGB').quantize(colors=128, dither=Image.Dither.NONE).convert('RGBA')
    image.putalpha(alpha)
    image.save(destination, optimize=True)
    print(destination.relative_to(ROOT), image.size)

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    export(Image.open(source_path('elevator_cabin')), output_path('elevator_cabin'), 440)
    wall = Image.open(source_path('arrival_wall')).convert('RGB').resize((600, 400), Image.Resampling.LANCZOS)
    wall.quantize(colors=128, dither=Image.Dither.NONE).save(output_path('arrival_wall'), optimize=True)
    towers = Image.open(source_path('city_towers'))
    for i in range(3):
        strip = towers.crop((round(i * towers.width / 3), 0, round((i + 1) * towers.width / 3), towers.height))
        export(strip, output_path(f'tower_{i + 1}'), 240)

if __name__ == '__main__':
    main()
