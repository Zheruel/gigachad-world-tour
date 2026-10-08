"""Cut the night-train life sheets (assets/sources/production/stages/night_train/life).

fixtures.png: 4x3 props on magenta. Row 1 hangs from a hook at the cell top (strip
fixtures_hang.png, pivot at each slot's top centre); rows 2-3 (rack luggage) are no longer used.
passengers2.png (4 seated passengers x rest/alert/cower/cheer) registers into 156x182 cells,
feet at y=177, each row scaled from its first pose to 130px like every seated train passenger.
*_idle.png (true-alpha 4x2 idle grids) add calm loops (passengers()), toned to the approved
reaction poses and graded into the coach light with them (backdrop_tone.py).
Usage: build_train_life.py [passengers]  (passengers: only the passenger strips).
Everything is baked at its on-screen 2x size so the game blits it 1:1 (the canvas uses
nearest-neighbour sampling, so any runtime scaling breaks the pixels). Fixtures keep a
slot pivot and are only resampled by their sway rotation.
"""
from pathlib import Path
import numpy as np
from PIL import Image
from keying import key, components

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/life'
OUT = ROOT / 'assets/stages/night_train/rebuild'
HANG_SCALE = [.186, .24, .186, .186]  # strap, lamp, bag, towel: 2x device pixels per source pixel
CELL_W, CELL_H, FEET = 156, 182, 177


def cells(path, cols, rows, skip=()):
    a = np.array(key(Image.open(path))); h, w = a.shape[:2]; out = {}
    for part in components(a[:, :, 3] > 24):
        if len(part) < 200:
            continue
        cy, cx = part.mean(0); i = int(cy // (h / rows)) * cols + int(cx // (w / cols))
        if i in skip:
            continue
        out.setdefault(i, []).append(part)
    pieces = {}
    for i, parts in out.items():
        m = np.zeros((h, w), bool)
        for p in parts:
            m[p[:, 0], p[:, 1]] = True
        c = a.copy(); c[~m] = 0; im = Image.fromarray(c); pieces[i] = im.crop(im.getbbox())
    return pieces


def scaled(im, s):
    im = im.resize((max(1, round(im.width * s)), max(1, round(im.height * s))), Image.Resampling.LANCZOS)
    a = np.array(im); a[a[:, :, 3] < 40] = 0; return Image.fromarray(a)


def strip(items, square, bottom):
    w = max(i.width for i in items) + 2; h = max(i.height for i in items) + 2
    if square:
        w = h = max(w, h)
    out = Image.new('RGBA', (w * len(items), h))
    for n, im in enumerate(items):
        out.alpha_composite(im, (n * w + (w - im.width) // 2, h - im.height - 1 if bottom else 1))
    return out


def pelvis(im):
    a = np.array(im)[:, :, 3] > 64; ys, xs = np.where(a); t, b = ys.min(), ys.max()
    band = (ys >= t + (b - t) * .45) & (ys <= t + (b - t) * .7)
    return float(np.median(xs[band]))


def register_rows(name, out, heights, cols=4, rows=4):
    p = cells(SRC / name, cols, rows); strip_im = Image.new('RGBA', (CELL_W * cols * rows, CELL_H))
    for r in range(rows):
        scale = heights[r] / p[r * cols].height
        for c in range(cols):
            im = scaled(p[r * cols + c], scale); i = r * cols + c
            strip_im.alpha_composite(im, (round(i * CELL_W + CELL_W / 2 - pelvis(im)), FEET - im.height))
    strip_im.save(OUT / out)


def main():
    p = cells(SRC / 'fixtures.png', 4, 3, skip={10})
    strip([scaled(p[i], HANG_SCALE[i]) for i in range(4)], False, False).save(OUT / 'fixtures_hang.png')
    register_rows('passengers2.png', 'passengers_life.png', [130] * 4)
    passengers()


# Background grade for the carriage passengers (tools/production/backdrop_tone.py): the coach plate
# and logical box whose lamp light each row takes (its first seat), and backdrop() settings.
# passengers_life rows: 0 reader, 1 youth, 2 tiffin, 3 vest; then the two seated regulars.
LIGHT = {0: ('general', (670, 110, 730, 190)), 1: ('general', (140, 110, 200, 190)), 2: ('sleeper', (150, 110, 210, 190)),
         3: ('sleeper', (770, 110, 830, 190)), 'seated': ('general', (260, 110, 320, 190)), 'sari': ('sleeper', (365, 110, 425, 190))}
# The coach rows used to be dimmed at runtime with a brightness(.8) filter; the two regulars were not.
GRADE = {'seated': dict(level=1., cast=.25), 'sari': dict(level=1., cast=.25)}


def graded(im, key):
    from sprite_edges import edges
    from backdrop_tone import backdrop, plate_light
    plate, (x0, y0, x1, y1) = LIGHT[key]
    return backdrop(edges(im), plate_light(OUT / f'{plate}.png', (x0 * 2, y0 * 2, x1 * 2, y1 * 2))[0], **GRADE.get(key, dict(level=.8, cast=.25)))


def matched(im, split):
    """New idle poses (left of `split`) toned to the approved reaction poses on its right."""
    from build_station_life import match_tone
    o = np.array(im); o[:, :split] = match_tone(o[:, :split], o[:, split:]); return Image.fromarray(o)


def idle_cells(name):
    """8 seated idle poses (true-alpha GPT 4x2 sheet), registered on hips and feet."""
    from sprite_edges import alpha
    from build_station_life import settle
    a = np.array(alpha(Image.open(SRC / f'{name}_idle.png'))); h, w = a.shape[:2]
    cells = [a[round(r * h / 2):round((r + 1) * h / 2), round(c * w / 4):round((c + 1) * w / 4)] for r in range(2) for c in range(4)]
    return settle(cells, (.62, .99), ground=True)


def place(out, fr, ref, i, cw, feet):
    """Scale idle frames so frame 0 matches the existing rest pose `ref` (a cell image) in height,
    and put them at its feet line and pelvis x in cell i onward."""
    rb = np.array(ref)[:, :, 3] > 64; ys, xs = np.where(rb); k = (ys.max() - ys.min() + 1)
    a0 = fr[0][0][:, :, 3] > 64; y0 = np.where(a0)[0]; k /= y0.max() - y0.min() + 1
    px = pelvis(ref)
    im0 = scaled(Image.fromarray(fr[0][0]), k); dx = px - pelvis(im0.crop((0, 0, im0.width, im0.height)))
    for j, (a, ax, ay) in enumerate(fr):
        im = scaled(Image.fromarray(a), k)
        out.alpha_composite(im, (round((i + j) * cw + dx), round(ys.max() - ay * k)))


def passengers():
    """Calm idle loops for the coach passengers, graded with their reactions so poses never pop:
    passengers_idle.png (4 rows x 8, passengers_life cells), seated_life.png (8 idle + the 4
    passenger_reaction poses) and sari_life.png (8 idle + passengers.png row 1)."""
    life = Image.open(OUT / 'passengers_life.png'); idle = Image.new('RGBA', (CELL_W * 32, CELL_H))
    for r, name in enumerate(['oldman', 'youth', 'tiffin', 'vest']):
        row = Image.new('RGBA', (CELL_W * 12, CELL_H))
        row.alpha_composite(life.crop((r * 4 * CELL_W, 0, (r * 4 + 4) * CELL_W, CELL_H)), (8 * CELL_W, 0))
        place(row, idle_cells(name), life.crop((r * 4 * CELL_W, 0, (r * 4 + 1) * CELL_W, CELL_H)), 0, CELL_W, FEET)
        row = graded(matched(row, 8 * CELL_W), r)
        idle.alpha_composite(row.crop((0, 0, 8 * CELL_W, CELL_H)), (r * 8 * CELL_W, 0))
        life.paste(row.crop((8 * CELL_W, 0, 12 * CELL_W, CELL_H)), (r * 4 * CELL_W, 0))
    idle.save(OUT / 'passengers_idle.png'); life.save(OUT / 'passengers_life.png')
    for name, src, first, cw, ch in [('seated', 'passenger_reaction.png', 0, 162, 162), ('sari', 'passengers.png', 4, 186, 212)]:
        rest = Image.open(OUT / ('passenger_seated.png' if name == 'seated' else src))
        out = Image.new('RGBA', (cw * 12, ch)); react = Image.open(OUT / src)
        out.alpha_composite(react.crop((first * cw, 0, (first + 4) * cw, ch)), (8 * cw, 0))
        place(out, idle_cells(name), rest.crop((first * cw, 0, (first + 1) * cw, ch)), 0, cw, None)
        graded(matched(out, 8 * cw), name).save(OUT / f'{name}_life.png'); print(f'{name}_life', out.size)


if __name__ == '__main__':
    import sys
    if sys.argv[1:] == ['passengers']:  # only the passenger strips (reads passengers_life.png fresh)
        register_rows('passengers2.png', 'passengers_life.png', [130] * 4); passengers()
    else:
        main()
