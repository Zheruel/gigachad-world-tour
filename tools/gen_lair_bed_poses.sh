#!/bin/bash
# gen_lair_bed_poses.sh - the master suite's bed, ONE IMAGE PER POSE.
#
# The strip approach failed twice. A six-pose strip gives 256px cells, too little to
# draw a long bed in; two three-pose strips gave 512px cells but the two sheets came
# back with different beds. Compositing the furniture out of one frame fixed the drift
# and left a hard horizontal seam across the mattress instead, because the box edge cuts
# through drapery that differs either side of it.
#
# So: every pose is its own full 1536x1024 generation, and every one of them takes
# pose 1 as a reference with an explicit instruction that the bed must not move, resize
# or be redrawn. tools/build_lair_extras.py then only has to take out translation, and
# check_bed_poses.py measures whether each pose actually held - a pose that drifted is
# deleted and regenerated rather than patched over.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair/bed
mkdir -p $O

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

BED="A huge opulent king size bed, seen from directly at its SIDE in flat side elevation exactly like a sofa photographed side on, drawn small and centred with a wide margin of flat green all around it. IT IS A LOW BED WITH NO CANOPY: there is no frame or rail or drapery above it, nothing over the top of it at all, and the tall deeply buttoned oxblood leather headboard at the RIGHT hand end is the highest point of the whole object. A low carved footboard at the LEFT hand end. It is DEEP AND SUBSTANTIAL rather than thin: a thick mattress on a deep carved dark walnut base with a heavy moulded plinth, so the bed is only about TWICE as long as it is tall from the floor to the top of the headboard and never reads as a thin slab. A heavy folded dark red brocade throw lying across the foot, big white pillows at the head, thick cream silk sheets."

WOMAN="One beautiful adult woman with long platinum blonde hair is in the bed, awake, relaxed and languid, entirely on her own. She is wearing a BLACK lace and leather lingerie set - a lace-trimmed black bralette and a black leather harness strap across it, high cut - which reads as strong dark shapes against the cream bedding. She is not nude. She has realistic slim adult human proportions and a small head. The sheets are pulled up over her legs so her head, bare shoulders, arms, waist and the black lingerie are above the bedding. She occupies the right hand half of the bed near the headboard, and her head is about one twelfth of the length of the bed."

SAME="This image is the SAME PICTURE as the reference image with only one thing changed. The bed is pixel for pixel identical to the reference: the same length, the same height, the same headboard, the same posts and finials, the same carving on the base, the same folded red throw in the same place at the foot, the same pillows, drawn at exactly the same size and in exactly the same position within the frame, with exactly the same margins of green around it. Do NOT move the bed, do NOT resize it, do NOT zoom in or out, do NOT redraw the furniture. The ONLY difference from the reference image is the pose of the two women."

echo "=== pose 0: the reference every other pose is measured against ==="
$G $O/p0.png landscape "$BED $WOMAN She is sitting up against the headboard with her knees drawn up under the sheet, both hands resting on her knees, looking out of the picture to the LEFT. $S"

echo "=== poses 1-7, each against pose 0 ==="
# EIGHT poses in a tight chain, each a small movement from the one before it. The room
# steps between neighbours only, so the size of one step is the whole quality of the
# animation: check_bed_anim.py measures it, and anything over about 45% of the occupant
# area reads as a cut rather than as someone shifting.
$G $O/p1.png landscape "$BED $WOMAN Exactly as in the reference image, sitting up against the headboard with her knees drawn up, but she has turned her head to look down and to the LEFT and let one hand slip off her knee onto the sheet. $SAME $S" "$O/p0.png"
$G $O/p2.png landscape "$BED $WOMAN Sitting up against the headboard as in the reference, but now leaning back on one hand placed behind her, her knees dropping a little lower under the sheet. $SAME $S" "$O/p0.png"
$G $O/p3.png landscape "$BED $WOMAN Leaning back on BOTH hands placed behind her, chin lifted, legs now stretched out flat under the sheet in front of her. $SAME $S" "$O/p0.png"
$G $O/p4.png landscape "$BED $WOMAN She has slid down from the headboard and is propped up on one elbow on her side, her other hand resting on the sheet in front of her, looking out to the LEFT. $SAME $S" "$O/p0.png"
$G $O/p5.png landscape "$BED $WOMAN Still propped on one elbow on her side, but she has raised her free hand to play idly with a strand of her hair. $SAME $S" "$O/p0.png"
$G $O/p6.png landscape "$BED $WOMAN She has lowered herself all the way down onto her side with her head resting on the pillow, one arm stretched out along the sheet in front of her. $SAME $S" "$O/p0.png"
$G $O/p7.png landscape "$BED $WOMAN She has rolled over onto her front, chin resting on her folded hands, ankles crossed in the air behind her, looking out to the LEFT. $SAME $S" "$O/p0.png"

echo "=== poses done - now check them ==="
echo "  ./.venv/bin/python tools/check_bed_poses.py"
ls -la $O
