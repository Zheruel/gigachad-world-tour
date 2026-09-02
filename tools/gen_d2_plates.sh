#!/bin/bash
# gen_d2_plates.sh - THE NIGHT TRAIN wall panels and floor detail textures.
#
# 19 screens in seven areas, stitched by tools/build_night_train.py. Two things differ
# from DIRTY DELHI: everything OUTSIDE the train (carriage windows, the open vestibule
# door, the sky over the roof) is painted flat chroma green so the stitcher can key it
# out and the world can scroll behind it on its own clock; and platform 1 is painted
# EMPTY, because the rake standing there is a wall-plane sprite that has to leave.
#
# Usage: tools/gen_d2_plates.sh [station|train|roof|floors|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d2
mkdir -p $O
WHAT="${1:-all}"

EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no crowd, every counter unattended and every seat empty"
BG_STN="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling scene seen straight from the side with no perspective distortion, highly detailed pixel art, night, cold fluorescent tube light and warm sodium light mixed, diesel haze, rich saturated colour, no text in latin letters, no watermark, no border, no user interface"
GRIME="worn and filthy: paan stains up every corner, rust weeping from the ironwork, scuffed steel and laminate, greasy handprints round every handle, litter and peanut shells swept into drifts, cables taped along the columns, damp patches"
FRAME="The horizon and the platform edge or floor line run dead level across the whole width of the image. The bottom third of the image is the empty floor surface with nothing standing on it, so a fighter can walk across it. Keep the middle of the image visually calm and uncluttered."
CUT="a cutaway view of the inside of an Indian railway sleeper carriage with the near side wall removed so the full length of the compartment is visible straight from the side, the far wall with its berths and windows running the full width, the corridor floor running left to right along the bottom third"
ROOFVIEW="A view from ON TOP of a moving Indian sleeper train at night, the camera level with the roof and looking straight along its side with no perspective: the curved ribbed steel roof deck fills the bottom third of the image as an empty walkable surface running left to right, seen slightly from above; above the roof deck edge there is NO train body, no windows, no wheels, no carriage side, nothing but open sky. Along the roof:"
ROOFKEY="Everything above the roof deck - the whole sky, all the way to the top and side edges - is one solid flat bright pure green (RGB 0,255,0) chroma key with nothing at all painted in it: no stars, no moon, no poles, no clouds, no horizon."
KEY="Every window pane and every opening that looks OUTSIDE the train is filled with one solid flat bright pure green (RGB 0,255,0) with nothing painted in it: no night, no lights, no scenery, no reflections, just flat green."

station() {
$G $O/wall_fore_a.png landscape "The forecourt of a huge Indian railway terminus at night seen straight from the side: a taxi rank of black and yellow Ambassador cabs, parked cycle rickshaws, a chai trolley with a kettle, hoardings, a colonial red brick facade with arched windows above, sodium lamps. $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_fore_b.png landscape "The entrance of a huge Indian railway terminus at night seen straight from the side: a tall arched stone doorway with an iron clock above it, a security metal detector frame, stacked luggage trolleys, a police post with a striped barrier, a red brick facade with a canopy, sodium lamps. $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_hall_a.png landscape "An Indian railway ticket booking hall at night seen straight from the side: a long row of barred brass grille counters with wooden shutters, painted fare boards, ceiling fans, steel queue railings, notice boards thick with paper, stone pillars, one counter lit. $EMPTY, $GRIME, $FRAME, $BG_STN" &
wait
$G $O/wall_bridge.png landscape "A narrow covered iron footbridge over railway platforms at night seen straight from the side: riveted iron girders and a low railing along the far side, corrugated tin roof, hanging lamps, the platforms, canopies and rails visible far below beyond the railing, a stair at the left end. $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_dock_a.png landscape "A railway parcel dock at night seen straight from the side: mountains of roped parcels and tin trunks stacked to the roof, a huge iron platform weighing scale, hanging bulbs, chalk numbers on the sacks, a shuttered goods office. $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_dock_b.png landscape "The ramp end of a railway parcel dock at night seen straight from the side: a long sloping loading ramp descending to the right, iron hand trucks parked against the wall, stacked wooden crates, a rolling steel shutter half up, hanging bulbs. $EMPTY, $GRIME, $FRAME, $BG_STN" &
wait
$G $O/wall_plat_a.png landscape "Platform one of an Indian railway station at night seen straight from the side, the train NOT yet arrived: an EMPTY platform with the track bed and the far platform two beyond it, a huge split flap departure board hanging from the iron canopy, iron canopy columns, a tea stall, a water tap bank, pigeons in the girders. $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_plat_b.png landscape "Platform one of an Indian railway station at night seen straight from the side, no train in the station: an EMPTY platform with the empty track bed and the far platform beyond, iron canopy columns, a book stall with shutters half down, a weighing machine, a bench, signal gantry lights far off. $EMPTY, $GRIME, $FRAME, $BG_STN" &
wait
}

train() {
$G $O/wall_vest_a.png landscape "$CUT, the vestibule at the end of a coach: a corrugated steel floor, the flexible bellows gangway to the next coach at the right, a steel door on the far wall standing open, a washbasin, a stack of luggage, one caged bulb. $KEY $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_gen.png landscape "$CUT, the unreserved general compartment: hard wooden berths stacked three high along the far wall, luggage roped to the racks, barred windows, ceiling fans, a red emergency chain hanging by a window. $KEY $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_pantry.png landscape "$CUT, the pantry car: a steel serving counter along the far wall, tea urns steaming, gas rings with blackened pots, crates of glasses, a dented refrigerator, warm orange light, small windows. $KEY $EMPTY, $GRIME, $FRAME, $BG_STN" &
wait
$G $O/wall_ac.png landscape "$CUT, the air conditioned two tier coach: padded blue berths with drawn blue curtains, a cold blue glow from strip lights, sealed tinted windows, a fire extinguisher, blankets and pillows, everything hushed. $KEY $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/wall_vest_b.png landscape "$CUT, the last vestibule of the train: a corrugated steel floor, the outer door on the far wall hanging WIDE open onto nothing, the flexible bellows gangway at the left, a ladder bolted beside the door going up, a fire bucket, a caged bulb swinging. $KEY $EMPTY, $GRIME, $FRAME, $BG_STN" &
$G $O/rake.png landscape "The side of an Indian railway sleeper carriage standing at a platform at night, seen straight from the side with no perspective, two coaches end to end filling the full width with their coupling between them, blue steel sides with a yellow stripe, barred windows lit warm inside, one vestibule door standing open with a step below it, the whole thing standing on its bogies and rails. The entire background above, below and behind the carriages is one solid flat bright pure green (RGB 0,255,0) chroma key, no ground, no platform, no shadow. Highly detailed 32-bit arcade pixel art in the style of Streets of Rage 4, no text in latin letters, no watermark, no border." &
wait
}

roof() {
$G $O/wall_roof_a.png landscape "$ROOFVIEW a ladder top and an open hatch at the left end, a row of ventilator domes and a cable run along the spine, a gap with a coupling between two coaches. $ROOFKEY $GRIME, $BG_STN" &
$G $O/wall_roof_b.png landscape "$ROOFVIEW ventilator domes, a water tank filler cap, a rusted cable run, rain streaks on the steel, a gap with a coupling between two coaches. $ROOFKEY $GRIME, $BG_STN" &
$G $O/wall_roof_c.png landscape "$ROOFVIEW and at the right end the back of the diesel locomotive rising above the roof line as a dark riveted wall with an exhaust stack, a red marker lamp and a coupling gap before it. $ROOFKEY $GRIME, $BG_STN" &
wait
}

floors() {
$G $O/floor_station.png landscape "seamless horizontally tileable top-down slightly angled view of a filthy Indian railway platform, cracked concrete with a yellow safety line, paan and tea stains, torn tickets, peanut shells, oil marks, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
$G $O/floor_train.png landscape "seamless horizontally tileable top-down slightly angled view of a worn Indian railway carriage corridor floor, green vinyl over steel with rivet lines, scuffed and stained, peanut shells, a spilled tea, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
$G $O/floor_roof.png landscape "seamless horizontally tileable top-down slightly angled view of a ribbed steel train carriage roof at night, rivet lines, soot streaks, rain marks, rust, a cable run, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark" &
$G $O/outside.png landscape "A seamless horizontally tileable wide side view of flat Indian countryside at MIDNIGHT as seen from a moving train: almost black fields, a near black indigo sky with a few stars and a thin moon, black silhouettes of a distant village with three tiny sodium orange lamps, black telegraph poles with sagging wires, a black line of palm trees, a level crossing with one small scooter headlight. Very dark overall, no green, no daylight, no train, no track in the foreground, no people. 32-bit arcade beat em up background art in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark, no border" &
wait
}

case "$WHAT" in
  station) station;; train) train;; roof) roof;; floors) floors;;
  all) station; train; roof; floors;;
esac
echo "=== $WHAT done ==="
ls -la $O
