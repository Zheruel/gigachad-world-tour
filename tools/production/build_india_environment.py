#!/usr/bin/env python3
"""Register the selected eight-frame horizontal steam generation, no redraws."""
from pathlib import Path
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'assets/sources/production/stages/dirty_delhi/rebuild/steam.png'
image=Image.open(source).convert('RGBA')
a=np.asarray(image).copy()
r,g,b=(a[:,:,i].astype('int16') for i in range(3))
# The generated alpha carries a few saturated red/yellow matte marker pixels.
# Remove only those flat marker colors, retaining authored translucent grey curls.
markers=((r>220)&(g<85)&(b<85))|((r>205)&(g>205)&(b<85))
a[markers]=0
a[a[:,:,3]<8]=0
a[a[:,:,3]==0,:3]=0
image=Image.fromarray(a)
cellw,cellh=image.width//4,image.height//2
sheet=Image.new('RGBA',(4*192,2*112))
for frame in range(8):
    cell=image.crop(((frame%4)*cellw,(frame//4)*cellh,(frame%4+1)*cellw,(frame//4+1)*cellh))
    box=cell.getbbox()
    if not box:raise ValueError(f'Empty steam frame {frame}')
    # One scale throughout: short hiss frames must stay shorter than full jets.
    crop=cell.crop(box);scale=.34
    crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
    # All eight leading nozzles share the left anchor; plume height grows naturally.
    sheet.alpha_composite(crop,((frame%4)*192+4,(frame//4)*112+56-crop.height//2))
out=ROOT/'assets/stages/india/props/steam.png';out.parent.mkdir(parents=True,exist_ok=True);sheet.save(out)
review=ROOT/'tmp/review/india-environment';review.mkdir(parents=True,exist_ok=True)
back=Image.new('RGBA',sheet.size,'#272521');back.alpha_composite(sheet);back.convert('RGB').save(review/'steam-2x.png')
back.resize((384,112),Image.Resampling.NEAREST).convert('RGB').save(review/'steam-native.png')
print(out.relative_to(ROOT))
