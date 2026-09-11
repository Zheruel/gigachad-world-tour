from pathlib import Path
from PIL import Image,ImageFilter,ImageDraw
import numpy as np,json
R=Path(__file__).resolve().parents[2];rows=[]
(R/'tmp/review/edge-audit').mkdir(parents=True,exist_ok=True)
for p in (R/'assets').rglob('*.png'):
 if 'sources' in p.parts:continue
 im=Image.open(p).convert('RGBA');a=np.array(im);al=a[:,:,3];rgb=a[:,:,:3].astype(float)
 if al.min()==255:continue
 inner=np.array(Image.fromarray(al).filter(ImageFilter.MinFilter(5)))>220
 edge=(al>24)&~inner;count=np.zeros(al.shape);total=np.zeros_like(rgb)
 for dy,dx in [(0,2),(0,-2),(2,0),(-2,0),(2,2),(-2,-2),(2,-2),(-2,2)]:
  v=np.roll(inner,(dy,dx),(0,1));total+=np.roll(rgb,(dy,dx),(0,1))*v[:,:,None];count+=v
 avg=total/np.maximum(count[:,:,None],1)
 neutral=(np.ptp(rgb,axis=2)<28)&(rgb.min(2)>155)&(rgb.mean(2)>avg.mean(2)+55)
 purple=(rgb[:,:,0]>120)&(rgb[:,:,2]>100)&(rgb[:,:,1]<rgb[:,:,0]*.65)&(rgb[:,:,1]<rgb[:,:,2]*.7)
 dirty=edge&(count>0)&(neutral|purple)
 n=int(dirty.sum())
 if n>12:rows.append({'path':str(p.relative_to(R)),'pixels':n,'edge':int(edge.sum()),'ratio':round(n/max(1,edge.sum()),3)})
rows.sort(key=lambda r:r['pixels'],reverse=True)
(R/'tmp/review/edge-audit/candidates.json').write_text(json.dumps(rows,indent=2));print(f'Audited transparent runtime PNGs; {len(rows)} candidates require visual review. Report: tmp/review/edge-audit/candidates.json')
