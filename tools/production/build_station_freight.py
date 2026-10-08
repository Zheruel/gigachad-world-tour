"""Goods train for the platform's far track as separate vehicles, so each can bob, take up
coupler slack and turn its wheels. Same cut, scale and night grade as the old single strip
(build_station_life.py): the sleeper's locomotive plus the five GPT Image goods wagons.

Writes assets/stages/night_train/rebuild/st_freight_cars.png (vehicles side by side, wheels
on one line) and prints the JS table for js/station_life.js: [atlas x, width, [wheel x...]]
in 2x pixels, wheel x from the vehicle's left edge.
"""
import numpy as np
from PIL import Image
from keying import key, components
from build_station_life import SRC, OUT, clean

H = 87       # cell height; wheels sit on row H-2
PAD = 4


def vehicles():
    fr = clean(np.array(key(Image.open(SRC / 'freight.png').convert('RGB'))), 800)
    parts = sorted((pt for pt in components(fr[:, :, 3] > 0) if len(pt) > 5000), key=lambda pt: pt[:, 1].min())
    wagons = [fr[:, pt[:, 1].min() - 4:pt[:, 1].max() + 5] for pt in parts]
    loco = np.array(Image.open(OUT / 'locomotive.png').convert('RGBA'))
    for a, sc in [(loco, .31)] + [(w, .34) for w in wagons]:
        im = Image.fromarray(a).resize((round(a.shape[1] * sc), round(a.shape[0] * sc)), Image.Resampling.LANCZOS)
        b = np.array(im); b[:, :, :3] = np.clip(b[:, :, :3] * np.array([.46, .5, .64]), 0, 255).astype('uint8'); b[b[:, :, 3] < 40] = 0
        im = Image.fromarray(b); yield im.crop(im.getbbox())


def wheels(im):
    """Wheel centres from the tyre bottoms: runs of solid pixels on the lowest rows."""
    a = np.array(im)[:, :, 3] > 100; h = a.shape[0]
    row = a[h - 3]; xs = []; x = 0
    while x < len(row):
        if row[x]:
            s = x
            while x < len(row) and row[x]: x += 1
            if x - s >= 3: xs.append(round((s + x - 1) / 2))
        x += 1
    groups = []  # a bogie's axles lie within 32px; a run between two tyres is its frame
    for x in xs:
        if groups and x - groups[-1][0] < 32: groups[-1].append(x)
        else: groups.append([x])
    return [x for g in groups for x in (g if len(g) == 3 and g[2] - g[0] > 40 else [g[0], g[-1]] if len(g) > 1 else g)]


def main():
    ims = list(vehicles())
    out = Image.new('RGBA', (sum(i.width + PAD for i in ims) + PAD, H)); x = PAD; table = []
    for im in ims:
        out.alpha_composite(im, (x, H - 2 - im.height)); table.append([x, im.width, wheels(im)]); x += im.width + PAD
    out.save(OUT / 'st_freight_cars.png')
    print('FREIGHT_CARS=' + str(table).replace(' ', ''))


if __name__ == '__main__':
    main()
