"""Register selected Delhi boss sheets using one measured anatomical scale per sheet.

Base crown-to-sole measurements: vendor 338px, operator 338px. Action
sheets are matched to those head sizes, never normalized per pose. Cropped
or airborne silhouettes retain their smaller height on a fixed 320x244 canvas.
"""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from build_combat_variety import clean
from build_india_cast import grid
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages/dirty_delhi/boss_rebuild'
OUT=ROOT/'assets/frames'

def poses(name,cols,rows):
    im=Image.open(SRC/(name+'.png')).convert('RGBA')
    a=np.array(im)
    # Tool-generated transparency leaves pure-red edge pixels on one sheet.
    kill=(a[:,:,0]>220)&(a[:,:,1]<35)&(a[:,:,2]<35)
    a[kill]=0
    im=clean(Image.fromarray(a))
    a=np.array(im);rgb=a[:,:,:3].astype(int);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    edge=(a[:,:,3]>0)&(np.array(im.getchannel('A').filter(ImageFilter.MinFilter(5)))<200)
    dirty=edge&(r>g*1.12)&(b>g*1.18)&(b>40)
    # Remove magenta contamination only in the outer two pixels. These
    # characters have no purple costume material; opaque brown shading survives.
    valid=(a[:,:,3]>220)&~dirty
    total=np.zeros_like(rgb,dtype=float);n=np.zeros(a.shape[:2])
    for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(2,0),(-2,0),(0,2),(0,-2)]:
        v=np.roll(valid,(dy,dx),(0,1));total+=np.roll(rgb,(dy,dx),(0,1))*v[:,:,None];n+=v
    fix=dirty&(n>0);a[fix,:3]=(total[fix]/n[fix,None]).astype('uint8')
    im=Image.fromarray(a)
    return grid(im,[list(range(r*cols,(r+1)*cols)) for r in range(rows)])

def registered(p,scale,index,name):
    p=p.crop(p.getbbox());a=np.array(p)[:,:,3]>24
    # Torso register uses actual body mass, not swinging feet or projecting tools.
    lo,hi=round(p.height*.30),round(p.height*.62)
    _,xs=np.where(a[lo:hi]);anchor=float(np.median(xs)) if len(xs) else p.width/2
    q=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(512,244))
    out.alpha_composite(q,(round(256-anchor*scale),238-q.height))
    return clean(out)

def cart_handle():
    # Keep the approved cart body/wheels byte-for-byte; only extract the new
    # authored handrail. Its grip sits 62 logical px above the wheel baseline.
    source=clean(Image.open(SRC/'cart_handle.png').convert('RGBA'))
    a=np.array(source);a[(a[:,:,0]>220)&(a[:,:,1]<35)&(a[:,:,2]<35)]=0
    rail=Image.fromarray(a).crop((320,40,1135,650))
    ar=np.array(rail);ar[105:,95:740]=0
    rail=Image.fromarray(ar).resize((110,82),Image.Resampling.NEAREST)
    out=Image.new('RGBA',(136,148));out.alpha_composite(clean(rail),(13,12))
    out.alpha_composite(Image.open(SRC/'cart_original.png').convert('RGBA'),(0,48))
    out.save(ROOT/'assets/stages/india/props/ic_vendorcart.png')

def main():
    cart_handle()
    mpath=OUT/'manifest.json';m=json.loads(mpath.read_text())
    specs={
      'ic_vendor': [('vendor_base',4,3,196/338),('vendor_ladle',3,5,196/224),('vendor_specials',6,4,196/237)],
      'thekedar':[('operator_base',4,3,176/338),('operator_actions',6,4,176/237),('operator_climb',4,2,176/386)]}
    mappings={
      'ic_vendor':{'walk':('vendor_base',range(8)),'run':('vendor_base',range(8)),'idle':('vendor_base',[8]),'block':('vendor_base',[9]),'hurt':('vendor_base',[10]),'stagger':('vendor_base',[10,11]),'getup':('vendor_base',[11,8]),'ladle':('vendor_ladle',range(9)),'utensil':('vendor_ladle',range(9,15)),'rush':('vendor_specials',range(6)),'valve':('vendor_specials',range(6,12)),'lunge':('vendor_specials',range(12,18)),'overhead':('vendor_specials',range(18,24)),'fall':('vendor_specials',[14]),'down':('vendor_specials',[15]),'atk':('vendor_ladle',[0,1,2]),'punch':('vendor_ladle',[0,1,2]),'ram':('vendor_specials',range(6)),'throw':('vendor_ladle',range(9,15)),'grab':('vendor_specials',[0]),'beam':('vendor_specials',range(6,12)),'call':('vendor_base',[8]),'seated':('vendor_base',[11]),'kick':('vendor_specials',range(18,24))},
      'thekedar':{'walk':('operator_base',range(8)),'run':('operator_base',range(8)),'idle':('operator_base',[9]),'cocky':('operator_base',[8]),'block':('operator_base',[10]),'hurt':('operator_base',[11]),'stagger':('operator_actions',[18,19,20]),'cower':('operator_actions',[18,19,20]),'wrench':('operator_actions',range(6)),'atk':('operator_actions',range(6)),'punch':('operator_actions',range(6)),'toolthrow':('operator_actions',range(6,12)),'throw':('operator_actions',range(6,12)),'restart':('operator_actions',[12,13,14]),'call':('operator_actions',[16,17]),'fall':('operator_base',[11]),'down':('operator_actions',[22]),'getup':('operator_actions',[23,21]),'climbdown':('operator_climb',range(4)),'seated':('operator_climb',[4,5]),'scared':('operator_climb',[7])}}
    review=ROOT/'tmp/review/delhi-boss-cast';review.mkdir(parents=True,exist_ok=True)
    for key,sheets in specs.items():
      files={};allframes=[]
      for name,cols,rows,scale in sheets:
        if not (SRC/(name+'.png')).exists():continue
        pp=poses(name,cols,rows)
        for i,p in pp.items():
          fr=registered(p,scale,i,name);path=OUT/key/f'rebuild_{name}_{i:02}.png';path.parent.mkdir(exist_ok=True);fr.save(path)
          files[(name,i)]=str(path.relative_to(OUT));allframes.append((name+' '+str(i),fr))
      states={state:[files[(sheet,i)] for i in ids if (sheet,i) in files] for state,(sheet,ids) in mappings[key].items()}
      m[key]={**m.get(key,{}),**{k:v for k,v in states.items() if v}}
      for bg,label in [('#202027','dark'),('#ddd7cb','light')]:
        contact=Image.new('RGB',(512*6,268*((len(allframes)+5)//6)),bg);d=ImageDraw.Draw(contact)
        for i,(name,fr) in enumerate(allframes):
          x=i%6*512;y=i//6*268;contact.paste(fr,(x,y),fr);d.line((x,y+238,x+512,y+238),fill='#777777');d.text((x+3,y+248),name,fill='white' if label=='dark' else 'black')
        contact.save(review/f'{key}_{label}_2x.png');contact.resize((contact.width//2,contact.height//2),Image.Resampling.NEAREST).save(review/f'{key}_{label}_native.png')
      print(key,len(files),'frames')
    mpath.write_text(json.dumps(m,indent=2)+'\n')
if __name__=='__main__':main()
