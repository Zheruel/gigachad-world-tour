# Art and audio

- Use the built-in GPT Image tool for complex visual assets: characters, environments, vehicles, illustrated UI, and new animation poses. Match the existing CHAD sprites, penthouse materials, sunset skyline, proportions, and detailed arcade shading using actual project images as references.
- Before any generation, use the `gpt-image` skill (`~/.claude/skills/gpt-image/SKILL.md`: GPT Image 2.5 via Codex, parallel runs, edit approved images first). In this repo generate with `tools/production/gen_image.sh` (adds `sprite_edges` alpha hardening). Pass CHAD frames, the target stage plate and neighbouring characters as refs. CHAD is ≈96 logical px tall; runtime art is usually drawn at 2×. Use `TONE` in `sprite_edges.py` for pale/flat families, register in `js/assets.js` under `flock assets/frames/.manifest.lock`, and build design concept sheets over the real plate next to CHAD at game scale.
- Code is appropriate for motion, parallax, lighting, particles, simple readable UI, and processing generated art. Do not substitute primitive drawings for detailed production art. Keep simple fallback rendering for missing assets.
- Remove extraction-colour fringes from transparent props and actors before registration; inspect edges on dark and light backgrounds without eroding silhouettes or highlights.
- Ask GPT Image for a true transparent background in the prompt (no API parameter), harden it with `sprite_edges.alpha()` (threshold 128), and run `sprite_edges.edges()` after scaling/registration for a clean closed dark outline.
- Animation sheets need consistent identity, anatomy, scale, camera, lighting, and stable registration between poses. Generate the poses with GPT Image; crop and align them with processing tools. Inspect every frame and play the animation at game scale before accepting it.
- Match each character’s approved idle/walk face, anatomy, palette and material detail in every new action; compare at registered gameplay scale.
- Review changed scenes in the user's Chrome (Claude in Chrome) at the 480×270 logical size and 2× display size, so we see the same thing; if art looks stale, re-fetch assets with `cache: 'reload'` and reload. Use the frame explorer or deterministic capture tools to check transitions and occlusion.
- Reuse the existing licensed Streets of Rage 2 effects and Duke voice samples where the action suits them. Audition in the Review Studio audio tool (review.html?scenario=tools/audio), avoid overlapping or repetitive quotes, and preserve pause/exit behavior. Simple synthesized machinery and chimes are suitable when they sound convincing. The user has stated they have rights to the supplied sound banks.

- All character dialogue uses `js/room_dialogue.js`: the lobby frame, no name header, two-tick letter reveal, and its quiet typing sound.

# Asset layout

- Runtime travel art: assets/travel/{elevator,lobby,city,airport,india}/. Selected generation sources mirror those folders under assets/sources/travel/. Keep generated prompts out of the repository.
- Other runtime art stays in its feature folders. Stage production sources use named stages under assets/sources/production/stages/, not act numbers (stage order can change).
- Music lives in audio/music/, runtime effects in audio/sfx/, quotes in audio/voice/, and original sample banks in audio/sources/. Update manifests and consumers together when moving files.
- Keep useful processing recipes in tools/production/ and checks in tools/verification/. Reproducible screenshots/contact sheets belong in tmp/review/ or system temp. Audit loaders and dynamic paths before deleting source material.
- Keep documentation brief. Preserve the India chapter and three level design documents; do not add implementation diaries or image prompt archives. Preserve music prompts and their provenance in audio/music/prompts/; follow its shared style guide for new tracks.
