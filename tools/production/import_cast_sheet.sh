#!/bin/bash
# Slice an ImageGen 11-pose model sheet and install it into the shared,
# no-outline character pipeline. Pose order is documented in the ImageGen prompt.
set -euo pipefail
cd "$(dirname "$0")/../.."
NAME=$1
SHEET=$2
HEIGHT=$3
OUT=assets/sources/production/newcast/
mkdir -p "$OUT"
if [ "$SHEET" != "${OUT}${NAME}_sheet.png" ]; then cp "$SHEET" "${OUT}${NAME}_sheet.png"; fi
./.venv/bin/python tools/production/slice_sheet.py "${OUT}${NAME}_sheet.png" "${NAME}_pose" --expect 11 --out "$OUT"
states=(idle walk1 walk2 walk3 walk4 atk atk2 atk3 hurt hurt2 down)
for i in {1..11}; do
  cp "${OUT}${NAME}_pose${i}.png" "assets/sources/production/stages/dirty_delhi/cast_legacy/${NAME}_${states[$((i-1))]}.png"
done
./.venv/bin/python tools/production/process_char.py "$NAME" --height "$HEIGHT" --ref idle --colors 48 \
  --src-prefix "$NAME" --out-prefix "$NAME" --src-dir assets/sources/production/stages/dirty_delhi/cast_legacy/
