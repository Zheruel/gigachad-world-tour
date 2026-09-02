// bosslib.js - the pieces every boss shares: the parry class of each pattern, the
// player hit test, friendly fire on reds, and the telegraph tint. bosses.js and the
// per-act boss modules both import from here, so neither has to import the other.
import { G } from './engine.js';
import { blit } from './sprites.js';
import { spawnSpark } from './effects.js';
import { hurtPlayer, resolveIncomingHit } from './player.js';

// green counter | green reflect | red unblockable | hazard
export const PARRY_CLASS = {
  dashpunch: 'counter', lathi: 'counter', samosa: 'reflect', wrench: 'reflect', phone: 'reflect',
  grab: 'unblockable', lathisweep: 'unblockable', teargas: 'reflect', steamjet: 'unblockable',
  cartcharge: 'unblockable', chutney: 'hazard', whistle: 'hazard',
  // DIRTY DELHI
  charge: 'counter', stomp: 'unblockable',
  drop: 'counter', snatch: 'unblockable', screech: 'unblockable', throw: 'reflect',
  troop: 'hazard', lunge: 'counter',
  sweep: 'unblockable', bucketdrop: 'unblockable', hose: 'reflect', swing: 'counter',
  // THE NIGHT TRAIN
  torch: 'reflect', ledger: 'counter', check: 'hazard',
  chain: 'counter', hook: 'unblockable', shoulder: 'unblockable', lift: 'unblockable', uncouple: 'hazard',
};

export function isGreen(pattern) {
  const c = PARRY_CLASS[pattern] || 'counter';
  return c === 'counter' || c === 'reflect';
}

// A melee hit from a boss on the player. `parryClass` defaults to the pattern's.
export function tryHitPlayer(b, dmg, range, heavy, tol, parryClass) {
  const p = G.player;
  if (p.state === 'down' || p.state === 'getup' || p.dying) return false;
  if (Math.abs(p.x - (b.x + b.face * range * 0.5)) < range * 0.5 + 11 && Math.abs(p.y - b.y) < (tol || 16) && p.z < 22) {
    if (resolveIncomingHit(p, b, { parryClass: parryClass || PARRY_CLASS[b.pattern] || 'counter' })) return true;
    hurtPlayer(p, dmg, b.face, heavy);
    spawnSpark(p.x, p.y - 40);
    G.audio.sfx(heavy ? 'heavy' : 'punch');
    return true;
  }
  return false;
}

// A red hits anything standing in it, both sides. Returns the number of enemies hit.
export function hitEnemiesNear(x, y, rx, ry, dmg, dir, heavy, skip) {
  let n = 0;
  for (const e of G.enemies) {
    if (e === skip || e.dead || e.state === 'dying' || e.state === 'thrown') continue;
    if (Math.abs(e.x - x) < rx && Math.abs(e.y - y) < ry && e.z < 20) {
      e.hurt(dmg, dir === undefined ? (e.x < x ? -1 : 1) : dir, heavy, false);
      spawnSpark(e.x, e.y - 40);
      n++;
    }
  }
  return n;
}

// The telegraph: green for something you can parry, red for something you must move
// from, white on a hit. `cue` is true during the wind-up.
export function blitTelegraph(ctx, b, f, dx, dy, cue) {
  const telegraph = (cue && ((b.t >> 1) & 1)) || b.flash > 0;
  if (!telegraph) { blit(ctx, f, dx, dy); return; }
  ctx.save();
  ctx.filter = cue && isGreen(b.pattern)
    ? 'brightness(1.8) sepia(1) saturate(5) hue-rotate(70deg)'
    : cue ? 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-35deg)' : 'brightness(2.2)';
  blit(ctx, f, dx, dy);
  ctx.restore();
}

// The diamond (parry it) or the cross (move) over the wind-up.
export function drawCueMarker(ctx, b, sx, cy) {
  ctx.save();
  ctx.strokeStyle = isGreen(b.pattern) ? '#6dff82' : '#ff4050';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (isGreen(b.pattern)) {
    ctx.moveTo(sx, cy - 6); ctx.lineTo(sx + 6, cy); ctx.lineTo(sx, cy + 6); ctx.lineTo(sx - 6, cy); ctx.closePath();
  } else {
    ctx.moveTo(sx - 6, cy - 6); ctx.lineTo(sx + 6, cy + 6); ctx.moveTo(sx + 6, cy - 6); ctx.lineTo(sx - 6, cy + 6);
  }
  ctx.stroke();
  ctx.restore();
}
