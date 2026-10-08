"""Puri Pop finisher art: Pappu's chilli cram and inflation, CHAD's cram and cigar light, and the burst props.
Sources (GPT Image, see AGENTS.md) live beside the other Pappu sources; this registers them at gameplay scale."""
from pathlib import Path
import json,fcntl,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
sys.path.insert(0,str(Path(__file__).parent))
from sprite_edges import alpha,edges
from keying import components
from sprite_palette import match_chad_skin
from chad_palette import lock
ROOT=Path(__file__).resolve().parents[2];SRC=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu'
FRAMES=ROOT/'assets/frames';PROPS=ROOT/'assets/stages/dirty_delhi/vendor/puri_props.png';POP=ROOT/'assets/stages/dirty_delhi/vendor/puri_pop.png';PROOF=ROOT/'tmp/review/pappu-puri-art'
PAPPU_H=262   # the new poses are leaner than demon_idle3 (242 px); a little taller keeps his mass
CHAD_H=178    # chad_idle_cigar1 standing height inside his 192 px canvas
SANDAL_W=54   # Pappu's sandal length in his idle frame

def parts(path,min_area=1500):
 im=alpha(Image.open(path).convert('RGBA'),128);a=np.array(im);out=[]
 for p in components(a[:,:,3]>127):
  if len(p)<min_area:continue
  y0,x0=p.min(0);y1,x1=p.max(0)+1;c=np.zeros_like(a);c[p[:,0],p[:,1]]=a[p[:,0],p[:,1]]
  out.append((int(x0),int(y0),int(y1),Image.fromarray(c).crop((x0,y0,x1,y1))))
 return im,out

def feet_x(im):
 # Centre of the bottom 12% of the figure: the sandals/boots stay put while the body changes shape.
 a=np.array(im.getchannel('A'))>127;yy,xx=np.nonzero(a);return float(xx[yy>=yy.max()-max(3,(yy.max()-yy.min())*.12)].mean())

def scaled(im,k):return im.resize((max(1,round(im.width*k)),max(1,round(im.height*k))),Image.Resampling.LANCZOS)

def pappu():
 _,ps=parts(SRC/'puri-inflate-v1.png');ps.sort(key=lambda p:p[0]);assert len(ps)==5,len(ps)
 ground=max(p[2] for p in ps[:2]);k=PAPPU_H/(ps[1][2]-ps[1][1])
 _,w=parts(SRC/'puri-winded-v1.png');w=max(w,key=lambda p:p[3].width*p[3].height)
 poses=[(scaled(w[3],(ps[0][2]-ps[0][1])*k/w[3].height),0)]+[(scaled(p[3],k),round((ground-p[2])*k)) for p in ps]
 # The cracked pose without his towel (it tears off on screen as the ball swells): an edit of pose 5,
 # fitted to the original's width so the ball keeps its size.
 nt=SRC/'puri-cracked-notowel-v1.png'
 if nt.exists():
  _,q=parts(nt);q=max(q,key=lambda p:p[3].width*p[3].height)[3];poses[5]=(scaled(q,poses[5][0].width/q.width),poses[5][1])
 files=[];report=[]
 for i,(im,lift) in enumerate(poses):
  im=alpha(im,128);fx=feet_x(im);o=Image.new('RGBA',(560,440));at=(round(280-fx),432-lift-im.height);o.alpha_composite(im,at);o=edges(o)
  name=f'ic_vendor/demon_puri_{i:02}.png';o.save(FRAMES/name);files.append(name);report.append({'i':i,'lift':lift/2,'bbox':o.getbbox()})
 return files,report

def single(path):
 # One pose per source (edits of chad_sidle1): the whole opaque figure, flames and smoke included.
 im=alpha(Image.open(path).convert('RGBA'),128);return im.crop(im.getbbox())

def keep_props(src,locked):
 # The palette lock knows only CHAD's colours: chilli reds, flames and stems keep their generated colours.
 a=np.array(src).astype(float);r,g,b=a[...,0]+1,a[...,1],a[...,2]
 prop=(a[...,3]>0)&(((g/r<.25)&(r>120))|((b/r<.15)&(r>235)&(g>120))|((g>r*1.05)&(g>b*1.2)))
 prop=(np.array(Image.fromarray((prop*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)))>0)&(a[...,3]>0)
 out=np.array(locked);out[prop]=np.array(src)[prop];return Image.fromarray(out)

def legs(im):
 # Belt-to-sole height: the jeans are untouched by these arm edits, so they fix each edit's scale.
 a=np.array(im.convert('RGBA')).astype(int);blue=(a[...,3]>127)&(a[...,2]>a[...,0]+25);rows=np.nonzero(blue.sum(1)>=8)[0]
 return np.nonzero(a[...,3].max(1)>127)[0].max()-rows.min()+1

def chad_sheet(srcs,name):
 # Each source is a GPT edit of an approved frame (only the arms change), scaled so its jeans match that
 # frame. Raw-registered (aiframes copies these states unscaled): raised arms need head room above the
 # 192 px canvas, feet sit 3 logical px up and the lower-body centroid is centred, as normalize() does.
 ims=[]
 for src,base in srcs:p=single(SRC/src);ims.append(alpha(scaled(p,legs(Image.open(FRAMES/base))/legs(p)),128))
 H=max(192,max(i.height for i in ims)+10);files=[]
 for i,im in enumerate(ims):
  a=np.array(im.getchannel('A'))>16;yy,xx=np.nonzero(a);lo=yy>=yy.max()-(yy.max()-yy.min())*.55;fx=float(xx[lo].mean())
  W=2*round(max(fx,im.width-fx))+4;o=Image.new('RGBA',(W,H));o.alpha_composite(im,(round(W/2-fx),H-6-im.height));o=edges(o);o=keep_props(o,lock(match_chad_skin(o)))   # gold skin, jeans and sel-out (chad_identity_check)
  f=f'chad_{name}{i+1}.png';o.save(FRAMES/f);files.append(f)
 return files

# Cram: grab-and-load and cram are edits of chad_shook3, the release of chad_sidle1. Cigar: catch and flick are
# edits of chad_idle_cigar6, the light of chad_idle_cigar4 (the chilli replaces his Zippo); he then settles on idle_cigar6 itself.
def chad():return (chad_sheet([('puri-chad-cram1-v3.png','chad_shook3.png'),('puri-chad-cram2-v3.png','chad_shook3.png'),('puri-chad-cram3-v3.png','chad_sidle1.png')],'puri_cram'),
 chad_sheet([('puri-chad-cigar1-v2.png','chad_idle_cigar6.png'),('puri-chad-cigar2-v2.png','chad_idle_cigar4.png'),('puri-chad-cigar3-v2.png','chad_idle_cigar6.png')],'puri_cigar'))

def props():
 # 4x2 sheet, 128 px cells, each prop centred: sandal side, sandal top, towel flying, towel down,
 # crust large, crust small, lungi scrap, chillies.
 _,ps=parts(SRC/'puri-props-v1.png',400);rows=sorted(ps,key=lambda p:(p[1]+p[2])/2);top,bottom=sorted(rows[:4],key=lambda p:p[0]),sorted(rows[4:8],key=lambda p:p[0])
 k=SANDAL_W/top[0][3].width;sheet=Image.new('RGBA',(512,256))
 for i,p in enumerate(top+bottom):
  im=edges(alpha(scaled(p[3],k),128));im.thumbnail((124,124));sheet.alpha_composite(im,(i%4*128+(128-im.width)//2,i//4*128+(128-im.height)//2))
 sheet.save(PROPS);return k

def pop():
 # Six equal cells around one burst centre: keep the cells' common scale and the strip's vertical centre.
 src=SRC/'puri-pop-v1.png'
 if not src.exists():return None
 im=alpha(Image.open(src).convert('RGBA'),96);W,H=im.size;cw=W/6;a=np.array(im.getchannel('A'))>0;yy,_=np.nonzero(a);cy=(yy.min()+yy.max())/2;side=round(min(cw,H));out=Image.new('RGBA',(256*6,256))
 for i in range(6):
  x0=round(i*cw+cw/2-side/2);y0=round(cy-side/2);cell=Image.new('RGBA',(side,side));cell.alpha_composite(im.crop((max(0,x0),max(0,y0),min(W,x0+side),min(H,y0+side))),(max(0,-x0),max(0,-y0)))
  out.alpha_composite(cell.resize((256,256),Image.Resampling.LANCZOS),(i*256,0))
 out.save(POP);return out.size

def main():
 PROOF.mkdir(parents=True,exist_ok=True);pf,report=pappu();cf,gf=chad();pk=props();pop()
 with open(FRAMES/'.manifest.lock','a') as lk:
  fcntl.flock(lk,fcntl.LOCK_EX);p=FRAMES/'manifest.json';m=json.loads(p.read_text())
  m['ic_vendor']['demon_puri']=pf;m['player']['puri_cram']=cf;m['player']['puri_cigar']=gf;p.write_text(json.dumps(m,indent=2)+'\n')
 # Proof: every pose at gameplay scale beside CHAD idle and the approved standing Pappu.
 sheet=Image.new('RGBA',(8*200,260),'#2a2c33');d=ImageDraw.Draw(sheet)
 ref=Image.open(FRAMES/'ic_vendor/demon_idle3_00.png');sheet.alpha_composite(ref.resize((280,220)),(-40,40));x=200
 for f in pf:sheet.alpha_composite(Image.open(FRAMES/f).resize((280,220)),(x-40,40));d.text((x,4),f.split('/')[-1],fill='white');x+=200
 sheet.convert('RGB').save(PROOF/'pappu.png');print(json.dumps({'pappu':report,'chad':cf+gf,'propScale':pk}))
if __name__=='__main__':main()
