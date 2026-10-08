"""Small warning cues from the project's licensed SOR2 source bank.

Advance/GO use the user's preferred legacy samples via build_sfx.sh.
"""
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
recipes = {
    'warn_parry': ('37', 'atrim=duration=0.15,asetrate=55125,aresample=22050,volume=0.65'),
    'warn_evade': ('33', 'atrim=duration=0.18,asetrate=26460,aresample=22050,volume=0.7,afade=t=out:st=0.24:d=0.06'),
}
import sys
selected = set(sys.argv[1:])
for name, (source, effect) in recipes.items():
    if selected and name not in selected:
        continue
    trim = 'silenceremove=start_periods=1:start_threshold=-55dB,areverse,silenceremove=start_periods=1:start_threshold=-55dB,areverse'
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', str(ROOT / f'audio/sources/streets_of_rage_2/{source}.wav'),
                    '-af', trim + ',' + effect, '-ac', '1', '-ar', '22050', '-sample_fmt', 's16', str(ROOT / f'audio/sfx/{name}.wav')], check=True)
    print(name, source)
