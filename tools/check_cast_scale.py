#!/usr/bin/env python3
"""Do a character's strips agree on how big the character is?

process_char.py scales every pose by ONE factor measured off the reference pose, which
is right only if all the strips drew the figure at the same size. Nothing makes two
generations agree on that, and the failure mode is a fighter who visibly shrinks when
he walks.

What this can and cannot tell you, stated plainly, because two cleverer metrics were
tried first and both lie:

- HEAD WIDTH in the top tenth of the figure is nonsense for any pose that is not
  upright: in a shoulder charge the top of the figure is a shoulder.
- SILHOUETTE AREA is not conserved across poses either - a crouched or charging body
  occludes itself, so it measures 20-30% smaller while being exactly the same size.

So this measures the one thing that is unambiguous: the TALLEST frame in each strip,
against the tallest frame of the reference strip. A pose can legitimately be shorter
than standing - crouching, charging and lying down all are - so a low number is
information, not a failure. A strip that comes out TALLER than a standing pose can
only be a scale disagreement, and that is what this fails on.

Read the low numbers yourself: a walk at 0.88 is a crouched guard, a walk at 0.70 is a
smaller drawing. When a strip does disagree, fix it the way tools/normalize_sheets.py
does - one factor for that whole strip, never per frame, or the within-sheet
consistency that made sheets worth using is lost.

Usage: check_cast_scale.py <char> [<char> ...] [--dir DIR] [--ref idle]
"""
import argparse
import glob
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from PIL import Image
from process_char import key_green, subject, hard_alpha

# Airborne poses are legitimately taller than standing, so the "taller = wrong" test
# does not apply to them.
AIRBORNE = ("drop", "charge", "rise", "throw")
TOLERANCE = 1.08


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("chars", nargs="+")
    ap.add_argument("--dir", default="assets/ai/d1frames/")
    ap.add_argument("--ref", default="idle")
    ap.add_argument("--body", type=int, default=0,
                    help="intended logical height of the reference pose; prints the "
                         "--height/--fill that make the tallest pose fit exactly")
    a = ap.parse_args()

    bad = False
    for char in a.chars:
        strips: dict[str, int] = {}
        for path in sorted(glob.glob(f"{a.dir}{char}_*.png")):
            name = os.path.basename(path)[len(char) + 1:-4]
            strip = name.rstrip("0123456789")
            h = hard_alpha(subject(key_green(Image.open(path)))).height
            strips[strip] = max(strips.get(strip, 0), h)
        if not strips:
            print(f"{char}: no frames in {a.dir}")
            continue
        ref = strips.get(a.ref) or max(strips.values())
        over = [s for s, h in strips.items()
                if h / ref > TOLERANCE and not s.startswith(AIRBORNE)]
        bad = bad or bool(over)
        print(f"{'BAD' if over else 'OK '} {char}: tallest frame per strip, "
              f"vs {a.ref} = {ref}px")
        for strip, h in sorted(strips.items(), key=lambda kv: -kv[1]):
            r = h / ref
            mark = "  <-- taller than standing, rescale this strip" if strip in over else ""
            print(f"      {strip:<10} {r:.2f}x  ({h}px){mark}")

        # The canvas has to fit the TALLEST pose, or process_char.py:116 silently
        # rescales that one frame and the "one scale for all poses" invariant the tool
        # exists to enforce is gone. So the canvas comes from the tallest pose and
        # --fill comes from the reference - never the other way round.
        tallest = max(strips.values())
        if a.body:
            span = tallest / ref
            canvas = round(a.body * span)
            print(f"      -> body {a.body} logical: --height {canvas * 2} --fill "
                  f"{1 / span:.3f}   (HEIGHTS.{char} = {canvas})")
        elif tallest > ref:
            print(f"      -> canvas must fit {tallest / ref:.2f}x the reference; "
                  f"pass --body <logical height of the {a.ref} pose> for the numbers")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
