#!/usr/bin/env python3
"""Process selected exterior sources with fixed-scale animation registration."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
import numpy as np
from process_char import key_green, clean_walk_fragments
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/travel/city'; OUT=ROOT/'assets/travel/city'
def save(im,name):
    if im.mode=='RGBA':
        a=im.getchannel('A').point(lambda v:255 if v>=128 else 0)
        im=im.convert('RGB').quantize(colors=240,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(a)
    im.save(OUT/f'{name}.png',optimize=True)
def sheet(name,cols,rows,height,cell=(144,208),fixed=False):
    raw=Image.open(SRC/f'{name}.png'); frames=[]
    for row in range(rows):
        for col in range(cols):
            # Inset removes generated panel separators without clipping subjects.
            f=raw.crop((round(col*raw.width/cols)+12,round(row*raw.height/rows)+12,round((col+1)*raw.width/cols)-12,round((row+1)*raw.height/rows)-12))
            f=key_green(f);f=f if name=='fans' else clean_walk_fragments(f);frames.append(f)
    base=frames[0].getbbox(); ratio=height/(base[3]-base[1]); atlas=Image.new('RGBA',(cell[0]*len(frames),cell[1]))
    for i,f in enumerate(frames):
        b=f.getbbox(); assert b, (name,i)
        # Foot-band center keeps gestures from dragging the whole body sideways.
        band=f.getchannel('A').crop((0,b[3]-max(6,round((b[3]-b[1])*.15)),f.width,b[3])).getbbox()
        center=(band[0]+band[2])/2 if not fixed else (base[0]+base[2])/2
        if name=='chad_boarding': center=(b[0]+b[2])/2
        sprite=f.crop(b).resize((round((b[2]-b[0])*ratio),round((b[3]-b[1])*ratio)),Image.Resampling.LANCZOS)
        x=round(cell[0]/2-(center-b[0])*ratio);y=cell[1]-8-sprite.height
        assert x>=0 and x+sprite.width<=cell[0] and y>=0,(name,i,x,y,sprite.size)
        atlas.alpha_composite(sprite,(i*cell[0]+x,y))
    if name!='chad_boarding':save(atlas,name)
    return atlas
def exterior():
    im=Image.open(SRC/'exterior_open.png').convert('RGBA').resize((1280,540),Image.Resampling.LANCZOS)
    save(im,'exterior_open')
    layer=Image.new('RGBA',im.size);layer.paste(im.crop((0,384,1280,540)),(0,384));save(layer,'street_road')
    # Generated open ironwork; alpha holes expose the independently moving city.
    rail=Image.open(SRC/'drive_railing.png').convert('RGBA')
    rail.putalpha(rail.getchannel('A').point(lambda a:255 if a>=128 else 0))
    rail=rail.crop((54,264,2119,448)).resize((640,56),Image.Resampling.LANCZOS)
    save(rail,'drive_railing')

def seated_driver(boarding):
    car=Image.open(OUT/'car.png').convert('RGBA')
    frame=boarding.crop((800,0,960,208))
    person=Image.new('RGBA',car.size);person.alpha_composite(frame,(164,-94))
    mask=Image.new('L',car.size);ImageDraw.Draw(mask).polygon([(178,8),(234,8),(274,41),(179,41)],fill=255)
    person.putalpha(Image.composite(person.getchannel('A'),Image.new('L',car.size),mask))
    car.alpha_composite(person);save(car,'car_driver')

def vip_crowd():
    atlas=Image.new('RGBA',(1280,576))
    for row,name in enumerate(['fan_burgundy','fan_black','fan_camera']):
        frames=[]
        for suffix in ['', '_extra']:
            raw=Image.open(SRC/(name+suffix+'.png')).convert('RGBA')
            pixels=np.array(raw);r,g,b=[pixels[:,:,i].astype(int) for i in range(3)]
            pixels[(r>120)&(b>100)&(r>g*1.8+35)&(b>g*1.8+35),3]=0
            alpha=Image.fromarray(pixels[:,:,3])
            edge=(pixels[:,:,3]>0)&(np.array(alpha.filter(ImageFilter.MinFilter(5)))==0)
            pixels[edge&(r>g+12)&(b>g+12),:3]=(26,16,22)
            raw=Image.fromarray(pixels)
            frames.extend([clean_walk_fragments(raw.crop((c*raw.width//2,r*raw.height//2,(c+1)*raw.width//2,(r+1)*raw.height//2))) for r in range(2) for c in range(2)])
        base=frames[0].getbbox();scale=164/(base[3]-base[1])
        for col,f in enumerate(frames):
            box=f.getbbox();feet=f.getchannel('A').crop((0,box[3]-30,f.width,box[3])).getbbox()
            center=(feet[0]+feet[2])/2
            cut=f.crop(box).resize((round((box[2]-box[0])*scale),round((box[3]-box[1])*scale)),Image.Resampling.LANCZOS)
            x=round(80-(center-box[0])*scale);y=184-cut.height
            assert 0<=x and x+cut.width<=160 and y>=0,(row,col,x,y,cut.size)
            atlas.alpha_composite(cut,(col*160+x,row*192+y))
    save(atlas,'fans')
    props=Image.open(SRC/'vip_props.png').convert('RGBA')
    for name,box,size in [('vip_carpet',(20,170,1516,402),(360,48)),('vip_ropes',(45,566,850,934),(240,84))]:
        im=props.crop(box);im.putalpha(im.getchannel('A').point(lambda a:255 if a>=160 else 0))
        if name=='vip_ropes':
            # Remove the outgoing second rope beyond the terminal post, while
            # retaining its finial, stem and full weighted base.
            alpha=im.getchannel('A')
            ImageDraw.Draw(alpha).rectangle((793-box[0],620-box[1],im.width,854-box[1]),fill=0)
            im.putalpha(alpha)
        if name=='vip_carpet':
            im=ImageEnhance.Brightness(im).enhance(.62)
            im=ImageEnhance.Color(im).enhance(.75)
        save(im.resize(size,Image.Resampling.LANCZOS),name)

if __name__=='__main__':
    exterior();sheet('doorman',4,2,172,(144,192));boarding=sheet('chad_boarding',6,1,192,(160,208))
    vip_crowd();seated_driver(boarding)
