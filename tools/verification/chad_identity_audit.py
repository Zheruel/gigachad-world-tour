#!/usr/bin/env python3
"""Audit every CHAD family in the game against the gold standard (chad_identity_check.py).

  .venv/bin/python tools/verification/chad_identity_audit.py [OUT] [--only name,name]
OUT (default tmp/review/shera_rework/run2/chad_audit): per family <name>.png (1x game scale shown 3x, gold sidle1 at left,
dark and light rows) and <name>_2x.png (authoring scale), plus audit.json and ranking.txt.
Gates per family: 'all' (colour everywhere + crown/bulk on standing cells), 'colour' (close-ups: palette, skin, hair,
jeans, outline), 'classes' (CHAD baked into a vehicle or sofa: skin, hair, jeans only), 'visual' (sheet only).
"""
import json, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import chad_identity_check as C  # noqa: E402

ROOT = C.ROOT
IDLE = {'idle', 'idle_cigar', 'idle_flex', 'idle_knuckles', 'idle_shades', 'taunt', 'victory'}


def families():
    fam = {}
    man = json.load(open(ROOT / 'assets/frames/manifest.json'))['player']
    for k, v in man.items():
        if k == 'combo_power_finish':
            continue  # reuses combo_power_a/b cells
        fam['frames_' + k] = dict(files=['assets/frames/' + f for f in v], standing='all' if k in IDLE else 'none', group='gameplay frames')
    T = 'assets/travel/'; N = 'assets/stages/night_train/rebuild/'; I = 'assets/stages/india/cinematics/'
    fam.update({
        'india_arrival': dict(C.FAMILIES['india_arrival'], group='India arrival (Kesarganj)'),
        'india_arrival_after': dict(C.FAMILIES['india_arrival_after'], group='India arrival (Kesarganj)'),
        'airport_stairs': dict(files=[T + 'airport/chad_stairs.png'], cell=(256, 208), standing='none', group='airport'),
        'airport_low_board': dict(files=[T + 'airport/chad_low_board.png'], cell=(256, 208), standing='none', group='airport'),
        'airport_disembark': dict(files=[T + 'airport/chad_disembark.png'], cell=(256, 208), standing='none', group='airport'),
        'airport_duck': dict(files=[T + 'airport/chad_duck.png'], cell=(256, 208), standing='none', group='airport'),
        'train_board': dict(files=[N + 'chad_board.png'], cell=(224, 240), standing='none', group='night train'),
        'train_cinema': dict(files=[N + 'chad_cinema.png'], cell=(224, 224), standing='all', group='night train'),
        'train_entry': dict(files=[N + 'chad_entry.png'], cell=(224, 224), standing='0-2', group='night train'),
        'train_roof_climb': dict(files=[N + 'chad_roof_climb.png'], cell=(320, 240), standing='none', group='night train'),
        'india_cine_finishers': dict(files=[I + 'chad_finishers.png'], cell=(256, 256), standing=[0, 14, 15], group='Delhi cinematics'),
        'india_cart_push': dict(files=[I + 'chad_cart_push.png'], cell=(256, 256), standing='none', group='Delhi cinematics'),
        'delhi_chopper': dict(files=['assets/stages/dirty_delhi/rampage/chopper.png'], cell=(384, 320), standing='none', gate='classes', group='Delhi rampage'),
        'gigastation_ident': dict(files=['assets/ui/gigastation/chad.png'], cell=(380, 330), scale=1.73, standing='none', gate='colour', group='boot / title / results'),
        'title_cigar': dict(files=['assets/ui/title-motion/chad-cigar.png'], cell=(400, 368), scale=2.2, standing='none', gate='colour', group='boot / title / results'),
        'results_portrait': dict(files=['assets/ui/results_portrait.png'], cell=(354, 348), scale=2.2, standing='none', gate='colour', group='boot / title / results'),
        'lair_lounge': dict(files=[f'assets/lair/lounge_smoke_{i}.png' for i in range(7)], standing='none', gate='classes', group='penthouse lair'),
        'story_motorcycle': dict(files=[f'assets/story/motorcycle/combined_0{i}.png' for i in (1, 2, 3)], standing='none', gate='classes', group='story'),
        'city_car_driver': dict(files=[T + 'city/car_driver.png'], gate='visual', group='street'),
        'ui_portraits': dict(files=['assets/ui/portrait_chad_48.png', 'assets/ui/portrait_chad.png'], gate='visual', group='boot / title / results'),
        'title_art': dict(files=['assets/ui/title_art.png'], gate='visual', group='boot / title / results'),
        'train_finale_chad': dict(files=[N + 'finale_chad.png'], cell=(240, 224), standing='0,1,3,21-30', group='night train'),
        # Old finale sheets, no longer loaded (replaced by finale_chad); measured for reference only.
    })
    return fam


def cells(spec):
    out = []
    for f in spec['files']:
        for i, a in enumerate(C.cells_of(f, spec.get('cell'))):
            if (a[..., 3] > 127).sum() > 200:
                out.append((f, i, a))
    return out


def run(spec):
    gate = spec.get('gate', 'all'); scale = spec.get('scale', 1.)
    if gate == 'visual':
        return []
    cs = [(f, i, a) for f, i, a in cells(spec)]
    std = spec.get('standing', 'none'); n = len(cs)
    st = set(std) if isinstance(std, list) else set(C.parse_list(std, n))
    res = []
    for k, (f, i, a) in enumerate(cs):
        m = C.measure(a, scale)
        if m is None:
            continue
        bad = C.judge(m, k in st, 'all' if gate == 'all' else 'colour')
        if gate == 'classes':
            bad = [b for b in bad if b[0].split('_')[0] in ('skin', 'hair', 'jeans') and b[0] != 'jeans_area']
        res.append(dict(file=f, cell=i, standing=k in st, metrics=m, fail=[list(b) for b in bad]))
    return res


def tight(a):
    ys, xs = np.nonzero(a[..., 3] > 0)
    return a[:ys.max() + 1, max(xs.min() - 2, 0):xs.max() + 3] if len(ys) else a


def contact(spec, name, out, res):
    """1x game scale shown 3x (nearest) and a 2x authoring sheet; gold sidle1 at left; dark and light rows."""
    scale = spec.get('scale', 1.); gate = spec.get('gate', 'all')
    gold = np.array(Image.open(ROOT / 'assets/frames/chad_sidle1.png').convert('RGBA'))
    items = [('GOLD', tight(gold))]
    fails = {(r['file'], r['cell']): r['fail'] for r in res}
    for f, i, a in cells(spec):
        tag = f'{Path(f).stem}[{i}]' if spec.get('cell') else Path(f).stem
        if gate != 'visual':
            tag += ' X' if fails.get((f, i)) else ' ok'
        items.append((tag, tight(a)))
    for mode, s, zoom in (('', .5, 3), ('_2x', 1., 1)):
        tiles = []
        for tag, a in items:
            im = Image.fromarray(a); k = s / (1 if tag == 'GOLD' else scale)
            if gate == 'visual' and tag != 'GOLD' and im.width * k > 900:
                k = 900 / im.width
            im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.Resampling.LANCZOS)
            if zoom > 1:
                im = im.resize((im.width * zoom, im.height * zoom), Image.Resampling.NEAREST)
            tiles.append((tag, im))
        rowh = max(t.height for _, t in tiles) + 18
        per = max(1, min(len(tiles), 2400 // (max(t.width for _, t in tiles) + 12)))
        rows = [tiles[j:j + per] for j in range(0, len(tiles), per)]
        W = max(sum(t.width + 12 for _, t in r) for r in rows) + 12
        sheet = Image.new('RGBA', (W, rowh * len(rows) * 2 + 8), (0, 0, 0, 255))
        for half, bg, ink in ((0, (32, 36, 44, 255), (230, 230, 230)), (1, (236, 232, 220, 255), (20, 20, 20))):
            y0 = half * (rowh * len(rows) + 8)
            ImageDraw.Draw(sheet).rectangle((0, y0, W, y0 + rowh * len(rows)), fill=bg)
            for r, row in enumerate(rows):
                x = 12; base = y0 + r * rowh + rowh - 4
                for tag, t in row:
                    sheet.alpha_composite(t, (x, base - t.height))
                    col = (220, 60, 60) if tag.endswith(' X') else ink
                    ImageDraw.Draw(sheet).text((x, y0 + r * rowh + 2), tag, fill=col)
                    x += t.width + 12
        sheet.convert('RGB').save(out / f'{name}{mode}.png', optimize=True)


def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(',')); args = [a for a in args if a not in only and ',' not in a]
    out = Path(args[0]) if args else ROOT / 'tmp/review/shera_rework/run2/chad_audit'
    out.mkdir(parents=True, exist_ok=True)
    fam = families(); summary = {}
    for name, spec in fam.items():
        if only and name not in only:
            continue
        res = run(spec); contact(spec, name, out, res)
        n = len(res); nf = sum(bool(r['fail']) for r in res)
        fam_fail = [list(b) for b in C.family_gate(res)] if spec.get('gate', 'all') in ('all', 'colour') else []
        counts = {}
        for r in res:
            for b in r['fail']:
                key = b[0]; counts[key] = counts.get(key, 0) + 1
        med = lambda k: round(float(np.median([r['metrics'][k] for r in res if r['metrics'].get(k) is not None])), 2) if any(r['metrics'].get(k) is not None for r in res) else None
        summary[name] = dict(group=spec.get('group'), gate=spec.get('gate', 'all'), cells=n, off_model=nf, family_fail=fam_fail,
                             fail_share=round(nf / n, 2) if n else None, failures=dict(sorted(counts.items(), key=lambda x: -x[1])),
                             median=dict(palette_de=med('palette_de'), outline_L=med('outline_L'), skin_hi=med('skin_hi'),
                                         skin_shadow_C=med('skin_shadow_C'), bulk=med('bulk'), crown=med('crown'), colours=med('colours')),
                             cells_detail=res)
        print(f"{name:32s} {nf:3d}/{n:<3d} off-model{' +FAMILY' if fam_fail else ''}  {summary[name]['failures']}")
    lean = {k: {kk: vv for kk, vv in v.items() if kk != 'cells_detail'} for k, v in summary.items()}
    (out / 'audit.json').write_text(json.dumps(dict(gold=C.gold_ref(), limits={k: v for k, v in C.LIMITS.items()}, families=lean), indent=1))
    (out / 'audit_cells.json').write_text(json.dumps({k: v['cells_detail'] for k, v in summary.items()}, indent=0))


if __name__ == '__main__':
    main()
