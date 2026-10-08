"""Register GPT-authored wall breach, panic runs and persistent desk debris."""
from pathlib import Path
import json
import numpy as np
from PIL import Image,ImageOps,ImageDraw
from build_delhi_cast_performances import cells,register,SIZE,SOLE
from sprite_edges import alpha,edges
from chad_cutscene import finish
from build_refund_performances import skull_x
from measure_refund_gaits import support_sole

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/overhaul/entrance'
OUT=ROOT/'assets/stages/refund_tower/overhaul'
PROOF=ROOT/'tmp/review/refund-overhaul/entrance'

def actors():
    measurements={}
    for name,height in [('chad-breach',178),('caller-flee',174),('operator-flee',168),('technician-flee',174)]:
        poses=cells(SOURCE/f'{name}-v1.png',4,3)
        scale=height/poses[11 if name=='chad-breach' else 0].height
        if name=='chad-breach':
            settle=cells(SOURCE/'chad-settle-v1.png',2,2)
            settle_scale=height/settle[3].height
        atlas=Image.new('RGBA',(4*SIZE[0],3*SIZE[1]))
        items=[]
        for i,im in poses.items():
            frame=register(settle[i-8],settle_scale) if name=='chad-breach' and i>=8 else register(im,scale)
            # Two flight phases per run: the ground stays fixed while the
            # soles clear it, instead of pinning airborne shoes to the floor.
            lift=0 if name=='chad-breach' or i<4 else [0,0,0,6,0,0,0,6][i-4]
            if lift:
                moved=Image.new('RGBA',SIZE);moved.alpha_composite(frame,(0,-lift));frame=moved
            atlas.alpha_composite(frame,(i%4*SIZE[0],i//4*SIZE[1]))
            items.append({'frame':i,'bbox':frame.getbbox(),'lift':lift})
        path=OUT/f'{name}.png';atlas.save(path,optimize=True)
        if name=='chad-breach':finish(path,SIZE)
        measurements[name]={'scale':scale,'frames':items}
        board=Image.new('RGB',atlas.size,'#17171b');board.paste(atlas,mask=atlas.getchannel('A'))
        board.save(PROOF/f'{name}-registered.png')
    (PROOF/'registration.json').write_text(json.dumps(measurements,indent=2)+'\n')

def panic_turns():
    atlas=Image.new('RGBA',(4*SIZE[0],3*SIZE[1]))
    for row,(role,height) in enumerate([('caller',174),('operator',168),('technician',174)]):
        poses=cells(SOURCE/f'{role}-turn-v1.png',2,2)
        scale=height/poses[0].height
        for i,im in poses.items():
            frame=register(im,scale)
            atlas.alpha_composite(frame,(i*SIZE[0],row*SIZE[1]))
    atlas.save(OUT/'office-panic-turn.png',optimize=True)
    board=Image.new('RGB',atlas.size,'#17171b');board.paste(atlas,mask=atlas.getchannel('A'))
    board.save(PROOF/'office-panic-turn-registered.png')

def support_sole_image(image,phase):
    return support_sole(image,phase)

def contact_shift(image,dx):
    fixed=Image.new('RGBA',SIZE)
    for y in range(SIZE[1]):
        shift=round(dx*max(0,min(1,(y-225)/(SOLE-225-3))))
        fixed.alpha_composite(image.crop((0,y,SIZE[0],y+1)),(shift,y))
    return edges(alpha(fixed))

def split_support(pose,trace):
    mask=Image.new('L',SIZE);draw=ImageDraw.Draw(mask)
    draw.polygon(trace['polygon'],fill=255)
    for polygon in trace.get('exclude_polygons',[]):draw.polygon(polygon,fill=0)
    if trace.get('double_support'):draw.polygon(trace['double_support_polygon'],fill=255)
    draw.rectangle((0,0,SIZE[0]-1,223),fill=0)
    active=(np.asarray(mask)>0)&(np.asarray(pose.getchannel('A'))>0)
    a=np.asarray(pose).copy();b=a.copy()
    a[active]=0;b[~active]=0
    return Image.fromarray(a),Image.fromarray(b)

def runs():
    measurements={}
    support_spec=json.loads((SOURCE/'support-leg-polygons.json').read_text())
    for role,height in [('caller',174),('operator',168),('technician',174)]:
        original=cells(SOURCE/f'{role}-flee-v1.png',4,3)
        between=cells(SOURCE/f'{role}-run-between-v1.png',4,2)
        scale=height/original[0].height
        # Compare the same crouched stride span, not a standing calibration
        # against a bent running body. One scale applies to all eight new cells.
        between_scale=scale*(original[4].height+original[5].height)/2/between[0].height
        frames=[]
        for i in range(16):
            im=original[4+i//2] if i%2==0 else between[i//2]
            pose_scale=scale if i%2==0 else between_scale
            if i%2 and (role,i//2) in [('technician',0),('technician',4)]:
                im=cells(SOURCE/f'{role}-run-ground{i//2}-v1.png',1,1)[0]
                a,b=i//2,(i//2+1)%8
                pose_scale=scale*(original[4+a].height+original[4+b].height)/2/im.height
            frame=register(im,pose_scale)
            lift=[0,0,0,0,0,3,6,3][i%8]
            frames.append((frame,lift))
        anchor=np.median([skull_x(f) for f,_ in frames])
        registered=[]
        for i,(frame,lift) in enumerate(frames):
            aligned=Image.new('RGBA',SIZE)
            aligned.alpha_composite(frame,(round(anchor-skull_x(frame)),-lift))
            registered.append(aligned)
        corrections={}
        if role=='technician':
            for i,target in [(2,145),(4,127),(10,143),(12,125)]:
                dx=round(target-support_sole_image(registered[i],6)['x'])
                corrections[str(i)]=dx
                registered[i]=contact_shift(registered[i],dx)
        # Lock an authored in-between's support shoe halfway between the two
        # original contact landmarks. Only the lower leg registration tapers;
        # head, torso, hips, boot scale and airborne poses remain unchanged.
        for i in [1,3,9,11]:
            point=lambda j: support_sole_image(registered[j],6 if j%8>=2 else 0)['x']
            target=(point(i-1)+point(i+1))/2
            dx=round(target-point(i))
            if abs(dx)>40:raise ValueError(f'{role}/{i}: contact correction too large: {dx}')
            corrections[str(i)]=dx
            if dx:
                registered[i]=contact_shift(registered[i],dx)
        atlas=Image.new('RGBA',(4*SIZE[0],4*SIZE[1]));paths=[]
        for i,aligned in enumerate(registered):
            path=PROOF/f'{role}-escape-{i:02}.png';aligned.save(path);paths.append(path)
            atlas.alpha_composite(aligned,(i%4*SIZE[0],i//4*SIZE[1]))
        # Measure only the semantic planted shoe. An overlapping swinging
        # toe at the same height must not contaminate the distance clock.
        points=[support_sole(split_support(registered[i],support_spec[role][str(i)])[1],0)
                if i%8<=4 else None for i in range(16)]
        beats=[]
        for half in [0,8]:
            ds=[(points[half+i]['x']-points[half+i+1]['x'])/2 for i in range(4)]
            if min(ds)<-3:raise ValueError(f'{role}: nonsequential support feet {ds}')
            air=sum(ds)/4
            beats.extend([round(max(4.25,d),3) for d in ds]+[round(air,3)]*4)
        atlas.save(OUT/f'{role}-escape.png',optimize=True)
        board=Image.new('RGB',atlas.size,'#17171b');board.paste(atlas,mask=atlas.getchannel('A'));board.save(PROOF/f'{role}-escape-registered.png')
        measurements[role]={'beat':beats,'support_points':points,'scale':scale,'between_scale':between_scale,'native_contact_corrections':corrections}
    (PROOF/'escape-measurements.json').write_text(json.dumps(measurements,indent=2)+'\n')
    (ROOT/'js/refund_escape_data.js').write_text('// Generated by tools/production/build_refund_entrance.py.\nexport const REFUND_ESCAPE_BEATS='+json.dumps([measurements[r]['beat'] for r in ['caller','operator','technician']],separators=(',',':'))+';\n')

def support_layers():
    """Separate only the traced planted shin; preserve the authored free leg."""
    spec=json.loads((SOURCE/'support-leg-polygons.json').read_text())
    for role,frames in spec.items():
        source=Image.open(OUT/f'{role}-escape.png').convert('RGBA')
        body=source.copy();support=Image.new('RGBA',source.size)
        for key,trace in frames.items():
            i=int(key);x,y=i%4*SIZE[0],i//4*SIZE[1]
            pose=source.crop((x,y,x+SIZE[0],y+SIZE[1]))
            # Runtime pinning starts below the knee, with no movement at the
            # seam. Preserve all pixels above it in the original body layer.
            a,b=split_support(pose,trace)
            if trace.get('fill_source'):
                # GPT paints the shin hidden behind the authored free boot.
                # Keep that boot unchanged above the new underneath layer.
                painted=cells(SOURCE/trace['fill_source'],1,1)[0]
                box=pose.getbbox();painted=register(painted,(box[3]-box[1])/painted.height)
                aligned=Image.new('RGBA',SIZE)
                aligned.alpha_composite(painted,(round(skull_x(pose)-skull_x(painted)),0))
                roi=Image.new('L',SIZE);ImageDraw.Draw(roi).polygon(trace['fill_polygon'],fill=255)
                keep=(np.asarray(roi)>0)&(np.asarray(a.getchannel('A'))>0)
                pixels=np.asarray(aligned).copy();pixels[~keep]=0
                b.alpha_composite(Image.fromarray(pixels))
            body.paste(a,(x,y));support.paste(b,(x,y))
        # The free boot occludes the support shin. At zero displacement the
        # repaired underneath layer must reproduce the approved pose exactly.
        merged=Image.alpha_composite(support,body)
        if not np.array_equal(np.asarray(merged),np.asarray(source)):
            raise ValueError(f'{role}: support split changed original pixels')
        body.save(OUT/f'{role}-escape-body.png',optimize=True)
        support.save(OUT/f'{role}-escape-support.png',optimize=True)

def debris():
    poses=cells(SOURCE/'debris-v1.png',4,3)
    sizes=[(68,74),(46,44),(24,15),(29,36),(73,67),(31,16),(15,18),(30,24),(65,48),(27,30),(29,24),(46,27)]
    atlas=Image.new('RGBA',(4*128,3*128))
    for i,im in poses.items():
        w,h=sizes[i];k=min(w/im.width,h/im.height)
        im=edges(alpha(im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS)))
        atlas.alpha_composite(im,(i%4*128+(128-im.width)//2,i//4*128+(128-im.height)//2))
    atlas.save(OUT/'entrance-debris.png',optimize=True)

def desk():
    path=SOURCE/'desk-after-v1.png'
    if not path.exists():return
    im=ImageOps.fit(Image.open(path).convert('RGBA'),(245,160),Image.Resampling.LANCZOS)
    # Preserve the original furniture edges; this patch only removes clutter.
    x=np.arange(245);y=np.arange(160)
    ax=np.minimum(np.minimum(x/5,(244-x)/5),1).clip(0,1)
    ay=np.minimum(np.minimum(y/5,(159-y)/5),1).clip(0,1)
    im.putalpha(Image.fromarray((ay[:,None]*ax[None,:]*255).astype('uint8')))
    im.save(OUT/'entrance-desk-after.png',optimize=True)

if __name__=='__main__':
    PROOF.mkdir(parents=True,exist_ok=True);actors();panic_turns();runs();support_layers();debris();desk()
