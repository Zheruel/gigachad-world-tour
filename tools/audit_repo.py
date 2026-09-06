#!/usr/bin/env python3
"""Audit runtime loader paths, module imports, production sources and dead art."""
import ast,hashlib,json,sys,re
from collections import defaultdict
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'tools/verification'))
from asset_inventory import runtime_assets
OPTIONAL={'assets/ending_art.png', 'assets/frames/crowd.json'}
def main():
    paths=runtime_assets(); failures=[]
    for name in sorted(paths):
        if not (ROOT/name).is_file() and name not in OPTIONAL:failures.append('missing loader asset: '+name)
    for p in (ROOT/'js').glob('*.js'):
        for dep in re.findall(r"(?:from\s*|import\s*)['\"](\.[^'\"]+)['\"]",p.read_text()):
            if not (p.parent/dep).is_file():failures.append(f'missing module: {p.name} -> {dep}')
    for directory in ['lair','travel','ui','story/motorcycle','stages/night_train/rebuild']:
        for p in (ROOT/'assets'/directory).rglob('*.png'):
            if p.relative_to(ROOT).as_posix() not in paths:failures.append('unregistered runtime art: '+str(p.relative_to(ROOT)))
    for p in (ROOT/'tools').rglob('*.py'):
        for dep in re.findall(r'^from (\w+) import',p.read_text(),re.M):
            if dep.startswith(('build_','process_','slice_')) and not (ROOT/'tools/production'/f'{dep}.py').is_file():failures.append(f'missing pipeline module: {p.name} -> {dep}')
    for name in ['build_dirty_delhi.py']:
        p=ROOT/'tools/production'/name
        source=re.search(r'SOURCE = ROOT / "([^"]+)"',p.read_text()).group(1)
        tree=ast.parse(p.read_text())
        views=next(ast.literal_eval(n.value) for n in tree.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='VIEWS' for t in n.targets))
        for view in views:
            if not (ROOT/source/view[0]).is_file():failures.append(f'missing stage source: {source}/{view[0]}')
    rebuild=ROOT/'assets/sources/production/stages/night_train/rebuild'
    for name in ['general_windows','vista_rural_industry','vista_industry_river','pantry_cook','station_tea','platform_empty','join_yard_hall','join_hall_platform','vestibule','chad_board','locomotive','yard_booth','hall','platform','general','sleeper','pantry','ac','private','private_damaged','roof','rural','industry','river','rural_near','industry_near','river_near','chad_cinema','chad_entry','hatch_open','ticket_clerk','ticket_scanner','passengers','props','train_exterior','explosion','vikram_actions','seth_intro','office_clear','office_desk','office_chair','conductor_intro','finale_charge','finale_gear','finale_early_damage','finale_passenger_damage','finale_private_shell','finale_cigar','finale_dynamite','finale_smoke','finale_environment','finale_approach','finale_approach_clouds','finale_car','finale_roll','finale_walk','office','conductor_performance','conductor_office','gangway','tough_performance','bruiser_performance','runner_performance','ambusher_performance','heavy_performance','heavy_unarmed_performance','guard_performance','vikram','vikram_roof','tough_gait','bruiser_gait','runner_gait','ambusher_gait','heavy_gait','heavy_unarmed_gait','guard_gait','tough_recovery','bruiser_recovery','runner_recovery','ambusher_recovery','heavy_recovery','heavy_unarmed_recovery','guard_recovery','conductor_recovery','vikram_recovery','vikram_roof_recovery','conductor_contact','vikram_contact','vikram_roof_contact','bruiser_passing','conductor_passing','vikram_passing','vikram_roof_passing','ambusher_special_recovery']:
        if not (rebuild/(name+'.png')).is_file():failures.append('missing rebuild source: '+name)
    bank=json.loads((ROOT/'audio/sfx/manifest.json').read_text())
    for sample in bank['map'].values():
        if not (ROOT/bank['rawDir']/(sample+'.wav')).is_file():failures.append('missing original SFX sample: '+sample)
    files=[ROOT/n for n in paths if (ROOT/n).is_file() and n.endswith('.png')]
    groups=defaultdict(list)
    for p in files:groups[hashlib.sha256(p.read_bytes()).hexdigest()].append(p)
    duplicates=[v for v in groups.values() if len(v)>1]
    print(f'Runtime assets checked: {len(paths)}; duplicate runtime groups: {len(duplicates)}')
    for error in failures:print('FAIL:',error)
    if not failures:print('PASS: runtime loaders, module imports and asset registration')
    return bool(failures)
if __name__=='__main__':sys.exit(main())
