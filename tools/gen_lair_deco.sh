#!/bin/bash
# gen_lair_deco.sh - the furniture the widened lair gains, plus the two gym pieces that
# came out wrong the first time.
#
# gym_squat is retired: a power rack is genuinely ambiguous seen from a pure side view,
# which is why the old one read as lying on the floor. A bench with two short uprights
# and a loaded bar is not ambiguous from the side.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
F=assets/ai/fg
mkdir -p $O $F

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

# The room is walnut, brass and oxblood lit by magenta and cyan neon; furniture that is
# all chrome disappears into the wall behind it.
L="dark walnut wood, polished brass and oxblood leather, lit by magenta and cyan neon"

echo "=== furniture ==="
$G $O/bar.png          landscape "A wet bar counter seen from the side, a walnut cabinet front with a polished brass foot rail along the bottom and a thick veined marble top, two low backed bar stools in oxblood leather with brass legs standing at it, one cut crystal decanter and two tumblers on the counter, $L, $S" &
$G $O/humidor.png      portrait  "A tall narrow glass fronted walnut cigar humidor cabinet standing on the floor, brass hinges and a brass handle, three shelves of cigar boxes and loose cigars visible through the glass, warm amber light glowing from inside the cabinet, $L, $S" &
$G $O/column.png       portrait  "A single floor to ceiling square structural pier seen from the side, clad in dark walnut panelling with polished brass edge trim running its full height and a thin magenta neon seam down one edge, plain and featureless, $L, $S" &
$G $O/bag_chain.png    portrait  "A single heavy galvanised steel chain hanging straight down, thick oval links, a flat steel ceiling mounting bracket with bolts at the very top and a heavy steel swivel shackle at the very bottom, the chain perfectly vertical and taut, nothing else in the image, $S" &
wait

$G $O/supercar.png     landscape "A 1990s wedge shaped Italian supercar parked and seen in exact side profile, low sharp angular body in pearl white with gold five spoke wheels, a huge rear wing, pop up headlights closed, wide rear haunches with air intakes, scissor door slightly ajar, gleaming paint, $S" &
$G $O/gym_bench.png    landscape "A flat black leather weight bench seen from the side with a two post barbell rack standing at the head of it, a loaded olympic barbell resting across the top of the two posts with three big black iron plates on each end, heavy black steel frame with a wide flat base, $S" &
$G $O/gym_rack.png     landscape "A low wide two tier dumbbell rack seen from the side, made of heavy black powder coated steel with thick angled end frames, loaded with six black cast iron hex head dumbbells on each tier, each dumbbell a knurled steel handle with a chunky six sided black iron weight at both ends, the dumbbells getting visibly larger from left to right, heavy and industrial, $S" &
$G $O/gym_plates.png   portrait  "A black steel weight plate tree seen from the side, a vertical post with six horizontal pegs, each peg loaded with a stack of black cast iron olympic weight plates, a heavy cross shaped base, $S" &
wait

echo "=== the portrait ==="
$G $O/portrait.png landscape "A huge ornate oil painting in a very heavy carved gilt gold frame, hanging on a wall. The painting is a grand Renaissance style heroic portrait of a colossally muscular blond man with a square jaw and wraparound black sunglasses, bare chested under an open black leather waistcoat, one fist on his hip, standing in a dramatic three quarter pose against a stormy classical sky with cherubs, painted in rich oils with heavy chiaroscuro. The gold frame is thick and elaborate with scrollwork. Seen straight on and flat. $S" "$R"

echo "=== foreground ==="
$G $F/fg_table.png landscape "A low rectangular smoked glass coffee table seen from the side, thick glass top, polished brass frame and legs, a stack of magazines and a heavy crystal ashtray on it, $L, $S" &
$G $F/fg_lamp.png  portrait  "A tall brass arc floor lamp seen from the side, a heavy round marble base with a long curving brass arm sweeping up and over, a domed brass shade at the end of it, $S" &
wait

echo "=== deco done ==="
ls -la $O $F
