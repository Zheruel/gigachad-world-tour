"""Extract selected combat performances; keep uniform scale and planted boot anchors."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from build_boxing_rush import largest_component
from sprite_edges import harden
from chad_palette import lock
ROOT=Path(__file__).resolve().parents[2]
CHAD=ROOT/'assets/sources/production/characters/chad/combat_variety'
TRAIN=ROOT/'assets/sources/production/stages/night_train/rebuild'

def clean(im):
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(int)
    # Selected sheets have a neutral checkerboard. Warm skin/metal highlights survive.
    neutral=(rgb.min(2)>175)&(np.ptp(rgb,axis=2)<22)
    magenta=(rgb[:,:,0]>110)&(rgb[:,:,2]>85)&(rgb[:,:,1]<rgb[:,:,0]*.6)&(rgb[:,:,1]<rgb[:,:,2]*.65)
    # Flood only exterior neutral matte so teeth, shirt highlights and metal studs survive.
    candidate=Image.fromarray(((neutral|magenta|(a[:,:,3]<24))*255).astype('uint8')).copy()
    border=[(x,0) for x in range(im.width)]+[(x,im.height-1) for x in range(im.width)]+[(0,y) for y in range(im.height)]+[(im.width-1,y) for y in range(im.height)]
    for point in border:
        if candidate.getpixel(point)==255:ImageDraw.floodfill(candidate,point,128)
    # Enclosed gaps between limbs still contain both checker colours. Preserve
    # plain white highlights, but remove these isolated checkerboard islands.
    remaining=np.array(candidate)==255
    for y,x in zip(*np.where(remaining & neutral & (rgb.min(2)>205) & (rgb.max(2)<235))):
        if candidate.getpixel((int(x),int(y)))!=255:continue
        ImageDraw.floodfill(candidate,(int(x),int(y)),64)
        island=np.array(candidate)==64
        checker=(island & (rgb.min(2)>248)).sum()>8 and island.sum()>60
        ImageDraw.floodfill(candidate,(int(x),int(y)),128 if checker else 32)
    a[(np.array(candidate)==128)|magenta,3]=0
    a[a[:,:,3]<24]=0
    # Decontaminate only the semitransparent/neutral outer fringe, not opaque highlights.
    alpha=a[:,:,3];inner=np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))>200
    edge=(alpha>0)&~inner
    valid=inner.copy();total=np.zeros_like(rgb,dtype=float);count=np.zeros(alpha.shape)
    for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(1,-1),(-1,1)]:
        v=np.roll(valid,(dy,dx),(0,1));v[:abs(dy) if dy>0 else 0]=False
        total+=np.roll(rgb,(dy,dx),(0,1))*v[:,:,None];count+=v
    dirty=edge&((np.ptp(rgb,axis=2)<30)|(alpha<200))&(count>0)
    a[dirty,:3]=(total[dirty]/count[dirty,None]).astype('uint8');a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)

def cells(path,cols,rows,connected=True):
    im=Image.open(path).convert('RGBA');out=[]
    for i in range(cols*rows):
        bounds=(round(i%cols*im.width/cols),round(i//cols*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows))
        if path.name=='boxing.png':
            xe=[0,312,640,943,im.width];ye=[0,354,685,1008,im.height];bounds=(xe[i%4],650 if i==10 else ye[i//4],xe[i%4+1],ye[i//4+1])
        c=clean(im.crop(bounds))
        a=np.array(c)
        if connected:a[~largest_component(a[:,:,3]>24)]=0
        c=Image.fromarray(a);out.append(c.crop(c.getbbox()))
    return out

def register(poses,scale,size,anchor='boot'):
    out=[]
    for p in poses:
        a=np.array(p)[:,:,3]>24
        ys,xs=np.where(a[max(0,p.height-18):])
        x=float(np.median(xs)) if len(xs) else p.width/2
        if anchor=='torso':
            yy,xx=np.where(a[round(p.height*.22):round(p.height*.62)]);x=float(np.median(xx))
        if anchor=='front':x=float(np.median(xs[xs>xs.max()-p.width*.23]))
        p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
        f=Image.new('RGBA',size);f.alpha_composite(p,(round(size[0]/2-x*scale),size[1]-7-p.height));out.append(clean(f))
    return out

def save_frames(m,key,state,frames,prefix):
    names=[]
    for i,f in enumerate(frames):
        # Last step for CHAD: binary alpha + sel-out edges, then the gold 48-colour palette (chad_style.md).
        if key=='player':frames[i]=f=lock(harden(f))
        name=f'{prefix}_{i:02}.png';path=ROOT/'assets/frames'/name;path.parent.mkdir(parents=True,exist_ok=True);f.save(path);names.append(name)
    m.setdefault(key,{})[state]=names

def review(name,frames):
    folder=ROOT/'tmp/review/combat-variety';folder.mkdir(parents=True,exist_ok=True)
    w,h=frames[0].size;sheet=Image.new('RGBA',(w*4,h*((len(frames)+3)//4)),(25,23,29,255));d=ImageDraw.Draw(sheet)
    for i,f in enumerate(frames):sheet.alpha_composite(f,(i%4*w,i//4*h));d.text((i%4*w+4,i//4*h+4),str(i),fill='white')
    sheet.save(folder/(name+'-2x.png'));sheet.resize((sheet.width//2,sheet.height//2),Image.Resampling.NEAREST).save(folder/(name+'-native.png'))

def main():
    path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text())
    p=cells(CHAD/'boxing.png',4,4);frames=register(p,184/p[0].height,(256,248),'front')
    if (CHAD/'overhand.png').exists():
        q=cells(CHAD/'overhand.png',2,1);frames+=register(q,184/q[0].height,(256,248),'front')
    save_frames(m,'player','boxing_variety',frames,'chad_boxing_variety');review('boxing',frames)
    desk=Image.open(TRAIN/'office_desk_broken.png').convert('RGBA')
    desk=clean(desk);desk.resize(Image.open(ROOT/'assets/stages/night_train/rebuild/office_desk.png').size,Image.Resampling.LANCZOS).save(ROOT/'assets/stages/night_train/rebuild/office_desk_broken.png')
    if (CHAD/'fragments.png').exists():
        pieces=cells(CHAD/'fragments.png',4,2,False);atlas=Image.new('RGBA',(512,256))
        for i,c in enumerate(pieces):
            scale=110/max(c.size);c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
            atlas.alpha_composite(c,(i%4*128+(128-c.width)//2,i//4*128+(128-c.height)//2))
        clean(atlas).save(ROOT/'assets/fx/arcade_fragments.png')
    path.write_text(json.dumps(m,indent=2)+'\n')
if __name__=='__main__':main()
