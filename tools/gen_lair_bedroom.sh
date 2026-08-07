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
# THREE poses per sheet, not six. Cell width is the budget for how long the bed can be
# drawn: six cells in a 1536px sheet is 256px each and the model returns a bed as tall as
# it is long. Three cells is 512px each, which buys a bed that reads as a king size.
SHEET="Draw this as a single horizontal sprite sheet strip: three separate poses in a row, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap. THE BED IS THE SAME DRAWING IN ALL THREE POSES - trace the identical bed each time: identical length, identical height, identical headboard, identical posts and finials, identical carving on the base, identical position within its own cell, identical colours. Nothing about the furniture changes from pose to pose. ONLY the two women and the top edge of the sheets over them change."

BEDDESC="An enormous opulent king size bed fit for a king, seen from directly at its SIDE in flat side elevation exactly like a sofa photographed side on. IT IS VERY LONG AND LOW: the bed is at least TWICE as long from end to end as it is tall from the floor to the top of the headboard, a long low wide shape filling the width of its cell. The deeply buttoned oxblood leather headboard stands at the RIGHT hand end with carved dark walnut posts and polished brass finials, and a low carved footboard at the LEFT hand end. Thick cream silk sheets, a heavy folded brocade throw across the foot, a deep carved walnut base. Two beautiful adult women lie in it side by side along the length of the bed with their heads on big pillows at the RIGHT against the headboard and their bodies stretching away to the left, covered from the chest down by the sheets, only their heads, bare shoulders and arms above the bedding, calm and comfortable. The nearer woman is a striking platinum BLONDE with long wavy hair spread across the pillow; the further woman is a striking REDHEAD with long copper red hair. Their hair colours are unmistakable and never change from pose to pose."

echo "=== the bed ==="
$G $O/bed.png landscape "$BEDDESC Three poses read left to right. Pose 1: both lying still and asleep, sheets smooth. Pose 2: the nearer one has turned her head, one arm resting on the sheets. Pose 3: the nearer one has rolled onto her side towards the other. $SHEET $S"

# The second sheet takes the first as a reference so it draws the SAME bed; whatever
# drift survives that, best_shift and stabilise() in build_lair_extras.py take out.
$G $O/bed_b.png landscape "$BEDDESC The bed is exactly the bed in the reference image, same shape, same length, same headboard, same carving, same colours, drawn at the same size. Three poses read left to right. Pose 1: the further one has stretched, one arm up behind her head. Pose 2: both settled again, the sheets rucked a little differently. Pose 3: the nearer one is propped up on one elbow with her head raised, awake and looking out to the LEFT along the bed, the other still asleep. $SHEET $S" "$O/bed.png"

echo "=== the furniture ==="
$G $O/bed_wardrobe.png portrait "A tall open walnut wardrobe seen from the side with both doors swung open, a brass rail across it hung with a row of six identical black leather biker waistcoats with the sleeves cut off, a shelf above holding four pairs of folded black wraparound sunglasses in a neat row, a shelf below with folded blue denim jeans, brass fittings, warm light inside the cabinet, $L, $S"

$G $O/bed_nightstand.png landscape "A low smoked glass and brass nightstand seen from the side, a small brass table lamp with an oxblood shade lit on top of it, a silver ice bucket with a champagne bottle in it and two tall crystal flutes beside the bucket, $L, $S"

$G $O/bed_fire.png landscape "A tall fire of burning logs seen from the side, orange and yellow flames licking upward from a stack of three charred split logs on a bed of glowing embers, no fireplace and no surround around it, just the burning logs alone, $S"

$G $O/bed_rug.png landscape "A large thick white sheepskin fur rug lying flat on the floor seen from a low angle almost edge on, so it reads as a long low soft shape with a shaggy irregular edge and deep shadow under it, $S"

echo "=== bedroom done ==="
echo "  ./.venv/bin/python tools/build_lair_extras.py bed"
echo "  ./.venv/bin/python tools/process_props.py bed_wardrobe bed_nightstand bed_fire bed_rug"
ls -la $O/bed*.png
