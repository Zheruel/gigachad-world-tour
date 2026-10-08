"""Contact sheets of Shera's (nr_neta_guard) registered states at 2x, next to CHAD's idle at game scale.

.venv/bin/python tools/verification/shera_cells_review.py [out_dir] [state ...]
Each state gets one row per background (dark, light): CHAD (192 px) then every cell on its canvas sole line, so size,
registration pops, fringes and identity drift show side by side. SHERA_FRAMES=<dir> reviews a dry-run build.
"""
import json, os, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
FR = Path(os.environ.get('SHERA_FRAMES', ROOT / 'assets/frames'))
KEY = 'nr_neta_guard'


def chad():
    im = Image.open(ROOT / 'assets/frames/chad_sidle1.png').convert('RGBA'); im = im.crop(im.getbbox())
    return im.resize((round(im.width * 192 / im.height), 192), Image.LANCZOS)


def sheet(states, manifest, bg, out):
    rows = [(st, manifest[KEY][st]) for st in states if st in manifest[KEY]]
    cells = {f: Image.open(FR / f).convert('RGBA') for _, fs in rows for f in fs}
    cw = max(im.width for im in cells.values()); ch = max(im.height for im in cells.values())
    cols = max(len(fs) for _, fs in rows) + 1; c = chad()
    page = Image.new('RGBA', (cols * cw // 2 + 40, len(rows) * (ch // 2 + 18)), bg); d = ImageDraw.Draw(page)
    ink = 'white' if bg[1] < '8' else 'black'
    for r, (st, fs) in enumerate(rows):
        y = r * (ch // 2 + 18); sole = y + ch // 2 - 4
        half = c.resize((c.width // 2, c.height // 2), Image.LANCZOS); page.alpha_composite(half, (10, sole - half.height))
        for k, f in enumerate(fs):
            im = cells[f]; im = im.resize((im.width // 2, im.height // 2), Image.LANCZOS)
            x = (k + 1) * cw // 2 + 20 - (im.width - cw // 2) // 2
            page.alpha_composite(im, (x, y + ch // 2 - im.height))
        d.line((0, sole, page.width, sole), fill=(128, 128, 128, 90))
        d.text((4, y + 2), f'{st} ({len(fs)})', fill=ink)
    page.save(out)


def main():
    out = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'tmp/review/shera_rework/run2/shera-art'
    out.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((FR / 'manifest.json').read_text())
    states = sys.argv[2:] or list(manifest[KEY])
    for name, bg in (('dark', '#1d2129'), ('light', '#e9e5da')):
        for i in range(0, len(states), 12):
            sheet(states[i:i + 12], manifest, bg, out / f'shera_cells_{i // 12}_{name}.png')
    idle = Image.open(FR / manifest[KEY]['idle'][0]); ih = idle.getbbox()[3] - idle.getbbox()[1]
    print('idle height', ih, 'px at 2x =', ih / 2, 'logical')


if __name__ == '__main__':
    main()
