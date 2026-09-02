#!/bin/bash
# gen_d2_props.sh - THE NIGHT TRAIN props, portraits and ambience sprites. Processed by
# tools/process_props.py (D2 tables). Raw output is ignored assets/ai/d2props/.
# Usage: tools/gen_d2_props.sh [props|broken|portraits|ambience|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh; O=assets/ai/d2props
mkdir -p $O
WHAT="${1:-all}"
S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4: highly detailed pixel art with rich four-tone shading and a crisp dark 1px outline, cold fluorescent light from above. The ENTIRE background must be one solid flat bright pure green (RGB 0,255,0) chroma key with no black, no gradient, no glow, no shadow, no ground line, no text, no watermark, no border"
B="The same object, wrecked: "

props() {
$G $O/trolley.png square "A small Indian railway tea trolley, a steel frame on four castors with a kettle, stacked glasses and a biscuit tin on top, seen from the side, $S" &
$G $O/trunk.png square "A battered blue steel travelling trunk with brass corners and a padlock, seen from the side, $S" &
$G $O/parcel.png square "A stack of three roped jute parcels with chalk marks, the top one smaller, seen from the side, $S" &
wait
$G $O/berthtable.png square "A small folding steel berth table from an Indian sleeper train with two glasses of tea on it, seen from the side, $S" &
$G $O/glasses.png square "A wooden crate of clinking tea glasses, seen from the side, $S" &
$G $O/urn.png square "A tall steel railway tea urn with a brass tap and steam coming off the lid, seen from the side, $S" &
wait
$G $O/fridge.png square "A dented old white refrigerator with a rusted door and a stuck on sticker, seen from the side, $S" &
$G $O/chain.png square "A red painted emergency stop chain hanging vertically from a small brass housing with a pull handle at the bottom, seen from the side, $S" &
$G $O/thelatrunk.png square "A huge steel trunk lashed with rope, the kind carried on a porter's head, seen from the side, $S" &
wait
$G $O/handtruck.png square "An iron two wheeled railway parcel hand truck stacked with roped parcels, tipped onto its wheels as if rolling, seen from the side, $S" &
$G $O/relic_birju.png square "A heavy iron railway coupling pin with a ring at the top, rusty, standing upright on a small wooden block, seen from the side, $S" &
wait
}

broken() {
$G $O/trolley_b.png square "${B}a small steel tea trolley on its side with the castors in the air, the kettle spilled and glasses shattered, seen from the side, $S" &
$G $O/trunk_b.png square "${B}a blue steel travelling trunk burst open with the lid hanging off and clothes spilling out, seen from the side, $S" &
$G $O/parcel_b.png square "${B}a stack of jute parcels burst open, rope and packing straw and a broken clay pot spilled on the ground, seen from the side, $S" &
wait
$G $O/berthtable_b.png square "${B}a folding steel berth table snapped off its bracket lying flat with broken glasses, seen from the side, $S" &
$G $O/glasses_b.png square "${B}a wooden crate smashed flat in a spray of broken glass, seen from the side, $S" &
$G $O/urn_b.png square "${B}a steel tea urn on its side, dented, the lid off, tea pouring out and steam rising, seen from the side, $S" &
wait
$G $O/fridge_b.png square "${B}an old white refrigerator with the door torn off lying on the ground beside it, seen from the side, $S" &
$G $O/chain_b.png square "${B}a small brass emergency chain housing with a short snapped stub of red chain hanging from it, seen from the side, $S" &
$G $O/thelatrunk_b.png square "${B}a huge steel trunk split open on the ground with bundles of clothes, a bicycle wheel and cooking pots spilled everywhere, seen from the side, $S" &
wait
}

portraits() {
P="a close up character portrait bust for a 32-bit arcade beat em up game boss health bar, head and shoulders, three quarter view facing left, crisp detailed pixel art in the style of Streets of Rage 4, solid flat bright green chroma-key background (RGB 0,255,0), no text, no border, no watermark"
$G $O/portrait_tte.png square "A wiry Indian railway ticket examiner in his sixties, black serge coat, brass badge, rimless reading glasses down his nose, thin grey moustache, entirely unimpressed, $P" &
$G $O/portrait_birju.png square "A huge Indian railway shunter in his forties, shaved head, thick black moustache, bare shoulders glistening, an iron chain over one shoulder, a red rag at his neck, roaring into the wind, $P" &
wait
}

ambience() {
$G $O/family.png landscape "A family of three asleep in an upper berth of an Indian sleeper train seen from the side: a mother, a father and a small child under one blanket on a padded blue berth, heads on a bundle, completely still, the berth itself included, $S" &
$G $O/pigeons.png landscape "A row of six grey pigeons roosting on a horizontal iron girder, seen from the side, the girder included, $S" &
wait
}

case "$WHAT" in
  props) props;; broken) broken;; portraits) portraits;; ambience) ambience;;
  all) props; broken; portraits; ambience;;
esac
echo "=== $WHAT done ==="
ls -la $O
