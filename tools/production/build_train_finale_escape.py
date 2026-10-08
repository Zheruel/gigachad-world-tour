"""Night Train escape finale: CHAD cells at gameplay scale, Netaji's blast set and the escape FX sheets.

Sources (selected GPT Image strips, true alpha hardened by gen_image.sh) live in
assets/sources/production/stages/night_train/rebuild/escape/. CHAD cells follow run2/chad_style.md:
scale (crown 178 on the standing strips, matched head size on the others), threshold, register, edges(),
then chad_palette.lock(). Gold gameplay frames (getup, jump, jumpfall, idle_cigar) are pasted pixel for pixel.

  .venv/bin/python tools/production/build_train_finale_escape.py [--review]

Outputs (assets/stages/night_train/rebuild/): finale_chad.png (CW x CH cells, COLS per row, sole at SOLE,
torso or body centre at CX), finale_neta_blast.png (400x300 cells, nr_neta registration), finale_blast.png,
finale_fire.png, finale_debris.png, finale_dust.png, finale_notes.png. Cell order is the CELLS / NETA lists;
js/train_finale.js mirrors the names.
"""
import sys
from pathlib import Path
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from strip_cells import cells  # noqa: E402
import sprite_edges  # noqa: E402
import chad_palette  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]
SRC = ROOT / 'assets/sources/production/stages/night_train/rebuild/escape'
OUT = ROOT / 'assets/stages/night_train/rebuild'
FRAMES = ROOT / 'assets/frames'
CW, CH, COLS, SOLE, CX = 240, 224, 8, 214, 120

# Strip -> (cell count, GPT px -> 2x gameplay px, width factor). Standing strips are set by crown 178; the others
# by the same crown-to-shades head size (about 14.5 px at 2x) so every cell shares one head scale. The width
# factor trims GPT's broader build toward gold's blocky bulk (0.21; chad_identity_check gates 0.75-1.22x).
STRIPS = {'react': (4, .271, .92), 'remote': (4, .229, .95), 'sprint': (6, .294, 1), 'jumpland': (4, .30, 1),
          'roll': (4, .294, 1), 'strut': (8, None, .95)}
# Atlas order: (name, source, index, anchor). anchor 'torso' centres the upper 42 % of the body, 'box' the bbox.
CELLS = [
    ('breath_a', 'react', 0, 'torso'), ('breath_b', 'react', 1, 'torso'), ('brace', 'react', 2, 'torso'),
    ('glance', 'react', 3, 'torso'), ('kneel', 'gold:chad_getup', 0, 'torso'), ('push', 'jumpland', 0, 'torso'),
    *[(f'sprint_{i}', 'sprint', i, 'torso') for i in range(6)],
    ('takeoff', 'jumpland', 1, 'torso'), ('hurdle', 'gold:chad_jump', 0, 'box'), ('drop', 'gold:chad_jumpfall', 0, 'box'),
    ('land', 'jumpland', 2, 'torso'), ('roll_in', 'jumpland', 3, 'box'), ('roll_a', 'roll', 0, 'box'),
    ('roll_b', 'roll', 1, 'box'), ('roll_exit', 'roll', 2, 'torso'), ('half_rise', 'roll', 3, 'torso'),
    ('remote_idle', 'remote', 0, 'torso'), ('raise', 'remote', 1, 'torso'), ('press', 'remote', 2, 'torso'),
    ('look_away', 'remote', 3, 'torso'),
    *[(f'cigar_{i}', f'gold:chad_idle_cigar{i + 1}', 0, 'torso') for i in range(6)],
    *[(f'strut_{i}', 'strut', i, 'torso') for i in range(8)],
]
# Netaji only stirs and is engulfed here; blast 1 then tears him apart (assets/fx/fragments/nr_neta.png).
NETA = [('stir', 'neta_blast', 0), ('engulf', 'neta_blast', 1)]
NETA_SCALE = {'neta_blast': .37}


def shrink(c, s, sx=1.):
    """Downsample a true-alpha GPT cell (premultiplied by Pillow), then binary alpha at 128."""
    c = c.resize((max(1, round(c.width * s * sx)), max(1, round(c.height * s))), Image.Resampling.LANCZOS)
    a = np.array(c); a[..., 3] = np.where(a[..., 3] >= 128, 255, 0); a[a[..., 3] == 0, :3] = 0
    return Image.fromarray(a)


def anchor_x(c, mode):
    a = np.array(c)[..., 3] > 127; ys, xs = np.nonzero(a)
    if mode == 'box':
        return (xs.min() + xs.max() + 1) / 2
    top, h = ys.min(), ys.max() - ys.min() + 1; band = a[top:top + int(h * .42)]
    return float(np.nonzero(band)[1].mean())


def place(c, mode, w=CW, h=CH, sole=SOLE, cx=CX):
    c = c.crop(c.getbbox()); f = Image.new('RGBA', (w, h))
    x, y = round(cx - anchor_x(c, mode)), sole - c.height
    assert x >= 0 and y >= 0 and x + c.width <= w, (c.size, x, y)
    f.alpha_composite(c, (x, y)); return f


def strut_scale(strip):
    """Strut cells: crown of the median-height cell = gold walk median (swlk 169-173)."""
    return 171 / np.median([c.height for c in strip])


def chad():
    strips = {}
    for k, (n, s, sx) in STRIPS.items():
        if not (SRC / f'chad_{k}.png').exists():
            print('missing', k); continue
        raw = cells(Image.open(SRC / f'chad_{k}.png'), n)
        s = s or strut_scale(raw)
        strips[k] = [shrink(c, s, sx) for c in raw]
    out = []
    for name, src, i, mode in CELLS:
        if src not in strips and not src.startswith('gold:'):
            src = 'gold:chad_idle_cigar6'  # placeholder until the strip exists
        if src.startswith('gold:'):
            f = place(Image.open(FRAMES / (src[5:] + '.png')).convert('RGBA'), mode)
        else:
            f = place(strips[src][i], mode)
            f = chad_palette.lock(sprite_edges.edges(f))
        out.append(f)
    return out


def sheet(frames, cols=None):
    w, h = frames[0].size; cols = cols or len(frames); rows = -(-len(frames) // cols)
    s = Image.new('RGBA', (w * cols, h * rows))
    for i, f in enumerate(frames):
        s.paste(f, ((i % cols) * w, (i // cols) * h))
    return s


def neta():
    """400x300 cells like nr_neta: lying and landing poses sit on the sole line 293, airborne poses are centred
    on the body at (200, 175) so the code can spin them about that point."""
    strips = {k: cells(Image.open(SRC / f'{k}.png'), 5 if k == 'neta_blast' else 4) for k in NETA_SCALE}
    out = []
    for name, src, i in NETA:
        c = shrink(strips[src][i], NETA_SCALE[src])
        if name == 'stir':  # match the roof ko frame (head right) so the stir does not flip him
            c = c.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
        c = sprite_edges.edges(c, look='nr_neta')
        c = c.crop(c.getbbox())
        f = Image.new('RGBA', (400, 300))
        if name == 'engulf':
            f.alpha_composite(c, (round(200 - c.width / 2), round(175 - c.height / 2)))
        else:
            f.alpha_composite(c, (round(200 - c.width / 2), 293 - c.height))
        out.append(f)
    return out


def fx(name, n, s, w, h, base, cx=None):
    """FX strip -> cells bottom-aligned at `base`, centred."""
    out = []
    for c in cells(Image.open(SRC / f'{name}.png'), n):
        c = shrink(c, s); c = c.crop(c.getbbox()) if c.getbbox() else c
        f = Image.new('RGBA', (w, h)); x = round((cx or w / 2) - c.width / 2)
        f.alpha_composite(c, (max(0, x), max(0, base - c.height))); out.append(f)
    return out


def main():
    ch = chad(); sheet(ch, COLS).save(OUT / 'finale_chad.png')
    sheet(neta()).save(OUT / 'finale_neta_blast.png')
    sheet(fx('fx_blast', 8, 1.0, 320, 320, 312)).save(OUT / 'finale_blast.png')
    sheet(fx('fx_fire', 8, .25, 64, 80, 78)).save(OUT / 'finale_fire.png')
    deb = cells(Image.open(SRC / 'fx_debris.png'), 10)
    chunks = [shrink(c, .14) for c in deb[:6]]; dust = [shrink(c, .3) for c in deb[6:]]
    sheet([place(c, 'box', 40, 40, 36, 20) for c in chunks]).save(OUT / 'finale_debris.png')
    sheet([place(c, 'box', 88, 80, 76, 44) for c in dust]).save(OUT / 'finale_dust.png')
    sheet(fx('fx_notes', 4, .05, 28, 28, 26)).save(OUT / 'finale_notes.png')
    print('cells', len(ch), 'names', ','.join(n for n, *_ in CELLS))


if __name__ == '__main__':
    main()
