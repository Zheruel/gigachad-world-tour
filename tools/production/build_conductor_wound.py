"""Register GPT-edited whole conductor sprites at the native finisher extent and anchor."""
from pathlib import Path
import json,sys,fcntl
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/night_train/conductor_finish'
POSES=range(7,12)
def main():
 frames=ROOT/'assets/frames/nr_conductor';generated={}
 sheet=Image.new('RGBA',(400*5,600),(28,24,24,255));draw=ImageDraw.Draw(sheet)
 for j,i in enumerate(POSES):
  base=Image.open(frames/f'finisher_{i:02}.png').convert('RGBA');box=base.getbbox()
  art=alpha(Image.open(SOURCE/f'gore-pose-{i}-v1.png').convert('RGBA'),128);art=art.crop(art.getbbox())
  w,h=box[2]-box[0],box[3]-box[1]
  # These are full edited bodies. Only scaling and registration are performed;
  # no source body, wound overlay, or native silhouette mask is composited into them.
  art=edges(alpha(art.resize((w,h),Image.Resampling.LANCZOS),128))
  result=Image.new('RGBA',base.size);result.alpha_composite(art,box[:2])
  dest=frames/f'finisher_integrated_{i:02}.png';result.save(dest);generated[i]=str(dest.relative_to(ROOT/'assets/frames'))
  sheet.alpha_composite(base,(j*400,0));sheet.alpha_composite(result,(j*400,300));draw.text((j*400+8,8),f'{i}: original / whole GPT edit',fill='white')
 manifest=ROOT/'assets/frames/manifest.json'
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX)
  m=json.loads(manifest.read_text());m['nr_conductor']['finisher_gore']=[generated.get(i,f'nr_conductor/finisher_{i:02}.png') for i in range(12)];manifest.write_text(json.dumps(m,indent=2)+'\n')
 review=ROOT/'tmp/review/conductor-gore/integrated';review.mkdir(parents=True,exist_ok=True);sheet.save(review/'identity-sheet.png')
 print('Registered 5 full GPT-edited poses at native canvas size and body anchors.')
if __name__=='__main__':main()
