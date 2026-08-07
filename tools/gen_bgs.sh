#!/bin/bash
# Stage 2 / stage 3 background panels, floor textures and the ending illustration.
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

BGSTYLE="16-bit SNES beat em up game background art in the style of Streets of Rage 2, wide side-scrolling interior panorama seen straight from the side, crisp detailed pixel art, dark moody lighting, no people, no characters, no text, no watermark, no border, no user interface"

$G assets/ai/bg_dungeon_a.png landscape "Underground leather dungeon nightclub, left section: rough dark stone brick wall, two iron hanging cages on chains, burning torch sconces with orange flame, a wooden X-shaped bondage cross against the wall, coiled chains and leather straps on hooks, purple and magenta neon rim light, low velvet rope barrier, dark checkerboard tiles at the very bottom. $BGSTYLE" &
$G assets/ai/bg_dungeon_b.png landscape "Underground leather dungeon nightclub, bar section: black lacquered bar counter with rows of glowing bottles, red neon strip lighting under the bar, studded red leather couch, a big glowing red neon heart sign on the stone wall, disco ball hanging from the ceiling casting purple light spots, speaker stacks, dark checkerboard tiles at the very bottom. $BGSTYLE" &
$G assets/ai/bg_sauna_a.png landscape "Wooden sauna interior, left section: honey coloured cedar plank walls, tiered wooden benches, a black iron stove full of glowing orange hot rocks, wooden buckets and ladles, birch whisks hanging on pegs, a small steamed-up window, thick warm steam drifting, amber lamp glow, wet wooden slat floor at the very bottom. $BGSTYLE" &
wait

$G assets/ai/bg_sauna_b.png landscape "Tiled steam room interior, right section: pale blue and white ceramic tile walls, brass shower heads, a marble bench, a stone plunge pool with rippling turquoise water, steam vents pouring white steam, hanging towels, a big round wall thermometer, wet reflective tiled floor at the very bottom. $BGSTYLE" &
$G assets/ai/bg_dungeon_floor.png landscape "Seamless tileable floor texture, top-down slightly angled view of a glossy black and violet checkerboard tile dance floor, wet reflective sheen, faint magenta neon reflections, 16-bit SNES pixel art game floor texture, no people, no objects, no text, no watermark" &
$G assets/ai/bg_sauna_floor.png landscape "Seamless tileable floor texture, top-down slightly angled view of wet duckboard wooden slats over pale stone tiles, puddles of water reflecting warm amber light, drifting steam, 16-bit SNES pixel art game floor texture, no people, no objects, no text, no watermark" &
wait

$G assets/ai/ending_art.png landscape "16-bit SNES game ending illustration, crisp detailed pixel art: a triumphant muscular blond wrestler hero in blue jeans, brown belt, red fingerless gloves and red boots standing victorious on top of a huge heap of defeated muscular bodybuilders, flexing both arms, golden sunrise light streaming through gym windows behind him, dramatic rim lighting, confetti of dumbbell plates, heroic epic mood, no text, no watermark, no border" &
wait
echo BGS-DONE
ls -la assets/ai/bg_dungeon_* assets/ai/bg_sauna_* assets/ai/ending_art.png 2>/dev/null
