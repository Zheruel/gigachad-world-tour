"""Shared whole-body sheet extraction used by Pappu production recipes."""
from pathlib import Path
import numpy as np
from PIL import Image
from sprite_edges import alpha
from keying import components
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu'
def poses(name,n,cols):
 sheet=alpha(Image.open(SRC/name).convert('RGBA'),128);a=np.array(sheet);parts=[p for p in components(a[:,:,3]>127) if len(p)>1000];assert len(parts)==n,(name,len(parts),n)
 parts.sort(key=lambda p:float(p[:,0].mean()));ordered=[]
 for row in range(0,n,cols):ordered+=sorted(parts[row:row+cols],key=lambda p:float(p[:,1].mean()))
 result=[]
 for p in ordered:
  y0,x0=p.min(0);y1,x1=p.max(0)+1;c=np.zeros_like(a);c[p[:,0],p[:,1]]=a[p[:,0],p[:,1]];result.append(Image.fromarray(c).crop((x0,y0,x1,y1)))
 return result
def pelvis(im):
 a=np.array(im.getchannel('A'))>127;yy,xx=np.where(a);band=(yy>im.height*.50)&(yy<im.height*.85);return float(xx[band].mean())
