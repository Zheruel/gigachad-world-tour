#!/bin/bash
# gen_props.sh - real art for the breakable stage props and the GO sign.
# The procedural pixel-art versions read as flat next to the AI backdrop.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/props

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, worn and grimy, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

echo "=== props ==="
$G $O/crate.png       square "A battered wooden market crate stacked with mangoes and green chillies spilling over the top, splintered slats, stained with fruit juice, $S" &
$G $O/crate_b.png     square "A smashed wooden market crate collapsed into a heap of broken splintered slats with squashed mangoes and chillies scattered across the ground, $S" &
$G $O/matka.png       square "A large round terracotta clay water pot with a narrow neck, dusty and chipped, sitting on the ground, $S" &
$G $O/matka_b.png     square "A shattered terracotta clay pot, broken into curved shards lying flat in a spreading puddle of spilled water on the ground, $S" &
wait
$G $O/tyres.png       square "A stack of three worn bald car tyres piled on top of each other, cracked rubber, caked in grey dust, $S" &
$G $O/tyres_b.png     square "A toppled pile of worn car tyres scattered flat across the ground, one split open, $S" &
$G $O/table.png       square "A rickety wooden chai stall table with chipped enamel and small glass chai cups and a steel kettle on top, $S" &
$G $O/table_b.png     square "A collapsed wooden table broken in half on the ground with smashed glass chai cups and a dented steel kettle scattered around it, $S" &
wait
$G $O/sign.png        square "A dented hand painted metal shop sign board in faded red and yellow hanging from a bent bracket, rusted at the edges, $S" &
$G $O/sign_b.png      square "A wrecked hand painted metal shop sign torn in half and buckled, hanging crookedly from a snapped bracket, $S" &
$G $O/rickshaw.png    landscape "A yellow and green three wheeled Indian auto rickshaw parked side on, dented bodywork, black canvas canopy, chrome handlebars, splashed with mud, $S" &
$G $O/rickshaw_b.png  landscape "A wrecked yellow and green three wheeled Indian auto rickshaw tipped over on its side, canopy torn, a wheel off, parts scattered, smoking, $S" &
wait
$G $O/cart.png        landscape "An Indian street food chaat cart on bicycle wheels with a red and white striped awning over it, big steel bowls of colourful chaat and chutneys on the counter, brass pots underneath, greasy and well used, $S" &
$G $O/cart_b.png      landscape "A wrecked Indian street food cart collapsed on its side, awning torn down, steel bowls scattered, green and orange chutney splattered everywhere across the ground, $S" &
wait

echo "=== GO sign ==="
# closer to the Streets of Rage original: fat outlined letters on a dark plate
# with a separate solid arrow, less glossy than the first attempt
$G $O/go_sign.png square "A 16-bit Sega Genesis arcade game on-screen prompt graphic, exactly in the style of Streets of Rage: the word GO in fat chunky bold capital letters filled with a bright yellow to orange vertical gradient, each letter having a thick white outline and then a hard black outline, sitting on a small dark rectangular plate, with a separate short fat solid orange arrow with a white outline pointing right beside the letters. Chunky low resolution pixel art, high contrast, no gloss, no 3d bevel, solid flat bright green chroma-key background (RGB 0,255,0), no other text, no watermark, no border"
echo "=== props done ==="
ls assets/ai/props | wc -l
