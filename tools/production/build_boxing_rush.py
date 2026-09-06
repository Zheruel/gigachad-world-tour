"""Register the selected boxing performance at shared CHAD gameplay scale."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw
from collections import deque

def largest_component(mask):
    remaining=mask.copy();best=[]
    for y,x in zip(*np.where(mask)):
        if not remaining[y,x]:continue
        q=deque([(y,x)]);remaining[y,x]=False;pixels=[]
        while q:
            yy,xx=q.popleft();pixels.append((yy,xx))
            for dy,dx in ((1,0),(-1,0),(0,1),(0,-1)):
                ny,nx=yy+dy,xx+dx
                if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and remaining[ny,nx]:
                    remaining[ny,nx]=False;q.append((ny,nx))
        if len(pixels)>len(best):best=pixels
    keep=np.zeros(mask.shape,dtype=bool)
    for y,x in best:keep[y,x]=True
    return keep

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/characters/chad/boxing_rush.png'
# Authored crop, planted-foot center. Uniform scale preserves crouches and raised fists.
POSES = [
    (0,0,295,408,133),(300,0,610,408,459),(610,0,1000,408,765),(1000,0,1226,408,1098),
    (0,430,295,814,147),(300,430,640,790,451),(640,415,1000,813,767),(1000,430,1226,820,1095),
    (0,943,295,1270,148),(320,789,620,1270,467),(640,850,940,1270,765),(960,850,1226,1270,1096),
]

def main():
    source = Image.open(SOURCE).convert('RGBA')
    paths = []
    preview = Image.new('RGBA',(256*4,248*3),(28,25,33,255))
    for i,(x0,y0,x1,y1,pivot) in enumerate(POSES):
        pose=source.crop((x0,y0,x1,y1))
        data=np.array(pose)
        # Generated transparent edge has isolated red chroma specks; preserve skin.
        # Do not classify warm shaded skin as edge chroma.
        red=(data[:,:,0]>180)&(data[:,:,1]<35)&(data[:,:,2]<35)
        data[red,3]=0
        data[~largest_component(data[:,:,3]>24),3]=0
        pose=Image.fromarray(data)
        bounds=pose.getbbox()
        scale=.465
        frame=Image.new('RGBA',(256,248))
        resized=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
        frame.alpha_composite(resized,(round(128-(pivot-x0)*scale),round(241-bounds[3]*scale)))
        if i==9:
            upper=Image.open(SOURCE.with_name('boxing_uppercut.png')).convert('RGBA')
            pixels=np.array(upper)
            magenta=(pixels[:,:,0]>150)&(pixels[:,:,2]>120)&(pixels[:,:,1]<100)
            pixels[magenta,3]=0
            upper=Image.fromarray(pixels)
            # Head-to-boot span matches the other 181px standing bodies.
            s=.148
            upper=upper.resize((round(upper.width*s),round(upper.height*s)),Image.Resampling.LANCZOS)
            frame=Image.new('RGBA',(256,248))
            frame.alpha_composite(upper,(round(128-480*s),round(241-1410*s)))
        file=f'chad_boxing_rush_{i:02}.png'
        frame.save(ROOT/'assets/frames'/file)
        paths.append(file)
        preview.alpha_composite(frame,((i%4)*256,(i//4)*248))
    manifest_path=ROOT/'assets/frames/manifest.json'
    manifest=json.loads(manifest_path.read_text())
    manifest['player']['boxing_rush']=paths
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    out=ROOT/'tmp/review/boxing_rush'
    out.mkdir(parents=True,exist_ok=True)
    preview.save(out/'poses-2x.png')
    preview.resize((512,372),Image.Resampling.NEAREST).save(out/'poses-native.png')

if __name__=='__main__':main()
