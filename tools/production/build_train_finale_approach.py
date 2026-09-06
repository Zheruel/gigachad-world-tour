"""Registered left approach; the approved rightmost view remains pixel-identical."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT

def main():
    src=Image.open(SOURCE/'finale_approach.png').convert('RGBA')
    # One uniform camera scale aligns the generated rail and canopy landmarks.
    src=src.resize((round(src.width*.905),round(src.height*.905)),Image.Resampling.NEAREST)
    left=src.crop((0,55,1920,595))
    # Reuse the authored steel support as the end post of the approach gantry.
    # It terminates against the station canopy rather than cutting into the skyline.
    post=left.crop((1716,46,1736,141)).transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    left.alpha_composite(post,(1900,46))
    complete=Image.new('RGBA',(2880,540));complete.alpha_composite(left)
    for name,y0,y1 in [('sky',0,170),('station',170,410),('track',410,486),('platform',486,540)]:
        approved=Image.open(OUT/f'finale_{name}.png').convert('RGBA')
        plane=Image.new('RGBA',(2880,540));plane.paste(left.crop((0,y0,1920,y1)),(0,y0));plane.alpha_composite(approved,(1920,0))
        plane.save(OUT/f'finale_approach_{name}.png');complete.alpha_composite(approved,(1920,0))
        assert plane.crop((1920,0,2880,540)).tobytes()==approved.tobytes()
    complete.save('/tmp/approach_join.png');complete.crop((1600,0,2240,540)).save('/tmp/approach_seam.png')
    clouds=Image.open(SOURCE/'finale_approach_clouds.png').convert('RGBA')
    a=np.array(clouds);spill=((a[:,:,0]>140)&(a[:,:,1]<105)&(a[:,:,0]>a[:,:,1].astype(float)*2.2)&(a[:,:,0]>a[:,:,2].astype(float)*1.7))|((a[:,:,0]>220)&(a[:,:,1]>220)&(a[:,:,2]<40));rgb=a[:,:,:3].astype(float);spill|=(rgb[:,:,0]>140)&(rgb[:,:,1]<105)&(rgb[:,:,0]>rgb[:,:,1]*2.2)&(rgb[:,:,0]>rgb[:,:,2]*1.7);a[spill,3]=0
    clouds=Image.fromarray(a);clouds.thumbnail((1920,640),Image.Resampling.NEAREST);clouds.save(OUT/'finale_approach_clouds.png')
if __name__=='__main__':main()
