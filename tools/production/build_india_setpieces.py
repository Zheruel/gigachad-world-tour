"""Register the selected cinematic scenery; retain scale through structural damage."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from build_train_rebuild import keyed
from build_train_coaches import clean_edge

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages'
OUT=ROOT/'assets/stages/india/cinematics'

def extract(im, neutral=False):
    im=keyed(im.convert('RGBA'))
    a=np.array(im)
    if neutral:
        rgb=a[:,:,:3].astype(int)
        a[(rgb.min(2)>175)&(rgb.max(2)-rgb.min(2)<18),3]=0
        im=Image.fromarray(a)
    return clean_edge(im)

def build(name,stage,size,neutral=False):
    im=Image.open(SOURCE/stage/'cinematics'/f'{name}.png')
    cells=[]
    for row in range(2):
        for col in range(2):
            box=(round(col*im.width/2),round(row*im.height/2),round((col+1)*im.width/2),round((row+1)*im.height/2))
            c=im.crop(box)
            if name!='success_set': c=extract(c,neutral)
            cells.append(c)
    atlas=Image.new('RGBA',(size[0]*2,size[1]*2))
    if name=='success_set':
        for i,c in enumerate(cells):
            c=c.convert('RGBA').resize(size,Image.Resampling.NEAREST)
            # Keep joins local to the existing wall insert, not a new scene rectangle.
            a=np.array(c);yy,xx=np.indices(a.shape[:2]);edge=np.minimum.reduce([xx,yy,size[0]-1-xx,size[1]-1-yy]);a[:,:,3]=(np.clip(edge/14,0,1)*255).astype('uint8');c=Image.fromarray(a)
            atlas.alpha_composite(c,(i%2*size[0],i//2*size[1]))
    else:
        boxes=[c.getbbox() for c in cells]
        scales=[min((size[0]-8)/(b[2]-b[0]),(size[1]-8)/(b[3]-b[1])) for b in boxes]
        scale=min(scales) # one physical scale, including collapsed silhouettes
        for i,(c,b) in enumerate(zip(cells,boxes)):
            c=c.crop(b);c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            atlas.alpha_composite(c,(i%2*size[0]+(size[0]-c.width)//2,i//2*size[1]+size[1]-c.height-2))
    OUT.mkdir(parents=True,exist_ok=True);atlas.save(OUT/f'{name}.png')

if __name__=='__main__':
    build('market_set','dirty_delhi',(384,256))
    build('kitchen_set','dirty_delhi',(768,512))
    build('dredger_set','dirty_delhi',(768,512),True)
    build('success_set','refund_tower',(684,580))
    source=SOURCE/'dirty_delhi/cinematics/river_splash.png'
    if source.exists():
        im=Image.open(source);atlas=Image.new('RGBA',(512*8,512))
        for i in range(8):
            c=extract(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
            # Preserve each frame's canvas and common surface line, never normalize height.
            c=c.resize((512,512),Image.Resampling.NEAREST);atlas.alpha_composite(c,(i*512,0))
        atlas.save(OUT/'river_splash.png')
