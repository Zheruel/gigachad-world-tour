"""Register selected station/coach routines at a fixed scale and common feet."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/night_train/rebuild/station_life.png'
OUT=ROOT/'assets/stages/night_train/rebuild/station_life.png'

def main():
    im=Image.open(SOURCE).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
    # The selected generation returned a neutral checker matte, not alpha.
    # Remove its bright neutral colors; newspaper and warm cloth remain colored.
    a[(rgb.min(2)>195)&((rgb.max(2)-rgb.min(2))<20),3]=0
    im=Image.fromarray(a);xs=[0,331,636,944,1254];ys=[0,414,837,1254]
    sheet=Image.new('RGBA',(800,600));preview=Image.new('RGBA',(800,630),'#17212a');d=ImageDraw.Draw(preview)
    bounds=[]
    for row in range(3):
        for col in range(4):
            c=im.crop((xs[col],ys[row],xs[col+1],ys[row+1]));a=np.array(c)
            # Remove only pale antialiasing on the silhouette, not internal detail.
            edge=np.array(Image.fromarray(a[:,:,3]).filter(ImageFilter.MinFilter(3)))<128
            rgb=a[:,:,:3].astype(int);a[edge&(rgb.min(2)>145)&((rgb.max(2)-rgb.min(2))<18),3]=0
            a[a[:,:,3]==0,:3]=0;c=Image.fromarray(a);box=c.getbbox();assert box
            c=c.crop(box);scale=.40 if row<2 else .37
            c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            alpha=np.array(c)[:,:,3]>64;footband=alpha[-max(4,round(18*scale)):];fy,fx=np.where(footband)
            anchor=(float(fx.min())+float(fx.max()))/2
            f=Image.new('RGBA',(200,200));f.alpha_composite(c,(round(100-anchor),195-c.height));sheet.alpha_composite(f,(col*200,row*200))
            preview.alpha_composite(f,(col*200,row*210+10));d.line((col*200,row*210+205,col*200+199,row*210+205),fill='#537975');d.text((col*200+4,row*210),f'{row}:{col}',fill='white');bounds.append(f.getbbox())
    sheet.save(OUT);out=ROOT/'tmp/review/train-life-polish';out.mkdir(parents=True,exist_ok=True);preview.save(out/'actors-2x.png');preview.resize((400,315),Image.Resampling.NEAREST).save(out/'actors-native.png')
    print(bounds)
if __name__=='__main__':main()
