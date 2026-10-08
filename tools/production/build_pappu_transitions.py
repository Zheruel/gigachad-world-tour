"""Register chilli eating and the defeat fake-out at approved normal-body scale."""
from PIL import Image
from pathlib import Path
import json,fcntl,sys,argparse
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_demon import body,strip,ROOT,SRC,OUT
from sprite_edges import alpha,edges

def main():
 parser=argparse.ArgumentParser();parser.add_argument("--families",nargs="+");args=parser.parse_args();updates={}
 for name,state,n in [('chilli-feast','chilli_feast',5),('fakeout-crawl','fakeout_crawl',8),('feast-rise','feast_rise',4),('meal-lift','meal_lift',3)]:
  if args.families and state not in args.families:continue
  if not (SRC/(name+'-v1.png')).exists():continue
  version=next(v for v in ['v4','v3','v2','v1']if(SRC/(name+'-'+v+'.png')).exists());poses=strip(name,n,version);k=204/poses[-1 if state=='feast_rise' else 1 if state=='meal_lift' else 0].height;paths=[]
  for i,im in enumerate(poses):
   out=body(im,k,not(state=='fakeout_crawl' and 3<=i<=6))
   if state=='feast_rise' or state=='fakeout_crawl' and i==6:
    # Keep reaching fingertips on one track through the kneel-to-stand handoff.
    dx=368-out.getbbox()[2];aligned=Image.new('RGBA',out.size);aligned.alpha_composite(out,(dx,0));out=aligned
   p=OUT/f'{state}_{i:02}.png';out.save(p);paths.append(str(p.relative_to(ROOT/'assets/frames')))
  updates[state]=paths
 for name,state,n,height in [('feast-growth','feast_growth',5,204),('feast-smash','feast_smash',6,246),('furnace-pickup','weapon_pickup',5,246)]:
  if args.families and state not in args.families:continue
  if not(SRC/(name+'-v1.png')).exists():continue
  version=next(v for v in ['v4','v3','v2','v1']if(SRC/(name+'-'+v+'.png')).exists());poses=strip(name,n,version);k=height/poses[0].height;paths=[]
  for i,im in enumerate(poses[1:]):
   p=OUT/f'{state}_{i:02}.png';body(im,k).save(p);paths.append(str(p.relative_to(ROOT/'assets/frames')))
  updates[state]=paths
 if not args.families and (SRC/'floor-skimmer-v1.png').exists():
  im=alpha(Image.open(SRC/'floor-skimmer-v1.png').convert('RGBA'),128);im=im.crop(im.getbbox());im=edges(alpha(im.resize((140,max(1,round(140*im.height/im.width))),Image.Resampling.LANCZOS),128));im.save(ROOT/'assets/stages/dirty_delhi/vendor/floor_skimmer.png')
 with open(ROOT/'assets/frames/.manifest.lock','a')as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor'].update(updates);p.write_text(json.dumps(m,indent=2)+'\n')
 print({k:len(v)for k,v in updates.items()})
if __name__=='__main__':main()
