"""Street inferno art: Pappu's rage roar, fire pillars, the screen-filling fire wall and the nova.
Sources (GPT Image, see AGENTS.md) live beside the other Pappu sources."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from pappu_sheet_helpers import pelvis
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu'
FRAMES=ROOT/'assets/frames';OUT=ROOT/'assets/stages/dirty_delhi/vendor'
LZ=Image.Resampling.LANCZOS

def columns(im,n):
 # Split a row sheet at its n-1 widest empty column gaps; embers stay with their pose.
 a=np.array(im.getchannel('A'))>127;filled=a.any(0);gaps=[];x=0;W=len(filled)
 while x<W:
  if not filled[x]:
   s=x
   while x<W and not filled[x]:x+=1
   if s>0 and x<W:gaps.append((x-s,(s+x)//2))
  else:x+=1
 cuts=sorted(c for _,c in sorted(gaps)[-(n-1):]);edges_=[0]+cuts+[W];out=[]
 for i in range(n):
  c=im.crop((edges_[i],0,edges_[i+1],im.height));out.append(c.crop(c.getbbox()))
 return out

def feet_w(im):
 a=np.array(im.getchannel('A'))>127;yy,xx=np.nonzero(a);lo=yy>=yy.max()-(yy.max()-yy.min())*.06;return xx[lo].max()-xx[lo].min()

def roar():
 # Facing left as generated: mirrored to the raw right-facing demon convention. Scaled on the sandal
 # span of the standing exhale pose so the flames above his head never shrink him.
 sheet=alpha(Image.open(SRC/'inferno-roar-v1.png').convert('RGBA'),128);ps=columns(sheet,3)
 ref=Image.open(FRAMES/'ic_vendor/demon_floor_spew_07.png');ref=ref.crop(ref.getbbox());k=feet_w(ref)/feet_w(ps[0]);files=[]
 for i,p in enumerate(ps):
  im=alpha(p.transpose(Image.Transpose.FLIP_LEFT_RIGHT).resize((round(p.width*k),round(p.height*k)),LZ),128)
  o=Image.new('RGBA',(560,440));o.alpha_composite(im,(round(280-pelvis(im)),432-im.height));o=edges(o)
  name=f'ic_vendor/demon_inferno_roar_{i:02}.png';o.save(FRAMES/name);files.append(name)
 # 3: the fold from the held roar into the slump (an in-between edit, already facing right).
 fold=alpha(Image.open(SRC/'inferno-roar-fold-v1.png').convert('RGBA'),128);fold=fold.crop(fold.getbbox());hs=[Image.open(FRAMES/f).getbbox() for f in files[1:3]];kk=(sum(b[3]-b[1] for b in hs)/2)/fold.height   # between the roar and the slump it folds into
 im=alpha(fold.resize((round(fold.width*kk),round(fold.height*kk)),LZ),128);o=Image.new('RGBA',(560,440));o.alpha_composite(im,(round(280-pelvis(im)),432-im.height));o=edges(o)
 name='ic_vendor/demon_inferno_roar_03.png';o.save(FRAMES/name);files.append(name)
 return files

def pillar():
 # Four 96x320 cells (2x), bottoms on the cell floor.
 ps=columns(alpha(Image.open(SRC/'inferno-pillar-v1.png').convert('RGBA'),128),4);k=300/max(p.height for p in ps);out=Image.new('RGBA',(96*4,320))
 for i,p in enumerate(ps):
  im=edges(alpha(p.resize((round(p.width*k),round(p.height*k)),LZ),128));im.thumbnail((94,316));out.alpha_composite(im,(i*96+(96-im.width)//2,320-im.height))
 out.save(OUT/'inferno_pillar.png');return out.size

def wall():
 # Two full-width variants stacked, 960x540 each (the 480x270 screen at 2x), flame tops trimmed to the image.
 out=Image.new('RGBA',(960,1080))
 for i,n in enumerate(['inferno-wall-v1.png','inferno-wall-v2.png']):
  im=alpha(Image.open(SRC/n).convert('RGBA'),128);bb=im.getbbox();im=im.crop((0,bb[1],im.width,bb[3]));im=alpha(im.resize((960,540),LZ),128);out.alpha_composite(im,(0,i*540))
 out.save(OUT/'inferno_wall.png');return out.size

def nova():
 # Six frames growing from one centre: split at the gaps, then centre each on its own bbox centre in a
 # square cell sized to the biggest frame, so no fireball is clipped.
 sheet=alpha(Image.open(SRC/'inferno-nova-v1.png').convert('RGBA'),96);ps=columns(sheet,6);side=max(max(p.size) for p in ps)+8;out=Image.new('RGBA',(384*6,384))
 for i,p in enumerate(ps):
  cell=Image.new('RGBA',(side,side));cell.alpha_composite(p,((side-p.width)//2,(side-p.height)//2));out.alpha_composite(cell.resize((384,384),LZ),(i*384,0))
 out.save(OUT/'inferno_nova.png');return out.size

def main():
 rf=roar();sizes=[pillar(),wall(),nova()]
 with open(FRAMES/'.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=FRAMES/'manifest.json';m=json.loads(p.read_text());m['ic_vendor']['demon_inferno_roar']=rf;p.write_text(json.dumps(m,indent=2)+'\n')
 print(json.dumps({'roar':rf,'sizes':sizes}))
if __name__=='__main__':main()
