"""Extract selected gold victory wordmark and rank letters."""
from pathlib import Path
from PIL import Image
import numpy as np
from build_results_portrait import defringe
ROOT=Path(__file__).resolve().parents[2]
def main():
 im=Image.open(ROOT/'assets/sources/production/ui/results_lettering.png').convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
 # Remove the neutral checker matte; warm gold and near-black extrusion remain.
 neutral=(rgb.max(2)-rgb.min(2)<22)&(rgb.min(2)>75)
 a[neutral,3]=0;a[a[:,:,3]==0,:3]=0;im=Image.fromarray(a)
 out=ROOT/'assets/ui/headings';out.mkdir(exist_ok=True)
 pieces=[('chad-wins',im.crop((0,0,im.width,round(im.height*.52))))]
 for i,rank in enumerate('sabc'):pieces.append(('rank-'+rank,im.crop((i*im.width//4,round(im.height*.52),(i+1)*im.width//4,im.height))))
 for name,c in pieces:
  c=defringe(c.crop(c.getbbox()))
  # Center the readable gold face, excluding the dark extrusion below/right.
  a=np.array(c);r,g,b=a[:,:,:3].astype(float).transpose(2,0,1)
  face=(a[:,:,3]>128)&(r>90)&(g>70)&(r>b*1.6)&(g>b*1.5)
  yy,xx=np.where(face);cx=(xx.min()+xx.max()+1)/2;cy=(yy.min()+yy.max()+1)/2
  w=int(np.ceil(2*max(cx,c.width-cx)));h=int(np.ceil(2*max(cy,c.height-cy)))
  padded=Image.new('RGBA',(w,h));padded.alpha_composite(c,(round(w/2-cx),round(h/2-cy)))
  target_h,target_w=(44,660) if name=='chad-wins' else (60,64)
  scale=min(target_w/w,target_h/h)
  padded=padded.resize((round(w*scale),round(h*scale)),Image.Resampling.LANCZOS)
  padded.save(out/(name+'.png'),optimize=True)
  print(name,padded.size,'gold face',round(cx,1),round(cy,1))
if __name__=='__main__':main()
