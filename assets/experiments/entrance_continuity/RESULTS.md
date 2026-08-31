# Motorcycle entrance continuity experiments

Production assets were not modified. All trials use the current CHAD identity,
motorcycle reference, and V8 dismount as their baseline.

## Trials

| Trial | Generation constraint | Visual result |
|---|---|---|
| `gpt_reference_locked_3x2.png` | Six-cel reference redraw with strong prose invariants | Good identity, but the airborne leg holds and then jumps; bike and scale drift increased |
| `gpt_fixed_bike_edit_3x2.png` | Asked GPT to edit a grid of pixel-identical motorcycles | The model still redrew the motorcycles; prose cannot make an image region mathematically immutable |
| `gpt_focused_swing_4x1.png` | Four larger cels with an explicit verbal leg arc | Better scale stability, but two nearly duplicate airborne poses followed by a jump to landing |
| `gpt_skeleton_conditioned_4x1.png` | Motorcycle plus explicit joint scaffold | Best one-shot motion path and best head/character scale stability |
| `gpt_hero_only_skeleton_4x1.png` | Joint-conditioned CHAD-only layer | Cleanest controllable body motion and suitable for deterministic compositing |
| `hybrid_locked_bike_4x1.png` | CHAD-only layer composited over one repeated bike plate | Only method that actually locks the motorcycle; needs a more carefully authored dismount scaffold before production use |

## Automated stability measurements

Lower is better. `front_geometry_jitter` and `front_pixel_change_mean` inspect
the unoccluded front wheel/fork region. `subject_top_jitter` is a coarse check
for head/overall scale drift; intentional crouching can increase it.

| Trial | Front geometry jitter | Front pixel change | Subject-top jitter |
|---|---:|---:|---:|
| Current production baseline | 0.0044 | 0.2205 | 0.0179 |
| Reference-locked six-cel redraw | 0.0253 | 0.3156 | 0.0885 |
| Requested fixed-bike edit | 0.0190 | 0.3274 | 0.0714 |
| Focused four-cel prose strip | 0.0068 | 0.2364 | 0.0047 |
| Skeleton-conditioned combined strip | 0.0114 | 0.2238 | **0.0013** |
| Skeleton CHAD + locked-bike composite | **0.0007** | **0.0078** | 0.0143 |

## Conclusion

The project was not merely prompting GPT incorrectly. Generating complete
motion sheets was the right improvement, but text and reference images do not
provide a temporal rig. The experiments show that explicit joint positions
materially improve motion, while asking GPT to preserve a complex static object
does not actually lock its pixels.

The strongest production workflow is therefore:

1. Author the motion as a reusable skeleton/joint path.
2. Generate only the deforming character in short three- or four-cel strips.
3. Slice by connected components so extended limbs cannot leak into another cel.
4. Apply one scale factor to the whole animation family.
5. Composite immutable props such as the motorcycle from one canonical plate.
6. Composite a fixed foreground/occlusion layer over the character where required.
7. Run the existing shared-palette, bottom-anchor, and in-game animation checks.

The current hybrid output is evidence for the method, not a production replacement:
the provisional scaffold does not yet place CHAD's hips and planted boot naturally
enough around the saddle. A production pass should author those joints against a
simple motorcycle collision/occlusion diagram first.

PixelLab was not included in this run because no PixelLab API key is configured.
Its skeleton animator remains the most relevant external A/B comparison against
the locally scaffolded GPT workflow.
