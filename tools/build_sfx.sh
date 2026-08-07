#!/bin/bash
# build_sfx.sh - rebuild audio/sfx/*.wav from audio/sfx/raw/ using the slot map
# in audio/sfx/manifest.json. Run after editing the map (see sfxlab.html).
set -euo pipefail
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
$PY - <<'PYEOF'
import json, subprocess
m = json.load(open('audio/sfx/manifest.json'))
for slot, src in m['map'].items():
    subprocess.run([
        'ffmpeg', '-y', '-loglevel', 'error', '-i', f"audio/sfx/raw/{src}.wav",
        '-ac', '1', '-ar', '22050', '-sample_fmt', 's16',
        '-af', 'silenceremove=start_periods=1:start_threshold=-55dB,areverse,'
               'silenceremove=start_periods=1:start_threshold=-55dB,areverse,'
               'loudnorm=I=-15:TP=-1.0:LRA=11',
        f"audio/sfx/{slot}.wav",
    ], check=True)
    print(f"{slot:<8} <- {src}")
PYEOF
