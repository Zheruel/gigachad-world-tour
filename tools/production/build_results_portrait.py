"""Separate results frame and foreground badge, and register CHAD's victory close-ups."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw,ImageFilter
ROOT=Path(__file__).resolve().parents[2]
import sys;sys.path.insert(0,str(Path(__file__).parent))
from keying import key,components
from build_station_life import despill
# Close-up cells are the portrait window at 2x (354x348 device px). Sources are 3x2 sheets of
# 512px square cells with the belt on the bottom edge; SCALE sets the zoom, (SX,SY) is where a
# source cell's top-left lands. Cell order is the index js/results.js plays.
CELL_W,CELL_H,COLS,SCALE,SX,SY=354,348,4,.64,-10,20
SHEETS=['results_victory.png','results_victory_b.png','results_victory_c.png']
SRC=ROOT/'assets/sources/production/ui';OUT=ROOT/'assets/ui'
def defringe(im):
 """Replace matte-contaminated edge RGB with adjacent interior ink, preserving alpha."""
 a=np.array(im);solid=a[:,:,3]>0
 inside=np.array(Image.fromarray(solid.astype('uint8')*255).filter(ImageFilter.MinFilter(5)))>0
 edge=solid&~inside&(a[:,:,:3].min(2)>45)&(a[:,:,:3].max(2)>130)
 original=a.copy();h,w=solid.shape
 for dy,dx in sorted([(y,x) for y in range(-3,4) for x in range(-3,4)],key=lambda p:p[0]**2+p[1]**2):
  if not (dy or dx):continue
  sy=slice(max(0,-dy),min(h,h-dy));sx=slice(max(0,-dx),min(w,w-dx))
  ny=slice(max(0,dy),min(h,h+dy));nx=slice(max(0,dx),min(w,w+dx))
  pick=edge[sy,sx]&inside[ny,nx]
  a[sy,sx,:3][pick]=original[ny,nx,:3][pick];edge[sy,sx][pick]=False
 # Thin neutral matte wisps have no nearby interior; they are not hair or ink.
 a[edge&(a[:,:,:3].max(2).astype(int)-a[:,:,:3].min(2)<65)]=0
 a[a[:,:,3]==0,:3]=0
 return Image.fromarray(a)
# Per-cell repairs (cell px): cigar tips unlit until the Zippo lights them; the flex-laugh cell
# re-registered onto the flex; generation crop edges cut hard where the pillars cover them.
UNLIT={4:(209,161,8),9:(211,156,6)};SHIFT={8:(21,0)};CLIP={3:(30,288),6:(0,288),8:(30,288)}
def fix_cells(cells):
 for i,(cx,cy,rad) in UNLIT.items():
  a=np.array(cells[i]).astype(float);yy,xx=np.indices(a.shape[:2])
  hot=(((xx-cx)/rad)**2+((yy-cy)/rad)**2<=1)&(a[:,:,0]>140)&(a[:,:,1]<190)&(a[:,:,2]<110)&(a[:,:,3]>0)&(xx<cx+6)
  lum=a[:,:,:3].mean(2)[hot]/255;a[hot,:3]=np.stack([60+70*lum,54+62*lum,50+56*lum],1)
  cells[i]=Image.fromarray(a.astype('uint8'))
 for i,(dx,dy) in SHIFT.items():
  c=Image.new('RGBA',cells[i].size);c.alpha_composite(cells[i].crop((max(0,-dx),max(0,-dy),CELL_W-max(0,dx),CELL_H-max(0,dy))),(max(0,dx),max(0,dy)));cells[i]=c
 for i,(x0,x1) in CLIP.items():
  a=np.array(cells[i]);a[:,:x0]=0;a[:,x1:]=0;cells[i]=Image.fromarray(a)
def main():
 bg=Image.open(SRC/'results_empty.png').convert('RGBA').resize((960,540),Image.Resampling.LANCZOS)
 bg.save(OUT/'results_card.png')
 foreground=Image.new('L',bg.size)
 d=ImageDraw.Draw(foreground)
 d.polygon([(0,371),(18,379),(28,368),(45,359),(54,348),(88,351),(98,346),(123,341),(147,343),(176,352),(188,348),(199,365),(211,375),(235,392),(229,437),(207,477),(215,508),(225,540),(0,540)],fill=255)
 rgb=np.array(bg)[:,:,:3].astype(float);r,g,b=rgb.transpose(2,0,1)
 yy,xx=np.indices(r.shape)
 # Gold laurel, plus the red ribbons (not the curtain folds showing right of the laurel).
 colors=(((r>80)&(r>g*1.1)&(g>b*1.4))|((r>50)&(r>g*1.8)&(r>b*1.8)))&~((xx>190)&(yy<470)&(g<r*.42))
 mask=np.array(foreground)>0
 face=((xx-128)/68)**2+((yy-414)/68)**2<=1
 keep=(mask&colors)|face
 # Drop loose flecks the colour key picks up off the curtain.
 for q in components(keep):
  if len(q)<40:keep[q[:,0],q[:,1]]=False
 foreground=Image.fromarray(keep.astype('uint8')*255)
 fg=bg.copy();fg.putalpha(foreground);fg.save(OUT/'results_badge.png')
 cells=[]
 for name in SHEETS:
  if not (SRC/name).exists():continue
  sheet=Image.fromarray(despill(np.array(key(Image.open(SRC/name).convert('RGB')))))
  w,h=sheet.size
  for r in range(2):
   for c in range(3):
    im=sheet.crop((round(c*w/3),round(r*h/2),round((c+1)*w/3),round((r+1)*h/2)))
    a=np.array(im);parts=components(a[:,:,3]>24)
    keep=np.zeros(a.shape[:2],bool)
    for q in parts[:1]+[q for q in parts[1:] if len(q)>=400]:keep[q[:,0],q[:,1]]=True
    a[~keep]=0;im=Image.fromarray(a).resize((round(im.width*SCALE),round(im.height*SCALE)),Image.Resampling.LANCZOS)
    cell=Image.new('RGBA',(CELL_W,CELL_H));cell.alpha_composite(im,(SX,CELL_H-im.height+SY)) if SX>=0 else cell.paste(im,(SX,CELL_H-im.height+SY),im)
    cells.append(cell)
 # The smoking loop (5 rest, 10 drag, 11 exhale) comes from results_victory_c.png so its three
 # frames share one head: scaled and placed onto the original cell 5's outline.
 if (SRC/'results_victory_c.png').exists() and len(cells)>=18:
  c=cells[12:15];del cells[12:]
  def box(im):return np.array(im.getchannel('A').point(lambda v:255 if v>24 else 0).getbbox())
  ref,own=box(cells[5]),box(c[0]);k=(ref[2]-ref[0])/(own[2]-own[0])
  for n,im in zip([5,10,11],c):
   im=im.resize((round(CELL_W*k),round(CELL_H*k)),Image.Resampling.LANCZOS);cell=Image.new('RGBA',(CELL_W,CELL_H))
   cell.paste(im,(round((ref[0]+ref[2])/2-(own[0]+own[2])/2*k),round(ref[1]-own[1]*k)),im);cells[n]=cell
 fix_cells(cells)
 out=Image.new('RGBA',(CELL_W*COLS,CELL_H*((len(cells)+COLS-1)//COLS)))
 for i,cell in enumerate(cells):out.paste(cell,(i%COLS*CELL_W,i//COLS*CELL_H))
 out.save(OUT/'results_portrait.png')
if __name__=='__main__':main()
