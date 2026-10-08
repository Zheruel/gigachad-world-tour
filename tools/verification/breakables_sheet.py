"""Contact sheet for tools/verification/breakables_review.cjs captures.

Usage: .venv/bin/python tools/verification/breakables_sheet.py before [after ...]
One row per placed breakable, one column per capture frame, each cell a 2x crop
around the prop; labelled sheets land in tmp/review/breakables/<label>-sheet.png.
"""
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path('tmp/review/breakables')
CW, CH = 280, 190  # crop at 960 scale (140x95 logical)


def sheet(label):
    base = ROOT / label
    rows = [r for r in json.loads((base / 'index.json').read_text()) if not r.get('missing')]
    cols = len(rows[0]['frames']) if rows else 0
    out = Image.new('RGB', (180 + cols * CW, 20 + len(rows) * (CH + 4)), (24, 22, 28))
    d = ImageDraw.Draw(out)
    for c, f in enumerate(rows[0]['frames'] if rows else []):
        d.text((180 + c * CW + 4, 4), f['name'], fill=(230, 230, 230))
    for r, row in enumerate(rows):
        y = 20 + r * (CH + 4)
        d.text((4, y + 4), f"{row['stage']} #{row['i']}", fill=(240, 220, 160))
        d.text((4, y + 20), row['kind'], fill=(230, 230, 230))
        d.text((4, y + 36), f"drop: {row.get('drop')}", fill=(160, 220, 160))
        d.text((4, y + 52), f"left: {','.join(row.get('pickups') or []) or '-'}", fill=(160, 200, 240))
        d.text((4, y + 68), f"zones: {row.get('zones')}", fill=(240, 160, 160))
        for c, f in enumerate(row['frames']):
            im = Image.open(base / f"{row['stage']}-{row['i']:02d}-{row['kind']}-{f['name']}-960.png").convert('RGB')
            cx = round((f['px'] - f['camX']) * 2)
            cy = round(f['py'] * 2) - CH + 30
            box = (max(0, min(960 - CW, cx - CW // 2)), max(0, min(540 - CH, cy)))
            out.paste(im.crop((*box, box[0] + CW, box[1] + CH)), (180 + c * CW, y))
    dest = ROOT / f'{label}-sheet.png'
    out.save(dest)
    print(dest, out.size)


for name in sys.argv[1:] or ['after']:
    sheet(name)
