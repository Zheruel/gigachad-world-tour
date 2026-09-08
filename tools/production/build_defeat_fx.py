"""Extract selected transparent arcade KO bursts, accessories and floor residue."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]

def main():
    source=Image.open(ROOT/'assets/sources/production/fx/defeats/arcade_ko.png').convert('RGBA')
    edges=[0,310,692,1096,source.width];rows=[0,360,770,source.height]
    atlas=Image.new('RGBA',(512,384));preview=Image.new('RGBA',(512,384),(31,24,22,255))
    for i in range(12):
        col=i%4;row=i//4;c=source.crop((edges[col],rows[row],edges[col+1],rows[row+1]));bounds=c.getbbox()
        if row<2:
            # Uniform scale keeps the contact flash smaller than the expanding burst.
            scale=.22 if row==0 else .28
            anchors=[(163,184),(510,185),(890,188),(1280,189)] if row==0 else [(161,540),(510,542),(895,555),(1284,555)]
            ax,ay=anchors[col];x=64+(edges[col]-ax)*scale;y=64+(rows[row]-ay)*scale
        else:
            c=c.crop(bounds);scale=[.09,.12,.085,.14][col];x=64-c.width*scale/2;y=64-c.height*scale/2
        c=c.resize((max(1,round(c.width*scale)),max(1,round(c.height*scale))),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(128,128));f.alpha_composite(c,(round(x),round(y)))
        a=np.array(f);a[a[:,:,3]<32]=0;f=Image.fromarray(a)
        atlas.alpha_composite(f,(col*128,row*128));preview.alpha_composite(f,(col*128,row*128))
    atlas.save(ROOT/'assets/fx/arcade_defeats.png')
    out=ROOT/'tmp/review/defeat-fx';out.mkdir(parents=True,exist_ok=True);preview.save(out/'families-2x.png');preview.resize((256,192),Image.Resampling.NEAREST).save(out/'families-native.png')
if __name__=='__main__':main()
