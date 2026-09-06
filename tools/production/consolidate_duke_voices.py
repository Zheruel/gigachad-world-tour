#!/usr/bin/env python3
"""Move original game Duke takes into the curated collection without changing audio bytes.
Supply JSON from transcribe_voice_library.py. Existing game slot IDs remain stable.
"""
import argparse, hashlib, json, re, shutil, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE=ROOT/'audio/voice/duke'
CATEGORIES={'duke_back_to_work':'reactions','duke_book_em':'victory','duke_combo_1':'reactions','duke_combo_2':'victory','duke_combo_3':'victory','duke_combo_4':'reactions','duke_combo_5':'combat','duke_combo_6':'combat','duke_come_get_some':'combat','duke_game_over':'victory','duke_gotta_hurt':'reactions','duke_hail':'victory','duke_lets_rock':'entrances','duke_look_good':'victory','duke_out_of_gum':'entrances','duke_ride':'entrances'}
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('transcripts',type=Path);args=parser.parse_args()
    transcripts={r['file']:r for r in json.loads(args.transcripts.read_text())}
    catalog=json.loads((BASE/'catalog.json').read_text());old={c['id']:c for c in catalog['clips']};entries=[];aliases={};retire=[]
    for stem,category in CATEGORIES.items():
        row=transcripts[stem+'.wav'];text=row['text'].strip()
        # Source archive corroborates this name; retain untouched machine output as provenance.
        if stem=='duke_book_em':text="Mmm. Book 'em, Dan-o."
        slug=re.sub(r'[^a-z0-9]+','_',text.lower()).strip('_')
        relative=f'{category}/{slug}_game_take.wav';target=BASE/relative;source=ROOT/'audio/voice'/f'{stem}.wav'
        if not source.exists():source=BASE/old['legacy_'+stem]['file']
        digest=hashlib.sha256(source.read_bytes()).hexdigest();target.parent.mkdir(parents=True,exist_ok=True)
        if source!=target:shutil.copy2(source,target)
        assert hashlib.sha256(target.read_bytes()).hexdigest()==digest
        duration=float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(target)],text=True))
        slot='duke_quote' if stem=='duke_out_of_gum' else stem
        aliases[slot]='audio/voice/duke/'+relative
        entries.append(dict(id='legacy_'+stem,file=relative,transcript=text,category=category,duration=round(duration,3),sourceFilename=stem+'.wav',sourceSha256=digest,sha256=digest,suggestedUse='Existing game performance; retained unchanged for its current cue.',transcriptProvenance='whisper-local',listeningVerified=False,legacySlots=[slot],transcription=dict(model='Whisper large-v3',engine='faster-whisper',device='local CPU',rawText=row['text'],averageLogProbability=row['confidence']),variant='original-game-take'))
        if source!=target:retire.append(source)
    catalog['clips']=[c for c in catalog['clips'] if c['id'] not in {'legacy_'+s for s in CATEGORIES}]+entries
    catalog['existingVoiceAssets']='Original game Duke WAV recordings consolidated by category, byte-for-byte unchanged; stable legacySlots map current game cues.'
    (BASE/'catalog.json').write_text(json.dumps(catalog,indent=2,ensure_ascii=False)+'\n')
    p=ROOT/'js/audio.js';s=p.read_text()
    for slot,path in aliases.items():
        line=f"  {slot}: '{path}',"
        pattern=rf"^  {re.escape(slot)}: '[^']+',"
        if re.search(pattern,s,re.M):s=re.sub(pattern,line,s,flags=re.M)
        else:s=s.replace('const SFX_PATHS = {','const SFX_PATHS = {\n'+line)
    s=s.replace('// The announcer and the extra Duke lines are files the game looks for and does not ship:', '// Rank announcements and Duke cues keep stable IDs; explicit paths preserve the original performances:')
    p.write_text(s)
    p=ROOT/'js/review-lair.js';s=p.read_text().replace('audio/voice/duke_look_good.wav',aliases['duke_look_good']);p.write_text(s)
    # All known consumers now resolve canonical files. Remove only the byte-identical retired copies.
    for source in retire:source.unlink()
    print(f'Consolidated {len(entries)} original game takes; {len(catalog["clips"])} total Duke recordings. Stable aliases preserved.')
if __name__=='__main__':main()
