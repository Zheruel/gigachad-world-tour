#!/bin/bash
# gen_chad_ref.sh - CHAD character reference sheets.
# Generates 3 variants; pick the best one and use it as the -i reference for
# every animation frame in gen_chad.sh so the character stays consistent.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh

STYLE="32-bit arcade beat em up game character reference in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading on skin and leather, crisp dark 1px outline around the whole body, dramatic top-left key light with deep shadow on the right, no blur, no anti-aliasing mush, single full body character, side view facing right, standing, feet flat on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

CHAD="A tall extremely muscular Nordic man in his early thirties, huge shredded physique with broad shoulders, thick arms and a heavy chest, short slicked-back platinum blond hair, strong square jaw and sharp cheekbones, wearing black aviator sunglasses, a black leather biker jacket with the sleeves cut off at the shoulder showing his huge bare arms, bare chested under the open jacket, blue denim jeans and heavy black boots, standing with an arrogant confident posture"

$G assets/ai/ref_chad_a.png portrait "$CHAD, $STYLE" &
$G assets/ai/ref_chad_b.png portrait "$CHAD, one hand adjusting his sunglasses, smirking, $STYLE" &
$G assets/ai/ref_chad_c.png portrait "$CHAD, arms crossed over his chest, chin raised, unimpressed expression, $STYLE" &
wait
echo "--- refs done ---"
ls -la assets/ai/ref_chad_*.png
