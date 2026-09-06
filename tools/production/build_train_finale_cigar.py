"""Register the generated finale cigar, smoke and red bundle performances."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def register(c,scale):
    c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
    a=np.array(c);ys,xs=np.where(a[round(c.height*.25):round(c.height*.48),:,3]>32)
    anchor=float(np.median(xs));f=Image.new('RGBA',(320,240))
    f.alpha_composite(c,(round(160-anchor),233-c.height))
    return clean_edge(f)

def main():
    cells=extract(Image.open(SOURCE/'finale_cigar.png'),4)
    order=[0,1,2,3,4,14,6,5,10,9,13,15]
    # The acting row and gait rows were authored at three camera scales.
    # Each group shares one upright landmark scale; no pose is stretched.
    frames=[register(cells[i],170/cells[0 if i<4 else 4 if i<8 else 14].height) for i in order]
    atlas(frames,OUT/'finale_cigar.png')
    review=Image.new('RGB',(640,360),'#24202a')
    for i,f in enumerate(frames):
        f=f.resize((160,120),Image.Resampling.NEAREST);review.paste(f,((i%4)*160,(i//4)*120),f)
    review.save('/tmp/finale_cigar_review.png')
    # Standalone prop shares the authored six-stick placement design.
    src=Image.open(SOURCE/'finale_dynamite.png').convert('RGBA')
    a=np.array(src);a[(a[:,:,0]>130)&(a[:,:,2]>100)&(a[:,:,1]<120),3]=0
    bundle=Image.fromarray(a);bundle=bundle.crop(bundle.getbbox())
    scale=86/bundle.width;bundle=bundle.resize((86,round(bundle.height*scale)),Image.Resampling.NEAREST)
    props=[]
    for i in range(3):
        f=Image.new('RGBA',(96,64));f.alpha_composite(bundle,(5,56-bundle.height));props.append(clean_edge(f))
    atlas(props,OUT/'finale_dynamite.png')
    src=Image.open(SOURCE/'finale_smoke.png').convert('RGBA');smokes=[]
    w,h=src.size
    for i in range(6):
        c=src.crop((round((i%3)*w/3),round((i//3)*h/2),round((i%3+1)*w/3),round((i//3+1)*h/2)))
        a=np.array(c);key=(a[:,:,0]>130)&(a[:,:,2]>110)&(a[:,:,1]<125);a[key,3]=0
        c=Image.fromarray(a);b=c.getbbox();c=c.crop(b)
        # Fixed scale retains the authored expansion; every lower tip shares origin.
        c=c.resize((max(1,round(c.width*.12)),max(1,round(c.height*.12))),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(64,96));f.alpha_composite(c,(32-c.width//2,92-c.height));smokes.append(clean_edge(f))
    atlas(smokes,OUT/'finale_smoke.png')
if __name__=='__main__':main()
