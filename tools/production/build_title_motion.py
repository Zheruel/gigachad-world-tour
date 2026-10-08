#!/usr/bin/env python3
"""Register generated title portraits into reusable transparent animation strips."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
from process_char import key_green, clean_walk_fragments
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/ui/title-motion'
OUT=ROOT/'assets/ui/title-motion'

def robusto():
    # One source scale and anatomical origin throughout. Never fit each pose
    # independently to its changing silhouette. The fourth source switches hands.
    im=key_green(Image.open(SRC/'cigar-robusto.png'))
    cells=[clean_walk_fragments(im.crop((x,135,x+486,697))) for x in [0,486,970]]
    half=key_green(Image.open(SRC/'cigar-half-raised.png'))
    r=562/1005
    half=half.transform((486,562),Image.Transform.AFFINE,(1/r,0,250,0,1/r,65),Image.Resampling.BICUBIC)
    cells.append(half)
    base=cells[0]
    for f in cells[1:]:
        # Keep hair, shades and the belt/jeans literally identical across poses.
        f.paste(base.crop((0,0,486,96)),(0,0))
        f.paste(base.crop((0,380,486,562)),(0,380))
    sequence=[0,3,1,2,2,2,1,3,0,0,0,0]
    atlas=Image.new('RGBA',(4800,368));anchors=[]
    ratio=352/562
    x=round(200-240*ratio)
    tips=[(443,246),(359,124),(357,124),((925-250)*r,(332-65)*r)]
    for i,n in enumerate(sequence):
        f=cells[n].resize((round(486*ratio),352),Image.Resampling.LANCZOS)
        alpha=f.getchannel('A').point(lambda a:255 if a>=128 else 0)
        f=f.convert('RGB').quantize(colors=192,dither=Image.Dither.NONE).convert('RGBA');f.putalpha(alpha)
        atlas.alpha_composite(f,(400*i+x,8))
        tx,ty=tips[n]
        anchors.append({'mouth':[round(x+280*ratio,2),round(8+114*ratio,2)],'tip':[round(x+tx*ratio,2),round(8+ty*ratio,2)]})
    atlas.save(OUT/'chad-cigar.png',optimize=True)
    (OUT/'cigar-anchors.json').write_text(json.dumps(anchors))

def world_layers():
    world=Image.open(SRC/'poster-world.png').convert('RGB').resize((960,540),Image.Resampling.LANCZOS)
    world.quantize(colors=256,dither=Image.Dither.NONE).save(OUT/'poster-world.png',optimize=True)
    # Extract the existing brass globe as an opaque middle plane. Its silhouette
    # hides the distant panorama; only its outside is transparent.
    old=Image.open(SRC/'poster-sunset.png').convert('RGBA').resize((960,540),Image.Resampling.LANCZOS)
    mask=Image.new('L',(960,540));d=ImageDraw.Draw(mask)
    d.ellipse((314,171,665,461),fill=255)
    d.ellipse((289,333,681,351),fill=255)
    d.polygon([(480,148),(490,148),(498,171),(480,171)],fill=255)
    d.polygon([(396,450),(578,450),(595,484),(380,484)],fill=255)
    old.putalpha(mask);old.save(OUT/'world-globe.png',optimize=True)

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    world_layers()
    robusto()
if __name__=='__main__':main()
