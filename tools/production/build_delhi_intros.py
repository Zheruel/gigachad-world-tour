"""Register the Dirty Delhi intro fire sheet from rampage/fire.png (GPT Image 4x2 on magenta):
the grease-fire loop in its top row (flames off a burning ghee puddle, no fuel), at one scale so
the frames do not breathe. The small flames in the bottom row are unused."""
from pathlib import Path
from PIL import Image
import numpy as np
from keying import key,components
from build_station_life import despill
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/stages/dirty_delhi/rampage';D=R/'assets/stages/dirty_delhi/rampage'
def cells(name,cols,rows):
 im=Image.fromarray(despill(np.array(key(Image.open(S/name).convert('RGB')))));w,h=im.size
 return [im.crop((round(c*w/cols),round(r*h/rows),round((c+1)*w/cols),round((r+1)*h/rows))) for r in range(rows) for c in range(cols)]
def solid(im,min_area=150):
 """Drop matte flecks; keep every sizeable piece (smoke, sparks and petals stay)."""
 a=np.array(im);keep=np.zeros(a.shape[:2],bool)
 for q in components(a[:,:,3]>24):
  if len(q)>=min_area:keep[q[:,0],q[:,1]]=True
 a[~keep]=0;return Image.fromarray(a)
def bbox(im):return Image.fromarray(np.array(im)[:,:,3]).point(lambda v:255 if v>24 else 0).getbbox()
def fit(im,scale):return im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
def sheet(frames,cols,size):
 out=Image.new('RGBA',(cols*size[0],((len(frames)+cols-1)//cols)*size[1]))
 for i,f in enumerate(frames):out.alpha_composite(f,(i%cols*size[0],i//cols*size[1]))
 return out
def place(im,size,anchor):
 """Crop to content and put it in a cell: anchor 'floor' = bottom centre on row size-20, else centred."""
 b=bbox(im);im=im.crop(b);cell=Image.new('RGBA',size)
 x=(size[0]-im.width)//2;y=size[1]-20-im.height if anchor=='floor' else (size[1]-im.height)//2
 cell.alpha_composite(im,(x,y));return cell

# Fire (device px), 4x1 of 160x128 cells on row 108, the puddle 138 wide.
src=[solid(c,40) for c in cells('fire.png',4,2)[:4]];k=138/max(bbox(c)[2]-bbox(c)[0] for c in src)
sheet([place(fit(c,k),(160,128),'floor') for c in src],4,(160,128)).save(D/'fire.png')

p=R/'tmp/review/delhi-rampage';p.mkdir(parents=True,exist_ok=True)
for name in ['fire']:
 im=Image.open(D/(name+'.png'));bg=Image.new('RGBA',im.size,'#25222b');bg.alpha_composite(im);bg.convert('RGB').save(p/f'intro-{name}.png')

