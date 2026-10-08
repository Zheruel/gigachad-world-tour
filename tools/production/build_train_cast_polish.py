"""Register the replacement seated passenger and the wreck atlas (final boss duo: build_train_neta.py)."""
import numpy as np
from PIL import Image
from build_train_rebuild import SOURCE,OUT,cell,crop,clean_actor,atlas,neutral_key

def main():
    im=neutral_key(Image.open(SOURCE/'passenger_seated.png'))
    cells=[crop(clean_actor(cell(im,i,4,1))) for i in range(4)]
    scale=180/cells[0].height;frames=[]
    for c in cells:
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);a[:,:,:3]=(a[:,:,:3].astype(float)*.9).astype('uint8');a[a[:,:,3]==0,:3]=0
        f=Image.new('RGBA',(224,224));f.alpha_composite(Image.fromarray(a),((224-c.width)//2,217-c.height));frames.append(f)
    atlas(frames,OUT/'passenger_seated.png')
    im=Image.open(SOURCE/'wreck.png').convert('RGBA');frames=[]
    # Register the actual wheel landmarks, not the changing fire/smoke bounds.
    bounds=[(0,310),(310,592),(592,927),(927,1312)]
    landmarks=[(161,1060,286),(178,1054,577),(161,1057,906),(159,1057,1280)]
    for (top,bottom),(left,right,ground) in zip(bounds,landmarks):
        scale=783/(right-left)
        c=im.crop((0,top,im.width,bottom))
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(1024,320))
        f.alpha_composite(c,(round(142-left*scale),round(300-(ground-top)*scale)))
        frames.append(f)
    out=Image.new('RGBA',(1024,1280))
    for i,f in enumerate(frames):out.paste(f,(0,i*320))
    out.save(OUT/'wreck.png')
if __name__=='__main__':main()
