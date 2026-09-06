"""Process selected GPT Image artwork; keyed windows and registered animation frames."""
from pathlib import Path
import json
from collections import deque
import numpy as np
from PIL import Image, ImageEnhance, ImageOps

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/night_train/rebuild'
OUT = ROOT / 'assets/stages/night_train/rebuild'
PLATES = ['yard','hall','platform','general','sleeper','pantry','ac','private','private_damaged','roof','rural','industry','river']
CAST = ['vikram','vikram_roof']

def keyed(im):
    a=np.array(im.convert('RGBA')); r,g,b=[a[:,:,i].astype(float) for i in range(3)]
    mask=(r>170)&(b>170)&(g<r*.58)&(g<b*.58)&(r+b>g*3.6)
    mask|=(g>170)&(g>r*2)&(g>b*2)
    a[mask,3]=0
    return Image.fromarray(a)

def cell(im,i,cols=4,rows=3):
    w,h=im.size; x0=round(i%cols*w/cols); x1=round((i%cols+1)*w/cols)
    y0=round(i//cols*h/rows); y1=round((i//cols+1)*h/rows)
    # The source's white grid gutters are not part of the character.
    c=keyed(im.crop((x0+12,y0+12,x1-12,y1-12)))
    # Some generated grids drift relative to the nominal cell boundaries.
    # Remove only long, neutral-white connected grid fragments; never bright
    # clothing highlights, eyes, metal, or disconnected weapon silhouettes.
    a=np.array(c);rgb=a[:,:,:3].astype(int)
    white=(rgb.min(2)>225)&((rgb.max(2)-rgb.min(2))<12)&(a[:,:,3]>0)
    h,w=white.shape
    for y,x in zip(*np.where(white)):
        if not white[y,x]:continue
        q=deque([(int(x),int(y))]);white[y,x]=False;points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and white[ny,nx]:white[ny,nx]=False;q.append((nx,ny))
        if len(points)>40 and max(max(p[0] for p in points)-min(p[0] for p in points),max(p[1] for p in points)-min(p[1] for p in points))>64:
            for px,py in points:a[py,px,3]=0
    return Image.fromarray(a)

def crop(im):
    box=im.getbbox()
    return im.crop(box) if box else Image.new('RGBA',(1,1))

def clean_actor(im):
    a=np.array(im);mask=a[:,:,3]>16;h,w=mask.shape;groups=[]
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]:continue
        q=deque([(int(x),int(y))]);mask[y,x]=False;points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;q.append((nx,ny))
        groups.append(points)
    if not groups:return im
    largest=max(map(len,groups))
    for points in groups:
        if len(points)==largest:continue
        xs=[p[0] for p in points];ys=[p[1] for p in points]
        edge=min(xs)<22 or max(xs)>w-22 or min(ys)<15
        if len(points)<largest*.012 or (edge and len(points)<largest*.2):
            for x,y in points:a[y,x,3]=0
    return Image.fromarray(a)

def register(cells,size=(256,224),body_height=180):
    # One scale for the family, not one height per pose: crouches stay short.
    cells=[crop(clean_actor(c)) for c in cells]
    scale=body_height/np.median([c.height for c in cells[:4]])
    result=[]
    for i,c in enumerate(cells):
        c=c.resize((max(1,round(c.width*scale)),max(1,round(c.height*scale))),Image.Resampling.NEAREST)
        a=np.array(c); mask=a[:,:,3]>32
        # Register standing/walking on the stable upper torso. Extreme attack and
        # fallen poses use their silhouette centre so weapons remain in frame.
        ys,xs=np.where(mask[:max(1,int(c.height*.40))])
        anchor=float(np.median(xs)) if len(xs) and i not in (8,10,11) else c.width/2
        out=Image.new('RGBA',size);out.alpha_composite(c,(round(size[0]/2-anchor),size[1]-7-c.height));result.append(out)
    return result

def atlas(frames,path):
    w,h=frames[0].size; out=Image.new('RGBA',(w*len(frames),h))
    for i,f in enumerate(frames):out.paste(f,(i*w,0))
    out.save(path)

def neutral_key(im):
    # These two generated sheets returned a neutral checkerboard instead of
    # alpha. Remove only its bright, achromatic pixels; retain warm highlights.
    a=np.array(im.convert('RGBA'));rgb=a[:,:,:3].astype(int)
    a[(rgb.min(2)>195)&((rgb.max(2)-rgb.min(2))<18),3]=0
    return Image.fromarray(a)

def build_entry():
    OUT.mkdir(parents=True,exist_ok=True)
    im=Image.open(SOURCE/'yard_booth.png').convert('RGBA')
    ImageEnhance.Brightness(im).enhance(1.13).resize((1920,540),Image.Resampling.NEAREST).save(OUT/'yard.png')
    im=neutral_key(Image.open(SOURCE/'chad_entry.png'))
    cells=[crop(clean_actor(cell(im,i,4,2))) for i in range(8)]
    # The clerk is on CHAD's left in the station view.
    cells[2]=cells[2].transpose(Image.Transpose.FLIP_LEFT_RIGHT)
    scale=174/cells[0].height;frames=[]
    for c in cells:
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(224,224));f.alpha_composite(c,((224-c.width)//2,217-c.height));frames.append(f)
    atlas(frames,OUT/'chad_entry.png')
    im=Image.open(SOURCE/'ticket_clerk.png').convert('RGBA');frames=[]
    # Keep the raised hand in frame 1; the generated cell widths differ slightly.
    for x0,x1,cx in [(0,510,263),(510,1090,800),(1090,1570,1320),(1570,2079,1850)]:
        c=im.crop((x0,100,x1,590));c=c.resize((round(c.width*.185),round(c.height*.185)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(160,112));f.alpha_composite(c,(round(80-(cx-x0)*.185),21));frames.append(f)
    atlas(frames,OUT/'ticket_clerk.png')
    im=neutral_key(Image.open(SOURCE/'ticket_scanner.png'));frames=[]
    intact=im.crop((70,140,720,492))
    bent=im.crop((822,140,1472,492))
    # Reuse the original pedestals in every state: only the hinged flaps move.
    for state in range(3):
        c=intact.copy()
        if state:
            c.paste((0,0,0,0),(130,0,517,352))
            if state==1:c.alpha_composite(bent.crop((130,0,517,352)),(130,0))
        f=Image.new('RGBA',(280,160))
        f.alpha_composite(c.resize((260,141),Image.Resampling.NEAREST),(10,11))
        frames.append(f)
    for box in [(856,610,1110,900),(1150,610,1410,900)]:
        c=crop(im.crop(box));c=c.resize((round(c.width*.4),round(c.height*.4)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(280,160));f.alpha_composite(c,((280-c.width)//2,(160-c.height)//2));frames.append(f)
    atlas(frames,OUT/'ticket_scanner.png')

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    for name in PLATES:
        im=Image.open(SOURCE/('yard_booth.png' if name=='yard' else name+'.png')).convert('RGBA')
        if name in ['general','sleeper','pantry','ac','private','private_damaged','roof']:im=keyed(im)
        im=ImageEnhance.Brightness(im).enhance(1.13).resize((1920,540),Image.Resampling.NEAREST)
        im.save(OUT/(name+'.png'))
    for name in ['rural_near','industry_near','river_near']:
        im=Image.open(SOURCE/(name+'.png')).convert('RGBA')
        im.resize((1920,540),Image.Resampling.NEAREST).save(OUT/(name+'.png'))
    manifest_path=ROOT/'assets/frames/manifest.json';manifest=json.loads(manifest_path.read_text())
    states={'idle':[0,1],'walk':[2,3,4,5],'atk':[6,7,8],'hurt':[9],'down':[10],'jump':[11],'perch':[11],'block':[6]}
    for name in CAST:
        im=Image.open(SOURCE/(name+'.png'));frames=register([cell(im,i) for i in range(12)])
        directory=ROOT/'assets/frames'/('nr_'+name);directory.mkdir(exist_ok=True)
        for i,f in enumerate(frames):f.save(directory/f'{i}.png')
        manifest['nr_'+name]={state:[f'nr_{name}/{i}.png' for i in ids] for state,ids in states.items()}
        walk_source=SOURCE/(name+'_walk.png')
        if walk_source.exists() and not name.startswith('vikram'):
            walk_im=Image.open(walk_source)
            walk=register([cell(walk_im,i,4,2) for i in range(8)])
            for i,f in enumerate(walk):f.save(directory/f'walk_{i}.png')
            manifest['nr_'+name]['walk']=[f'nr_{name}/walk_{i}.png' for i in range(8)]
            for i in [2,3,4,5]:(directory/f'{i}.png').unlink(missing_ok=True)
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    im=Image.open(SOURCE/'vikram_actions.png')
    cells=[cell(im,i) for i in range(12)];cells[9]=ImageOps.mirror(cells[9]);frames=register(cells)
    directory=ROOT/'assets/frames/nr_vikram'
    for i,f in enumerate(frames):f.save(directory/f'action_{i}.png')
    for state,ids in {'pistol':[0,1,2,3,4],'grab':[5,6,7],'climb':[8,9],'block':[11]}.items():
        manifest['nr_vikram'][state]=[f'nr_vikram/action_{i}.png' for i in ids]
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
    for name,size,height in [('chad_cinema',(224,224),174),('passengers',(224,256),150)]:
        im=Image.open(SOURCE/(name+'.png'));cells=[cell(im,i) for i in range(12)]
        if name=='chad_cinema':cells[9]=ImageOps.mirror(cells[9])
        atlas(register(cells,size,height),OUT/(name+'.png'))
    build_entry()
    im=Image.open(SOURCE/'props.png')
    for i,name in enumerate(['prop_nr_case','prop_nr_case_b','prop_nr_trolley','prop_nr_trolley_b','prop_nr_table','prop_nr_table_b','prop_nr_urn','prop_nr_urn_b','gate','fan','prop_nr_contraband','prop_nr_contraband_b']):
        if name=='fan':continue  # Ceiling fans are already painted into the coach art.
        c=crop(cell(im,i));target=[100,100,148,148,130,130,70,70,120,72,114,114][i];c=c.resize((target,round(c.height*target/c.width)),Image.Resampling.NEAREST);c.save(OUT/(name+'.png'))
        if name=='prop_nr_contraband':c.resize((40,round(c.height*40/c.width)),Image.Resampling.NEAREST).save(OUT/'relic_vikram.png')
    im=Image.open(SOURCE/'train_exterior.png');out=Image.new('RGBA',(1024,896))
    cars=[]
    for i in range(4):
        c=cell(im,i,1,4);a=np.array(c);r,g,b=[a[:,:,j].astype(float) for j in range(3)]
        # Dark key spill between wheels survives the general-purpose clothing
        # key. Blue bodywork and warm brass do not satisfy this magenta test.
        a[(r>65)&(b>65)&(r>g*1.8)&(b>g*1.8),3]=0
        cars.append(crop(Image.fromarray(a)))
    scale=990/max(c.width for c in cars)
    for i,c in enumerate(cars):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST);out.paste(c,((1024-c.width)//2,i*224+212-c.height))
    out.save(OUT/'train_exterior.png')
    im=Image.open(SOURCE/'hatch_open.png');c=crop(keyed(im));c.resize((160,100),Image.Resampling.NEAREST).save(OUT/'hatch_open.png')
    im=Image.open(SOURCE/'explosion.png');frames=[]
    # Keep the source-cell extent so fire grows naturally rather than stretching
    # every explosion stage to the same silhouette bounds.
    for i in range(8):
        c=cell(im,i,4,2);a=np.array(c);r,g,b=[a[:,:,j].astype(float) for j in range(3)]
        # The fire sheet has dark magenta spill around smoke; unlike clothing,
        # nothing in this effect should contain purple pigment.
        spill=(b>g*1.35)&(r>g*1.35)&(b>60);a[spill,3]=0
        frames.append(Image.fromarray(a).resize((320,256),Image.Resampling.NEAREST))
    atlas(frames,OUT/'explosion.png')
    from build_train_connections import main as connections
    connections()
if __name__=='__main__':
    import sys
    if '--entry-only' in sys.argv:
        from build_train_connections import main as connections
        connections()
    else:main()
