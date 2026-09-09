"""Extract selected gold victory wordmark and rank letters."""
from pathlib import Path
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
def main():
 im=Image.open(ROOT/'assets/sources/production/ui/results_lettering.png').convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
 # Remove the neutral checker matte; warm gold and near-black extrusion remain.
 neutral=(rgb.max(2)-rgb.min(2)<22)&(rgb.min(2)>75)&(rgb.max(2)<248)
 a[neutral,3]=0;a[a[:,:,3]==0,:3]=0;im=Image.fromarray(a)
 out=ROOT/'assets/ui/headings';out.mkdir(exist_ok=True)
 pieces=[('chad-wins',im.crop((0,0,im.width,round(im.height*.52))))]
 for i,rank in enumerate('sabc'):pieces.append(('rank-'+rank,im.crop((i*im.width//4,round(im.height*.52),(i+1)*im.width//4,im.height))))
 for name,c in pieces:
  c=c.crop(c.getbbox());c.thumbnail((960,240),Image.Resampling.LANCZOS);c.save(out/(name+'.png'))
if __name__=='__main__':main()
