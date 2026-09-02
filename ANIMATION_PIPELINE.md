# Animation asset pipeline

This is the production decision record for AI-assisted sprite animation. It replaces the
old universal advice to generate every animation as one sheet.

## The settled rule

Choose the workflow from what must remain invariant:

| Asset | Best generation strategy | What may move | Stable anchor |
|---|---|---|---|
| Large isolated actor | One identity anchor, then one reference-conditioned sheet; optionally use short video only to discover motion | Whole articulated body | Torso/ribcage mass and ground line |
| Actor using furniture | A few key poses plus one-at-a-time midpoint edits | Actor only | One canonical furniture plate |
| Tiny repeated sprite | One strong still anchor, with code-derived micro-motion | Tail, fin, glow, or one small appendage | Entire body |
| Smoke, sparks, bubbles | Procedural particles | Effect particles | Measured attachment point per pose |

The model is good at designing a coherent image. It is less reliable at redrawing the
same small object or furniture geometry across frames. Generation therefore solves
appearance and broad pose design, while deterministic code solves registration, tiny
motion, timing, and reusable effects.

## Core production rules

1. Start with one approved identity image.
2. Generate the fewest images that can express the motion.
3. Preserve invariants explicitly in every prompt and processing step.
4. Register on stable mass, never on a moving extremity or per-frame bounding box.
5. Apply one scale and one palette to the complete family.
6. Inspect at actual game size, then frame-step at enlarged size.
7. Install only the chosen result; keep rejected variants only while an active review page
   still compares them.

## Large actors: anchor first

Use this for a fighter, animal, or other subject large enough that real weight transfer
matters.

1. Generate one strong side-view identity anchor with the complete silhouette visible.
2. Approve its proportions at final game size before generating motion.
3. Use that anchor as the reference for a compact sheet containing one action.
4. Process the cells together with one scale and palette.
5. Register the cycle on torso/ribcage mass and a common ground line.
6. Reject the sheet if identity, width, or apparent scale changes—even if individual
   poses look attractive.

The tiger experiment demonstrated the limit: the generated dangerous tiger had stronger
attitude but became roughly 30% wider and lumbered through its walk. The smaller original
cycle therefore remained production. A better prompt cannot compensate for a result that
fails in the room at final scale.

### When video helps

Image-to-video can produce more organic shoulder, hip, and tail transitions for a large
actor. Treat it only as a motion source:

1. Supply the approved identity anchor as the first frame.
2. Lock camera, scale, direction, background, and in-place motion.
3. Extract more candidate frames than needed.
4. Select the clearest key poses.
5. Remove the background, register, rescale, and quantize as one family.

Do not ship raw video frames. Diffusion drift, interpolation blur, and compression remain
visible after pixel reduction. `tools/video_to_sprite.py` implements the extraction and
registration side of this optional route.

## Actors on furniture: canonical composite

Use this whenever the character overlaps a couch, bed, vehicle, machine, or other fixture.
A generated sheet usually redraws both actor and furniture. Even tiny seam or leather
changes read as the entire object breathing.

The couch workflow is:

1. Keep one empty sofa/table image as the canonical fixture plate.
2. Keep a small number of approved character key poses.
3. Generate missing midpoint poses one at a time, using only adjacent key poses as
   references.
4. Recover an actor matte from each pose.
5. Composite only actor pixels over the exact canonical plate.
6. Author timing as unequal holds; the resting pose should dominate the cycle.
7. Attach smoke to measured cigar-tip coordinates for each pose, with a separate mouth
   coordinate for the exhale.

This produced effectively zero visible furniture drift. Alignment alone was insufficient;
the canonical composite guarantees stability.

For poses that cannot be cleanly matted, generate one pose at a time against the same
reference and measure the fixture band before accepting it.

## Tiny sprites: generate once, animate deterministically

At baitfish scale, regenerated body pixels are noise. A one-pixel highlight or eye change
affects a large percentage of the visible animal and becomes flicker across a school.

The production baitfish workflow is:

1. Generate one broad, readable side-view fish anchor.
2. Reduce it to the required production sizes with a shared palette.
3. Keep the body byte-identical.
4. Detach the tail fan and move it by one device pixel through `-1, 0, +1, 0`.
5. Animate life procedurally through pathing, separation, facing, and school deformation.
6. Use fewer fish with more breathing room instead of many independently phased redraws.

The current large and small baitfish come from the same source anchor. Their measured body
churn is 0.0% across all frames.

This approach also applies to insects, birds at very small scale, indicator lights,
cloth tassels, and similar repeated detail.

## Prompt structure

State the intended game size and invariants. A useful prompt order is:

```text
Asset type and use
Reference image roles
Subject and action
Final readable size
Camera, direction, crop, and ground line
Identity and geometry that must remain unchanged
Pixel-art palette and edge treatment
Transparent or chroma-key background
Explicit avoid list
```

For a sheet, also specify equal cells, reading order, complete silhouettes, generous
gutters, identical scale, and no labels or grid lines. For a one-at-a-time edit, repeat
“change only the actor pose; preserve fixture, crop, scale, and lighting exactly.”

The final prompt set for the tiger, couch, and fish experiment lives in
`assets/experiments/animation_pipeline/PROMPTS.md`.

## Processing and registration

### Shared family pass

- Chroma-key or preserve real alpha.
- Remove isolated components and edge contamination.
- Determine one scale from an approved reference pose. A short strip often comes back
  larger than the rest; `tools/check_cast_scale.py` shows it and `tools/rescale_strips.py`
  brings it onto the family's scale by the length of a full-length pose.
- Place all frames on one canvas and ground line.
- Register locomotion on stable torso mass.
- Quantize the complete family against one palette.
- Add an outline only when it remains readable at final size.

### Furniture pass

- Align every source against the canonical fixture.
- Build a conservative actor matte from color and difference cues.
- Composite actor pixels over the canonical plate.
- Measure the supposedly fixed band; non-zero change must be explained by actor overlap.

### Tiny-sprite pass

- Reduce the anchor first.
- Hard-threshold alpha at the final size.
- Isolate only the appendage that should move.
- Reuse the unchanged body and palette across every frame.

The current implementation is in `tools/build_animation_experiments.py`. Metrics and the
decision record are stored beside its output under
`assets/experiments/animation_pipeline/`.

## Review checklist

Before installing an animation:

- Does the subject keep the same apparent size and identity?
- Does stable furniture remain pixel-identical?
- Does the centre of mass stay fixed for an in-place cycle?
- Do planted feet stop sliding?
- Does the first-to-last transition close cleanly?
- Does the animation still read at 1× game scale?
- Are repeated sprites coordinated rather than independently flickering?
- Do procedural particles start at the correct attachment point in every pose?
- Is the runtime frame count consistent with the asset registry and update code?

Use `review-animation-pipeline.html` to pause and step the lair experiments. Use
`lab.html` for general character sequences.

## Asset lifecycle

Keep:

- the selected raw anchor or source sheet;
- the prompt that produced it;
- the deterministic processor;
- final runtime frames;
- a small active comparison set when a review page still uses it.

Remove:

- superseded runtime copies;
- one-off contact sheets that a tool can rebuild;
- abandoned review pages and their export trees;
- intermediate slices duplicated by a canonical source sheet;
- generated virtual environments or scripts tied to expired external services.

Raw generations belong in ignored `assets/ai/`; runtime art does not. This keeps costly
source material local without making the game repository depend on gigabytes of history.
