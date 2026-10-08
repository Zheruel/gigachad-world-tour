#!/bin/zsh
# gen_image.sh <out.png> <promptfile> [ref images...]
# One GPT Image generation or edit through Codex's built-in image tool (see the gpt-image skill, ~/.claude/skills/gpt-image).
#   - Refs are passed in order; the prompt can call them "Image 1", "Image 2"... An existing frame as
#     Image 1 plus "change only X" is an EDIT: faster and keeps identity/registration.
#   - Sprites are requested on a TRUE transparent background (prompt only; there is no API parameter here).
#     The raw result is kept as <out>.raw.png; <out> gets hardened alpha (sprite_edges.py --alpha).
#     Builders then scale, register and run edges(). KEY=magenta asks for a flat #FF00FF key instead.
#   - OPAQUE=1 for backgrounds/plates (no transparency request, no alpha pass).
#   - ASPECT="16:9" / "3:1" / "1:1" (≤3:1). The built-in tool picks the pixel size itself and ignores exact
#     sizes (SIZE=WxH is read as that aspect ratio); builders scale to game size. The file is kept native.
#   - Safe to run many in parallel: `gen_image.sh a.png a.txt ref.png & gen_image.sh b.png b.txt & wait`.
#     Codex sessions sometimes hang, so each attempt is capped (GEN_TIMEOUT, default 420 s) and retried.
# Keep prompt files outside the repository (scratchpad or system temp), per AGENTS.md.
set -u
repo=${0:A:h:h:h}
out=${1:A}; pf=${2:A}; shift 2
CODEX="${CODEX:-$(command -v codex || echo /Applications/ChatGPT.app/Contents/Resources/codex)}"
refs=(); for r in "$@"; do refs+=(-i "${r:A}"); done
# Desktop model names can reach the CLI before its model catalogue updates.
# An explicit per-run override keeps production usable without changing user settings.
model_args=(); [ -n "${GEN_MODEL:-}" ] && model_args+=(-m "$GEN_MODEL")
mkdir -p "${out:h}"
# Generation transcripts contain prompts; keep them outside production sources.
log=$(mktemp "${TMPDIR:-/tmp}/gachi-image-${out:h:t}-${out:t:r}.XXXXXX")
echo "LOG $log"

if [ -n "${OPAQUE:-}" ]; then bg="Output an opaque PNG (full-bleed image, no transparency)."
elif [ "${KEY:-}" = magenta ]; then bg="Use a flat pure magenta (#FF00FF) background."
else bg="Output a PNG with a TRUE TRANSPARENT background (real alpha channel): no background colour, no magenta, no checkerboard, no floor, no cast shadow, crisp opaque edges with no halo."; fi
size=""; [ -n "${ASPECT:-}" ] && size="Aspect ratio: ${ASPECT}."; [ -n "${SIZE:-}" ] && size="Aspect ratio: ${SIZE/x/:}."

prompt="$(cat "$pf")

$bg
$size
Use your built-in image generation tool (never code/drawing scripts). Generate exactly one image, then copy the generated PNG unchanged (no resize, crop or conversion) to $out and print only the path. Do not write other files or edit code. If the result clearly violates the brief (wrong layout, wrong count, cropped figures, an opaque background when transparency was asked), regenerate once before saving."

attempt() {
  rm -f "$out"
  print -r -- "$prompt" | "$CODEX" exec --skip-git-repo-check --approve-for-me "${model_args[@]}" -C "$repo" "${refs[@]}" - > "$log" 2>&1 &
  local pid=$! waited=0
  while kill -0 $pid 2>/dev/null; do
    (( waited >= ${GEN_TIMEOUT:-420} )) && { kill -9 $pid 2>/dev/null; return 124; }
    sleep 2; (( waited += 2 ))
  done
  wait $pid 2>/dev/null
  [ -s "$out" ]
}
for n in 1 2 3; do attempt && break; echo "retry $n: $out" >&2; sleep 3; done
[ -s "$out" ] || { echo "FAIL $out (see $log)"; exit 1; }

if [ -z "${OPAQUE:-}" ] && [ "${KEY:-}" != magenta ]; then
  cp "$out" "${out%.png}.raw.png"
  cd "$repo"
  .venv/bin/python -c "
from PIL import Image; import sys; im=Image.open(sys.argv[1]); sys.exit(0 if im.mode in ('RGBA','LA') and im.getextrema()[-1][0] < 128 else 1)" "$out" \
    && .venv/bin/python tools/production/sprite_edges.py --alpha "$out" "$out" \
    || echo "WARN $out has no transparent background: regenerate, or key it (KEY=magenta)"
fi
echo "OK $out"
