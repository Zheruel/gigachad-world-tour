"""Register the inspector's cash, chair and challenge performance at fixed scale."""
from PIL import Image
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_service import grounded

def main():
    cells=extract(Image.open(SOURCE/'conductor_intro.png'),2)
    assert set(cells)==set(range(8)),cells.keys()
    scale=176/cells[4].height
    frames=[grounded(cells[i],scale,320,240,233) for i in range(8)]
    for f in frames:
        b=f.getbbox();assert b and 0<b[0]<b[2]<320 and 0<b[1]<b[3]<240,b
    atlas(frames,OUT/'conductor_intro.png')
    review=Image.new('RGB',(1280,480),'#24202a')
    for i,f in enumerate(frames):review.paste(f,((i%4)*320,(i//4)*240),f)
    review.save('/tmp/conductor_intro_review.png')
if __name__=='__main__':main()
