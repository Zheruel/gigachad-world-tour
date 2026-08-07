#!/bin/bash
# gen_lair_relics.sh - the two sets of objects the lair still gets from the plate.
#
# relic_*  one trophy per boss, taken off him when CHAD put him down, standing in the
#          alcove. Named for what that boss actually carries in js/bosses.js, so the
#          shelf reads as a record of the fights rather than five identical cups.
# gym_*    the weights corner, which used to be painted into the wall plate. As sprites
#          they reflect in the granite and CHAD can walk in front of them.
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
$G $O/relic_mirchi.png  square "A huge dented steel cooking ladle standing upright in a big steel chaat serving bowl, the ladle handle worn smooth and the bowl scorched and stained orange with spice, $T" &
$G $O/relic_refund.png  square "A grey 1990s office desk telephone with the handset off the hook hanging by its coiled cord, cracked plastic casing, a call centre headset draped over it, $T" &
$G $O/relic_yadav.png   square "An Indian police officer's peaked khaki cap resting on top of a crossed pair of long bamboo lathi canes bound together, the cap badge dulled brass, $T" &
$G $O/relic_rana.png    square "A heavy brass championship belt with an ornate roaring lion head as its centre plate, the leather strap thick and cracked, standing upright on a small black display stand, $T" &
wait

echo "=== gym ==="
$G $O/gym_rack.png    landscape "A two tier black steel dumbbell rack seen from the side, six chrome dumbbells lying on it in a row on each tier, each dumbbell clearly a knurled steel handle with a round weight head at both ends, the rack low and wide with angled end frames, $S" &
$G $O/gym_squat.png   portrait  "A tall black steel power squat rack seen from the side, a loaded olympic barbell resting on the J hooks near the top with big black iron plates on each end, the uprights drilled with a row of holes, a heavy flat base, $S" &
$G $O/gym_bench.png   landscape "A black leather flat weight bench seen from the side, padded top, chrome tubular legs, nothing on it, $S" &
wait

echo "=== relics and gym done ==="
ls -la $O
