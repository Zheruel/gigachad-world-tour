# GIGACHAD: WORLD TOUR

A browser-based 2D beat ’em up built with plain JavaScript, Canvas 2D, and ES modules.
There is no bundler, framework, or runtime dependency. The game renders a 480×270
logical scene to a 960×540 canvas.

The current build contains:

- THE LAIR, a 1920-logical-pixel home base with interactive fixtures and ambient life;
- one production act, DIRTY DELHI, spanning 26 screens;
- CHAD’s five-hit combo, run, jump, parry/counter, juggles, wall splats, quick get-up,
  and METEOR LARIAT super;
- a complete scripted verification suite and visual review tools.

Future acts described in `docs/` are design proposals, not shipped content.

## Run

```sh
./.venv/bin/python tools/serve.py 8001
```

Open `http://localhost:8001`. A static HTTP server is required because the game uses ES
modules and JSON manifests. The project server disables caching and supports byte ranges
for audio.

## Controls

| Input | Action |
|---|---|
| Arrows / WASD | Move, including depth lanes |
| Double-tap left/right, then hold | Dash into a run |
| Z / J | Attack and continue the combo |
| X / K | Jump; attack in the air for a jump kick |
| Hold C / L | Parry green attacks and projectiles |
| Space / V / B | Spend full meter on METEOR LARIAT |
| Z or X while down | Buffer a quick get-up |
| F | Use a lair fixture |
| P / Enter / Esc | Pause; Esc closes an open lair panel first |

Standard gamepads are supported.

## Verify

The browser automation modes write their result into `document.title`.

| URL | Purpose |
|---|---|
| `/?auto=verify` | Full deterministic gameplay and lair test suite |
| `/?auto=soak` | 50,000-frame stuck-entity stress test |
| `/?auto=bot&stage=0` | Automated full-stage balance run |
| `/?auto=hub-lounge` | Open the lair at the couch |
| `/?auto=play`, `combat`, `boss`, `clear`, `ending` | Screenshot/debug states |

After gameplay changes, run `/?auto=verify` and confirm every title entry starts with
`PASS:`. For JavaScript or Python changes, also run:

```sh
git diff --check
node --check js/<changed-file>.js
./.venv/bin/python -m py_compile tools/<changed-file>.py
./.venv/bin/python tools/audit_repo.py
```

## Visual review tools

- `lab.html` — character scale, animation, stage, effects, and ambience inspection.
- `review-1-1.html` — production review for the complete DIRTY DELHI route.
- `review-lair.html` — isolated lair systems and fixtures.
- `review-animation-pipeline.html` — frame-by-frame tiger, couch, and baitfish pipeline
  comparison.
- `sfxlab.html` — sound-effect slot audition.

The settled image-animation workflow is documented in
[`ANIMATION_PIPELINE.md`](ANIMATION_PIPELINE.md). It supersedes the old blanket rule that
every animation should be generated as one sheet.

## Architecture

The game uses a shared mutable context `G` from `js/engine.js`. Modules operate on that
context instead of importing one another in cycles. `js/main.js` owns the fixed-step loop,
state machine, camera, world draw order, wave gating, debug API, and verification suite.

Important contracts:

- World coordinates are logical pixels; authored art uses `RS = 2` device pixels per
  logical pixel.
- Fighters, props, and ambient actors are duck-typed and y-sorted together.
- Missing art and audio must degrade to procedural or silent fallbacks.
- Locomotion frames register on stable torso mass, not moving feet.
- A multi-frame family uses one scale and one shared palette.
- Simulation changes happen in update functions, never draw functions.

### Runtime modules

| File | Responsibility |
|---|---|
| `js/main.js` | Loop, states, waves, camera, debug and tests |
| `js/engine.js` | Shared state, constants, arena and ballistics |
| `js/player.js` | CHAD movement and combat state machine |
| `js/enemies.js` | Enemy AI, damage, poise, grabs and movement |
| `js/bosses.js` | Boss definitions and shared boss state machine |
| `js/stages.js` | Stage definitions, plates, routes and ambience hooks |
| `js/hub.js` | THE LAIR, fixtures, tank, couch, tiger and suite |
| `js/hubpanels.js` | Map, trophy, and hi-fi panels |
| `js/aiframes.js` | Processed character-frame manifest loader |
| `js/assets.js` | Runtime PNG asset registry |
| `js/sprites.js` | Pixel drawing, art scaling, font and fallbacks |
| `js/props.js` | Breakables and authored pickup drops |
| `js/shots.js` | Projectiles and persistent hazard zones |
| `js/effects.js` | Particles, hit effects, smoke, shake and hit-stop |
| `js/story.js` | Motorcycle arrival sequence |
| `js/audio.js` | Music, sample slots and synthesized fallbacks |

## Asset layout

| Path | Status |
|---|---|
| `assets/`, `assets/frames/`, `assets/lair/`, `assets/stages/` | Runtime-ready, tracked assets |
| `assets/experiments/animation_pipeline/` | Current comparison sources, outputs and metrics |
| `assets/ai/` | Ignored raw generations; never loaded at runtime |
| `assets/qa/` | Ignored, reproducible QA output |
| `assets/_archive/` | Ignored local archive |

Do not add generated caches or rejected iterations to runtime directories. Keep one
selected source, the deterministic processing recipe, the final runtime output, and any
small comparison set that still has an active review page.

## Documentation

- [`ANIMATION_PIPELINE.md`](ANIMATION_PIPELINE.md) — how to generate and process animated
  art.
- [`CLAUDE.md`](CLAUDE.md) — concise repository rules for coding agents.
- [`docs/README.md`](docs/README.md) — status and purpose of design documents.
- [`docs/stage1-dirty-delhi.md`](docs/stage1-dirty-delhi.md) — production act design.
- [`docs/india-chapter.md`](docs/india-chapter.md) — broader chapter canon and roadmap.

## Current gaps

- Only Act I is in production; later act documents are proposals.
- Most music slots are placeholders.
- The imported SFX mapping still needs a full by-ear review in `sfxlab.html`.
- Raw AI sources are intentionally local and large. Prune them only after confirming the
  selected source and prompt are preserved.
