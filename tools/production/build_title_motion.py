#!/usr/bin/env python3
"""Register generated title portraits into reusable transparent animation strips."""
from pathlib import Path
import json
from PIL import Image, ImageDraw
from process_char import key_green, clean_walk_fragments
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/ui/title-motion'
OUT=ROOT/'assets/ui/title-motion'

def portraits(name):
    if name=='chad-cigar':
        robusto()
        return
    im=key_green(Image.open(SRC/f'{name}.png'))
    frames=[]
    for row in range(3):
        for col in range(4):
            frame=im.crop((round(col*im.width/4),round(row*im.height/3),round((col+1)*im.width/4),round((row+1)*im.height/3)))
            frame=clean_walk_fragments(frame)
            b=frame.getchannel('A').getbbox()
            assert b and b[0]>0 and b[1]>0 and b[2]<frame.width and b[3]<frame.height,(name,row,col,'clipped source',b)
            frames.append((frame,b))
    if name=='chad-cigar':
        # The generated second pose duplicates the rest pose. Reuse the authored
        # half-lowered arm in reverse to supply the missing half-raised pose.
        frames[1]=frames[6]
        frames[11]=frames[0]
        draw=key_green(Image.open(SRC/'cigar-draw.png'))
        for i in range(3):
            f=clean_walk_fragments(draw.crop((round(i*draw.width/3),0,round((i+1)*draw.width/3),draw.height)))
            frames[i+3]=(f,f.getchannel('A').getbbox())
    else:
        # Retrace the hand's approach for a clean return from the sunglasses.
        # The discarded return drawing swings the fingers across his face.
        frames[7:12]=[frames[4],frames[3],frames[2],frames[1],frames[0]]
    atlas=Image.new('RGBA',(400*12,368))
    anchors=[]
    markers=[(191,76,274,174),(189,88,266,122),(191,77,226,85),
             (328,246,416,239),(326,245,420,242),(332,245,419,243),
             (189,88,266,122),(189,87,279,179),(195,91,274,184),
             (189,85,274,183),(190,86,272,181),(191,76,274,174)]
    for i,(frame,b) in enumerate(frames):
        # Align the hips rather than the overall silhouette: raised hands must not
        # move the entire torso. All portraits are cropped at the same belt depth.
        band=frame.getchannel('A').crop((0,b[1]+round((b[3]-b[1])*.88),frame.width,b[1]+round((b[3]-b[1])*.95))).getbbox()
        center=(band[0]+band[2])/2
        ratio=352/(b[3]-b[1])
        sprite=frame.crop(b).resize((round((b[2]-b[0])*ratio),352),Image.Resampling.LANCZOS)
        alpha=sprite.getchannel('A').point(lambda a:255 if a>=128 else 0)
        sprite=sprite.convert('RGB').quantize(colors=192,dither=Image.Dither.NONE).convert('RGBA');sprite.putalpha(alpha)
        x=round(200-(center-b[0])*ratio)
        assert x>=0 and x+sprite.width<=400,(name,i,x,sprite.width)
        atlas.alpha_composite(sprite,(i*400+x,8))
        if name=='chad-cigar':
            mx,my,tx,ty=markers[i]
            anchors.append({'mouth':[round(x+(mx-b[0])*ratio,2),round(8+(my-b[1])*ratio,2)],'tip':[round(x+(tx-b[0])*ratio,2),round(8+(ty-b[1])*ratio,2)]})
    atlas.save(OUT/f'{name}.png',optimize=True)
    if anchors:(OUT/'cigar-anchors.json').write_text(json.dumps(anchors))

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
    for name in ['poster-sunset','poster-midnight']:
        im=Image.open(SRC/f'{name}.png').convert('RGB').resize((960,540),Image.Resampling.LANCZOS)
        im.quantize(colors=256,dither=Image.Dither.NONE).save(OUT/f'{name}.png',optimize=True)
    for name in ['chad-cigar','chad-shades']:portraits(name)
if __name__=='__main__':main()
