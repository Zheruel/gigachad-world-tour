#!/bin/bash
# gen_npcs.sh - animated background actors for Chandni Chowk.
# The plates are generated empty (gen_delhi3.sh); these are the people who live in
# them. Each is a short loop placed at an authored position in the stage def, running
# at its own phase so nothing moves in lockstep.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/npc

# Background actors sit behind the fighters, so they are deliberately plainer than the
# cast: less contrast, no hard rim, so they read as scenery and never pull the eye off
# the fight.
S="32-bit arcade beat em up game background character sprite in the style of Streets of Rage 4 and Metal Slug: detailed pixel art with soft three-tone shading, muted desaturated colours, gentle even lighting, no strong highlights, crisp dark 1px outline, single full body figure, side view, feet flat on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

# loop NAME  DESC  POSE1 POSE2 POSE3 [POSE4]
loop() {
  local n=$1 d=$2; shift 2
  local i=1
  for pose in "$@"; do
    $G $O/${n}${i}.png portrait "$d, $pose, $S" &
    i=$((i+1))
  done
  wait
}

echo "=== stall holders ==="
loop chai "A middle aged Indian chai wallah in a grubby vest and lungi with a cloth over his shoulder, standing behind a tea stall counter" \
  "holding a small steel pot low over a row of glasses, about to pour" \
  "raising the steel pot high above his head, a thin stream of tea arcing down into the glass below" \
  "pot held at full height, the stream of tea long and unbroken" \
  "lowering the pot back down, stream finished"

loop spice "An older Indian spice merchant with a grey moustache in a white kurta, standing behind a counter of open sacks" \
  "reaching down with a small brass scoop toward a sack of red powder" \
  "lifting a heaped scoop of bright red spice powder" \
  "tipping the scoop into a brass weighing pan held in his other hand" \
  "steadying the brass scales with both hands, watching the pan settle"

loop barber "An Indian barber in a white shirt standing over a customer seated in a barber chair, both figures together" \
  "leaning in with a straight razor raised beside the seated customer's cheek" \
  "drawing the razor down the seated customer's jaw in a careful stroke" \
  "straightening up and wiping the razor on a cloth, customer still seated"

loop fruit "A young Indian fruit seller in a checked shirt standing beside a handcart piled with oranges" \
  "bending down to pick up an orange from a crate" \
  "reaching up to place an orange on the top of the pile" \
  "standing back with both hands on his hips looking at the stack"
wait

echo "=== workers ==="
loop tailor "An Indian tailor in a plain shirt sitting at a treadle sewing machine, seen from the side" \
  "hands guiding cloth into the sewing machine, knees down" \
  "hands further along the cloth, treadle at the top of its stroke" \
  "hands at the end of the seam, treadle at the bottom of its stroke"

loop smith "An Indian metalworker in a stained vest and lungi crouched over a low anvil" \
  "hammer raised high above his head, other hand holding a metal pot on the anvil" \
  "hammer swung halfway down toward the anvil" \
  "hammer struck flat on the anvil, sparks flying, body compressed"

loop sweep "A thin elderly Indian street sweeper in a faded shirt and lungi holding a long bundled twig broom" \
  "broom held out to his right, about to sweep across" \
  "sweeping the broom across the ground in front of him, dust rising" \
  "broom finishing the stroke to his left, bent forward" \
  "straightening up, broom lifted clear of the ground"

loop fan "A heavyset Indian shopkeeper in a white vest squatting cross legged on a shop counter" \
  "sitting cross legged fanning himself slowly with a flat straw hand fan held low" \
  "fanning himself with the straw fan raised to chest height" \
  "fanning himself with the straw fan up beside his face, head tilted back"
wait

echo "=== movers + animals ==="
# the porter walks the length of the street, so he needs a real walk cycle
loop porter "A wiry Indian porter in a thin shirt and white trousers carrying an enormous bulging white sack balanced on his head and one shoulder, one hand steadying it" \
  "walking to the right, left leg striding forward, heel down, sack steady on his head" \
  "walking to the right, legs passing close together under him, sack steady on his head" \
  "walking to the right, right leg striding forward, heel down, sack steady on his head" \
  "walking to the right, legs passing close together with the opposite leg leading, sack steady on his head"

loop cust "An Indian man in a plain shirt and trousers standing side on browsing a market stall" \
  "standing looking down at the goods with both hands behind his back" \
  "reaching one hand out to pick something up from the stall" \
  "holding the item up close, examining it"
wait

loop dog "A scruffy sleeping Indian street dog curled up on the ground, tan and dusty, seen from the side" \
  "lying curled asleep on its side, ribs at rest" \
  "lying curled asleep on its side, ribs expanded on a breath, one ear twitched"

loop crow "A glossy black Indian house crow standing on the ground, seen from the side" \
  "standing upright, head raised, looking around" \
  "head lowered, beak down pecking at the ground" \
  "head turned sharply to the side mid peck, one wing slightly lifted"
wait

echo "=== npcs done ==="
ls assets/ai/npc | wc -l
