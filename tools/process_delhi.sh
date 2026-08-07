#!/bin/bash
# process_delhi.sh - raw Delhi cast gens -> game frames, then rebuild the manifest.
# Heights are LOGICAL x RS (see HEIGHTS in js/aiframes.js). Each character is
# processed as a unit so one scale and one palette cover all of its poses.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python

run() {   # run CHAR HEIGHT
  local n=$1 h=$2
  # skip anyone whose frames have not finished generating yet
  if ! ls assets/ai/delhi/${n}_idle.png >/dev/null 2>&1; then
    echo "SKIP $n (no frames yet)"; return
  fi
  $PY tools/process_char.py "$n" --height "$h" --ref idle --colors 48 \
    --src-prefix "$n" --out-prefix "$n" --src-dir assets/ai/delhi/
}

run goonda  160
run batta   164
run masala  158
run bandar   92
run pehlwan 194
run mirchi  200
run yadav   216

$PY tools/build_manifest.py
