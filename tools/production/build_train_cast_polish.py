"""Register replacement seated passenger and railway commissioner's performances."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE,OUT,cell,crop,clean_actor,register,atlas,neutral_key,keyed

def main():
    im=neutral_key(Image.open(SOURCE/'passenger_seated.png'))
    cells=[crop(clean_actor(cell(im,i,4,1))) for i in range(4)]
    scale=180/cells[0].height;frames=[]
    for c in cells:
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        a=np.array(c);a[:,:,:3]=(a[:,:,:3].astype(float)*.9).astype('uint8');a[a[:,:,3]==0,:3]=0
        f=Image.new('RGBA',(224,224));f.alpha_composite(Image.fromarray(a),((224-c.width)//2,217-c.height));frames.append(f)
    atlas(frames,OUT/'passenger_seated.png')
    atlas(register([cell(Image.open(SOURCE/'roof_escape.png'),i) for i in range(12)],(224,224),174),OUT/'roof_escape.png')
    im=Image.open(SOURCE/'wreck.png').convert('RGBA');frames=[]
    # Register the actual wheel landmarks, not the changing fire/smoke bounds.
    bounds=[(0,310),(310,592),(592,927),(927,1312)]
    landmarks=[(161,1060,286),(178,1054,577),(161,1057,906),(159,1057,1280)]
    for (top,bottom),(left,right,ground) in zip(bounds,landmarks):
        scale=783/(right-left)
        c=im.crop((0,top,im.width,bottom))
        c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
        f=Image.new('RGBA',(1024,320))
        f.alpha_composite(c,(round(142-left*scale),round(300-(ground-top)*scale)))
        frames.append(f)
    out=Image.new('RGBA',(1024,1280))
    for i,f in enumerate(frames):out.paste(f,(0,i*320))
    out.save(OUT/'wreck.png')
    path=ROOT/'assets/frames/manifest.json';manifest=json.loads(path.read_text())
    for name in ['vikram','vikram_roof']:
        frames=register([cell(Image.open(SOURCE/(name+'.png')),i) for i in range(12)])
        directory=ROOT/'assets/frames'/('nr_'+name)
        for i,f in enumerate(frames):f.save(directory/f'{i}.png')
        manifest['nr_'+name]={k:[f'nr_{name}/{i}.png' for i in ids] for k,ids in {'idle':[0,1],'walk':[2,3,4,5],'atk':[6,7,8],'hurt':[9],'down':[10],'jump':[11],'perch':[11],'block':[6]}.items()}
        for old in directory.glob('walk_*.png'):old.unlink()
    frames=register([cell(Image.open(SOURCE/'vikram_actions.png'),i) for i in range(12)])
    for i,f in enumerate(frames):f.save(ROOT/'assets/frames/nr_vikram'/f'action_{i}.png')
    for k,ids in {'pistol':[0,1,2,3,4],'grab':[5,6,7],'climb':[8,9],'block':[11]}.items():manifest['nr_vikram'][k]=[f'nr_vikram/action_{i}.png' for i in ids]
    path.write_text(json.dumps(manifest,indent=2)+'\n')
if __name__=='__main__':main()
