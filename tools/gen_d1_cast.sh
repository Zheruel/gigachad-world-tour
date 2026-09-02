#!/bin/bash
# gen_d1_cast.sh - the DIRTY DELHI cast, generated as sprite SHEETS and sliced.
#
# One strip per animation, never one pose at a time: asked pose by pose the model
# re-invents the body every time, asked for the row it lays the poses out as a set.
# Measured on CHAD's jab that took frame-to-frame leg churn from 61% to 15%.
#
# Every family gets its own reference portrait first, passed as the last argument to
# every strip, so the likeness holds across eight separate generations.
#
# Usage: tools/gen_d1_cast.sh [refs|pappu|cooker|thela|mudlark|dhobi|beasts|thekedar|all]
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
O=assets/ai/d1cast
mkdir -p $O

WHAT="${1:-all}"

SHEET="Draw this as a single horizontal sprite sheet strip: the SAME character repeated in a row of separate poses, evenly spaced, every pose at EXACTLY the same scale and standing on the SAME ground line, with a clear band of empty flat green between each pose so they never touch or overlap, and nothing any pose is holding or swinging may cross into that gap. The character must be identical in every pose - identical face, hair, build, costume and colours - only the pose differs. 32-bit arcade beat em up game sprite art in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no ground line drawn, no text, no numbers, no labels, no frames, no borders, no watermark"

REF="a character reference sheet for a 32-bit arcade beat em up game: one single full length figure standing straight on facing the viewer, arms relaxed at the sides, crisp detailed pixel art in the style of Streets of Rage 4, solid flat bright green chroma-key background (RGB 0,255,0), no shadows, no text, no border, no watermark"

# ---- descriptions --------------------------------------------------------
PAPPU="A huge oiled Indian akhara wrestler in his forties wearing only a red langot loincloth, shaved head, thick black handlebar moustache, a sacred thread across his bare chest, wet mud smeared on his shoulders and knees, enormous arms and a heavy gut, bare feet"


COOKER="A wiry Indian street cook in his thirties in a filthy sweat stained vest and checked lungi, a rag knotted round his head, burn scars up both forearms, carrying a battered aluminium pressure cooker by its handle with a screaming steam whistle on top and a rubber hose taped to its side"

THELA="An enormous thickset Indian market porter in his forties, shaven head, a coiled cloth pad on his shoulder, a stained grey vest stretched over a huge chest and belly, a checked lungi hitched up, thick forearms and enormous hands, bare feet, a heavy leather strap round his waist"

MUDLARK="A gaunt half naked Indian river scavenger, soaking wet from head to foot, black river silt caked over his skin and shorts, long matted wet hair plastered to his skull, sunken eyes, a length of rusted chain wound round one fist, wiry and low to the ground"

DHOBI="A lean sinewy Indian washerman in his fifties, wet white dhoti hitched between his legs, bare wet chest, grey stubble and a white cloth wound round his head, corded forearms, holding one end of an enormous soaking wet white bedsheet that trails behind him like a whip"

SANDH="An enormous filthy Indian street bull, humped zebu shoulders, long forward curving horns, mangy off white hide streaked with dung and mud, a torn ear, a broken frayed rope round its neck, seen from the side"

DABBAWALA="A thin wiry Indian lunch delivery man in a white kurta and a white Gandhi cap, sandals, carrying an enormous swaying tower of stacked round steel tiffin tins balanced on his head and steadied with one raised hand"

THEKEDAR="A thin nervous Indian man in his fifties in a filthy checked shirt and loose trousers, thick smeared glasses, grey stubble, a rag knotted round his neck, holding a heavy steel spanner in both hands like a man who has never hit anyone with one"

refs() {
$G $O/ref_pappu.png portrait "$PAPPU, $REF" &
$G $O/ref_cooker.png portrait "$COOKER, $REF" &
wait
$G $O/ref_thela.png portrait "$THELA, $REF" &
$G $O/ref_mudlark.png portrait "$MUDLARK, $REF" &
$G $O/ref_dhobi.png portrait "$DHOBI, $REF" &
wait
$G $O/ref_sandh.png portrait "$SANDH, $REF" &
$G $O/ref_dabbawala.png portrait "$DABBAWALA, $REF" &
$G $O/ref_thekedar.png portrait "$THEKEDAR, $REF" &
wait
}

# ---- USTAD PAPPU: no weapons, no projectiles, nothing to break -----------
pappu() {
R=$O/ref_pappu.png
$G $O/pappu_idle.png landscape "$PAPPU, a 4 pose idle loop read left to right, stood square and low with both hands open at chest height in a wrestler's guard. Pose 1: at rest. Pose 2: chest rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four and do not move. $SHEET" "$R" &
$G $O/pappu_walk.png landscape "$PAPPU, a 4 pose heavy walking cycle read left to right, walking to the right in a wrestler's guard. Pose 1: left leg forward, heel down, right leg stretched back. Pose 2: weight settled onto the front leg, body at its lowest. Pose 3: right leg forward, heel down. Pose 4: weight settled onto the front leg, body at its lowest. His arms and head stay locked in the same guard and do NOT swing - only the legs move. $SHEET" "$R" &
$G $O/pappu_charge.png landscape "$PAPPU, a 4 pose shoulder charge read left to right. Pose 1: coiled back on his rear leg, shoulder dropped. Pose 2: driving forward, leading shoulder out, both arms trailing behind. Pose 3: fully committed, body almost horizontal behind the leading shoulder, back leg extended. Pose 4: staggering upright past the impact, off balance, arms wide. $SHEET" "$R" &
wait
$G $O/pappu_grab.png landscape "$PAPPU, a 3 pose bear hug grab read left to right. Pose 1: both arms thrown wide and open, chest forward. Pose 2: arms closing in front of him around an unseen body, hands nearly meeting. Pose 3: arms locked together and crushing inward, back arched, head thrown back. $SHEET" "$R" &
$G $O/pappu_stomp.png landscape "$PAPPU, a 4 pose ground stomp read left to right. Pose 1: crouched with both fists drawn back at his waist. Pose 2: rising, one knee lifted high to his chest. Pose 3: at full height with the knee at its highest and both fists above his head. Pose 4: the raised foot slammed flat to the ground, knees bent, both fists driven straight down at his sides. $SHEET" "$R" &
$G $O/pappu_hurt.png landscape "$PAPPU, a 3 pose sequence read left to right. Pose 1: head snapped back and to one side, both arms flung out, torso twisted away from an unseen punch. Pose 2: doubled forward over his stomach, arms in. Pose 3: fallen flat on his back on the ground, arms and legs sprawled, seen from the side. $SHEET" "$R" &
wait
}

# ---- COOKER: the anti-mash lesson, taught in one death -------------------
cooker() {
R=$O/ref_cooker.png
$G $O/cooker_idle.png landscape "$COOKER, a 4 pose idle loop read left to right, standing with the pressure cooker held low in one hand at his hip. Pose 1: at rest. Pose 2: chest rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four. $SHEET" "$R" &
$G $O/cooker_walk.png landscape "$COOKER, a 4 pose walking cycle read left to right, walking to the right carrying the pressure cooker low in one hand. Pose 1: left leg forward, heel down. Pose 2: weight settled onto the front leg, body lowest. Pose 3: right leg forward, heel down. Pose 4: weight settled onto the front leg. His arms, the cooker and his head stay locked in the same position and do NOT swing - only the legs move. $SHEET" "$R" &
$G $O/cooker_beam.png landscape "$COOKER, a 4 pose steam attack read left to right. Pose 1: crouched with the pressure cooker gripped in both hands at his chest, one hand on the valve. Pose 2: swinging the cooker forward and levelling it, arms half extended. Pose 3: the cooker thrust straight out in front of him at waist height in both hands, arms locked, body braced and leaning back against it, the nozzle pointing forward. Pose 4: the same brace held, leaning back harder, face turned away. No steam, smoke, fire or spray is drawn anywhere in any pose. $SHEET" "$R" &
wait
$G $O/cooker_hurt.png landscape "$COOKER, a 3 pose sequence read left to right, still holding the pressure cooker. Pose 1: head snapped back and away, free arm flung out, recoiling from an unseen punch. Pose 2: doubled forward over his stomach. Pose 3: fallen flat on his back on the ground, arms sprawled, the pressure cooker lying on its side beside his hand, seen from the side. $SHEET" "$R" &
wait
}

# ---- THELA: one rig, four props. His hands hold an UNSEEN bar ------------
# The cart is a separate prop drawn at a measured offset and never in the sprite:
# two drawings of the same object have to stay in frame-by-frame agreement, and the
# gym rack and bench are in the git history as the record of how much that costs.
thela() {
R=$O/ref_thela.png
$G $O/thela_idle.png landscape "$THELA, a 4 pose idle loop read left to right, standing square with both fists closed at hip height as if resting on an unseen bar in front of him. Pose 1: at rest. Pose 2: chest rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four. Nothing is drawn in his hands. $SHEET" "$R" &
$G $O/thela_walk.png landscape "$THELA, a 4 pose heavy walking cycle read left to right, walking to the right leaning forward with both fists closed at hip height as if pushing an unseen handcart. Pose 1: left leg forward, heel down. Pose 2: weight settled onto the front leg, body lowest. Pose 3: right leg forward. Pose 4: weight settled onto the front leg. His arms, shoulders and head stay locked in the same forward lean and do NOT move - only the legs. Nothing is drawn in his hands. $SHEET" "$R" &
$G $O/thela_ram.png landscape "$THELA, a 4 pose charge read left to right, leaning hard into an unseen handcart with both fists closed at hip height. Pose 1: coiled back, shoulders low, back leg loaded. Pose 2: driving forward, body at forty five degrees, back leg extended. Pose 3: fully committed, body almost horizontal, both legs stretched out behind, head down between his shoulders. Pose 4: staggering upright, arms dropped to his sides, chest heaving. Nothing is drawn in his hands in any pose. $SHEET" "$R" &
wait
$G $O/thela_atk.png landscape "$THELA, a 3 pose overhand club punch read left to right, both hands empty. Pose 1: one huge fist drawn back above and behind his shoulder. Pose 2: the arm swung forward and down in an arc, fist at head height. Pose 3: the fist driven all the way down past his knee at the end of the follow through, body bent forward over it. $SHEET" "$R" &
$G $O/thela_hurt.png landscape "$THELA, a 3 pose sequence read left to right, both hands empty. Pose 1: head snapped back, both arms flung out, recoiling from an unseen punch. Pose 2: doubled forward over his stomach. Pose 3: fallen flat on his back on the ground, arms and legs sprawled, seen from the side. $SHEET" "$R" &
wait
}

# ---- MUDLARK: he comes out of the water at the back of the lane ----------
mudlark() {
R=$O/ref_mudlark.png
$G $O/mudlark_idle.png landscape "$MUDLARK, a 4 pose idle loop read left to right, crouched low and forward with the chain fist raised. Pose 1: at rest. Pose 2: shoulders rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four. $SHEET" "$R" &
$G $O/mudlark_walk.png landscape "$MUDLARK, a 4 pose scuttling walk cycle read left to right, moving to the right crouched low. Pose 1: left leg forward, foot down. Pose 2: weight settled onto the front leg, body lowest. Pose 3: right leg forward. Pose 4: weight settled onto the front leg. His arms and head stay locked in the same low crouch and do NOT swing - only the legs move. $SHEET" "$R" &
$G $O/mudlark_rise.png landscape "$MUDLARK, a 4 pose sequence of a man climbing up out of water onto a ledge, read left to right, cut off at the waist by the bottom edge of each pose so the lower body is never drawn. Pose 1: only the top of a wet head and two hands gripping an unseen edge. Pose 2: head and shoulders up, arms straight and pushing down. Pose 3: chest clear, one arm reaching forward. Pose 4: upright from the waist up, both arms out, head up and snarling. $SHEET" "$R" &
wait
$G $O/mudlark_grab.png landscape "$MUDLARK, a 3 pose lunging grab read left to right. Pose 1: crouched and coiled with both arms drawn back. Pose 2: lunging forward, both arms thrown straight out ahead, fingers spread, body stretched out low. Pose 3: both arms locked closed around an unseen body and hauling backward, heels dug in, leaning hard back. $SHEET" "$R" &
$G $O/mudlark_hurt.png landscape "$MUDLARK, a 3 pose sequence read left to right. Pose 1: head snapped back and away, both arms flung out. Pose 2: curled forward over himself. Pose 3: lying flat on his back on the ground, limbs sprawled, seen from the side. $SHEET" "$R" &
wait
}

# ---- THE DHOBI: an elite, so no intro art - but the longest reach --------
dhobi() {
R=$O/ref_dhobi.png
$G $O/dhobi_idle.png landscape "$DHOBI, a 4 pose idle loop read left to right, standing with the wet sheet gathered and hanging from one hand close beside his own leg. Pose 1: at rest. Pose 2: chest rising on an inhale. Pose 3: at the top of the inhale. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four, and the gathered sheet stays entirely within his own outline and never reaches sideways. $SHEET" "$R" &
$G $O/dhobi_walk.png landscape "$DHOBI, a 4 pose walking cycle read left to right, walking to the right with the wet sheet gathered and hanging close beside his own leg. Pose 1: left leg forward, heel down. Pose 2: weight settled onto the front leg. Pose 3: right leg forward. Pose 4: weight settled onto the front leg. His arms, head and the gathered sheet stay locked in place and do NOT swing - only the legs move, and the sheet never reaches sideways beyond his own outline. $SHEET" "$R" &
wait
$G $O/dhobi_whip.png landscape "$DHOBI, a 4 pose sheet whip read left to right. In every pose the wet sheet is drawn coiled tightly around his own arm and body and NEVER extends sideways beyond his own silhouette. Pose 1: the sheet gathered against his chest, torso coiled away. Pose 2: torso rotating through, the sheet wrapped down his leading arm. Pose 3: the leading arm snapped straight out in front of him at shoulder height with the sheet still wound tight along it, ending at his fist. Pose 4: the arm carried down and across his own body, the sheet trailing down against his own leg. $SHEET" "$R" &
$G $O/dhobi_hurt.png landscape "$DHOBI, a 3 pose sequence read left to right, the sheet gathered close against his own body throughout. Pose 1: head snapped back, free arm flung out. Pose 2: doubled forward over his stomach. Pose 3: fallen flat on his back on the ground, the sheet crumpled on top of him, seen from the side. $SHEET" "$R" &
wait
}

# ---- SANDH the bull, and the dabbawala runner ---------------------------
beasts() {
$G $O/sandh_walk.png landscape "$SANDH, a 4 pose walking cycle read left to right, walking to the right. Pose 1: front left and back right legs stretched apart. Pose 2: legs gathered under the body. Pose 3: front right and back left legs stretched apart. Pose 4: legs gathered under the body. His head, hump, horns and body stay at exactly the same height and angle in all four - only the legs move. $SHEET" "$O/ref_sandh.png" &
$G $O/sandh_paw.png landscape "$SANDH, a 4 pose sequence of a bull pawing the ground read left to right, standing still. Pose 1: head lowered, horns forward, one front hoof raised. Pose 2: the raised hoof dragged back beneath him. Pose 3: the hoof scraped forward again, head lower. Pose 4: head fully down between the shoulders, horns levelled forward, both front legs braced. His back legs and body stay in exactly the same place in all four. $SHEET" "$O/ref_sandh.png" &
$G $O/sandh_charge.png landscape "$SANDH, a 4 pose charge read left to right, running flat out to the right with the head down and horns levelled forward. Pose 1: front legs reaching forward, back legs gathered. Pose 2: fully extended, all four legs off the ground and stretched apart. Pose 3: front hooves striking down, back legs coming through. Pose 4: gathered under himself, back arched. The head stays low and level in all four. $SHEET" "$O/ref_sandh.png" &
wait
$G $O/sandh_hurt.png landscape "$SANDH, a 3 pose sequence read left to right. Pose 1: head thrown up and back, front legs braced apart, recoiling. Pose 2: front knees buckling, head down. Pose 3: collapsed on his side on the ground, legs folded, seen from the side. $SHEET" "$O/ref_sandh.png" &
$G $O/dabbawala_run.png landscape "$DABBAWALA, a 4 pose running cycle read left to right, sprinting to the right with the tiffin tower balanced on his head and one hand raised to steady it. Pose 1: front leg reaching forward, back leg extended behind. Pose 2: gathered under himself, both knees bent. Pose 3: the other leg reaching forward. Pose 4: gathered under himself. His head, raised hand and the tiffin tower stay at exactly the same height and angle in all four - only the legs move. $SHEET" "$O/ref_dabbawala.png" &
$G $O/dabbawala_drop.png landscape "$DABBAWALA, a 3 pose sequence read left to right. Pose 1: staggering, both arms up, the tiffin tower on his head starting to lean. Pose 2: falling sideways, arms out, the stacked tins coming apart above him. Pose 3: sprawled on the ground on his side with loose steel tiffin tins scattered around him, seen from the side. $SHEET" "$O/ref_dabbawala.png" &
wait
}

# ---- the dredger's operator. `operator` is already a live enemy key ------
thekedar() {
R=$O/ref_thekedar.png
$G $O/thekedar_idle.png landscape "$THEKEDAR, a 4 pose frightened idle loop read left to right, backed up with the spanner held across his chest in both hands. Pose 1: at rest. Pose 2: chest rising on a shallow fast breath. Pose 3: at the top of it. Pose 4: lowering. His feet, legs and hips are IDENTICAL in all four. $SHEET" "$R" &
$G $O/thekedar_swing.png landscape "$THEKEDAR, a 3 pose clumsy spanner swing read left to right. Pose 1: the spanner hauled back over one shoulder in both hands, eyes shut, face turned away. Pose 2: the spanner swung down and across in front of him, arms straight, body twisting after it. Pose 3: dragged round past the end of the swing, off balance, the spanner low and behind him. $SHEET" "$R" &
$G $O/thekedar_hurt.png landscape "$THEKEDAR, a 3 pose sequence read left to right. Pose 1: head snapped back, the spanner flying out of his hands, arms flung wide. Pose 2: doubled forward over his stomach, hands empty. Pose 3: lying flat on his back on the ground, arms sprawled, glasses off beside his head, seen from the side. $SHEET" "$R" &
wait
}

case "$WHAT" in
  refs) refs;;
  pappu) pappu;; cooker) cooker;; thela) thela;;
  mudlark) mudlark;; dhobi) dhobi;; beasts) beasts;; thekedar) thekedar;;
  all) refs; pappu; cooker; thela; mudlark; dhobi; beasts; thekedar;;
esac

echo "=== $WHAT done ==="
ls -la $O
