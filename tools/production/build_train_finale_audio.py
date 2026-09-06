"""Deterministic brake friction and short fictional-device Foley."""
import numpy as np
from build_hospitality_audio import wav

def main():
    sr=24000;rng=np.random.default_rng(8160)
    duration=358/60
    t=np.arange(round(sr*duration))/sr
    texture=np.convolve(rng.normal(0,1,len(t)),np.ones(5)/5,mode='same')
    envelope=np.minimum(t*8,1)*np.clip((duration-t)/.55,0,1)
    # Leave the opening quote clear; friction rises after its delivery.
    envelope*=.32+.68*np.clip((t-2.05)/.35,0,1)
    frequency=1100*t+4*np.sin(t*4)-35*t*t
    squeal=.13*np.sin(2*np.pi*frequency)+.06*np.sin(2*np.pi*frequency*1.63)
    wav('train_brake',envelope*(squeal*(.7+.3*np.sin(t*19)**2)+.055*texture))
    # Speed-matched rolling and air movement: three seconds cruising, then braking.
    t=np.arange(round(sr*539/60))/sr
    speed=np.where(t<3,1,np.clip(1-(t-3)/6,0,1))
    distance=np.where(t<3,t,3+(t-3)-(t-3)**2/12)
    phase=(distance*3.2)%1
    impacts=np.exp(-phase*55)+.7*np.exp(-((phase+.72)%1)*55)
    grain=np.convolve(np.random.default_rng(8161).normal(0,1,len(t)),np.ones(18)/18,mode='same')
    rumble=.045*np.sin(2*np.pi*52*t)+.026*np.sin(2*np.pi*79*t)
    duck=1-.62*np.clip((t-3)/.1,0,1)*np.clip((5.2-t)/.2,0,1)
    envelope=np.minimum(t*12,1)*np.minimum(speed*5,1)*duck
    wav('train_approach',envelope*(rumble+.1*grain+.09*impacts*np.sin(2*np.pi*88*t)))
    t=np.arange(int(sr*.32))/sr
    wav('charge_arm',.07*np.sin(2*np.pi*1360*t)*np.exp(-t*16)+.045*rng.normal(0,1,len(t))*np.exp(-t*55))
    t=np.arange(int(sr*.09))/sr
    wav('remote_click',.16*rng.normal(0,1,len(t))*np.exp(-t*95)+.07*np.sin(2*np.pi*260*t)*np.exp(-t*60))
if __name__=='__main__':main()
