#!/bin/bash
# gen_lair_deco.sh - the furniture the widened lair gains.
#
# The gym is not here: tools/gen_lair_gym.sh owns everything in front of the glass,
# because the two usable stations have to be generated as strips rather than as single
# objects. The bar counter, the joint columns and the supercar are gone too - the plate
# paints its own bar, the panel joins turned out to be invisible without covering them,
# and the car was taking the best stretch of window away from the gym.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
F=assets/ai/fg
mkdir -p $O $F

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

# The room is walnut, brass and oxblood lit by magenta and cyan neon; furniture that is
# all chrome disappears into the wall behind it.
L="dark walnut wood, polished brass and oxblood leather, lit by magenta and cyan neon"

echo "=== furniture ==="
$G $O/bag_chain.png    portrait  "A single heavy galvanised steel chain hanging straight down, thick oval links, a flat steel ceiling mounting bracket with bolts at the very top and a heavy steel swivel shackle at the very bottom, the chain perfectly vertical and taut, nothing else in the image, $S" &
wait

echo "=== the portrait ==="
$G $O/portrait.png landscape "A huge ornate oil painting in a very heavy carved gilt gold frame, hanging on a wall. The painting is a grand Renaissance style heroic portrait of a colossally muscular blond man with a square jaw and wraparound black sunglasses, bare chested under an open black leather waistcoat, one fist on his hip, standing in a dramatic three quarter pose against a stormy classical sky with cherubs, painted in rich oils with heavy chiaroscuro. The gold frame is thick and elaborate with scrollwork. Seen straight on and flat. $S" "$R"

echo "=== foreground ==="
$G $F/fg_table.png landscape "A low rectangular smoked glass coffee table seen from the side, thick glass top, polished brass frame and legs, a stack of magazines and a heavy crystal ashtray on it, $L, $S" &
$G $F/fg_lamp.png  portrait  "A tall brass arc floor lamp seen from the side, a heavy round marble base with a long curving brass arm sweeping up and over, a domed brass shade at the end of it, $S" &
wait

echo "=== deco done ==="
ls -la $O $F
