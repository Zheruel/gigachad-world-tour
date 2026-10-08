# The Thekedar's reveal and cab life, and the grab's muck: GPT Image sheets (dirty_delhi/dredger/) split
# into slots, mirrored to the set's right-facing convention, scaled per sheet and registered.
#  cabx    12 head-and-shoulders busts behind the cab glass, bottom = chest cut, head centred
#  reveal  6 full-body gantry taunts on the dl_thekedar canvas
#  dl_grab pour (4, top-centre), muck (3 splats, bottom-centre), trash (6 bits, centred)
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from keying import components
from build_pappu_puri_finish import scaled
from build_train_conductor import pelvis_x
from build_dredger_finish import SRC,FRAMES,THEK,body_h

def slots(path,n,row=None,mirror=False,min_px=60):
 # n equal slots per row; every opaque blob goes to the slot holding its centre (spray across a slot edge stays put).
 im=alpha(Image.open(path).convert('RGBA'),128);a=np.array(im)
 if row is not None:
  r=np.nonzero(a[...,3].max(1)>127)[0];gaps=np.nonzero(np.diff(r)>20)[0];bands=np.split(r,gaps+1)
  if len(bands)>1:b=bands[row];a=a[b.min():b.max()+1]
  else:   # rows bridged (a smoke plume): cut at the emptiest row in the middle of the sheet
   h=a.shape[0];cnt=(a[...,3]>127).sum(1);cut=int(h*.3)+int(np.argmin(cnt[int(h*.3):int(h*.7)]));a=a[:cut] if row==0 else a[cut:]
 out=[np.zeros_like(a) for _ in range(n)];w=a.shape[1]/n
 for p in components(a[...,3]>127):
  if len(p)<min_px:continue
  i=min(n-1,int(p[:,1].mean()//w));out[i][p[:,0],p[:,1]]=a[p[:,0],p[:,1]]
 ims=[]
 for o in out:
  im=Image.fromarray(o);im=im.crop(im.getbbox())
  ims.append(im.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if mirror else im)
 return ims

def head_x(im):
 # The head's centre: middle of the opaque run at a fifth of the way down, nearest the figure's middle.
 a=np.array(im)[...,3]>127;y=int(a.shape[0]*.2);xs=np.nonzero(a[y])[0];runs=np.split(xs,np.nonzero(np.diff(xs)>1)[0]+1)
 mid=np.nonzero(a.any(0))[0].mean();r=min(runs,key=lambda r:abs(r.mean()-mid));return float(r.mean())

# Per sheet: 2x px of bust height for the sheet's reference frame (matched by eye to the seated c_12 head in the window).
CAB=[('reveal-cab-a.png',0,62),('reveal-cab-b.png',1,64),('reveal-cab-c.png',1,58)]
CABW,CABH=200,96
def cab():
 files=[]
 for src,ref,h in CAB:
  ims=slots(SRC/src,4,mirror=True);k=h/ims[ref].height
  for im in ims:
   im=scaled(im,k);o=Image.new('RGBA',(CABW,CABH));o.alpha_composite(im,(round(CABW/2-head_x(im)),CABH-im.height))
   f=f'dl_thekedar/cabx_{len(files):02d}.png';edges(alpha(o,128)).save(FRAMES/f);files.append(f)
 return files

# Gantry taunts: one scale per sheet from its median body height (wrench excluded) to the idle's.
def reveal():
 files=[];idle=body_h(Image.open(FRAMES/'dl_thekedar/a_00.png'))
 for src in ['reveal-gantry-a.png','reveal-gantry-b.png']:
  ims=slots(SRC/src,3,mirror=True,min_px=30);k=idle/np.median([body_h(i) for i in ims])
  for im in ims:
   im=scaled(im,k);o=Image.new('RGBA',THEK[0]);o.alpha_composite(im,(round(THEK[0][0]/2-pelvis_x(im)),THEK[1]-im.height))
   f=f'dl_thekedar/reveal_{len(files)}.png';edges(alpha(o,128)).save(FRAMES/f);files.append(f)
 return files

def muck():
 out={}
 pour=slots(SRC/'grab-pour.png',4);k=88/max(i.width for i in pour);W,H=96,round(max(i.height for i in pour)*k)+4;out['pour']=[]
 for i,im in enumerate(pour):
  im=scaled(im,k);o=Image.new('RGBA',(W,H));o.alpha_composite(im,((W-im.width)//2,0));f=f'dl_grab/pour_{i}.png';edges(alpha(o,128)).save(FRAMES/f);out['pour'].append(f)
 sp=slots(SRC/'grab-muck.png',3,row=0);k=120/max(i.width for i in sp);W,H=128,round(max(i.height for i in sp)*k)+4;out['muck']=[]
 for i,im in enumerate(sp):
  im=scaled(im,k);o=Image.new('RGBA',(W,H));o.alpha_composite(im,((W-im.width)//2,H-2-im.height));f=f'dl_grab/muck_{i}.png';edges(alpha(o,128)).save(FRAMES/f);out['muck'].append(f)
 tr=slots(SRC/'grab-muck.png',6,row=1);k=26/np.median([max(i.size) for i in tr]);out['trash']=[]
 for i,im in enumerate(tr):
  im=scaled(im,k);o=Image.new('RGBA',(36,36));o.alpha_composite(im,((36-im.width)//2,(36-im.height)//2));f=f'dl_grab/trash_{i}.png';edges(alpha(o,128)).save(FRAMES/f);out['trash'].append(f)
 return out

def main():
 c=cab();r=reveal();m=muck()
 with open(FRAMES/'.manifest.lock','a') as lk:
  fcntl.flock(lk,fcntl.LOCK_EX);p=FRAMES/'manifest.json';j=json.loads(p.read_text())
  j['dl_thekedar']['cabx']=c;j['dl_thekedar']['reveal']=r;j['dl_grab'].update(m);p.write_text(json.dumps(j,indent=2)+'\n')
 print(len(c),len(r),{k:len(v) for k,v in m.items()})
if __name__=='__main__':main()
