"""Before/after review of the shared sprite edge pass (tools/production/sprite_edges.py).

Usage: sprite_edges_review.py BEFORE_DIR [set ...]
Set AFTER=DIR to review a sandbox build (DIR/frames, DIR/stage) instead of the live assets.
BEFORE_DIR holds copies of the frame folders (BEFORE_DIR/frames/<set>/) and, optionally, the boss props
(BEFORE_DIR/stage/<name>.png). Writes tmp/review/edges/<set>.png (1x rows and 4x edge crops, dark and light
backgrounds, before | after) plus report.json, and fails if a frame loses more than 2% of its opaque pixels,
moves its bounding box, changes colour deeper than 2 px inside (beyond its TONE pass), gains a hole or keeps soft alpha.
"""
import json
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'production'))
from sprite_edges import _depth, TONE, tone
from keying import components

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'tmp/review/edges'
import os
AFTER_FRAMES = Path(os.environ['AFTER']) / 'frames' if os.environ.get('AFTER') else ROOT / 'assets/frames'
AFTER_STAGE = Path(os.environ['AFTER']) / 'stage' if os.environ.get('AFTER') else ROOT / 'assets/stages/night_train/rebuild'
SETS = ['nr_brawler', 'nr_chai', 'nr_paan', 'nr_tte', 'nr_rack', 'nr_commando', 'nr_captain', 'nr_conductor', 'nr_neta', 'nr_neta_guard']
PROPS = ['conductor_intro', 'conductor_box', 'conductor_box_open', 'conductor_stamp', 'conductor_wad', 'conductor_hazards', 'neta_props', 'relic_neta']
DARK, LIGHT = (24, 24, 32, 255), (232, 226, 212, 255)
CHAD = ['chad_idle_flex1', 'chad_hurt', 'chad_dash1', 'chad_jump']


def rgba(p):
    return np.array(Image.open(p).convert('RGBA'))


def holes(s):
    """Enclosed transparent regions: air not reachable from the canvas border (4-connected)."""
    air = ~np.pad(s, 1); out = np.zeros_like(air); out[0] = out[-1] = True; out[:, 0] = out[:, -1] = True; out &= air
    while True:
        grow = out | (air & (np.roll(out, 1, 0) | np.roll(out, -1, 0) | np.roll(out, 1, 1) | np.roll(out, -1, 1)))
        if (grow == out).all():
            break
        out = grow
    return len(components(air & ~out))


def ring(a):
    """Outer-ring statistics: median luminance, share of light pixels, share tinted green/teal or blue/purple."""
    s = a[:, :, 3] > 0; e = s & (_depth(s, 2) == 1); c = a[:, :, :3][e].astype(float)
    r, g, b = c.T; lum = c @ [.3, .59, .11]
    return dict(lum=float(np.median(lum)), light=float((lum > 50).mean()), green=float(((g - (r + b) / 2 > 6) & (lum > 20)).mean()),
                blue=float(((b - (r + g) / 2 > 10) & (lum > 20)).mean()))


def audit(x, y, look=None):
    """look: a TONE set, whose interior is expected to equal the tone pass of the old one."""
    sx, sy = x[:, :, 3] > 0, y[:, :, 3] > 0
    deep = (_depth(sy, 3) >= 3) & (_depth(sx, 3) >= 3)   # inside the figure before and after
    return dict(opaque=float((sy.sum() - sx.sum()) / max(sx.sum(), 1) * 100), bbox=Image.fromarray(x).getbbox() == Image.fromarray(y).getbbox(),
                interior=int((deep & sx & ((tone(x, **TONE[look]) if look in TONE else x)[:, :, :3] != y[:, :, :3]).any(2)).sum()), new_holes=holes(sy) - holes(sx),
                binary=bool(np.isin(y[:, :, 3], (0, 255)).all()), recoloured=int((sy & sx & (x[:, :, :3] != y[:, :, :3]).any(2)).sum()))


def on(im, bg):
    t = Image.new('RGBA', im.size, bg); t.alpha_composite(im); return t


def crops(x, y, n=3, w=44):
    """The n windows with the most changed edge pixels (non-overlapping)."""
    ch = (x != y).any(2).astype(float); h, wd = ch.shape; w = min(w, h, wd)
    cs = np.pad(ch, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    best = []
    for _ in range(n):
        score = cs[w:, w:] - cs[:-w, w:] - cs[w:, :-w] + cs[:-w, :-w]
        for (by, bx) in best:
            score[max(0, by - w):by + w, max(0, bx - w):bx + w] = -1
        yy, xx = np.unravel_index(score.argmax(), score.shape)
        if score[yy, xx] <= 0:
            break
        best.append((yy, xx))
    return [(bx, by, bx + w, by + w) for by, bx in best]


def sheet(name, pairs, out):
    """pairs: [(label, before RGBA array, after RGBA array)]. Rows: 1x frames (before/after, dark/light), then 4x crops."""
    pad = 6; rows = []
    for label, x, y in pairs:
        bx, by = Image.fromarray(x), Image.fromarray(y); box = bx.getbbox() or (0, 0, 1, 1)
        box = (max(0, box[0] - 4), max(0, box[1] - 4), min(bx.width, box[2] + 4), min(bx.height, box[3] + 4))
        one = [on(im.crop(box), bg) for bg in (DARK, LIGHT) for im in (bx, by)]
        zoom = []
        for c in crops(x, y):
            zoom.append([on(im.crop(c), bg).resize(((c[2] - c[0]) * 4, (c[3] - c[1]) * 4), Image.NEAREST) for bg in (DARK, LIGHT) for im in (bx, by)])
        rows.append((label, one, zoom))
    W = max(sum(t.width + pad for t in one) + 4 * pad + sum(sum(t.width + pad for t in z) for z in zoom[:1]) for _, one, zoom in rows)
    W = max(W, 900)
    H = sum(max(one[0].height, max((z[0].height for z in zoom), default=0) * max(1, len(zoom)) + pad * len(zoom)) + 18 + pad for _, one, zoom in rows) + 24
    out_im = Image.new('RGBA', (W, H), (60, 60, 66, 255)); dr = ImageDraw.Draw(out_im)
    dr.text((pad, 4), f'{name}: each group = before | after on dark, then before | after on light. Left: 1x frame. Right: 4x crops of the most-changed edges.', fill=(255, 255, 255, 255))
    yy = 24
    for label, one, zoom in rows:
        dr.text((pad, yy), label, fill=(255, 230, 150, 255)); yy += 14; xx = pad
        for i, t in enumerate(one):
            out_im.paste(t, (xx, yy)); xx += t.width + (pad * 3 if i == 1 else 2)
        x0 = xx + pad * 3; zy = yy
        for z in zoom:
            zx = x0
            for i, t in enumerate(z):
                out_im.paste(t, (zx, zy)); zx += t.width + (pad * 3 if i == 1 else 2)
            zy += z[0].height + pad
        yy += max(one[0].height, zy - yy) + pad
    out_im.save(out)


def main(before, names):
    OUT.mkdir(parents=True, exist_ok=True); report = {'chad': {}}; fail = []
    for c in CHAD:
        report['chad'][c] = ring(rgba(ROOT / f'assets/frames/{c}.png'))
    manifest = json.loads((AFTER_FRAMES / 'manifest.json').read_text())
    for name in names:
        old = before / 'frames' / name; files = sorted(p.name for p in old.glob('*.png'))
        rows = []; per = {}
        for f in files:
            x, y = rgba(old / f), rgba(AFTER_FRAMES / name / f)
            per[f] = r = audit(x, y, name); r['ring_before'], r['ring_after'] = ring(x), ring(y)
            if r['opaque'] < -2 or not r['bbox'] or r['interior'] or r['new_holes'] > 0 or not r['binary']:
                fail.append((name, f, {k: r[k] for k in ('opaque', 'bbox', 'interior', 'new_holes', 'binary')}))
            rows.append((f, x, y))
        # Sheet: one pose per state (first cell), capped, favouring the most-changed ones.
        states = [v for k, v in manifest.get(name, {}).items()] + [v for k, v in manifest.get(name + '_free', {}).items()]
        firsts = []
        for refs in states:
            f = refs[0].split('/')[-1]
            if f in files and f not in firsts and refs[0].startswith(name + '/'):
                firsts.append(f)
        pick = sorted(firsts, key=lambda f: -per[f]['recoloured'])[:5] or files[:5]
        sheet(name, [r for r in rows if r[0] in pick], OUT / f'{name}.png')
        agg = lambda k, side: float(np.mean([per[f][side][k] for f in files]))
        report[name] = dict(frames=len(files), opaque_min=min(per[f]['opaque'] for f in files), opaque_max=max(per[f]['opaque'] for f in files),
                            recoloured_mean=float(np.mean([per[f]['recoloured'] for f in files])),
                            ring_before={k: agg(k, 'ring_before') for k in ('lum', 'light', 'green', 'blue')},
                            ring_after={k: agg(k, 'ring_after') for k in ('lum', 'light', 'green', 'blue')})
    if (before / 'stage').exists():
        pairs = []
        for p in PROPS:
            b = before / 'stage' / f'{p}.png'
            if b.exists():
                x, y = rgba(b), rgba(AFTER_STAGE / f'{p}.png')
                r = audit(x, y); report[p] = {k: r[k] for k in ('opaque', 'bbox', 'interior', 'new_holes', 'binary', 'recoloured')}
                if r['opaque'] < -2 or r['interior'] or r['new_holes'] > 0:
                    fail.append((p, r))
                slot = {'conductor_intro': 320, 'conductor_hazards': 128, 'neta_props': 128}.get(p)
                if slot:   # strips: one pair per slot
                    for i in range(0, x.shape[1] // slot, 1 if slot == 128 else 3):
                        pairs.append((f'{p} [{i}]', x[:, i * slot:(i + 1) * slot].copy(), y[:, i * slot:(i + 1) * slot].copy()))
                else:
                    pairs.append((p, x, y))
        for chunk in range(0, len(pairs), 6):
            sheet('boss props', pairs[chunk:chunk + 6], OUT / f'props_{chunk // 6}.png')
    # Outline beside CHAD's: each family's idle back edge at 4x (after), dark and light.
    tiles = []
    for n in ['chad'] + list(names):
        f = ROOT / 'assets/frames/chad_idle_flex1.png' if n == 'chad' else AFTER_FRAMES / json.loads((AFTER_FRAMES / 'manifest.json').read_text())[n]['idle'][0]
        im = Image.open(f).convert('RGBA'); b = im.getbbox(); y = b[1] + 60   # the back edge at chest height
        x = int(np.argmax(np.array(im)[y, :, 3] > 0)); c = im.crop((x - 8, y - 30, x + 40, y + 30))
        tiles.append((n, [on(c, bg).resize((c.width * 4, c.height * 4), Image.NEAREST) for bg in (DARK, LIGHT)]))
    tw, th = tiles[0][1][0].size
    cmp_im = Image.new('RGBA', (len(tiles) * (tw + 6) + 6, th * 2 + 30), (60, 60, 66, 255)); dr = ImageDraw.Draw(cmp_im)
    for i, (n, (dk, lt)) in enumerate(tiles):
        dr.text((6 + i * (tw + 6), 4), n, fill=(255, 230, 150, 255)); cmp_im.paste(dk, (6 + i * (tw + 6), 20)); cmp_im.paste(lt, (6 + i * (tw + 6), 24 + th))
    cmp_im.save(OUT / 'vs_chad.png')
    (OUT / 'report.json').write_text(json.dumps(report, indent=1))
    for k, v in report.items():
        if k != 'chad':
            print(k, {a: (round(b, 3) if isinstance(b, float) else ({c: round(d, 3) for c, d in b.items()} if isinstance(b, dict) else b)) for a, b in v.items()})
    print('CHAD ring', {c: {k: round(v, 3) for k, v in r.items()} for c, r in report['chad'].items()})
    if fail:
        print('FAIL', *fail[:20], sep='\n'); sys.exit(1)
    print(f'PASS: edge pass kept {sum(report[n]["frames"] for n in names)} frames aligned, binary, hole-free, interior unchanged, erosion within 2%')


if __name__ == '__main__':
    main(Path(sys.argv[1]), sys.argv[2:] or SETS)
