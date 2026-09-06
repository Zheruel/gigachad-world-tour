#!/usr/bin/env python3
"""Build short lobby Foley: ice shaker, paperwork, stamp and glass."""
from pathlib import Path
import wave
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
def wav(name,data):
    path=ROOT/'audio/sfx'/f'{name}.wav'
    with wave.open(str(path),'wb') as out:
        out.setparams((1,2,24000,0,'NONE','not compressed'))
        out.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
def main():
    rng=np.random.default_rng(1947); sr=24000
    def burst(length,decay):
        t=np.arange(round(length*sr))/sr
        n=rng.normal(0,1,len(t));n=np.diff(n,prepend=0)
        return t,n*np.exp(-t*decay)*np.minimum(t*600,1)
    t,n=burst(.11,23)
    # One wrist stroke: ice rushing, then small impacts against the metal tin.
    shaker=.12*n
    for offset,freq in [(0.008,2150),(.027,3370),(.046,2780),(.061,4290)]:
        u=np.maximum(0,t-offset)
        shaker+=(t>=offset)*.09*np.sin(u*2*np.pi*freq)*np.exp(-u*95)
    shaker*=np.minimum((.11-t)*300,1)
    wav('room_shaker',shaker)
    t,n=burst(.36,9);wav('room_page',.028*n*np.sin(np.pi*np.clip(t/.36,0,1))**2)
    t,n=burst(.12,45);wav('room_pen',.025*n)
    t,n=burst(.2,30);wav('room_stamp',.065*n+.16*np.sin(t*2*np.pi*145)*np.exp(-t*34))
    t,n=burst(.7,12);wav('room_glass',sum(.07*np.sin(t*2*np.pi*f)*np.exp(-t*d) for f,d in [(1870,12),(2940,16),(4130,20)]))
    t=np.arange(round(.38*sr))/sr
    scrape=np.convolve(rng.normal(0,1,len(t)),np.ones(14)/14,mode='same')
    envelope=np.sin(np.pi*t/.38)**2
    wav('room_chair',envelope*(.12*scrape+.025*np.sin(2*np.pi*(165*t+25*t*t))))
if __name__=='__main__':main()
