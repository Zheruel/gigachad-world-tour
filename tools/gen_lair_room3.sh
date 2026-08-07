#!/bin/bash
# gen_lair_room3.sh - THE LAIR hub room plate, third pass. Same five-zone contract as
# gen_lair_room2.sh with one change: the gym equipment comes out of the plate entirely.
# Baked into the wall it could not reflect in the granite, CHAD could not walk in front
# of it, and the generator kept drawing racks of flat discs with no handles. It is a
# sprite now, like every other object in the room.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
P=assets/ai/lair_room2/room_b.png    # the shipped plate: keeps the skyline consistent
O=assets/ai/lair_room3
mkdir -p $O

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues or posters of people"

# Five zones, as fractions of image width, matching FIXTURES in js/hub.js.
ZONES="The wall is divided into five bands across the image. From 0 to 11 percent, a deep recessed trophy alcove: three empty lit glass shelf niches cut into dark chrome, warm light spilling out of them. From 12 to 23 percent, a flat blank brushed chrome media wall with nothing mounted on it. From 23 to 49 percent, solid black glass and chrome wall panelling with thin neon seams, no window, nothing mounted on it. From 49 to 86 percent, an unbroken floor to ceiling window wall of glass in black steel mullions. From 86 to 100 percent, one tall narrow mirrored panel in a chrome frame with a neon edge, and nothing else."

RULES="A black steel ceiling beam runs the full width of the image just below the ceiling neon strip. There is absolutely no gym equipment anywhere in the image: no dumbbells, no barbells, no weight plates, no racks, no benches, no kettlebells. The floor is completely bare: nothing stands on the floor anywhere in the image, no furniture, no boxes, no plants. There is no punching bag and nothing hanging from the ceiling. The bottom 28 percent of the image is a flat polished floor running the full width, with a clean horizontal seam where it meets the wall, and no coloured glow along that seam."

$G $O/room_a.png landscape "The private penthouse of a gigachad brawler at the top of a skyscraper at sunset, seen flat side on and empty. The window band looks out over a hazy neon city skyline under a burning orange and hot pink sunset sky with the sun low between the towers. Polished chrome and lacquered black wall panels, hot pink and cyan neon strip lights along the ceiling and the base of the wall, mirror polished black granite floor throwing long reflections. $ZONES $RULES $EMPTY. $BG" "$R" "$P" &

$G $O/room_b.png landscape "The private penthouse of a gigachad brawler at the top of a skyscraper at sunset, seen flat side on and empty. The window band looks out over a hazy neon city skyline under a magenta and orange sunset sky, the sun a bright disc low between distant towers. Brushed chrome and black glass wall panels with thin violet seams, magenta and cyan neon strip lights along the ceiling and the base of the wall, polished black granite floor with long reflections. $ZONES $RULES $EMPTY. $BG" "$R" "$P" &

$G $O/room_c.png landscape "The private penthouse of a gigachad brawler at the top of a skyscraper at dusk, seen flat side on and empty. The window band looks out over a deep purple and magenta neon city skyline with lit skyscraper windows far below and a last band of orange at the horizon. Mirrored chrome and smoked glass wall panels with thin violet neon seams, warm gold rim light from hidden strip lighting in the alcove, deep black shadows, polished dark stone floor with a chrome inlay line. $ZONES $RULES $EMPTY. $BG" "$R" "$P" &
wait

echo "=== lair room 3 done ==="
ls -la $O
