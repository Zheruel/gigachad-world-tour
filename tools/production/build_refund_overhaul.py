#!/usr/bin/env python3
"""Build selected Refund Tower plates and their authored joins, without old desk patches."""
from pathlib import Path
import argparse
import json
import numpy as np
from PIL import Image, ImageOps
from build_refund_vista import apply as apply_vista

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/overhaul'
OUT=ROOT/'assets/stages/refund_tower/overhaul'
NAMES=('office','annex','calling','calling_east','servers','records','executive','closer')
SIZE=(1620,540)

def plate(path,size=SIZE):
    return ImageOps.fit(Image.open(path).convert('RGB'),size,method=Image.Resampling.LANCZOS,centering=(.5,.5))

def build():
    OUT.mkdir(parents=True,exist_ok=True)
    route=Image.new('RGB',(SIZE[0]*len(NAMES),SIZE[1]))
    selected=json.loads((SOURCE/'selection.json').read_text()) if (SOURCE/'selection.json').exists() else {}
    names=[]
    for i,name in enumerate(NAMES):
        path=SOURCE/'areas'/selected.get(name,f'{name}-v1.png')
        if not path.exists(): continue
        names.append(name);route.paste(plate(path),(i*SIZE[0],0))
    for i,(left,right) in enumerate(zip(NAMES,NAMES[1:]),1):
        path=SOURCE/'joins'/selected.get(f'{left}_{right}',f'{left}_{right}.png')
        if not path.exists() or left not in names or right not in names:continue
        join_w=640
        x=np.arange(join_w);a=np.minimum(np.minimum(x/60,(join_w-1-x)/60),1).clip(0,1)
        a=a*a*(3-2*a)
        mask=Image.fromarray(np.tile((a*255).astype('uint8'),(SIZE[1],1)))
        route.paste(plate(path,(join_w,SIZE[1])),(i*SIZE[0]-join_w//2,0),mask)
    # The Closer's closing room (closer_king) paints its own dusk skyline: no glazing pass over it.
    route=apply_vista(route,[('closer_king' if n=='closer' and selected.get('closer','').startswith('closer-king') else n) for n in NAMES])
    for i,name in enumerate(NAMES):
        if name in names:route.crop((i*SIZE[0],0,(i+1)*SIZE[0],SIZE[1])).save(OUT/f'{name}.png',optimize=True)
    print('Built:',', '.join(names))

if __name__=='__main__': build()
