#!/bin/bash
# gen_lair_lounge.sh - the lounge corner.
#
# The doberman used to be generated here too. He is retired: one animal padding about
# the room reads as a pet, two read as a kennel.
#
# The sofa ships as a matched PAIR: an empty one, and the same sofa with CHAD sitting
# in it smoking. Drawing a seated CHAD as a separate character frame would mean a new
# pose through the whole aiframes anchoring pipeline and would still land his hips in
# roughly the right place; generating him and the furniture as one picture means the
# pose is correct by construction. js/hub.js swaps one sprite for the other and hides
# the player. The second generation takes the first as a reference so they match.
#
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

SOFA="A long low black leather chesterfield sofa seen from the side at a very slight three quarter angle, deep buttoned back, polished chrome legs, and a small chrome side table at the right hand end of it with an open dark wood cigar humidor and a heavy crystal ashtray on top"

echo "=== lounge ==="
$G $O/lounge_empty.png landscape "$SOFA, nobody sitting on it, $S, no people"
$G $O/lounge_chad.png  landscape "$SOFA. A huge blond muscular bodybuilder man in wraparound black sunglasses, a black leather waistcoat over a bare chest and blue jeans and boots is sitting back in the middle of the sofa, one arm stretched along the back of it, legs apart, completely relaxed, smoking a fat cigar held in his other hand. The sofa and the side table are drawn exactly the same as the reference image, same size, same position, same colours. $S"  "$O/lounge_empty.png" "$R"

echo "=== lounge done ==="
ls -la $O
