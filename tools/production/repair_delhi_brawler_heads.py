"""Apply approved head art without moving or repainting the Delhi brawler's body.

The canonical neutral head is cropped from the GPT-authored approved guard.
Angle-specific patches are GPT edits. Original sheets remain body sources;
this post-registration overlay keeps their native poses and stride exact.
"""
from pathlib import Path
import argparse
import fcntl
import json
import numpy as np
from PIL import Image, ImageDraw
from keying import components
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/dirty_delhi/street_cast/performances/brawler/head_consistency'
REVIEW = ROOT / 'tmp/review/delhi-cast/head-consistency/candidate'


def build_angle_patches(folder=SOURCE):
    """Crop GPT-authored angled heads at the existing registered head anchors."""
    entries = json.loads((folder / 'angle-specs.json').read_text())
    for name, entry in entries.items():
        source = Image.open(folder / 'gpt-angle-edits' / f"{entry['source']}.png").convert('RGBA')
        mask = Image.new('L', source.size)
        ImageDraw.Draw(mask).polygon(entry['polygon'], fill=255)
        source.putalpha(Image.fromarray(np.minimum(np.array(source.getchannel('A')), np.array(mask))))
        head = edges(alpha(source.crop(entry['box']).resize(entry['size'], Image.Resampling.LANCZOS)))
        patch = Image.new('RGBA', (360, 300))
        patch.alpha_composite(head, entry['at'])
        patch.save(folder / name.replace('delhi_', 'head_'))


def overlay_head(frame, key, folder=SOURCE, *, preview=False):
    """Only replace the old head component and composite authored head pixels."""
    spec_path = folder / 'head-specs.json'
    if not spec_path.exists():
        return frame
    spec = json.loads(spec_path.read_text())
    if not preview and not spec.get('approved', False):
        return frame
    name = f'delhi_{key}.png'
    entry = spec['frames'].get(name)
    if not entry:
        return frame
    dx, dy = entry.get('offset', [0, 0])
    polygon = entry.get('clear_polygon', spec['cut_polygon'])
    mask = Image.new('L', frame.size)
    ImageDraw.Draw(mask).polygon([(x + dx, y + dy) for x, y in polygon], fill=255)
    a = np.array(frame)
    parts = components((a[..., 3] > 0) & (np.array(mask) > 0))
    if not parts:
        raise ValueError(f'{name}: no head in repair mask')
    # Raised fists can enter the head rectangle. Keep their disconnected pixels.
    head = max(parts, key=len)
    a[head[:, 0], head[:, 1]] = 0
    # Explicit stale-hair remnants avoid clearing neighbouring raised hands/shoulders.
    for x, y in entry.get('clear_pixels', []):
        a[y + dy, x + dx] = 0
    out = Image.fromarray(a)
    patch = Image.open(folder / entry.get('patch', spec['master'])).convert('RGBA')
    if patch.size != frame.size:
        raise ValueError(f'{name}: patch must use the native {frame.size} canvas')
    out.alpha_composite(patch, (dx, dy))
    if set(np.unique(np.array(out)[..., 3])) != {0, 255}:
        raise ValueError(f'{name}: non-binary alpha in head patch')
    return out


def review():
    spec = json.loads((SOURCE / 'head-specs.json').read_text())
    REVIEW.mkdir(parents=True, exist_ok=True)
    frames, measurements = {}, {}
    for name, entry in spec['frames'].items():
        base = Image.open(SOURCE / 'baseline-native' / name).convert('RGBA')
        key = name.removeprefix('delhi_').removesuffix('.png')
        result = overlay_head(base, key, preview=True)
        result.save(REVIEW / name)
        frames[name] = result
        before, after = np.array(base), np.array(result)
        changed = np.any(before != after, axis=2)
        ys, xs = np.where(changed)
        measurements[name] = {'changed_pixels': int(changed.sum()),
                              'changed_bbox': [int(xs.min()), int(ys.min()), int(xs.max() + 1), int(ys.max() + 1)] if len(xs) else None,
                              'alpha': sorted(int(v) for v in np.unique(after[..., 3])),
                              'offset': entry.get('offset', [0, 0])}
    cols, rows = 4, (len(frames) + 3) // 4
    for label, bg in [('dark', '#15191d'), ('light', '#ddd8cd')]:
        sheet = Image.new('RGBA', (360 * cols, 300 * rows), bg)
        heads = Image.new('RGBA', (320 * cols, 280 * rows), bg)
        draw, hd = ImageDraw.Draw(sheet), ImageDraw.Draw(heads)
        for i, (name, frame) in enumerate(frames.items()):
            x, y = i % cols * 360, i // cols * 300
            sheet.alpha_composite(frame, (x, y))
            draw.text((x + 5, y + 5), name, fill='#bd985c')
            dx, dy = spec['frames'][name].get('offset', [0, 0])
            box = spec['frames'][name].get('review_box', [158 + dx, 112 + dy, 238 + dx, 176 + dy])
            crop = frame.crop(box).resize((320, 256), Image.Resampling.NEAREST)
            x, y = i % cols * 320, i // cols * 280
            heads.alpha_composite(crop, (x, y + 24))
            hd.text((x + 5, y + 3), name, fill='#bd985c')
        sheet.save(REVIEW / f'{label}.png')
        heads.save(REVIEW / f'heads-{label}.png')
    (REVIEW / 'pixel-audit.json').write_text(json.dumps(measurements, indent=2) + '\n')
    return frames


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--register', action='store_true')
    p.add_argument('--build-angle-patches', action='store_true')
    args = p.parse_args()
    if args.build_angle_patches:
        build_angle_patches()
    frames = review()
    if args.register:
        spec = json.loads((SOURCE / 'head-specs.json').read_text())
        if not spec.get('approved', False):
            raise ValueError('Head corrections need independent approval before registration')
        dest = ROOT / 'assets/frames'
        with (dest / '.manifest.lock').open('a') as lock:
            fcntl.flock(lock, fcntl.LOCK_EX)
            manifest = json.loads((dest / 'manifest.json').read_text())
            used = {Path(file).name for files in manifest['ic_brawler'].values() for file in files}
            for name, frame in frames.items():
                if name not in used:
                    raise ValueError(f'{name}: correction does not match the existing manifest')
                frame.save(dest / 'ic_brawler' / name)
    print(json.dumps({'head_frames': len(frames), 'registered': args.register}))


if __name__ == '__main__':
    main()
