#!/usr/bin/env python3
"""CHAD identity check: does a CHAD frame or sheet read as the same character, drawn by the same hand, as the gold
standard (chad_sidle1-4, chad_idle_shades1-4, chad_swlk1-6, chad_victory)? See tmp/review/shera_rework/run2/chad_style.md.

  .venv/bin/python tools/verification/chad_identity_check.py FILE [--cell WxH] [--cells 0,2-5] [--scale S]
        [--standing all|none|0,3] [--gate colour|all] [--json]
  .venv/bin/python tools/verification/chad_identity_check.py --family india_arrival   (named sets, FAMILIES below)
  .venv/bin/python tools/verification/chad_identity_check.py --gold                  (gold baseline)
  .venv/bin/python tools/verification/chad_identity_check.py --selftest              (gold passes, India arrival fails)

--scale: cell px per 2x-gameplay px (2x-authored sheets drawn at .5 = 1; a sheet drawn at .25 = 2).
--standing: cells where CHAD stands upright; only those gate crown height and bulk.
--gate colour: palette/skin/hair/jeans/outline only (close-ups, portraits, cells with other actors baked in).
Per cell the figure is the largest opaque region holding jeans (plus detached bits inside its box); the head is anchored
on the shades (else the top of the figure over the hips). Metrics, in 2x gameplay px: crown height (hair top to sole),
bulk (figure area / crown^2), jeans area, median Lab of skin / hair (top 8 rows of the head) / jeans, skin highlight share
and shadow chroma, outline ring lightness, and mean Lab distance to the gold 48-colour palette. Exit 1 past LIMITS.
Frames drawn in the gold palette itself are gated on outline and geometry only; a family's median cell is gated too.
"""
import argparse, glob, json, sys
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'tools/production'))
from keying import components  # noqa: E402

GOLD = sorted(glob.glob(str(ROOT / 'assets/frames/chad_sidle[1-4].png'))) + \
    sorted(glob.glob(str(ROOT / 'assets/frames/chad_idle_shades[1-4].png'))) + \
    sorted(glob.glob(str(ROOT / 'assets/frames/chad_swlk[1-6].png'))) + [str(ROOT / 'assets/frames/chad_victory.png')]
# Gold standing frames (the walk dips 5-9 px mid-stride, so crown height is gated on these only).
GOLD_STANDING = [p for p in GOLD if 'swlk' not in p]

# Limits vs the gold medians (tuned: all 15 gold frames pass, every India arrival cell fails). Colour in Lab units.
LIMITS = dict(
    palette_de=3.0,       # mean distance of each figure pixel to the nearest gold palette colour (gold 0, GPT ~5)
    skin_dL=7.0, skin_dC=5.0, skin_dh=4.0,     # skin median
    skin_hi=0.11,         # min share of skin at L>=75 (gold .15-.21: pale peach highlights; GPT oranges .05-.12)
    skin_shadow_dC=4.0,   # skin shadow (L<40) chroma vs gold 41.8: brown, not orange-red
    hair_dL=6.0, hair_dC=6.0, hair_dh=4.0,     # top-of-head hair median (gold 76/42/71: pale ash; GPT golden h 76-86)
    jeans_dL=7.0, jeans_dC=5.0, jeans_dh=4.0,  # gold 21/26/274; GPT jeans brighter, more saturated, purpler
    outline_L=(-6.0, 8.0),  # outer ring mean L vs gold 15.5: dark brown sel-out, not black ink (GPT ~4) nor washed out
    crown=0.05,           # standing cells: hair-top-to-sole within 5 % of gold 178 px (2x)
    bulk=(0.75, 1.22),    # standing cells: figure area / crown^2 within this ratio of gold (.21)
    jeans_area=(0.6, 1.32),
)

FAMILIES = {
    # name: file, cell (w,h), scale, standing cells ('all'|'none'|list), gate
    'gold': dict(files=GOLD, standing=[i for i, p in enumerate(GOLD) if 'swlk' not in p]),
    # Standing = no fist above the head (crown and bulk are measured from the hair top).
    'india_arrival': dict(files=['assets/travel/india/chad_redirect.png'], cell=(320, 256), standing=[0, 1, 2, 12, 14]),
    'india_arrival_after': dict(files=['assets/travel/india/chad_redirect_after.png'], cell=(224, 256), standing='all'),
}


def lab(rgb):
    c = np.asarray(rgb, float) / 255.
    c = np.where(c > .04045, ((c + .055) / 1.055) ** 2.4, c / 12.92)
    xyz = c @ np.array([[.4124, .3576, .1805], [.2126, .7152, .0722], [.0193, .1192, .9505]]).T / np.array([.95047, 1., 1.08883])
    f = np.where(xyz > .008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def lch(L):
    return L[..., 0], np.hypot(L[..., 1], L[..., 2]), np.degrees(np.arctan2(L[..., 2], L[..., 1])) % 360


def classes(Lab):
    """Masks over figure pixels: skin ramp (incl. highlights), jeans blues, dark ink."""
    L, C, h = lch(Lab)
    skin = (h >= 38) & (h < 85) & (C >= 25) & (L >= 15)
    jeans = (h >= 235) & (h < 310) & (C >= 12) & (L >= 3)
    return dict(skin=skin, jeans=jeans, dark=L < 16)


_GOLD_PAL = None


def gold_palette():
    global _GOLD_PAL
    if _GOLD_PAL is None:
        cols = set()
        for p in GOLD:
            a = np.array(Image.open(p).convert('RGBA')); cols |= set(map(tuple, a[a[..., 3] > 127][:, :3]))
        _GOLD_PAL = lab(np.array(sorted(cols), float))
    return _GOLD_PAL


def figure(a):
    """Mask of the CHAD figure in an RGBA cell: largest opaque region with jeans + detached bits inside its box."""
    solid = a[..., 3] > 127
    if not solid.any():
        return None
    parts = [p for p in components(solid) if len(p) >= 30]
    if not parts:
        return None
    Lab = lab(a[..., :3]); L, C, h = lch(Lab); jeans = (h >= 235) & (h < 310) & (C >= 12) & (L >= 3)
    main = max(parts[:6], key=lambda p: (jeans[p[:, 0], p[:, 1]].sum() > 50, len(p)))
    y0, x0 = main.min(0) - 6; y1, x1 = main.max(0) + 6
    m = np.zeros(solid.shape, bool); m[main[:, 0], main[:, 1]] = True
    for p in parts:
        if p is not main and ((p[:, 0] >= y0) & (p[:, 0] <= y1) & (p[:, 1] >= x0) & (p[:, 1] <= x1)).all():
            m[p[:, 0], p[:, 1]] = True
    return m


def ring(m):
    s = np.pad(m, 1)
    inner = s[1:-1, 1:-1] & s[:-2, 1:-1] & s[2:, 1:-1] & s[1:-1, :-2] & s[1:-1, 2:]
    return m & ~inner


def _grow(m, r=1):
    o = m.copy()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            o |= np.roll(np.roll(m, dy, 0), dx, 1)
    return o


def shades(a, m, s=1.):
    """(y, x) centre of the sunglasses: a compact near-black blob, mostly inside the silhouette, ringed by face tones."""
    L, C, h = lch(lab(a[..., :3])); ys, xs = np.nonzero(m); top = ys.min(); H = ys.max() - top + 1
    dark = m & (L < 13); dark[int(top + .38 * H):] = False
    edge = ring(m); edge |= ring(m & ~edge)
    warm = m & (L >= 30) & (h >= 35) & (h < 115) & (C >= 15)
    best = None
    for p in components(dark):
        n = len(p); hh = np.ptp(p[:, 0]) + 1; ww = np.ptp(p[:, 1]) + 1
        if not (6 * s * s <= n <= 160 * s * s and 4 * s <= ww <= 30 * s and hh <= 10 * s and ww >= 1.2 * hh):
            continue
        if edge[p[:, 0], p[:, 1]].mean() > .5:
            continue
        pm = np.zeros_like(m); pm[p[:, 0], p[:, 1]] = True; rg = _grow(pm, 2) & ~pm & m
        f = warm[rg].mean() if rg.any() else 0
        if f >= .45 and (best is None or f > best[0]):
            best = (f, p)
    return None if best is None else best[1].mean(0)


def measure(a, scale=1.):
    """Metrics for one RGBA cell (numpy HxWx4)."""
    m = figure(a)
    if m is None or m.sum() < 400 * scale * scale:
        return None
    ys, xs = np.nonzero(m); bottom = ys.max(); top = ys.min(); H = bottom - top + 1
    LabI = lab(a[..., :3]); Li, Ci, hi = lch(LabI)
    Lab = LabI[m]; L, C, h = lch(Lab)
    out = dict(px=int(m.sum()))
    # Head: anchored on the shades when found (raised fists), else the top of the figure.
    sh = shades(a, m, scale); out['shades'] = sh is not None
    cols = np.zeros(m.shape[1], bool)
    if sh is not None:
        cols[max(0, int(sh[1] - 22 * scale)):int(sh[1] + 22 * scale)] = True
        above = m[:int(sh[0])] & cols[None]
        crown_top = int(np.nonzero(above.any(1))[0].min()) if above.any() else top
        out['head_h'] = round((sh[0] - crown_top) / scale, 1)
    else:
        # No shades found: the head is the topmost part within 16 px (2x) of the hips' centre line.
        jm = m & (hi >= 235) & (hi < 310) & (Ci >= 12)
        cx = int(np.median(np.nonzero(jm)[1])) if jm.sum() > 25 else int(np.median(xs))
        cols[max(0, cx - int(16 * scale)):cx + int(16 * scale)] = True
        near = m & cols[None]; crown_top = int(np.nonzero(near.any(1))[0].min()) if near.any() else top
        cols[:] = False; tc = np.nonzero(m[crown_top:crown_top + int(3 * scale) + 1].any(0) & (np.abs(np.arange(m.shape[1]) - cx) <= 16 * scale))[0]
        cols[max(0, tc.min() - int(12 * scale)):tc.max() + int(12 * scale) + 1] = True
        out['head_h'] = None
    crown = (bottom - crown_top + 1) / scale
    out['crown'] = round(crown, 1)
    # Hair: warm light pixels in the top 8 (2x) rows of the head.
    win = np.zeros(m.shape, bool); win[crown_top:crown_top + int(8 * scale)] = True; win &= m & cols[None]
    hair = win & (Li >= 45) & (hi >= 40) & (hi < 120)
    out['hair_w'] = round(float(win.sum(1).max()) / scale, 1) if win.any() else None
    out['hair'] = [round(float(np.median(v[hair])), 1) for v in (Li, Ci, hi)] if hair.sum() >= 12 * scale * scale else None
    # Bulk: figure area / crown^2 (pose-robust: arms folded or out change it little; wide GPT builds raise it).
    out['bulk'] = round(float(m.sum()) / (crown * scale) ** 2, 3)
    cl = classes(Lab)
    skin = cl['skin'] & ~hair[m]
    if skin.sum() >= 25:
        out['skin'] = [round(float(np.median(v[skin])), 1) for v in (L, C, h)]
        out['skin_hi'] = round(float((L[skin] >= 75).mean()), 3)
        sd = skin & (L < 40); out['skin_shadow_C'] = round(float(np.median(C[sd])), 1) if sd.sum() >= 10 else None
    else:
        out['skin'] = out['skin_hi'] = out['skin_shadow_C'] = None
    j = cl['jeans']
    out['jeans'] = [round(float(np.median(v[j])), 1) for v in (L, C, h)] if j.sum() >= 25 else None
    out['jeans_area'] = round(float(j.sum()) / (crown * scale) ** 2, 3)
    r = ring(m); out['outline_L'] = round(float(Li[r].mean()), 1)
    pal = gold_palette(); d = np.sqrt(((Lab[:, None, :] - pal[None]) ** 2).sum(-1)).min(1)
    out['palette_de'] = round(float(d.mean()), 2)
    out['colours'] = int(len(np.unique(a[..., :3][m].reshape(-1, 3), axis=0)))
    return out


_GOLD_REF = None


def gold_ref():
    """Median gold metrics (crown and bulk from the standing frames only)."""
    global _GOLD_REF
    if _GOLD_REF is None:
        ms = [(p, measure(np.array(Image.open(p).convert('RGBA')))) for p in GOLD]
        st = [m for p, m in ms if p in GOLD_STANDING]
        med = lambda vals: round(float(np.median([v for v in vals if v is not None])), 3)
        ref = {k: [med([m[k][i] for _, m in ms if m[k]]) for i in range(3)] for k in ('skin', 'hair', 'jeans')}
        for k in ('outline_L', 'skin_hi', 'skin_shadow_C', 'hair_w'):
            ref[k] = med([m[k] for _, m in ms])
        for k in ('crown', 'bulk', 'jeans_area'):
            ref[k] = med([m[k] for m in st])
        _GOLD_REF = ref
    return _GOLD_REF


def dh(a, b):
    return abs((a - b + 180) % 360 - 180)


def judge(m, standing, gate='all'):
    """List of (metric, value, gold, limit) failures."""
    g = gold_ref(); bad = []
    add = lambda k, v, gv, lim: bad.append((k, v, gv, lim))
    if m['palette_de'] > LIMITS['palette_de']:
        add('palette_de', m['palette_de'], 0, LIMITS['palette_de'])
    for k in ('skin', 'hair', 'jeans'):
        if m[k] is None:
            continue
        for i, n in enumerate('LCh'):
            lim = LIMITS[f'{k}_d{n}']; v = dh(m[k][i], g[k][i]) if n == 'h' else abs(m[k][i] - g[k][i])
            if v > lim:
                add(f'{k}_{n}', m[k][i], g[k][i], lim)
    if m['skin_hi'] is not None and m['skin_hi'] < LIMITS['skin_hi']:
        add('skin_hi', m['skin_hi'], g['skin_hi'], LIMITS['skin_hi'])
    if m['skin_shadow_C'] is not None and abs(m['skin_shadow_C'] - g['skin_shadow_C']) > LIMITS['skin_shadow_dC']:
        add('skin_shadow_C', m['skin_shadow_C'], g['skin_shadow_C'], LIMITS['skin_shadow_dC'])
    lo, hi = LIMITS['outline_L']; out_bad = not lo <= m['outline_L'] - g['outline_L'] <= hi
    if out_bad:
        add('outline_L', m['outline_L'], g['outline_L'], LIMITS['outline_L'])
    if m['palette_de'] <= .5:
        # Drawn in the gold palette itself: class medians only move with pose and lighting, so keep geometry only.
        bad = [b for b in bad if b[0] == 'outline_L']
    if gate == 'all' and standing:
        if abs(m['crown'] / g['crown'] - 1) > LIMITS['crown']:
            add('crown', m['crown'], g['crown'], LIMITS['crown'])
        for k in ('bulk', 'jeans_area'):
            lo, hi = LIMITS[k]; r = m[k] / g[k]
            if not lo <= r <= hi:
                add(k, m[k], g[k], LIMITS[k])
    return bad


def family_gate(results):
    """Colour gates on the family's median cell: catches families whose cells each scrape under a limit."""
    ms = [r['metrics'] for r in results]
    if len(ms) < 3 or np.median([m['palette_de'] for m in ms]) <= .5:
        return []  # too few cells, or drawn in the gold palette itself (original sprites; medians only track pose)
    med = {}
    for k in ('skin', 'hair', 'jeans'):
        v = [m[k] for m in ms if m[k]]
        med[k] = [float(np.median([x[i] for x in v])) for i in range(3)] if len(v) >= 3 else None
    for k in ('skin_hi', 'skin_shadow_C', 'outline_L'):
        v = [m[k] for m in ms if m[k] is not None]; med[k] = float(np.median(v)) if v else None
    med['palette_de'] = 99.
    return [b for b in judge(med | dict(crown=0, bulk=0, jeans_area=0), False, 'colour') if b[0] != 'palette_de']


def parse_list(s, n):
    if s in (None, 'all'):
        return list(range(n))
    if s == 'none':
        return []
    out = []
    for part in str(s).split(','):
        a, _, b = part.partition('-'); out += list(range(int(a), int(b or a) + 1))
    return out


def cells_of(path, cell):
    im = np.array(Image.open(ROOT / path if not Path(path).is_absolute() else path).convert('RGBA'))
    if not cell:
        return [im]
    w, h = cell
    return [im[r * h:(r + 1) * h, c * w:(c + 1) * w] for r in range(im.shape[0] // h) for c in range(im.shape[1] // w)]


def check(files, cell=None, scale=1., standing='all', gate='all', only=None, quiet=False):
    results = []; nfail = 0; k0 = 0
    for f in files:
        cs = cells_of(f, cell); idx = parse_list(only, len(cs)) if only is not None else range(len(cs))
        # Standing indices count across every cell of every file in the run (one cell per gold file).
        n = k0 + len(cs); st = {k - k0 for k in (set(standing) if isinstance(standing, list) else set(parse_list(standing, n)))}
        k0 = n
        for i in idx:
            m = measure(cs[i], scale)
            if m is None:
                continue
            bad = judge(m, i in st, gate); nfail += bool(bad)
            results.append(dict(file=str(f), cell=i, standing=i in st, metrics=m, fail=bad))
            if not quiet:
                tag = 'FAIL' if bad else 'ok  '
                print(f"{tag} {Path(f).name}[{i}] crown {m['crown']} bulk {m['bulk']} skin {m['skin']} hi {m['skin_hi']} "
                      f"hair {m['hair']} jeans {m['jeans']} outline {m['outline_L']} paletteDE {m['palette_de']} colours {m['colours']}")
                for b in bad:
                    print(f"       {b[0]}: {b[1]} vs gold {b[2]} (limit {b[3]})")
    fam = family_gate(results)
    if fam:
        nfail += 1
        if not quiet:
            print('FAIL family median: ' + '; '.join(f'{b[0]} {round(b[1], 1)} vs gold {b[2]}' for b in fam))
    return results, nfail


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('files', nargs='*'); ap.add_argument('--cell'); ap.add_argument('--cells'); ap.add_argument('--scale', type=float, default=1.)
    ap.add_argument('--standing', default='all'); ap.add_argument('--gate', default='all', choices=['all', 'colour'])
    ap.add_argument('--family', action='append'); ap.add_argument('--gold', action='store_true'); ap.add_argument('--json', action='store_true')
    ap.add_argument('--expect-fail', action='store_true', help='exit 0 only if every checked cell fails (tuning self-test)')
    ap.add_argument('--selftest', action='store_true', help='gold must pass and every India arrival cell must fail')
    a = ap.parse_args()
    if a.selftest:
        g, ng = check(GOLD, standing=FAMILIES['gold']['standing'], quiet=True)
        # Known-bad fixtures: the pre-rework India arrival sheets (copied before batch A replaces them).
        fx = ROOT / 'tmp/review/shera_rework/run2/chad_audit/fixtures'
        files = lambda f: [str(fx / Path(p).name) if (fx / Path(p).name).exists() else p for p in FAMILIES[f]['files']]
        bad = [check(**{k: v for k, v in FAMILIES[f].items() if k != 'files'}, files=files(f), quiet=True)[0] for f in ('india_arrival', 'india_arrival_after')]
        ok = ng == 0 and all(r['fail'] for rs in bad for r in rs)
        print(f"selftest: gold {len(g) - ng}/{len(g)} pass, India arrival {sum(bool(r['fail']) for rs in bad for r in rs)}/{sum(map(len, bad))} fail -> {'OK' if ok else 'BROKEN'}")
        sys.exit(0 if ok else 1)
    runs = []
    if a.gold:
        print('gold reference:', json.dumps(gold_ref())); runs.append(dict(FAMILIES['gold']))
    for name in a.family or []:
        runs.append(dict(FAMILIES[name]))
    if a.files:
        runs.append(dict(files=a.files, cell=tuple(map(int, a.cell.split('x'))) if a.cell else None, scale=a.scale,
                         standing=a.standing, gate=a.gate, only=a.cells))
    allres = []; total = 0
    for r in runs:
        res, n = check(r['files'], r.get('cell'), r.get('scale', 1.), r.get('standing', 'all'), r.get('gate', 'all'),
                       r.get('only'), quiet=a.json)
        allres += res; total += n
    if a.json:
        print(json.dumps(dict(gold=gold_ref(), limits=LIMITS, results=allres), indent=1))
    print(f'{total} failures (cells + family medians) over {len(allres)} cells', file=sys.stderr)
    if a.expect_fail:
        sys.exit(0 if allres and all(r['fail'] for r in allres) else 1)
    sys.exit(1 if total else 0)


if __name__ == '__main__':
    main()
