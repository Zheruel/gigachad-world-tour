#!/bin/bash
# gen_lair_relics.sh - one trophy per boss, taken off him when CHAD put him down,
# standing in the trophy alcove. Named for what that boss actually carries in
# js/bosses.js, so the shelf reads as a record of the fights rather than five identical
# cups. The weights corner used to live here too; it is tools/gen_lair_gym.sh now.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

# The alcove light behind these is hot orange, so they need their own strong local
# colour to read; a relic that is all chrome disappears into the backlight.
T="standing upright on display as a trophy, battered and clearly used, lit hard from the top left, $S"

echo "=== relics ==="
$G $O/relic_raja.png    square "A battered brass and black auto rickshaw taxi fare meter torn off its mounting, a small boxy analogue meter with a chrome flag lever on the side and a cracked glass dial face, trailing two cut wires from its base, $T" &
wait

echo "=== relics done ==="
ls -la $O
