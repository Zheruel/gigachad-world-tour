"""Cut the front plane out of the intact curry/chai stall pair (stalls.png cell 0) into stall_front.png.

The ghee intro draws the stall workers behind this layer: the awning and its fringe, the pots on
the counter top and the counter itself pass in front of them. Shapes are traced in source pixels
of the 560x373 cell. Goods hanging inside the stalls stay behind the workers (the garlic string
hangs where the curry cook's face is).
"""
from pathlib import Path
from PIL import Image, ImageDraw
import numpy as np

R = Path(__file__).resolve().parents[2]
D = R / 'assets/stages/dirty_delhi/rampage'
COUNTER = 248  # the counter front: every row from here down is in front
ELLIPSES = [  # (x0, y0, x1, y1, top row): pots, bowls and plates standing on the counter top
    (81, 216, 179, 236, 226),  # curry: kadai, near rim only (the cook reaches over the far rim)
    (178, 235, 211, 252, 0),  # curry: steel bowl
    (204, 226, 263, 253, 0),  # curry: pakora plate
]
BOXES = [  # (x0, y0, x1, y1): upright pots and the kadai's bowl under its rim
    (86, 226, 174, 250),   # curry: kadai bowl
    (49, 217, 79, 250),    # curry: stock pot
    (180, 218, 196, 238),  # curry: steel cup
    (265, 226, 283, 250),  # curry: small pots
    (281, 140, 293, 250),  # the middle post
    (305, 222, 352, 250),  # chai: steel canisters
    (374, 227, 401, 250),  # chai: pan of sweets
    (402, 214, 441, 250),  # chai: laddoo jar
    (403, 210, 439, 216),  # chai: jar lid
    (440, 228, 456, 250),  # chai: tin
    (455, 178, 511, 250),  # chai: samovar
    (451, 205, 516, 230),  # chai: samovar handles and tap
]
POUR = (332, 392)  # source columns of the chai man's raised kettle (he stands at x 346 in the intro)
AWNING = 150  # rows above this are awning cloth and beam; its fringe hangs lower, found by colour


def lum(a):
    return a[:, :, 0] * .3 + a[:, :, 1] * .59 + a[:, :, 2] * .11


def main():
    im = Image.open(D / 'stalls.png').convert('RGBA')
    cell = np.array(im.crop((0, 0, im.width // 3, im.height // 2))).astype(int)
    h, w = cell.shape[:2]
    alpha = cell[:, :, 3] > 0
    L = lum(cell)
    front = np.zeros((h, w), bool)
    front[COUNTER:] = True
    front[:AWNING] = True
    # The fringe: saturated, bright cloth below the awning line, down to its lowest tips.
    r, g, b = cell[:, :, 0], cell[:, :, 1], cell[:, :, 2]
    sat = np.max(cell[:, :, :3], 2) - np.min(cell[:, :, :3], 2)
    fringe = np.zeros_like(front)
    fringe[AWNING:180] = ((sat > 60) & (L > 90) & ((r > b + 40) | (g > b + 30)))[AWNING:180]
    # Keep only fringe connected to the awning above it (column runs from the awning line down).
    for x in range(w):
        y = AWNING
        while y < 180 and (fringe[y, x] or fringe[y, max(0, x - 1)] or fringe[y, min(w - 1, x + 1)]):
            front[y, x] = True
            y += 1
    # The chai man's high pour lifts the kettle in front of the fringe teeth above him.
    front[AWNING:180, POUR[0]:POUR[1]] = False
    for x0, y0, x1, y1, top in ELLIPSES:
        e = Image.new('L', (w, h))
        ImageDraw.Draw(e).ellipse((x0, y0, x1, y1), fill=255)
        e = np.array(e) > 0
        e[:top] = False
        front |= e
    for x0, y0, x1, y1 in BOXES:
        front[y0:y1, x0:x1] = True
    front &= alpha
    out = cell.copy().astype(np.uint8)
    out[~front] = 0
    Image.fromarray(out).save(D / 'stall_front.png')
    print('front pixels', int(front.sum()), 'of', int(alpha.sum()))


if __name__ == '__main__':
    main()
