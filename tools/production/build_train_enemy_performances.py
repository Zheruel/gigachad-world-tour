"""Extract full connected silhouettes rather than cutting limbs at grid boundaries."""
from collections import deque
import json
import numpy as np
from PIL import Image,ImageOps
from build_train_rebuild import ROOT,SOURCE,keyed
from build_train_coaches import clean_edge

def extract(im,rows):
    a=np.array(keyed(im));mask=a[:,:,3]>16;h,w=mask.shape;groups={}
    for y,x in zip(*np.where(mask)):
        if not mask[y,x]:continue
        q=deque([(int(x),int(y))]);mask[y,x]=False;points=[]
        while q:
            px,py=q.popleft();points.append((px,py))
            for nx,ny in [(px-1,py),(px+1,py),(px,py-1),(px,py+1)]:
                if 0<=nx<w and 0<=ny<h and mask[ny,nx]:mask[ny,nx]=False;q.append((nx,ny))
        if len(points)<500:continue
        xs,ys=np.array(points).T;x0,x1=xs.min(),xs.max()+1;y0,y1=ys.min(),ys.max()+1
        index=min(rows-1,int((y0+y1)/2/h*rows))*4+min(3,int((x0+x1)/2/w*4))
        if index in groups and groups[index][0]>len(points):continue
        c=np.zeros((y1-y0,x1-x0,4),dtype='uint8');c[ys-y0,xs-x0]=a[ys,xs]
        groups[index]=(len(points),Image.fromarray(c))
    return {i:c for i,(_,c) in groups.items()}

def main():
    path=ROOT/'assets/frames/manifest.json';manifest=json.loads(path.read_text())
    for name in ['tough','bruiser','runner','ambusher','heavy','heavy_unarmed','guard']:
        rows=3 if name=='heavy_unarmed' else 4
        cells=extract(Image.open(SOURCE/(name+'_performance.png')),rows)
        states={'idle':[0,1],'walk':list(range(2,10)),'atk':[10,11,12],'hurt':[13],'down':[14],'jump':[15],'block':[1],'perch':[15]}
        if name in ['ambusher','heavy']:
            states.update(walk=[2,4,3,5],atk=[9,10,11],hurt=[12],down=[13])
        if name=='guard':states['walk']=[2,4,3,5]
        if rows==3:
            states={'idle':[0,1],'walk':[2,4,3,5],'atk':[6,7,8],'hurt':[9],'down':[10],'jump':[11],'block':[1],'perch':[11]}
            cells[4]=ImageOps.mirror(cells[4])
        used=set(sum(states.values(),[]));assert used<=cells.keys(),(name,used-cells.keys())
        scale=(180 if name not in ['ambusher','runner'] else 174)/cells[0].height
        directory=ROOT/'assets/frames'/('nr_'+name);directory.mkdir(exist_ok=True)
        for i in used:
            c=cells[i];pose_scale=((180 if name not in ['ambusher','runner'] else 174)/c.height) if i in states['walk'] else scale
            c=c.resize((round(c.width*pose_scale),round(c.height*pose_scale)),Image.Resampling.NEAREST)
            mask=np.array(c)[:,:,3]>32
            ys,xs=np.where(mask[round(c.height*.42):max(1,round(c.height*.68))])
            anchor=float(np.median(xs)) if len(xs) and i not in states['down'] else c.width/2
            width=320 if name=='heavy' else 256
            f=Image.new('RGBA',(width,240));f.alpha_composite(c,(round(width/2-anchor),233-c.height))
            clean_edge(f).save(directory/f'performance_{i}.png')
        manifest['nr_'+name]={k:[f'nr_{name}/performance_{i}.png' for i in ids] for k,ids in states.items()}
    path.write_text(json.dumps(manifest,indent=2)+'\n')

if __name__=='__main__':main()
