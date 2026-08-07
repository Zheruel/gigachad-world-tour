#!/bin/bash
# Reference sheets for the canon gachimuchi cast. Appearances follow gachiwiki.info
# (Danny Lee, Van Darkholme, Mark Wolff, Brian Maxon, Ricardo Milos).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

R="16-bit SNES beat em up game character reference, crisp detailed pixel art in the style of Streets of Rage 2 and Final Fight, single full body character, side view facing right, standing, feet on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

$G assets/ai/ref_danny_fullbody.png portrait "A tall Canadian bodybuilder wrestler, 6 foot, huge lean muscular build, short spiky dark-blond hair, clean shaven, tanned skin, green eyes, wearing plain white wrestling briefs and white wrestling boots, confident cocky stance. $R" &
$G assets/ai/ref_van_fullbody2.png portrait "A Vietnamese-American leather bondage master, athletic muscular build, black hair, thin black moustache and small goatee, wearing a black leather peaked cap, mirrored sunglasses, a studded black leather chest harness with steel O-rings, studded leather wristbands, tight black leather shorts and tall black leather boots, arms slightly spread, menacing. $R" &
$G assets/ai/ref_wolff_fullbody.png portrait "A Canadian-Greek bodybuilder wrestler, extremely muscular and vascular, short jet black hair, clean shaven, blue eyes, deep tan, wearing bright red wrestling trunks and black wrestling boots, aggressive cocky stance with fists clenched. $R" &
$G assets/ai/ref_maxon_fullbody.png portrait "An American wrestler with a classic 1990s look, muscular build, shoulder-length wavy dark-blond hair, thick blond moustache, tanned skin, wearing dark blue wrestling trunks and white wrestling boots, arms crossed over his chest. $R" &
$G assets/ai/ref_ricardo_fullbody.png portrait "A Brazilian dancer, dark brown skin, short black hair, black fedora hat tilted on his head, athletic muscular build, wearing only plain white briefs, barefoot, mid dance move with one hip cocked and arms out. $R" &
wait
echo LORE-REFS-DONE
ls -la assets/ai/ref_danny_fullbody.png assets/ai/ref_van_fullbody2.png assets/ai/ref_wolff_fullbody.png assets/ai/ref_maxon_fullbody.png assets/ai/ref_ricardo_fullbody.png 2>&1
