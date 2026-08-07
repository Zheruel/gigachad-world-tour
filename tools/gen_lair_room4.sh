#!/bin/bash
# gen_lair_room4.sh - THE LAIR at 1440 logical px, as three 480-wide panels plus the
# city behind the glass.
#
# Two changes from gen_lair_room3.sh:
#   * the room is three separate generations stitched by tools/build_lair_wide.py, so
#     each panel is generated at close to its native scale instead of one image being
#     stretched across the whole room;
#   * the window band is asked for as FLAT CHROMA GREEN with only the mullions drawn
#     over it. build_lair_wide.py keys that out, which leaves a hole for the skyline to
#     parallax through. Nothing behind glass can move while the view is painted into
#     the plate.
#
# Panels are generated in order, each taking the previous one as a reference, because
# the ceiling line, the base neon and the floor seam have to carry across the joins.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair_room4
mkdir -p $O

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues or portraits of people"

# 90s neon over old money: the room is walnut, brass and oxblood, lit magenta and cyan.
STYLE="The room is built from dark walnut wood panelling with polished brass inlays and trim, oxblood leather and smoked glass, lit by thin magenta and cyan neon strip lights running along the ceiling and along the base of the wall. Warm brass key light, deep shadows, a mirror polished black granite floor throwing long reflections."

# The horizontal structure has to be identical in all three panels or the joins show.
BANDS="A black steel ceiling beam runs the full width of the image just below the ceiling neon strip. The bottom 28 percent of the image is a flat polished floor running the full width, with a clean horizontal seam where it meets the wall, and no coloured glow along that seam."

RULES="The floor is completely bare: nothing stands on the floor anywhere in the image, no furniture, no equipment, no boxes, no plants, no bottles, no glasses. Nothing hangs from the ceiling. $BANDS"

echo "=== panel A: bar, aquarium, trophy alcove ==="
$G $O/panel_a.png landscape "The left third of the private penthouse of a gigachad brawler at the top of a skyscraper, seen flat side on and empty. $STYLE Across the wall, left to right: from 0 to 26 percent of the width a wet bar built into the wall, walnut cabinetry with a brass foot rail and a backlit shelf of bottles behind it; from 28 to 57 percent a floor to ceiling aquarium recessed into the wall in a heavy brass frame, filled with clear lit blue water and absolutely nothing in it, no fish, no plants, no rocks, just empty glowing water; from 59 to 88 percent a deep recessed trophy alcove with three empty lit glass shelf niches in brass frames; from 90 to 100 percent plain blank walnut panelling. $RULES $EMPTY. $BG" "$R"

echo "=== panel B: portrait wall, tech wall, window begins ==="
$G $O/panel_b.png landscape "The middle third of the private penthouse of a gigachad brawler at the top of a skyscraper, seen flat side on and empty. $STYLE It continues the room in the reference image exactly: same ceiling beam at the same height, same neon strips, same floor seam at the same height, same wood and brass. Across the wall, left to right: from 0 to 27 percent of the width plain blank walnut panelling with a picture light mounted above it and nothing hanging on it; from 27 to 71 percent flat blank walnut and smoked glass panelling with thin neon seams and nothing mounted on it; from 73 to 100 percent a floor to ceiling window in black steel mullions, and the glass of that window is SOLID FLAT BRIGHT GREEN, pure chroma key green RGB 0 255 0, completely featureless, with only the black steel window frames and mullions drawn on top of it. There is no view, no city, no sky and no reflection in the window: it is flat green. $RULES $EMPTY. $BG" "$O/panel_a.png" "$R"

echo "=== panel C: window, gym end, mirror ==="
$G $O/panel_c.png landscape "The right third of the private penthouse of a gigachad brawler at the top of a skyscraper, seen flat side on and empty. $STYLE It continues the room in the reference image exactly: same ceiling beam at the same height, same neon strips, same floor seam at the same height, same wood and brass. Across the wall, left to right: from 0 to 59 percent of the width the floor to ceiling window continues in the same black steel mullions, and the glass is SOLID FLAT BRIGHT GREEN, pure chroma key green RGB 0 255 0, completely featureless, with only the black steel window frames and mullions drawn on top of it, no view and no reflection; from 60 to 100 percent the end wall in walnut and brass with one tall narrow mirrored panel in a brass frame with a neon edge, and nothing else. $RULES $EMPTY. $BG" "$O/panel_b.png" "$R"

echo "=== the city behind the glass ==="
mkdir -p assets/ai/lair_sky
$G assets/ai/lair_sky/tokyo.png landscape "A dense neon megacity skyline at sunset seen from high up in a skyscraper, filling the whole frame, no interior and no window frame anywhere in the image. Tall towers packed to the horizon covered in glowing neon signage in magenta cyan and gold, a tall red and white lattice broadcast tower standing above them, elevated expressways winding between the buildings with streaks of car light, thousands of lit windows, a low haze, and the silhouette of a distant snow capped volcano on the far horizon. A burning magenta and orange sunset sky with banded clouds above it. There is no sun disc anywhere in the image. $BG"

echo "=== lair room 4 done ==="
ls -la $O assets/ai/lair_sky
