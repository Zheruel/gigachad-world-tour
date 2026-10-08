"""Rooftop Netaji's voice and Foley: audio/sfx/neta_roof_*.wav.

Voice: Streets of Rage 2 voice-bank samples (audio/sources/streets_of_rage_2, see audio/sfx/manifest.json) pitched up
into a squeaky coward (yelps, whimper, begging blips, giggle, panic scream, KO wail). Body: SOR2 thud/snap layers.
Revolver, cash and shoe Foley is synthesized here (deterministic, no dependencies beyond numpy and ffmpeg).
Run:  .venv/bin/python tools/production/build_neta_roof_audio.py
"""
from pathlib import Path
import subprocess, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'audio/sources/streets_of_rage_2'
OUT = ROOT / 'audio/sfx'
RATE = 22050
NORM = 'loudnorm=I=-16:TP=-1.5:LRA=11'

# slot -> (filter graph over inputs [0:a],[1:a]..., sources, label)
SAMPLED = {
    'neta_roof_yelp1': ('[0:a]asetrate=22050*1.18,aresample=22050', ['V16'], 'squeaky "ow" (V16 up ~3 semitones)'),
    'neta_roof_yelp2': ('[0:a]asetrate=22050*1.22,aresample=22050', ['V34'], 'yelped "ah!" (V34 up)'),
    'neta_roof_yelp3': ('[0:a]asetrate=22050*1.32,aresample=22050', ['V09'], 'winded squeak (V09 up)'),
    'neta_roof_whimper': ('[0:a]asetrate=22050*1.36,aresample=22050,vibrato=f=7.5:d=0.45,afade=t=out:st=0.18:d=0.12', ['V50'],
                          'whiny "hmm" whimper (V50 up, trembling)'),
    'neta_roof_beg': ('[0:a]asetrate=22050*1.3,aresample=22050,vibrato=f=6:d=0.35,asplit[a][b];[b]adelay=190:all=1[c];[a][c]amix=inputs=2:normalize=0',
                      ['V13'], 'pleading gibberish blips (V13 up, doubled)'),
    'neta_roof_laugh': ('[0:a]asetrate=22050*0.9,aresample=22050', ['V33'], 'nervous giggle (V33 down a touch)'),
    'neta_roof_scream': ('[0:a]asetrate=22050*1.08,aresample=22050,atrim=duration=0.75,afade=t=out:st=0.45:d=0.3', ['V23'],
                         'panicked scream (V23)'),
    'neta_roof_ko': ('[0:a]asetrate=22050*0.94,aresample=22050,aecho=0.7:0.5:90:0.25,afade=t=out:st=0.7:d=0.35', ['V05'],
                     'long falling wail for the knockout (V05)'),
    'neta_roof_thud': ('[0:a]lowpass=f=1800,volume=1.0[a];[1:a]volume=0.7,adelay=15:all=1[b];[a][b]amix=inputs=2:normalize=0', ['07', '32'],
                       'belly-flop body thud (07 over 32)'),
    'neta_roof_whip': ('[0:a]highpass=f=700,atrim=duration=0.18,afade=t=out:st=0.06:d=0.12[a];[1:a]volume=0.8[b];[a][b]amix=inputs=2:normalize=0',
                       ['03', '02'], 'pistol-butt crack (03 snap over 02 hit)'),
}


def sampled(slot, graph, sources):
    cmd = ['ffmpeg', '-y', '-loglevel', 'error']
    for s in sources:
        cmd += ['-i', str(SRC / f'{s}.wav')]
    pre = ';'.join(f'[{i}:a]aformat=channel_layouts=mono,aresample=22050[m{i}]' for i in range(len(sources)))
    graph = graph
    for i in range(len(sources)):
        graph = graph.replace(f'[{i}:a]', f'[m{i}]')
    graph = f'{pre};{graph},silenceremove=start_periods=1:start_threshold=-50dB,{NORM}[out]'
    subprocess.run(cmd + ['-filter_complex', graph, '-map', '[out]', '-ac', '1', '-ar', str(RATE), '-sample_fmt', 's16',
                          str(OUT / f'{slot}.wav')], check=True)


def write(slot, x, peak=.8):
    x = np.asarray(x, float); x = x / max(1e-9, np.abs(x).max()) * peak
    with wave.open(str(OUT / f'{slot}.wav'), 'wb') as f:
        f.setparams((1, 2, RATE, 0, 'NONE', 'not compressed')); f.writeframes((x * 32767).astype('<i2').tobytes())


rng = np.random.default_rng(1717)
T = lambda s: np.arange(int(s * RATE)) / RATE


def click(freq=3200, dur=.018, decay=260):
    t = T(dur); return (np.sin(2 * np.pi * freq * t) * .6 + rng.uniform(-1, 1, len(t)) * .5) * np.exp(-t * decay)


def at(buf, sig, start):
    i = int(start * RATE); buf[i:i + len(sig)] += sig[:max(0, len(buf) - i)]


def bandnoise(n, lo, hi):
    spec = np.fft.rfft(rng.standard_normal(n)); f = np.fft.rfftfreq(n, 1 / RATE); spec[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(spec, n)


SYNTH_LABELS = {
    'neta_roof_click': 'dry hammer fall on an empty chamber',
    'neta_roof_spin': 'cylinder swung out and spun: ratchet clicks',
    'neta_roof_drop': 'brass rounds spilling and tinkling on the roof',
    'neta_roof_snap': 'cylinder snapped shut',
    'neta_roof_cash': 'banknote fan rustle',
    'neta_roof_step': 'soft leather-shoe scuff (panicked footsteps)',
    'neta_roof_gulp': 'nervous gulp',
}


def synth():
    b = np.zeros(int(.12 * RATE)); at(b, click(2600, .02, 300), 0); at(b, click(4200, .012, 420) * .5, .006); write('neta_roof_click', b, .7)
    b = np.zeros(int(.42 * RATE))
    for k in range(9):
        at(b, click(2900 + 180 * (k % 3), .014, 380) * (1 - k / 11), .02 + k * .038 * (1 + k * .06))
    write('neta_roof_spin', b, .6)
    b = np.zeros(int(.6 * RATE))
    for k, s in enumerate([0, .09, .16, .31, .42]):
        t = T(.14); f = 5200 + 900 * rng.uniform(-1, 1)
        at(b, (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 2.76 * t)) * np.exp(-t * 38) * (1 - k * .12), s)
    write('neta_roof_drop', b, .5)
    b = np.zeros(int(.16 * RATE)); at(b, click(3400, .02, 250), 0); t = T(.09)
    at(b, np.sin(2 * np.pi * 180 * t) * np.exp(-t * 45) * .7, .004); at(b, click(2400, .016, 320) * .6, .035); write('neta_roof_snap', b, .75)
    n = int(.38 * RATE); t = np.arange(n) / RATE; flut = (np.sin(2 * np.pi * 23 * t) > .1) * .7 + .3
    write('neta_roof_cash', bandnoise(n, 1800, 7500) * flut * np.minimum(1, t / .02) * np.exp(-t * 4), .45)
    n = int(.07 * RATE); t = np.arange(n) / RATE; write('neta_roof_step', bandnoise(n, 120, 1500) * np.exp(-t * 55), .4)
    t = T(.2); f = 420 * np.exp(-t * 7); ph = 2 * np.pi * np.cumsum(f) / RATE
    g = np.sin(ph) * np.exp(-((t - .06) / .05) ** 2); at(g, click(900, .02, 200) * .6, .1); write('neta_roof_gulp', g, .55)


def main():
    for slot, (graph, sources, _) in SAMPLED.items():
        sampled(slot, graph, sources); print(slot, '<-', '+'.join(sources))
    synth(); print('synth', ', '.join(SYNTH_LABELS))


if __name__ == '__main__':
    main()
