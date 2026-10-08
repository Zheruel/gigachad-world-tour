import { G, W, RANKS, COMBO_TICKS } from './engine.js';
import { ASSETS } from './assets.js';
import { drawTextShadow, textWidth } from './sprites.js';

export const STYLE_BOUNDS = Object.freeze({ x: 416, y: 34, w: 60, h: 44 });

// A small rank badge, quiet hit count and hairline expiry meter. Only a new rank
// gets a one-pixel lift; ordinary hits never enlarge or shake the display.
export function drawStyleRank(ctx) {
  if (G.combo < 3 || G.comboT <= 0 || G.rank < 0) return;
  const rank = RANKS[G.rank];
  if (!rank) return;
  const right = W - 8, age = 90 - G.rankT;
  const col = rank.color;
  ctx.save();
  ctx.globalAlpha = Math.min(1, G.comboT / 18);
  const art = ASSETS['style_' + rank.letter.toLowerCase()];
  const base = G.rank === 6 ? 26 : G.rank === 5 ? 22 : 20;
  const h = base + (age < 4 ? 1 : 0);
  const y = 62 - h;
  if (art) {
    const w = Math.min(42, Math.round(art.width * h / art.height));
    ctx.drawImage(art, right - w, y, w, h);
  } else {
    const scale = G.rank >= 5 ? 2 : 3;
    drawTextShadow(ctx, rank.letter, right - textWidth(rank.letter, scale), 62 - 5 * scale, col, scale);
  }
  const text = G.combo + ' HITS';
  ctx.globalAlpha *= .85;
  drawTextShadow(ctx, text, right - textWidth(text, 1), 67, '#c8bfb0', 1);
  ctx.globalAlpha *= .65;
  const gy = 75, gw = 24;
  ctx.fillStyle = '#130d16'; ctx.fillRect(right - gw, gy, gw, 1);
  ctx.fillStyle = col; ctx.fillRect(right - gw, gy, Math.round(gw * G.comboT / COMBO_TICKS), 1);
  ctx.restore();
}
