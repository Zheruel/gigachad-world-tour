"""Build opaque route panorama and registered station/pantry performances."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageEnhance
from build_train_rebuild import SOURCE,OUT,crop,clean_actor,atlas

def main():
    Image.open(SOURCE/'continuous_vista.png').convert('RGB').resize((1620,540),Image.Resampling.NEAREST).save(OUT/'journey_vista.png')
    for name in ['station_tea']:
        im=Image.open(SOURCE/(name+'.png')).convert('RGBA');frames=[];cw=im.width//4
        for i in range(4):
            c=im.crop((i*cw,0,(i+1)*cw,im.height))
            # Preserve source cell positions and one common scale for the routine.
            if name=='pantry_cook':c=c.crop((0,45,cw,680));size=(192,192);scale=.27
            else:c=c.crop((0,90,cw,670));size=(256,256);scale=.40
            c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            a=np.array(c);rgb=a[:,:,:3].astype(float);rgb*=np.array([.88,.86,.91] if name=='pantry_cook' else [.96,.93,.98]);a[:,:,:3]=rgb.astype('uint8');a[a[:,:,3]==0,:3]=0;c=Image.fromarray(a)
            f=Image.new('RGBA',size);f.alpha_composite(c,((size[0]-c.width)//2,size[1]-c.height-4));frames.append(f)
        atlas(frames,OUT/(name+'.png'))
if __name__=='__main__':main()
