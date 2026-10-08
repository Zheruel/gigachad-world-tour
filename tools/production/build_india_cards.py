"""Build the Refund Tower wordmarks and registered destruction patches."""
from pathlib import Path
from PIL import Image,ImageOps,ImageDraw,ImageFilter
from build_train_rebuild import keyed
from build_train_coaches import clean_edge
ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/'assets/sources/production/stages'
def patch(name,box,size):
 source=SRC/'refund_tower/rebuild'
 im=Image.open(source/f'{name}_b.png').convert('RGBA')
 im=ImageOps.fit(im,size,Image.Resampling.LANCZOS)
 # Preserve the old scene outside the actual authored impact region.
 mask=Image.new('L',size);ImageDraw.Draw(mask).rounded_rectangle(box,16,fill=255)
 mask=mask.filter(ImageFilter.GaussianBlur(5));im.putalpha(mask)
 im.save(ROOT/f'assets/stages/refund_tower/{name}_b.png',optimize=True)
 Image.open(source/f'{name}_reference.png').resize(size,Image.Resampling.LANCZOS).save(ROOT/f'assets/stages/refund_tower/{name}.png',optimize=True)
def build():
 im=keyed(Image.open(SRC/'refund_tower/rebuild/headings.png'))
 for i,name in enumerate(['refund-tower','act-two-india','act-three-india','the-closer']):
  if name.startswith('act-'):continue  # rows kept in the source sheet; no longer used
  cell=im.crop((0,i*im.height//4,im.width,(i+1)*im.height//4));cell=cell.crop(cell.getbbox())
  cell.thumbnail((1200,180),Image.Resampling.LANCZOS);clean_edge(cell).save(ROOT/f'assets/ui/headings/{name}.png',optimize=True)
 patch('wall',(110,252,350,637),(460,724))
if __name__=='__main__':build()
