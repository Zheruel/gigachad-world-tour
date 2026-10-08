"""Register approved normal Pappu breath strip against idle anatomy; clean dive shard."""
from pathlib import Path
import sys,json,fcntl
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from build_vendor_kitchen import pelvis_x
from keying import components
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu'
OUT=ROOT/'assets/frames/ic_vendor'
def breath_poses(path):
 im=alpha(Image.open(path).convert('RGBA'),128)
 a=np.array(im);parts=[p for p in components(a[:,:,3]>127) if len(p)>1000]
 parts.sort(key=lambda p:float(p[:,1].mean()))
 assert len(parts)==3, f'Expected three connected breath bodies, got {len(parts)}'
 poses=[]
 for part in parts:
  y0,x0=part.min(0);y1,x1=part.max(0)+1
  c=np.zeros_like(a);c[part[:,0],part[:,1]]=a[part[:,0],part[:,1]]
  poses.append(Image.fromarray(c).crop((x0,y0,x1,y1)))
 return poses

def sole_centres(im):
 a=np.array(im).astype(float);r,g,b,alpha=a.transpose(2,0,1)
 mask=(alpha>127)&(b>r*1.15)&(b>g*.95)
 mask[:round(im.height*.88)]=False
 xs=np.where(mask)[1];unique=np.unique(xs)
 assert len(unique)>4,'Missing blue sandals'
 split=unique[np.argmax(np.diff(unique))]
 return float(np.median(xs[xs<=split])),float(np.median(xs[xs>split]))

def main():
 version='v2' if (SRC/'breath-normal-v2.png').exists() else 'v1'
 poses=breath_poses(SRC/f'breath-normal-{version}.png')
 original=breath_poses(SRC/'breath-normal-v1.png');oldk=204/original[0].height
 # Match the unchanged sandal spacing, not total height: a smaller skull must not enlarge the body.
 oldfeet=sole_centres(original[0]);newfeet=sole_centres(poses[0])
 k=oldk*(oldfeet[1]-oldfeet[0])/(newfeet[1]-newfeet[0]);files=[]
 for i,p in enumerate(poses):
  p=edges(alpha(p.resize((round(p.width*k),round(p.height*k)),Image.Resampling.BOX),128));p=p.crop(p.getbbox())
  old=original[i].resize((round(original[i].width*oldk),round(original[i].height*oldk)),Image.Resampling.BOX)
  anchor=224-pelvis_x(old)+sum(sole_centres(old))/2
  frame=Image.new('RGBA',(448,300));xy=(round(anchor-sum(sole_centres(p))/2),292-p.height);frame.alpha_composite(p,xy)
  dest=OUT/f'breath_normal_{version}_{i:02}.png';frame.save(dest);files.append(str(dest.relative_to(ROOT/'assets/frames')))
 if '--breath-only' in sys.argv:
  with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
   fcntl.flock(lock,fcntl.LOCK_EX);path=ROOT/'assets/frames/manifest.json';manifest=json.loads(path.read_text());manifest['ic_vendor']['breath']=files;path.write_text(json.dumps(manifest,indent=2)+'\n')
  print(f'Registered three {version} breath poses at unchanged body scale {k:.4f}.')
  return
 # Current approved five-pose dive source also contains a tiny detached sandal remnant.
 # Rebuild its third pose from source at original registration, discard disconnected specks.
 from build_pappu_polish import strip,register
 dive=strip('flop-polish',5);frame=register(dive[2],166/dive[0].height);f=np.array(frame);parts=components(f[:,:,3]>127)
 body=max(parts,key=len);keep=np.zeros(f.shape[:2],bool);keep[body[:,0],body[:,1]]=True;f[~keep]=0
 dest=OUT/'flop_normal_02.png';Image.fromarray(f).save(dest)
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor']['breath']=files;m['ic_vendor']['flop_polish'][2]=str(dest.relative_to(ROOT/'assets/frames'));p.write_text(json.dumps(m,indent=2)+'\n')
 print('Registered3 normal breath poses and removed disconnected dive shard.')
if __name__=='__main__':main()
