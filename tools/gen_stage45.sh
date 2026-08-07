#!/bin/bash
# Reference sheets + backgrounds for stages 4 (Wolff's World oil pit) and 5 (Gladiators arena).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

R="16-bit SNES beat em up game character reference, crisp detailed pixel art in the style of Streets of Rage 2 and Final Fight, single full body character, side view facing right, standing, feet on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"
BG="16-bit SNES beat em up game background art in the style of Streets of Rage 2, wide side-scrolling interior seen straight from the side, crisp detailed pixel art, moody lighting, no people, no characters, no text, no watermark, no border"

$G assets/ai/ref_oiler_fullbody.png portrait "A heavily oiled wrestler, thick muscular build, shaved head, glistening slick skin with bright highlights, wearing tight black wrestling trunks, barefoot, low grappling stance with hands open. $R" &
$G assets/ai/ref_philippe_fullbody.png portrait "A lean French male fitness model and wrestler, dark wavy shoulder-length hair, tanned athletic build, wearing bright blue wrestling trunks and white socks, cocky stance with one hand on hip. $R" &
$G assets/ai/ref_jirka_fullbody.png portrait "A very tall lean muscular Czech wrestler, short dark brown hair, pale skin, long limbs, wearing dark green wrestling trunks and black wrestling boots, towering over the frame, arms loose and ready. $R" &
$G assets/ai/ref_nino_fullbody.png portrait "A Roman gladiator: muscular man with black curly hair and a short beard, bronze gladiator helmet with a red crest, bronze shoulder guard on one arm, brown leather loincloth and studded belt, leather sandals, holding a short sword low. $R" &
wait

$G assets/ai/bg_oil_a.png landscape "Underground oil wrestling room, left section: dark red painted brick walls, a low black rubber wrestling mat pit glistening with spilled oil, shelves of oil bottles, rolled towels, a wall mirror with a dim reflection, red hanging lamps, wet black rubber floor at the very bottom. $BG" &
$G assets/ai/bg_oil_b.png landscape "Underground oil wrestling room, right section: full length mirrored wall panels, a weight bench and dumbbell rack, a shower head with a drain, stacked crates of oil bottles, red neon strip along the ceiling, wet black rubber floor at the very bottom. $BG" &
$G assets/ai/bg_arena_a.png landscape "Roman colosseum arena, left section: massive weathered stone block walls, a heavy iron portcullis gate, burning torches in brackets, red and gold banners hanging, dark crowd silhouettes in the shadowed stands above, sandy dirt arena floor at the very bottom. $BG" &
$G assets/ai/bg_arena_b.png landscape "Roman colosseum arena, right section: the emperor's marble viewing box with columns and statues, weapon racks holding spears shields and tridents, laurel banners, chained iron cages, dark crowd silhouettes above, sandy dirt arena floor at the very bottom. $BG" &
wait

$G assets/ai/bg_oil_floor.png landscape "Seamless tileable floor texture, top-down slightly angled view of a black rubber wrestling mat slick with glistening oil, bright specular highlights and smeared reflections, dark red rim light, 16-bit SNES pixel art game floor texture, no people, no objects, no text" &
$G assets/ai/bg_arena_floor.png landscape "Seamless tileable floor texture, top-down slightly angled view of pale sandy arena dirt with scattered small stones, drag marks and dark stains, faint raked lines, 16-bit SNES pixel art game floor texture, no people, no objects, no text" &
wait
echo STAGE45-REFS-DONE
