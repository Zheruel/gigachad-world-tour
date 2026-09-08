"""Register the selected compact barrage, rising uppercut and contact accents."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageDraw
from build_train_rebuild import keyed
from build_train_coaches import clean_edge
from build_boxing_rush import largest_component
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/characters/chad/boxing_polish'

def pose(im,index,cols,rows,name=None):
    x0=round(index%cols*im.width/cols);y0=round(index//cols*im.height/rows)
    x1=round((index%cols+1)*im.width/cols);y1=round((index//cols+1)*im.height/rows)
    if name in ['head','upper']:
        edges=[0,473,im.height] if name=='head' else [0,565,im.height]
        y0=edges[index//cols];y1=edges[index//cols+1]
    p=clean_edge(keyed(im.convert('RGBA').crop((x0,y0,x1,y1))))
    a=np.array(p);a[~largest_component(a[:,:,3]>24),:]=0;p=Image.fromarray(a);b=p.getbbox();return p.crop(b)

def main():
    sources={name:Image.open(SRC/(name+'.png')) for name in ['body','opposite','head','upper']}
    # A common scale within each source preserves actual crouches and extension.
    # Different generation canvases are matched by head diameter / limb lengths.
    specs=[('body',0,4,2,.47),('body',1,4,2,.47),('body',2,4,2,.47),
      ('opposite',0,2,1,.265),('opposite',1,2,1,.265),('body',5,4,2,.47),('body',6,4,2,.47),
      ('head',0,4,2,.49),('head',1,4,2,.49),('upper',0,2,2,.40),('upper',1,2,2,.40),
      ('upper',2,2,2,.40),('upper',3,2,2,.40),('head',6,4,2,.49),('head',7,4,2,.49)]
    frames=[];paths=[]
    for i,(name,index,cols,rows,scale) in enumerate(specs):
        p=pose(sources[name],index,cols,rows,name);a=np.array(p);mask=a[:,:,3]>32
        # Plant the forward boot throughout the barrage. Torso rotation is
        # authored into the frames; no image stretching or per-pose fitting.
        ys,xs=np.where(mask[max(0,p.height-30):]);front=xs[xs>xs.max()-p.width*.22];anchor=float(np.median(front))
        p=p.resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(256,248));f.alpha_composite(p,(round(136-anchor*scale),241-p.height));f=clean_edge(f)
        path=f'chad_boxing_polish_{i:02}.png';f.save(ROOT/'assets/frames'/path);paths.append(path);frames.append(f)
    paths.append('chad_boxing_rush_00.png') # existing registered guard for recovery
    manifestpath=ROOT/'assets/frames/manifest.json';m=json.loads(manifestpath.read_text());m['player']['boxing_rush']=paths;manifestpath.write_text(json.dumps(m,indent=2)+'\n')
    out=ROOT/'tmp/review/boxing-polish';out.mkdir(parents=True,exist_ok=True)
    sheet=Image.new('RGBA',(256*4,248*4),(27,23,27,255));d=ImageDraw.Draw(sheet)
    for i,f in enumerate(frames):sheet.alpha_composite(f,(i%4*256,i//4*248));d.text((i%4*256+4,i//4*248+4),str(i),fill='white')
    sheet.save(out/'poses-2x.png');sheet.resize((512,496),Image.Resampling.NEAREST).save(out/'poses-native.png')
    effects()

def effects():
    source=Image.open(SRC/'impacts.png').convert('RGBA');a=np.array(source);r,g,b=[a[:,:,i].astype(float) for i in range(3)]
    # The selected sheet uses additive glow. Extract its bright authored marks,
    # removing the dark gradient backdrop instead of shipping opaque rectangles.
    alpha=np.clip((g-125)/95,0,1)*255;alpha[(r<190)|(b>g*1.2)]=0;a[:,:,3]=alpha.astype('uint8');a[a[:,:,3]<24]=0
    source=Image.fromarray(a);atlas=Image.new('RGBA',(128*4,192*2))
    # Upper row stars and lower rising trails share their own fixed source origins.
    edges=[0,384,768,1152,1536]
    for i in range(8):
        col=i%4;row=i//4;top=0 if not row else 365;bottom=370 if not row else 1024
        c=source.crop((edges[col],top,edges[col+1],bottom));s=.28
        c=c.resize((round(c.width*s),round(c.height*s)),Image.Resampling.NEAREST)
        frame=Image.new('RGBA',(128,192));frame.alpha_composite(c,(10,66 if not row else 4));atlas.alpha_composite(frame,(col*128,row*192))
    folder=ROOT/'assets/fx';folder.mkdir(parents=True,exist_ok=True);atlas.save(folder/'boxing_impacts.png')

if __name__=='__main__':main()
