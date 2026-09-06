"""Register Seth's bribery reveal against a fixed body scale and foot baseline."""
from PIL import Image
from build_train_rebuild import SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_service import grounded

def main():
    cells=extract(Image.open(SOURCE/'seth_intro.png'),2)
    assert len(cells)==8
    scale=180/cells[0].height
    atlas([grounded(cells[i],scale) for i in range(8)],OUT/'seth_intro.png')

if __name__=='__main__':main()
