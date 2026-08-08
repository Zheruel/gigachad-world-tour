#!/bin/bash
# gen_lair_pets.sh - what lives in the lair: the tank's occupants and the tiger.
#
# The tiger is white on purpose. The room is walnut, black glass and black granite, and
# a dark animal sinks into it - the doberman already half vanishes in the unlit
# stretches. White fur reads at any size, and stripes survive the downscale where flat
# fur turns into a blob.
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

TIGER="a huge white Bengal tiger with black stripes, pale blue eyes, wearing tiny wraparound black sunglasses and a thick brass studded leather harness across its chest"

echo "=== the tank ==="
# "meaner" at 34 logical px is silhouette and one loud accessory, not detail: the scars
# on the first pass barely read, and the gold chain and medallion are the thing you see.
SHARK="an enormous scarred great white shark seen in exact side profile facing right. It is MASSIVE and heavy-bodied with a huge blunt head that is deep from top to bottom, a thick muscular girth and a broad chest, and it reads as much bigger and more dangerous than an ordinary shark. Slate grey above with a hard edge into a cream white belly. Its jaws are open WIDE in a snarl showing two full rows of long jagged white teeth. A heavy scowling brow ridge sits over tiny wraparound black sunglasses. Long white scars rake across its snout and flank and a bite has been torn out of the trailing edge of its tall dorsal fin. It wears a heavy gold chain around its gills with a gold medallion hanging from it. A fat lit Cuban cigar with a red and gold band is clamped in the corner of its jaws, angled slightly upward, with a bright glowing orange ember at the tip"
$G $O/shark.png landscape "One horizontal row containing a four frame swim cycle of the same shark, evenly spaced, identical scale, all on the same horizontal line, with a clear band of empty flat green between each pose so they never touch. The shark is $SHARK, and it is identical in every pose: same body, same scars, same colour, same sunglasses, same cigar in the same place at the same angle. Left to right the four poses are: 1 tail swung fully to the left, 2 tail passing through the centre, 3 tail swung fully to the right, 4 tail passing back through the centre. The head and the body stay at exactly the same height and never rotate; only the tail and the fins change. $SHEET" &

# The tank floor: one shark needs somewhere to live, and a shoal of piranhas turned out to
# be busy rather than alive. Drawn behind him, clipped to the glass. His lounge mirrors
# CHAD's - the armchair and the whisky are the joke, and the neon lights the tank from in.
#
# ONE generation for the whole floor. Two halves butted together showed their join however
# well they matched. Two things have to be said explicitly or it comes back wrong: the
# ASPECT, as a rule ("three times wider than tall") rather than implied by "the lower half",
# because otherwise it fills the square frame and lands at 1.5; and that things RISE out of
# the wreck, because a low strip of scenery under a tall column of flat blue is what the
# first version was. The shark swims in FRONT of the masts, not above them.
$G $O/tankscape.png landscape "The whole floor of an enormous aquarium seen from the side, drawn as ONE SINGLE CONTINUOUS SCENE. IMPORTANT: the COMPLETE scene, including the very tops of the masts and the kelp, must fit inside a WIDE HORIZONTAL BAND across the middle of the image that is ABOUT THREE TIMES WIDER THAN IT IS TALL. The band runs the full width of the image edge to edge. Leave a deep margin of flat green above the band and below it. Nothing may stick out of the band. It is one unbroken sweep of rippled pale sand running edge to edge with no gap and no repetition, and it is a shark's private lair built inside a sunken shipwreck: the broken stern of a galleon lies across the middle with its ribs open like a cave, a sunken red leather armchair and a small table with a bottle and a glass sit inside the hull where the shark lounges, a magenta neon sign glows on the timbers above them, a brass lantern hangs from a chain, gold coins and a burst chest of bullion spill out onto the sand, a rusted safe hangs open, a big anchor and a heavy chain lie across the foreground and a stone skull is half buried. Rising up out of the wreck are its TALL broken masts leaning over with tattered rigging and a torn sail, and there are towering columns of dark green kelp at both far ends and coral and starfish on the sand. Rich, dramatic and detailed, warm browns and golds and deep greens against pale sand, lit from above. No fish, no shark, no divers, no people. $S" &

wait

echo "=== the tiger ==="
$G $O/tiger_walk.png landscape "One horizontal row containing a six frame walk cycle of the same tiger, evenly spaced, identical scale, all standing on the same ground line, with a clear band of empty flat green between each pose so they never touch. The tiger is $TIGER, and it is identical in every pose: same body, same stripes, same colour, same harness, same sunglasses. Left to right the six poses are: 1 front left paw reaching forward and rear right leg pushing back, 2 legs passing under the body, 3 front right paw reaching forward and rear left leg pushing back, 4 legs gathered under the body, 5 front left paw planted and the body at its lowest, 6 mid stride with all four legs spread. The tiger faces to the right in every pose. Its head and body stay at exactly the same height and never rotate; only the legs and the tail change. $SHEET" &
wait

$G $O/tiger_lie.png square "$TIGER lying down asleep on its side seen from the side facing right, front paws stretched out forward, head resting down on them, eyes closed behind the sunglasses, tail curled round, completely relaxed and flat to the ground, $S" &
$G $O/tiger_sit.png square "$TIGER sitting up on its haunches seen from the side facing right, front legs straight and planted, chest out, head raised and alert, tail curled round its paws, $S" &
wait

echo "=== pets done ==="
ls -la $O
