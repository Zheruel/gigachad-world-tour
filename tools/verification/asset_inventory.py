"""Expand the same asset tables consumed by browser loaders (no file mutations)."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def source(name):
    return re.sub(r'//[^\n]*','',(ROOT/'js'/name).read_text())
def strings(text):return re.findall(r"['\"]([^'\"]+)['\"]",text)
def block(text,name):
    m=re.search(r'\b'+name+r'\s*=\s*([\[{])(.*?)[\]}];',text,re.S)
    return m.group(2) if m else ''
def counts(text,name):return {k:int(v) for k,v in re.findall(r'(\w+)\s*:\s*(\d+)',block(text,name))}
def runtime_assets():
    paths=set()
    for name in ['assets.js','aiframes.js','story.js','crowd.js','audio.js','title_motion.js', 'street.js', 'airport.js', 'flight.js', 'level_card.js', 'display_type.js']:
        paths.update(p for p in strings(source(name)) if re.fullmatch(r'(assets|audio)/[^\s]+\.(png|json|mp3|wav)',p))
    # Chapter artwork is registered through data maps, not literal FILES rows.
    india=source('india_assets.js')
    paths.update(p for p in strings(india) if re.fullmatch(r'assets/[^\s]+\.png',p))
    for stage, names in re.findall(r"(delhi|refund)\s*:\s*\[([^\]]+)\]",block(india,'INDIA_PANELS')):
        directory='dirty_delhi/rebuild' if stage=='delhi' else 'refund_tower'
        paths.update(f'assets/stages/{directory}/{name}.png' for name in strings(names))
    for prop in re.findall(r'(ic_\w+)\s*:\s*\[',block(india,'INDIA_PROPS')):
        paths.update(f'assets/stages/india/props/{prop}{suffix}.png' for suffix in ['', '_b'])
    for module in ['delhi_scenery.js','refund_scenery.js']:
        if not (ROOT/'js'/module).is_file():continue
        text=source(module)
        paths.update(p for p in strings(text) if re.fullmatch(r'assets/[^\s]+\.png',p))
        names=re.search(r'Object\.fromEntries\(\[(.*?)\]\.map',text,re.S)
        prefix=re.search(r"['\"](assets/[^'\"]+/)['\"]\s*\+\s*name",text)
        if names and prefix:paths.update(prefix.group(1)+name+'.png' for name in strings(names.group(1)))
    manifest=json.loads((ROOT/'assets/frames/manifest.json').read_text())
    for states in manifest.values():
        for files in states.values():paths.update('assets/frames/'+f for f in files)
    for k,n in counts(source('fx.js'),'ITEMS').items():
        paths.update(f'assets/fx/{k}{i+1 if n>1 else ""}.png' for i in range(n))
    for k,n in counts(source('ambience.js'),'SETS').items():paths.update(f'assets/ambience/delhi_{k}_{i+1}.png' for i in range(n))
    paths.update(f'assets/fg/{k}.png' for k in strings(block(source('fg.js'),'PIECES')))
    crowd=source('crowd.js')
    for k,n in counts(crowd,'KINDS').items():paths.update(f'assets/npc/{k}{i+1}.png' for i in range(n))
    for k in strings(block(crowd,'REACTORS')):paths.update(f'assets/npc/{k}_r{i+1}.png' for i in range(2))
    story=source('story.js'); prefix=re.search(r'`(assets/[^`]+?)/combined_',story).group(1)
    count=int(re.search(r'const RIDE_CELS = (\d+)',story).group(1))
    paths.update(f'{prefix}/combined_{i+1:02}.png' for i in range(count))
    paths.update(p for p in strings(source('travel.js')) if re.fullmatch(r'assets/travel/[^\s]+\.png',p))
    audio=source('audio.js');slots=strings(block(audio,'SFX_FILES'))
    slots+=['rank_'+r+'_'+str(i) for r in ['dismal','crazy','badass','apocalyptic','savage','sickskills','sss'] for i in [1,2]]
    slots+=['duke_combo_'+str(i) for i in range(1,7)]
    aliases=dict(re.findall(r"(\w+):\s*'([^']+)'",block(audio,'SFX_PATHS')))
    for k in slots:paths.add(aliases.get(k,f'audio/{"voice" if k.startswith(("duke_","rank_")) else "sfx"}/{k}.wav'))
    paths.update((v if '/' in v else 'audio/'+v) for k,v in json.loads((ROOT/'audio/manifest.json').read_text()).items() if isinstance(v,str) and v.endswith(('.mp3','.wav')))
    return paths
if __name__=='__main__':print('\n'.join(sorted(runtime_assets())))
