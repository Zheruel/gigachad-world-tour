# Lair animation pipeline experiment

The review lab compares the preserved production baseline with three generation
strategies at final game scale. Run:

```sh
./.venv/bin/python tools/build_animation_experiments.py
./.venv/bin/python tools/serve.py 8001
```

Then open `http://localhost:8001/review-animation-pipeline.html`. Pause the lab and
use `STEP FRAME` to inspect registration without playback hiding a bad transition.

## Findings

### Tiger: anchor first, then one sheet

The best result starts with one carefully art-directed stalking pose, derives the
walk sheet from that anchor, and registers every processed cell around the ribcage.
Bounding-box or paw centering is wrong because the paws are supposed to travel; it
makes an otherwise usable in-place cycle slide from side to side. The same anchor was
used for a compact rest-pose sheet so the animal keeps its low, dangerous silhouette.

The direct sheet control improved leg staging but retained the friendlier house-cat
attitude. The installed hybrid has eight walk frames rather than six.

### Couch: one midpoint edit at a time

Both six-cell sheets failed. Even with a strong anchor, the model redrew the pelvis,
knees, sofa seams, and side table from cell to cell. Freezing pixels after generation
made visible seams and was also rejected.

The installed sequence keeps the four original, stable key poses and inserts three
separately generated halfway poses. Each edit sees only its two neighbouring key
poses, is aligned against the invariant lower sofa band, and is then processed with
the same scale and canvas registration as the originals. Lower-band change stays
between 0.08% and 0.19%, versus roughly 21% to 44% for sheet generation.

### Fish: generate once, animate deterministically

At this scale a regenerated body is noise, not animation. One generated anchor is
quantized once; code derives four frames by moving only the detached tail fan one
device pixel. The body is byte-identical. The school is reduced from 26 independently
phased fish to 14, preventing overlapping outlines from reading as flicker.

## Pipeline rules

- Keep generated sources immutable in `generated/` and processed game-size frames in
  `processed/`.
- Use chroma green for repeatable sprite generation. Some transparent requests arrived
  as RGB files with the preview checkerboard baked into the pixels; the processor can
  recover them, but chroma keying is less ambiguous.
- Register on stable mass: tiger ribcage, sofa lower band, fish body. Never register an
  animation on moving extrema.
- Judge both at enlarged scale and at actual game scale. Pause and step every frame.

The numeric measurements used by the lab are saved in `metrics.json`.
