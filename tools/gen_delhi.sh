#!/bin/bash
# gen_delhi.sh - Stage 1 CHANDNI CHOWK backdrop plates + floor.
# build_bgs.py crops a 362px band off the bottom of each plate (the floor line)
# and stitches them left-to-right into assets/bg_delhi_wall.png.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling street seen straight from the side with no perspective distortion, highly detailed pixel art, warm hazy afternoon light with dust in the air, rich saturated colour, no people, no characters, no text in latin letters, no watermark, no border, no user interface"

DELHI="a packed Old Delhi street market in Chandni Chowk, crumbling colourful shopfronts with faded paint, striped cloth awnings, an enormous tangle of black electrical wires strung overhead between poles"

$G $O/bg_delhi_a.png landscape "$DELHI, spice merchant stalls with open jute sacks of red orange and yellow powder, brass scales, stacked tins, $BG" &
$G $O/bg_delhi_b.png landscape "$DELHI, sari and fabric shops with long bolts of bright silk hanging down like curtains, mannequins in a window, marigold garlands strung across, $BG" &
$G $O/bg_delhi_c.png landscape "$DELHI, a chai stall with a steaming urn and a clay tandoor oven glowing orange, stacked glasses, plastic stools, a hand painted metal shop sign, $BG" &
wait

$G $O/bg_delhi_d.png landscape "$DELHI, a crumbling three storey mughal haveli facade with carved wooden balconies, peeling blue and pink plaster, laundry hanging from the railings, pigeons on a ledge, $BG" &
$G $O/bg_delhi_e.png landscape "$DELHI, a grand old stone archway gateway at the end of the street with a domed roof behind it, hanging brass lanterns, stone steps, $BG" &
$G $O/bg_delhi_floor.png landscape "seamless horizontally tileable top-down slightly angled view of a dusty cracked stone and asphalt street surface in an Indian market, scattered spilled orange and yellow spice powder, flattened cardboard, drain covers, tyre marks, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no people, no objects, no text, no watermark, no letters, no signature" &
wait

echo "=== delhi plates done ==="
ls -la assets/ai/bg_delhi_*.png
