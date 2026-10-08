"""Structural complement to Chrome motion review, never a substitute for it."""
import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[2]
m=json.loads((ROOT/'assets/frames/manifest.json').read_text())
cast=['brawler','chai','paan','tte','rack','commando','captain']   # the Night Train cast (docs/night-train.md)
roles=cast+['tough','bruiser','bruiser_unarmed','runner','ambusher','heavy','heavy_unarmed','guard','bodyguard','conductor','conductor_free','neta_guard','neta']
# walk cells per stride: each family's authored cycle (uneven gaits have more cells); the conductor walks one measured 5-cell step
WALK={'conductor':5,'conductor_free':5,'chai':6,'brawler':10,'commando':20}
# walk height range (px at 2x) per stride. Shera's heavy gait crouches ~12px on each down pose and rises on
# the up pose (guard_e walk 0-7 contact/down/passing/up); his head and shoulders keep one size across it.
BOB={'neta_guard':28}
# one signature state per cast family, beyond the shared set
SIGNATURE={'brawler':['shove','kick','stagger_polish','super_reaction'],'chai':['reload','hop','swing','stagger_polish','super_reaction'],
 'paan':['chew','spit','wipe','stagger_polish','super_reaction'],'tte':['bump','slam','tbarge','guardbreak','pickup','trunk','stagger_polish','super_reaction'],
 'rack':['perch','climb','hang','pullup','mantle','drop','land','leap','pounce','swing','stagger_polish','super_reaction'],
 'commando':['baton','lunge','sweep','call','cover','stagger_polish','super_reaction'],'captain':['taser','charge','call','guardbreak','stunned','stagger_polish','super_reaction']}
count=0
for role in roles:
    states=m['nr_'+role]
    assert len(states['walk'])==WALK.get(role,8),(role,len(states['walk']))
    assert len(states['getup'])>=(4 if role in cast else 3),role   # the cast recovers in four poses
    for state in SIGNATURE.get(role,[]):assert states.get(state),(role,state)
    for state in ['idle','walk','hurt','down','getup']+({'conductor':['stamp','seize','swing','chain','rehook','block','pickup','dive','sprawl','void','finisher'],'conductor_free':['stamp','block','pickup','void'],'neta_guard':['hook','hammer','charge','quake','count','catch','finisher','battered'],'neta':['aim','fire','swing','grit','kneel','flee','climb','ko']}.get(role,['atk'])):
        assert states.get(state),(role,state)
    for file in set(sum(states.values(),[])):
        im=Image.open(ROOT/'assets/frames'/file)
        assert im.mode=='RGBA',file
        b=im.getbbox();assert b,file
        assert 0<b[0]<b[2]<im.width and 0<b[1]<b[3]<im.height,(file,b)
        count+=1
    walks=[Image.open(ROOT/'assets/frames'/f) for f in states['walk']]
    assert len({im.tobytes() for im in walks})>=4,role  # halves may repeat for an even bob
    heights=[im.getbbox()[3]-im.getbbox()[1] for im in walks]
    assert max(heights)-min(heights)<BOB.get(role,20),(role,heights)
    if role in BOB:   # a deep bob must be posture, not a scale pop: one sole line, one head size
        assert len({im.getbbox()[3] for im in walks})==1,(role,'sole')
        # sampled 26px under the crown (the old 30px at the 262px walk height, scaled to Shera's 231px)
        heads=[sum(1 for x in range(im.width) if im.getpixel((x,im.getbbox()[1]+26))[3]>64) for im in walks]
        assert max(heads)/min(heads)<1.15,(role,heads)
for state in ['perch','climb','drop','land']:assert m['nr_ambusher'].get(state),state
print(f'PASS: {len(roles)} enemy families ({len(cast)} cast), {count} referenced poses, walk/getup/aerial coverage and unclipped silhouettes')
