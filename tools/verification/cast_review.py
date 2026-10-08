#!/usr/bin/env python3
"""Render actors at runtime scale for art review (mirrors js/aiframes.js placement).

  cast_review.py lineup  <state> <char...>   -> Chad idle + each char playing <state> pose 0
  cast_review.py strip   <char> [state...]   -> every pose of each state, CHAD idle at left
Output PNGs go to tmp/review/cast/ (2x logical pixels, nearest-neighbour)."""
import json, re, sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tmp/review/cast'
MAN = json.loads((ROOT / 'assets/frames/manifest.json').read_text())
RS = 2
HEIGHTS = {k: int(v) for k, v in re.findall(r'(\w+)\s*:\s*(\d+)', re.search(r'const HEIGHTS = \{(.*?)\};', (ROOT / 'js/aiframes.js').read_text(), re.S).group(1))}
PREBAKED = ('nr_', 'dl_', 'ic_')
BG = {'light': (236, 233, 223), 'dark': (32, 39, 48)}


def frame(char, state, i):
    """Return a runtime canvas (RS px per logical px) with feet 3 logical px above the bottom."""
    files = MAN.get(char, {}).get(state) or MAN[char]['idle']
    im = Image.open(ROOT / 'assets/frames' / files[i % len(files)]).convert('RGBA')
    if char.startswith(PREBAKED) or char == 'player' and state in ('boxing_rush', 'boxing_variety', 'super_barrage', 'super_electric', 'electric_finish'):
        return im
    th = HEIGHTS.get(char, 48) * RS
    w = max(1, round(im.width * th / im.height))
    im = im.resize((w, th), Image.NEAREST)
    a = im.getchannel('A').point(lambda v: 255 if v > 16 else 0)
    x0, y0, x1, y1 = a.getbbox()
    lower = a.crop((0, y0 + int((y1 - y0) * .4), w, y1))
    px = lower.load(); tot = n = 0
    for y in range(lower.height):
        for x in range(w):
            if px[x, y]: tot += x; n += 1
    ax = tot / max(1, n)
    half = int(max(ax - x0, x1 - ax)) + 1
    out = Image.new('RGBA', (max(64, half * 2 + 2), th))
    out.paste(im, (round(out.width / 2 - ax), round(th - 3 * RS - (y1 - 1))), im)
    return out


def place(canvas, im, x, ground):
    # js: blit(ctx, f, x - frameW/2, ground - frameH + 4); frame dims are logical = px / RS
    canvas.alpha_composite(im, (round(x * RS - im.width / 2), round((ground + 4) * RS - im.height)))


def render(cols, width, height=150, bg='light', labels=()):
    c = Image.new('RGBA', (width * RS, height * RS), BG[bg] + (255,))
    ground = height - 22
    d = ImageDraw.Draw(c)
    d.line((0, ground * RS + RS, c.width, ground * RS + RS), fill=(120, 150, 140, 255))
    for (im, x), lab in zip(cols, list(labels) + [''] * len(cols)):
        place(c, im, x, ground)
        if lab: d.text((x * RS - len(lab) * 3, (ground + 8) * RS), lab, fill=(90, 80, 70, 255))
    return c


def lineup(state, chars, bg='light'):
    keys = ['player'] + chars
    gap = 70
    cols = [(frame(k, 'idle' if k == 'player' else state, 0), 40 + i * gap) for i, k in enumerate(keys)]
    return render(cols, 80 + gap * (len(keys) - 1), bg=bg, labels=[k.replace('nr_', '') for k in keys])


def strip(char, states, bg='light'):
    rows = []
    for st in states:
        n = len(MAN[char].get(st, []))
        if not n: continue
        cols = [(frame('player', 'idle', 0), 40)] + [(frame(char, st, i), 130 + i * 90) for i in range(n)]
        rows.append(render(cols, 130 + 90 * n, bg=bg, labels=['CHAD'] + [f'{st} {i}' for i in range(n)]))
    W = max(r.width for r in rows); H = sum(r.height for r in rows)
    sheet = Image.new('RGBA', (W, H), BG[bg] + (255,)); y = 0
    for r in rows: sheet.alpha_composite(r, (0, y)); y += r.height
    return sheet


if __name__ == '__main__':
    OUT.mkdir(parents=True, exist_ok=True)
    mode, *args = sys.argv[1:]
    bg = 'dark' if '--dark' in args else 'light'; args = [a for a in args if a != '--dark']
    if mode == 'lineup':
        img = lineup(args[0], args[1:], bg); name = f'lineup_{args[0]}_{"_".join(a.replace("nr_", "") for a in args[1:])[:60]}'
    else:
        states = args[1:] or list(MAN[args[0]])
        img = strip(args[0], states, bg); name = f'strip_{args[0]}{"_" + "_".join(args[1:]) if args[1:] else ""}'[:90]
    path = OUT / f'{name}_{bg}.png'; img.save(path); print(path)
