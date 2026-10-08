"""Dredger fight in-betweens and Last Load finisher art: CHAD's overhead catch and the Thekedar's gape (the loaded magnet is in build_dredger_phases.py).
Sources (GPT Image edits of approved frames, see AGENTS.md) live in the dredger sources folder; this
registers them at gameplay scale beside the Thekedar and grab frames. build_delhi_dredger.py rebuilds
those folders and then calls this, so the finisher frames survive a rebuild."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from sprite_palette import match_chad_skin
from chad_palette import lock
from keying import components
from build_pappu_puri_finish import keep_props,legs,scaled
from build_train_conductor import pelvis_x
sys.path.insert(0,str(Path(__file__).parents[1]/'verification'))
from chad_identity_check import measure

ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/dredger';FRAMES=ROOT/'assets/frames'
THEK=(400,300),293   # dl_thekedar canvas and sole row

def single(path):
 # The largest figure, plus anything near it (a dropped walkie or wrench).
 im=alpha(Image.open(path).convert('RGBA'),128);a=np.array(im);parts=[p for p in components(a[:,:,3]>127) if len(p)>=40]
 keep=np.zeros(a.shape[:2],bool)
 for p in parts:keep[p[:,0],p[:,1]]=True
 a[~keep]=0;im=Image.fromarray(a);return im.crop(im.getbbox())

def boot(im):
 # Sole length of the larger boot: the widest blob in the bottom rows. Holds while the knees bend.
 a=np.array(im.convert('RGBA'))[...,3]>127;ys=np.nonzero(a.any(1))[0];b=a[ys.max()-int((ys.max()-ys.min())*.035):ys.max()+1]
 return max(p[:,1].max()-p[:,1].min()+1 for p in components(b))

def crown(im):
 # Hair top to sole, measured as chad_identity_check does (anchored on the shades, so raised arms don't count).
 return measure(np.array(im.convert('RGBA')),1.)['crown']

def chad(srcs,name):
 first=None
 # Raw-registered like puri_cram (aiframes copies these states unscaled): head room above the 192 px
 # canvas for raised arms, feet 3 logical px up, lower-body centroid centred; gold skin and palette.
 ims=[]
 for src,base,metric in srcs:
  # metric: 'boot' (sole length; for squats) or a crown height in 2x px (hair top to sole, standing).
  # or ('sheet', h): one scale for a whole GPT sheet, its first frame made h 2x px tall (turning views have no shades or boots to measure)
  p=single(SRC/src);b=Image.open(FRAMES/base)
  if isinstance(metric,tuple):first=first if ims else single(SRC/srcs[0][0]);k=metric[1]/first.height
  else:k=boot(b)/boot(p) if metric=='boot' else metric/crown(p)
  ims.append(alpha(scaled(p,k),128))
 H=max(192,max(i.height for i in ims)+10);files=[]
 for i,im in enumerate(ims):
  a=np.array(im.getchannel('A'))>16;yy,xx=np.nonzero(a);lo=yy>=yy.max()-(yy.max()-yy.min())*.55;fx=float(xx[lo].mean())
  W=2*round(max(fx,im.width-fx))+4;o=Image.new('RGBA',(W,H));o.alpha_composite(im,(round(W/2-fx),H-6-im.height));o=edges(o);o=keep_props(o,lock(match_chad_skin(o)))
  f=f'chad_{name}{i+1}.png';o.save(FRAMES/f);files.append(f)
 return files

def thekedar(src,ref,out,trim=1):
 # Height-matched to the frame it edits, trimmed after review beside it at gameplay scale (head and slipper size).
 p=single(SRC/src);r=Image.open(FRAMES/ref);rb=r.getbbox();k=(rb[3]-rb[1])/p.height*trim
 im=scaled(p,k);o=Image.new('RGBA',THEK[0]);o.alpha_composite(im,(round(THEK[0][0]/2-pelvis_x(im)),THEK[1]-im.height));o=edges(o);o.save(FRAMES/out);return out

def body_h(im):
 # Figure height without the red wrench (raised or dragged, it would swamp the measure).
 q=np.array(im.convert('RGBA')).astype(int);r,g,b,a=[q[...,i] for i in range(4)];m=(a>127)&~((r>120)&(g<r*.55)&(b<r*.55))
 ys=np.nonzero(m.sum(1)>=3)[0];return ys.max()-ys.min()

# In-betweens for the Thekedar's fight moves (edits of the neighbouring approved poses): source, body
# height in 2x px (interpolated from the poses either side, wrench excluded), registered name.
INBETWEEN=[('wA',152),('wB',146),('wC',173),('wD',152),('iA',170),('iB',170),('cB',170),('sA',152)]
def inbetweens():
 out={}
 for n,h in INBETWEEN:
  p=single(SRC/f'fight-thekedar-{n}.png');im=scaled(p,h/body_h(p));o=Image.new('RGBA',THEK[0]);o.alpha_composite(im,(round(THEK[0][0]/2-pelvis_x(im)),THEK[1]-im.height));edges(o).save(FRAMES/f'dl_thekedar/x_{n}.png');out[n]=f'dl_thekedar/x_{n}.png'
 return out

def light_frames():
 # The Zippo lighting sheet (two rows of four), split; the painted smoke over his head goes from the drawing
 # and exhale frames (4, 6, 7): the runtime smoke replays it, moving.
 import colorsys
 from build_dredger_reveal import slots
 ims=slots(SRC/'finish-chad-light-sheet.png',4,row=0,min_px=30)+slots(SRC/'finish-chad-light-sheet.png',4,row=1,min_px=30)
 # GPT draws the second row a little smaller: match its upright frame 5 to frame 1's height so he doesn't shrink.
 hgt=lambda im:np.ptp(np.nonzero(np.array(im)[...,3]>127)[0])+1;r=hgt(ims[0])/hgt(ims[4])
 ims=ims[:4]+[im.resize((round(im.width*r),round(im.height*r)),Image.LANCZOS) for im in ims[4:]]
 for i,im in enumerate(ims):
  if i in (4,6,7):
   a=np.array(im);h=a.shape[0];top=a[:int(h*.17)].astype(float)/255;mx=top[...,:3].max(-1);mn=top[...,:3].min(-1)
   smoke=(top[...,3]>0)&(mx>.5)&((mx-mn)<.16*mx+.03);a[:int(h*.17)][smoke]=0;im=Image.fromarray(a)
  if i==5:   # the lid-snap motion arc is painted blue: steel grey like the Zippo (only above the jeans)
   a=np.array(im);top=a[:int(a.shape[0]*.4)].astype(int);blue=(top[...,2]>top[...,0]+14)&(top[...,2]>=top[...,1])&(top[...,3]>0)
   g=(top[...,:3].mean(-1)*.6+90).clip(0,255);a[:int(a.shape[0]*.4)][blue,:3]=g[blue,None].astype(np.uint8);im=Image.fromarray(a)
  a=np.array(im);h=a.shape[0]   # a flicked-off bit of lid lying by his feet belongs to no pose
  for c in components(a[...,3]>127):
   if len(c)<400 and c[:,0].mean()>h*.8:a[c[:,0],c[:,1]]=0
  Image.fromarray(a).save(SRC/f'finish-chad-light{i+1}.png')

def main():
 light_frames();lt=chad([(f'finish-chad-light{i}.png','chad_sidle1.png',('sheet',178)) for i in range(1,9)],'dredge_light')   # the Zippo lighting
 sp=chad([(f'finish-chad-spin{i}.png','chad_sidle1.png',('sheet',172)) for i in range(1,5)],'dredge_spin')   # the hammer-throw whirl, a quarter turn a frame
 cf=chad([('finish-chad-catch1.png','chad_sidle1.png','boot'),('finish-chad-catch2.png','chad_sidle1.png','boot')],'dredge_catch')
 gape=thekedar('finish-thekedar-gape.png','dl_thekedar/a_03.png','dl_thekedar/finish_gape.png',1.05)
 x=inbetweens();T='dl_thekedar/'
 with open(FRAMES/'.manifest.lock','a') as lk:
  fcntl.flock(lk,fcntl.LOCK_EX);p=FRAMES/'manifest.json';m=json.loads(p.read_text())
  m['player']['dredge_catch']=cf;m['player']['dredge_spin']=sp;m['player']['dredge_light']=lt;m['dl_thekedar']['gape']=[gape]
  # The full wrench string, the idle fidgets (cough, spit), the barked call and the sack release.
  m['dl_thekedar']['wrench_string']=[T+'b_00.png',x['wA'],T+'b_01.png',x['wB'],x['wC'],T+'b_02.png',x['wD'],T+'b_03.png']
  m['dl_thekedar']['fidget']=[x['iA'],x['iB']];m['dl_thekedar']['call']=[T+'a_03.png',x['cB']];m['dl_thekedar']['sack_release']=[x['sA']];p.write_text(json.dumps(m,indent=2)+'\n')
 print(json.dumps({'chad':cf,'gape':gape}))
if __name__=='__main__':main()
