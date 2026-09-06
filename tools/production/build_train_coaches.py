"""Preserve vista proportions, prepare connected coaches and clean actor mattes."""
import json
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter, ImageOps
from build_train_rebuild import ROOT,SOURCE,OUT,keyed,cell,register,neutral_key

def clean_edge(im):
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(float)
    alpha=Image.fromarray(a[:,:,3]);inside=np.array(alpha.filter(ImageFilter.MinFilter(5)))
    edge=(inside<128)&(a[:,:,3]>0)
    spill=np.minimum(rgb[:,:,0]-rgb[:,:,1],rgb[:,:,2]-rgb[:,:,1])
    pink=edge&(spill>12)
    rgb[:,:,0][pink]-=spill[pink];rgb[:,:,2][pink]-=spill[pink]
    a[:,:,:3]=np.clip(rgb,0,255).astype('uint8');a[a[:,:,3]<32]=0
    return Image.fromarray(a)

def main():
    for name in ['rural','industry','river']:
        im=Image.open(SOURCE/(name+'.png')).convert('RGB')
        im.resize((round(im.width*540/im.height),540),Image.Resampling.NEAREST).save(OUT/(name+'.png'))
    for name in ['ac','private','private_damaged']:
        im=ImageEnhance.Brightness(keyed(Image.open(SOURCE/(name+'.png')))).enhance(1.13)
        im.resize((1920,540),Image.Resampling.NEAREST).save(OUT/(name+'.png'))
    # The same steel thresholds connect each coach to a short open-air deck.
    im=clean_edge(keyed(Image.open(SOURCE/'gangway.png')))
    im=im.crop((0,0,im.width,round(im.height*.93)))
    cut=round(im.height*.806)
    joint=Image.new('RGBA',(176,540))
    joint.paste(im.crop((0,0,im.width,cut)).resize((176,370),Image.Resampling.NEAREST),(0,0))
    joint.paste(im.crop((0,cut,im.width,im.height)).resize((176,170),Image.Resampling.NEAREST),(0,370))
    a=np.array(joint);a[370:,:,:3]=(a[370:,:,:3]*.82).astype('uint8')
    edge=np.minimum(np.arange(176)/12,(175-np.arange(176))/12).clip(0,1)
    a[370:,:,3]=(a[370:,:,3]*edge[None,:]*np.clip((540-np.arange(370,540))/18,0,1)[:,None]).astype('uint8')
    Image.fromarray(a).save(OUT/'gangway.png')
    for name in ['pantry','office']:
        im=Image.open(SOURCE/(name+'.png'))
        im=im.crop((0,round(im.height*.063) if name=='office' else 0,im.width,round(im.height*(.974 if name=='office' else .965))))
        clean_edge(keyed(im)).resize((960,540),Image.Resampling.NEAREST).save(OUT/(name+'.png'))
    for directory in (ROOT/'assets/frames').glob('nr_*'):
        if directory.is_dir():
            for path in directory.glob('*.png'):clean_edge(Image.open(path)).save(path)

if __name__=='__main__':main()
