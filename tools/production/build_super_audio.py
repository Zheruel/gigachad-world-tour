"""Provisional original electrical crack; not a verified Tekken recording."""
from pathlib import Path
import math,random,struct,wave,json
root=Path(__file__).resolve().parents[2];rate=22050;rng=random.Random(2605);out=[]
for i in range(int(rate*.42)):
 t=i/rate;env=min(1,t/.002)*math.exp(-t*12)
 noise=rng.uniform(-1,1);pulse=math.sin(2*math.pi*(1550*t-1000*t*t))
 val=env*(noise*.37+pulse*.18+math.sin(2*math.pi*95*t)*.22)
 out.append(struct.pack('<h',round(max(-.95,min(.95,val))*32767)))
with wave.open(str(root/'audio/sources/tekken5/provisional_electric.wav'),'wb') as w:
 w.setparams((1,2,rate,0,'NONE','not compressed'));w.writeframes(b''.join(out))
