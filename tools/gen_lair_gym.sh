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

# Two rules learned by getting both wrong.
#
# COUNT THE OBJECTS AGAINST THE PIXELS. The rack is 117 logical px wide; asked for three
# tiers "packed end to end" with dumbbells "visibly ENORMOUS from left to right" it came back
# with a dozen per shelf, which is 9 px each - the small end read as a row of rivets and the
# big end as boulders. Five per shelf, each as deep as the shelf gap, largest under twice the
# smallest. State the count as a count.
#
# SAY THE PROJECTION OUT LOUD. "$S" says side view, and the generator still drew the bench PAD
# in three quarter - its top face visible, complete with a chalk handprint lying on a surface
# you cannot see from the side - while drawing the frame under it in flat elevation. One
# object, two projections. It has to be told that nothing shows its top and nothing shows its
# far side.
FLAT="STRICT FLAT SIDE ELEVATION. The camera is at the same height as the bench and directly to one side of it, so NOTHING shows its top surface and NOTHING shows its far side. The padded bench top is seen EDGE ON as a thick horizontal slab - you see the long side of the padding and its stitched edge, and you do NOT see the flat top face it is sat on. There is no perspective and no three quarter angle anywhere in the picture: every part of the frame, the posts and the base is drawn flat to the camera."

echo "=== the rack and the bench ==="
$G $O/gym_bench.png landscape "A heavy duty flat weight bench with a two post barbell rack at the head of it, nobody using it. $FLAT It belongs to somebody absurdly strong and it says so: the olympic barbell resting across the posts is loaded with SIX enormous black cast iron plates on each end, stacked so deep that the outermost plates hang almost down to the floor, and the bar is visibly BOWING in the middle under the weight. The plates are chipped and worn with the paint knocked off their rims down to bare metal. The bench pad is thick black leather, cracked and creased, on a massive black steel frame with a wide flat base bolted to the floor. A spare plate leans against the base. Heavy, industrial, punishing. $S" &
$G $O/gym_curl.png landscape "A heavy duty two tier dumbbell rack seen in exact side view, nobody using it, made of thick black powder coated steel with massive angled end frames bolted to the floor. COUNT THEM: there are exactly FIVE dumbbells on the top shelf and exactly FIVE on the bottom shelf, and no more. Each dumbbell is BIG - as deep from top to bottom as the gap between the two shelves - and there is a clear empty gap of bare shelf between each one so they never touch. Seen from the side, each dumbbell reads as two thick hexagonal cast iron end plates joined by a short knurled steel handle, drawn large and clearly so the hexagonal shape and the handle are obvious. They get a little heavier from left to right, but only a little - the largest is not even twice the smallest, and none of them is small. Black cast iron with the paint chipped off the plate edges down to bare metal, knurled steel handles catching the light, white chalk dust on the rails. Heavy, industrial, punishing. $S" &
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
