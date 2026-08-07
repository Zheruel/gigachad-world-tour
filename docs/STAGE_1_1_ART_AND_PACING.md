# Stage 1-1 — Art and Pacing Specification

Status: implemented visual pass  
Stage: `1-1 BAZAAR HEAT`  
Last updated: 2026-08-06

## Stage size rule

The current stage length is already about right. The problem is visual repetition, not physical size.

Stage 1 is 5,000 logical pixels wide, or 10.4 gameplay screens. With seven waves and a boss, that is a good target for a substantial opening stage.

Targets:

- 8–11 screens of traversal
- 6–8 combat encounters
- 5–8 minutes for a first successful playthrough
- 3–5 minutes for an experienced player
- One obvious visual change every 1–2 screens

Good beat-’em-up design is structured around pacing segments and changing enemy compositions rather than a specific pixel count. The Streets of Rage 4 team described analyzing the originals frame by frame and emphasized getting the pacing between different enemies right; its music was also divided around individual level moments. See [Nintendo Life’s developer feature](https://www.nintendolife.com/news/2020/12/feature_the_making_of_streets_of_rage_4_by_the_people_who_made_it_happen).

A GDC level-flow presentation similarly treats layout as something that enforces the intended pace. See the [GDC level-flow presentation](https://media.gdcvault.com/gdcchina14/presentations/833762_JoelBurgess_MattScott_LeePerry_2_Layout_EN.pdf).

## Repetition problem addressed

- Playable route: 5,000 logical pixels
- Gameplay viewport: 480 logical pixels
- Legacy facade plate: 2,700 logical pixels, then repeated
- Legacy street floor: 1,350 logical pixels, repeated almost four times
- Current facade and floor plates: 5,000 logical pixels, with no route repetition

The route should remain 5,000 pixels. Increasing its size before replacing the repeating surfaces would make the weakness more visible.

## Approved visual structure

| World range | District | Primary encounters | Visual identity |
|---:|---|---|---|
| 0–1,000 | Arrival Street | Motorcycle entrance, waves 1–2 | Wider road, closed morning shutters, first spice stalls, parked rickshaws |
| 1,000–2,000 | Outer Bazaar | Wave 3 | Cloth canopies, hanging textiles, busier shopfront rhythm, warmer light |
| 2,000–3,000 | Market Core | Waves 4–5 | Dense spice merchants, compressed awnings, stacked sacks and metal vessels |
| 3,000–4,000 | Rickshaw Row | Wave 6 | Repair shops, tires, meters, tools, blocked traffic, tougher street ownership |
| 4,000–5,000 | Meter Yard | Wave 7 and Rickshaw Raja | Fortified approach followed by a purpose-built depot courtyard and unmistakable boss arena |

## Implemented surface assets

The five districts each have two unique 500-logical-pixel views. The ten views are normalized to the same curb line and stitched into one continuous, non-repeating production route.

The current build gives each neighboring source a 96-device-pixel shared blend zone before cropping the final route back to exactly 10,000 device pixels. This removes hard vertical image boundaries while keeping architectural transitions short enough to avoid a visibly smeared facade.

- Authored wall plate: `assets/stages/bazaar_v2/wall.png` — 10,000×362 device pixels / 5,000×181 logical pixels
- Authored floor plate: `assets/stages/bazaar_v2/floor.png` — 10,000×178 device pixels / 5,000×89 logical pixels
- Clean route proof: `assets/stages/bazaar_v2/route_preview.png`
- Full-resolution approved sources: `assets/ai/bazaar_v2/`
- Market-floor dirt source: `assets/ai/bazaar_v2/market_floor_detail.png`
- Repair-yard grime source: `assets/ai/bazaar_v2/yard_floor_detail.png`
- Reproducible plate builder: `tools/build_bazaar_v2.py`
- Image-generation prompt record: `assets/ai/bazaar_v2/PROMPTS.md`

View order:

1. Arrival anchor
2. Arrival opening
3. Outer Bazaar anchor
4. Outer Bazaar tailors
5. Market Core anchor
6. Market Core wholesale lane
7. Rickshaw Row anchor
8. Rickshaw meter workshop
9. Meter Yard approach
10. Meter Yard boss courtyard

## Art continuity rules

- Preserve the established Bazaar Heat perspective: fixed side-on beat-’em-up camera, facade seam at logical y=181, playable street below it.
- Preserve the existing pixel-painted realism, warm late-afternoon grade, weathered masonry, tangled utility wires, and dense material texture.
- Keep the fighting lane free of baked-in people, enemies, vehicles, or large foreground objects.
- Do not bake gameplay props into places where production props will be drawn again.
- Avoid readable shop text, logos, trademarks, watermarks, and modern advertising.
- Keep strong contrast and focal detail in the facade; keep the fighting floor comparatively quiet so combat silhouettes remain readable.
- Hide joins at architectural dividers such as poles, arches, shutters, gates, tarps, or deep shadow bands.
- Maintain consistent horizon, curb height, lighting direction, masonry scale, and floor perspective across every section.
- Each section should introduce an obvious visual change within 1–2 screens without appearing to be a different city or time of day.

## Integrated ambience rules

- Stage 1 uses no separate decorative foreground tarps, laundry, fans, or cloth strips. These motifs must be authored into the continuous facade plate or omitted.
- Stage 1 uses no free-floating facade animations or unanchored smoke/steam emitters. They read as pasted-on layers when their perspective and attachment points do not precisely match the plate.
- Pigeons are the primary readable environmental motion. Thirteen small groups are distributed across the route and scatter reactively around the player and impacts.
- General motion is limited to restrained dust motes and the reactive birds so combat silhouettes remain clear.
- The market floor receives a low-opacity dirt pass with dust, paper, leaf, fibre, spice, water-stain, and drain-grime variation.
- Rickshaw Row and the Meter Yard use a separate low-opacity grease pass with oil marks, tire dust, rust, filings, and rain stains.
- Dirt is clustered with broad quiet fighting spaces; the lane should feel lived-in, not like a garbage dump.

## Boss arena rules

The Meter Yard must look designed specifically for Rickshaw Raja rather than like another market tile.

Required motifs:

- Rickshaw repair depot or meter yard
- Large locked service gate as the central backdrop
- Broken analog meters, tool boards, tires, spare panels, and repair bays
- Skid marks and tire tracks converging toward the combat center
- Wider and cleaner silhouette behind both fighters
- Strong central composition for Raja’s intro skid
- Space for Raja’s breakable rickshaw without duplicating it in the baked background
- Fewer small storefront details than the market route
- Same late-afternoon light and material language as the preceding district

## Pacing map

Current encounter gates remain:

| Beat | World x |
|---|---:|
| Wave 1 | 380 |
| Wave 2 | 920 |
| Wave 3 | 1,480 |
| Wave 4 | 2,100 |
| Wave 5 | 2,780 |
| Wave 6 | 3,420 |
| Wave 7 | 4,070 |
| Rickshaw Raja | 4,700 |

The environmental changes should support these combat beats rather than occur at arbitrary positions.

## Acceptance checklist

- [x] No obvious facade or floor repetition across a complete review-page sweep
- [x] All five districts are recognizable without labels
- [x] Adjacent sections share perspective, curb height, scale, light, and palette
- [x] No baked-in NPCs or combatants
- [x] No large baked object conflicts with production props or enemy silhouettes
- [x] Boss arena is immediately recognizable at a glance
- [x] Boss center remains visually quiet enough for Raja, CHAD, telegraphs, and hit effects
- [x] Stage retains its established Delhi market identity
- [x] Assets remain crisp and convincing at the 480×270 logical gameplay view
- [x] Final plates reviewed in `review-1-1.html` across all five districts and the boss gate
- [x] All nine source boundaries reviewed at gameplay scale with overlays disabled
- [x] Entrance cinematic reviewed at exact frames around every authored match cut

## Entrance animation review

`review-1-1.html` includes an entrance player driven by the production `drawMotorcycleArrival()` timeline. It supports 60 fps play/pause with the production sound cues, direct scrubbing, and exact previous/next-frame stepping across frames 0–850. The readout names the active story beat so pose, scale, smoke, and match-cut continuity can be judged in isolation.

The controlled-swagger V2 entrance uses eight locked-scale motorcycle/dismount keys, six locked-scale standing-performance keys, and one matching parked motorcycle. The cigar is baked into every relevant character frame; only smoke, exhaust, skid dust, and tiny particles are procedural.

Reviewed checkpoints: 30, 90, 111, 112, 149, 150, 239, 240, 277, 278, 305, 333, 361, 405, 429, 430, 467, 500, 531, 559, 560, 612, and 805.

Image-generation record: `assets/ai/entrance_v2/PROMPTS.md`  
Sprite builder: `tools/build_entrance_v2.py`  
Licensed entrance audio record: `audio/sfx/ENTRANCE_SOURCES.md`

## Implementation references

- Stage definition: `js/stages.js`
- Stage renderer: `drawStage()` in `js/stages.js`
- Production reviewer: `review-1-1.html`
- Review-page renderer: `js/review-1-1.js`
- Production wall: `assets/stages/bazaar_v2/wall.png`
- Production floor: `assets/stages/bazaar_v2/floor.png`
- Legacy visual references: `assets/bg_delhi_wall.png` and `assets/bg_delhi_floor.png`
