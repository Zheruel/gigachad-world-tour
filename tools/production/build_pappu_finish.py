"""Register whole-body Pappu finisher edits at a shared anatomical scale."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image,ImageDraw
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_polish import strip
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'assets/frames/ic_vendor'

def main():
 poses=[];report=[]
 for name,selected in [('finish-reactions',range(4)),('finish-flight',range(1,4)),('finish-corpse',range(1,4)),('finish-compress',range(1,4))]:
  ims=strip(name,4,'v3'); k=280/ims[0].width if name=='finish-compress' else 246/ims[0].height
  for source_index in selected:
   im=ims[source_index];im=edges(alpha(im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS),128))
   yy,xx=np.nonzero(np.array(im.getchannel('A'))>127);cx=float(xx.mean());cy=float(yy.mean())
   at=(round(280-cx),432-im.height);o=Image.new('RGBA',(560,440));o.alpha_composite(im,at)
   n=len(poses);p=OUT/f'demon_finish3_{n:02}.png';o.save(p);poses.append(str(p.relative_to(ROOT/'assets/frames')))
   report.append({'i':n,'source':name,'source_index':source_index,'bbox':o.getbbox(),'com':[round((at[0]+cx-280)/2,2),round((at[1]+cy-432)/2,2)]})
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor']['demon_finish3']=poses;p.write_text(json.dumps(m,indent=2)+'\n')
 review=ROOT/'tmp/review/pappu-finisher-v3';review.mkdir(parents=True,exist_ok=True);(review/'registration.json').write_text(json.dumps(report,indent=2))
 sheet=Image.new('RGB',(280*5,242*3),'#282a30');d=ImageDraw.Draw(sheet)
 for i,path in enumerate(poses):
  im=Image.open(ROOT/'assets/frames'/path).resize((280,220),Image.Resampling.NEAREST);x=i%5*280;y=i//5*242;sheet.paste(im,(x,y+22),im);d.text((x+5,y+5),str(i),fill='white')
 sheet.save(review/'registered.png');print(json.dumps(report))
if __name__=='__main__':main()
