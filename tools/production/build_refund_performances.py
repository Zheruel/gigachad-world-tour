#!/usr/bin/env python3
"""Register the rebuilt Refund cast, preserving all unrelated manifest families.

Every 4×4 source has an approved standing calibration pose in cell zero.
Preview sheets before --register; registration.json holds measured corrections.
"""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from build_delhi_cast_performances import cells, register, SIZE, SOLE
from sprite_edges import alpha, edges
from refund_gait_registration import walk_scale, place_sole

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul/cast/performances'
OUT = ROOT / 'tmp/review/refund-overhaul/cast'
FRAMES = ROOT / 'assets/frames'
RUNTIME = ROOT / 'assets/stages/refund_tower/overhaul'
FAMILIES = {'caller': ('ic_headset', 174), 'operator': ('ic_operator', 168),
            'technician': ('ic_thrower', 174), 'security': ('ic_security', 188),
            'recovery': ('ic_cabinet', 208), 'supervisor': ('ic_lead', 180)}
ref = lambda sheet, ids: [(sheet, i) for i in ids]
loc = lambda *ids: ref('locomotion', ids)
act = lambda *ids: ref('combat', ids)
react = lambda *ids: ref('reactions', ids)
COMMON = {'idle': loc(0, 1), 'revamp_idle': loc(0), 'block': loc(2),
          'walk': loc(*range(4, 16)), 'run': loc(*range(4, 16)),
          'hurt': react(1, 2), 'stagger_polish': react(3, 4, 5, 6),
          'fall': react(7, 8, 9), 'jump': react(7, 8),
          'down': react(10), 'dead': react(10),
          'getup': react(10, 11, 12, 13, 14) + loc(0),
          'super_reaction': react(1, 2, 3, 4, 7, 8, 9, 10)}
MOVES = {
 'caller': {'atk': act(1, 2, 3), 'string': act(*range(1, 10)),
            'shove': act(10, 11, 12), 'taunt': act(13), 'grab': act(14, 15)},
 'operator': {'atk': act(1, 4, 8), 'kick': act(*range(1, 9)),
              'dodge': act(9, 10, 11, 12), 'taunt': act(13)},
 'technician': {'atk': act(8, 9, 11), 'throw': act(1, 2, 3, 4, 5),
                'reload': act(6, 7, 0), 'keyboard': act(8, 9, 10, 11),
                'taunt': act(12)},
 'security': {'atk': act(1, 4, 7), 'lathi': act(*range(1, 8)),
              'jab': act(8, 9, 10, 11), 'taunt': act(13)},
 'recovery': {'atk': act(5, 7, 9), 'punch': act(5, 6, 7, 8, 9),
              'ram': act(1, 2, 3, 4), 'stuck': act(10, 11, 12),
              'taunt': act(13), 'call': act(13, 14, 15),
              'push': ref('push', range(4, 16)), 'push_idle': ref('push', [1, 2])},
 'supervisor': {'atk': act(1, 2, 3), 'string': act(*range(1, 10)),
                'call': act(10, 11, 12, 13, 14, 15), 'taunt': act(10)}
}


def skull_x(frame):
    a = np.asarray(frame); r, g, b = a[..., :3].astype(float).transpose(2, 0, 1)
    top = frame.getbbox()[1]
    skin = (a[..., 3] > 0) & (r > 75) & (r > g * 1.22) & (g > b * 1.12)
    skin[:top+2] = False; skin[top+32:] = False
    return float(np.median(np.where(skin)[1]))


def build(family, only=None):
    runtime, height = FAMILIES[family]
    folder = SOURCE / family
    correction = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
    names = [only] if only else correction.get('_production', ['locomotion', 'combat', 'reactions', 'push', 'desk', 'walkcycle', 'walkguided', 'walkpolish', 'getupbridge', 'pushpolish'])
    paths = [(name, folder / correction.get('_source', {}).get(name, f'{name}.png'))
             for name in names if (folder / correction.get('_source', {}).get(name, f'{name}.png')).exists()]
    dest = OUT / runtime
    dest.mkdir(parents=True, exist_ok=True)
    poses, measurements = {}, {}
    for name, path in paths:
        layout = correction.get('_layout', {}).get(name, [2, 1] if name == 'getupbridge' else [3, 4] if name == 'walkguided' else [4, 3] if name == 'walkcycle' else [4, 4])
        source = cells(path, *layout)
        for patch in correction.get('_patches', {}).get(name, []):
            replacements = cells(folder / patch['file'], *patch.get('layout', [2, 1]))
            common_scale = source[patch['scale_from']].height / replacements[0].height if 'scale_from' in patch else None
            selected = [replacements[i] for i in patch.get('indices', list(replacements))]
            for target, replacement in zip(patch['targets'], selected):
                # Targeted edits keep the original upright body span; they only
                # repair its specified limb or held object, never re-fit a move.
                k = common_scale or source[target].height / replacement.height
                source[target] = replacement.resize((round(replacement.width * k), round(replacement.height * k)), Image.Resampling.LANCZOS)
        scale = height / source[0].height
        gait_anchor = None
        if name == 'getupbridge':
            # Bridge0 is a curled roll, not an upright calibration pose. Its
            # authored body scale follows the old knee-up silhouette span.
            kneel = Image.open(dest / 'reactions_11.png')
            scale = (SOLE - kneel.getbbox()[1]) / source[1].height
        for i, im in source.items():
            key = f'{name}_{i:02d}'
            spec = correction.get(key, {})
            pose_scale = walk_scale(im, height, i) if name == 'walkpolish' and 2 <= i <= 21 and correction.get('_gait_height_template') else scale * spec.get('scale', 1)
            frame = register(im, pose_scale,
                             name == 'getupbridge' or name == 'reactions' and (7 <= i <= 12 or i in [16, 17]),
                             tuple(spec.get('offset', [0, 0])))
            if name in correction.get('_registered_gaits', []):
                complete = Image.open(path).convert('RGBA')
                frame = complete.crop((i % layout[0] * SIZE[0], i // layout[0] * SIZE[1],
                                       (i % layout[0]+1)*SIZE[0], (i // layout[0]+1)*SIZE[1]))
                frame = edges(alpha(frame))
            elif name == 'walkpolish' and 2 <= i <= 21:
                # Generated shoe widths must not move the entire skull left
                # and right when the pose's torso is re-centred.
                head = skull_x(frame)
                if gait_anchor is None: gait_anchor = head
                aligned = Image.new('RGBA', SIZE)
                aligned.alpha_composite(frame, (round(gait_anchor-head), 0))
                frame = aligned
            if name in ['push', 'pushpolish'] and i != 0 or family == 'recovery' and name == 'combat' and i in [1, 2, 3, 4, 10, 12]:
                # The cabinet is a separate physical prop; contact stays fixed.
                a = np.array(frame); r, g, b = a[..., :3].astype(int).transpose(2, 0, 1)
                skin = (a[..., 3] > 0) & (r > 75) & (r > g * 1.22) & (g > b * 1.12)
                skin[170:] = False
                ys, xs = np.where(skin)
                if len(xs) < 10: raise ValueError(f'{family}/{key}: cannot locate palms')
                shifted = Image.new('RGBA', SIZE)
                shifted.alpha_composite(frame, (208 - int(xs.max()), 0))
                frame = shifted
            frame = place_sole(frame, spec.get('sole_shift', 0), height)
            upper = correction.get('_upperbody', {}).get(key)
            if upper:
                donor = Image.new('RGBA', SIZE)
                donor.alpha_composite(poses[name, upper['from']], (0, upper.get('dy', 0)))
                seam = upper['seam']
                joined = Image.new('RGBA', SIZE)
                joined.alpha_composite(donor.crop((0, 0, SIZE[0], seam)))
                joined.alpha_composite(frame.crop((0, seam, SIZE[0], SIZE[1])), (0, seam))
                frame = edges(alpha(joined))
            frame.save(dest / f'{key}.png', optimize=True)
            poses[name, i] = frame
            measurements[key] = {'source': im.size, 'scale': scale, 'bbox': frame.getbbox()}
        for background, color in [('dark', '#16191e'), ('light', '#d7d0c2')]:
            board = Image.new('RGBA', (SIZE[0] * layout[0], SIZE[1] * layout[1]), color)
            draw = ImageDraw.Draw(board)
            for i in source:
                x, y = i % layout[0] * SIZE[0], i // layout[0] * SIZE[1]
                board.alpha_composite(poses[name, i], (x, y))
                draw.text((x + 8, y + 8), str(i), fill='#b59774')
            board.save(OUT / f'{family}-{name}-{background}.png')
    (dest / 'measurements.json').write_text(json.dumps(measurements, indent=2) + '\n')
    states = {**COMMON, **MOVES[family]}
    if (folder / 'walkcycle.png').exists():
        states['walk'] = states['run'] = ref('walkcycle', range(12))
    if (folder / 'walkguided.png').exists():
        states['walk'] = states['run'] = ref('walkguided', range(12))
    if (folder / correction.get('_source', {}).get('walkpolish', 'walkpolish.png')).exists():
        states['walk'] = states['run'] = ref('walkpolish', correction.get('_walk_ids', list(range(2, 16))))
    if (folder / correction.get('_source', {}).get('getupbridge', 'getupbridge.png')).exists():
        states['getup'] = react(10) + ref('getupbridge', [0, 1]) + react(11, 12, 13, 14) + loc(0)
    if correction.get('_getup_reactions'):
        states['getup'] = react(*correction['_getup_reactions']) + loc(0)
    if (folder / correction.get('_source', {}).get('pushpolish', 'pushpolish.png')).exists():
        states['push'] = ref('pushpolish', correction.get('_push_ids', list(range(2, 16))))
        states['push_idle'] = ref('pushpolish', [1, 1])
    return runtime, {state: [f'{runtime}/refund_{s}_{i:02d}.png' for s, i in refs]
                     for state, refs in states.items()
                     if (not only or any(s == only for s, i in refs))
                     and all((s, i) in poses or (dest / f'{s}_{i:02d}.png').exists() for s, i in refs)}


def desks():
    for kind, ids in [('office_life', list(range(1, 9))), ('office_stand', list(range(9, 16)) + [0])]:
        atlas = Image.new('RGBA', (SIZE[0] * 8, SIZE[1] * 3))
        for row, name in enumerate(['caller', 'operator', 'technician']):
            runtime, _ = FAMILIES[name]
            for col, i in enumerate(ids):
                path = OUT / runtime / f'desk_{i:02d}.png'
                correction_path = SOURCE / name / 'registration.json'
                correction = json.loads(correction_path.read_text()) if correction_path.exists() else {}
                if kind == 'office_stand' and col == 7 and correction.get('_desk_finish_guard'):
                    path = OUT / runtime / 'locomotion_00.png'
                if not path.exists(): return
                atlas.alpha_composite(Image.open(path), (col * SIZE[0], row * SIZE[1]))
        atlas.save(RUNTIME / f'{kind}.png', optimize=True)


def typing():
    """Three keyboard heights share each actor's grounded seated registration."""
    atlases = [Image.open(RUNTIME / 'office_life.png').convert('RGBA') for _ in range(3)]
    for row, family in enumerate(['caller', 'operator', 'technician']):
        folder = SOURCE / family
        correction = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
        path = folder / correction.get('_typing', 'typing-stable.png' if (folder / 'typing-stable.png').exists() else 'typing.png')
        poses = cells(path, 4, 3)
        for typing_row, filename in correction.get('_typing_rows', {}).items():
            typing_row = int(typing_row)
            replacements = cells(folder / filename, 4, 1)
            k = poses[typing_row*4].height / replacements[0].height
            for j, im in replacements.items():
                poses[typing_row*4+j] = im.resize((round(im.width*k), round(im.height*k)), Image.Resampling.LANCZOS)
        runtime, _ = FAMILIES[family]
        approved = Image.open(OUT / runtime / 'desk_01.png').convert('RGBA')
        scale = (SOLE - approved.getbbox()[1]) / poses[0].height
        def skull_x(im):
            a = np.array(im); r, g, b = a[..., :3].astype(int).transpose(2, 0, 1)
            y0 = im.getbbox()[1]
            skin = (a[..., 3] > 0) & (r > 75) & (r > g * 1.22) & (g > b * 1.12)
            skin[:y0+3] = False; skin[y0+35:] = False
            return float(np.median(np.where(skin)[1]))
        anchor = skull_x(approved)
        canonical = register(poses[0], scale)
        base = Image.new('RGBA', SIZE)
        base.alpha_composite(canonical, (round(anchor - skull_x(canonical)), 0))
        top = base.getbbox()[1]
        waist = SOLE - (68 if family == 'technician' else 66 if family == 'operator' else 73)
        # Typing changes arms only. Reuse the approved first typing body's
        # grounded hips/legs and skull; generated lower rows sometimes shorten
        # shins. Align the upper painting by its head, never by those short legs.
        head_box = (round(anchor)-22, top, round(anchor)+22, top+31)
        for i, pose in poses.items():
            frame = register(pose, scale)
            shifted = Image.new('RGBA', SIZE)
            shifted.alpha_composite(frame, (round(anchor - skull_x(frame)), top-frame.getbbox()[1]))
            # Only replace the lower-body span on each scanline. The low
            # keyboard's fingers sit below the waist and ahead of the knees;
            # copying the whole rectangular band would erase those fingers.
            for y in range(waist, SIZE[1]):
                row_alpha = np.asarray(base)[y, :, 3]
                occupied = np.flatnonzero(row_alpha)
                if occupied.size:
                    left = max(0, int(occupied.min())-3)
                    right = min(SIZE[0], int(occupied.max())+4)
                    shifted.paste(base.crop((left, y, right, y+1)), (left, y))
            shifted.paste(base.crop(head_box), head_box[:2])
            shifted = edges(alpha(shifted))
            contact = correction.get('_typing_contact', {}).get(str(i//4))
            if contact is not None:
                # Register the generated outstretched forearm to the actual
                # key plane. A small shear tapers to zero before the elbow;
                # the seated torso, shoulder, skull and legs stay fixed.
                a = np.asarray(shifted)
                r, g, b = a[..., :3].astype(float).transpose(2, 0, 1)
                yy, xx = np.indices(a.shape[:2])
                skin = (a[..., 3] > 0) & (r > 75) & (r > g*1.22) & (g > b*1.12)
                skin &= (xx > 205) & (yy > 175) & (yy < 230)
                right = int(np.where(skin)[1].max())
                finger = skin & (xx >= right-8)
                delta = int(np.where(finger)[0].max()) - int(contact)
                if not -8 <= delta <= 8:
                    raise ValueError(f'{family}/typing{i}: authored arm needs repair, offset {delta}')
                start = right-35
                arm_skin = skin & (xx >= start) & (yy < 218)
                mask = np.asarray(Image.fromarray((arm_skin*255).astype('uint8')).filter(ImageFilter.MaxFilter(3))) > 0
                # Preserve the trouser painting under the forearm.
                mask &= arm_skin | ((r < 60) & (g < 60) & (b < 60))
                removed = a.copy(); removed[mask] = 0
                adjusted = Image.fromarray(removed)
                for x in range(start, right+4):
                    dy = round(delta * min(1, max(0, (x-start)/21)))
                    strip = a[:, x:x+1].copy(); strip[~mask[:, x:x+1]] = 0
                    adjusted.alpha_composite(Image.fromarray(strip), (x, -dy))
                shifted = edges(alpha(adjusted))
            shifted.save(OUT / runtime / f'typing_{i:02d}.png')
            col, height = i % 4, i // 4
            atlases[height].paste((0, 0, 0, 0), (col*SIZE[0], row*SIZE[1], (col+1)*SIZE[0], (row+1)*SIZE[1]))
            atlases[height].alpha_composite(shifted, (col*SIZE[0], row*SIZE[1]))
    for atlas, name in zip(atlases, ['high', 'medium', 'low']):
        atlas.save(RUNTIME / f'office_life_{name}.png', optimize=True)


def turns():
    atlas = Image.new('RGBA', (SIZE[0]*6, SIZE[1]*3))
    for row, family in enumerate(['caller', 'operator', 'technician']):
        runtime, height = FAMILIES[family]
        folder = SOURCE / family
        correction = json.loads((folder / 'registration.json').read_text()) if (folder / 'registration.json').exists() else {}
        poses = cells(folder / correction.get('_turn', 'turn.png'), 3, 2)
        scale = height / poses[0].height
        for i, source_index in enumerate(correction.get('_turn_order', list(poses))):
            image = poses[source_index]
            frame = register(image, scale)
            frame.save(OUT / runtime / f'turn_{i:02d}.png')
            atlas.alpha_composite(frame, (i*SIZE[0], row*SIZE[1]))
    atlas.save(RUNTIME / 'office_turn.png', optimize=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('families', nargs='*', choices=list(FAMILIES))
    parser.add_argument('--only')
    parser.add_argument('--register', action='store_true')
    parser.add_argument('--typing', action='store_true')
    parser.add_argument('--turns', action='store_true')
    args = parser.parse_args()
    if args.typing:
        typing(); return
    if args.turns:
        turns(); return
    changes = dict(build(n, args.only) for n in args.families or FAMILIES)
    if args.register:
        with (FRAMES / '.manifest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            path = FRAMES / 'manifest.json'; manifest = json.loads(path.read_text())
            for runtime, states in changes.items():
                for file in {f for files in states.values() for f in files}:
                    source = OUT / runtime / Path(file).name.removeprefix('refund_')
                    (FRAMES / file).write_bytes(source.read_bytes())
                manifest[runtime] = {**manifest.get(runtime, {}), **states} if args.only else states
            pending = FRAMES / 'manifest.refund.pending.json'
            pending.write_text(json.dumps(manifest, indent=2) + '\n'); pending.replace(path)
        desks()
    print(json.dumps({key: {s: len(files) for s, files in states.items()} for key, states in changes.items()}))


if __name__ == '__main__': main()
