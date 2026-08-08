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
- `?auto=hub[-<fixture>]` — THE LAIR. Bare, or a fixture id from `FIXTURES` in `js/hub.js` (`hub-bar`, `hub-tank`, `hub-trophies`, `hub-lounge`, `hub-map`, `hub-hifi`, `hub-curl`, `hub-bench`, `hub-mirror`) to park CHAD there and trigger it, plus `hub-bag` (mid-punch), `hub-window` (the bag against the sunset) and `hub-bed` (close enough to the master suite that they wake up and speak). `&unlocked=N` sets how far the tour has got, which drives the relics on the shelves, the locked acts and how dark the window is.
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

**When the plate already contains what you need, copy it — do not ask for a second one.**
The trophy wall needed a second niche (one held five relics; the tour wants three per
country). A niche is lit wood, brass rails and glass, so *generating* a matching one is
the panel-B-does-not-line-up-with-panel-C problem again. `clone_alcove()` copies the
pixels of the one the plate has into the dead bay next door, which is exact by
construction — both bays are bounded by the same panelling, so the two frame verticals
are the only alignment to get right (source 1248-1498, dest 955-1196, one resize). The
copy is **mirrored**: the wood grain and the baked lamp pools are the tell, and a flipped
niche reads as a matching pair rather than the same object twice. Verify the builder is
byte-reproducible (`md5` before and after a no-op run) before adding a step like this, or
you cannot tell your change from a drifting rebuild.

`RELIC_SLOTS` is then **niche-major, not shelf-major**: one shelf is one country, so a
row must not run across the pier between the niches. `?auto=verify` checks the wall holds
six countries and that no two slots on a shelf are within 30 logical of each other —
`drawAlcove` silently drops any relic past the last slot.

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
| title key art | `tools/gen_lair.sh` generates lair variants, `tools/build_title.sh SRC.png [TOP]` crops one to the 984x372 title band and pixelates it into `assets/title_art.png`; `tools/preview_title.py` composites it under the real scrims for checking |
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
