#!/bin/bash
# gen_d1_mirchi.sh - MIRCHI, THE CHAAT KING: the DIRTY DELHI mid-boss, and his cart.
# Same conventions as gen_d1_cast.sh: one reference portrait, one strip per animation,
# the reference passed to every strip. The cart is a separate prop so the fighter sheet
# stays a clean single figure and the cart can be shoved and broken on its own.
# Usage: tools/gen_d1_mirchi.sh [refs|sheets|cart|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d1cast
mkdir -p $O
WHAT="${1:-all}"

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap, and nothing any pose is holding or swinging may cross into that gap. The character must be identical in every pose - identical face, hair, build, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"
REF="a character reference sheet for a 32-bit arcade beat em up game: one single full length figure standing straight on facing the viewer, arms relaxed at the sides, crisp detailed pixel art in the style of Streets of Rage 4, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no text, no border, no watermark"

MIRCHI="A fat sweating Indian street chaat vendor in his fifties, an enormous belly under a grease stained white vest, a red and white checked lungi, a red gamchha towel over one shoulder, oiled black hair combed flat, a thick black moustache, gold rings on fat fingers, a heavy steel ladle gripped in his right hand, grinning wide with paan stained red teeth"

refs() {
$G $O/ref_mirchi.png portrait "$MIRCHI, $REF"
}

sheets() {
R=$O/ref_mirchi.png
$G $O/mirchi_idle.png landscape "$MIRCHI, a 4 pose idle loop read left to right, stood square with the ladle held up beside his head like a club and the other hand on his belly. Pose 1: at rest. Pose 2: belly and chest rising on an inhale. Pose 3: at the top of the inhale, shoulders up. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four and do not move. $SHEET" "$R" &
$G $O/mirchi_walk.png landscape "$MIRCHI, a 4 pose heavy waddling walk cycle read left to right, walking to the right with the ladle held up beside his head. Pose 1: left leg forward, heel down, right leg stretched back. Pose 2: weight settled onto the front leg, body at its lowest, belly swinging. Pose 3: right leg forward, heel down. Pose 4: weight settled onto the front leg, body at its lowest. His arms and head stay in the same place and do NOT swing - only the legs and belly move. $SHEET" "$R" &
$G $O/mirchi_ladle.png landscape "$MIRCHI, a 4 pose overhead ladle swing read left to right. Pose 1: the ladle drawn back behind his head with both hands, leaning back. Pose 2: rising onto his toes, ladle at its highest above and behind him. Pose 3: the ladle swung down and forward in front of him at hip height, both arms straight, leaning into it. Pose 4: the follow through, ladle low past his front knee, off balance forward. $SHEET" "$R" &
wait
$G $O/mirchi_throw.png landscape "$MIRCHI, a 3 pose underarm lob read left to right, the ladle held loose in the other hand down at his side in every pose. Pose 1: holding a fat golden brown fried samosa up in his free hand at shoulder height, looking at it. Pose 2: that arm swung down and back behind him, knees bent. Pose 3: the arm swung forward and up, fully extended ahead of him, the hand open and EMPTY, no samosa anywhere in the image. $SHEET" "$R" &
$G $O/mirchi_chilli.png landscape "$MIRCHI, a 4 pose sequence read left to right, the ladle held in the other hand down at his side in every pose. Pose 1: reaching into a paper cone tucked in his waistband with his free hand. Pose 2: the free hand held up in front of his face, closed in a fist full of red powder, cheeks puffed. Pose 3: the fist flung out forward at arm's length, fingers snapped open, palm out, a burst of red chilli powder leaving the palm. Pose 4: arm dropping, laughing with his head back. $SHEET" "$R" &
$G $O/mirchi_shove.png landscape "$MIRCHI, a 4 pose running shove read left to right, pushing an unseen cart. Pose 1: both hands out in front at waist height gripping an unseen bar, leaning forward, one foot back. Pose 2: driving hard off the back foot, body low and stretched forward. Pose 3: mid stride, the other leg driving, head down. Pose 4: skidding to a stop, leaning back, heels dug in, arms still straight out gripping the unseen bar. $SHEET" "$R" &
wait
$G $O/mirchi_hurt.png landscape "$MIRCHI, a 3 pose sequence read left to right. Pose 1: head snapped back and to one side, both arms flung out, belly forward, torso twisted away from an unseen punch. Pose 2: doubled forward over his stomach, ladle dropped low. Pose 3: fallen flat on his back on the ground, belly up, arms and legs sprawled, seen from the side. $SHEET" "$R"
}

cart() {
CART="A battered Indian street chaat cart seen exactly from the side, a rusty steel counter box on two big bicycle wheels with a long push handle at the left end, a small striped red and white canvas awning on thin poles over the top, glass jars of green and brown chutney, a big steel tray heaped with round golgappa puris, a blackened iron kadai of hot oil on a gas ring, strings of foil chip packets hanging from the awning, a crooked hand painted sign on the front reading MIRCHI CHAAT, 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4, crisp detailed pixel art, solid flat bright green chroma-key background (RGB 0,255,0), no people, no shadows, no ground line drawn, no other text, no frame, no border, no watermark"
$G assets/ai/d1props/mirchicart.png landscape "$CART" &
$G assets/ai/d1props/mirchicart_b.png landscape "Solid flat bright green chroma-key background (RGB 0,255,0) filling the entire image behind the subject, nothing else in the background. The same cart as the reference, wrecked: tipped over onto its side with both wheels in the air and one wheel bent, the awning collapsed and torn, jars smashed, golgappa puris scattered on the ground, the kadai upended, the MIRCHI CHAAT sign cracked in half. $CART" "assets/ai/d1props/mirchicart.png" &
wait
}

case "$WHAT" in
  refs) refs ;;
  sheets) sheets ;;
  cart) cart ;;
  all) refs; sheets; cart ;;
esac
echo "=== mirchi $WHAT done ==="
