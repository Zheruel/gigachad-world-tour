# GIGACHAD: WORLD TOUR — India Chapter Bible

Status: living design document  
Version: 0.1  
Last reconciled with the game: 2026-08-06

This document defines the current story, characters, stages, combat identity, and visual direction of the India chapter. It records what is already in the game and gives us a shared foundation for later iteration.

## High concept

CHAD rides into Delhi on a motorcycle during his absurd, globe-spanning search for the greatest fight on Earth. A street dispute pulls him into a connected chain of rackets: transport intimidation, a weaponized food operation, an inhuman customer-service tower, corrupt police protection, and finally a private arsenal controlled by Commander Rana.

The chapter should feel like a real journey through one city rather than five unrelated arenas. Every boss is part of the same ladder of power. Defeating one opens the road to the next and reveals who benefits from the chaos above them.

The story is intentionally simple enough to understand during play:

> A stranger arrives, refuses to be intimidated, follows the trouble to its source, and leaves the city freer and considerably more damaged.

## Tone

The tone is muscular action-comedy with sincere arcade spectacle. The world may be exaggerated, but the action should always feel committed rather than apologetic or ironic.

Core tonal rules:

- CHAD is ridiculous but never cowardly, cruel, or confused about why he fights.
- Bosses are memorable personalities whose jobs, territory, and combat mechanics tell the same story.
- Delhi is a place with texture, weather, machinery, changing districts, and history—not a static exotic backdrop.
- Comedy comes from confidence, escalation, and character behavior rather than interrupting the action with long dialogue.
- Cinematics are short, visual, and attached to the physical level.
- The chapter continuously moves from daylight street energy toward a storm-lit final confrontation.

## Design pillars

### Cinematic continuity

The motorcycle entrance, stage transitions, boss reveals, and Meteor Lariat all remain grounded in the gameplay world. Camera and effects enhance the action without turning the game into an unrelated flashing cutscene.

### Readable chaos

Up to six enemies can share the arena, but only a limited pressure group attacks at once. Every enemy needs a distinct silhouette, range, telegraph, and tactical purpose.

### A city that reacts

There are no decorative background NPC cutouts. The stages feel alive through cloth, fans, lamps, smoke, steam, dust, rain, lightning, foreground objects, breakable props, and birds that scatter when the fight approaches.

### Impact with counterplay

Light and medium attacks can be parried, projectiles can be reflected, and extremely heavy attacks are clearly marked in red and must be avoided. Strong feedback comes from hit-stop, sound, dust, sparks, body collisions, wall splats, and environmental reactions.

## The protagonist

### CHAD

Role: playable hero  
Archetype: wandering action hero  
Visual identity: blond flat-top, aviators, black leather vest, blue jeans, heavy boots  
Height in gameplay: 96 logical pixels

CHAD travels because fighting is the only honest language he believes every city understands. He is not a policeman, mercenary, or chosen savior. He notices a bully blocking the road, refuses to pay, and follows each retaliation until he reaches the person who ordered it.

His personality is communicated through action:

- He arrives already smoking a cigar while riding his motorcycle.
- He takes his time dismounting because he does not consider the street crew a threat.
- He cracks his knuckles, flexes, and settles into guard while an archived action-hero voice line plays as audio only.
- When left idle, he smokes, adjusts his shades, flexes, or cracks his knuckles.
- His sparse voice clips punctuate wave arrivals and important victories; they should not become constant chatter.

Gameplay expression:

- A flowing five-hit pressure combo advances through the target rather than returning to guard between punches.
- Running produces a shoulder tackle.
- Heavy finishes launch enemies into juggles, walls, and other bodies.
- A successful parry immediately turns defense into offense.
- A full meter activates Meteor Lariat, his single signature super.

### Meteor Lariat

Meteor Lariat is a 70-tick, gameplay-cinematic super with three readable contacts:

1. A target-tracking shoulder rush establishes momentum.
2. A body blow holds the victim in the sequence.
3. A crowd-launching lariat ends with a large stage reaction.

The move uses a dedicated eight-pose sheet, a fixed character scale, and a static gameplay camera. It has no low-health requirement, random variant, full-screen strobe, or detached cinematic background.

## Story spine

### Opening

CHAD enters the Delhi market on his motorcycle at an intentionally unhurried pace. The cigar smoke, engine, dismount, physical warm-up, and audio line establish his character before the player receives control.

Rickshaw Raja's crew tries to stop him at the market road. The exact reason can stay almost comically small—a toll, a claimed lane, or an insult—but Raja's response reveals that the street is organized territory rather than random violence.

### Escalation

Each defeated boss points upward through the same protection structure:

1. Raja controls movement through the market.
2. Mirchi controls supplies, food carts, and chemical hazards in the alleys.
3. Mr. Refund launders the operation through a bureaucratic service front.
4. Inspector Yadav supplies official protection and manpower.
5. Commander Rana arms and commands the entire network from the Red Fort arsenal.

This hierarchy is the working narrative link between the five acts. Future interstitials should make the chain clearer without requiring long exposition.

### Ending direction

Rana's defeat breaks the organization at its command center. The storm begins to clear, the gate opens, and CHAD returns to his motorcycle rather than staying for praise. The final image should imply that the world tour continues to another city.

The current game reaches a victory ending and credits after Iron Monsoon. A more explicit departure shot is a future story upgrade.

## Chapter map

| Act | Stage | Length | Encounters | Boss | Narrative function |
|---|---|---:|---:|---|---|
| I | Bazaar Heat | 5,000 px | 7 waves + boss | Rickshaw Raja | Introduces the city, street combat, and transport racket |
| II | Gutter Ghat | 5,600 px | 8 waves + boss | Mirchi | Reveals the supply operation and adds persistent hazards |
| III | Refund Tower | 5,300 px | 7 waves + boss | Mr. Refund | Moves from street crime into organized bureaucracy |
| IV | Blue Line Lockup | 5,500 px | 8 waves + boss | Inspector Yadav | Exposes official protection and disciplined formations |
| V | Iron Monsoon | 6,100 px | 8 waves + boss | Commander Rana | Combines the full roster and resolves the chapter at its source |

Clearing an act unlocks the next one on the title screen. Between consecutive acts, CHAD recovers 35 health and carries his meter forward. Players may replay any unlocked act from the title screen.

## Stage treatments

### Act I — Bazaar Heat

Subtitle: King of the Meter  
Time and color: hot late afternoon, spice gold, faded reds, dusty stone  
Boss: Rickshaw Raja

Story:

The opening route cuts through an Old Delhi market whose traffic and trade have been squeezed by Raja's protection racket. His crew uses roadblocks, bats, ranged harassment, and coordinated guards to keep everyone paying and moving on his terms. CHAD's refusal to stop turns a minor confrontation into an open challenge.

Environment:

- Shopfronts, tangled wires, awnings, garlands, lamps, vendor carts, crates, clay pots, and tires.
- Warm dust motes, smoke, steam, reactive cloth, fans, and scattering pigeons.
- Breakable street props establish that the environment participates in combat.

Gameplay arc:

- Opens with recognizable Goondas and a Bandar so the player can learn movement and crowd control.
- Introduces the charging Rickshaw Punk early.
- Adds ranged Masala enemies and Constables as the road becomes controlled territory.
- Ends with a mixed elite wave containing a Chain Sepoy and Operator.

Boss transition:

Raja skids into the road with his vehicle, kills the meter, and treats the street itself as his arena.

Story outcome:

Raja's defeat opens the route into the service alleys. Evidence on his cart or a short visual beat should connect his collections to Mirchi's operation.

### Act II — Gutter Ghat

Subtitle: The Chaat King  
Time and color: sunset slipping into smoky dusk, wet stone, firelight, food-stall orange  
Boss: Mirchi

Story:

Behind the public market lies the infrastructure that keeps the racket supplied: drains, cooking fires, storage alleys, improvised kitchens, and guarded delivery routes. Mirchi is charismatic, theatrical, and furious that anyone would question the quality of his operation.

Environment:

- Gutter-side paving, stall lights, cooking steam, smoke, hanging laundry, awnings, fans, pots, tables, and delivery clutter.
- The route should feel narrower and more hazardous than Bazaar Heat even when the combat lane remains readable.

Gameplay arc:

- Increases ranged pressure through Masala enemies and Operators.
- Uses Bandars to disrupt pickups while heavies occupy the player.
- Mixes Pehlwans with projectile roles so thoughtless attack spam becomes unsafe.
- Introduces more frequent persistent floor hazards before the boss.

Boss transition:

Steam reveals Mirchi behind the same cart that forms his first boss phase. The kitchen and the weapon are one object.

Story outcome:

Breaking the cart destroys Mirchi's most powerful position and reveals records, phones, or delivery markings leading to Refund Tower.

### Act III — Refund Tower

Subtitle: Please Hold  
Time and color: fluorescent night, cold cyan, dirty concrete, failing monitors  
Boss: Mr. Refund

Story:

The organization hides its money and communications inside a decaying customer-service complex. Operators delay complaints, redirect calls, and bury evidence while uniformed muscle protects the building. The joke is that its bureaucracy is more hostile than the street—but it still resolves disputes with fists.

Environment:

- Repeating office frontage, service counters, signs, abandoned phones, monitors, industrial fans, bins, crates, and cold steam.
- The district should feel mechanically alive: fans rotate, monitors flicker, lights fail in bands, and phones ring as the player advances.

Gameplay arc:

- Operators become the defining enemy and attempt to work behind a front line.
- Constables and Sepoys protect ranged attackers.
- Rickshaw charges in an office district deliberately feel intrusive and chaotic.
- The late encounter combines every pressure role learned so far.

Boss transition:

The office blacks out. Monitors wake one by one, abandoned phones begin ringing, and Mr. Refund walks out of the lift to handle the escalation personally.

Story outcome:

His defeat exposes the police connection. A confiscation stamp, station transfer notice, or ringing direct line can point toward Yadav without spoken exposition.

### Act IV — Blue Line Lockup

Subtitle: Police Quarter  
Time and color: deep night, police blue, sodium orange, intermittent red light  
Boss: Inspector Yadav

Story:

CHAD crosses from commercial streets into barricaded police territory. The enemies are no longer pretending to be a loose street gang: formations are more disciplined, Constables arrive in pairs, and Operators coordinate support from behind the line.

Environment:

- Barricades, station frontage, signs, bins, impounded motorcycles, tires, crates, fans, tarps, and sweeping emergency light.
- The stage should visually transition from an exterior police quarter into the station approach.

Gameplay arc:

- Early legacy enemies suggest that the same street crew is being protected here.
- Constables, Sepoys, and Operators take over the later half.
- Paired guards punish frontal attack spam and encourage throws, movement, and reflected projectiles.

Boss transition:

Red and blue light sweeps across both fighters while Yadav walks out under the station facade. His authority is part of the set, not a reusable portrait card.

Story outcome:

Breaking Yadav's posture and defeating his reinforcements reveals that Rana is the source of the weapons and orders. The final road leads toward the fortified arsenal.

### Act V — Iron Monsoon

Subtitle: The Red Fort Arsenal  
Time and color: storm midnight, iron red, lightning white, ember orange  
Boss: Commander Rana

Story:

The final act moves through a militarized approach to a hidden arsenal. Rana is not simply another collector; he is the person who turned disconnected hustles into a citywide fighting organization. Every previous enemy role returns in deliberate mixed formations.

Environment:

- Fort walls, banners, weapons crates, industrial smoke, wet stone, hard wind, rain, lightning, and foreground debris.
- Weather intensity should build as the player approaches the gate.
- The final arena must have a strong, clean silhouette so Rana's chain and additional-arm rage effect remain readable.

Gameplay arc:

- Opens with familiar street muscle as a final confidence check.
- Escalates into six-enemy compositions using Sepoys, Operators, Constables, Pehlwans, and chargers.
- Requires the player to use the entire combat language: crowd control, reflection, parry, evasion, wall splats, and meter management.

Boss transition:

Rana is first visible only as a lightning silhouette at the fort gate. A second strike reveals him fully before he slams the chain into the ground.

Story outcome:

Rana's defeat ends the India chapter and opens the world-tour continuation.

## Enemy roster

### Goonda

Role: baseline brawler  
Story function: local street muscle used by every layer of the organization  
Combat lesson: spacing, basic parry timing, and managing more than one body

Goondas use direct haymakers and occasional grabs. They are individually readable but become dangerous when a specialist occupies the player's attention.

### Batta

Role: long-reach enforcer  
Story function: improvised market security armed with cricket bats  
Combat lesson: recognize a slow red heavy and evade instead of parrying

The Batta's bat arc knocks CHAD down and creates space for the rest of the group.

### Masala

Role: ranged disruptor  
Story function: Mirchi's street suppliers and chemical troublemakers  
Combat lesson: reflect projectiles or close distance without tunnel vision

Masala enemies throw chilli powder, blind the player, and retreat from punching range.

### Bandar

Role: fast nuisance  
Story function: uncontrolled market chaos that opportunistically joins the fight  
Combat lesson: track a low, fast target while protecting dropped resources

Bandars leap toward CHAD's head and steal pickups. They prevent every encounter from becoming a static line of human targets.

### Pehlwan

Role: armored grappler  
Story function: hired akhara muscle  
Combat lesson: break visible poise, avoid the bear hug, and mash out if caught

Pehlwans absorb early light hits through visible poise pips. Once broken, their large body becomes an excellent collision weapon.

### Rickshaw Punk

Role: lane charger  
Story function: Raja's aggressive road crew  
Combat lesson: sidestep or precisely parry a committed linear attack

The Punk accelerates into the combat lane and punishes players who remain planted while attacking.

### Constable

Role: guard and space controller  
Story function: Yadav's uniformed protection force  
Combat lesson: stop attacking the nearest body automatically; reposition around guard pressure

Constables use lathi reach and limited poise to stabilize enemy formations.

### Operator

Role: ranged support  
Story function: Refund Tower's communications staff and field coordinators  
Combat lesson: reflect a projectile back through the formation or prioritize the back line

Operators throw phones and try to stay behind tougher enemies.

### Chain Sepoy

Role: elite hybrid  
Story function: Rana's trained arsenal guard  
Combat lesson: distinguish normal parryable chain pressure from the red power swing

Sepoys are fast, durable, and designed to remain threatening inside late-game mixed waves.

## Boss roster

### Rickshaw Raja — King of the Meter

Territory: Bazaar Heat  
Personality: territorial, fast-talking, and obsessed with owning the road  
Visual hook: green street-king styling, wrench, and rickshaw  
Mechanics: reflectable wrench, fast punches, grabs, and an unblockable vehicle charge

Raja's vehicle is a combat prop rather than decoration. Breaking it removes the charge and visibly changes the fight.

### Mirchi — The Chaat King

Territory: Gutter Ghat  
Personality: proud showman who treats violence like customer service  
Visual hook: food-vendor silhouette, heat, steam, and cart  
Mechanics: reflectable burning samosas, poison chutney, steam jet, cart charge, and grabs

Mirchi's cart expresses his entire character: livelihood, throne, shield, and weapon. Destroying it removes his charge and forces him into direct combat.

### Mr. Refund — Escalation Manager

Territory: Refund Tower  
Personality: unnervingly polite, procedural, and personally offended by unresolved tickets  
Visual hook: oversized office authority surrounded by cold screens and ringing phones  
Mechanics: reflectable phones and tear gas, dash punches, grabs, and Operator reinforcements

His fight should feel like being trapped inside a hostile process. Summoned Operators are part of the boss identity, not generic backup.

### Inspector Yadav — Chandni Chowk Police

Territory: Blue Line Lockup  
Personality: corrupt authority who believes the uniform makes every action legal  
Visual hook: lathi, police lights, and a mid-fight loss of composure  
Mechanics: lathi thrust, unblockable low sweep, reflectable tear gas, grabs, Constable reinforcements, and a three-point posture system

Parrying Yadav drains posture. Only the full posture break produces the major stagger, giving his duel a disciplined defensive rhythm. At half health he enters the faster “Off Duty” phase.

### Commander Rana — The Iron Lion

Territory: Iron Monsoon  
Personality: commanding, physically dominant, and convinced strength creates ownership  
Visual hook: long red coat, chain weapon, lightning reveal, and rage-state Asura arms  
Mechanics: chain pressure, dash punches, unblockable sweep, grabs, and elite Sepoy reinforcements

Rana is the final exam for the chapter's combat system. His rage effect adds translucent arm silhouettes without changing his base scale or covering the readable attack pose.

## Combat language

### Five-hit combo

Press Attack once to begin. Press Attack again around each confirmed contact to buffer the next hit. Hit-stop preserves buffered inputs, so the player can follow the impact rhythm rather than guessing exact animation frames.

The five contacts rise in commitment and damage. The last hit launches. A missed attack cannot immediately fast-cancel, preventing safe button spam.

### Parry and evasion

- Green melee telegraph: hold parry to counter and stagger on contact.
- Green projectile: hold parry to reflect it toward its source.
- Red heavy telegraph: unblockable; move, jump, or otherwise evade.
- Hazard: control the arena and avoid the affected ground.

A successful parry produces the dedicated clash sound, brief hit-stop, short slow-motion tail, meter gain, and an immediate offensive cancel window. The stance remains active while held; releasing it creates a brief punishable recovery.

### Crowd composition

Enemy waves should mix functions rather than merely add health:

- Front line: Goonda, Constable, Pehlwan.
- Reach and denial: Batta, Sepoy.
- Back line: Masala, Operator.
- Disruption: Bandar, Rickshaw Punk.

Three pressure slots prevent a large crowd from attacking simultaneously, while orbit behavior keeps enemies distributed around the arena.

### Environmental combat

- Arena edges create wall splats and bounce victims back into play.
- Airborne enemies remain hittable through a damage-scaled juggle.
- Thrown or launched bodies can collide with other enemies.
- Breakable props produce resources and make each screen spatially distinct.
- Stage ambience reacts to heavy impacts.

## Cinematic direction

### Hero entrance

The entrance should remain slower than ordinary gameplay and communicate a complete character beat:

1. Motorcycle approaches with CHAD already smoking.
2. He takes one or two puffs while the engine idles.
3. He dismounts through a scale-matched transition.
4. He flexes or cracks his knuckles.
5. The audio-only entrance line plays.
6. He settles into the exact gameplay guard scale before control begins.

### Boss introductions

Every reveal must use something unique to its stage:

- Raja: vehicle skid and stopped meter.
- Mirchi: steam and the cart.
- Refund: blackout, monitors, lift, and ringing phones.
- Yadav: station facade and police lights.
- Rana: storm silhouette, lightning reveal, and chain slam.

Reusable generic walk-on cinematics should not replace these sequences.

### Voice direction

Voice is sparse punctuation:

- Entrance statement.
- First-wave challenge.
- Selected boss or stage reactions.
- Major victory beats.

Clips should not overlap, repeat every wave, or write the spoken entrance line on screen.

## Visual production rules

- CHAD and every enemy use a fixed scale across an animation family.
- No artificial silhouette outline is added during sprite processing.
- Transparent edges use hard alpha with chroma despill to prevent a green fringe.
- Fists, weapons, feet, and faces must remain present and readable in every contact frame.
- Ground anchors remain stable unless a move intentionally jumps.
- AI-generated sheets are source material; processed frames are the production assets.
- New animation families must be checked in Asset Lab at real game timing and frame by frame.
- Contact sheets for the complete cast live under `assets/qa/`.
- Background figures should not be added as decorative full-body NPC cutouts. Prefer motion embedded in architecture, weather, props, light, particles, and animals.

## Environmental story language

The chapter should communicate progression even without dialogue:

| Visual motif | Meaning |
|---|---|
| Rickshaws, meters, blocked lanes | Raja's control of movement |
| Cooking fires, pots, chemical clouds | Mirchi's supply network |
| Phones, monitors, tickets, cyan light | Refund's bureaucracy and communications |
| Barricades, lathis, red/blue sweep | Yadav's official protection |
| Crates, chains, banners, fort walls | Rana's military organization |

Repeating evidence—matching stamps, colors, crate markings, or phone symbols—can visually connect the five organizations before a formal story scene exists.

## Progression and replay

- The campaign begins with Bazaar Heat unlocked.
- Clearing a stage unlocks the next act.
- Left and right on the title screen select any unlocked stage.
- Sequential play preserves meter and gives partial healing.
- Replaying an unlocked stage starts a fresh run state for that selection.
- Difficulty should come from more demanding compositions and mechanics, not only increased health.

## Iteration targets

These are intentionally unresolved decisions for future sessions:

### Story clarity

- Decide the precise inciting dispute between CHAD and Raja.
- Add one short connective visual after each boss that points to the next district.
- Decide whether Rana has prior knowledge of CHAD or only reacts to the destruction of his network.
- Author the final departure image and tease the next world-tour city.

### Stage transitions

- Determine whether the five acts remain selectable chapters or visually stream together during campaign play.
- Add traversal beats between combat gates: motorcycle glimpses, metro stairs, service elevators, station doors, or the fort approach.
- Give each stage at least one non-combat pacing beat without removing player control for too long.

### Boss depth

- Give Raja a clearer second phase after the rickshaw breaks.
- Make Mirchi alter the arena based on which cart component is destroyed first.
- Expand Refund's phone and monitor interactions without increasing projectile clutter.
- Strengthen Yadav's posture tutorial before the boss.
- Give Rana one signature final-phase pattern unique to the Iron Asura form.

### Enemy variety

- Add palette or costume variants tied to districts while retaining role readability.
- Consider one stage-specific enemy per future world-tour chapter instead of continually increasing the universal roster.
- Audit whether six-enemy compositions remain readable on all difficulty settings.

### Presentation

- Add bespoke portraits for Raja and Refund.
- Replace remaining placeholder stage-to-stage story cards with environmental transitions.
- Continue frame-by-frame checks whenever timing, scale, or sprite processing changes.

## Canon and change control

For iteration purposes:

- Stage names, boss order, the five-stage hierarchy, current roster, and combat roles are current canon.
- Specific connective clues and the final departure scene are working story direction, not yet fully implemented.
- New ideas should be added first under Iteration targets, then promoted into the relevant canonical section when implemented or explicitly approved.
- When code and this document disagree, reconcile both in the same change whenever practical.

## Current implementation references

- Stage definitions and wave compositions: `js/stages.js`
- Player combat and Meteor Lariat: `js/player.js`
- Common enemy roles and AI: `js/enemies.js`
- Boss identities and mechanics: `js/bosses.js`
- Entrance, title cards, boss reveals, and ending: `js/screens.js`
- Sound and voice slots: `js/audio.js`
- Frame-by-frame review tool: `lab.html` and `js/lab.js`
- Production sprite manifest: `assets/frames/manifest.json`
- Cast contact sheets: `assets/qa/`

## Revision log

### 0.1 — 2026-08-06

- Captured the implemented five-act India chapter.
- Defined the working narrative hierarchy connecting all five bosses.
- Documented CHAD, nine common enemies, five bosses, and their gameplay roles.
- Recorded cinematic, environmental, audio, sprite-scale, outline, and animation-QA rules.
- Identified story, transition, boss, variety, and presentation targets for future iteration.
