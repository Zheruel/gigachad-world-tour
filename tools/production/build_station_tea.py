"""Register the station chai-wallah's 12-frame routine (station_tea.png).

Source: assets/sources/production/stages/night_train/rebuild/station_tea_routine.png, a 4x3
GPT Image grid on magenta: rest, sip, greet, reach kettle / low, high and mid pull, set down /
lift glass, offer, wipe A, wipe B. Frames are aligned on the cart and the cart body below the
counter is taken from frame 0, so only the man, kettle and glass move. Written at display size
(184x184 device-pixel cells) for a 1:1 blit.
"""
import numpy as np
from PIL import Image
from keying import key
from build_train_rebuild import ROOT

SRC = ROOT / 'assets/sources/production/stages/night_train/rebuild/station_tea_routine.png'
OUT = ROOT / 'assets/stages/night_train/rebuild/station_tea.png'
CELL, WIDTH, FLOOR, CENTRE = 184, 127, 168, 92  # cart+lantern width, wheel floor and centre in the cell
BODY = .55  # cart body starts this far down the cell (below the counter top and anything held over it)
LANTERN = 46  # display x left of which the lantern and post are also fixed to frame 0


def cells():
    a = np.array(key(Image.open(SRC).convert('RGB')))
    h, w = a.shape[:2]; cw, ch = w / 4, h / 3
    return [a[round(r * ch):round((r + 1) * ch), round(c * cw):round((c + 1) * cw)] for r in range(3) for c in range(4)]


def shift_to(ref, a):
    """Integer shift that best aligns a's cart body onto ref's (alpha correlation)."""
    y0 = round(ref.shape[0] * BODY); r = ref[y0:, :, 3] > 64; best = (-1, 0, 0)
    for dy in range(-14, 15):
        for dx in range(-14, 15):
            m = np.roll(np.roll(a[:, :, 3] > 64, dy, 0), dx, 1)[y0:]
            s = (m & r).sum() - (m ^ r).sum()
            if s > best[0]:
                best = (s, dy, dx)
    return best[1:]


def main():
    cs = cells(); h = min(c.shape[0] for c in cs); w = min(c.shape[1] for c in cs)
    cs = [c[:h, :w] for c in cs]; ref = cs[0]; y0 = round(h * BODY); frames = []
    ys, xs = np.where(ref[:, :, 3] > 64); s = WIDTH / (xs.max() - xs.min() + 1)
    lx = round((LANTERN - CENTRE) / s + (xs.min() + xs.max()) / 2)
    for c in cs:
        dy, dx = shift_to(ref, c); c = np.roll(np.roll(c, dy, 0), dx, 1).copy()
        c[y0:] = ref[y0:]; c[:, :lx] = ref[:, :lx]  # one fixed cart body and lantern
        frames.append(Image.fromarray(c))
    out = Image.new('RGBA', (CELL * len(frames), CELL))
    for i, f in enumerate(frames):
        f = f.resize((round(w * s), round(h * s)), Image.Resampling.LANCZOS)
        a = np.array(f); a[:, :, :3] = (a[:, :, :3] * np.array([.96, .93, .98])).astype('uint8')  # station lamplight tint
        a[a[:, :, 3] < 40] = 0; f = Image.fromarray(a)
        out.alpha_composite(f, (round(i * CELL + CENTRE - (xs.min() + xs.max()) / 2 * s), round(FLOOR - ys.max() * s)))
    out.save(OUT)


if __name__ == '__main__':
    main()
