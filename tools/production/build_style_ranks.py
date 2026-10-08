"""Register the generated rank sheet at 2x HUD scale."""
from pathlib import Path
from PIL import Image
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
src = Image.open(ROOT / 'assets/sources/production/ui/style-ranks/ranks-v1.png').convert('RGBA')
out = ROOT / 'assets/ui/style'
out.mkdir(parents=True, exist_ok=True)
for i, name in enumerate(('d', 'c', 'b', 'a', 's', 'ss', 'sss')):
    col, row = i % 3, i // 3
    x0, y0 = round(col * src.width / 3), round(row * src.height / 3)
    x1, y1 = round((col + 1) * src.width / 3), round((row + 1) * src.height / 3)
    if name == 'sss':
        x1 += 20  # last row's neighbouring cells are empty; retain the slash tips
    im = src.crop((x0, y0, x1, y1))
    im = alpha(im)
    im = im.crop(im.getbbox())
    size = (round(im.width * 56 / im.height), 56)
    im = im.resize(size, Image.Resampling.LANCZOS)
    im = edges(alpha(im, speck=1))
    im.save(out / f'{name}.png')
    print(name, size)
