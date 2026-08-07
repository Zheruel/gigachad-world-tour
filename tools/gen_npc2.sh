#!/bin/bash
# gen_npc2.sh - regenerate the background actors as FIGURES ONLY, tone-referenced
# to the plate they stand in.
#
# Two changes from gen_npc_sheets.sh, both from reviewing the actors against the
# background:
#
#  1. Figure only. The old prompts asked for the man AND his stall, so every sprite
#     landed a second counter on top of the one the plate already paints.
#  2. The stall crop from the real plate goes in as a reference image, and the prompt
#     asks for its palette. Matching tone in post can only rescale what came back;
#     asking for it at source is what makes the figure belong.
#
# Also generates a react pose per kind - the fight arriving is the one thing a market
# would visibly respond to.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/sheet
R=assets/ai/npcref

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME figure repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch. The figure must be identical in every pose - identical face, build, clothing and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4, crisp detailed pixel art, side view, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no borders, no watermark"

# The reference image is a crop of the actual street this figure will stand in.
TONE="Match the colour palette, lighting and tonal range of the reference photograph exactly: warm amber, rust, faded teal, heavily weathered and dusty, lit by low evening light. Keep it LOW KEY and dark - the figure must be no brighter than the shopfronts behind it in the reference. Absolutely no pure white and no clean bright saturated colour anywhere; even a white vest must read as dirty grey-beige. Clothing is worn, stained and sun-faded."

ONLY="Draw ONLY the human figure and any small object actually held in his hands. Do NOT draw a stall, counter, table, cart, chair, sacks, crates, goods, produce, walls, floor or any background object - the street already contains all of those. Nothing but the person."

echo "=== stall holders, figure only ==="
$G $O/n2_chai.png landscape "An Indian chai wallah in a grubby sleeveless vest and a checked lungi with a cloth over one shoulder, standing side on. A 4 pose loop read left to right, pouring tea. Pose 1: holding a small steel pot low in front of him at waist height. Pose 2: the pot raised to head height, a thin stream of tea starting to fall from it. Pose 3: the pot raised high above his head, a long unbroken stream of tea falling from it. Pose 4: the pot lowering back to chest height, the stream thinning. His feet, legs and hips stay in EXACTLY the same place in all four poses - only the arms and the pot move. $ONLY $TONE $SHEET" "$R/chai.png" &

$G $O/n2_spice.png landscape "An older Indian spice merchant with a grey moustache in a long faded kurta, standing side on. A 4 pose loop read left to right, serving spice. Pose 1: reaching down and forward with a small brass scoop. Pose 2: lifting the scoop up, heaped with dark red powder. Pose 3: tipping the scoop forward to pour the powder out. Pose 4: both hands raised in front of him steadying an unseen weighing pan. His feet, legs and hips stay in EXACTLY the same place - only the arms move. $ONLY $TONE $SHEET" "$R/spice.png" &

$G $O/n2_tailor.png landscape "An Indian tailor in a worn shirt sitting cross legged on the ground, side on, hand sewing a length of cloth held across his lap. A 3 pose loop read left to right showing one stitch: the needle hand drawn up and away from the cloth, halfway back down, and pressed into the cloth. He stays seated in EXACTLY the same place and the cloth stays in the same position - only the sewing arm moves. $ONLY $TONE $SHEET" "$R/tailor.png" &
wait

$G $O/n2_fan.png landscape "A heavyset Indian shopkeeper in a dirty vest and lungi squatting cross legged, side on. A 3 pose loop read left to right showing him fanning himself with a flat woven hand fan: the fan low by his knee, at chest height, and raised beside his face. He stays squatting in EXACTLY the same place - only the fanning arm moves. $ONLY $TONE $SHEET" "$R/fan.png" &

$G $O/n2_porter.png landscape "A wiry Indian porter in a thin shirt and dust stained trousers carrying an enormous bulging hessian sack balanced on his head and shoulder, one hand steadying it. A 4 pose walking cycle read left to right, walking to the right: contact with the left leg forward, passing with the legs together, contact with the right leg forward, passing again. The sack, both arms and his upper body stay in EXACTLY the same position throughout - only the legs move. $TONE $SHEET" "$R/porter.png" &

$G $O/n2_barber.png landscape "An Indian street barber in a worn shirt standing beside a seated customer, both figures drawn together as one group, side on. A 3 pose loop read left to right. Pose 1: the barber leaning in with a straight razor raised beside the seated customer's cheek. Pose 2: drawing the razor down the customer's jaw. Pose 3: straightening up and wiping the razor on a cloth. The seated customer stays in EXACTLY the same place and pose in all three. Draw only the two people and the razor and cloth - no chair, no mirror, no stall, no background. $TONE $SHEET" "$R/barber.png" &
wait

$G $O/n2_dog.png landscape "A scruffy tan Indian street dog curled up asleep on the ground, seen from the side. A 2 pose loop read left to right showing only a breath: ribs at rest, then ribs expanded with one ear twitched. Otherwise absolutely identical. $TONE $SHEET" "$R/dog.png" &

echo "=== react poses ==="
$G $O/n2_chai_r.png landscape "An Indian chai wallah in a grubby sleeveless vest and checked lungi, side on. A 2 pose sheet read left to right of a man reacting to a fight breaking out beside him. Pose 1: stopped still, head turned toward the viewer, both hands frozen halfway through his work. Pose 2: recoiled backwards with his shoulders hunched, one arm raised in front of his face. His feet stay in the same place in both. $ONLY $TONE $SHEET" "$R/chai.png" &

$G $O/n2_spice_r.png landscape "An older Indian spice merchant with a grey moustache in a long faded kurta, side on. A 2 pose sheet read left to right of a man reacting to a fight breaking out beside him. Pose 1: stopped still, head turned toward the viewer, hands frozen. Pose 2: leaning back away from it with both arms raised protectively. His feet stay in the same place in both. $ONLY $TONE $SHEET" "$R/spice.png" &

$G $O/n2_fan_r.png landscape "A heavyset Indian shopkeeper in a dirty vest squatting cross legged, side on. A 2 pose sheet read left to right of a man reacting to a fight breaking out beside him. Pose 1: the fan dropped to his lap, head turned to look toward the viewer. Pose 2: shrinking back with both hands up in front of his chest. He stays squatting in the same place in both. $ONLY $TONE $SHEET" "$R/fan.png" &
wait

$G $O/n2_tailor_r.png landscape "An Indian tailor in a worn shirt sitting cross legged on the ground, side on. A 2 pose sheet read left to right of a man reacting to a fight breaking out beside him. Pose 1: the sewing dropped into his lap, head turned to look toward the viewer. Pose 2: twisting away with one arm raised over his head. He stays seated in the same place in both. $ONLY $TONE $SHEET" "$R/tailor.png" &

$G $O/n2_barber_r.png landscape "An Indian street barber in a worn shirt standing beside a seated customer, both drawn together as one group, side on. A 2 pose sheet read left to right of two men reacting to a fight breaking out beside them. Pose 1: the barber has pulled the razor away and both are looking toward the viewer. Pose 2: the barber steps back with the razor held up and away, the customer half rising out of his seat. Draw only the two people and the razor - no chair, no stall, no background. $TONE $SHEET" "$R/barber.png" &

$G $O/n2_porter_r.png landscape "A wiry Indian porter in a thin shirt and dust stained trousers carrying an enormous bulging hessian sack on his head and shoulder, side on. A 2 pose sheet read left to right of a man reacting to a fight breaking out beside him. Pose 1: stopped mid stride, feet together, head turned toward the viewer. Pose 2: hurrying away hunched over with the sack gripped in both hands. $TONE $SHEET" "$R/porter.png" &
wait

echo "=== traffic ==="
$G $O/n2_rick.png landscape "A battered Indian auto rickshaw, three wheels, black and yellow, canvas roof, seen from the side driving to the right with a driver hunched at the handlebars. A 2 pose sheet read left to right, identical except the front wheel is turned slightly and the body has settled a little on its suspension. Draw only the rickshaw and its driver - no road, no background. $TONE $SHEET" "$R/porter.png" &

$G $O/n2_cow.png landscape "A bony white Indian brahmin cow with a humped back and long horns, seen from the side walking slowly to the right. A 4 pose walking cycle read left to right: contact with the near foreleg forward, passing, contact with the far foreleg forward, passing. Her head, hump and body stay level throughout - only the legs and tail move. Draw only the cow - no road, no background. $TONE $SHEET" "$R/porter.png" &
wait

echo "=== npc art done ==="
ls assets/ai/sheet | grep n2_ | wc -l
