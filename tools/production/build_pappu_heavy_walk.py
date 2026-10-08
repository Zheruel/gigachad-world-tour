"""Align candidate walk sheets for review; gameplay uses vendor_walk_motion.js."""
from pathlib import Path
from PIL import Image
import json,fcntl,sys,argparse
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_demon import grid_bodies,ROOT,SRC,OUT
from sprite_edges import alpha,edges

def skull_x(im):
 box=im.getchannel('A').crop((0,0,im.width,max(1,round(im.height*.18)))).getbbox()
 return (box[0]+box[2])/2

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--source',default='heavy-walk-v1.png');parser.add_argument('--count',type=int,default=12);parser.add_argument('--assembled',action='store_true');parser.add_argument('--register',action='store_true');args=parser.parse_args()
 source=alpha(Image.open(SRC/args.source).convert('RGBA'),128)
 poses=grid_bodies(source,args.count)
 reference=Image.open(OUT/'demon_idle3_00.png').convert('RGBA');box=reference.getbbox();ref=reference.crop(box)
 scale=ref.height/poses[0].height;head=box[0]+skull_x(ref)
 destination=OUT if args.register else ROOT/"tmp/review/pappu-walk-candidates";destination.mkdir(parents=True,exist_ok=True)
 paths=[]
 def registered(pose,k):
  im=edges(alpha(pose.resize((round(pose.width*k),round(pose.height*k)),Image.Resampling.LANCZOS),128))
  canvas=Image.new("RGBA",reference.size);canvas.alpha_composite(im,(round(head-skull_x(im)),box[3]-im.height));return canvas
 if args.assembled:
  def family(name,n):
   raw=grid_bodies(alpha(Image.open(SRC/name).convert("RGBA"),128),n);k=ref.height/raw[0].height;return [registered(p,k)for p in raw]
  key=family("joint-walk-v1.png",8);accept=family("walk-accept-v1.png",3);reach=family("walk-reach-v1.png",2);shift=family("walk-shift-v1.png",3);wrap=family("walk-wrap-v1.png",3)
  poses=[key[0],*accept,key[1],key[2],key[3],*reach,key[4],*shift,key[6],*wrap]
 for i,pose in enumerate(poses):
  # One uniform anatomical scale across the entire cycle; width never drives fitting.
  canvas=pose if args.assembled else registered(pose,scale)
  path=destination/f'heavy_walk_{i:02}.png';canvas.save(path);paths.append(str(path.relative_to(ROOT/'assets/frames')) if args.register else str(path.relative_to(ROOT)))
 if not args.register:
  print({'candidate_frames':len(paths),'output':str(destination)});return
 with open(ROOT/'assets/frames/.manifest.lock','a')as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);path=ROOT/'assets/frames/manifest.json';manifest=json.loads(path.read_text());manifest['ic_vendor']['demon_walk3']=paths;path.write_text(json.dumps(manifest,indent=2)+'\n')
 print({'demon_walk3':len(paths),'scale':scale,'headX':head})
if __name__=='__main__':main()
