# Stage 1 entrance sound sources

The motorcycle now uses the original 1996 Windows **Road Rash** engine loop and
asphalt skid rather than trying to turn a combat transient into a vehicle. The
remaining character foley uses the approved **Double Dragon II: The Revenge**
effect archive submitted by J-Sinn to The Sounds Resource.

- Road Rash archive page: <https://oldgamesdownload.com/road-rash/>
- Road Rash setup archive: `Road_Rash_Win_Setup_EN.7z` (27.86 MB)
- Double Dragon II source: <https://sounds.spriters-resource.com/nes/doubledragoniitherevenge/asset/397134/>
- Retrieved: 2026-08-06

## Cue map

| Project cue | Source effect | Production treatment |
| --- | --- | --- |
| `entrance_engine.wav` | Road Rash `ENGSPORT.WAV` | Original 26 ms vehicle loop stepped through four playback rates, crossfaded, band-limited, compressed and faded with the stop |
| `entrance_skid.wav` | Road Rash `SKIDONNR.WAV` | Original on-road brake sample, resampled with a short gated street echo and fade |
| `entrance_boot.wav` | Double Dragon II SFX 1 | Lower pitch, low-pass shaping and level match |
| `entrance_stand.wav` | Double Dragon II SFX 23 | Slight pitch shift, band limiting and level match |
| `entrance_birds.wav` | Double Dragon II SFX 14 | High-band chirp cluster and level match |
| `entrance_crack.wav` | Double Dragon II SFX 27 | Lower-pitched double transient, band limiting and level match |

Road Rash's source samples are preserved in `audio/sfx/raw/road_rash_1996/`,
and `tools/build_entrance_sfx.sh` rebuilds the two production cues. All
production cues are mono, 16-bit PCM WAV at 22.05 kHz. The restrained bandwidth
and short gated tails target a late-16-bit/early-32-bit arcade mix rather than
the previous bright 8-bit layer.
