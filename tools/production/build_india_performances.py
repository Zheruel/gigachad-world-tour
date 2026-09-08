"""Register selected wall-breach and finishing poses at a single physical scale."""
from pathlib import Path
import numpy as np
from PIL import Image
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/rebuild'
OUT=ROOT/'assets/stages/refund_tower'
def build():
 for name in ['breach','finish']:
  cells=extract(Image.open(SOURCE/f'{name}.png'),4)
  assert set(cells)==set(range(16)),(name,sorted(cells))
  # Upright references determine ONE scale for the whole performance, including crouches.
  scale=170/np.median([cells[i].height for i in [0,12,14,15]])
  atlas=Image.new('RGBA',(1024,1024))
  for i,c in cells.items():
   a=np.array(c);r,g,b=a[:,:,:3].astype(float).transpose(2,0,1)
   mask=(a[:,:,3]>32)&(b>r*1.1)&(b>g*.95)
   mask[:round(c.height*.48)]=False;mask[round(c.height*.72):]=False
   _,xs=np.where(mask);hip=float(np.median(xs)) if len(xs)>20 else c.width/2
   c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
   f=Image.new('RGBA',(256,256));f.alpha_composite(c,(round(128-hip*scale),256-c.height))
   f=clean_edge(f);atlas.alpha_composite(f,(i%4*256,i//4*256))
  atlas.save(OUT/f'{name}.png',optimize=True)
  print(name,'16 poses, uniform scale',round(scale,4))
if __name__=='__main__':build()
