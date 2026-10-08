#!/usr/bin/env python3
"""Register the desk throw beside CHAD's original frames; never enlarge crouched poses."""
from pathlib import Path
import fcntl,json
import numpy as np
from PIL import Image,ImageDraw
from build_delhi_cast_performances import cells
from sprite_edges import alpha,edges
from chad_palette import lock as palette
from chad_frames import frame as chad_frame
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/redesign/scam_king/damaged'
OUT=ROOT/'assets/stages/refund_tower/scam_king'
REVIEW=ROOT/'tmp/review/scam-king/throw'
SIZE=256;SOLE=248

def register(parts,height,hero=False,calibration=0):
    k=height/parts[calibration].height
    atlas=Image.new('RGBA',(SIZE*4,SIZE*((len(parts)+3)//4)))
    rows=[]
    for i,part in parts.items():
        im=edges(alpha(part.resize((round(part.width*k),round(part.height*k)),Image.Resampling.LANCZOS)),look=None if hero else 'scam_king')
        if hero:im=palette(palette(im),match=False)
        a=np.asarray(im);ys,xs=np.where(a[...,3]>128)
        cx=float(xs[ys>im.height*.4].mean()) if hero else im.width/2
        x,y=round(SIZE/2-cx),SOLE-im.height
        if min(x,y)<0 or x+im.width>=SIZE:raise ValueError((i,im.size,x,y))
        cell=Image.new('RGBA',(SIZE,SIZE));cell.alpha_composite(im,(x,y));atlas.alpha_composite(cell,(i%4*SIZE,i//4*SIZE))
        rows.append({'i':i,'bbox':cell.getbbox(),'scale':k,'origin':[128,SOLE]})
    return atlas,rows

def board(im,name):
    n=im.height//SIZE*4
    gold,anchor,feet=chad_frame('sidle1')
    out=Image.new('RGB',(384*4,280*((n+3)//4)*2))
    d=ImageDraw.Draw(out)
    for bg,col in enumerate(('#17131a','#e8dfcc')):
        d.rectangle((0,bg*out.height//2,out.width,(bg+1)*out.height//2),fill=col)
        for i in range(n):
            x,y=i%4*384,bg*out.height//2+i//4*280
            out.paste(gold,(x+60-round(anchor),y+SOLE-feet-1),gold)
            cell=im.crop((i%4*SIZE,i//4*SIZE,i%4*SIZE+SIZE,i//4*SIZE+SIZE))
            out.paste(cell,(x+110,y),cell)
            d.text((x+8,y+260),f'{name} {i+1:02}  / original idle left',fill='#947953' if bg else '#d9c59a')
    out.save(REVIEW/(name+'-identity.png'))
    out.resize((out.width//2,out.height//2),Image.Resampling.NEAREST).save(REVIEW/(name+'-native.png'))

REVIEW.mkdir(parents=True,exist_ok=True)
for candidate in ['a','b']:
    atlas,rows=register(cells(SOURCE/f'chad-throw-v6-{candidate}.png',4,2),178,True)
    atlas.save(REVIEW/f'chad-{candidate}.png');board(atlas,'chad-'+candidate)
    if candidate=='b':atlas.save(OUT/'chad_throw.png');(REVIEW/'chad-registration.json').write_text(json.dumps(rows,indent=2))
# Palm-up keys and their generated transitions share the same anatomical scale.
base=Image.open(REVIEW/'chad-b.png').convert('RGBA')
carry,carry_meta=register(cells(SOURCE/'chad-carry-v7.png',2,2),178,True,3)
bridge,bridge_meta=register(cells(SOURCE/'chad-bridges-v8.png',3,2),178,True)
selected=Image.new('RGBA',(SIZE*4,SIZE*3))
sequence=[(base,0),(base,1),(base,2),(bridge,1),(carry,0),(bridge,2),(carry,1),(bridge,3),(carry,2),(bridge,4),(bridge,5),(base,7)]
for dst,(im,src) in enumerate(sequence):
    selected.alpha_composite(im.crop((src%4*SIZE,src//4*SIZE,src%4*SIZE+SIZE,src//4*SIZE+SIZE)),(dst%4*SIZE,dst//4*SIZE))
# The two guard frames are pixel-identical to gameplay; runtime uses the originals too.
gold,anchor,feet=chad_frame('sidle1')
for dst in [0,11]:
    cell=Image.new('RGBA',(SIZE,SIZE));cell.alpha_composite(gold,(128-round(anchor),SOLE-feet-1))
    selected.paste(cell,(dst%4*SIZE,dst//4*SIZE))
selected.save(OUT/'chad_throw.png');board(selected,'chad-selected')
(REVIEW/'carry-registration.json').write_text(json.dumps(carry_meta,indent=2))
(REVIEW/'bridge-registration.json').write_text(json.dumps(bridge_meta,indent=2))
king=[];rows=[]
for sheet in ['a','b']:
    parts=cells(SOURCE/f'king-throw-v6-{sheet}.png',3,2)
    # Both sheets contain an upright calibration pose; use that scale for the whole sheet.
    atlas,meta=register(parts,214)
    king.extend(atlas.crop((i%4*SIZE,i//4*SIZE,i%4*SIZE+SIZE,i//4*SIZE+SIZE)) for i in range(6))
    rows.extend(meta)
atlas=Image.new('RGBA',(SIZE*4,SIZE*3))
for i,im in enumerate(king):atlas.alpha_composite(im,(i%4*SIZE,i//4*SIZE))
atlas.save(OUT/'king_throw.png');board(atlas,'king')
(REVIEW/'king-registration.json').write_text(json.dumps(rows,indent=2))
with (ROOT/'assets/frames/.manifest.lock').open('a') as f:
    fcntl.flock(f,fcntl.LOCK_EX)
    p=ROOT/'js/india_assets.js';s=p.read_text();s=s.replace("'finish_pair',","'chad_throw','king_throw',");p.write_text(s)
print(REVIEW)
