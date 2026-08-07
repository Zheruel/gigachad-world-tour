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
$G $O/worldmap.png    landscape "A wall mounted backlit world map panel in a heavy chrome frame, the continents as dark navy landmasses glowing with a thin cyan edge light against a deeper navy ocean, brass rivets at the corners of the frame, completely blank with no pins, no markers, no lines and no labels on it, $L, $S" &
$G $O/arcade.png      portrait  "An upright 1990s arcade cabinet standing on the floor seen from the side at a slight angle, glossy black cabinet with magenta and cyan sideart stripes, chrome coin door, a marquee light box at the top, a control panel with a red ball joystick and coloured buttons, and the screen area a completely flat solid black rectangle with nothing on it, $L, $S" &
$G $O/hifi.png        portrait  "A 1990s black separates hi-fi rack system standing on the floor, a slim glass fronted tower holding an amplifier a tape deck and a cd player stacked in it, one tall black floorstanding speaker beside it, chrome trim and knobs, and the amplifier display area a completely flat solid black rectangle with nothing on it, $L, $S" &
$G $O/records.png     landscape "A row of three framed gold records hanging flat on a wall in slim chrome frames, the discs polished gold, the mounts black, nothing written on them, $L, $S" &
wait

$G $P/bag.png         portrait  "A very large heavy leather boxing punching bag, long and thick and full length, dark oxblood leather with silver duct tape bands wrapped around the seams, scuffed and worn, a heavy brass D-ring and swivel fitting at the very top of the bag, no chain and no rope above the swivel, hanging free with nothing below it, $S" &
$G $F/fg_sofa.png     landscape "A long low black leather chesterfield sofa seen from directly behind, deep buttoned back, polished chrome legs, nothing on it, $S" &
wait

echo "=== map panel ==="
# Not chroma keyed: this is the full-screen background of the stage select menu.
$G $O/map_panel.png landscape "A 1990s war room world map display seen head on and filling the whole frame: a dark navy world map with all seven continents drawn as flat landmasses in deep indigo, thin glowing cyan coastlines, a faint latitude and longitude grid, a black ocean, heavy vignette at the edges of the frame like a curved CRT monitor, faint horizontal scanlines across the whole image, a magenta and cyan glow at the top and bottom edges, no pins, no markers, no text, no latin letters, no numbers, no labels, no borders, no user interface, no watermark. 32-bit arcade pixel art in the style of Streets of Rage 4"
echo "=== lair props done ==="
ls -la $O
