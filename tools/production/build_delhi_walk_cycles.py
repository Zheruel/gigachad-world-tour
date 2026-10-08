#!/usr/bin/env python3
"""Register coherent Delhi walks selected from generated sheets, plus existing carrier reactions."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from build_delhi_life_river import coherent_cells, register, height, clean, box_scale, strip, cells, SRC as RIVER_SRC
from build_delhi_life_market import ACTORS, SRC as MARKET_SRC

ROOT=Path(__file__).resolve().parents[2]
CONFIG=ROOT/'js/delhi_walk_cycles.js'
SPECS=[('market',n,ACTORS[n][0]*2,ACTORS[n][2],tuple(v*2 for v in ACTORS[n][3])) for n in ['porter','shopper','teaboy','saree']]
SPECS += [('river','porter',150,'wharf',(400,300,1100,360)),('river','porter_empty',126,'wharf',(400,300,1100,360)),
          ('river','carrier_basket',146,'ghat',(900,280,1300,380)),('river','carrier_coolie',148,'culvert',(600,200,1000,400))]

ORDER={('market','porter'):[4,0,1,5,10,6,7,8],('river','carrier_coolie'):[4,0,3,5,10,6,7,8]}
DEFAULT_ORDER=[4,0,1,2,10,6,7,8]
PACE={'market_porter':.95,'market_shopper':.97,'market_teaboy':.81,'market_saree':.92,
      'river_porter':.8,'river_porter_empty':.8,'river_carrier_basket':.78,'river_carrier_coolie':.72}

def body_anchor(c):
 # A raised load and the leading foot must not drag the character sideways.
 # Register horizontal position on the torso, and vertical position on the ground.
 y,x=np.where(c[:,:,3]>0);top,bottom=y.min(),y.max();height=bottom-top+1
 torso=(y>=top+height*.40)&(y<top+height*.62)
 return np.median(x[torso]),bottom

def reactions(name, walk):
 src=RIVER_SRC/'chad_style'/f'{name}_alarm.png'
 al=coherent_cells(src,2) if src.exists() else cells(name+'_alarm',2,1)
 al=[clean(c) for c in al];k=height(walk[:1])/height(al[:1]);fx,fy=body_anchor(walk[0]);placed=[]
 for a in al:
  c=box_scale(a,k);ax,ay=body_anchor(c);placed.append((c,round(fy-ay),round(fx-ax)))
 # Build the union before copying. The old walk-sized canvas discarded alarm
 # arms and legs protruding to the left of the walking silhouette.
 placed=[(c,0,0) for c in walk]+placed
 y0=min(dy for c,dy,dx in placed);x0=min(dx for c,dy,dx in placed)
 y1=max(dy+c.shape[0] for c,dy,dx in placed);x1=max(dx+c.shape[1] for c,dy,dx in placed)
 out=[]
 for c,dy,dx in placed:
  cv=np.zeros((y1-y0,x1-x0,4),np.uint8);yy,xx=dy-y0,dx-x0
  cv[yy:yy+c.shape[0],xx:xx+c.shape[1]]=c;out.append(cv)
 return out

def steady_stride(key,count,tpf):
 # Preserve the route's walking pace. A steady share per pose avoids mistaking the swing foot
 # for the planted foot and injecting speed surges; phase still follows actual travel/braking.
 return [round(PACE[key]*tpf,4)]*count

def main():
 config={}
 for family,name,h,plate,box in SPECS:
  src=(MARKET_SRC if family=='market' else RIVER_SRC)/'walk12'/f'{name}.png'
  if not src.exists():continue
  complete=src.with_name(name+'_complete.png');full=complete.exists()
  smooth=src.parent.parent/'walk16'/f'{name}.png'
  count=16 if smooth.exists() else 12
  if smooth.exists():full=True
  raw=coherent_cells(smooth if smooth.exists() else complete if full else src,count,rows=4 if count==16 else 3)
  arms=src.with_name(name+'_arms.png')
  if arms.exists():
   repaired=coherent_cells(arms,3);k=height(raw[4:5])/height(repaired[:1])
   for i,c in zip([4,6,8],repaired):raw[i]=box_scale(c,k)
  swing=src.with_name(name+'_swing.png')
  if full and swing.exists() and count!=16:
   forward=coherent_cells(swing,4);k=height(raw[:1])/height(forward[:1])
   for i,c in zip([3,4,9,10],forward):raw[i]=box_scale(c,k)
  fix=src.with_name(name+'_passing.png')
  if fix.exists() and not full:
   passing=coherent_cells(fix,2);k=height(raw[:1])/height(passing[:1]);raw[2],raw[8]=[box_scale(c,k) for c in passing]
  registered=register(raw,box=(.2,.25,.8,.6),walk=True)
  f=registered if full else [registered[i] for i in ORDER.get((family,name),DEFAULT_ORDER)]
  frames=reactions(name,f) if family=='river' else f
  im,cw,ch=strip(frames,h/height(registered[:1]),plate=plate,box=box,level=.72 if family=='market' else .8,cast=.3 if family=='market' else .35,contrast=.9,sat=.9)
  # Whole logical-pixel cell centres; no half-pixel shimmer at native size.
  width=((cw+3)//4)*4
  if width!=cw:
   dst=Image.new('RGBA',(width*len(frames),ch))
   for i in range(len(frames)):dst.alpha_composite(im.crop((i*cw,0,(i+1)*cw,ch)),(i*width+(width-cw)//2,0))
   im,cw=dst,width
  out=ROOT/'assets/stages/dirty_delhi'/('market_life' if family=='market' else 'river')/f'{name}.png';im.save(out,optimize=True)
  tpf=3.75 if count==16 else 5 if full else 7
  stride=steady_stride(family+'_'+name,len(f),tpf);config[family+'_'+name]={'frames':len(f),'cells':len(frames),'cw':cw,'ch':ch,'tpf':tpf,'stride':stride}
  print(name,config[family+'_'+name])
 CONFIG.write_text('// Registered by tools/production/build_delhi_walk_cycles.py.\nexport const DELHI_WALK_CYCLES='+json.dumps(config,separators=(',',':'))+';\n')

if __name__=='__main__':main()
