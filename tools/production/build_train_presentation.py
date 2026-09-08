"""Register selected train presentation poses without changing gameplay frame data."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE,OUT,keyed,neutral_key,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def register(cells,height,canvas_height,reference):
    scale=height/np.median([cells[i].height for i in reference])
    result=[]
    for i,c in sorted(cells.items()):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        alpha=np.array(c)[:,:,3];band=alpha[round(c.height*.46):round(c.height*.68)]>32
        _,xs=np.where(band);anchor=float(np.median(xs)) if len(xs) else c.width/2
        f=Image.new('RGBA',(320,canvas_height));f.alpha_composite(c,(round(160-anchor),canvas_height-7-c.height))
        result.append(clean_edge(f))
    return result

def main():
    manifest_path=ROOT/'assets/frames/manifest.json';manifest=json.loads(manifest_path.read_text())
    cells=extract(neutral_key(Image.open(SOURCE/'conductor_presentation.png')),2)
    assert len(cells)==8
    frames=register(cells,184,240,[4,5,6])
    folder=ROOT/'assets/frames/nr_conductor'
    for i,f in enumerate(frames):f.save(folder/f'polish_{i}.png')
    for state,indices in {'baton_polish':[0,1,2,3],'whistle_polish':[4,5,6],'stagger_polish':[7],'guard_polish':[3]}.items():
        manifest['nr_conductor'][state]=[f'nr_conductor/polish_{i}.png' for i in indices]
    cells=extract(Image.open(SOURCE/'seth_presentation.png'),2)
    assert len(cells)==8
    frames=register(cells,180,224,[1,2,5,6])
    for name,offset in [('nr_vikram',0),('nr_vikram_roof',4)]:
        folder=ROOT/'assets/frames'/name
        for i in range(3):frames[i+offset].save(folder/f'polish_{i}.png')
        for state,indices in {'guard_polish':[0],'recover_polish':[1],'stagger_polish':[2]}.items():
            manifest[name][state]=[f'{name}/polish_{i}.png' for i in indices]
    cells=extract(Image.open(SOURCE/'passenger_reaction.png'),1)
    assert len(cells)==4
    scale=180/cells[0].height;frames=[]
    for i,c in sorted(cells.items()):
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);a[:,:,:3]=(a[:,:,:3].astype(float)*.9).astype('uint8');a[a[:,:,3]==0,:3]=0
        f=Image.new('RGBA',(224,224));f.alpha_composite(Image.fromarray(a),((224-c.width)//2,217-c.height));frames.append(clean_edge(f))
    atlas(frames,OUT/'passenger_reaction.png')
    manifest_path.write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
