#!/usr/bin/env python3
"""Register selected Delhi boundary paintings and machine scenery at 2x scale.

The boundary sources are authored repairs of adjacent half-panels. A short
edge overlap retains the established outer architecture; the repaired centre
is opaque. The resulting route is split back into its existing runtime panels.
"""
from pathlib import Path
import numpy as np
from PIL import Image, ImageOps, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/dirty_delhi/rebuild'
OUT = ROOT / 'assets/stages/dirty_delhi/rebuild'
NAMES = ['market', 'bazaar', 'food', 'vendor', 'culvert', 'ghat', 'wharf', 'pontoon']

def fit(path):
    return ImageOps.fit(Image.open(path).convert('RGB'), (1620, 540),
                        method=Image.Resampling.LANCZOS, centering=(.5, .72))

def build():
    OUT.mkdir(parents=True, exist_ok=True)
    route = Image.new('RGB', (1620 * len(NAMES), 540))
    for i, name in enumerate(NAMES):
        route.paste(fit(SOURCE / f'{name}.png'), (i * 1620, 0))
    for i, (left, right) in enumerate(zip(NAMES, NAMES[1:]), 1):
        source = SOURCE / 'joins' / f'{left}_{right}.png'
        if not source.exists():
            continue
        patch = fit(source)
        # Only the matching outer edges blend. The newly painted geographic
        # transition in the middle remains fully opaque, including its floor.
        x = np.arange(1620)
        alpha = np.minimum(np.minimum(x / 104, (1619-x) / 104), 1).clip(0, 1)
        alpha = alpha * alpha * (3 - 2 * alpha)
        mask = Image.fromarray(np.tile((alpha*255).astype('uint8'), (540, 1)))
        route.paste(patch, (i*1620-810, 0), mask)
    for i, name in enumerate(NAMES):
        route.crop((i*1620, 0, (i+1)*1620, 540)).save(OUT / f'{name}.png', optimize=True)

    # The selected source uses a neutral checker matte, including the lattice
    # holes. Remove that neutral high-value matte without keying brass highlights.
    cab = Image.open(SOURCE / 'dredger_cab.png').convert('RGB')
    a = np.asarray(cab).astype(float)
    neutral = a.max(2) - a.min(2) < 25
    alpha = np.where(neutral, np.clip((226-a.min(2))/18, 0, 1), 1)
    cab = cab.convert('RGBA')
    cab.putalpha(Image.fromarray((alpha*255).astype('uint8')).filter(ImageFilter.MinFilter(3)))
    cab = cab.crop((100, 60, 1140, 1150))
    # Measured window centre (770,285), planted feet y1140. Uniform scale
    # gives window (352,74), feet y210 in the existing Dredger arena.
    cab = cab.resize((332, 348), Image.Resampling.LANCZOS)
    cab.save(OUT / 'dredger_cab.png', optimize=True)

    # Same-source small highlights: only actual water pixels are extracted.
    # These masks never move shoreline, boats, masonry or the skyline.
    # Runtime geometry below is in logical coordinates; convert crop to source.
    regions = [
        ('river_glints', (5030, 118, 5080, 135)),
        ('river_current', (6070, 141, 6240, 158)),
        ('outfall', (6430, 152, 6450, 184)),
    ]
    for name, (x0,y0,x1,y1) in regions:
        crop = route.crop((x0*2,y0*2,x1*2,y1*2)).convert('RGBA')
        data = np.asarray(crop).copy(); rgb = data[:,:,:3].astype(float)
        lum = rgb @ np.array([.299,.587,.114])
        # Sparse warm reflection/foam picks, with feathered region edges.
        mask = np.clip((lum-68)/72,0,.78)
        xx=np.minimum(np.arange(crop.width),np.arange(crop.width)[::-1])
        yy=np.minimum(np.arange(crop.height),np.arange(crop.height)[::-1])
        mask*=np.minimum(xx/16,1)[None,:]*np.minimum(yy/10,1)[:,None]
        data[:,:,3]=(mask*255).astype('uint8')
        Image.fromarray(data).save(OUT/f'{name}.png',optimize=True)
    print('Delhi: seven authored joins, registered cabin, three water detail masks')

if __name__ == '__main__':
    build()
