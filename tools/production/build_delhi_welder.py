#!/usr/bin/env python3
"""Keep the Delhi repairman's approved poses; register them over one fixed stool and crate."""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(Path(__file__).parent))
from sprite_edges import alpha, edges
from backdrop_tone import backdrop, plate_light
from build_delhi_life_market import poses, measure
from build_delhi_life_river import box_scale
from keying import components

SRC = ROOT / 'assets/sources/production/stages/dirty_delhi/market_life/elec.png'
OUT = ROOT / 'assets/stages/dirty_delhi/market_life'

# Masks follow the existing generated silhouettes, not the furniture's changing bounds.
# The furniture and fan stay fixed; only the repairman's gesture changes.
TOP = [215, 219, 221, 221, 225, 229, 238, 159]
SEAT = [206, 207, 208, 207, 213, 217, 226, 143]
HIP_LEFT = [23, 20, 26, 22, 23, 24, 31, 19]
LEG_LEFT = [43, 36, 38, 37, 31, 32, 46, 33]
LEGS = [
    [(43,208),(100,208),(101,262),(95,293),(96,309),(103,318),(103,332),(47,332),(47,318),(51,307),(56,299),(54,279),(43,270)],
    [(36,211),(92,211),(93,264),(88,295),(88,311),(98,320),(98,335),(39,335),(39,319),(45,309),(50,301),(47,281),(36,273)],
    [(38,212),(97,212),(99,265),(92,296),(93,311),(101,320),(101,335),(43,335),(43,320),(48,310),(54,301),(50,282),(38,274)],
    [(37,212),(94,212),(97,267),(90,296),(92,311),(99,320),(99,335),(41,335),(41,320),(47,310),(52,301),(48,282),(37,274)],
    [(31,218),(90,218),(92,270),(86,296),(87,312),(96,321),(96,336),(35,336),(35,321),(42,311),(48,302),(43,284),(31,278)],
    [(32,221),(89,221),(91,272),(86,298),(87,312),(96,321),(96,337),(35,337),(35,321),(42,311),(46,302),(43,285),(32,279)],
    [(46,225),(99,225),(105,263),(104,284),(95,306),(76,324),(57,322),(45,306),(44,286),(49,269)],
    [(33,147),(86,147),(89,185),(83,220),(80,238),(85,251),(85,266),(35,266),(35,250),(41,239),(47,231),(45,216),(41,200),(33,198)],
]
FAN_BASE = [
    [(177,213),(226,213),(235,232),(158,232),(167,220)],
    [(162,216),(219,216),(226,236),(150,236),(161,225)],
    [(177,219),(229,219),(236,239),(162,239),(168,225)],
    [(171,219),(225,219),(232,237),(155,237),(168,227)],
    [(160,221),(215,221),(226,242),(149,242),(159,229)],
    [(161,224),(214,224),(225,245),(151,245),(160,231)],
    [(166,233),(214,233),(221,250),(149,250),(159,239)],
    [(139,154),(190,154),(205,172),(124,172),(135,162)],
]
FAN_STAND = [
    [(184,170),(212,170),(213,205),(220,215),(235,223),(235,233),(157,233),(158,225),(177,211),(184,203)],
    [(174,175),(205,175),(207,211),(214,220),(227,229),(227,237),(149,237),(149,230),(165,218),(173,209)],
    [(185,177),(214,177),(215,212),(222,222),(237,231),(237,240),(161,240),(161,232),(177,220),(184,211)],
    [(181,177),(211,177),(213,212),(221,222),(233,230),(233,238),(154,238),(155,230),(172,219),(180,210)],
    [(176,184),(201,184),(203,217),(213,229),(226,234),(227,243),(148,243),(150,234),(167,224),(175,215)],
    [(175,184),(203,184),(205,220),(214,231),(226,238),(226,246),(150,246),(151,237),(169,226),(176,217)],
    [(177,185),(204,185),(205,226),(214,237),(222,242),(222,251),(148,251),(150,242),(165,233),(176,226)],
    [(158,117),(183,117),(185,150),(194,159),(206,165),(206,173),(123,173),(125,165),(142,154),(155,147)],
]
FAN_HEAD = [
    [(182,98),(196,97),(207,100),(218,109),(224,120),(229,132),(228,146),(222,158),(210,170),(191,178),(178,170),(173,163),(163,159),(158,150),(155,140),(156,130),(160,121),(169,116),(173,108)],
    [(181,102),(195,101),(209,107),(216,119),(219,138),(218,156),(207,173),(188,184),(169,172),(155,158),(151,143),(152,127),(161,116),(170,105)],
    [(187,102),(204,103),(218,111),(228,124),(233,139),(230,156),(220,171),(201,184),(184,179),(174,168),(165,161),(162,147),(164,132),(173,121),(180,113)],
    [(177,103),(195,101),(209,108),(218,122),(222,137),(220,154),(210,171),(190,180),(174,174),(166,164),(158,153),(155,139),(160,124),(168,115)],
    [(164,99),(188,99),(206,110),(218,127),(221,147),(215,170),(201,185),(181,191),(158,183),(144,167),(138,145),(140,124),(149,109)],
    [(172,116),(190,113),(204,120),(213,134),(214,153),(207,172),(191,187),(173,193),(156,183),(148,168),(146,151),(151,134),(160,125)],
    [(173,109),(190,109),(202,116),(211,130),(215,145),(210,166),(199,181),(179,193),(161,183),(151,170),(144,155),(144,140),(153,125),(162,116)],
    [(149,45),(169,44),(187,51),(198,64),(202,81),(198,98),(188,113),(169,125),(150,118),(136,107),(125,96),(120,81),(125,65),(137,54)],
]


def polygon(shape, points):
    im = Image.new('1', (shape[1], shape[0]))
    ImageDraw.Draw(im).polygon(points, fill=1)
    return np.array(im)


def clean_parts(c):
    """This sheet has intentional separate parts touching its edges, unlike grid slivers."""
    mask = np.zeros(c.shape[:2], bool)
    for part in components(c[:, :, 3] > 0):
        if len(part) >= 30:
            mask[part[:, 0], part[:, 1]] = True
    c = c.copy()
    c[~mask] = 0
    return c


def source_cells():
    a = np.array(alpha(Image.open(SRC)))
    ss = poses(a, 8)
    raw = []
    for lo, hi in ss:
        c = a[:, lo:hi].copy()
        ys, xs = np.where(c[:, :, 3] > 0)
        raw.append(c[ys.min():ys.max()+1, xs.min():xs.max()+1])
    # Preserve the approved idle's size and its original world anchor.
    ax, top, sole = measure(a, ss[0], (.9, 1.))
    ys, xs = np.where(a[:, ss[0][0]:ss[0][1], 3] > 0)
    return raw, ax - ss[0][0] - xs.min(), 112 / (sole - top)


def separate(c, i):
    h, w = c.shape[:2]
    im = Image.new('1', (w, h))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, w, TOP[i]), fill=1)
    d.polygon(LEGS[i], fill=1)
    d.polygon(FAN_BASE[i], fill=1)
    keep = np.array(im)
    r, g, b = c[:, :, :3].astype(float).transpose(2, 0, 1)
    y, x = np.indices((h, w))
    # Keep the trousers' folds behind the front shin, including their dark blue outline.
    blue = (b > r * 1.1) & (b > g * .96) & (c[:, :, 3] > 0) & (y >= SEAT[i] - 12)
    keep |= blue
    keep[polygon((h, w), FAN_STAND[i]) & ~blue] = False
    keep[polygon((h, w), FAN_HEAD[i])] = False
    if i == 4:
        # His pointing fingertips lie in front of the guard in this approved pose.
        hand = polygon((h, w), [(116,99),(139,99),(158,107),(166,115),(162,126),(150,119),(133,123),(116,117)])
        keep |= hand & (r > g*1.15) & (r > b*1.5) & (c[:, :, 3] > 0)
    wood = (r > b * 1.12) & (r > g * 1.07) & ((r*.3+g*.59+b*.11) < 135)
    wood &= (y >= SEAT[i]) & (x < LEG_LEFT[i] + 7) & (y < SEAT[i] + 100)
    if i == 6:  # the alarm pose lifts its sandal, showing the sole rather than a stool leg
        wood &= ~((y >= 252) & (x >= 47))
    keep[wood] = False
    keep[(x < HIP_LEFT[i]) & (y >= SEAT[i])] = False
    actor = c.copy()
    actor[~keep] = 0
    actor = clean_parts(actor)
    return actor


def build():
    raw, anchor_x, s = source_cells()
    actors = [separate(c, i) for i, c in enumerate(raw)]
    furniture = raw[0].copy()
    furniture[actors[0][:, :, 3] > 0] = 0
    y, x = np.indices(furniture.shape[:2])
    fan = polygon(furniture.shape[:2], FAN_STAND[0]) | polygon(furniture.shape[:2], FAN_HEAD[0])
    furniture[(y < SEAT[0]) & ~fan] = 0
    furniture[(x > 53) & (x < 103)] = 0
    # Both pieces are deliberate; the stool touches this source cell's left border.
    # The generic neighbour-sliver cleaner would incorrectly delete it.
    furniture = clean_parts(furniture)

    # Grounded work/cower poses use the same front sandal sole. Alarm pose 6 lifts that
    # foot, so register its hip on the fixed seat rather than snapping its raised sole down.
    base = np.where(actors[0][:, :, 3] > 0)[0].max()
    shifts = []
    for i, c in enumerate(actors):
        dy = SEAT[0] - SEAT[i] if i == 6 else base - np.where(c[:, :, 3] > 0)[0].max()
        shifts.append((HIP_LEFT[0] - HIP_LEFT[i], dy))
    groups = list(zip(actors, shifts)) + [(furniture, (0, 0))]
    bounds = []
    for c, (dx, dy) in groups:
        yy, xx = np.where(c[:, :, 3] > 0)
        bounds.append((xx.min()+dx, yy.min()+dy, xx.max()+dx+1, yy.max()+dy+1))
    left = min(v[0] for v in bounds)
    right = max(v[2] for v in bounds)
    top = min(v[1] for v in bounds)
    bottom = max(v[3] for v in bounds)
    cw = int(np.ceil(max(anchor_x-left, right-anchor_x) * s))*2 + 4
    cw += cw % 4
    ch = int(np.ceil((base-top+1)*s)) + 6
    ch += ch % 2
    light = plate_light(ROOT / 'assets/stages/dirty_delhi/rebuild/bazaar.png', (800,200,1000,400))[0]
    cells = []
    for c, (dx, dy) in groups:
        canvas = np.zeros((bottom-top, right-left, 4), np.uint8)
        yy, xx = np.where(c[:, :, 3] > 0)
        canvas[yy+dy-top, xx+dx-left] = c[yy, xx]
        scaled = box_scale(canvas, s)
        frame = Image.new('RGBA', (cw, ch))
        ox = round(cw/2 - (anchor_x-left)*s)
        oy = round(ch-2 - (base-top+1)*s)
        frame.alpha_composite(Image.fromarray(scaled), (ox, oy))
        cells.append(backdrop(edges(frame), light, level=.72, cast=.3))
    sheet = Image.new('RGBA', (cw*8, ch))
    for i, c in enumerate(cells[:8]):
        sheet.alpha_composite(c, (i*cw, 0))
    OUT.mkdir(parents=True, exist_ok=True)
    sheet.save(OUT / 'elec.png', optimize=True)
    cells[8].save(OUT / 'elec_props.png', optimize=True)
    weld = raw[2][:, :, :3].astype(float)
    score = weld[:, :, 0] + weld[:, :, 1]
    score[:100] = 0; score[175:] = 0; score[:, :140] = 0
    sy, sx = np.unravel_index(np.argmax(score), score.shape)
    dx, dy = shifts[2]
    spark = ((sx+dx-anchor_x)*s/2, (sy+dy-base-1)*s/2-1)
    print(f'elec: 8 poses + fixed stool/crate, cell {cw}x{ch} (2x px); spark {spark[0]:.2f},{spark[1]:.2f}')
    return cells, (cw, ch), spark


if __name__ == '__main__':
    build()
