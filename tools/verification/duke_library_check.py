#!/usr/bin/env python3
"""Check curated library, preserved legacy slots, provenance and complete audio decoding."""
import concurrent.futures, hashlib, json, re, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'audio/voice/duke'
catalog=json.loads((BASE/'catalog.json').read_text())
clips=catalog['clips']
curated=[c for c in clips if not c.get('legacySlots')]
assert len(curated)==125 and len(clips)>=125
assert len({c['id'] for c in clips})==len(clips)
assert len({c['file'] for c in clips})==len(clips)
assert len({c['sha256'] for c in curated})==125
assert {c['category'] for c in clips}>={'combat','threats','explosions','entrances','reactions','victory'}
assert {c['file'] for c in clips}=={str(p.relative_to(BASE)) for p in BASE.rglob('*') if p.suffix.lower() in {'.mp3','.wav'}}
assert any(c['transcript']=="This Train is Goin' Nowhere Fast" for c in clips)
assert any(c['transcript']=='Time to Blow This Joint' for c in clips)
assert any(c['transcript']=='Eat My Size 14' for c in clips)
def check(c):
    p=BASE/c['file']
    assert p.resolve().is_relative_to(BASE.resolve())
    assert Path(c['sourceFilename']).suffix.lower() in {'.mp3','.wav'} and c['transcript'] and c['suggestedUse']
    assert c['transcriptProvenance'] in {'source-filename','whisper-local'} and isinstance(c['listeningVerified'],bool)
    assert hashlib.sha256(p.read_bytes()).hexdigest()==c['sha256']
    assert .1<c['duration']<30, (c['id'],c['duration'])
    raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-f','s16le','-ac','1','-ar','44100','-'])
    assert len(raw)>8000
    return hashlib.sha256(raw).hexdigest()
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
    hashes=list(pool.map(check,clips))
assert len({h for c,h in zip(clips,hashes) if not c.get('legacySlots')})==125
# Verify migrated aliases against the game registry rather than retired file locations.
registry=(ROOT/'js/audio.js').read_text()
registered=dict(re.findall(r"\b([a-zA-Z_][\w]*)\s*:\s*['\"](audio/voice/[^'\"]+)['\"]",registry))
for c in clips:
    for slot in c.get('legacySlots',[]):
        assert registered.get(slot)==f"audio/voice/duke/{c['file']}", (slot,c['file'],registered.get(slot))
print(f'PASS: 125 unique archive clips plus {len(clips)-125} legacy takes; all decode, match catalog hashes and preserve registered aliases.')
