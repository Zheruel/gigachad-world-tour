"""Reproduce the user-confirmed Tekken 7 electric preview without resampling."""
from pathlib import Path
import hashlib,json,struct,wave
root=Path(__file__).resolve().parents[2]
src=root/'audio/sources/tekken7/T7_Electric_SFX_P.pak'
pak=src.read_bytes();offset=pak.find(b'RIFF');assert offset>=0
raw=pak[offset:];assert raw[8:12]==b'WAVE'
i=12;data=None;fmt=None
while i+8<=len(raw):
 name=raw[i:i+4];size=struct.unpack_from('<I',raw,i+4)[0]
 if name==b'fmt ':fmt=struct.unpack_from('<HHIIHH',raw,i+8)
 if name==b'data':
  data=raw[i+8:i+8+size];assert len(data)==size
  break
 i+=8+size+(size%2)
assert fmt==(65534,1,44100,88200,2,16)
assert data is not None
with wave.open(str(root/'audio/sfx/super_electric.wav'),'wb') as out:
 out.setparams((1,2,44100,0,'NONE',''));out.writeframes(data)
f=root/'audio/sfx/manifest.json';m=json.loads(f.read_text())
m.setdefault('generated',{})['super_electric']={
 'recipe':'tools/production/extract_tekken_electric.py',
 'label':'Tekken 7 electric impact — user-confirmed, no fighter shout',
 'source':'https://tekkenmods.com/mod/3100/tekken-7-electric-sfx-for-t8',
 'archive':str(src.relative_to(root)),
 'archiveSha256':hashlib.sha256(pak).hexdigest(),
 'seconds':len(data)/88200,
 'processing':'Wwise PCM container conversion only; exact auditioned samples, full attack and tail',
 'provenanceVerified':True,'verifiedByEar':True,
 'verification':'User listened to the isolated preview and confirmed: This is it.'}
f.write_text(json.dumps(m,indent=2)+'\n')
