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

BEDDESC="A colossal opulent emperor size four poster bed, seen from directly at its SIDE in flat side elevation exactly like a sofa photographed side on. IT IS VERY LONG AND LOW: at least TWICE as long from end to end as it is tall from the floor to the top of the headboard, a long low wide shape filling the width of its cell. The deeply buttoned oxblood leather headboard stands at the RIGHT hand end with carved dark walnut posts and polished brass finials, and a low carved footboard at the LEFT hand end. Thick cream silk sheets, a heavy folded brocade throw across the foot, a deep carved walnut base. Two beautiful adult women with long platinum BLONDE hair are lounging in it, both wide awake, bored and languid, waiting for someone. THE BED IS ENORMOUS AND THEY ARE NORMAL SIZED PEOPLE IN IT: the two of them together occupy only the right hand THIRD of the bed and there is a vast empty expanse of sheet stretching away to the left of them. Each woman's head is TINY against the bed - no taller than one fourteenth of the length of the bed - and they have realistic slim adult human proportions, not oversized heads. They lie with their heads on big pillows at the RIGHT against the headboard, covered from the chest down by the sheets, only their heads, bare shoulders and arms above the bedding."

echo "=== the bed ==="
$G $O/bed.png landscape "$BEDDESC Three poses read left to right. Pose 1: both propped up on their elbows side by side, chins in hands, looking out of the picture to the LEFT, bored. Pose 2: the nearer one has flopped onto her back with one arm flung above her head, the further one still propped on an elbow. Pose 3: the two of them turned towards each other mid conversation, one gesturing lazily with a hand. $SHEET $S"

# The second sheet takes the first as a reference so it draws the SAME bed; whatever
# drift survives that, the resize-to-one-size and stabilise() in build_lair_extras.py
# take out.
$G $O/bed_b.png landscape "$BEDDESC The bed is exactly the bed in the reference image, same shape, same length, same headboard, same carving, same colours, drawn at the same size, and the two women are the same small size in it. Three poses read left to right. Pose 1: one lying on her front with her ankles crossed in the air behind her, the other on her side watching her. Pose 2: both stretched out lazily on their backs staring at the ceiling, thoroughly bored. Pose 3: both sitting up against the headboard smiling and looking out of the picture to the LEFT, one raising a hand to beckon. $SHEET $S" "$O/bed.png"

echo "=== the furniture ==="
$G $O/bed_wardrobe.png portrait "A tall open walnut wardrobe seen from the side with both doors swung open, warm light glowing inside it, brass rail and brass fittings. It is packed with a VARIED wardrobe, not a row of identical things: on the rail hang a black leather biker jacket, a cream double breasted suit, a white dinner jacket, a burgundy silk robe, a black leather waistcoat with the sleeves cut off and a dark tailored overcoat, all different colours and cuts. A shelf above holds a folded stack of coloured shirts, three pairs of black wraparound sunglasses and a fedora. A shelf below holds folded blue denim jeans, a pair of white trainers and a pair of black buckled boots. $L, $S"

$G $O/bed_nightstand.png landscape "A low smoked glass and brass nightstand seen from the side, a small brass table lamp with an oxblood shade lit on top of it, a silver ice bucket with a champagne bottle in it and two tall crystal flutes beside the bucket, $L, $S"

# the fire moved to its own four-frame set - see the fire section in CLAUDE.md

# The first two tries at this asked for the pelt "almost edge on" and got a flat squished
# smear with a tiny head. A trophy rug's head is MOUNTED - taxidermied whole and standing
# proud of the floor - and that is both what stops it reading as squished and where the
# fangs live. Three colourways were generated and compared at game size; the dark mane
# won because it frames the head so the ivory fangs still read at 126 logical wide.
$G $O/bed_rug.png landscape "A huge sabretooth cat pelt laid out flat on the floor as a trophy rug, seen from the front and slightly above. The flattened body, the four splayed legs with claws and the tail all lie FLAT on the ground and recede away to the RIGHT. At the LEFT hand end the taxidermied HEAD is mounted whole and three dimensional, raised well up off the floor and turned to face the viewer, snarling with its jaws wide open. The head is LARGE - about a third of the whole length of the rug - and is the focal point. Two colossal curved ivory sabre fangs hang from the upper jaw, far longer and thicker than any other feature, reaching down past the lower jaw. They are the boldest shape in the whole sprite and must read clearly even when the rug is small. This animal was a hard fight and it shows: a long scar across the muzzle, one ear torn and notched, the tip of one fang chipped, and old claw scars raked through the fur of the flank. Deep russet and burnt orange fur with heavy black striping across the shoulders, a shaggy black mane round the head, molten gold glass eyes, and the jaws lined with smaller teeth behind the two great fangs. $S"

echo "=== bedroom done ==="
echo "  ./.venv/bin/python tools/build_lair_extras.py bed"
echo "  ./.venv/bin/python tools/process_props.py bed_wardrobe bed_nightstand bed_fire bed_rug"
ls -la $O/bed*.png
