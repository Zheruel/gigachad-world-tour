"""Register the Dirty Delhi ghee intro sources onto the existing rampage sprites.

Each GPT Image sheet is keyed, despilled, scaled to its reference character and anchored the
same way as that reference, so new cells swap in place with the old ones:
  work-cook.png, work-chai.png -> vendors-working.png, 4x4 (the stall workers' loops, cook rows first)
  chai-flee.png  -> chai-flee.png, 4x2 (the chai-wallah startled, then running)
  crowd.png      -> 4x2, 256x256 (feet on row 248; the two tumbles centred)
  side-stalls.png -> side_stalls.png, 3x1 extra market stalls (mithai, butcher, paan)
  side-wreck.png -> side_wreck.png, those stalls flattened
  street-vendors.png -> street_vendors.png, 4x3 carts and pitches (work loop, cower)
  ghee-vendor.png -> ghee_vendor.png, 4x2, 256x256 (feet on row 248; ghee fireball intro); its rat
                     cell is redrawn in ghee-rat.png cell 1
  ghee-hit.png -> ghee_hit.png, 4x2 like ghee_vendor (the cook punched, flying, splatted, down)
  chopper.png    -> chopper.png, 4x2 of 384x320 (CHAD's custom chopper: ride, slide, dismount, parked);
                    chopper-ride-1..4.png replace cells 1-4 (true-alpha GPT edits of those cells, CHAD
                    redrawn on-model from his idle frames)
  stall-burn.png -> stall_burn.png, stalls.png cell 0 with the curry kitchen burnt out
  ghee-cook.png  -> ghee_cook.png, 4x1 like ghee_vendor from the source's top row (charred: kneeling,
                    wailing, toppling, face down)
"""
from pathlib import Path
from PIL import Image,ImageFilter
import numpy as np
from keying import key,components
from build_station_life import despill
from chad_frames import frame as chad_frame
from sprite_edges import alpha,edges
import chad_palette as P
from chad_palette import C as CI
R=Path(__file__).resolve().parents[2];S=R/'assets/sources/production/stages/dirty_delhi/rampage';D=R/'assets/stages/dirty_delhi/rampage'
# Same helpers as build_delhi_intros.py (that recipe runs on import).
def cells(name,cols,rows):
 im=Image.fromarray(despill(np.array(key(Image.open(S/name).convert('RGB')))));w,h=im.size
 return [im.crop((round(c*w/cols),round(r*h/rows),round((c+1)*w/cols),round((r+1)*h/rows))) for r in range(rows) for c in range(cols)]
def solid(im,min_area=150):
 a=np.array(im);keep=np.zeros(a.shape[:2],bool)
 for q in components(a[:,:,3]>24):
  if len(q)>=min_area:keep[q[:,0],q[:,1]]=True
 a[~keep]=0;return Image.fromarray(a)
def body(im,share=0):
 """The figure alone: its largest piece plus pieces at least share of it."""
 a=np.array(im);parts=components(a[:,:,3]>24);big=max(len(q) for q in parts);keep=np.zeros(a.shape[:2],bool)
 for q in parts:
  if len(q)==big or share and len(q)>=share*big:keep[q[:,0],q[:,1]]=True
 a[~keep]=0;return Image.fromarray(a)
def bbox(im):return Image.fromarray(np.array(im)[:,:,3]).point(lambda v:255 if v>24 else 0).getbbox()
def fit(im,scale):return im.resize((max(1,round(im.width*scale)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
# GPT Image paints CHAD square to camera and broader than his gameplay frames (three-quarter side
# on): CHAD standing beside the chopper is narrowed so the cut to his gameplay frames doesn't pop.
SLIM=.85
def slim(im,scale):return im.resize((max(1,round(im.width*scale*SLIM)),max(1,round(im.height*scale))),Image.Resampling.LANCZOS)
def sheet(frames,cols,size):
 out=Image.new('RGBA',(cols*size[0],((len(frames)+cols-1)//cols)*size[1]))
 for i,f in enumerate(frames):out.alpha_composite(f,(i%cols*size[0],i//cols*size[1]))
 return out
def height(im):b=bbox(im);return b[3]-b[1]
def feet(im):
 """Bottom-centre of the lowest 8% of the silhouette."""
 a=np.array(im)[:,:,3]>24;ys,xs=np.nonzero(a);y1=ys.max()+1;band=a[y1-max(2,int((y1-ys.min())*.08)):y1]
 bx=np.nonzero(band.any(0))[0];return (bx.min()+bx.max())/2,y1
def anchored(im,size,at,centre=False):
 cell=Image.new('RGBA',size);b=bbox(im);c=im.crop(b)
 if centre:x,y=(size[0]-c.width)//2,(size[1]-c.height)//2
 else:fx,fy=feet(im);x,y=round(at[0]-(fx-b[0])),round(at[1]-(fy-b[1]))
 cell.alpha_composite(c,(x,y));return cell


# The stall workers' loops (4x2 each: the curry cook, the chai-wallah) share one 4x4 sheet, cook
# rows first. One scale per man, fixed by his first pose; the cook's is the height reference for
# every other intro actor.
def loop(name,h,floor=248,src=None):
 src=src or [solid(c) for c in cells(name,4,2)];k=h/height(src[0])
 return [anchored(fit(c,k),(256,256),(128,floor)) for c in src]
def gathered(name,cols,rows,min_area=150,pre=None):
 """Cells by silhouette, not by grid line: every piece joins the cell holding its centre, so a
 prop reaching past its gutter stays whole and never leaks into the neighbour."""
 rgb=Image.open(S/name).convert('RGB');im=np.array(key(pre(rgb) if pre else rgb));im=despill(im);h,w=im.shape[:2];out=[np.zeros_like(im) for _ in range(cols*rows)]
 for q in components(im[:,:,3]>24):
  if len(q)<min_area:continue
  y,x=q.mean(0);i=min(rows-1,int(y*rows/h))*cols+min(cols-1,int(x*cols/w));out[i][q[:,0],q[:,1]]=im[q[:,0],q[:,1]]
 return [Image.fromarray(c).crop(Image.fromarray(c[:,:,3]).getbbox()) for c in out]
def steel(rgb):
 """The skimmer disc is painted lilac (the key colour bled into its perforations): grey it by
 luminance before keying. Pure key pixels (no green at all) are left for the key."""
 a=np.array(rgb).astype(int);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2];m=(r>g+25)&(b>g+8)&(g>30)
 # Only where the tint is dense (the disc), not the odd mauve speck in the apron print or towel.
 dense=np.array(Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.BoxBlur(5)))>80
 m=np.array(Image.fromarray((dense*255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)))>0;m&=(r>g+10)&(b>=g)
 v=(r*.3+g*.59+b*.11)[m];a[m,0]=v*.92;a[m,1]=v*.95;a[m,2]=v
 return Image.fromarray(a.astype(np.uint8))
def necked(cells,h,floor=248,nudge={}):
 """One scale; each pose's neck (the 9-17% band under the crown) on the cell centre."""
 k=h/height(cells[0]);out=[]
 for i,c in enumerate(cells):
  c=fit(c,k);a=np.array(c)[:,:,3]>24;y0,y1=np.nonzero(a.any(1))[0][[0,-1]];band=a[y0+int((y1-y0)*.09):y0+int((y1-y0)*.17)]
  nx=float(np.median(np.nonzero(band)[1]));fx,fy=feet(c);b=bbox(c);cell=Image.new('RGBA',(256,256))
  cell.alpha_composite(c.crop(b),(round(128-(nx-b[0]))+nudge.get(i,0),round(floor-(fy-b[1]))));out.append(cell)
 return out
# The cook: cells 1, 3 and 6 came drawn facing the other way.
cook=[c.transpose(Image.Transpose.FLIP_LEFT_RIGHT) if i in (1,3,6) else c for i,c in enumerate(gathered('work-cook.png',4,2,pre=steel))]
# The shake's outstretched arm pulls its neck band right.
sheet(necked(cook,149,nudge={4:-8})+loop('work-chai.png',136),4,(256,256)).save(D/'vendors-working.png')
sheet(loop('chai-flee.png',133),4,(256,256)).save(D/'chai-flee.png')
work=Image.open(D/'vendors-working.png')

# Customers (4x2: woman eating, chewing; man eating, chewing; both struck; both tumbling): the skinny
# man eating stands as tall as the curry vendor at work; the tumbles are centred.
src=[solid(c).transpose(Image.Transpose.FLIP_LEFT_RIGHT) for c in cells('crowd.png',4,2)];k=148/height(src[2])  # drawn facing right
sheet([anchored(fit(c,k),(256,256),(128,248),centre=i>=6) for i,c in enumerate(src)],4,(256,256)).save(D/'crowd.png')

# GPT Image paints CHAD brighter and bluer than his gameplay frames; the chopper's rider takes one
# per-channel mean/std transfer (from CHAD's pixels across the sheet, masks) onto idle_cigar6's.
def graded(frames,masks=None):
 ref,_,_=chad_frame('idle_cigar6');r=np.array(ref).astype(float);r=r[r[:,:,3]>200][:,:3]
 a=[np.array(f).astype(float) for f in frames];px=np.concatenate([(x if masks is None else x*masks[i][...,None])[(x[:,:,3]>200)&(True if masks is None else masks[i])][:,:3] for i,x in enumerate(a)])
 mu,sd,rm,rs=px.mean(0),px.std(0),r.mean(0),r.std(0)
 for x in a:x[:,:,:3]=np.clip((x[:,:,:3]-mu)/sd*rs+rm,0,255)
 return [Image.fromarray(x.astype(np.uint8)) for x in a]
# The chopper (cruise x2, power-slide brake, arms folded, leg over, standing beside it, parked x2):
# one scale for the sheet, CHAD standing (5) as tall as idle_cigar6; the bike isn't narrowed. Each
# cell's rear tyre (its lowest point and the wheel's left edge) goes on row 300, x 40 of a 384x320
# cell, so the bike never shifts between cells.
src=[solid(c) for c in cells('chopper.png',4,2)];a=np.array(src[5])[:,:,3]>24;ys=np.nonzero(a[:,120:200].any(1))[0]
k=height(chad_frame('idle_cigar6')[0])/(ys.max()-ys.min()+1);out=[]
def rear(im):
 a=np.array(im)[:,:,3]>24;w=a.shape[1];y1=np.nonzero(a[:,int(w*.1):int(w*.25)].any(1))[0].max();x0=np.nonzero(a[int(y1-.12*a.shape[0]):y1-2].any(0))[0].min();return x0,y1
for c in src:
 c=fit(c,k);x0,y1=rear(c);cell=Image.new('RGBA',(384,320));cell.alpha_composite(c,(40-x0,300-y1));out.append(cell)
# Standing beside it (5), CHAD is narrowed like the standing sheets: he is the pixels that differ
# from the parked bike (6) left of the fork; narrowed about his feet and laid over 6.
c5,c6=np.array(out[5]).astype(int),np.array(out[6]).astype(int)
d=(np.abs(c5[:,:,:3]-c6[:,:,:3]).sum(2)>90)|((c5[:,:,3]>24)&(c6[:,:,3]<=24));d&=c5[:,:,3]>24;d[:,186:]=False
q=max(components(d),key=len);m=np.zeros(d.shape,bool);m[q[:,0],q[:,1]]=True
m=np.array(Image.fromarray(m).filter(ImageFilter.MaxFilter(3)))&(c5[:,:,3]>24)
ch=c5.copy();ch[~m,3]=0;ch=Image.fromarray(ch.astype(np.uint8));b=bbox(ch);fx,_=feet(ch)
w=graded([slim(ch.crop(b),1)])[0];cell=out[6].copy();cell.alpha_composite(w,(round(fx-(fx-b[0])*SLIM),b[1]));out[5]=cell
# The rider (0-4) takes the same transfer: he is the pixels that differ
# from the parked bike (6), as one piece; the game draws him standing (5) in his gameplay frames.
for i in range(5):
 ci=np.array(out[i]).astype(int);d=(np.abs(ci[:,:,:3]-c6[:,:,:3]).sum(2)>90)|((ci[:,:,3]>24)&(c6[:,:,3]<=24));d&=ci[:,:,3]>24;d[:,200:]=False
 q=max(components(d),key=len);m=np.zeros(d.shape,bool);m[q[:,0],q[:,1]]=True;m=np.array(Image.fromarray(m).filter(ImageFilter.MaxFilter(3)))&(ci[:,:,3]>24)
 r=ci.copy();r[~m,3]=0;g=np.array(graded([Image.fromarray(r.astype(np.uint8))])[0]).astype(int);ci[m,:3]=g[m,:3];out[i]=Image.fromarray(ci.astype(np.uint8))
# The ride-in cells the game draws (1 cruise, 2 slide, 3 arms folded, 4 leg over) are replaced by
# chopper-ride-N.png: the same cells edited by GPT Image with CHAD redrawn from his idle frames.
# Each is hardened (alpha), its key-tinted chrome greyed, scaled (BOX) so its wheelbase matches the old
# cell's at k, put on the same rear-tyre anchor, edged, and CHAD's skin, jeans and hair are toned to
# the gold frames' ramps and palette (chad_palette), so he cuts cleanly to his gameplay frames.
def front(im):
 a=np.array(im)[:,:,3]>24;_,y1=rear(im);return np.nonzero(a[int(y1-.12*a.shape[0]):y1-2].any(0))[0].max()
def ungrey(im):
 a=np.array(im).astype(int);r,g,b=a[:,:,0],a[:,:,1],a[:,:,2];m=(r>g+18)&(b>g+18)&(a[:,:,3]>0)
 v=(r*.3+g*.59+b*.11)[m];a[m,0]=v*.95;a[m,1]=v*.97;a[m,2]=v;return Image.fromarray(a.astype(np.uint8))
def gold_hair():
 out=[]
 for p in CI.GOLD:
  a=np.array(Image.open(p).convert('RGBA'));m=a[...,3]>127;lab=CI.lab(a[...,:3]);L,Cc,h=CI.lch(lab);y=np.nonzero(m.any(1))[0][0]
  w=np.zeros(m.shape,bool);w[y:y+12]=True;out.append(lab[w&m&(L>=40)&(h>=40)&(h<120)&(Cc>=15)])
 return np.concatenate(out)
def on_model(im):
 """CHAD's skin, jeans and hair: those colour classes near his crown (the highest yellow piece left
 of the skull lamp, not his orange hands), joined 3 px into the piece holding it, so the tank
 flames and the lamp stay out; histogram-matched to the gold ramps and snapped to the gold palette."""
 a=np.array(im.convert('RGBA'));m=a[...,3]>127;lab=CI.lab(a[...,:3]);L,Cc,h=CI.lch(lab)
 w=m&(L>=45)&(h>=40)&(h<120)&(Cc>=15);w[:,230:]=False
 q=min((q for q in components(w) if len(q)>=30 and np.median(h[q[:,0],q[:,1]])>=66),key=lambda q:q[:,0].min())
 y=q[:,0].min();x=int(np.median(q[q[:,0]<=y+3,1]))
 skin=m&(h>=38)&(h<85)&(Cc>=25)&(L>=15);jeans=m&(h>=235)&(h<310)&(Cc>=12)&(L>=3)
 hw=np.zeros(m.shape,bool);hw[max(0,y-2):y+12,max(0,x-22):x+22]=True;hair=m&hw&(L>=35)&(h>=62)&(h<125)&(Cc>=6)
 ember=(a[...,0]>=180)&(a[...,2]<=30)&(a[...,1]<=140)  # the cigar's lit tip keeps its glow
 g=CI._grow(skin|jeans|hair,3);part=next(p for p in components(g) if ((p[:,0]==y)&(abs(p[:,1]-x)<20)).any())
 pm=np.zeros(m.shape,bool);pm[part[:,0],part[:,1]]=True;skin&=pm&~hair&~ember;jeans&=pm;hair&=pm&~ember
 sel=skin|jeans|hair;flat=lab[sel];P._R=P._R or P._ramps()
 for msk,ref in ((skin,P._R["skin"]),(jeans,P._R["jeans"]),(hair,gold_hair())):P._match(flat,msk[sel],ref)
 a[sel,:3]=P._gold_rgb()[((flat[:,None,:]-CI.gold_palette()[None])**2).sum(-1).argmin(1)];return Image.fromarray(a)
for i in (1,2,3,4):
 im=ungrey(solid(alpha(Image.open(S/f'chopper-ride-{i}.png')),400));kk=k*(front(src[i])-rear(src[i])[0])/(front(im)-rear(im)[0])
 c=im.resize((round(im.width*kk),round(im.height*kk)),Image.Resampling.BOX);x0,y1=rear(c)
 cell=Image.new('RGBA',(384,320));cell.alpha_composite(c,(40-x0,300-y1));out[i]=on_model(edges(alpha(cell)))
sheet(out,4,(384,320)).save(D/'chopper.png')
# The cook (fishing, rat, toss, samosa, horror, blown back, charred sitting, at the stove): his samosa
# offer as tall as the work loop; the flight (5) is centred.
# The work loop (work-cook.png) is drawn from this cook, so he stays the same man.
src=[solid(c) for c in cells('ghee-vendor.png',4,2)];src[1]=solid(cells('ghee-rat.png',4,2)[1]);src[2]=body(src[2]);k=height(work.crop((0,0,256,256)))/height(src[3])  # the game throws the rat
sheet([anchored(fit(c,k),(256,256),(128,248),centre=i==5) for i,c in enumerate(src)],4,(256,256)).save(D/'ghee_vendor.png')
# Charred and kneeling (embers and specks dropped), 78% as tall as he stands; the topple and the fall pivot on his toes, so
# every cell keeps cell 0's rightmost point and floor.
src=[body(c,.05) for c in cells('ghee-cook.png',4,2)[:4]];k=.78*height(work.crop((0,0,256,256)))/height(src[0]);src=[fit(c,k) for c in src]
first=anchored(src[0],(256,256),(128,248));fb=bbox(first);out=[first]
for c in src[1:]:
 b=bbox(c);cell=Image.new('RGBA',(256,256));cell.alpha_composite(c.crop(b),(fb[2]-(b[2]-b[0]),fb[3]-(b[3]-b[1])));out.append(cell)
sheet(out,4,(256,256)).save(D/'ghee_cook.png')
# The punched cook (impact, flight, tumble, splat, heap, pointing, crawl, stirring): the same scale
# as ghee_vendor (his stirring pose as tall as the work loop); the airborne cells (1-3) are centred.
src=[solid(c) for c in cells('ghee-hit.png',4,2)]
k=height(work.crop((0,0,256,256)))/height(src[7])
sheet([anchored(fit(c,k),(256,256),(128,248),centre=i in (1,2,3)) for i,c in enumerate(src)],4,(256,256)).save(D/'ghee_hit.png')
# Burnt stall: one scale from the outer posts' span against stalls.png cell 0 (bases level); the
# chai half right of the middle post (x 289) stays the original so only the kitchen changes.
ref=Image.open(D/'stalls.png').crop((0,0,560,373));src=Image.fromarray(despill(np.array(key(Image.open(S/'stall-burn.png').convert('RGB')))))
rb,sb=bbox(ref),bbox(src);src=fit(src,(rb[2]-rb[0])/(sb[2]-sb[0]));sb=bbox(src)
f=Image.new('RGBA',(560,373));f.alpha_composite(src,(rb[0]-sb[0]-1,rb[3]-sb[3]));a=np.array(f);a[:,289:]=np.array(ref)[:,289:];a[a[:,:,3]<40]=0
Image.fromarray(a).save(D/'stall_burn.png')

# Side stalls (mithai, butcher, paan): one scale for the sheet, their posts as tall as the rampage
# stalls' (237 device px), each base on row 266 of a 224x272 cell, centred.
src=Image.fromarray(despill(np.array(key(Image.open(S/'side-stalls.png').convert('RGB')))));k=237/520;out=[]
for i in range(3):
 c=solid(src.crop((i*512,0,(i+1)*512,src.height)),400);c=fit(c.crop(bbox(c)),k);cell=Image.new('RGBA',(224,272))
 cell.alpha_composite(c,((224-c.width)//2,266-c.height));out.append(cell)
sheet(out,3,(224,272)).save(D/'side_stalls.png')
# Their wrecks, same scale and base, so the flattened pile sits where the stall stood.
src=Image.fromarray(despill(np.array(key(Image.open(S/'side-wreck.png').convert('RGB')))));out=[]
for i in range(3):
 c=solid(src.crop((i*512,0,(i+1)*512,src.height)),400);c=fit(c.crop(bbox(c)),k);cell=Image.new('RGBA',(224,272))
 cell.alpha_composite(c,((224-c.width)//2,266-c.height));out.append(cell)
sheet(out,3,(224,272)).save(D/'side_wreck.png')

# Street vendors (4 columns: pani puri cart, sugarcane press, vegetable seller, pakora fryer; rows:
# work A, work B, cower). One scale: the pani puri man stands as tall as the curry vendor at work.
# Row 0 is centred on its base (row 170 of 208x176 cells); rows 1-2 are shifted onto row 0 by the
# best RGB match of their lowest 35% (cart, cloth, stove), so the props stay still between poses.
src=[solid(c,300) for c in cells('street-vendors.png',4,3)];ref0=work.crop((0,0,256,256))
k=height(ref0)/height(src[0]);src=[fit(c,k) for c in src];out=[None]*12
def placed(c,x,y):cell=Image.new('RGBA',(208,176));cell.alpha_composite(c,(x,y));return cell
for col in range(4):
 b=bbox(src[col]);x,y=(208-(b[2]-b[0]))//2-b[0],170-b[3];out[col]=placed(src[col],x,y)
 base=np.array(out[col]).astype(float);lo=int(170-(b[3]-b[1])*.35)
 for r in (1,2):
  best=None
  for dx in range(-10,11):
   for dy in range(-6,7):
    m=np.array(placed(src[r*4+col],x+dx,y+dy)).astype(float);a=(base[lo:,:,3]>24)&(m[lo:,:,3]>24)
    e=np.abs(base[lo:,:,:3]-m[lo:,:,:3]).sum(2)[a].mean()+60*((base[lo:,:,3]>24)^(m[lo:,:,3]>24)).mean()
    if best is None or e<best[0]:best=(e,dx,dy)
  out[r*4+col]=placed(src[r*4+col],x+best[1],y+best[2]);print('street',col,r,best)
sheet(out,4,(208,176)).save(D/'street_vendors.png')

p=R/'tmp/review/delhi-rampage';p.mkdir(parents=True,exist_ok=True)
for name in ['chopper','crowd','side_stalls','side_wreck','street_vendors','ghee_hit','ghee_vendor','ghee_cook','stall_burn']:
 im=Image.open(D/(name+'.png'));bg=Image.new('RGBA',im.size,'#25222b');bg.alpha_composite(im);bg.convert('RGB').save(p/f'acts-{name}.png')
