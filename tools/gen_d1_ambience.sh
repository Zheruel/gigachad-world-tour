#!/bin/bash
# gen_d1_ambience.sh - DIRTY DELHI ambience sprites: the ring crowd for Pappu's fight,
# the ghat's rats and the floating debris. One strong anchor each; motion is code.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh; O=assets/ai/d1props
mkdir -p $O
S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4: highly detailed pixel art with rich four-tone shading and a crisp dark 1px outline, hard midday sun from the upper left. The ENTIRE background must be one solid flat bright pure green (RGB 0,255,0) chroma key with no black, no gradient, no glow, no shadow, no ground line, no text, no watermark, no border"
N="32-bit arcade beat em up game sprite in the style of Streets of Rage 4: highly detailed pixel art with rich four-tone shading and a crisp dark 1px outline, dim sodium orange dusk light. The ENTIRE background must be one solid flat bright pure green (RGB 0,255,0) chroma key with no black, no gradient, no glow, no shadow, no ground line, no text, no watermark, no border"
$G $O/crowd_a.png landscape "A row of five Indian market men standing shoulder to shoulder seen directly from BEHIND, backs to the viewer, watching a street wrestling match: kurtas, a lungi, a vest, one turban, one holding a bicycle, arms crossed or raised, full body, feet on one shared ground line, $S" &
$G $O/crowd_b.png landscape "A row of five Indian market onlookers standing shoulder to shoulder seen directly from BEHIND, backs to the viewer, watching a street fight: a woman in a sari holding a child on her hip, an old man with a cane, two young men in shirts, a boy on tiptoe, full body, feet on one shared ground line, $S" &
$G $O/rat.png square "A single brown sewer rat seen from the side, crouched low, long tail, wet fur, $N" &
wait
$G $O/debris_bottle.png square "A glass bottle floating half submerged on its side in dark river water, only the upper half visible above a flat waterline, $N" &
$G $O/debris_garland.png square "A wilted orange marigold flower garland floating flat on dark river water, seen from the side just above the waterline, $N" &
$G $O/debris_scooter.png landscape "The handlebars, mirror and top of the headlight of a sunk old Indian scooter poking up above a flat dark waterline, the rest under water, $N" &
wait
echo "=== ambience done ==="

# The crowd came back on a painted backdrop instead of the key. A second pass that
# reproduces the sheet and swaps only the background is what actually gives a clean key.
crowd_key() {
$G $O/crowd_a_key.png landscape "Reproduce the reference image EXACTLY, pixel for pixel, same figures, same poses, same colours and pixel art style, with ONE change: replace the entire background behind the people with one solid flat bright pure green (RGB 0,255,0) with no gradient, no glow and no shadow. No text, no watermark, no border." $O/crowd_a.png &
$G $O/crowd_b_key.png landscape "Reproduce the reference image EXACTLY, pixel for pixel, same figures, same poses, same colours and pixel art style, with ONE change: replace the entire background behind the people with one solid flat bright pure green (RGB 0,255,0) with no gradient, no glow and no shadow. No text, no watermark, no border." $O/crowd_b.png &
wait
echo "=== crowd key done ==="
}
[ "${1:-}" = "crowdkey" ] && crowd_key
