#!/bin/bash
# gen_lair_props.sh - the furniture of THE LAIR. Everything standing in the hub room is
# a sprite drawn over the plate, so the plate itself can stay a bare wall. Chroma-key
# sprites go through tools/process_props.py (LAIR table); the map panel is a full-screen
# menu background and goes through tools/pixelate.py instead.
#
# The arcade cabinet that used to be generated here is retired: it was the only
# injection-moulded object in a walnut room, and its bay is worth more as trophy shelf.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/lair
# the bag is a real breakable-shaped prop and the sofa is a foreground piece, so they
# are generated straight into the directories their own processors read
P=assets/ai/props
F=assets/ai/fg
mkdir -p $O $P $F

S="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, dramatic top-left key light, single object seen from the side at ground level, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border"

# 90s penthouse palette, so the fixtures sit in the same room as the plate.
L="black lacquer, brushed chrome and smoked glass, lit by magenta and cyan neon"

echo "=== lair fixtures ==="
# The map is the one fixture that is NOT in the $L chrome-and-smoked-glass palette. It
# hangs on the panelled wall between the gilded mirror and the brass shelf rails, and a
# chrome frame with rivets made it the only silver object there - at 80 logical px the
# rivets read as dirt, not hardware. It also has to survive being 43 px of glass: thin
# cyan outlines on navy went to a dark rectangle, so the landmasses glow from within too,
# and the art must stay unmarked because the game draws the chapter pins on top.
$G $O/worldmap.png    landscape "A wall mounted backlit world map panel. The frame is heavy polished antique brass and gold, a moulded picture frame with a raised outer bead and a fine reeded inner lip, warm and gleaming with bright highlights along its top edge. There are absolutely NO rivets, NO bolts, NO screws, NO washers and NO metal corner plates anywhere on the frame - it is smooth cast and polished metal only. Inside the frame is a backlit map of the world. All seven continents are drawn as dark indigo landmasses against a deep midnight blue ocean, and every coastline glows in a BRILLIANT pale cyan white, bright and crisp and very high contrast, so the shapes of the continents read clearly and boldly even from across the room. The landmasses themselves also glow faintly from within, so each continent reads as a solid luminous shape rather than only an outline. A soft sheen of glass reflection runs diagonally across the panel. The whole world is drawn small and inset with a clear even margin of empty ocean all the way around it, so that no landmass anywhere touches, overlaps or is cut off by the frame. The map is completely blank and unmarked: no pins, no markers, no city lights, no dots, no specks, no small orange or yellow points of any kind anywhere on it, no route lines, no grid, no compass, no text, no letters, no numbers and no labels. It hangs in a 1990s penthouse panelled in dark walnut with gold mouldings, so its metal is warm gold and brass, matching a gilded mirror frame on the same wall. 32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, a single flat wall-hung object seen dead straight on in flat elevation, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no people, no text, no watermark, no border" &
$G $O/hifi.png        portrait  "A 1990s black separates hi-fi rack system standing on the floor, a slim glass fronted tower holding an amplifier a tape deck and a cd player stacked in it, one tall black floorstanding speaker beside it, chrome trim and knobs, and the amplifier display area a completely flat solid black rectangle with nothing on it, $L, $S" &
wait

$G $P/bag.png         portrait  "A very large heavy leather boxing punching bag, long and thick and full length, dark oxblood leather with silver duct tape bands wrapped around the seams, scuffed and worn, a heavy brass D-ring and swivel fitting at the very top of the bag, no chain and no rope above the swivel, hanging free with nothing below it, $S" &
$G $F/fg_sofa.png     landscape "A long low black leather chesterfield sofa seen from directly behind, deep buttoned back, polished chrome legs, nothing on it, $S" &
wait

echo "=== the lounge and the hearth ==="
ROOM="It hangs in a 1990s penthouse panelled in dark walnut with gold mouldings and lit by warm lamps, so its gold is warm brass and its shadows are deep and dark."
FLAT="32-bit arcade beat em up game object sprite in the style of Streets of Rage 4 and Metal Slug: highly detailed pixel art with rich four-tone shading, crisp dark 1px outline, a single object seen dead straight on in flat elevation, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"
CHAD="A huge blond bodybuilder with a square jaw, black wraparound sunglasses, an open black leather biker vest over an enormous bare muscular chest and blue jeans"

# The oil over the hearth, which replaced the overmantel mirror painted into the plate.
# It is the fight that produced the sabretooth pelt lying on the floor below it - a second
# straight portrait of CHAD would only have repeated the one over the sofa.
# Two things this needs said as RULES rather than left to the model, both learned the hard
# way: the beast must be THE SAME animal as the pelt on the floor below it (described in
# words it came back a plain tan lion, so the processed pelt sprite goes in as a second
# reference image), and the whole scene must fit INSIDE the frame with headroom (the first
# fitting pass ran the top of his skull into the frame's inner edge and clipped it).
$G $O/overmantel.png landscape "An old master oil painting in a heavy carved gilded frame. The painting shows $CHAD standing victorious over an enormous snarling sabretooth cat, one boot planted on the beast, in a dark stormy mountain landscape lit by a single shaft of stormlight. The beast is THE SAME ANIMAL as the striped pelt in the second reference image and must match it exactly: a huge sabretooth cat with deep russet orange fur crossed by strong black tiger stripes down its flanks and haunches, a heavy dark blackish-brown mane framing its face, a pale cream muzzle and chest, and two enormous curved ivory sabre fangs hanging well below its jaw. It is NOT a plain tan lion and NOT a smooth unmarked cat. CRITICAL COMPOSITION RULE: the ENTIRE painted scene must sit INSIDE the gilded frame with nothing touching or crossing it. The very top of the man's head must be WELL BELOW the inner edge of the frame, with a clear band of stormy sky above his head about as tall as his own head. His boots must be well above the bottom inner edge. Nothing - not his head, not his hands, not the cat's fangs or tail - may touch, overlap or be cut off by the frame. Zoom the scene OUT so the whole composition fits comfortably within the canvas with generous margins on all four sides. It is painted in the manner of a baroque hunting trophy portrait: deep chiaroscuro, dark umber and ochre tones with cream highlights on the man and on the cat's fangs and stripes, dramatic and heroic. The gilded frame is thick and ornate with carved acanthus scrollwork and a crest at the top centre. The whole framed painting is drawn small and centred with a wide margin of flat green all around the outside of the gilded frame. $FLAT" assets/ai/ref_chad.png assets/lair/bed_rug.png &

# Built flush into the second trophy niche's base panel, so it is a cabinet FRONT. Say so
# several ways: asked for a "cabinet" the generator draws a box with sides and a top, and
# a box standing against the wall is exactly what this replaced.
$G $O/humidor_built.png landscape "A long low built-in humidor cabinet front, drawn as ONE VERY WIDE AND VERY SHALLOW HORIZONTAL STRIP about six times wider than it is tall, filling the width of the image and only a narrow band tall, with flat green above and below it. It is a run of glass-fronted cigar drawers set flush into dark walnut panelling: a slim polished brass frame divided into four equal glass panes by three thin brass mullions, each pane showing neat rows of cigars and cedar cigar boxes packed behind the glass in warm tan and chestnut browns, with a small brass drawer pull centred under each pane and a warm light glowing on the cigars from inside. It is a flush cabinet front only - no side panels, no top surface, no legs, no feet, nothing sticking out towards the viewer. $ROOM $FLAT" &
wait

echo "=== map panel ==="
# Not chroma keyed: this is the full-screen background of the stage select menu.
$G $O/map_panel.png landscape "A 1990s war room world map display seen head on and filling the whole frame: a dark navy world map with all seven continents drawn as flat landmasses in deep indigo, thin glowing cyan coastlines, a faint latitude and longitude grid, a black ocean, heavy vignette at the edges of the frame like a curved CRT monitor, faint horizontal scanlines across the whole image, a magenta and cyan glow at the top and bottom edges, no pins, no markers, no text, no latin letters, no numbers, no labels, no borders, no user interface, no watermark. 32-bit arcade pixel art in the style of Streets of Rage 4"
echo "=== lair props done ==="
ls -la $O
