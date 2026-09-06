#!/usr/bin/env python3
"""Prepare selected airport art, registered poses and independently moving layers."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance
from process_char import key_green
import numpy as np

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/travel'; OUT=ROOT/'assets/travel'
def read(folder,name): return Image.open(SRC/folder/(name+'.png')).convert('RGBA')
def save(im,folder,name):
    if im.mode=='RGBA':
        a=im.getchannel('A').point(lambda v:255 if v>=128 else 0)
        im=im.convert('RGB').quantize(colors=240,dither=Image.Dither.NONE).convert('RGBA');im.putalpha(a)
    im.save(OUT/folder/(name+'.png'),optimize=True)
def key(im):
    p=np.array(im.convert('RGBA'));r,g,b=[p[:,:,i].astype(int) for i in range(3)]
    p[(r>110)&(b>95)&(r>g*1.7+30)&(b>g*1.7+30),3]=0
    edge=(p[:,:,3]>0)&(np.array(Image.fromarray(p[:,:,3]).filter(ImageFilter.MinFilter(3)))==0)
    p[edge&(r>g+20)&(b>g+20),:3]=(38,28,35)
    return Image.fromarray(p)
def cut(im): return im.crop(im.getbbox())
def sheet(folder,name,cols,rows,height=184,cell=(192,208)):
    raw=key(read(folder,name));frames=[]
    for row in range(rows):
        for col in range(cols): frames.append(raw.crop((col*raw.width//cols,row*raw.height//rows,(col+1)*raw.width//cols,(row+1)*raw.height//rows)))
    atlas=Image.new('RGBA',(cell[0]*len(frames),cell[1])); base=frames[0].getbbox();scale=height/(base[3]-base[1])
    for i,f in enumerate(frames):
        b=f.getbbox();foot=f.getchannel('A').crop((0,b[3]-20,f.width,b[3])).getbbox();center=(foot[0]+foot[2])/2
        if name=='official' and i==5:center=(b[0]+b[2])/2
        img=f.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        x=round(cell[0]/2-(center-b[0])*scale);y=cell[1]-8-img.height
        assert x>=0 and x+img.width<=cell[0] and y>=0,(name,i,x,y,img.size)
        atlas.alpha_composite(img,(i*cell[0]+x,y))
    save(atlas,folder,name)
def duck_sheet():
    raw=key_green(read('city','chad_boarding'));cw=raw.width//6
    base=raw.crop((0,0,cw,raw.height)).getbbox();scale=184/(base[3]-base[1]);atlas=Image.new('RGBA',(768,208))
    for i,col in enumerate([1,2,3]):
        f=raw.crop((col*cw,0,(col+1)*cw,raw.height));b=f.getbbox();feet=f.getchannel('A').crop((0,b[3]-25,cw,b[3])).getbbox();center=(feet[0]+feet[2])/2
        cutout=f.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        atlas.alpha_composite(cutout,(i*256+round(128-(center-b[0])*scale),200-cutout.height))
    save(atlas,'airport','chad_duck')

def departure_polish():
    sheet('airport','attendant_service',4,2,176,(224,200))
    sheet('airport','chad_low_board',2,2,184,(256,208))
    raw=key(read('airport','porter_work'));atlas=Image.new('RGBA',(8*224,200))
    # Luggage is excluded from the foot anchor: it must not move the worker's body.
    anchors=[228,175,166,129,226,171,161,129]
    scale=174/441
    for i,x in enumerate(anchors):
        f=raw.crop((i%4*384,i//4*512,i%4*384+384,i//4*512+512));b=f.getbbox()
        im=f.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(224,200));cell.alpha_composite(im,(round(112-(x-b[0])*scale),192-im.height));atlas.alpha_composite(cell,(i*224,0))
    save(atlas,'airport','porter_work')
    opened=key(read('airport','jet_sunset_open'));closed_source=key(read('airport','jet_sunset_closed'))
    # Use only the generated door change. All silhouette/wing/wheel pixels remain
    # from the open master, eliminating geometry drift between the two states.
    closed=opened.copy();patch=Image.new('L',opened.size)
    ImageDraw.Draw(patch).polygon([(1610,327),(1740,327),(1740,691),(1480,691),(1480,524),(1560,460),(1610,440)],fill=255)
    aligned=Image.new('RGBA',opened.size);aligned.alpha_composite(closed_source,(-5,-3))
    closed.paste(aligned,(0,0),patch)
    box=(22,53,2156,691)
    opened=opened.crop(box).resize((1200,360),Image.Resampling.LANCZOS)
    closed=closed.crop(box).resize((1200,360),Image.Resampling.LANCZOS)
    save(opened,'airport','departure_jet_open')
    mask=Image.new('L',closed.size)
    for box in [(492,274,571,360),(635,271,694,360),(1040,258,1105,360)]:ImageDraw.Draw(mask).rectangle(box,fill=255)
    gear=Image.new('RGBA',closed.size);gear.paste(closed,(0,0),mask)
    a=closed.getchannel('A');a.paste(0,(0,0),mask);closed.putalpha(a)
    save(closed,'airport','departure_jet_body');save(gear,'airport','departure_jet_gear')

def environments():
    for folder,name in [('airport','private_apron'),('india','arrival_terminal')]:
        im=read(folder,name).resize((1920,540),Image.Resampling.LANCZOS);save(im,folder,name)
        # The architecture and apron share exact registration at rest.
        ground=Image.new('RGBA',im.size);ground.paste(im.crop((0,380,1920,540)),(0,380));save(ground,folder,name+'_ground')
    for folder,name in [('airport','scenic_vista'),('india','approach_vista')]:
        im=read(folder,name).resize((1280,720),Image.Resampling.LANCZOS);save(im,folder,name)
        # Foreground contour follows roof/mountain ridges; opaque city, no ghosting.
        overlay=im.copy();mask=Image.new('L',im.size)
        ridge=([(0,526),(90,514),(140,520),(170,480),(202,502),(240,464),(265,470),(290,500),(350,496),(410,508),(470,535),(545,507),(615,494),(680,471),(710,462),(750,501),(820,510),(905,483),(980,510),(1050,494),(1150,520),(1280,508)] if folder=='airport' else [(0,470),(90,456),(175,476),(260,468),(340,490),(420,466),(510,475),(600,494),(700,471),(810,484),(920,470),(1030,482),(1130,455),(1280,470)])
        ImageDraw.Draw(mask).polygon(ridge+[(1280,720),(0,720)],fill=255);overlay.putalpha(mask);save(overlay,folder,name+'_near')
        if folder=='airport':
            mountains=im.copy();mask=Image.new('L',im.size);ImageDraw.Draw(mask).polygon([(0,303),(50,309),(105,289),(156,302),(209,306),(252,290),(294,307),(370,290),(432,310),(510,291),(570,311),(638,302),(705,310),(773,294),(812,299),(856,287),(910,303),(990,290),(1070,299),(1170,310),(1280,294),(1280,720),(0,720)],fill=255);mountains.putalpha(mask);save(mountains,folder,'scenic_mountains')
    clouds=read('airport','clouds');cp=np.array(clouds);cp[(cp[:,:,0]>185)&(cp[:,:,2]>180)&(cp[:,:,1]<85),3]=0;clouds=Image.fromarray(cp)
    for i,name in enumerate(['cloud_sunset','cloud_dust']):
        im=cut(clouds.crop((0,i*512,1536,(i+1)*512)));im=ImageEnhance.Color(im).enhance(.55 if i==0 else .12);save(im.resize((960,round(im.height*960/im.width)),Image.Resampling.LANCZOS),'airport',name)
    jets=key(read('airport','jet_views'));rear=cut(jets.crop((0,480,1536,1024)));save(rear.resize((720,round(rear.height*720/rear.width)),Image.Resampling.LANCZOS),'airport','jet_rear')
    # Split the existing approved side view at the undercarriage, preserving exact
    # wheel/fuselage coordinates in both files. Gear retracts behind the body.
    jet=Image.open(OUT/'airport/jet_closed.png').convert('RGBA');body=jet.copy();gear=Image.new('RGBA',jet.size)
    mask=Image.new('L',jet.size);d=ImageDraw.Draw(mask)
    for box in [(414,280,500,350),(542,280,610,350),(951,269,1006,350)]: d.rectangle(box,fill=255)
    gear.putalpha(Image.new('L',jet.size));gear.paste(jet,(0,0),mask)
    a=body.getchannel('A');a.paste(0,(0,0),mask);body.putalpha(a)
    save(body,'airport','jet_body');save(gear,'airport','jet_gear')

if __name__=='__main__':
    environments();duck_sheet();departure_polish();sheet('airport','staff',4,2,174,(192,200));sheet('airport','chad_stairs',3,2,184,(256,208));sheet('india','official',3,2,172,(224,208))
