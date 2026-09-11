# LEVEL 2 — DIRTY DELHI

Status: implemented playtest build of the approved replacement. Runtime identity remains `delhi`. Target 12–15 minutes including introduction and ending; human pacing acceptance remains part of playtesting.

## Route

Station-side market entrance (two encounters), main bazaar (three encounters), food alleys (two encounters and the vendor boss), a 10–12-second culvert transition, working waterfront (three encounters), then the Dredger. Daylight progresses into rich amber dusk. Introduce the industrial river through earlier gaps between buildings. CHAD arrives by motorcycle from the station district.

Markets are visibly neglected: soot, peeling plaster, torn awnings, spoiled produce, overflowing refuse, greasy gutters and small rats moving along the curb. The river is industrially polluted: dark oily water, floating litter, foam at outfalls, sludge around pilings and smoke from waterfront plants. Carry this into early glimpses and the Dredger arena; retain luminous amber atmosphere and readable combat.

Locations are individually authored, connected panoramas with consistent ground and actor scale; no mirrored repetition or stretched scenery. Skyline, architecture, fixtures, civilians and foreground detail are layered. Vendors serve, porters carry goods, shoppers react and dock equipment works on staggered cycles. Keep the floor and attack tells readable.

The twelve-second entrance begins with a motorcycle arrival and dismount. CHAD notices rancid food, flies and filthy vendors, then shoulder-charges through two distinct cooked-food stalls: a red curry kitchen under green metal and a blue chai/snack counter beneath torn mustard canvas. Each vendor has an eight-pose working routine, staggered from the first arrival tick: stirring, pouring, serving, brow-wiping and fly-swatting. The older chai seller keeps his own identity through the startled turn and six-pose escape cycle. Contacts at ticks 396 and 466 break the counters; the first vendor bursts into arcade fragments while the second runs off-screen. At tick 536 the awning collapses into persistent low wreckage. CHAD brushes himself off, delivers “Who wants some?” at tick 600 and enters the existing first encounter at tick 720. The parked motorcycle remains visible; cinematic victims grant no combat rewards. Selected sources and `tools/production/build_delhi_rampage.py` reproduce the registered performances and structures.

## Combat and bosses

Fresh art families: street brawler, flanking runner, reach enforcer, cart-shield heavy, kitchen fighter and waterfront worker. Demonstrate breakable stalls/carts, kitchen pressure hazards and waterfront cargo before combining them with crowds. Keep one telegraphed bull crossing. Broken scenery persists visually while its blocking collision clears.

Ten ordinary encounters contain 100 fighters in staged groups. The next group enters only when the previous queue has finished and at most two opponents remain. Four-to-six visible opponents share the existing two-attacker budget. Kitchen steam and shifting cargo demonstrate their footprint before becoming dangerous; damaged office equipment in the next stage uses the same warning rules.

The huge greasy vendor chooses patterns by distance, equipment and recent attacks. Equipment phase: three-strike blockable ladle combination, reflectable cookware, committed cart rush and interruptible pressure valve. Parrying any ladle contact stops the string. Heavy attacks and thrown bodies damage the cart; baiting its charge into the station breaks guard. Cart destruction permanently replaces the rush with a rare, lane-locked belly lunge and heavy overhead ladle. Disabling the station removes pressure attacks. No reinforcements or immunity phase. Base health is provisionally 680; target learned pacing is 90–120 seconds, excluding the finisher.

The Dredger starts with 1200 base health and independently damageable winch, pump and cab. Bucket drops lock a lane and embed after a miss; low sweeps are jumpable; polluted hose discharge marks its lane before impact. Crew prepare reflectable scrap throws. Destroyed components disable their associated attacks and remain broken; exposed machinery can always take direct damage. At most two crew live at once, six spawn across the encounter, and committed machine specials suppress crew attack commitments.

The operator climbs down through a connected 90-tick exit without deleting surviving crew. His separate 360-health fight uses overextended wrench strings, reflectable tools, two single-use cover positions, two interruptible restart attempts and one limited crew call. Restarts cause one residual hazard and never repair the wreck; he remains targetable during retreat. The frightened balding operator and huge vendor use dedicated performance sheets at consistent anatomical scale. Targets are approximately two minutes of machinery and 60–90 seconds of operator combat; these health values remain playtest tuning, not a claim of human pacing acceptance. Optimized input-only diagnostics currently clear the vendor in 39 seconds with eight parries, and the Dredger in 85–89 seconds; the requested human pacing remains unvalidated.

Reuse shared 12-tick fresh-press parries, 45-tick protected punish, 90-tick guard breaks and single-target super. No new controls. Checkpoints after the vendor and before the Dredger; boss retries use a fixed full-health, 50-meter baseline. Freeze the final victory composition, tally once and require fresh F/LB to continue to Refund Tower.

## Finishers

An active boxing super completes before either automatic finisher begins. A shared 12-tick fade out, six-tick black hold and 12-tick reveal stages CHAD to the boss's left at striking distance. Preserve broken props and suspend hostile actions. Performance clocks begin after the reveal; rendering never advances cues.

The vendor's eleven-second pressure-cooker launch includes the 30-tick entry and 630-tick performance. “Time to turn up the heat” precedes the finishing combination. The shove puts him against the rear vessel; CHAD steps to its mechanism and forces it shut. Steam builds before the rupture launches the vendor through a high arc into one landing bounce. Successive stall failures leave the victim and low wreckage visible. CHAD brushes himself off, the route remains clear and control returns once. The vessel remains structurally present after combat valve damage.

The Dredger's sixteen-second ending includes the 30-tick entry and 930-tick performance. A dedicated combination throws the operator into the lowered bucket. CHAD releases the previously established support latch, tipping the bucket through the engine by gravity. Cab, engine and hull fail in localized bursts; a polluted-water splash rises behind the dock. Broken winches, damaged machinery and the defeated operator persist. “Something tells me this won't pass any safety inspections” accompanies the settled wreck, then the existing held victory screen takes over. No motor or destroyed component is restored.

Selected finisher sources and `tools/production/build_delhi_finisher_rebuild.py` reproduce the new CHAD, victim and mechanism sheets. Whole performances use one anatomical scale per character; custom source gutters preserve hands, feet and horizontally extended poses. Bucket foreground occlusion uses its actual lip silhouette.

Each sequence has one selected local recording, timed against its measured length. Local Whisper transcripts and recorded game playback are available; catalog listening-verification flags remain provisional until a person auditions them. Pause suspends the choreography and music ducking; reset and quit clear speech and effects. Missing artwork cannot prevent the vendor return or level-clear handoff.

## Acceptance

Use `review-delhi.html` for this level.

Generate replacement scenery, actors and props from approved game references. Eight locomotion poses minimum per humanoid; authored anticipation/contact/follow-through, hurt, knockdown and recovery. Keep selected sources and recipes, no prompt archive. Remove old Delhi-only consumers and assets after audit; retain shared assets and accepted Dredger machinery.

Review at 480×270 and 2×, every animation and every scenery join, including camera motion and near-wall walking. Check complete runs, environmental tactics versus attack repetition, pause, retries, missing assets, keyboard/gamepad, audio cleanup, records and one-time progression. Run focused checks, full gameplay suite, syntax/compilation, asset audit and diff checks before acceptance.

Ambient rats sniff, feed, flee and hide at authored drains and rubbish gaps. Pigeons peck and take off in staggered groups; localized flies scatter around spoiled food and stagnant water. Cosmetic updates use no combat randomness, grant no rewards and pause with gameplay. Visible activity is capped at four rats, six pigeons and three fly clusters. The explorer exposes wildlife toggles and forced flight, plus every intro contact and dismount beat.
