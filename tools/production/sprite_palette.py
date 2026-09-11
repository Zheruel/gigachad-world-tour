"""Match generated super skin ink to CHAD's established gameplay palette.
Preserves alpha, registration, shading variation and non-skin materials.
"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
def skin(a):
 rgb=a[:,:,:3].astype(float);r,g,b=rgb.transpose(2,0,1)
 return (a[:,:,3]>24)&(r>85)&(g>38)&(r>g*1.12)&(g>b*1.4)&((g-b)/np.maximum(r-b,1)<.72)
def match_chad_skin(im):
 ref=np.array(Image.open(ROOT/'assets/frames/chad_sidle1.png').convert('RGBA'));q=ref[:,:,:3].astype(float)[skin(ref)]
 ratios=np.median(q[:,1:]/np.maximum(q[:,:1],1),axis=0)
 a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(float);m=skin(a);v=rgb[m];r=np.maximum(v[:,0],1)
 old=v[:,1:]/r[:,None];ratio=old*.2+ratios*.8
 lum=v@np.array([.2126,.7152,.0722]);newr=lum/(.2126+.7152*ratio[:,0]+.0722*ratio[:,1])
 a[m,:3]=np.clip(np.column_stack([newr,newr[:,None]*ratio]),0,255).astype('uint8')
 return Image.fromarray(a)
