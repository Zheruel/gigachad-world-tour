#!/usr/bin/env python3
"""Slice a genuinely regular ImageGen grid without component regrouping."""
import argparse, os
import numpy as np
from PIL import Image
from process_char import key_green, hard_alpha

p=argparse.ArgumentParser()
p.add_argument("sheet"); p.add_argument("prefix")
p.add_argument("--cols",type=int,required=True); p.add_argument("--rows",type=int,required=True)
p.add_argument("--count",type=int,required=True); p.add_argument("--out",default="assets/ai/newcast/")
a=p.parse_args()
img=Image.open(a.sheet).convert("RGBA")
rgb=np.asarray(img.convert("RGB")); mn=rgb.min(2); mx=rgb.max(2)
white=(mn>170)&((mx-mn)<22)
def runs(vals):
    ids=np.where(vals)[0]; out=[]
    for v in ids:
        if not out or v>out[-1][-1]+1: out.append([int(v)])
        else: out[-1].append(int(v))
    return [(r[0],r[-1]) for r in out]
xg=runs(white.sum(0)>img.height*.5)[:max(0,a.cols-1)]
yg=runs(white.sum(1)>img.width*.5)[:a.rows]
xb=[]; start=0
for lo,hi in xg: xb.append((start,lo)); start=hi+1
xb.append((start,img.width))
yb=[]; start=0
for lo,hi in yg: yb.append((start,lo)); start=hi+1
if len(yb)<a.rows:
    # fallback for sheets without explicit gutters
    yb=[(round(i*img.height/a.rows),round((i+1)*img.height/a.rows)) for i in range(a.rows)]
if len(xb)!=a.cols:
    xb=[(round(i*img.width/a.cols),round((i+1)*img.width/a.cols)) for i in range(a.cols)]
crops=[]
for i in range(a.count):
    c=i%a.cols; r=i//a.cols
    x0,x1=xb[c]; y0,y1=yb[r]
    cell=hard_alpha(key_green(img.crop((x0,y0,x1,y1)),40),128)
    px=cell.load()
    for y in range(cell.height):
        for x in range(cell.width):
            rr,gg,bb,aa=px[x,y]
            if aa and min(rr,gg,bb)>170 and max(rr,gg,bb)-min(rr,gg,bb)<22:
                # only remove border-connected layout white; inner white shirt/highlights stay
                if x<20 or y<20 or x>=cell.width-20 or y>=cell.height-20: px[x,y]=(0,0,0,0)
    box=cell.getchannel("A").getbbox()
    crops.append(cell.crop(box) if box else cell)
ow=max(c.width for c in crops)+20; oh=max(c.height for c in crops)+20
os.makedirs(a.out,exist_ok=True)
for i,c in enumerate(crops,1):
    out=Image.new("RGBA",(ow,oh),(0,0,0,0)); out.paste(c,((ow-c.width)//2,oh-10-c.height),c)
    out.save(f"{a.out}{a.prefix}{i}.png")
print(f"wrote {len(crops)} regular-grid frames {ow}x{oh}")
