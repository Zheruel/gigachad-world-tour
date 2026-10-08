"""The Dredger's extra phases: the scrap magnet that replaces the grab (idle, charged, shorted), the scrap it lifts
and drops (taxi shell from phase-scrap.png; auto-rickshaw, rebar, fridge, hatch and hole from magnet-junk.png), the
crewman it yanks off the deck (crew-yank.png), the crane hook and a chain link, and the Thekedar's hook-and-chain poses.
Sources (GPT Image, see AGENTS.md) are the phase-*.png sheets in the dredger sources folder; this cuts them apart,
scales them against the grab and the Thekedar's approved frames and registers them in the manifest."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from keying import components
from build_pappu_puri_finish import scaled
from build_train_conductor import pelvis_x

ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/dredger';FRAMES=ROOT/'assets/frames'
THEK=(400,300),293   # dl_thekedar canvas and sole row

def pieces(path,n,gap=10,min_px=40):
 # Objects left to right, split where a run of empty columns separates them (sparks and arcs stay with their object).
 im=alpha(Image.open(path).convert('RGBA'),128);a=np.array(im);keep=np.zeros(a.shape[:2],bool)
 for p in components(a[...,3]>127):
  if len(p)>=min_px:keep[p[:,0],p[:,1]]=True
 a[~keep]=0;cols=np.nonzero(keep.any(0))[0];runs=np.split(cols,np.nonzero(np.diff(cols)>gap)[0]+1)
 runs=sorted(runs,key=len,reverse=True)[:n];runs.sort(key=lambda r:r[0])
 assert len(runs)==n,(path,len(runs))
 out=[]
 for r in runs:
  im=Image.fromarray(a[:,r[0]:r[-1]+1]);out.append(im.crop(im.getbbox()))
 return out

def pad(im,p=6):
 o=Image.new('RGBA',(im.width+2*p,im.height+2*p));o.alpha_composite(im,(p,p));return o

def props(path,n,size,measure,out,state,gap=10,trim={},keep=None):
 # One scale for the sheet: `measure` picks the piece and dimension that must come out `size` 2x px.
 ims=pieces(SRC/path,n,gap);i,dim=measure;k=size/(ims[i].width if dim=='w' else ims[i].height)
 files=[]
 for j,im in enumerate(ims[:keep]):
  f=f'dl_grab/{out}_{j}.png';edges(pad(scaled(im,k*trim.get(j,1)))).save(FRAMES/f);files.append(f)
 return state,files

# The Thekedar's hook poses: whirl A, whirl B, fling, slam | sweep, yank, hang, tangled. Both sheets are drawn at
# one scale; the upright tangled pose stands as tall as his approved idle (169 2x px, a touch over for the lean).
POSES=['whirl_a','whirl_b','fling','slam','sweep','yank','hang','tangled']
STUCK_RIM=272   # the stuck grab's hole rim sits on the deck: just under the closed jaws' lip row (260)
MAG=(300,214),150,122   # magnet canvas, and where its hazard band's middle sits: the three states swap without a jump
def band(im):
 q=np.array(im).astype(int);m=(q[...,3]>64)&(q[...,0]>170)&(q[...,1]>120)&(q[...,2]<90);ys,xs=np.nonzero(m)
 return float(np.median(xs)),float(np.median(ys))
def magnet():
 ims=pieces(SRC/'phase-magnet.png',3);ref=ims[0];k=210/ref.width;files=[]
 for j,im in enumerate(ims):
  im=scaled(im,k);bx,by=band(im);o=Image.new('RGBA',MAG[0]);o.alpha_composite(im,(round(MAG[1]-bx),round(MAG[2]-by)))
  f=f'dl_grab/magnet_{j}.png';edges(o).save(FRAMES/f);files.append(f)
 return 'magnet',files

# The finisher's catch: the magnet with the Thekedar stuck to its face by his hook (magnet-loaded.png, two frames of
# him kicking). Same scale and band point as the magnet (x shifted to fit his limbs), so it swaps in without a jump.
LOADED=(440,340),220
def drum(im,part):
 # Width of the magnet's drum (widest row above the band's foot) and its band point (peak hazard-yellow rows), in the top `part`.
 q=np.array(im).astype(int)[:int(im.height*part)];y=(q[...,3]>64)&(q[...,0]>170)&(q[...,1]>120)&(q[...,2]<90);r=y.sum(1)
 rows=np.nonzero(r>=r.max()*.5)[0];by=float(np.median(rows));a=q[...,3]>64;foot=int(rows.max())+int(.04*im.height)
 xs=np.nonzero(a[int(by)])[0];return float(a[:foot].sum(1).max()),float(xs.mean()),by
def loaded():
 src=SRC/'magnet-loaded.png'
 if not src.exists():return None
 ref=Image.open(FRAMES/'dl_grab/magnet_0.png');files=[]
 for j,im in enumerate(pieces(src,2,10)):
  k,bx,by=drum(ref,1.0)[0]/drum(im,.65)[0],*drum(im,.65)[1:];bx,by=bx*k,by*k;im=scaled(im,k);o=Image.new('RGBA',LOADED[0]);o.alpha_composite(im,(round(LOADED[1]-bx),round(MAG[2]-by)))
  f=f'dl_grab/magnet_loaded_{j}.png';o=edges(o);o.save(FRAMES/f);files.append(f)
  ys=np.nonzero(np.array(o)[...,3].max(1)>64)[0];print('loaded rows',ys.min(),ys.max())
 return 'magnet_loaded',files

# The magnet's varied junk (magnet-junk.png, left to right): auto-rickshaw shell, rebar cluster, fridge shut and
# burst open, deck hatch lid and the hole it leaves. Objects split by overlapping blobs (the open fridge touches the
# hatch's column); each is sized against the taxi shell (298 2x px) and CHAD (178).
JUNK=[('rickshaw','w',210),('rebar','h',110),('fridge','h',120),('fridge','h',120),('hatch','w',60),('hole','w',72)]
def blobs(path,min_px=400):
 im=alpha(Image.open(path).convert('RGBA'),128);a=np.array(im);groups=[]
 for p in sorted([p for p in components(a[...,3]>127) if len(p)>=min_px],key=lambda p:p[:,1].min()):
  x0,x1=p[:,1].min(),p[:,1].max()
  if groups and x0<=groups[-1][1]:groups[-1][1]=max(groups[-1][1],x1);groups[-1][2].append(p)
  else:groups.append([x0,x1,[p]])
 out=[]
 for _,_,ps in groups:
  m=np.zeros(a.shape[:2],bool)
  for p in ps:m[p[:,0],p[:,1]]=True
  c=a.copy();c[~m]=0;c=Image.fromarray(c);out.append(c.crop(c.getbbox()))
 return out
def junk():
 src=SRC/'magnet-junk.png'
 if not src.exists():return []
 ims=blobs(src);assert len(ims)==len(JUNK),len(ims);st={}
 for im,(name,dim,size) in zip(ims,JUNK):
  k=size/(im.width if dim=='w' else im.height);j=len(st.get(name,[]));f=f'dl_grab/{name}_{j}.png'
  edges(pad(scaled(im,k))).save(FRAMES/f);st.setdefault(name,[]).append(f)
 return list(st.items())

# A crewman the magnet rips off the deck by his wrench (crew-yank.png): hanging arm-up, flung flat, tumbling.
# Scaled so his body (the pose minus the raised arm) stands as tall as the docker's idle (176 2x px).
def yank():
 src=SRC/'crew-yank.png'
 if not src.exists():return None
 ims=blobs(src);k=.92*176/(ims[0].height*.735);files=[]
 for j,im in enumerate(ims):
  o=edges(pad(scaled(im,k)));f=f'dl_grab/crew_yank_{j}.png';o.save(FRAMES/f);files.append(f)
  if j==0:
   a=np.array(o)[...,3]>64;ys,xs=np.nonzero(a);top=ys.min();print('yank grip',o.size,int(np.median(xs[ys<top+12])),int(top))
 return files

def taxi():
 # Only the taxi shell of the phase-scrap sheet is still dropped (its drums and rebar gave way to magnet-junk.png).
 return props('phase-scrap.png',5,78,(1,'h'),'scrap','scrap',trim={0:1.45},keep=1)

def plate(im):
 q=np.array(im).astype(int);m=(q[...,3]>64)&(q[...,0]>170)&(q[...,1]>120)&(q[...,2]<90);ys,xs=np.nonzero(m)
 return np.percentile(xs,98)-np.percentile(xs,2)
def stuck():
 # The grab bitten into the deck (grab-stuck.png): scaled and registered on the closed grab's hazard plate, so the
 # cable stays put when the cell changes.
 src=SRC/'grab-stuck.png'
 if not src.exists():return None
 ref=Image.open(FRAMES/'dl_grab/closed.png');im=alpha(Image.open(src).convert('RGBA'),128);im=im.crop(im.getbbox())
 # A little over the plate's scale (its bucket is drawn narrower than the grab's); the hole's front rim on the deck row.
 im=scaled(im,1.22*plate(ref)/plate(im));bx,by=band(im);rx,ry=band(ref)
 o=Image.new('RGBA',ref.size);o.alpha_composite(im,(round(rx-bx),STUCK_RIM-im.height));edges(o).save(FRAMES/'dl_grab/stuck.png')
 ys=np.nonzero(np.array(o)[...,3][:,round(rx)-4:round(rx)+4].max(1)>64)[0];print('stuck shackle top row',ys.min())
 return 'stuck',['dl_grab/stuck.png']

def thekedar():
 ims=pieces(SRC/'phase-thekedar-hook-a.png',4,6)+pieces(SRC/'phase-thekedar-hook-b.png',4,6)
 k=172/ims[7].height;files=[]
 for n,im in zip(POSES,ims):
  im=scaled(im,k);o=Image.new('RGBA',THEK[0]);o.alpha_composite(im,(round(THEK[0][0]/2-pelvis_x(im)),THEK[1]-im.height))
  f=f'dl_thekedar/hook_{n}.png';o=edges(o)
  if (HOOK_EDIT/f'hook_{n}.png').exists():o=fit(Image.open(HOOK_EDIT/f'hook_{n}.png'),o)[0]   # edited: the wrench gone from his hands
  o.save(FRAMES/f);files.append(f)
 return files

# Once he takes the hook the wrench is gone: his ordinary poses are GPT edits of the approved frames with the hook in
# the wrench's place (hook-poses/<frame>.png: the 400x300 frame was centred on a 400x400 square for the edit). Each edit
# is cut back to the frame and slid onto the original's head and shoulders, so nothing jumps when the phase changes.
HOOK_EDIT=SRC/'hook-poses';HOOK_STATES=['idle','walk','hurt','stagger_polish','flinch','winded','block','down','fall','getup','taunt','land','sandblind','call','gloat','gape']
def fit(edit,orig):
 e=edit.convert('RGBA').resize((400,400),Image.LANCZOS).crop((0,50,400,350));e=alpha(e,128)
 a=np.array(orig)[...,3]>64;ys,xs=np.nonzero(a);top=ys.min();band=slice(top,top+int((ys.max()-top)*.4))   # the top 40%: head and shoulders
 b=np.array(e)[...,3]>64;best=None
 for dy in range(-14,15):
  for dx in range(-14,15):
   q=np.roll(np.roll(b,dy,0),dx,1)[band];sc=(q&a[band]).sum()/max(1,(q|a[band]).sum())
   if best is None or sc>best[0]:best=(sc,dx,dy)
 o=Image.new('RGBA',e.size);o.alpha_composite(e,(best[1],best[2]));return edges(o),best[0]
def hookart(m):
 if not HOOK_EDIT.exists():return {}
 out={};worst=[]
 for st in HOOK_STATES:
  files=[]
  for f in m['dl_thekedar'].get(st,[]):
   stem=Path(f).stem;src=HOOK_EDIT/f'{stem}.png'
   if src.exists():
    im,sc=fit(Image.open(src),Image.open(FRAMES/f));g=f'dl_thekedar/{stem}_h.png';im.save(FRAMES/g);files.append(g);worst.append((round(sc,2),stem))
   else:files.append(f)   # no wrench in this frame: shared
  if files:out[st+'_h']=files
 print('hook pose fit (head overlap)',sorted(worst)[:4])
 return out
def toss():
 # On the gantry: the wrench raised to throw, then the empty-handed follow-through.
 src=SRC/'thekedar-toss.png'
 if not src.exists():return None
 ims=pieces(src,2,20);im=ims[1];w=im.width;a=np.array(ims[0])[...,3]>64
 head=np.nonzero(a[:,a.shape[1]//2:].any(1))[0].min()   # the raised arm is on his back side: measure from the head
 k=176/(a.shape[0]-head);files=[]
 for j,im in enumerate(ims):
  im=scaled(im,k);o=Image.new('RGBA',THEK[0]);o.alpha_composite(im,(round(THEK[0][0]/2-pelvis_x(im)),THEK[1]-im.height))
  f=f'dl_thekedar/toss_{j}.png';edges(o).save(FRAMES/f);files.append(f)
 return files

def main():
 # The magnet as wide as the grab's jaws (196 2x px); drums a little under CHAD's hip, the taxi (drawn small) brought up to them;
 # the hook half the grab's height.
 st=dict([x for x in [stuck(),loaded()] if x]+junk()+[magnet(),taxi(),props('phase-hook.png',2,118,(0,'h'),'hook','hook',gap=30)])
 hook=thekedar()
 with open(FRAMES/'.manifest.lock','a') as lk:
  fcntl.flock(lk,fcntl.LOCK_EX);p=FRAMES/'manifest.json';m=json.loads(p.read_text())
  m['dl_grab'].update(st);m['dl_thekedar']['hook']=hook;m['dl_thekedar'].update(hookart(m))
  t=toss();y=yank()
  m['ic_docker'].pop('yanked',None)   # crew frames keep the 360x300 canvas; this one is magnet art
  if y:m['dl_grab']['yanked']=y
  if t:m['dl_thekedar']['toss']=t
  p.write_text(json.dumps(m,indent=2)+'\n')
 print(json.dumps({**{k:len(v) for k,v in st.items()},'hook_poses':len(hook)}))
if __name__=='__main__':main()
