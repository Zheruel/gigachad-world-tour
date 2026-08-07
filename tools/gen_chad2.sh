#!/bin/bash
# gen_chad2.sh - CHAD animation pass 2: a proper 8-frame walk cycle, a 6-frame
# run, multi-frame attacks (a 1-frame punch reads as a pop, not a strike), plus
# the finisher and the new super.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/chad

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and leather, crisp dark 1px outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

# ---------------------------------------------------- 8-frame walk cycle
# Standard contact / down / passing / up, twice, opposite legs. Described by
# exact leg and arm phase so the frames actually chain instead of waddling.
echo "=== walk cycle ==="
$G $O/chad_wlk1.png portrait "$CHAD, walking to the right, CONTACT pose: left leg stretched forward with the heel just touching down, right leg stretched back with the toe pushing off, right arm swung forward, left arm swung back, torso upright, $S" "$R" &
$G $O/chad_wlk2.png portrait "$CHAD, walking to the right, DOWN pose: body at its lowest point, front left knee bent absorbing the weight, back right foot lifting off, arms halfway through their swing near his sides, $S" "$R" &
$G $O/chad_wlk3.png portrait "$CHAD, walking to the right, PASSING pose: right leg swinging through directly under the body beside the straight left leg, body at its highest point, arms hanging straight down at his sides, $S" "$R" &
$G $O/chad_wlk4.png portrait "$CHAD, walking to the right, UP pose: pushing up off the straight left leg, right knee lifted and swinging forward, left arm coming forward, right arm going back, $S" "$R" &
wait
$G $O/chad_wlk5.png portrait "$CHAD, walking to the right, CONTACT pose with legs reversed: right leg stretched forward with the heel just touching down, left leg stretched back with the toe pushing off, left arm swung forward, right arm swung back, torso upright, $S" "$R" &
$G $O/chad_wlk6.png portrait "$CHAD, walking to the right, DOWN pose with legs reversed: body at its lowest point, front right knee bent absorbing the weight, back left foot lifting off, arms halfway through their swing near his sides, $S" "$R" &
$G $O/chad_wlk7.png portrait "$CHAD, walking to the right, PASSING pose with legs reversed: left leg swinging through directly under the body beside the straight right leg, body at its highest point, arms hanging straight down at his sides, $S" "$R" &
$G $O/chad_wlk8.png portrait "$CHAD, walking to the right, UP pose with legs reversed: pushing up off the straight right leg, left knee lifted and swinging forward, right arm coming forward, left arm going back, $S" "$R" &
wait

# ---------------------------------------------------- 6-frame run cycle
echo "=== run cycle ==="
$G $O/chad_rn1.png portrait "$CHAD, running hard to the right leaning forward, CONTACT: left foot striking the ground in front, right leg trailing back bent, right arm driving forward bent at the elbow, $S" "$R" &
$G $O/chad_rn2.png portrait "$CHAD, running hard to the right leaning forward, RECOIL: body compressed at its lowest, left knee deeply bent under the weight, right knee driving forward, $S" "$R" &
$G $O/chad_rn3.png portrait "$CHAD, running hard to the right leaning forward, PUSH OFF: left leg fully extended straight behind pushing off the ground, right knee raised high in front, $S" "$R" &
wait
$G $O/chad_rn4.png portrait "$CHAD, running hard to the right leaning forward, AIRBORNE: both feet completely off the ground, right leg reaching forward, left leg tucked back, left arm driving forward, $S" "$R" &
$G $O/chad_rn5.png portrait "$CHAD, running hard to the right leaning forward, CONTACT reversed: right foot striking the ground in front, left leg trailing back bent, left arm driving forward, $S" "$R" &
$G $O/chad_rn6.png portrait "$CHAD, running hard to the right leaning forward, PUSH OFF reversed: right leg fully extended straight behind pushing off, left knee raised high in front, $S" "$R" &
wait

# ---------------------------------------------------- multi-frame attacks
echo "=== attacks ==="
$G $O/chad_jab1.png portrait "$CHAD, start of a straight jab: both fists raised in a boxing guard by his chin, lead shoulder just beginning to turn over, weight on the back foot, $S" "$R" &
$G $O/chad_jab2.png portrait "$CHAD, peak of a straight jab: lead arm snapped out completely straight at shoulder height, fist clenched, shoulder rotated fully behind the punch, rear fist tucked at the chin, $S" "$R" &
$G $O/chad_jab3.png portrait "$CHAD, recovery from a jab: lead arm halfway retracted back toward his chin, elbow bent, shoulders settling, $S" "$R" &
$G $O/chad_hk1.png portrait "$CHAD, winding up a hook punch: rear fist drawn back and out to the side, torso coiled and rotated away, front shoulder dipped, $S" "$R" &
wait
$G $O/chad_hk2.png portrait "$CHAD, peak of a hook punch: rear arm swung round in a horizontal arc, elbow bent at ninety degrees, fist at head height in front of him, torso rotated fully through the swing, $S" "$R" &
$G $O/chad_hk3.png portrait "$CHAD, follow through after a hook: punching arm carried across his body past the centre line, torso over-rotated, off balance forward, $S" "$R" &
$G $O/chad_up1.png portrait "$CHAD, start of an uppercut: crouched down low, knees bent deep, rear fist dropped down by his hip, coiled to explode upward, $S" "$R" &
$G $O/chad_up2.png portrait "$CHAD, middle of an uppercut: driving upward out of the crouch, legs half extended, fist rising past his own chest, $S" "$R" &
wait
$G $O/chad_up3.png portrait "$CHAD, peak of an uppercut: fully extended upward on his toes, punching fist thrust high above his own head, body stretched in a straight line, $S" "$R" &
$G $O/chad_up4.png portrait "$CHAD, recovery after an uppercut: arm coming back down from overhead, feet settling flat, chest still open, $S" "$R" &
$G $O/chad_kne1.png portrait "$CHAD, start of a knee strike: both hands gripping down in front of him at chest height as if holding a collar, front knee just starting to lift, $S" "$R" &
$G $O/chad_kne2.png portrait "$CHAD, peak of a knee strike: front knee driven up hard to chest height, both hands pulling sharply down in front of him, standing leg straight on the toe, $S" "$R" &
wait

# ---------------------------------------------------- finisher
echo "=== finisher ==="
$G $O/chad_fin1.png portrait "$CHAD, one arm thrust straight out to the right at head height with the hand open in a throttling grip as if holding a man off the ground by the throat, other fist clenched at his side, sneering, $S" "$R" &
$G $O/chad_fin2.png portrait "$CHAD, still holding one arm out to the right in a throttling grip, head reared far back ready to deliver a headbutt, $S" "$R" &
$G $O/chad_fin3.png portrait "$CHAD, lunging his head forward delivering a savage headbutt, one arm still extended in a grip, body driving forward, $S" "$R" &
$G $O/chad_fin4.png landscape "$CHAD, having just slammed someone into the ground, bent forward at the waist with both arms driven straight down toward the floor in front of him, $S" "$R" &
wait

# ---------------------------------------------------- super: WORLD TOUR
echo "=== super ==="
$G $O/chad_sup1.png portrait "$CHAD, flicking a lit cigar away to the side with two fingers, head lowered, other fist clenching, about to explode, $S" "$R" &
$G $O/chad_sup2.png portrait "$CHAD, coiled in a deep crouch with both fists clenched down low at his sides, shoulders hunched, whole body straining, $S" "$R" &
$G $O/chad_sup3.png portrait "$CHAD, exploding upward into an enormous uppercut, both feet leaving the ground, one fist punched high overhead, body arched back, roaring, $S" "$R" &
$G $O/chad_sup4.png portrait "$CHAD, at the very top of a huge leaping uppercut, fully stretched out vertically in the air, fist at maximum height above his head, $S" "$R" &
wait

echo "=== chad pass 2 done ==="
ls assets/ai/chad | wc -l
