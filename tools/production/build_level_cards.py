"""Resize selected level-card artwork to the game's 2x authored canvas."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
for name in ('locomotive', 'rooftop', 'station', 'station-grit', 'baggage', 'last-stop'):
    source = ROOT / f'assets/sources/travel/india/level-cards/{name}.png'
    target = ROOT / f'assets/travel/india/level-cards/{name}.png'
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source) as im:
        im.convert('RGB').resize((960, 540), Image.Resampling.LANCZOS).save(target, optimize=True)
