"""Extract registered conductor shield and commissioner low-cane attacks."""
from pathlib import Path
import json
import numpy as np
from PIL import Image
from build_boxing_rush import largest_component
ROOT=Path(__file__).resolve().parents[2]
def main():
    source=Image.open(ROOT/'assets/sources/production/stages/night_train/rebuild/boss_mechanics.png').convert('RGBA')
    manifest_path=ROOT/'assets/frames/manifest.json';manifest=json.loads(manifest_path.read_text())
    specs=[('nr_conductor','shield',(320,240),233,.44,[(0,0,512,510,310),(512,0,1024,510,760),(1024,0,1536,510,1240)]),('nr_vikram_roof','sweep',(256,224),217,.40,[(0,510,490,1024,280),(495,510,1060,1024,720),(1070,510,1536,1024,1240)])]
    preview=Image.new('RGBA',(960,480),(29,25,31,255))
    for row,(who,state,size,base,scale,boxes) in enumerate(specs):
        files=[]
        for i,(x0,y0,x1,y1,pivot) in enumerate(boxes):
            pose=source.crop((x0,y0,x1,y1));a=np.array(pose)
            a[(a[:,:,0]>150)&(a[:,:,2]>110)&(a[:,:,1]<100),3]=0
            a[~largest_component(a[:,:,3]>20),3]=0
            pose=Image.fromarray(a);bb=pose.getbbox();frame=Image.new('RGBA',size)
            frame.alpha_composite(pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS),(round(size[0]/2-(pivot-x0)*scale),round(base-bb[3]*scale)))
            file=f'{who}/{state}_{i}.png';frame.save(ROOT/'assets/frames'/file);files.append(file)
            preview.alpha_composite(frame,(i*320,row*240))
        manifest[who][state]=files
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    out=ROOT/'tmp/review/boss_mechanics';out.mkdir(parents=True,exist_ok=True)
    preview.save(out/'poses-2x.png');preview.resize((480,240),Image.Resampling.NEAREST).save(out/'poses-native.png')
if __name__=='__main__':main()
