"""Register the seated passengers' reaction poses (the final boss duo's poses: build_train_neta.py)."""
import numpy as np
from PIL import Image
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def main():
    cells=extract(Image.open(SOURCE/'passenger_reaction.png'),1)
    assert len(cells)==4
    scale=180/cells[0].height;frames=[]
    for i,c in sorted(cells.items()):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);a[:,:,:3]=(a[:,:,:3].astype(float)*.9).astype('uint8');a[a[:,:,3]==0,:3]=0
        f=Image.new('RGBA',(224,224));f.alpha_composite(Image.fromarray(a),((224-c.width)//2,217-c.height));frames.append(clean_edge(f))
    atlas(frames,OUT/'passenger_reaction.png')
if __name__=='__main__':main()
