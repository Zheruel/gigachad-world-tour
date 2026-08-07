#!/bin/bash
# gen_dojo.sh - the dojo hub room plate and the heavy bag prop.
# The plate is the same room as the title key art, generated deserted and straight
# on so it can be split into a wall/floor pair by tools/build_dojo.py.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/dojo
mkdir -p $O assets/ai/props

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, warm amber light with deep shadow in the corners, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues of people"

$G $O/room.png landscape "The private akhara training dojo of a gigachad brawler inside a crumbling Mughal haveli in Old Delhi, the same room as the reference image but seen flat side on and empty. The LEFT half of the wall is a large bare pinboard of weathered plaster and dark wood with absolutely nothing pinned to it, an empty noticeboard, blank wall space. The RIGHT half of the wall is a gear wall: a rack of wooden mace clubs, coiled hand wraps on pegs, a tall speckled mirror, stacked stone ring weights, a brass bell hanging in a small arch, marigold garlands on peeling blue plaster. Carved stone screens high up throw warm shafts of light. The bottom 28 percent of the image is a flat raked red earth and stone floor running the full width, with a clean horizontal seam where it meets the wall. $EMPTY. $BG" assets/ai/lair/lair_c.png &

$G assets/ai/props/bag.png square "A tall heavy leather punching bag hanging from a short thick steel chain, dark brown patched leather with duct tape bands around the seams, scuffed and worn, hanging free in the air with nothing below it, the chain visible at the top. 32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border" &
wait

echo "=== dojo done ==="
ls -la $O assets/ai/props/bag.png
