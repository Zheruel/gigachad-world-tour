#!/usr/bin/env python3
"""Register the approved ivory/plum Scam King and his sparse marble penthouse."""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps
import build_closer_king as king
from build_delhi_cast_performances import cells
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/redesign/scam_king'
REVIEW = ROOT / 'tmp/review/scam-king'
STAGE = ROOT / 'assets/stages/refund_tower/scam_king'


def configure():
    king.SOURCE, king.REVIEW, king.STAGE = SOURCE, REVIEW, STAGE
    king.STAND, king.WIDE = 214, 1.0
    king.SHEETS.pop('push', None)
    for state in ('ram', 'pushgait', 'shove'):
        king.STATES.pop(state, None)
    # The new block is a deeper crouch. Scale from the upright cross tell, rather than enlarging it
    # until its crouched silhouette reaches idle height.
    king.SHEETS['cross'] = (2, 'stand', 'rear')
    REVIEW.mkdir(parents=True, exist_ok=True)


def sprites(register=False):
    configure()
    king.edges = lambda im: edges(im, look='scam_king')
    king.ko_eye = lambda im: im  # The generated victim already has a natural closed, bruised eye.
    identity = cells(SOURCE / 'identity/identity.png', 3, 1)
    ratio = king.height(identity[1]) / king.height(identity[0])
    changes = {}
    for variant in ('intact', 'damaged'):
        key, states = king.build(variant, ratio)
        changes[key] = {s: [f.replace('/king_', '/scam_king_') for f in files] for s, files in states.items()}
    board = Image.new('RGBA', (1344, 600))
    draw = ImageDraw.Draw(board)
    for row, bg in enumerate(('#17131a', '#e8dfcc')):
        draw.rectangle((0, row * 300, 1344, (row + 1) * 300), fill=bg)
        for col, part in identity.items():
            part = edges(alpha(part.resize((round(part.width * 214 / king.height(identity[0])), round(part.height * 214 / king.height(identity[0]))), Image.Resampling.LANCZOS)), look='scam_king')
            part = ImageOps.mirror(part)
            board.alpha_composite(part, (col * 448 + 224 - part.width // 2, row * 300 + 293 - part.height))
    board.convert('RGB').save(REVIEW / 'identity-and-edges.png')
    if register:
        frames = ROOT / 'assets/frames'
        with (frames / '.manifest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            path = frames / 'manifest.json'
            manifest = json.loads(path.read_text())
            for key, states in changes.items():
                for file in {f for files in states.values() for f in files}:
                    src = REVIEW / key / Path(file).name.removeprefix('scam_king_')
                    (frames / file).write_bytes(src.read_bytes())
                manifest[key] = states
            pending = frames / 'manifest.scam-king.pending.json'
            pending.write_text(json.dumps(manifest, indent=2) + '\n')
            pending.replace(path)
        # Raised toes occasionally touch the extraction floor. Do not mistake the swing foot for
        # a new planted heel and hold one pose for half the cycle. These eight poses have an even
        # contact/down/pass/up cadence; both support changes remain at 0 and 4.
        path = ROOT / 'js/refund_gait_data.js'
        prefix, raw = path.read_text().split('export const REFUND_GAITS=')
        data = json.loads(raw.strip().rstrip(';'))
        for key in changes:
            data[key] = {'walk': {'beat': [8.0]*8, 'contacts': [0,4], 'starts': [[0],[4]]}}
        path.write_text(prefix+'export const REFUND_GAITS='+json.dumps(data,separators=(',',':'))+';\n')
    print(json.dumps({k: {s: len(f) for s, f in states.items()} for k, states in changes.items()}))


def arena():
    configure()
    STAGE.mkdir(parents=True, exist_ok=True)
    plate = Image.open(SOURCE / 'plate/plate-v1.png').convert('RGB').resize((1620, 540), Image.Resampling.LANCZOS)
    plate.save(STAGE / 'room.png', optimize=True)
    king.cutouts(SOURCE / 'props/props.png', [king.PROPS[0]], 8)
    king.cutouts(SOURCE / 'props/items.png', king.ITEMS, 8)
    grand = SOURCE / 'props/desk-grand-v3.png'
    if grand.exists():
        parts = cells(grand, 3, 1)
        k = 336 / parts[0].width
        for i, name in enumerate(('desk', 'desk_empty', 'desk_broken')):
            im = parts[i]
            im = edges(alpha(im.resize((round(im.width*k), round(im.height*k)), Image.Resampling.LANCZOS)))
            im.save(STAGE / (name+'.png'), optimize=True)
    sideboard = SOURCE / 'props/sideboard-v3.png'
    if sideboard.exists():
        im = alpha(Image.open(sideboard).convert('RGBA')); im = im.crop(im.getbbox())
        k = 210 / im.width
        edges(alpha(im.resize((210, round(im.height*k)), Image.Resampling.LANCZOS))).save(STAGE / 'sideboard.png', optimize=True)
    wall = plate.crop(king.WALL)
    strip = Image.new('RGBA', (wall.width * 4, wall.height))
    strip.paste(wall, (0, 0))
    states = SOURCE / 'plate/wall-states.png'
    if states.exists():
        source = Image.open(states).convert('RGB')
        yy, xx = np.mgrid[:wall.height, :wall.width]
        feather = np.clip(np.minimum.reduce([xx, yy, wall.width - 1 - xx, wall.height - 1 - yy]) / 14, 0, 1)
        for i in (1, 2, 3):
            x, y = (i % 2) * source.width // 2, (i // 2) * source.height // 2
            cell = source.crop((x, y, x + source.width // 2, y + source.height // 2)).resize(wall.size, Image.Resampling.LANCZOS)
            blended = np.asarray(cell) * feather[..., None] + np.asarray(wall) * (1 - feather[..., None])
            strip.paste(Image.fromarray(blended.astype('uint8')), (i * wall.width, 0))
    strip.save(STAGE / 'wall_set.png', optimize=True)
    print(STAGE)


def finisher():
    """Keep the generated wrist, collar, slam and uppercut contacts together."""
    configure()
    STAGE.mkdir(parents=True, exist_ok=True)
    keys = cells(SOURCE / 'damaged/finish-pair-v2.png', 4, 2)
    bridges = cells(SOURCE / 'damaged/finish-bridges-v3.png', 4, 2)
    poses = {i*2+j: (source[i],214/source[0].height) for i in range(8) for j,source in enumerate((keys,bridges))}
    # Identity edits retain each paired contact and the original height. Never normalise a
    # crouch or overhead hoist to standing height: that enlarges CHAD between action poses.
    for group in range(4):
        path = SOURCE / f'damaged/finish-identity-v4-{group}.png'
        repaired = SOURCE / f'damaged/finish-identity-v5-{group}.png'
        if repaired.exists():
            path = repaired
        if path.exists():
            for j, pose in cells(path, 2, 2).items():
                i = group*4+j
                old, scale = poses[i]
                poses[i] = (pose, old.height*scale/pose.height)
    atlas = Image.new('RGBA', (2048, 1536))
    board = Image.new('RGBA', (2048, 3072))
    d = ImageDraw.Draw(board)
    measurements = []
    for i, (pose,k) in poses.items():
        pose = edges(alpha(pose.resize((round(pose.width*k), round(pose.height*k)), Image.Resampling.LANCZOS)))
        a = np.asarray(pose)
        jeans = (a[..., 2] > a[..., 0]*1.2) & (a[..., 2] >= a[..., 1]*.95) & (a[..., 1] < 150) & (a[..., 3] > 128)
        yy, xx = np.where(jeans)
        x, y = 128-round(float(np.median(xx))), 377-pose.height
        if x < 0 or x+pose.width > 512 or y < 0:
            raise ValueError(f'Finisher {i} exceeds its registration canvas: {x,y,pose.size}')
        frame = Image.new('RGBA', (512, 384)); frame.alpha_composite(pose, (x,y))
        atlas.alpha_composite(frame, (i%4*512, i//4*384))
        for row, bg in enumerate(('#17131a', '#e8dfcc')):
            bx, by = i%4*512, row*1536+i//4*384
            d.rectangle((bx,by,bx+512,by+384), fill=bg)
            board.alpha_composite(frame, (bx,by))
        measurements.append({'pose':i,'bbox':frame.getbbox(),'chadOrigin':[128,377]})
    atlas.save(STAGE / 'finish_pair.png', optimize=True)
    board.convert('RGB').save(REVIEW / 'finisher-pairs-and-edges.png')
    # The actual gameplay idle stands beside every edited pair at the same 2x art scale.
    reference = Image.open(ROOT / 'assets/frames/chad_idle_cigar6.png').convert('RGBA')
    identity = Image.new('RGB', (2560, 1600), '#17131a')
    label = ImageDraw.Draw(identity)
    for i in range(16):
        x,y = i%4*640,i//4*400
        identity.paste(reference, (x+22,y+377-reference.height), reference)
        frame = atlas.crop((i%4*512,i//4*384,i%4*512+512,i//4*384+384))
        identity.paste(frame,(x+128,y),frame)
        label.text((x+12,y+386),f'{i+1:02d}   Gameplay CHAD | Paired action',fill='#d9c59a')
    identity.save(REVIEW / 'finisher-chad-identity.png')
    (REVIEW / 'finisher-registration.json').write_text(json.dumps(measurements,indent=2)+'\n')
    print(STAGE / 'finish_pair.png')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('what', choices=['sprites', 'arena', 'finisher'])
    p.add_argument('--register', action='store_true')
    args = p.parse_args()
    {'sprites':lambda:sprites(args.register),'arena':arena,'finisher':finisher}[args.what]()
