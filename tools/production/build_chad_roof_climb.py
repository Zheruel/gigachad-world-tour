"""Register a dedicated CHAD ladder/hatch performance without body rescaling."""
from pathlib import Path
import numpy as np
from PIL import Image
from build_boxing_rush import largest_component
ROOT=Path(__file__).resolve().parents[2]
def main():
    im=Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/chad_roof_climb.png').convert('RGBA')
    sheet=Image.new('RGBA',(2560,240));preview=Image.new('RGBA',(1280,480),(30,27,35,255))
    pivots=[165,570,950,1340,145,575,970,1345]
    hands=[(267,43),(660,90),(1030,75),(1415,108),(303,730),(709,826),(1080,927),(1410,610)]
    for i in range(8):
        col,row=i%4,i//4;y0=0 if row==0 else 534;y1=534 if row==0 else 1024
        pose=im.crop((col*384,y0,(col+1)*384,y1));a=np.array(pose)
        a[(a[:,:,0]>150)&(a[:,:,2]>110)&(a[:,:,1]<100),3]=0
        a[~largest_component(a[:,:,3]>20),3]=0
        pose=Image.fromarray(a);bb=pose.getbbox();s=.425 if i<4 else .38
        dx=round(160-(pivots[i]-col*384)*s);dy=round(233-bb[3]*s)
        frame=Image.new('RGBA',(320,240));frame.alpha_composite(pose.resize((round(pose.width*s),round(pose.height*s)),Image.Resampling.LANCZOS),(dx,dy))
        sheet.alpha_composite(frame,(i*320,0));preview.alpha_composite(frame,(col*320,row*240))
        print(i,'hand',round((dx+(hands[i][0]-col*384)*s)/2,1),round((dy+(hands[i][1]-y0)*s)/2,1))
    sheet.save(ROOT/'assets/stages/night_train/rebuild/chad_roof_climb.png')
    out=ROOT/'tmp/review/chad_climb';out.mkdir(parents=True,exist_ok=True)
    preview.save(out/'poses-2x.png');preview.resize((640,240),Image.Resampling.NEAREST).save(out/'poses-native.png')
if __name__=='__main__':main()
