#!/bin/bash
# gen_lair_gym.sh - the two usable gym stations, generated the way the lounge should have
# been: ONE horizontal strip per station holding the rig alone and then CHAD using it.
#
# The lounge is two separate generations (lounge_empty.png, lounge_chad.png), which is why
# build_lair_extras.py has to anchor them on the sofa's own foot to stop the furniture
# jumping when he sits down. A single strip removes that whole problem - the model draws
# the rig once and repeats it, so every frame already agrees on where the equipment is.
#
# Pose 1 of every strip is the rig ON ITS OWN. That is the frame the room shows when
# nobody is using it, so it has to be the same rig at the same size as the poses beside it.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

# Same contract as gen_sheet.sh, with the equipment added to the list of what must not move.
SHEET="Draw this as a single horizontal sprite sheet strip: four separate poses in a row, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap. The gym equipment is IDENTICAL in all four poses - the same size, the same colours, the same distance above the ground line, drawn in the same place within its own pose. The man is identical in every pose - identical face, hair, build, costume and colours - only his arms and the bar move."

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

echo "=== the dumbbell rack, and CHAD curling at it ==="
$G $O/gym_curl.png landscape "A low wide two tier dumbbell rack seen in exact side view, heavy black powder coated steel with thick angled end frames, loaded with six black cast iron hex head dumbbells on each tier getting visibly larger from left to right, heavy and industrial. Four poses read left to right. Pose 1: the rack completely alone with nobody near it. Pose 2: $CHAD standing upright at the left end of the rack facing right, a big black hex head dumbbell hanging in each hand at arm's length by his thighs. Pose 3: the same man in the same spot, both forearms raised halfway, the dumbbells at waist height, elbows pinned to his sides. Pose 4: the same man in the same spot, both dumbbells curled all the way up to his shoulders, biceps fully contracted and enormous. His feet stay planted in exactly the same place in poses 2, 3 and 4 and his legs, hips and head do not move - only his forearms. $SHEET $S" "$R" &

echo "=== the bench press, and CHAD under the bar ==="
$G $O/gym_bench.png landscape "A flat black leather weight bench seen in exact side view with a two post barbell rack standing at the head of it, heavy black steel frame with a wide flat base, and a loaded olympic barbell with three big black iron plates on each end. Four poses read left to right. Pose 1: the bench and its rack completely alone with nobody near it, the loaded barbell resting across the top of the two posts. Pose 2: $CHAD lying flat on his back along the bench with his head at the rack end and his boots planted on the floor either side, both hands gripping the barbell while it still rests on the posts. Pose 3: the same man on the same bench, the barbell lifted off the posts and lowered right down touching his chest, elbows dropped below the bench. Pose 4: the same man on the same bench, the barbell pressed all the way up at full arm extension high above his chest, arms locked straight. The bench and the rack are in exactly the same place and the man's body, head and legs stay in exactly the same place in poses 2, 3 and 4 - only his arms and the barbell move. $SHEET $S" "$R" &

echo "=== the plate tree, and the kit that fills the corners ==="
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
