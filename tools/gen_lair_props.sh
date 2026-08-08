#!/bin/bash
# gen_lair_props.sh - the furniture of THE LAIR. Everything standing in the hub room is
# a sprite drawn over the plate, so the plate itself can stay a bare wall. Chroma-key
# sprites go through tools/process_props.py (LAIR table); the map panel is a full-screen
# menu background and goes through tools/pixelate.py instead.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
# the bag is a real breakable-shaped prop and the sofa is a foreground piece, so they
# are generated straight into the directories their own processors read
P=assets/ai/props
F=assets/ai/fg
mkdir -p $O $P $F

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

# 90s penthouse palette, so the fixtures sit in the same room as the plate.
L="black lacquer, brushed chrome and smoked glass, lit by magenta and cyan neon"

echo "=== lair fixtures ==="
# The map is the one fixture that is NOT in the $L chrome-and-smoked-glass palette. It
# hangs on the panelled wall between the gilded mirror and the brass shelf rails, and a
# chrome frame with rivets made it the only silver object there - at 80 logical px the
# rivets read as dirt, not hardware. It also has to survive being 43 px of glass: thin
# cyan outlines on navy went to a dark rectangle, so the landmasses glow from within too,
# and the art must stay unmarked because the game draws the chapter pins on top.
$G $O/worldmap.png    landscape "A wall mounted backlit world map panel. The frame is heavy polished antique brass and gold, a moulded picture frame with a raised outer bead and a fine reeded inner lip, warm and gleaming with bright highlights along its top edge. There are absolutely NO rivets, NO bolts, NO screws, NO washers and NO metal corner plates anywhere on the frame - it is smooth cast and polished metal only. Inside the frame is a backlit map of the world. All seven continents are drawn as dark indigo landmasses against a deep midnight blue ocean, and every coastline glows in a BRILLIANT pale cyan white, bright and crisp and very high contrast, so the shapes of the continents read clearly and boldly even from across the room. The landmasses themselves also glow faintly from within, so each continent reads as a solid luminous shape rather than only an outline. A soft sheen of glass reflection runs diagonally across the panel. The whole world is drawn small and inset with a clear even margin of empty ocean all the way around it, so that no landmass anywhere touches, overlaps or is cut off by the frame. The map is completely blank and unmarked: no pins, no markers, no city lights, no dots, no specks, no small orange or yellow points of any kind anywhere on it, no route lines, no grid, no compass, no text, no letters, no numbers and no labels. It hangs in a 1990s penthouse panelled in dark walnut with gold mouldings, so its metal is warm gold and brass, matching a gilded mirror frame on the same wall. 32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, a single flat wall-hung object seen dead straight on in flat elevation, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border" &
$G $O/arcade.png      portrait  "An upright 1990s arcade cabinet standing on the floor seen from the side at a slight angle, glossy black cabinet with magenta and cyan sideart stripes, chrome coin door, a marquee light box at the top, a control panel with a red ball joystick and coloured buttons, and the screen area a completely flat solid black rectangle with nothing on it, $L, $S" &
$G $O/hifi.png        portrait  "A 1990s black separates hi-fi rack system standing on the floor, a slim glass fronted tower holding an amplifier a tape deck and a cd player stacked in it, one tall black floorstanding speaker beside it, chrome trim and knobs, and the amplifier display area a completely flat solid black rectangle with nothing on it, $L, $S" &
wait

$G $P/bag.png         portrait  "A very large heavy leather boxing punching bag, long and thick and full length, dark oxblood leather with silver duct tape bands wrapped around the seams, scuffed and worn, a heavy brass D-ring and swivel fitting at the very top of the bag, no chain and no rope above the swivel, hanging free with nothing below it, $S" &
$G $F/fg_sofa.png     landscape "A long low black leather chesterfield sofa seen from directly behind, deep buttoned back, polished chrome legs, nothing on it, $S" &
wait

echo "=== map panel ==="
# Not chroma keyed: this is the full-screen background of the stage select menu.
$G $O/map_panel.png landscape "A 1990s war room world map display seen head on and filling the whole frame: a dark navy world map with all seven continents drawn as flat landmasses in deep indigo, thin glowing cyan coastlines, a faint latitude and longitude grid, a black ocean, heavy vignette at the edges of the frame like a curved CRT monitor, faint horizontal scanlines across the whole image, a magenta and cyan glow at the top and bottom edges, no pins, no markers, no text, no latin letters, no numbers, no labels, no borders, no user interface, no watermark. 32-bit arcade pixel art in the style of Streets of Rage 4"
echo "=== lair props done ==="
ls -la $O
