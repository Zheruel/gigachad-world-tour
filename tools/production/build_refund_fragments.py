#!/usr/bin/env python3
"""Register the King's generated debris in the shared 4×2 gore format."""
from pathlib import Path
import fcntl
from PIL import Image, ImageDraw
from sprite_edges import alpha, edges
from build_delhi_cast_performances import cells

ROOT=Path(__file__).resolve().parents[2]
source=ROOT/'assets/sources/production/stages/refund_tower/redesign/scam_king/damaged/fragments-v1.png'
out=ROOT/'assets/stages/refund_tower/scam_king/fragments.png'
sheet=Image.new('RGBA',(512,256))
for i,part in cells(source,4,2).items():
    part.thumbnail((112,112),Image.Resampling.LANCZOS)
    part=edges(alpha(part),look='scam_king')
    sheet.alpha_composite(part,(i%4*128+(128-part.width)//2,i//4*128+(128-part.height)//2))
sheet.save(out)
board=Image.new('RGB',(1024,512))
for x,color in [(0,'#17131a'),(512,'#e8dfcc')]:
    ImageDraw.Draw(board).rectangle((x,0,x+512,512),fill=color)
    board.paste(sheet,(x,12),sheet)
    native=sheet.resize((256,128),Image.Resampling.NEAREST)
    board.paste(native,(x+128,315),native)
review=ROOT/'tmp/review/scam-king/death';review.mkdir(exist_ok=True,parents=True)
board.save(review/'fragments-edges.png')
with (ROOT/'assets/frames/.manifest.lock').open('a') as lock:
    fcntl.flock(lock,fcntl.LOCK_EX)
    p=ROOT/'js/assets.js';s=p.read_text()
    if 'fragments_ic_closer:' not in s:
        s=s.replace("  arcade_defeats:","  fragments_ic_closer: 'assets/stages/refund_tower/scam_king/fragments.png',\n  arcade_defeats:")
    p.write_text(s)
print(out)
