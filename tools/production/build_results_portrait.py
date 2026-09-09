"""Separate results frame, foreground badge and registered cigar performance."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/ui';OUT=ROOT/'assets/ui'
def defringe(im):
 """Replace matte-contaminated edge RGB with adjacent interior ink, preserving alpha."""
 a=np.array(im);solid=a[:,:,3]>0
 inside=np.array(Image.fromarray(solid.astype('uint8')*255).filter(ImageFilter.MinFilter(5)))>0
 edge=solid&~inside&(a[:,:,:3].min(2)>45)&(a[:,:,:3].max(2)>130)
 original=a.copy();h,w=solid.shape
 for dy,dx in sorted([(y,x) for y in range(-3,4) for x in range(-3,4)],key=lambda p:p[0]**2+p[1]**2):
  if not (dy or dx):continue
  sy=slice(max(0,-dy),min(h,h-dy));sx=slice(max(0,-dx),min(w,w-dx))
  ny=slice(max(0,dy),min(h,h+dy));nx=slice(max(0,dx),min(w,w+dx))
  pick=edge[sy,sx]&inside[ny,nx]
  a[sy,sx,:3][pick]=original[ny,nx,:3][pick];edge[sy,sx][pick]=False
 # Thin neutral matte wisps have no nearby interior; they are not hair or ink.
 a[edge&(a[:,:,:3].max(2).astype(int)-a[:,:,:3].min(2)<65)]=0
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
def main():
 bg=Image.open(SRC/'results_empty.png').convert('RGBA').resize((960,540),Image.Resampling.LANCZOS)
 bg.save(OUT/'results_card.png')
 foreground=Image.new('L',bg.size)
 d=ImageDraw.Draw(foreground)
 d.polygon([(0,371),(18,379),(28,368),(45,359),(54,348),(88,351),(98,346),(123,341),(147,343),(176,352),(188,348),(199,365),(211,375),(235,392),(229,437),(207,477),(215,508),(225,540),(0,540)],fill=255)
 rgb=np.array(bg)[:,:,:3].astype(float);r,g,b=rgb.transpose(2,0,1)
 colors=((r>80)&(r>g*1.1)&(g>b*1.4))|((r>50)&(r>g*1.8)&(r>b*1.8))
 mask=np.array(foreground)>0
 yy,xx=np.indices(mask.shape);face=((xx-128)/68)**2+((yy-414)/68)**2<=1
 foreground=Image.fromarray(((mask&colors)|face).astype('uint8')*255)
 fg=bg.copy();fg.putalpha(foreground);fg.save(OUT/'results_badge.png')
 fold=Image.open(SRC/'results_fold.png').convert('RGBA')
 breathe=Image.open(SRC/'results_portrait.png').convert('RGBA');cells=[]
 for im,i in [(fold,i) for i in range(8)]+[(breathe,i) for i in range(4,8)]:
  # Some elbows extend beyond the nominal cell. Preserve the full silhouette,
  # then discard disconnected fragments from the neighbouring cell.
  c=im.crop((i%4*384,i//4*512,i%4*384+432,i//4*512+512));a=np.array(c);rgb=a[:,:,:3].astype(int)
  mask=(rgb.min(2)>65)&(rgb.max(2)-rgb.min(2)<45)
  flood=Image.fromarray(mask.astype('uint8')*255).copy()
  for point in [(x,0) for x in range(432)]+[(x,511) for x in range(432)]+[(0,y) for y in range(512)]+[(431,y) for y in range(512)]:
   if flood.getpixel(point)==255:ImageDraw.floodfill(flood,point,128)
  # Raised forearms enclose the checker matte. Remove those large islands,
  # while retaining the small neutral highlights inside the hair and glasses.
  for yy,xx in zip(*np.where(np.array(flood)==255)):
   if flood.getpixel((int(xx),int(yy)))!=255:continue
   ImageDraw.floodfill(flood,(int(xx),int(yy)),64)
   component=np.array(flood)==64
   if component.sum()>=512:a[component]=0
   stamped=np.array(flood);stamped[component]=32;flood=Image.fromarray(stamped).copy()
  a[np.array(flood)==128]=0
  body=Image.fromarray((a[:,:,3]>0).astype('uint8')*255).copy()
  ImageDraw.floodfill(body,(180,300),128)
  a[np.array(body)!=128]=0
  cells.append(defringe(Image.fromarray(a)))
 # Register all heads to pose 0 using the shared hair shape, never normalize bodies.
 ref=np.array(cells[0])
 template=ref[75:125:2,140:260:2,:3].astype(float);valid=ref[75:125:2,140:260:2,3]>128
 shifts=[];out=Image.new('RGBA',(346*4,410*3))
 for i,c in enumerate(cells):
  a=np.array(c);best=(float('inf'),0,0)
  for dy in range(-44,13):
   for dx in range(-20,21):
    region=a[75+dy:125+dy:2,140+dx:260+dx:2,:3].astype(float)
    score=np.abs(region-template)[valid].mean()
    if score<best[0]:best=(score,dx,dy)
  _,dx,dy=best;shifts.append([dx,dy])
  f=Image.new('RGBA',(432,512));f.alpha_composite(c,(-dx,10-dy))
  # Prepare at the actual 2x canvas size instead of nearest-neighbour minification.
  f=f.resize((346,410),Image.Resampling.LANCZOS)
  clean=np.array(f);clean[clean[:,:,3]<12]=0;f=Image.fromarray(clean)
  out.alpha_composite(f,(i%4*346,i//4*410))
 out.save(OUT/'results_portrait.png')
 (ROOT/'tmp/review').mkdir(exist_ok=True)
 (ROOT/'tmp/review/results-registration.json').write_text(json.dumps(shifts))
 print('Head registration:',shifts)
if __name__=='__main__':main()
