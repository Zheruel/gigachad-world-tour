#!/bin/bash
# gen_cast_delhi.sh - the Chandni Chowk cast: 5 enemies + MIRCHI + YADAV.
# Phase 1 makes one standing reference per character; phase 2 generates every
# pose against that reference so each character stays consistent across frames.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/delhi
A=assets/ai

R="32-bit arcade beat em up game character reference in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline around the whole body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, standing, feet flat on the ground, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline around the body, dramatic top-left key light, no blur, no anti-aliasing mush, single full body character, side view facing right, identical face, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

GOONDA="A wiry Indian street thug in his twenties with messy black hair and a thin moustache, wearing a stained white sleeveless vest, a checked lungi wrapped around his legs, rubber sandals and a red thread on his wrist"
BATTA="A stocky Indian street thug with a shaved head and a thick black moustache, wearing an open orange shirt over a white vest and dark trousers, gripping a worn wooden cricket bat"
MASALA="A lean Indian market tough in a mustard yellow kurta with the sleeves rolled up, a cloth wrapped around his head, baggy trousers, his hands and forearms coated in bright red chilli powder"
BANDAR="A large aggressive rhesus macaque monkey with grey brown fur, a pink face, bared teeth and a long curling tail, low to the ground on all fours"
PEHLWAN="A huge heavyset Indian kushti wrestler with an enormous handlebar moustache, a shaved head, an oiled bare chest and big belly, wearing only a red langot loincloth, barefoot, enormously thick arms"
MIRCHI="A very large jolly fat Indian street food vendor with a huge black moustache and a sweaty grinning face, wearing a stained white apron over a kurta with a cloth draped over one shoulder, gripping a big steel ladle"
YADAV="A heavyset corrupt Indian police inspector with an enormous handlebar moustache and black aviator sunglasses, wearing a khaki police uniform with epaulettes and a peaked cap and a wide leather belt over a potbelly, holding a long bamboo lathi stick"

# ---------------------------------------------------------------- phase 1: refs
if [ "${1:-}" != "frames" ]; then
echo "=== refs ==="
$G $A/ref_goonda.png  portrait "$GOONDA, $R" &
$G $A/ref_batta.png   portrait "$BATTA, $R" &
$G $A/ref_masala.png  portrait "$MASALA, $R" &
$G $A/ref_bandar.png  portrait "$BANDAR, $R" &
wait
$G $A/ref_pehlwan.png portrait "$PEHLWAN, $R" &
$G $A/ref_mirchi.png  portrait "$MIRCHI, standing behind a wooden street food cart, $R" &
$G $A/ref_yadav.png   portrait "$YADAV, $R" &
wait
fi

# ---------------------------------------------------------------- phase 2: frames
# enemy() NAME DESC  -> idle, walk1, walk2, atk, atk2, hurt, down
enemy() {
  local n=$1 d=$2 atk=$3 atk2=$4 ref=$A/ref_$1.png
  $G $O/${n}_idle.png  portrait "$d, standing in a loose fighting stance, fists ready, $S" "$ref" &
  $G $O/${n}_walk1.png portrait "$d, walking forward, one leg striding forward in a full contact stride, $S" "$ref" &
  $G $O/${n}_walk2.png portrait "$d, walking forward, legs passing close together mid-stride, $S" "$ref" &
  wait
  $G $O/${n}_atk.png   portrait "$d, $atk, $S" "$ref" &
  $G $O/${n}_atk2.png  portrait "$d, $atk2, $S" "$ref" &
  $G $O/${n}_hurt.png  portrait "$d, recoiling backwards from a heavy punch, head snapped back, arms flung loose, $S" "$ref" &
  $G $O/${n}_down.png  landscape "$d, knocked out flat on his back on the ground, arms sprawled, seen from the side, $S" "$ref" &
  wait
}

enemy goonda "$GOONDA" \
  "winding up a wild haymaker punch, arm cocked far back behind him" \
  "throwing a wild haymaker punch, arm fully extended forward"

enemy batta "$BATTA" \
  "raising the cricket bat high overhead with both hands, about to swing down" \
  "swinging the cricket bat down and through in a big arc in front of him"

enemy masala "$MASALA" \
  "scooping a handful of bright red chilli powder from a pouch at his waist" \
  "flinging a cloud of bright red and orange chilli powder forward from his hand"

enemy bandar "$BANDAR" \
  "crouched low and coiled on all fours, screeching with teeth bared, about to pounce" \
  "leaping through the air with arms outstretched and claws forward, mouth wide open"

enemy pehlwan "$PEHLWAN" \
  "crouched low with both arms spread wide, about to lunge into a grapple" \
  "lunging forward with both arms wrapped around in a crushing bear hug"

# boss() NAME DESC -> idle, walk1, walk2, punch, punch2, grab, slam, slam2, hurt, down
boss() {
  local n=$1 d=$2 p1=$3 p2=$4 gr=$5 s1=$6 s2=$7 ref=$A/ref_$1.png
  $G $O/${n}_idle.png  portrait "$d, standing in a confident fighting stance, $S" "$ref" &
  $G $O/${n}_walk1.png portrait "$d, walking forward, one leg striding forward in a full contact stride, $S" "$ref" &
  $G $O/${n}_walk2.png portrait "$d, walking forward, legs passing close together mid-stride, $S" "$ref" &
  wait
  $G $O/${n}_punch.png  portrait "$d, $p1, $S" "$ref" &
  $G $O/${n}_punch2.png portrait "$d, $p2, $S" "$ref" &
  $G $O/${n}_grab.png   portrait "$d, $gr, $S" "$ref" &
  wait
  $G $O/${n}_slam.png  portrait "$d, $s1, $S" "$ref" &
  $G $O/${n}_slam2.png portrait "$d, $s2, $S" "$ref" &
  $G $O/${n}_hurt.png  portrait "$d, recoiling backwards from a heavy punch, head snapped back, $S" "$ref" &
  $G $O/${n}_down.png  landscape "$d, knocked out flat on his back on the ground, arms sprawled, seen from the side, $S" "$ref" &
  wait
}

boss mirchi "$MIRCHI" \
  "cocking one arm far back holding a burning samosa pastry, about to throw it" \
  "hurling a burning samosa pastry forward, throwing arm fully extended" \
  "lunging forward with both arms outstretched to grab, ladle in one hand" \
  "raising a big steel ladle dripping with bright green chutney high overhead" \
  "sweeping the steel ladle down low, flinging bright green chutney across the ground"

boss yadav "$YADAV" \
  "drawing the bamboo lathi stick back beside his head, about to thrust it forward" \
  "thrusting the long bamboo lathi stick straight forward at full extension" \
  "lunging forward with one hand outstretched to seize someone by the collar" \
  "raising the bamboo lathi overhead with both hands, about to spin" \
  "spinning with the bamboo lathi swung out low and level in a wide sweep"

echo "=== delhi cast done ==="
ls assets/ai/delhi | wc -l
