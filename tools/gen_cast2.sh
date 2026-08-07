#!/bin/bash
# Animation frames for the canon cast + the two henchman types.
# Needs tools/gen_refs.sh and tools/gen_lore_refs.sh first.
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh

S="16-bit SNES beat em up game sprite, crisp detailed pixel art, single full body character, side view facing right, identical character, costume and proportions to the attached reference image, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

DANNY="A tall Canadian bodybuilder wrestler with short spiky dark-blond hair, clean shaven, tanned, wearing plain white wrestling briefs and white wrestling boots"
VAN="A Vietnamese-American leather bondage master with black hair, thin moustache, black leather peaked cap, mirrored sunglasses, studded black leather chest harness with steel rings, black leather shorts and tall black leather boots"
WOLFF="A Canadian-Greek bodybuilder wrestler with short jet black hair, clean shaven, deep tan, wearing bright red wrestling trunks and black wrestling boots"
MAXON="An American wrestler with shoulder-length wavy dark-blond hair and a thick blond moustache, tanned, wearing dark blue wrestling trunks and white wrestling boots"
RIC="A Brazilian dancer with dark brown skin, short black hair, a black fedora hat, wearing only white briefs, barefoot"
WHIP="A lean wiry pale henchman in a studded black leather harness, black leather cap, black leather trousers and fingerless gloves, holding a black chain whip"
BATH="A stocky oiled bathhouse bruiser with a shaved head, red terry sweatband, white towel around his waist, white towel over one shoulder, flip-flop sandals"
HERO="A muscular blond wrestler in blue jeans, brown belt, red fingerless gloves and red boots"

RD=assets/ai/ref_danny_fullbody.png
RV=assets/ai/ref_van_fullbody2.png
RW=assets/ai/ref_wolff_fullbody.png
RM=assets/ai/ref_maxon_fullbody.png
RR=assets/ai/ref_ricardo_fullbody.png
RP=assets/ai/ref_whip_fullbody.png
RA=assets/ai/ref_bather_fullbody.png
RH=assets/ai/ref_hero_fullbody.png

# --- batch 1: danny ---
$G assets/ai/frames/danny_idle.png   portrait  "$DANNY, standing in a wrestling fighting stance with fists raised, $S" "$RD" &
$G assets/ai/frames/danny_walk1.png  portrait  "$DANNY, stepping forward with left leg forward, $S" "$RD" &
$G assets/ai/frames/danny_walk2.png  portrait  "$DANNY, stepping forward with right leg forward, $S" "$RD" &
$G assets/ai/frames/danny_punch.png  portrait  "$DANNY, throwing a fast straight punch with the arm fully extended forward, $S" "$RD" &
$G assets/ai/frames/danny_slam.png   landscape "$DANNY, leaping forward in mid air with one knee driven forward for a flying knee attack, $S" "$RD" &
wait
# --- batch 2: danny + van ---
$G assets/ai/frames/danny_grab.png   portrait  "$DANNY, lunging forward with both arms out to grapple his opponent, $S" "$RD" &
$G assets/ai/frames/danny_hurt.png   portrait  "$DANNY, recoiling from a punch with his head snapped back, $S" "$RD" &
$G assets/ai/frames/danny_down.png   landscape "$DANNY, lying knocked out flat on his back on the ground, $S" "$RD" &
$G assets/ai/frames/van2_idle.png    portrait  "$VAN, standing menacingly with arms slightly spread, $S" "$RV" &
$G assets/ai/frames/van2_walk1.png   portrait  "$VAN, striding forward with left leg forward, $S" "$RV" &
wait
# --- batch 3: van ---
$G assets/ai/frames/van2_walk2.png   portrait  "$VAN, striding forward with right leg forward, $S" "$RV" &
$G assets/ai/frames/van2_punch.png   portrait  "$VAN, throwing a devastating straight punch with the arm fully extended, $S" "$RV" &
$G assets/ai/frames/van2_slam.png    portrait  "$VAN, leaping with both fists clasped high overhead about to slam down, $S" "$RV" &
$G assets/ai/frames/van2_grab.png    portrait  "$VAN, reaching forward with both hands open to grab his victim, $S" "$RV" &
$G assets/ai/frames/van2_hurt.png    portrait  "$VAN, staggering back from a heavy hit, cap tipping off, $S" "$RV" &
wait
# --- batch 4: van + wolff ---
$G assets/ai/frames/van2_down.png    landscape "$VAN, lying knocked out flat on his back on the ground, $S" "$RV" &
$G assets/ai/frames/wolff_idle.png   portrait  "$WOLFF, standing in a wrestler's fighting stance with fists up, $S" "$RW" &
$G assets/ai/frames/wolff_walk1.png  portrait  "$WOLFF, stalking forward with left leg forward, $S" "$RW" &
$G assets/ai/frames/wolff_walk2.png  portrait  "$WOLFF, stalking forward with right leg forward, $S" "$RW" &
$G assets/ai/frames/wolff_punch.png  portrait  "$WOLFF, throwing a huge hammer-fist punch with the arm fully extended forward, $S" "$RW" &
wait
# --- batch 5: wolff ---
$G assets/ai/frames/wolff_slam.png   portrait  "$WOLFF, leaping up with both arms raised high overhead about to hammer down, $S" "$RW" &
$G assets/ai/frames/wolff_grab.png   portrait  "$WOLFF, lunging forward with both arms wide to grapple and lock up his opponent, $S" "$RW" &
$G assets/ai/frames/wolff_hurt.png   portrait  "$WOLFF, staggering backwards from a hit, head thrown back, $S" "$RW" &
$G assets/ai/frames/wolff_down.png   landscape "$WOLFF, lying knocked out flat on his back on the ground, $S" "$RW" &
$G assets/ai/frames/maxon_idle.png   portrait  "$MAXON, standing in a wrestling stance with fists raised, $S" "$RM" &
wait
# --- batch 6: maxon ---
$G assets/ai/frames/maxon_walk1.png  portrait  "$MAXON, stepping forward with left leg forward, $S" "$RM" &
$G assets/ai/frames/maxon_walk2.png  portrait  "$MAXON, stepping forward with right leg forward, $S" "$RM" &
$G assets/ai/frames/maxon_punch.png  portrait  "$MAXON, throwing a big overhand chop with the arm swinging down, $S" "$RM" &
$G assets/ai/frames/maxon_hurt.png   portrait  "$MAXON, recoiling from a punch, hair flying, $S" "$RM" &
$G assets/ai/frames/maxon_down.png   landscape "$MAXON, lying knocked out flat on his back on the ground, $S" "$RM" &
wait
# --- batch 7: ricardo ---
$G assets/ai/frames/ricardo_idle.png  portrait  "$RIC, standing in a loose dance-ready stance with hips cocked and hands near his hat, $S" "$RR" &
$G assets/ai/frames/ricardo_walk1.png portrait  "$RIC, strutting forward with left leg forward, $S" "$RR" &
$G assets/ai/frames/ricardo_walk2.png portrait  "$RIC, strutting forward with right leg forward, $S" "$RR" &
$G assets/ai/frames/ricardo_punch.png landscape "$RIC, performing a spinning roundhouse dance kick with one leg extended horizontally, $S" "$RR" &
$G assets/ai/frames/ricardo_slam.png  portrait  "$RIC, doing a powerful forward hip thrust dance move with both arms flung back, $S" "$RR" &
wait
# --- batch 8: ricardo + henchmen ---
$G assets/ai/frames/ricardo_hurt.png  portrait  "$RIC, recoiling from a punch with his hat flying off, $S" "$RR" &
$G assets/ai/frames/ricardo_down.png  landscape "$RIC, lying knocked out flat on his back on the ground, $S" "$RR" &
$G assets/ai/frames/whip_walk1.png    portrait  "$WHIP, prowling forward with left leg forward, $S" "$RP" &
$G assets/ai/frames/whip_walk2.png    portrait  "$WHIP, prowling forward with right leg forward, $S" "$RP" &
$G assets/ai/frames/whip_atk.png      landscape "$WHIP, cracking his chain whip forward, the whip stretched out straight ahead of him, $S" "$RP" &
wait
# --- batch 9: henchmen ---
$G assets/ai/frames/whip_hurt.png     portrait  "$WHIP, recoiling from a punch with his cap flying off, $S" "$RP" &
$G assets/ai/frames/whip_down.png     landscape "$WHIP, lying knocked out flat on his back on the ground, $S" "$RP" &
$G assets/ai/frames/bather_idle.png   portrait  "$BATH, standing in an aggressive wrestling stance with fists up, $S" "$RA" &
$G assets/ai/frames/bather_walk1.png  portrait  "$BATH, waddling forward with left leg forward, $S" "$RA" &
$G assets/ai/frames/bather_walk2.png  portrait  "$BATH, waddling forward with right leg forward, $S" "$RA" &
wait
# --- batch 10: henchmen + hero ---
$G assets/ai/frames/bather_atk.png    portrait  "$BATH, lunging forward with both arms outstretched to grapple, $S" "$RA" &
$G assets/ai/frames/bather_hurt.png   portrait  "$BATH, recoiling from a punch with his sweatband slipping, $S" "$RA" &
$G assets/ai/frames/bather_down.png   landscape "$BATH, lying knocked out flat on his back on the ground, $S" "$RA" &
$G assets/ai/frames/hero_special.png  portrait  "$HERO, spinning with both arms flung out wide and head thrown back, crackling golden energy aura around him, $S" "$RH" &
wait
echo CAST2-DONE
ls assets/ai/frames/ | wc -l
