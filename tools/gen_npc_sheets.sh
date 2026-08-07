#!/bin/bash
# gen_npc_sheets.sh - regenerate CHAD's run and every background actor as sprite
# sheets. Same reasoning as gen_sheet.sh: drawn as one set, the poses stay consistent,
# which is the whole difference between an animation and a slideshow.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/sheet

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME figure repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch. The figure must be identical in every pose - identical face, build, clothing and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4, crisp detailed pixel art, side view, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no borders, no watermark"

NPC="$SHEET. Muted desaturated colours and soft even lighting so the figure reads as background scenery."

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off, bare chested under it, a wallet chain, blue jeans and black buckled boots"

echo "=== chad run ==="
$G $O/run.png landscape "$CHAD, a 6 pose running cycle read left to right, running to the right leaning forward with both fists held up in a boxing guard. Pose 1: left foot striking the ground in front, right leg trailing back bent. Pose 2: body compressed at its lowest, left knee deeply bent, right knee driving forward. Pose 3: left leg extended straight behind pushing off, right knee raised high in front. Pose 4: both feet off the ground, right leg reaching forward, left leg tucked back. Pose 5: right foot striking the ground in front, left leg trailing back. Pose 6: right leg extended straight behind pushing off, left knee raised high. In every pose the arms and shoulders stay in the same guard. $SHEET" "assets/ai/ref_chad.png" &

echo "=== stall holders ==="
$G $O/npc_chai.png landscape "An Indian chai wallah in a grubby vest and lungi with a cloth over his shoulder, standing behind a tea stall counter. A 4 pose loop read left to right. Pose 1: holding a small steel pot low over a row of glasses. Pose 2: the pot raised to head height, a thin stream of tea starting to pour. Pose 3: the pot raised high above his head, a long unbroken stream of tea arcing down. Pose 4: the pot lowering back down, the stream finishing. His feet and body stay in exactly the same place in all four poses - only the arms and the pot move. $NPC" &

$G $O/npc_spice.png landscape "An older Indian spice merchant with a grey moustache in a white kurta standing behind a counter of open sacks. A 4 pose loop read left to right. Pose 1: reaching down with a small brass scoop. Pose 2: lifting a heaped scoop of bright red spice powder. Pose 3: tipping the scoop into a brass weighing pan. Pose 4: steadying the brass scales with both hands. His feet and body stay in exactly the same place - only the arms move. $NPC" &

$G $O/npc_barber.png landscape "An Indian barber in a white shirt standing beside a customer seated in a barber chair, both figures together as one group. A 3 pose loop read left to right. Pose 1: the barber leaning in with a straight razor raised beside the seated customer's cheek. Pose 2: drawing the razor down the customer's jaw. Pose 3: straightening up and wiping the razor on a cloth. The seated customer and the chair stay in exactly the same place in all three poses. $NPC" &
wait

$G $O/npc_fruit.png landscape "A young Indian fruit seller in a checked shirt standing beside a handcart piled with oranges. A 3 pose loop read left to right. Pose 1: bending down to pick up an orange from a crate. Pose 2: reaching up to place the orange on top of the pile. Pose 3: standing back with both hands on his hips. The cart and the fruit pile stay in exactly the same place in all three poses. $NPC" &

$G $O/npc_tailor.png landscape "An Indian tailor in a plain shirt sitting side on at a treadle sewing machine. A 3 pose loop read left to right showing the treadle at the top, middle and bottom of its stroke, his hands feeding cloth further along the seam each time. He stays seated in exactly the same place and the machine does not move. $NPC" &

$G $O/npc_smith.png landscape "An Indian metalworker in a stained vest and lungi crouched over a low anvil. A 3 pose loop read left to right. Pose 1: hammer raised high above his head. Pose 2: hammer swung halfway down. Pose 3: hammer struck flat on the anvil with sparks, body compressed. His feet, the anvil and his other hand stay in exactly the same place. $NPC" &
wait

$G $O/npc_sweep.png landscape "A thin elderly Indian street sweeper in a faded shirt and lungi with a long bundled twig broom. A 4 pose loop read left to right showing one full sweeping stroke: broom out to his right, sweeping across in front of him with dust rising, finishing to his left bent forward, then lifting clear. His feet stay planted in the same spot in all four poses. $NPC" &

$G $O/npc_fan.png landscape "A heavyset Indian shopkeeper in a white vest squatting cross legged on a shop counter. A 3 pose loop read left to right showing him fanning himself with a flat straw hand fan, the fan low, then at chest height, then raised beside his face. He stays squatting in exactly the same place - only the fanning arm moves. $NPC" &

$G $O/npc_porter.png landscape "A wiry Indian porter in a thin shirt and white trousers carrying an enormous bulging white sack balanced on his head and shoulder, one hand steadying it. A 4 pose walking cycle read left to right, walking to the right: contact with the left leg forward, passing with the legs together, contact with the right leg forward, passing again. The sack and both arms stay in exactly the same position throughout - only the legs move. $NPC" &
wait

$G $O/npc_cust.png landscape "An Indian man in a plain shirt and trousers standing side on browsing a market stall. A 3 pose loop read left to right: hands behind his back looking down, reaching one hand out to pick something up, holding the item up close to examine it. His feet and stance stay identical in all three poses. $NPC" &

$G $O/npc_dog.png landscape "A scruffy tan Indian street dog curled up asleep on the ground, seen from the side. A 2 pose loop read left to right showing only a breath: ribs at rest, then ribs expanded with one ear twitched. Otherwise absolutely identical. $NPC" &

$G $O/npc_crow.png landscape "A glossy black Indian house crow standing on the ground, seen from the side. A 3 pose loop read left to right: standing upright with head raised, head lowered pecking at the ground, head turned sharply to the side with one wing slightly lifted. Its feet stay in exactly the same place. $NPC" &
wait

echo "=== npc sheets done ==="
ls assets/ai/sheet | wc -l
