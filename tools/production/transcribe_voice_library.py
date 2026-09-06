#!/usr/bin/env python3
"""Transcribe local game voices with an installed faster-whisper runtime and cached model.
Example: python transcribe_voice_library.py --model /path/to/cached/snapshot --output /tmp/voices.json
No audio is uploaded. Machine transcription does not establish speaker identity or listening verification.
"""
import argparse,json
from pathlib import Path
from faster_whisper import WhisperModel
ROOT=Path(__file__).resolve().parents[2]
def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--model',required=True);p.add_argument('--input',type=Path,default=ROOT/'audio/voice');p.add_argument('--pattern',default='*.wav');p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    m=WhisperModel(a.model,device='cpu',compute_type='int8',cpu_threads=8,local_files_only=True);rows=[]
    for f in sorted(a.input.glob(a.pattern)):
        segments,_=m.transcribe(str(f),language='en',beam_size=5,condition_on_previous_text=False,vad_filter=False);segments=list(segments)
        row=dict(file=f.name,text=' '.join(s.text.strip() for s in segments),confidence=round(sum(s.avg_logprob for s in segments)/max(1,len(segments)),3));rows.append(row);print(json.dumps(row),flush=True)
        a.output.write_text(json.dumps(rows,indent=2)+'\n')
if __name__=='__main__':main()
