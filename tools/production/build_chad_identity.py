"""Register CHAD's selected identity-matched art without changing action timing.

Sources: selected GPT Image atlases in characters/chad/identity.
Each atlas uses one crown-to-boot calibration; no pose-height normalization.
Run after the older combat recipes when rebuilding their overridden frames.
"""
from pathlib import Path
import json
from collections import deque
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from sprite_palette import match_chad_skin
from sprite_edges import harden
from chad_palette import lock
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/characters/chad/identity'
REVIEW=ROOT/'tmp/review/character-standard'

def edge_clean(im):
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(int)
    # The generated alpha contains isolated saturated red spill outside the ink.
    red=(rgb[:,:,0]>170)&(rgb[:,:,1]<65)&(rgb[:,:,2]<65)
    a[red]=0;a[a[:,:,3]<20]=0
    inner=np.array(Image.fromarray(a[:,:,3]).filter(ImageFilter.MinFilter(3)))>220
    total=np.zeros_like(rgb,dtype=float);count=np.zeros(inner.shape)
    for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(1,-1),(-1,1)]:
        valid=np.roll(inner,(dy,dx),(0,1));total+=np.roll(rgb,(dy,dx),(0,1))*valid[:,:,None];count+=valid
    rim=(a[:,:,3]>0)&(a[:,:,3]<220)&(count>0)
    a[rim,:3]=(total[rim]/count[rim,None]).astype('uint8');a[a[:,:,3]==0]=0
    return Image.fromarray(a)

def extract(name,rows):
    im=edge_clean(Image.open(SOURCE/(name+'.png')));a=np.array(im)
    # Generated rows are not exact fractions: extract connected silhouettes,
    # otherwise one row's boots become floating fragments above the next row.
    mask=a[:,:,3]>24;remaining=mask.copy();parts=[]
    for y,x in zip(*np.where(mask)):
        if not remaining[y,x]:continue
        q=deque([(y,x)]);remaining[y,x]=False;pts=[]
        while q:
            yy,xx=q.popleft();pts.append((yy,xx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and remaining[ny,nx]:
                    remaining[ny,nx]=False;q.append((ny,nx))
        if len(pts)<1500:continue
        yy,xx=np.array(pts).T;x0,x1=xx.min(),xx.max()+1;y0,y1=yy.min(),yy.max()+1
        p=np.zeros((y1-y0,x1-x0,4),dtype=np.uint8);p[yy-y0,xx-x0]=a[yy,xx]
        parts.append((float(yy.mean()),float(xx.mean()),Image.fromarray(p)))
    assert len(parts)==rows*4,(name,len(parts))
    parts.sort(key=lambda item:item[0]);poses=[]
    for row in range(rows):poses.extend(p[2] for p in sorted(parts[row*4:row*4+4],key=lambda item:item[1]))
    return poses

def register(p,scale,size):
    a=np.array(p)[:,:,3]>32
    # Centre on the grounded support span. Keep one scale even for crouches.
    yy,xx=np.where(a[max(0,p.height-12):]);anchor=float(np.median(xx))
    p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
    f=Image.new('RGBA',size);f.alpha_composite(p,(round(size[0]/2-anchor*scale),size[1]-7-p.height))
    return lock(harden(match_chad_skin(edge_clean(f))))

def contact(name,frames):
    REVIEW.mkdir(parents=True,exist_ok=True);w,h=frames[0].size
    out=Image.new('RGB',(w*4,h*((len(frames)+3)//4)), '#242832')
    for i,f in enumerate(frames):out.paste(f,(i%4*w,i//4*h),f)
    out.save(REVIEW/(name+'-after-2x.png'))

def main():
    m=json.loads((ROOT/'assets/frames/manifest.json').read_text())
    combat=extract('combat',4);electric=extract('electric',2)
    combat[9]=extract('combat_body_contact',4)[9]
    # Approved idle silhouette is168 sourcepx. Slightly bent guard is164px.
    cs=164/combat[0].height;es=164/electric[0].height
    mappings={
        'boxing_variety':[0,2,3,0,4,5,6,7,8,9,11,10,0,2,8,11,7,7],
        'boxing_rush':[0,1,9,2,3,5,6,7,8,9,10,11,7,3,0,0],
        'super_barrage':[0,1,9,2,3,5,6,7,8,9,6,8,7,3,0,0],
    }
    for state,ids in mappings.items():
        frames=[]
        for path,i in zip(m['player'][state],ids):
            dest=ROOT/'assets/frames'/path;f=register(combat[i],cs,Image.open(dest).size);f.save(dest);frames.append(f)
        contact(state,frames)
    # Dedicated hip-drive/recovery sheet retains the existing eight final poses.
    frames=[]
    for path,i in zip(m['player']['electric_finish'],range(8)):
        dest=ROOT/'assets/frames'/path;f=register(electric[i],es,Image.open(dest).size);f.save(dest);frames.append(f)
    for path,i in zip(m['player']['super_electric'][:6],[0,1,8,9,6,9]):
        dest=ROOT/'assets/frames'/path;register(combat[i],cs,Image.open(dest).size).save(dest)
    contact('electric_finish',frames)


if __name__=='__main__':
    main()
    # Signature supers retain the approved original combat ink and anatomy.
    from build_signature_identity import main as signature_identity
    signature_identity()
