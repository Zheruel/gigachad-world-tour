#!/bin/bash
# gen_cast_delhi2.sh - extra frames so the cast animates like CHAD does:
# a 4-frame walk instead of 2, and a 3-frame attack instead of 2.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/delhi
A=assets/ai

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

GOONDA="A wiry Indian street thug in his twenties with messy black hair and a thin moustache, wearing a stained white sleeveless vest, a checked lungi wrapped around his legs, rubber sandals and a red thread on his wrist"
BATTA="A stocky Indian street thug with a shaved head and a thick black moustache, wearing an open orange shirt over a white vest and dark trousers, gripping a worn wooden cricket bat"
MASALA="A lean Indian market tough in a mustard yellow kurta with the sleeves rolled up, a cloth wrapped around his head, baggy trousers, his hands and forearms coated in bright red chilli powder"
BANDAR="A large aggressive rhesus macaque monkey with grey brown fur, a pink face, bared teeth and a long curling tail, low to the ground on all fours"
PEHLWAN="A huge heavyset Indian kushti wrestler with an enormous handlebar moustache, a shaved head, an oiled bare chest and big belly, wearing only a red langot loincloth, barefoot, enormously thick arms"
MIRCHI="A very large jolly fat Indian street food vendor with a huge black moustache and a sweaty grinning face, wearing a stained white apron over a kurta with a cloth draped over one shoulder, gripping a big steel ladle"
YADAV="A heavyset corrupt Indian police inspector with an enormous handlebar moustache and black aviator sunglasses, wearing a khaki police uniform with epaulettes and a peaked cap and a wide leather belt over a potbelly, holding a long bamboo lathi stick"

# walk3/walk4 complete the cycle; atk3 is the follow-through after the strike
extra() {
  local n=$1 d=$2 recover=$3 ref=$A/ref_$1.png
  $G $O/${n}_walk3.png portrait "$d, walking forward, the other leg striding forward in a full contact stride with the opposite arm swinging forward, $S" "$ref" &
  $G $O/${n}_walk4.png portrait "$d, walking forward, legs passing close together mid-stride at the top of the step with the opposite leg leading, $S" "$ref" &
  $G $O/${n}_atk3.png  portrait "$d, $recover, $S" "$ref" &
  wait
}

extra goonda  "$GOONDA"  "following through past his own punch, arm carried across his body, off balance forward"
extra batta   "$BATTA"   "at the end of a cricket bat swing, the bat carried right through and down past his legs, shoulders over-rotated"
extra masala  "$MASALA"  "arm still extended after flinging chilli powder, hand open and empty, leaning forward"
extra bandar  "$BANDAR"  "landing from a pounce, crouched low on all fours with the front paws absorbing the impact"
extra pehlwan "$PEHLWAN" "arms closed together in front of his chest after a failed grab, shoulders hunched forward"

# a third punch and slam frame for each boss
$G $O/mirchi_punch3.png portrait "$MIRCHI, arm hanging out and down after hurling something, body slumped forward, breathing hard, $S" "$A/ref_mirchi.png" &
$G $O/mirchi_slam3.png  portrait "$MIRCHI, the steel ladle swung right through and down past his knees, bent forward at the waist, $S" "$A/ref_mirchi.png" &
$G $O/yadav_punch3.png  portrait "$YADAV, the bamboo lathi withdrawn back to his shoulder after a thrust, chest puffed out, $S" "$A/ref_yadav.png" &
$G $O/yadav_slam3.png   portrait "$YADAV, completing a spin with the bamboo lathi trailing out behind him at knee height, $S" "$A/ref_yadav.png" &
wait

echo "=== cast pass 2 done ==="
ls assets/ai/delhi | wc -l
