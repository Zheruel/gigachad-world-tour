"""Register the four painted inferno plumes around their common mouth outlet."""
from pathlib import Path
from PIL import Image
import sys
sys.path.insert(0,str(Path(__file__).resolve().parent))
from sprite_edges import alpha,edges
ROOT=Path(__file__).resolve().parents[2]
src=ROOT/'assets/sources/production/stages/dirty_delhi/vendor_kitchen/pappu/inferno-fire-v1.png'
im=Image.open(src).convert('RGBA')
# Source row crops exclude neighbouring embers; outlet centres are measured on the generated sheet.
rows=[(35,324,160),(324,621,454),(621,923,755),(923,1230,1055)]
scale=440/870
sheet=Image.new('RGBA',(480,176*4))
for i,(top,bottom,mouth) in enumerate(rows):
 crop=im.crop((195,top,1085,bottom)); crop=crop.resize((round(crop.width*scale),round(crop.height*scale)),Image.Resampling.LANCZOS)
 y=56-round((mouth-top)*scale)
 cell=Image.new('RGBA',(480,176));cell.alpha_composite(crop,(4,y));cell=edges(alpha(cell))
 sheet.alpha_composite(cell,(0,i*176))
out=ROOT/'assets/stages/dirty_delhi/vendor/inferno_breath.png';sheet.save(out)
print(out)
