#!/bin/bash
# gen_delhi2.sh - Chandni Chowk backdrop, pass 2.
# The first pass read as a clean tourist-brochure bazaar. This one is dirtier,
# more crowded and has stall-holders actually working in the shopfronts, which
# is what makes the street feel lived in when you scroll past it.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling street seen straight from the side with no perspective distortion, highly detailed pixel art, warm hazy afternoon light thick with dust, rich saturated colour, deep shadow under every awning, no text in latin letters, no watermark, no border, no user interface"

# The grime clause does most of the work here.
DIRT="genuinely filthy and lived in: cracked and stained walls with damp patches and black mould, layers of torn peeling posters and flyers, rusted corrugated metal, dripping air conditioner units, bulging refuse sacks and scattered litter piled at the base of the walls, food waste and squashed fruit trodden into the ground, stray dogs asleep against the wall, crows picking at rubbish, dark grease stains, puddles of dirty water"

DELHI="a packed Old Delhi street market in Chandni Chowk, crumbling colourful shopfronts, filthy striped cloth awnings, an enormous chaotic tangle of black electrical wires sagging overhead between leaning poles"

VEND="Indian stall holders working behind their counters seen from the side, small in the background and clearly part of the scenery"

echo "=== delhi pass 2 ==="
$G $O/bg_delhi2_a.png landscape "$DELHI, spice merchant stalls with open jute sacks of red orange and yellow powder spilling onto the filthy ground, brass scales, stacked tins, $VEND weighing spices, $DIRT, $BG" &
$G $O/bg_delhi2_b.png landscape "$DELHI, cramped sari and fabric shops with bolts of bright silk hanging down, marigold garlands, a tailor at a sewing machine and a shopkeeper sat cross legged on a counter, $DIRT, $BG" &
$G $O/bg_delhi2_c.png landscape "$DELHI, a busy chai stall with a steaming urn and a glowing clay tandoor oven, a chai wallah pouring tea from height into glasses, plastic stools, a butcher shop next to it with meat hanging on hooks, $DIRT, $BG" &
wait
$G $O/bg_delhi2_d.png landscape "$DELHI, a crumbling three storey mughal haveli with carved wooden balconies, peeling blue and pink plaster, washing hung from the railings, pigeons and monkeys on the ledges, a barber shaving a customer in a tiny shopfront below, $DIRT, $BG" &
$G $O/bg_delhi2_e.png landscape "$DELHI, a grand soot blackened stone archway at the end of the street with a domed roof behind it, hanging brass lanterns, a sweet shop and a juice stall crammed either side of it with vendors behind the counters, $DIRT, $BG" &
$G $O/bg_delhi2_floor.png landscape "seamless horizontally tileable top-down slightly angled view of a filthy cracked stone and broken asphalt street in an Indian market, potholes filled with dirty water, spilled orange and yellow spice powder trodden in, squashed fruit, scattered litter and torn paper, flattened cardboard, drain covers, dried mud and tyre marks, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no people, no text, no watermark, no letters, no signature" &
wait

echo "=== delhi pass 2 done ==="
ls -la assets/ai/bg_delhi2_*.png
