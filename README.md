# GIGACHAD: WORLD TOUR

A 2D side-scrolling beat 'em up in the Streets of Rage 2 / Final Fight tradition.
You are **CHAD** — a Nordic gigachad in a cut-off leather jacket and aviators who
has decided to fight his way through every city on earth. Not for money, not for
glory. For the love of the game.

Stop one: **Chandni Chowk, Old Delhi.**

Plain HTML5 + JavaScript (canvas 2D, ES modules). Zero dependencies, no build
step. 960×540 buffer driven from a 480×270 logical space — true 16:9, so it
fills a browser window, and every sprite carries twice the detail of a 16-bit
sheet while the gameplay math stays in classic units. Character and background
art is AI-generated pixel art processed into game frames. Hit sounds are the
real Streets of Rage 2 samples.

**World scale rule**: a fighter is 1.8 m and reads ~80-96 px tall (CHAD is 96), the facade band
is 181 px for a ~3.5 m street front, so ~50 px = 1 m. Sprite heights, hit ranges
and background crops are all derived from that — it is what makes the street sit
right around the characters.

## Run it

```
./.venv/bin/python tools/serve.py 8000
# open http://localhost:8000
```

`tools/serve.py` is `http.server` with `Cache-Control: no-store`, so an edited
module is picked up on reload. It also serves byte ranges over HTTP/1.1 on a
threaded server, which stock `SimpleHTTPRequestHandler` does not — an `<audio>`
element will not load at all from a server that answers a `Range` request with the
whole file. Any static file server works otherwise, as long as it does ranges (one
is needed so ES modules and the manifests can be fetched).

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Move (including up/down depth lanes) |
| Double-tap ← / → | Dash — **keep holding** the direction to break into a run |
| Z / J | Attack — tap again on each landed hit for the five-hit combo |
| Z while running | Shoulder tackle |
| X / K | Jump (press Z in the air for a jump kick) |
| Hold C / L | **Parry stance** — counter green melee attacks and reflect green projectiles; releasing has recovery and red attacks must be dodged |
| **Z or X while knocked down** | **Quick getup** — buffered, so you can press it mid-launch |
| **Space** (V / B on alternate layouts) | Spend a full blue meter on the gameplay-cinematic **METEOR LARIAT** super |
| While held | Mash Z to break out |
| P / Enter | Pause |

A gamepad works too (standard mapping: A attack, B jump, X parry, Y/RB/RT
super, Start pause, d-pad or left stick to move).

## The India chapter

| | |
|---|---|
| **Act 1 — Bazaar Heat** | Motorcycle arrival and a long market run ending with **RICKSHAW RAJA** |
| **Act 2 — Gutter Ghat** | Drain-side alleys and food stalls ending with **MIRCHI** at his breakable cart |
| **Act 3 — Refund Tower** | A grim service-office district ruled by **MR. REFUND** |
| **Act 4 — Blue Line Lockup** | Police barricades and station streets ending with **INSPECTOR YADAV** |
| **Act 5 — Iron Monsoon** | A storm-lit fort approach and the chain-wielding final boss **COMMANDER RANA** |

The Act 1 entrance is played as a full cinematic: CHAD rolls in with a lit cigar,
takes two puffs, dismounts through a clean scale-locked match cut, cracks his knuckles,
flexes, and settles into guard while the real 4.736 s voice clip plays. The line is
audio-only; it is not printed on screen. The clip lives at
`audio/voice/duke_out_of_gum.wav` and is sourced from the WavSource Duke Nukem archive.

This is a five-act chapter rather than a single concept arena. Each act has
its own long scrolling route, wave composition, palette, environmental motion and a
level-specific boss reveal. Cleared acts unlock on the title screen and health is partly
restored between them while meter carries forward.

**The crew**

| Enemy | Role | What it does |
|---|---|---|
| **GOONDA** | grunt | Vest and lungi street thug. Wild haymakers, comes in threes |
| **BATTA** | reach | Cricket bat. Slow, telegraphed arc that knocks you flat |
| **MASALA** | ranged | Lobs chilli powder that **blinds** you, then backs out of punching range |
| **BANDAR** | fast | Delhi macaque. Leaps at your head, low profile, and **steals your pickups** |
| **PEHLWAN** | heavy | Oiled akhara wrestler. **Poise armour** and a bear hug you mash out of |
| **RICKSHAW PUNK** | charger | Commits to a fast lane charge that is dangerous to spam into |
| **CONSTABLE** | guard | Controls space with a lathi and blocks careless frontal pressure |
| **OPERATOR** | support | Stays behind the line and throws reflectable phones |
| **CHAIN SEPOY** | elite | Fast chain pressure plus a red, heavily telegraphed power swing |

**MIRCHI** fights from behind his chaat cart: burning samosas that leave a fire
patch, a green chutney puddle that **poisons** you, a pressure-cooker steam jet,
and a charge behind the cart. The cart is a real breakable prop — smash it
mid-charge and he loses that move for the rest of the fight.

**YADAV** has a long lathi thrust, a spinning low sweep you have to jump, a
tear-gas canister that leaves a poison cloud, and a whistle that brings two
constables running. At 50 % he throws off the cap and shirt — **"OFF DUTY"** —
and speeds up.

## Combat

The whole point of this build. Ordered by how much it changes the feel:

- **Arena walls + wall splat.** The old build let bodies slide 30 px off-screen,
  so anything you knocked away had to *walk all the way back* before it was
  fightable again — the single worst thing about SoR2. The screen edges are now
  solid. A body driven into one takes bonus damage, bounces back into play, and
  stays hittable. `clampToArena()` in `js/engine.js`.
- **Juggles.** Airborne bodies stay hittable, with damage scaling 100/80/65/55/50 %
  per hit and a 4-hit cap, after which hits still land but stop lifting so the
  body drops out. You cannot stomp someone lying on the floor.
- **Quick getup, buffered.** Tap attack or jump *at any point* during a knockdown
  and you rise the instant you land, with i-frames. Demanding a late press would
  leave almost no window — you spend most of a launch in the air.
- **Run.** Hold the direction out of a dash to keep running, with a shoulder tackle.
- **Cancels on hit-confirm.** Jab and hook recovery cancels into dash or jump, but
  only when the hit landed. Whiffs pay full recovery.
- **One flowing five-hit combo.** Each contact has its own timing window and buffers the
  next press through hit-stop, moving from probing straights into power hooks and a
  clearly silhouetted finisher without returning to guard. A whiff pays full recovery.
- **Held parry/counter.** Hold the stance to automatically counter green melee
  attacks or reflect green projectiles. Releasing has a short vulnerable recovery;
  red telegraphs remain unblockable and must be dodged.
- **Poise instead of invisible armour.** Heavies drain a visible pip meter and
  break with a clash, so they read as "still coming" rather than "ignoring you".
- **One authored gameplay-cinematic super.** At a full meter, Space triggers **METEOR
  LARIAT**: a target-tracking shoulder rush, body blow and crowd-launching finish. The
  camera stays in the stage, with no flashing cutaway, and the move is never health-gated.
- **Damage-scaled hitstop**, directional sparks, screen shake, impact flash.
- **Enemy group AI** that orbits to spread across the arena instead of bunching, two
  simultaneous attackers (three once the wave is four or more), and enemies that
  run in from just inside the arena edge rather than trudging on from off-screen.

Status effects (**poison**, **blind**) are a shared system used by MASALA, MIRCHI
and YADAV, not one-offs.

## Animation

Every action is multi-frame; a single-pose attack reads as a pop rather than a punch.

**Stance.** Idle, walk and run all hold the same loose boxing guard that the jab starts
from. Streets of Rage and Final Fight do this for a reason: 2D sprites do not blend, so
the pose match *is* the transition. Without it, walk→punch pops no matter how many
frames you throw at it. CHAD's arrogance lives in the idle animations instead.

**Chaining.** The complete combo is assembled from two identity-locked generated sheets
and a hand-selected finishing sequence. Every hit has `hitAt` and `cancelAt` beats. With
a hit confirmed and another press buffered, the chain advances at that beat rather than
restarting from guard. Presses are counted, not collapsed to a boolean, so hit-stop
cannot eat a fast input. A whiff still pays full recovery.

**Scale lock.** Every sheet is calibrated from a neutral standing pose, never from a
crouch or launch silhouette. The combo's second sheet previously used its crouched first
frame as the reference and enlarged that whole half of the chain. It now uses frame 8,
while the motorcycle sequence uses the same 178-device-pixel standing silhouette as the
normal idle. The parked bike is separated from CHAD so the cigar and flex use canonical
gameplay frames.

**Registration.** Locomotion frames are anchored on the **torso**, not the lower body.
Anchoring a walk cycle on the legs makes the torso swing side to side as they alternate;
measured on CHAD's cycle that was 6 logical px of wobble, which is exactly what reads as
a waddle. Torso-anchored it is 0.4px. `TORSO_ANCHORED` in `js/aiframes.js`.
`assets/frames/anchors.json` holds per-frame hand nudges for anything left over.

**Stride.** `WALK_STRIDE` and `RUN_STRIDE` are measured from the distance between the
feet in the contact poses, so the planted foot does not skate.

- CHAD: **8-frame walk**, **6-frame run**, two linked **8-frame power-combo sheets**,
  **8-frame parry/counter**, two-part RAGNAROK body animation, plus four idles.
- Enemies: 4-frame walk, 3-frame attack (wind-up / strike / follow-through), 2-frame
  hit reaction — a punch feels weak when the victim barely moves.
- Bosses: 3-frame punch and slam, 2-frame hit reaction.

Animation is chosen from **how far a body actually moved this frame**, not from the name
of its AI state. Enemies drift in depth, back off and sway while nominally `idle`, and
playing the standing frame through that is what reads as sliding. Measuring after the
arena clamp also stops the legs cycling while walking into a wall.

## Sprite sheets, not single frames

Every animation is generated as ONE sprite sheet and sliced (`tools/gen_sheet.sh`,
`tools/slice_sheet.py`), not as a folder of independently generated poses. Asked one
pose at a time, the model re-invents the whole body every time; asked for the row, it
lays them out as a set the way an artist would. Measured on CHAD's jab, the share of
leg pixels changing between consecutive frames went from 61% to 15%, and the idle from
39% to 1% - that jitter, not the frame count, was why the walk and punches never
looked smooth.

Two things the sheet approach needs on top:

- `tools/normalize_sheets.py` - sheets are internally consistent but nothing makes two
  different sheets agree on character size, and `process_char.py` applies one scale to
  a whole character. Each sheet family is rescaled by a single factor measured off its
  standing pose, which fixes the mismatch without disturbing the within-sheet
  consistency that made sheets worth using.
- `tools/process_ambience.py` - keys the generated cloth, fan and cinematic-impact
  sheets into runtime frames used by the stage and RAGNAROK.

## The living street

There are no decorative full-body background NPCs in the runtime. They repeatedly read
as pasted-on actors and competed with the combat silhouettes, so the stage now gets its
life from the environment itself: independently phased laundry and awnings, ceiling
fans, lamp flicker, drifting spice and dust, embers, steam, storm light, foreground
sway and pigeons that scatter. Punches, knockdowns and RAGNAROK send a proximity reaction
through these systems, so the scenery responds without putting fake bystanders behind
the fighters. `js/ambience.js` owns the loops and `reactStage()` impulse.

## The foreground

The stage had nothing at all in front of the fighters, which is most of why it read as a
painting the fight happened against rather than a street it happened inside
(`js/fg.js`, `stage.fg`). Two bands, with the middle deliberately empty: hanging wires,
tarpaulins, marigold garlands and shop banners above the action, where fighters never go;
crates, bins and a bicycle below it, based off the bottom edge so they occupy only the
last ~15 logical px in front of the near depth lane. Anything across the middle would
hide the fight.

They are graded *down* rather than matched — `tools/process_fg.py` targets roughly half
the backdrop's exposure, because "closer" reads mostly as darker and flatter. Parallax is
1.14×: enough to separate them from the wall, little enough not to look like a mistake.

## Stage seams

`build_wall` colour-matches every panel to a shared target — the mean is averaged so
exposure and temperature line up, the spread targets the punchier end so plates are not
flattened to the dullest one — then lays them at a pitch of `panel_w - overlap` and
cross-fades the shared band. The previous version butted panels edge to edge and then
*darkened* the join, which drew a bar exactly where the cut was.

There is deliberately **no rim light** on this stage. It exists to separate dark
fighters from dark walls; over a warm daylit market it just paints a yellow halo.
CHAD is also processed without the pipeline's optional silhouette outline.

## Breakable props

`G.props` — crates, clay matka pots, tyre stacks, a chai-stall table, hanging
signs, and MIRCHI's cart, each with an intact and a wrecked
sprite. Props are duck-typed like fighters (they expose `hurt()`), so `player.js`
hits them through the same target list and `main.js` y-sorts them with everything
else. No special-casing in the combat code. Authored crates, tables, and carts are
the only source of health; enemies never drop pickups. Art is
generated (`tools/gen_props.sh` → `tools/process_props.py`), with the procedural
pixel-art build in `js/props.js` kept as a fallback.

## Audio

**Sound effects are the real Streets of Rage 2 samples** (`audio/sfx/*.wav`),
decoded once into `AudioBuffer`s and played through the existing gain graph, with
a slight random detune so a combo does not sound machine-gunned. Every slot falls
back to the built-in synthesized version if its file is missing.

The rip ships numbered, not named. The slot mapping in `audio/sfx/manifest.json`
was matched by acoustic analysis (duration, attack time, spectral centroid,
low/high energy split) — **it has not been verified by ear**. Open `sfxlab.html`
to audition every slot against all 103 source sounds, fix any that are wrong in
the manifest, and run `tools/build_sfx.sh` to rebuild.

Music is **mostly off**: `audio/manifest.json` has `"silent": true`, which plays
nothing rather than falling back to the chiptune. That flag only gates the chiptune
fallback — a slot with a real mp3 in it still plays, which is how THE LAIR has
`neon_shadows.mp3` while the rest of the game stays quiet. Drop an mp3 into a slot
and it plays, no code change; remove the flag to get the chiptunes everywhere else.

## Feature checklist

- [x] 960×540 buffer (480×270 logical × 2), 16:9, fills the browser window
- [x] 60 fps fixed-timestep loop with delta accumulator
- [x] Depth-based movement (x / depth-y / jump-z), y-sorted drawing, shadows, reflections
- [x] Camera scroll with wave gating: trigger zones lock the screen, `GO →` sign on clear
- [x] **Arena walls with wall-splat bounce** — nobody ever walks back on from off-screen
- [x] **Juggle system** with damage decay and a hit cap
- [x] **Buffered quick-getup**, run + tackle, hit-confirm cancels
- [x] Flowing five-hit one-button combo; held parry/counter with green/red cues
- [x] **Enemy poise** with visible pips and a clash on break
- [x] **Breakable props** (`js/props.js`) that y-sort, provide authored health drops and can be bowled into
- [x] **Status effects**: poison (DoT + green tint), blind (stagger + orange tint)
- [x] **Lingering floor hazards** (`js/shots.js`): chutney puddles, tear gas, fire
- [x] **Idle animations** — CHAD lights a Cuban cigar, adjusts his shades, flexes, cracks
      his knuckles. Fire after ~4 s idle, cancel instantly on any input
- [x] One full-meter gameplay-cinematic super: **METEOR LARIAT** (Space / V / B)
- [x] Combo counter with rank popups (NICE / BRUTAL / SAVAGE / WORLD CLASS / GIGACHAD)
- [x] Five long India acts, 9 enemy types and 5 bosses on a shared pattern state machine
- [x] Boss enrage at 50 %: palette shift, faster patterns, quote popup
- [x] **Living background without NPC cutouts**: reactive cloth, fans, lamps, dust,
      embers, steam, lightning, foreground sway and pigeons that scatter as you pass
- [x] Motorcycle chapter entrance and five distinct, level-integrated boss cinematics
- [x] **Foreground layer** (`js/fg.js`): wires, tarpaulins, garlands and banners above the
      action, crates and bins below it, at 1.14x parallax
- [x] Full procedural pixel-art fallback for the whole street if the PNGs are missing
- [x] Chiptune engine + **real SoR2 sample bank** with per-slot fallback
- [x] Screens: animated title, stage intro, bespoke boss cinematics,
      stage clear tally, credits ending with rank, game over with continue countdown
- [x] Custom 3×5 bitmap font
- [x] Gamepad support, `window.__game` debug hook, scripted headless test suite

## Headless verification / debug

- `index.html?auto=verify` runs the scripted suite (movement, the five-hit combo,
  juggle scaling, wall splat, prop destruction, poison, blind, quick-getup, run,
  idle animations, parry/counter, poise, Meteor Lariat, bear-hug escape,
  wave gating, death/respawn, all five acts and bosses, ending,
  game over) and writes `PASS:name` / `FAIL:name` into the page `<title>`.
- `index.html?auto=soak` hammers every knockdown and enemy-hold path across 50k
  frames and reports any body that ends up frozen (`SOAK-CLEAN` when nothing sticks).
- `index.html?auto=bot&stage=0` is a balance harness: a naive bot plays the whole
  stage and reports pacing in the `<title>`.
- `?auto=play|arrival|jab|combo|parry|combat|super|boss|bossfight|clear|over|ending` steps the game
  into those states for screenshot capture.
- `lab.html` is the asset lab: ANIM plays sequences at real game timing and exposes
  every authored drawing in a frame-by-frame contact sheet (`,` / `.` step drawings);
  CAST, SCALE, STAGE, AMBIENCE, CONTRAST and EFFECTS cover the other visual checks.
- `review-1-1.html` is the Bazaar Heat production review room: scrub the complete
  route, jump between wave gates, toggle presentation layers, and inspect the exact
  Stage 1 cast and asset inventory.
- `sfxlab.html` auditions every sound slot against the raw rip.
- `window.__game`: `start()`, `stage(i)`, `press(a)`, `release(a)`, `step(n)`,
  `spawn(type,dx,dy)`, `skipToBoss()`, `hurtBoss(n)`, `setPlayerPos(x,y)`, `state()`,
  `G`, `BOSSES`, `STAGES`.

## Files

```
index.html        shell + canvas
js/engine.js      constants, shared context, ballistics, arena walls, juggle scaling
js/input.js       keyboard + gamepad, edge presses, double-tap dash
js/sprites.js     palette, pixel painter, bitmap font, blit/getFrame/rim, fallback sprite
js/stages.js      three-act India chapter: backgrounds, long waves, props, ambience
js/hub.js         THE LAIR: the 1440-wide penthouse, its walk-up fixtures, the bag, the tank, the pets
js/hubpanels.js   the screens those fixtures open: world map, sound test, trophy wall
js/props.js       breakable scenery: art, damage, debris, drops
js/player.js      CHAD state machine (move/run/five-hit combo/parry/RAGNAROK/status)
js/enemies.js     5 enemy types + AI + poise + wall splat
js/bosses.js      MIRCHI + YADAV + RANA and the shared pattern state machine
js/shots.js       projectiles + lingering floor hazards
js/effects.js     sparks, dust, afterimages, RAGNAROK crater, popups, shake/flash/hit-stop
js/hud.js         health, super meter, lives, score, combo, boss bar, GO sign
js/screens.js     title / intro / boss intro / clear / ending / game over
js/story.js       motorcycle arrival cinematic
js/ambience.js    reactive environmental animation (no background NPCs)
js/audio.js       chiptune sequencer + SoR2 sample bank + manifest swap
js/assets.js      PNG asset loader with null fallbacks
js/aiframes.js    manifest-driven AI frame loader (assets/frames/)
js/main.js        fixed-timestep loop, waves, camera, debug hook, test suites
lab.html          asset lab shell        js/lab.js   asset lab
sfxlab.html       sound-effect audition page
```

## Regenerating art

Raw AI generations live in `assets/ai/` (never loaded by the game). The game loads
processed files from `assets/` and `assets/frames/`. Image generation goes through
`codex exec` and its gpt-image tool; processing uses the project-local `.venv`.

| Tool | Does |
|---|---|
| `tools/gen_codex.sh` | one image: `gen_codex.sh OUT.png landscape\|portrait\|square "prompt" [ref.png]` |
| `tools/gen_chad_ref.sh` | 3 CHAD reference sheets — pick one as `assets/ai/ref_chad.png` |
| `tools/gen_chad.sh` | all 51 CHAD frames, generated against that reference |
| `tools/gen_cast_delhi.sh` | refs + frames for the 5 enemies, MIRCHI and YADAV |
| `tools/gen_delhi.sh` | the 5 market backdrop plates + floor plate |
| `tools/process_char.py` | the sprite pipeline: chroma key, **one uniform scale measured off the idle pose**, 1 px outline, **one shared palette** across every pose |
| `tools/process_chad.sh` | rebuild every CHAD sheet with shared scale/palette but **without** an artificial outline |
| `tools/process_delhi.sh` | run `process_char.py` over the whole Delhi cast, then rebuild the manifest |
| `tools/build_manifest.py` | rebuild `assets/frames/manifest.json` from whatever frames exist |
| `tools/build_bgs.py` | crop/stitch the plates into the wall strip + tiling floor (`delhi` job) |
| `tools/gen_lair_room5.sh` | THE LAIR's wall as four 480-wide panels — lounge, trophies, the view, the master suite — plus the city as a far and a near layer, two panels each so neither repeats across the 1920-wide room. Window bands are generated as flat chroma green; every object in the room is a sprite |
| `tools/build_lair_wide.py` | stitch those panels into the 1920-wide room, key every glass opening out to transparent, repaint each as tall bays, and band-crop the city layers |
| `tools/gen_lair_relics.sh` | one relic per boss for the trophy alcove, plus the weights corner |
| `tools/gen_lair_deco.sh` | the wet bar, humidor, oil portrait, bag chain and the foreground pieces |
| `tools/gen_lair_bedroom.sh` | the master suite's wardrobe, nightstand, fire and rug |
| `tools/gen_lair_bed_poses.sh` | the bed and its two occupants, one generation per pose against a fixed reference; `check_bed_poses.py` then measures whether each pose held the furniture still, and `check_bed_anim.py` checks the built frames for movement and flow |
| `tools/gen_lair_gym.sh` | the training area in front of the glass: the dumbbell rack and the bench press as four-pose strips (rig alone, then CHAD on it), plus the plate tree and kettlebells |
| `tools/gen_lair_pets.sh` | the shark and shoal for the tank, and the tiger's sheets |
| `tools/gen_lair_props.sh` | the lair's fixtures: world map, hi-fi, built-in humidor, the oil over the hearth, heavy bag, map panel |
| `tools/gen_lair_lounge.sh` | the sofa pair (empty / CHAD sitting smoking) and the dog's walk sheet |
| `tools/build_lair_extras.py` | the lair sprite sets whose frames must register with each other: the lounge pair, the two gym stations, the bed, the fire, the tiger and the tank |
| `tools/make_portrait.py` | crop a HUD portrait out of a reference sheet |
| `tools/build_sfx.sh` | rebuild `audio/sfx/*.wav` from `audio/sfx/raw/` using the slot map |
| `tools/serve.py` | no-cache dev server, with byte ranges so media loads |

The uniform-scale + shared-palette pass in `process_char.py` is what stops size
popping and colour drift between frames; check it in `lab.html` CAST mode, which
prints drawn height and feet offset per frame.

## Asset lab

`lab.html` **ANIM** mode replays the complete combo, motorcycle entrance, RAGNAROK and parry sheets alongside
timed sequences, so a stance pop or a sliding foot shows up there rather than
in play: timeline strip colour-coded by state, onion skin, a fixed centre line and body
centroid marker for registration, a contact-foot marker, and a stride check that lays the
cycle out one stride apart so a planted foot should line up. Arrow keys nudge a frame's
anchor and `S` saves it — `tools/serve.py` accepts `POST /save-anchors`.

**AMBIENCE** mode isolates the cloth and fan loops on the real stage. Its reaction button
applies the same combat impulse used by punches and supers, making amplitude, timing and
return-to-rest easy to inspect without playing through a wave.

## Not done yet

- Stages 2+ (Europe, Africa, the Americas). The stage schema, mid-boss/boss
  structure and asset pipeline are all in place for them.
- Music — currently chiptune placeholders in the `stage1` and `boss` slots.
- No ambient bed. A synthesised market murmur is filtered noise, which sounds like
  hiss rather than a street and would undercut the real music going in above it. The
  street's sounds are diegetic instead: the rickshaw horn and the cow only play while
  the animal or vehicle making them is on screen. A proper bed needs real ambience
  recordings.
- The SFX slot mapping has not been verified by ear (see **Audio**).
