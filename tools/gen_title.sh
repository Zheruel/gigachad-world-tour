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

# The rule that finally worked, after three tries. The band is 2.645:1, which is only 57%
# of a 1536x1024 generation's height, and every attempt drew CHAD about 715 rows tall - so
# no crop existed that kept both his head and his boots, let alone left room for the logo.
# "Compose inside a wide band" was ignored twice. What is not ignored is a FRACTION OF THE
# IMAGE stated as a rule: at two fifths he came back 407 rows and everything fits.
SIZE="CRITICAL SIZE RULE, more important than anything else: the man is drawn SMALL in this picture. From the top of his head to the soles of his boots he takes up NO MORE THAN TWO FIFTHS of the height of the image, and his whole body including his boots is visible. He is a small figure in a big wide room, not a portrait. Above his head there is a deep band of empty night sky and distant towers taking up the whole top third of the image, with nothing in it. Below his boots there is a deep band of empty reflective black floor taking up the bottom quarter. He stands in the CENTRE and the room spreads right out to the left and right edges on both sides of him."

# The tiger and the shark are IN the game, so their sprites go in as references beside CHAD's
# and the prompt says which reference is which - handed three with no explanation the model
# averages them.
REFS="THREE reference images are attached and each is a different thing here. The FIRST is the MAN: match his face, hair, build, costume and colours. The SECOND is the TIGER: match its markings, heavy brow, flattened ears, snarl, scars and studded oxblood harness. The THIRD is the SHARK: match its scars, sunglasses, gold chain and medallion, and the lit Cuban cigar in its jaws."

ONLY="he is the only person in the picture, no other people, no bystanders, no crowd"

$G $O/title_b.png landscape "The penthouse of a gigachad brawler at the top of a skyscraper, at night, seen wide. $CHAD stands in the centre with his arms folded, lit from behind by a wall of floor to ceiling glass, a vast neon city far below and an airship crossing between the towers. A huge white Bengal tiger stands beside him at his hip, SNARLING, heavy scowling brow, ears laid flat, scars across its muzzle, studded oxblood harness. On the left a colossal lit aquarium glows blue in dark walnut panelling with an enormous scarred great white shark in sunglasses and a gold medallion, a lit CUBAN CIGAR clamped in its jaws trailing smoke through the water. On the right a fireplace burning under a huge gilded oil painting, and a trophy alcove of brass rails and glass shelves. Dark walnut, oxblood leather and polished brass against magenta and cyan neon, all of it reflected in a black granite floor. $SIZE $REFS He is the only person in the picture. $STYLE" assets/ai/ref_chad.png assets/lair/tiger_snarl.png assets/lair/shark_0.png &

# The wordmark, as art rather than as the pixel font. Spell every word out letter by letter
# and say there is nothing else in the picture, or it invents a tagline underneath.
$G $O/logo.png landscape "An arcade game LOGO WORDMARK, nothing else in the picture, on a solid flat bright green chroma-key background (RGB 0,255,0). It reads exactly two things on two lines, centred. The top line is the single word GIGACHAD, spelled G-I-G-A-C-H-A-D, in enormous heavy blocky pixel-art capitals that fill most of the width. The bottom line, much smaller and directly under it, is the two words WORLD TOUR, spelled W-O-R-L-D space T-O-U-R. There are no other words, no other letters and no other symbols anywhere in the picture - do not add a subtitle, a tagline, a date or a company name. GIGACHAD is polished gold with a hot white highlight along the top of every letter, a deep orange core, a thick black outline and a heavy drop shadow, slightly extruded so it looks chiselled out of metal. WORLD TOUR is crimson red with a thin gold outline and a small gold dash on each side of it. Bold, chunky, symmetrical, 32-bit arcade title screen lettering in the style of Streets of Rage 4 and Metal Slug. Crisp pixel art. No background art, no scene, no people, no border, no watermark." &
wait

# The crop is SOLVED, not guessed: measure the row his hair starts on and put it just under
# the logo. band = width/2.645 rows; TOP = (hair_row - 84*band/186) / height.
echo "=== pick one and build it ==="
echo "  tools/build_title.sh $O/title_b.png 0.20"
echo "  and the wordmark: key $O/logo.png, trim, scale to 520 wide, quantize 32 -> assets/logo.png"
ls -la $O
