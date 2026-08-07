#!/bin/bash
# Generate remaining hero animation frames with retries.
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
TOOL=/Users/tinzeljar/.kimi-code/plugins/managed/image_generation/scripts/image_generation_tool.py
REF="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2Fdc4352791d4f76784ce15386943f3040ae7642c5cd86152f7ab6c61d25724e64?filename=ref_hero_fullbody.png&sig=YMBZuv6JXYhiFNbXEeDffVAUgv1ABgNjuhOSReYTC4c=&t=o"

gen() { # gen <output> <ratio> <description>
  local out="$1" ratio="$2" desc="$3"
  [ -s "$out" ] && { echo "SKIP $out"; return 0; }
  for i in 1 2 3 4; do
    $PY $TOOL generate --description "$desc" --ratio "$ratio" --resolution 1K --background opaque --reference-image "$REF" --output "$out" >/dev/null 2>&1
    [ -s "$out" ] && { echo "OK $out"; return 0; }
    echo "retry $i failed for $out"; sleep 6
  done
  echo "FAILED $out"; return 1
}

STYLE="16-bit SNES beat em up game sprite, crisp detailed pixel art, full body, side view facing right, identical character and proportions to the reference image, solid flat bright green chroma-key background, no shadow, no ground line, no text"
gen assets/ai/frames/hero_dash.png 2:3 "muscular blond wrestler in blue jeans and red boots, sprinting fast leaning forward with arms pumping, $STYLE"
gen assets/ai/frames/hero_jump.png 2:3 "muscular blond wrestler in blue jeans and red boots, jumping in mid-air with knees tucked up, $STYLE"
gen assets/ai/frames/hero_jumpkick.png 3:2 "muscular blond wrestler in blue jeans and red boots, flying side kick in mid-air with right leg extended forward, $STYLE"
gen assets/ai/frames/hero_grab.png 2:3 "muscular blond wrestler in blue jeans and red boots, reaching forward to grab with both arms extended, $STYLE"
gen assets/ai/frames/hero_knee.png 2:3 "muscular blond wrestler in blue jeans and red boots, driving a knee strike upward while pulling down with both hands, $STYLE"
gen assets/ai/frames/hero_throw.png 2:3 "muscular blond wrestler in blue jeans and red boots, heaving a throw over his shoulder, both arms swung forward and down, $STYLE"
gen assets/ai/frames/hero_hurt.png 2:3 "muscular blond wrestler in blue jeans and red boots, recoiling from a punch, head snapped back and arms flailing, $STYLE"
gen assets/ai/frames/hero_down.png 3:2 "muscular blond wrestler in blue jeans and red boots, lying knocked down flat on his back on the ground, $STYLE"
gen assets/ai/frames/hero_getup.png 2:3 "muscular blond wrestler in blue jeans and red boots, crouching on one knee getting back up, $STYLE"
gen assets/ai/frames/hero_victory.png 2:3 "muscular blond wrestler in blue jeans and red boots, both arms raised high in a victory pose, $STYLE"
echo HERO2-DONE
ls assets/ai/frames/