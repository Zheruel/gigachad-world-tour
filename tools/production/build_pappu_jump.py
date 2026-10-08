"""Register the corrected normal/chilli jump without scaling up its body for the smaller head."""
from pathlib import Path
import sys,json,fcntl
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_polish import strip,ROOT,SRC,OUT
from build_pappu_normal_registration import sole_centres
from sprite_edges import alpha,edges
from keying import components

def clean(im):
 a=np.array(alpha(im,128));part=max(components(a[:,:,3]>127),key=len)
 mask=np.zeros(a.shape[:2],bool);mask[part[:,0],part[:,1]]=True;a[~mask]=0
 out=Image.fromarray(a);return out.crop(out.getbbox())

def main():
 old=strip('flop-polish',5,'v1');poses=[clean(p) for p in strip('flop-polish',5,'v2')]
 oldk=166/old[0].height;a=sole_centres(old[0]);b=sole_centres(poses[0])
 k=oldk*(a[1]-a[0])/(b[1]-b[0]);files=[]
 for i,pose in enumerate(poses):
  im=edges(alpha(pose.resize((round(pose.width*k),round(pose.height*k)),Image.Resampling.LANCZOS),128))
  frame=Image.new('RGBA',(448,300));frame.alpha_composite(im,(224-im.width//2,292-im.height))
  path=OUT/f'flop_normal_v2_{i:02}.png';frame.save(path);files.append(str(path.relative_to(ROOT/'assets/frames')))
 changes={'flop_polish':files}
 if (SRC/'getup-polish-v1.png').exists():
  rise=[clean(p) for p in strip('getup-polish',3,'v1')]
  originals=[Image.open(OUT/f'flopup_{i:02}.png').convert('RGBA') for i in range(3)]
  k=originals[0].getbbox()[2]-originals[0].getbbox()[0];k/=rise[0].width
  paths=[]
  for i,pose in enumerate(rise):
   im=edges(alpha(pose.resize((round(pose.width*k),round(pose.height*k)),Image.Resampling.LANCZOS),128))
   box=originals[i].getbbox();frame=Image.new('RGBA',originals[i].size);frame.alpha_composite(im,(round((box[0]+box[2]-im.width)/2),box[3]-im.height))
   path=OUT/f'flopup_normal_v2_{i:02}.png';frame.save(path);paths.append(str(path.relative_to(ROOT/'assets/frames')))
  changes['flopup']=paths
 with open(ROOT/'assets/frames/.manifest.lock','a')as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text());m['ic_vendor'].update(changes);path.write_text(json.dumps(m,indent=2)+'\n')
 print({key:len(value) for key,value in changes.items()})
if __name__=='__main__':main()
