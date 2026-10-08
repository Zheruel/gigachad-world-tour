#!/usr/bin/env python3
"""Synthesise the lair lion's voice: the low growl when CHAD walks up to him (he no longer
roars or smokes, so the roar and the cigar exhales are gone).

Nothing in the licensed SOR2/Duke banks is an animal - every candidate is a pitched
human shout - so these are source-filter synthesis: a rough glottal pulse train with
jitter and period doubling (the rattle that makes a big cat sound big), aspiration
noise, and three moving formants for a huge open throat. Deterministic (fixed seed).

  ./.venv/bin/python tools/production/build_lion_audio.py
    -> audio/sfx/lion_growl.wav
"""
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 24000
rng = np.random.default_rng(1414)


def wav(name, data, peak=0.89):
    data = data / max(1e-9, np.abs(data).max()) * peak
    with wave.open(str(ROOT / 'audio/sfx' / f'{name}.wav'), 'wb') as out:
        out.setparams((1, 2, SR, 0, 'NONE', 'not compressed'))
        out.writeframes((np.clip(data, -1, 1) * 32767).astype('<i2').tobytes())


def resonate(x, freq, bw, block=64):
    """Two-pole resonator whose centre and bandwidth follow per-sample curves."""
    y = np.zeros_like(x)
    y1 = y2 = 0.0
    for s in range(0, len(x), block):
        f, b = float(freq[s]), float(bw[s])
        r = np.exp(-np.pi * b / SR)
        a1, a2 = 2 * r * np.cos(2 * np.pi * f / SR), -r * r
        g = 1 - r
        for i in range(s, min(s + block, len(x))):
            v = g * x[i] + a1 * y1 + a2 * y2
            y2, y1 = y1, v
            y[i] = v
    return y


def lowpass(x, k):
    y = np.empty_like(x); v = 0.0
    for i, s in enumerate(x):
        v += k * (s - v); y[i] = v
    return y


def source(f0, rough, breath):
    """Glottal pulses along an f0 curve, with jitter, and every other pulse weakened by
    `rough` (period doubling: a subharmonic an octave below)."""
    n = len(f0)
    jit = 1 + 0.035 * lowpass(rng.normal(0, 1, n), 0.02) * 6
    phase = np.cumsum(f0 * jit / SR)
    frac = phase % 1.0
    pulse = np.exp(-frac * 9) - np.exp(-frac * 40)          # sharp open, slow close
    odd = (np.floor(phase) % 2).astype(bool)
    pulse = pulse * np.where(odd, 1 - rough, 1.0)
    pulse = np.diff(pulse, prepend=0) * 18
    noise = rng.normal(0, 1, n) * breath
    return pulse + noise


def voice(f0, amp, open_, rough, breath, formants):
    src = source(f0, rough, breath)
    out = 0
    for (lo, hi, bw, g) in formants:
        out = out + g * resonate(src, lo + (hi - lo) * open_, np.full(len(src), bw))
    out = np.tanh(out * 2.2) * amp
    return out


def env(t, pts):
    xs, ys = zip(*pts)
    return np.interp(t, xs, ys)


def growl():
    """A low closed-mouth rumble with the 12 Hz rattle, pitched up enough (80-95 Hz) and
    given enough mid formant that small speakers still hear it."""
    d = 0.95
    t = np.arange(int(d * SR)) / SR
    f0 = env(t, [(0, 70), (.25, 92), (.65, 86), (.95, 66)])
    amp = env(t, [(0, 0), (.08, .85), (.7, .7), (.95, 0)]) * (.6 + .4 * np.sin(2 * np.pi * 12 * t) ** 2)
    open_ = env(t, [(0, 0), (.35, .4), (.95, .1)])
    formants = [(330, 450, 100, 1.0), (800, 1000, 150, .6), (2000, 2200, 250, .2)]
    return voice(f0, amp, open_, np.full(len(t), .6), .15, formants)


if __name__ == '__main__':
    # Peak levels sit with the room's Foley and well under the fight sounds (ko.wav peaks
    # at -5 dBFS); hub.js plays it at 0.4 on top of that.
    wav('lion_growl', growl(), .2)      # -14 dBFS
    print('audio/sfx/lion_growl.wav')
