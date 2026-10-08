"""Clear the baked chimney plumes from the river and industry vistas so js/vista_smoke.js can animate them.

Each plume corridor is refilled with the plate's own sky texture from a clean horizontal offset
(high frequencies) over a masked low-pass of the surrounding sky (colour), so the painted
dab pattern stays identical in style. Stacks and skyline are untouched.
Input: assets/sources/.../vista_<kind>_plumes.png (the original plates). Output: runtime vista_<kind>.png.
Also bakes the GPT puff sheet (8 painted soot puffs, sun rim upper-left) into vista_smoke.png: one column per
puff, one 72 px row per size in SIZES (plate pixels = physical pixels on the RS canvas) (keep in step with js/vista_smoke.js), binary alpha.
"""
from pathlib import Path
import numpy as np
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages/night_train/rebuild/vista_{}_plumes.png'
OUT=ROOT/'assets/stages/night_train/rebuild/vista_{}.png'
PUFFS=ROOT/'assets/sources/production/stages/night_train/rebuild/vista_smoke_puffs.png'
SHEET=ROOT/'assets/stages/night_train/rebuild/vista_smoke.png'
SIZES=[6,8,10,12,14,16,18,20,22,24,28,32,36,40,46,52,60,68];CELL=72
# Plate-pixel polylines (mouth first) with corridor radii; the mouth y bounds the mask from below.
PLATES={'river':[
 dict(pts=[(561,154,5),(561,142,8),(567,128,12),(581,115,16),(598,99,19),(617,84,22),(638,69,24),(657,52,24),(670,35,21),(680,18,17),(686,4,13)]),
 dict(pts=[(191,198,4),(184,186,7),(175,172,8),(163,158,9),(150,146,9),(138,136,8)]),
 dict(pts=[(961,172,4),(955,160,8),(945,150,10),(930,140,11),(915,130,10),(902,121,9)]),
 dict(pts=[(1133,176,4),(1128,162,8),(1119,147,10),(1106,134,11),(1092,121,11),(1082,108,10),(1076,96,8)]),
 dict(pts=[(1381,184,4),(1376,172,7),(1366,161,9),(1351,152,10),(1336,141,10),(1321,129,9)]),
 dict(pts=[(1494,174,4),(1490,161,8),(1481,150,10),(1466,138,11),(1452,126,11),(1442,115,9)]),
],'industry':[
 dict(pts=[(168,139,3),(167,132,4),(165,126,4)]),
 dict(pts=[(293,99,3),(293,91,6),(291,81,7),(288,70,7)]),
 dict(pts=[(706,117,4),(705,106,7),(695,97,9),(680,88,11),(665,79,11),(655,70,9)]),
 dict(pts=[(1062,158,3),(1059,147,7),(1050,137,10),(1036,128,11),(1022,121,10),(1012,114,8)]),
 dict(pts=[(1453,196,3),(1450,188,4),(1444,180,5),(1439,174,4)]),
 dict(pts=[(1464,196,3),(1468,188,4),(1474,182,4)]),
]}
def box(a,r):
    """Separable box blur (edge-clamped) on HxW[xC] float arrays."""
    for ax in (0,1):
        p=np.pad(a,[(r+1,r) if i==ax else (0,0) for i in range(a.ndim)],mode='edge')
        c=np.cumsum(p,axis=ax)
        a=(np.take(c,range(2*r+1,c.shape[ax]),axis=ax)-np.take(c,range(0,c.shape[ax]-2*r-1),axis=ax))/(2*r+1)
    return a
def lowpass(img,w,r=9):
    num=img*w[...,None];den=w.copy()
    for _ in range(3):num=box(num,r);den=box(den,r)
    return num/np.maximum(den,1e-4)[...,None]
def corridor(shape,pts):
    h,w=shape;yy,xx=np.mgrid[0:h,0:w].astype(float);d=np.full(shape,1e9)
    for (x0,y0,r0),(x1,y1,r1) in zip(pts,pts[1:]):
        vx,vy=x1-x0,y1-y0;t=np.clip(((xx-x0)*vx+(yy-y0)*vy)/(vx*vx+vy*vy),0,1)
        dist=np.hypot(xx-(x0+t*vx),yy-(y0+t*vy))-(r0+t*(r1-r0));d=np.minimum(d,dist)
    d[yy>pts[0][1]+1]=1e9
    return d
def clear(kind):
    PLUMES=PLATES[kind]
    img=np.asarray(Image.open(str(SRC).format(kind)).convert('RGB')).astype(float);h,w,_=img.shape
    dists=[corridor((h,w),p['pts']) for p in PLUMES]
    hole=np.min(dists,axis=0)<=2
    low=lowpass(img,(~hole).astype(float))
    out=img.copy()
    for p,d in zip(PLUMES,dists):
        ys,xs=np.nonzero(d<=2)
        # Clean horizontal offset whose sky colour best matches the hole's surroundings.
        best=None
        for dx in p.get('dx',[s*v for v in range(50,260,6) for s in (1,-1)]):
            sx=xs+dx
            if sx.min()<0 or sx.max()>=w or hole[ys,sx].any():continue
            err=np.abs(low[ys,sx]-low[ys,xs]).mean()+.02*abs(dx)
            if best is None or err<best[0]:best=(err,dx)
        if best is None:raise SystemExit(f'no clean offset for plume at {p["pts"][0]}')
        sx=xs+best[1]
        fill=img[ys,sx]-low[ys,sx]+low[ys,xs]
        a=np.clip((2-d[ys,xs])/3,0,1)[:,None]  # 1 inside, ramps over the outer 2-3px
        out[ys,xs]=out[ys,xs]*(1-a)+fill*a
    Image.fromarray(np.clip(out+.5,0,255).astype(np.uint8)).save(str(OUT).format(kind))
def puffs():
    src=Image.open(PUFFS).convert('RGBA');cw,ch=src.width//4,src.height//2
    sheet=Image.new('RGBA',(8*CELL,len(SIZES)*CELL))
    for i in range(8):
        cell=src.crop((i%4*cw,i//4*ch,(i%4+1)*cw,(i//4+1)*ch));cell=cell.crop(cell.getbbox())
        for j,size in enumerate(SIZES):
            k=size/max(cell.size);w,h=max(1,round(cell.width*k)),max(1,round(cell.height*k))
            a=np.asarray(cell.convert('RGBa').resize((w,h),Image.Resampling.LANCZOS).convert('RGBA')).copy()
            a[...,3]=np.where(a[...,3]>=112,255,0)
            sheet.alpha_composite(Image.fromarray(a),(i*CELL+(CELL-w)//2,j*CELL+(CELL-h)//2))
    sheet.save(SHEET)
if __name__=='__main__':
    for kind in PLATES:clear(kind)
    puffs()
