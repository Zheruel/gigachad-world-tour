#!/bin/bash
# gen_lair_bedroom.sh - the master suite at the right hand end of the lair.
#
# The bed is a STRIP, like the gym stations and for the same reason: it holds the
# furniture and the people in one sprite, so the frames cannot disagree about where the
# bed is. Poses 1-3 are the two of them shifting in their sleep; pose 4 is one of them
# propped up on an elbow, which is what the room holds while CHAD is standing there.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

L="dark walnut wood, polished brass and oxblood leather, lit by warm lamplight"

# Same contract as the gym strips, with the bed added to the list of what must not move.
SHEET="Draw this as a single horizontal sprite sheet strip: four separate poses in a row, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap. The bed itself is IDENTICAL in all four poses - the same size, the same colours, the same distance above the ground line, drawn in the same place within its own pose. Only the two sleepers and the bedding move."

echo "=== the bed ==="
$G $O/bed.png landscape "A grand king size bed seen from directly at its SIDE, in flat side elevation exactly like a sofa photographed side on: the long edge of the mattress runs left to right across the picture, the tall buttoned oxblood leather headboard stands at the LEFT hand end, and the lower carved footboard at the RIGHT hand end. It is far wider than it is tall. Heavy carved dark walnut frame with polished brass finials, thick cream silk sheets and a folded throw. Two adult women lie in it side by side along the length of the bed with their heads on pillows at the LEFT against the headboard and their bodies stretching away to the right, covered from the chest down by the sheets, only their heads, shoulders and arms above the bedding, long hair spread on the pillows, calm and comfortable. Four poses read left to right. Pose 1: both lying still and asleep, sheets smooth. Pose 2: the nearer one has rolled onto her side, one arm out across the sheets. Pose 3: the further one has stretched, one arm up behind her head, the sheets rucked a little. Pose 4: the nearer one is propped up on one elbow with her head raised, awake and looking out of the picture towards the viewer, the other still asleep. In every pose the bed is seen from the same flat side angle and the frame, headboard, footboard and pillows are in exactly the same place. $SHEET $S"

echo "=== the furniture ==="
$G $O/bed_wardrobe.png portrait "A tall open walnut wardrobe seen from the side with both doors swung open, a brass rail across it hung with a row of six identical black leather biker waistcoats with the sleeves cut off, a shelf above holding four pairs of folded black wraparound sunglasses in a neat row, a shelf below with folded blue denim jeans, brass fittings, warm light inside the cabinet, $L, $S"

$G $O/bed_nightstand.png landscape "A low smoked glass and brass nightstand seen from the side, a small brass table lamp with an oxblood shade lit on top of it, a silver ice bucket with a champagne bottle in it and two tall crystal flutes beside the bucket, $L, $S"

$G $O/bed_fire.png landscape "A tall fire of burning logs seen from the side, orange and yellow flames licking upward from a stack of three charred split logs on a bed of glowing embers, no fireplace and no surround around it, just the burning logs alone, $S"

$G $O/bed_rug.png landscape "A large thick white sheepskin fur rug lying flat on the floor seen from a low angle almost edge on, so it reads as a long low soft shape with a shaggy irregular edge and deep shadow under it, $S"

echo "=== bedroom done ==="
echo "  ./.venv/bin/python tools/build_lair_extras.py bed"
echo "  ./.venv/bin/python tools/process_props.py bed_wardrobe bed_nightstand bed_fire bed_rug"
ls -la $O/bed*.png
