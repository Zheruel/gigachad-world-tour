"""Chai wallah's scalding puddle from one true-alpha GPT sheet (night_train/fx/chai_puddle.png, 6x4 cells):
row 0 impact splash, row 1 hot puddle loop (bubble pops in 3-5), row 2 cooling to a stain, row 3 steam wisp.

Writes at 2x, registered on the puddle body's centre (splash frames on the body's floor line):
  chai_puddle.png  6x3 grid of CW x CH cells, anchor (CW/2, AY)
  chai_steam.png   6 cells of SW x SH, bottom-centred (drawn translucent; the splash's frame 0 pour is unused)
Scale: the settled puddle body (row 1, frame 0, satellite drops excluded) is 4*R px wide = the zone's
2*z.r at 2x, so the art shows exactly where the scald reaches. Prints each frame's body half-width in
logical px for js/shots.js (CHAI_BODY).
"""
from pathlib import Path
import sys
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from keying import components
import sprite_edges

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/fx/chai_puddle.png'
OUT = ROOT / 'assets/stages/night_train/rebuild'
R = 20                      # spawnZone('chai', ..., 20, ...)
CW, CH, AY = 112, 100, 80    # puddle cell and anchor (body centre / floor line) at 2x
SW, SH = 36, 64             # steam cell
STEAM_K = .72               # steam relative to the puddle scale


def cells(a):
    h, w = a.shape[:2]; groups = {}
    for part in components(a[:, :, 3] > 0):
        if len(part) < 12:
            continue
        cy, cx = part.mean(0)
        groups.setdefault((min(3, int(cy // (h / 4))), min(5, int(cx // (w / 6)))), []).append(part)
    out = {}
    for key, parts in groups.items():
        c = np.zeros_like(a)
        for p in parts:
            c[p[:, 0], p[:, 1]] = a[p[:, 0], p[:, 1]]
        body = max(parts, key=len)
        out[key] = (c, body)
    return out


def scaled(c, k):
    im = Image.fromarray(c); box = im.getbbox(); im = im.crop(box)
    im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
    return im, box


def main():
    a = np.array(sprite_edges.alpha(Image.open(SRC)))
    cs = cells(a)
    body0 = cs[(1, 0)][1]; k = 4 * R / (body0[:, 1].max() - body0[:, 1].min() + 1)
    sheet = Image.new('RGBA', (CW * 6, CH * 3)); half = []
    for row in range(3):
        for col in range(6):
            c, body = cs[(row, col)]
            im, box = scaled(c, k)
            bx0, bx1 = body[:, 1].min(), body[:, 1].max(); by1 = body[:, 0].max()
            # the settled body's depth, so splash frames stand on the same floor line
            by0 = body[:, 0].min() if row else by1 - (body0[:, 0].max() - body0[:, 0].min())
            cx = ((bx0 + bx1) / 2 - box[0]) * k; cy = ((by0 + by1) / 2 - box[1]) * k
            x, y = round(col * CW + CW / 2 - cx), round(row * CH + AY - cy)
            layer = Image.new('RGBA', sheet.size); layer.alpha_composite(im, (x, y))
            layer = layer.crop((col * CW, row * CH, (col + 1) * CW, (row + 1) * CH))
            q = np.array(layer); q[:, :, 3] = np.where(q[:, :, 3] >= 110, 255, 0)
            q = sprite_edges.tone(q, gamma=1.22, knee=.62, comp=.8, sat=1.08)   # sit in the carriage's lamp-lit shade
            sheet.alpha_composite(sprite_edges.edges(Image.fromarray(q)), (col * CW, row * CH))
            half.append(round(float((bx1 - bx0 + 1) * k / 4), 1))
    sheet.save(OUT / 'chai_puddle.png')
    steam = Image.new('RGBA', (SW * 6, SH))
    for col in range(6):
        c, _ = cs[(3, col)]
        im, _ = scaled(c, k * STEAM_K)
        layer = Image.new('RGBA', (SW, SH)); layer.alpha_composite(im, ((SW - im.width) // 2, SH - im.height))
        q = np.array(layer); q[:, :, 3] = np.where(q[:, :, 3] >= 110, 255, 0)
        steam.alpha_composite(Image.fromarray(q), (col * SW, 0))   # soft vapour: no closed dark outline
    steam.save(OUT / 'chai_steam.png')
    print('scale', round(k, 3), 'body half-widths (logical px):', half)


if __name__ == '__main__':
    main()
