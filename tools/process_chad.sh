#!/bin/bash
# Rebuild every shipped CHAD family without an artificial silhouette outline.
set -euo pipefail
cd "$(dirname "$0")/.."
PY=./.venv/bin/python

$PY tools/process_char.py chad --height 192 --fill .94 --ref sidle1 --colors 48 \
  --src-prefix chad --out-prefix chad --src-dir assets/ai/chad/ --no-outline

$PY tools/process_char.py parry_counter --height 192 --fill .94 --ref 1 --colors 48 \
  --src-prefix parry_counter --out-prefix chad_parry_counter \
  --src-dir assets/ai/chad_v2/ --no-outline

$PY tools/process_char.py combo_power_a --height 192 --fill .94 --ref 1 --colors 48 \
  --src-prefix combo_power_a --out-prefix chad_combo_power_a \
  --src-dir assets/ai/chad_v4/ --no-outline
# Frame 1 is crouched. Using it as the scale reference enlarged the entire
# second half of the combo; frame 8 is the neutral standing-height calibration.
$PY tools/process_char.py combo_power_b --height 192 --fill .94 --ref 8 --colors 48 \
  --src-prefix combo_power_b --out-prefix chad_combo_power_b \
  --src-dir assets/ai/chad_v4/ --no-outline
$PY tools/process_char.py ragnarok_ground --height 192 --fill .94 --ref 1 --colors 48 \
  --src-prefix ragnarok_ground --out-prefix chad_ragnarok_ground \
  --src-dir assets/ai/chad_v4/ --no-outline
$PY tools/process_char.py ragnarok_air --height 256 --fill .70 --ref 1 --colors 48 \
  --src-prefix ragnarok_air --out-prefix chad_ragnarok_air \
  --src-dir assets/ai/chad_v4/ --no-outline
$PY tools/process_char.py super_express --height 192 --fill .94 --ref 8 --colors 48 \
  --src-prefix super_express --out-prefix chad_meteor_lariat \
  --src-dir assets/ai/chad_v3/ --no-outline

$PY tools/build_manifest.py
$PY tools/process_ambience.py
