#!/bin/bash
# Reprocess every character with the consistent-scale / shared-palette pipeline.
# Heights are LOGICAL x2 (RS): 32-bit art carries twice the detail of the old sheets.
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python

# char  canvas-height  src-prefix  [extra args]
# the likeness-corrected cast is generated into assets/ai/v3
V3="--src-dir assets/ai/v3/"
CHARS=(
  "player 150 hero $V3"
  "grunt 138 grunt"
  "runner 138 runner"
  "heavy 158 heavy"
  "whip 138 whip"
  "bather 146 bather"
  "oiler 142 oiler"
  "danny 168 danny $V3"
  "van 172 van2 $V3"
  "wolff 172 wolff $V3"
  "maxon 168 maxon $V3"
  "ricardo 162 ricardo $V3"
  "philippe 162 philippe"
  "jirka 180 jirka"
  "nino 172 nino"
)

for row in "${CHARS[@]}"; do
  set -- $row
  out=$1; h=$2; src=$3
  $PY tools/process_char.py "$out" --height "$h" --src-prefix "$src" --out-prefix "$src" --colors 48 "${@:4}"
done
$PY tools/build_manifest.py | head -1
