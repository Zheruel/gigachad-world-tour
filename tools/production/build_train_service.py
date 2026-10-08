"""Shared grounding for train intro poses."""
import json
import numpy as np
from PIL import Image
from build_train_rebuild import ROOT,SOURCE,OUT,atlas
from build_train_enemy_performances import extract
from build_train_coaches import clean_edge

def grounded(c,scale,width=320,height=240,feet=233):
    c=c.resize((round(c.width*scale),round(c.height*scale)),Image.Resampling.NEAREST)
    a=np.array(c);ys,xs=np.where(a[round(c.height*.4):round(c.height*.65),:,3]>32)
    anchor=float(np.median(xs)) if len(xs) else c.width/2
    f=Image.new('RGBA',(width,height));f.alpha_composite(c,(round(width/2-anchor),feet-c.height))
    return clean_edge(f)
