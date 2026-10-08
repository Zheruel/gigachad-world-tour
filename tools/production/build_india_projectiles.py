#!/usr/bin/env python3
"""Extract selected six thrown props; preserve aspect ratio and remove key spill."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[2]
src=ROOT/'assets/sources/production/stages/refund_tower/rebuild/projectiles.png'
out=ROOT/'assets/stages/india/projectiles.png'
BOXES=[(40,40,535,490),(570,40,955,510),(975,110,1536,490),
       (25,580,530,935),(550,565,980,945),(995,565,1520,945)]
def beige(tile):
 # The IT guy throws the beige office desk phone he is drawn holding, not a black one.
 q=np.array(tile).astype(float);lum=(q[:,:,0]*.3+q[:,:,1]*.59+q[:,:,2]*.11)/255
 q[:,:,:3]=np.clip(lum*2.6+.38,0,1.08)[:,:,None]*np.array([206,190,152]);return Image.fromarray(q.clip(0,255).astype('uint8'))
def build():
 im=Image.open(src).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(float)
 key=(rgb[:,:,0]>rgb[:,:,1]*1.5+30)&(rgb[:,:,2]>rgb[:,:,1]*1.5+30)
 a[:,:,3]=np.where(key,0,255)
 # Remove the small residual magenta component from antialiased edge pixels.
 fringe=(rgb[:,:,0]+rgb[:,:,2])/2-rgb[:,:,1]>48
 a[:,:,0]=np.where(fringe,np.minimum(a[:,:,0],a[:,:,1]+28),a[:,:,0])
 a[:,:,2]=np.where(fringe,np.minimum(a[:,:,2],a[:,:,1]+28),a[:,:,2])
 im=Image.fromarray(a);sheet=Image.new('RGBA',(192,128))
 for i,box in enumerate(BOXES):
  tile=im.crop(box);tile=tile.crop(tile.getbbox());tile=ImageOps.contain(tile,(48,48),Image.Resampling.LANCZOS)
  if i==4:tile=beige(tile)
  sheet.alpha_composite(tile,(i%3*64+(64-tile.width)//2,i//3*64+(64-tile.height)//2))
 out.parent.mkdir(parents=True,exist_ok=True);sheet.save(out,optimize=True)
 print('Six registered thrown India props')
if __name__=='__main__':build()
