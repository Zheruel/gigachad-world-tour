# GIGACHAD: WORLD TOUR

A browser arcade brawler. [Play the current build](https://zheruel.github.io/gigachad-world-tour/).

## Controls

| Action | Keyboard | Standard gamepad |
|---|---|---|
| Move | Arrows / WASD | Stick / D-pad |
| Attack | Z / J | A |
| Jump | X / K | B |
| Guard (hold) / parry (tap as a hit lands) | C / L | X |
| Super (full meter) | V / B / Space | Y / RB / RT |
| Interact / continue | F / E | LB / LT |
| Pause | Escape / P / Enter | Start |
| Back / title | Backspace | Select |

Double-tap left or right to dash. Red-cue attacks cannot be guarded or parried: get out of the way. Loading and victory cards require a fresh interaction press. The first press plays the GigaStation console boot and CHAD's mascot ident (any press after one second skips it).

## Local play and review

Serve this directory with `python3 tools/serve.py 8011`, then open `http://localhost:8011`. No build step is required. The boot loads only the menus, penthouse, CHAD and sounds; each chapter's art streams in behind the title as a pack (`js/loading.js`), and a stage whose pack is not ready holds on the load screen. Automation and the Review Studio load everything up front; add `?stream` to test streaming there.

GitHub Pages deploys from `.github/workflows/pages.yml`: `tools/production/build_pages.py` copies the runtime files and adds a WebP beside every PNG under `assets/` and an MP3 beside every WAV under `audio/` (`js/asset_url.js` picks them). Run it locally with `.venv/bin/python tools/production/build_pages.py` and serve `_site/`.

`review.html` is the shared Review Studio: choose Home & Trip or a level, select an area/fight/cinematic, then press Play. Inspect adds frame stepping, layers, actor poses and captures. Assets, audio and presentation tools share the same workspace; Review progression is isolated from campaign saves. Design documents live in `docs/`; production recipes and verification tools live in `tools/`.

For playtest reports, include the area, controls used, steps to reproduce and a screenshot or short recording where possible.

Review automation uses `window.__review`: `listScenarios()`, `load(id)`, `play()`, `pause()`, `restart()`, `seek(tick)`, `step(delta)`, `snapshot()`, `setSettings(values)` and `capture()`. Scenario IDs and supported controls come from the registry. Input replay is session-local; copied links reproduce a preset and its settings, not another user’s recorded play session. `contactSheet(from, to, interval)` captures up to 120 frames; inspection and seeking are silent. Run `node tools/verification/review_studio_check.cjs` with Playwright available to verify the Studio.
