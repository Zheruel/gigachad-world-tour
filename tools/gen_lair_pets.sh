#!/bin/bash
# gen_lair_pets.sh - what lives in the tank.
#
# The tiger moved out to tools/gen_lair_tiger.sh: his rest poses have to be generated
# against a frame of his own finished walk strip, and that needs a slice in the middle of
# the script rather than one more generation alongside these.
#
# Walk and swim cycles are one horizontal strip per cycle, per the sheet rule in
# CLAUDE.md, sliced and registered by tools/build_lair_extras.py.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
mkdir -p $O

SHEET="32-bit arcade beat em up game pixel art sprite in the style of Streets of Rage 4, side view, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no water, no bubbles, no text, no numbers, no labels, no borders, no watermark"

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

echo "=== the tank ==="
# "meaner" at 34 logical px is silhouette and one loud accessory, not detail: the scars
# on the first pass barely read, and the gold chain and medallion are the thing you see.
SHARK="an enormous scarred great white shark seen in exact side profile facing right. It is MASSIVE and heavy-bodied with a huge blunt head that is deep from top to bottom, a thick muscular girth and a broad chest, and it reads as much bigger and more dangerous than an ordinary shark. Slate grey above with a hard edge into a cream white belly. Its jaws are open WIDE in a snarl showing two full rows of long jagged white teeth. A heavy scowling brow ridge sits over tiny wraparound black sunglasses. Long white scars rake across its snout and flank and a bite has been torn out of the trailing edge of its tall dorsal fin. It wears a heavy gold chain around its gills with a gold medallion hanging from it. A fat lit Cuban cigar with a red and gold band is clamped in the corner of its jaws, angled slightly upward, with a bright glowing orange ember at the tip"
$G $O/shark.png landscape "One horizontal row containing a four frame swim cycle of the same shark, evenly spaced, identical scale, all on the same horizontal line, with a clear band of empty flat green between each pose so they never touch. The shark is $SHARK, and it is identical in every pose: same body, same scars, same colour, same sunglasses, same cigar in the same place at the same angle. Left to right the four poses are: 1 tail swung fully to the left, 2 tail passing through the centre, 3 tail swung fully to the right, 4 tail passing back through the centre. The head and the body stay at exactly the same height and never rotate; only the tail and the fins change. $SHEET" &

# The tank floor: one shark needs somewhere to live, and a shoal of piranhas turned out to
# be busy rather than alive. Drawn behind him, clipped to the glass. His lounge mirrors
# CHAD's - the armchair and the whisky are the joke, and the neon lights the tank from in.
#
# A MACKEREL, not a plain silver sardine: the dark wavy bars across its back are the one
# marking that still reads at eight logical pixels, where a silver flank goes to a smudge.
#
# ONE generation for the whole floor. Two halves butted together showed their join however
# well they matched. Two things have to be said explicitly or it comes back wrong: the
# ASPECT, as a rule ("three times wider than tall") rather than implied by "the lower half",
# because otherwise it fills the square frame and lands at 1.5; and that things RISE out of
# the wreck, because a low strip of scenery under a tall column of flat blue is what the
# first version was. The shark swims in FRONT of the masts, not above them.
$G $O/tankscape.png landscape "The whole floor of an enormous aquarium seen from the side, drawn as ONE SINGLE CONTINUOUS SCENE. IMPORTANT: the COMPLETE scene, including the very tops of the masts and the kelp, must fit inside a WIDE HORIZONTAL BAND across the middle of the image that is ABOUT THREE TIMES WIDER THAN IT IS TALL. The band runs the full width of the image edge to edge. Leave a deep margin of flat green above the band and below it. Nothing may stick out of the band. It is one unbroken sweep of rippled pale sand running edge to edge with no gap and no repetition, and it is a shark's private lair built inside a sunken shipwreck: the broken stern of a galleon lies across the middle with its ribs open like a cave, a sunken red leather armchair and a small table with a bottle and a glass sit inside the hull where the shark lounges, a magenta neon sign glows on the timbers above them, a brass lantern hangs from a chain, gold coins and a burst chest of bullion spill out onto the sand, a rusted safe hangs open, a big anchor and a heavy chain lie across the foreground and a stone skull is half buried. Rising up out of the wreck are its TALL broken masts leaning over with tattered rigging and a torn sail, and there are towering columns of dark green kelp at both far ends and coral and starfish on the sand. Rich, dramatic and detailed, warm browns and golds and deep greens against pale sand, lit from above. No fish, no shark, no divers, no people. $S" &

wait

echo "=== the other tenants ==="
# Two residents in two different zones of the tank - the sand and the open water - so it
# reads as somewhere that is lived in rather than animals in a box. A moray in a gun port in
# the wreck was a third, and it went: a lot of machinery (its own porthole scaled into
# agreement frame by frame, its own startle-on-arrival rule) for a sprite you have to go
# looking for.
#
# A four frame swim cycle on a 7 logical px fish is nearly all downside. The first one swung
# the tail through a full sweep and came back with the body 20 px long in two poses and 22 in
# the other two - 31-41% of the silhouette changing between consecutive frames, which at that
# size is not swimming, it is flickering. Every dimension of the body has to be nailed down
# explicitly and only the tail FAN allowed to tilt; that reads 4-5%, which build_tenants
# prints as `churn`.
$G $O/baitfish.png landscape "One horizontal row containing a four frame swim cycle of the same fish, evenly spaced, identical scale, all on the same horizontal line, with a clear band of empty flat green between each pose so they never touch. THE FISH IS THE SAME SIZE AND SHAPE IN ALL FOUR POSES. It is EXACTLY the same length from its nose to the root of its tail in every pose, its body is exactly the same depth from back to belly in every pose, its head is in exactly the same place at exactly the same height, and its outline is identical. Its body does NOT bend, curve, arch or flex at all - it stays perfectly straight and level like a torpedo in all four. The ONLY thing that changes is the TAIL FIN itself, the small forked fan at the very back, and it moves only a LITTLE: 1 the tail fan tilted slightly up, 2 the tail fan level and straight, 3 the tail fan tilted slightly down, 4 the tail fan level and straight again. The tail fan never swings far and never swings out beyond the depth of the body. The fish is a fat healthy mackerel seen in exact side profile facing right, drawn LARGE and filling most of the height of each cell, richly detailed: a deep blue-green back crossed by bold dark wavy tiger bars, a bright mirror-silver flank below them with a faint gold sheen along the middle, a white belly, one clear round black eye with a pale ring, a visible gill plate, a small spiny dorsal fin, paired pectoral fins and a deeply forked tail. $SHEET" &
wait

$G $O/crab.png landscape "One horizontal row containing a four frame walk cycle of the same crab, evenly spaced, identical scale, all standing on the same ground line, with a clear band of empty flat green between each pose so they never touch. The crab is a big deep red armoured crab seen from the side facing right, with a heavy knobbled shell, black bead eyes on stalks and two large claws, and it holds a single GOLD COIN pinched in its raised right claw in every frame. It is identical in every pose: same shell, same colour, same coin. Left to right the four poses are: 1 legs gathered under it, 2 mid stride with the legs spread forward, 3 legs gathered again, 4 mid stride with the legs spread back. Its body and its claws stay at exactly the same height and never rotate; only the legs change. $SHEET" &
wait

echo "=== pets done ==="
ls -la $O
