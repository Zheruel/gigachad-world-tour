#!/usr/bin/env python3
"""Register the selected GPT Image India actor sheets at a fixed bodily scale.

Only ic_* manifest entries are merged. Source rows are explicitly authored below;
no mirroring, synthesized gait poses, or per-frame body stretching is used.
"""
from pathlib import Path
import json
from collections import deque
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages'
FRAMES = ROOT / 'assets/frames'
DELHI = {'brawler', 'runner', 'enforcer', 'heavy', 'kitchen', 'docker', 'vendor'}
KEYS = ['brawler', 'runner', 'enforcer', 'heavy', 'kitchen', 'docker',
        'headset', 'operator', 'thrower', 'security', 'cabinet', 'lead', 'vendor', 'closer', 'closer_damaged']
HEIGHT = {'heavy':94,'cabinet':92,'vendor':98,'closer':96,'closer_damaged':96,'enforcer':90,'security':90,'docker':90}
# The model omitted the extra idle on some rows. Preserve the actual poses,
# rather than cutting them into a fictitious six-column grid.
SHORT_ROW = {'vendor':{1:[6,7,8,10,11],2:[12,13,15,16,17]},
             'docker':{1:[6,7,8,10,11]},'enforcer':{1:[6,7,8,10,11]},
             'headset':{1:[6,7,8,10,11]},'cabinet':{1:[6,7,8,10,11]}}

def matte(image, checker=False):
    a = np.array(image.convert('RGBA'))
    rgb = a[:,:,:3].astype(np.int16)
    r,g,b = rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    if checker:
        kill=(rgb.max(2)-rgb.min(2)<16)&(rgb.min(2)>184)
    else:
        kill=(r>g+35)&(b>g+30)&(r>95)&(b>90)
    a[kill]=0
    # Neutralize a one-pixel extraction fringe only beside the removed matte.
    edge=np.asarray(Image.fromarray(kill.astype('uint8')*255).filter(ImageFilter.MaxFilter(3)))>0
    if not checker:
        fringe=edge&~kill&(r>g+12)&(b>g+12)
        a[:,:,0][fringe]=np.minimum(r[fringe],g[fringe]+10)
        a[:,:,2][fringe]=np.minimum(b[fringe],g[fringe]+10)
    a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)

def grid(image, rows):
    # Generated sheets have uneven gutters even when a grid is requested. Trace
    # connected silhouettes instead of slicing across arbitrary grid rectangles.
    a=np.array(image);mask=a[:,:,3]>0;seen=np.zeros(mask.shape,dtype=bool)
    comps=[];height,width=mask.shape
    for y,x in zip(*np.nonzero(mask)):
        if seen[y,x]:continue
        queue=deque([(int(x),int(y))]);seen[y,x]=True;pixels=[]
        while queue:
            px,py=queue.popleft();pixels.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<width and 0<=ny<height and mask[ny,nx] and not seen[ny,nx]:
                    seen[ny,nx]=True;queue.append((nx,ny))
        if len(pixels)<1500:continue
        p=np.asarray(pixels);x0,y0=p.min(0);x1,y1=p.max(0)+1
        comps.append({'pixels':p,'box':(x0,y0,x1,y1),'cy':(y0+y1)/2})
    centers=np.array([(r+.5)*height/len(rows) for r in range(len(rows))])
    for _ in range(12):
        groups=[[] for _ in rows]
        for c in comps:groups[int(np.argmin(abs(centers-c['cy'])))].append(c)
        centers=np.array([np.mean([c['cy'] for c in g]) if g else centers[i] for i,g in enumerate(groups)])
    result={}
    for row,slots in enumerate(rows):
        items=sorted(groups[row],key=lambda c:c['box'][0])
        if len(rows[0])==6:
            slots=list(range(row*6,row*6+6)) if len(items)==6 else {1:[6,7,8,10,11],2:[12,13,15,16,17]}.get(row,slots)
        if len(items)!=len(slots):raise ValueError(f'row {row}: {len(items)} silhouettes, expected {len(slots)}; boxes={[c["box"] for c in items]}')
        for index,c in zip(slots,items):
            x0,y0,x1,y1=c['box'];cut=np.zeros((y1-y0,x1-x0,4),dtype='uint8')
            p=c['pixels'];cut[p[:,1]-y0,p[:,0]-x0]=a[p[:,1],p[:,0]]
            result[index]=Image.fromarray(cut)
    return result

def register(im, scale, walking=False, wide=False):
    bbox=im.getbbox()
    if not bbox: raise ValueError('empty pose')
    x0,y0,x1,y1=bbox
    alpha=np.asarray(im)[:,:,3]>80
    # Head/neck register the gait; attack poses are registered about the hips.
    lo=y0+int((y1-y0)*(.02 if walking else .54))
    hi=y0+int((y1-y0)*(.18 if walking else .68))
    ys,xs=np.nonzero(alpha[lo:hi])
    anchor=float(np.median(xs)) if len(xs) else (x0+x1)/2
    width=384 if wide else 288
    c=Image.new('RGBA',(width,236))
    sprite=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.NEAREST)
    c.alpha_composite(sprite,(round(width/2-anchor*scale),round(230-(y1-1)*scale)))
    return c

def main():
    manifest_path=FRAMES/'manifest.json'
    manifest=json.loads(manifest_path.read_text())
    review=ROOT/'tmp/review/india-cast';review.mkdir(parents=True,exist_ok=True)
    counts={}
    for name in KEYS:
        key='ic_'+name
        stage='dirty_delhi' if name in DELHI else 'refund_tower'
        source=SOURCE/stage/'rebuild'
        image=matte(Image.open(source/f'{key}_{"common" if name=="vendor" else "performance"}.png'),name=='brawler')
        rows=[[8,9,10],[11,12,13],[16,17,18],[19,20,21]] if name=='vendor' else [SHORT_ROW.get(name,{}).get(row,list(range(row*6,row*6+6))) for row in range(4)]
        cells=grid(image,rows)
        body_heights=[cells[i].getbbox()[3]-cells[i].getbbox()[1] for i in ([8,9,10] if name=='vendor' else range(8))]
        scale=HEIGHT.get(name,86)*2/float(np.median(body_heights))
        outdir=FRAMES/key;outdir.mkdir(exist_ok=True)
        files={}
        for i,im in cells.items():
            if name=='vendor' and i in [22,23]: continue # rejected: second person baked into pose
            frame=register(im,scale,i<8)
            path=outdir/f'performance_{i:02}.png';frame.save(path)
            files[i]=str(path.relative_to(FRAMES))
        def poses(*indices): return [files[i] for i in indices if i in files]
        states={'walk':poses(*range(8)),'run':poses(*range(8)),
                'idle':poses(8),'block':poses(10),
                'atk':poses(11,12,13),'punch':poses(11,12,13),'kick':poses(14,15),
                'hurt':poses(16,17),'stagger':poses(16,17),'fall':poses(18),'down':poses(19),
                'getup':poses(20,21,8),'grab':poses(22) or poses(11),
                'throw':poses(22,23) or poses(12,13),'ram':poses(11,12,13),
                'beam':poses(14,15,15,13),'call':poses(14,15,15),'seated':poses(20)}
        if name=='thrower':states['atk']=poses(14,15,13)
        gait_cells=grid(matte(Image.open(source/f'{key}_gait.png')),[list(range(4)),list(range(4,8))])
        gh=[im.getbbox()[3]-im.getbbox()[1] for im in gait_cells.values()]
        gait_scale=HEIGHT.get(name,86)*2/float(np.median(gh))
        for i,im in gait_cells.items():register(im,gait_scale,True).save(outdir/f'gait_{i:02}.png')
        states['walk']=states['run']=[f'{key}/gait_{i:02}.png' for i in range(8)]
        if name in ('vendor','closer','closer_damaged'):
            actions=matte(Image.open(source/f'{key}_actions.png'))
            action_cells=grid(actions,[list(range(i*3,i*3+3)) for i in range(4)])
            # The action sheet uses a different cell size. One common scale from
            # its upright poses retains crouch and leaning height naturally.
            ah=[action_cells[i].getbbox()[3]-action_cells[i].getbbox()[1] for i in [0,3,5,9,10,11]]
            action_scale=HEIGHT[name]*2/float(np.median(ah))
            for i,im in action_cells.items():
                register(im,action_scale,wide=name=='vendor').save(outdir/f'action_{i:02}.png')
            for row,state in enumerate(['ladle','utensil','rush','valve'] if name=='vendor' else ['boxing','handset','shove','call']):
                states[state]=[f'{key}/action_{i:02}.png' for i in range(row*3,row*3+3)]
        manifest[key]=states
        allfiles=list(dict.fromkeys(f for fs in states.values() for f in fs))
        for p in outdir.glob('*.png'):
            if str(p.relative_to(FRAMES)) not in allfiles:p.unlink()
        cell_w=max(Image.open(FRAMES/f).width for f in allfiles)
        sheet=Image.new('RGB',(6*cell_w,((len(allfiles)+5)//6)*262),'#202329');draw=ImageDraw.Draw(sheet)
        for n,f in enumerate(allfiles):
            img=Image.open(FRAMES/f);x=(n%6)*cell_w;y=(n//6)*262
            sheet.paste(img,(x+(cell_w-img.width)//2,y),img);draw.text((x+8,y+237),Path(f).stem,fill='white')
        sheet.save(review/f'{key}_2x.png')
        sheet.resize((sheet.width//2,sheet.height//2),Image.Resampling.NEAREST).save(review/f'{key}_native.png')
        counts[key]=len(allfiles)
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    print(json.dumps(counts,indent=2))

if __name__=='__main__':main()
