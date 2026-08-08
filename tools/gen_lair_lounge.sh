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

# --- CHAD smoking on the sofa: poses 1-3 of the draw, each generated FROM lounge_chad.png.
# One generation per pose, not a strip: a strip cannot hold a 141-logical sofa steady across
# four cells, and the sofa moving is the one thing that would be unforgivable here. Measured
# at 0.08% sofa drift, against >50% for the strip attempts on the bed.
SAME="This image is the SAME PICTURE as the reference image with only one thing changed. The sofa is pixel for pixel identical to the reference: the same length, the same back, the same buttoning, the same arms, the same chrome feet, drawn at exactly the same size in exactly the same position within the frame, with exactly the same margins of green around it. The man is the same man, the same size, sitting in the same place with his hips and both boots in exactly the same position. Do NOT move the sofa, do NOT resize it, do NOT redraw it, do NOT move his body or his legs. The ONLY difference from the reference image is his right arm, his head and his mouth."
MAN="A huge blond bodybuilder with a square jaw, black wraparound sunglasses, an open black leather biker vest over an enormous bare muscular chest, blue jeans and black boots, sitting back in the middle of a long black leather chesterfield sofa with his arms along the back and his legs apart, holding a fat lit cigar in his right hand"
P0=assets/ai/lair/lounge_chad.png
$G assets/ai/lair/smoke_1.png landscape "$MAN. He is lifting the cigar from the arm of the sofa up towards his face, his forearm about half way there, still looking straight ahead. $SAME $S" "$P0" &
$G assets/ai/lair/smoke_2.png landscape "$MAN. The cigar is at his lips and he is drawing on it, his chin dipped slightly and the ember at the tip glowing bright orange. $SAME $S" "$P0" &
wait
# Pose 3 draws a plume. build_lounge crops every pose to pose 0's box, which drops it - the
# plume is procedural so it can carry on across the frame changes instead of popping in and
# out with one of them.
$G assets/ai/lair/smoke_3.png landscape "$MAN. He has taken the cigar away from his mouth and tipped his head back, mouth open, blowing a long slow plume of smoke straight upward. His hand holds the cigar out to the side at chest height. $SAME $S" "$P0" &
wait
