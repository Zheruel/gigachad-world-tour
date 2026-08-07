#!/bin/bash
# gen_hurt2.sh - a second hit-reaction frame per enemy.
# A punch reads as weak when the victim barely moves; one recoil pose gives you
# nothing to cut to, so the hit lands on a static body.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/delhi
A=assets/ai
S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4, Metal Slug and Street Fighter III: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline around the body, dramatic top-left key light, no blur, single full body character, side view facing right, identical face, build and costume to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"
GOONDA="A wiry Indian street thug in his twenties with messy black hair and a thin moustache, wearing a stained white sleeveless vest, a checked lungi and rubber sandals"
BATTA="A stocky Indian street thug with a shaved head and a thick black moustache, wearing an open orange shirt over a white vest and dark trousers, holding a cricket bat"
MASALA="A lean Indian market tough in a mustard yellow kurta with the sleeves rolled up and a cloth wrapped around his head"
BANDAR="A large aggressive rhesus macaque monkey with grey brown fur and a long tail, low to the ground"
PEHLWAN="A huge heavyset Indian kushti wrestler with an enormous handlebar moustache, oiled bare chest and belly, wearing a red langot loincloth"
MIRCHI="A very large fat Indian street food vendor with a huge black moustache, wearing a stained white apron over a kurta"
YADAV="A heavyset Indian police inspector with an enormous handlebar moustache and aviator sunglasses, in a khaki uniform with a peaked cap"
R="doubled over from a punch to the gut, head dropped forward, arms folded in over the stomach, knees buckling"
for pair in "goonda:$GOONDA" "batta:$BATTA" "masala:$MASALA" "bandar:$BANDAR"; do
  n="${pair%%:*}"; d="${pair#*:}"
  $G $O/${n}_hurt2.png portrait "$d, $R, $S" "$A/ref_$n.png" &
done
wait
for pair in "pehlwan:$PEHLWAN" "mirchi:$MIRCHI" "yadav:$YADAV"; do
  n="${pair%%:*}"; d="${pair#*:}"
  $G $O/${n}_hurt2.png portrait "$d, $R, $S" "$A/ref_$n.png" &
done
wait
echo "=== hurt2 done ==="; ls assets/ai/delhi/*_hurt2.png | wc -l
