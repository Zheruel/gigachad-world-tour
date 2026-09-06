#!/bin/bash
# build_sfx.sh - rebuild audio/sfx/*.wav from audio/sources/streets_of_rage_2/ using the slot map
# in audio/sfx/manifest.json. Run after editing the map (see sfxlab.html).
set -euo pipefail
cd "$(dirname "$0")/../.."
PY=./.venv/bin/python
$PY - "$@" <<'PYEOF'
import json, subprocess, sys
m = json.load(open('audio/sfx/manifest.json'))
selected=set(sys.argv[1:])
for slot, src in m['map'].items():
    if selected and slot not in selected: continue
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', f"audio/sources/streets_of_rage_2/{src}.wav",
        '-ac', '1', '-ar', '22050', '-sample_fmt', 's16',
        '-af', 'silenceremove=start_periods=1:start_threshold=-55dB,areverse,'
               'silenceremove=start_periods=1:start_threshold=-55dB,areverse,'
               'loudnorm=I=-15:TP=-1.0:LRA=11',
        f"audio/sfx/{slot}.wav",
    ], check=True)
    print(f"{slot:<8} <- {src}")
for slot, recipe in m.get('composites', {}).items():
    if selected and slot not in selected: continue
    command=['ffmpeg','-y','-loglevel','error'];filters=[];labels=[]
    for i,part in enumerate(recipe['inputs']):
        command+=['-i',f"audio/sources/streets_of_rage_2/{part['source']}.wav"]
        filters.append(f"[{i}:a]"+(part['filter']+',' if part.get('filter') else '')+f"adelay={part['delayMs']}:all=1,volume={part['volume']}[p{i}]")
        labels.append(f'[p{i}]')
    filters.append(''.join(labels)+f"amix=inputs={len(labels)}:duration=longest:normalize=0,alimiter=limit=0.85[out]")
    subprocess.run(command+['-filter_complex',';'.join(filters),'-map','[out]','-ac','1','-ar','22050','-sample_fmt','s16',f'audio/sfx/{slot}.wav'],check=True)
    print(f'{slot} <- layered sources')
PYEOF
