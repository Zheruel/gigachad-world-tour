"""The dredger's diesel bed: a seamless loop of a big, tired engine (firing thumps, exhaust breath,
valve clatter and a rattling housing), synthesised. Writes audio/sfx/dredger_engine.wav, the Zippo clinks and the magnet phase sounds."""
from pathlib import Path
import wave
import numpy as np

ROOT=Path(__file__).resolve().parents[2];SR=22050
def lowpass(x,a):
 y=np.empty_like(x);s=0.
 for i,v in enumerate(x):s+=a*(v-s);y[i]=s
 return y
def engine(seconds=2.4,rate=8.75,seed=7):
 rng=np.random.default_rng(seed);n=int(SR*seconds);t=np.arange(n)/SR;out=np.zeros(n)
 pulses=int(round(seconds*rate));period=n/pulses
 for k in range(pulses):
  # Each firing: a damped low thump with a breathy exhaust puff; cylinders a touch uneven.
  at=int(k*period);m=int(SR*.4);tt=np.arange(m)/SR;amp=(1,.82,.93,.76)[k%4]*(1+rng.normal(0,.05))
  thump=np.sin(2*np.pi*(46+4*(k%2))*tt)*np.exp(-tt*26)+.45*np.sin(2*np.pi*92*tt)*np.exp(-tt*34)
  puff=lowpass(rng.normal(0,1,m),.08)*np.exp(-tt*30)*.9
  np.add.at(out,(at+np.arange(m))%n,amp*(thump+puff))   # tails wrap round: the loop is seamless
 # Valve clatter and housing rattle: high, quiet ticks at twice the firing rate.
 for k in range(pulses*2):
  at=int(k*period/2+rng.integers(-40,40))%n;m=600;tt=np.arange(m)/SR
  np.add.at(out,(at+np.arange(m))%n,rng.normal(0,1,m)*np.exp(-tt*260)*(.12+.06*(k%3==0)))
 hum=.18*np.sin(2*np.pi*rate*t*6)*(.6+.4*np.sin(2*np.pi*rate*t))   # gear whine riding the firing
 out+=hum*.35
 # Rumble: low noise, its end faded into its start.
 r=lowpass(rng.normal(0,1,n+2205),.02);f=2205;r[:f]=r[:f]*np.linspace(0,1,f)+r[n:]*np.linspace(1,0,f);out+=r[:n]*.25
 return out/np.abs(out).max()*.8
def zippo(kind):
 # The finisher's Zippo, synthesised: open is the lid's bright ting, the flint wheel's rasp and the wick
 # catching with a soft whump; close is a short metallic clack.
 rng=np.random.default_rng(7 if kind=='open' else 9);n=int(SR*(.7 if kind=='open' else .25));t=np.arange(n)/SR;out=np.zeros(n)
 def ting(at,f,decay,amp):
  i=int(at*SR);tt=t[:n-i];out[i:]+=amp*sum(np.sin(2*np.pi*f*h*tt)*w for h,w in ((1,1),(2.76,.5),(5.4,.25)))*np.exp(-tt*decay)
 def click(at,amp,decay=900):
  i=int(at*SR);m=min(n-i,800);out[i:i+m]+=amp*rng.normal(0,1,m)*np.exp(-np.arange(m)/SR*decay)
 if kind=='open':
  click(0,.9);ting(.003,2350,22,.55)
  for k in range(7):click(.1+k*.011+rng.uniform(0,.003),.35,1400)   # the wheel
  i=int(.19*SR);tt=t[:n-i];out[i:]+=lowpass(rng.normal(0,1,n-i),.03)*np.minimum(1,tt*40)*np.exp(-tt*5)*.9   # the wick catches
 else:
  click(0,1,700);ting(.002,1650,45,.4);click(.012,.5,1200)
 return out/np.abs(out).max()*.8
def magnet(kind):
 # The scrap magnet: hum is a seamless mains drone (100 Hz and its buzzy odd harmonics, a slow beating
 # wobble and a crackle); zap is a hard electric snap with a falling whine; clang is a struck oil drum;
 # chain is a rattle of heavy links dragged and swung.
 rng=np.random.default_rng({'hum':3,'zap':5,'clang':11,'chain':13}[kind])
 if kind=='hum':
  n=int(SR*2);t=np.arange(n)/SR;out=sum(np.sin(2*np.pi*100*h*t)/h**.8 for h in (1,3,5,7,9))
  out*=.75+.25*np.sin(2*np.pi*1.5*t);out+=.12*np.sin(2*np.pi*50*t)
  for at in rng.integers(0,n,26):m=300;i=np.arange(m);out[(at+i)%n]+=rng.normal(0,1,m)*np.exp(-i/40)*.5
  return out/np.abs(out).max()*.7
 if kind=='zap':
  n=int(SR*.55);t=np.arange(n)/SR;f=1800*np.exp(-t*6)+140;ph=np.cumsum(2*np.pi*f/SR)
  out=np.sign(np.sin(ph))*np.exp(-t*7)*.4+rng.normal(0,1,n)*np.exp(-t*18)*(1+np.sign(np.sin(2*np.pi*31*t)))*.5
  return out/np.abs(out).max()*.85
 if kind=='clang':
  n=int(SR*.9);t=np.arange(n)/SR;out=sum(a*np.sin(2*np.pi*f*t)*np.exp(-t*d) for f,a,d in ((118,1,5),(287,.7,7),(451,.5,9),(733,.3,13),(1210,.2,20)))
  out+=lowpass(rng.normal(0,1,n),.2)*np.exp(-t*40)*1.2
  return out/np.abs(out).max()*.85
 n=int(SR*.6);out=np.zeros(n)
 for k in range(14):
  at=int((k*.038+rng.uniform(0,.012))*SR);m=min(n-at,1400);tt=np.arange(m)/SR;f=rng.uniform(1500,3200)
  out[at:at+m]+=(np.sin(2*np.pi*f*tt)+.6*np.sin(2*np.pi*f*1.53*tt))*np.exp(-tt*rng.uniform(50,90))*rng.uniform(.4,1)
 return out/np.abs(out).max()*.75
def rig(kind):
 # klaxon: the dredger's two-tone emergency horn (a reedy square pair, ~1.6 s, three blares);
 # surge: the magnet powering up, a rising electric whine into a fat crackling thump.
 rng=np.random.default_rng({'klaxon':17,'surge':19}[kind])
 if kind=='klaxon':
  n=int(SR*1.6);t=np.arange(n)/SR;f=np.where((t*3.2)%1<.5,440,370);ph=np.cumsum(2*np.pi*f/SR)
  out=(np.sign(np.sin(ph))*.6+np.sin(ph*2)*.25+np.sign(np.sin(ph*1.01))*.3)*np.clip(np.minimum(t*30,(1.6-t)*6),0,1)
  return lowpass(out,.35)/np.abs(out).max()*.6
 n=int(SR*1.3);t=np.arange(n)/SR;f=120+900*(t/1.0)**2;ph=np.cumsum(2*np.pi*f/SR);rise=np.clip(t/1.0,0,1)
 out=(np.sign(np.sin(ph))*.3+np.sin(ph*.5)*.4)*rise*(t<1.0)+rng.normal(0,1,n)*rise**3*.25*(t<1.0)
 hit=t>=1.0;tt=(t-1.0)[hit];out[hit]+=(np.sin(2*np.pi*55*tt)*1.2+rng.normal(0,1,len(tt))*.8)*np.exp(-tt*9)
 return out/np.abs(out).max()*.85
def write(path,x):
 with wave.open(str(path),'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(SR);w.writeframes((x*32767).astype('<i2').tobytes())
if __name__=='__main__':
 write(ROOT/'audio/sfx/dredger_engine.wav',engine());print('audio/sfx/dredger_engine.wav')
 for k in ('open','close'):write(ROOT/f'audio/sfx/zippo_{k}.wav',zippo(k));print(f'audio/sfx/zippo_{k}.wav')
 for k in ('hum','zap','clang','chain'):write(ROOT/f'audio/sfx/magnet_{k}.wav',magnet(k));print(f'audio/sfx/magnet_{k}.wav')
 for k in ('klaxon','surge'):write(ROOT/f'audio/sfx/rig_{k}.wav',rig(k));print(f'audio/sfx/rig_{k}.wav')
