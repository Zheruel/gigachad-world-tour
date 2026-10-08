"""Register final-form attacks independently from normal combat families."""
from pathlib import Path
import json,fcntl,sys
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_demon import body,strip,ROOT,SRC,OUT

def main():
 updates={}
 for name,state,n in [('furnace-forearm','demon_forearm',6),('furnace-cleaver','demon_cleaver',7),('furnace-stagger','demon_stagger_polish',4)]:
  version=next(v for v in ['v3','v2','v1']if(SRC/(name+'-'+v+'.png')).exists());poses=strip(name,n,version);k=246/poses[0].height;paths=[]
  for i,im in enumerate(poses):
   p=OUT/f'{state}_{i:02}.png';body(im,k).save(p);paths.append(str(p.relative_to(ROOT/'assets/frames')))
  updates[state]=paths
 with open(ROOT/'assets/frames/.manifest.lock','a')as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor'].update(updates);p.write_text(json.dumps(m,indent=2)+'\n')
 print({k:len(v)for k,v in updates.items()})
if __name__=='__main__':main()
