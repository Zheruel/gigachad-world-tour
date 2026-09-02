#!/bin/bash
# gen_d2_extra.sh - the two late additions to THE NIGHT TRAIN roster: the platform cow
# (a hazard, not a fighter) and the coolie porter. Same sheet conventions as
# gen_d2_cast.sh. Usage: tools/gen_d2_extra.sh [refs|cow|coolie|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d2cast
mkdir -p $O
WHAT="${1:-all}"

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap, and nothing any pose is holding or swinging may cross into that gap. The character must be identical in every pose - identical face, build, markings, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"
REF="a character reference sheet for a 32-bit arcade beat em up game: one single full length figure in full side view facing right, crisp detailed pixel art in the style of Streets of Rage 4, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no text, no border, no watermark"

COW="A big bony white Indian street cow with a hump, long floppy ears, short curved horns painted orange at the tips, a faded marigold garland round its neck, a brass bell on a rope, mud up its legs, a placid half closed eye, chewing"
COOLIE="A wiry Indian railway porter in his fifties, deep red long sleeved shirt, a brass numbered armband on his upper arm, a white dhoti, a folded cloth ring on his head, bare feet, a huge battered steel trunk balanced on his head steadied with one hand, sinewy and grim"

refs() {
$G $O/ref_cow.png landscape "$COW, $REF" &
$G $O/ref_coolie.png portrait "$COOLIE, $REF" &
wait
}

cow() {
R=$O/ref_cow.png
$G $O/cow_idle.png landscape "$COW, a 4 pose standing chew loop read left to right, all four feet planted and IDENTICAL in every pose. Pose 1: jaw closed, ears down. Pose 2: jaw working sideways, one ear flicking. Pose 3: jaw the other way, tail swishing. Pose 4: jaw closed, head slightly lower. $SHEET" "$R" &
$G $O/cow_walk.png landscape "$COW, a 4 pose slow ambling walk cycle read left to right, head low and swaying. Pose 1: front right leg forward. Pose 2: passing. Pose 3: front left leg forward. Pose 4: passing. $SHEET" "$R" &
wait
$G $O/cow_kick.png landscape "$COW, a 3 pose back kick read left to right. Pose 1: head down, hindquarters bunched, tail up. Pose 2: both hind legs kicked straight back and up off the ground, body tipped forward. Pose 3: hind legs landing, head coming up, ears back. $SHEET" "$R" &
$G $O/cow_hurt.png landscape "$COW, a 2 pose flinch read left to right. Pose 1: head thrown up and back, eyes wide, mouth open bellowing. Pose 2: crouched low on all four legs, ears flat. $SHEET" "$R" &
wait
}

coolie() {
R=$O/ref_coolie.png
$G $O/coolie_idle.png landscape "$COOLIE, a 4 pose idle loop read left to right, stood square with the trunk balanced on his head and one hand up steadying it. Pose 1: at rest. Pose 2: chest rising. Pose 3: at the top of the inhale, trunk tipping a little. Pose 4: lowering. Feet, legs and hips IDENTICAL in all four. $SHEET" "$R" &
$G $O/coolie_walk.png landscape "$COOLIE, a 4 pose quick shuffling walk cycle read left to right, the trunk kept level on his head with one hand up, bare feet. Pose 1: right foot forward contact. Pose 2: passing. Pose 3: left foot forward contact. Pose 4: passing. $SHEET" "$R" &
wait
$G $O/coolie_atk.png landscape "$COOLIE, a 3 pose overhead trunk slam read left to right. Pose 1: both hands up gripping the trunk on his head, knees bent, leaning back. Pose 2: the trunk brought down in front of him in a huge two handed arc, body folded forward, arms fully extended toward the ground. Pose 3: bent over with the trunk resting on the ground in front, hauling it back up. $SHEET" "$R" &
$G $O/coolie_hurt.png landscape "$COOLIE, a 3 pose sequence read left to right. Pose 1: standing, head snapped back, the trunk flying off his head, arms flung out. Pose 2: doubled forward clutching his stomach, no trunk. Pose 3: lying flat on his back on the ground, arms sprawled, seen from the side, no trunk. $SHEET" "$R" &
wait
}

case "$WHAT" in
  refs) refs;; cow) cow;; coolie) coolie;;
  all) refs; cow; coolie;;
esac
echo "=== $WHAT done ==="
