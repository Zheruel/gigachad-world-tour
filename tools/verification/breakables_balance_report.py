"""Tables and minimap strips for tools/verification/breakables_balance.cjs runs.

Usage: .venv/bin/python tools/verification/breakables_balance_report.py before [after ...]
Per label writes tmp/review/breakables_balance/<label>/table.md and <stage>-minimap.png:
segment rows (fighters, mean novice/skilled damage and entry health over seeds, heals
placed in the segment and where), and a strip marking breakables against wave
triggers, fight views, boss arenas and checkpoints.
"""
import json
import sys
from collections import defaultdict
from pathlib import Path
from statistics import mean
from PIL import Image, ImageDraw

ROOT = Path('tmp/review/breakables_balance')
HEAL = {'shake': 30, 'plate': 15, 'life': 0}
VIEW = 480
DROP_COL = {'shake': (90, 220, 110), 'plate': (240, 200, 70), 'life': (240, 90, 220), None: (150, 150, 160)}


def placed(layout):
    """Heals placed per segment: props between this trigger and the next, plus recovery and rig drops."""
    waves, out = layout['waves'], defaultdict(list)
    for q in layout['props']:
        i = max([-1] + [k for k, w in enumerate(waves) if w['x'] <= q['x']])
        seg = waves[i]['seg'] if i >= 0 else 'approach'
        w = waves[i] if i >= 0 else None
        where = 'walk'
        if w is not None:
            lo = w['camX'] if w.get('camX') is not None else w['x'] - 255
            if q['x'] < lo + VIEW:
                where = 'arena' if (w['boss'] or w['miniboss']) else 'fight'
        out[seg].append((q['kind'], q['drop'], q['x'], where))
    for w in waves:
        if w['recovery']:
            out[w['seg']].append(('recovery', 'shake', w['x'], 'after'))
        for r in w['rigs']:
            if r == 'ic_heavy':
                out[w['seg']].append(('ic_thela', 'plate', w['x'], 'rig'))
    return out


def fmt_heal(items):
    parts = []
    for kind, drop, x, where in items:
        if drop:
            parts.append(f"{kind}{'(1UP)' if drop == 'life' else '+' + str(HEAL[drop] if kind != 'recovery' else 30)}@{x}/{where}")
        else:
            parts.append(f"{kind}(none)@{x}")
    return ', '.join(parts) or '-'


def table(label):
    runs = json.loads((ROOT / label / 'summary.json').read_text())
    by = defaultdict(list)
    for r in runs:
        by[(r['stage'], r['policy'])].append(r)
    lines = [f'# Health economy: {label}', '',
             'Means over seeds. dmg = health lost in the segment (boss fights on the assist bar, m = modelled retries);',
             'in = health entering; eaten = heal actually collected. Placed heal: fight = visible when the fight starts,',
             'walk = past the fight, on the way to the next trigger; rig = a heavy\'s cart (plate); recovery = post-wave lassi.', '']
    stages = []
    for r in runs:
        if r['stage'] not in stages:
            stages.append(r['stage'])
    for stage in stages:
        nov, sk = by.get((stage, 'novice'), []), by.get((stage, 'skilled'), [])
        layout = (nov or sk)[0]['layout']
        plc = placed(layout)
        segs = ['approach'] + [w['seg'] for w in layout['waves']]
        if stage == 'train':
            segs.append('boss:roof')
        fighters = {w['seg']: w['fighters'] for w in layout['waves']}

        def stat(runs, seg, key):
            vals = []
            for r in runs:
                s = next((s for s in r['segments'] if s['seg'] == seg), None)
                if s is None:
                    continue
                if key == 'heal':
                    vals.append(sum(v for k, v in s['heal'].items() if k not in ('1UP', 'other')))
                elif key == 'deaths':
                    vals.append(s['deaths'] + s.get('modelDeaths', 0))
                else:
                    vals.append(s[key] if s[key] is not None else 0)
            return mean(vals) if vals else None

        def n(v):
            return '-' if v is None else f'{v:.0f}'

        def d(v):
            return '-' if v is None else f'{v:.1f}'
        lines += [f'## {stage}', '',
                  '| segment | foes | novice in | novice dmg | novice deaths | novice eaten | skilled in | skilled dmg | skilled eaten | heal placed (kind+hp@x/where) |',
                  '|---|---|---|---|---|---|---|---|---|---|']
        for seg in segs:
            lines.append(f"| {seg} | {fighters.get(seg, '')} | {n(stat(nov, seg, 'entryHP'))} | {n(stat(nov, seg, 'damage'))} | {d(stat(nov, seg, 'deaths'))} | {n(stat(nov, seg, 'heal'))} | {n(stat(sk, seg, 'entryHP'))} | {n(stat(sk, seg, 'damage'))} | {n(stat(sk, seg, 'heal'))} | {fmt_heal(plc.get(seg, []))} |")
        tot = lambda rs, k: mean(r[k] for r in rs) if rs else 0
        heal_placed = sum((30 if k == 'recovery' else HEAL.get(dr, 0)) for items in plc.values() for k, dr, x, w in items if dr)
        boss = [s for s in segs if s.startswith(('boss', 'mini'))]
        wave_dmg = lambda rs: mean(sum(s['damage'] for s in r['segments'] if not s['seg'].startswith(('boss', 'mini'))) for r in rs) if rs else 0
        lines += ['', f"Totals: heal placed {heal_placed} (props+recovery+rigs; retries re-offer), "
                  f"novice dmg {tot(nov, 'totalDamage'):.0f} (waves {wave_dmg(nov):.0f}), eaten {tot(nov, 'totalHeal'):.0f}, deaths {tot(nov, 'totalDeaths'):.1f}; "
                  f"skilled dmg {tot(sk, 'totalDamage'):.0f} (waves {wave_dmg(sk):.0f}), eaten {tot(sk, 'totalHeal'):.0f}, deaths {tot(sk, 'totalDeaths'):.1f}. "
                  f"Placed/novice wave dmg = {heal_placed / max(1, wave_dmg(nov)):.0%}; placed/novice all dmg = {heal_placed / max(1, tot(nov, 'totalDamage')):.0%}. "
                  f"Results novice {[r['result'] for r in nov]}, skilled {[r['result'] for r in sk]}.", '']
        minimap(label, stage, layout, nov, sk, stat)
    (ROOT / label / 'table.md').write_text('\n'.join(lines))
    print('\n'.join(lines))


def minimap(label, stage, layout, nov, sk, stat):
    W_, S = 1800, 1800 / layout['width']
    img = Image.new('RGB', (W_ + 20, 250), (22, 22, 28))
    d = ImageDraw.Draw(img)
    X = lambda x: 10 + x * S
    d.text((10, 4), f'{stage} ({label}): breakables vs wave triggers; bars = mean dmg novice (red) / skilled (blue)', fill=(230, 230, 230))
    y0 = 40
    d.rectangle([X(0), y0, X(layout['width']), y0 + 60], outline=(80, 80, 90))
    for w in layout['waves']:
        lo = w['camX'] if w.get('camX') is not None else w['x'] - 255
        col = (90, 40, 40) if (w['boss'] or w['miniboss']) else (50, 50, 70)
        d.rectangle([X(lo), y0 + 1, X(lo + VIEW), y0 + 59], fill=col)
    for w in layout['waves']:
        d.line([X(w['x']), y0 - 6, X(w['x']), y0 + 60], fill=(230, 230, 230))
        lab = 'BOSS' if w['boss'] else (w['miniboss'] or '').upper()[:4] or w['seg'].split('@')[0]
        d.text((X(w['x']) + 2, y0 - 14), lab, fill=(230, 230, 230))
        if w['recovery']:
            d.ellipse([X(w['x']) + 3, y0 + 46, X(w['x']) + 9, y0 + 52], outline=(90, 220, 110))
    for c in layout['checkpoints']:
        d.polygon([(X(c), y0 + 60), (X(c) - 4, y0 + 68), (X(c) + 4, y0 + 68)], fill=(120, 180, 255))
    for q in layout['props']:
        col = DROP_COL[q['drop']]
        r = 6 if q['drop'] == 'shake' else 4 if q['drop'] == 'plate' else 5
        yy = y0 + 10 + (q['y'] - 200) * 0.9
        if q['drop'] == 'life':
            d.regular_polygon((X(q['x']), yy, r + 1), 5, fill=col)
        else:
            d.ellipse([X(q['x']) - r, yy - r, X(q['x']) + r, yy + r], fill=col if q['drop'] else None, outline=col)
    # damage bars per segment, drawn from each wave's trigger to the next
    base = 230
    segs = layout['waves']
    for i, w in enumerate(segs):
        x1 = segs[i + 1]['x'] if i + 1 < len(segs) else layout['width']
        for k, (runs, col) in enumerate(((nov, (220, 80, 80)), (sk, (90, 140, 240)))):
            v = stat(runs, w['seg'], 'damage') or 0
            h = min(130, v * 0.5)
            xa = X(w['x']) + 2 + k * max(3, (X(x1) - X(w['x'])) / 2 - 2)
            d.rectangle([xa, base - h, xa + max(2, (X(x1) - X(w['x'])) / 2 - 4), base], fill=col)
            if v >= 1:
                d.text((xa, base - h - 11), f'{v:.0f}', fill=col)
    d.text((10, 236), 'green=lassi(30) yellow=chaat(15) magenta=1UP grey=none, ring=post-wave recovery, blue tri=checkpoint, shaded=fight view at trigger (red=boss arena)', fill=(170, 170, 180))
    img.save(ROOT / label / f'{stage}-minimap.png')


def compare(a, b):
    """Before/after digest: placed heal, boss entry health, deaths and damage per stage."""
    runs = {lab: json.loads((ROOT / lab / 'summary.json').read_text()) for lab in (a, b)}
    lines = [f'# Health economy: {a} -> {b}', '',
             'Means over seeds (novice / skilled). Boss rows: health entering the fight.', '']
    for stage in dict.fromkeys(r['stage'] for r in runs[b]):
        lines += [f'## {stage}', '', f'| metric | {a} | {b} |', '|---|---|---|']
        rows = {}
        for lab in (a, b):
            rs = [r for r in runs[lab] if r['stage'] == stage]
            lay = rs[0]['layout']
            plc = placed(lay)
            items = [i for v in plc.values() for i in v]
            food = [i for i in items if i[0] != 'recovery' and i[3] != 'rig']
            heal = sum((30 if k == 'recovery' else HEAL.get(dr, 0)) for k, dr, x, w in items if dr)
            pol = lambda p: [r for r in rs if r['policy'] == p]
            def seg_mean(p, seg, key):
                v = [next((s[key] for s in r['segments'] if s['seg'] == seg), None) for r in pol(p)]
                v = [x for x in v if x is not None]
                return f'{mean(v):.0f}' if v else '-'
            r = {
                'breakables (food / score-only / 1UP)': f"{sum(1 for i in food if i[1] in ('shake', 'plate'))} / {sum(1 for i in food if not i[1])} / {sum(1 for i in food if i[1] == 'life')}",
                'food props (kind@x)': ' '.join(f"{k.replace('ic_', '').replace('nr_', '')}{'+30' if d == 'shake' else '+15' if d == 'plate' else '1UP' if d == 'life' else '(0)'}@{x}" for k, d, x, w in sorted(food, key=lambda i: i[2])),
                'in a fight view / on the walk': f"{sum(1 for i in food if i[1] and i[3] in ('fight', 'arena'))} / {sum(1 for i in food if i[1] and i[3] == 'walk')}",
                'recovery lassis after waves': ' '.join(str(w['x']) for w in lay['waves'] if w['recovery']) or '-',
                'heal placed incl. recovery + rigs': str(heal),
            }
            for w in lay['waves']:
                if w['boss'] or w['miniboss']:
                    r[f"HP into {w['seg']}"] = f"{seg_mean('novice', w['seg'], 'entryHP')} / {seg_mean('skilled', w['seg'], 'entryHP')}"
            if stage == 'train':
                r['HP into boss:roof'] = f"{seg_mean('novice', 'boss:roof', 'entryHP')} / {seg_mean('skilled', 'boss:roof', 'entryHP')}"
            m = lambda p, k: mean(x[k] for x in pol(p)) if pol(p) else 0
            wave = lambda p: mean(sum(s['damage'] for s in x['segments'] if not s['seg'].startswith(('boss', 'mini'))) for x in pol(p)) if pol(p) else 0
            wasted = lambda p: mean(sum(v for s in x['segments'] for k, v in s['wasted'].items()) for x in pol(p)) if pol(p) else 0
            r['wave damage'] = f"{wave('novice'):.0f} / {wave('skilled'):.0f}"
            r['all damage (boss bar incl.)'] = f"{m('novice', 'totalDamage'):.0f} / {m('skilled', 'totalDamage'):.0f}"
            r['heal eaten'] = f"{m('novice', 'totalHeal'):.0f} / {m('skilled', 'totalHeal'):.0f}"
            r['heal expired unused'] = f"{wasted('novice'):.0f} / {wasted('skilled'):.0f}"
            r['placed / novice wave dmg'] = f"{heal / max(1, wave('novice')):.0%}"
            r['placed / novice all dmg'] = f"{heal / max(1, m('novice', 'totalDamage')):.0%}"
            r['real deaths in waves'] = f"{mean(sum(s['deaths'] for s in x['segments'] if not s['seg'].startswith(('boss', 'mini'))) for x in pol('novice')):.1f} / {mean(sum(s['deaths'] for s in x['segments'] if not s['seg'].startswith(('boss', 'mini'))) for x in pol('skilled')):.1f}"
            r['modelled boss retries'] = f"{mean(sum(s.get('modelDeaths', 0) + s['deaths'] for s in x['segments'] if s['seg'].startswith(('boss', 'mini'))) for x in pol('novice')):.1f} / {mean(sum(s.get('modelDeaths', 0) + s['deaths'] for s in x['segments'] if s['seg'].startswith(('boss', 'mini'))) for x in pol('skilled')):.1f}"
            r['clears (novice / skilled)'] = f"{sum(x['result'] == 'clear' for x in pol('novice'))}/{len(pol('novice'))} / {sum(x['result'] == 'clear' for x in pol('skilled'))}/{len(pol('skilled'))}"
            rows[lab] = r
        for k in rows[b]:
            lines.append(f"| {k} | {rows[a].get(k, '-')} | {rows[b][k]} |")
        lines.append('')
    (ROOT / f'compare-{a}-{b}.md').write_text('\n'.join(lines))
    print('\n'.join(lines))


if __name__ == '__main__':
    args = sys.argv[1:] or ['before']
    for lab in args:
        table(lab)
    if len(args) == 2:
        compare(*args)
