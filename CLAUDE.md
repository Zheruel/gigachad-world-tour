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
- `?auto=hub[-<fixture>]` — THE LAIR. Bare, or a fixture id from `FIXTURES` in `js/hub.js` (`hub-bar`, `hub-tank`, `hub-trophies`, `hub-lounge`, `hub-map`, `hub-hifi`, `hub-curl`, `hub-bench`, `hub-mirror`) to park CHAD there and trigger it, plus `hub-bag` (mid-punch) and `hub-window` (the bag against the sunset). `&unlocked=N` sets how far the tour has got, which drives the relics on the shelves, the locked acts and how dark the window is.
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

**THE LAIR (`js/hub.js`) is a stage with no waves**, 1440 logical px wide. `HUB_STAGE`
goes through `initStageObj()` like any other, so the camera, arena walls and y-sort come
for free. Its furniture is *not* in `G.props`: fixtures are drawn in the wall plane
inside `drawHubWall` (before `drawWorld`, so CHAD always occludes them) and are
therefore not combat targets. Only the heavy bag is a real prop; the dog and the tiger
are `G.actors` entries, which are anything that draws itself and y-sorts — give one a
`y` getter and a `draw(ctx, camX)`.

**Its glass is a hole.** `tools/build_lair_wide.py` stitches three generated panels and
keys the chroma-green window out of the plate, so the city shows through as TWO layers
at different parallax (`bg_lair_sky_far` at 0.20, `bg_lair_sky_near` at 0.42) with
`lairCity()` painting the sun, mast beacons, lit windows and an airship between them.
`drawStage` grew an optional `skyLayers` list for this — each entry is a tiling plate at
its own parallax or a draw hook — and any stage can use it.

The **mullions over that hole are painted, not generated**: `rebuild_window()` in the same
tool finds the opening from the alpha and repaints it as five tall bays. The generator drew
a 9x4 cage of 5px bars and panel B's grid did not line up with panel C's; a grid of black
rectangles is geometry, and geometry is cheaper to paint than to ask for. It repaints the
floor's reflection of those bars too, or the granite goes on reflecting the old window.

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
- `tools/serve.py` must serve byte ranges: an `<audio>` element sits at `readyState 0` forever, with no error raised, on a server that answers `Range` with the whole file.
- The SFX slot mapping in `audio/sfx/manifest.json` was matched by acoustic analysis and **has not been verified by ear** (`sfxlab.html`).
