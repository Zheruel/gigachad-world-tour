"""Align three GPT-authored stationary stance poses between approved contacts."""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image
from build_delhi_cast_performances import SOURCE, cells
from sprite_edges import alpha


def crop(path):
    im = alpha(Image.open(path).convert('RGBA'))
    return im.crop(im.getbbox())


def face_marker(im):
    a = np.array(im).astype(float)
    r, g, b = a[..., :3].transpose(2, 0, 1)
    y, x = np.indices(r.shape)
    skin = (a[..., 3] > 0) & (r > 110) & (r - g > 28) & (g - b > 8)
    skin &= (y < im.height * .27) & (x > im.width * .45)
    return float(np.percentile(y[skin], 98))


def main():
    p = argparse.ArgumentParser()
    p.add_argument('family'); p.add_argument('--start', required=True)
    p.add_argument('--end', required=True)
    args = p.parse_args()
    folder = SOURCE / 'performances' / args.family
    start, end = crop(args.start), crop(args.end)
    authored = cells(folder / 'stance-poses.png', 3, 1)
    for i, label in enumerate(['first', 'second', 'third']):
        fixed = folder / f'stance-{label}-fixed.png'
        if fixed.exists(): authored[i] = crop(fixed)
    paired = folder / 'stance-repaired-pair.png'
    if paired.exists():
        pair = cells(paired, 2, 1)
        authored[1], authored[2] = pair[0], pair[1]
    poses = []
    for im in authored.values():
        k = face_marker(start) / face_marker(im)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.Resampling.LANCZOS)
        im = alpha(im); poses.append(im)
    # Cell zero is the unchanged guard scale anchor; the five runtime cells
    # contain the old contact, three authored steps, and the unchanged guard.
    result = [end, start, *poses, end]
    cell = max(360, max(max(im.size) for im in result) + 80)
    sheet = Image.new('RGBA', (cell * 3, cell * 2))
    for i, im in enumerate(result):
        sheet.alpha_composite(im, (i % 3 * cell + (cell - im.width) // 2,
                                   (i // 3 + 1) * cell - 30 - im.height))
    sheet.save(folder / 'settle.png')
    path = folder / 'registration.json'
    spec = json.loads(path.read_text()) if path.exists() else {}
    spec.setdefault('_layout', {})['settle'] = [3, 2]
    path.write_text(json.dumps(spec, indent=2) + '\n')
    print(json.dumps({'family': args.family, 'source': str(folder / 'settle.png'),
                      'heights': [im.height for im in result]}))


if __name__ == '__main__':
    main()
