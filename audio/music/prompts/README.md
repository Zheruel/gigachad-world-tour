# Game music prompts

Original prompts for every installed MP3, recovered from project Claude history and matched to MP3 Suno IDs. `catalog.json` records filenames, IDs, sources and file hashes. Submitted prompts and Suno-rewritten styles are kept separate. BPM/key are prompt targets, not measured audio properties. Unknown settings remain unknown.

## Shared direction for future music

1990s arcade action and beat-em-up music: memorable FM-synth hooks, muscular detuned bass, punchy sampled drums, gated snare and warm vintage grit. Dry, clear combat mix with room for voices and impacts. Immediate hook, steady momentum, compact repeatable sections and a smooth loop. Instrumental; no sung/spoken words, long ambient openings or EDM build/drop.

Keep each chapter's key and signature melody across stage and boss music. Change intensity and instrumentation rather than inventing an unrelated sound. India uses tabla/dhol and a featured local lead alongside FM instruments. Luxury home/travel themes may use slower synth-funk, Rhodes, DX7, guitar and sax. Neon Shadows is the established darker 84 BPM home variation.

- Train: F# minor, 140 BPM stages / 150 BPM boss; falling bansuri motif, station bell, rail pulse; boss adds shehnai and corrupt brass.
- Delhi: D minor stages, 132 / 128 BPM; sarangi/bansuri and falling river phrase. Vendor: 144 BPM D Phrygian dominant. Dredger: 148 BPM D minor, industrial river motif.
- Refund Tower: C minor, 132 BPM stage / 150 BPM boss; sinister telephone hold melody, sitar, phone rhythm and gold FM brass. One stage theme plus one boss theme.
- Title / lobby: 108 / 106 BPM; luxury action-hero synth-funk. Home: 84 BPM dark synthwave lounge.

## Prompt template

```text
Instrumental 1990s arcade [stage/boss/home] theme, [BPM], [key]. [Scene and attitude]. One memorable [chapter motif] on [lead], answered by [secondary instrument]. Detuned FM bass, punchy [groove], gated snare, [chapter percussion]. [Short recurring signature accent]. Dry punchy vintage arcade mix, room for combat sounds. Immediate hook, steady energy, short repeatable sections, seamless loop. No vocals, spoken words, long ambient intro or EDM build/drop.
```

Keep the original submitted prompt, effective Styles, instrumental section tags, model, mode, known settings, Suno link and selected clip ID whenever adding or replacing a track. Compare a new take against its chapter companions before accepting it. Prompts alone do not guarantee a matching timbre or an audible seamless loop.

## Installed tracks

- [Cigar Skyline](./cigar_skyline.md) — `cigar_skyline`
- [Bazaar Brawl](./delhi_a.md) — `delhi_a`
- [Night Bazaar Rot](./delhi_b.md) — `delhi_b`
- [This River Is My Contract](./delhi_boss.md) — `delhi_boss`
- [Bazaar Brawl](./delhi_vendor.md) — `delhi_vendor`
- [Marble Lobby Hustle](./marble_lobby_hustle.md) — `marble_lobby_hustle`
- [Neon Shadows](./neon_shadows.md) — `neon_shadows`
- [Escalation](./refund_a.md) — `refund_a`
- [Final Escalation](./refund_boss.md) — `refund_boss`
- [Last Train Alarm](./train_a.md) — `train_a`
- [Rail Joint Drift](./train_b.md) — `train_b`
- [Everyone Has A Price](./train_boss.md) — `train_boss`

`unused/` preserves recovered earlier tracks, unselected vendor/Dredger variants and Please Hold without adding them to runtime. The replaced Roofline Boss Chase prompt is marked unverified.
