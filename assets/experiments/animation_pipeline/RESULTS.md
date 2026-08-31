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

The sequence keeps the four original key poses and inserts three separately generated
halfway poses. Each edit sees only its two neighbouring key poses. Alignment alone
still left subtle leather redraws, so the final pass recovers only CHAD's changing
pixels and composites them over one canonical empty sofa/table plate. Every visible
fixture pixel is now sourced from the same image in every frame; only CHAD changes.

### Fish: generate once, animate deterministically

At this scale a regenerated body is noise, not animation. The final school mixes two
single-image anchors: a slim sardine and smaller sprat. Code derives four frames for
each by moving only the detached tail fan one device pixel; each body is byte-identical.
Eleven fish face with the school's travel direction, use a slower tail cadence, and
repel one another gently so they do not merge into a flashing silver knot.

## Optional video-to-sprite route

Image-to-video is useful for discovering organic in-betweens for a large actor. It is
not the final asset format. Start from a high-resolution key pose on chroma green, keep
the camera completely static, request a short seamless in-place action, then extract
more candidates than needed. Select the clearest key poses, remove the background,
register them on stable mass, and apply one shared palette. Furniture should still be
composited from one canonical plate after extraction.

The direct image sheet/per-pose route remains better for tiny repeated fish, because
video compression and diffusion drift affect a large percentage of a 6-11px body.

## Pipeline rules

- Keep generated sources immutable in `generated/` and processed game-size frames in
  `processed/`.
- Use chroma green for repeatable sprite generation. Some transparent requests arrived
  as RGB files with the preview checkerboard baked into the pixels; the processor can
  recover them, but chroma keying is less ambiguous.
- Register on stable mass: tiger ribcage and fish body. Composite fixtures from a
  canonical plate. Never register an animation on moving extrema.
- Judge both at enlarged scale and at actual game scale. Pause and step every frame.

The numeric measurements used by the lab are saved in `metrics.json`.
