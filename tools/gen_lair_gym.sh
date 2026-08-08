#!/bin/bash
# gen_lair_gym.sh - the two usable gym stations.
#
# ONE GENERATION PER POSE, each passed the finished RIG as a reference image. The strip
# that used to be here is the obvious thing to do and it does not work: asked for four
# poses in a row the model redraws the equipment in every cell. Measured on the strip
# version, in the columns where CHAD is NOT standing, the bench and its posts differed
# from the rig-alone frame by 137-270% of their own silhouette - it was a different bench
# each frame - and the dumbbell rack by 3-5%, which at 18 frames a pose is a rack that
# breathes. This is the same failure and the same fix as the bed set, which went from
# >50% furniture drift on strips to 0.04% one-pose-at-a-time against a reference.
#
# The rig image is the FIRST reference and CHAD's sheet the second, and the prompt says
# which is which - handed two references with no explanation the model averages them.
#
# Pose 0 references the rig; poses 1 and 2 reference POSE 0. The rig reference holds the
# equipment still and says nothing about the man or the bar in his hands, and the first pass
# came back with a barbell whose plates were twice the diameter in one pose as the other.
#
# tools/build_lair_extras.py then stamps the rig back over each pose below the barbell,
# so the half that touches the floor is not merely close but identical.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

# Said in every pose prompt, about the FIRST reference image. The wording matters: "the
# same equipment" gets a redrawn one of the same description, "do not redraw it" does not.
HOLD="THE EQUIPMENT IS FIXED. The first attached reference image is the equipment for this
picture. Copy it EXACTLY as it is drawn there: the same shape, the same size, the same
proportions, the same number of parts, the same colours, the same highlights, standing in
exactly the same position within the frame at exactly the same distance from the left edge
and from the bottom edge. Do not move it, do not resize it, do not re-style it, do not
redraw it and do not draw a different one. The man is the ONLY thing that changes. The
second attached reference image is the man: identical face, hair, build, costume and
colours to it."

echo "=== the rigs themselves ==="
$G $O/gym_curl_rig.png landscape "A low wide two tier dumbbell rack seen in exact side view, heavy black powder coated steel with thick angled end frames, loaded with six black cast iron hex head dumbbells on each tier getting visibly larger from left to right, heavy and industrial. The rack is completely alone with nobody near it and nothing else in the picture. $S" &
$G $O/gym_bench_rig.png landscape "A flat black leather weight bench seen in exact side view with a two post barbell rack standing at the head of it, heavy black steel frame with a wide flat base, and a loaded olympic barbell with three big black iron plates on each end resting across the top of the two posts. The bench and its rack are completely alone with nobody near it and nothing else in the picture. $S" &
wait

echo "=== CHAD curling, one pose at a time ==="
CURL="$CHAD is standing upright at the LEFT END of the dumbbell rack, facing right, in front of it so the rack is behind him. He holds a big black cast iron hex head dumbbell in each hand."
$G $O/gym_curl_0.png landscape "$CURL Both arms hang straight down at full length by his thighs, the dumbbells at his sides. $HOLD $S" $O/gym_curl_rig.png "$R" &
$G $O/gym_curl_1.png landscape "$CURL Both forearms are raised halfway so the dumbbells are at waist height, elbows pinned to his sides. His feet, legs, hips, torso and head are in exactly the same place as they would be standing still - only his forearms have moved. $HOLD $S" $O/gym_curl_rig.png "$R" &
$G $O/gym_curl_2.png landscape "$CURL Both dumbbells are curled all the way up to his shoulders, biceps fully contracted and enormous. His feet, legs, hips, torso and head are in exactly the same place as they would be standing still - only his forearms have moved. $HOLD $S" $O/gym_curl_rig.png "$R" &
wait

echo "=== CHAD under the bar, one pose at a time ==="
BENCH="$CHAD is lying flat on his back along the weight bench with his head at the barbell rack end and his boots planted on the floor either side of the bench. He grips the loaded olympic barbell in both hands."
$G $O/gym_bench_0.png landscape "$BENCH The barbell is still resting on top of the two posts and he has just taken hold of it. $HOLD $S" $O/gym_bench_rig.png "$R" &
wait
# Poses 1 and 2 chain off POSE 0, not off the rig: the rig reference holds the equipment
# still but says nothing about the man or the bar he is holding, and the first pass drew a
# barbell with plates twice the size in one pose as the other - a bar that pulses as he
# presses it. Same chaining the bed set uses.
MOVED="THE MAN AND THE BARBELL ARE FIXED TOO. The first attached reference image is this exact picture one moment earlier. The bench, the posts, the man and the barbell are all drawn EXACTLY as they are there - the same size, the same proportions, the same colours, the same plates of the same diameter on the bar, the man's head, torso, hips, legs and boots in exactly the same place. The ONLY things that have moved are his arms and the barbell in them."
$G $O/gym_bench_1.png landscape "$BENCH The barbell has been lifted off the posts and lowered until the bar touches the middle of his CHEST - the bar lies across his pectorals, well below his chin, and it is NOT over his face or his throat. His elbows are dropped down at his sides below the line of the bench. The posts are EMPTY. $MOVED $S" $O/gym_bench_0.png "$R" &
$G $O/gym_bench_2.png landscape "$BENCH The barbell is pressed all the way up at full arm extension high above his chest, his arms locked straight and vertical. The posts are EMPTY. $MOVED $S" $O/gym_bench_0.png "$R" &
wait

# The rig-alone frame is generated LAST, against a pose - not first, against nothing. The
# first pass had it the other way round and it came back the odd one out: its rack was the
# same width as the poses' but 20% taller (672 px against 556), a different SHAPE, which no
# uniform scale reconciles. The draft rig above exists only as a jig for the poses to agree
# with each other; this is the one the room actually shows when nobody is at the station,
# so it is the one that has to match them.
echo "=== the rigs again, this time against a pose ==="
mv $O/gym_curl_rig.png $O/gym_curl_rig_draft.png
mv $O/gym_bench_rig.png $O/gym_bench_rig_draft.png
ALONE="Copy the equipment from the attached reference image EXACTLY as it is drawn there and remove the man entirely: the same shape, the same size, the same proportions, the same number of parts, the same colours and the same highlights, standing in exactly the same position within the frame at exactly the same distance from the left edge and from the bottom edge. Do not move it, do not resize it, do not re-style it and do not redraw it. There is nobody in this picture at all - no man, no person, no hands, no limbs - only the equipment alone."
$G $O/gym_curl_rig.png landscape "The two tier dumbbell rack from the attached reference image, completely alone. $ALONE $S" $O/gym_curl_0.png &
$G $O/gym_bench_rig.png landscape "The weight bench and its two post barbell rack from the attached reference image, completely alone, with the loaded barbell resting across the top of the two posts exactly as it does there. $ALONE $S" $O/gym_bench_0.png &
wait

echo "=== the kit that fills the corners ==="
$G $O/gym_plates.png portrait "A black steel weight plate tree seen from the side, a vertical post with six horizontal pegs, each peg loaded with a stack of black cast iron olympic weight plates, a heavy cross shaped base, single object, no people, $S" &
$G $O/gym_kettles.png landscape "A low heavy black steel kettlebell rack seen from the side, a single shelf holding a row of five black cast iron kettlebells getting larger from left to right, a rolled oxblood leather exercise mat leaning against the end of it, single object, no people, $S" &
# the media wall is the thinnest stretch of the room; these hang on it and lie in front
$G $O/gloves.png portrait "A pair of heavily worn oxblood red leather boxing gloves hanging side by side from a single polished brass wall hook by their knotted laces, the leather scuffed and creased and split at the knuckles, deep shadow in the folds, hanging straight down and slightly apart, $S" &
$G assets/ai/fg/fg_weights.png landscape "Three big black cast iron olympic weight plates lying and leaning against each other on the floor seen from the side, a white chalk bowl and a rolled white gym towel beside them, heavy and worn with chipped paint, $S" &
wait

echo "=== gym done ==="
echo "  ./.venv/bin/python tools/build_lair_extras.py curl bench"
echo "  ./.venv/bin/python tools/process_props.py gym_plates gym_kettles gloves"
echo "  ./.venv/bin/python tools/process_fg.py fg_weights"
ls -la $O/gym_*.png $O/gloves.png
