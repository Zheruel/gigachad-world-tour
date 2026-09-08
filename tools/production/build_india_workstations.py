#!/usr/bin/env python3
"""Register chair-free worker performances and repair occupied desk backgrounds.

Selected GPT Image sources are retained; actor scale stays uniform across every
pose. Background repair is confined to chair silhouettes, preserving room joins.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageOps
from build_india_cast import matte, grid

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/rebuild/workstations'
OUT=ROOT/'assets/stages/refund_tower'
REVIEW=ROOT/'tmp/review/workstations'
# Exact chairs in the approved main desk row, in 2x scene coordinates. The
# generated replacement is applied only here, never over a panorama boundary.
CHAIRS={
 'office':[(395,296,411),(790,297,410),(855,298,410),(1084,299,413),(1288,300,413)],
 'annex':[(295,260,374),(490,260,374),(680,263,374),(1030,259,374),(1160,260,374),(1340,260,374)],
 'calling':[(354,272,369),(438,273,369),(539,273,369),(658,272,369),(815,272,369),(978,272,369),(1087,271,369),(1208,271,369),(1290,271,369),(1420,273,369)],
 'calling_east':[(208,259,347),(298,258,347),(398,258,347),(490,258,347),(580,258,347),(660,258,347),(827,258,347),(907,258,347),(990,258,347),(1068,258,347),(1148,258,347),(1228,258,347),(1300,258,347),(1370,258,347)],
}

def backgrounds():
 OUT.mkdir(parents=True,exist_ok=True)
 for name,chairs in CHAIRS.items():
  base=Image.open(SOURCE/f'{name}_reference.png').convert('RGB')
  repaired=ImageOps.fit(Image.open(SOURCE/f'{name}_clear.png').convert('RGB'),base.size,method=Image.Resampling.LANCZOS)
  mask=Image.new('L',base.size);d=ImageDraw.Draw(mask)
  for x,top,bottom in chairs:
   d.polygon([(x-29,top-5),(x+23,top-5),(x+35,top+18),(x+49,top+41),
    (x+41,bottom-24),(x+42,bottom),(x-43,bottom),(x-41,bottom-27),(x-44,top+37)],fill=255)
  mask=mask.filter(ImageFilter.GaussianBlur(2))
  base.paste(repaired,(0,0),mask);base.save(OUT/f'{name}.png',optimize=True)

def transparent(image):
 # The generated actor sheets have a pale printed matte. It is far lighter than
 # clothing; trim that matte and neutralize only adjacent extraction fringes.
 a=np.asarray(image.convert('RGBA')).copy();rgb=a[:,:,:3].astype(int)
 kill=(rgb.min(2)>222)&(rgb.max(2)-rgb.min(2)<14)
 a[kill]=0
 edge=np.asarray(Image.fromarray((kill*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0
 gray=edge&~kill&(rgb.min(2)>160)&(rgb.max(2)-rgb.min(2)<13)
 a[gray,3]=np.minimum(a[gray,3],100);a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)

def atlas(frames,cols,path):
 w,h=frames[0].size;im=Image.new('RGBA',(w*cols,h*((len(frames)+cols-1)//cols)))
 for i,f in enumerate(frames):im.alpha_composite(f,(i%cols*w,i//cols*h))
 im.save(path,optimize=True);return im

def actors():
 seated=[];standing=[];REVIEW.mkdir(parents=True,exist_ok=True)
 for name in ['headset','operator','thrower']:
  poses=grid(transparent(Image.open(SOURCE/f'{name}.png')),[list(range(4)),list(range(4,8)),list(range(8,12))])
  scale=172/poses[7].height
  frames=[]
  for i,im in poses.items():
   a=np.asarray(im)[:,:,3]>100
   # Pelvis registration stays stable as the knees unfold. The feet define the
   # shared ground plane; no per-frame enlargement or perspective scaling.
   lo,hi=(int(im.height*.5),int(im.height*.65))
   _,xs=np.nonzero(a[lo:hi]);anchor=float(np.median(xs))
   f=Image.new('RGBA',(288,236));sprite=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
   f.alpha_composite(sprite,(round(144-anchor*scale),230-sprite.height));frames.append(f)
   (seated if i<4 else standing).append(f)
  sheet=atlas(frames,4,REVIEW/f'{name}-2x.png')
  sheet.resize((sheet.width//2,sheet.height//2),Image.Resampling.NEAREST).save(REVIEW/f'{name}-native.png')
 atlas(seated,4,OUT/'office_life.png');atlas(standing,8,OUT/'office_stand.png')
 chair=Image.open(SOURCE/'chair.png').convert('RGBA');chair=chair.crop(chair.getbbox())
 scale=100/chair.height;chair=chair.resize((round(chair.width*scale),100),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(128,112));canvas.alpha_composite(chair,((128-chair.width)//2,108-chair.height));canvas.save(OUT/'office_chair.png',optimize=True)

if __name__=='__main__':backgrounds();actors()
