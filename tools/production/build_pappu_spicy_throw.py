"""Register the Extra spicy oil hurl: coil, overhead whip, snap release, follow-through (spicy-throw-v2, an edit of v1
that empties the basket from the release on), and the stagger-back recoil (spicy-recoil-v1, a separate single pose)."""
from pathlib import Path
import sys,json,fcntl
import numpy as np
from PIL import Image
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from build_pappu_polish import strip,ROOT,OUT,SRC
W=600 # wider than the 448 cells: the snap reaches far out; centred on the same body line (448/2 == W/2 - 76)
BACK_FOOT=146+(W-448)//2 # leftmost sole pixel of the planted back foot, as in scoop/turn
RECOIL=.385
HEIGHT=196    # the upright recoil pose stands as tall as his idle body
def back_foot(im):
 a=np.array(im.getchannel('A'))>127;rows=a[-6:];return int(np.where(rows.any(0))[0].min())
def main():
 poses=strip('spicy-throw',5,'v2');k=HEIGHT/poses[4].height;files=[]
 recoil=alpha(Image.open(SRC/'spicy-recoil-v1.png').convert('RGBA'),128);recoil=recoil.crop(recoil.getbbox())
 # The single recoil pose was drawn larger: 0.385 maps it onto the strip's figure scale (body height and sandals compared).
 for i,(p,kk) in enumerate([(q,k) for q in poses[:4]]+[(recoil,k*RECOIL)]):
  im=edges(alpha(p.resize((round(p.width*kk),round(p.height*kk)),Image.Resampling.LANCZOS),128))
  o=Image.new("RGBA",(W,300));x=BACK_FOOT-back_foot(im);o.alpha_composite(im,(max(0,min(W-im.width,x)),292-im.height))
  dest=OUT/f'spicy_throw_{i:02}.png';o.save(dest);files.append(str(dest.relative_to(ROOT/'assets/frames')))
 with open(ROOT/'assets/frames/.manifest.lock','a') as lock:
  fcntl.flock(lock,fcntl.LOCK_EX);p=ROOT/'assets/frames/manifest.json';m=json.loads(p.read_text());m['ic_vendor']['spicy_throw']=files;p.write_text(json.dumps(m,indent=2)+'\n')
 print({'frames':files,'scale':round(k,3)})
if __name__=='__main__':main()
