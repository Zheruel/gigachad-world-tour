#!/bin/bash
# gen_lair_gym.sh - the gym in front of the glass. All of it is furniture.
#
# The rack and the bench were walk-up stations for a while - four generations each, the rig
# alone then three poses of CHAD lifting on it, and a whole apparatus in build_lair_extras.py
# to stop the equipment moving between them. The bag is the gym's action and always was; those
# two were a second and third way to do the same thing. What is left is one generation per
# object, and they earn their place by looking like they belong to someone who lifts more than
# you do: six plates a side and a bar that BOWS, dumbbells that get absurd towards the end of
# the rack. Say that as loading and wear, not as adjectives.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

echo "=== the rack and the bench ==="
$G $O/gym_bench.png landscape "A heavy duty flat weight bench with a two post barbell rack at the head of it, seen in exact side view, nobody using it. It belongs to somebody absurdly strong and it says so: the olympic barbell resting across the posts is loaded with SIX enormous black cast iron plates on each end, stacked so deep that the outermost plates hang almost down to the floor, and the bar is visibly BOWING in the middle under the weight. The plates are chipped and worn with the paint knocked off their rims down to bare metal. The bench itself is thick black leather, cracked and creased and dusted with white chalk, on a massive black steel frame with a wide flat base bolted to the floor. A couple of spare plates lean against the base and a white chalk handprint is smeared on the leather. Heavy, industrial, punishing. $S" &
$G $O/gym_curl.png landscape "A long heavy duty three tier dumbbell rack seen in exact side view, nobody using it, made of thick black powder coated steel with massive angled end frames bolted to the floor. It belongs to somebody absurdly strong and it says so: it is packed end to end with black cast iron hex head dumbbells that get visibly ENORMOUS from left to right, the largest ones at the far end so big and deep-plated they barely fit the shelf. The knurled steel handles catch the light, the paint is chipped off the edges down to bare metal, and there is white chalk dust on the rails. Heavy, industrial, punishing. $S" &
wait

echo "=== the kit that fills the corners ==="
$G $O/gym_plates.png portrait "A black steel weight plate tree seen from the side, a vertical post with six horizontal pegs, each peg loaded with a stack of black cast iron olympic weight plates, a heavy cross shaped base, single object, no people, $S" &
$G $O/gym_kettles.png landscape "A low heavy black steel kettlebell rack seen from the side, a single shelf holding a row of five black cast iron kettlebells getting larger from left to right, a rolled oxblood leather exercise mat leaning against the end of it, single object, no people, $S" &
# the media wall is the thinnest stretch of the room; these hang on it and lie in front
$G $O/gloves.png portrait "A pair of heavily worn oxblood red leather boxing gloves hanging side by side from a single polished brass wall hook by their knotted laces, the leather scuffed and creased and split at the knuckles, deep shadow in the folds, hanging straight down and slightly apart, $S" &
$G assets/ai/fg/fg_weights.png landscape "Three big black cast iron olympic weight plates lying and leaning against each other on the floor seen from the side, a white chalk bowl and a rolled white gym towel beside them, heavy and worn with chipped paint, $S" &
wait

echo "=== gym done ==="
echo "  ./.venv/bin/python tools/process_props.py gym_curl gym_bench gym_plates gym_kettles gloves"
echo "  ./.venv/bin/python tools/process_fg.py fg_weights"
ls -la $O/gym_*.png $O/gloves.png
