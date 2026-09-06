#!/usr/bin/env python3
"""Register the selected descent and redirection sprites by feet and anatomy."""
from PIL import Image, ImageOps
from build_airport import read, key, save

def panels(folder,name,cols,rows,inset=0):
    raw=key(read(folder,name))
    return [raw.crop((round(c*raw.width/cols)+inset,round(r*raw.height/rows)+inset,round((c+1)*raw.width/cols)-inset,round((r+1)*raw.height/rows)-inset)) for r in range(rows) for c in range(cols)]

def descent():
    frames=panels('airport','chad_disembark',4,2)
    b=frames[7].getbbox();scale=184/(b[3]-b[1]);atlas=Image.new('RGBA',(8*256,208))
    for i,f in enumerate(frames):
        f=ImageOps.mirror(f);b=f.getbbox()
        feet=f.getchannel('A').crop((0,b[3]-14,f.width,b[3])).getbbox();x=(feet[0]+feet[2])/2
        im=f.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(256,208));cell.alpha_composite(im,(round(128-(x-b[0])*scale),200-im.height));atlas.alpha_composite(cell,(i*256,0))
    save(atlas,'airport','chad_disembark')

def redirection():
    frames=panels('india','chad_redirection',4,2,20)
    # Anchors reference CHAD only, excluding the official and his airborne boots.
    anchors=[(153,388),(136,384),(111,386),(114,376),(117,383),(152,377),(185,375),(184,375)]
    scale=184/321;atlas=Image.new('RGBA',(8*384,288))
    for i,(f,(x,y)) in enumerate(zip(frames,anchors)):
        f=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(384,288));cell.alpha_composite(f,(round(100-(x-20)*scale),round(280-(y-20)*scale)));atlas.alpha_composite(cell,(i*384,0))
    save(atlas,'india','chad_redirection')
    pivot=panels('india','chad_pivot',2,2,20)
    anchors=[(250,415),(232,424),(238,408),(192,440)]
    scale=.48;atlas=Image.new('RGBA',(4*384,288))
    for i,(f,(x,y)) in enumerate(zip(pivot,anchors)):
        im=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(384,288));cell.alpha_composite(im,(round(100-(x-20)*scale),round(280-(y-20)*scale)));atlas.alpha_composite(cell,(i*384,0))
    save(atlas,'india','chad_pivot')
    # Extract the detached official from the exact release pose, preserving his
    # anatomy when rendering the subsequent ballistic motion.
    f=pivot[3];mask=f.getchannel('A');seen=set();parts=[];w,h=f.size
    pix=mask.load()
    for y in range(h):
        for x in range(w):
            if pix[x,y]<128 or (x,y) in seen:continue
            todo=[(x,y)];seen.add((x,y));part=[]
            while todo:
                px,py=todo.pop();part.append((px,py))
                for qx,qy in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                    if 0<=qx<w and 0<=qy<h and pix[qx,qy]>=128 and (qx,qy) not in seen:seen.add((qx,qy));todo.append((qx,qy))
            if len(part)>500:parts.append(part)
    official=max(parts,key=lambda part:sum(p[0] for p in part)/len(part))
    a=Image.new('L',f.size);ap=a.load()
    for x,y in official:ap[x,y]=255
    f.putalpha(a);f=f.crop(f.getbbox());save(f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS),'india','official_airborne')

def distance_throw():
    frames=panels('india','chad_distance_throw',2,2,20)
    atlas=Image.new('RGBA',(3*256,240));scale=.48
    for i,(x,y) in enumerate([(340,474),(387,474),(358,452)]):
        f=frames[i];im=f.resize((round(f.width*scale),round(f.height*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(256,240));cell.alpha_composite(im,(round(128-(x-20)*scale),round(232-(y-20)*scale)));atlas.alpha_composite(cell,(i*256,0))
    save(atlas,'india','chad_distance_throw')
    f=frames[3];f=f.crop(f.getbbox());save(f.resize((round(f.width*.4),round(f.height*.4)),Image.Resampling.LANCZOS),'india','official_receding')

if __name__=='__main__':descent();redirection();distance_throw()
