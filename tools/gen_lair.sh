#!/bin/bash
# gen_lair.sh - title screen key art: CHAD's lair, the hub you pick stages from.
# Three variants into assets/ai/lair/; the pick is processed into assets/title_art.png
# by tools/build_title.sh.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/lair
mkdir -p $O

STYLE="32-bit arcade beat em up game key art in the style of Streets of Rage 4 and Metal Slug, one wide interior room seen straight from the side with no perspective distortion, highly detailed crisp pixel art, rich saturated colour, dramatic warm rim lighting with deep shadows in the corners, cinematic title screen composition, no text, no latin letters, no numbers, no logo, no watermark, no border, no user interface, no signature"

CHAD="A tall extremely muscular Nordic man with short slicked-back platinum blond hair, black aviator sunglasses, a black leather biker jacket with the sleeves cut off showing huge bare arms, bare chested under the open jacket, a wallet chain, blue denim jeans and heavy black buckled boots"

# The level select lives on this wall in game, so the art has to earn it.
MAP="a huge tattered map of Delhi pinned to the wall behind him, red string running between five red pins, a torn photograph of a different boss thug clipped beside each pin"

ONLY="he is the only person in the room, no other people, no bystanders, no crowd"

$G $O/lair_a.png landscape "The secret basement fight lair of a gigachad brawler under a market street in Old Delhi. $CHAD stands in the centre of the room in a boxing guard, lit from above by a single caged work lamp. A heavy leather punching bag hangs on a chain from a girder beside him, patched with duct tape and swinging slightly. Around the room: a rack of rusted iron plates and a loaded barbell, a battered wooden weapon and loadout rack holding hand wraps, red fingerless gloves, a spare pair of sunglasses and a chain, a dented steel locker, a boombox on a crate, chalk bucket, stacked protein tubs, coiled skipping rope on a hook. $MAP. Bare brick and cracked plaster walls, a grimy barred window high up spilling one shaft of hot amber daylight through dust, exposed pipes and sagging cables overhead, worn rubber training mats on a concrete floor. $ONLY. $STYLE" "$R" &

$G $O/lair_b.png landscape "The rooftop training dojo of a gigachad brawler above the Old Delhi rooftops at dusk. $CHAD stands in the centre in a boxing guard on worn straw mats, backlit by a low orange sun. A heavy punching bag hangs from a rusted scaffold pipe frame beside him, a wooden striking dummy on the other side, iron dumbbells and stone lifting weights scattered around, a loadout rack with hand wraps and red fingerless gloves, a water drum, a broken plastic chair, strings of small warm bulbs overhead, pigeons roosting on a water tank. $MAP nailed to a corrugated metal shed wall. Behind and below, a hazy purple silhouette of Delhi rooftops, domes, minarets and a tangle of electrical wires. $ONLY. $STYLE" "$R" &

$G $O/lair_c.png landscape "The private akhara wrestling gym of a gigachad brawler inside a crumbling Mughal haveli courtyard in Old Delhi. $CHAD stands in the centre in a boxing guard at the edge of a raked red earth wrestling pit, shafts of warm light falling through carved stone screens behind him. A heavy leather punching bag hangs on chains from a carved wooden beam beside him, rows of wooden mace clubs and stone ring weights on a rack, a loadout rack with hand wraps and red fingerless gloves, brass water pots, a bell hanging in an archway, marigold garlands on peeling blue plaster, old faded wrestling posters. $MAP pinned across one archway. $ONLY. $STYLE" "$R" &
wait

echo "=== lair done ==="
ls -la $O
