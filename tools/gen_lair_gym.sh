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
# big end as boulders. State the count as a count.
#
# AND THEN SAY WHAT SEPARATES THEM. Five a shelf with "a clear gap of bare shelf between each
# one" still came back as ONE CONTINUOUS ROD with hexagonal lumps threaded on it, because the
# gap got filled by the handles lining up end to end - each dumbbell was distinct and none of
# them read as distinct. What works is saying it about the handle: it starts at its own plate,
# it stops at its own plate, and the background shows through between one dumbbell and the
# next. Four a shelf leaves room for that gap to be as wide as a dumbbell.
#
# SAY THE PROJECTION OUT LOUD. "$S" says side view, and the generator still drew the bench PAD
# in three quarter - its top face visible, complete with a chalk handprint lying on a surface
# you cannot see from the side - while drawing the frame under it in flat elevation. One
# object, two projections. It has to be told that nothing shows its top and nothing shows its
# far side.
# THE BENCH IS THE ONE THING IN THIS ROOM DRAWN IN PERSPECTIVE, and the geometry is why. A
# barbell lies ACROSS the bench, perpendicular to it. So a true side view of the bench shows
# the bar END ON - one stack of plates seen as a disc - and at 82 logical px that reads as a
# small bullseye that says nothing about how much is on it. Both were generated and compared
# at final size; the loaded bar is the whole point of the piece, so the camera goes to the
# HEAD of the bench where the bar spans the picture, and the bench recedes from it.
#
# Which means the pad CANNOT be horizontal. Two passes had the frame in flat elevation and
# the pad in three quarter with its top face visible, which is the same object drawn in two
# projections - say which one it is and say what follows from it.
$G $O/gym_bench.png landscape "A heavy duty flat bench press station seen in THREE QUARTER VIEW from the head end, nobody using it. The camera stands at the head of the bench, a little to the left and a little above it. Because of that the loaded olympic barbell spans the full width of the picture LEFT TO RIGHT across the top, with its six huge plates stacked on each end, and the two black steel rack posts stand under its ends. The bench itself RECEDES AWAY FROM THE BARBELL down and to the RIGHT, going back into the picture: its long black leather pad is drawn as a long narrow parallelogram sloping down to the right, foreshortened, nearer and wider at its bottom right end and further and narrower where it meets the posts, so you can see the top face of the pad and its stitched near edge. Its steel frame and wide feet follow the same angle down to the right. $LOAD $S" &
SEP="CRITICAL: the dumbbells are SEPARATE OBJECTS and must read as separate objects. Between every pair of dumbbells there is a WIDE gap of empty shelf - as wide as a whole dumbbell - and the flat green background shows through that gap above the rail. Each dumbbell's handle is SHORT and belongs only to that dumbbell: it runs from its own left plate to its own right plate and STOPS. A handle must never touch, reach or join the dumbbell next to it, and the handles must NEVER line up into one long continuous rod running across the shelf. If you cannot see empty shelf between two dumbbells, they are too close together."
$G $O/gym_curl.png landscape "A heavy duty two tier dumbbell rack seen in exact flat side view, nobody using it. The rack is thick black powder coated steel with massive angled end frames bolted to the floor, and it is well used: the paint is scuffed and chipped down to bare metal along the rails, there is orange rust blooming at the welds and the bolts, and white chalk dust is smeared along the top rail. COUNT THEM: exactly FOUR dumbbells on the top shelf and exactly FOUR on the bottom shelf, no more. $SEP Every one of them is ENORMOUS - the kind nobody else in the building could lift - drawn as two thick chunky hexagonal cast iron end plates with a short fat knurled steel handle between them, the plate edges chipped and worn to bare metal, a little surface rust in the pitting. They get slightly heavier from left to right. Nothing else is in the picture: no dumbbells on the floor, nothing leaning against the rack, nothing beside it. Heavy, brutal, punishing, well used. $S" &wait

echo "=== the kit that fills the corners ==="
# Same lesson as the rack, one object along: a plate tree seen from the side shows its plates
# EDGE ON, which at 28 logical px wide is a post with knobs on it. Turn them face on and they
# are unmistakably weight plates, and three big stacks read where six small ones did not.
$G $O/gym_plates.png portrait "A black steel olympic weight plate tree, nobody near it, loaded with huge cast iron plates. IMPORTANT: the plates are seen FACE ON, as big flat CIRCLES with a bright steel collar around the centre hole, so each one reads clearly as a round weight plate and not as a knob or a bolt. The tree is a single vertical black steel post on a heavy cross shaped base, and there are only THREE loaded pegs, one above the other, each carrying a stack of two or three of these big circular plates: the biggest plates at the bottom, smaller ones going up. The plates are as wide as the base of the tree is wide. Between the pegs there is clear empty post so the three stacks never touch each other. Well used: the paint is chipped off the plate rims down to bare metal, orange rust blooms in the pitting and at the welds, white chalk dust on the post. Heavy, brutal, industrial. $S" &$G $O/gym_kettles.png landscape "A low heavy black steel kettlebell rack seen from the side, a single shelf holding a row of five black cast iron kettlebells getting larger from left to right, a rolled oxblood leather exercise mat leaning against the end of it, single object, no people, $S" &
# the media wall is the thinnest stretch of the room; these hang on it and lie in front
$G $O/gloves.png portrait "A pair of heavily worn oxblood red leather boxing gloves hanging side by side from a single polished brass wall hook by their knotted laces, the leather scuffed and creased and split at the knuckles, deep shadow in the folds, hanging straight down and slightly apart, $S" &
$G assets/ai/fg/fg_weights.png landscape "Three big black cast iron olympic weight plates lying and leaning against each other on the floor seen from the side, a white chalk bowl and a rolled white gym towel beside them, heavy and worn with chipped paint, $S" &
wait

echo "=== gym done ==="
echo "  ./.venv/bin/python tools/process_props.py gym_curl gym_bench gym_plates gym_kettles gloves"
echo "  ./.venv/bin/python tools/process_fg.py fg_weights"
ls -la $O/gym_*.png $O/gloves.png
