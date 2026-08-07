#!/bin/bash
# Locker-bank panels for stage 3 (Lords of the Lockerroom).
cd /Users/tinzeljar/Documents/gachi
G=./tools/gen_codex.sh
BG="16-bit SNES beat em up game background art in the style of Streets of Rage 2, wide side-scrolling interior seen straight from the side, crisp detailed pixel art, moody lighting, no people, no characters, no text, no watermark, no border"
$G assets/ai/bg_locker_a.png landscape "Gym locker room: long banks of battered steel lockers in green and grey, wooden slat benches in front of them, towels hung on hooks, a wall clock, a first aid box, gym bags on the floor, warm overhead strip lights, wet grey tiled floor at the very bottom. $BG" &
$G assets/ai/bg_locker_b.png landscape "Gym locker room wrestling corner: blue foam wrestling mat area with rope barrier, a heavy punching bag on a chain, wall mirror, motivational muscle poster, more steel lockers on the right, a laundry cart of white towels, warm overhead lights, wet grey tiled floor at the very bottom. $BG" &
wait
echo LOCKER-BG-DONE
