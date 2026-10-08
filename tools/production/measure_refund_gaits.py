#!/usr/bin/env python3
"""Measure registered support-foot travel and export Refund's distance clocks."""
import json
import argparse
from pathlib import Path
import numpy as np
from PIL import Image
from build_refund_performances import skull_x

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'assets/sources/production/stages/refund_tower/overhaul'
FRAMES = ROOT / 'assets/frames'
REVIEW = ROOT / 'tmp/review/refund-overhaul/gait'
FAMILIES = {'caller': 'ic_headset', 'operator': 'ic_operator',
            'technician': 'ic_thrower', 'security': 'ic_security',
            'recovery': 'ic_cabinet', 'supervisor': 'ic_lead'}


def soles(path, top=291):
    a = np.asarray(Image.open(path).convert('RGBA'))[..., 3]
    occupied = np.flatnonzero((a[top:293] >= 128).any(axis=0))
    # A painted sole can have a short hole between its heel and forefoot.
    # Keep both ends of that shoe together; the two feet are farther apart.
    groups = np.split(occupied, np.flatnonzero(np.diff(occupied) > 18) + 1)
    return [[int(g.min()), int(g.max())] for g in groups if len(g) >= 3]


def support_sole(path, phase, outgoing=False):
    """Follow one shoe through heel roll, rather than the lowest stray pixel."""
    image = path.convert('RGBA') if isinstance(path,Image.Image) else Image.open(path).convert('RGBA')
    a = np.asarray(image)[..., 3] >= 128
    # Late in the half-cycle the swinging boot is in front of the planted
    # shoe. Its near-floor heel must not become the clock's support point.
    if phase >= 6 and not outgoing:
        a[:, round(skull_x(image)+12):] = False
    xs = np.flatnonzero(a[285:293].any(axis=0))
    groups = np.split(xs, np.flatnonzero(np.diff(xs) > 18)+1)
    groups = [g for g in groups if len(g) >= 3]
    if not groups:
        raise ValueError(f'{path}: no registered support shoe')
    group = groups[0] if outgoing or phase >= 6 else groups[-1]
    left, right = int(group[0]), int(group[-1])+1
    occupied = a[280:293, left:right]
    rows = np.flatnonzero(occupied.sum(axis=1) >= 3)
    if not len(rows):
        raise ValueError(f'{path}: missing sole')
    bottom = int(rows[-1])+281
    contact = np.flatnonzero(a[max(280, bottom-3):bottom, left:right].any(axis=0))
    return {'x': round(left+(int(contact[0])+int(contact[-1]))/2, 3),
            'y': bottom, 'span': [left+int(contact[0]), left+int(contact[-1])]}


def measure(files):
    if len(files) != 20:
        raise ValueError(f'Expected twenty registered walk poses, got {len(files)}')
    bands = [soles(FRAMES / file) for file in files]
    if any(not b for b in bands):
        raise ValueError('A support foot does not meet the registered floor')
    # Each ten-pose half follows the leading planted shoe. At heel strike,
    # track the outgoing shoe in the rear rather than switching identities.
    points = [support_sole(FRAMES / f, i%10) for i, f in enumerate(files)]
    support = [p['x'] for p in points]
    deltas = []
    wraps = {}
    for i, x in enumerate(support):
        j = (i + 1) % 20
        # At heel strike the outgoing rear boot has begun rolling onto its
        # toe. Include its last five pixels instead of mistaking the new
        # leading heel for the old planted shoe.
        if j in [0, 10]:
            outgoing = support_sole(FRAMES / files[j], 0, True)
            if outgoing['y'] < 292:
                # That shoe has left the ground. Its swing cannot measure
                # planted travel across a support change; continue the
                # measured cadence of the two preceding grounded poses.
                d = (support[i-2]-support[i])/4
                wraps[str(i)] = {'outgoing': outgoing, 'method': 'preceding planted travel'}
            else:
                d = (x-outgoing['x'])/2
                wraps[str(i)] = {'outgoing': outgoing, 'method': 'outgoing planted shoe'}
        else:
            d = (x-support[j])/2
        deltas.append(round(d, 3))
    # A support change includes the rear shoe rolling onto its shorter toe
    # contact; allow that boundary more travel than a planted midstride pose.
    failures = [{'cell': i, 'logical_delta': d} for i, d in enumerate(deltas)
                if d < -1.5 or d > (16 if i in [9, 19] else 12)]
    if failures:
        raise ValueError(f'Nonsequential planted feet: {failures}')
    # Tiny sole changes are painted boot roll, held for a half logical pixel.
    return {'beat': [max(.5, d) for d in deltas], 'contacts': [0, 1, 10, 11],
            'starts': [[0, 1], [10, 11]], 'native_soles': bands,
            'support_points': points, 'wraps': wraps,
            'logical_deltas': deltas, 'files': files}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--keys', nargs='+')
    args = parser.parse_args()
    manifest = json.loads((FRAMES / 'manifest.json').read_text())
    result = {}
    for family, key in FAMILIES.items():
        if args.keys and key not in args.keys:
            continue
        result[key] = {'walk': measure(manifest[key]['walk'])}
        if family == 'recovery':
            result[key]['push'] = measure(manifest[key]['push'])
        (SOURCE / f'cast/performances/{family}/gait-registration.json').write_text(
            json.dumps(result[key], indent=2) + '\n')
    # The Closer's eight-pose gaits are measured by build_closer_king.py and kept here.
    path = ROOT / 'js/refund_gait_data.js'
    data = json.loads(path.read_text().split('export const REFUND_GAITS=')[1].strip().rstrip(';')) if path.exists() else {}
    data.update({k: {s: {n: v[n] for n in ['beat', 'contacts', 'starts']}
                for s, v in states.items()} for k, states in result.items()}
    )
    path.write_text(
        '// Generated by tools/production/measure_refund_gaits.py.\n'
        'export const REFUND_GAITS=' + json.dumps(data, separators=(',', ':')) + ';\n')
    REVIEW.mkdir(parents=True, exist_ok=True)
    (REVIEW / 'measurements.json').write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
