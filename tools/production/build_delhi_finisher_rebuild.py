"""Register selected GPT Image performances at shared anatomical scales, not pose heights."""
from pathlib import Path
from PIL import Image,ImageOps
import numpy as np
from build_combat_variety import clean,largest_component
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/stages/dirty_delhi/finishers';D=R/'assets/stages/dirty_delhi/finishers';D.mkdir(exist_ok=True)
def alpha(im):
 a=np.array(im.convert('RGBA'));r,g,b=[a[:,:,i].astype(int) for i in range(3)]
 a[(r>190)&(g<65)&(b<65)]=0
 return clean(Image.fromarray(a))
for name,rows,body in [('chad',4,85),('vendor',3,98),('operator',3,88)]:
 im=Image.open(S/(name+'.png'));cw=im.width/4;ch=im.height/rows
 ys=([0,401,772,1086] if name in ('vendor','operator') else [0,330,638,948,1254])
 cells=[]
 for i in range(rows*4):
  xs=([0,345,635,950,1254] if name=='chad' and i//4==2 else [round(j*cw) for j in range(5)])
  if name=='vendor' and i//4==1:xs=[0,390,744,1084,1448]
  if name=='vendor' and i//4==2:xs=[0,385,729,1086,1448]
  if name=='operator' and i//4==1:xs=[0,402,738,1094,1448]
  right=1110 if name in ('operator','vendor') and i==10 else xs[i%4+1]
  cells.append(alpha(im.crop((xs[i%4],ys[i//4],right,ys[i//4+1]))))
 # First standing pose is the sole anatomical reference for the entire performance.
 box=cells[0].getbbox();scale=body*2/(box[3]-box[1]);out=Image.new('RGBA',(1024,rows*256))
 for i,c in enumerate(cells):
  a=np.array(c);a[~largest_component(a[:,:,3]>24)]=0;c=Image.fromarray(a);box=c.getbbox();c=c.crop(box)
  c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
  if name!='chad':c=ImageOps.mirror(c)
  f=Image.new('RGBA',(256,256));f.alpha_composite(c,((256-c.width)//2,248-c.height));out.alpha_composite(alpha(f),(i%4*256,i//4*256))
 out.save(D/(name+'.png'))
im=Image.open(S/'mechanisms.png');out=Image.new('RGBA',(1024,512))
for i in range(8):
 c=alpha(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
 # Whole-cell resize preserves registered structure dimensions and pivots.
 c=c.resize((256,256),Image.Resampling.LANCZOS);out.alpha_composite(alpha(c),(i%4*256,i//4*256))
out.save(D/'mechanisms.png')
