#!/bin/bash
# Generate AI sprite frames + stage backgrounds with retries.
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
TOOL=/Users/tinzeljar/.kimi-code/plugins/managed/image_generation/scripts/image_generation_tool.py
REF="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2Fdc4352791d4f76784ce15386943f3040ae7642c5cd86152f7ab6c61d25724e64?filename=ref_hero_fullbody.png&sig=YMBZuv6JXYhiFNbXEeDffVAUgv1ABgNjuhOSReYTC4c=&t=o"

gen() { # gen <output> <ratio> <ref:yes|no> <description>
  local out="$1" ratio="$2" useref="$3" desc="$4"
  [ -s "$out" ] && { echo "SKIP $out"; return 0; }
  for i in 1 2 3; do
    if [ "$useref" = yes ]; then
      $PY $TOOL generate --description "$desc" --ratio "$ratio" --resolution 1K --background opaque --reference-image "$REF" --output "$out" >/dev/null 2>&1
    else
      $PY $TOOL generate --description "$desc" --ratio "$ratio" --resolution 1K --background opaque --output "$out" >/dev/null 2>&1
    fi
    [ -s "$out" ] && { echo "OK $out"; return 0; }
    echo "retry $i failed for $out"; sleep 5
  done
  echo "FAILED $out"; return 1
}

STYLE="16-bit SNES beat em up game sprite, crisp detailed pixel art, full body, side view facing right, feet on the ground, identical character and proportions to the reference image, solid flat bright green chroma-key background, no shadow, no ground line, no text"
mkdir -p assets/ai/frames
gen assets/ai/frames/hero_idle.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, standing in a fighting stance with fists raised, $STYLE"
gen assets/ai/frames/hero_walk1.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, walking with left leg forward, $STYLE"
gen assets/ai/frames/hero_walk2.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, walking mid-stride with legs passing each other, $STYLE"
gen assets/ai/frames/hero_walk3.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, walking with right leg forward, $STYLE"
gen assets/ai/frames/hero_jab.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, throwing a quick jab punch with left arm extended forward, $STYLE"
gen assets/ai/frames/hero_hook.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, throwing a powerful right hook punch, torso twisted, $STYLE"
gen assets/ai/frames/hero_uppercut.png 2:3 yes "muscular blond wrestler in blue jeans, brown belt, red gloves and red boots, throwing a rising uppercut punch with fist high, $STYLE"

gen assets/ai/bg_gymwall.png 16:9 no "16-bit SNES beat em up game background, wide interior gym wall panorama at night: brown brick wall, tall windows showing a dark blue night city skyline, grey lockers, wooden benches, dumbbell racks, vintage bodybuilding posters, moody warm lighting from ceiling lamps, crisp detailed pixel art, no people, no text, no watermark" 
gen assets/ai/bg_floor.png 16:9 no "16-bit SNES game floor texture, polished wooden gym floor planks with a subtle glossy sheen, warm brown tones, slight perspective, seamless tileable pattern, crisp pixel art, no people, no objects, no text"

echo BATCH-DONE
ls -la assets/ai/frames/ assets/ai/bg_* 2>/dev/null