#!/usr/bin/env python3
"""Normalize selected ImageGen plates/sprites to the game's 2x art scale."""
from pathlib import Path
from collections import deque
from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/travel'
OUT = ROOT / 'assets/travel'
GROUPS = {'elevator_cabin': 'elevator', 'elevator_frame': 'elevator', 'city_towers': 'elevator', 'tower_1': 'elevator', 'tower_2': 'elevator', 'tower_3': 'elevator', 'arrival_wall': 'elevator', 'lobby': 'lobby', 'street': 'city', 'car': 'city', 'car_driver': 'city', 'apron': 'airport', 'jet': 'airport', 'jet_closed': 'airport', 'india': 'india', 'loading': 'india'}
def source_path(name): return SOURCE / GROUPS[name] / f'{name}.png'
def output_path(name):
    path = OUT / GROUPS[name] / f'{name}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    return path

def keyed(image):
    if image.mode == 'RGBA':
        return image
    # Some generations bake the transparency preview into RGB. Flood only the
    # edge-connected neutral checker; enclosed white aircraft paint is retained.
    a = np.array(image.convert('RGB'))
    eligible = (a.min(2) > 218) & (a.max(2).astype(int) - a.min(2) < 18)
    h, w = eligible.shape; seen = np.zeros((h, w), dtype=bool); q = deque()
    for x in range(w):
        for y in (0, h-1):
            if eligible[y,x]: q.append((x,y)); seen[y,x] = True
    for y in range(h):
        for x in (0, w-1):
            if eligible[y,x]: q.append((x,y)); seen[y,x] = True
    while q:
        x,y=q.popleft()
        for nx,ny in ((x-1,y),(x+1,y),(x,y-1),(x,y+1)):
            if 0 <= nx < w and 0 <= ny < h and eligible[ny,nx] and not seen[ny,nx]:
                seen[ny,nx]=True; q.append((nx,ny))
    out=image.convert('RGBA'); out.putalpha(Image.fromarray(np.where(seen,0,255).astype('uint8'))); return out

def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for name in ('street','apron','india','loading'):
        image=Image.open(source_path(name)).convert('RGB')
        if name == 'lobby':
            image=image.crop((0,140,image.width,574))
        size=(1920,540) if name == 'lobby' else (960,540)
        image=image.resize(size,Image.Resampling.LANCZOS).quantize(colors=192,dither=Image.Dither.NONE)
        image.save(output_path(name),optimize=True)
    Image.open(source_path('elevator_frame')).save(output_path('elevator_frame'), optimize=True)
    from build_lobby import main as build_lobby
    build_lobby()
    for name,width in [('car',460),('car_driver',460),('jet',1100),('jet_closed',1100)]:
        image=keyed(Image.open(source_path(name)))
        alpha=image.getchannel('A').point(lambda n:255 if n>90 else 0)
        box=alpha.getbbox(); image.putalpha(alpha); image=image.crop(box)
        size=(width,round(image.height*width/image.width))
        image=image.resize(size,Image.Resampling.LANCZOS)
        alpha=image.getchannel('A').point(lambda n:255 if n>128 else 0)
        image=image.convert('RGB').quantize(colors=64,dither=Image.Dither.NONE).convert('RGBA')
        image.putalpha(alpha); image.save(output_path(name),optimize=True)
        print(name,size)
    from build_car_wheels import main as build_car_wheels
    build_car_wheels()
if __name__=='__main__': main()
