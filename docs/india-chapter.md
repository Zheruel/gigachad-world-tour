# The India chapter — the plan

> Status: roadmap and canon. Only DIRTY DELHI is currently implemented; later acts and
> roster entries are proposals. Runtime code and the root README are authoritative.

Three stages, nine boss-grade fights, and a journey rather than three rooms: dirty Delhi from
its market to its river, the night train out of it, and a tower in another city in the monsoon.
Stage 1's first plate and the core combat systems are built. Everything else is specified stage
by stage, and the whole chapter is costed at **twelve new sprite families** — six enemies and
six bosses.

| | **[1 · DIRTY DELHI](stage1-dirty-delhi.md)** | **[2 · THE NIGHT TRAIN](stage2-night-train.md)** | **[3 · REFUND TOWER](stage3-refund-tower.md)** |
|---|---|---|---|
| **Areas** | the market · the food lane · the wire market · **the drain** · the ghat · the pontoon | the ticket hall · the footbridge · the parcel dock · platform 1 · the carriages · the roof | the flooded street · the lobby · **the lift** · the call floor · the manager's end · the roof |
| **Width** | 9600 · 20 screens | 9000 · 18.75 screens | 8000 · 16.7 screens |
| **Light** | hard noon sun → sodium dusk on wet stone | station tube light → tungsten with the window strobing past | grey monsoon dawn → dead fluorescent, then first light |
| **Gimmicks** | fighting in traffic · the water is a pit | you are trying to leave · the arena is moving | the ground is flooded and conducts · the floor is machinery |
| **Miniboss** | USTAD PAPPU, in a chalk circle | **THE DEPARTURE** — a situation, not a person | the shield wall, three RIOTs in formation |
| **Mid-boss** | **LANGDA, THE MONKEY KING** | **THE TTE** | **THE INSPECTOR** |
| **Level boss** | **THE DREDGER** — a machine | **BIRJU, THE COUPLER** | **"SIR", THE CLOSER** — the chapter's final boss, in two phases |
| **New enemies** | COOKER, THELA, MUDLARK | MANJA | RIOT, TEAM LEAD |
| **Length** | ~15 min | ~15 min | ~15 min |

**Three levels, six areas each, no labels.** That is the genre's own shape: Final Fight's Area 2
runs a subway into a bar into Sodom under one number, and Streets of Rage 2's first stage walks
a street and ends in a bar. The areas are deliberately *unequal* — a four-minute market, a
forty-second drain — because that is what reads as a route rather than as two levels stapled
together. **Every level ends with a boss, a relic, a track and a trip home.**

**Three boss-grade fights per level** — a miniboss, a mid-boss and the level boss, at roughly a
third, two thirds and the end. Anything that would be a fourth becomes an elite enemy or a wave:
the dhobi keeps his kit and loses his billing, the parcel dock keeps its trolleys, the shift
supervisor keeps his formation.

**The arc.** The city, the way out, and the people who own both. Stage 2 is the hinge: it takes
the chapter out of Delhi, which is what earns the tour its name.

**Contrast, decided.** Eighteen screens of Indian street grime would read as one long level, so
the separation is carried by **light behaviour** before palette — and each level *changes light
across itself*, so no two areas look like the same place: noon to sodium dusk, station tube light
to tungsten-and-strobe, monsoon grey to fluorescent to dawn. Every area must be identifiable
from a 96×54 thumbnail.

**One roster rule.** Each level keeps the types you know and introduces at most two of its own,
and what changes is the room they are in. GOONDA appears in all six and should
stay boring on purpose — he is the metronome everything else is read against.

---

## The roster — nine types, and why there are only nine

A beat 'em up has eight useful jobs, and every enemy anyone has ever designed is one of them in
a costume. Streets of Rage 2 shipped eight stages on about ten types. This chapter ships six
levels on **nine**, of which three already exist:

| Type | Job | Status |
|---|---|---|
| **GOONDA** | grunt — the metronome everything else is read against | built |
| **BANDAR** | fast thief — takes what is on the floor, and once takes a ticket | built |
| **BATTA** | reach — a red arc that hits his own side too | built |
| **COOKER** | zoner — a beam down the lane, and **he vents when he dies** | new |
| **MANJA** | vertical — attacks from above the fighting lane, never in it | new, stage 2 |
| **THELA** | heavy — poise, and a breakable prop that deletes his best move | new |
| **MUDLARK** | ambusher — arrives from the back of the lane and drags you | new |
| **RIOT** | shield — cannot be hit from the front | new |
| **TEAM LEAD** | support — an aura that removes flinch until he dies | new |

**Context does the work that a re-skin would have done.** The heavy is a handcart in the
market, a boat pole on the ghat, a steel trunk on the platform and a server trolley in the
tower: **one rig, four props**, and a prop is a fraction of the cost of a sprite family. The
zoner is a pressure cooker, then a tea urn, then a coolant line. The vertical is a kite boy on
an awning and then a man in an upper berth. A coolie in a 30 px corridor genuinely is a
different enemy from a coolie on an open platform, and that difference is free.

**Two behaviours are wave flags, not types.** A **runner** ignores you and sprints for an
objective — the dabbawala in the market, the chain-puller on the train — and a **swarm** is
five weak spawns of any type at once, which is how the tower's office temps work. Both cost a
flag in the wave definition and no art at all.

**Everything cut from earlier drafts went into one of those two places**, or into the level:
DRUM's corpse-leaves-terrain became breakable chemical barrels on the bank, which are better
because the designer places them and both sides can be pushed into them.

## What a boss has to obey

Bosses are assembled from the pattern library in `js/bosses.js`, sorted by `PARRY_CLASS` into
**counter**, **reflect**, **unblockable** and **hazard**:

1. one green counterable melee, 2. one green reflectable projectile, 3. one red unblockable
that is a *spatial* answer rather than a reaction test, 4. one hazard that changes the floor,
5. one **breakable thing in the world** that deletes a pattern for good, 6. one phase flip at
50 % that is visible on the sprite, 7. one summon that changes who you should be hitting.

Take four or five. **Never two unblockables** — a boss with two moves you can only run from is
a boss you fight by running. Every pattern's tell lives in the *silhouette*: at 480×270 the
colour flash says "something is happening", the pose says "what".

**Every stage boss has a breakable that changes the fight, and something earlier teaches that
lesson on a cheaper target**: the thela's cart before the dredger's winch, the awning brackets
before Langda's wire, the emergency chain before Birju's couplings, the whistle before the PA
horn.

**Three more, learned the hard way from the first draft of this chapter.**

**A boss must have one thing that is not damage.** Something to break, something to steal back,
something to reach, someone else to kill first, a floor that changes. A boss whose entire
existence is a health bar and a wind-up is a wave with a name.

**No boss stands and trades.** If the optimal line against it is "walk up and hit it until the
pattern comes out", it is not finished. Langda will not hold still, the dredger cannot be punched
at all for most of its fight, the TTE has to be identified before he can be beaten, and Sir
spends a third of his fight untouchable behind a queue. Each of those is a *question*, and the
answer is the fun.

**Every boss gets its own arena, and the arena is designed before the boss.** Not another tile of
the route with a health bar over it: a purpose-built panel that could not be anywhere else, wider
and emptier at ground level than the surrounding street, with fewer small details and a quiet
middle so the boss, CHAD, the telegraphs and the hit effects all read. It holds the fight's
breakable — and the breakable is a **sprite, never painted into the plate**, because it has to be
able to go. The chapter's six: the wire market with the cable tangle brought down low, the dredger
over the pontoon, the vestibule with a door open on the rushing dark, the roof of a moving train,
the chowki desk under a ceiling fan, and a glass office that becomes a rooftop in a storm. If you
can describe a boss arena as "the same street, further along", it is not finished.

**And two guards, because a clever boss has a clever failure mode.** A boss that will not hold
still must still come down on a timer, so the fight always resolves and skill expresses itself in
the *rate* rather than in whether it is winnable. A boss made of machinery must always have
something punchable on screen, or the player is standing still waiting for a pattern — which is
the opposite of the genre.

## The rules

Sixteen laws, in the order they matter. They are opinions, held firmly, and they are what the
rest of these documents are derived from.

**1 · Something new every 90 seconds.** A new enemy, a new composition, a hazard, a room, a
change of light. If you cannot name what is new in a stretch of level, that stretch is padding
and no amount of art will fix it. This one rule decides whether a level feels long — not its
length.

**2 · A checkpoint every five minutes, and every stage ends at home with something in your
hands.** This is the rule; stage length is an output of it. A stage runs about fifteen minutes
across six areas, with a boss-grade fight roughly every five minutes and a checkpoint at each — so
a death costs about four minutes at the very worst and usually forty seconds. Long stages are
only punishing when they are *unbroken*; what a player actually resents is repeating ground,
not being somewhere for a while.

**3 · Death costs 45 seconds, never ten minutes.** Checkpoints at the miniboss and at the boss
door. This is the law that lets every other law be aggressive: cheap deaths buy difficulty, and
expensive deaths force you to be lenient everywhere else. **Short levels are what make a hard
game fair.**

**4 · Difficulty comes from information, never from numbers.** When a fight is too easy, add a
role, a hazard, or a direction enemies arrive from. Never add health. A spongy enemy is not
harder, it is longer, and length is the one thing this genre cannot afford to waste.

**5 · The player always loses because they did not notice.** Every red telegraph gets 26+
frames — a third of a second more than human reaction time. Nothing in the game is a reaction
test, so every death is a lesson rather than a coin flip.

**6 · The player is a tank, not a glass cannon.** Generous health, i-frames on the rise, a
buffered quick getup, and a meter reversal out of any knockdown. The fun of this genre is
feeling powerful in a bad situation, so the one thing that must never exist is a loop you
cannot get out of.

**7 · Every wave is a question with a positional answer.** "How do you kill this group without
standing in the beam, in the aura, or in front of the shield?" If the answer is "hit harder",
the wave is not designed yet.

**8 · Six alive, two attacking — three once a wave is four or more.** Non-negotiable.
Readability is the game.

**9 · The environment is a weapon, and it belongs to both sides.** Friendly fire on every red
attack, wall splats, pits, breakables, hazards that do not care who is standing in them. This
is the highest fun-per-line-of-code in the genre and almost every game under-uses it.

**10 · No weapon pickups.** Streets of Rage hands you a pipe because it has four characters and
looser combat; this game has one character with a tuned five-hit flow combo, a held
parry-counter and juggles. A weapon replaces that moveset for ten seconds, which means the
player spends the pickup *not using* the thing the whole game is built on. It was proposed, it
was costed, and it was cut on purpose — do not re-propose it without a better argument than
"beat 'em ups have weapons".

**11 · One resource, two uses, no ambiguity.** Meter buys supers or buys you out of a
knockdown. Nothing else. A resource with three uses is a resource nobody budgets.

**12 · All healing is placed, none of it drops from enemies.** The health economy is a level
design tool, not a random number. 300 hp a level, positioned where taking it costs something.

**13 · Bosses last two minutes.** A boss that runs longer on a clean kill is a sponge. Phases
change *behaviour* — a pattern deleted, an arena shrunk, a machine broken — never just add
health.

**14 · No wave composition is ever repeated.** Not within a stage, not across the game. There
are enough roles that repeating one is laziness, and players feel it immediately even when they
cannot name it.

**15 · Every stage ends with one screenshot.** An image you would post: the bull in the lane,
the crane bucket over the boats, the platform sliding away, the roof of the train under a
bridge, the beacon on a flooded lobby, rain at first light forty floors up. If a stage does not
have one, it does not have an ending.

**16 · The hub is the reward loop, not a menu.** Relics that grant supers, tracks that unlock,
a room that visibly changes as the tour goes on. The walk home has to be worth taking.

### What that means in minutes

| | Stage 1 | Stage 2 | Stage 3 |
|---|---|---|---|
| Route | 9600 px · 20 screens · 6 areas | 9000 px · 18.75 screens · 6 areas | 8000 px · 16.7 screens · 6 areas |
| Waves | 12 | 10 | 7 |
| Boss-grade fights | Pappu 60 s · Langda 110 s · the dredger 120 s | the departure 90 s · the TTE 70 s · Birju 120 s | the shield wall 60 s · the Inspector 110 s · Sir 150 s |
| Traversal | ~115 s | ~110 s | ~95 s |
| **Clean run** | **~15 min** | **~15 min** | **~15 min** |

Fewer waves as the chapter goes on, and longer fights: stage 1 is twelve small questions, stage 3
is seven hard ones. That is the difficulty curve stated as a shape rather than as a number.

A **45-minute chapter** on a clean run, 65–70 for an average player with deaths, plus whatever
they spend in the lair. Three sittings or one long one — and the end of a stage is the natural
place to stop, which is exactly where the game sends you home.

**The lever is fights, not street.** Cutting 600 px of route saves seven seconds of walking and
costs an area; cutting one wave saves forty seconds and costs nothing you can see. When a
stage runs long, cut a wave.

### Why fifteen, and why it is broken in three

Streets of Rage 4 runs 8–12 minutes a stage with co-op, twelve stages and four characters to
spread the fatigue across. This game is one character, alone, with five verbs, so an *unbroken*
fifteen minutes would be too long. Broken into six areas with three checkpoints, it is
three five-minute runs in a row that happen to add up to a chapter — and the player who dies on
the roof restarts on the roof.

The other half of the argument is replay: a beat 'em up lives on its second, fifth and twentieth
run, on score, on rank, on harder difficulties. That is what the checkpoint spacing protects.
**Design the campaign for the first run and the five-minute stretches for the fiftieth.**

## Making them look as expensive as the penthouse

**Measure the plate, then build to it** — wave gates, props and boss arenas are measured off
the built strip, and the generator is asked for named zones so a plate can be rebuilt without
moving anything.

**Bold at 181 px.** A wall of tiny lit windows turns to noise.

**Two procedural layers over every plate.** Heat shimmer and sun dust; foam and water
reflections; the world going past the window and everything swinging before the lurch; rain,
wet deck reflections and a sweeping beacon.

**One reactive population per act, with somewhere to live** — pigeons at three roosts, rats at
three holes, a family asleep in an upper berth who never wake, three bays of telecallers who
duck and go back to typing. *Startle on arrival, hold for a fixed count, never on proximity.*

**Two rates make a habit read.** The sluice trickles and dumps; the tube light hums and fails.

**One generation per animated thing**, one palette across the whole set, per-object real-world
sizes, and a contact shadow on anything touching the ground.

---

## Building a level

**A level is one continuous route of unequal areas.** Not halves, not chapters — five or six
places of deliberately different lengths, with no labels and no announcement. A four-minute
market followed by a forty-second drain reads as somewhere you moved through; two seven-minute
halves read as two levels stapled together. The player should notice they are somewhere else
without ever being told.

**Every level gets one quiet area.** No enemies, forty seconds, the light changes and the noise
dies: the drain under the market, the lift, the fire stair. It is where the checkpoint lives, it
is the cheapest tension in the genre, and it is the bit people remember.

**Three boss-grade fights per level**, at roughly a third, two thirds and the end — a miniboss,
a mid-boss and the level boss. Three checkpoints, at the miniboss, the quiet area and the boss
door.

**One of everything per level**, not per area: one map, one cast table, one wave list, one
health economy (**300 hp of placed healing** and **one 1-up**, hidden deep), one difficulty
curve that ramps from the first gate to the last.

### Plate rules

- **The facade seam is at logical y=181**, playable street below it. Fixed side-on camera, no
  perspective distortion, and consistent horizon, curb height, masonry scale and light direction
  across every panel of a level.
- **Keep the fighting lane empty in the plate** — no baked people, vehicles or large objects, and
  nothing baked where a production prop will be drawn again.
- **Hide the joins at architectural dividers**: a pole, an arch, a shutter, a tunnel mouth, a
  lift door, a deep shadow band. Never mid-wall. Where two *environments* meet, the quiet area
  is the seam.
- **An obvious visual change every one to two screens**, without ever looking like a different
  city or a different time of day than the area you are in.
- **Contrast in the facade, quiet on the floor**, so combat silhouettes read. The floor gets a
  low-opacity dirt pass, clustered, with broad calm fighting spaces between.
- **No readable shop text**, logos, trademarks or modern advertising anywhere.

### Ambience rules

- **No free-floating facade animations** and no unanchored smoke or steam emitters. Cloth, fans
  and awnings are authored into the plate or left out; anything whose perspective and attachment
  point do not match the plate exactly reads as a pasted-on layer.
- **One reactive population per level**, living in three specific places rather than everywhere —
  pigeons at three roosts, rats at three holes, telecallers in three bays. They react on the
  false→true edge and hold for a fixed count. *Startle on arrival, never on proximity.*
- **Two procedural layers over each plate**, no more: whatever moves and whatever the light does.
- Everything else that moves is in the fighting lane, where it can hurt somebody.

### Acceptance checklist

- [ ] No obvious facade or floor repetition across a full sweep in the review page
- [ ] Every area recognisable without a label; adjacent panels share perspective, curb height,
      scale, light and palette
- [ ] No baked-in people, and no baked object conflicting with a production prop
- [ ] Each boss arena recognisable at a glance and quiet enough in the middle
- [ ] A visual change within a screen of every wave gate
- [ ] Crisp and convincing at the 480×270 logical view, not just at 2×
- [ ] All source-panel boundaries reviewed at gameplay scale with overlays off

### The prompt harness

Every plate is five wall panels plus a floor, generated deserted and stitched by
`tools/build_bgs.py`. Each level document carries its own locale blocks; these two are shared:

```bash
G=tools/gen_codex.sh ; O=assets/ai
EMPTY="completely deserted with absolutely no people anywhere in the scene, no human figures, no silhouettes, no crowd, every stall unattended and every seat empty"
SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap. The character must be identical in every pose - identical face, hair, build, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"
```

## Supers and unlocks

**Meter becomes three segments.** `G.meter` runs 0–300 drawn as three cells; `METER_MAX`
becomes `SEGMENT = 100`. Gain rate unchanged.

**Cost 1 / 2 / 3.** METEOR LARIAT (built) is the 1-cost answer to a crowd. The 3-cost is a
single-target drop, and **its art is already processed and unused on disk** —
`chad_ragnarok_air_1-8`, `chad_ragnarok_ground_1-8`, plus the `ragnarok_impact` crater. The
2-cost wants pressure rather than damage: an armoured advancing walk where each press adds a
hit, so it reclaims space instead of clearing it. The fourth relic grants a 2-cost
reversal-into-launch that starts from the floor.

**Selection: hold SPACE.** Tap fires the equipped move; hold drops time to ~0.15 and opens a
wheel of what you have equipped, costs shown, unaffordable ones dimmed.

**Equip at the trophy wall, two slots.** Each *stage* sends one relic home — the dredger's
river-permit token, Birju's coupling pin, Sir's headset — and each grants a super, on top of the Meteor
Lariat you start with. Four moves, two slots. and walking up to a relic and
pressing F equips what it grants. By the end of the chapter the trophy wall is a
decision rather than a shelf.

**The reversal never takes a slot.** One segment, spendable while downed or grabbed: an
invulnerable rise with a shockwave. This is what turns meter into a decision.

**Eleven tracks.** Two per level — an A theme and a B theme sharing a key and a four-bar hook,
handed over at an area boundary — one shared `boss` theme for the six minibosses and mid-bosses,
**one theme per level boss**, and the diegetic hold muzak.

**The level-boss themes are the level's own B theme, escalated.** The dredger's is GUTTER GHAT
at boss tempo with the hook screaming; Birju's is THE 22:40 SOUTH taken to double time; Sir's is
the office melody — which is the hold muzak — played huge and furious. Three climaxes that sound
like the places they happen in beats three unrelated boss tunes, and it costs nothing extra to
prompt: you describe the phrase you already wrote.

That also gives the shared `boss` theme a job: it becomes the *signal* that a fight is a fight
and not a wave, which makes it meaningful when a level boss arrives and something else plays. Each level document carries its own prompts at the end. Two areas have no
music at all: the drain and the fire stair stop the track dead and leave dripping water or wind,
which is the loudest thing in a beat 'em up and it is free.

Wiring is two small edits: `SLOTS` in `js/audio.js` grows from
`['lair', 'title', 'stage1', 'boss', 'ending']` to the nine names, and a stage gains an optional
`musicB` plus a handover x that `main.js` checks alongside the wave gates — 5000 at the drain,
4600 at the running jump, 2800 at the lift. `audio.music()` is already a no-op when the slot is
unchanged. A slot with no file falls back to the chiptune, so adding names breaks nothing.

**Loop cleanly** — `<audio>` plays with `loop = true`, so trim to a bar-exact loop; a fade-in is
worse than useless when the game cuts in mid-scene. **Leave 2–5 kHz alone**, where the punches,
the parry clash and the voice lines live. Export mp3 at 128–160 kbps into `audio/` and name the
slot in `audio/manifest.json`; `"silent": true` only suppresses the chiptune fallback.

**Make `stage1a` and `boss` first** — together they cover the whole of the first playable level
up to its bosses, and they tell you whether the palette is right before you commission seven more.

Clearing a stage unlocks both of its tracks in the lair's jukebox — three by the
end, one per stage, with the boss track shared. `audio.tracks()` gains an unlocked set persisted next to `unlockedStage`; locked rows show
greyed with their stage name rather than hiding, because a locked row you can see is a reason to
go back out. Two notifications: a `NEW TRACK — <title>` card on the STAGE CLEAR tally beside
the relic, and a NEW badge on the hi-fi until it has been played once, matching the existing
`TAKEN FROM <boss>` card in `drawHubUI`.

**Checks to write with it:** `super-costs-its-segments`, `super-wheel-slows-time`,
`super-locked-until-relic`, `only-two-supers-equipped`, `reversal-consumes-one-segment`,
`super-never-health-gated`, `track-unlocks-on-clear`.

---

## Build order

**Ship stage 1 alone, complete, at lair quality, before stage 2 exists.** A finished fifteen
minutes with a hub around it is a real game you can put in front of someone; three half-built
stages is not. Inside that:

1. **Stage 1, the market half** — the wave plan, Pappu's chalk circle, Langda's wire and brackets, the
   three new enemies, the bull and the runner. The plate already exists, so this is the
   cheapest stretch in the chapter and the one that proves the new systems.
2. **The systems** — segmented meter, the wheel, the reversal, relic equipping, soundtrack
   unlocks, and the two shared mechanics every later area needs: **friendly fire on reds** and
   **arena overrides** (the chalk circle, the corridor squeeze and the shrinking roof are one
   feature wearing three hats).
3. **Stage 1, the river half** — the water first, because it is that half's whole identity, then the enemies, then
   the dhobi, then the dredger.
4. **Stage 2** — the station crowd, then the window scroll layer and the lurch first, for the same reason, then the
   corridor cast, the TTE, the roof, Birju.
5. **Stage 3** — the flood and the lifts, then the priority cast, the Inspector, then Sir's two
   phases and the rain.

**Production rule: minibosses are cheaper than bosses.** A miniboss is one sprite family —
idle, walk, attack, signature, hurt, down. A boss gets that plus grab, slam, a rage set, a
portrait, a relic and an intro. Do not let a miniboss quietly grow into a boss.

## Not this time

On the shelf, in rough order of how much I want them: **the wedding** (a DJ whose bass drop
staggers the lane on a beat — the strongest colour break the chapter could get), **gully to
floodlights** cricket (a bowler is a reflect projectile at speed, a parry rhythm nothing else
has), **Seelampur e-waste**, **the mela** (crowd as terrain, the entourage as the health bar),
**the film set**, and **the akhara** (no projectiles at all — pure spacing, poise and grabs).

---

# Canon

Everything below applies to every stage, and to whatever country the tour visits after India.

## CHAD

Wandering action hero, 96 logical px tall, blond flat-top, aviators, black leather vest, blue
jeans, heavy boots. He travels because fighting is the only honest language he believes every
city understands. He is not a policeman, a mercenary or a chosen saviour: he notices a bully
blocking the road, refuses to pay, and follows each retaliation until he reaches whoever
ordered it.

His personality is communicated through **action, never dialogue**: he arrives already smoking,
takes his time dismounting because the street crew is not a threat, cracks his knuckles and
settles into guard, and when left idle he smokes, adjusts his shades, flexes or cracks his
knuckles. He is ridiculous but never cowardly, cruel, or confused about why he fights.

**Tone rules.** Muscular action-comedy with sincere arcade spectacle — committed, never ironic.
Bosses are personalities whose job, territory and mechanics tell the same story. The city is a
place with texture, weather and machinery, not an exotic backdrop. Comedy comes from
confidence and escalation, not from interrupting the action with dialogue.

## The combat language

**The five-hit combo.** Press attack to begin, press again around each confirmed contact to
buffer the next. Hit-stop preserves buffered inputs, so the player follows the impact rhythm
rather than counting frames. The five contacts rise in commitment and damage and the last one
launches. A whiff cannot fast-cancel, which is what stops safe button spam.

**Parry and evasion — the four classes.** Green melee: hold parry to counter and stagger. Green
projectile: hold parry to reflect it at its source. **Red: unblockable — move.** Hazard:
control the arena and stay off the affected ground. A successful parry gives the clash sound,
brief hit-stop, a short slow-motion tail, meter, and an immediate offensive cancel; holding the
stance is free, releasing it has a punishable recovery.

**Crowd composition.** Waves mix functions rather than stacking health. Front line: GOONDA,
RIOT, BHAI, COOLIE. Reach and denial: BATTA, NAAV, DRUM, KYC. Above or behind the lane: MANJA,
UPPER BERTH, COOKER, CHAIWALA. Disruption: BANDAR, MUDLARK, INTERN, CHAIN PULLER. Support:
TEAM LEAD. Two pressure slots (three once a wave is four or more) keep a six-body arena
readable, and orbit behaviour keeps them distributed.

**Environmental combat.** Arena edges wall-splat and bounce bodies back into play. Airborne
enemies stay hittable through a damage-scaled juggle. Launched bodies collide with other
enemies. Breakable props are the health economy and make each screen spatially distinct. Stage
ambience reacts to heavy impacts.

## Cinematic direction

**The hero entrance** stays slower than gameplay and plays a complete character beat: the
motorcycle arrives with CHAD already smoking, he takes a puff, dismounts through a
scale-matched transition, cracks his knuckles, the audio-only line plays, and he settles into
the exact gameplay guard scale before control begins.

**Every boss reveal uses something unique to its stage** — Langda dropping onto a stall roof
with your fare meter round his neck, the dredger's bucket swinging into frame before anything
else does, the TTE's torch coming down the corridor,
Birju's silhouette against the loco headlight, the Inspector's desk lamp and the beacon
sweeping past, Sir's floor going dark one bay at a time while every phone on it rings. A
generic walk-on must never replace these.

**Voice is sparse punctuation**: an entrance statement, a first-wave challenge, a few boss or
stage reactions, and major victory beats. Clips never overlap, never repeat every wave, and the
spoken entrance line is never printed on screen.

## Production rules

- One fixed scale across an animation family; calibrate on a standing pose, or on the crown of
  the skull when the family has no standing frame.
- No artificial outline added in processing; hard alpha with chroma despill so no green fringe
  survives.
- Fists, weapons, feet and faces stay present and readable in **every contact frame**.
- Ground anchors stay stable unless the move deliberately leaves the ground.
- AI sheets are source material; the processed frames in `assets/frames/` are the production
  assets, and nothing in `assets/ai/` is ever loaded by the game.
- Every new animation family is checked in the Asset Lab at real timing and frame by frame
  before it is called done.
- **No decorative full-body NPC cutouts.** Life comes from architecture, weather, props, light,
  particles and animals — and from a small number of actors who are actually doing something.

## Environmental story language

The chapter should read even with the sound off and no dialogue at all:

| Motif | Meaning |
|---|---|
| stolen fare meters, cut wires, fruit taken off every stall | Langda taxing the street |
| chemical drums, foam, dredged sand | the dredging operation on the river |
| couplings, chains, sealed freight, sidings | Birju moving the takings south |
| headsets, monitors, framed novelty cheques | Sir's floor, and what it actually sells |
| barricades, lathis, a beacon inside a private lobby | the protection all four of them pay for |

Repeated evidence — a matching stamp, a crate marking, the same phone symbol — connects the
four operations before any story scene exists.

## Progression and replay

The campaign starts with stage 1 unlocked; clearing a stage unlocks the next and sends a relic
home. Left and right on the title screen select any unlocked stage. Sequential play preserves
meter and partially heals; replaying an unlocked stage starts a fresh run state. **Difficulty
comes from more demanding compositions and mechanics, never from more enemy health.**

`final: true` belongs on stage 3. Without it, clearing the last stage never reaches the ending and
the lair's relic loop never closes.

## Canon and change control

Stage structure, boss order, the roster and the combat roles above are **current canon**.
Connective story clues and the final departure image are working direction, not yet
implemented. New ideas go in a stage document's open questions first and are promoted into canon
when built or explicitly approved. **When the code and these documents disagree, reconcile both
in the same change** — this repo has already been bitten by a document describing behaviour the
code had dropped.

## Implementation references

`js/stages.js` stages and waves · `js/player.js` combat and supers · `js/enemies.js` roles and
AI · `js/bosses.js` boss identities and the pattern library · `js/screens.js` entrance, title
cards, boss reveals, ending · `js/audio.js` music and voice slots · `js/hub.js` the lair ·
`lab.html` frame-by-frame review · `review-lair.html` production reviewer
· `assets/frames/manifest.json` the sprite manifest.
