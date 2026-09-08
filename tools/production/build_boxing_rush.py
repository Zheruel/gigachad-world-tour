"""Register the selected boxing performance at shared CHAD gameplay scale."""
from pathlib import Path
import numpy as np
from PIL import Image
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
# The approved guard remains the final recovery pose. All new action poses are
# selected and registered by build_boxing_presentation.py.
def build_guard():
    source=Image.open(SOURCE).convert('RGBA').crop((0,0,295,408));data=np.array(source)
    red=(data[:,:,0]>180)&(data[:,:,1]<35)&(data[:,:,2]<35);data[red,3]=0
    data[~largest_component(data[:,:,3]>24),3]=0;pose=Image.fromarray(data);bounds=pose.getbbox();scale=.465
    f=Image.new('RGBA',(256,248));p=pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS)
    f.alpha_composite(p,(round(128-133*scale),round(241-bounds[3]*scale)));f.save(ROOT/'assets/frames/chad_boxing_rush_00.png')

def main():
    build_guard()
    from build_boxing_presentation import main as build_presentation
    build_presentation()

if __name__=='__main__':main()
