#!/usr/bin/env python3
"""Register the selected dusk vista and fan phases; extract real glass apertures.

The approved room plates stay intact. Separate layers preserve the desks,
window bars, blinds and all seven room joins over a slow exterior panorama.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps
from sprite_edges import alpha, edges

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT/'assets/sources/production/stages/refund_tower/polish'
OUT = ROOT/'assets/stages/refund_tower/polish'
NAMES = ['office','annex','calling','calling_east','servers','records','executive']
# Glass below each existing blind, in 2x plate pixels. Bars are retained from
# the approved painting rather than redrawn or stretched with the outdoor view.
WINDOWS = {
 'office': [(440,180,586,258,[511],[201]),(776,172,930,257,[851],[202]),(1115,178,1248,257,[1179],[204])],
 'annex': [(370,158,430,218,[],[]),(495,157,541,217,[],[]),(1033,151,1094,219,[],[]),(1258,151,1316,218,[],[])],
 'calling': [(329,158,397,214,[361],[]),(624,166,682,213,[654],[]),(813,186,870,214,[842],[]),
             (995,166,1074,213,[1030],[]),(1199,183,1246,213,[],[])],
 'calling_east': [(204,169,360,215,[286],[]),(432,168,522,214,[480],[]),(721,184,802,214,[767],[]),(1297,174,1372,213,[1332],[])],
 'servers': [(849,103,939,128,[894],[]),(984,103,1060,128,[1020],[])],
 'records': [(844,144,920,228,[859,881,901],[163,182,203]),(997,155,1068,229,[1013,1032,1050],[175,196,216]),
             (1142,159,1211,230,[1159,1177,1196],[177,198,218])],
 'executive': [(357,161,428,246,[],[]),(601,161,666,247,[],[]),(791,161,870,247,[],[]),
               (916,164,994,245,[],[]),(1166,161,1235,246,[],[])],
 'closer': [],  # the boss's approved curtains and collapse painting remain one composition
}

def scenery():
    source=SOURCE/'dusk_vista.png'
    if not source.exists(): return
    vista=ImageOps.fit(Image.open(source).convert('RGB'),(1620,540),Image.Resampling.LANCZOS)
    vista.save(OUT/'dusk_vista.png',optimize=True)
    for name in NAMES:
        # A tiny aperture mask avoids shipping a second copy of every room.
        size=Image.open(ROOT/f'assets/stages/refund_tower/{name}.png').size
        mask=Image.new('L',size,0);d=ImageDraw.Draw(mask)
        for x0,y0,x1,y1,xs,ys in WINDOWS[name]:
            d.rectangle((x0,y0,x1,y1),fill=255)
            for x in xs: d.rectangle((x-3,y0,x+3,y1),fill=0)
            for y in ys: d.rectangle((x0,y-2,x1,y+2),fill=0)
        glass=Image.new('RGBA',size);glass.putalpha(mask)
        glass.save(OUT/f'{name}_glass.png',optimize=True)

def fans():
    source=SOURCE/'fan_strip.png'
    if not source.exists(): return
    im=alpha(Image.open(source).convert('RGBA'));frames=[];boxes=[]
    for i in range(8):
        x0=round(i*im.width/8);x1=round((i+1)*im.width/8)
        tile=im.crop((x0,0,x1,im.height));box=tile.getbbox()
        if box is None: raise ValueError(f'Fan phase {i} is missing')
        boxes.append(box);frames.append(tile.crop(box))
    # One scale and fixed top anchor across phases, never normalize each silhouette.
    k=min(144/max(f.width for f in frames),104/max(f.height for f in frames))
    atlas=Image.new('RGBA',(8*160,112))
    for i,f in enumerate(frames):
        f=f.resize((round(f.width*k),round(f.height*k)),Image.Resampling.LANCZOS)
        # The top mounting cup is the invariant anchor, independent of which
        # blade extends furthest in each rotor phase.
        source_frame=frames[i]
        a=np.array(source_frame.getchannel('A'))
        ys,xs=np.where(a[:min(18,a.shape[0])]>128)
        mount=float(np.mean(xs)) if len(xs) else source_frame.width/2
        tile=Image.new('RGBA',(160,112));tile.alpha_composite(f,(round(80-mount*k),2))
        atlas.alpha_composite(edges(alpha(tile)),(i*160,0))
    atlas.save(OUT/'fans.png',optimize=True)
    (OUT/'registration.json').write_text(json.dumps({'fanCell':[160,112],'frames':8,'scale':round(k,6),'boxes':boxes},indent=2)+'\n')

if __name__=='__main__':
    OUT.mkdir(parents=True,exist_ok=True)
    scenery();fans()
