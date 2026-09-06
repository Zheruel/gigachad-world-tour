"""Inventory the licensed local bank without claiming unverified original sound names."""
import json,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'audio/sfx/manifest.json';m=json.loads(p.read_text())
entries=[]
for f in sorted((ROOT/m['rawDir']).glob('*.wav')):
 with wave.open(str(f)) as w: duration=round(w.getnframes()/w.getframerate(),3)
 uses=[k for k,v in m['map'].items() if v==f.stem]
 entries.append({'id':f.stem,'file':f.name,'bank':'voice' if f.stem.startswith('V') else 'effect','seconds':duration,'roles':uses,'label':', '.join(uses) if uses else 'Unassigned source '+f.stem,'verifiedByEar':False})
m['catalog']=entries
m['note']='All local WAV files are catalogued, including the voice bank. Role labels describe current game assignments, not verified original SOR2 names. verifiedByEar remains false until auditioned and confirmed. Use sfxlab.html to compare sources; rebuild runtime files with tools/production/build_sfx.sh after changing map.'
p.write_text(json.dumps(m,indent=2)+'\n')
print(f'Catalogued {len(entries)} local samples')
