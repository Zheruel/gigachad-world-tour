"""Preserve window apertures and register separate office furniture."""
from PIL import Image, ImageFilter
import numpy as np
from build_train_rebuild import SOURCE,OUT,keyed

def main():
 original=Image.open(OUT/'office.png').convert('RGBA')
 im=Image.open(SOURCE/'office_clear.png').convert('RGBA').resize((960,540),Image.Resampling.NEAREST)
 im.putalpha(original.getchannel('A'));im.save(OUT/'office.png')
 desk=keyed(Image.open(SOURCE/'office_desk.png')).convert('RGBA');desk=desk.crop(desk.getbbox())
 a=np.array(desk);rgb=a[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
 # Restrict despill to the extracted silhouette; the green banker lamp stays green.
 edge=np.array(Image.fromarray((a[:,:,3]==0).astype('uint8')*255).filter(ImageFilter.MaxFilter(9)))>0
 spill=edge&(g>np.maximum(r,b)+22)&(g>70)
 a[spill,3]=0
 fringe=edge&(a[:,:,3]>0)&(g>np.maximum(r,b)+8)
 a[fringe,1]=np.maximum(r,b)[fringe].astype('uint8')
 a[a[:,:,3]==0,:3]=0
 desk=Image.fromarray(a);desk.save(OUT/'office_desk.png')
 chair=Image.open(SOURCE/'office_chair.png').convert('RGBA');chair.crop(chair.getbbox()).save(OUT/'office_chair.png')
if __name__=='__main__':main()
