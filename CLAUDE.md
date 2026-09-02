# Repository guidance

This file contains current working rules only. Do not turn it into an implementation
diary. Put player-facing setup in `README.md`, animation-production decisions in
`ANIMATION_PIPELINE.md`, and long-form design proposals under `docs/`.

## Current product state

GIGACHAD: WORLD TOUR is a plain HTML5/Canvas 2D beat ’em up with ES modules, no build
step, and no JavaScript dependencies.

- Logical resolution: 480×270.
- Authored-art scale: `RS = 2`, producing a 960×540 canvas.
- Shipped content: THE LAIR, the 12,480-pixel DIRTY DELHI stage, and the 9,120-pixel
  NIGHT TRAIN stage.
- THE LAIR width: 1,920 logical pixels.
- Future acts in `docs/` are proposals, not runtime content.

Code is the authority when a design document disagrees with the implementation.

## Run and verify

```sh
./.venv/bin/python tools/serve.py 8001
```

Use the project-local virtual environment for Python. Do not install packages globally.

Required checks after gameplay changes:

1. Open `http://localhost:8001/?auto=verify`.
2. Read `document.title` and confirm every result is `PASS:*`.
3. Run `git diff --check`.
4. Run `node --check` on changed JavaScript files.
5. Compile changed Python tools with `./.venv/bin/python -m py_compile`.
6. Run `./.venv/bin/python tools/audit_repo.py` after asset or tooling changes.

Other useful modes:

- `/?auto=soak` — 50,000-frame entity-state stress test.
- `/?auto=bot&stage=0` — automated stage balance run.
- `/?auto=hub-<fixture>` — lair fixture setup.
- `lab.html` — general asset and animation inspection.
- `sfxlab.html` — audition every SFX slot against the Streets of Rage 2 rip.
- `review-animation-pipeline.html` — tiger, couch, and fish frame review.

`window.__game` exposes `start`, `stage`, `press`, `release`, `step`, `render`, `spawn`,
`skipToBoss`, `hurtBoss`, `setPlayerPos`, `state`, `G`, `BOSSES`, and `STAGES`.

## Architecture rules

- `js/engine.js` owns constants and the shared mutable context `G`.
- `js/bosses.js` runs the shared boss machine; a fight with its own mechanics lives in a
  per-act module (`js/delhi_bosses.js`) as hooks (`init/update/draw/onHurt/onEnrage/
  onDown/onDeath/intro`) and shares helpers through `js/bosslib.js`, never the reverse.
- `js/main.js` owns the fixed-step loop, high-level states, waves, camera, draw order,
  debug API, and verification suite.
- Systems should operate on `G`; avoid cross-module imports that create cycles.
- Entities are duck-typed. Props expose the same hittable contract as fighters.
- World simulation belongs in update functions. Draw functions must not mutate it.
- Draw order is load-bearing: plates, wall-plane fixtures, world actors, lighting,
  effects, foreground, then UI.
- Missing PNGs, frames, music, and SFX must fail gracefully to existing fallbacks.
- Music is `audio/manifest.json` slots; voice lines are optional named files listed in
  `audio/voice/README.md`. Add a line by adding a slot there, not by special-casing a path.

## Spatial and sprite contracts

- All gameplay measurements use logical pixels.
- `FLOOR_TOP` and `FLOOR_BOT` define the depth lanes.
- A fighter reads roughly 80–96 logical pixels tall.
- Processed AI art has `_as = RS`; use `blit`, `frameW`, and `frameH` instead of raw
  image dimensions.
- A frame family uses one scale, one ground line, and one shared palette.
- Locomotion registers on torso mass; moving paws are not anchors.
- `assets/frames/anchors.json` contains deliberate per-frame nudges.
- A missing authored pose must fall back to a valid sprite, never throw.

## Stage and lair contracts

- Add a stage through one `STAGES` entry in `js/stages.js` plus its processed assets.
- Keep `floorW`, stage width, and authored plate width in agreement.
- Fixtures painted into a plate are behind world actors. Interactive lair fixtures are
  wall-plane art unless they must participate in combat/y-sorting.
- A lair station uses `G.hubSeat` for occupancy and `G.hubStation` for its identity.
- `F` activates fixtures; vertical movement must remain available for depth lanes.
- Ambient behaviour should be autonomous or event-triggered, not repeatedly keyed to
  proximity.

## Asset and animation rules

Read `ANIMATION_PIPELINE.md` before generating or replacing animated art. The short
version:

- Large isolated actor: identity anchor, then a reference-conditioned sheet or selected
  video keyframes; register on stable mass.
- Actor touching furniture: generate key poses or individual midpoint edits, extract only
  the actor, and composite every frame over one canonical fixture plate.
- Tiny repeated sprite: generate one strong anchor and derive micro-motion in code. Never
  regenerate the whole body per frame.
- Smoke, embers, and similar effects use measured attachment points and procedural motion.
- Judge every result at final game scale and frame-step it before installation.

Raw generations belong in ignored `assets/ai/`. Runtime code loads only processed assets.
Do not commit generated QA caches, obsolete review exports, or multiple superseded
production copies.

## Tooling rules

- Use `./.venv/bin/python` for PIL/numpy tooling.
- `tools/serve.py` is the supported development server.
- `tools/process_char.py` enforces shared scale, ground registration, palette, and outline.
- `tools/process_props.py` sizes props, lair fixtures and stage ambience sprites from its
  tables; `tools/gen_d1_props.sh`, `tools/gen_d1_ambience.sh` and `tools/gen_d2_props.sh`
  are their generators.
- THE NIGHT TRAIN: `tools/gen_d2_plates.sh` generates the views (keyed views paint windows
  and sky chroma green), `tools/build_night_train.py` stitches them into the RGBA wall
  plate, `tools/gen_d2_cast.sh`, `tools/gen_d2_extra.sh` and `tools/process_d2_cast.sh`
  produce MANJA, the TTE, BIRJU, the COOLIE and the cow.
- `tools/rescale_strips.py` brings a strip that came back at the wrong scale onto its
  family's scale before `tools/process_char.py`; `tools/check_cast_scale.py` tells you which.
- `tools/patch_plate.py` blends an inpainted crop back into a plate; never hand-paste one.
- `tools/build_manifest.py` must run after character-frame changes.
- `tools/build_animation_experiments.py` rebuilds the current lair animation comparison.
- `tools/audit_repo.py` checks runtime references, stale tracked paths, and duplicate totals.
- `tools/video_to_sprite.py` treats video as a motion source, not a final sprite exporter.
- Generation scripts should use the current Codex/ImageGen path. Do not add hard-coded
  third-party plugin paths or expiring remote asset URLs.

## Change discipline

- Preserve unrelated user changes in a dirty worktree.
- Prefer small, named sources of truth over copied constants.
- Delete an asset only after proving it is not loaded and not required by the current
  reproducible pipeline.
- Keep historical reasoning out of source comments unless it explains a non-obvious
  invariant that still applies.
- Update the relevant root documentation when a production workflow changes.
