"""Render a short pea-whistle cue; no speech and no external dependencies."""
from pathlib import Path
import math, random, struct, wave
ROOT=Path(__file__).resolve().parents[2]
def main():
    rate=22050; rng=random.Random(742); out=[]; phase=0
    for i in range(round(.65*rate)):
        t=i/rate
        # Two breaths, with soft attacks and a brief gap, like a hand-held whistle.
        local=t if t<.27 else t-.34
        duration=.24 if t<.27 else .29
        env=max(0,min(1,local/.014,(duration-local)/.035)) if 0<=local<=duration else 0
        freq=2450+65*math.sin(2*math.pi*23*t)
        phase+=2*math.pi*freq/rate
        sample=env*(.43*math.sin(phase)+.12*math.sin(phase*1.013)+.025*(rng.random()*2-1))
        out.append(struct.pack('<h',round(sample*32767)))
    with wave.open(str(ROOT/'audio/sfx/conductor_whistle.wav'),'wb') as f:
        f.setparams((1,2,rate,0,'NONE','not compressed'));f.writeframes(b''.join(out))
if __name__=='__main__':main()
