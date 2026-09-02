#!/bin/bash
# process_d2_cast.sh - slice THE NIGHT TRAIN sheets and process each family into game
# frames, then rebuild the manifest. Same rules as process_d1_cast.sh: --height is the
# family's TALLEST pose (run check_cast_scale.py --dir assets/ai/d2frames/ after any
# regeneration) and HEIGHTS in js/aiframes.js must equal --height / RS.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
SRC=assets/ai/d2cast
CUT=assets/ai/d2frames/
mkdir -p $CUT

slice() {  # slice <sheet> <prefix> <count>
  [ -s "$SRC/$1.png" ] || { echo "MISSING $1"; return; }
  $PY tools/slice_sheet.py "$SRC/$1.png" "$2" --expect "$3" --out "$CUT" || echo "SLICE FAILED $1"
}

slice manja_idle  manja_idle  4 ; slice manja_throw manja_throw 4
slice manja_drop  manja_drop  4 ; slice manja_walk  manja_walk  4
slice manja_hurt  manja_hurt  3

slice tte_idle    tte_idle    4 ; slice tte_walk    tte_walk    4
slice tte_torch   tte_torch   4 ; slice tte_ledger  tte_ledger  3
slice tte_stamp   tte_stamp   4 ; slice tte_hurt    tte_hurt    3

slice birju_idle     birju_idle     4 ; slice birju_walk   birju_walk   4
slice birju_chain    birju_chain    4 ; slice birju_hook   birju_hook   4
slice birju_charge   birju_charge   4 ; slice birju_grab   birju_grab   3
slice birju_uncouple birju_uncouple 3 ; slice birju_hurt   birju_hurt   3

# the late additions (tools/gen_d2_extra.sh): the cow's sheets are cow_*, her family is gai
slice coolie_idle coolie_idle 4 ; slice coolie_walk coolie_walk 4
slice coolie_atk  coolie_atk  3 ; slice coolie_hurt coolie_hurt 3
slice cow_idle    gai_idle    4 ; slice cow_walk    gai_walk    4
slice cow_kick    gai_kick    3 ; slice cow_hurt    gai_hurt    2

proc() {  # proc <char> <height> <fill> <ref>
  $PY tools/process_char.py "$1" --height "$2" --fill "$3" --ref "$4" --colors 44 \
    --src-dir "$CUT/" --src-prefix "$1" --out-prefix "$1" || echo "PROC FAILED $1"
}

# fill values are placeholders until check_cast_scale.py has measured the sheets
proc manja 168 "${MANJA_FILL:-0.70}" idle1     # canvas is the leap, the crouch is small
proc tte   184 "${TTE_FILL:-0.96}"   idle1
proc birju 236 "${BIRJU_FILL:-0.86}" idle1     # canvas is the pin held overhead
proc coolie 240 "${COOLIE_FILL:-0.98}" idle1   # canvas is the trunk on his head: the man reads at ~78
$PY tools/rescale_strips.py --dir $CUT gai idle1 hurt:hurt2 kick:kick3   # her two short strips come back big
proc gai    188 "${GAI_FILL:-0.745}"   idle1   # canvas is the bellow, head up

$PY tools/build_manifest.py
echo "=== d2 cast processed ==="
