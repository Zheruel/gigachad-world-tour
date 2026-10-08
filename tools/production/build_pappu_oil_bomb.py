"""Bake a consistent four-cell oil bomb at 2× gameplay resolution."""
from PIL import Image,ImageOps
import sys
sys.path.insert(0,__import__('os').path.dirname(__file__))
from build_pappu_demon import ROOT,SRC,grid_bodies
from sprite_edges import alpha,edges
poses=grid_bodies(alpha(Image.open(SRC/'oil-bomb-v1.png').convert('RGBA'),128),4)
scale=min(72/max(p.width for p in poses),56/max(p.height for p in poses))
out=Image.new('RGBA',(320,64))
for i,p in enumerate(poses):
 im=edges(alpha(ImageOps.mirror(p).resize((round(p.width*scale),round(p.height*scale)),Image.Resampling.LANCZOS),128))
 out.alpha_composite(im,(i*80+(80-im.width)//2,(64-im.height)//2))
out.save(ROOT/'assets/stages/dirty_delhi/vendor/oil_bomb.png')
print({'cells':4,'size':out.size,'scale':scale})
