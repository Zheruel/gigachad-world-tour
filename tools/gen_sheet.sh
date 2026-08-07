#!/bin/bash
# gen_sheet.sh - generate a whole animation as ONE sprite sheet, then slice it.
#
# The theory: asking for all the poses in a single image makes the model draw them
# as a set, the way an artist lays out a character sheet, so the body stays consistent
# without having to beg for it frame by frame. Resolution is not a problem - a 1536
# wide sheet of 5 poses still gives ~300px per cell and CHAD is only 192 device px
# tall in game.
#
# tools/slice_sheet.py cuts the result on the empty green columns between poses.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/sheet

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap. The character must be identical in every pose - identical face, hair, build, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

GUARD="holding a boxing guard with both fists up near his chin and elbows tucked in"

$G $O/jab.png landscape "$CHAD, a 4 pose jab animation sequence read left to right. Pose 1: standing $GUARD. Pose 2: the lead arm half extended forward at shoulder height, everything else unchanged. Pose 3: the lead arm snapped completely straight out at shoulder height with the shoulder rotated behind it. Pose 4: the lead arm drawn halfway back toward the chin. In all four poses his legs, hips and stance are IDENTICAL and do not move - only the arms change. $SHEET" "$R" &

$G $O/hook.png landscape "$CHAD, a 4 pose hook punch animation sequence read left to right. Pose 1: standing $GUARD. Pose 2: the rear fist drawn back and out to the side with the shoulders coiled away. Pose 3: the rear arm swung forward in a horizontal arc, elbow bent ninety degrees, fist at head height on the centre line, torso rotated through. Pose 4: the arm carried past the centre line at the end of the follow through. In all four poses his feet stay planted in the same place and his legs do not move. $SHEET" "$R" &

$G $O/upper.png landscape "$CHAD, a 4 pose uppercut animation sequence read left to right. Pose 1: standing $GUARD. Pose 2: dipped into a crouch with both knees bent and the rear fist dropped by his hip. Pose 3: driving upward, legs half extended, the punching fist rising past his chest. Pose 4: fully stretched upward on his toes with the punching fist thrust high above his head. In all four poses his feet stay in the same spot on the ground. $SHEET" "$R" &
wait

$G $O/walk.png landscape "$CHAD, a 6 pose walking cycle read left to right, walking to the right while $GUARD. Pose 1: left leg stretched forward, heel touching down, right leg stretched back with the toe pushing off. Pose 2: weight settled onto the front leg, front knee bent, body at its lowest, back heel lifted. Pose 3: the back leg swung through under the body beside the standing leg, body at its highest. Pose 4: right leg stretched forward, heel touching down, left leg stretched back. Pose 5: weight settled onto the front leg, knee bent, body at its lowest. Pose 6: the back leg swung through under the body, body at its highest. In every pose his arms, shoulders and head stay locked in the same boxing guard and do NOT swing - only the legs move. $SHEET" "$R" &

$G $O/idle.png landscape "$CHAD, a 4 pose idle breathing loop read left to right, standing $GUARD. Pose 1: at rest. Pose 2: chest rising slightly on an inhale, shoulders a fraction higher. Pose 3: at the top of the inhale, chest full, shoulders at their highest. Pose 4: chest lowering on the exhale. The difference between the poses is very small and subtle. In all four poses his feet, legs and hips are IDENTICAL and do not move even slightly. $SHEET" "$R" &
wait

echo "=== sheets done ==="
ls -la assets/ai/sheet
