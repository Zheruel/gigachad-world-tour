#!/bin/bash
# gen_delhi3.sh - Chandni Chowk plates, pass 3: EMPTY.
# Pass 2 painted the stall holders in, which froze them. The people are now animated
# sprites placed on top (see gen_npcs.sh), so the plates must have nobody in them -
# every stall staffed but unmanned, every stool empty.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling street seen straight from the side with no perspective distortion, highly detailed pixel art, warm hazy afternoon light thick with dust, rich saturated colour, deep shadow under every awning, no text in latin letters, no watermark, no border, no user interface"

# repeated hard so nothing sneaks a person in
EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no crowd, every stall unattended and every stool and chair empty"

DIRT="genuinely filthy and lived in: cracked stained walls with damp patches and black mould, layers of torn peeling posters, rusted corrugated metal, dripping air conditioner units, bulging refuse sacks and scattered litter piled along the walls, food waste and squashed fruit trodden into the ground, dark grease stains, puddles of dirty water"

DELHI="a packed Old Delhi street market in Chandni Chowk, crumbling colourful shopfronts, filthy striped cloth awnings, an enormous chaotic tangle of black electrical wires sagging overhead between leaning poles"

echo "=== delhi pass 3 (empty) ==="
$G $O/bg_delhi3_a.png landscape "$DELHI, spice merchant stalls with open jute sacks of red orange and yellow powder, brass scales hanging unused, stacked tins, $EMPTY, $DIRT, $BG" &
$G $O/bg_delhi3_b.png landscape "$DELHI, cramped sari and fabric shops with bolts of bright silk hanging down, marigold garlands, an idle sewing machine on a bare counter, $EMPTY, $DIRT, $BG" &
$G $O/bg_delhi3_c.png landscape "$DELHI, a chai stall with a steaming urn and a glowing clay tandoor oven, rows of empty glasses, empty plastic stools, a butcher shop beside it with meat on hooks and a bare chopping block, $EMPTY, $DIRT, $BG" &
wait
$G $O/bg_delhi3_d.png landscape "$DELHI, a crumbling three storey mughal haveli with carved wooden balconies, peeling blue and pink plaster, washing hung from the railings, an empty barber shopfront below with an unoccupied barber chair and a mirror, $EMPTY, $DIRT, $BG" &
$G $O/bg_delhi3_e.png landscape "$DELHI, a soot blackened stone archway at the end of the street with a domed roof behind it, hanging brass lanterns, a sweet shop and a juice stall crammed either side with unattended counters, $EMPTY, $DIRT, $BG" &
$G $O/bg_delhi3_floor.png landscape "seamless horizontally tileable top-down slightly angled view of a filthy cracked stone and broken asphalt street in an Indian market, potholes filled with dirty water, spilled orange and yellow spice powder trodden in, squashed fruit, scattered litter and torn paper, flattened cardboard, drain covers, dried mud and tyre marks, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark, no letters, no signature" &
wait

echo "=== delhi pass 3 done ==="
ls -la assets/ai/bg_delhi3_*.png
