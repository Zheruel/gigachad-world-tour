#!/bin/bash
# cut_npcs.sh - slice the generated background-actor sheets into frames.
# A kind's loop and its react sheet are cut into one directory so process_npcs.py
# can scale and palette them as a single family.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
P=./.venv/bin/python
S=assets/ai/sheet
O=assets/ai/npc/

cut() {  # cut <sheet> <prefix> <poses>
  [ -s "$S/$1.png" ] || { echo "MISSING $1"; return; }
  $P tools/slice_sheet.py "$S/$1.png" "$2" --expect "$3" --out "$O"
}

# loops
cut n2_chai    chai    4
cut n2_spice   spice   4
cut n2_barber  barber  3
cut n2_tailor  tailor  3
cut n2_fan     fan     3
cut n2_porter  porter  4
cut n2_dog     dog     2
cut n2_rick    rick    2
cut n2_cow     cow     4

# reactions
for k in chai spice barber tailor fan porter; do
  cut "n2_${k}_r" "${k}_r" 2
done
