"""Register devour/smash, mutated combat edits and panless injury poses."""
from pathlib import Path
import sys,json,fcntl
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_polish import strip
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu';OUT=ROOT/'assets/frames/ic_vendor'
# Uniform anatomical corrections from the native-size skull/arm/torso review.
SCALE={'demon_idle3': [1.0, 1.0, 1.0, 1.0], 'demon_walk3': [1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15, 1.15], 'demon_string': [1.08, 1.13, 1.12, 1.1, 1.08, 1.08, 1.08], 'demon_breath': [1.12, 1.15, 1.12], 'demon_flop_polish': [1.02, 1.02, 1.0, 1.0, 1.02], 'demon_bump': [1.03, 1.03, 1.09], 'demon_hurt': [1.08, 1.1], 'demon_stagger_polish': [1.08, 1.07, 1.09, 1.07], 'demon_block': [1.07], 'demon_guardbreak': [1.1], 'demon_flopup': [1.08, 1.1, 1.08], 'demon_down': [1.04], 'demon_getup': [1.05, 1.07], 'demon_brutal': [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 1.0], 'demon_yank': [1.0, 1.0, 1.0]}

def body(im,scale,feet=True):
 im=alpha(im,128);im=im.crop(im.getbbox());a=im.getchannel('A');b=a.crop((0,max(0,im.height-20),im.width,im.height)).getbbox();cx=(b[0]+b[2])/2 if feet else im.width/2
 im=edges(alpha(im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS),128));o=Image.new('RGBA',(560,440));o.alpha_composite(im,(round(280-cx*scale),432-im.height));return o

def grid_bodies(sheet,n):
 import numpy as np
 mask=np.array(sheet.getchannel('A'))>127;boxes=[]
 for y,x in zip(*mask.nonzero()):
  if not mask[y,x]:continue
  todo=[(int(x),int(y))];mask[y,x]=False;l=r=int(x);top=bot=int(y);count=0
  while todo:
   xx,yy=todo.pop();count+=1;l=min(l,xx);r=max(r,xx);top=min(top,yy);bot=max(bot,yy)
   for dx,dy in ((-1,0),(1,0),(0,-1),(0,1)):
    nx=xx+dx;ny=yy+dy
    if 0<=nx<sheet.width and 0<=ny<sheet.height and mask[ny,nx]:mask[ny,nx]=False;todo.append((nx,ny))
  if count>1000:boxes.append((l,top,r+1,bot+1))
 assert len(boxes)==n,(len(boxes),n)
 boxes.sort(key=lambda b:(b[1]+b[3])/2);ordered=[]
 for row in range(0,n,4):ordered+=sorted(boxes[row:row+4])
 return [sheet.crop(b) for b in ordered]

def main():
 updates={};manifest=json.loads((ROOT/'assets/frames/manifest.json').read_text())['ic_vendor']
 def save(state,ims):
  paths=[]
  for i,im in enumerate(ims):
   p=OUT/f'{state}_{i:02}.png';im.save(p);paths.append(str(p.relative_to(ROOT/'assets/frames')))
  updates[state]=paths
 poses=strip('devour-smash',8,'v3' if (SRC/'devour-smash-v3.png').exists() else 'v2');save('devour_smash',[body(im,204/poses[1].height) for im in poses])
 if (SRC/'smash-drive-v1.png').exists():
  drive=strip('smash-drive',3,'v3' if (SRC/'smash-drive-v3.png').exists() else 'v2');k=176/drive[2].height;save('smash_drive',[body(im,k) for im in drive])
 if (SRC/'devour-growth-v1.png').exists():
  growth=strip('devour-growth',4);k=(poses[3].height*204/poses[1].height)/growth[0].height;save('devour_growth',[body(im,k*[1,1.05,1.12,1.12][i]) for i,im in enumerate(growth)])
 if (SRC/'burner-wreck-v1.png').exists():
  im=alpha(Image.open(SRC/'burner-wreck-v1.png').convert('RGBA'),128);im=im.crop(im.getbbox());im=edges(alpha(im.resize((196,round(196*im.height/im.width)),Image.Resampling.LANCZOS),128));im.save(ROOT/'assets/stages/dirty_delhi/vendor/burner_wreck.png')
 poses=strip('demon-idle',4,'v2');save('demon_idle3',[body(im,246/strip('demon-idle',4)[0].height) for im in poses])
 for name,n in [('furnace-forearm',6),('furnace-cleaver',7)]:
  if (SRC/(name+'-v1.png')).exists():
   poses=strip(name,n);k=246/poses[0].height;save('demon_'+name.replace('furnace-',''),[body(im,k) for im in poses])
 # Fixed grid edits preserve approved gameplay pose geometry. Register enlarged anatomy about the same soles.
 families={'demon-walk':['walk3'],'demon-attacks':['string','breath','flop_polish','bump'],'demon-reactions':['hurt','stagger_polish','block','guardbreak','flopup','down','getup','idle3']}
 meta={name:{'cols':4,'rows':(sum(len(manifest[s]) for s in states)+3)//4,'entries':[(s,i) for s in states for i in range(len(manifest[s]))]} for name,states in families.items()}
 for name,data in meta.items():
  p=SRC/(name+'-v2.png')
  if not p.exists():continue
  sheet=alpha(Image.open(p).convert('RGBA'),128);groups={};cells=grid_bodies(sheet,len(data['entries']))
  for n,(state,index) in enumerate(data['entries']):
   if state=='idle3':continue
   im=cells[n]
   base=Image.open(ROOT/'assets/frames'/manifest[state][index]);bb=base.getbbox();factor=1.15*SCALE['demon_'+state][index];w=round((bb[2]-bb[0])*factor);h=round((bb[3]-bb[1])*factor)
   im=edges(alpha(im.resize((w,h),Image.Resampling.LANCZOS),128));o=Image.new('RGBA',(560,440));x=280+round((bb[0]-224)*factor);y=432+round((bb[1]-292)*factor);o.alpha_composite(im,(x,y));groups.setdefault('demon_'+state,[]).append(o)
  for state,ims in groups.items():save(state,ims)
 if (SRC/'demon-brutal-v1.png').exists():
  poses=strip('demon-brutal',7,'v2');k=246/strip('demon-brutal',7)[3].height;ims=[body(im,k,i<5) for i,im in enumerate(poses)];save('demon_brutal',ims)
 if (SRC/'demon-yank-v1.png').exists():
  poses=strip('demon-yank',3,'v2');k=246/strip('demon-yank',3)[2].height;save('demon_yank',[body(im,k) for im in poses])
 im=alpha(Image.open(SRC/'shattered-cauldron-v1.png').convert('RGBA'),128);im=im.crop(im.getbbox());im=edges(alpha(im.resize((160,round(160*im.height/im.width)),Image.Resampling.LANCZOS),128));im.save(ROOT/'assets/stages/dirty_delhi/vendor/shattered_cauldron.png')
 # Real fractured iron pieces from the approved smashed prop, for deterministic ballistic debris.
 from keying import components
 import numpy as np
 raw=alpha(Image.open(SRC/'shattered-cauldron-v1.png').convert('RGBA'),128);arr=np.array(raw);parts=sorted(components(arr[:,:,3]>127),key=len,reverse=True)[:6];atlas=Image.new('RGBA',(96*6,96))
 for i,part in enumerate(parts):
  yy,xx=part[:,0],part[:,1];box=(int(xx.min()),int(yy.min()),int(xx.max())+1,int(yy.max())+1);q=np.zeros_like(arr);q[yy,xx]=arr[yy,xx];piece=Image.fromarray(q).crop(box);k=min(84/piece.width,78/piece.height,.18);piece=edges(alpha(piece.resize((max(1,round(piece.width*k)),max(1,round(piece.height*k))),Image.Resampling.LANCZOS),128));atlas.alpha_composite(piece,(i*96+(96-piece.width)//2,(96-piece.height)//2))
 atlas.save(ROOT/'assets/stages/dirty_delhi/vendor/cauldron_shards.png')
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor'].update(updates);p.write_text(json.dumps(m,indent=2)+'\n')
 print({k:len(v) for k,v in updates.items()})
if __name__=='__main__':main()
