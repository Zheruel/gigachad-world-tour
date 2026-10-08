"""--film: stitch delhi_life_market_review.cjs captures into one filmstrip row per subject
(tmp/review/delhi_life_market/film.png). Default: contact sheet of the Delhi market life strips (js/delhi_life_market.js) over dark, light and plate
backgrounds at 2x, for edge and grade checks. Writes tmp/review/delhi_life_market/strips.png."""
import json, sys
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[2]
D = ROOT / 'assets/stages/dirty_delhi/market_life'
plate = Image.open(ROOT / 'assets/stages/dirty_delhi/rebuild/bazaar.png').convert('RGBA')
if '--film' in sys.argv:
    shots = json.load(open(ROOT / 'tmp/review/delhi_life_market/film/film.json')); rows = {}
    for s in shots:
        x, y, w, h = s['box']; rows.setdefault(s['name'], []).append(Image.open(ROOT / s['file']).crop((x * 2, y * 2, (x + w) * 2, (y + h) * 2)))
    W = max(len(r) * r[0].width for r in rows.values()); H = sum(r[0].height for r in rows.values())
    sheet = Image.new('RGB', (W, H)); y = 0
    for r in rows.values():
        for i, im in enumerate(r):
            sheet.paste(im, (i * im.width, y))
        y += r[0].height
    sheet.save(ROOT / 'tmp/review/delhi_life_market/film.png'); print(sheet.size); sys.exit()
ims = [(p.stem, Image.open(p)) for p in sorted(D.glob('*.png'))]
W = max(im.width for _, im in ims); H = sum(im.height + 8 for _, im in ims)
out = Image.new('RGBA', (W * 3 + 16, H), (0, 0, 0, 255))
y = 0
for name, im in ims:
    for k, bg in enumerate([(20, 16, 14, 255), (200, 190, 170, 255), None]):
        tile = Image.new('RGBA', im.size, bg) if bg else plate.crop((600, 540 - im.height, 600 + im.width, 540)) if im.width <= 1620 else Image.new('RGBA', im.size, (60, 40, 30, 255))
        tile = tile.copy(); tile.alpha_composite(im); out.paste(tile, (k * (W + 8), y))
    y += im.height + 8
out.save(ROOT / 'tmp/review/delhi_life_market/strips.png')
print(out.size)
