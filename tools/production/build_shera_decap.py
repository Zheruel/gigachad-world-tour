"""Register whole GPT-edited headless Shera poses and the matching detached head."""
from pathlib import Path
import sys,json,fcntl
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/night_train/neta/shera'
# Original body extents, excluding the removed head; never scale the torso into the empty head space.
BOUNDS={5:(165,232,387,402),6:(166,226,405,402),7:(158,233,429,402),8:(154,297,410,402),9:(148,307,405,402),10:(142,299,409,402)}
def main():
 folder=ROOT/'assets/frames/nr_neta_guard';generated={};sheet=Image.new('RGBA',(552*3,430*4),(28,24,24,255));d=ImageDraw.Draw(sheet)
 for j,(i,box) in enumerate(BOUNDS.items()):
  base=Image.open(folder/f'fin_{i:02}.png').convert('RGBA');im=alpha(Image.open(SOURCE/f'decap-body-{i}-v1.png').convert('RGBA'),128);im=im.crop(im.getbbox())
  im=edges(alpha(im.resize((box[2]-box[0],box[3]-box[1]),Image.Resampling.LANCZOS),128))
  result=Image.new('RGBA',base.size);result.alpha_composite(im,box[:2]);dest=folder/f'decap_{i:02}.png';result.save(dest);generated[i]=str(dest.relative_to(ROOT/'assets/frames'))
  x=j%3*552;y=j//3*860;sheet.alpha_composite(base,(x,y));sheet.alpha_composite(result,(x,y+430));d.text((x+8,y+8),f'{i}: original / headless edit',fill='white')
 head=alpha(Image.open(SOURCE/'decap-head-v1.png').convert('RGBA'),128);head=head.crop(head.getbbox());k=50/head.height;head=edges(alpha(head.resize((round(head.width*k),50),Image.Resampling.LANCZOS),128))
 cell=Image.new('RGBA',(96,96));cell.alpha_composite(head,((96-head.width)//2,(96-head.height)//2));dest=ROOT/'assets/stages/night_train/neta/shera/severed_head.png';dest.parent.mkdir(parents=True,exist_ok=True);cell.save(dest)
 manifest=ROOT/'assets/frames/manifest.json'
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);m=json.loads(manifest.read_text());m['nr_neta_guard']['rage_decap']=[generated.get(i,f'nr_neta_guard/fin_{i:02}.png') for i in range(11)];manifest.write_text(json.dumps(m,indent=2)+'\n')
 out=ROOT/'tmp/review/shera-decap';out.mkdir(parents=True,exist_ok=True);sheet.save(out/'identity-sheet.png');print('Registered six headless reactions + one matching head; original body extents retained.')
if __name__=='__main__':main()
