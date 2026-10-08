#!/usr/bin/env python3
"""Repair occupied desk backgrounds and register the office chair.

Selected GPT Image sources are retained; background repair is confined to chair silhouettes, preserving room joins.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageOps

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/rebuild/workstations'
OUT=ROOT/'assets/stages/refund_tower'
# Exact chairs in the approved main desk row, in 2x scene coordinates. The
# generated replacement is applied only here, never over a panorama boundary.
CHAIRS={
 'office':[(395,296,411),(790,297,410),(855,298,410),(1084,299,413),(1288,300,413)],
 'annex':[(295,260,374),(490,260,374),(680,263,374),(1030,259,374),(1160,260,374),(1340,260,374)],
 'calling':[(354,272,369),(438,273,369),(539,273,369),(658,272,369),(815,272,369),(978,272,369),(1087,271,369),(1208,271,369),(1290,271,369),(1420,273,369)],
 'calling_east':[(208,259,347),(298,258,347),(398,258,347),(490,258,347),(580,258,347),(660,258,347),(827,258,347),(907,258,347),(990,258,347),(1068,258,347),(1148,258,347),(1228,258,347),(1300,258,347),(1370,258,347)],
}

def backgrounds():
 OUT.mkdir(parents=True,exist_ok=True)
 for name,chairs in CHAIRS.items():
  base=Image.open(SOURCE/f'{name}_reference.png').convert('RGB')
  repaired=ImageOps.fit(Image.open(SOURCE/f'{name}_clear.png').convert('RGB'),base.size,method=Image.Resampling.LANCZOS)
  mask=Image.new('L',base.size);d=ImageDraw.Draw(mask)
  for x,top,bottom in chairs:
   d.polygon([(x-29,top-5),(x+23,top-5),(x+35,top+18),(x+49,top+41),
    (x+41,bottom-24),(x+42,bottom),(x-43,bottom),(x-41,bottom-27),(x-44,top+37)],fill=255)
  mask=mask.filter(ImageFilter.GaussianBlur(2))
  base.paste(repaired,(0,0),mask);base.save(OUT/f'{name}.png',optimize=True)

def chair():
 # The seated and rising workers themselves come from build_refund_cast.py.
 chair=Image.open(SOURCE/'chair.png').convert('RGBA');chair=chair.crop(chair.getbbox())
 scale=100/chair.height;chair=chair.resize((round(chair.width*scale),100),Image.Resampling.LANCZOS)
 canvas=Image.new('RGBA',(128,112));canvas.alpha_composite(chair,((128-chair.width)//2,108-chair.height));canvas.save(OUT/'office_chair.png',optimize=True)

if __name__=='__main__':backgrounds();chair()
