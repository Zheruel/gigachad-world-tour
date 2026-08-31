# Image generation prompt set

These are the reusable prompt patterns from the experiment. The final assets were
generated with the built-in image generation tool, then normalized by
`tools/build_animation_experiments.py`.

## Tiger identity anchor

```text
Create one game-ready 1990s arcade beat-'em-up pixel-art sprite of a full-grown Bengal
tiger in a low stalking side view, facing right. Make it dangerous and charismatic:
head low between powerful shoulders, focused eyes, slightly exposed fangs, ears turned
back, heavy forequarters, long counterbalancing tail, grounded paws. Preserve realistic
tiger anatomy and orange/black/cream markings. Crisp deliberate pixels, dark navy
outline, compact 16-bit palette, no blur or antialiasing. Entire animal visible with
comfortable margin, no floor shadow, no text, no props. Transparent background.
```

## Tiger walk sheet from the anchor

```text
Using the supplied tiger anchor as an exact character reference, create one strict
4-column by 2-row sprite sheet containing eight consecutive frames of an in-place low
stalking walk cycle, read left-to-right then top-to-bottom. Keep head size, stripe map,
ribcage, palette, scale, facing direction, and camera identical in every cell. Animate
physical weight transfer through shoulders, hips, paws, spine and tail; the torso must
not translate inside its cell. Each complete tiger stays inside its equal cell with
generous separation and no overlap. 1990s arcade pixel art, hard pixel edges, no blur,
no labels or grid lines. Solid chroma green background (#00ff00).
```

## Tiger rest family from the anchor

```text
Using the supplied tiger anchor as an exact identity reference, create a strict 3 by 2
pixel-art sprite sheet. Cells 1-5 are: lying alert, head raised while still lying,
upright seated, deep foreleg stretch with hindquarters high, and a planted aggressive
snarl. Leave cell 6 empty green. Preserve the same low dangerous adult Bengal tiger,
stripe map, palette, scale and right-facing camera. Complete silhouette inside each
cell, no overlap, no labels, hard 16-bit arcade pixels. Solid chroma green background
(#00ff00).
```

## Couch midpoint edit template

Generate each transition separately, substituting the two adjacent reference images.

```text
Create exactly one game-ready pixel-art frame that is the physical halfway pose between
REFERENCE A and REFERENCE B. Preserve the sofa, side table, ashtray, floor contact,
camera, crop, scale, CHAD's face, clothing, proportions, palette and every furniture
seam exactly. Change only the minimum anatomy needed for a natural halfway movement of
the cigar hand, elbow, shoulders and head. Do not redesign, recrop, translate, zoom or
add objects. Entire scene visible. Crisp 1990s arcade pixels, no antialiasing or text.
Solid chroma green background (#00ff00).
```

Run it for lounge → cigar raised, cigar raised → draw, and draw → exhale. A wide couch
sheet is intentionally not part of the final method because it redraws the fixture.

## Fish anchors

```text
Create exactly one sleek sardine/anchovy baitfish in side view, facing right. Use a
long narrow hydrodynamic body, modest forked tail, tiny realistic dark eye, restrained
fins, silver belly, cool blue-gray back and one soft cyan highlight. Match premium
1990s arcade pixel art with deliberate clusters and a compact palette. It must remain
readable after reduction to roughly 22-28 pixels long and 7-11 pixels high. One isolated
fish, neutral horizontal pose, genuine transparent background, no cartoon eye, thick
black contour, scenery, bubbles, text, blur or antialiasing. Keep the tail root clearly
separable for deterministic one-pixel animation.
```

Generate a second anchor separately with the same constraints but as a smaller, slimmer
juvenile sprat with a muted warm lateral glint. No additional fish frames should be
generated. The final one-pixel tail motion is derived deterministically from each
anchor.

### Fish art-direction reset (installed)

```text
Create exactly one compact, full-bodied silver-blue reef baitfish facing right. Match
the broad, bright schooling-fish silhouette in the supplied gameplay reference: short
oval/fusiform body, pale silver belly, blue-gray back, small dark eye, modest forked
tail, compact fins. It must read clearly after reduction to roughly 32 by 18 pixels.
Match the supplied tankscape and shark's crisp 1990s arcade pixel art. Strict side
profile, entire fish visible, genuinely transparent background. One fish and one pose
only. No elongated sardine or anchovy shape, giant eye, scenery, bubbles, shadow, text,
blur, antialiasing, multiple fish, or sprite sheet.
```

The installed large and small fish are both reductions of this one anchor. Only the
tail fan moves; the body pixels remain locked.

## Optional tiger image-to-video motion source

Use the tiger identity anchor as the first frame on a solid chroma-green canvas.

```text
Locked orthographic side-view camera. The tiger performs exactly one seamless in-place
low stalking walk cycle: shoulders and hips transfer real weight, paws lift and plant
in sequence, spine flexes subtly, and the tail counterbalances. The tiger never travels
across the frame. Preserve the exact head, stripe map, collar, body proportions, scale,
lighting, pixel-art rendering and green background. No camera movement, zoom, crop,
rotation, new objects, scenery, morphing, motion blur, interpolation blur or text. End
in the same physical pose as the first frame for a clean loop.
```

Extract candidates with `tools/video_to_sprite.py`, then review and keep only the
clearest eight frames. The video is a motion source, not a shippable sprite animation.
