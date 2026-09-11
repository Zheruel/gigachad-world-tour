# The India chapter

Campaign order: **The Night Train → Dirty Delhi → Refund Tower**.

| Level | Route | Design |
|---|---|---|
| 1 · The Night Train | Remote station → sleeper train → Delhi station | [Night Train](night-train.md) |
| 2 · Dirty Delhi | Station market → bazaar → food alleys → industrial riverfront | [Dirty Delhi](stage1-dirty-delhi.md) |
| 3 · Refund Tower | Wall breach → scam calling floors → servers → executive office | [Refund Tower](stage3-refund-tower.md) |

Delhi and Refund Tower are implemented playtest builds of the approved replacement designs. Each targets a learned 12–15-minute run; human playtests must confirm pacing and difficulty. The train receives presentation-only polish: combat timing, balance, route and approved cinematics remain fixed.

Keep CHAD's established appearance, shared controls, protected parries and single-target boxing super. Detailed, believable locations support absurd physical action. Duke recordings punctuate action sparingly; no text-to-speech. Preserve records under stable stage IDs `train`, `delhi` and `refund`.

The boxing super uses authored contact/recoil poses and layered impact bursts while retaining its target, damage and timing. Regular humanoid defeats use brief red-and-gold arcade bursts, flying accessories and small fading floor marks; heavy strikes and supers intensify the effect. Existing knockback, scoring, boss defeat performances and attack controls remain intact.

Use `review-elevator.html` for the trip, `review-train.html` for Level 1, `review-delhi.html` for Level 2 and `review-refund.html` for Level 3. The level explorers let you inspect their route, play full stages or encounters, select boss patterns, step every character pose and preview ordinary/heavy/super knockouts. The explorer uses the actual game simulation. Loading cards and completed victory tallies require a fresh F/LB press; preparation is silent. Saves with a Delhi clear unlock Refund Tower automatically.

Delhi's twelve-second motorcycle arrival and filthy food-stall rampage leads directly into combat: CHAD dismounts, shoulder-charges both stalls, catches one vendor in an arcade burst and sends the other fleeing. Reactive rats, pigeons and localized flies animate the route without affecting combat. Automatic finishers cover the vendor's nine-second kitchen collapse, the Dredger's sixteen-second machinery wreck and The Closer's fourteen-second desk/display destruction. Named explorer beats cover contacts, structural failures and aftermaths; actor, chair, worker and scenery toggles support inspection. Each finisher waits for a locked super, retains defeated victims and existing environmental damage, and returns to its specific play or victory outcome once. Night Train's complete 21-second ending remains unchanged.

Recovery food appears at authored encounter breaks, in a clear part of the lane. Each placement restores 30 health and fires once per checkpoint attempt; retry rollback restores its history alongside score and props. Boss retries start with 100 health and 50 super meter. Ordinary kitchen fighters use their visible pressure attack and nearby interruptible boilers; their defeat does not create an instant hidden fire hazard.

Shared sprite presentation: super poses use the gameplay anatomical reference (uniform sheet scale, not crouched bounding-box height), with no super-only color boost. Damage flashes preserve material colors. `tools/production/audit_sprite_edges.py` scans runtime transparency; `repair_sprite_edges.py` reapplies reviewed edge-RGB repairs from selected originals without changing alpha, dimensions or anchors. The purple-shirt brawler also uses `repair_brawler_edges.py` for darker neutral matte across all 23 poses. Super skin colors are matched to `chad_sidle1.png` by `sprite_palette.py` during registration, preserving non-skin materials and alpha. Run the repair passes after regenerating affected artwork; clouds, glass and authored lighting are reviewed separately rather than blanket-cleaned.
