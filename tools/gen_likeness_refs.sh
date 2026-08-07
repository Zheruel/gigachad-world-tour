#!/bin/bash
# Character reference sheets built from real photo references (assets/ref/pick).
# The photos drive the likeness; the prompt drives the costume and the SNES style.
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh
P=assets/ref/pick

STYLE="16-bit Sega Genesis beat em up character reference in the exact style of Streets of Rage 2 and Final Fight: chunky readable pixel art, hard 1px dark outline around the whole body, limited 20 colour palette, strong top-left key light with deep shadow on the right, no anti-aliasing mush, single full body character, side view facing right, standing, feet flat on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

LIKE="The face, hair and body type must clearly match the man in the attached photo reference - same face shape, same hair, same build."

$G assets/ai/ref2_billy.png portrait "$LIKE A tall broad blond-brown haired American bodybuilder wrestler with a square jaw and a friendly confident grin, wearing blue denim jeans, a brown leather belt, red fingerless gloves and red and white wrestling boots, bare chested, fists up in a wrestling stance. $STYLE" "$P/billy_face.png" "$P/billy_body.jpg" &
$G assets/ai/ref2_van.png portrait "$LIKE A Vietnamese-American leather bondage master with slicked black hair and a thin moustache, wearing a black leather peaked cap, mirrored sunglasses, a studded black leather chest harness with steel rings, studded leather wristbands, tight black leather trousers and tall black leather boots, arms slightly spread, menacing. $STYLE" "$P/van_body.png" &
$G assets/ai/ref2_danny.png portrait "$LIKE A tall Canadian bodybuilder wrestler with short dark blond hair and a strong square face, deeply tanned, wearing plain white wrestling briefs and white wrestling boots, bare chested, cocky fighting stance. $STYLE" "$P/danny_face.jpg" "$P/danny_body.jpg" &
$G assets/ai/ref2_wolff.png portrait "$LIKE A Canadian-Greek bodybuilder wrestler with short jet black hair, clean shaven, deep tan, extremely muscular and vascular, wearing bright red wrestling trunks and black wrestling boots, aggressive stance with fists clenched. $STYLE" "$P/wolff_body.jpg" &
$G assets/ai/ref2_maxon.png portrait "$LIKE An American wrestler with shoulder-length wavy blond hair and a thick blond moustache, tanned and muscular, wearing dark blue wrestling trunks and white wrestling boots, arms crossed over his chest. $STYLE" "$P/maxon_body.jpg" &
wait
$G assets/ai/ref2_ricardo.png portrait "$LIKE A Brazilian dancer with dark brown skin and a bright red bandana tied around his head, short black hair, athletic muscular build, bare chested, wearing shiny dark grey dance shorts, barefoot, mid dance move with hips cocked and arms out. $STYLE" "$P/ricardo_body.jpg" "$P/ricardo_pose.jpg" &
wait
echo LIKENESS-REFS-DONE
ls -la assets/ai/ref2_*.png
