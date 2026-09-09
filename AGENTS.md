# Art and audio

- Use the built-in GPT Image tool for complex visual assets: characters, environments, vehicles, illustrated UI, and new animation poses. Match the existing CHAD sprites, penthouse materials, sunset skyline, proportions, and detailed arcade shading using actual project images as references.
- Code is appropriate for motion, parallax, lighting, particles, simple readable UI, and processing generated art. Do not substitute primitive drawings for detailed production art. Keep simple fallback rendering for missing assets.
- Animation sheets need consistent identity, anatomy, scale, camera, lighting, and stable registration between poses. Generate the poses with GPT Image; crop and align them with processing tools. Inspect every frame and play the animation at game scale before accepting it.
- Review changed scenes in Chrome at the 480×270 logical size and 2× display size. Use the frame explorer or deterministic capture tools to check transitions and occlusion.
- Reuse the existing licensed Streets of Rage 2 effects and Duke voice samples where the action suits them. Audition with sfxlab.html, avoid overlapping or repetitive quotes, and preserve pause/exit behavior. Simple synthesized machinery and chimes are suitable when they sound convincing. The user has stated they have rights to the supplied sound banks.

- All character dialogue uses `js/room_dialogue.js`: the lobby frame, no name header, two-tick letter reveal, and its quiet typing sound.

# Asset layout

- Runtime travel art: assets/travel/{elevator,lobby,city,airport,india}/. Selected generation sources mirror those folders under assets/sources/travel/. Keep generated prompts out of the repository.
- Other runtime art stays in its feature folders. Stage production sources use named stages under assets/sources/production/stages/, not act numbers (stage order can change).
- Music lives in audio/music/, runtime effects in audio/sfx/, quotes in audio/voice/, and original sample banks in audio/sources/. Update manifests and consumers together when moving files.
- Keep useful processing recipes in tools/production/ and checks in tools/verification/. Reproducible screenshots/contact sheets belong in tmp/review/ or system temp. Audit loaders and dynamic paths before deleting source material.
- Keep documentation brief. Preserve the India chapter and three level design documents; do not add implementation diaries or prompt archives.
