# Voice lines

Every file here is optional. `js/audio.js` fetches each name once at load and a missing
file is skipped, so a slot plays nothing until its `.wav` lands. Mono 16-bit PCM, 22.05 kHz
matches the rest of the mix (`ffmpeg -i in -ac 1 -ar 22050 -sample_fmt s16 out.wav`).

## Duke Nukem (Jon St. John, from the Vocal Collection archive)

| File | Where it plays |
| --- | --- |
| `duke_out_of_gum.wav` | DIRTY DELHI arrival, on the cigar |
| `duke_come_get_some.wav` | first wave of DIRTY DELHI |
| `duke_ride.wav` | THE NIGHT TRAIN opening, as the act's name lands ("looks like I'm goin' for a ride"); `duke_lets_rock.wav` is its fallback |
| `duke_back_to_work.wav` | MR. REFUND's floor |
| `duke_gotta_hurt.wav` | MIRCHI and THE DREDGER going down; also a big-combo line |
| `duke_book_em.wav` | YADAV, and THE TTE booked |
| `duke_hail.wav` | RANA and BIRJU: the act's last word |
| `duke_look_good.wav` | the lair mirror; also a big-combo line |
| `duke_game_over.wav` | the continue screen |
| `duke_combo_1.wav` … `duke_combo_6.wav` | Groovy / Damn I'm good / Bitchin' / Holy cow / Eat that / Tattooed your face: one at random when a chain reaches B or better and the announcer has no file for it; 18 s cooldown |

## The announcer (Devil May Cry 5 style ranks)

Cut from one supplied clip with ffmpeg silence detection and checked with a speech model;
two takes per rank, picked at random when the chain reaches it.

| Files | Rank | Hits |
| --- | --- | --- |
| `rank_dismal_1/2.wav` | D DISMAL | 3 |
| `rank_crazy_1/2.wav` | C CRAZY | 6 |
| `rank_badass_1/2.wav` | B BADASS | 10 |
| `rank_apocalyptic_1/2.wav` | A APOCALYPTIC | 15 |
| `rank_savage_1/2.wav` | S SAVAGE | 22 |
| `rank_sickskills_1/2.wav` | SS SICK SKILLS | 30 |
| `rank_sss_1/2.wav` | SSS SMOKIN' SEXY STYLE | 40 |

The ladder is `RANKS` in `js/engine.js`; the gauge is `drawStyleRank` in `js/hud.js`.
Lines never overlap: a line that arrives while one is playing is dropped unless it is a boss
going down or the game over, which interrupt. Music ducks under every line.
