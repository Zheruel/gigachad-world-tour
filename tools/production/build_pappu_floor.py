"""Register the hammer and floor-inferno art against the approved grown idle."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from pappu_sheet_helpers import poses,pelvis
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu';OUT=ROOT/'assets/frames';changes={}
families=[('furnace-hammer-v2.png','demon_hammer',6,3),('furnace-floor-v1.png','demon_floor_breath',6,3)]
if (SRC/'furnace-spew-v1.png').exists():families.append(('furnace-spew-v1.png','demon_floor_spew',8,4))
for src,state,n,cols in families:
 frames=poses(src,n,cols);k=246/frames[0].height;files=[]
 for i,p in enumerate(frames):
  im=edges(alpha(p.resize((round(p.width*k),round(p.height*k)),Image.Resampling.LANCZOS),128));frame=Image.new('RGBA',(560,440));frame.alpha_composite(im,(round(280-pelvis(im)),432-im.height));path=OUT/'ic_vendor'/f'{state}_{i:02}.png';frame.save(path);files.append(str(path.relative_to(OUT)))
 changes[state]=files
 if state=='demon_floor_spew':
  mouth=[(313, 219), (348, 286), (352, 294), (339, 288), (354, 290), (346, 287), (343, 287), (358, 217)]
  logical=[[(x-280)/2,(y-432)/2] for x,y in mouth]
  (ROOT/'js/vendor_floor_registration.js').write_text('// Registered mouth positions for the validated angry exhale poses.\nexport const SPEW_MOUTH='+json.dumps(logical,separators=(',',':'))+';\n')
im=alpha(Image.open(SRC/'refuge-block-v1.png').convert('RGBA'),128);im=im.crop(im.getbbox());im=edges(alpha(im.resize((128,94),Image.Resampling.LANCZOS),128));im.save(ROOT/'assets/stages/dirty_delhi/vendor/refuge_block.png')
im=Image.open(SRC/'floor-wave-v1.png').convert('RGBA');out=Image.new('RGBA',(960,816))
for i in range(4):
 c=im.crop((0,round(i*im.height/4),im.width,round((i+1)*im.height/4)));c=alpha(c,128);c=c.crop(c.getbbox());c=alpha(c.resize((960,204),Image.Resampling.LANCZOS),128);out.alpha_composite(c,(0,i*204))
out.save(ROOT/'assets/stages/dirty_delhi/vendor/floor_wave.png')
with open(OUT/'.manifest.lock','a')as lock:
 fcntl.flock(lock,fcntl.LOCK_EX);p=OUT/'manifest.json';m=json.loads(p.read_text());m['ic_vendor'].update(changes);p.write_text(json.dumps(m,indent=2)+'\n')
print({k:len(v) for k,v in changes.items()})
