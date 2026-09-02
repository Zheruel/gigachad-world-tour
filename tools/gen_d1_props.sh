#!/bin/bash
# gen_d1_props.sh - DIRTY DELHI production props that were borrowing other props' art,
# the dredger's rig pieces, the shutter, and the relics for the trophy wall.
# Usage: tools/gen_d1_props.sh [props|rig|relics|inpaint|all]
# Then: ./.venv/bin/python tools/process_props.py <names>  (the D1 table sizes them), and
# tools/patch_plate.py for the inpaint.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d1props
mkdir -p $O
WHAT="${1:-all}"

# "ENTIRE background ... pure green" is load-bearing: the softer wording came back on black
# for three of the props and needed a second pass.
S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, worn and grimy, single object seen from the side at ground level. The ENTIRE background must be one solid flat bright pure green (RGB 0,255,0) chroma key with no black, no gradient, no glow, no shadow, no ground line, no people, no text, no watermark, no border"
N="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dim sodium orange dusk light from the upper left, rusted and river worn, single object seen from the side, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

props() {
$G $O/drum.png     square "A dented blue steel chemical drum standing upright, a faded hazard label, rust streaks, a crust of white chemical foam round the base, $S" &
$G $O/drum_b.png   square "A burst blue steel chemical drum split open lying on its side, a small puddle of sickly green chemical sludge leaking from it, $S" &
$G $O/mithai.png   square "A small cardboard Indian sweet box with a red and gold printed lid, tied with string, a corner torn showing orange and yellow mithai sweets inside, $S" &
wait
$G $O/mithai_b.png square "A crushed cardboard sweet box flattened on the ground with orange and yellow Indian mithai sweets scattered around it, $S" &
wait
$G $O/thelapole.png   landscape "A long wooden boat punting pole lying horizontally, dark waterlogged wood, an iron ferrule on one end, wrapped rope grip, weed caught on it, dim sodium orange dusk light, $S" &
$G $O/thelapole_b.png landscape "A long wooden boat punting pole snapped into two splintered halves lying flat on the ground, $N" &
$G $O/dhobislab.png   landscape "A flat rectangular stone washing slab at a river ghat, worn smooth, a wet white bedsheet draped half over it, soap suds, seen from the side low to the ground, dim sodium orange dusk light, $S" &
wait
$G $O/dhobislab_b.png landscape "A cracked stone washing slab broken into three pieces lying flat, a torn wet sheet crumpled among the rubble, $N" &
$G $O/shutter.png     portrait "A corrugated steel roller shutter for an Indian market shopfront, seen straight on, fully rolled down, painted a faded blue with rust bleeding through, layers of torn film posters and painted numbers, a heavy padlock hasp at the bottom, the roller drum housing at the top, $S" &
wait
}

rig() {
$G $O/dredger_bucket.png square "A huge rusted steel clamshell grab bucket for a dredging crane exactly like the one in the reference image, hanging closed from a short length of heavy chain that ends at the top edge, seen straight from the side, caked in black river mud and weed, dented plates, thick rivets, dripping, $N" $O/ref_bucket_plate.png &
$G $O/dredger_bucket_open.png square "The same huge rusted steel clamshell grab bucket as the reference image but with its two jaws swung wide OPEN, hanging from a short length of heavy chain that ends at the top edge, seen straight from the side, wet sand and black river mud pouring out of the open jaws, $N" $O/ref_bucket_plate.png &
$G $O/dredger_winch.png square "A rusted industrial winch: a large drum wound with steel cable inside a riveted iron housing with a guard cage, a hand brake lever, bolted to a timber skid, oil stained and river worn, seen straight from the side, $N" &
wait
$G $O/dredger_winch_b.png square "A wrecked industrial winch, the housing torn open, the drum cracked in half, steel cable spilling out in loose tangled loops across the ground, sparks, $N" &
$G $O/hose_nozzle.png square "A heavy brass and rubber industrial slurry hose nozzle with a lever valve, a short length of thick ribbed black rubber hose behind it, dripping grey mud, seen from the side, $N" &
wait
}

relics() {
R="a small trophy object for a display shelf, 32-bit arcade game pixel art in the style of Streets of Rage 4, highly detailed with four-tone shading and a crisp dark 1px outline, warm interior lamp light from the upper left, seen from the side at eye level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"
$G $O/relic_dredger.png square "A tarnished brass river dredging permit token: a heavy round brass disc with an embossed river and crane emblem, stamped numbers, on a short rusted chain, standing propped in a small wooden block holder, $R" &
$G $O/relic_birju.png square "A heavy steel railway coupling pin, blackened and scarred, with a knotted red rag tied through its ring, standing upright in a small wooden block holder, $R" &
$G $O/relic_sir.png square "A slim black telephone call centre headset with a bent microphone boom, the earpiece cracked, water beaded on it, resting on a small wooden stand, $R" &
wait
}

inpaint() {
$G $O/inpaint_bucket.png square "Reproduce the reference image EXACTLY, pixel for pixel, at the same framing and scale, with one change only: remove the hanging steel clamshell grab bucket and the chains above it entirely, and paint in the stone ghat wall, steps and barrels that would be behind them, matching the surrounding masonry, light and pixel art style seamlessly. Everything else in the image must stay identical. No text, no watermark, no border." $O/inpaint_src_bucket.png
}

case "$WHAT" in
  props) props;; rig) rig;; relics) relics;; inpaint) inpaint;;
  all) rig; inpaint; props; relics;;
esac
echo "=== $WHAT done ==="
ls -la $O
