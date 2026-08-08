# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

GIGACHAD: WORLD TOUR — a 2D side-scrolling beat 'em up (Streets of Rage 2 lineage) in
plain HTML5 + ES modules, canvas 2D, **no build step and no dependencies**. Art is
AI-generated pixel art run through a Python processing pipeline. See `README.md` for
the design rationale behind most of the systems below.

## Run and verify

```
./.venv/bin/python tools/serve.py 8000      # no-cache dev server; a static server is required (ES modules + JSON manifests)
```

There is no test runner, linter or package manager. Verification is in-browser, via
`?auto=` modes that drive the game headlessly and write results into `document.title`:

- `index.html?auto=verify` — the scripted check suite; each check appends `PASS:name` / `FAIL:name` to the title. **This is the test suite; run it after any gameplay change.**
- `index.html?auto=soak` — 50k-frame stuck-entity hunt over knockdowns and enemy holds. Clean run prints `SOAK-CLEAN`.
- `index.html?auto=bot&stage=0` — naive bot plays a whole stage; reports pacing/damage/KOs.
- `?auto=play|walk|jab|combo|parry|combat|super|super-hammer|super-express|boss|bossfight|miniboss|clear|over|ending` — steps the game into a state for screenshots.
- `?auto=hub[-<fixture>]` — THE LAIR. Fixtures are triggered with **F** (`use`), not up — up is movement into the depth lanes, so it double-booked walking with activating.
- `?auto=hub[-<fixture>]` — THE LAIR. Bare, or a fixture id from `FIXTURES` in `js/hub.js` (`hub-bar`, `hub-trophies`, `hub-lounge`, `hub-map`, `hub-hifi`, `hub-mirror`) to park CHAD there and trigger it, plus `hub-bag` (mid-punch), `hub-window` (the bag against the sunset) and `hub-bed` (close enough to the master suite that they wake up and speak). `&unlocked=N` sets how far the tour has got, which drives the relics on the shelves, the locked acts and how dark the window is.
- `lab.html` — asset lab (CAST / ANIM / CROWD / SCALE / STAGE / CONTRAST / EFFECTS). ANIM exposes the selected sequence as a frame-by-frame contact sheet; comma/period step authored drawings. `sfxlab.html` — SFX slot audition.

To run a single check, read the `autoMode === 'verify'` block in `js/main.js` and drive
the same sequence through `window.__game` in the console: `start()`, `stage(i)`,
`press(a)`, `release(a)`, `step(n)`, `spawn(type,dx,dy)`, `skipToBoss()`, `hurtBoss(n)`,
`setPlayerPos(x,y)`, `state()`, plus `G`, `BOSSES`, `STAGES`.

Python tooling uses the project-local venv only: `./.venv/bin/python` (PIL, numpy,
requests). Never `pip install` globally or assume a package is present.

## Architecture

**Everything runs in a 480×270 logical space** (`W`/`H` in `js/engine.js`) rendered to a
960×540 canvas (`RS = 2`). All speeds, ranges, stage x-positions and sprite heights are
logical units; art is authored at RS device pixels per logical pixel. `FLOOR_TOP = 181`
(wall/street seam) and `FLOOR_BOT = 241` bound the depth lanes. World scale: ~50 px = 1 m,
a fighter is 80–96 logical px. Changing any of these without re-deriving the rest breaks
how the street sits around the characters.

**`js/engine.js` is the hub.** It exports `G`, a single shared mutable game context
(state, camera, entity arrays, meter, combo), plus ballistics (`fall`, `inAir`), juggle
scaling (`juggleMul`, `airborne`), and the arena walls (`clampToArena`, `arenaMin/Max`).
**Modules import `G` rather than importing each other** — that is deliberate, to avoid
cycles. Adding a cross-module import between systems is usually the wrong fix; put the
shared state on `G`.

**`js/main.js` owns the loop**: fixed 60 fps accumulator, the game state machine
(`boot|title|intro|play|bossintro|clear|over|ending`), wave gating, camera scroll, the
y-sorted draw order in `drawWorld`, `window.__game`, and every `?auto=` suite.

Draw order matters and is load-bearing: shopfront crowd actors draw after the wall but
**before** the lamp pools (so the warm wash falls on them), street actors after the floor,
foreground last at 1.14× parallax.

**Entities are duck-typed, not class-hierarchied.** Props expose `hurt()` like fighters,
so `js/player.js` hits them through the same target list and `main.js` y-sorts them with
everything else. Keep new hittable things to that contract instead of special-casing
combat code.

Module map (see README "Files" for one-liners): `input.js` `sprites.js` `stages.js`
`props.js` `player.js` `enemies.js` `bosses.js` `shots.js` `effects.js` `hud.js`
`screens.js` `audio.js` `assets.js` `aiframes.js` `crowd.js` `fg.js` `fx.js`
`hub.js` `hubpanels.js`.

**THE LAIR (`js/hub.js`) is a stage with no waves**, 1920 logical px wide (four screens: THE LOUNGE, TROPHIES AND MEDIA, THE VIEW, THE MASTER SUITE). `HUB_STAGE`
goes through `initStageObj()` like any other, so the camera, arena walls and y-sort come
for free. Its furniture is *not* in `G.props`: fixtures are drawn in the wall plane
inside `drawHubWall` (before `drawWorld`, so CHAD always occludes them) and are
therefore not combat targets. Only the heavy bag is a real prop; the tiger is a
`G.actors` entry, which is anything that draws itself and y-sorts — give one a `y`
getter and a `draw(ctx, camX)`.

**Anything the plate paints is behind every sprite**, and that is a trap for things that
belong *inside* the architecture. The fireplace's brass fender is painted into the plate,
so the fire sprite drew over it and read as burning in front of the hearth. The fix has
two halves: clip the sprite to the opening measured off the plate (`FIREBOX`), and cut
the fender out of the plate as its own sprite (`build_fender()`, keyed on luminance so
the dark firebox behind it is dropped) to blit back over the fire.

**A looping effect needs its frames measured too, twice over.** The first fire pulsed from
a huge flame to almost nothing and redrew its log stack every frame — at any speed that
is a strobe, not a fire. Both halves are fixable and both are worth checking: ask for the
flame to be *the same height and brightness* in every frame and only the tongues to
differ, then take the logs from frame 0 with the cut at the flame/log brightness edge, and
the log band goes from 15% drift to 0.00%. Then pick the play ORDER by measuring every
pair — 0,1,2,3 happened to put a 26% step next to a 14% one and the flame snapped;
0,1,3,2 is the cycle with the smallest worst step.

**Its glass is a hole.** `tools/build_lair_wide.py` stitches three generated panels and
keys the chroma-green window out of the plate, so the city shows through as TWO layers
at different parallax (`bg_lair_sky_far` at 0.20, `bg_lair_sky_near` at 0.42) with
`lairCity()` painting the sun, mast beacons, lit windows and an airship between them.
`drawStage` grew an optional `skyLayers` list for this — each entry is a tiling plate at
its own parallax or a draw hook — and any stage can use it.

The **mullions over those holes are painted, not generated**: `rebuild_window()` in the
same tool finds every opening from the alpha and repaints each as tall bays. It groups the
alpha into openings by merging runs closer than 60 logical px — the *generated* mullions
are opaque, so one window already arrives as a dozen separate runs, and only a real wall
should split one window from the next. The generator drew
a 9x4 cage of 5px bars and panel B's grid did not line up with panel C's; a grid of black
rectangles is geometry, and geometry is cheaper to paint than to ask for. It repaints the
floor's reflection of those bars too, or the granite goes on reflecting the old window.

**When the plate already contains what you need, rebuild it rather than asking for more.**
The trophy wall needed to be one long hall, not the single niche the plate paints. A niche
is lit wood, brass rails and glass, so *generating* a matching one is the
panel-B-does-not-line-up-with-panel-C problem again - and it cannot simply be stretched,
because the frame mouldings would stretch with it. `widen_alcove()` takes the frame slices
off the real niche unscaled and tiles the interior from HALF of the real interior with
every other copy mirrored, then squashes the half by a few percent so a whole number fills
the run exactly. Mirroring is what makes the seams free: a mirrored copy's left edge is the
same column of pixels as its neighbour's right edge, by construction.

Two traps, both found by looking: the frame slice must reach past BOTH mouldings (the outer
frame line and the inner one) or the inner moulding rides along on every tile and reappears
as a post standing in the middle of the hall; and a few percent of horizontal squash is
invisible on wood and soft lamp pools, where a partial tile at one end would not be.

`blank_bay()` is the same idea for removal. With the portrait gone and the tank covering
most of its bay, the bay's gold inset would have been left as a frame with half of it
missing, which reads as damage. It is filled by **iterated dilation from the wood at the
edges of each line** - not by sampling a fixed direction, because the inset has horizontal
lines and vertical ones, and sampling up and down (the obvious first try) finds nothing but
more gold when the line is vertical. Restrict the region to what will actually still be
visible: run it over the brass picture light and it melts it.

**A frame is a nine-slice, never a scale.** The aquarium is most of the lounge wall now -
280x142 logical against the 170x134 the plate paints. `build_tankframe()` lifts the brass
surround out of the plate and rebuilds it at the new size with the corner plates verbatim,
the four edges stretched along their own axis only, and the middle dropped so `drawTank`
can paint water at whatever size it ended up. Scale it instead and the corner bolts stretch
into ovals. It is a SPRITE blitted over the plate's original tank, so the wall behind never
has to be repaired - the same reason the map and the overmantel oil are sprites.

**Anything standing on a measured surface needs the surface measured, not guessed.** The
relics stood 2.5–4 px inside their own shelves for months and read only as vaguely "off":
`SHELF_Y` was 70/103/135 with a `+1` in the blit, while the brass rails actually light up
at device rows 137/201/264 — logical 68.5/100.5/132. Two more things were wrong with them
and both are the same mistake in a different place: every relic was sized to exactly 26
logical tall, so a police cap came out the same size as a payphone (heights in
`process_props.py` are per-object now, roughly the real thing at ~50 px/m); and nothing
had a contact shadow, without which a sprite reads as pasted onto the back of the niche
however exactly its feet land.

**Anything animated in the room is one strip**, never separate generations: the gym rigs,
the lounge sofa and the bedroom's bed all hold their furniture and their occupants in the
same sprite. **The bed is the exception, and the reason is worth reading before you
build another animated set.** A strip could not do it: six poses in a 1536px sheet is
256px cells, too narrow to draw a long bed; two sheets of three drew two different beds;
and compositing the furniture out of one frame left a hard seam across the mattress.
What works is ONE GENERATION PER POSE, each passed pose 0 as a reference with an explicit
"do not move, resize or redraw the bed" — that lands at **0.04% furniture drift**, against
>50% for the strips. Then three rules in `build_lair_extras.py`:

- crop every pose to ONE shared box, never each to its own bbox, or a reaching arm shifts
  the furniture;
- the poses agree on geometry but *not* on shading (the same pixel of the base measured
  (48,8,4) and (114,48,21)), so the carved base is taken from pose 0 for every frame. The
  cut is at the mattress/base junction found by luminance **searched only in the lower
  quarter** — unconstrained it picked 57% of the height for one set of poses and 86% for
  the next. Cutting at an arbitrary fraction is what left the seam;
- `finish_set()` quantizes the whole set against ONE palette, the same rule
  `process_char.py` uses per character.

**A face drawn DEAD ON reads as a mascot at sprite size.** The sabretooth pelt's head
took three attempts: edge-on flattened it to a smear, then a mounted head facing straight
at the camera came back as a plush toy - at ~127 logical px a round symmetrical face with
two matching wide eyes and an O of a mouth is a cartoon however well it is drawn. What
fixes it is structure and asymmetry: a three-quarter turn, a heavy brow ridge with the
eyes in its shadow catching one glint, and a snarl curled higher on one side. Judge it by
cropping the head out at final size, not by looking at the 1536px generation.

`tools/check_bed_poses.py` measures whether a pose held before you build, and
`tools/check_bed_anim.py` measures whether the furniture moves and how far apart
consecutive poses are — you cannot watch a sprite animate from here, so measure it.
Poses the room steps between must be a PROGRESSION: unrelated poses changed 61-78% of the
occupant area, which reads as a cut however long you hold it.

The room's ambient life is **not** reactive. She shifts pose every ~8s on a random walk
over neighbours and speaks once every ~30s, silent 86% of the time; nothing she does keys
off where CHAD is standing. A proximity trigger made walking past feel like tripping a
switch, and a line every few seconds reads as a chatbot rather than company. The bed's frame 3 is the "awake"
pose, held while CHAD is within `NEAR_BED` — the sleepers are proximity-driven, not a
`FIXTURES` entry, so there is no walk-up prompt.

The tank is **decor, not a fixture** - there is nothing to walk up to. It had a FEED THEM
action, which existed to make the shoal ball up under the food; with the shoal gone and the
shark living his own life, the prompt was offering an interaction the room did not need.

**`finish_set()` takes its palette from ALL the frames, not from frame 0.** Frame 0 of the
lounge set is the EMPTY sofa, so a frame-0 palette contained no skin tones at all and the
seated CHAD came out at (163,97,64) against his standing sprite's (204,130,67) — grey and
sickly. Raising the colour count did not help and could not: the colours being added were
more black leather. Measure a character's skin against `assets/frames/`'s idle frame after
any set change; the number is the bug report.

**Ambient behaviour startles on ARRIVAL, never on proximity.** The tank's moray withdrew for
as long as the shark was anywhere inside a 72px zone. He crosses at 0.24 px a frame, so that
zone kept him "near" for ~600 frames a pass — longer than the eel took to come back out — and
it sat in its hole permanently, which reads as a stuck sprite. Trigger on the false→true edge
and hold for a fixed count. Verify it by sampling the state over thousands of frames rather
than looking: fully out 86%, hidden 6%, in transition 8% is what "startles occasionally"
actually looks like as a distribution. (The eel itself is gone — see below — but that rule is
the one thing worth keeping out of it.)

**A check sitting exactly on its threshold is a broken check.** `hub-bed-shifts-about`
asserted 3 distinct poses, and over its 400-sample window the random walk's minimum across
25 runs was exactly 3 — so it failed at random. The fix is to widen the window until there
is margin (650 samples gives a minimum of 4), not to lower the bar. Measure the minimum over
many runs before believing a threshold.

The same bug wearing a different hat: a check must not RACE the thing it is watching.
`hub-bed-ignores-him` walked CHAD up, stepped 6 frames and asserted her pose had not changed
— but her own timer runs 200-520 frames, so it lands inside any 6-frame window about 1.7% of
the time, and the check failed at random for months on a pose she changed for her own
reasons. Pin the ambient timer (`hold = 600`) before asserting that something did NOT react.

**A sprite faces where it is GOING, never where it happens to sit.** The baitfish were
flipped by which side of the ball's centre they were on, which had half of them swimming
backwards at any moment — a fish left of the centre is as likely to be heading right as
left. Face off the actual per-frame delta, smoothed, with a dead zone so they do not flip
every frame while hovering. Verified by counting disagreements between facing and travel
over 33,432 moving samples: zero, with 0.14 turns per fish per second.

**Tenants in their own zones.** The tank holds the shark, a coin-carrying crab on the sand
and a baitball in the open water — one per layer, so it reads as somewhere lived in rather
than as animals sharing a box. Both react to the shark, which is the whole point: the crab
plays dead and the baitball SPLITS around him and re-forms. That last one is what the twenty
drifting piranhas never did and the reason they went.

A moray in one of the wreck's gun ports was a third, and it went. It was the most machinery
of anything in the tank for the least return: its sprite had to carry its own porthole (a
cut-off body would sit on the timbers), the generator drew that porthole a different size in
every frame so `fix_porthole()` had to scale each one back into agreement — compositing frame
0's rim over the others, the fire's log-stack fix, does NOT work when the animal passes
*through* the thing that must not move — and it needed its own startle-on-arrival rule on top.
All of that for a sprite in a hole you have to go looking for. Count the machinery per
animal, not the animals.

**Two rates make a habit read.** The shark is *always* smoking - one wisp off the ember
every sixteen frames - and takes a proper drag every 4-8s: the ember flares, then the
cloud comes back out over three sub-bursts ten frames apart. One rate reads as a smoke
machine bolted to his face; one burst of eighteen particles born at the same instant in
the same place stays a single blob however it is tuned. The cigar's lit end is measured
off `assets/lair/shark_0.png` (`CIGAR`, mirrored with him) so the smoke leaves his mouth
and not his tail, and the ember is drawn in code because the sprite's quantized palette
flattens it away.

**Stepping the hub from the console needs `G.paused = true` first.** The page keeps
running its rAF loop between tool calls, so `step(n)` then a screenshot shows a state
several hundred frames later - which is what made the cigar smoke look like it was
spawning from the wrong end of the shark for three passes. `G.paused` was checked only in
the `play` branch of `update()` and did nothing in the room, so that workflow silently did
not work; the hub branch honours it now.

**A line of dialogue is sized by the SCREEN, not by the sentence.** Her bubble drew one
long line, and `it is four in the morning` is 109 of the 480 logical px across - so the
keep-it-on-screen clamp shoved the whole box into the middle of the room with the tail
stretching back to her head, which is what made it read as a subtitle rather than as
speech. `wrapText` breaks at 62 px and then rebalances the two lines (greedy gives
`the city can / wait`, which fills exactly the same box as `the city / can wait` and looks
like an accident). Point the tail with a measurement, not a guess: her head is at logical
+33 from `BED.x`, found by diffing each pose against the median of all eight - the bed does
not move, so whatever changed is her.

**The tiger lives WITH CHAD, not in one spot.** He settles wherever the man has ended up,
gets up and comes after him when he wanders off, and re-settles now and then for no reason.
He had a den on the hearth rug for one pass and it fixed him to a single object - most of
the room never saw him at all. A pet is worth having because it turns up.

Three things about him are worth keeping in mind for anything else that lives in a room:

- **Nothing snaps between poses.** Asleep he breathes (one pixel on a slow sine, and it is
  the whole difference between a sleeping animal and a rug); woken his head comes up and the
  rest of him does not; to get up he sits, then stretches, then walks. `?auto=verify` asserts
  the ORDER rather than the timings, because the order is what makes it read.
- **A wander timer cannot share a clock with a pose timer.** His go-and-find-CHAD roll hung
  off the same `t` as his look-around, and every look-around reset it: measured, he never once
  left his spot in 24,000 frames. Its own countdown fixed it - and then the first value was far
  too short, because the room is 1920 px wide and he covers 0.42 of them a frame, so a round
  trip is 6,600 frames and setting off every 2,500 had him walking 82% of the time.
- **Proximity is right for a look and wrong for anything more.** Walking up to him lifts his
  head - the same rule the sleepers in the suite use - but it cannot get him up. That is the
  line between "he noticed you" and "you tripped a switch".

**Two sprites that swap in place have to be built as one set, and a strip is not enough to
make them one — and the cheapest fix is often not to have two.** The gym's rack and bench were
walk-up stations: four poses each, the rig alone then CHAD lifting on it, swapped in place. The
equipment would not hold still. A strip does not fix it (measured in the columns where CHAD is
not standing, the bench differed from its own rig-alone frame by 137-270% of its silhouette);
one generation per pose against the rig as a reference gets most of the way; the poses then
have to chain off pose 0 rather than the rig, or the barbell in his hands changes diameter; the
rig-alone frame has to be generated LAST against a pose or it comes back a different shape; and
after all of that the rig still has to be stamped from one frame onto the others, which needs a
mask of CHAD that a colour test cannot give you because his vest and boots are as black as the
steel. Every one of those steps was necessary and every one is still in the git history.

Two rules came out of drawing them as plain furniture afterwards, and both apply to any prop:

- **Count the objects against the pixels, and then say what SEPARATES them.** The rack is 117
  logical px wide. Asked for three tiers "packed end to end" with dumbbells "visibly ENORMOUS
  from left to right" it came back with a dozen a shelf - 9 px each - and the small end read
  as a row of rivets while the big end read as boulders. Five a shelf with "a clear gap of
  bare shelf between each one" then came back as ONE CONTINUOUS ROD with hexagonal lumps
  threaded on it: every dumbbell was drawn distinctly and none of them READ as distinct,
  because the gap got filled by their handles lining up end to end. Say it about the handle -
  it starts at its own plate, it stops at its own plate, and the background shows through
  between one dumbbell and the next. Four a shelf leaves room for that gap to be as wide as a
  dumbbell.
- **Say the projection out loud, and then follow it through the whole object.** The shared
  style block says "seen from the side", and the generator still drew the bench PAD in three
  quarter - its top face visible, with a chalk handprint lying on a surface you cannot see
  from the side - while drawing the frame under it in flat elevation. One object, two
  projections.
  The bench is the one thing in this room drawn in perspective, and the geometry is why: a
  barbell lies ACROSS a bench, so a true side view shows the bar END ON, one stack of plates
  as a disc, which at 82 logical px is a small bullseye that says nothing about the load. Both
  were generated and compared at final size against the real window. The loaded bar is the
  whole point of the piece, so the camera goes to the HEAD of the bench - and then the pad
  CANNOT be horizontal, it has to recede. Pick the projection from what the object needs to
  show, then make every part of it obey.

They are furniture now. The bag is the gym's action and always was; the rack and the bench were
a second and third way to do the same thing, and the whole apparatus above existed to serve
them. `keyed_full`, `man_span`, `below_the_bar`, `stamp_rig`, `drop_specks` and `build_rig` all
went with them, and the two rigs are ordinary entries in `process_props.py`. When a feature
needs its own machinery in the asset pipeline, price the feature before building the machinery.

**A sprite this small cannot afford a real animation cycle, and both halves of that bit the
baitfish.** They flickered, and it took two passes because there were two faults:

- **Registration.** A fish's bounding box is not its centreline - the two frames with the body
  curved measured 15 device px tall and the two with it straight 11 - so centring each frame on
  its own box put the eye at row 5.9 in two of them and 7.97 in the other two. A full logical
  pixel of bob at half the swim rate, on 26 fish at once. `head_row()` aligns on the mean row of
  the leading third instead: spread 2.04 px to 0.04.
- **The frames themselves.** Even aligned, 31-41% of the silhouette changed between consecutive
  frames on an 11x9 sprite, because the generator swung the tail through a full sweep AND drew
  the body 20 px long in two poses and 22 in the other two. The whole fish pulsed. Asking for
  the body to be *identical and perfectly straight in all four* with only the tail FAN tilting
  slightly took it to 4-5%. For scale: CHAD's jab reads well at 15%, and that is a 96 px sprite.

`build_tenants` prints `churn` for every set now, which is the number you cannot get by looking.
Read it as: single digits is a fin moving, 15% is a limb moving, 30%+ on a small sprite is the
thing redrawing itself. The eel (13-46%) and the crab (32-48%) are both high and both fine -
neither is played as a fast loop; the eel's frame is picked by how far out it is and the crab
takes a step every few seconds.

Meaner at 58 logical px is the LINE OF THE BACK, not detail: shoulder blades standing above it
with the head carried below it is a stalking animal, and a level back with the head up is a
house cat however many scars it has drawn on. The old set was three separate generations and
came back three different animals - walk fur (238,234,234), sit fur (249,235,214), 16.2% brown
pixels against 5% because the sit had been drawn a different harness. `tools/gen_lair_tiger.sh`
generates the rest poses as ONE strip against a frame cut out of the finished walk strip, and
`build_tiger` quantizes all eleven together; the spread is 5 points now. It scales the rest
strip by the SNARL - a standing pose - so the sit, the lie and the stretch come out at whatever
they should be relative to the walk rather than being told a height each.

**One animal with somewhere to live beats a shoal with nowhere.** The tank held a shark
and twenty piranhas; the piranhas were busy without being alive, and they turned the
shark into furniture. What actually reads as alive is all procedural and free: a bubble
column off the scenery, a puff off the shark's cigar every few seconds, banking into the
turns at each end (a shark that reverses on the spot is a cardboard cutout), and going
for the food when you feed him — `?auto=verify` asserts that last one, because a fixture
whose animal ignores it is a fixture doing nothing. `lair_tankscape` is his lair, ONE generation spanning the full 299 of glass: two halves
butted together showed their join however well they matched. Two things must be stated in
the prompt or it comes back unusable — the ASPECT as an explicit rule ("about three times
wider than it is tall"), because "the lower half of the image" gets ignored and it fills
the square frame at 1.5; and that things RISE out of the wreck, because a low strip of
scenery under a tall column of flat blue is exactly what was wrong with the first one. The
scenery is 92 of the 112 of glass and **the shark swims in front of it**, which is what a
shark in a tank does and what stops the water being empty.
The open water above it is four drifting light shafts, a caustic ripple banded across the
back wall and 26 motes of suspended silt at their own depths - all procedural, because
what a flat blue rectangle is missing is movement, not texture.

**A row of objects cannot be generated at a width.** The back bar's shelves are 120x23
logical (aspect 5.0) and the two generated bottle rows came back at 3.8 and 4.3 - so
either they stop short of the end of the shelf or they get stretched, and a stretched
bottle is a fat bottle. `build_bar()` cuts the bottles apart on their own empty columns
(ask for the gap in the prompt or the cut is impossible) and deals them out to hit the
width exactly, alternating between the two generations so neighbours never match. ONE
scale for all of them off the tallest, because the generated heights differ on purpose
and normalising each to the bay gives back the uniform row being fixed.

**The bar is a station that plays ONCE.** `G.hubStation === 'bar'` runs a five-pose drink
on a table of holds (`DRINK_HOLDS`) and then stands him up itself, where the gym stations
loop until you press something. Three things have to agree on that table - the frame
picker, the AAAH, and the auto-stand - so it lives in one place. The AAAH fires when he
finishes the glass, not when he picks it up.

That set is only CHAD (the bar counter is painted into the plate), so it has to agree with
his STANDING sprite or he hops when the swap happens: scale off pose 0 only, `CHAD_BODY`
and `CHAD_FOOT` measured off `assets/frames/` rather than `HEIGHTS.player`. Scaling by
the set's own tallest pose made him 6.7% too tall, because pose 3 holds the glass above
his head. Check it by cropping his boots before and after pressing UP.

**A station CHAD uses is one sprite set holding the furniture AND him** — `lair_lounge_*`,
`lair_gym_curl_*`, `lair_gym_bench_*`. `G.hubSeat` counts frames occupying one and
`G.hubStation` says which; `main.js` hides the player and freezes input off `hubSeat` alone,
so a new station needs no engine change. Generate the whole set as ONE strip (rig alone,
then the poses) and `build_rig` in `tools/build_lair_extras.py` scales it **by the rig**,
not the tallest frame, or he shrinks the equipment every time he raises the bar.

The city panels are **band-cropped, never squashed**: forcing a 1536x1024 generation
into a 1920x362 strip is a 3.5x aspect distortion, and that is exactly what made the
first Tokyo plate read as mush. At 181 logical px tall the composition also has to be
bold — a wall of tiny lit windows turns to noise.

Every fixture x is measured off `assets/bg_lair_wall.png` and lands in a zone that
`tools/gen_lair_room5.sh` asks the generator for by name — regenerating the plate
without keeping those zones puts every fixture on the wrong bit of wall. The plate's
device width must be exactly `2 × HUB_WIDTH` and `floorW` must equal the floor plate's
logical width, or the wall wraps or the floor gaps.

**A character family is calibrated by a STANDING pose, and if it has none, calibrate it by
the head.** `process_chad.sh` scales each family so one chosen frame fills `--fill` of the
192 px canvas, which is right when that frame is standing upright. RAGNAROK has no standing
frame at all - every pose leans into the spin - so calibrating one of them to a standing
figure's .94 made the whole family 20% too big, and CHAD visibly grew when he supered. The
same mistake is already commented on `combo_power_b` above it.

Measure it on the CROWN OF HIS SKULL: the top ten rows of the connected skin/blond component
that holds the topmost skin pixel. That is the one landmark the same size in every pose, and
it is stable to a pixel - idle 22.8, parry 23.6, ragnarok_ground 24.1, and meteor_lariat was
27.5 against those. `.94 x 23.0/27.5 = .786` fixed it. Drawn height cannot be used here for
the same reason the pose cannot: a leaning man is shorter.

**The tiger ignores the bag.** He used to lift his head every time it was hit, which sounds
right and is wrong: the bag is the one thing in the room CHAD does over and over, so the one
animal in the room reacted to almost every input. He still reacts to a big combo, to a fixture
being used, and to being walked up to.

**A missing voice line costs nothing.** `loadSFX` skips files that 404, so a slot can be wired
up before its wav exists - the mirror flex calls `duke_look_good` and simply plays no line
until `audio/voice/duke_look_good.wav` is dropped in.

**`return false` from update() means "this frame did not happen", and the loop skips
`endFrameInput()` on it.** That is right for hitstop and fatal for a pause: the keypress edge
never clears, so ESC toggles the pause again on every frame it is held and the room strobes.
The hub pauses with a bare `return`.

**A generation cannot be cropped to a shape it was not composed for, and the way to say so
is a FRACTION.** The title band is 2.645:1, which is 57% of a 1536x1024 generation's height.
Three attempts drew CHAD around 715 rows tall, so no crop existed that kept his head and his
boots, never mind leaving room for a logo - and "compose the whole scene inside a wide
horizontal band" was ignored twice, the same way "the lower half of the image" was ignored by
the tank floor. What is not ignored: *from the top of his head to the soles of his boots he
takes up no more than TWO FIFTHS of the height of the image*. That came back at 407 rows and
everything fitted. Measure the figure before building the crop; the check is two lines.

Then SOLVE the crop rather than sweeping it. Find the row his hair starts on, and
`TOP = (hair_row - 84 * band / 186) / height` puts his head just under a logo ending at
logical 84, where `band = width / 2.645`.

**Key art is chosen against the SCRIMS, not on its own.** The title band is 2.645:1 and the
logo sits over its top third, so a generation is judged by `tools/preview_title.py`, which
composites the crop under the same boxes `screens.js` draws. Two things only that view tells
you: the sunset variant was the better picture and the worse title, because a yellow logo over
an orange sun is unreadable where it is instantly legible over a night sky; and `TOP` is worth
sweeping in steps of a few percent, because the difference between his head clearing the logo
and his eyes being under it is about 0.06.

The old title was an Old Delhi basement gym, which was right when Delhi was the whole game.
The home base is a neon penthouse now and the game is a WORLD TOUR, so the title is the room
the player actually lives in between acts.

**The jukebox SETS the room's music; it does not audition it.** It used to call
`audio.preview()`, which played the track with `currentSlot` left null precisely so that
closing the panel put the room's own slot back - so the thing you picked stopped the moment
you walked away from the hi-fi. `G.hubTrack` is the pick, `main.js` asks for
`G.hubTrack || HUB_STAGE.music` wherever it sets the hub's music, and it is in the save.
`audio.music()` grew an `audible` flag for it: the manifest's "silent" is there so the game
is quiet until real tracks land, not so a track the player chose refuses to play.

Two things it must not do. It cannot import `HUB_STAGE` from `hub.js` to know the default -
`hub.js` imports the panels, so that is a cycle; `G.stage` IS the lair while the panel is up.
And it cannot call `persist()` from `hubpanels.js` for the same reason: `main.js` watches
`G.hubTrack` for a change instead.

**ESC closes a panel before it pauses anything.** It is the pause key everywhere else in the
room, so the panel's own cancel takes it and `main.js` skips the pause toggle while a panel
is open - otherwise opening the world map and pressing escape would pause behind it, with no
way to get out.

**Everything degrades to a fallback — and that has to include a pose nothing drew.** The
code-drawn set had no `combo_power_a/b/finish`, `parry_counter` or `meteor_lariat`, because
those five only ever existed as authored art, and `getFrame` indexed `set[name]` with no
guard. Delete one combat sheet, or serve the game with a 404 manifest, and the first punch
threw inside `render()` and took the HUD down with it. Both halves are needed: alias the
authored-only poses onto drawn ones in `buildFallback`, and have `getFrame` fall through to
the idle for a name nothing has at all. Test it by asking for a pose that does not exist.

**Simulation belongs in update(), and a draw function that steps the world is invisible until
you pause.** `drawSilt()` called `updateCrab()` and `updateBait()`, and `drawTank` calls it
twice - so the tank's tenants ran at 3x and kept swimming through a paused room, because
`render()` has no pause guard and never will. `?auto=verify` cannot catch this class: the
harness only calls `update()`.

**Everything degrades to a fallback.** Missing PNG → code-drawn sprite (`js/sprites.js`
`SPR`, `js/props.js`); missing frames → `getAIFrame` returns null and the code sprite
plays; missing wav → synthesized SFX; missing background plates → a complete procedural
street builds in `js/stages.js`. Never make an asset load-bearing.

**Adding a stage** means one entry in `STAGES` (`js/stages.js`): art keys, width, lamps,
glows, `props`, `birds`, `fg`, `crowd`, `waves` (each `{x, spawns, miniboss?, boss?}`) and
a procedural `build()`. Bosses go in `BOSSES` (`js/bosses.js`) as a `patterns` list driven
by one shared state machine.

**Animation is chosen from how far a body actually moved this frame**, measured *after*
the arena clamp — not from the AI state name. Enemies drift while nominally `idle`, and
playing a standing frame through that reads as sliding.

## Sprite frame contract

`js/aiframes.js` loads `assets/frames/manifest.json` and normalizes each frame: scaled to
the character's entry in `HEIGHTS`, feet 3 px above the canvas bottom, horizontally
centred on a body-anchor band. `TORSO_ANCHORED` (walk/run) anchors on the torso instead of
the legs — leg-anchoring a walk cycle swings the torso and reads as a waddle.
`assets/frames/anchors.json` holds per-frame nudges, edited with arrow keys in the lab's
ANIM mode and saved with `S` (the dev server accepts `POST /save-anchors`; CROWD mode
saves placements via `POST /save-crowd` to `assets/frames/crowd.json`).

`NAMEMAP` in `aiframes.js` resolves game frame names to manifest states with fallbacks, so
a character without a `suplex` sheet still animates.

`KIND_META` in `js/crowd.js` is the single source of truth for background-actor sizing —
`tools/process_npcs.py` reads it rather than keeping a copy, so baked art and lab checks
cannot drift apart.

## Asset generation with GPT Image

Codex should use its built-in `imagegen` skill directly. `tools/gen_codex.sh` is the
fallback entry point for agents without built-in image generation; never call an image
API directly.

```
tools/gen_codex.sh OUT.png landscape|portrait|square "prompt" [ref.png ...]
```

It shells out to `codex exec --sandbox danger-full-access --skip-git-repo-check`, passing
each reference image with `-i`, retries 3×, and **skips if `OUT.png` already exists and is
non-empty** — delete the file to regenerate. Shapes map to 1536x1024 / 1024x1536 / 1024x1024.
Generations land in `assets/ai/` (never loaded by the game); the game loads processed
output from `assets/` and `assets/frames/`.

### Generate animations as sheets, not single frames

Ask for **one horizontal strip containing the whole animation**, then slice it. Asked one
pose at a time the model re-invents the body every time; asked for the row it lays the
poses out as a set. Measured on CHAD's jab that took frame-to-frame leg-pixel churn from
61% to 15%. `tools/gen_sheet.sh` (CHAD) and `tools/gen_npc_sheets.sh` (crowd actors) are
the working examples — copy their structure.

A sheet prompt must state: same figure repeated in a row, **evenly spaced, identical scale,
same ground line, a clear band of empty flat green between poses so they never touch**,
identical face/build/costume/colour in every pose, then each pose numbered and described
individually, then what must NOT move ("his feet stay planted", "only the arms change").
Always end with the shared style block: 32-bit arcade beat 'em up pixel art in the style of
Streets of Rage 4, side view, **solid flat bright green chroma-key background (RGB 0,255,0)**,
no shadows, no ground line, no text, no numbers, no labels, no borders, no watermark.

Pass a character reference sheet (`assets/ai/ref_chad.png`) as the last argument so the
likeness holds across sheets. Background plates additionally ask for **no people** — the
street is generated deserted and every person is a sprite drawn on top.

Generations run in parallel with `&` / `wait` in the gen scripts; keep that pattern.

### Processing pipeline

| Step | Tool |
|---|---|
| slice a sheet into frames | `tools/slice_sheet.py SHEET.png prefix --expect N` — cuts on the emptiest column near each expected boundary (a reaching limb bridges a fully-empty gutter), then aligns every frame on one ground line and its own upper-body centre |
| reconcile two sheets' scale | `tools/normalize_sheets.py` — one factor per sheet family, measured off the standing pose. Sheets are consistent internally but nothing makes two sheets agree on character size |
| characters → game frames | `tools/process_char.py CHAR --height H --ref idle --colors N --src-dir ... --src-prefix ... --out-prefix ...` — chroma key + despill, **one scale for all poses**, bottom-anchor, **one shared palette**, 1 px dark outline. `tools/process_delhi.sh` runs the whole Delhi cast |
| rebuild frame manifest | `tools/build_manifest.py` — always run after adding frames |
| background actors | `tools/process_npcs.py [kinds] [--check]` — grades onto the plate's own exposure via `tools/tone.py`; `--check` reports lower-body stability |
| props / foreground | `tools/process_props.py`, `tools/process_fg.py` (fg is graded *down*, ~half the backdrop's exposure — "closer" reads as darker) |
| stage plates → strips | `tools/build_bgs.py delhi` — colour-matches panels to a shared target and cross-fades the overlap |
| HUD portrait | `tools/make_portrait.py REF.png OUT.png --size 48` |
| title key art | `tools/gen_title.sh` generates variants, `tools/build_title.sh SRC.png [TOP]` crops one to the 984x372 title band and pixelates it into `assets/title_art.png`; `tools/preview_title.py` composites it under the real scrims for checking |
| SFX | `tools/build_sfx.sh` — rebuilds `audio/sfx/*.wav` from `audio/sfx/raw/` via the slot map in `audio/sfx/manifest.json` (needs `ffmpeg`) |

Character heights passed to `process_char.py` are **logical × RS** and must match `HEIGHTS`
in `js/aiframes.js`. Prop sizes must match `PROP_TYPES` in `js/props.js`.

Anything generated must be checked in the lab before it is called done: CAST for drawn
height and feet offset per frame, ANIM for stance pops and sliding feet at real timing,
CROWD for whether an actor belongs where it stands (tone against its own footprint, size
against what the art was baked to, stability via `process_npcs.py --check`).

## Conventions

- No build step, no bundler, no framework. Plain ES modules loaded by `index.html`.
- New game constants belong in `js/engine.js`; new shared runtime state belongs on `G`.
- Music: `"silent": true` in `audio/manifest.json` only suppresses the *chiptune fallback*; a slot holding a real mp3 plays regardless. THE LAIR has its own `lair` slot (`neon_shadows.mp3`) so the hub scores itself without the title screen losing its chiptune. Drop an mp3 in a slot — no code change.
- `tools/gen_codex.sh` caps each call at `GEN_TIMEOUT` (420s). Codex sessions hang indefinitely, especially with more than one in flight, and a stale one blocks every generation after it.
- `tools/serve.py` must serve byte ranges: an `<audio>` element sits at `readyState 0` forever, with no error raised, on a server that answers `Range` with the whole file.
- The SFX slot mapping in `audio/sfx/manifest.json` was matched by acoustic analysis and **has not been verified by ear** (`sfxlab.html`).
