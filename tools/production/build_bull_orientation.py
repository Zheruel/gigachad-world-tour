"""Canonical right-facing bull walk and recoil frames. Approved source pixels are mirrored only."""
from pathlib import Path
import json,fcntl
from PIL import Image,ImageOps
ROOT=Path(__file__).resolve().parents[2]
def main():
 frames=ROOT/'assets/frames';out=frames/'bull';out.mkdir(exist_ok=True)
 walk=[]
 for i in range(1,5):
  dest=out/f'walk_{i-1:02}.png';ImageOps.mirror(Image.open(frames/f'sandh_walk{i}.png')).save(dest);walk.append(str(dest.relative_to(frames)))
 dest=out/'hurt_00.png';ImageOps.mirror(Image.open(frames/'sandh_hurt1.png')).save(dest)
 with open(frames/'.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=frames/'manifest.json';m=json.loads(p.read_text());m['bull']['walk']=walk;m['bull']['hurt']=[str(dest.relative_to(frames)),'sandh_hurt2.png'];p.write_text(json.dumps(m,indent=2)+'\n')
 print('Bull walk and rearing recoil now face right, matching paw and charge art.')
if __name__=='__main__':main()
