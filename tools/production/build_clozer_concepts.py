#!/usr/bin/env python3
"""Prepare unregistered Clozer concepts and game-scale review composites."""
from pathlib import Path
import argparse
import sys

import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageOps

sys.path.insert(0, str(Path(__file__).resolve().parent))
from sprite_edges import edges

ROOT = Path(__file__).resolve().parents[2]
FAMILIES = {
    'emperor': ('A · Scam emperor', 'emperor'),
    'predator': ('B · Executive predator', 'predator'),
    'boiler': ('C · Filthy boiler-room king', 'emperor'),
    'guru': ('D · Refund guru', 'emperor'),
    'peacock': ('E · Ponzi peacock', 'predator'),
}


def trim(im):
    im = im.convert('RGBA')
    box = im.getchannel('A').getbbox()
    if box is None:
        raise ValueError('Empty concept cell')
    return im.crop(box)


def resized(im, height=None, scale=None):
    scale = scale or height / im.height
    return edges(im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS))


def parts(im, rows):
    """Separate isolated subjects by transparent gutters, without cutting at equal columns."""
    output = []
    for row in range(rows):
        strip = im.crop((0, row * im.height // rows, im.width, (row + 1) * im.height // rows))
        cols = np.flatnonzero((np.array(strip)[..., 3] > 0).sum(0) > 3)
        runs = np.split(cols, np.flatnonzero(np.diff(cols) > 15) + 1)
        for run in runs:
            if len(run) > 5:
                output.append(trim(strip.crop((int(run[0]), 0, int(run[-1]) + 1, strip.height))))
    return output


def paste(canvas, im, x, feet, mirror=False):
    if mirror:
        im = ImageOps.mirror(im)
    shadow = Image.new('RGBA', canvas.size)
    draw = ImageDraw.Draw(shadow)
    radius = min(im.width * .34, 50)
    draw.ellipse((x * 2 - radius, feet * 2 - 4, x * 2 + radius, feet * 2 + 4), fill=(8, 6, 12, 65))
    canvas.alpha_composite(shadow)
    canvas.alpha_composite(im, (round(x * 2 - im.width / 2), round(feet * 2 - im.height)))


def compose(out, family, room='own', damaged=False, furniture=True):
    room_key = family if room == 'own' else room
    canvas = Image.open(out / f'{room_key}-room-crop.png').convert('RGBA')
    if furniture:
        # Proposed back-line layout gives the fighters a clear foreground lane.
        for item, x, feet in [('chair', 260, 200), ('desk', 250, 207), ('display', 442, 200), ('vault', 386, 239)]:
            paste(canvas, Image.open(out / f'{family}-{item}.png'), x, feet)
    paste(canvas, trim(Image.open(ROOT / 'assets/frames/chad_sidle1.png')), 90, 237)
    paste(canvas, Image.open(out / f'{family}-{"damaged" if damaged else "guard"}.png'), 270, 236)
    return canvas.convert('RGB')


def build(source, out):
    out.mkdir(parents=True, exist_ok=True)
    current_room = Image.open(ROOT / 'assets/stages/refund_tower/overhaul/closer.png').resize((1620, 540))
    current_room.crop((460, 0, 1420, 540)).save(out / 'current-room-crop.png')
    ready = [family for family in FAMILIES if (source / f'{family}-character.png').exists()]
    for family in ready:
        room_file = source / f'{family}-room.png'
        room = Image.open(room_file if room_file.exists() else source / 'predator-room.png').resize((1620, 540), Image.Resampling.LANCZOS)
        room.crop((460, 0, 1420, 540)).save(out / f'{family}-room-crop.png')
        actors = parts(Image.open(source / f'{family}-character.png').convert('RGBA'), 1)
        if len(actors) != 3:
            raise ValueError(f'{family}: expected three isolated character views, got {len(actors)}')
        scale = 230 / actors[0].height
        for name, actor in zip(['standing', 'guard', 'damaged'], actors):
            resized(actor, scale=scale).save(out / f'{family}-{name}.png')
        props = parts(Image.open(source / f'{FAMILIES[family][1]}-props.png').convert('RGBA'), 2)
        if len(props) != 4:
            raise ValueError(f'{family}: expected four isolated props, got {len(props)}')
        for name, prop, height in zip(['chair', 'desk', 'vault', 'display'], props, [170, 94, 156, 144]):
            resized(prop, height=height).save(out / f'{family}-{name}.png')
    for family in ready:
        for room in ['own', 'current', 'emperor', 'predator']:
            compose(out, family, room).save(out / f'{family}-on-{room}.png')
            compose(out, family, room, damaged=True).save(out / f'{family}-on-{room}-phase2.png')
        compose(out, family, damaged=True).save(out / f'{family}-phase2.png')

    current = current_room.crop((460, 0, 1420, 540)).convert('RGBA')
    for item, x, feet in [('throne', 260, 215), ('desk', 250, 217), ('display', 56, 216), ('display', 446, 216), ('vault', 386, 238)]:
        paste(current, Image.open(ROOT / f'assets/stages/refund_tower/closer/{item}.png').convert('RGBA'), x, feet, item == 'throne')
    paste(current, trim(Image.open(ROOT / 'assets/frames/chad_sidle1.png')), 90, 236)
    paste(current, trim(Image.open(ROOT / 'assets/frames/ic_closer/king_boxing_00.png')), 270, 226, True)
    current.convert('RGB').save(out / 'current-composite.png')

    # Edge inspection at the actual 2x registered size.
    sheet = Image.new('RGB', (len(ready) * 560, 620), '#16131c')
    draw = ImageDraw.Draw(sheet)
    for row, colour in enumerate(['#16131c', '#f0e6d2']):
        draw.rectangle((0, row * 310, sheet.width, (row + 1) * 310), fill=colour)
        for col, family in enumerate(ready):
            for i, name in enumerate(['guard', 'damaged']):
                actor = Image.open(out / f'{family}-{name}.png')
                x = col * 560 + i * 280 + 130 - actor.width // 2
                sheet.paste(actor, (x, row * 310 + 270 - actor.height), actor)
    sheet.save(out / 'edges-dark-light.png')
    board = Image.new('RGB', (1920, 602), '#16131c')
    draw = ImageDraw.Draw(board)
    for i, (family, title) in enumerate([('emperor', 'A — SCAM EMPEROR'), ('predator', 'B — EXECUTIVE PREDATOR')]):
        draw.text((i * 960 + 18, 15), title, fill='#efd4a1')
        board.paste(Image.open(out / f'{family}-on-own.png'), (i * 960, 42))
    board.save(out / 'comparison-2x.png')
    font = ImageFont.truetype('/System/Library/Fonts/Supplemental/Arial.ttf', 18)
    lineup = Image.new('RGB', (len(ready) * 360, 330), '#16131c')
    draw = ImageDraw.Draw(lineup)
    chad = trim(Image.open(ROOT / 'assets/frames/chad_sidle1.png'))
    for col, family in enumerate(ready):
        x = col * 360
        draw.text((x + 12, 14), FAMILIES[family][0], font=font, fill='#ead19d')
        actor = Image.open(out / f'{family}-guard.png')
        lineup.paste(chad, (x + 54 - chad.width // 2, 296 - chad.height), chad)
        lineup.paste(actor, (x + 232 - actor.width // 2, 296 - actor.height), actor)
        draw.line((x, 309, x + 359, 309), fill='#514331')
    lineup.save(out / 'five-identities-2x.png')
    print(out)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--output', type=Path, default=ROOT / 'tmp/review/clozer-redesign')
    args = parser.parse_args()
    build(args.source, args.output)
