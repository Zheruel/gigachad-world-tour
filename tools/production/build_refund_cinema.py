"""Register the retained wall-crack overlay for the approved breach."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/rebuild'
OUT = ROOT / 'assets/stages/refund_tower'

def build():
    wall = ImageOps.fit(Image.open(SOURCE/'wall_cracked.png').convert('RGBA'), (460,724), Image.Resampling.LANCZOS)
    mask = Image.new('L', wall.size)
    ImageDraw.Draw(mask).rounded_rectangle((110,252,350,637), 16, fill=255)
    wall.putalpha(mask.filter(ImageFilter.GaussianBlur(5)))
    wall.save(OUT/'wall_cracked.png', optimize=True)

if __name__ == '__main__':
    build()
