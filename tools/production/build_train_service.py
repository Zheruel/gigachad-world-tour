"""Register the pantry performance and inspector's office actions."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def grounded(c,scale,width=320,height=240,feet=233):
    c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
    a=np.array(c);ys,xs=np.where(a[round(c.height*.4):round(c.height*.65),:,3]>32)
    anchor=float(np.median(xs)) if len(xs) else c.width/2
    f=Image.new('RGBA',(width,height));f.alpha_composite(c,(round(width/2-anchor),feet-c.height))
    return clean_edge(f)

def main():
    cells=extract(Image.open(SOURCE/'pantry_cook.png'),2)
    assert len(cells)==8
    scale=154/cells[0].height
    atlas([grounded(cells[i],scale,192,192,186) for i in range(8)],OUT/'pantry_cook.png')
    cells=extract(Image.open(SOURCE/'conductor_performance.png'),4)
    extra=extract(Image.open(SOURCE/'conductor_office.png'),2)
    assert len(cells)==16 and len(extra)==8
    directory=ROOT/'assets/frames/nr_conductor';directory.mkdir(exist_ok=True)
    scale=184/cells[0].height
    for i,c in cells.items():grounded(c,scale).save(directory/f'performance_{i}.png')
    for i,c in extra.items():
        pose_scale=184/c.height if i<4 else 184/extra[6].height
        grounded(c,pose_scale).save(directory/f'office_{i}.png')
    states={'idle':['performance_0','performance_1'],'walk':['performance_4'],'atk':[f'performance_{i}' for i in [8,9,10,11]],'hurt':['performance_14'],'down':['performance_15'],'jump':['performance_12'],'block':['performance_2'],'whistle':['performance_3'],'charge':['performance_12','performance_13'],'rise':['office_4','office_5','office_6']}
    path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text());m['nr_conductor']={k:[f'nr_conductor/{i}.png' for i in ids] for k,ids in states.items()};path.write_text(json.dumps(m,indent=2)+'\n')

if __name__=='__main__':main()
