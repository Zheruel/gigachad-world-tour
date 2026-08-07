#!/bin/bash
# 32-bit detail frames for the likeness-corrected cast (needs gen_likeness_refs.sh).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and cloth, crisp dark outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

BILLY="A blond-brown haired American bodybuilder wrestler in blue denim jeans, brown leather belt, red fingerless gloves and red and white wrestling boots, bare chested"
VAN="A Vietnamese-American leather master in a black leather peaked cap, mirrored sunglasses, studded black leather chest harness, studded wristbands, black leather trousers and tall black leather boots"
DANNY="A tanned Canadian bodybuilder wrestler with short dark blond hair, in plain white wrestling briefs and white wrestling boots, bare chested"
WOLFF="A deeply tanned bodybuilder wrestler with short jet black hair, in bright red wrestling trunks and black wrestling boots, bare chested"
MAXON="An American wrestler with shoulder-length wavy blond hair and a thick blond moustache, in dark blue wrestling trunks and white wrestling boots"
RIC="A Brazilian dancer with dark brown skin and a bright red bandana tied round his head, bare chested, in shiny dark grey dance shorts, barefoot"

RB=assets/ai/ref2_billy.png
RV=assets/ai/ref2_van.png
RD=assets/ai/ref2_danny.png
RW=assets/ai/ref2_wolff.png
RM=assets/ai/ref2_maxon.png
RR=assets/ai/ref2_ricardo.png

# ---- billy (player) ----
$G assets/ai/v3/hero_idle.png      portrait  "$BILLY, standing in a fighting stance with fists raised, $S" "$RB" &
$G assets/ai/v3/hero_walk1.png     portrait  "$BILLY, walking with left leg forward and arms swinging, $S" "$RB" &
$G assets/ai/v3/hero_walk2.png     portrait  "$BILLY, walking mid stride with legs passing each other, $S" "$RB" &
$G assets/ai/v3/hero_walk3.png     portrait  "$BILLY, walking with right leg forward and arms swinging, $S" "$RB" &
$G assets/ai/v3/hero_jab.png       portrait  "$BILLY, throwing a fast straight jab with the lead arm fully extended, $S" "$RB" &
wait
$G assets/ai/v3/hero_hook.png      portrait  "$BILLY, throwing a heavy hook punch with the torso twisted into it, $S" "$RB" &
$G assets/ai/v3/hero_uppercut.png  portrait  "$BILLY, throwing a rising uppercut, fist high above his head, body arched, $S" "$RB" &
$G assets/ai/v3/hero_dash.png      portrait  "$BILLY, sprinting forward hard, leaning into the run, arms pumping, $S" "$RB" &
$G assets/ai/v3/hero_jump.png      portrait  "$BILLY, jumping in mid air with knees tucked up, $S" "$RB" &
$G assets/ai/v3/hero_jumpkick.png  landscape "$BILLY, flying side kick in mid air with the front leg fully extended, $S" "$RB" &
wait
$G assets/ai/v3/hero_grab.png      portrait  "$BILLY, reaching forward with both arms to grab an opponent, $S" "$RB" &
$G assets/ai/v3/hero_knee.png      portrait  "$BILLY, driving a knee strike upward while pulling down with both hands, $S" "$RB" &
$G assets/ai/v3/hero_throw.png     portrait  "$BILLY, heaving a throw, both arms swung forward and down, torso twisted, $S" "$RB" &
$G assets/ai/v3/hero_hurt.png      portrait  "$BILLY, recoiling from a punch, head snapped back, arms flailing, $S" "$RB" &
$G assets/ai/v3/hero_down.png      landscape "$BILLY, lying knocked flat on his back on the ground, $S" "$RB" &
wait
$G assets/ai/v3/hero_getup.png     portrait  "$BILLY, crouched on one knee pushing himself back up off the ground, $S" "$RB" &
$G assets/ai/v3/hero_victory.png   portrait  "$BILLY, both arms raised high in a victory flex, $S" "$RB" &
$G assets/ai/v3/hero_special.png   portrait  "$BILLY, spinning with both arms flung out wide and head thrown back, crackling golden energy aura, $S" "$RB" &
$G assets/ai/v3/van2_idle.png      portrait  "$VAN, standing menacingly with arms slightly spread, $S" "$RV" &
$G assets/ai/v3/van2_walk1.png     portrait  "$VAN, striding forward with left leg forward, $S" "$RV" &
wait
# ---- van ----
$G assets/ai/v3/van2_walk2.png     portrait  "$VAN, striding forward with right leg forward, $S" "$RV" &
$G assets/ai/v3/van2_punch.png     portrait  "$VAN, throwing a devastating straight punch, arm fully extended, $S" "$RV" &
$G assets/ai/v3/van2_slam.png      portrait  "$VAN, leaping with both fists clasped high overhead about to slam down, $S" "$RV" &
$G assets/ai/v3/van2_grab.png      portrait  "$VAN, reaching forward with both hands open to seize his victim, $S" "$RV" &
$G assets/ai/v3/van2_hurt.png      portrait  "$VAN, staggering back from a heavy hit, cap tipping, $S" "$RV" &
wait
$G assets/ai/v3/van2_down.png      landscape "$VAN, lying knocked flat on his back on the ground, $S" "$RV" &
$G assets/ai/v3/danny_idle.png     portrait  "$DANNY, standing in a wrestling stance with fists raised, $S" "$RD" &
$G assets/ai/v3/danny_walk1.png    portrait  "$DANNY, stepping forward with left leg forward, $S" "$RD" &
$G assets/ai/v3/danny_walk2.png    portrait  "$DANNY, stepping forward with right leg forward, $S" "$RD" &
$G assets/ai/v3/danny_punch.png    portrait  "$DANNY, throwing a fast straight punch, arm fully extended, $S" "$RD" &
wait
# ---- danny ----
$G assets/ai/v3/danny_slam.png     landscape "$DANNY, leaping forward with one knee driven forward in a flying knee, $S" "$RD" &
$G assets/ai/v3/danny_grab.png     portrait  "$DANNY, lunging forward with both arms out to grapple, $S" "$RD" &
$G assets/ai/v3/danny_hurt.png     portrait  "$DANNY, recoiling from a punch, head snapped back, $S" "$RD" &
$G assets/ai/v3/danny_down.png     landscape "$DANNY, lying knocked flat on his back on the ground, $S" "$RD" &
$G assets/ai/v3/wolff_idle.png     portrait  "$WOLFF, standing in a wrestler's stance with fists up, $S" "$RW" &
wait
# ---- wolff ----
$G assets/ai/v3/wolff_walk1.png    portrait  "$WOLFF, stalking forward with left leg forward, $S" "$RW" &
$G assets/ai/v3/wolff_walk2.png    portrait  "$WOLFF, stalking forward with right leg forward, $S" "$RW" &
$G assets/ai/v3/wolff_punch.png    portrait  "$WOLFF, throwing a huge hammer fist punch, arm fully extended, $S" "$RW" &
$G assets/ai/v3/wolff_slam.png     portrait  "$WOLFF, leaping with both arms raised high overhead about to hammer down, $S" "$RW" &
$G assets/ai/v3/wolff_grab.png     portrait  "$WOLFF, lunging forward with both arms wide to lock up his opponent, $S" "$RW" &
wait
$G assets/ai/v3/wolff_hurt.png     portrait  "$WOLFF, staggering backwards from a hit, head thrown back, $S" "$RW" &
$G assets/ai/v3/wolff_down.png     landscape "$WOLFF, lying knocked flat on his back on the ground, $S" "$RW" &
$G assets/ai/v3/maxon_idle.png     portrait  "$MAXON, standing in a wrestling stance with fists raised, $S" "$RM" &
$G assets/ai/v3/maxon_walk1.png    portrait  "$MAXON, stepping forward with left leg forward, $S" "$RM" &
$G assets/ai/v3/maxon_walk2.png    portrait  "$MAXON, stepping forward with right leg forward, $S" "$RM" &
wait
# ---- maxon + ricardo ----
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
echo CAST-V3-DONE
ls assets/ai/v3 | wc -l
