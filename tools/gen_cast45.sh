#!/bin/bash
# Animation frames for the stage 4 / stage 5 cast (needs tools/gen_stage45.sh first).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

S="16-bit SNES beat em up game sprite, crisp detailed pixel art, single full body character, side view facing right, identical character, costume and proportions to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

OIL="A heavily oiled wrestler with a shaved head, glistening slick skin, tight black wrestling trunks, barefoot"
PHI="A lean French fitness model wrestler with dark wavy shoulder-length hair, tanned, bright blue wrestling trunks and white socks"
JIR="A very tall lean muscular Czech wrestler with short dark brown hair, pale skin, dark green wrestling trunks and black wrestling boots"
NIN="A Roman gladiator with black curly hair and short beard, bronze helmet with red crest, bronze shoulder guard, brown leather loincloth and studded belt, leather sandals"

RO=assets/ai/ref_oiler_fullbody.png
RP=assets/ai/ref_philippe_fullbody.png
RJ=assets/ai/ref_jirka_fullbody.png
RN=assets/ai/ref_nino_fullbody.png

$G assets/ai/frames/oiler_idle.png   portrait  "$OIL, in a low grappling stance with hands open, $S" "$RO" &
$G assets/ai/frames/oiler_walk1.png  portrait  "$OIL, stepping forward with left leg forward, $S" "$RO" &
$G assets/ai/frames/oiler_walk2.png  portrait  "$OIL, stepping forward with right leg forward, $S" "$RO" &
$G assets/ai/frames/oiler_atk.png    landscape "$OIL, sliding forward low along the ground with both arms reaching out to tackle, $S" "$RO" &
$G assets/ai/frames/oiler_hurt.png   portrait  "$OIL, recoiling from a punch, head snapped back, $S" "$RO" &
wait
$G assets/ai/frames/oiler_down.png   landscape "$OIL, lying knocked out flat on his back on the ground, $S" "$RO" &
$G assets/ai/frames/philippe_idle.png  portrait "$PHI, standing in a light wrestling stance with fists up, $S" "$RP" &
$G assets/ai/frames/philippe_walk1.png portrait "$PHI, stepping forward with left leg forward, $S" "$RP" &
$G assets/ai/frames/philippe_walk2.png portrait "$PHI, stepping forward with right leg forward, $S" "$RP" &
$G assets/ai/frames/philippe_punch.png portrait "$PHI, throwing a quick straight punch with the arm fully extended, $S" "$RP" &
wait
$G assets/ai/frames/philippe_slam.png  landscape "$PHI, leaping forward in mid air with both feet extended in a dropkick, $S" "$RP" &
$G assets/ai/frames/philippe_hurt.png  portrait "$PHI, recoiling from a punch with his hair flying, $S" "$RP" &
$G assets/ai/frames/philippe_down.png  landscape "$PHI, lying knocked out flat on his back on the ground, $S" "$RP" &
$G assets/ai/frames/jirka_idle.png     portrait "$JIR, standing tall in a wrestling stance with long arms ready, $S" "$RJ" &
$G assets/ai/frames/jirka_walk1.png    portrait "$JIR, striding forward with left leg forward, $S" "$RJ" &
wait
$G assets/ai/frames/jirka_walk2.png    portrait "$JIR, striding forward with right leg forward, $S" "$RJ" &
$G assets/ai/frames/jirka_punch.png    portrait "$JIR, throwing a very long straight punch with the arm fully extended forward, $S" "$RJ" &
$G assets/ai/frames/jirka_grab.png     portrait "$JIR, reaching forward with both long arms wide open to grapple, $S" "$RJ" &
$G assets/ai/frames/jirka_slam.png     portrait "$JIR, leaping high with both fists clasped overhead about to smash down, $S" "$RJ" &
$G assets/ai/frames/jirka_hurt.png     portrait "$JIR, staggering back from a heavy hit, $S" "$RJ" &
wait
$G assets/ai/frames/jirka_down.png     landscape "$JIR, lying knocked out flat on his back on the ground, $S" "$RJ" &
$G assets/ai/frames/nino_idle.png      portrait "$NIN, standing in a gladiator fighting stance with the short sword raised, $S" "$RN" &
$G assets/ai/frames/nino_walk1.png     portrait "$NIN, advancing with left leg forward, sword low, $S" "$RN" &
$G assets/ai/frames/nino_walk2.png     portrait "$NIN, advancing with right leg forward, sword low, $S" "$RN" &
$G assets/ai/frames/nino_punch.png     landscape "$NIN, thrusting the short sword straight forward in a lunge, $S" "$RN" &
wait
$G assets/ai/frames/nino_slam.png      portrait "$NIN, swinging the short sword down overhead in a huge two-handed chop, $S" "$RN" &
$G assets/ai/frames/nino_grab.png      portrait "$NIN, charging forward shoulder first with the bronze shoulder guard leading, $S" "$RN" &
$G assets/ai/frames/nino_hurt.png      portrait "$NIN, staggering back from a hit, helmet knocked askew, $S" "$RN" &
$G assets/ai/frames/nino_down.png      landscape "$NIN, lying knocked out flat on his back on the ground, helmet beside him, $S" "$RN" &
wait
echo CAST45-DONE
ls assets/ai/frames/ | wc -l
