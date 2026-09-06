# Duke voice library

125 distinct archive clips selected for short, reusable arcade moments, plus 16 preserved original game takes (141 recordings total). Browse, filter and preview them in **sfxlab.html**. Stable game slot IDs retain the original performances after consolidation.

Categories include combat, threats, explosions, entrances, reactions and victory. Preserved recordings identify their existing game aliases through `legacySlots` in the catalog.

`catalog.json` records transcripts, durations, source filenames and hashes, suggested uses, and listening-verification status. Archive transcripts come from filenames; legacy transcripts use local Whisper and record that provenance. Automated transcription, decoding and level processing do not establish listening verification.

Rebuild with `python3 tools/production/build_duke_library.py "/path/to/Duke Nukem - Vocal Collection.7z"`. The recipe regenerates the 125 archive selections while retaining catalog entries carrying `legacySlots`. It uses temporary extraction, preserves the archive, trims boundary silence only and targets consistent voice loudness. Pass `--source-dir /path/to/extracted` to reuse an extraction.

Run `python3 tools/verification/duke_library_check.py` to check decoding, archive uniqueness, catalog hashes and legacy slot registrations.

Original game WAVs were transcribed locally with Whisper large-v3 using faster-whisper on CPU, then moved without re-encoding. Their cue IDs remain stable; the catalog retains machine output and confidence. The 14 rank-announcer files remain separate. `transcribe_voice_library.py` provides the offline transcription recipe; `consolidate_duke_voices.py` applies the verified path migration from its JSON output.
