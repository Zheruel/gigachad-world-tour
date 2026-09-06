"""Extract and register the selected full-body hatch climb performance."""
from pathlib import Path
import numpy as np
from PIL import Image
from build_boxing_rush import largest_component

ROOT=Path(__file__).resolve().parents[2]
def main():
    source=Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/seth_roof_climb.png').convert('RGBA')
    sheet=Image.new('RGBA',(320*8,240))
    preview=Image.new('RGBA',(320*4,240*2),(30,27,35,255))
    # All frames share a .45 source scale: no standing-height normalization of bent poses.
    centers=[200,590,972,1295,217,602,961,1260]
    for i in range(8):
        col,row=i%4,i//4
        pose=source.crop((col*384,row*512,(col+1)*384,(row+1)*512))
        a=np.asarray(pose).copy();rgb=a[:,:,:3].astype(int)
        bg=(rgb.min(2)>218)&(rgb.max(2)-rgb.min(2)<22)
        a[bg,3]=0;a[~largest_component(a[:,:,3]>20),3]=0
        pose=Image.fromarray(a);bb=pose.getbbox()
        scale=.45
        frame=Image.new('RGBA',(320,240))
        small=pose.resize((173,230),Image.Resampling.LANCZOS)
        frame.alpha_composite(small,(round(160-(centers[i]-col*384)*scale),round(233-bb[3]*scale)))
        sheet.alpha_composite(frame,(i*320,0));preview.alpha_composite(frame,(col*320,row*240))
    sheet.save(ROOT/'assets/stages/night_train/rebuild/seth_roof_climb.png')
    out=ROOT/'tmp/review/seth_climb';out.mkdir(parents=True,exist_ok=True)
    preview.save(out/'poses-2x.png');preview.resize((640,240),Image.Resampling.NEAREST).save(out/'poses-native.png')
if __name__=='__main__':main()
