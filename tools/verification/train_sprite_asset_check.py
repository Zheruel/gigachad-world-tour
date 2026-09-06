"""Structural complement to Chrome motion review, never a substitute for it."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
m=json.loads((ROOT/'assets/frames/manifest.json').read_text())
roles=['tough','bruiser','runner','ambusher','heavy','heavy_unarmed','guard','conductor','vikram','vikram_roof']
count=0
for role in roles:
    states=m['nr_'+role]
    assert len(states['walk'])==8,role
    assert len(states['getup'])==4,role
    for state in ['idle','walk','atk','hurt','down','getup']:
        assert states.get(state),(role,state)
    for file in set(sum(states.values(),[])):
        im=Image.open(ROOT/'assets/frames'/file)
        assert im.mode=='RGBA',file
        b=im.getbbox();assert b,file
        assert 0<b[0]<b[2]<im.width and 0<b[1]<b[3]<im.height,(file,b)
        count+=1
    walks=[Image.open(ROOT/'assets/frames'/f) for f in states['walk']]
    assert len({im.tobytes() for im in walks})==8,role
    heights=[im.getbbox()[3]-im.getbbox()[1] for im in walks]
    assert max(heights)-min(heights)<20,(role,heights)
for state in ['perch','climb','drop','land']:assert m['nr_ambusher'].get(state),state
print(f'PASS: {len(roles)} enemy families, {count} referenced poses, walk/getup/aerial coverage and unclipped silhouettes')
