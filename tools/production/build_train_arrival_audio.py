"""Platform arrival: rolling, rail-joint clacks, brake squeal and air release.

Matches platformTrainPosition(): 240 ticks, braking from full speed to rest
(distance = 1-(1-q)^2). Clacks follow distance travelled, not wall time.
"""
import numpy as np
from build_hospitality_audio import wav

def main():
    sr=24000;rng=np.random.default_rng(2715)
    arrive=240/60;tail=.95
    t=np.arange(round(sr*(arrive+tail)))/sr
    q=np.clip(t/arrive,0,1);speed=1-q;distance=1-(1-q)**2
    # Two wheel sets per rail joint; ~20 joints over the 1600-pixel approach.
    phase=(distance*20)%1
    clack=np.exp(-phase*70)+.75*np.exp(-((phase+.8)%1)*70)
    clack*=np.sin(2*np.pi*(96+40*speed)*t)+.4*rng.normal(0,1,len(t))
    grain=np.convolve(rng.normal(0,1,len(t)),np.ones(14)/14,mode='same')
    rumble=.05*np.sin(2*np.pi*(44+18*speed)*t)+.03*np.sin(2*np.pi*71*t)
    roll=np.minimum(t*6,1)*np.clip(speed*1.4,0,1)
    out=roll*(rumble+.09*grain)+.11*clack*np.clip(speed*1.6,0,1)*np.minimum(t*6,1)
    # Brake shoes bite from 1.4s; pitch falls with speed, strongest just before rest.
    bite=np.clip((t-1.4)/.5,0,1)*np.clip((arrive-.04-t)/.12,0,1)
    freq=np.cumsum(1250+650*speed+30*np.sin(t*23))/sr
    squeal=.09*np.sin(2*np.pi*freq)+.045*np.sin(2*np.pi*freq*1.52)+.02*np.sin(2*np.pi*freq*2.31)
    scrape=np.convolve(rng.normal(0,1,len(t)),[1,-1],mode='same')*.035
    out+=bite*(.5+.5*np.clip((t-2.2)/1.2,0,1))*(squeal*(.75+.25*np.sin(t*31)**2)+scrape)
    # Coupler knock at rest, then the air-brake release hiss.
    k=t-(arrive-.02)
    out+=np.where(k>0,.22*np.sin(2*np.pi*70*k)*np.exp(-k*28)+.08*rng.normal(0,1,len(t))*np.exp(-k*60),0)
    h=t-(arrive+.08)
    hiss=np.convolve(rng.normal(0,1,len(t)),[1,-1.6,.8],mode='same')
    out+=np.where(h>0,.07*hiss*np.minimum(h*20,1)*np.exp(-h*3.2),0)
    out*=np.clip((t[-1]-t)/.08,0,1)
    wav('train_arrive',out/max(1,np.abs(out).max()/.9))
if __name__=='__main__':main()
