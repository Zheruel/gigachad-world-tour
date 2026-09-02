# STAGE 1 — DIRTY DELHI

> Status: production design record for the shipped act. Some early implementation notes
> are historical; runtime code and the root README are authoritative.

One route, 12480 logical px, **26 screens**, about **15 minutes**. Noon in Chandni Chowk to
midnight on a pontoon, with no title cards in between: the market and the river are the same
place seen from two ends, and the level's argument is that everything the first half throws
away arrives in the second.

## The areas

Unequal on purpose. The player is never told they have changed area; they notice.

| | Area | x | Length | The one idea |
|---|---|---|---|---|
| 1 | **the market run** | 0–2100 | ~4 min | fighting in traffic — the bull, the crowd, breakables everywhere |
| 2 | **the food lane** | 2100–3400 | ~2 min | smoke, griddles, cookers — *where* you kill something matters |
| 3 | **the wire market** | 3400–5000 | ~3 min | the cable tangle comes down low; the fight goes vertical |
| 4 | **the drain** | 5000–8300 | **~40 s** | no enemies. The light dies, the noise stops, water underfoot |
| 5 | **the ghat** | 8300–10900 | ~3½ min | the water is a pit |
| 6 | **the pontoon** | 10900–12480 | ~2½ min | the floor moves, the sluice runs, the crane starts |

**The drain is the level.** Forty seconds of nothing — the market's noise fading behind a brick
arch, one bulb swinging, water over your boots, the palette going from hard white sun to
green-black — and then the wall drops away and the river is there. It has no enemies, it is where
the second checkpoint lives, and it will be the screenshot people remember.

**Forty seconds is 3300 px, and that is what it costs.** Walking is 1.38 px/frame, so the earlier
draft's 5000–5400 was 4.8 seconds — a doorway, not an area. Honouring the forty seconds pushes
everything downstream by 2900 and makes this the longest single span in the level: seven wall
views of dark culvert for a stretch nobody fights in. It is deliberate and it is expensive. The
length lives in one constant so a playtest can halve it in one edit.

## The route

| Screen | x | What happens |
|---|---|---|
| 0 | 0 | the motorcycle arrival (built): empty street, pigeons, nobody in frame |
| 0–1 | 380 | **WAVE 1** — three goondas, nothing else |
| 2 | 920 | **WAVE 2** — goondas and bandars, with the first crate to fight over |
| 2–3 | 1300 | **the bull** crosses, with no wave running: the paw-and-charge tell, for free |
| 3 | 1480 | **WAVE 3** — batta arrives, with goondas to bait the arc into |
| 4 | 2100 | **MINIBOSS · USTAD PAPPU** — the crowd closes into a chalk circle · *checkpoint* |
| 5 | 2500 | the food lane opens; the mithai box sits one lane back behind a stall |
| 5–6 | 2780 | **WAVE 4** — the first cooker |
| 6–7 | 3150 | **WAVE 5** — cooker and thela together, in smoke |
| 7 | 3400 | the wires come down low; kites overhead |
| 7–8 | 3700 | **WAVE 6** — two bats at once, and nobody to hide behind |
| 8–9 | 4200 | **WAVE 7** — the market exam: thela, cooker, batta, goondas, bandar, and the bull |
| 9 | 4600 | the shutters come down ahead of you, one after another. Nothing fights you |
| 9–10 | 4700 | **MID-BOSS · LANGDA, THE MONKEY KING** |
| 10–17 | 5000 | **the drain** — no enemies, 40 seconds, everything changes · *checkpoint* |
| 17–18 | 8500 | **WAVE 8** — goondas and the first mudlark, the river only a rumour |
| 18–19 | 9100 | **WAVE 9** — mudlarks in numbers, among the chemical barrels |
| 20 | 9700 | the dhobi ghat: sheets hung the full width, and **the dhobi** among them |
| 21 | 10200 | **WAVE 10** — thela with a pole, on a slope, in a slick |
| 22 | 10700 | the beached boat, cover in the open |
| 23 | 11100 | **WAVE 11** — the pontoon: mudlarks and batta on a floor that pitches |
| 24 | 11600 | **WAVE 12** — the exam, with the sluice running |
| 25 | 12000 | the dredger's shadow falls across the boats. The crane starts moving · *checkpoint* |
| 25–26 | 12100 | **LEVEL BOSS · THE DREDGER** |

## The cast

Six types, three of them already built, and each one answers a different question. The market
half uses four; the ghat adds the mudlark. Nothing new arrives after x 8500, so the second half
is about *applying* the roster rather than learning it — what changes there is the ground.

**The jump attack is taught by the boss, not by an enemy.** An earlier draft had a kite boy on
the awnings whose whole job was being above the lane, and he earned two waves out of twelve for a
full sprite family. Langda lives on those awnings instead, and jumping him off one is one of the
three ways to reach him — the verb gets taught by the thing you remember rather than by a
character who leaves and never comes back. (The kite boy is not wasted: he is native to stage 2's
upper berths, where he recurs across a whole level.)

| | Role | hp | dmg | speed | Telegraph | The answer |
|---|---|---|---|---|---|---|
| **GOONDA** | grunt | 34 | 7 | 0.9 | green, 18f | parry it, or hit him first |
| **BANDAR** | thief | 19 | 5 | 1.9 | green, 12f leap | anti-air, and kill it before it reaches your food |
| **BATTA** | reach | 44 | 11 | 0.85 | **red**, 28f arc | step out — and let the arc land on his own side |
| **COOKER** | zoner | 30 | 8 + burn | 0.8 | red beam, 26f | break the line, and **kill him away from the pack** |
| **THELA** | heavy | 85 (+prop 30) | 12 | 0.55 | red ram, 30f | break the prop, then he is a slow brawler |
| **MUDLARK** | ambusher | 22 | 6 + drag | 1.4 | rises out of the water, 20f | never stand with your back to the river |

**GOONDA** is the metronome and should stay boring. **BANDAR** steals pickups off the floor,
which turns every crate into a decision. **BATTA's swing hits other enemies** — one line of code,
and it is where the level teaches that the crowd is a resource.

**COOKER** fights with a screaming pressure cooker: a slow steam beam down the lane that hurts
anyone standing in it, and **he vents when he dies**, burning whatever is next to him. He is the
level's anti-mash lesson and he teaches it in one death rather than in a tooltip.

**THELA** is one rig with two props here and two more later in the chapter: a handcart in the
market, a boat pole on the ghat. Both are 30 hp breakables that delete his ram and leave debris
in the lane. **One heavy, four props** is the roster discipline for the whole chapter.

**MUDLARK** comes out of the water at the back of the lane and drags you toward the edge at
0.8 px/f until you mash out. Its whole job is to make you notice which way you are facing.

**THE DHOBI** is a named elite, not a boss: no intro card, no health bar, two appearances among
the hanging sheets. A wet-sheet whip with the longest reach in the game, and a wrap-and-drag
grab that hauls you toward the water. Keeping his kit and dropping his billing is how the level
stays at three boss-grade fights.

### Three things that are not enemies

An earlier draft had five. A wallowing buffalo that acted as a living wall and a passing barge
that tilted the pontoon both went: the barge was the sluice with a different axis, and the
buffalo was the weakest idea in the level. **Three bespoke systems in one level is already a lot**
— every one of them is code nothing else uses.

**SANDH, the bull.** Paws the ground for 40 frames at one edge, then charges a single depth lane
at 3.2 px/f for **18 damage to anything it touches, both sides**. Hittable, 60 hp, stays down.
First crossing at x 1300 with no wave running so the tell is learned for free; second during
wave 7, when the lane is full.

**The dabbawala.** Tiffin tower on his head, 12 hp, no attack, runs the length of the arena
during wave 4. Out, and the next wave brings two extra goondas; down, and the tiffin is a **45 hp
meal**. A *runner* is a wave flag, not a type — the same flag runs the chain-puller in stage 2.

**The sluice.** From x 8300, every ~25 s the outfall dumps: a horn, the foam surges, and for 90
frames everything in the lane is pushed river-ward at 0.6 px/f. Telegraphed twice — the horn, and
the foam rising a beat before — so it is a rhythm you fight inside, never a random shove.

## MINIBOSS — USTAD PAPPU, and the chalk circle

An akhara champion, oiled, in a langot, holding court in the square. No weapons, no projectiles,
nothing to break. **The fight is the arena:** when the gate locks, the background crowd walks
*inward* and forms a ring, and the walls tighten from 480 px to about 300. Nowhere to retreat,
no prop to hide behind, and the level's whole vocabulary taken away.

Shoulder charge (green, big recovery), a grab into a slam with the hardest mash in the level, and
a ground-shake stomp (red, jump it) that staggers the ring so it wobbles in and out. Poise 3: he
does not flinch, so trading loses and you have to actually parry.

At half health he throws the first man out of the ring and the crowd widens it by 60 px. **The
reward for progress is space**, which is the resource the fight has been denying you.

## MID-BOSS — LANGDA, THE MONKEY KING

A one-eyed rhesus macaque the size of a child, half a hand missing, a stolen brass fare meter on
a string round his neck. He runs the wires over the goods market and takes a cut of the whole
street in fruit. Everyone knows him; nobody will touch him.

**He does not stand and trade, and that is the point.** The first real boss of the game is
deliberately not a man who walks at you, so the player cannot learn *boss = mash in front of it*
as their opening lesson.

| Pattern | Class | What it does |
|---|---|---|
| the drop | green, counterable | he falls on you from the wire feet-first — the only time he is at your height |
| the snatch | grab | he takes a pickup off the floor, or **a full segment of your meter**, and goes back up |
| the troop call | summon | two bandars in off the awnings, on a timer, forever |
| thrown junk | green, reflectable | bricks, tiles and a hubcap from up on the wire |
| the screech | red | a full-lane shriek that staggers everything on the ground, his own troop included |

**Three ways to reach him**, and finding them is the fight: counter the drop (generous window,
enormous punish), jump-attack him on a low awning, or **break the awning brackets** — six of
them along the arena, each one shortening the wire he can run.

**What he steals is what makes it.** A meter segment, visible on the string, won back by putting
him on the floor. Nothing else in the game takes a resource and lets you take it back by hand.

**At 50 % he runs out of wire.** Brackets down, troop dead, and the last third is a small furious
animal in an open street with nowhere to go — the only stretch where mashing is right, and it is
the reward for the two minutes before it.

> **Guard: he must come down on a timer whatever the player does.** A boss that will not hold
> still is exactly the design that reads brilliantly on paper and infuriates in play. If a player
> never works out the brackets, the fight still has to resolve — so the drop fires every ~9
> seconds regardless, and everything clever the player does only makes it happen sooner and hurt
> more. **The skill expresses itself in the rate, never in whether the fight is winnable.**

## LEVEL BOSS — THE DREDGER

The boss is a **machine**. The thing eating the river is a half-sunk sand dredger with its crane
still running, and for most of the fight the only human involved is a shape in a cab you cannot
reach. Cheaper than a man and better than one: the market had a body to beat, the river has an
industry.

| Pattern | Class | What it does |
|---|---|---|
| the bucket sweep | red | the grab-bucket drags the full width of the lane at one depth |
| the drop | red | it lifts, hangs over your shadow for 40 frames, and comes straight down |
| the spoil dump | hazard | a bucketful of wet sand across the pontoon: it stays, and it slows everything in it |
| the hose | green, reflectable | the deck crew turn the slurry hose on you — reflect it into the cab glass |
| the crew | summon | two mudlarks over the side every 20 s, until the winch is dead |

**Three things break, and they are the fight.** The **winch** (80 hp) stops the bucket for good.
The **counterweight chain** drops the arm so it can only sweep low — which means it starts
hitting its own crew. The **cab glass** cannot be broken by hand at all: only by a reflected
hose, or by baiting the bucket-drop while standing against the cab. Do that and the fight ends
two minutes early, which is the best-kept secret in the level.

**Then the operator comes out**, and he is not a boss: a frightened contractor with a spanner and
90 hp who has never had to fight anything in his life. Fifteen seconds. **A machine that was
terrifying and a man who is nothing** is the last image of the level before the walk home.

**Death:** he goes into his own river, the crane goes still, and the relic — a brass river-permit
token off the cab wall — is the first thing on the trophy wall.

> **Guard: there must always be something to punch.** A machine boss means stretches with no body
> in reach, which is the opposite of fun in a brawler. The crew coming over the side are not
> flavour — they are the floor of the fight, and the spawn timer's job is to guarantee that a
> player who wants to swing at something always can. If the deck is ever empty while the bucket
> is winding up, the fight is broken.

## The waves

Twelve gates and three boss-grade fights across fifteen minutes: something new every 70 seconds.

| # | x | Composition | What it asks |
|---|---|---|---|
| 1 | 380 | goonda ×3 | can you parry and combo |
| 2 | 920 | goonda ×2, bandar ×2 | can you protect a pickup |
| 3 | 1480 | batta, goonda ×3 | can you evade red — and bait it into his friends |
| — | 2100 | **USTAD PAPPU** | can you fight with no space and no props |
| 4 | 2780 | cooker, goonda ×2, bandar + **the dabbawala** | can you choose a target under a timer |
| 5 | 3150 | cooker ×2, thela, goonda | can you kill something in the right place |
| 6 | 3700 | batta ×2, cooker, bandar | two red arcs, and no crowd to bait them into |
| 7 | 4200 | thela, cooker, batta, goonda ×2, bandar + **the bull** | all of it |
| — | 4700 | **LANGDA** | can you fight something that will not hold still |
| 8 | 8500 | goonda ×2, mudlark | meet the water |
| 9 | 9100 | mudlark ×2, goonda ×2, among the barrels | terrain you make yourself |
| 10 | 10200 | thela, goonda ×2, mudlark, **the dhobi** | poise, on a slope, in a slick |
| 11 | 11100 | mudlark ×3, batta, bandar | the back lane is hostile, on a floor that moves |
| 12 | 11600 | thela, mudlark ×2, batta, goonda ×2 + **the sluice** | the exam |
| — | 12100 | **THE DREDGER** | can you fight the arena itself |

Six alive at a time, two attacking (three once a wave is four or more). No composition repeats.

## Breakables and pickups

Health only, one 1-up, **nothing drops from enemies** — the economy is placed, so a player who
reads the street is rewarded for that and not for grinding.

| Prop | hp | Drops | Where |
|---|---|---|---|
| crate | 20 | **+30** | ×8 across the market and the ghat |
| stall table | 18 | **+15** | ×4, food lane and tea stalls |
| matka, tyre stack, hanging sign | 12–26 | nothing — score, splash, cover | scattered; texture, not economy |
| **chemical drum** | 18 | nothing — **bursts into a 12 s poison slick** | ×6 along the bank; terrain you place yourself |
| **mithai box** | 10 | **1-UP** — the only one in the level | x 2500, one lane back, behind a stall you have to break |
| thela's cart / pole | 30 | nothing — deletes his ram, leaves cover | walks in on the heavy |
| awning brackets ×6 | 15 | nothing — shortens Langda's wire | mid-boss arena |
| dhobi's slab | 40 | nothing — deletes his charged whip | the ghat |
| winch / counterweight / cab glass | 80 / 50 / — | nothing — each one changes the boss | boss arena |

Total placed healing: 8 × 30 + 4 × 15 = **300 hp**, plus 45 if you drop the dabbawala.

## Balance

**The target:** a competent first run costs one or two lives; a good run costs none and finishes
holding the 1-up. Enemy hits do 5–13, the bull does 18, a full enemy combo 20–25.

**Difficulty comes from what you must notice.** Friendly fire on every red — the bat, the beam,
the ram and the bull all hurt other enemies, so the skill ceiling is *make them hit each other*
rather than *press harder*. The cooker punishes killing carelessly, the bandar punishes tunnel
vision, the bull punishes standing in the open lane, and the mudlark punishes retreating without
looking. Every red has a 26–30 frame wind-up: a third of a second more than human
reaction time, so nothing is a coin flip.

**The pit changes the second half's maths.** Ring-outs are free kills, so the ghat's crowd is
bigger and tougher than the market's, and the gap between a player who uses the water and one who
does not *is* the difficulty curve. Three things stop edge-camping: mudlarks surface behind you,
the thela's ram shoves you off your spot, and the sluice pushes you toward the drop you were
using as a weapon.

**Tuning order, when it is too easy:** wave size → simultaneous attackers → `DIFF.aggro` →
`DIFF.dmg` → enemy hp. Reach for the last one last; a spongy enemy is not harder, it is longer.

## How long, and where the checkpoints go

Walking is 1.38 px/frame — 82.8 px/s — so 12480 px is **two and a half minutes** of pure traversal, forty seconds of which is the drain. The
length is combat: twelve waves at 20–35 s each, plus 60 s of Pappu, 110 s of Langda and 120 s of
the dredger. **~15 minutes** for a competent first run, 10–11 for a practised one.

**Three checkpoints — Pappu, the drain, the pontoon** — so nothing costs more than about four
minutes, and most deaths cost forty seconds. When it runs long in playtesting, cut a wave (40
seconds, invisible), never street (7 seconds a screen, and it costs an area).

## Making it feel alive

**The shutters come down.** When a gate locks, the shopfronts within a screen roll their shutters
down one after another, a few frames apart, and roll them back up when the wave clears. One
sprite and one timer, and it makes the gates feel caused rather than imposed.

**A crowd that lives on the wall.** Chai, spice, barber, tailor, porter, dog, cow — placed on the
facade and street bands, carrying on through the fight, ducking when something lands near them
and going straight back to it. A barber mid-shave who stops, looks, and carries on is worth ten
idle bystanders. In the drain and on the ghat there is **nobody at all**, and that contrast is
most of why the second half lands.

**Pigeons at three roosts**, lifting on nearby impacts and settling again, the whole flock going
up on a super or a boss slam.

**Light behaviour, which is the level's real signature.** The market has hard midday sun, black
awning shadows CHAD walks through, white shafts between buildings and **no artificial light at
all**. From the drain onward the sky darkens across the route on the lair's `dusk()` progression
driven by camera x, and the light becomes one swinging bulb, sodium pools on wet stone, and a
warm glow downriver that never gets closer.

**Two procedural layers per plate.** Market: heat shimmer off the road, dust in the sun shafts.
River: foam clumps drifting and clumping on two rates, and the wall plane reflected in the water
with the same `translate + scale(1,-0.5) + alpha` trick `drawWorld` already uses on fighters.

**Rats at three holes** on the ghat — not a swarm. **Floating debris** as y-sorted actors: a
bottle, a marigold garland, a sunk scooter with its handlebars above the surface.

**Sound:** market crowd bed with horns at irregular intervals, a cycle bell, a radio in one
shopfront that exists for two screens. The drain kills all of it and replaces it with dripping.
Then the outfall roar fades in over two screens, boats knock on the pontoon, a temple bell,
dogs. The act's own track is 132 BPM, Koshiro-lineage FM over a Delhi percussion layer.

## What has to be built

**Art — seven sprite families and a machine, and that is the whole budget:**

1. **USTAD PAPPU** — idle, walk, charge, grab, slam, stomp, hurt, down.
2. **LANGDA** — idle, hang, drop, screech, snatch, throw, hurt, down.
3. **THE DREDGER** — props: bucket, winch, counterweight, cab. Plus the **operator**: idle,
   swing, hurt, down. Nothing else.
4. **COOKER**, **THELA**, **MUDLARK** — idle, walk, attack, hurt, down, plus one signature each
   (beam, ram, rise-and-grab). THELA gets two props and one rig.
5. **THE DHOBI** — elite, so no intro art: idle, walk, whip, grab, hurt, down.
6. **SANDH the bull** — walk, paw, charge, hurt, down. **The dabbawala** — run and drop.
7. Props: mithai box, shutter, chemical drum + burst, awning bracket + broken, beached boat.

**Code**

1. **Friendly fire on red attacks** — one flag on the attack spec, and the highest
   fun-per-line-of-code in the level.
2. The **runner** wave flag — the dabbawala here, the chain-puller in stage 2.
3. The cooker's death burst, on the existing hazard system.
4. **Arena overrides** — the chalk circle squeeze. The same feature the train roof and the tower
   lobby need later, so build it properly once.
5. Shutters as a stage layer keyed off `G.locked`.
6. Langda's wire: perch states, six breakable brackets, the stolen meter segment, and the
   guaranteed drop timer.
7. The water edge as a pit — wall-splat code with a different outcome — and the sluice push.
8. The dredger rig: crane arm, bucket, three breakables, the crew spawner and the phase-two
   operator.

**Checks** (`?auto=verify`): `bull-hurts-both-sides`, `cooker-vent-hits-neighbours`,
`thela-loses-ram-with-cart`, `circle-shrinks-arena`, `shutters-follow-the-gate`,
`langda-drops-the-meter-segment`, `langda-always-drops-eventually`,
`dredger-arm-drops-with-counterweight`, `dredger-always-has-crew`, `water-edge-kills`,
`one-up-exists-once`.

## Generation prompts

```bash
BG_MARKET="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling street seen straight from the side with no perspective distortion, highly detailed pixel art, hard white midday sun and deep black shadow under every awning, thick dust in the air, rich saturated colour, no text in latin letters, no watermark, no border, no user interface"
BG_RIVER="32-bit arcade beat em up game background art in the style of Streets of Rage 4 and Metal Slug, wide side-scrolling riverside seen straight from the side with no perspective distortion, highly detailed pixel art, dusk turning to night, sodium orange lamplight against green black water, heavy humid haze, no text in latin letters, no watermark, no border, no user interface"
DIRT="genuinely filthy and lived in: cracked stained walls with damp patches and black mould, layers of torn peeling posters, rusted corrugated metal, dripping air conditioner units, refuse sacks and scattered litter, squashed fruit trodden into the ground, grease stains, puddles of dirty water"
FILTH="catastrophically polluted: thick white chemical foam piled along the waterline, black oily water, plastic bottles and torn bags caught in everything, silt caked on the stone, rusted pipes weeping brown stains, rotting marigold garlands"
STREET="a packed Old Delhi street market in Chandni Chowk at noon, crumbling colourful shopfronts, filthy striped cloth awnings, an enormous chaotic tangle of black electrical wires sagging overhead between leaning poles"
GHAT="the bank of a poisoned river behind an Indian city, crumbling stone ghat steps going down into the water, brick drain outfalls, leaning corrugated shacks above the bank"

$G $O/bg_d1_a.png landscape "$STREET, the quiet end: half closed steel roller shutters, a shuttered sweet shop, stacked crates and clay pots, one bare bulb hanging unlit, $EMPTY, $DIRT, $BG_MARKET"
$G $O/bg_d1_b.png landscape "$STREET, spice merchants and a chai stall: open jute sacks of red orange and yellow powder, brass scales, a steaming urn, empty plastic stools, and a small open square with a peepal tree growing through the paving, $EMPTY, $DIRT, $BG_MARKET"
$G $O/bg_d1_c.png landscape "$STREET, the food lane: griddle stalls with huge blackened tawas, deep frying vats, hanging steel bowls, a sweet shop counter with trays of mithai, thick smoke and steam under the awnings, $EMPTY, $DIRT, $BG_MARKET"
$G $O/bg_d1_d.png landscape "$STREET, the wire market: the cable tangle brought down low across the whole width on leaning poles and awning frames at two heights, a dead neon sign, handcarts and stacked tyres, kites caught in the wires, $EMPTY, $DIRT, $BG_MARKET"
$G $O/bg_d1_e.png landscape "A covered brick drain culvert running left to right, arched roof dripping, a sluice gate with a rusted winding wheel, water down the middle, one bare bulb on a wire, opening at the right hand end onto a river bank, $EMPTY, $FILTH, $BG_RIVER"
$G $O/bg_d1_f.png landscape "$GHAT, the outfall and the dhobi ghat: a huge concrete pipe mouth pouring foam, flat stone washing slabs, long lines of white sheets hung across the scene, stacked blue chemical drums, the far bank on the horizon, $EMPTY, $FILTH, $BG_RIVER"
$G $O/bg_d1_g.png landscape "$GHAT, wide shallow steps down to the water with a beached wooden rowing boat on its side, a marigold jetty, tin tea stalls at the top of the steps, $EMPTY, $FILTH, $BG_RIVER"
$G $O/bg_d1_h.png landscape "$GHAT, a pontoon of old wooden boats lashed together end to end, and behind them the black rusted hulk of a half sunk sand dredger with a crane arm and grab bucket hanging over the water, $EMPTY, $FILTH, $BG_RIVER"
$G $O/bg_d1_floor_market.png landscape "seamless horizontally tileable top-down slightly angled view of a filthy cracked stone and broken asphalt street in an Indian market, potholes of dirty water, spilled spice powder trodden in, squashed fruit, litter, drain covers, tyre marks, hard midday sun with sharp black shadows, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark"
$G $O/bg_d1_floor_river.png landscape "seamless horizontally tileable top-down slightly angled view of wet silted stone ghat steps and cracked concrete at a river edge, black river mud, white chemical foam scum along one edge, plastic litter trodden into the silt, puddles reflecting orange sodium light, no people, 32-bit arcade game floor texture in the style of Streets of Rage 4, richly detailed pixel art, no text, no watermark"
```

**LANGDA** is an animal, so the face is the whole risk — a round symmetrical muzzle at 60 px
reads as a plush toy, which is the trap the lair's sabretooth fell into three times. Three-quarter
head, heavy brow, one eye milky, mouth open on teeth.

```bash
LANGDA="A large one eyed rhesus macaque the size of a small child, mangy grey brown fur, a pink scarred face, one eye milky and half shut, a heavy brow ridge, teeth bared, half of one hand missing, a battered brass taxi fare meter hung round his neck on a filthy string, seen in three quarter view so the muzzle reads"

$G $O/langda_idle.png landscape "$LANGDA, a 4 pose idle loop read left to right, crouched on all fours with his weight forward and his head up. Pose 1: at rest. Pose 2: shoulders rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His hands and feet stay in exactly the same four places in every pose. $SHEET"
$G $O/langda_drop.png landscape "$LANGDA, a 4 pose drop attack read left to right. Pose 1: hanging by one long arm from an unseen wire, body stretched out and down. Pose 2: released, arms over his head, legs tucked, falling. Pose 3: both feet driven down and forward, body arched, arms flung back. Pose 4: landed in a deep crouch, knuckles down, head up and snarling. $SHEET"
$G $O/langda_screech.png landscape "$LANGDA, a 4 pose screech read left to right. Pose 1: crouched with the head down. Pose 2: head coming up, mouth opening. Pose 3: reared back on his haunches, chest out, mouth stretched wide on all his teeth, both arms thrown out sideways. Pose 4: holding the shriek, body shaking, slightly lower. His feet stay planted. $SHEET"

PAPPU="A huge oiled Indian akhara wrestler in his forties wearing only a red langot, shaved head, thick handlebar moustache, a sacred thread across his chest, mud on his shoulders and knees, enormous arms, bare feet"
$G $O/pappu_idle.png landscape "$PAPPU, a 4 pose idle loop read left to right, stood square with both hands open at chest height. Pose 1: at rest. Pose 2: chest rising. Pose 3: at the top of the inhale. Pose 4: lowering. Feet, legs and hips IDENTICAL in all four. $SHEET"

OPERATOR="A thin nervous Indian man in his fifties in a filthy checked shirt and loose trousers, thick glasses, grey stubble, a rag round his neck, holding a heavy spanner in both hands like a man who has never hit anyone with one"
$G $O/operator_idle.png landscape "$OPERATOR, a 4 pose frightened idle loop read left to right, backed up with the spanner held across his chest. Pose 1: at rest. Pose 2: chest rising on a shallow fast breath. Pose 3: at the top of it. Pose 4: lowering. Feet, legs and hips IDENTICAL in all four. $SHEET"

$G $O/dredger_bucket.png landscape "A huge rusted steel clamshell grab bucket for a dredging crane, hanging closed from a heavy chain, seen straight from the side, caked in river mud and weed, dented plates and thick rivets, 32-bit arcade beat em up game prop art in the style of Streets of Rage 4, crisp detailed pixel art, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no text, no watermark"
$G $O/dredger_winch.png landscape "A rusted industrial winch drum wound with steel cable in a riveted housing with a guard cage, seen straight from the side, oil stained and river worn, 32-bit arcade beat em up game prop art in the style of Streets of Rage 4, crisp detailed pixel art, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line, no text, no watermark"
```

## The entrance

The production arrival is the sixteen-cel V9 set: the V8 cels registered on the
motorcycle's front wheel so the bike keeps one size and one ground line, with the three
foreshortened drift cels dropped in favour of a brake lean in code. Smoke, exhaust, skid
dust, and small particles remain procedural. The production timeline is
`drawMotorcycleArrival()` in `js/story.js`. Prompt record: `assets/ai/entrance_v8/`.
Builders: `tools/build_entrance_v8.py` (the cels) then `tools/build_entrance_v9.py` (the
registration).

## Music

Two tracks, and they are the same tune. `stage1a` is the market; `stage1b` starts at the drain
and runs to the dredger. They share a key and a four-bar hook, played on a different instrument
in a different room — the player should not consciously notice it is the same melody, they should
notice that the river feels like the market's consequence.

**The drain has no music at all.** The track stops and what is left is dripping water. Silence is
the loudest thing in a beat 'em up and it is free.

The shared `boss` theme lives here too, because this level needs it first. It plays for **Pappu
and Langda** — and for every miniboss and mid-boss in the chapter — which is what makes it mean
something when the dredger arrives and a different tune starts.

`boss1` is that different tune: **GUTTER GHAT escalated**, the same falling hook at boss tempo
with the reverb gone and everything screaming. A climax that sounds like the place it happens in
beats an unrelated boss theme, and it is easier to write, because you are describing a phrase you
already have.

Suno, 2–3 minutes, 3–4 takes each, judged on the **first eight bars cold** because the game cuts
straight in. Every track is instrumental — the game already has voice lines and a lot of hit
audio, and a vocal fights both.

### `stage1a` — BAZAAR HEAT · 132 BPM · D minor

```
90s arcade beat 'em up stage theme, Yuzo Koshiro / Streets of Rage 2 lineage:
gritty Sega Genesis FM synth lead over a Detroit techno pulse, 132 BPM, D minor, driving
four-on-the-floor kick, rubbery detuned FM bassline, snappy gated snare, and a hand-played Old
Delhi bazaar layer — dholak and tabla groove, a sarangi carrying the main hook, bansuri
answering it, harmonium drone underneath, finger cymbals. Hot midday swagger, confident rather
than frantic. Dry punchy 1992 console mixdown, mid-forward, no reverb wash. No EDM build-and-drop and no ambient intro. A loop that stays out of the way of sound
effects.
```

### `stage1b` — GUTTER GHAT · 128 BPM · D minor

Same tune, drowned. Generate it *after* 1a: "the same four-bar melody" is not something Suno can
hear, but describing the shape of the phrase gets the pair close enough to read as related.

```
90s arcade beat 'em up stage theme, the dark companion to a bright market theme:
128 BPM, D minor, a slow falling four-bar modal phrase carried by a low detuned resonant synth
and a bowed sarangi an octave down, heavily dubbed out. Sparse tabla, half-time kick, deep sub
bass, tape delay throwing everything into the distance, a foghorn swell every eight bars,
metallic water-drip percussion, harmonium drone. Sodium-lit, humid, polluted, patient dread
rather than danger. Dry punchy Sega Genesis mixdown with everything sitting further back than
the market theme. No build-and-drop, no ambient intro, and it must loop.
```

### `boss` — NO CHANGE · 152 BPM · A Phrygian dominant

Shared across the chapter's six minibosses and mid-bosses, so it has to survive repetition. 152
matches the built-in chiptune fallback, so a real track feels like the same cue.

```
90s arcade BOSS theme, Streets of Rage 2 / Yuzo Koshiro lineage: 152 BPM, A
Phrygian dominant, hammering breakbeat-hardcore drums under a four-on-the-floor kick, a snarling
acid TB-303 bassline, harmonic-minor FM brass stabs, a siren-like lead, double-time tabla and
dholak rolls, and a blaring auto-rickshaw horn motif as the hook. A short tension riser every 8
bars. Menacing, relentless, claustrophobic. Dry punchy Sega Genesis mixdown. No breakdown and no ambient intro — it hits hard from bar one and loops.
```

### `boss1` — THE DREDGER · 150 BPM · D minor

The level boss, and it is a machine — so this one is the least human track in the chapter.

```
90s arcade beat 'em up boss theme for a fight against an enormous rusting machine: 150 BPM, D
minor, industrial and mechanical — a clanking metallic percussion loop built from hammer hits
and chain rattle, a grinding detuned bass, and the slow falling four-bar modal phrase from the
river theme returning as a screaming distorted FM lead, no longer dubbed out but right at the
front. Hydraulic hisses on the offbeat, a low horn blast every eight bars, sparse tabla driving
underneath. Enormous, uncaring, industrial rather than menacing. Dry punchy Sega Genesis
mixdown. No ambient intro, no breakdown, and it must loop.
```

**Make `stage1a` and `boss` first.** Between them they cover the whole of the first playable level
up to its bosses, and they will tell you whether the soundtrack's palette is right before you
commission the other eight.
