"""Delhi finale explosions -> audio/sfx/finale_*.wav.

The Final Fight arcade explosions (audio/sources/final_fight/sfx 15_explode, 14_explosion_shatter, fire) carry the
blasts; a synthesized sub-bass drop gives the train-sized ones weight. Onsets are trimmed to the first transient so a
cue fired on the fireball's first frame (js/train_finale.js FINALE_BLASTS / FINALE_SECONDARIES) lands on it.
Run: .venv/bin/python tools/production/build_finale_audio.py
"""
from build_conductor_audio import FF, ROOT, SR, T, decode, level, fade, trim, write, mix, noise, band, place, rng
import numpy as np

SFX = FF / 'sfx'


def ff(name, pitch=1.0):
    # Resampling to SR/pitch then reading at SR shifts pitch and length together, like a tape.
    x = decode(SFX / f'{name}.wav', int(SR / pitch), 'highpass=f=30,lowpass=f=3600')
    return trim(x)


def sub(sec, f0, f1, decay):
    t = T(sec); ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * 6)) / SR
    return np.sin(ph) * np.minimum(t / .004, 1) * np.exp(-decay * t)


def rumble(sec, decay):
    return band(noise(sec), 25, 180) * np.exp(-decay * T(sec))


def blast_big():
    # Blast 1 (the charge under Netaji): the crack, the shattering roll and a long low drop.
    x = mix(ff('15_explode'), place(np.zeros(int(1.8 * SR)), ff('14_explosion_shatter', .9) * .75, .06),
            sub(1.6, 90, 34, 2.4) * .9, rumble(1.8, 2.2) * .35)
    write('finale_blast_big', fade(level(x, -5), b=.25))


def blast(name, pitch, tail, subf):
    x = mix(ff('15_explode', pitch), sub(.9, subf, subf * .45, 4.5) * .7, rumble(1.0, 4) * .25,
            place(np.zeros(int(1.2 * SR)), ff('3F_fire_2', 1.1) * .35, .12) if tail else np.zeros(1))
    write(name, fade(level(x, -7), b=.18))


def shatter():
    # The blast that takes out the window bank: glass-heavy.
    x = mix(ff('14_explosion_shatter', 1.08), ff('15_explode', 1.15) * .6, sub(.7, 80, 40, 5) * .5)
    write('finale_blast_glass', fade(level(x, -7), b=.2))


def pop():
    # Small secondary flashes: a short, higher crack, no sub.
    x = ff('15_explode', 1.45)[:int(.32 * SR)]
    write('finale_pop', fade(level(x, -10), b=.1))


def crackle():
    # Sparks: a burst of fire crackle.
    x = ff('37_fire_1', 1.2)[:int(.4 * SR)]
    write('finale_crackle', fade(level(x, -12), b=.12))


def gore():
    # Netaji torn apart: a meaty squelch (low sweep + the Shera finisher's bone crack) and a spatter of wet drops.
    t = T(.18); ph = 2 * np.pi * np.cumsum(60 + 140 * np.exp(-t * 22)) / SR
    x = mix(np.sin(ph) * np.exp(-t * 14) * .8, trim(decode(ROOT / 'audio/sfx/bone_crack.wav', SR, 'highpass=f=60')) * .6,
            np.zeros(int(.6 * SR)))
    for k in range(9):
        d = .03 + .025 * rng.random(); drop = band(noise(d), 500 + 300 * rng.random(), 2600) * np.exp(-T(d) * 70)
        place(x, drop * (.9 - k * .08), .015 + k * .045 + .02 * rng.random())
    write('finale_gore', fade(level(x, -8), b=.12))


def main():
    blast_big(); blast('finale_blast_a', 1.0, False, 70); blast('finale_blast_b', .86, True, 58)
    shatter(); pop(); crackle(); gore()


if __name__ == '__main__':
    main()
