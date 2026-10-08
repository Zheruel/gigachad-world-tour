#!/usr/bin/env python3
"""Register the rebuilt Refund furniture, fixtures, foreground and damage layers."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageOps,ImageFilter
from build_delhi_cast_performances import cells
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/overhaul'
OUT=ROOT/'assets/stages/refund_tower/overhaul'
PROPS=[('ic_monitor',48,58),('ic_shelf',50,96),('ic_server',44,104),('ic_cabinet',44,64),('ic_execdesk',98,55),('ic_partition',55,94),('ic_cubicle',72,58),('office_chair',34,50)]

def fixtures():
    poses=cells(SOURCE/'scenery/fans.png')
    for family,ids in [('wall',range(8)),('cooling',range(8,16))]:
        frames=[poses[i] for i in ids];k=min(128/max(f.width for f in frames),128/max(f.height for f in frames))
        atlas=Image.new('RGBA',(8*136,136))
        for i,f in enumerate(frames):
            f=edges(alpha(f.resize((round(f.width*k),round(f.height*k)),Image.Resampling.LANCZOS)))
            atlas.alpha_composite(f,(i*136+(136-f.width)//2,(136-f.height)//2))
        atlas.save(OUT/f'fan-{family}.png',optimize=True)
    p=SOURCE/'scenery/ceiling-fan-v2.png'
    if not p.exists():p=SOURCE/'scenery/ceiling-fan.png'
    if p.exists():
        poses=cells(p,4,2);frames=list(poses.values());k=216/max(f.width for f in frames)
        atlas=Image.new('RGBA',(8*224,80));registered=[]
        for i,f in enumerate(frames):
            f=edges(alpha(f.resize((round(f.width*k),round(f.height*k)),Image.Resampling.LANCZOS)))
            a=np.array(f)[...,3]>0
            # Blade asymmetry must not move the ceiling cup or rotor axis.
            ys,xs=np.where(a[:12]);pivot=round(float(np.median(xs)))
            canvas=Image.new('RGBA',(224,80));canvas.alpha_composite(f,(112-pivot,2))
            registered.append(canvas)
        # The generated housing is stationary machinery. Use its approved first
        # painting in every phase, leaving only the surrounding blades animated.
        core=registered[0].crop((88,0,136,66))
        for i,f in enumerate(registered):
            f.paste((0,0,0,0),(88,0,136,80));f.alpha_composite(core,(88,0))
            atlas.alpha_composite(f,(i*224,0))
        atlas.save(OUT/'fan-ceiling.png',optimize=True)

def foreground():
    for group,rows,names in [('industrial',4,['office','calling','servers','records']),('executive',2,['executive','closer'])]:
        im=alpha(Image.open(SOURCE/f'scenery/foreground-{group}.png').convert('RGBA'))
        for i,name in enumerate(names):
            f=im.crop((0,round(i*im.height/rows),im.width,round((i+1)*im.height/rows)));f=f.crop(f.getbbox())
            k=1620/f.width;f=edges(alpha(f.resize((1620,round(f.height*k)),Image.Resampling.LANCZOS)))
            f.save(OUT/f'front-{name}.png',optimize=True)

def furniture():
    poses=cells(SOURCE/'props/furniture.png');dest=OUT/'props';dest.mkdir(exist_ok=True)
    for i,(name,w,h) in enumerate(PROPS):
        base=poses[i];k=h*2/base.height
        for state,j in [('',i),('_b',i+8)]:
            if name=='office_chair' and state=='_b':continue
            f=poses[j];f=edges(alpha(f.resize((round(f.width*k),round(f.height*k)),Image.Resampling.LANCZOS)))
            # Full matching-pair canvas; wreckage stays on the original floor anchor.
            canvas=Image.new('RGBA',(max(w*2,f.width),h*2));canvas.alpha_composite(f,((canvas.width-f.width)//2,canvas.height-f.height))
            canvas.save(dest/f'{name}{state}.png',optimize=True)

def equipment():
    path=SOURCE/'props/equipment.png'
    if not path.exists():return
    poses=cells(path,2,2);atlas=Image.new('RGBA',(128,128))
    for i,im in poses.items():
        width,height=[(48,40),(48,40),(44,22),(42,14)][i]
        k=min(width/im.width,height/im.height)
        im=edges(alpha(im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS)))
        atlas.alpha_composite(im,(i%2*64+(64-im.width)//2,i//2*64+(64-im.height)//2))
    atlas.save(OUT/'equipment.png',optimize=True)

def cinematics():
    im=Image.open(SOURCE/'scenery/wall-states.png').convert('RGB')
    for i,name in enumerate(['wall','wall_cracked','wall_b']):
        f=ImageOps.fit(im.crop((round(i*im.width/3),0,round((i+1)*im.width/3),im.height)),(343,540),Image.Resampling.LANCZOS).convert('RGBA')
        if i:
            m=Image.new('L',f.size);d=ImageDraw.Draw(m)
            d.rounded_rectangle((52,170,280,470),radius=20,fill=255)
            if i==2:d.rounded_rectangle((25,397,327,491),radius=16,fill=255)
            f.putalpha(m.filter(ImageFilter.GaussianBlur(5)))
        f.save(OUT/f'{name}.png',optimize=True)
    im=Image.open(SOURCE/'scenery/success-states.png').convert('RGB');atlas=Image.new('RGBA',(1024,872))
    for i in range(4):
        box=(round(i%2*im.width/2),round(i//2*im.height/2),round((i%2+1)*im.width/2),round((i//2+1)*im.height/2))
        f=ImageOps.fit(im.crop(box),(512,436),Image.Resampling.LANCZOS).convert('RGBA')
        x=np.arange(512);a=np.minimum(np.minimum(x/14,(511-x)/10),1).clip(0,1)
        f.putalpha(Image.fromarray(np.tile((a*255).astype('uint8'),(436,1))))
        atlas.alpha_composite(f,(i%2*512,i//2*436))
    atlas.save(OUT/'success-set.png',optimize=True)

if __name__=='__main__':
    OUT.mkdir(exist_ok=True);fixtures();foreground();furniture();equipment();cinematics()
