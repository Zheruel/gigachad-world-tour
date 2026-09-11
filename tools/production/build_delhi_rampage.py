"""Register selected GPT Image rampage sources; preserve anatomical scale and alpha."""
from pathlib import Path
from PIL import Image,ImageDraw
import numpy as np
from build_combat_variety import clean,largest_component
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/stages/dirty_delhi/rampage';D=R/'assets/stages/dirty_delhi/rampage';D.mkdir(exist_ok=True)
def alpha(im):
 a=np.array(im.convert('RGBA'));r,g,b=[a[:,:,i].astype(int) for i in range(3)]
 a[(r>200)&(g<45)&(b<45)]=0
 return clean(Image.fromarray(a))
def sheet(frames,cols,size):
 out=Image.new('RGBA',(cols*size[0],((len(frames)+cols-1)//cols)*size[1]))
 for i,f in enumerate(frames):out.alpha_composite(f,(i%cols*size[0],i//cols*size[1]))
 return out
im=Image.open(S/'chad.png').convert('RGBA');frames=[]
# Generations use uneven row gutters; preserve full boots in every selected cell.
ye=[0,365,674,953,1254];scale=170/247
for i in range(16):
 c=alpha(im.crop((round(i%4*im.width/4),ye[i//4],round((i%4+1)*im.width/4),ye[i//4+1])))
 a=np.array(c);a[~largest_component(a[:,:,3]>24)]=0;c=Image.fromarray(a);box=c.getbbox();c=c.crop(box)
 c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(256,256));f.alpha_composite(c,((256-c.width)//2,248-c.height));frames.append(alpha(f))
sheet(frames,4,(256,256)).save(D/'chad.png')
# Same pixel scale and floor registration for the four structure states.
im=Image.open(S/'stalls.png');frames=[]
for i in range(4):
 c=alpha(im.crop((i%2*768,i//2*512,(i%2+1)*768,(i//2+1)*512)))
 # Floor landmarks y=445 / 455 / 424 / 429 within cells. Keep common posts horizontally registered.
 floor=[445,445,410,429][i];f=Image.new('RGBA',(768,512));f.alpha_composite(c,([0,8,0,8][i],455-floor))
 frames.append(f.resize((384,256),Image.Resampling.LANCZOS))
# Keep the untouched right stall and roof bit-identical after the first hit.
base=frames[0].copy();damaged=frames[1];base.paste(damaged.crop((0,150,192,256)),(0,150));frames[1]=base
awning=frames[0].crop((0,60,384,150));awning.save(D/'awning.png')
second=frames[0].copy();second.paste(frames[2].crop((0,150,384,256)),(0,150));second.paste((0,0,0,0),(0,60,384,150));frames[2]=second
sheet(frames,2,(384,256)).save(D/'stalls.png')
im=Image.open(S/'pigeons.png').convert('RGBA');frames=[]
for i in range(8):
 c=alpha(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
 # Uniform whole-cell scale preserves the bird's body size through its wing cycle.
 c=c.resize((128,128),Image.Resampling.LANCZOS);frames.append(alpha(c))
sheet(frames,4,(128,128)).save(D/'pigeons.png')
# Reproducible native contact sheet against both edge-inspection backgrounds.
out=Image.new('RGB',(1024,512),'#25222b')
for n,name in enumerate(['chad','stalls']):
 im=Image.open(D/(name+'.png'));im.thumbnail((512,512));out.paste(im,(n*512,0),im)
p=R/'tmp/review/delhi-rampage';p.mkdir(parents=True,exist_ok=True);out.save(p/'registered.png')

im=Image.open(S/'vendor.png').convert('RGBA');frames=[]
for i in range(8):
 c=alpha(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
 a=np.array(c);a[~largest_component(a[:,:,3]>24)]=0;c=Image.fromarray(a);c=c.crop(c.getbbox());c=c.resize((round(c.width*148/380),round(c.height*148/380)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(256,256));f.alpha_composite(c,((256-c.width)//2,248-c.height));frames.append(alpha(f))
sheet(frames,4,(256,256)).save(D/'vendor.png')
# Fixed wheel/ground registration; all poses share the standing body's 85px scale.
im=Image.open(S/'bike.png').convert('RGBA');frames=[]
for i in range(8):
 c=clean(im.crop((i%4*384,i//4*512,(i%4+1)*384,(i//4+1)*512)))
 # Chroma spill in the reflective discs is neutralized without cutting metal away.
 a=np.array(c);rgb=a[:,:,:3].astype(float);yy,xx=np.indices(a.shape[:2]);wheel=(yy>(360 if i<4 else 315))
 spill=(rgb[:,:,0]>rgb[:,:,1]*1.15)&(rgb[:,:,2]>rgb[:,:,1]*1.15)
 gray=rgb.mean(2);a[spill,:3]=np.repeat(gray[spill,None],3,axis=1).astype('uint8');c=Image.fromarray(a)
 scale=170/296;c=c.resize((round(384*scale),round(512*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(384,320));f.alpha_composite(c,(round(192-([192]*6+[158,192])[i]*scale),round(312-(475 if i<4 else 431)*scale)))
 frames.append(clean(f))
sheet(frames,4,(384,320)).save(D/'bike.png')

# Individually authored working loops: fixed cell centres and boot baselines,
# never fit each pose's bounding box (raised arms must not shrink the body).
im=Image.open(S/'vendors-working.png').convert('RGBA');frames=[]
rows=[0,338,671,963,1242];floors=[334,668,955,1232];scale=148/310
for i in range(16):
 row=i//4;left=round(i%4*im.width/4);right=round((i%4+1)*im.width/4)
 c=alpha(im.crop((left,rows[row],right,rows[row+1])))
 c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(256,256));f.alpha_composite(c,(round(128-(right-left)*scale/2),round(248-(floors[row]-rows[row])*scale)))
 frames.append(alpha(f))
sheet(frames,4,(256,256)).save(D/'vendors-working.png')
im=Image.open(S/'chai-flee.png').convert('RGBA');frames=[]
for i in range(8):
 c=alpha(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
 a=np.array(c);a[~largest_component(a[:,:,3]>24)]=0;c=Image.fromarray(a);box=c.getbbox();c=c.crop(box)
 scale=132/410;c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
 f=Image.new('RGBA',(256,256));f.alpha_composite(c,((256-c.width)//2,248-c.height));frames.append(alpha(f))
sheet(frames,4,(256,256)).save(D/'chai-flee.png')
