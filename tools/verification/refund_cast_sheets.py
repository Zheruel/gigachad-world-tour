"""Game-scale edge review for registered Refund actors; writes only tmp/review."""
from pathlib import Path
import sys
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tmp/review/refund-cast/edges'
FAMILIES = {'caller': 'ic_headset', 'kid': 'ic_operator', 'itguy': 'ic_thrower',
            'guard': 'ic_security', 'recovery': 'ic_cabinet', 'lead': 'ic_lead'}
DESK = ['caller', 'kid', 'itguy']


def contact(frames, stem):
    frames = [im.crop(im.getbbox()) for im in frames]
    w = max(im.width for im in frames) + 24
    h = max(im.height for im in frames) + 32
    for label, colour, ink in [('dark', '#141314', '#ffffff'), ('light', '#e5e0d4', '#161616')]:
        canvas = Image.new('RGB', (w * 4, h * ((len(frames) + 3) // 4)), colour)
        draw = ImageDraw.Draw(canvas)
        for i, im in enumerate(frames):
            x, y = i % 4 * w, i // 4 * h
            canvas.paste(im, (x + (w - im.width) // 2, y + h - im.height - 8), im)
            draw.text((x + 6, y + 4), f'{stem} {i:02}', fill=ink)
        canvas.save(OUT / f'{stem}-{label}.png')


def main(names):
    OUT.mkdir(parents=True, exist_ok=True)
    for name in names or FAMILIES:
        for sheet in 'ab':
            frames = [Image.open(ROOT / f'assets/frames/{FAMILIES[name]}/{sheet}_{i:02}.png').convert('RGBA') for i in range(16)]
            contact(frames, f'{name}-{sheet}')
        if name in DESK:
            row = DESK.index(name)
            frames = []
            for atlas, count in [('office_life', 4), ('office_stand', 8)]:
                im = Image.open(ROOT / f'assets/stages/refund_tower/{atlas}.png').convert('RGBA')
                frames.extend(im.crop((i * 288, row * 236, (i + 1) * 288, (row + 1) * 236)) for i in range(count))
            contact(frames, f'{name}-desk')
    print(OUT)


if __name__ == '__main__':
    main(sys.argv[1:])
