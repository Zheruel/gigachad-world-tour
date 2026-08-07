#!/bin/bash
# gen_lair_lounge.sh - the lounge corner and the dog.
#
# The sofa ships as a matched PAIR: an empty one, and the same sofa with CHAD sitting
# in it smoking. Drawing a seated CHAD as a separate character frame would mean a new
# pose through the whole aiframes anchoring pipeline and would still land his hips in
# roughly the right place; generating him and the furniture as one picture means the
# pose is correct by construction. js/hub.js swaps one sprite for the other and hides
# the player. The second generation takes the first as a reference so they match.
#
# The dog is a horizontal walk strip - one figure repeated, per the sheet rule in
# CLAUDE.md - plus a separate sit pose, sliced by tools/slice_sheet.py.
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

echo "=== dog ==="
DOGSTYLE="32-bit arcade beat em up game pixel art sprite in the style of Streets of Rage 4, side view, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no text, no numbers, no labels, no borders, no watermark"
DOG="a lean powerful jet black doberman with cropped ears, wearing tiny wraparound black sunglasses and a thick chrome studded collar"

$G $O/dog_walk.png landscape "One horizontal row containing a six frame walk cycle of the same dog, evenly spaced, identical scale, all standing on the same ground line, with a clear band of empty flat green between each pose so they never touch. The dog is $DOG, and it is identical in every pose: same body, same colour, same collar, same sunglasses. Left to right the six poses are: 1 front left leg reaching forward and rear right leg pushing back, 2 legs passing under the body, 3 front right leg reaching forward and rear left leg pushing back, 4 legs gathered under the body, 5 front left leg planted and body at its lowest, 6 mid stride with all four legs spread. The dog faces to the right in every pose. Its head and body stay at exactly the same height and never rotate; only the legs and the tail change. $DOGSTYLE"

$G $O/dog_sit.png square "$DOG sitting down on its haunches seen from the side facing right, front legs straight, head up and alert, tail curled round, $DOGSTYLE"
echo "=== lounge and dog done ==="
ls -la $O
