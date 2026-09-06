"""Fixed-scale CHAD reaction, fictional charge placement and remote performance."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def main():
    cells=extract(Image.open(SOURCE/'finale_charge.png'),3)
    assert set(cells)==set(range(12)),cells.keys()
    # Generation has two camera-scale groups. Register each against its
    # upright reference; all crouch poses share the first group's scale.
    scales=(170/cells[1].height,170/cells[6].height)
    frames=[]
    for i in range(12):
        scale=scales[0 if i<6 else 1]
        c=cells[i];c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);ys,xs=np.where(a[round(c.height*.25):round(c.height*.48),:,3]>32)
        anchor=float(np.median(xs))
        f=Image.new('RGBA',(320,240));f.alpha_composite(c,(round(160-anchor),233-c.height));frames.append(clean_edge(f))
    for f in frames:
        b=f.getbbox();assert b and 0<b[0]<b[2]<320 and 0<b[1]<b[3]<240,b
    atlas(frames,OUT/'finale_charge.png')
    review=Image.new('RGB',(1280,720),'#24202a')
    for i,f in enumerate(frames):review.paste(f,((i%4)*320,(i//4)*240),f)
    review.save('/tmp/finale_charge_review.png')
if __name__=='__main__':main()
