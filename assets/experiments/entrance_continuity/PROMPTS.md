# Winning prompt set

The experiments used the built-in ImageGen workflow. These are the two prompts
that produced the strongest motion result and the deterministic hybrid result.

## Skeleton-conditioned combined rig

> Use case: sketch-to-render. Asset type: pose-conditioned four-cel arcade
> sprite animation experiment. Input images: Image 1 is the exact four-cel
> joint scaffold and motorcycle placement target; turquoise lines are bones
> and yellow circles are joints, not visible costume or effects. Image 2 is
> canonical CHAD identity and pixel-art rendering. Image 3 is the existing
> production motion/style reference. Replace each stick skeleton in Image 1
> with the SAME fully rendered CHAD character, fitting his head, neck, torso,
> hips, knees, ankles and boots exactly onto the indicated joints. Remove every
> turquoise line and yellow joint marker. Preserve the four motorcycles as the
> locked geometry target. The planted near leg remains fixed while the far leg
> follows the scaffold through one continuous rearward dismount arc: low behind
> the saddle, straight backward, bending downward behind the saddle, then
> landing beside the planted foot. The torso rises slightly and becomes upright
> in the fourth cel. Keep one hand plausibly stabilizing on the handlebar in the
> first three cels. Preserve identical identity, anatomy, costume, cigar,
> proportions, lighting, palette and pixel density; exactly two arms and two
> legs. Preserve motorcycle wheel diameter, wheelbase, tank, forks, engine,
> exhaust, handlebars, scale, placement, ground line and highlights. Crisp,
> highly detailed 32-bit arcade beat-em-up pixel art. Flat uniform #ff00ff
> chroma background. Exactly one horizontal row of four cels; no guide marks,
> borders, labels, text, shadows, effects, duplicated limbs, side swap, scale
> drift, or leg crossing the tank/front wheel.

## Skeleton-conditioned CHAD-only layer

> Use case: sketch-to-render. Asset type: CHAD-only pose-conditioned sprite
> layer for compositing over a separately locked motorcycle. Input images:
> Image 1 is the exact four-cel joint scaffold; turquoise lines are bones and
> yellow circles are joints. Image 2 is canonical CHAD identity and pixel-art
> rendering. Image 3 shows the separate motorcycle only for spatial context—do
> not draw or include it. Image 4 shows the existing dismount for style and
> anatomy context. Replace each stick skeleton with the SAME fully rendered
> CHAD, fitting head, neck, torso, hips, knees, ankles and boots precisely onto
> the indicated joints. Output CHAD ONLY. Do not include any motorcycle,
> vehicle, handlebar, seat, wheel, engine, prop, ground, shadow or guide mark;
> the motorcycle will be composited separately. The planted near leg remains
> fixed while the far leg follows the scaffold through a continuous rearward
> arc: low and backward, straight backward, bending toward the ground, then
> landing beside the planted foot. The torso rises and becomes upright in cel
> four. The forward hand is posed as though touching an invisible handlebar in
> cels one through three, but no handlebar is drawn. Preserve identical face,
> hair, sunglasses, physique, vest, chest, jeans, boots, cigar, proportions,
> head size, lighting, palette and pixel density; exactly two arms and two legs.
> Crisp, highly detailed 32-bit arcade beat-em-up pixel art. Flat uniform
> #ff00ff chroma background. One horizontal row of four evenly spaced cels;
> CHAD only; no guide marks, borders, labels, text, effects, duplicated limbs,
> side swap, scale drift or camera drift.
