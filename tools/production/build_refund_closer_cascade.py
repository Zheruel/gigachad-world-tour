#!/usr/bin/env python3
"""Register the owner's new defeat poses to their measured pelvis pivots."""
from pathlib import Path
import argparse
import json
import re
from PIL import Image, ImageDraw, ImageOps
from build_delhi_cast_performances import cells
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/boss'
REVIEW = ROOT / 'tmp/review/refund-overhaul/boss/cascade'
OUT = ROOT / 'assets/stages/refund_tower/overhaul'
# Fractions describe each authored waist, including horizontal/curl poses.
HIPS = [(0.52, 0.47), (0.54, 0.45), (0.53, 0.39), (0.52, 0.58),
        (0.48, 0.52), (0.52, 0.60), (0.46, 0.56), (0.43, 0.60),
        (0.38, 0.56), (0.42, 0.65), (0.52, 0.56), (0.49, 0.53)]


def build(variant, publish=False):
    source = cells(SOURCE / variant / 'cascade.png', 4, 3)
    correction_path = SOURCE / variant / 'cascade-registration.json'
    hips = json.loads(correction_path.read_text()).get('hips', HIPS) if correction_path.exists() else HIPS
    scale = min(192 / source[0].height, 248 / max(im.width for im in source.values()))
    atlas = Image.new('RGBA', (1024, 768))
    records = []
    REVIEW.mkdir(parents=True, exist_ok=True)
    boards = {n: Image.new('RGBA', (1024, 768), c) for n, c in [('dark', '#171b20'), ('light', '#d7d0c2')]}
    for i, image in source.items():
        hx, hy = hips[i]
        if i in [0, 1, 2]:
            image = ImageOps.mirror(image)
            hx = 1 - hx
        w, h = round(image.width * scale), round(image.height * scale)
        x = max(0, min(256-w, round(128-hx*w)))
        y = 248-h
        tile = Image.new('RGBA', (256, 256))
        tile.alpha_composite(image.resize((w, h), Image.Resampling.LANCZOS), (x, y))
        tile = edges(alpha(tile))
        atlas.alpha_composite(tile, (i%4*256, i//4*256))
        hip = [round((x+hx*w)/2, 2), round((y+hy*h)/2, 2)]
        records.append({'index': i, 'hip': hip, 'bounds': [x/2, y/2, w/2, h/2]})
        tile.save(REVIEW / f'{variant}-{i:02d}.png')
        for board in boards.values():
            px, py = i%4*256, i//4*256
            board.alpha_composite(tile, (px, py))
            d = ImageDraw.Draw(board)
            cx, cy = px+hip[0]*2, py+hip[1]*2
            d.line([(cx-4,cy),(cx+4,cy)], fill='#e34999')
            d.line([(cx,cy-4),(cx,cy+4)], fill='#e34999')
            d.text((px+8,py+8), str(i), fill='#b59774')
    for name, board in boards.items():
        board.save(REVIEW / f'{variant}-{name}.png')
    atlas.save(REVIEW / f'{variant}-atlas.png')
    if publish:
        atlas.save(OUT / 'closer_cascade.png', optimize=True)
        path = ROOT / 'js/india_cinematic_anchors.js'
        text = path.read_text()
        match = re.search(r'export const CINEMATIC_ANCHORS = (.*);', text)
        table = json.loads(match.group(1))
        table['closer_cascade'] = {'rows': 3, 'hip': [r['hip'] for r in records], 'hands': [None]*12}
        path.write_text(text[:match.start(1)]+json.dumps(table,separators=(',',':'))+text[match.end(1):])
        path = ROOT / 'assets/stages/india/cinematics/registration.json'
        contract = json.loads(path.read_text())
        contract['sheets']['closer_cascade'] = {'path': 'assets/stages/refund_tower/overhaul/closer_cascade.png',
            'rows': 3, 'standingHeight': round(source[0].height*scale/2,2), 'scale': scale, 'frames': records}
        path.write_text(json.dumps(contract,indent=2)+'\n')
    print(json.dumps({'variant':variant,'poses':12,'height':round(source[0].height*scale/2,2),'published':publish}))


if __name__ == '__main__':
    p=argparse.ArgumentParser();p.add_argument('--variant',choices=['intact','damaged'],default='damaged');p.add_argument('--register',action='store_true')
    args=p.parse_args();build(args.variant,args.register)
