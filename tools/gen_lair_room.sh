#!/bin/bash
# gen_lair_room.sh - THE LAIR hub room plate: CHAD's chrome penthouse dojo.
# Generated deserted and straight on so it splits into a wall/floor pair by
# tools/build_lair_room.py. Three variants; pick one and pass it as --src.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair_room
mkdir -p $O

BG="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, one interior room seen straight from the side with no perspective distortion, highly detailed pixel art, rich saturated colour, no text, no latin letters, no numbers, no watermark, no border, no user interface, no signature"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no statues or posters of people"

# The level select cases live on the left of this wall and the heavy bag is a sprite
# drawn at 73% across, so both of those areas of the plate have to stay clear.
LAYOUT="The LEFT 65 percent of the wall is bare dark chrome and black glass panelling with absolutely nothing mounted on it, blank empty wall. Equipment appears only in the rightmost 20 percent of the image. There is no punching bag and nothing hanging from the ceiling anywhere in the image. The bottom 28 percent of the image is a flat polished floor running the full width, with a clean horizontal seam where it meets the wall."

$G $O/room_a.png landscape "The private penthouse gym of a gigachad brawler at the top of a skyscraper at sunset, seen flat side on and empty. A floor to ceiling window wall of glass in black steel mullions looks out over a hazy neon city skyline under a magenta and orange sunset sky. Brushed chrome and black glass wall panels, magenta and cyan neon strip lights along the ceiling and the base of the wall, polished black granite floor with reflections. $LAYOUT In the rightmost 20 percent: a chrome dumbbell rack, a loaded barbell on a black rack and a tall mirrored panel. $EMPTY. $BG" "$R" &

$G $O/room_b.png landscape "The private penthouse gym of a gigachad brawler at the top of a skyscraper at night, seen flat side on and empty. A floor to ceiling window wall of glass in black steel mullions, rain running down the glass, looks out over a cold cyan and deep blue neon city skyline. Brushed chrome and black glass wall panels, cyan neon strip lights along the ceiling and the base of the wall, wet looking polished black granite floor with sharp reflections. $LAYOUT In the rightmost 20 percent: a chrome dumbbell rack, stacked black iron plates and a tall mirrored panel. $EMPTY. $BG" "$R" &

$G $O/room_c.png landscape "The private penthouse training dojo of a gigachad brawler at the top of a skyscraper at dusk, seen flat side on and empty. The wall is floor to ceiling mirrored chrome and smoked glass panels with thin purple neon seams, and a narrow band of window on the upper part showing a distant purple city skyline far below. Warm rim light from hidden strip lighting, deep black shadows, polished dark stone floor with a chrome inlay line. $LAYOUT In the rightmost 20 percent: a chrome kettlebell rack and a tall mirrored panel. $EMPTY. $BG" "$R" &
wait

echo "=== lair room done ==="
ls -la $O
