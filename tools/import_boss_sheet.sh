#!/bin/bash
# Import a 13-pose ImageGen boss model sheet with fixed scale and natural edges.
set -euo pipefail
cd "$(dirname "$0")/.."
NAME=$1
SHEET=$2
HEIGHT=$3
OUT=assets/ai/newcast/
mkdir -p "$OUT"
if [ "$SHEET" != "${OUT}${NAME}_sheet.png" ]; then cp "$SHEET" "${OUT}${NAME}_sheet.png"; fi
./.venv/bin/python tools/slice_sheet.py "${OUT}${NAME}_sheet.png" "${NAME}_pose" --expect 13 --out "$OUT"
states=(idle walk1 walk2 punch punch2 punch3 grab slam slam2 slam3 hurt hurt2 down)
for i in {1..13}; do
  cp "${OUT}${NAME}_pose${i}.png" "assets/ai/delhi/${NAME}_${states[$((i-1))]}.png"
done
./.venv/bin/python tools/process_char.py "$NAME" --height "$HEIGHT" --ref idle --colors 48 \
  --src-prefix "$NAME" --out-prefix "$NAME" --src-dir assets/ai/delhi/
