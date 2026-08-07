// fg.js - the near-camera layer. The stage had nothing at all in front of the
// fighters, which is the main reason it read as a painting the fight happened against
// rather than a street the fight happened inside.
//
// Two bands only, and the middle is deliberately empty. Anything drawn across the
// fighting lane hides the fight, so the layer lives above the action (hanging wires,
// awnings, garlands - the fighters never go above y=181) and below it (crates and
// bins whose base is off the bottom edge, poking up into the last thirty logical px
// in front of the near depth lane).
//
// Parallax is slight on purpose. A foreground that slides fast enough to notice reads
// as a mistake; 1.14x is just enough to separate it from the wall behind.
import { G, W } from './engine.js';
import { blit, frameW, frameH } from './sprites.js';

const ART = {};
const PIECES = ['wires', 'tarp', 'garland', 'banner', 'fg_crates', 'fg_bike', 'fg_bins', 'fg_stall',
  'fg_table', 'fg_lamp', 'fg_weights'];

export const FG_PARALLAX = 1.14;

export function loadFG() {
  return Promise.all(PIECES.map((name) => new Promise((resolve) => {
    const img = new Image();
    img.onload = () => { img._as = 2; ART[name] = img; resolve(); };
    img.onerror = () => resolve();
    img.src = `assets/fg/${name}.png`;
  })));
}

export function drawFG(ctx, camX) {
  const list = (G.stage && G.stage.fg) || [];
  for (const p of list) {
    const img = ART[p.art];
    if (!img) continue;
    const w = frameW(img), h = frameH(img);
    const sx = Math.round(p.x - camX * (p.parallax || FG_PARALLAX));
    if (sx + w < -20 || sx > W + 20) continue;
    // hanging pieces are anchored by their top edge, standing ones by their base
    let kick = 0;
    for (const r of G.stageReacts || []) {
      const d = Math.abs(p.x - r.x), reach = 260 * r.strength;
      if (d < reach) kick += (1 - d / reach) * (1 - r.t / r.life) * r.strength;
    }
    const sway = p.top ? Math.sin(G.rawTime * 0.13 + p.x * 0.01) * kick * 2.2 : 0;
    const dy = p.top ? Math.round(p.y + Math.abs(sway) * 0.4) : Math.round(p.y) - h;
    ctx.save();
    if (p.top && kick) {
      ctx.translate(sx + w / 2, dy);
      ctx.rotate(sway * 0.012);
      ctx.translate(-(sx + w / 2), -dy);
    }
    if (p.flip) {
      ctx.save();
      ctx.scale(-1, 1);
      blit(ctx, img, -sx - w, dy);
      ctx.restore();
    } else {
      blit(ctx, img, sx, dy);
    }
    ctx.restore();
  }
}
