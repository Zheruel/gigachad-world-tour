"""Register passenger damage against fixed coach ends and running-gear baseline."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT,atlas,keyed
from build_train_enemy_performances import extract

def main():
    im=Image.open(SOURCE/'finale_passenger_damage.png').convert('RGBA')
    a=np.array(im);rgb=a[:,:,:3].astype(int)
    # Generated neutral checker is empty space, including open windows and roof ribs.
    empty=(rgb.min(2)>208)&((rgb.max(2)-rgb.min(2))<22)
    a[empty]=0;im=Image.fromarray(a)
    frames=[]
    # Shared x bounds and baseline registration; never normalize each damage silhouette.
    for floor in [328,709,1082]:
        c=im.crop((42,floor-280,1308,floor)).resize((988,174),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(1024,224));f.alpha_composite(c,(18,39));frames.append(f)
    original=Image.open(OUT/'train_exterior.png').convert('RGBA').crop((0,0,1024,224))
    broken=original.copy();broken.paste(frames[0].crop((70,90,990,170)),(70,90))
    panels=frames[0].copy();panels.paste(frames[1].crop((0,90,1024,190)),(0,90))
    atlas([original,broken,frames[0],panels,frames[1],frames[2]],OUT/'finale_passenger_damage.png')
    im=Image.open(SOURCE/'finale_private_shell.png').convert('RGBA')
    a=np.array(im);rgb=a[:,:,:3].astype(int)
    a[(rgb.min(2)>208)&((rgb.max(2)-rgb.min(2))<22)]=0;im=Image.fromarray(a)
    shells=[]
    for y in [65,494]:
        c=im.crop((32,y,1674,y+340)).resize((988,191),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(1024,224));f.alpha_composite(c,(18,18));shells.append(f)
    original=Image.open(OUT/'train_exterior.png').convert('RGBA').crop((0,448,1024,672))
    original.paste((0,0,0,0),(0,0,1024,45));early=[original]
    for c in extract(keyed(Image.open(SOURCE/'finale_early_damage.png')),2).values():
        c=c.resize((988,round(c.height*988/c.width)),Image.Resampling.NEAREST)
        registered=Image.new('RGBA',(1024,224));registered.alpha_composite(c,(18,213-c.height))
        f=original.copy();f.paste(registered.crop((90,90,986,170)),(90,90));early.append(f)
    panels=early[2].copy();panels.paste(shells[0].crop((0,90,1024,190)),(0,90))
    # Keep intact exterior metal and trim around early broken/fire window apertures.
    # Generated glass is fitted inside each original frame, so local reveals cannot
    # move the horizontal coach stripes or introduce differently painted rectangles.
    boxes=[(111,150),(173,209),(248,282),(318,353),(391,427),(454,488),
           (520,555),(590,624),(660,695),(732,765),(797,830),(910,944)]
    for stage in [1,2]:
        generated=early[stage];f=early[0].copy()
        for x0,x1 in boxes:
            f.paste(generated.crop((x0+8,117,x1-8,136)).resize((x1-x0-8,27),Image.Resampling.NEAREST),(x0+4,111))
        early[stage]=f
    registered=[]
    for f,dy in [(panels,3),(shells[0],3),(shells[1],6)]:
        shifted=Image.new('RGBA',(1024,224));shifted.alpha_composite(f,(0,dy));registered.append(shifted)
    atlas([*early,*registered],OUT/'finale_car.png')
if __name__=='__main__':main()
