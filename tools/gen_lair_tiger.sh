#!/bin/bash
# gen_lair_tiger.sh - the tiger, regenerated mean.
#
# Split out of gen_lair_pets.sh because the first tiger's three generations did not agree
# with each other and it needs a two-stage build to fix that. Measured on the old set: the
# walk frames' fur was (238,234,234), neutral white, and the sit pose was (249,235,214) -
# visibly cream - with 16.2% of its pixels brown against the walk's 5%, because it had been
# given a different harness. Three separate generations, three different animals.
#
# So the rest poses are ONE strip (they agree with each other by construction) generated
# with a frame cut out of the finished walk strip as a REFERENCE IMAGE (so they agree with
# the walk), and build_lair_extras.py then quantizes all eleven against one shared palette.
# Same rule as the bed set, arrived at the same way.
#
# "Meaner" at 58 logical px is silhouette and one loud accessory, not detail - the lesson
# the shark taught. What actually reads is the LINE OF THE BACK: shoulder blades standing
# above it and the head carried below it is a stalking animal, and a level back with the
# head up is a house cat however many scars it has.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
mkdir -p $O

SHEET="32-bit arcade beat em up game pixel art sprite in the style of Streets of Rage 4, side view, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no text, no numbers, no labels, no borders, no watermark"

# White on purpose, and that has not changed: the room is walnut, black glass and black
# granite, and a dark animal sinks into it.
TIGER="a huge white Bengal tiger built like a fighting animal rather than a zoo cat: a massive deep chest and heavy forequarters, the shoulder blades standing up in a hump ABOVE the line of its back, a thick short neck, and a big square head carried LOW, level with or below its shoulders. Bold black stripes over white fur with a cream belly. A heavy scowling brow ridge sits over large wraparound black sunglasses with a bright white glint running along their top edge. Its ears are laid flat back against its skull and a notch is torn out of the near ear. Long pale scars rake across its muzzle and its shoulder. It wears a thick oxblood leather harness across its chest studded with heavy brass domes, with a big brass ring at the throat"

echo "=== the prowl ==="
$G $O/tiger_walk.png landscape "One horizontal row containing a six frame walk cycle of the same tiger, evenly spaced, identical scale, all standing on the same ground line, with a clear band of empty flat green between each pose so they never touch. The tiger is $TIGER, and it is identical in every pose: same body, same stripes, same colour, same scars, same torn ear, same harness, same sunglasses. It is PROWLING, stalking forward slowly and heavily with its head low and its weight forward, not trotting. Left to right the six poses are: 1 front left paw reaching forward and rear right leg pushing back, 2 legs passing under the body, 3 front right paw reaching forward and rear left leg pushing back, 4 legs gathered under the body, 5 front left paw planted and the body at its lowest, 6 mid stride with all four legs spread. The tiger faces to the right in every pose. Its head and body stay at exactly the same height and never rotate and the head stays low in all six; only the legs and the tail change. $SHEET" &
wait

# One pose cut out of the walk, at full generated resolution, to hand to the rest strip.
# Described in words alone the second generation comes back a different animal - the same
# thing that made the old sit pose cream instead of white.
./.venv/bin/python - "$O/tiger_walk.png" "$O/tiger_ref.png" <<'PY'
import sys, os
sys.path.insert(0, "tools")
from build_lair_extras import slice_strip
# pose 2 has all four legs down, so it shows the whole animal with nothing foreshortened
slice_strip(sys.argv[1], 6)[2].save(sys.argv[2])
print("ref ->", sys.argv[2])
PY

echo "=== the rest poses ==="
# Five poses in one strip, in the order the room steps through them, so consecutive poses
# are a PROGRESSION rather than five unrelated drawings: asleep, woken, sitting up,
# stretching, snarling.
$G $O/tiger_rest.png landscape "One horizontal row containing five poses of the same tiger, evenly spaced, identical scale, all on the same ground line, with a clear band of empty flat green between each pose so they never touch. The tiger is the animal in the attached reference image and must match it exactly: the same white fur, the same black stripe pattern, the same cream belly, the same scars, the same torn ear, the same oxblood and brass chest harness and the same wraparound black sunglasses. It is identical in all five poses. Left to right the five poses are: 1 lying flat on its side fast asleep, front paws stretched out forward, head resting down on them, tail curled round, completely relaxed; 2 the same lying pose but AWAKE with its head lifted off its paws and turned to look at you, alert, everything below the neck unchanged; 3 sitting up on its haunches, front legs straight and planted, chest out, head level, tail curled round its paws; 4 standing with its front legs stretched far forward and its chest and chin dropped almost to the floor and its hindquarters up in the air in a huge yawning stretch; 5 standing square and SNARLING, head low and thrust forward, ears flat, muzzle wrinkled and jaws open wide showing enormous fangs. $SHEET" $O/tiger_ref.png &
wait

echo "=== tiger done ==="
ls -la $O/tiger_*
