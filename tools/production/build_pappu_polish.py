"""Register approved whole Pappu edits; preserve original animation families."""
from pathlib import Path
import sys,json,fcntl
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu';OUT=ROOT/'assets/frames/ic_vendor'
def strip(name,n,version='v1'):
 im=alpha(Image.open(SRC/(name+'-'+version+'.png')).convert('RGBA'),128)
 # Connected bodies can overlap in x while remaining separated in y.
 import numpy as np
 from collections import deque
 mask=np.array(im.getchannel('A'))>127;boxes=[]
 for y,x in zip(*mask.nonzero()):
  if not mask[y,x]:continue
  todo=[(int(x),int(y))];mask[y,x]=False;l=r=int(x);top=bot=int(y);count=0
  while todo:
   xx,yy=todo.pop();count+=1;l=min(l,xx);r=max(r,xx);top=min(top,yy);bot=max(bot,yy)
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
    nx=xx+dx;ny=yy+dy
    if 0<=nx<im.width and 0<=ny<im.height and mask[ny,nx]:mask[ny,nx]=False;todo.append((nx,ny))
  if count>1000:boxes.append((l,top,r+1,bot+1))
 boxes.sort();assert len(boxes)==n,(name,boxes)
 # A bounding rectangle can contain a disconnected foot from a neighbouring pose.
 # Mask the selected body before returning it, rather than blindly keeping the rectangle.
 from keying import components
 result=[]
 for box in boxes:
  crop=im.crop(box);a=np.array(crop);q=max(components(a[:,:,3]>127),key=len);keep=np.zeros(a.shape[:2],bool);keep[q[:,0],q[:,1]]=True;a[~keep]=0;result.append(Image.fromarray(a))
 return result

def register(im,k,box=None):
 if box:im=im.resize((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS);xy=box[:2]
 else:im=im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS);xy=(224-im.width//2,292-im.height)
 im=edges(alpha(im,128));o=Image.new('RGBA',(448,300));o.alpha_composite(im,xy);return o

def main():
 changes={}
 for source,state,n,height in [('flop-polish','flop_polish',5,166),('haul-polish','haul_polish',4,204)]:
  poses=strip(source,n);k=height/poses[-1 if state=='haul_polish' else 0].height;files=[]
  for i,im in enumerate(poses):
   dest=OUT/f'{state}_{i:02}.png';register(im,k).save(dest);files.append(str(dest.relative_to(ROOT/'assets/frames')))
  changes[state]=files
 files=[f'ic_vendor/finisher_{i:02}.png' for i in range(24)]
 for i,name in [(5,'gore-launch'),(19,'gore-down')]:
  base=Image.open(OUT/f'finisher_{i:02}.png').convert('RGBA');im=alpha(Image.open(SRC/(name+'-'+version+'.png')).convert('RGBA'),128);im=im.crop(im.getbbox());dest=OUT/f'finisher_gore_{i:02}.png';register(im,1,base.getbbox()).save(dest);files[i]=str(dest.relative_to(ROOT/'assets/frames'))
 changes['finisher_gore']=files
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor'].update(changes);p.write_text(json.dumps(m,indent=2)+'\n')
 print('Registered five belly-dive poses, four continuous haul poses and two integrated injury bodies.')
if __name__=='__main__':main()
