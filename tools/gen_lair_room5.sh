#!/bin/bash
# gen_lair_room5.sh - THE LAIR, regrouped into three readable sections, plus a city
# that is not squashed.
#
# Two changes from gen_lair_room4.sh:
#
#   * Panels A and B are re-zoned so the room reads as places rather than a shelf of
#     objects: A is THE LOUNGE (bar, tank, sofa wall under a picture light), B is
#     TROPHIES AND MEDIA (alcove, media wall). C is unchanged - it is already THE VIEW.
#
#   * The sky is generated as TWO panels and stitched. One 1536x1024 generation forced
#     into a 1920x362 strip is a 3.5x aspect distortion, which is what made the city
#     look squashed and mushy; two band-cropped panels downscale uniformly instead, so
#     the detail survives. The composition is deliberately BOLD - big layered tower
#     silhouettes and a lot of sky - because at 181 logical px tall a wall of tiny lit
#     windows turns to noise.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair_room5
S=assets/ai/lair_sky
mkdir -p $O $S

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues or portraits of people"

STYLE="The room is built from dark walnut wood panelling with polished brass inlays and trim, oxblood leather and smoked glass, lit by thin magenta and cyan neon strip lights running along the ceiling and along the base of the wall. Warm brass key light, deep shadows, a mirror polished black granite floor throwing long reflections."

RULES="A black steel ceiling beam runs the full width of the image just below the ceiling neon strip. The floor is completely bare: nothing stands on the floor anywhere in the image, no furniture, no equipment, no boxes, no plants, no bottles, no glasses, no stools. Nothing hangs from the ceiling. The bottom 28 percent of the image is a flat polished floor running the full width, with a clean horizontal seam where it meets the wall, and no coloured glow along that seam."

echo "=== panel A: the lounge ==="
$G $O/panel_a.png landscape "The left third of the private penthouse of a gigachad brawler at the top of a skyscraper, seen flat side on and empty. This third is his lounge. $STYLE Across the wall, left to right: from 0 to 27 percent of the width a wet bar built into the wall, walnut cabinetry with a polished brass foot rail and a tall backlit shelf of spirit bottles behind it; from 30 to 56 percent a floor to ceiling aquarium recessed into the wall in a heavy brass frame, filled with clear lit blue water and absolutely nothing in it, no fish, no plants, no rocks, just empty glowing water; from 58 to 100 percent plain blank walnut paneling with a single brass picture light mounted high on it and nothing at all hanging beneath the light. $RULES $EMPTY. $BG" "$R"

echo "=== panel B: trophies and media ==="
$G $O/panel_b.png landscape "The middle third of the private penthouse of a gigachad brawler at the top of a skyscraper, seen flat side on and empty. It continues the room in the reference image exactly: same ceiling beam at the same height, same neon strips, same floor seam at the same height, same walnut and brass. Across the wall, left to right: from 0 to 29 percent of the width plain blank walnut panelling with nothing mounted on it; from 31 to 58 percent a deep recessed trophy alcove with three empty lit glass shelf niches in brass frames, the shelves clearly visible and evenly spaced; from 60 to 80 percent plain blank walnut panelling with nothing mounted on it; from 82 to 100 percent a floor to ceiling window in black steel mullions, and the glass of that window is SOLID FLAT BRIGHT GREEN, pure chroma key green RGB 0 255 0, completely featureless, with only the black steel window frames and mullions drawn on top of it. There is no view, no city, no sky and no reflection in the window: it is flat green. $RULES $EMPTY. $BG" "$O/panel_a.png" "$R"

echo "=== the city, as two parallax layers ==="
# The city is two layers moving at different speeds rather than one flat picture, which
# is what gives it depth as CHAD walks the room. FAR is the sky and the distant city;
# NEAR is a row of big towers with chroma green above them, keyed out so FAR shows
# through. Both are deliberately BOLD - at 181 logical px tall, a wall of tiny lit
# windows turns to noise, which is what went wrong with the first Tokyo plate.
CITY="32-bit arcade beat em up game background pixel art in the style of Streets of Rage 4, rich saturated colour, high contrast, chunky readable shapes, no text, no latin letters, no numbers, no watermark, no border, no user interface, no people, no interior, no window frame, no sun disc"

FAR="An extremely wide panoramic view over a vast neon megacity at sunset seen from very high up, filling the whole frame. A huge dramatic sky fills the upper half with heavy banded clouds burning magenta orange and gold. Below it the city recedes in clear layers into a low haze: medium towers, then smaller ones, then a flat glowing haze at the horizon. Big blocks of neon colour on the buildings rather than thousands of tiny windows. Broad sweeping elevated expressways with long streaks of car light winding between them."

$G $S/far_a.png landscape "$FAR A tall red and white steel lattice broadcast tower rises above the skyline on the left. $CITY" &
$G $S/far_b.png landscape "$FAR The silhouette of a distant snow capped volcano sits on the horizon behind the towers on the right. $CITY" &
# The near layer is ROOFTOPS, not towers. Asked for towers reaching half way up the
# frame it returned a row of flat slabs that hid the whole view - the far city is the
# best thing in the room and this layer only has to prove there is depth in front of it.
$G $S/near.png  landscape "The tops of a handful of large city buildings seen from high up and very close to the viewer, standing along the very BOTTOM edge of the frame. Their roofs reach only about one third of the way up the image and no higher. They are near-black silhouettes with hard edges, richly detailed along their roof lines with air conditioning plant, water tanks, ventilation ducts, lattice antenna masts, radio dishes, ladders and railings, tiny red aircraft warning lights, and a few narrow vertical neon signs glowing magenta and gold down their sides. Their upper faces catch a thin rim of warm sunset light along one edge. The ENTIRE upper two thirds of the image, everything above the roof lines, is SOLID FLAT BRIGHT GREEN, pure chroma key green RGB 0 255 0, completely featureless: no sky, no clouds, no haze, no colour, no buildings. $CITY" &
wait

echo "=== now: ./.venv/bin/python tools/build_lair_wide.py ==="
echo "=== lair room 5 done ==="
ls -la $O $S
