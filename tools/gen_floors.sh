#!/bin/bash
# Clean floor textures (the old gym floor source had text baked into it).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh
F="32-bit arcade game floor texture, top-down slightly angled view, richly detailed pixel art in the style of Streets of Rage 4, seamless horizontally tileable, no people, no objects, no text, no watermark, no letters, no signature"
$G assets/ai/bg_gymfloor2.png landscape "Polished dark wooden gym floor planks with a warm glossy sheen, scuffs and worn patches, faint painted court line, warm amber lamp reflections. $F" &
wait
echo FLOORS-DONE
