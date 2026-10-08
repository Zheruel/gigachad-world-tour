#!/usr/bin/env python3
"""Build restrained desk-phone, CRT and ventilation Foley for Refund Tower."""
from pathlib import Path
import wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
SR = 24000


def write(name, data):
    path = ROOT / 'audio/sfx' / f'{name}.wav'
    with wave.open(str(path), 'wb') as out:
        out.setparams((1, 2, SR, 0, 'NONE', 'not compressed'))
        out.writeframes((np.clip(data, -1, 1) * 32767).astype('<i2').tobytes())


def main():
    t = np.arange(round(.55 * SR)) / SR
    # Soft electronic desk ringer: no combat-like attack or long ringing tail.
    gate = np.maximum(0, np.sin(2 * np.pi * 18 * t)) ** .5
    envelope = np.minimum(t * 100, 1) * np.minimum((.55 - t) * 100, 1)
    ring = .19 * (np.sin(2 * np.pi * 800 * t) + .65 * np.sin(2 * np.pi * 1066 * t))
    write('refund_ring', ring * (.25 + .75 * gate) * envelope)

    t = np.arange(round(.11 * SR)) / SR
    # Small confirmation chirp inside a monitor; distinct from the combat warning blip.
    note = .12 * np.sin(2 * np.pi * (1240 * t - 560 * t * t))
    write('refund_terminal', note * np.minimum(t * 250, 1) * np.minimum((.11 - t) * 200, 1) * np.exp(-t * 43))

    t = np.arange(4 * SR) / SR
    rng = np.random.default_rng(8091)
    # Low, loopable air + motor. Circular filtering and whole-cycle components
    # preserve the loop boundary without a pump or click every four seconds.
    raw = rng.normal(0, 1, len(t))
    padded = np.r_[raw[-55:], raw, raw[:55]]
    air = np.convolve(padded, np.hanning(111) / np.hanning(111).sum(), mode='valid')
    air = air[:len(t)]
    motor = np.sin(2 * np.pi * 60 * t) + .24 * np.sin(2 * np.pi * 120 * t)
    bed = .10 * air + .018 * motor
    # Close the residual sample difference over a few milliseconds, retaining volume.
    n = 256
    q = np.linspace(0, 1, n)
    bed[-n:] -= (bed[-1] - bed[0]) * q
    write('refund_cooling', bed)


if __name__ == '__main__':
    main()
