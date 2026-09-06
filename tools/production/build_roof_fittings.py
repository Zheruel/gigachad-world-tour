"""Registered intact/broken roof obstacle pairs."""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
def main():
    im=Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/roof_fittings.png').convert('RGBA')
    sheet=Image.new('RGBA',(512,96))
    for i in range(4):
        pose=im.crop((i*543,0,(i+1)*543,724))
        a=np.array(pose);a[(a[:,:,0]>180)&(a[:,:,1]<35)&(a[:,:,2]<35),3]=0
        pose=Image.fromarray(a);bb=pose.getbbox();pose=pose.crop((0,bb[1],543,bb[3]))
        small=pose.resize((125,round(pose.height*.23)),Image.Resampling.LANCZOS)
        sheet.alpha_composite(small,(i*128+1,95-small.height))
    sheet.save(ROOT/'assets/stages/night_train/rebuild/roof_fittings.png')
if __name__=='__main__':main()
