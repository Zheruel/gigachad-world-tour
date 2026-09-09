"""Remove extraction matte spill from train props without eroding silhouettes."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/night_train/rebuild/prop_edges'
OUT = ROOT / 'assets/stages/night_train/rebuild'

def clean_prop_edges(im):
    a = np.array(im.convert('RGBA'))
    rgb = a[:, :, :3].astype(float)
    alpha = a[:, :, 3]
    edge = np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(5))) < 128
    spill = np.minimum(rgb[:, :, 0]-rgb[:, :, 1], rgb[:, :, 2]-rgb[:, :, 1])
    bad = edge & (alpha > 0) & (spill > 18)
    # Replace only contaminated edge colour with nearby uncontaminated material.
    # Alpha and registration remain exact; gold trim and white highlights survive.
    good = (alpha > 200) & (spill <= 18)
    for y, x in zip(*np.where(bad)):
        y0,y1=max(0,y-3),min(a.shape[0],y+4)
        x0,x1=max(0,x-3),min(a.shape[1],x+4)
        ys,xs=np.where(good[y0:y1,x0:x1])
        if len(xs):
            k=np.argmin((ys+y0-y)**2+(xs+x0-x)**2)
            a[y,x,:3]=rgb[ys[k]+y0,xs[k]+x0].astype('uint8')
        else:
            a[y,x,0]=max(0,rgb[y,x,0]-spill[y,x])
            a[y,x,2]=max(0,rgb[y,x,2]-spill[y,x])
    a[alpha==0,:3]=0
    return Image.fromarray(a)

def main():
    for source in sorted(SOURCE.glob('prop_*.png')):
        clean_prop_edges(Image.open(source)).save(OUT/source.name)
if __name__ == '__main__':main()
