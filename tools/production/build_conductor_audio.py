"""Head Conductor sound set -> audio/sfx/cond_*.wav.

Voice and a few impacts come from the Final Fight arcade banks (audio/sources/final_fight, see SOURCE.txt);
the office Foley (rubber stamp, ink pad, ticket punch, banknotes, coins, chain, latch, lid, luggage scrape,
chair, shoes, papers) is synthesized here from modal partials and shaped noise.
Levels: loud cues (voice, impacts) peak near -1 dBFS with a 50 ms max RMS around -8 dB like the SOR2 combat set;
Foley details sit ~5 dB lower so the play volume in js/train_conductor.js sets the mix.
Run: .venv/bin/python tools/production/build_conductor_audio.py
Combat-only revision (preserves voices and shared banknote Foley): append --combat.
"""
from pathlib import Path
import subprocess, sys, wave
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
FF = ROOT / 'audio/sources/final_fight'
OUT = ROOT / 'audio/sfx'
SR = 44100
rng = np.random.default_rng(6065)


def decode(path, sr=SR, filters='highpass=f=90,lowpass=f=3500'):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-af', f'aresample={sr},{filters}', '-ac', '1', '-f', 'f32le', '-'],
                         check=True, capture_output=True).stdout
    return np.frombuffer(raw, dtype='<f4').astype(float)


def rms50(x, sr=SR):
    w = int(sr * .05)
    if len(x) <= w: return np.sqrt((x ** 2).mean())
    return max(np.sqrt((x[i:i + w] ** 2).mean()) for i in range(0, len(x) - w, w // 2))


def level(x, target=-8.0, peak=-1.0, sr=SR):
    x = x * (10 ** (target / 20) / max(rms50(x, sr), 1e-9))
    lim = 10 ** (peak / 20)
    x = x * min(1, lim * 10 ** (1.5 / 20) / np.abs(x).max())  # transients: give up loudness rather than squash > 1.5 dB
    level.over = 20 * np.log10(np.abs(x).max() / lim)  # >0: dB the soft knee had to absorb
    over = np.abs(x) > lim * .8
    if over.any():  # soft knee above 80% of the ceiling, never a hard clip
        k = lim * .8
        x = np.where(over, np.sign(x) * (k + (lim - k) * np.tanh((np.abs(x) - k) / (lim - k))), x)
    return x


def fade(x, a=.002, b=.03, sr=SR):
    n = len(x); ia = min(n, int(a * sr)); ib = min(n, int(b * sr))
    env = np.ones(n)
    if ia: env[:ia] = np.linspace(0, 1, ia)
    if ib: env[n - ib:] *= np.linspace(1, 0, ib) ** 2
    return x * env


def trim(x, thresh=-45, sr=SR):
    lim = 10 ** (thresh / 20); idx = np.where(np.abs(x) > lim)[0]
    return x[max(0, idx[0] - int(.003 * sr)):idx[-1] + 1] if len(idx) else x


def write(name, x, sr=SR):
    x = np.clip(x, -1, 1)
    with wave.open(str(OUT / f'{name}.wav'), 'wb') as f:
        f.setparams((1, 2, sr, 0, 'NONE', 'not compressed'))
        f.writeframes((x * 32767).astype('<i2').tobytes())
    pk = 20 * np.log10(np.abs(x).max() + 1e-9)
    print(f'{name:16s} {len(x) / sr:5.2f}s peak {pk:6.1f} dBFS  maxRMS50 {20 * np.log10(rms50(x, sr) + 1e-9):6.1f} dB  knee {max(0, getattr(level, "over", 0)):4.1f} dB')


# ---- building blocks -------------------------------------------------------------------------
def T(sec): return np.arange(int(sec * SR)) / SR


def place(buf, x, at):
    i = int(at * SR); n = min(len(x), len(buf) - i)
    if n > 0: buf[i:i + n] += x[:n]
    return buf


def modal(freqs, decays, amps, sec, jitter=0.0):
    t = T(sec); out = np.zeros_like(t)
    for f, d, a in zip(freqs, decays, amps):
        f *= 1 + jitter * rng.normal()
        out += a * np.sin(2 * np.pi * f * t + rng.uniform(0, 6.28)) * np.exp(-d * t)
    return out


def noise(sec): return rng.normal(0, 1, len(T(sec)))


def mix(*xs):  # sum of layers of different lengths
    out = np.zeros(max(len(x) for x in xs))
    for x in xs: out[:len(x)] += x
    return out


def onepole(x, a):  # a in (0,1): higher = brighter
    y = np.empty_like(x); s = 0.0
    for i, v in enumerate(x): s += a * (v - s); y[i] = s
    return y


def band(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X[(f < lo) | (f > hi)] = 0
    return np.fft.irfft(X, len(x))


def env_exp(sec, decay, attack=.001):
    t = T(sec); return np.minimum(t / attack, 1) * np.exp(-decay * t)


# ---- sampled voice and impacts (Final Fight) --------------------------------------------------
def sampled():
    v, s = FF / 'voice', FF / 'sfx'
    # attack efforts: short exhalations on the stamp, the thrust and the swing
    for name, src in [('cond_grunt_1', '03_punch_grunt'), ('cond_grunt_2', '04_throw_grunt'), ('cond_grunt_3', '21_grunt_unknown')]:
        write(name, level(fade(trim(decode(v / f'{src}.wav')), .002, .06), -9))
    for name, src in [('cond_hurt_1', '2C_generic_hurt1'), ('cond_hurt_2', '2D_generic_hurt2')]:
        write(name, level(fade(trim(decode(v / f'{src}.wav')), .002, .07), -9))
    # the big one: VOID, knockdowns and the dive onto his box
    write('cond_yell', level(fade(trim(decode(v / '29_andore_1.wav')), .002, .08), -8))
    # Belger's laugh for a seized meter or a downed CHAD
    write('cond_laugh', level(fade(trim(decode(v / '3D_belger_laugh.wav')), .002, .08), -10))
    # Belger's fall, shortened and bent down in pitch as he sails into the desk
    x = trim(decode(v / '3E_belger_fall.wav'))[:int(1.7 * SR)]
    t = np.arange(len(x)) / SR; pos = np.cumsum(1 - .22 * (t / t[-1]) ** 1.5)  # glide to ~0.78x
    x = np.interp(pos, np.arange(len(x)), x)
    write('cond_fall', level(fade(x, .002, .45), -9))
    # the bonus-stage car owner's "Oh my God" when his box of bribes hits the floor
    write('cond_ohno', level(fade(trim(decode(v / '2E_oh_my_god.wav'))[:int(1.15 * SR)], .002, .12), -10))
    # Damnd's two-finger whistle: EMERGENCY and the phase call
    write('cond_whistle', level(fade(trim(decode(v / '27_damnd_whistle.wav', filters='highpass=f=300,lowpass=f=3600')), .003, .06), -10))
    # the desk giving way under him in the finisher
    write('cond_crash', level(fade(trim(decode(s / '17_break_1.wav', filters='highpass=f=60,lowpass=f=3600')), .001, .12), -7))
    # the steel cash box as a club / taking a hit: the bang's attack only
    x = trim(decode(s / '19_metal_bang.wav', filters='highpass=f=80,lowpass=f=3600'))[:int(.42 * SR)]
    x *= np.exp(-np.arange(len(x)) / SR * 7)
    write('cond_box_hit', level(fade(x, .001, .08), -8))
    write('cond_thud', level(fade(trim(decode(s / '18_thud.wav', filters='highpass=f=50,lowpass=f=2400')), .001, .08), -8))


# ---- synthesized office Foley -----------------------------------------------------------------
def stamp():
    # Rubber stamp brought down hard: wooden handle knock, rubber slap, the thump through the surface.
    sec = .18; t = T(sec)
    knock = modal([520, 1340, 2310], [38, 55, 80], [.5, .3, .12], sec, .02)
    slap = band(noise(sec), 700, 3200) * env_exp(sec, 70, .0008)
    body = np.sin(2 * np.pi * (70 + 60 * np.exp(-t * 30)) * t) * env_exp(sec, 22, .002)
    tack = np.zeros_like(t); place(tack, band(noise(.03), 300, 1500) * env_exp(.03, 120) * .35, .028)  # rubber lifting off
    # A sampled body impact gives the short wooden/rubber transient real arcade weight.
    hit = trim(decode(FF / 'sfx/18_thud.wav', filters='highpass=f=60,lowpass=f=1800'))[:len(t)]
    hit = np.pad(hit, (0, max(0, len(t)-len(hit)))) * np.exp(-t * 23)
    write('cond_stamp', level(fade(.22 * knock + .6 * slap + .35 * body + 1.6 * hit + tack, .0005, .035), -8))


def ink():
    # Two quick dabs on a damp ink pad.
    out = np.zeros(int(.3 * SR))
    for at, g in [(0, 1), (.105, .75)]:
        pat = band(noise(.07), 150, 1400) * env_exp(.07, 55, .002)
        squish = band(noise(.07), 900, 2600) * env_exp(.07, 30, .01) * np.sin(2 * np.pi * 30 * T(.07)) ** 2
        thump = np.sin(2 * np.pi * 170 * T(.07)) * env_exp(.07, 60, .002)
        place(out, g * (pat + .5 * squish + .6 * thump), at)
    write('cond_ink', level(fade(out, .001, .04), -13))


def ticket_punch():
    # Hand ticket punch: steel jaws clack through card, a paper snip, the spring kicks the lever back.
    out = np.zeros(int(.22 * SR))
    clack = mix(modal([3150, 4720, 6080, 8200], [90, 110, 140, 170], [.6, .4, .25, .15], .1, .01), band(noise(.1), 2500, 9000) * env_exp(.1, 260))
    snip = band(noise(.02), 3000, 8000) * env_exp(.02, 180)
    spring = mix(modal([2400, 5100], [60, 90], [.25, .12], .12), band(noise(.12), 2000, 7000) * env_exp(.12, 300) * .4)
    place(out, clack, 0); place(out, .7 * snip, .012); place(out, .45 * spring, .085)
    write('cond_punch', level(fade(out, .0003, .03), -12))


def banknote(name, sec, sweep):
    # One note flicked off the stack: crisp paper crackle through a moving band, then a soft flap.
    t = T(sec); n = noise(sec)
    crack = np.zeros_like(t); idx = rng.choice(len(t), int(sec * 900), replace=False)
    crack[idx] = rng.normal(0, 3, len(idx)); crack = band(crack, 1800, 9000)
    lo, hi = sweep
    bright = sum(band(n * ((t >= a) & (t < a + sec / 6)), lo + (hi - lo) * k, lo + (hi - lo) * k + 2500) for k, a in zip(np.linspace(0, 1, 6), np.linspace(0, sec, 7)[:-1]))
    envl = np.minimum(t / .004, 1) * np.exp(-t * 18) + .4 * np.exp(-((t - sec * .45) / .03) ** 2)
    flap = band(noise(sec), 200, 1200) * np.exp(-((t - sec * .6) / .02) ** 2) * .6
    write(name, level(fade((.7 * bright + .5 * crack) * envl + flap, .001, .03), -13))


def coins(name, count, spread, seed):
    # Loose change: small discs with inharmonic modes, colliding in clusters, over a dull steel-box body.
    r = np.random.default_rng(seed); sec = spread + .35
    out = np.zeros(int(sec * SR)); discs = [r.uniform(2600, 4600) for _ in range(count)]
    hits = np.sort(r.uniform(0, spread, count * 3) ** 1.3 / spread ** .3)
    for i, at in enumerate(hits):
        f0 = discs[r.integers(count)]; g = r.uniform(.4, 1) * (1 - .5 * at / sec)
        ring = modal([f0, f0 * 1.47, f0 * 2.09, f0 * 2.56], [r.uniform(14, 24), 30, 40, 55], [1, .5, .3, .18], .3, .004)
        click = band(noise(.004), 3000, 10000) * .6
        place(out, g * .25 * ring, at); place(out, g * click, at)
    place(out, .25 * modal([310, 740], [30, 45], [1, .4], .2), .0)  # the box they land in
    write(name, level(fade(out, .0005, .06), -12))


def chain(name, links, sec, seed, heavy=1.0):
    # Steel chain: small links knocking one after another in a hump of activity; the heavy pull is longer and louder.
    r = np.random.default_rng(seed); out = np.zeros(int((sec + .15) * SR))
    for k in range(links):
        at = sec * (r.beta(1.6, 2.4)); f = r.uniform(1900, 3600); g = r.uniform(.4, 1)
        place(out, g * mix(modal([f, f * 2.76, f * 5.4], [70, 110, 170], [.8, .35, .12], .12), band(noise(.006), 2500, 9000) * .5), at)
    write(name, level(fade(out, .001, .05), -12 + 2 * (heavy - 1)))


def combat_props():
    # Separate short feedback from one-off spills; a full handful every 14 ticks piled up.
    clink = trim(decode(FF / 'sfx/0F_clink.wav', filters='highpass=f=600,lowpass=f=4200'))
    t = T(.105); tick = np.zeros_like(t)
    place(tick, clink[:len(t)], 0)
    write('cond_coin_tick', level(fade(tick * np.exp(-t * 26), .0005, .025), -17))
    # Metal dropped on the floor has a body thump; closing the lid only clicks.
    t = T(.28); drop = np.zeros_like(t)
    thud = trim(decode(FF / 'sfx/18_thud.wav', filters='highpass=f=50,lowpass=f=2200'))
    metal = trim(decode(FF / 'sfx/19_metal_bang.wav', filters='highpass=f=300,lowpass=f=3600'))
    place(drop, thud[:len(t)], 0); place(drop, metal[:len(t)] * .38, .006)
    write('cond_box_drop', level(fade(drop * np.exp(-t * 8), .0005, .055), -10))
    # A lower, broader version of the approved swing sound, restricted to this boss.
    air = trim(decode(OUT / 'whiff.wav', filters='highpass=f=100,lowpass=f=3000'))
    slowed = np.interp(np.arange(int(len(air)/.8))*.8, np.arange(len(air)), air)
    t = T(.16); whoosh = np.zeros_like(t); place(whoosh, slowed[:len(t)], 0)
    write('cond_swing', level(fade(whoosh, .001, .035), -12))


def combat_chain():
    # Dry short link chatter: the previous 430-ms jingles overlapped a 200-ms cadence.
    clink = trim(decode(FF / 'sfx/0F_clink.wav', filters='highpass=f=350,lowpass=f=4000'))
    metal = trim(decode(FF / 'sfx/19_metal_bang.wav', filters='highpass=f=90,lowpass=f=2200'))
    for name, sec, beats, target in [
        ('cond_chain_1', .14, [(0, .65), (.033, .4), (.068, .22)], -15),
        ('cond_chain_2', .32, [(0, .8), (.025, .6), (.063, .35), (.102, .2)], -10),
    ]:
        out = np.zeros_like(T(sec))
        for at, gain in beats: place(out, clink[:int(.065*SR)]*gain, at)
        if name.endswith('_2'): place(out, metal[:len(out)]*.6*np.exp(-T(len(metal[:len(out)])/SR)*12), 0)
        write(name, level(fade(out, .0005, .035), target))


def latch():
    # The red handle's shackle snapping back onto its hook: a bright click then the dull clunk of the mount.
    out = np.zeros(int(.3 * SR))
    place(out, mix(modal([4200, 6900], [150, 200], [.5, .3], .05), band(noise(.005), 3000, 10000)), 0)
    place(out, mix(modal([610, 1480, 2630], [28, 45, 70], [1, .45, .2], .25), band(noise(.02), 200, 2000) * env_exp(.02, 150)), .055)
    write('cond_latch', level(fade(out, .0005, .04), -11))


def lid():
    # Steel cash-box lid slammed shut: two edge impacts a few ms apart, box resonance, latch tick.
    out = np.zeros(int(.35 * SR)); box = lambda g: g * modal([420, 1130, 2210, 3400], [22, 35, 50, 70], [1, .5, .3, .15], .3, .01)
    place(out, box(1), 0); place(out, box(.6), .009); place(out, band(noise(.01), 2000, 8000) * env_exp(.01, 300) * .8, 0)
    place(out, modal([4800], [180], [.4], .03), .04)
    write('cond_lid', level(fade(out, .0005, .05), -10))


def scrape():
    # Luggage sliding across the carriage floor: stick-slip grain over a low rumble, pulsing with the rocking prop.
    sec = .48; t = T(sec)
    slip = (np.sin(2 * np.pi * np.cumsum(38 + 12 * np.sin(t * 5)) / SR) > .3).astype(float)
    grain = band(noise(sec), 250, 1400) * (.45 + .55 * onepole(slip, .02))
    rumble = band(noise(sec), 40, 160) * 1.4
    wobble = .75 + .25 * np.sin(2 * np.pi * 3.2 * t) ** 2
    envl = np.minimum(t / .012, 1) * np.minimum((sec - t) / .14, 1)
    write('cond_scrape', level(fade((grain + rumble) * wobble * envl, .002, .05), -16))


def chair():
    # Office chair shoved back on a wooden floor: chattering leg judder rising in rate, then it settles.
    sec = .5; out = np.zeros(int((sec + .2) * SR)); at = 0.0; k = 0
    while at < sec:
        g = np.sin(np.pi * at / sec) ** .6
        place(out, g * mix(modal([380, 910, 1720], [60, 90, 130], [1, .5, .25], .05, .03), band(noise(.02), 300, 2500) * env_exp(.02, 150) * .6), at)
        at += .038 - .018 * (at / sec) + rng.uniform(-.004, .004); k += 1
    place(out, .8 * modal([160, 420], [30, 50], [1, .4], .18), sec + .02)
    write('cond_chair', level(fade(out, .001, .05), -12))


def step(name, seed):
    # Leather-soled shoe on the carriage floor: heel click then the sole settling.
    r = np.random.default_rng(seed); out = np.zeros(int(.18 * SR))
    heel = mix(band(noise(.015), 900, 3800) * env_exp(.015, 260), modal([r.uniform(700, 900), 1900], [90, 140], [.4, .15], .06))
    sole = band(noise(.06), 120, 900) * env_exp(.06, 45, .004) * .7 + np.sin(2 * np.pi * 95 * T(.06)) * env_exp(.06, 55, .002) * .8
    place(out, heel, 0); place(out, sole, r.uniform(.028, .038))
    write(name, level(fade(out, .0005, .03), -13))


def desk():
    # A palm (or the box) set down hard on the wooden desk.
    sec = .3; t = T(sec)
    x = modal([150, 380, 830], [25, 40, 70], [1, .5, .2], sec, .01) + band(noise(sec), 150, 2000) * env_exp(sec, 90, .0008) * .9
    write('cond_desk', level(fade(x, .0005, .05), -9))


def clatter():
    # The rubber stamp knocked out of his hand: wooden handle bouncing and rolling to rest.
    out = np.zeros(int(.55 * SR))
    for at, g in [(0, 1), (.14, .6), (.23, .38), (.285, .25), (.32, .15)]:
        place(out, g * mix(modal([690, 1880, 3100], [45, 70, 110], [1, .4, .15], .12, .02), band(noise(.008), 1000, 6000) * .4), at)
    write('cond_clatter', level(fade(out, .0005, .05), -11))


def papers():
    # Paperwork and loose notes fluttering down: slow flaps and fine crackle.
    sec = 1.4; t = T(sec); n = noise(sec)
    flap = np.abs(np.sin(2 * np.pi * np.cumsum(7 + 5 * rng.random(len(t))) / SR)) ** 6
    x = band(n, 1500, 7000) * (.25 + flap) + band(n, 300, 1200) * flap * .6
    write('cond_papers', level(fade(x * np.sin(np.pi * t / sec) ** .8, .01, .2), -15))


def main():
    if '--combat' in sys.argv:
        stamp(); scrape(); combat_props(); combat_chain()
        return
    sampled()
    stamp(); ink(); ticket_punch()
    banknote('cond_note_1', .12, (2200, 4200)); banknote('cond_note_2', .16, (3600, 1800))
    coins('cond_coins_1', 5, .22, 11); coins('cond_coins_2', 8, .38, 29)
    chain('cond_chain_1', 9, .28, 3); chain('cond_chain_2', 16, .5, 8, heavy=1.6)
    latch(); lid(); scrape(); chair(); step('cond_step_1', 4); step('cond_step_2', 9); desk(); clatter(); papers()
    # The selected combat pass is reproducible independently of the original Foley RNG.
    global rng
    rng = np.random.default_rng(6065)
    stamp(); scrape(); combat_props(); combat_chain()


if __name__ == '__main__':
    main()
