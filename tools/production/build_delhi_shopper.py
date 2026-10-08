"""Build the Delhi shopper's coherent 16-pose source from approved GPT art.

The fixed upper figure, carrying hand and groceries retain their approved pixels.
Only generated trousers/legs change; masks remove each pose's repainted bag/kurta.
Writes the canonical 4×4 source and native previews under tmp/review/.
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image,ImageDraw

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'tools/production'))
from sprite_edges import alpha,edges
from build_delhi_life_river import box_scale, coherent_cells
from keying import components

BASE=ROOT/'assets/sources/production/stages/dirty_delhi/market_life/walk16/shopper_inputs'
OUT=ROOT/'tmp/review/delhi-shopper-build';OUT.mkdir(parents=True,exist_ok=True)


def trim(path):
    a=np.array(alpha(Image.open(path)));ys,xs=np.where(a[:,:,3]>0)
    return a[ys.min():ys.max()+1,xs.min():xs.max()+1]


def poly(shape,p):
    im=Image.new('1',(shape[1],shape[0]));ImageDraw.Draw(im).polygon(p,fill=1)
    return np.array(im)


def input_path(name):
    n=8 if name=='opposite-key' else int(name.split('-')[1])
    return BASE/f'pose{n:02d}.png'


ref=trim(BASE/'upper.png')
mask=np.indices(ref.shape[:2])[0]<=348
mask|=poly(ref.shape,[(178,286),(276,284),(340,433),(250,451),(213,372),(180,360)])
rgb=ref[:,:,:3].astype(float);r,g,b=rgb.transpose(2,0,1)
bag=poly(ref.shape,[(49,348),(194,348),(219,418),(225,514),(186,544),(119,543),(72,511),(60,464),(49,423)])
bag&=~((b>r*1.03)&(g>r*1.06))  # keep the produce and bag; exclude the old trousers behind it
mask|=bag
mask|=poly(ref.shape,[(155,257),(194,254),(180,334),(191,349),(194,371),(182,384),(164,384),(143,368),(141,350),(153,332)])
mask|=poly(ref.shape,[(191,340),(226,342),(253,399),(270,440),(218,442),(213,405),(199,380)])
mask|=poly(ref.shape,[(6,287),(137,291),(119,347),(95,375),(79,403),(45,390),(21,360),(10,332)])
upper=ref.copy();upper[~mask]=0
Image.fromarray(upper).save(OUT/'upper-approved.png')

ref_hsv=np.array(Image.fromarray(ref[:,:,:3]).convert('HSV')).astype(float)
yy,xx=np.indices(ref.shape[:2])
ref_teal=(yy>455)&(yy<625)&(g>r*1.05)&(b>r*.98)&(ref[:,:,3]>0)&(np.maximum.reduce([r,g,b])>45)
target_h=np.median(ref_hsv[:,:,0][ref_teal]);target_s=np.median(ref_hsv[:,:,1][ref_teal])


def palette(c):
    """Match trousers' teal hue/saturation, retaining original value, outlines and gold."""
    r,g,b=c[:,:,:3].astype(float).transpose(2,0,1)
    teal=(g>r*1.05)&(b>r*.98)&(c[:,:,3]>0)&(np.maximum.reduce([r,g,b])>45)
    hsv=np.array(Image.fromarray(c[:,:,:3]).convert('HSV')).astype(float)
    hsv[:,:,0][teal]=(hsv[:,:,0][teal]+target_h-np.median(hsv[:,:,0][teal]))%256
    hsv[:,:,1][teal]=np.clip(hsv[:,:,1][teal]+target_s-np.median(hsv[:,:,1][teal]),0,255)
    rgb=np.array(Image.fromarray(hsv.astype(np.uint8),'HSV').convert('RGB'))
    out=c.copy();out[:,:,:3][teal]=rgb[teal];return out

# Trimmed source coordinates; the two-leg silhouette begins behind the kurta hem.
# A conservative bag mask lies entirely under the shared original bag after registration.
CFG={
 'opposite-key':dict(hem=(494,798),floor=1183,cut=[(0,768),(374,768),(433,816),(564,787),(753,785),(753,1184),(0,1184)],bag=[(141,758),(351,756),(344,938),(219,951),(141,911)]),
 'single-2':dict(hem=(484,797),floor=1157,cut=[(0,780),(368,780),(417,815),(558,785),(637,780),(637,1158),(0,1158)],bag=[(146,766),(356,756),(366,914),(300,930),(220,918),(153,884)]),
 'single-6':dict(hem=(454,746),floor=1082,cut=[(0,758),(371,758),(393,771),(521,738),(654,738),(654,1083),(0,1083)],bag=[(120,737),(341,736),(338,879),(224,894),(126,850)]),
 'single-10':dict(hem=(450,710),floor=1110,cut=[(0,706),(344,706),(392,719),(514,702),(574,702),(574,1111),(0,1111)],bag=[(123,694),(324,687),(330,839),(262,856),(135,818)]),
 'single-14':dict(hem=(472,748),floor=1103,cut=[(0,760),(377,760),(407,769),(543,740),(685,740),(685,1104),(0,1104)],bag=[(112,729),(332,728),(336,894),(220,906),(124,850)]),
}

# Additional individual GPT poses. Their front kurta hem is the leg-registration landmark.
for phase,(hx,hy) in {1:(449,721),3:(448,775),4:(461,733),5:(433,790),7:(472,738),9:(479,767),11:(461,733),12:(442,745),13:(491,789),15:(497,759)}.items():
    name=f'single-{phase}';c=trim(input_path(name));h,w=c.shape[:2]
    r,g,b=c[:,:,:3].astype(float).transpose(2,0,1);yy,xx=np.indices((h,w))
    cream=(r>g*.96)&(g>b*1.05)&(r>80)&(b>40)&(yy>hy-160)&(yy<hy+250)&(xx<hx-75)
    comp=max(components(cream),key=len);ys,xs=comp[:,0],comp[:,1]
    bag=[(max(0,int(xs.min())-12),int(ys.min())-12),(int(xs.max())+12,int(ys.min())-12),(int(xs.max())+12,int(ys.max())+12),(max(0,int(xs.min())-12),int(ys.max())+12)]
    CFG[name]=dict(hem=(hx,hy),floor=h-1,cut=[(0,hy-30),(hx-90,hy-30),(hx-65,hy+15),(hx+70,hy-15),(w,hy-15),(w,h),(0,h)],bag=bag)

# Overlap the generated upper trousers beneath the original split-kurta side panel.
for cfg in CFG.values():
    cfg['cut'][0]=(0,cfg['hem'][1]-30)
    cfg['cut'][1]=(cfg['hem'][0]-90,cfg['hem'][1]-30)

# Cut below each actual generated hem, eliminating its duplicate gold border.
HEMS={
 'opposite-key':((438,818),(564,795)),
 'single-1':((391,773),(505,723)), 'single-2':((419,817),(558,789)),
 'single-3':((392,779),(508,754)), 'single-4':((402,760),(527,725)),
 'single-5':((389,794),(515,755)), 'single-7':((443,776),(577,748)),
 'single-9':((403,774),(524,742)), 'single-10':((392,720),(514,708)),
 'single-11':((402,760),(527,725)), 'single-12':((410,737),(516,710)),
 'single-13':((434,800),(563,765)), 'single-14':((409,771),(543,745)),
 'single-15':((453,780),(592,742)),
}
for phase,(a,b,bag) in {
 6:((431,784),(575,754),[(100,630),(366,630),(366,925),(100,925)]),
 7:((441,786),(593,750),[(102,640),(369,640),(369,813),(344,848),(297,878),(231,900),(191,889),(151,875),(122,845),(102,819)]),
 14:((453,827),(602,796),[(100,690),(397,690),(397,973),(100,973)]),
}.items():
    name=f'single-{phase}';path=input_path(f'single-{phase}');c=trim(path)
    CFG[name]=dict(hem=(0,0),floor=c.shape[0]-1,path=path,bag=bag)
    HEMS[name]=(a,b)
for name,(a,b) in HEMS.items():
    cfg=CFG[name];c=trim(cfg.get('path',input_path(name)));h,w=c.shape[:2]
    cfg['hem']=((a[0]+b[0])/2,(a[1]+b[1])/2)
    cfg['cut']=[(0,a[1]+3),(a[0],a[1]+3),(b[0],b[1]+3),(w,b[1]+3),(w,h),(0,h)]

frames=[];names=[]
for name in ['contact-A2',*[f'single-{n}' for n in range(1,8)],'opposite-key',*[f'single-{n}' for n in range(9,16)]]:
    if name=='contact-A2':
        result=Image.fromarray(ref)
        lower=ref.copy();lower[mask]=0;Image.fromarray(lower).save(OUT/f'lower-{name}.png')
    else:
        cfg=CFG[name];c=trim(cfg.get('path',input_path(name)))
        keep=poly(c.shape,cfg['cut']);keep[poly(c.shape,cfg['bag'])]=False
        legs=c.copy();legs[~keep]=0;legs=palette(legs)
        # One uniform scale per generated figure; no anisotropic stretching or drawn anatomy.
        s=(690-438)/(cfg['floor']-cfg['hem'][1])
        scaled=box_scale(legs,s)
        xy=(round(297-cfg['hem'][0]*s),round(438-cfg['hem'][1]*s))
        result=Image.new('RGBA',(540,710));result.alpha_composite(Image.fromarray(scaled),xy)
        result.save(OUT/f'lower-{name}.png')
        result.alpha_composite(Image.fromarray(upper))
        Image.fromarray(legs).save(OUT/f'legs-{name}.png')
    result.save(OUT/f'candidate-{name}.png')
    native=edges(Image.fromarray(box_scale(np.array(result),160/690)))
    cell=Image.new('RGBA',(136,168));cell.alpha_composite(native,(0,4))
    frames.append(cell);names.append(name)

board=Image.new('RGBA',(136*8,168*2),(36,34,29,255));d=ImageDraw.Draw(board)
strip=Image.new('RGBA',(136*16,168))
for i,im in enumerate(frames):
    xy=(i%8*136,i//8*168);board.alpha_composite(im,xy);d.text((xy[0]+2,xy[1]),str(i),fill='white');strip.alpha_composite(im,(i*136,0))
strip.save(OUT/'shopper16-trial.png')
source=Image.new('RGBA',(2480,3160))
for i,name in enumerate(names):
    source.alpha_composite(Image.open(OUT/f'candidate-{name}.png'),(i%4*620+40,i//4*790+40))
source.save(BASE.parent/'shopper.png',optimize=True)
source.save(OUT/'shopper16-source.png',optimize=True)
coherent_cells(BASE.parent/'shopper.png',16,rows=4)
board.save(OUT/'board-2x.png');board.resize((board.width//2,168),Image.Resampling.NEAREST).save(OUT/'board-native.png')
board.resize((board.width*2,672),Image.Resampling.NEAREST).save(OUT/'board-4x.png')
print('shopper: 16 coherent source poses, 4×4 grid; native previews:',OUT)
