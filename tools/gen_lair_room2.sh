#!/bin/bash
# gen_lair_room2.sh - THE LAIR hub room plate, second pass. Same contract as
# gen_lair_room.sh (deserted, straight on, split by tools/build_lair_room.py) but the
# wall is furnished across its whole width instead of reserving the left 65 percent
# blank: the fixtures that live there are now sprites at known x positions, so the
# plate has to give each of them a wall to stand against.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
P=assets/ai/lair_room/room_a.png     # the shipped plate: keeps the skyline consistent
O=assets/ai/lair_room2
mkdir -p $O

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues or posters of people"

# Five zones, as fractions of image width, matching FIXTURES in js/hub.js:
#   trophies 100/960, map 250/960, arcade 370/960, hifi 470/960, bag 620/960, mirror 880/960.
# The floor must stay completely clear - every object in the room is a sprite drawn on
# top - and the ceiling needs a beam because the heavy bag hangs off it.
ZONES="The wall is divided into five bands across the image. From 0 to 15 percent, a deep recessed trophy alcove: three empty lit glass shelf niches cut into dark chrome, warm light spilling out of them. From 15 to 31 percent, a flat blank brushed chrome media wall with nothing mounted on it. From 31 to 54 percent, solid black glass and chrome wall panelling with thin neon seams, no window, nothing mounted on it. From 54 to 83 percent, a floor to ceiling window wall of glass in black steel mullions. From 83 to 100 percent, the gym end."

RULES="A black steel ceiling beam runs the full width of the image just below the ceiling neon strip. The floor is completely bare: there is absolutely nothing standing on the floor anywhere in the image, no furniture, no equipment on the ground, no boxes, no plants. There is no punching bag and nothing else hanging from the ceiling. The bottom 28 percent of the image is a flat polished floor running the full width, with a clean horizontal seam where it meets the wall, and no coloured glow along that seam."

$G $O/room_a.png landscape "The private penthouse gym of a gigachad brawler at the top of a skyscraper at sunset, seen flat side on and empty. The window band looks out over a hazy neon city skyline under a magenta and orange sunset sky. Brushed chrome and black glass wall panels, magenta and cyan neon strip lights along the ceiling and the base of the wall, polished black granite floor with reflections. $ZONES The gym end has a chrome dumbbell rack, a loaded barbell on a black rack and a tall mirrored panel, all flat against the wall. $RULES $EMPTY. $BG" "$R" "$P" &

$G $O/room_b.png landscape "The private penthouse gym of a gigachad brawler at the top of a skyscraper at sunset, seen flat side on and empty, warmer and richer than a night scene. The window band looks out over a hazy neon city skyline under a burning orange and hot pink sunset sky with the sun low between the towers. Polished chrome and lacquered black wall panels, hot pink and cyan neon strip lights along the ceiling and the base of the wall, mirror polished black granite floor throwing long reflections. $ZONES The gym end has a chrome dumbbell rack, stacked black iron plates on a rack and a tall mirrored panel, all flat against the wall. $RULES $EMPTY. $BG" "$R" "$P" &

$G $O/room_c.png landscape "The private penthouse gym of a gigachad brawler at the top of a skyscraper at dusk, seen flat side on and empty. The window band looks out over a deep purple and magenta neon city skyline with lit skyscraper windows far below. Mirrored chrome and smoked glass wall panels with thin violet neon seams, warm gold rim light from hidden strip lighting in the alcove, deep black shadows, polished dark stone floor with a chrome inlay line. $ZONES The gym end has a chrome kettlebell rack, a loaded barbell on a black rack and a tall mirrored panel, all flat against the wall. $RULES $EMPTY. $BG" "$R" "$P" &
wait

echo "=== lair room 2 done ==="
ls -la $O
