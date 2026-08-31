#!/bin/bash
# gen_d1_plates.sh - DIRTY DELHI wall panels and floor detail textures.
#
# The route is 12480 logical px in six areas, and each area is generated as its own
# short chain rather than one 26-panel run: a join INSIDE an area is nearly free (the
# model drew the neighbour against the same description), and a join BETWEEN areas
# lands on an architectural divider the level wanted anyway. Seven hard joins, not 25.
#
# Panels are stitched by tools/build_dirty_delhi.py. The floor textures are NOT floors -
# they are the tiling detail blend the stitcher lays over the floor band, the same job
# market_floor_detail.png does for bazaar_v2.
#
# Usage: tools/gen_d1_plates.sh [derisk|market|river|floors|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d1
mkdir -p $O

WHAT="${1:-all}"

# ---- shared blocks -------------------------------------------------------
EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no crowd, every stall unattended and every seat empty"

BG_MARKET="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling street seen straight from the side with no perspective distortion, highly detailed pixel art, hard white midday sun and deep black shadow under every awning, thick dust in the air, rich saturated colour, no text in latin letters, no watermark, no border, no user interface"

BG_RIVER="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling riverside seen straight from the side with no perspective distortion, highly detailed pixel art, dusk turning to night, sodium orange lamplight against green black water, heavy humid haze, no text in latin letters, no watermark, no border, no user interface"

DIRT="genuinely filthy and lived in: cracked stained walls with damp patches and black mould, layers of torn peeling posters, rusted corrugated metal, dripping air conditioner units, refuse sacks and scattered litter, squashed fruit trodden into the ground, grease stains, puddles of dirty water"

FILTH="catastrophically polluted: thick white chemical foam piled along the waterline, black oily water, plastic bottles and torn bags caught in everything, silt caked on the stone, rusted pipes weeping brown stains, rotting marigold garlands"

STREET="a packed Old Delhi street market in Chandni Chowk at noon, crumbling colourful shopfronts, filthy striped cloth awnings, an enormous chaotic tangle of black electrical wires sagging overhead between leaning poles"

GHAT="the bank of a poisoned river behind an Indian city, crumbling stone ghat steps going down into the water, brick drain outfalls, leaning corrugated shacks above the bank"

# Every panel is cut into a wall band above the kerb and a floor band below it, so the
# kerb line has to be findable and at roughly the same height in every panel of a chain.
FRAME="The horizon and the kerb line run dead level across the whole width of the image. The bottom third of the image is the empty road or ground surface with nothing standing on it, so a fighter can walk across it. Keep the middle of the image visually calm and uncluttered."

# ---- de-risk: the two panels that can invalidate the plan -----------------
# The drain has to hold TWO environments and both dividers in one frame, and it carries
# the market-to-river floor transition. If that does not work, the level needs two floor
# plates and drawStage needs a per-band loop.
derisk() {
$G $O/wall_drain_a.png landscape "A covered brick drain culvert running left to right beneath an Indian city, seen straight from the side with no perspective distortion. The left hand end is a tall brick arch mouth opening back onto a sunlit market street, the rest is dark wet tunnel: slimy brick barrel roof dripping water, a rusted sluice gate with an iron winding wheel, standing black water down the middle of the floor, one bare bulb hanging on a flex, green-black algae up the walls. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &

# The level boss has to read as a machine at 181 logical px of wall band. Judged by
# cropping at final size, never by looking at the generation.
$G $O/wall_pontoon_c.png landscape "$GHAT, seen straight from the side: a pontoon of old wooden boats lashed together end to end along the waterline, and rising behind them the enormous black rusted hulk of a half sunk sand dredger - a riveted steel hull down in the water, a tall lattice crane gantry, a long crane arm reaching out over the water and a huge clamshell grab bucket hanging from it on a chain, a small filthy control cab with a dark window high on the hull. The machine is the biggest thing in the picture and fills most of the height. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
wait
}

# ---- the market half: x 0-5000 -------------------------------------------
market() {
$G $O/wall_market_a.png landscape "$STREET, the quiet end of the street: half closed steel roller shutters, a shuttered sweet shop, stacked wooden crates and clay pots against the wall, one bare bulb hanging unlit, a leaning wooden electricity pole. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
$G $O/wall_market_b.png landscape "$STREET, spice merchants: open jute sacks of red orange and yellow powder stacked outside the shopfronts, brass weighing scales, hanging bundles of dried chillies, a chai stall with a steaming urn and empty plastic stools. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
$G $O/wall_market_c.png landscape "$STREET, a small open square where the market widens out, with an old peepal tree growing straight up through the broken paving, a low stone plinth, a shuttered temple doorway, and blank crumbling plaster walls either side. The centre of the image is wide, open and uncluttered. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
wait

$G $O/wall_food_a.png landscape "$STREET, the food lane: griddle stalls with huge blackened iron tawas, deep frying vats of dark oil, racks of hanging steel bowls and ladles, a sweet shop counter with trays of mithai behind glass, thick smoke and steam trapped under the awnings. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
$G $O/wall_food_b.png landscape "$STREET, the far end of the food lane: soot blackened brick, a tandoor oven set into the wall, stacked aluminium pots, a chimney flue running up the facade, greasy cloth awnings hanging low and heavy. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
$G $O/wall_wire_a.png landscape "$STREET, the wire market: the enormous black cable tangle brought down low across the whole width on leaning poles and awning frames at two heights, a dead neon sign, electrical goods shops, handcarts and stacked tyres, paper kites caught in the wires. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
wait

$G $O/wall_wire_b.png landscape "$STREET, the wire market with every steel roller shutter pulled right down and padlocked, blank shuttered fronts the whole width, the cable tangle sagging low overhead on iron brackets bolted to the awning frames, a dead street with nobody in it. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
$G $O/wall_wire_c.png landscape "$STREET, the end of the wire market where the street runs into a blank brick wall pierced by a tall arched drain mouth, dark inside, water running out of it across the road; the overhead cable tangle stops dead at the wall on its last leaning pole. $EMPTY, $DIRT, $FRAME, $BG_MARKET" &
wait
}

# ---- the drain and the river: x 5000-12480 -------------------------------
river() {
$G $O/wall_drain_b.png landscape "The middle of a covered brick drain culvert running left to right, seen straight from the side, almost dark: slimy brick barrel roof dripping, rusted iron pipes and brackets along the wall, standing black water on the floor, green-black algae, a single bare bulb on a flex casting one small pool of light. Very dark, very quiet, nothing to see but wet brick. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_drain_c.png landscape "A covered brick drain culvert running left to right, seen straight from the side, with a collapsed section: fallen brickwork, a rusted iron ladder bolted to the wall going up to a dark shaft, thick roots hanging through the roof, standing black water, one bare bulb far off in the distance. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_drain_d.png landscape "The river end of a covered brick drain culvert, seen straight from the side: the right hand half of the image is a huge open arch mouth looking out onto a poisoned river at dusk with a far bank on the horizon and white chemical foam on the water, the left hand half is still dark wet tunnel brick. The light changes across the image from black to sodium orange. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
wait

$G $O/wall_ghat_a.png landscape "$GHAT, the outfall: an enormous concrete pipe mouth set into the bank pouring grey water and thick white foam out into the river, rusted iron railings, stacked blue chemical drums, the far bank low on the horizon. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_ghat_b.png landscape "$GHAT, the dhobi ghat: long lines of white sheets hung out to dry across the whole width on ropes strung between iron posts, flat stone washing slabs at the water's edge, tin roofed washing sheds behind. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_ghat_c.png landscape "$GHAT, wide shallow stone steps going down to the water, a beached wooden rowing boat lying on its side half buried in black silt, a small marigold covered jetty, tin tea stalls shuttered at the top of the steps. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
wait

$G $O/wall_ghat_d.png landscape "$GHAT, a derelict stretch of bank: collapsed stone revetment, a rusted iron mooring bollard, a half sunk wooden boat rotting in the shallows, leaning corrugated shacks above, sodium lamps on bent poles. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_pontoon_a.png landscape "$GHAT, a pontoon of old wooden boats lashed together end to end along the waterline with planks laid across them, oil drums used as floats, coiled rope and rusted chain, a low crane jib silhouetted far off downriver. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
$G $O/wall_pontoon_b.png landscape "$GHAT, a working spoil yard on a pontoon: heaps of wet dredged river sand and silt, a rusted conveyor frame, stacked steel plate, iron chain and shackles, oil drums, the black water beyond. $EMPTY, $FILTH, $FRAME, $BG_RIVER" &
wait
}

# ---- floor detail textures (blends, not floor plates) --------------------
floors() {
$G $O/floor_market.png landscape "seamless horizontally tileable top-down slightly angled view of a filthy cracked stone and broken asphalt street in an Indian market, potholes of dirty water, spilled spice powder trodden in, squashed fruit, litter, drain covers, tyre marks, hard midday sun with sharp black shadows, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
$G $O/floor_drain.png landscape "seamless horizontally tileable top-down slightly angled view of a wet brick culvert floor with standing black water down the middle, slimy green-black algae, silt, fallen brick, rusted iron gratings, almost no light, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
$G $O/floor_river.png landscape "seamless horizontally tileable top-down slightly angled view of wet silted stone ghat steps and cracked concrete at a river edge, black river mud, white chemical foam scum along one edge, plastic litter trodden into the silt, puddles reflecting orange sodium light, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
wait
}

case "$WHAT" in
  derisk) derisk;;
  market) market;;
  river)  river;;
  floors) floors;;
  all)    derisk; market; river; floors;;
esac

echo "=== $WHAT done ==="
ls -la $O
