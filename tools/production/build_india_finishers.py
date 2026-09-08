"""Extract selected finisher performances at one anatomical scale per sheet.

Runtime cells are 256 square and display at 128 logical pixels. Grounded
poses register their lowest boot at y=248; airborne poses also expose their
authored hip anchor so choreography can follow a physical pivot. No pose is
stretched or independently normalized by its bounding-box height.
"""
from collections import deque
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages'
OUT = ROOT / 'assets/stages/india/cinematics'
REVIEW = ROOT / 'tmp/review/india-finishers'


def silhouettes(path, rows, checker=False):
    a = np.array(Image.open(path).convert('RGBA'))
    rgb = a[:, :, :3].astype(float)
    if checker:
        background = (rgb.min(axis=2) > 204) & (rgb.max(axis=2)-rgb.min(axis=2) < 25)
    else:
        background = (rgb[:, :, 0] > 150) & (rgb[:, :, 2] > 130) & (rgb[:, :, 1] < 105)
    a[background] = 0
    mask = a[:, :, 3] > 32
    h, w = mask.shape
    groups = {}
    for y, x in zip(*np.where(mask)):
        if not mask[y, x]:
            continue
        q = deque([(int(x), int(y))]); mask[y, x] = False; points = []
        while q:
            px, py = q.popleft(); points.append((px, py))
            for nx, ny in ((px-1,py),(px+1,py),(px,py-1),(px,py+1)):
                if 0 <= nx < w and 0 <= ny < h and mask[ny,nx]:
                    mask[ny,nx] = False; q.append((nx,ny))
        if len(points) < 500:
            continue
        xs, ys = np.array(points).T
        box = (int(xs.min()),int(ys.min()),int(xs.max()+1),int(ys.max()+1))
        index = min(rows-1,int((box[1]+box[3])/2/h*rows))*4 + min(3,int((box[0]+box[2])/2/w*4))
        if index in groups and groups[index]['area'] > len(points):
            continue
        c = np.zeros((box[3]-box[1], box[2]-box[0],4),dtype='uint8')
        c[ys-box[1],xs-box[0]] = a[ys,xs]
        # Remove extraction spill only along the silhouette, preserving skin.
        edge = np.array(Image.fromarray(c[:,:,3]).filter(ImageFilter.MinFilter(3))) < 128
        crgb = c[:,:,:3].astype(float)
        if checker:
            neutral = edge & (crgb.min(axis=2)>155) & (crgb.max(axis=2)-crgb.min(axis=2)<30)
            c[neutral] = 0
        else:
            spill = np.minimum(crgb[:,:,0]-crgb[:,:,1],crgb[:,:,2]-crgb[:,:,1]).clip(0)
            # Tiny enclosed magenta pixels can remain between folded fingers;
            # none of these costumes intentionally uses magenta material.
            affected = spill>8
            crgb[:,:,0][affected]-=spill[affected];crgb[:,:,2][affected]-=spill[affected]
            c[:,:,:3]=crgb.clip(0,255).astype('uint8')
        groups[index]={'image':Image.fromarray(c),'box':box,'area':len(points)}
    assert set(groups)==set(range(rows*4)),(path.name,sorted(groups))
    return groups


SHEETS = {
 'operator_limp': {'stage':'dirty_delhi','rows':2,'height':170,'standing':list(range(8)),
  'names':['left-contact','left-weight','right-pass','right-reach','right-contact','right-weight','left-pass','left-reach'],
  'hips':[(.5525,.5213),(.5566,.5392),(.6647,.5086),(.5604,.5127),(.4792,.51),(.545,.524),(.6257,.5076),(.5102,.5038)],
  'mirror':[]},
 'chad_cart_push': {'stage':'dirty_delhi','rows':2,'height':170,'standing':[], 'scale':.52,
  # Physical scale matches the selected finisher sheet's head, forearm and boot
  # dimensions; bent pushing poses intentionally stand below the 85px guard.
  'names':['left-drive','right-pass','right-reach','right-plant','right-drive','left-pass','left-reach','left-plant'],
  'hips':[(.462,.531),(.216,.515),(.336,.522),(.469,.534),(.437,.533),(.215,.518),(.330,.519),(.471,.529)],
  'hands':[(.982,.260),(.976,.251),(.981,.251),(.985,.276),(.984,.265),(.976,.266),(.981,.259),(.984,.270)],
  'mirror':[]},
 'chad_finishers': {'stage':'dirty_delhi','rows':4,'height':170,'standing':[0,14,15],'checker':True,
  'names':['guard','reach-cart','brace-handle','push','drive-push','release-push','clinch-reach','throw-load','heave','throw-follow','body-punch','cross','elbow','shoulder-drive','dust-shoulder','victory'],
  'hips':[(.43,.56),(.39,.55),(.39,.55),(.45,.58),(.51,.57),(.44,.54),(.42,.55),(.50,.55),(.45,.66),(.54,.60),(.42,.56),(.47,.55),(.51,.60),(.47,.55),(.49,.55),(.48,.55)],
  'hands':[(.58,.24),(.87,.31),(.88,.30),(.96,.26),(.96,.27),(.82,.46),(.92,.32),(.35,.19),(.95,.03),(.08,.19),(.95,.17),(.96,.17),(.38,.06),(.87,.34),(.44,.19),(.68,.57)],
  'mirror':[]},
 'vendor_finish': {'stage':'dirty_delhi','rows':3,'height':190,'standing':[0,2,3],
  'names':['stagger','body-hit','head-hit','collar-react','lift','flight','curl','counter-impact','tumble','ground-impact','slump','sprawl'],
  'hips':[(.48,.55),(.50,.52),(.51,.54),(.5,.55),(.44,.55),(.49,.62),(.53,.51),(.48,.50),(.44,.51),(.45,.56),(.38,.62),(.41,.56)],
  'mirror':[0,1,2,3,4,6]},
 'operator_finish': {'stage':'dirty_delhi','rows':2,'height':170,'standing':[0,2],
  'names':['stagger','body-hit','head-hit','collar-crouch','lift','flight','tumble','sprawl'],
  'hips':[(.45,.55),(.64,.47),(.32,.53),(.53,.57),(.47,.53),(.48,.67),(.36,.55),(.38,.54)],
  'mirror':[4]},
 'closer_cascade': {'stage':'refund_tower','rows':3,'height':180,'standing':[0,2,3],
  'names':['stagger','body-hit','head-hit','collar-react','lift','flight','curl','desk-impact','tumble','ground-impact','slump','sprawl'],
  'hips':[(.5,.51),(.58,.51),(.43,.49),(.50,.54),(.44,.55),(.45,.56),(.46,.52),(.47,.49),(.48,.63),(.36,.48),(.34,.62),(.39,.51)],
  'mirror':[0,1,4]},
}


def build():
    OUT.mkdir(parents=True,exist_ok=True); REVIEW.mkdir(parents=True,exist_ok=True)
    contract={'cell':[256,256],'logicalCell':[128,128],'columns':4,'groundAnchor':[64,124],'sheets':{}}
    for name,s in SHEETS.items():
        cells=silhouettes(SOURCE/s['stage']/'cinematics'/f'{name}.png',s['rows'],s.get('checker',False))
        scale=s['scale'] if 'scale' in s else s['height']/float(np.median([cells[i]['image'].height for i in s['standing']]))
        atlas=Image.new('RGBA',(1024,s['rows']*256)); frames=[]
        for i,d in sorted(cells.items()):
            im=d['image']; hx,hy=s['hips'][i]; hand=s.get('hands',[None]*len(cells))[i]
            if i in s['mirror']:
                im=ImageOps.mirror(im);hx=1-hx
                if hand:hand=(1-hand[0],hand[1])
            size=(round(im.width*scale),round(im.height*scale))
            pose=im.resize(size,Image.Resampling.LANCZOS)
            x=max(0,min(256-size[0],round(128-hx*size[0])));y=248-size[1]
            assert x>=0 and x+size[0]<=256 and y>=0,(name,i,size,x,y)
            tile=Image.new('RGBA',(256,256));tile.alpha_composite(pose,(x,y))
            # Alpha below 24 carries resampling/key noise, not intentional art.
            a=np.array(tile);a[a[:,:,3]<24]=0
            if not s.get('checker',False):
                # Resampling thin keyed edges can reintroduce a few magenta
                # fringes through RGB ringing. Despill the final alpha edge too.
                rgb=a[:,:,:3].astype(float)
                spill=np.minimum(rgb[:,:,0]-rgb[:,:,1],rgb[:,:,2]-rgb[:,:,1]).clip(0)
                affected=(a[:,:,3]>0)&(spill>8)
                rgb[:,:,0][affected]-=spill[affected];rgb[:,:,2][affected]-=spill[affected]
                a[:,:,:3]=rgb.clip(0,255).astype('uint8')
            tile=Image.fromarray(a)
            atlas.alpha_composite(tile,(i%4*256,i//4*256))
            f={'index':i,'name':s['names'][i],'hip':[round((x+hx*size[0])/2,2),round((y+hy*size[1])/2,2)],'bounds':[round(x/2,2),round(y/2,2),round(size[0]/2,2),round(size[1]/2,2)]}
            if hand:f['hand']=[round((x+hand[0]*size[0])/2,2),round((y+hand[1]*size[1])/2,2)]
            frames.append(f)
            tile.save(REVIEW/f'{name}-{i:02}.png')
        atlas.save(OUT/f'{name}.png',optimize=True)
        contract['sheets'][name]={'path':f'assets/stages/india/cinematics/{name}.png','rows':s['rows'],'standingHeight':s['height']/2,'scale':round(scale,6),'frames':frames}
        sheet=Image.new('RGB',atlas.size,(30,29,35));sheet.paste(atlas,(0,0),atlas)
        draw=ImageDraw.Draw(sheet)
        for f in frames:
            ix,iy=f['index']%4*256,f['index']//4*256
            draw.line((ix,iy+248,ix+255,iy+248),fill=(91,110,106))
            draw.text((ix+8,iy+8),f"{f['index']}: {f['name']}",fill=(230,220,185))
        sheet.save(REVIEW/f'{name}-2x.png')
        sheet.resize((512,s['rows']*128),Image.Resampling.NEAREST).save(REVIEW/f'{name}-native.png')
        print(name,len(frames),'poses; one uniform scale',round(scale,5))
    (OUT/'registration.json').write_text(json.dumps(contract,indent=2)+'\n')
    anchors={name:{'rows':s['rows'],'hip':[f['hip'] for f in s['frames']],
                   'hands':[f.get('hand') for f in s['frames']]}
             for name,s in contract['sheets'].items()}
    (ROOT/'js/india_cinematic_anchors.js').write_text(
        '// Generated by tools/production/build_india_finishers.py; logical 128px cells.\n'
        'export const CINEMATIC_ANCHORS = '+json.dumps(anchors,separators=(',',':'))+';\n')


if __name__=='__main__':
    build()
