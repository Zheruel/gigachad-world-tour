#!/usr/bin/env python3
"""Audit runtime loader paths, module imports, production sources and dead art."""
import argparse,hashlib,json,sys,re
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRODUCTION_SOURCES=ROOT/'assets/sources/production'
sys.path.insert(0,str(ROOT/'tools/verification'))
from asset_inventory import runtime_assets
OPTIONAL={'assets/ending_art.png', 'assets/frames/crowd.json'}
def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    modes=parser.add_mutually_exclusive_group()
    modes.add_argument('--sources', action='store_true', help='require selected production sources as well as all runtime checks')
    modes.add_argument('--runtime-only', action='store_true', help='check runtime assets, modules, recipes and SFX without requiring local generation sources')
    args=parser.parse_args(argv)
    check_sources=args.sources or not args.runtime_only and PRODUCTION_SOURCES.is_dir()
    reason='requested' if args.sources or args.runtime_only else 'local production sources present' if check_sources else 'production sources absent from this checkout'
    print(f"Audit mode: {'full (runtime + production sources)' if check_sources else 'runtime-only'} ({reason})")
    paths=runtime_assets(); failures=[]
    for name in sorted(paths):
        if not (ROOT/name).is_file() and name not in OPTIONAL:failures.append('missing loader asset: '+name)
    for p in (ROOT/'js').glob('*.js'):
        for dep in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",p.read_text()):
            if not (p.parent/dep).is_file():failures.append(f'missing module: {p.name} -> {dep}')
    for directory in ['frames','npc','fx','fg','props','ambience','lair','travel','ui','story/motorcycle','stages/night_train/rebuild','stages/dirty_delhi/rebuild','stages/refund_tower','stages/india']:
        for p in (ROOT/'assets'/directory).rglob('*.png'):
            if p.relative_to(ROOT).as_posix() not in paths:failures.append('unregistered runtime art: '+str(p.relative_to(ROOT)))
    for p in (ROOT/'tools').rglob('*.py'):
        # Any local module, shared helpers (sprite_edges, tone) and indented imports included.
        for dep in re.findall(r'^\s*(?:from (\w+) import|import (\w+))',p.read_text(),re.M):
            dep=dep[0] or dep[1]
            if (ROOT/'tools/production'/f'{dep}.py').is_file() or (p.parent/f'{dep}.py').is_file():continue
            if p.parent.name=='production' and re.match(r'(build|process|slice)_',dep):failures.append(f'missing pipeline module: {p.name} -> {dep}')
    if check_sources:
        audit_sources(failures)
    bank=json.loads((ROOT/'audio/sfx/manifest.json').read_text())
    for sample in bank['map'].values():
        if not (ROOT/bank['rawDir']/(sample+'.wav')).is_file():failures.append('missing original SFX sample: '+sample)
    files=[ROOT/n for n in paths if (ROOT/n).is_file() and n.endswith('.png')]
    groups=defaultdict(list)
    for p in files:groups[hashlib.sha256(p.read_bytes()).hexdigest()].append(p)
    duplicates=[v for v in groups.values() if len(v)>1]
    print(f'Runtime assets checked: {len(paths)}; duplicate runtime groups: {len(duplicates)}')
    for error in failures:print('FAIL:',error)
    if not failures:print('PASS: runtime loaders, module imports, asset registration and SFX' + ('; selected production sources' if check_sources else ' (production sources not checked)'))
    return bool(failures)
def audit_sources(failures):
    if not PRODUCTION_SOURCES.is_dir():
        failures.append('missing production source directory: '+str(PRODUCTION_SOURCES))
        return
    delhi_source=PRODUCTION_SOURCES/'stages/dirty_delhi/rebuild'
    delhi_names=['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon']
    selected=[f'{name}.png' for name in delhi_names]+['dredger_cab.png']
    selected += [f'joins/{left}_{right}.png' for left,right in zip(delhi_names,delhi_names[1:])]
    for name in selected:
        if not (delhi_source/name).is_file():failures.append('missing Delhi production source: '+name)
    refund_source=PRODUCTION_SOURCES/'stages/refund_tower/overhaul'
    refund_names=['office','annex','calling','calling_east','servers','records','executive','closer']
    selection=json.loads((refund_source/'selection.json').read_text()) if (refund_source/'selection.json').exists() else {}
    if not selection:failures.append('missing Refund selection.json')
    selected=[f'areas/{selection.get(name,name+"-v1.png")}' for name in refund_names]
    selected += [f'joins/{selection.get(left+"_"+right,left+"_"+right+".png")}' for left,right in zip(refund_names,refund_names[1:])]
    selected += ['props/furniture.png','props/equipment.png']
    selected += ['vista/rooftops-v2.png','vista/window-contours.json']
    selected += ['entrance/'+name+'.png' for name in ['chad-breach-v1','chad-settle-v1','debris-v1','desk-after-v1','technician-run-ground0-v1','technician-run-ground4-v1','operator-hidden-shin-v1','technician-hidden-shin-v1']]
    selected += ['entrance/'+family+'-'+name+'-v1.png' for family in ['caller','operator','technician'] for name in ['flee','turn','run-between']]
    selected += ['entrance/support-leg-polygons.json']
    selected += ['scenery/'+name+'.png' for name in ['fans','ceiling-fan-v2','foreground-industrial','foreground-executive','wall-states','success-states']]
    for family in ['caller','operator','technician','security','recovery','supervisor']:
        folder=refund_source/'cast/performances'/family
        if not (folder/'registration.json').exists():failures.append(f'missing Refund cast registration: {family}');continue
        registration=json.loads((folder/'registration.json').read_text())
        names=list(registration.get('_source',{}).values())
        names += [registration[k] for k in ['_typing','_turn'] if k in registration]
        names += list(registration.get('_typing_rows',{}).values())
        names += [p['file'] for patches in registration.get('_patches',{}).values() for p in patches]
        selected += [f'cast/performances/{family}/{name}' for name in names]
    for variant in ['intact','damaged']:
        folder=refund_source/'boss'/variant
        registration=json.loads((folder/'registration.json').read_text()) if (folder/'registration.json').exists() else {}
        selected += ['boss/'+variant+'/'+registration.get('_source',{}).get(name,name+'.png')
                     for name in ['boxing','cross','utility','reactions','getup','cascade','walkpolish','pushpolish']]
    for name in selected:
        if not (refund_source/name).is_file():failures.append('missing Refund production source: '+name)
    for stage,names in {
        'dirty_delhi/cinematics':['chad_finishers','chad_cart_push','market_set','kitchen_set','dredger_set','river_splash'],
        'night_train/rebuild':['station_life'],
        'night_train/conductor':['box','attacks','free','misc','finisher','hazards'],
        'night_train/neta':['guard_a','guard_b','guard_c','guard_d','neta_a','neta_b','neta_c','neta_d','neta_e','props'],
        'night_train/smuggler':['sheet_unarmed_act'],
    }.items():
        for name in names:
            if not (PRODUCTION_SOURCES/'stages'/stage/(name+'.png')).is_file():failures.append('missing presentation source: '+stage+'/'+name)
    rebuild=PRODUCTION_SOURCES/'stages/night_train/rebuild'
    for name in ['general_windows','vista_rural_industry','vista_industry_river','pantry_cook','station_tea_routine','platform_empty','join_yard_hall','join_hall_platform','vestibule','chad_board','locomotive','yard_booth','hall','platform','general','sleeper','pantry','ac','private','private_damaged','roof','rural','industry','river','rural_near','industry_near','river_near','chad_cinema','chad_entry','hatch_open','ticket_clerk','ticket_scanner','passengers','props','train_exterior','explosion','office_clear','office_desk','office_chair','finale_gear','finale_early_damage','finale_passenger_damage','finale_private_shell','finale_dynamite','finale_smoke','finale_environment','finale_approach','finale_approach_clouds','finale_car','office','gangway']:
        if not (rebuild/(name+'.png')).is_file():failures.append('missing rebuild source: '+name)

if __name__=='__main__':sys.exit(main())
