#!/usr/bin/env python3
"""Assemble generated Delhi walk halves and targeted repairs into review candidates."""
from pathlib import Path
import sys,json
import numpy as np
from PIL import Image,ImageDraw
ROOT=Path(__file__).resolve().parents[2]
from build_delhi_cast_performances import cells,register,FAMILIES
from keying import components
from sprite_edges import alpha
SRC=ROOT/'assets/sources/production/stages/dirty_delhi/street_cast'

def grid(path,cols=3,rows=2):
 im=Image.open(path).convert('RGBA');im=alpha(im);a=np.array(im);h,w=a.shape[:2];groups={i:[] for i in range(cols*rows)}
 for p in components(a[...,3]>0):
  if len(p)<30:continue
  cy,cx=p.mean(0);groups[min(rows-1,int(cy*rows/h))*cols+min(cols-1,int(cx*cols/w))].append(p)
 result={}
 for i,parts in groups.items():
  if not parts:raise ValueError(f'{path}:empty cell{i}')
  body=max(parts,key=len)
  if len(body)<800:raise ValueError(f'{path}:no body{i}')
  keep=np.zeros((h,w),bool);y0,x0=body.min(0)-40;y1,x1=body.max(0)+40
  for p in parts:
   if p is body or(len(p)>60 and ((p[:,0]>=y0)&(p[:,0]<=y1)&(p[:,1]>=x0)&(p[:,1]<=x1)).any()):keep[p[:,0],p[:,1]]=True
  b=a.copy();b[~keep]=0;c=Image.fromarray(b);result[i]=c.crop(c.getbbox())
 return result

def face_marker(im):
 a=np.array(im).astype(float);r,g,b=a[...,:3].transpose(2,0,1);Y,X=np.indices(r.shape)
 yy=np.where((a[...,3]>0)&(r>110)&(r-g>28)&(g-b>8)&(Y<im.height*.27)&(X>im.width*.48))[0]
 return float(np.percentile(yy,98))

def matched(im,ref):
 factor=face_marker(ref)/face_marker(im)
 im=im.resize((round(im.width*factor),round(im.height*factor)),Image.Resampling.LANCZOS);im=alpha(im);return im

def run(f,unarmed=False):
 folder=SRC/'performances'/f;sheet='unarmed' if unarmed else 'locomotion';suffix='-unarmed' if unarmed else '';oldpath=folder/f'{sheet}-pre-gait.png'
 if not oldpath.exists():oldpath.write_bytes((folder/f'{sheet}.png').read_bytes())
 old=cells(oldpath);targetheight=json.loads((SRC/'selected/selection.json').read_text())['selections'][f]['height_at_2x'];poses=[];inserts={}
 for half in ['near','far']:
  prefix='walk-half' if f=='snatcher' else 'half'
  gs=grid(folder/f'{prefix}-{half}{suffix}.png');sf=old[0].height/gs[0].height
  if f=='enforcer' and half=='near':
   patches=grid(folder/'near-patch-repair.png',2,1)
   for j,i in enumerate([4,5]):gs[i]=matched(patches[j],gs[i])
  if f=='kitchen' and half=='near' and (folder/'near-patch-repair.png').exists():
   patch=Image.open(folder/'near-patch-repair.png').convert('RGBA');patch=patch.crop(patch.getbbox());gs[2]=matched(patch,gs[2])
  if f=='docker' and (folder/'patch-repair.png').exists():
   patches=grid(folder/'patch-repair.png',2,2)
   for j,(hh,i) in enumerate([('near',1),('near',4),('far',0),('far',1)]):
    if hh==half:gs[i]=matched(patches[j],gs[i])
   if half=='far':gs[2],gs[3]=gs[3],gs[2]
  if f=='snatcher':
   patches=grid(folder/'patch-repair.png')
   mapping=[('near',2),('near',4),('near',5),('far',0),('far',1),('far',5)]
   for j,(hh,i) in enumerate(mapping):
    if hh==half:gs[i]=matched(patches[j],gs[i])
   if half=='near':
    early=Image.open(folder/'passing.png').convert('RGBA');early=early.crop(early.getbbox());early=matched(early,gs[2]);gs[1]=gs[2].copy();gs[2]=early
  original_cross=gs[3].copy()
  bridge=folder/(f'late-{half}.png' if f=='snatcher' else f'bridge-{half}{suffix}.png')
  if bridge.exists():
   b=Image.open(bridge).convert('RGBA');b=b.crop(b.getbbox());factor=face_marker(gs[2])/face_marker(b)
   if f=='brawler':
    def torso_marker(im):
     a=np.array(im).astype(float);r,g,bl=a[...,:3].transpose(2,0,1);yy,_=np.where((a[...,3]>0)&(r>155)&(bl>85)&((r-g)<70)&((g-bl)<85));yy=yy[(yy<im.height*.65)&(yy>im.height*.15)];return float(np.percentile(yy,98))
    factor=torso_marker(gs[2])/torso_marker(b)
   b=b.resize((round(b.width*factor),round(b.height*factor)),Image.Resampling.LANCZOS);b=alpha(b);gs[3]=b
  cross_ix=3+(0 if half=='near' else 6)
  def scaled(im):return im.resize((round(im.width*sf),round(im.height*sf)),Image.Resampling.LANCZOS)
  if '--retain-crossing' in sys.argv:inserts.setdefault(cross_ix,[]).append(scaled(original_cross))
  extra=folder/f'extra-{half}{suffix}.png'
  if unarmed and (folder/'unarmed-mid-patch-clean.png').exists():
   cleaned=grid(folder/'unarmed-mid-patch-clean.png',2,1)[0 if half=='near' else 1]
   cleaned.save(folder/f'extra-{half}-unarmed-clean.png');extra=folder/f'extra-{half}-unarmed-clean.png'
  if unarmed and (folder/f'extra-{half}-unarmed-shoe-v2.png').exists():extra=folder/f'extra-{half}-unarmed-shoe-v2.png'
  if unarmed and (folder/f'extra-{half}-unarmed-shoe-v3.png').exists():extra=folder/f'extra-{half}-unarmed-shoe-v3.png'
  if f=='kitchen':extra=folder/f'early-{half}.png'
  if f=='snatcher' and (folder/f'extra-{half}-v2.png').exists():extra=folder/f'extra-{half}-v2.png'
  if not unarmed and (folder/f'extra-{half}-shoe-v2.png').exists():extra=folder/f'extra-{half}-shoe-v2.png'
  if not unarmed and (folder/f'extra-{half}-shoe-v3.png').exists():extra=folder/f'extra-{half}-shoe-v3.png'
  if extra.exists():
   b=Image.open(extra).convert('RGBA');b=b.crop(b.getbbox());b=matched(b,gs[3]);ix=cross_ix
   if f=='snatcher':ix=9
   if f=='enforcer':ix=4+(0 if half=='near' else 6)
   if f in ['docker','kitchen']:ix=2+(0 if half=='near' else 6)
   if f=='heavy' and unarmed:ix=3 if half=='near' else 7
   if f=='heavy' and unarmed and half=='near':inserts.setdefault(ix,[]).insert(0,scaled(b))
   else:inserts.setdefault(ix,[]).append(scaled(b))
  for i in range(6):
   im=gs[i].resize((round(gs[i].width*sf),round(gs[i].height*sf)),Image.Resampling.LANCZOS);im=alpha(im);poses.append(im)
 if '--contacts' in sys.argv:
  poses[5]=poses[6].copy();poses[11]=poses[0].copy()
  # Start and settle use the approved guard; preserve its exact far-contact footprint.
  if f=='enforcer':poses[5]=old[0].copy();poses[6]=old[0].copy()
 ordered=[];contacts=[]
 for i,im in enumerate(poses):
  for x in inserts.get(i,[]):x=alpha(x);ordered.append(x)
  if i in [0,5,6,11]:contacts.append(len(ordered))
  ordered.append(im)
 poses=ordered
 cols,rows=(4,4) if len(poses)==12 else ((4,5) if len(poses)==16 else (3,(len(poses)+6)//3))
 layout={'_layout':{sheet:[cols,rows]},'_count':{sheet:len(poses)+4}}
 (folder/f'{sheet}-gait-registration.json').write_text(json.dumps(layout,indent=2)+'\n')
 cell=max(p.width for p in list(old.values())[:4]+poses)+max(p.height for p in list(old.values())[:4]+poses)//2
 cell=max(cell,max(p.height for p in list(old.values())[:4]+poses))+80;sheetim=Image.new('RGBA',(cell*cols,cell*rows))
 for i in range(len(poses)+4):
  im=old[i] if i<4 else poses[i-4];x=i%cols*cell+(cell-im.width)//2;y=(i//cols+1)*cell-30-im.height;sheetim.alpha_composite(im,(x,y))
 # Keep every accepted enforcer source cell unchanged except its two far contacts.
 accepted=folder/'locomotion-pre-start-seam.png'
 if f=='enforcer' and '--contacts' in sys.argv and accepted.exists():
  sheetim=Image.open(accepted).convert('RGBA');cw=sheetim.width//cols;ch=sheetim.height//rows
  guard=sheetim.crop((0,0,cw,ch))
  for i in [contacts[1]+4,contacts[2]+4]:
   x=i%cols*cw;y=i//cols*ch;sheetim.paste((0,0,0,0),(x,y,x+cw,y+ch));sheetim.alpha_composite(guard,(x,y))
 sheetim.save(folder/f'{sheet}-gait-candidate.png')
 dst=ROOT/'tmp/review/delhi-cast/gait-candidates'/f/sheet;dst.mkdir(parents=True,exist_ok=True)
 native=cells(folder/f'{sheet}-gait-candidate.png',cols,rows,count=len(poses)+4)
 frames=[register(native[i+4],targetheight/native[0].height) for i in range(len(poses))]
 for i,im in enumerate(frames):im.save(dst/f'{i:02d}.png')
 for bg in ['dark','light']:
  out=Image.new('RGBA',(360*4,300*((len(poses)+3)//4)),'#15191d' if bg=='dark' else '#d6d0c6');draw=ImageDraw.Draw(out)
  for i,im in enumerate(frames):x=i%4*360;y=i//4*300;out.alpha_composite(im,(x,y));draw.text((x+8,y+8),str(i),fill='#c69b62' if bg=='dark' else '#39332b')
  out.save(dst/f'{bg}.png')
 print(json.dumps({'family':f,'sheet':sheet,'candidate':str(folder/f'{sheet}-gait-candidate.png'),'heights':[p.height for p in poses],'contacts':contacts,'layout':layout}))
 return frames
if __name__=='__main__':run(sys.argv[1],'--unarmed' in sys.argv)
