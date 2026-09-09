"""Split authored car wheels into fixed brakes and rotating transparent spokes."""
from pathlib import Path
import math
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'assets/travel/city'
WHEELS = [(89, 86, 24, 28), (350, 91, 25, 28)]
CELL = 96

def main():
    car = Image.open(OUT / 'car_driver.png').convert('RGBA')
    source = Image.open(ROOT / 'assets/sources/travel/city/brake_hardware.png').convert('RGBA')
    brake = source.crop((66, 50, 1190, 1190)).resize((CELL, CELL), Image.Resampling.LANCZOS)
    yy, xx = np.indices((CELL, CELL)); radius = np.hypot((xx+.5-48)/48, (yy+.5-48)/48)
    fixed = np.array(brake); fixed[radius>.9] = 0
    Image.fromarray(fixed).save(OUT / 'wheel_brake.png')
    atlas = Image.new('RGBA', (CELL*2, CELL))
    for i, (x, y, rx, ry) in enumerate(WHEELS):
        rim = car.crop((x-rx, y-ry, x+rx, y+ry)).resize((CELL, CELL), Image.Resampling.LANCZOS)
        mask = Image.new('L', (CELL, CELL)); draw = ImageDraw.Draw(mask)
        points = []
        for j in range(10):
            angle = -math.pi/2+j*math.pi/5
            r = 48*(.80 if j%2==0 else .34)
            points.append((48+math.cos(angle)*r, 48+math.sin(angle)*r))
        draw.polygon(points, fill=255)
        a = np.array(rim); rgb = a[:,:,:3].astype(float)
        red = (rgb[:,:,0]>rgb[:,:,1]*1.5)&(rgb[:,:,0]>rgb[:,:,2]*1.5)&(rgb[:,:,0]>45)
        keep = ((np.array(mask)>0)|((radius>=.78)&(radius<=.9)))&~red
        a[~keep] = 0
        atlas.alpha_composite(Image.fromarray(a), (i*CELL, 0))
    atlas.save(OUT / 'wheel_rims.png')

if __name__ == '__main__':
    main()
