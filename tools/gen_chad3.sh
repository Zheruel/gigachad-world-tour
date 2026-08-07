#!/bin/bash
# gen_chad3.sh - CHAD pass 3: idle, walk and run in a consistent combat guard.
#
# Why: every attack starts from a boxing guard but he was strolling with his arms
# loose, so walk->punch popped. Streets of Rage and Final Fight keep the torso and
# arms nearly identical between idle, walk and the first frame of an attack - that
# pose match IS the transition, because 2D sprites do not blend. So the upper body
# is pinned to the same loose guard in every frame here and only the legs cycle.
# He still reads as arrogant: chin up, smirking, weight on the back foot.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/chad

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and leather, crisp dark 1px outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

# The stance clause is repeated verbatim in every prompt - that repetition is what
# holds the upper body still across the whole set.
GUARD="holding a loose confident boxing guard with both fists raised up near his chin and his elbows tucked in close to his ribs, shoulders squared, chin raised, smirking, weight on the back foot"

echo "=== guard idle ==="
$G $O/chad_gidle1.png portrait "$CHAD, standing in a fighting stance, $GUARD, $S" "$R" &
$G $O/chad_gidle2.png portrait "$CHAD, standing in a fighting stance, $GUARD, chest expanded on an inhale and fists lifted very slightly higher, $S" "$R" &
$G $O/chad_gidle3.png portrait "$CHAD, standing in a fighting stance, $GUARD, shoulders settling on an exhale and fists dropping very slightly, $S" "$R" &
wait

echo "=== guard walk (8) ==="
$G $O/chad_gwlk1.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. CONTACT: left leg stretched forward with the heel touching down, right leg stretched back with the toe pushing off, $S" "$R" &
$G $O/chad_gwlk2.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. DOWN: body at its lowest, front left knee bent taking the weight, back right foot lifting, $S" "$R" &
$G $O/chad_gwlk3.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. PASSING: right leg swinging through under the body beside the straight left leg, body at its highest, $S" "$R" &
$G $O/chad_gwlk4.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. UP: pushing off the straight left leg, right knee lifted and swinging forward, $S" "$R" &
wait
$G $O/chad_gwlk5.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. CONTACT reversed: right leg stretched forward with the heel touching down, left leg stretched back with the toe pushing off, $S" "$R" &
$G $O/chad_gwlk6.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. DOWN reversed: body at its lowest, front right knee bent taking the weight, back left foot lifting, $S" "$R" &
$G $O/chad_gwlk7.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. PASSING reversed: left leg swinging through under the body beside the straight right leg, body at its highest, $S" "$R" &
$G $O/chad_gwlk8.png portrait "$CHAD, walking forward to the right while $GUARD. Upper body and both arms stay locked in that guard and do not swing. UP reversed: pushing off the straight right leg, left knee lifted and swinging forward, $S" "$R" &
wait

echo "=== guard run (6) ==="
RGUARD="leaning forward into a run with both fists still held up in a tight boxing guard near his chin, elbows tucked in"
$G $O/chad_grn1.png portrait "$CHAD, running hard to the right, $RGUARD, CONTACT: left foot striking the ground in front, right leg trailing back bent, $S" "$R" &
$G $O/chad_grn2.png portrait "$CHAD, running hard to the right, $RGUARD, RECOIL: body compressed at its lowest, left knee deeply bent, right knee driving forward, $S" "$R" &
$G $O/chad_grn3.png portrait "$CHAD, running hard to the right, $RGUARD, PUSH OFF: left leg fully extended straight behind pushing off, right knee raised high in front, $S" "$R" &
wait
$G $O/chad_grn4.png portrait "$CHAD, running hard to the right, $RGUARD, AIRBORNE: both feet completely off the ground, right leg reaching forward, left leg tucked back, $S" "$R" &
$G $O/chad_grn5.png portrait "$CHAD, running hard to the right, $RGUARD, CONTACT reversed: right foot striking the ground in front, left leg trailing back bent, $S" "$R" &
$G $O/chad_grn6.png portrait "$CHAD, running hard to the right, $RGUARD, PUSH OFF reversed: right leg fully extended straight behind pushing off, left knee raised high in front, $S" "$R" &
wait

echo "=== chad pass 3 done ==="
ls assets/ai/chad | grep -cE "gidle|gwlk|grn"
