#!/bin/bash
# gen_codex.sh <output.png> <landscape|portrait|square> <description> [reference.png ...]
# Generates one image through codex's gpt-image tool and copies it to <output.png>.
# Skips if the output already exists and is non-empty.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi

# The CLI is not always on PATH; the ChatGPT desktop app bundles the same binary.
CODEX="${CODEX:-$(command -v codex || echo /Applications/ChatGPT.app/Contents/Resources/codex)}"

out="$1"; shape="$2"; desc="$3"; shift 3
refs=()
for r in "$@"; do refs+=(-i "$r"); done

[ -s "$out" ] && { echo "SKIP $out"; exit 0; }
mkdir -p "$(dirname "$out")"

case "$shape" in
  landscape) size="1536x1024 (3:2 landscape)";;
  portrait)  size="1024x1536 (2:3 portrait)";;
  *)         size="1024x1024 (square)";;
esac

abs_out="$(cd "$(dirname "$out")" && pwd)/$(basename "$out")"
prompt="Generate exactly one image with your image generation tool, then copy the generated file to this exact path: $abs_out
Image size: $size.
Do not ask any questions, do not write any other files, do not edit code. Just generate the image, copy it to that path, and reply DONE.
Image description:
$desc"

for attempt in 1 2 3; do
  "$CODEX" exec --sandbox danger-full-access --skip-git-repo-check ${refs[@]+"${refs[@]}"} -- "$prompt" >/dev/null 2>&1
  [ -s "$out" ] && { echo "OK $out"; exit 0; }
  echo "retry $attempt failed for $out" >&2
  sleep 5
done
echo "FAILED $out" >&2
exit 1
