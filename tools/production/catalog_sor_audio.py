"""Inventory the licensed local bank without claiming unverified original sound names."""
import json,wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=ROOT/'audio/sfx/manifest.json';m=json.loads(p.read_text())
previous={entry['id']:entry for entry in m.get('catalog',[])}
entries=[]
for f in sorted((ROOT/m['rawDir']).glob('*.wav')):
 with wave.open(str(f)) as w: duration=round(w.getnframes()/w.getframerate(),3)
 uses=[k for k,v in m['map'].items() if v==f.stem]
 uses+= [k for k,v in m.get('authored',{}).items() if Path(v.get('source','')).name==f.name]
 layers=[k for k,v in m.get('composites',{}).items() if any(part.get('source')==f.stem for part in v.get('inputs',[]))]
 old=previous.get(f.stem,{})
 known=old.get('verifiedByCode') or old.get('verifiedByEar')
 label=old.get('label') if known or old.get('provisionalLabel') else ('Unidentified PCM sample' if f.stem.startswith('V') else 'Unidentified effect')
 entries.append({**old,'id':f.stem,'file':f.name,'bank':'pcm' if f.stem.startswith('V') else 'effect','seconds':duration,'roles':sorted(set(uses)),'layers':sorted(set(layers)),'label':label,'verifiedByEar':old.get('verifiedByEar',False)})
m['catalog']=entries
m['note']='Source names describe original SOR2 uses only when confirmed. Current game assignments are listed separately as roles. Identification evidence survives recataloguing. Use review.html?scenario=tools/audio to audition originals and runtime effects.'
p.write_text(json.dumps(m,indent=2)+'\n')
print(f'Catalogued {len(entries)} local samples')
