"""Register the approved GPT Image GO art at 2x gameplay resolution."""
from pathlib import Path
from PIL import Image
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
im = alpha(Image.open(ROOT / 'assets/sources/production/ui/advance/go-approved.png').convert('RGBA'))
im = im.crop(im.getbbox())
size = (144, round(im.height * 144 / im.width))
im = edges(alpha(im.resize(size, Image.Resampling.LANCZOS), speck=1))
im.save(ROOT / 'assets/ui/go_sign.png')
print(size)
