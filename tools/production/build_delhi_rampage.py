"""Register selected GPT Image rampage sources; preserve anatomical scale and alpha."""
from pathlib import Path
from PIL import Image
import numpy as np
from build_combat_variety import clean
from keying import key
from build_station_life import despill
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/stages/dirty_delhi/rampage';D=R/'assets/stages/dirty_delhi/rampage';D.mkdir(exist_ok=True)
def alpha(im):
 a=np.array(im.convert('RGBA'));r,g,b=[a[:,:,i].astype(int) for i in range(3)]
 a[(r>200)&(g<45)&(b<45)]=0
 return clean(Image.fromarray(a))
def sheet(frames,cols,size):
 out=Image.new('RGBA',(cols*size[0],((len(frames)+cols-1)//cols)*size[1]))
 for i,f in enumerate(frames):out.alpha_composite(f,(i%cols*size[0],i//cols*size[1]))
 return out
# Structure states, 1:1 on screen (560x373 cells = the 280-logical stall). Damage persists: the
# left wreck carries into the right hit (cut on the shared centre post), and the collapse state
# keeps the lower wreck while both awning halves (everything above a jagged break line, posts
# excepted) are separate pieces the cinematic drops. Sheet: 0 intact, 1 left, 2 both, 3 flat,
# 4 state 2 without its awnings. Source states (2x2 of 768x512) are shifted onto state 0's posts
# (tops for the standing states, the pile base for the flattened one), then scaled so the outer
# posts land where the game expects them (37..532) with the street base on row 333.
a=despill(np.array(key(Image.open(S/'stalls.png').convert('RGB'))));src=[]
for i,(dx,dy) in enumerate([(0,0),(13,-1),(-2,53),(12,48)]):
 c=a[i//2*512:(i//2+1)*512,i%2*768:(i%2+1)*768].copy();c[c[:,:,3]<=24]=0;f=np.zeros((540,768,4),np.uint8)
 y0,x0=max(0,dy),max(0,dx);f[y0:min(540,dy+512),x0:min(768,dx+768)]=c[y0-dy:min(540,dy+512)-dy,x0-dx:min(768,dx+768)-dx];src.append(f)
MID=390;s1=src[0].copy();s1[:,:MID]=src[1][:,:MID];s2=s1.copy();s2[:,MID:]=src[2][:,MID:]
posts=np.zeros(768,bool)
for l,r in [(46,70),(378,403),(708,732)]:posts[l:r]=True
rng=np.random.default_rng(7);cut=np.clip(300+np.cumsum(rng.integers(-3,4,768)),284,316)
upper=np.arange(540)[:,None]<cut[None,:];upper&=~posts[None,:]
bare=s2.copy();bare[upper]=0;pieces=[]
for side in (np.arange(768)<MID,np.arange(768)>=MID):
 q=s2.copy();q[~(upper&side[None,:])]=0;pieces.append(q)
K=495/681
def fit(x):
 im=Image.fromarray(x).resize((round(768*K),round(540*K)),Image.Resampling.LANCZOS);q=np.array(im);q[q[:,:,3]<40]=0
 f=Image.new('RGBA',(560,373));f.alpha_composite(Image.fromarray(q),(round(37-48*K),round(333-472*K)));return f
sheet([fit(x) for x in (src[0],s1,s2,src[3],bare)],3,(560,373)).save(D/'stalls.png')
sheet([fit(x) for x in pieces],2,(560,373)).save(D/'awning.png')
# The counter front the game redraws over the vendors starts at the counter's top ledge (row 355
# of state 0 = cell row 248; js/delhi_intro.js COUNTER_ROW).
im=Image.open(S/'pigeons.png').convert('RGBA');frames=[]
for i in range(8):
 c=alpha(im.crop((round(i%4*im.width/4),round(i//4*im.height/2),round((i%4+1)*im.width/4),round((i//4+1)*im.height/2))))
 # Uniform whole-cell scale preserves the bird's body size through its wing cycle.
 c=c.resize((128,128),Image.Resampling.LANCZOS);frames.append(alpha(c))
sheet(frames,4,(128,128)).save(D/'pigeons.png')
# Reproducible native contact sheet against both edge-inspection backgrounds.
out=Image.new('RGB',(1024,512),'#25222b')
for n,name in enumerate(['stalls','awning']):
 im=Image.open(D/(name+'.png'));im.thumbnail((512,512));out.paste(im,(n*512,0),im)
p=R/'tmp/review/delhi-rampage';p.mkdir(parents=True,exist_ok=True);out.save(p/'registered.png')

# Market debris: 16 pieces, each fitted into a 32px cell (1:1 on screen, 16 logical px).
a=despill(np.array(key(Image.open(S/'debris.png').convert('RGB'))));h,w=a.shape[:2];frames=[]
for i in range(16):
 c=Image.fromarray(a[round(i//4*h/4):round((i//4+1)*h/4),round(i%4*w/4):round((i%4+1)*w/4)]);c=c.crop(c.getbbox())
 k=26/max(c.size);c=c.resize((max(1,round(c.width*k)),max(1,round(c.height*k))),Image.Resampling.LANCZOS)
 q=np.array(c);q[q[:,:,3]<60]=0;q[:,:,3][q[:,:,3]>0]=255;f=Image.new('RGBA',(32,32));f.alpha_composite(Image.fromarray(q),((32-c.width)//2,(32-c.height)//2));frames.append(f)
sheet(frames,4,(32,32)).save(D/'debris.png')

# The stall workers' loops and the chai-wallah's flight come from build_delhi_acts.py.
