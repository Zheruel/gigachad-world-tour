#!/bin/bash
# Generate AI frames for all enemies + boss with retries.
cd /Users/tinzeljar/Documents/gachi
PY=./.venv/bin/python
TOOL=/Users/tinzeljar/.kimi-code/plugins/managed/image_generation/scripts/image_generation_tool.py

gen() { # gen <output> <ratio> <refurl> <description>
  local out="$1" ratio="$2" ref="$3" desc="$4"
  [ -s "$out" ] && { echo "SKIP $out"; return 0; }
  for i in 1 2 3 4 5 6; do
    $PY $TOOL generate --description "$desc" --ratio "$ratio" --resolution 1K --background opaque --reference-image "$ref" --output "$out" >/dev/null 2>&1
    [ -s "$out" ] && { echo "OK $out"; return 0; }
    echo "retry $i failed for $out"; sleep 8
  done
  echo "FAILED $out"; return 1
}

STYLE="16-bit SNES beat em up game sprite, crisp detailed pixel art, full body, side view facing right, identical character and proportions to the reference image, solid flat bright green chroma-key background, no shadow, no ground line, no text"

GRUNT="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F28a3b2fd42a2fb04107db80c4a0c2ab4a83c8b14b3ca34ea955c62d4cfd8a32a?filename=ref_grunt_fullbody.png&sig=d95CcoIi-JzByNqPQD_V0cfalQcWXxyYJLqOsK-g6-I=&t=o"
RUNNER="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F1437a34d7d6e462af68efb2323fb9c520367457e565b2eed7f9b96a86fe26f97?filename=ref_runner_fullbody.png&sig=XDsVBfy1pbzkXiuUh6DV-eKLqEoqqF2RKtLiCLOxF20=&t=o"
HEAVY="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2F3efb4f268c8666d4f79541055bae7a7df39979aea0284a2494997bd213de16ad?filename=ref_heavy_fullbody.png&sig=yETSrZMhB40V4pdmF-01JNtJLR7ORga_GOVzSrW_FFg=&t=o"
BOSS="https://www.kimi.com/apiv2-files/sign-obj/kimi-fs%2Ffiles%2Fblob%2Fb95df9b66b91c72821e4ca5b1d44fa9c5b1af33a5233273a94d6016e98470341?filename=ref_boss_fullbody.png&sig=NFF8FvXcrv90vfA5fTYJdwRK2Jhpjw1dDUXReKT-It4=&t=o"

gen assets/ai/frames/grunt_idle.png 2:3 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, standing in a fighting stance, $STYLE"
gen assets/ai/frames/grunt_walk1.png 2:3 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, walking with left leg forward, $STYLE"
gen assets/ai/frames/grunt_walk2.png 2:3 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, walking with right leg forward, $STYLE"
gen assets/ai/frames/grunt_atk.png 2:3 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, throwing a hard straight punch with arm extended, $STYLE"
gen assets/ai/frames/grunt_hurt.png 2:3 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, recoiling from a hit, head snapped back, $STYLE"
gen assets/ai/frames/grunt_down.png 3:2 "$GRUNT" "muscular punk thug with green mohawk, green camo pants and black boots, lying knocked down flat on his back on the ground, $STYLE"

gen assets/ai/frames/runner_idle.png 2:3 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, in a light fighting stance, $STYLE"
gen assets/ai/frames/runner_walk1.png 2:3 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, walking with left leg forward, $STYLE"
gen assets/ai/frames/runner_walk2.png 2:3 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, walking with right leg forward, $STYLE"
gen assets/ai/frames/runner_atk.png 3:2 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, flying side kick in mid-air with leg extended, $STYLE"
gen assets/ai/frames/runner_hurt.png 2:3 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, recoiling from a hit, head snapped back, $STYLE"
gen assets/ai/frames/runner_down.png 3:2 "$RUNNER" "lean athletic fighter with red bandana, purple track pants and white sneakers, lying knocked down flat on his back on the ground, $STYLE"

gen assets/ai/frames/heavy_idle.png 2:3 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, standing menacingly, $STYLE"
gen assets/ai/frames/heavy_walk1.png 2:3 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, walking heavily with left leg forward, $STYLE"
gen assets/ai/frames/heavy_walk2.png 2:3 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, walking heavily with right leg forward, $STYLE"
gen assets/ai/frames/heavy_atk.png 3:2 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, charging forward with shoulder lowered, $STYLE"
gen assets/ai/frames/heavy_hurt.png 2:3 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, staggering back from a hit, $STYLE"
gen assets/ai/frames/heavy_down.png 3:2 "$HEAVY" "huge heavyset bald bruiser with brown beard, metal shoulder pads and brown pants, lying knocked down flat on his back on the ground, $STYLE"

gen assets/ai/frames/boss_idle.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, standing with arms slightly out menacingly, $STYLE"
gen assets/ai/frames/boss_walk1.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, striding forward with left leg forward, $STYLE"
gen assets/ai/frames/boss_walk2.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, striding forward with right leg forward, $STYLE"
gen assets/ai/frames/boss_punch.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, throwing a devastating straight punch with arm extended, $STYLE"
gen assets/ai/frames/boss_slam.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, leaping with both fists raised overhead about to slam down, $STYLE"
gen assets/ai/frames/boss_hurt.png 2:3 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, staggering back from a hit, $STYLE"
gen assets/ai/frames/boss_down.png 3:2 "$BOSS" "large imposing man in black leather peaked cap, sunglasses, leather harness and black leather pants, lying knocked down flat on his back on the ground, $STYLE"

echo ENEMY-BATCH-DONE
ls assets/ai/frames/ | wc -l