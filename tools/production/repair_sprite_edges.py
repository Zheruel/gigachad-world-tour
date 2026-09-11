"""Repair reviewed exterior RGB contamination, preserving every alpha/anchor pixel.
Run audit_sprite_edges.py first. Original selected pixels are retained under
production/edge_cleanup so this final processing pass is reproducible.
Never apply the detector blindly to clouds, glass, lightning or scenic lighting.
"""
from pathlib import Path
import json,shutil
import numpy as np
from PIL import Image,ImageFilter
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/edge_cleanup'
report=R/'tmp/review/edge-audit/candidates.json'
reviewed=[]
for r in json.loads(report.read_text()):
 p=r['path']
 if '/frames/' in p or any(x in p for x in ['/props/','/prop_', '/bartender_', '/passenger_seated','/passengers.png','/office_stand.png','/office_life.png','/chad_cinema.png','/roof_escape.png']):reviewed.append(p)
# Repeat from selected originals, even once the runtime detector stops flagging them.
if S.exists():reviewed+=['assets/'+str(p.relative_to(S)) for p in S.rglob('*.png')]
changed=[]
for rel in sorted(set(reviewed)):
 p=R/rel;source=S/Path(rel).relative_to('assets')
 if not source.exists():source.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,source)
 im=Image.open(source).convert('RGBA');a=np.array(im);al=a[:,:,3];rgb=a[:,:,:3].astype(float)
 inner=np.array(Image.fromarray(al).filter(ImageFilter.MinFilter(5)))>220
 edge=(al>24)&~inner;count=np.zeros(al.shape);total=np.zeros_like(rgb)
 for dy,dx in [(0,2),(0,-2),(2,0),(-2,0),(2,2),(-2,-2),(2,-2),(-2,2)]:
  v=np.roll(inner,(dy,dx),(0,1));v[:2]=False;v[-2:]=False;v[:,:2]=False;v[:,-2:]=False
  total+=np.roll(rgb,(dy,dx),(0,1))*v[:,:,None];count+=v
 avg=total/np.maximum(count[:,:,None],1)
 neutral=(np.ptp(rgb,axis=2)<28)&(rgb.min(2)>155)&(rgb.mean(2)>avg.mean(2)+55)
 purple=(rgb[:,:,0]>120)&(rgb[:,:,2]>100)&(rgb[:,:,1]<rgb[:,:,0]*.65)&(rgb[:,:,1]<rgb[:,:,2]*.7)
 dirty=edge&(count>0)&(neutral|purple)
 a[dirty,:3]=avg[dirty].astype('uint8')
 assert np.array_equal(a[:,:,3],al)
 if dirty.any():Image.fromarray(a).save(p);changed.append([rel,int(dirty.sum())])
(R/'tmp/review/edge-audit/repaired.json').write_text(json.dumps(changed,indent=2))
print(f'Repaired RGB on {len(changed)} reviewed assets; alpha, dimensions and registration unchanged.')
