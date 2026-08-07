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

WOMEN="Two beautiful adult women with long platinum blonde hair are in the bed, both wide awake, bored and languid. They have realistic slim adult human proportions and small heads. They are lying on the bed under the sheets which cover them from the chest down, so their heads, bare shoulders and arms are above the bedding and the shape of their legs is visible under the sheet. They fill the right hand TWO THIRDS of the bed - only the last third at the footboard end is empty sheet - and each woman's head is about one twelfth of the length of the bed, so they read as normal sized people in a big bed rather than dolls in a vast one."

SAME="This image is the SAME PICTURE as the reference image with only one thing changed. The bed is pixel for pixel identical to the reference: the same length, the same height, the same headboard, the same posts and finials, the same carving on the base, the same folded red throw in the same place at the foot, the same pillows, drawn at exactly the same size and in exactly the same position within the frame, with exactly the same margins of green around it. Do NOT move the bed, do NOT resize it, do NOT zoom in or out, do NOT redraw the furniture. The ONLY difference from the reference image is the pose of the two women."

echo "=== pose 0: the reference every other pose is measured against ==="
$G $O/p0.png landscape "$BED $WOMEN Both are propped up on their elbows side by side near the headboard, chins resting in their hands, looking out of the picture to the LEFT, bored and waiting. $S"

echo "=== poses 1-4, each against pose 0 ==="
# The idle poses are a GENTLE PROGRESSION, not four unrelated pictures. The room steps
# between neighbouring poses, so 0->1->2->3 has to read as two people settling rather
# than as a cut: measured with check_bed_anim.py, unrelated poses changed 61-78% of the
# occupant area, which is a cut however long you hold it. Pose 4 is the greeting and is
# allowed to be a big change - it is triggered, not idle.
$G $O/p1.png landscape "$BED $WOMEN Both are still propped up on their elbows near the headboard exactly as in the reference image, but the nearer one has taken her chin off her hand and let that arm drop loosely onto the sheet in front of her, and has turned her head slightly towards the other. Everything else about both of them is unchanged from the reference. $SAME $S" "$O/p0.png"
$G $O/p2.png landscape "$BED $WOMEN The further one is still propped up on her elbow near the headboard as in the reference image, but the nearer one has now lowered herself down onto her side with her head resting on the pillow and one arm along the sheet, and the further one has turned her head to look down at her. $SAME $S" "$O/p0.png"
$G $O/p3.png landscape "$BED $WOMEN Both have now lowered themselves down onto their sides with their heads resting on the pillows, facing each other, arms loose along the sheets, thoroughly bored. $SAME $S" "$O/p0.png"

echo "=== poses done - now check them ==="
echo "  ./.venv/bin/python tools/check_bed_poses.py"
ls -la $O
