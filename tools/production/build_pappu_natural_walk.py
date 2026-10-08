"""Register the drawn heavy gait and two stop transitions with uniform anatomical scales."""
from PIL import Image,ImageDraw
import argparse,json,fcntl,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).parent))
from build_pappu_demon import grid_bodies,ROOT,SRC,OUT
from sprite_edges import alpha,edges

def skull_x(im):
    box=im.getchannel('A').crop((0,0,im.width,round(im.height*.18))).getbbox()
    return (box[0]+box[2])/2

def main():
    p=argparse.ArgumentParser();p.add_argument('--source',default='unified-walk-v1.png');p.add_argument('--count',type=int,default=15);p.add_argument('--register',action='store_true');a=p.parse_args()
    ref=Image.open(OUT/'demon_idle3_00.png').convert('RGBA');box=ref.getbbox();body=ref.crop(box);head=box[0]+skull_x(body)
    def family(name,n,calibration=0):
        poses=grid_bodies(alpha(Image.open(SRC/(name+'.png')).convert('RGBA'),128),n)
        scale=body.height/poses[calibration].height;out=[]
        for pose in poses:
            im=edges(alpha(pose.resize((round(pose.width*scale),round(pose.height*scale)),Image.Resampling.LANCZOS),128))
            frame=Image.new('RGBA',ref.size);frame.alpha_composite(im,(round(head-skull_x(im)),432-im.height));out.append(frame)
        return out
    frames=family(a.source.removesuffix('.png'),a.count)
    dest=OUT if a.register else ROOT/'tmp/review/pappu-natural-walk';dest.mkdir(parents=True,exist_ok=True)
    banks={'demon_walk3':('natural_walk',frames)}
    banks['demon_walk_stop']=('natural_stop',family('natural-walk-stop-v1',3,2)[:2])
    banks['demon_walk_stop_far']=('natural_stop_far',family('natural-walk-stop-far-v1',3,2)[:2])
    updates={}
    for state,(prefix,poses)in banks.items():
        for i,frame in enumerate(poses):frame.save(dest/f'{prefix}_{i:02}.png')
        updates[state]=[f'ic_vendor/{prefix}_{i:02}.png'for i in range(len(poses))]
    sheet=Image.new('RGB',(4*280,((len(frames)+3)//4)*240),(28,24,22));draw=ImageDraw.Draw(sheet)
    for i,frame in enumerate(frames):
        x=i%4*280;y=i//4*240;im=frame.resize((280,220),Image.Resampling.NEAREST);sheet.paste(im,(x,y),im);draw.text((x+8,y+222),str(i),fill='white')
    sheet.save(ROOT/'tmp/review/pappu-natural-walk-sheet.png')
    if a.register:
        with open(ROOT/'assets/frames/.manifest.lock','a')as lock:
            fcntl.flock(lock,fcntl.LOCK_EX);path=ROOT/'assets/frames/manifest.json';m=json.loads(path.read_text());m['ic_vendor'].update(updates);path.write_text(json.dumps(m,indent=2)+'\n')
    print({'frames':len(frames),'destination':str(dest)})
if __name__=='__main__':main()
