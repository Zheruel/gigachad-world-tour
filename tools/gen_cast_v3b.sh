#!/bin/bash
# Remaining likeness frames (wolff tail, maxon, ricardo).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh
S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and cloth, crisp dark outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"
WOLFF="A deeply tanned bodybuilder wrestler with short jet black hair, in bright red wrestling trunks and black wrestling boots, bare chested"
MAXON="An American wrestler with shoulder-length wavy blond hair and a thick blond moustache, in dark blue wrestling trunks and white wrestling boots"
RIC="A Brazilian dancer with dark brown skin and a bright red bandana tied round his head, bare chested, in shiny dark grey dance shorts, barefoot"
RW=assets/ai/ref2_wolff.png
RM=assets/ai/ref2_maxon.png
RR=assets/ai/ref2_ricardo.png

$G assets/ai/v3/wolff_hurt.png     portrait  "$WOLFF, staggering backwards from a hit, head thrown back, $S" "$RW" &
$G assets/ai/v3/wolff_down.png     landscape "$WOLFF, lying knocked flat on his back on the ground, $S" "$RW" &
$G assets/ai/v3/maxon_idle.png     portrait  "$MAXON, standing in a wrestling stance with fists raised, $S" "$RM" &
$G assets/ai/v3/maxon_walk1.png    portrait  "$MAXON, stepping forward with left leg forward, $S" "$RM" &
$G assets/ai/v3/maxon_walk2.png    portrait  "$MAXON, stepping forward with right leg forward, $S" "$RM" &
wait
$G assets/ai/v3/maxon_punch.png    portrait  "$MAXON, swinging a big overhand chop downward, $S" "$RM" &
$G assets/ai/v3/maxon_hurt.png     portrait  "$MAXON, recoiling from a punch, hair flying, $S" "$RM" &
$G assets/ai/v3/maxon_down.png     landscape "$MAXON, lying knocked flat on his back on the ground, $S" "$RM" &
$G assets/ai/v3/ricardo_idle.png   portrait  "$RIC, standing in a loose dance-ready stance with hips cocked, $S" "$RR" &
$G assets/ai/v3/ricardo_walk1.png  portrait  "$RIC, strutting forward with left leg forward, $S" "$RR" &
wait
$G assets/ai/v3/ricardo_walk2.png  portrait  "$RIC, strutting forward with right leg forward, $S" "$RR" &
$G assets/ai/v3/ricardo_punch.png  landscape "$RIC, performing a spinning roundhouse dance kick, one leg extended horizontally, $S" "$RR" &
$G assets/ai/v3/ricardo_slam.png   portrait  "$RIC, doing a powerful forward hip thrust dance move, both arms flung back, $S" "$RR" &
$G assets/ai/v3/ricardo_hurt.png   portrait  "$RIC, recoiling from a punch, bandana slipping, $S" "$RR" &
$G assets/ai/v3/ricardo_down.png   landscape "$RIC, lying knocked flat on his back on the ground, $S" "$RR" &
wait
echo CAST-V3B-DONE
