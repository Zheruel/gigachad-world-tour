"""Register the selected cinematic scenery; retain scale through structural damage."""
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter
from build_train_rebuild import keyed
from build_train_coaches import clean_edge

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages'
OUT=ROOT/'assets/stages/india/cinematics'

def extract(im, neutral=False):
    im=keyed(im.convert('RGBA'))
    a=np.array(im)
    if neutral:
        rgb=a[:,:,:3].astype(int)
        a[(rgb.min(2)>175)&(rgb.max(2)-rgb.min(2)<18),3]=0
        im=Image.fromarray(a)
    return clean_edge(im)

def depurple(im):
    """Glass keeps a magenta cast from the key: turn purple-tinted pixels neutral grey."""
    a=np.array(im);r,g,b=(a[:,:,i].astype(int) for i in range(3))
    m=(a[:,:,3]>0)&(r>g+25)&(b>g+25);lum=(r*.3+g*.59+b*.11).clip(0,255).astype(np.uint8)
    for i in range(3):a[:,:,i][m]=lum[m]
    return Image.fromarray(a)

# Painted steam wisps above the tawa (atlas px, per damage state): the game animates steam, so the
# frozen wisps go after registration (their pixels still count towards the shared scale).
STEAM={'kitchen_set':[(190,190,240,285),(970,205,1020,265),(200,680,295,785),(452,730,495,795),(985,760,1028,815),(1100,780,1155,855)]}

def desteam(atlas,boxes):
    a=np.array(atlas);rgb=a[:,:,:3].astype(int);lum=rgb[:,:,0]*.3+rgb[:,:,1]*.59+rgb[:,:,2]*.11
    # Light neutral wisp, or its faint cool (blue-purple) body; the iron beneath is warm.
    wisp=(a[:,:,3]>0)&(((rgb.max(2)-rgb.min(2)<45)&(lum>70))|((rgb[:,:,2]>=rgb[:,:,1]-2)&(rgb[:,:,0]-rgb[:,:,1]<40)&(lum>30)))
    box=np.zeros(wisp.shape,bool)
    for x0,y0,x1,y1 in boxes: box[y0:y1,x0:x1]=True
    hole=wisp&box;a[hole]=0
    # Where the wisp crossed the tawa or puris, grow the surrounding paint back in; open air
    # (few solid neighbours) stays clear.
    for _ in range(8):
        solid=a[:,:,3]>0;n=np.zeros(solid.shape,int);acc=np.zeros(a.shape,float)
        for dy in (-1,0,1):
            for dx in (-1,0,1):
                if dy or dx:
                    sh=np.roll(np.roll(solid,dy,0),dx,1);n+=sh;acc+=np.roll(np.roll(a,dy,0),dx,1)*sh[:,:,None]
        fill=hole&~solid&(n>=5)
        if not fill.any(): break
        a[fill]=(acc[fill]/n[fill][:,None]).astype(np.uint8);a[fill,3]=255
    return Image.fromarray(a)

def grade_kitchen(atlas):
    """The stall sits back from the fight: 12% darker and a touch greyer so Pappu reads in
    front of it; the jalebi case's pink cast goes to syrup amber and the dal to ochre."""
    a=np.array(atlas);rgb=a[:,:,:3].astype(float);r,g,b=rgb[:,:,0],rgb[:,:,1],rgb[:,:,2]
    pink=(a[:,:,3]>0)&(r>g+50)&(b>g+12)
    rgb[pink]=np.stack([r[pink],np.maximum(g[pink],r[pink]*.55),b[pink]*.35],1)
    dal=np.zeros(pink.shape,bool);dal[240:280,55:125]=True;dal&=(g>140)&(b<110)&(r>190)
    rgb[dal]*=[.96,.84,.7]
    lum=rgb@[.3,.59,.11];rgb=(rgb*.9+lum[:,:,None]*.1)*.88
    a[:,:,:3]=np.clip(rgb,0,255).astype(np.uint8);return Image.fromarray(a)

def build(name,stage,size,neutral=False):
    im=Image.open(SOURCE/stage/'cinematics'/f'{name}.png')
    cells=[]
    for row in range(2):
        for col in range(2):
            box=(round(col*im.width/2),round(row*im.height/2),round((col+1)*im.width/2),round((row+1)*im.height/2))
            c=im.crop(box)
            if name!='success_set': c=extract(c,neutral)
            if name=='kitchen_set': c=depurple(c)
            cells.append(c)
    atlas=Image.new('RGBA',(size[0]*2,size[1]*2))
    if name=='success_set':
        for i,c in enumerate(cells):
            c=c.convert('RGBA').resize(size,Image.Resampling.NEAREST)
            # Keep joins local to the existing wall insert, not a new scene rectangle.
            a=np.array(c);yy,xx=np.indices(a.shape[:2]);edge=np.minimum.reduce([xx,yy,size[0]-1-xx,size[1]-1-yy]);a[:,:,3]=(np.clip(edge/14,0,1)*255).astype('uint8');c=Image.fromarray(a)
            atlas.alpha_composite(c,(i%2*size[0],i//2*size[1]))
    else:
        boxes=[c.getbbox() for c in cells]
        scales=[min((size[0]-8)/(b[2]-b[0]),(size[1]-8)/(b[3]-b[1])) for b in boxes]
        scale=min(scales) # one physical scale, including collapsed silhouettes
        for i,(c,b) in enumerate(zip(cells,boxes)):
            c=c.crop(b);c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            atlas.alpha_composite(c,(i%2*size[0]+(size[0]-c.width)//2,i//2*size[1]+size[1]-c.height-2))
        if name in STEAM: atlas=desteam(atlas,STEAM[name])
        if name=='kitchen_set': atlas=grade_kitchen(atlas)
    OUT.mkdir(parents=True,exist_ok=True);atlas.save(OUT/f'{name}.png')

def defringe(im):
    """The magenta key survives in the spray's translucent edges: turn it into river mud."""
    a=np.array(im);r,g,b=(a[:,:,i].astype(int) for i in range(3))
    m=(a[:,:,3]>0)&(r>g+10)&(b>g+10);lum=(r*.3+g*.59+b*.11)/255
    a[m,:3]=(np.clip(lum[m]*1.15,0,1)[:,None]*np.array([150,98,52])).astype(np.uint8)
    return Image.fromarray(a)


def splash():
    # Two GPT Image sheets of four frames each (crown, column, peak, curtains / rain, surge, settle, fade)
    # on one shared water line. Each frame keeps the sheet's scale and water line: never normalize height.
    srcs=[SOURCE/f'dirty_delhi/cinematics/river_splash_{n}.png' for n in 'ab']
    if not all(p.exists() for p in srcs):return
    from sprite_edges import alpha,edges
    ims=[alpha(Image.open(p).convert('RGBA'),128) for p in srcs];atlas=Image.new('RGBA',(512*8,512));cells=[]
    for im in ims:
        a=np.array(im);water=int(np.nonzero(a[...,3].max(1)>127)[0].max())
        for q in range(4):
            c=im.crop((round(q*im.width/4),0,round((q+1)*im.width/4),water+1));c=c.crop((0,c.getbbox()[1],c.width,c.height))   # full slice width: the column stays on the slice centre
            # Spray from the neighbouring frame that strays over the slice edge.
            q=np.array(c)
            from keying import components
            for comp in components(q[...,3]>0):
                if len(comp)<400 and (comp[:,1].min()==0 or comp[:,1].max()==q.shape[1]-1):q[comp[:,0],comp[:,1]]=0
            cells.append(Image.fromarray(q))
    # Scale: the peak (frame 3) fills the cell height with a little headroom.
    k=488/cells[2].height
    for i,c in enumerate(cells):
        c=c.resize((max(1,round(c.width*k)),max(1,round(c.height*k))),Image.Resampling.LANCZOS)
        if c.width>508:c=c.crop(((c.width-508)//2,0,(c.width-508)//2+508,c.height))
        cell=Image.new('RGBA',(512,512));cell.alpha_composite(c,((512-c.width)//2,500-c.height));atlas.alpha_composite(edges(alpha(cell,128)),(i*512,0))
    # Graded into the river's own sunset palette: murky maroon-brown troughs, ochre body, warm cream crests.
    a=np.array(atlas).astype(float);lum=(a[...,:3]@[.3,.55,.15])/255
    stops=np.array([0,.25,.45,.65,.85,1.]);ramp=np.array([[20,12,15],[46,30,27],[92,58,44],[140,92,62],[214,150,96],[246,206,156]],float)
    for ch in range(3):a[...,ch]=np.interp(lum,stops,ramp[:,ch])
    Image.fromarray(a.clip(0,255).astype(np.uint8)).save(OUT/'river_splash.png')


if __name__=='__main__':
    import sys
    if sys.argv[1:]!=['splash']:
        build('market_set','dirty_delhi',(384,256))
        build('kitchen_set','dirty_delhi',(768,512))
        from kitchen_alcove import main as kitchen_alcove; kitchen_alcove() # no gas bottle under the counter
        # The rig ships defringed at 2x of its draw size (its own recipe rebuilds from the same source).
        from build_dredger_set_clean import main as dredger_set; dredger_set()
        build('success_set','refund_tower',(684,580))
    splash()
