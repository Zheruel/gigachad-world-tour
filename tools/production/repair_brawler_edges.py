"""Final edge pass for purple-shirt brawlers, including dark neutral matte.
Source snapshots make repeated runs identical. Preserve alpha and interior ink.
Run after the broader repair_sprite_edges.py pass.
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np,shutil,json
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/edge_cleanup_brawler';S.mkdir(parents=True,exist_ok=True)
m=json.loads((R/'assets/frames/manifest.json').read_text());files=sorted({p for v in m['ic_brawler'].values() for p in v});changes=[]
for rel in files:
 p=R/'assets/frames'/rel;src=S/p.name
 if not src.exists():shutil.copy2(p,src)
 im=Image.open(src).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(float);al=a[:,:,3]
 inner=np.array(Image.fromarray(al).filter(ImageFilter.MinFilter(5)))>200
 edge=(al>0)&~inner;h,w=al.shape;count=np.zeros(al.shape);total=np.zeros_like(rgb)
 for dy,dx in [(y,x) for y in range(-5,6) for x in range(-5,6) if x*x+y*y<=26 and (x or y)]:
  sy=slice(max(0,-dy),min(h,h-dy));sx=slice(max(0,-dx),min(w,w-dx));ny=slice(max(0,dy),min(h,h+dy));nx=slice(max(0,dx),min(w,w+dx))
  v=inner[ny,nx];total[sy,sx]+=rgb[ny,nx]*v[:,:,None];count[sy,sx]+=v
 avg=total/np.maximum(count[:,:,None],1)
 dirty=edge&(count>0)&(np.ptp(rgb,axis=2)<42)&(rgb.min(2)>48)&(rgb.mean(2)>avg.mean(2)+14)
 a[dirty,:3]=avg[dirty].astype('uint8');Image.fromarray(a).save(p);changes.append([rel,int(dirty.sum())]);assert np.array_equal(al,a[:,:,3])
print('Reviewed/processed',len(files),'brawler poses;',sum(n for p,n in changes),'neutral fringe pixels corrected; alpha preserved.')
