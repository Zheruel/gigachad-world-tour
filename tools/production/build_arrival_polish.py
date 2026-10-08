#!/usr/bin/env python3
"""Register the selected descent sprites by feet and anatomy (the redirection throw: build_india_arrival.py)."""
from PIL import Image, ImageOps
from build_airport import read, key, save, OUT, CHAD_CROWN
from chad_cutscene import finish as chad_finish

def panels(folder,name,cols,rows,inset=0):
    raw=key(read(folder,name))
    return [raw.crop((round(c*raw.width/cols)+inset,round(r*raw.height/rows)+inset,round((c+1)*raw.width/cols)-inset,round((r+1)*raw.height/rows)-inset)) for r in range(rows) for c in range(cols)]

def descent():
    frames=panels('airport','chad_disembark',4,2)
    b=frames[7].getbbox();scale=CHAD_CROWN/(b[3]-b[1]);atlas=Image.new('RGBA',(8*256,208))
    for i,f in enumerate(frames):
        f=ImageOps.mirror(f);b=f.getbbox()
        feet=f.getchannel('A').crop((0,b[3]-14,f.width,b[3])).getbbox();x=(feet[0]+feet[2])/2
        im=f.crop(b).resize((round((b[2]-b[0])*scale),round((b[3]-b[1])*scale)),Image.Resampling.LANCZOS)
        cell=Image.new('RGBA',(256,208));cell.alpha_composite(im,(round(128-(x-b[0])*scale),200-im.height));atlas.alpha_composite(cell,(i*256,0))
    save(atlas,'airport','chad_disembark');chad_finish(OUT/'airport/chad_disembark.png',(256,208))

if __name__=='__main__':descent()
