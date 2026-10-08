"""Platform occlusion fronts: the plates with the far-track openings cut out, so the goods
train and the arriving sleeper pass behind the painted columns, lanterns, lamp post and sign.

platform_front.png covers the platform plate; join_hall_platform_front.png covers the
hall/platform join (world 1680-2160), which is drawn over the platform plate, so the two
fronts reproduce exactly what the plates show and never add seams. Coordinates are 2x.
"""
from pathlib import Path
import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parents[2] / 'assets/stages/night_train/rebuild'
BAND = (72, 305)              # canopy fringe to the back curb: everything a train can show through
DETAIL = (165, 280)           # rows the goods train occupies; above/below keep the old solid strips


def dilate(m, r=1):
    p = np.pad(m, r); out = np.zeros_like(m)
    for dy in range(2 * r + 1):
        for dx in range(2 * r + 1): out |= p[dy:dy + m.shape[0], dx:dx + m.shape[1]]
    return out


def classes(rgb):
    r, g, b = (rgb[..., i].astype(int) for i in range(3)); lum = rgb.astype(int).mean(2)
    sky = (b > r + 14) & (b > g + 20) & (b > 35)
    glow = (lum > 40) & (lum < 85) & (r > g * 1.8) & (r > b * 1.4) & (r < 128)  # lamp halo on sky/trees
    core = (r >= 128) | (lum > 90)
    return sky, glow, core, lum


def lit(rgb):  # lantern glass and brass plus the dark frame bars that touch them
    sky, glow, core, lum = classes(rgb)
    return dilate(core) | ((lum < 35) & ~sky & dilate(core, 2))


def solid(rgb):  # anything that is neither night sky nor lamp halo (hoods, arms, sign boards, chains)
    sky, glow, core, lum = classes(rgb)
    return ~sky & ~glow


def board(rgb):  # the hanging sign without the specks of dark sky around its chains
    m = solid(rgb); return m & dilate(~dilate(~m))


def front(plate, keep):
    a = np.array(plate.convert('RGBA')); rgb = a[..., :3]; h, w = a.shape[:2]
    opaque = np.ones((h, w), bool); opaque[BAND[0]:BAND[1]] = False
    for x0, x1, y0, y1, test in keep:
        m = np.zeros((h, w), bool); m[y0:y1, x0:x1] = True
        if test: m &= test(rgb)
        opaque |= m
    a[..., 3] = np.where(opaque, 255, 0).astype('uint8'); a[~opaque, :3] = 0
    return Image.fromarray(a)


def columns(shafts, strips, bases=()):
    keep = [(x0, x1, *BAND, None) for x0, x1 in shafts]
    for x0, x1 in strips: keep += [(x0, x1, BAND[0], DETAIL[0], None), (x0, x1, DETAIL[1], BAND[1], None)]
    for x0, x1 in bases: keep.append((x0, x1, DETAIL[1], BAND[1], None))
    return keep


def main():
    # Platform: paired cast-iron columns with wall lanterns (the old strips kept only one of each pair).
    keep = columns([(115, 136), (475, 494), (534, 546), (1233, 1250), (1285, 1304), (1824, 1847)],
                   [(105, 152), (500, 552), (1215, 1263), (1815, 1857)], [(469, 500), (1279, 1310)])
    keep += [(x0, x1, 170, 208, lit) for x0, x1 in [(133, 152), (520, 546), (1225, 1251), (1808, 1833)]]
    front(Image.open(OUT / 'platform.png'), keep).save(OUT / 'platform_front.png')
    # Join: the ticket-office end, its column and lantern, the lamp post and the hanging sign.
    keep = columns([(0, 316), (354, 361), (597, 617), (955, 960)], [(585, 640)])
    keep += [(605, 629, 180, 220, lit), (368, 400, 152, 173, solid), (368, 400, 173, 178, lit), (361, 374, 162, 178, solid), (703, 780, 96, 184, board)]
    front(Image.open(OUT / 'join_hall_platform.png'), keep).save(OUT / 'join_hall_platform_front.png')


if __name__ == '__main__':
    main()
