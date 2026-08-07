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

BED="A huge opulent king size four poster bed, seen from directly at its SIDE in flat side elevation exactly like a sofa photographed side on, drawn small and centred with a wide margin of flat green all around it. It is about twice as long as it is tall. A deeply buttoned oxblood leather headboard at the RIGHT hand end with carved dark walnut posts and polished brass finials, a low carved footboard at the LEFT hand end, a heavy folded dark red brocade throw lying across the foot of the bed, big white pillows at the head, thick cream silk sheets and a deep carved walnut base."

WOMAN="One beautiful adult woman with long platinum blonde hair is in the bed, awake, relaxed and languid, entirely on her own. She is wearing a BLACK silk and lace lingerie camisole with thin straps, which reads as dark against the cream bedding. She has realistic slim adult human proportions and a small head. She lies on the bed with the sheets pulled up over her legs, so her head, bare shoulders and arms and the black camisole are above the bedding. She occupies the right hand half of the bed near the headboard, and her head is about one fourteenth of the length of the bed, so she reads as a normal sized person in a very big bed."

SAME="This image is the SAME PICTURE as the reference image with only one thing changed. The bed is pixel for pixel identical to the reference: the same length, the same height, the same headboard, the same posts and finials, the same carving on the base, the same folded red throw in the same place at the foot, the same pillows, drawn at exactly the same size and in exactly the same position within the frame, with exactly the same margins of green around it. Do NOT move the bed, do NOT resize it, do NOT zoom in or out, do NOT redraw the furniture. The ONLY difference from the reference image is the pose of the two women."

echo "=== pose 0: the reference every other pose is measured against ==="
$G $O/p0.png landscape "$BED $WOMAN She is sitting up against the headboard with her knees drawn up under the sheet, looking out of the picture to the LEFT. $S"

echo "=== poses 1-5, each against pose 0 ==="
# A GENTLE PROGRESSION, not six unrelated pictures. The room steps between neighbouring
# poses, so 0->1->2->3->4->5 has to read as one person settling and shifting rather than
# as cuts: measured with check_bed_anim.py, unrelated poses changed 61-78% of the
# occupant area, which is a cut however long you hold it.
$G $O/p1.png landscape "$BED $WOMAN She is in the same place against the headboard as in the reference image but has leaned back onto both hands behind her, chin lifted, knees still up under the sheet. $SAME $S" "$O/p0.png"
$G $O/p2.png landscape "$BED $WOMAN She has slid down a little from the headboard and is now propped up on one elbow on her side, her other hand resting on the sheet in front of her, looking out to the LEFT. $SAME $S" "$O/p0.png"
$G $O/p3.png landscape "$BED $WOMAN She is lying on her side with her head resting on the pillow, one hand up playing idly with a strand of her hair, the other arm along the sheet. $SAME $S" "$O/p0.png"
$G $O/p4.png landscape "$BED $WOMAN She has rolled onto her back with one knee raised under the sheet and both arms loose at her sides, head turned on the pillow. $SAME $S" "$O/p0.png"
$G $O/p5.png landscape "$BED $WOMAN She has rolled onto her front with her chin resting on her folded hands and her ankles crossed in the air behind her under the sheet, looking out to the LEFT. $SAME $S" "$O/p0.png"

echo "=== poses done - now check them ==="
echo "  ./.venv/bin/python tools/check_bed_poses.py"
ls -la $O
