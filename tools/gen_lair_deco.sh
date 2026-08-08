#!/bin/bash
# gen_lair_deco.sh - the furniture the widened lair gains.
#
# The gym is not here: tools/gen_lair_gym.sh owns everything in front of the glass,
# because the two usable stations have to be generated as strips rather than as single
# objects. The bar counter, the joint columns and the supercar are gone too - the plate
# paints its own bar, the panel joins turned out to be invisible without covering them,
# and the car was taking the best stretch of window away from the gym.
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

# The humidor stands free again: built flush into the panelling it read as joinery
# rather than as something CHAD owns. Much wider than the narrow case it replaces.
$G $O/humidor.png portrait "A grand glass fronted walnut cigar humidor cabinet standing on the floor, seen from the side at a very slight three quarter angle so one side panel shows. It is WIDE and IMPOSING, roughly twice as wide as a narrow display case: a heavy burled walnut carcass on a moulded plinth with a deep cornice at the top, DOUBLE bevelled glass doors with slim brass frames and two long brass handles meeting in the middle, brass hinges, and four full width shelves behind the glass absolutely packed with open cedar cigar boxes and neat rows of cigars in tan and chestnut browns. A warm amber light glows from inside the cabinet and spills through the glass. A crystal ashtray and a heavy brass cigar cutter stand on top of the cornice. It stands in a 1990s penthouse panelled in dark walnut with gold mouldings and lit by warm lamps. $S" &
wait

# The back bar. The plate paints three shelves of near-identical amber bottles, which is
# the one thing in the room that reads as wallpaper. These two rows go over the lit ones.
# They are NOT generated at the shelf's width: a row comes back at whatever aspect it
# likes (3.8 and 4.3 against the shelf's 5.0), so build_bar() in tools/build_lair_extras.py
# cuts the bottles apart and deals them out to fit. Ask for the gaps or that cut is
# impossible, and ask for no shelf or the shelf comes with them.
ROW="drawn as ONE WIDE HORIZONTAL STRIP filling the width of the image and only a narrow band tall, with flat green above and below it. The bottles stand in a single straight row, all with their bases on the same line, evenly spaced with a small gap between each one so none of them touch or overlap. They are lit warmly from directly above by a shelf downlight, bright on the shoulders of the bottles and falling into shadow lower down. No shelf, no wood, no rail, no glass, no background of any kind behind them - only the bottles themselves against flat green."
$G $O/bar_top.png landscape "A row of twelve VERY DIFFERENT premium whisky bottles on a collector's back bar, $ROW Every bottle is a different shape, a different height and a different colour of glass and label, and they read at a glance as coming from all over the world: a tall slim Japanese whisky bottle in clear glass with a plain white label and black brush lettering, a squat heavy Islay scotch in dark green glass, a classic Irish whiskey bottle in pale gold with a cream label, a bulbous cognac decanter, a square bourbon bottle in amber with a red wax seal over the neck, a tall Highland malt with a black label and a gold band, a slender clear bottle of rye, a rounded green Japanese bottle with a red seal, a heavy crystal decanter with a faceted stopper and a silver neck tag, a dumpy brown flask shaped bottle, a very tall thin bottle in smoked grey glass, and a short wide bottle of amber rum with a brass cap. $S" &
$G $O/bar_low.png landscape "A row of eleven VERY DIFFERENT premium spirit bottles on a collector's back bar, $ROW Every bottle is a different shape, a different height and a different colour of glass and label: a tall dark green champagne bottle with gold foil, a heavy square crystal whisky decanter with a faceted stopper, a slim clear Japanese whisky bottle with a plain white label, a rounded amber sherry cask scotch, a black bottle with a silver label, a wide squat bottle of aged rum with a rope tied round its neck, a tall pale gold Irish whiskey, a clear bottle of gin with a blue label, a small stubby bottle of dark liqueur, a tall bourbon bottle with a red wax seal, and a curved decanter of cognac with a gold neck band. $S" &
wait

# CHAD taking a drink. Only him - the bar counter is painted into the plate, so unlike the
# gym stations there is no rig in the set. Pose 0 is the one that matters: build_bardrink
# scales the whole set off it, because pose 3 holds the glass above his head and that is
# not part of a man's height.
DRINKER="a huge blond bodybuilder with a square jaw, black wraparound sunglasses, an open black leather biker vest over an enormous bare muscular chest, blue jeans and black boots, holding a heavy cut crystal tumbler of amber whisky in his right hand"
DSHEET="32-bit arcade beat em up game pixel art sprite in the style of Streets of Rage 4, side view facing right, standing upright with his feet flat on the ground, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no text, no numbers, no labels, no borders, no watermark"
$G $O/bar_drink.png landscape "One horizontal row containing five poses of the same man, evenly spaced, identical scale, all standing on the same ground line, with a clear band of empty flat green between each pose so they never touch. The man is $DRINKER, and he is identical in every pose: same body, same face, same sunglasses, same vest, same jeans, same boots, same glass. Left to right the five poses are: 1 standing square with the glass held down at his hip, looking ahead; 2 the glass raised half way to his chest, elbow bending; 3 the glass at his lips, chin lifting; 4 head tipped right back and the glass tipped fully up as he drains it; 5 head level again, the empty glass lowered to his chest, chin up and a satisfied grin. His feet stay planted in exactly the same place in all five poses and his hips never move; only his arm, his head and his expression change. $DSHEET" $R &
wait

echo "=== furniture ==="
$G $O/bag_chain.png    portrait  "A single heavy galvanised steel chain hanging straight down, thick oval links, a flat steel ceiling mounting bracket with bolts at the very top and a heavy steel swivel shackle at the very bottom, the chain perfectly vertical and taut, nothing else in the image, $S" &
wait

echo "=== the portrait ==="
$G $O/portrait.png landscape "A huge ornate oil painting in a very heavy carved gilt gold frame, hanging on a wall. The painting is a grand Renaissance style heroic portrait of a colossally muscular blond man with a square jaw and wraparound black sunglasses, bare chested under an open black leather waistcoat, one fist on his hip, standing in a dramatic three quarter pose against a stormy classical sky with cherubs, painted in rich oils with heavy chiaroscuro. The gold frame is thick and elaborate with scrollwork. Seen straight on and flat. $S" "$R"

echo "=== foreground ==="
$G $F/fg_table.png landscape "A low rectangular smoked glass coffee table seen from the side, thick glass top, polished brass frame and legs, a stack of magazines and a heavy crystal ashtray on it, $L, $S" &
$G $F/fg_lamp.png  portrait  "A tall brass arc floor lamp seen from the side, a heavy round marble base with a long curving brass arm sweeping up and over, a domed brass shade at the end of it, $S" &
wait

echo "=== deco done ==="
ls -la $O $F
