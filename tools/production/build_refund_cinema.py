"""Register the selected crack and Closer reactions without changing anatomical scale."""
from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFilter
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/rebuild'
OUT = ROOT / 'assets/stages/refund_tower'

def build():
    wall = ImageOps.fit(Image.open(SOURCE/'wall_cracked.png').convert('RGBA'), (460,724), Image.Resampling.LANCZOS)
    mask = Image.new('L', wall.size)
    ImageDraw.Draw(mask).rounded_rectangle((110,252,350,637), 16, fill=255)
    wall.putalpha(mask.filter(ImageFilter.GaussianBlur(5)))
    wall.save(OUT/'wall_cracked.png', optimize=True)
    cells = extract(Image.open(SOURCE/'closer_finish.png'), 2)
    assert set(cells) == set(range(8)), sorted(cells)
    # The upright head-hit pose defines one physical scale for all bent/flying poses.
    scale = 180 / cells[1].height
    falls = extract(Image.open(SOURCE/'closer_fall.png'), 1)
    assert set(falls) == set(range(4)), sorted(falls)
    fall_scale = cells[7].width * scale / falls[3].width
    atlas = Image.new('RGBA', (1024,768))
    for i,c in cells.items():
        if i != 7:
            c = ImageOps.mirror(c)
        c = c.resize((round(c.width*scale),round(c.height*scale)), Image.Resampling.LANCZOS)
        tile = Image.new('RGBA', (256,256))
        tile.alpha_composite(c, ((256-c.width)//2, 248-c.height))
        atlas.alpha_composite(clean_edge(tile), (i%4*256, i//4*256))
    for i,c in falls.items():
        c=c.resize((round(c.width*fall_scale),round(c.height*fall_scale)),Image.Resampling.LANCZOS)
        tile=Image.new('RGBA',(256,256))
        tile.alpha_composite(c,((256-c.width)//2,248-c.height))
        atlas.alpha_composite(clean_edge(tile),(i*256,512))
    atlas.save(OUT/'closer_finish.png', optimize=True)
    print('Closer: 12 registered reactions, single scale per matched sheet',round(scale,4),round(fall_scale,4))

if __name__ == '__main__':
    build()
