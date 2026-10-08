#!/usr/bin/env python3
"""Register the selected sixteen fruit-seller poses and the real stall's front plane."""
import sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parent))
import numpy as np
from PIL import Image, ImageDraw
from build_delhi_life_river import pad,shift,strip,height
from keying import components

def fruit_poses(src):
    a=np.array(Image.open(src).convert('RGBA'))
    parts=[p for p in components(a[:,:,3]>=128) if len(p)>1000]
    assert len(parts)==16, 'Fruit seller needs sixteen complete poses'
    # Rows share a ground line. A bent or tall pose can cross an equal-height
    # head band, so group on the soles before sorting each row left to right.
    parts.sort(key=lambda p:p[:,0].max())
    ordered=[]
    for row in range(4):
        ordered.extend(sorted(parts[row*4:(row+1)*4],key=lambda p:p[:,1].min()))
    out=[]
    for p in ordered:
        y0,x0=p.min(0);y1,x1=p.max(0)+1
        c=np.zeros_like(a);c[p[:,0],p[:,1]]=a[p[:,0],p[:,1]]
        out.append(c[y0:y1,x0:x1])
    return out

def build():
    root=Path(__file__).resolve().parents[2];src=root/'assets/sources/production/stages/dirty_delhi/market_life/chad_style/fruit_v2.png'
    raw=fruit_poses(src);cs=pad(raw,96)
    def feet(c):
     y,x=np.where(c[:,:,3]>0);return np.median(x[y>y.max()-10]),y.max()
    fx,fy=feet(cs[0]);frames=[]
    for c in cs:
     x,y=feet(c);frames.append(shift(c,round(fy-y),round(fx-x)))
    im,cw,ch=strip(frames,144/height(frames[:1]),plate='market',box=(1120,200,1440,400),level=.72,cast=.3,contrast=.9,sat=.9)
    w=((cw+3)//4)*4
    if cw!=w:
     out=Image.new('RGBA',(w*16,ch))
     for i in range(16):out.alpha_composite(im.crop((cw*i,0,cw*(i+1),ch)),(i*w+(w-cw)//2,0))
     im,cw=out,w
    im.save(root/'assets/stages/dirty_delhi/market_life/fruit.png',optimize=True)
    print(cw,ch)
    # Front plane sampled from the original plate: produce skyline, baskets and awning fringe.
    # Authored outline follows the goods, so the actor's arms can pass behind the fruit piles.
    plate=Image.open(root/'assets/stages/dirty_delhi/rebuild/market.png').convert('RGBA')
    box=(1180,240,1420,402);crop=plate.crop(box);mask=Image.new('L',crop.size);d=ImageDraw.Draw(mask)
    # Coordinates in original plate pixels.
    front=[(1180,337),(1190,329),(1207,322),(1218,319),(1230,323),(1242,331),(1250,341),(1260,345),(1270,338),(1284,331),(1298,339),(1306,343),(1318,343),(1328,333),(1340,334),(1350,340),(1359,329),(1370,323),(1380,319),(1390,320),(1402,326),(1420,337),(1420,402),(1180,402)]
    d.polygon([(x-box[0],y-box[1]) for x,y in front],fill=255)
    # Match the awning's uneven fringe rather than a rectangular waist crop.
    fringe=[(1180,240),(1420,240),(1420,250),(1400,254),(1380,252),(1358,255),(1337,251),(1314,254),(1295,251),(1275,254),(1255,252),(1235,255),(1210,251),(1180,255)]
    d.polygon([(x-box[0],y-box[1]) for x,y in fringe],fill=255)
    crop.putalpha(mask);crop.save(root/'assets/stages/dirty_delhi/market_life/fruit_front.png',optimize=True)

if __name__=='__main__':
    build()
