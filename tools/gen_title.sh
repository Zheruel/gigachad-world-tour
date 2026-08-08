#!/bin/bash
# gen_title.sh - title screen key art.
#
# Replaces gen_lair.sh, which drew an Old Delhi basement gym. That was right when Delhi was
# the whole game; it is wrong for a WORLD TOUR, and it is wrong for a game whose home base is
# now a neon penthouse a thousand feet over the city. The title should be the room the player
# actually lives in between acts.
#
# The band is 984x372 - 2.645:1 - so the composition has to be WIDE and it has to put
# something worth looking at on both sides of him. State that as a rule: a square-framed
# generation with him dead centre loses everything to the crop, and the logo sits over the
# top third, so the top third must be sky and glass rather than anything with detail in it.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/title
mkdir -p $O

STYLE="32-bit arcade beat em up game key art in the style of Streets of Rage 4 and Metal Slug, seen straight from the side with no perspective distortion, highly detailed crisp pixel art, rich saturated colour, dramatic rim lighting with deep shadows in the corners, cinematic title screen composition, no text, no latin letters, no numbers, no logo, no watermark, no border, no user interface, no signature"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

WIDE="COMPOSITION RULE: this is a WIDE banner, about two and a half times wider than it is tall, and it must be composed for that shape. The man stands in the CENTRE and there is something worth looking at on BOTH sides of him, spread right out to the left and right edges of the picture. The TOP THIRD of the picture is nothing but sky, glass and skyline - keep it clear and simple with no detail and no clutter up there."

ONLY="he is the only person in the picture, no other people, no bystanders, no crowd"

$G $O/title_a.png landscape "The penthouse of a gigachad brawler at the top of a skyscraper, at sunset. $CHAD stands in the centre of the room in a boxing guard, in silhouette-edge rim light against a wall of floor to ceiling glass that runs the entire width of the picture, with a vast neon city and an elevated expressway glowing far below and a huge low sun behind him. A heavy leather punching bag hangs on a chain from the ceiling beam beside him. A white Bengal tiger in a studded leather harness lies on the polished black granite floor at his feet. To one side a colossal lit aquarium set into dark walnut panelling glows blue with a shipwreck inside it; to the other, a long lit trophy alcove of brass rails and glass shelves. Warm brass and dark walnut against magenta and cyan neon, everything reflected in the black floor. $WIDE $ONLY. $STYLE" "$R" &

$G $O/title_b.png landscape "The penthouse of a gigachad brawler at the top of a skyscraper, at night. $CHAD stands in the centre with his arms folded, lit from behind by a wall of floor to ceiling glass running the entire width of the picture, a vast neon city far below and an airship crossing between the towers. A white Bengal tiger in a studded leather harness stands alert beside him. To one side a colossal lit aquarium glows blue in dark walnut panelling with a big shark cruising through a sunken shipwreck; to the other, a fireplace burning under a huge gilded oil painting, and a long trophy alcove of brass rails and glass shelves holding strange souvenirs. A loaded barbell and a rack of dumbbells stand along the glass. Dark walnut, oxblood leather and polished brass against magenta and cyan neon, everything reflected in a black granite floor. $WIDE $ONLY. $STYLE" "$R" &
wait

echo "=== pick one and build it ==="
echo "  tools/build_title.sh $O/title_a.png 0.20"
ls -la $O
