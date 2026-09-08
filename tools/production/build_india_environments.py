#!/usr/bin/env python3
"""Register selected, independently authored India panoramas at 2× game scale.

Uniform cover scaling and crop only. The height is never stretched separately;
finished actors are not processed here. Source art remains outside runtime.
"""
from pathlib import Path
from PIL import Image, ImageOps
ROOT=Path(__file__).resolve().parents[2]
PANELS={'dirty_delhi':['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon'],
        'refund_tower':['office','annex','calling','calling_east','servers','records','executive','closer']}
CROPS={}
def build():
 for stage,names in PANELS.items():
  source=ROOT/'assets/sources/production/stages'/stage/'rebuild'
  out=ROOT/'assets/stages'/stage/('rebuild' if stage=='dirty_delhi' else '')
  out.mkdir(parents=True,exist_ok=True)
  for name in names:
   path=source/f'{name}.png'
   if not path.exists():continue
   im=Image.open(path).convert('RGB')
   if (stage,name) in CROPS:im=im.crop(CROPS[stage,name])
   # Fit keeps aspect ratio; excess image width/height is deliberately cropped.
   result=ImageOps.fit(im,(1620,540),method=Image.Resampling.LANCZOS,centering=(.5,.72))
   result.save(out/f'{name}.png',optimize=True)
   print(stage,name,im.size,'->',result.size)
if __name__=='__main__':
 build()
 # Selected Delhi transition sources are part of the production recipe, not
 # optional runtime cover-ups. Always reapply them after rebuilding base art.
 from build_delhi_scenery import build as build_delhi_scenery
 build_delhi_scenery()
 from build_refund_scenery import build as build_refund_scenery
 build_refund_scenery()
