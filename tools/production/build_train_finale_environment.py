"""Split registered finale planes and preserve a common carriage frame rectangle."""
from PIL import Image
import numpy as np
from build_train_rebuild import SOURCE,OUT,atlas,keyed
from build_train_enemy_performances import extract

def main():
 im=Image.open(SOURCE/'finale_environment.png').convert('RGBA').resize((960,540),Image.Resampling.NEAREST)
 # Register the generated low walkway to the gameplay floor without stretching it.
 # Reuse a full-height railbed strip to extend the foreground track approach.
 original=im.copy()
 im.paste(original.crop((0,405,960,442)),(0,449))
 im.paste(original.crop((0,449,960,493)),(0,486))
 im.paste(original.crop((0,530,960,540)),(0,530))
 for name,y0,y1 in [('sky',0,170),('station',170,410),('track',410,486),('platform',486,540)]:
  plane=Image.new('RGBA',im.size);plane.paste(im.crop((0,y0,960,y1)),(0,y0));plane.save(OUT/f'finale_{name}.png')
 gear=Image.open(SOURCE/'finale_gear.png').convert('RGBA');a=np.array(gear)
 neutral=(a[:,:,:3].min(axis=2)>215)&((a[:,:,:3].max(axis=2).astype(int)-a[:,:,:3].min(axis=2))<18)
 a[neutral,3]=0
 # Steel highlights must stay subordinate to the weathered coach, not form a white outline.
 steel=(a[:,:,:3].min(axis=2)>135)&((a[:,:,:3].max(axis=2).astype(int)-a[:,:,:3].min(axis=2))<65)&(a[:,:,3]>0)
 a[steel,:3]=(a[steel,:3]*.48).astype(np.uint8);gear=Image.fromarray(a)
 for name,y0,y1 in [('bogie',0,round(gear.height*.55)),('coupling',round(gear.height*.55),gear.height)]:
  c=gear.crop((0,y0,gear.width,y1));c=c.crop(c.getbbox());c.save(OUT/f'finale_{name}.png')
 p=SOURCE/'finale_car.png'
 if p.exists():
  im=Image.open(p).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(float)
  spill=(rgb[:,:,1]>50)&(rgb[:,:,1]>rgb[:,:,0]*1.3)&(rgb[:,:,1]>rgb[:,:,2]*1.15);a[spill,3]=0
  cells=list(extract(Image.fromarray(a),2).values());assert len(cells)==2
  original=Image.open(OUT/'train_exterior.png').convert('RGBA')
  frames=[original.crop((0,448,1024,672)),original.crop((0,672,1024,896))]
  # The intact source cell includes a stray fragment above the roof (y35).
  # Main carriage artwork begins below y50; preserve its coordinates.
  frames[0].paste((0,0,0,0),(0,0,1024,45))
  scale=988/cells[0].width
  for c in cells:
   c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
   f=Image.new('RGBA',(1024,224));f.alpha_composite(c,((1024-c.width)//2,213-c.height));frames.append(f)
  early=keyed(Image.open(SOURCE/'finale_early_damage.png'))
  early_cells=list(extract(early,2).values());assert len(early_cells)==2
  intermediates=[]
  for c in early_cells:
   c=c.resize((988,round(c.height*988/c.width)),Image.Resampling.NEAREST)
   registered=Image.new('RGBA',(1024,224));registered.alpha_composite(c,(18,213-c.height))
   f=frames[0].copy();f.paste(registered.crop((90,90,986,170)),(90,90));intermediates.append(f)
  atlas([frames[0],*intermediates,*frames[1:]],OUT/'finale_car.png')
if __name__=='__main__':main()
