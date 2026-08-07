#!/bin/bash
# Reference sheets for the two henchman types. Run before gen_cast2.sh.
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

REFSTYLE="16-bit SNES beat em up game character reference, crisp detailed pixel art in the style of Streets of Rage 2 and Final Fight, single full body character, side view facing right, standing straight, feet on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

$G assets/ai/ref_whip_fullbody.png portrait "A lean wiry leather club henchman: pale muscular man in a black leather harness with studs, black leather cap, black leather trousers, fingerless gloves, holding a coiled black chain whip in one hand, sneering. $REFSTYLE" &
$G assets/ai/ref_bather_fullbody.png portrait "A stocky bathhouse bruiser henchman: thick-set oiled muscular man with a shaved head, red terry sweatband, a white towel around his waist, a white towel draped over one shoulder, flip-flop sandals, steaming red skin, aggressive stance. $REFSTYLE" &
wait
echo REFS-DONE
ls -la assets/ai/ref_whip_fullbody.png assets/ai/ref_bather_fullbody.png
