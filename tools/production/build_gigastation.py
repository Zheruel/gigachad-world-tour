"""Cut the GigaStation boot art (js/gigastation_boot.js) from its two magenta-keyed sheets."""
from pathlib import Path
import numpy as np
from PIL import Image
import sys;sys.path.insert(0,str(Path(__file__).parent))
from keying import key,components
from build_station_life import despill
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/ui/gigastation';OUT=ROOT/'assets/ui/gigastation'
def sheet(name):return despill(np.array(key(Image.open(SRC/name).convert('RGB'))))
def crop(a,x0,y0,x1,y1):
 """Tight crop of the opaque pixels inside a source region."""
 r=a[y0:y1,x0:x1];ys,xs=np.nonzero(r[:,:,3]>24);return r[ys.min():ys.max()+1,xs.min():xs.max()+1]
def bbox(a,x0,y0,x1,y1):
 ys,xs=np.nonzero(a[y0:y1,x0:x1,3]>24);return x0+xs.min(),y0+ys.min(),x0+xs.max()+1,y0+ys.max()+1
def save(a,name):Image.fromarray(a).save(OUT/name)
def main():
 OUT.mkdir(parents=True,exist_ok=True)
 # White screen: the whole diamond, wordmark and "COMPUTER ENTERTAINMENT".
 w=sheet('boot_white.png');full=crop(w,*bbox(w,100,40,720,640))
 save(crop(w,0,640,1536,845),'wordmark.png');save(crop(w,0,845,1536,1024),'computer_entertainment.png')
 # Halves split from the whole diamond by colour (warm face side left, cool right) on its own
 # canvas, so together they rebuild it exactly and both draw from one centre.
 rgb=full[:,:,:3].astype(int);warm=rgb[:,:,0]>=rgb[:,:,2]
 for name,side in (('emblem_left.png',warm),('emblem_right.png',~warm)):
  h=full.copy();h[~side]=0;save(h,name)
 # Black screen: the colour logo.
 save(crop(sheet('boot_black.png'),40,40,760,700),'logo.png')
# CHAD's ident poses: 3x2 GPT Image sheets (see P in js/gigastation_boot.js for the order) cut into
# one row of CELL_W x CELL_H cells, 2x the logical size, feet (or the dive's fist) at bottom centre.
# The first sheet's scale comes from its standing pose; later sheets are scaled to match through
# their lean-family poses. A sheet's first lean pose is aligned on the legs of the first sheet's
# lean; its other lean poses (the same drawing) are aligned on that pose's whole body, so arm and
# face swaps don't jump. chad_poses_e.png holds sheet D's talking point with a shut grin (face only);
# chad_poses_f.png holds the rise-to-stand in-between (top middle) between copies of those poses.
CELL_W,CELL_H,STAND_H=380,330,300
SHEETS=[('chad_poses.png',[3,4,5]),('chad_poses_b.png',[3,4,5]),('chad_poses_c.png',[0,1,2,3,4,5]),('chad_poses_d.png',[0,1,4,5]),('chad_poses_e.png',[0]),('chad_poses_f.png',[])]
def cut(a):
 h,w=a.shape[:2];cells=[np.zeros_like(a) for _ in range(6)]
 # Whole-sheet parts, each given to the grid cell holding its centre (poses overhang cell lines).
 for q in components(a[:,:,3]>24):
  if len(q)<60:continue
  cy,cx=q.mean(0);n=min(1,int(cy*2//h))*3+min(2,int(cx*3//w));cells[n][q[:,0],q[:,1]]=a[q[:,0],q[:,1]]
 return cells
def box(c):ys,xs=np.nonzero(c[:,:,3]>24);return xs.min(),ys.min(),xs.max()+1,ys.max()+1
def feet(c):
 x0,y0,x1,y1=box(c);band=c[y1-int((y1-y0)*.08):y1,:,3]>24;xs=np.nonzero(band.any(0))[0];return (xs.min()+xs.max())/2,y1
def place(c,k,fx,fy):
 x0,y0,x1,y1=box(c);im=Image.fromarray(c[y0:y1,x0:x1]);im=im.resize((round(im.width*k),round(im.height*k)),Image.Resampling.LANCZOS)
 cell=Image.new('RGBA',(CELL_W,CELL_H));cell.paste(im,(round(CELL_W/2-(fx-x0)*k),round(CELL_H-(fy-y0)*k)),im);return np.array(cell)
def legs(cell):return cell[CELL_H*55//100:,:,3]>24
def body(cell):return cell[CELL_H*20//100:,:,3]>24
def align(cell,ref,part=legs):
 """Shift a lean-family cell so its legs (or whole body) sit on the reference's."""
 best=None;r=part(ref)
 for dy in range(-6,7):
  for dx in range(-10,11):
   m=part(np.roll(np.roll(cell,dy,0),dx,1));score=(m&r).sum()-(m^r).sum()*.5
   if best is None or score>best[0]:best=(score,dx,dy)
 return np.roll(np.roll(cell,best[2],0),best[1],1)
def chad(out='chad.png'):
 row=[];lean_h=None;ref=None
 for n,(name,lean) in enumerate(SHEETS):
  if not (SRC/name).exists():break
  cells=cut(sheet(name))
  if n==0:k=STAND_H/(box(cells[2])[3]-box(cells[2])[1]);lean_h=(box(cells[3])[3]-box(cells[3])[1])*k
  elif name=='chad_poses_f.png':k=STAND_H/(box(cells[2])[3]-box(cells[2])[1]);cells=[cells[1]]
  elif name!='chad_poses_e.png':k=float(np.median([lean_h/(box(cells[i])[3]-box(cells[i])[1]) for i in lean]))  # E keeps D's scale
  for i,c in enumerate(cells):
   if not c[:,:,3].any():continue  # sheet E has one pose
   fx,fy=((box(c)[0]+box(c)[2])/2,box(c)[3]) if (n,i)==(0,0) else feet(c)
   cell=place(c,k,fx,fy)
   if n==0 and i==3:ref=first=cell
   elif name=='chad_poses_e.png':cell=align(cell,row[22],body) if i in lean else cell
   elif lean and i==lean[0]:cell=first=align(cell,ref)
   elif i in lean:cell=align(cell,first,body)
   row.append(cell)
 save(np.concatenate(row,1),out)
if __name__=='__main__':main();chad()
