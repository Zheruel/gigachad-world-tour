"""Register authored locomotion and recovery sheets with a single anatomical scale."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

NAMES=['tough','bruiser','runner','ambusher','heavy','heavy_unarmed','guard','conductor','vikram','vikram_roof']
def register_cycle(cells, height, reference=None, canvas_height=240):
    # One common scale retains anatomical proportions; never normalize each pose.
    scale=height/(cells[reference].height if reference is not None else np.median([c.height for c in cells.values()]))
    frames=[]
    for i,c in sorted(cells.items()):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);band=a[round(c.height*.28):round(c.height*.48),:,3]>32
        ys,xs=np.where(band);anchor=float(np.median(xs)) if len(xs) else c.width/2
        f=Image.new('RGBA',(320,canvas_height));f.alpha_composite(c,(round(160-anchor),canvas_height-7-c.height));frames.append(clean_edge(f))
    return frames

def main():
    path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text())
    for name in NAMES:
        src=SOURCE/(name+'_gait.png')
        height=174 if name in ['runner','ambusher'] else 184 if name=='conductor' else 180
        folder=ROOT/'assets/frames'/('nr_'+name)
        if name not in ['conductor','vikram','vikram_roof']:
            cells=extract(Image.open(src),2);assert set(cells)==set(range(8)),(name,cells.keys())
            for i,f in enumerate(register_cycle(cells,height)):f.save(folder/f'gait_{i}.png')
            m['nr_'+name]['walk']=[f'nr_{name}/gait_{i}.png' for i in range(8)]
        if name in ['bruiser','conductor','vikram','vikram_roof']:
            passing=extract(Image.open(SOURCE/(name+'_passing.png')),1)
            for i,f in enumerate(register_cycle(passing,height)):f.save(folder/f'passing_{i}.png')
            m['nr_'+name]['walk']=[f'nr_{name}/{stem}.png' for stem in ['gait_0','passing_0','passing_1','gait_3','gait_4','passing_2','passing_3','gait_7']]
        if name in ['conductor','vikram','vikram_roof']:
            contact=extract(Image.open(SOURCE/(name+'_contact.png')),1)
            for i,f in enumerate(register_cycle(contact,height)):f.save(folder/f'contact_{i}.png')
            m['nr_'+name]['walk']=[f'nr_{name}/{stem}.png' for stem in ['contact_0','passing_0','passing_1','contact_1','contact_2','passing_2','passing_3','contact_3']]
        src=SOURCE/(name+'_recovery.png')
        if src.exists():
            cells=extract(Image.open(src),2);assert set(cells)==set(range(8)),(name,cells.keys())
            for i,f in enumerate(register_cycle(cells,height,3)):f.save(folder/f'recovery_{i}.png')
            m['nr_'+name]['getup']=[f'nr_{name}/recovery_{i}.png' for i in range(4)]
    cells=extract(Image.open(SOURCE/'ambusher_special_recovery.png'),2)
    for i,f in enumerate(register_cycle(cells,174,7,288)):f.save(ROOT/'assets/frames/nr_ambusher'/f'aerial_{i}.png')
    for state,ids in {'perch':[0,1],'climb':[2,3],'drop':[4,4,5],'land':[6,7]}.items():
        m['nr_ambusher'][state]=[f'nr_ambusher/aerial_{i}.png' for i in ids]
    # The inspector's strike uses a clean extension. Hit sparks belong to combat.
    m['nr_conductor']['atk']=[f'nr_conductor/performance_{i}.png' for i in [8,9,11]]
    path.write_text(json.dumps(m,indent=2)+'\n')
    # Final recipe owns runtime cleanup after all shared action recipes finish.
    used={file for states in m.values() for files in states.values() for file in files}
    for name in NAMES:
        for file in (ROOT/'assets/frames'/('nr_'+name)).glob('*.png'):
            if file.relative_to(ROOT/'assets/frames').as_posix() not in used:file.unlink()
if __name__=='__main__':main()
