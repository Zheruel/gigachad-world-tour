#!/bin/bash
# process_d1_cast.sh - slice the DIRTY DELHI sheets and process each family into
# game frames, then rebuild the manifest.
#
# --height is the TALLEST pose the family has, and --fill is set from the idle, not
# the other way round: process_char.py silently re-scales any single frame taller than
# the canvas, which breaks the "one scale for all poses" invariant the tool exists to
# enforce. Langda's airborne drop and the dabbawala's tiffin tower both trip it.
# HEIGHTS in js/aiframes.js must equal --height / RS.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
SRC=assets/ai/d1cast
CUT=assets/ai/d1frames/
mkdir -p $CUT

slice() {  # slice <sheet> <prefix> <count>
  [ -s "$SRC/$1.png" ] || { echo "MISSING $1"; return; }
  $PY tools/slice_sheet.py "$SRC/$1.png" "$2" --expect "$3" --out "$CUT" || echo "SLICE FAILED $1"
}

# ---- cut every strip -----------------------------------------------------
slice pappu_idle    pappu_idle   4 ; slice pappu_walk   pappu_walk   4
slice pappu_charge  pappu_charge 4 ; slice pappu_grab   pappu_grab   3
slice pappu_stomp   pappu_stomp  4 ; slice pappu_hurt   pappu_hurt   3

slice langda_idle   langda_idle  4 ; slice langda_hang  langda_hang  3
slice langda_drop   langda_drop  4 ; slice langda_screech langda_screech 4
slice langda_snatch langda_snatch 3; slice langda_throw langda_throw 3
slice langda_hurt   langda_hurt  3

slice cooker_idle   cooker_idle  4 ; slice cooker_walk   cooker_walk  4
slice cooker_beam   cooker_beam  4 ; slice cooker_hurt   cooker_hurt  3

slice thela_idle    thela_idle   4 ; slice thela_walk    thela_walk   4
slice thela_ram     thela_ram    4 ; slice thela_atk     thela_atk    3
slice thela_hurt    thela_hurt   3

slice mudlark_idle  mudlark_idle 4 ; slice mudlark_walk  mudlark_walk 4
slice mudlark_rise  mudlark_rise 4 ; slice mudlark_grab  mudlark_grab 3
slice mudlark_hurt  mudlark_hurt 3

slice dhobi_idle    dhobi_idle   4 ; slice dhobi_walk    dhobi_walk   4
slice dhobi_whip    dhobi_whip   4 ; slice dhobi_hurt    dhobi_hurt   3

slice sandh_walk    sandh_walk   4 ; slice sandh_paw     sandh_paw    4
slice sandh_charge  sandh_charge 4 ; slice sandh_hurt    sandh_hurt   3

slice dabbawala_run  dabbawala_run  4 ; slice dabbawala_drop dabbawala_drop 3

slice thekedar_idle  thekedar_idle  4 ; slice thekedar_swing thekedar_swing 3
slice thekedar_hurt  thekedar_hurt  3

# ---- one process_char per family, ONE scale across all of its poses ------
# height = logical x RS. --ref is the pose the scale is measured from.
proc() {  # proc <char> <height> <fill> <ref>
  $PY tools/process_char.py "$1" --height "$2" --fill "$3" --ref "$4" --colors 44 \
    --src-dir "$CUT/" --src-prefix "$1" --out-prefix "$1" || echo "PROC FAILED $1"
}

# Every one of these came out of `check_cast_scale.py <char> --ref <pose> --body <N>`,
# which measures the tallest pose the family actually has and solves for the canvas
# that fits it. Hand-picked numbers had three families clamped: Langda hangs at 1.78x
# his crouched idle, the thela's overhand punch at 1.17x, and the bull REARS when he
# is hit at 1.42x his walk. Re-run the checker after regenerating any strip.
proc pappu     208 0.961 idle1
proc langda    206 0.563 idle1     # canvas is the HANG, not the crouched idle
proc cooker    164 1.000 idle1
proc thela     214 0.857 idle1     # canvas is the overhand punch
proc mudlark   140 1.000 idle1
proc dhobi     180 1.000 idle1
proc sandh     210 0.702 walk1     # canvas is the rear, not the walk
proc dabbawala 178 0.944 run1      # canvas is the tiffin tower coming apart
proc thekedar  176 1.000 idle1

$PY tools/build_manifest.py
echo "=== cast processed ==="
