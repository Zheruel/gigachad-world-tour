"""Register the four authored Seth recovery poses at one anatomical scale."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageFilter
from build_boxing_rush import largest_component
ROOT=Path(__file__).resolve().parents[2]
def main():
 im=Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/seth_recovery.png').convert('RGBA')
 out=Image.new('RGBA',(1280,240))
 for i in range(4):
  c=im.crop((i*im.width//4,0,(i+1)*im.width//4,im.height));a=np.array(c);rgb=a[:,:,:3].astype(int)
  edge=np.array(c.getchannel('A').filter(ImageFilter.MinFilter(7)))<128
  # Generated matte specks are saturated primary red/yellow, outside the cream suit.
  speck=edge&(rgb[:,:,0]>170)&(rgb[:,:,2]<60)&((rgb[:,:,1]<50)|(rgb[:,:,1]>190))
  a[speck,3]=0;a[a[:,:,3]<32,3]=0;a[~largest_component(a[:,:,3]>0),3]=0;a[a[:,:,3]==0,:3]=0;c=Image.fromarray(a);box=c.getbbox();c=c.crop(box)
  c=c.resize((round(c.width*.42),round(c.height*.42)),Image.Resampling.LANCZOS)
  out.alpha_composite(c,(i*320+160-c.width//2,233-c.height))
 out.save(ROOT/'assets/stages/night_train/rebuild/seth_recovery.png')
if __name__=='__main__':main()
