# GIGACHAD: WORLD TOUR

A browser arcade brawler. [Play the current build](https://zheruel.github.io/gigachad-world-tour/).

## Controls

| Action | Keyboard | Standard gamepad |
|---|---|---|
| Move | Arrows / WASD | Stick / D-pad |
| Attack | Z / J | A |
| Jump | X / K | B |
| Guard / timed parry | C / L | X |
| Super | V / B / Space | Y |
| Interact / grab / continue | F / E | LB |
| Pause | Escape / P | Start |

Double-tap left or right to dash. Loading and victory cards require a fresh interaction press.

## Local play and review

Serve this directory with `python3 -m http.server 8011`, then open `http://localhost:8011`. No build step is required.

`review-train.html` provides deterministic scene playback, frame stepping and combat previews. `sfxlab.html` previews the sound library. Design documents live in `docs/`; production recipes and verification tools live in `tools/`.

For playtest reports, include the area, controls used, steps to reproduce and a screenshot or short recording where possible.
