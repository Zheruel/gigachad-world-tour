#!/bin/bash
# gen_chad.sh - every animation frame for CHAD, generated against ref_chad.png
# so the character, costume and build stay identical across poses.
# Output: assets/ai/chad/chad_<state>.png  ->  tools/process_char.py turns these
# into assets/frames/chad_<state>.png at a uniform scale and shared palette.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/chad

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and leather, crisp dark 1px outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, hair, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

b() { echo "=== batch $1 ==="; }

# ---------------------------------------------------------------- idle + walk
b 1
$G $O/chad_idle1.png    portrait "$CHAD, standing relaxed in a confident fighting stance, weight on the back foot, fists loose at his sides, chin slightly raised, $S" "$R" &
$G $O/chad_idle2.png    portrait "$CHAD, standing relaxed in a confident fighting stance, chest expanded on an inhale, shoulders raised very slightly, fists loose at his sides, $S" "$R" &
$G $O/chad_idle3.png    portrait "$CHAD, standing relaxed in a confident fighting stance, shoulders settling on an exhale, fists loose at his sides, $S" "$R" &
$G $O/chad_walk1.png    portrait "$CHAD, walking forward, left leg striding forward and right arm swinging forward, full contact stride, $S" "$R" &
$G $O/chad_walk2.png    portrait "$CHAD, walking forward, legs passing close together mid-stride, body at its highest point, $S" "$R" &
wait
b 2
$G $O/chad_walk3.png    portrait "$CHAD, walking forward, right leg striding forward and left arm swinging forward, full contact stride, $S" "$R" &
$G $O/chad_walk4.png    portrait "$CHAD, walking forward, legs passing close together mid-stride with the opposite leg leading, $S" "$R" &
$G $O/chad_run1.png     portrait "$CHAD, running hard to the right, leaning forward, front knee driving up high, arms pumping, $S" "$R" &
$G $O/chad_run2.png     portrait "$CHAD, running hard to the right, both feet off the ground in the airborne phase of the run, $S" "$R" &
$G $O/chad_run3.png     portrait "$CHAD, running hard to the right, front foot planting and taking the weight, torso leaning forward, $S" "$R" &
wait
b 3
$G $O/chad_run4.png     portrait "$CHAD, running hard to the right, back leg extended fully behind him after push off, $S" "$R" &
$G $O/chad_dash1.png    landscape "$CHAD, dashing forward low and fast to the right, body stretched forward, trailing leg extended far behind, $S" "$R" &
$G $O/chad_dash2.png    landscape "$CHAD, dashing forward to the right with a shoulder lowered into a running tackle, $S" "$R" &
$G $O/chad_jump.png     portrait "$CHAD, jumping upward, knees tucked up toward his chest, arms tight to the body, $S" "$R" &
$G $O/chad_jumpfall.png portrait "$CHAD, falling downward from a jump, legs beginning to extend below him, arms out for balance, $S" "$R" &
wait

# ---------------------------------------------------------------- attacks
b 4
$G $O/chad_jumpkick.png landscape "$CHAD, airborne flying kick to the right, front leg fully extended straight out with the boot leading, body horizontal, $S" "$R" &
$G $O/chad_jab.png      portrait "$CHAD, throwing a fast straight jab to the right with the lead arm fully extended at shoulder height, fist clenched, $S" "$R" &
$G $O/chad_hook.png     portrait "$CHAD, throwing a heavy hook punch to the right, torso rotated hard into the swing, rear shoulder driving through, $S" "$R" &
$G $O/chad_uppercut.png portrait "$CHAD, throwing a rising uppercut, fist punching upward past his own head, body uncoiling upward on the front leg, $S" "$R" &
$G $O/chad_grab.png     portrait "$CHAD, lunging forward with both arms outstretched to the right to grab an opponent by the collar, hands open, $S" "$R" &
wait
b 5
$G $O/chad_knee.png     portrait "$CHAD, driving a knee strike upward, front knee raised high to chest height, both hands pulling down in front of him, $S" "$R" &
$G $O/chad_suplex1.png  portrait "$CHAD, back arched, both arms raised overhead as if lifting a heavy opponent above his head, $S" "$R" &
$G $O/chad_suplex2.png  landscape "$CHAD, arched over backwards completing a suplex slam, both arms swept behind and down, $S" "$R" &
$G $O/chad_throw1.png   portrait "$CHAD, twisting his torso back with both arms cocked to one side, winding up to hurl something heavy, $S" "$R" &
$G $O/chad_throw2.png   portrait "$CHAD, having just hurled something forward, both arms extended out to the right at chest height, torso rotated through, $S" "$R" &
wait

# ---------------------------------------------------------------- reactions
b 6
$G $O/chad_hurt.png     portrait "$CHAD, recoiling backwards from taking a punch, head snapped back, arms flung loose, sunglasses askew, $S" "$R" &
$G $O/chad_down.png     landscape "$CHAD, knocked down and lying flat on his back, arms sprawled out, legs loose, seen from the side, $S" "$R" &
$G $O/chad_getup.png    portrait "$CHAD, pushing himself up off the ground onto one knee with one hand planted on the floor, $S" "$R" &
$G $O/chad_wallsplat.png portrait "$CHAD, slammed flat backwards against a wall, arms splayed wide, chest thrust out, head back, $S" "$R" &
$G $O/chad_victory.png  portrait "$CHAD, victory pose, both arms raised in a double biceps flex, chin up, grinning, $S" "$R" &
wait
b 7
$G $O/chad_special1.png portrait "$CHAD, crouched low and coiled with both fists drawn back, energy gathering, about to explode upward, $S" "$R" &
$G $O/chad_special2.png portrait "$CHAD, mid spinning attack with both arms flung out wide horizontally, body rotating, $S" "$R" &
$G $O/chad_taunt.png    portrait "$CHAD, standing upright and beckoning with one open hand, come at me gesture, smirking, $S" "$R" &
wait

# ---------------------------------------------------------------- idle animations
b 8
$G $O/chad_idle_cigar1.png portrait "$CHAD, reaching into his leather jacket pocket with one hand, $S" "$R" &
$G $O/chad_idle_cigar2.png portrait "$CHAD, holding a fat brown Cuban cigar up in front of his face, inspecting it, $S" "$R" &
$G $O/chad_idle_cigar3.png portrait "$CHAD, a fat brown Cuban cigar clamped in his teeth, flicking open a silver zippo lighter in one hand, $S" "$R" &
$G $O/chad_idle_cigar4.png portrait "$CHAD, a fat brown Cuban cigar in his teeth, holding a lit zippo lighter flame up to the tip of the cigar, small bright flame, $S" "$R" &
$G $O/chad_idle_cigar5.png portrait "$CHAD, a lit Cuban cigar in his teeth with a glowing orange tip, head tilted back, exhaling smoke upward, $S" "$R" &
wait
b 9
$G $O/chad_idle_cigar6.png portrait "$CHAD, standing relaxed with a lit Cuban cigar clamped in his teeth, glowing orange tip, arms at his sides, $S" "$R" &
$G $O/chad_idle_shades1.png portrait "$CHAD, one hand raised to the bridge of his black aviator sunglasses, $S" "$R" &
$G $O/chad_idle_shades2.png portrait "$CHAD, pushing his black aviator sunglasses up his nose with one finger, smirking, $S" "$R" &
$G $O/chad_idle_shades3.png portrait "$CHAD, lowering his hand from his sunglasses, a bright white gleam glinting off the dark lens, $S" "$R" &
$G $O/chad_idle_shades4.png portrait "$CHAD, standing with arms at his sides again after adjusting his sunglasses, chin raised, $S" "$R" &
wait
b 10
$G $O/chad_idle_flex1.png portrait "$CHAD, beginning to raise both arms out to the sides, elbows bending, $S" "$R" &
$G $O/chad_idle_flex2.png portrait "$CHAD, holding a full double biceps flex pose, both arms up, biceps bulging enormously, $S" "$R" &
$G $O/chad_idle_flex3.png portrait "$CHAD, holding a double biceps flex, straining harder, veins standing out on the arms, $S" "$R" &
$G $O/chad_idle_flex4.png portrait "$CHAD, lowering his arms back down to his sides after flexing, $S" "$R" &
$G $O/chad_idle_knuckles1.png portrait "$CHAD, bringing both hands together in front of his chest, fingers interlocking, $S" "$R" &
wait
b 11
$G $O/chad_idle_knuckles2.png portrait "$CHAD, pressing his interlocked hands outward in front of him to crack his knuckles, $S" "$R" &
$G $O/chad_idle_knuckles3.png portrait "$CHAD, rolling his head and neck to one side, one hand on the opposite shoulder, $S" "$R" &
$G $O/chad_idle_knuckles4.png portrait "$CHAD, dropping his hands back to his sides, head level, $S" "$R" &
wait

echo "=== chad frames done ==="
ls assets/ai/chad | wc -l
