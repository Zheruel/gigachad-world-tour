"""Extract matched props and ground-registered background routines for India chapters."""
from pathlib import Path
from collections import deque
import json
import numpy as np
from PIL import Image,ImageFilter
from build_train_rebuild import keyed,crop
from build_train_coaches import clean_edge
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages'
OUT=ROOT/'assets/stages'
SIZES={'ic_stall':(64,48),'ic_cart':(66,44),'ic_boiler':(30,52),'ic_cargo':(50,42),'ic_monitor':(30,30),'ic_cubicle':(64,56),'ic_shelf':(42,80),'ic_server':(40,76),'ic_vendorcart':(68,50),'ic_cookingstation':(76,64),'ic_pressurevalve':(22,30),'ic_cabinet':(42,64),'ic_execdesk':(86,52),'ic_partition':(54,88)}

def clean(im):
    im=clean_edge(keyed(im))
    a=np.array(im);a[a[:,:,3]<32]=0
    return Image.fromarray(a)

def cut(im,box):return crop(clean(im.convert('RGBA').crop(box)))
def grid(im,col,row,cols=4,rows=3):
    w,h=im.size;return cut(im,(round(col*w/cols),round(row*h/rows),round((col+1)*w/cols),round((row+1)*h/rows)))

def prop_silhouette(im):
    """Ignore isolated extraction flecks when measuring an object's real size."""
    a=np.array(im);mask=a[:,:,3]>32;seen=np.zeros(mask.shape,dtype=bool);parts=[]
    height,width=mask.shape
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]:continue
        q=deque([(int(x),int(y))]);seen[y,x]=True;pixels=[]
        while q:
            px,py=q.popleft();pixels.append((px,py))
            for dx,dy in [(-1,0),(1,0),(0,-1),(0,1),(-1,-1),(1,-1),(-1,1),(1,1)]:
                nx,ny=px+dx,py+dy
                if 0<=nx<width and 0<=ny<height and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;q.append((nx,ny))
        parts.append(pixels)
    keep=np.zeros_like(mask);minimum=max(70,max(map(len,parts),default=0)*.018)
    for p in parts:
        if len(p)<minimum:continue
        xy=np.array(p);keep[xy[:,1],xy[:,0]]=True
    a[~keep]=0;cleaned=Image.fromarray(a)
    return cleaned.crop(cleaned.getbbox())

def props():
    folder=OUT/'india/props';folder.mkdir(parents=True,exist_ok=True)
    groups=[]
    for path,names,edges in [
      ('dirty_delhi/props/chapter_street.png',['ic_stall','ic_cart','ic_boiler','ic_cargo'],[0,490,934,1160,1536]),
      ('dirty_delhi/props/chapter_boss_props.png',['ic_vendorcart','ic_cookingstation','ic_pressurevalve','ic_cabinet'],[0,475,910,1180,1536])]:
        im=Image.open(SRC/path)
        for i,name in enumerate(names):groups.append((name,[cut(im,(edges[i],row*512,edges[i+1],(row+1)*512)) for row in range(2)]))
    im=Image.open(SRC/'refund_tower/props/chapter_office.png')
    for row,names in enumerate([['ic_monitor','ic_cubicle'],['ic_shelf','ic_server'],['ic_execdesk','ic_partition']]):
        for pair,name in enumerate(names):groups.append((name,[grid(im,pair*2+j,row) for j in range(2)]))
    for name,pair in groups:
        pair=[prop_silhouette(c) for c in pair]
        w,h=SIZES[name]
        # The intact object sets physical scale. Debris may spread beyond that
        # footprint, but must never shrink the cabinet before it is destroyed.
        scale=min((w*2-4)/pair[0].width,(h*2-2)/pair[0].height)
        size=(max(w*2,round(max(c.width for c in pair)*scale)+4),
              max(h*2,round(max(c.height for c in pair)*scale)+2))
        size=(size[0]+size[0]%2,size[1]+size[1]%2)
        for broken,c in enumerate(pair):
            c=c.resize((max(1,round(c.width*scale)),max(1,round(c.height*scale))),Image.Resampling.NEAREST)
            f=Image.new('RGBA',size);f.alpha_composite(c,((size[0]-c.width)//2,size[1]-c.height))
            clean_edge(f).save(folder/(name+('_b' if broken else '')+'.png'))

def atlas(cells,size,columns,path):
    rows=(len(cells)+columns-1)//columns;im=Image.new('RGBA',(size[0]*columns,size[1]*rows))
    for i,c in enumerate(cells):im.paste(c,((i%columns)*size[0],(i//columns)*size[1]))
    im.save(path)

def life():
    out=OUT/'dirty_delhi/rebuild';out.mkdir(parents=True,exist_ok=True)
    im=Image.open(SRC/'dirty_delhi/rebuild/rats.png');cells=[]
    for row in range(2):
        edges=[0,402,790,1160,1536]
        for i in range(4):cells.append(cut(im,(edges[i],row*512,edges[i+1],(row+1)*512)))
    scale=min(102/max(c.width for c in cells),48/max(c.height for c in cells));frames=[]
    for c in cells:
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(108,56));f.alpha_composite(c,(105-c.width,54-c.height));frames.append(clean_edge(f))
    atlas(frames,(108,56),8,out/'rats.png')
    for name,stage,size,bodyheight,chair in [('street_life','dirty_delhi',(232,320),286,False)]:
        im=Image.open(SRC/stage/'rebuild'/f'{name}.png');frames=[]
        for row in range(3):
            edges=[0,305,603,im.height]
            cells=[cut(im,(round(i*im.width/4),edges[row],round((i+1)*im.width/4),edges[row+1])) for i in range(4)]
            scale=bodyheight/cells[0].height
            # A routine uses a single anatomical scale. Chair casters/feet define contact.
            for c in cells:
                c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
                if c.width>size[0]-4:raise ValueError((name,row,c.size))
                a=np.array(c);band=a[round(c.height*.78):,:,3]>32
                _,xs=np.where(band);anchor=float(np.median(xs)) if len(xs) else c.width/2
                # Office edge highlights are restrained to the room's worn teal palette.
                rgb=a[:,:,:3].astype(float)
                if chair:
                    edge=np.array(Image.fromarray(a[:,:,3]).filter(ImageFilter.MinFilter(3)))<128
                    cyan=edge&(rgb[:,:,1]>rgb[:,:,0]*1.25)&(rgb[:,:,2]>rgb[:,:,0]*1.25)
                    rgb[:,:,1][cyan]=rgb[:,:,1][cyan]*.72;rgb[:,:,2][cyan]=rgb[:,:,2][cyan]*.72
                a[:,:,:3]=np.clip(rgb*.90,0,255).astype('uint8');a[a[:,:,3]==0,:3]=0
                f=Image.new('RGBA',size);f.alpha_composite(Image.fromarray(a),(round(size[0]/2-anchor),size[1]-4-c.height));frames.append(clean_edge(f))
        atlas(frames,size,4,OUT/stage/('rebuild' if stage=='dirty_delhi' else '')/f'{name}.png')
def office():
    # 4x runtime art. A worker keeps its combat body's anatomical scale through
    # sitting, rising and joining the aisle; the chair, not the torso, is anchored.
    out=OUT/'refund_tower';out.mkdir(parents=True,exist_ok=True)
    seated=[];standing=[]
    for name,body,chairs in [
        ('headset',342,[207,583,975,1295,145,469,852,1198]),
        ('operator',340,[211,584,979,1300,148,468,856,1194]),
        ('thrower',346,[213,584,979,1300,148,468,856,1194])]:
        im=Image.open(SRC/'refund_tower/rebuild'/f'office_{name}.png')
        # The upright actor is separate from the chair in the final source pose.
        last=clean(im.crop((1237,512,1536,1024)))
        lastbox=last.getbbox();scale=body/(lastbox[3]-lastbox[1])
        for row in range(2):
            edges=[0,380,755,1110,1536] if row else [0,390,770,1140,1536]
            for col in range(4):
                box=(edges[col],row*512,edges[col+1],(row+1)*512)
                part=clean(im.crop(box));bounds=part.getbbox();part=part.crop(bounds)
                ground=box[1]+bounds[3]
                part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.NEAREST)
                size=(200,320) if not row else (400,440)
                f=Image.new('RGBA',size)
                x=round(100+(box[0]+bounds[0]-chairs[row*4+col])*scale)
                y=size[1]-4-part.height
                f.alpha_composite(part,(x,y));(seated if not row else standing).append(clean_edge(f))
        if name=='headset':
            # Keep this empty chair after the actor becomes an enemy.
            c=clean(im.crop((780,712,930,926)));bounds=c.getbbox();c=c.crop(bounds)
            c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            f=Image.new('RGBA',(200,200));f.alpha_composite(c,(round(100+(780+bounds[0]-852)*scale),196-c.height))
            f.save(out/'office_chair.png')
    atlas(seated,(200,320),4,out/'office_life.png')
    atlas(standing,(400,440),4,out/'office_stand.png')

if __name__=='__main__':props();life();office()
