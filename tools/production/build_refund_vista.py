"""Composite the authored rooftop vista through glass only, after the room joins."""
from pathlib import Path
import json
import numpy as np
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'assets/sources/production/stages/refund_tower/overhaul/vista'
# Native 2x room coordinates. Bars remain the original material; curtains and
# plants retain their actual silhouette rather than a rectangular window paste.
WINDOWS={
 'office': [([(458,159),(600,159),(600,252),(458,252)],[(517,159,525,252),(458,179,600,183)]),
            ([(771,157),(934,157),(934,252),(771,252)],[(846,157,855,252),(771,179,934,183)]),
            ([(1141,158),(1314,158),(1314,247),(1141,247)],[(1222,158,1232,247),(1141,179,1314,183)]),
            ([(1470,212),(1605,212),(1605,281),(1470,281)],[(1535,212,1542,281),(1470,228,1605,233)])],
 'annex': [([(300,82),(426,82),(426,128),(300,128)],[(342,82,350,128)]),
           ([(458,82),(571,82),(571,128),(458,128)],[]),
           ([(636,82),(838,82),(838,129),(636,129)],[(708,82,716,129)]),
           ([(858,82),(1055,82),(1055,129),(858,129)],[(940,82,948,129)]),
           ([(1116,82),(1318,82),(1318,130),(1116,130)],[(1240,82,1265,130)])],
 'calling': [([(1135,153),(1260,153),(1260,218),(1135,218)],[]),
             ([(1312,154),(1386,154),(1386,256),(1312,256)],[(1368,154,1370,192),(1312,194,1330,256)])],
 'calling_east': [([(361,62),(547,62),(547,114),(361,114)],[]),
                  ([(974,62),(1286,62),(1286,114),(974,114)],[(1102,62,1110,114)])],
 'servers': [([(872,85),(974,85),(974,120),(872,120)],[]),
             ([(1015,86),(1111,86),(1111,120),(1015,120)],[])],
 'records': [([(0,212),(99,212),(99,238),(0,238)],[(42,212,49,238)]),
             ([(132,195),(182,171),(182,198),(132,220)],[]),
             ([(213,155),(231,147),(231,174),(213,182)],[]),
             ([(292,62),(577,62),(577,120),(292,120)],[(429,62,441,120)]),
             ([(665,62),(807,62),(807,120),(665,120)],[]),
             ([(818,62),(955,62),(955,121),(818,121)],[]),
             ([(1048,62),(1340,62),(1340,121),(1048,121)],[(1189,62,1198,121)]),
             ([(1509,169),(1619,169),(1619,294),(1509,294)],[])],
 'executive': [([(22,164),(124,164),(124,294),(22,294)],[(22,164,28,294),(45,164,57,294),(82,164,90,294),(101,224,168,294)]),
               ([(331,138),(437,138),(437,237),(331,237)],[(384,138,391,237)]),
               ([(531,138),(599,138),(599,207),(531,207)],[]),
               ([(1600,94),(1619,94),(1619,248),(1551,248)],[])],
 'closer_king': [],
 'closer': [([(407,113),(503,113),(551,247),(551,298),(362,298),(362,247)],[(452,112,460,298),(360,139,555,145),(360,270,555,272)]),
            ([(669,113),(766,113),(795,248),(795,298),(638,298),(638,248)],[(713,112,722,298),(635,139,798,145),(635,270,798,272)]),
            ([(909,113),(990,113),(1026,250),(1026,298),(869,298),(869,250)],[(946,112,954,298),(866,139,1030,145),(866,270,1030,272)])],
}
# Traced curtain folds and ties need more vertices than the rectangular panes.
for key,spec in json.loads((SOURCE/'window-contours.json').read_text()).items():
    room,index=('executive',3) if key=='executive_right' else ('closer',int(key.rsplit('_',1)[1]))
    WINDOWS[room][index]=(spec['polygon'],spec['bars'])

def apply(route,names):
    path=SOURCE/'rooftops-v2.png'
    if not path.exists():path=SOURCE/'rooftops-v1.png'
    if not path.exists():return route
    vista=Image.open(path).convert('RGB')
    for room,name in enumerate(names):
        base=route.crop((room*1620,0,(room+1)*1620,540))
        old=np.array(base);r,g,b=old.astype(float).transpose(2,0,1)
        for i,(poly,bars) in enumerate(WINDOWS[name]):
            mask=Image.new('L',base.size);d=ImageDraw.Draw(mask);d.polygon(poly,fill=255)
            for box in bars:d.rectangle(box,fill=0)
            a=np.array(mask)
            # Preserve decorative curtains and the green foliage already in
            # front of the glass. Selection uses the ORIGINAL foreground colour.
            if name in ('executive','closer'):
                a[(g>r*1.02)&(g>b*1.25)]=0
            if name in ('executive','closer'):
                a[(r>g*1.65)&(r>b*1.65)&(r<110)]=0
            mask=Image.fromarray(a)
            box=mask.getbbox()
            if not box:continue
            x0,y0,x1,y1=box;h=y1-y0;w=x1-x0
            # Tall glazing shows the full dirty roofs; high clerestories show
            # the smoggy horizon and rooftop silhouettes at the same city scale.
            vh=724 if h>70 else 290
            vw=round(vh*w/h)
            centre=(room*237+i*451+430)%max(1,vista.width-min(vw,vista.width))+min(vw,vista.width)//2
            if vw>vista.width:vw=vista.width
            src=vista.crop((max(0,min(vista.width-vw,centre-vw//2)),0,max(0,min(vista.width-vw,centre-vw//2))+vw,vh))
            view=src.resize((w,h),Image.Resampling.LANCZOS)
            # The glass slightly suppresses exterior contrast, with the warm
            # indoor reflections retained in the surrounding frame.
            arr=np.array(view).astype(float)*.79+np.array([23,17,11])*.21
            base.paste(Image.fromarray(arr.astype('uint8')),(x0,y0),mask.crop(box))
        route.paste(base,(room*1620,0))
    return route
