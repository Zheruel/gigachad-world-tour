"""Extract selected combat performances; keep uniform scale and planted boot anchors."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
from build_boxing_rush import largest_component
ROOT=Path(__file__).resolve().parents[2]
CHAD=ROOT/'assets/sources/production/characters/chad/combat_variety'
TRAIN=ROOT/'assets/sources/production/stages/night_train/rebuild'

def clean(im):
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(int)
    # Selected sheets have a neutral checkerboard. Warm skin/metal highlights survive.
    neutral=(rgb.min(2)>175)&(np.ptp(rgb,axis=2)<22)
    magenta=(rgb[:,:,0]>110)&(rgb[:,:,2]>85)&(rgb[:,:,1]<rgb[:,:,0]*.6)&(rgb[:,:,1]<rgb[:,:,2]*.65)
    # Flood only exterior neutral matte so teeth, shirt highlights and metal studs survive.
    candidate=Image.fromarray(((neutral|magenta|(a[:,:,3]<24))*255).astype('uint8')).copy()
    border=[(x,0) for x in range(im.width)]+[(x,im.height-1) for x in range(im.width)]+[(0,y) for y in range(im.height)]+[(im.width-1,y) for y in range(im.height)]
    for point in border:
        if candidate.getpixel(point)==255:ImageDraw.floodfill(candidate,point,128)
    # Enclosed gaps between limbs still contain both checker colours. Preserve
    # plain white highlights, but remove these isolated checkerboard islands.
    remaining=np.array(candidate)==255
    for y,x in zip(*np.where(remaining & neutral & (rgb.min(2)>205) & (rgb.max(2)<235))):
        if candidate.getpixel((int(x),int(y)))!=255:continue
        ImageDraw.floodfill(candidate,(int(x),int(y)),64)
        island=np.array(candidate)==64
        checker=(island & (rgb.min(2)>248)).sum()>8 and island.sum()>60
        ImageDraw.floodfill(candidate,(int(x),int(y)),128 if checker else 32)
    a[(np.array(candidate)==128)|magenta,3]=0
    a[a[:,:,3]<24]=0
    # Decontaminate only the semitransparent/neutral outer fringe, not opaque highlights.
    alpha=a[:,:,3];inner=np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(3)))>200
    edge=(alpha>0)&~inner
    valid=inner.copy();total=np.zeros_like(rgb,dtype=float);count=np.zeros(alpha.shape)
    for dy,dx in [(0,1),(0,-1),(1,0),(-1,0),(1,1),(-1,-1),(1,-1),(-1,1)]:
        v=np.roll(valid,(dy,dx),(0,1));v[:abs(dy) if dy>0 else 0]=False
        total+=np.roll(rgb,(dy,dx),(0,1))*v[:,:,None];count+=v
    dirty=edge&((np.ptp(rgb,axis=2)<30)|(alpha<200))&(count>0)
    a[dirty,:3]=(total[dirty]/count[dirty,None]).astype('uint8');a[a[:,:,3]==0,:3]=0
    return Image.fromarray(a)

def cells(path,cols,rows,connected=True):
    im=Image.open(path).convert('RGBA');out=[]
    for i in range(cols*rows):
        bounds=(round(i%cols*im.width/cols),round(i//cols*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows))
        if path.name=='boxing.png':
            xe=[0,312,640,943,im.width];ye=[0,354,685,1008,im.height];bounds=(xe[i%4],650 if i==10 else ye[i//4],xe[i%4+1],ye[i//4+1])
        c=clean(im.crop(bounds))
        a=np.array(c)
        if connected:a[~largest_component(a[:,:,3]>24)]=0
        c=Image.fromarray(a);out.append(c.crop(c.getbbox()))
    return out

def register(poses,scale,size,anchor='boot'):
    out=[]
    for p in poses:
        a=np.array(p)[:,:,3]>24
        ys,xs=np.where(a[max(0,p.height-18):])
        x=float(np.median(xs)) if len(xs) else p.width/2
        if anchor=='torso':
            yy,xx=np.where(a[round(p.height*.22):round(p.height*.62)]);x=float(np.median(xx))
        if anchor=='front':x=float(np.median(xs[xs>xs.max()-p.width*.23]))
        p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS)
        f=Image.new('RGBA',size);f.alpha_composite(p,(round(size[0]/2-x*scale),size[1]-7-p.height));out.append(clean(f))
    return out

def save_frames(m,key,state,frames,prefix):
    names=[]
    for i,f in enumerate(frames):
        name=f'{prefix}_{i:02}.png';path=ROOT/'assets/frames'/name;path.parent.mkdir(parents=True,exist_ok=True);f.save(path);names.append(name)
    m.setdefault(key,{})[state]=names

def review(name,frames):
    folder=ROOT/'tmp/review/combat-variety';folder.mkdir(parents=True,exist_ok=True)
    w,h=frames[0].size;sheet=Image.new('RGBA',(w*4,h*((len(frames)+3)//4)),(25,23,29,255));d=ImageDraw.Draw(sheet)
    for i,f in enumerate(frames):sheet.alpha_composite(f,(i%4*w,i//4*h));d.text((i%4*w+4,i//4*h+4),str(i),fill='white')
    sheet.save(folder/(name+'-2x.png'));sheet.resize((sheet.width//2,sheet.height//2),Image.Resampling.NEAREST).save(folder/(name+'-native.png'))

def main():
    path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text())
    p=cells(CHAD/'boxing.png',4,4);frames=register(p,184/p[0].height,(256,248),'front')
    if (CHAD/'overhand.png').exists():
        q=cells(CHAD/'overhand.png',2,1);frames+=register(q,184/q[0].height,(256,248),'front')
    save_frames(m,'player','boxing_variety',frames,'chad_boxing_variety');review('boxing',frames)
    if (TRAIN/'conductor_variety.png').exists():
        p=cells(TRAIN/'conductor_variety.png',4,4);frames=register(p,184/np.median([f.height for f in p[:4]]),(320,240))
        for state,ids in {'baton_polish':[4,5,6,7],'whistle_polish':[8,9,10],'guard_polish':[11],'stagger_polish':[12,13,14,15]}.items():
            save_frames(m,'nr_conductor',state,[frames[i] for i in ids],'nr_conductor/variety_'+state)
        review('inspector',frames)
    if (TRAIN/'conductor_stride.png').exists():
        p=cells(TRAIN/'conductor_stride.png',4,2);frames=register(p,184/np.median([f.height for f in p]),(320,240),'torso')
        save_frames(m,'nr_conductor','walk',frames,'nr_conductor/stride');review('stride',frames)
    if (TRAIN/'conductor_shield_charge.png').exists():
        p=cells(TRAIN/'conductor_shield_charge.png',4,2);frames=register(p,184/np.median([f.height for f in p[:4]]),(320,240),'torso')
        save_frames(m,'nr_conductor','shield',frames[:4],'nr_conductor/shield_variety')
        save_frames(m,'nr_conductor','charge_polish',frames[4:],'nr_conductor/charge_variety');review('shield-charge',frames)
    for source,state,cols,rows in [('inspector_finisher','inspector_pair',3,2),('seth_finisher','seth_pair',4,2)]:
        im=Image.open(TRAIN/(source+'.png')).convert('RGBA');frames=[]
        # Measured crown-to-sole reference: CHAD 377px; upright Seth 338px.
        scale=184/(377 if source=='inspector_finisher' else 338)
        for i in range(cols*rows):
            bounds=(round(i%cols*im.width/cols),round(i//cols*im.height/rows),round((i%cols+1)*im.width/cols),round((i//cols+1)*im.height/rows))
            if source=='seth_finisher' and i>=4:
                xe=[0,449,815,1370,im.width];bounds=(xe[i%4],444,xe[i%4+1],im.height)
                if i==7:bounds=(1318,444,im.width,im.height)
            if source=='inspector_finisher' and i>=3:
                xe=[0,510,995,im.width];bounds=(xe[i%3],512,xe[i%3+1],im.height)
            c=clean(im.crop(bounds))
            # Reject neighbouring-cell fragments touching the crop border.
            a=np.array(c);mask=a[:,:,3]>24
            from collections import deque
            seen=np.zeros(mask.shape,dtype=bool)
            for yy,xx in zip(*np.where(mask)):
                if seen[yy,xx]:continue
                q=deque([(yy,xx)]);seen[yy,xx]=True;pts=[];edge=False
                while q:
                    y,x=q.popleft();pts.append((y,x));edge|=x==0 or x==mask.shape[1]-1
                    for dy,dx in [(1,0),(-1,0),(0,1),(0,-1)]:
                        ny,nx=y+dy,x+dx
                        if 0<=ny<mask.shape[0] and 0<=nx<mask.shape[1] and mask[ny,nx] and not seen[ny,nx]:seen[ny,nx]=True;q.append((ny,nx))
                if len(pts)<90 or edge and len(pts)<7000:
                    for y,x in pts:a[y,x]=0
            c=Image.fromarray(a)
            b=c.getbbox();a=np.array(c)[:,:,3]>24
            # Authored belt-centre anchors; navy victim clothing must not affect CHAD registration.
            hips=[181,674,1168,180,697,1085] if source=='inspector_finisher' else [173,610,1014,1437,137,613,944,1439]
            anchor=hips[i]-bounds[0]
            c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
            f=Image.new('RGBA',(640,248));f.alpha_composite(c,(round(160-anchor*scale),round(241-b[3]*scale)));frames.append(clean(f))
        save_frames(m,'player',state,frames,'chad_'+state);review(state,frames)
    im=Image.open(TRAIN/'inspector_finisher.png').convert('RGBA')
    flight=clean(im.crop((1220,535,1536,840)));a=np.array(flight);a[~largest_component(a[:,:,3]>24)]=0;flight=Image.fromarray(a);flight=flight.crop(flight.getbbox())
    scale=184/377;flight=flight.resize((round(flight.width*scale),round(flight.height*scale)),Image.Resampling.LANCZOS)
    f=Image.new('RGBA',(320,240));f.alpha_composite(flight,((320-flight.width)//2,233-flight.height));save_frames(m,'nr_conductor','finisher_flight',[clean(f)],'nr_conductor/finisher_flight')
    im=Image.open(TRAIN/'seth_finisher.png').convert('RGBA')
    flight=clean(im.crop((1042,533,1370,733)));a=np.array(flight);a[~largest_component(a[:,:,3]>24)]=0;flight=Image.fromarray(a);flight=flight.crop(flight.getbbox())
    scale=184/338;flight=flight.resize((round(flight.width*scale),round(flight.height*scale)),Image.Resampling.LANCZOS)
    f=Image.new('RGBA',(320,224));f.alpha_composite(flight,((320-flight.width)//2,217-flight.height));save_frames(m,'nr_vikram_roof','finisher_flight',[clean(f)],'nr_vikram_roof/finisher_flight')
    desk=Image.open(TRAIN/'office_desk_broken.png').convert('RGBA')
    desk=clean(desk);desk.resize(Image.open(ROOT/'assets/stages/night_train/rebuild/office_desk.png').size,Image.Resampling.LANCZOS).save(ROOT/'assets/stages/night_train/rebuild/office_desk_broken.png')
    if (CHAD/'fragments.png').exists():
        pieces=cells(CHAD/'fragments.png',4,2,False);atlas=Image.new('RGBA',(512,256))
        for i,c in enumerate(pieces):
            scale=110/max(c.size);c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.LANCZOS)
            atlas.alpha_composite(c,(i%4*128+(128-c.width)//2,i//4*128+(128-c.height)//2))
        clean(atlas).save(ROOT/'assets/fx/arcade_fragments.png')
    targets=[ROOT/'assets/frames'/name for name in set(sum(m['nr_conductor'].values(),[]))]
    targets.append(ROOT/'assets/stages/night_train/rebuild/conductor_intro.png')
    for dest in targets:
        im=Image.open(dest).convert('RGBA');a=np.array(im);rgb=a[:,:,:3].astype(int)
        alpha=a[:,:,3];inner=np.array(Image.fromarray(alpha).filter(ImageFilter.MinFilter(5)))>220
        edge=(alpha>0)&~inner;neutral=(rgb.min(2)>105)&(np.ptp(rgb,axis=2)<30)
        total=np.zeros_like(rgb,dtype=float);count=np.zeros(alpha.shape)
        for dy in range(-3,4):
            for dx in range(-3,4):
                valid=np.roll(inner,(dy,dx),(0,1));total+=np.roll(rgb,(dy,dx),(0,1))*valid[:,:,None];count+=valid
        fix=edge&neutral&(count>0);a[fix,:3]=(total[fix]/count[fix,None]).astype('uint8');a[a[:,:,3]==0,:3]=0
        Image.fromarray(a).save(dest)
    path.write_text(json.dumps(m,indent=2)+'\n')
if __name__=='__main__':main()
