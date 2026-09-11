"""Register selected GPT Image performances at gameplay anatomical scale."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageFilter
from build_combat_variety import clean,save_frames,review,largest_component
from sprite_palette import match_chad_skin
ROOT=Path(__file__).resolve().parents[2]
def extract(path,rows):
 im=Image.open(path).convert('RGBA');out=[]
 for i in range(rows*4):
  p=im.crop((max(0,round(i%4*im.width/4)-65),max(0,round(i//4*im.height/rows)-55),min(im.width,round((i%4+1)*im.width/4)+65),min(im.height,round((i//4+1)*im.height/rows)+55)))
  a=np.array(p);r,g,b=[a[:,:,j].astype(int) for j in range(3)]
  # Saturated red extraction pixels lie outside the warm orange skin gamut.
  red=(r>230)&(g<35)&(b<35)
  a[red]=0;p=clean(Image.fromarray(a));a=np.array(p);a[~largest_component(a[:,:,3]>24)]=0;p=Image.fromarray(a);p=p.crop(p.getbbox());out.append(p)
 return out

def build(m,path,rows,key,state,refheight):
 # Gameplay crown/head/upper-arm comparison: super sources were registered
 # to standing height despite a wide crouched stance, inflating anatomy by 24%.
 poses=extract(path,rows);scale=(148 if key=='player' else 184)/refheight;frames=[]
 for p in poses:
  # One measured scale per sheet; raised fists and crouches never set body scale.
  a=np.array(p);boot=(a[:,:,3]>80)&(np.indices(a.shape[:2])[0]>p.height-14)
  yy,xx=np.where(boot);anchor=float(np.median(xx)) if len(xx) else p.width/2
  p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
  f=Image.new('RGBA',(320,272));f.alpha_composite(p,(round(160-anchor*scale),265-p.height));frames.append(match_chad_skin(clean(f)) if key=='player' else clean(f))
 save_frames(m,key,state,frames,key+'/'+state);review(state,frames)

def main():
 path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text())
 chad=ROOT/'assets/sources/production/characters/chad/signature_supers'
 build(m,chad/'barrage.png',4,'player','super_barrage',290)
 build(m,chad/'electric.png',3,'player','super_electric',320)
 build(m,chad/'heihachi_finish.png',2,'player','electric_finish',370)
 base=m['player']['super_electric'][:6];m['player']['super_electric']=base+m['player']['electric_finish']
 fx=Image.open(chad/'electric_fx.png').convert('RGBA');sheet=Image.new('RGBA',(512,256))
 for i in range(8):
  frame=fx.crop((round(i%4*fx.width/4),round(i//4*fx.height/2),round((i%4+1)*fx.width/4),round((i//4+1)*fx.height/2)))
  frame.thumbnail((128,128),Image.Resampling.LANCZOS);sheet.alpha_composite(frame,(i%4*128+(128-frame.width)//2,i//4*128+(128-frame.height)//2))
 sheet.save(ROOT/'assets/fx/electric_impact.png')
 build(m,ROOT/'assets/sources/production/stages/night_train/rebuild/conductor_step_attacks.png',3,'nr_conductor','step_attacks',290)
 build(m,ROOT/'assets/sources/production/stages/night_train/rebuild/conductor_luggage_motion.png',3,'nr_conductor','luggage_motion',365)
 build(m,ROOT/'assets/sources/production/stages/night_train/rebuild/super_victim.png',2,'nr_tough','super_reaction',370)
 path.write_text(json.dumps(m,indent=2)+'\n')

if __name__=='__main__':main()
