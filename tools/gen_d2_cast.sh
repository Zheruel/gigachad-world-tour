#!/bin/bash
# gen_d2_cast.sh - THE NIGHT TRAIN cast as sprite sheets: MANJA, THE TTE, BIRJU.
# Same conventions as gen_d1_cast.sh: one reference portrait per family, one strip per
# animation, the reference passed to every strip.
# Usage: tools/gen_d2_cast.sh [refs|manja|tte|birju|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d2cast
mkdir -p $O
WHAT="${1:-all}"

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap, and nothing any pose is holding or swinging may cross into that gap. The character must be identical in every pose - identical face, hair, build, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"
REF="a character reference sheet for a 32-bit arcade beat em up game: one single full length figure standing straight on facing the viewer, arms relaxed at the sides, crisp detailed pixel art in the style of Streets of Rage 4, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no text, no border, no watermark"

MANJA="A skinny Indian teenage boy of about fifteen, bare feet, rolled up grey trousers, a torn oversized football shirt, a shaved head with a scar, a cheap plastic bead necklace, a big wooden kite string reel wound with glittering glass coated pink manja string hung across his chest on a strap, quick and grinning"
TTE="A wiry Indian railway ticket examiner in his sixties, black serge coat over a white shirt and black tie, a brass badge on the breast, rimless reading glasses down his nose, thin grey moustache, a heavy chrome torch in one hand and a hardbound ledger under the other arm, entirely unimpressed"
BIRJU="A huge Indian railway shunter in his forties, shaved head, thick black moustache, bare chested and glistening, a heavy iron coupling chain slung over one shoulder, a steel shunting hook in one hand, filthy railway trousers held with a rope belt, heavy boots, a red rag knotted round his wrist"

refs() {
$G $O/ref_manja.png portrait "$MANJA, $REF" &
$G $O/ref_tte.png portrait "$TTE, $REF" &
$G $O/ref_birju.png portrait "$BIRJU, $REF" &
wait
}

manja() {
R=$O/ref_manja.png
$G $O/manja_idle.png landscape "$MANJA, a 4 pose idle loop read left to right, crouched on his haunches on the ground with his knees up and the reel in his lap, feet flat. Pose 1: at rest. Pose 2: chest rising, head tilting. Pose 3: at the top of it. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four. $SHEET" "$R" &
$G $O/manja_throw.png landscape "$MANJA, a 4 pose throw read left to right, crouched on his haunches throughout. Pose 1: one arm drawn back holding a small iron weight on the end of a length of glittering pink string. Pose 2: arm cocked further back, head leaning forward. Pose 3: the arm whipped forward and fully extended, the weight flying out on its string. Pose 4: hauling the string back in hand over hand. His feet stay planted. $SHEET" "$R" &
$G $O/manja_drop.png landscape "$MANJA, a 4 pose leaping drop read left to right. Pose 1: crouched on his haunches, coiled, arms back. Pose 2: sprung into the air, body stretched out, arms up. Pose 3: falling feet first with both knees driving down, arms spread. Pose 4: landed in a deep crouch on both feet with one hand on the ground. $SHEET" "$R" &
wait
$G $O/manja_walk.png landscape "$MANJA, a 4 pose fast scuttling run cycle read left to right, low and quick, arms pumping, bare feet. Pose 1: right foot forward contact. Pose 2: passing. Pose 3: left foot forward contact. Pose 4: passing. $SHEET" "$R" &
$G $O/manja_hurt.png landscape "$MANJA, a 3 pose sequence read left to right. Pose 1: standing, head snapped back, arms flung out, the reel flying off. Pose 2: doubled forward clutching his stomach. Pose 3: lying flat on his back on the ground, arms sprawled, seen from the side. $SHEET" "$R" &
wait
}

tte() {
R=$O/ref_tte.png
$G $O/tte_idle.png landscape "$TTE, a 4 pose idle loop read left to right, stood straight with the ledger under one arm and the torch held down at his side. Pose 1: at rest. Pose 2: chest rising. Pose 3: at the top of the inhale. Pose 4: lowering. Feet, legs and hips IDENTICAL in all four. $SHEET" "$R" &
$G $O/tte_walk.png landscape "$TTE, a 4 pose unhurried walk cycle read left to right, the ledger under one arm, the torch swinging in the other hand. Pose 1: right foot forward contact. Pose 2: passing. Pose 3: left foot forward contact. Pose 4: passing. $SHEET" "$R" &
$G $O/tte_torch.png landscape "$TTE, a 4 pose torch action read left to right. Pose 1: the torch raised beside his glasses, pointed forward. Pose 2: the torch thrust straight forward at arm's length, a bright cone of white light beaming out of it to the right. Pose 3: the same, the beam wider and brighter, his eyes narrowed. Pose 4: the torch lowering, the beam gone. Feet planted. $SHEET" "$R" &
wait
$G $O/tte_ledger.png landscape "$TTE, a 3 pose flat swipe with the hardbound ledger read left to right. Pose 1: the ledger drawn back across his chest in both hands. Pose 2: swung out flat and fast at head height, arms extended. Pose 3: the follow through past his shoulder. Feet planted. $SHEET" "$R" &
$G $O/tte_stamp.png landscape "$TTE, a 4 pose stamping action read left to right. Pose 1: the ledger opened in one hand at chest height. Pose 2: the free hand raised high holding a rubber stamp. Pose 3: the stamp driven down onto the open page, both arms straight, head bowed over it. Pose 4: the ledger snapped shut, head coming back up. His feet stay planted. $SHEET" "$R" &
$G $O/tte_hurt.png landscape "$TTE, a 3 pose sequence read left to right. Pose 1: head snapped back, glasses askew, the ledger flying open out of his hands. Pose 2: doubled forward clutching the torch to his chest. Pose 3: sat on the ground against nothing with his legs out, adjusting his glasses, the ledger in his lap, seen from the side. $SHEET" "$R" &
wait
}

birju() {
R=$O/ref_birju.png
$G $O/birju_idle.png landscape "$BIRJU, a 4 pose idle loop read left to right, braced wide against the wind with the hook held low. Pose 1: at rest. Pose 2: chest rising, the chain lifting slightly. Pose 3: at the top of the inhale. Pose 4: lowering. Feet, legs and hips IDENTICAL in all four. $SHEET" "$R" &
$G $O/birju_walk.png landscape "$BIRJU, a 4 pose heavy braced walk cycle read left to right, leaning into a wind, the chain over his shoulder, the hook low. Pose 1: right foot forward contact. Pose 2: passing. Pose 3: left foot forward contact. Pose 4: passing. $SHEET" "$R" &
$G $O/birju_chain.png landscape "$BIRJU, a 4 pose chain sweep read left to right. Pose 1: the coupling chain gathered in both hands at his hip. Pose 2: swung back and out behind him, body coiled away, weight on the rear foot. Pose 3: whipped through in a wide flat arc at waist height, arms extended, torso rotated fully. Pose 4: carried past and dropping, shoulders low. His feet stay planted in the same two places. $SHEET" "$R" &
wait
$G $O/birju_hook.png landscape "$BIRJU, a 4 pose hook throw read left to right. Pose 1: the shunting hook drawn back beside his ear on its chain. Pose 2: the arm cocked further, shoulder loaded. Pose 3: snapped forward, hook released flying out to the right on its chain, body stretched out behind it. Pose 4: stood tall hauling backward on the chain with both hands, leaning away. His feet stay planted. $SHEET" "$R" &
$G $O/birju_charge.png landscape "$BIRJU, a 4 pose shoulder charge read left to right. Pose 1: crouched low, one shoulder forward, fists clenched. Pose 2: driving forward off the back foot, body low. Pose 3: at full sprint, shoulder leading, chain streaming behind. Pose 4: the same sprint on the opposite foot. $SHEET" "$R" &
$G $O/birju_grab.png landscape "$BIRJU, a 3 pose grab read left to right. Pose 1: both huge arms reaching forward, hands open. Pose 2: both arms closed and lifted high as if holding a man up by the chest at arm's length, looking up at him. Pose 3: the same hold, leaning back, bracing. Feet planted. $SHEET" "$R" &
wait
$G $O/birju_uncouple.png landscape "$BIRJU, a 3 pose sequence read left to right. Pose 1: dropped to one knee, reaching down with both hands to a coupling pin at his feet. Pose 2: hauling the pin up with both hands, back arched, teeth bared. Pose 3: stood up holding the iron pin overhead in one fist, roaring. $SHEET" "$R" &
$G $O/birju_hurt.png landscape "$BIRJU, a 3 pose sequence read left to right. Pose 1: head snapped back, arms flung wide, the chain flying off his shoulder. Pose 2: doubled forward, one knee buckling. Pose 3: lying flat on his back on the ground, arms sprawled, the hook beside his hand, seen from the side. $SHEET" "$R" &
wait
}

case "$WHAT" in
  refs) refs;; manja) manja;; tte) tte;; birju) birju;;
  all) refs; manja; tte; birju;;
esac
echo "=== $WHAT done ==="
ls -la $O
