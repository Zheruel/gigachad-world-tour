"""Register the generated shallow pantry wall, preserving windows, floor and joins."""
from pathlib import Path
from PIL import Image
import numpy as np
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/night_train/rebuild/snack_counter'
def main():
    base = Image.open(SOURCE / 'registered_base.png').convert('RGBA')
    selected = Image.open(SOURCE / 'selected.png').convert('RGBA').resize(base.size, Image.Resampling.LANCZOS)
    # Replace only the impossible recess. Adjacent cabinets hide the side joins;
    # preserve the existing transparent windows and every walkable floor pixel.
    y, x = np.indices((base.height, base.width))
    mask = np.minimum.reduce([(x-318)/9, (605-x)/9, (y-78)/9, (367-y)/9]).clip(0, 1)
    Image.composite(selected, base, Image.fromarray((mask*255).astype('uint8'))).save(ROOT / 'assets/stages/night_train/rebuild/pantry.png')
if __name__ == '__main__':
    main()
