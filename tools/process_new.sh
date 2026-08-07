#!/bin/bash
# Chroma-key + anchor the new AI cast frames into assets/frames/.
# Re-runnable: skips sources that are missing, overwrites existing outputs.
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python

proc() { # proc <name> <height> <maxw>
  local name="$1" h="$2" mw="$3"
  local src="assets/ai/frames/$name.png"
  [ -s "$src" ] || { echo "miss $name"; return; }
  $PY tools/process_frame.py "$src" "assets/frames/$name.png" --height "$h" --maxw "$mw" --colors 28 >/dev/null && echo "ok $name"
}

for c in "danny 54" "van2 56" "wolff 56" "maxon 54" "ricardo 52" "whip 44" "bather 46" \
         "philippe 52" "jirka 58" "nino 56" "oiler 45"; do
  set -- $c
  name=$1; h=$2
  wide=$(( h * 17 / 10 ))
  kick=$(( h * 14 / 10 ))
  for state in idle walk1 walk2 hurt getup; do proc "${name}_${state}" "$h" "$h"; done
  for state in punch grab atk slam; do proc "${name}_${state}" "$h" "$kick"; done
  proc "${name}_down" "$h" "$wide"
done
proc hero_special 48 60
echo PROCESS-DONE
ls assets/frames/ | wc -l
