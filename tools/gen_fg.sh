#!/bin/bash
# gen_fg.sh - the foreground layer. The stage had none at all, which is why it read
# as a painting behind a fight rather than a street the fight is happening inside.
#
# Two bands only, both chosen so nothing ever covers the fighting:
#   TOP    - things hanging above the street. The fighters never go above y=181.
#   BOTTOM - things whose base is below the screen edge, poking up into the last
#            ~30 logical px in front of the near depth lane.
# Anything in the middle would hide the fight, so nothing is generated for it.
#
# Foreground pieces are lit as near-camera objects: darker and higher contrast than
# the backdrop, which is what makes the eye read them as closer.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/fg

S="32-bit arcade beat em up game foreground object sprite in the style of Streets of Rage 4: highly detailed pixel art, crisp dark 1px outline, warm amber and rust palette against deep shadow, worn grimy and dusty Old Delhi street furniture. This object is CLOSE TO THE CAMERA so it is darker and more contrasty than a background object - deep shadow with warm rim light picking out only the top edges. Single object, seen from the side, solid flat bright green chroma-key background (RGB 0,255,0), no ground line, no people, no text, no watermark, no border"

echo "=== hanging above the street ==="
$G $O/wires.png    landscape "A dense tangled bundle of black electrical cables and telephone wires strung across the top of a street, sagging in loops, with a few torn kite strings and a scrap of plastic bag caught in them, hanging DOWN from the top edge of the image with empty green below, $S" &
$G $O/tarp.png     landscape "The torn corner of a blue and white striped plastic tarpaulin awning, sun bleached and frayed, hanging down from the top edge of the image with a knotted rope and a bent metal pole, empty green below, $S" &
$G $O/garland.png  landscape "Several long strings of orange and yellow marigold flower garlands and small brass bells hanging down from the top edge of the image, wilting, dusty, empty green below, $S" &
$G $O/banner.png   landscape "Three faded hand painted cloth shop banners in red and green with Devanagari lettering, torn at the hems, hanging down from a wire at the top edge of the image, empty green below, $S" &
wait

echo "=== standing in front of the street ==="
$G $O/fg_crates.png  landscape "A stack of battered wooden market crates and bulging hessian sacks piled up, spilling straw and a few onions, seen from the side at very close range, $S" &
$G $O/fg_bike.png    landscape "An old black Indian roadster bicycle with a rusted frame and a wire basket, leaning over, seen from the side at very close range, $S" &
$G $O/fg_bins.png    landscape "A heap of split rubbish bags, flattened cardboard and a dented steel drum spilling refuse, seen from the side at very close range, $S" &
$G $O/fg_stall.png   landscape "The back of a small wooden chai stall table with two upturned plastic stools and a stack of steel pots, seen from behind at very close range, $S" &
wait

echo "=== fg done ==="
ls assets/ai/fg
