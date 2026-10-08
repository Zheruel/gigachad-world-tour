"""Build the opaque route panorama (the station chai-wallah is build_station_tea.py)."""
from pathlib import Path
import numpy as np
from PIL import Image,ImageEnhance
from build_train_rebuild import SOURCE,OUT,crop,clean_actor,atlas

def main():
    Image.open(SOURCE/'continuous_vista.png').convert('RGB').resize((1620,540),Image.Resampling.NEAREST).save(OUT/'journey_vista.png')
if __name__=='__main__':main()
