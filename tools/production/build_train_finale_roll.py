"""Register CHAD's authored leap, shoulder roll and walk-away at fixed anatomy."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def main():
    cells=extract(Image.open(SOURCE/'finale_roll.png'),4)
    assert set(cells)==set(range(16)),cells.keys()
    # Sunglasses standing pose fixes the body scale. Low poses keep their size.
    scale=170/cells[15].height
    frames=[]
    for i in range(16):
        c=cells[i];c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);ys,xs=np.where(a[:,:,3]>32)
        # Rolls pivot about the lower contact patch, other poses about the torso.
        if 8<=i<=10:
            yy,xx=np.where(a[max(0,c.height-12):,:,3]>32);anchor=float(np.median(xx))
        elif i in [4,5]:anchor=c.width/2
        else:
            yy,xx=np.where(a[round(c.height*.25):round(c.height*.55),:,3]>32);anchor=float(np.median(xx))
        f=Image.new('RGBA',(320,240));f.alpha_composite(c,(round(160-anchor),233-c.height));frames.append(clean_edge(f))
    walk=extract(Image.open(SOURCE/'finale_walk.png'),1)
    assert len(walk)==4
    walkscale=170/np.median([c.height for c in walk.values()])
    for i in range(4):
        c=walk[i]
        # Key the generated red matte spill; it is absent from CHAD's costume.
        a=np.array(c);a[(a[:,:,0]>150)&(a[:,:,1]<55)&(a[:,:,2]<55),3]=0;c=Image.fromarray(a)
        c=c.resize((round(c.width*walkscale),round(c.height*walkscale)),Image.Resampling.NEAREST)
        a=np.array(c);yy,xx=np.where(a[round(c.height*.25):round(c.height*.5),:,3]>32)
        f=Image.new('RGBA',(320,240));f.alpha_composite(c,(round(160-float(np.median(xx))),233-c.height));frames.append(clean_edge(f))
    assert all(f.getbbox()[0]>0 and f.getbbox()[1]>0 and f.getbbox()[2]<320 and f.getbbox()[3]<240 for f in frames)
    atlas(frames,OUT/'finale_roll.png')
    review=Image.new('RGB',(1280,1200),'#25212a')
    for i,f in enumerate(frames):review.paste(f,((i%4)*320,(i//4)*240),f)
    review.save('/tmp/finale_roll_review.png')
if __name__=='__main__':main()
