"""Ghee Pappu (Delhi vendor boss) sound set -> audio/sfx/vendor_*.wav (+ manifest.json "generated" entries).

Layers: free-licence recordings in audio/sources/pappu (see SOURCE.txt: frying oil, gas flame, cast-iron clangs,
coughs, slaps, body falls), the licensed Streets of Rage 2 / Final Fight banks (punches, bone crack, slam, the Andore and
enemy voices pitched down into a fat cook's chest) and synthesis for what nobody recorded for us (skimmer swishes,
belly, burp, chewing, sandal slaps). Every one-shot is trimmed to its first transient, so a cue fired on the
on-screen frame lands on it; the manifest records where each sample's main peak falls (peakMs) and js/vendor_sound.js
starts whooshes that many ticks early (tools/verification/pappu_sound_check.cjs reads both).
Levels follow build_conductor_audio.py: impacts and voices peak near -1 dBFS (50 ms RMS about -9 dB), swishes and
details sit lower, loops sit ~ -22 dB and are played under everything.
Run: .venv/bin/python tools/production/build_pappu_audio.py
"""
import json
import numpy as np
import build_conductor_audio as B
from build_conductor_audio import ROOT, SR, T, decode, level, fade, trim, mix, noise, place, rng, env_exp

SRC = ROOT / 'audio/sources/pappu'
SOR = ROOT / 'audio/sources/streets_of_rage_2'
FF = ROOT / 'audio/sources/final_fight'
OUT = B.OUT
REG = {}


# ---- building blocks ------------------------------------------------------------------------
def filt(x, lo=None, hi=None, order=2):
    """Smooth zero-phase band limit (Butterworth-shaped magnitude)."""
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR); g = np.ones_like(f)
    if lo: g *= 1 / (1 + (lo / np.maximum(f, 1e-3)) ** (2 * order))
    if hi: g *= 1 / (1 + (f / hi) ** (2 * order))
    return np.fft.irfft(X * g, len(x))


def src(path, pitch=1.0, start=0.0, dur=None, f='anull'):
    """Decode, tape-shift by `pitch` (below 1 = lower and longer) and cut [start, start+dur) of the shifted audio."""
    x = decode(path if '/' in str(path) else SRC / path, int(SR / pitch), f)
    a = int(start * SR)
    return x[a:a + int(dur * SR)] if dur else x[a:]


def bend(x, ratio):
    """Tape pitch: ratio < 1 lowers pitch and lengthens."""
    return np.interp(np.arange(0, len(x) - 1, ratio), np.arange(len(x)), x)


def glide(x, r0, r1):
    """Pitch glides from r0 to r1 over the sound."""
    pos = np.cumsum(np.linspace(r0, r1, len(x))); pos = pos[pos < len(x) - 1]
    return np.interp(pos, np.arange(len(x)), x)


def sub(sec, f0, f1, decay, k=6):
    t = T(sec); ph = 2 * np.pi * np.cumsum(f1 + (f0 - f1) * np.exp(-t * k)) / SR
    return np.sin(ph) * np.minimum(t / .003, 1) * np.exp(-decay * t)


def rumble(sec, decay, lo=25, hi=220):
    return filt(noise(sec), lo, hi) * np.exp(-decay * T(sec)) * 6


def sweep_noise(sec, peak, f0=500, f1=2600, tail=.09, air=.25):
    """A swish: noise whose colour rises from f0 to f1, swelling to `peak` seconds and dying over `tail`."""
    n = noise(sec); low = filt(n, 60, 500); mid = filt(n, f0, f0 * 3); hi = filt(n, f1 * .6, f1 * 2.4)
    t = T(sec); u = np.clip(t / max(peak, 1e-3), 0, 1); w = u ** 1.4
    body = low * air * (1 - w) + mid * (1 - w * .7) + hi * w
    env = np.minimum(t / max(peak * .8, .004), 1) ** 2 * np.where(t < peak, 1, np.exp(-(t - peak) / tail))
    return body * env * 3


def pk_ms(x):
    """Time of the main peak (5 ms RMS envelope), ms."""
    h = int(SR * .005); n = len(x) // h
    if n < 2: return 0
    e = np.sqrt((x[:n * h].reshape(n, h) ** 2).mean(1))
    return int(round(e.argmax() * 5 + 2.5))


def sizzle_bed(sec, at=0.0, seed=0, hi=9000):
    """Steady frying: the CC0 pan recordings (stereo mixed down), two cuts blended."""
    a = src('freesound_353124_BenjaminNelan_frying_pan_sizzle.mp3', start=(at + 2 + seed) % 20, dur=sec, f='highpass=f=500')
    b = src('freesound_767635_interstellarcat_food_sizzling_in_a_pan.mp3', start=(.3 + seed * .2) % 3.0, dur=min(sec, 1.9), f='highpass=f=500')
    b = np.pad(b, (0, max(0, len(a) - len(b))))[:len(a)]
    return filt(a / (np.abs(a).max() + 1e-9) + .8 * b / (np.abs(b).max() + 1e-9), 400, hi)


def sizzle_burst(sec, at, attack=.004, decay=6, pops=6, gain=1.0, seed=0, lo=None):
    """Oil jumping: the sizzle bed gated up hard, with sharp pops on top."""
    bed = sizzle_bed(sec + .1, at, seed)[:int(sec * SR)]; t = T(sec)
    bed = bed / (rms(bed) + 1e-9)
    env = np.minimum(t / attack, 1) * np.exp(-decay * t)
    out = bed * env * gain
    for _ in range(pops):
        d = .006 + .008 * rng.random(); p = filt(noise(d), 1800, 9000) * np.exp(-T(d) * 300)
        out = place(out, p * (1.5 + 2 * rng.random()) * gain, rng.random() * sec * .5)
    return out


def rms(x): return float(np.sqrt((x ** 2).mean()))


def loop(x, xf=.35):
    """Seamless loop: the tail beyond len-xf is folded under the head with an equal-power crossfade."""
    n = int(xf * SR); L = len(x) - n
    head, tail = x[:n].copy(), x[L:]
    k = np.linspace(0, np.pi / 2, n)
    out = x[:L].copy(); out[:n] = head * np.sin(k) + tail * np.cos(k)
    return out


def rec(name, x, recipe, label, sources, target=-9.0, peak=-1.0, a=.001, b=.03, cut=True, lv=True, loop_=False, thr=-45):
    if not loop_: x = x - x.mean()
    if cut: x = trim(x, thr)
    if lv: x = level(x, target, peak)
    x = fade(x, a, b)
    B.write(name, x)
    REG[name] = {'recipe': 'tools/production/build_pappu_audio.py', 'label': label, 'sources': sources,
                 'peakMs': pk_ms(x), 'seconds': round(len(x) / SR, 3), 'verifiedByEar': False}
    if loop_: REG[name]['loop'] = True
    return x


# ---- voices: Andore (Final Fight's wrestler) and the SOR2 enemy voices, pitched into a fat cook -------------
def andore(which=1, pitch=.8, f='highpass=f=80,lowpass=f=3400'):
    return src(FF / 'voice' / ('29_andore_1.wav' if which == 1 else '2A_andore_2.wav'), pitch, f=f)


def enemy(v='V00', pitch=.75, f='highpass=f=80,lowpass=f=3600'):
    return src(SOR / f'{v}.wav', pitch, f=f)


def chest(x, amt=.5):
    """Give a voice a chest: the same voice an octave down underneath, plus low body."""
    lo = bend(x, .5)[:len(x)]
    return mix(x, np.pad(lo, (0, max(0, len(x) - len(lo))))[:len(x)] * amt, filt(x, 90, 320) * .4)


def flesh(sec=.16, f0=95, amp=1.0):
    """A belly thump: slap of the palm (CC0 slap, low passed) over a body drop."""
    s = src('freesound_337148_MrDrPrFr_slap.mp3', .8, f='highpass=f=60')
    s = trim(filt(s, 80, 2200)[:int(sec * SR)]); s = s / (np.abs(s).max() + 1e-9)
    return mix(s * .8 * amp, sub(sec + .1, f0 * 1.6, f0 * .6, 16) * .9 * amp)


def clang(marker, pitch=.8, dur=.9, tail=6.0):
    x = src(f'oga_cast_iron_clang_{marker}.wav', pitch, dur=dur, f='highpass=f=120')
    x = trim(x)
    return x * np.exp(-np.arange(len(x)) / SR * tail * .35)


def thud_dirt(pitch=1.0, dur=.5):
    return src('freesound_504626_leonelmail_body_fall_v_hvy_dirt.mp3', pitch, start=.08, dur=dur, f='highpass=f=35,lowpass=f=1800')


# ---- kitchen: loops, sizzle ----------------------------------------------------------------------
def kitchen():
    # The bed under the whole fight: frying oil, a slow bubbling under it and the gas ring's hiss.
    fry = sizzle_bed(7.6, 3.0, 0)
    fry = filt(fry, 500, 7500)
    bub = src('oga_loops_water_boiling.ogg', .8, dur=7.6, f='highpass=f=80,lowpass=f=1500')
    bub = np.pad(bub, (0, max(0, len(fry) - len(bub))))[:len(fry)]
    gas = src('freesound_435643_neilraouf_burner_gas_flame.mp3', start=1.0, dur=7.6, f='highpass=f=900,lowpass=f=5000')
    gas = np.pad(gas, (0, max(0, len(fry) - len(gas))))[:len(fry)]
    x = fry / rms(fry) + .55 * bub / (rms(bub) + 1e-9) + .35 * gas / (rms(gas) + 1e-9)
    # a few louder oil pops, so the bed breathes instead of hissing flat
    for _ in range(11):
        d = .008 + .01 * rng.random(); p = filt(noise(d), 1200, 8000) * np.exp(-T(d) * 220)
        x = place(x, p * (1.4 + 2 * rng.random()), 0.3 + rng.random() * 7)
    x = loop(x, .4)
    rec('vendor_bed', x, 'kitchen', 'Kadai ambience loop: frying oil, slow bubbling and the gas ring (CC0 recordings), plays under the fight',
        ['freesound_353124', 'freesound_767635', 'oga_loops_water_boiling', 'freesound_435643'], target=-22, peak=-8, cut=False, a=0, b=0, loop_=True)

    # The kadai on fire after the finisher's spill: a low flame roar with crackle.
    fire = src('oga_fire_crackling_fire-1.wav', dur=2.7, f='highpass=f=80')
    fire2 = src('freesound_435643_neilraouf_burner_gas_flame.mp3', start=2.0, dur=4.2, f='highpass=f=120,lowpass=f=4500')
    n = max(len(fire) * 2, len(fire2)); fire2 = np.pad(fire2, (0, n - len(fire2)))
    fl = np.zeros(n); fl[:len(fire)] += fire / rms(fire); fl[len(fire) - int(.3 * SR):len(fire) - int(.3 * SR) + len(fire)] += fire[:n - len(fire) + int(.3 * SR)] / rms(fire)
    x = fl[:len(fire2)] + .9 * fire2 / rms(fire2)
    x = loop(x, .4)
    rec('vendor_flame_bed', x, 'kitchen', 'Burning ghee loop: flame roar and crackle (CC0 recordings), the spilt kadai in the finisher',
        ['oga_fire_crackling_fire-1', 'freesound_435643'], target=-20, peak=-6, cut=False, a=0, b=0, loop_=True)

    # Oil jumping when the skimmer goes in or the pakoras drop back (intro), stirred, and spat out of the ladle.
    for i, (at, dec, sec) in enumerate([(4.7, 7, .45), (8.4, 6, .5), (11.5, 5, .55)], 1):
        rec(f'vendor_fry_pop_{i}', sizzle_burst(sec, at, decay=dec, pops=5 + i, seed=i), 'kitchen',
            f'Oil jumps ({i}): sizzle gated up with sharp pops', ['freesound_353124', 'freesound_767635'], target=-14, peak=-4, b=.05)
    for i, (at, dec) in enumerate([(2.0, 4.5), (6.3, 5.5)], 1):
        rec(f'vendor_stir_{i}', mix(sizzle_burst(.6, at, attack=.02, decay=dec, pops=3, seed=i + 3, gain=.8),
                                    place(np.zeros(int(.6 * SR)), clang(11 if i == 1 else 17, 1.5, .2) * .25, .0),
                                    filt(src('oga_100cc0_splash_02.ogg', 1.0, dur=.5, f='anull'), 300, 2500) * .45),
            'kitchen', f'Ladle stirring the oil ({i}): slosh, sizzle and a tink on the rim',
            ['freesound_353124', 'oga_100cc0_splash_02', 'oga_cast_iron_clang'], target=-15, peak=-5, b=.07)
    rec('vendor_ladle_in', mix(filt(src('oga_100cc0_splash_01.ogg', 1.0, f='anull'), 250, 4000) * .7, sizzle_burst(.7, 9.7, decay=4, pops=6, seed=9)),
        'kitchen', 'Skimmer goes into the oil: splash and sizzle', ['oga_100cc0_splash_01', 'freesound_353124'], target=-12, peak=-3, b=.08)
    for i, (at, pitch) in enumerate([(3.3, 1.0), (7.7, .9), (10.4, 1.1)], 1):
        sp = sweep_noise(.5, .07, 400, 2400, .12)
        rec(f'vendor_fling_{i}', mix(sp * .8, np.pad(sizzle_burst(.5, at, attack=.03, decay=5, pops=7, seed=20 + i, gain=.9), (int(.04 * SR), 0))),
            'kitchen', f'Oil flung off the skimmer ({i}): swish and spatter', ['freesound_353124', 'synth'], target=-12, peak=-3, b=.06)
    for i in (1, 2):
        rec(f'vendor_oil_land_{i}', mix(filt(src('oga_100cc0_splash_02.ogg', 1.2 - .1 * i, dur=.35), 300, 3500) * .6, sizzle_burst(.5, 5.2 + i, attack=.006, decay=8, pops=4, seed=40 + i)),
            'kitchen', f'Flung oil lands on the street ({i}): splat and sizzle', ['oga_100cc0_splash_02', 'freesound_353124'], target=-14, peak=-4, b=.06)
    # The big ones: a dunk (splash, roar of oil, bubbles) and the hot-oil scald.
    sp = filt(src('freesound_442773_qubodup_big_water_splash.mp3', .85, f='anull'), 120, 5000)[:int(1.2 * SR)]
    big = mix(sp * 1.0, sizzle_burst(2.4, 12.2, attack=.02, decay=1.7, pops=26, seed=61, gain=1.3),
              filt(src('oga_loops_water_boiling.ogg', .7, dur=2.4, f='anull'), 100, 1400) * .8, sub(.6, 70, 38, 5) * .5)
    rec('vendor_dunk', big, 'kitchen', 'Head first into the hot ghee: splash, a roar of oil, bubbling and a sub thump',
        ['freesound_442773', 'freesound_353124', 'oga_loops_water_boiling', 'synth'], target=-8, peak=-1, b=.4)
    rec('vendor_thrash', mix(filt(src('oga_100cc0_splash_01.ogg', .8, f='anull'), 150, 3500), sizzle_burst(.8, 6, decay=3.2, pops=9, seed=77) * .9,
                             sub(.3, 90, 45, 9) * .3), 'kitchen', 'Thrashing in the oil: heavy slop and hiss', ['oga_100cc0_splash_01', 'freesound_353124', 'synth'], target=-10, peak=-2, b=.15)
    rec('vendor_scald', mix(filt(src('oga_100cc0_splash_02.ogg', .9, f='anull'), 200, 3500) * .6, sizzle_burst(.8, 1.4, decay=3.5, pops=10, seed=91) * 1.1),
        'kitchen', 'Arm in the hot oil: a spit of splash and a hard hiss', ['oga_100cc0_splash_02', 'freesound_353124'], target=-10, peak=-2, b=.15)
    rec('vendor_sizzle_back', sizzle_burst(1.2, 13.8, attack=.03, decay=2.2, pops=16, seed=99, gain=1.1), 'kitchen',
        'Searing on the hot counter and tawa', ['freesound_353124'], target=-14, peak=-4, b=.3)


# ---- flame and breath ----------------------------------------------------------------------------
def fire():
    wh = src('freesound_260554_LookIMadeAThing_basic_fire_whoosh.mp3', f='highpass=f=60')[:int(1.6 * SR)]
    gas = src('freesound_435643_neilraouf_burner_gas_flame.mp3', start=1.0, dur=2.0, f='highpass=f=100')
    # kadai catches: whump, gas ring roars up
    rec('vendor_flare', mix(wh * 1.0, np.pad(gas * .8 / rms(gas) * rms(wh), (int(.05 * SR), 0))[:int(1.8 * SR)], sub(.7, 75, 40, 4) * .6),
        'fire', 'The kadai flares up: fire whoosh, gas ring and a low whump', ['freesound_260554', 'freesound_435643', 'synth'], target=-9, peak=-1, b=.5)
    rec('vendor_scorch', mix(wh * .9, glide(chest(enemy('V03', .62)), .95, 1.25)[:int(1.2 * SR)] * 1.2, filt(noise(1.0), 500, 5000) * np.exp(-T(1.0) * 4) * .3),
        'fire', 'He rolls through the fire: whoosh and a scalded howl', ['freesound_260554', 'streets_of_rage_2/V03'], target=-9, peak=-1, b=.3)
    # the fire breath itself: ignition roar, steady flame, gutter out (1.4 s, the breath lasts 60-72 ticks)
    n = int(1.5 * SR); t = T(1.5)
    jet = filt(noise(1.5), 250, 6500) * (.6 + .4 * np.sin(2 * np.pi * 23 * t) ** 2)
    core = src('freesound_435643_neilraouf_burner_gas_flame.mp3', start=.6, dur=1.5, f='highpass=f=150')
    core = np.pad(core, (0, max(0, n - len(core))))[:n]
    env = np.minimum(t / .05, 1) ** 1.5 * np.where(t < 1.15, 1, np.exp(-(t - 1.15) / .12))
    x = (jet / rms(jet) * .8 + core / rms(core)) * env
    x = mix(x, np.pad(wh[:int(.7 * SR)] / rms(wh) * 1.3, (0, n - int(.7 * SR)))[:n], sub(.5, 90, 45, 6) * 1.2)
    rec('vendor_breath', x, 'fire', 'Fire breath: ignition whoosh into a steady gas roar (CC0 gas flame), gutters out', ['freesound_260554', 'freesound_435643', 'synth'],
        target=-10, peak=-1, b=.15)
    # inhale before it: a long low draw of breath rising to the gulp
    n = .34; t = T(n); w = filt(noise(n), 300, 2400) * (t / n) ** 1.6 * 3
    g = sub(.14, 150, 80, 22) * .5
    rec('vendor_inhale', mix(w, np.pad(g, (int((n - .13) * SR), 0))[:len(w)]),
        'fire', 'A big draw of breath before the fire', ['synth'], target=-15, peak=-4, cut=False, b=.05)


# ---- his body ------------------------------------------------------------------------------------------------
def body():
    # belly: bump contact and hurt
    for i, (f0, amp) in enumerate([(95, 1.0), (80, 1.1)], 1):
        x = mix(flesh(.18, f0, amp), src(SOR / '05.wav', 1.0, dur=.3, f='highpass=f=70,lowpass=f=1200') * .35, np.zeros(1))
        rec(f'vendor_belly_{i}', x, 'body', f'Belly meets CHAD ({i}): slap, thump and the SOR2 heavy under it', ['freesound_337148', 'streets_of_rage_2/05', 'synth'], target=-8, peak=-1, b=.1)
    x = mix(clang(10, .55, 1.0, 8) * .7, flesh(.2, 70, 1.2), src(SOR / '31.wav', .8, dur=.5, f='lowpass=f=1500') * .6)
    rec('vendor_crush', x, 'body', 'Guard crush: caved-in metal ring over a belly slam', ['oga_cast_iron_clang', 'freesound_337148', 'streets_of_rage_2/31'], target=-7, peak=-1, b=.25)
    # flop: the whole man onto the street, a shockwave rumbling out of it
    for i, pitch in enumerate([.85, .75], 1):
        th = thud_dirt(pitch, .6); th = th / (np.abs(th).max() + 1e-9)
        bf = src('freesound_734629_Vrymaa_body_fall_heavy.mp3', pitch, start=2.85 if i == 1 else 7.85, dur=.8, f='highpass=f=35,lowpass=f=2200')
        bf = bf / (np.abs(bf).max() + 1e-9)
        x = mix(th * .8, bf * .55 if len(bf) else np.zeros(1), flesh(.25, 60, 1.2) * .9, sub(1.4, 60, 30, 3.2) * 1.0,
                np.pad(src(SOR / '32.wav', .7, f='lowpass=f=1400'), (int(.01 * SR), 0)) * .5,
                np.pad(rumble(1.6, 2.4) * .5, (int(.05 * SR), 0)))
        rec(f'vendor_flop_land_{i}', x, 'body', f'Belly flop lands ({i}): body thud, belly slap, sub drop and a shockwave rumble', ['freesound_504626', 'freesound_734629', 'freesound_337148', 'streets_of_rage_2/32', 'synth'],
            target=-6, peak=-.8, b=.5)
    w = sweep_noise(.66, .56, 300, 1800, .09, air=.9)
    rec('vendor_flop_air', w, 'body', 'A whole man in the air: a low descending rush', ['synth'], target=-15, peak=-5, cut=False, b=.1)
    # grunts (effort) and hurt
    for i, (which, pitch) in enumerate([(1, .82), (2, .76), (1, .9)], 1):
        x = chest(andore(which, pitch)); x = x[:int(.42 * SR)]
        rec(f'vendor_grunt_{i}', x, 'voice', f'Pappu effort grunt ({i}): Final Fight wrestler voice pitched down with a chest', [f'final_fight/voice/{"29_andore_1" if which == 1 else "2A_andore_2"}'], target=-9, peak=-1, b=.08)
    for i, (v, pitch) in enumerate([('V00', .72), ('V02', .7), ('V01', .76), ('V03', .68)], 1):
        x = chest(enemy(v, pitch), .45)[:int(.55 * SR)]
        rec(f'vendor_hurt_{i}', x, 'voice', f'Pappu hurt grunt ({i}): SOR2 enemy voice {v} pitched down into a fat man', [f'streets_of_rage_2/{v}'], target=-10, peak=-1.5, b=.1)
    x = mix(chest(andore(1, .6), .6)[:int(.9 * SR)], sub(.5, 70, 40, 5) * .3, filt(noise(.6), 250, 1200) * np.exp(-T(.6) * 4) * .12)
    rec('vendor_groan_1', x, 'voice', 'Winded groan on the floor: Andore voice low and long', ['final_fight/voice/29_andore_1'], target=-11, peak=-2, b=.3)
    x = mix(chest(andore(2, .55), .6)[:int(1.0 * SR)], filt(noise(.9), 300, 1500) * np.exp(-T(.9) * 3) * .15)
    rec('vendor_groan_2', x, 'voice', 'Winded groan on the floor (2): a second, lower take', ['final_fight/voice/2A_andore_2'], target=-11, peak=-2, b=.3)
    x = src(FF / 'voice/20_laugh_unknown.wav', .7, f='highpass=f=80,lowpass=f=3400'); x = chest(x, .4)
    rec('vendor_chuckle', x, 'voice', 'A wheezing chuckle at a floored CHAD: Final Fight laugh pitched down', ['final_fight/voice/20_laugh_unknown'], target=-11, peak=-2, b=.15)
    # roars
    r1 = mix(chest(andore(2, .68), .8), np.pad(chest(enemy('V05', .55), .5), (int(.05 * SR), 0)) * .6, sub(1.0, 78, 42, 3.2) * .5)
    r1 = mix(r1, filt(noise(1.1), 200, 1800) * np.exp(-T(1.1) * 3.4) * .18)
    rec('vendor_roar_spicy', r1[:int(1.35 * SR)], 'voice', 'EXTRA SPICY roar: wrestler voice down an octave over an enemy growl and a sub swell', ['final_fight/voice/2A_andore_2', 'streets_of_rage_2/V05', 'synth'], target=-7, peak=-1, b=.4)
    r2 = mix(chest(andore(1, .58), .9), np.pad(chest(enemy('V11', .5), .6), (int(.08 * SR), 0)) * .7, np.pad(chest(andore(2, .5), .6), (int(.4 * SR), 0)) * .8,
             sub(1.7, 70, 32, 2.0) * .7)
    r2 = mix(r2, filt(noise(1.7), 180, 2200) * np.exp(-T(1.7) * 2.6) * .2, np.pad(rumble(1.2, 2.5) * .4, (int(.05 * SR), 0)))
    rec('vendor_roar_last', r2[:int(2.0 * SR)], 'voice', 'LAST ORDER roar: a doubled wrestler bellow, deeper, with a floor-shaking swell', ['final_fight/voice/29_andore_1', 'final_fight/voice/2A_andore_2', 'streets_of_rage_2/V11', 'synth'], target=-6, peak=-1, b=.5)
    x = mix(chest(andore(1, .7), .6)[:int(.6 * SR)], filt(noise(.5), 300, 2400) * np.exp(-T(.5) * 6) * .25)
    rec('vendor_roar_intro', x, 'voice', 'Squaring up: a short chesty HAH', ['final_fight/voice/29_andore_1', 'synth'], target=-8, peak=-1, b=.15)
    # coughs and wheeze (breath-fire aftermath)
    for i, (f, at, pitch, dur) in enumerate([('freesound_157296_husky70_coughing_cough.mp3', 1.28, .8, .5),
                                              ('freesound_157296_husky70_coughing_cough.mp3', 1.70, .78, .45),
                                              ('freesound_369295_georgisound_coughing.mp3', 4.08, .8, .55),
                                              ('freesound_369295_georgisound_coughing.mp3', .9, .84, .5)], 1):
        c = src(f, pitch, f='highpass=f=100,lowpass=f=5000')
        c = c[int(at / pitch * SR - .03 * SR):][:int(dur * SR)]
        rec(f'vendor_cough_{i}', chest(c, .3), 'voice', f'Smoky cough ({i}): CC0 cough recording pitched down', [f.split('.')[0][:23]], target=-10, peak=-2, b=.12, thr=-28)
    t = T(.9); ex = filt(noise(.9), 250, 3000) * np.sin(np.pi * np.clip(t / .9, 0, 1)) ** 1.5 * 2
    rec('vendor_wheeze', mix(ex, sub(.9, 190, 120, 4) * .12 * np.sin(np.pi * np.clip(t / .9, 0, 1))), 'voice', 'A wheezing exhale after the fire breath: filtered breath with a thin reedy tone', ['synth'],
        target=-15, peak=-5, cut=False, b=.2)
    # burp: a proper wet belch, pitch falling, a vocal-fold rattle and belly resonance
    n = .8; t = T(n); f0 = 92 * (1 - .35 * t / n) * (1 + .05 * np.sin(2 * np.pi * 9 * t))
    ph = np.cumsum(f0) / SR; saw = ((ph % 1) * 2 - 1); pulse = np.where((ph % 1) < .2, 1., -.25) + noise(n) * .35
    v = filt(pulse * (.55 + .45 * np.sin(2 * np.pi * 27 * t) ** 2), 60, 900, 3)
    burp = v * np.minimum(t / .05, 1) * np.exp(-(t / n) ** 2 * 3.5) * 3 + filt(noise(n), 200, 1400) * .12 * np.exp(-t * 4)
    rec('vendor_burp', burp, 'body', 'A long chilli-and-pakora belch: falling low buzz with a vocal rattle', ['synth'], target=-10, peak=-2, b=.2)


# ---- weapons and props ---------------------------------------------------------------------------------------------
def props():
    # skimmer swishes: quick sideways swings (peak 50 ms in) and the overhead's long downstroke (peak late)
    for i, (f0, f1, pk) in enumerate([(500, 2600, .05), (420, 2200, .055), (620, 3000, .045)], 1):
        sw = sweep_noise(.24, pk, f0, f1, .07)
        ring = np.sin(2 * np.pi * (1100 + 70 * i) * T(.24)) * np.exp(-T(.24) * 24) * .05
        rec(f'vendor_swing_{i}', mix(sw, ring), 'props', f'Skimmer swings through the air ({i}): a fast rising swish', ['synth'], target=-12, peak=-3, cut=False, b=.05)
    sw = sweep_noise(.3, .12, 250, 1700, .07, air=1.1)
    rec('vendor_swing_big', mix(sw, sub(.3, 160, 90, 12) * .25 * (T(.3) > .1)), 'props', 'The overhead skimmer chopping down: a heavy descending whoosh peaking at the strike', ['synth'], target=-10, peak=-2, cut=False, b=.05)
    m = np.sin(2 * np.pi * np.cumsum(180 + 400 * T(.45) ** 2) / SR)
    rec('vendor_raise', mix(filt(noise(.45), 800, 3500) * np.exp(-((T(.45) - .18) / .12) ** 2) * .4, m * .06 * np.sin(np.pi * T(.45) / .45)) + sweep_noise(.45, .3, 300, 900, .1) * .6,
        'props', 'Skimmer hauled overhead: a metal strain and a rising swish', ['synth'], target=-15, peak=-5, cut=False, b=.1)
    # slam: skimmer head on the street
    for i, (mk, pitch) in enumerate([(10, .72), (11, .66)], 1):
        cl = clang(mk, pitch, 1.1, 7)
        x = mix(cl * .9, thud_dirt(.9, .5) / 1.5, src(SOR / '31.wav', .75, dur=.5, f='lowpass=f=2000') * .8, sub(.5, 90, 40, 8) * .7,
                filt(noise(.3), 1200, 7000) * np.exp(-T(.3) * 22) * .25)
        rec(f'vendor_slam_{i}', x, 'props', f'Skimmer slams the street ({i}): cast-iron clang, thud and grit', ['oga_cast_iron_clang', 'freesound_504626', 'streets_of_rage_2/31', 'synth'], target=-6, peak=-1, b=.35)
    for i, (mk, pitch) in enumerate([(8, 1.25), (21, 1.15), (17, 1.3)], 1):
        cl = clang(mk, pitch, .5, 12)[:int(.3 * SR)]
        rec(f'vendor_guard_{i}', mix(cl, src(SOR / '15.wav', .9, dur=.12, f='lowpass=f=4000') * .4), 'props', f'He blocks on the skimmer/pan ({i}): a short cast-iron tang under the SOR2 armour hit', ['oga_cast_iron_clang', 'streets_of_rage_2/15'], target=-8, peak=-1, b=.06)
    x = mix(filt(noise(.45), 300, 2600) * (.5 + .5 * np.sin(2 * np.pi * 34 * T(.45))) * np.exp(-((T(.45) - .16) / .18) ** 2), clang(17, .9, .4) * .18,
            filt(noise(.15), 1500, 6000) * np.exp(-T(.15) * 30) * .2)
    rec('vendor_rip', x, 'props', 'Skimmer torn out of the street: a gritty scrape and a metal chirp', ['synth'], target=-9, peak=-2, b=.1)
    for i, (which, pitch) in enumerate([(1, .85), (2, .8)], 1):
        g = chest(andore(which, pitch), .4)[:int(.28 * SR)]
        sc = filt(noise(.4), 700, 4000) * (.5 + .5 * np.sin(2 * np.pi * (27 + 5 * i) * T(.4))) * np.exp(-((T(.4) - .16) / .13) ** 2) * .5
        rec(f'vendor_strain_{i}', mix(g * .9, np.pad(sc, (int(.03 * SR), 0))), 'props', f'Heaving the stuck skimmer out ({i}): effort and metal scrape', ['final_fight/voice', 'synth'], target=-10, peak=-2, b=.1)
    # naan: cloth flicks
    for i, (f, pitch) in enumerate([('oga_moresounds_Cloth_05.wav', 1.6), ('oga_moresounds_Cloth_04.wav', 1.5), ('oga_moresounds_Cloth_07.wav', 1.7)], 1):
        c = src(f, pitch, dur=.35, f='highpass=f=180')
        rec(f'vendor_naan_throw_{i}', mix(c, sweep_noise(.3, .05, 700, 2600, .09) * .5), 'props', f'Naan flicked off the palm ({i}): cloth snap and a small air rush', [f.split('.')[0], 'synth'], target=-13, peak=-3, b=.08)
    s = filt(src('freesound_337148_MrDrPrFr_slap.mp3', 1.0, f='anull'), 200, 2600)
    rec('vendor_naan_slap', mix(s[:int(.22 * SR)] * .9, src('oga_moresounds_Cloth_05.wav', 1.2, dur=.2, f='highpass=f=200') * .6), 'props', 'Naan smacks a face: a flat slap and cloth flap', ['freesound_337148', 'oga_moresounds_Cloth_05'], target=-9, peak=-1, b=.06)
    # bump wind-up / lungi cloth / hand-wipe
    rec('vendor_bump_whoosh', mix(sweep_noise(.22, .05, 300, 1500, .08, air=1.2), src('oga_moresounds_Cloth_07.wav', 1.4, dur=.22, f='highpass=f=150') * .4), 'props', 'Belly thrust: a push of air and cloth', ['synth', 'oga_moresounds_Cloth_07'], target=-11, peak=-2, b=.06)
    rec('vendor_cloth_1', src('oga_moresounds_Cloth_01.wav', 1.2, start=.35, dur=.6, f='highpass=f=120'), 'props', 'Lungi hitched up: cloth rustle', ['oga_moresounds_Cloth_01'], target=-16, peak=-6, b=.15)
    for i, (f, pitch) in enumerate([('oga_moresounds_Cloth_07.wav', 1.3), ('oga_moresounds_Cloth_04.wav', 1.2)], 2):
        rec(f'vendor_cloth_{i}', src(f, pitch, dur=.4, f='highpass=f=150'), 'props', f'Wiping hands down the vest ({i - 1})', [f.split('.')[0]], target=-16, peak=-6, b=.1)
    # palm slap of the skimmer
    for i, mk in enumerate([17, 21], 1):
        s = filt(src('freesound_337148_MrDrPrFr_slap.mp3', 1.0 - .08 * i, f='anull'), 200, 3200)[:int(.2 * SR)]
        rec(f'vendor_skimmer_slap_{i}', mix(s * .9, clang(mk, 1.5, .3, 14)[:int(.25 * SR)] * .35), 'props', f'Skimmer slapped on his palm ({i}): slap over a metal tick', ['freesound_337148', 'oga_cast_iron_clang'], target=-10, peak=-1, b=.08)
    # planting the skimmer as the name lands
    x = mix(clang(10, .62, 1.6, 5) * 1.0, src(SOR / '31.wav', .7, dur=.6, f='lowpass=f=1800') * .9, sub(.9, 80, 38, 4) * .8, thud_dirt(.8, .5) / 2, np.pad(rumble(.8, 4) * .3, (int(.02 * SR), 0)))
    rec('vendor_plant', x, 'props', 'Skimmer planted in the street as the name lands: a big clang, slam and low ring', ['oga_cast_iron_clang', 'streets_of_rage_2/31', 'freesound_504626', 'synth'], target=-6, peak=-1, b=.6)
    # the chilli: bottle grab, glugs, the hit
    for i, f in enumerate(['oga_moresounds_Drink_02.wav', 'oga_moresounds_Drink_03.wav', 'oga_moresounds_Drink_01.wav'], 1):
        g = src(f, .95, dur=.45, f='highpass=f=100,lowpass=f=4500')
        rec(f'vendor_glug_{i}', g, 'props', f'Gulping the chilli sauce ({i})', [f.split('.')[0]], target=-11, peak=-2, b=.08)
    rec('vendor_bottle', mix(clang(17, 1.6, .25, 14)[:int(.2 * SR)] * .5, src('oga_100cc0_dishes_03.ogg', 1.2, dur=.3, f='highpass=f=400') * .4), 'props', 'Chilli bottle snatched off the shelf: a glassy tink', ['oga_cast_iron_clang', 'oga_100cc0_dishes_03'], target=-13, peak=-3, b=.08)
    ch = chest(src('freesound_157296_husky70_coughing_cough.mp3', .8, f='highpass=f=100,lowpass=f=5000')[int(1.25 / .8 * SR):][:int(.5 * SR)], .3)
    hiss = sizzle_burst(.7, 6.2, decay=3.5, pops=4, seed=5) * .5
    rec('vendor_spicy', mix(ch, np.pad(hiss, (int(.08 * SR), 0))), 'props', 'The chilli hits: a choked cough and a hiss of steam', ['freesound_157296', 'freesound_353124'], target=-10, peak=-2, b=.2)
    # spit and pakora crunch, sandals
    n = .28; t = T(n); tone = np.sin(2 * np.pi * np.cumsum(430 - 320 * t / n) / SR) * np.exp(-t * 26) * .35
    sp = mix(filt(noise(.06), 1200, 6500) * np.exp(-T(.06) * 45), np.pad(filt(noise(.12), 300, 2500) * np.exp(-T(.12) * 30) * .7, (int(.07 * SR), 0)), tone)
    rec('vendor_spit', sp, 'props', 'Spitting out a pakora ptoo: air burst, tone and a wet splat', ['synth'], target=-12, peak=-3, b=.05)
    for i in range(1, 4):
        x = np.zeros(int(.28 * SR))
        for k in range(3 + i % 2):
            d = .018 + .012 * rng.random(); c = filt(noise(d), 900 + 500 * rng.random(), 5500) * np.exp(-T(d) * 120)
            x = place(x, c * (1 + .5 * rng.random()), k * (.035 + .02 * rng.random()))
        x = mix(x, filt(noise(.24), 200, 900) * np.exp(-T(.24) * 18) * .3)
        rec(f'vendor_chew_{i}', x, 'props', f'Crunching a hot pakora ({i})', ['synth'], target=-15, peak=-4, b=.06)
    for i, (f0, pan) in enumerate([(110, 0), (95, 0)], 1):
        x = mix(sub(.14, f0 * 1.4, f0 * .7, 22) * .8, filt(noise(.12), 500, 3500) * np.exp(-T(.12) * 55) * .55, filt(noise(.05), 1500, 7000) * np.exp(-T(.05) * 130) * .3)
        rec(f'vendor_step_{i}', x, 'props', f'Rubber chappal slap on the street ({i})', ['synth'], target=-15, peak=-5, b=.05)
    # pot clang on the head
    rec('vendor_pot_clang', mix(clang(11, .78, 1.3, 4) * 1.0, sub(.3, 140, 90, 16) * .3, src('oga_100cc0_pot_02.ogg', .9, f='anull')[:int(.5 * SR)] * .5), 'props', 'A heavy pot comes down on his head: a big clang and hollow tock', ['oga_cast_iron_clang', 'oga_100cc0_pot_02', 'synth'], target=-6, peak=-1, b=.5)
    rec('vendor_pot_jam', mix(clang(8, 1.0, .6, 8) * .9, src('oga_100cc0_pot_01.ogg', 1.0, f='anull')[:int(.4 * SR)] * .6), 'props', 'The pot bounces and jams down over his eyes: a smaller clonk', ['oga_cast_iron_clang', 'oga_100cc0_pot_01'], target=-9, peak=-1, b=.25)
    g = src('freesound_635110_RadioCounseling_crowd_gasp.mp3', 1.0, f='highpass=f=150')[:int(1.3 * SR)]
    rec('vendor_crowd_ooh', filt(g, 200, 4500), 'props', 'The street winces: a small crowd gasp/ooh', ['freesound_635110'], target=-16, peak=-6, cut=False, b=.4, a=.02)


# ---- the finisher -------------------------------------------------------------------------------------------------------
def finisher():
    for i, (f0, mk) in enumerate([(100, 0), (85, 1)], 1):
        p = src(SOR / '02.wav', .9 - .05 * i, f='highpass=f=100,lowpass=f=3200')
        rec(f'vendor_gut_jab_{i}', mix(p[:int(.2 * SR)] * .8, flesh(.2, f0, 1.0) * .9), 'finisher', f'Jab into the belly ({i}): SOR2 punch over a flesh thump', ['streets_of_rage_2/02', 'freesound_337148', 'synth'], target=-8, peak=-1, b=.1)
    for i, (f0, pitch) in enumerate([(80, .85), (68, .78)], 1):
        h = src(SOR / '05.wav', pitch, f='highpass=f=70,lowpass=f=3000')[:int(.45 * SR)]
        oof = mix(np.pad(chest(enemy('V02', .62), .4)[:int(.32 * SR)], (int(.05 * SR), 0)) * .5, filt(noise(.3), 250, 2000) * np.exp(-T(.3) * 9) * .2)
        rec(f'vendor_gut_hook_{i}', mix(h * .9, flesh(.25, f0, 1.3), sub(.4, 70, 38, 8) * .6, np.pad(oof, (int(.03 * SR), 0))), 'finisher', f'Hook that folds him ({i}): SOR2 heavy, flesh thump and the wind knocked out', ['streets_of_rage_2/05', 'streets_of_rage_2/V02', 'freesound_337148', 'synth'], target=-6, peak=-1, b=.15)
    bc = src(ROOT / 'audio/sfx/bone_crack.wav', .9, f='highpass=f=100')
    wet = filt(noise(.4), 400, 2600) * np.exp(-T(.4) * 20) * (.4 + .6 * (T(.4) > .04)) * .5
    rec('vendor_rib_crack', mix(bc * 1.0, np.pad(wet, (int(.02 * SR), 0)), sub(.3, 90, 45, 12) * .7, np.pad(chest(enemy('V02', .6), .3)[:int(.25 * SR)], (int(.08 * SR), 0)) * .4), 'finisher', 'Rib crack: the shipped bone crack pitched down over a wet crunch and a gasp', ['audio/sfx/bone_crack', 'streets_of_rage_2/V02', 'synth'], target=-6, peak=-1, b=.15)
    g = mix(src('oga_moresounds_Cloth_01.wav', 1.4, start=.3, dur=.35, f='highpass=f=200') * .8, filt(noise(.1), 600, 3500) * np.exp(-T(.1) * 40) * .3, chest(andore(1, .85), .4)[:int(.28 * SR)] * .8)
    rec('vendor_vest_grab', g, 'finisher', 'CHAD seizes him by the vest: cloth grab and a startled grunt', ['oga_moresounds_Cloth_01', 'final_fight/voice/29_andore_1'], target=-11, peak=-2, b=.08)
    rec('vendor_fling_cook', mix(sweep_noise(.5, .12, 300, 2000, .12, air=1), np.pad(chest(enemy('V03', .7), .4)[:int(.4 * SR)], (int(.02 * SR), 0)) * .7), 'finisher', 'Flung head first at the kadai: a heavy swish and a yell', ['synth', 'streets_of_rage_2/V03'], target=-9, peak=-2, b=.15)
    mu = filt(chest(andore(2, .72), .5)[:int(.5 * SR)], 80, 900, 3)
    bub = filt(src('oga_loops_water_boiling.ogg', .9, dur=.5, f='anull'), 100, 1600)
    rec('vendor_scream_dunk', mix(mu * 1.0, bub * .6, sizzle_burst(.5, 3.1, decay=1.2, pops=3, seed=13) * .18), 'finisher', 'Screaming under the ghee: a muffled voice through the oil and bubbles', ['final_fight/voice/2A_andore_2', 'oga_loops_water_boiling', 'freesound_353124'], target=-10, peak=-2, b=.3)
    sh = mix(chest(enemy('V05', .8), .3)[:int(.3 * SR)], filt(noise(.25), 800, 5000) * np.exp(-T(.25) * 9) * .2)
    rec('vendor_scream_pop', sh, 'finisher', 'Hauled out of the pan: a short scalded gasp-shriek', ['streets_of_rage_2/V05', 'synth'], target=-9, peak=-1.5, b=.06)
    x = mix(flesh(.3, 60, 1.2), filt(src('oga_100cc0_splash_01.ogg', .9, f='anull'), 150, 3000)[:int(.5 * SR)] * .5, np.pad(chest(andore(2, .6), .5)[:int(.5 * SR)], (int(.06 * SR), 0)) * .7,
            src(SOR / '32.wav', .7, f='lowpass=f=1500')[:int(.3 * SR)] * .5)
    rec('vendor_land_butt', x, 'finisher', 'Dumped on his backside off the rim: thud, oil slop and a groan', ['streets_of_rage_2/32', 'freesound_337148', 'oga_100cc0_splash_01', 'final_fight/voice/2A_andore_2'], target=-7, peak=-1, b=.3)
    bcr = src(ROOT / 'audio/sfx/bone_crack.wav', .8, f='highpass=f=80')
    teeth = np.zeros(int(1.2 * SR))
    for k, (at, fr) in enumerate([(.22, 4600), (.36, 5200), (.47, 3900), (.55, 5600), (.61, 4400), (.9, 5000)]):
        d = .05; tk = np.sin(2 * np.pi * fr * T(d)) * np.exp(-T(d) * 90) * (.35 / (1 + k * .4)); tk = tk + filt(noise(d), 2500, 9000) * np.exp(-T(d) * 200) * .15
        teeth = place(teeth, tk, at)
    up = mix(src(SOR / '05.wav', .75, f='highpass=f=60,lowpass=f=3200')[:int(.5 * SR)] * 1.0, bcr * 1.0, np.pad(bcr * .7, (int(.05 * SR), 0)), sub(.6, 80, 40, 6) * .9, teeth,
             np.pad(filt(noise(.3), 300, 2500) * np.exp(-T(.3) * 12) * .35, (int(.02 * SR), 0)))
    rec('vendor_jaw_break', up, 'finisher', 'Super uppercut: SOR2 heavy over two pitched bone cracks, a sub thump and teeth pattering down', ['streets_of_rage_2/05', 'audio/sfx/bone_crack', 'synth'], target=-5, peak=-.8, b=.4)
    sc = glide(chest(src(SOR / 'V20.wav', .78, f='highpass=f=80,lowpass=f=3600'), .5), 1.0, .72)
    rec('vendor_scream_air', sc[:int(.66 * SR)], 'finisher', 'Flying end over end: his scream falling away (SOR2 V20 pitched down and sliding lower)', ['streets_of_rage_2/V20'], target=-9, peak=-2, b=.1)
    tray = src('freesound_209002_OwlStorm_pots_and_pans_clatter_1.mp3', .9, start=.0, dur=1.8, f='highpass=f=150')
    wood = src('oga_100cc0_wooden_01.ogg', .7, f='anull')[:int(.4 * SR)]; wood2 = src('oga_100cc0_wooden_03.ogg', .6, f='anull')[:int(.5 * SR)]
    x = mix(src(SOR / '31.wav', .7, dur=.7, f='lowpass=f=2400') * 1.0, wood * .9, np.pad(wood2, (int(.03 * SR), 0)) * .8, np.pad(tray * .5, (int(.05 * SR), 0)), flesh(.3, 55, 1.3),
            bcr * .6, sub(1.1, 65, 32, 3) * .8, np.pad(sizzle_burst(1.4, 14.0, decay=2.2, pops=18, seed=31) * .35, (int(.06 * SR), 0)))
    rec('vendor_counter_crack', x, 'finisher', 'Slammed on his own counter: wood splitting, trays clattering, a body slam and hot metal sizzling', ['streets_of_rage_2/31', 'oga_100cc0_wooden', 'freesound_209002', 'freesound_337148', 'audio/sfx/bone_crack', 'synth'], target=-4.5, peak=-.8, b=.6)
    rec('vendor_roll', mix(sweep_noise(.35, .12, 250, 1200, .1, air=1.0), src('oga_moresounds_Cloth_01.wav', 1.0, start=.5, dur=.35, f='highpass=f=120') * .5), 'finisher', 'Rolling off the counter: cloth drag and a rush', ['synth', 'oga_moresounds_Cloth_01'], target=-13, peak=-4, b=.12)
    rec('vendor_drop_street', mix(flesh(.3, 58, 1.2), thud_dirt(.85, .5) / 1.3, sub(.6, 65, 32, 6) * .6, np.pad(src(SOR / '32.wav', .7, f='lowpass=f=1500')[:int(.3 * SR)], (int(.005 * SR), 0)) * .6), 'finisher', 'Rolls off the counter and hits the street: a heavy body thud', ['freesound_504626', 'freesound_337148', 'streets_of_rage_2/32', 'synth'], target=-7, peak=-1, b=.25)
    sc = filt(noise(1.1), 500, 4200) * (.4 + .6 * np.sin(2 * np.pi * np.cumsum(20 + 40 * T(1.1) / 1.1) / SR) ** 2) * np.sin(np.pi * np.clip(T(1.1) / 1.1, 0, 1)) ** .8
    ck = mix(sc * .55, clang(21, .5, 1.0, 6)[:int(1.1 * SR)] * .3)
    rec('vendor_kadai_tip', mix(ck, np.pad(sub(.4, 110, 55, 10) * .3, (int(.7 * SR), 0))[:len(ck)]), 'finisher', "Kicked stand skids and the kadai rocks over: a long metal scrape and creak, a low knock at the tip", ['oga_cast_iron_clang', 'synth'], target=-9, peak=-2, b=.3)
    pour = filt(noise(1.8), 150, 2800) * np.sin(np.pi * np.clip(T(1.8) / 1.8, 0, 1)) ** .7 * (.6 + .4 * np.sin(2 * np.pi * 9 * T(1.8)) ** 2)
    wh = src('freesound_260554_LookIMadeAThing_basic_fire_whoosh.mp3', .85, f='highpass=f=60')[:int(1.8 * SR)]
    kc = np.pad(clang(10, .62, 1.2, 6) * .8, (int(.03 * SR), 0))
    x = mix(kc, pour * .5, np.pad(wh, (int(.25 * SR), 0)) * 1.0, sub(1.0, 70, 36, 3.5) * .9, sizzle_burst(1.8, 12.8, attack=.05, decay=1.2, pops=20, seed=77) * .4)
    rec('vendor_ghee_spill', x, 'finisher', 'The kadai goes over: iron crash, a rush of ghee and the fire catching with a whoosh', ['oga_cast_iron_clang', 'freesound_260554', 'freesound_353124', 'synth'], target=-6, peak=-1, b=.7)
    rec('vendor_exhale', mix(filt(noise(.9), 200, 2200) * np.sin(np.pi * np.clip(T(.9) / .9, 0, 1)) ** 1.2 * 1.4, sub(.9, 130, 90, 3) * .1), 'finisher', "Out cold: his last long breath out", ['synth'], target=-16, peak=-6, cut=False, b=.3)


def register():
    p = ROOT / 'audio/sfx/manifest.json'
    m = json.loads(p.read_text())
    gen = m.setdefault('generated', {})
    for k in [k for k in gen if k.startswith('vendor_')]: del gen[k]
    for k, v in REG.items(): gen[k] = v
    p.write_text(json.dumps(m, indent=2) + '\n')
    (ROOT / 'js/vendor_sound_bank.js').write_text(bank_js())


def bank_js():
    names = ', '.join(f"'{k}'" for k in REG)
    return ("// The Ghee Pappu sound bank: every vendor_* sample audio.js loads (tools/production/build_pappu_audio.py writes this list).\n"
            f"export const PAPPU_SFX=[{names}];\n")


def main():
    kitchen(); fire(); body(); props(); finisher(); register()


if __name__ == '__main__':
    main()
