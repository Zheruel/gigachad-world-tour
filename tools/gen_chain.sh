#!/bin/bash
# gen_chain.sh - generate an animation as a CHAIN, each frame referencing the last.
#
# The problem this solves: frames generated independently come back with the whole
# body re-invented every time. Measured across CHAD's sets, the animations that read
# well (the cigar idle) change ~18% of their leg pixels between frames, while the hook
# changed 67% and the jab changed 54% of its torso. That is not a frame-count problem -
# 8 independently invented poses jitter exactly as much as 3. It is a continuity
# problem, and the fix is to hand the model the previous frame and tell it to change
# one thing.
#
# So every frame here is generated with TWO references: the previous frame (for pose
# continuity) and ref_chad.png (for identity), plus a prompt that names only the delta.
set -uo pipefail
cd /Users/tinzeljar/Documents/gachi
G=tools/gen_codex.sh
R=assets/ai/ref_chad.png
O=assets/ai/chad

S="32-bit arcade beat em up game sprite in the style of Streets of Rage 4 and Street Fighter III, crisp detailed pixel art, side view facing right, solid flat bright green chroma-key background (RGB 0,255,0), no shadow, no ground line, no text, no watermark, no border"

# The continuity clause. This is the whole trick.
KEEP="CRITICAL: this must be the very next frame of an animation whose previous frame is the first attached image. Reproduce that image exactly - identical character, identical costume, identical scale, identical position on the canvas, identical camera distance, and identical everything that is not explicitly listed as changing below. Do not redraw or reposition the body. Change ONLY what is described"

# chain <outPrefix> <startFrame> <desc1> <desc2> ...
# frame 1 is copied from an existing frame; each later frame chains off the one before.
chain() {
  local prefix=$1 start=$2; shift 2
  local prev="$O/${prefix}1.png"
  [ -s "$prev" ] || cp "$start" "$prev"
  local i=2
  for d in "$@"; do
    local out="$O/${prefix}${i}.png"
    $G "$out" portrait "$KEEP: $d. $S" "$prev" "$R"
    [ -s "$out" ] && prev="$out"
    i=$((i+1))
  done
}

# ---- idle: breathing only. The feet must not move at all. ----
(
chain cidle "$O/chad_gidle1.png" \
  "his chest rises very slightly on an inhale and his shoulders lift by one or two pixels. His feet, legs, hips and arms stay in exactly the same place" \
  "his chest is at the top of the inhale, shoulders at their highest, fists raised one pixel higher. Feet, legs and hips still identical" \
  "his chest lowers on the exhale, shoulders settling back down. Feet, legs and hips still identical"
) &

# ---- jab: only the lead arm moves ----
(
chain cjab "$O/chad_gidle1.png" \
  "his lead arm begins to straighten forward from the guard, fist moving out to about half extension at shoulder height. His legs, hips, torso lean and rear arm do not move at all" \
  "his lead arm is now snapped completely straight out in front at shoulder height, fist clenched, shoulder rotated forward behind the punch. Legs and hips unchanged" \
  "his lead arm is drawn halfway back toward his chin, elbow bending. Legs and hips unchanged"
) &

# ---- hook: the torso rotates, the feet stay planted ----
(
chain chook "$O/chad_gidle1.png" \
  "his rear fist draws back and out to the side and his shoulders coil away from the target. His feet stay planted in exactly the same spot" \
  "his rear arm swings forward in a horizontal arc with the elbow bent at ninety degrees, fist reaching the centre line at head height, torso rotating through. Feet still planted in the same spot" \
  "the hook has swung fully through, the fist carried past the centre line and the shoulders rotated as far as they go. Feet still planted in the same spot" \
  "his arm is returning back toward the guard and his shoulders are unwinding. Feet still planted in the same spot"
) &

# ---- uppercut: the body drops then drives up ----
(
chain cupper "$O/chad_gidle1.png" \
  "he dips into a crouch by bending both knees, dropping his whole body about eight pixels lower, and his rear fist drops down beside his hip. His feet stay in exactly the same spot on the ground" \
  "he is driving upward out of the crouch, legs half extended, the punching fist rising past his own chest. Feet still in the same spot" \
  "he is fully extended upward on his toes with the punching fist thrust high above his own head, body stretched in a straight line. Feet still in the same spot" \
  "his arm is coming back down from overhead and his feet are settling flat again, body returning toward the guard" \
) &
wait

# ---- walk: arms and torso locked, legs advance one step at a time ----
(
chain cwlk "$O/chad_gwlk1.png" \
  "his weight settles onto the front leg, the front knee bending and the whole body dropping about three pixels. The back heel lifts off the ground. His arms, shoulders and head stay locked in the guard and do not swing" \
  "his back leg swings through and passes directly under his body beside the standing leg, and his body rises to its highest point. Arms and shoulders still locked in the guard" \
  "he pushes up off the standing leg and the swinging knee lifts and travels forward in front of him. Arms and shoulders still locked" \
  "the swinging leg reaches full forward stride and its heel touches down in front, the other leg stretched back behind with the toe pushing off. Arms and shoulders still locked" \
  "his weight settles onto the newly planted front leg, the knee bending and the body dropping about three pixels. The other heel lifts. Arms and shoulders still locked" \
  "the back leg swings through and passes under his body, and the body rises to its highest point. Arms and shoulders still locked" \
  "he pushes up off the standing leg and the swinging knee lifts and travels forward. Arms and shoulders still locked"
) &
wait

echo "=== chained frames done ==="
ls assets/ai/chad | grep -cE "cidle|cjab|chook|cupper|cwlk"
