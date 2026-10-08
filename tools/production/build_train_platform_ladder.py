"""Boarding ladder under the platform coach door (drawn 27x66 logical)."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageEnhance
from keying import key, keep_main

ROOT = Path(__file__).resolve().parents[2]

def main():
    im = keep_main(key(Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/platform_ladder.png')), near=60)
    im = im.crop(im.getbbox())
    # Stored at 2x the logical size; match the coach plate's night grading.
    im = im.resize((54, 132), Image.Resampling.LANCZOS)
    rgb = ImageEnhance.Color(ImageEnhance.Brightness(im.convert('RGB')).enhance(.74)).enhance(.8)
    out = Image.merge('RGBA', (*rgb.split(), im.getchannel('A')))
    a = np.array(out); a[a[:, :, 3] < 40] = 0; a[a[:, :, 3] >= 40, 3] = 255
    Image.fromarray(a).save(ROOT/'assets/stages/night_train/rebuild/platform_ladder.png')

if __name__ == '__main__':
    main()
