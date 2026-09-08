"""Register selected charging contacts with a common anatomical scale per actor."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def main():
    path=ROOT/'assets/frames/manifest.json';manifest=json.loads(path.read_text())
    preview=Image.new('RGB',(1280,480),'#252a31')
    for row,(key,source,rows,scale,canvas_height,indices) in enumerate([
        ('nr_conductor','conductor_charge.png',2,.47,240,[0,3,2]),
        ('nr_vikram_roof','seth_charge.png',1,.35,224,[0,1,2,3]),
    ]):
        cells=extract(Image.open(SOURCE/source),rows)
        paths=[]
        for i,j in enumerate(indices):
            c=cells[j];c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
            alpha=np.array(c)[:,:,3]>32
            _,xs=np.where(alpha[round(c.height*.43):round(c.height*.65)])
            anchor=float(np.median(xs))
            f=Image.new('RGBA',(320,canvas_height));f.alpha_composite(c,(round(160-anchor),canvas_height-7-c.height))
            f=clean_edge(f);name=f'{key}/charge_polish_{i}.png';f.save(ROOT/'assets/frames'/name);paths.append(name)
            preview.paste(f,(i*320,row*240),f)
        manifest[key]['charge_polish']=paths
    path.write_text(json.dumps(manifest,indent=2)+'\n')
    directory=ROOT/'tmp/review/train-life-polish';directory.mkdir(parents=True,exist_ok=True)
    preview.save(directory/'charge-actors-2x.png')
    preview.resize((640,240),Image.Resampling.NEAREST).save(directory/'charge-actors-480.png')

if __name__=='__main__':main()
