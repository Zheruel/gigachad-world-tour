#!/bin/bash
# gen_fx.sh - art for the things that were being drawn as raw rectangles:
# pickups, projectiles, floor hazards, and the HUD chrome.
#
# Scope note: soft alpha puffs (steam, smoke, rings) and the shadow ellipse are
# staying procedural. They read as light, not as objects, so they never looked like
# programmer art. What is replaced here is everything that read as a SHAPE - a
# strobing square, five orange sticks, a spinning triangle.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/fx

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object centred on its own, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

echo "=== pickups ==="
$G $O/pick_chilli.png square "A single fat glossy red Indian chilli pepper with a green stem, lying at a slight angle, glowing faintly hot from within, $S" &
$G $O/pick_lassi.png  square "A tall glass tumbler of thick creamy yellow mango lassi with a frothy top and a dusting of pistachio, condensation on the glass, $S" &
$G $O/pick_chaat.png  square "A steel plate of Indian chaat piled with crisp puris, white yoghurt, bright green chutney and orange tamarind sauce, garnished with coriander, $S" &
wait

echo "=== projectiles ==="
$G $O/samosa1.png square "A single golden brown triangular Indian samosa with a crimped edge, on fire with small orange flames licking off its corners, seen from the side, $S" &
$G $O/samosa2.png square "A single golden brown triangular Indian samosa rotated a quarter turn, on fire with orange flames streaming off it, $S" &
$G $O/samosa3.png square "A single golden brown triangular Indian samosa upside down, wreathed in orange flame, $S" &
$G $O/samosa4.png square "A single golden brown triangular Indian samosa rotated three quarters, trailing orange fire, $S" &
wait
$G $O/powder1.png square "A small tight puff of bright red and orange chilli powder bursting outward, fine grainy particles, $S" &
$G $O/powder2.png square "A medium expanding cloud of bright red and orange chilli powder, grainy particles spreading, $S" &
$G $O/powder3.png square "A wide thinning cloud of bright red and orange chilli powder dispersing into fine drifting grains, $S" &
wait

echo "=== floor hazards ==="
$G $O/flame1.png square "A single clump of orange and yellow flames burning low on the ground, seen from the side, tall licking tips, $S" &
$G $O/flame2.png square "A single clump of orange and yellow flames burning low on the ground, seen from the side, flames leaning and curling differently, $S" &
$G $O/flame3.png square "A single clump of orange and yellow flames burning low on the ground, seen from the side, flames guttering shorter, $S" &
$G $O/flame4.png square "A single clump of orange and yellow flames burning low on the ground, seen from the side, flames flaring up tall with sparks, $S" &
wait
$G $O/puddle.png landscape "A wide splattered puddle of thick bright green Indian coriander chutney spilled flat on the ground, seen from a low angle, glossy with a lumpy edge, $S" &
$G $O/gas1.png square "A low billowing cloud of pale sickly yellow green tear gas rolling along the ground, $S" &
$G $O/gas2.png square "A larger billowing cloud of pale sickly yellow green tear gas, thicker and taller, $S" &
$G $O/gas3.png square "A thinning drifting cloud of pale sickly yellow green tear gas dispersing, $S" &
wait

echo "=== birds ==="
$G $O/bird1.png square "A single grey Indian rock pigeon standing on the ground in profile, wings folded, $S" &
$G $O/bird2.png square "A single grey Indian rock pigeon in profile with both wings spread wide mid flap, taking off, $S" &
$G $O/bird3.png square "A single grey Indian rock pigeon in profile in flight with wings swept down, body stretched forward, $S" &
wait

echo "=== HUD ==="
# one plate containing the whole chrome; the code fills the bars inside it
$G $O/hud_chrome.png landscape "A 16-bit arcade game heads up display frame drawn as a single flat panel: on the left a square empty portrait window with an ornate brass and dark iron bezel, and to the right of it two long empty horizontal bar housings stacked one above the other, the upper housing taller than the lower, each a hollow recessed trough with a riveted brass rim and a dark empty interior. Weathered brass and gunmetal, Indian market metalwork motifs stamped into the frame, chunky readable pixel art, no text, no letters, no numbers, no bars filled in, no gauge contents, solid flat bright green chroma-key background (RGB 0,255,0), no watermark, no border" &
$G $O/hud_life.png square "A small square arcade game life icon badge: a brass rimmed dark plate with the head and shoulders of a blond muscular man in black aviator sunglasses and a black leather jacket on it, seen from the front, very simple and bold and readable at tiny size, chunky pixel art, no text, solid flat bright green chroma-key background (RGB 0,255,0), no watermark, no border" &
wait

echo "=== fx done ==="
ls assets/ai/fx | wc -l
