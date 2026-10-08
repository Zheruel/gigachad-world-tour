// train_tte.js - the TTE's confiscated steel trunk. It is his frontal guard; a guard break knocks it
// out of his hands, it tumbles to the floor as a loose prop, and he is open until he has shuffled
// over, bent down and hoisted it back. Knocked flat or caught in a super, he lands with it again
// (those poses are drawn holding it).
import { G, W, clamp } from './engine.js';
import { getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnDust } from './effects.js';
import { getAIFrame } from './aiframes.js';

// Where the trunk lies in his bend-to-grab cell, ahead of his pelvis (logical px).
const REACH = 13, GRAB = 16, HOIST = 30, SHUFFLE = 5, BARGE_WAIT = 75;   // SHUFFLE: floor px per drawn shuffle cell
const REARM = ['down', 'dying', 'thrown', 'getup', 'corpse'];
const TRUNK_WALL = 112;   // the loose trunk never rests nearer the screen edge than this: CHAD (held 35px in) always fits BARGE_CLEAR (76) past it

export const tteLoose = e => !!e.trunk?.loose;

// The heavy (or the hit from behind) that opens his guard sends the trunk flying the way it was struck.
export function knockTrunk(e, dir) {
  e.trunk = { loose: true, hidden: false, x: e.x + e.face * 12, y: e.y + 2, z: 34, vx: (dir || -e.face) * 1.6, vz: 2.2, t: 0 };
  G.audio.sfx('armor');
}

// Every tick, before the state update: the loose trunk flies and settles; a KO, a knockdown or a super puts it back in his arms.
export function tteTrunk(e) {
  const k = e.trunk;
  if (!k?.loose) return;
  if (e.superLocked || REARM.includes(e.state)) { k.loose = false; clearWait(e); return; }
  k.t++;
  // It keeps off an invisible wall well inside the screen edge, so a barge can always knock CHAD clear of it:
  // flying out past it, it rebounds; knocked loose already beyond it, it lands and skids back in.
  const lo = G.camX + TRUNK_WALL, hi = G.camX + W - TRUNK_WALL, inward = k.x < lo ? 1 : k.x > hi ? -1 : 0;
  if (inward && k.vx * inward < 0) k.vx = -k.vx * .6;
  if (k.z > 0 || k.vz > 0) {
    k.x += k.vx; k.z += k.vz; k.vz -= .25;
    if (k.z <= 0) {
      k.z = 0;
      if (k.vz < -2.5) { k.vz = -k.vz * .28; k.vx *= .45; spawnDust(k.x, k.y, 3); G.audio.sfx('armor'); G.shake = Math.max(G.shake, 2); }
      else { k.vz = 0; k.vx = 0; spawnDust(k.x, k.y, 2); G.audio.sfx('land'); }
    }
  } else if (inward && !k.hidden) {
    k.x += inward * Math.min(2, inward > 0 ? lo - k.x : k.x - hi);
    if (k.t % 5 === 0) spawnDust(k.x - inward * 10, k.y, 1);
  }
}

// 'fetch' shuffles him to the trunk, 'pickup' bends and hoists it. Returns false when he has it back.
export function tteStep(e) {
  const k = e.trunk;
  if (!k?.loose) { e.state = 'idle'; e.t = 0; return false; }
  if (e.state === 'fetch') {
    if (k.z > 0) return true;   // wait for it to land
    const side = Math.sign(k.x - e.x) || e.face, tx = k.x - side * REACH, p = G.player;
    e.face = side;
    // CHAD standing over the trunk (or between him and it): he hangs back at arm's length instead of walking through him.
    const lane = Math.abs(p.y - e.y) < 14 && !['down', 'dead'].includes(p.state);
    const blocked = lane && (Math.abs(p.x - tx) < 32 || (p.x - e.x) * side > 0 && (p.x - tx) * side < 0);
    const goal = blocked ? p.x - side * 36 : tx;
    const dx = goal - e.x, dy = k.y - 2 - e.y, step = clamp(dx, -e.speed * 1.3, e.speed * 1.3);
    if (!blocked || dx * side > 0) e.x += step;
    // Kept off it for a beat and a half, he loses patience and barges CHAD off bare-handed.
    if (blocked && (Math.abs(dx) < 2 || dx * side < 0)) { e.fetchWait = true; if ((e.waitT = (e.waitT || 0) + 1) >= BARGE_WAIT) { startBarge(e); return true; } }
    else e.waitT = 0;
    e.y += clamp(dy, -.6, .6); e.shuffling = Math.abs(step) > .05;
    if (e.shuffling && e.t % 10 === 0) spawnDust(e.x - side * 8, e.y, 1);
    // A floored CHAD still sliding clear (boots ~38px behind him, the grabbed trunk ~25px wide of its centre) is let finish before the grab.
    const across = p.state === 'down' && Math.abs(p.y - e.y) < 14 && Math.abs(p.x - k.x) < 70;
    if (!blocked && !across && Math.abs(dx) < 1.5 && Math.abs(dy) < 1.5) { e.x = tx; e.state = 'pickup'; e.t = 0; k.hidden = true; clearWait(e); }
    return true;
  }
  // pickup
  e.face = Math.sign(k.x - e.x) || e.face;
  if (e.t === GRAB) G.audio.sfx('armor');
  if (e.t >= HOIST) { k.loose = false; k.hidden = false; e.state = 'idle'; e.t = 0; e.atkCd = 30; return false; }
  return true;
}

// CHAD camping on the trunk: the second hit he takes while kept off it turns into the barge instead of another flinch.
export function tteWaitHit(e) {
  if (!e.fetchWait || !tteLoose(e)) return false;
  e.waitHits = (e.waitHits || 0) + 1;
  if (e.waitHits < 2) return false;
  startBarge(e); return true;
}
// Red shoulder-barge: a short armoured windup (his poise refilled, so jabs spark off it), one lunge.
function startBarge(e) {
  const p = G.player;
  e.face = Math.sign(p.x - e.x) || e.face;
  Object.assign(e, { state: 'windup', t: 0, move: 'tbarge', cls: 'unblockable', wind: 14, cueTo: 0, cueLead: 0, vx: 0, shuffling: false, hitLanded: false, poise: e.maxPoise + 2 });
  e.waitT = e.waitHits = 0;
}
// After the barge he goes straight back for the trunk, with a clean hurt count so he can't be re-locked at once.
export function tteBargeDone(e) {
  Object.assign(e, { vx: 0, t: 0, hurtN: 0, hitLanded: false, move: '' });
  e.waitT = e.waitHits = 0;
  e.state = tteLoose(e) ? 'fetch' : 'idle';
  if (e.state === 'idle') e.atkCd = 40;
}
function clearWait(e) { e.fetchWait = false; e.waitT = e.waitHits = 0; }

// Interrupted mid-pickup, the trunk goes back on the floor where it was.
export function dropPickup(e) { if (e.trunk?.loose) e.trunk.hidden = false; }

export function ttePose(e) {
  const t = e.t, loose = tteLoose(e), has = n => !!getAIFrame(e.set._aiKey, n), pose = (n, alt) => has(n) ? n : alt;
  switch (e.state) {
    case 'windup':
      if (e.move === 'bump') return { name: 'bump', idx: 0 };
      if (e.move === 'tslam') return { name: 'slam', idx: t < 10 ? 0 : 1 };
      // Rocks back and gathers (a shoulder-dip shuffle cell), then sets; the lunge cell is the release.
      if (e.move === 'tbarge') return has('tbarge') ? { name: 'tbarge', idx: t < 8 ? 2 : 0 } : { name: 'disarmed', idx: 1 };
      break;
    case 'attack':
      // Trunk dash: a lunge off the crouch, two driving strides, the contact shove, then the skid.
      if (e.move === 'bump') return { name: 'bump', idx: e.hitLanded && t < 20 ? 3 : t < 4 ? 1 : t < 16 ? (((t - 4) >> 2) & 1 ? 1 : 2) : 4 };
      // Overhead, down onto the floor on tick 2, held there, then dragged back up.
      if (e.move === 'tslam') return { name: 'slam', idx: t < 2 ? 1 : t < 18 ? 2 : 3 };
      // Shoulder first off the rear foot, held through the shove, then back to the arms-out wait.
      if (e.move === 'tbarge') return has('tbarge') ? { name: 'tbarge', idx: t < 16 ? 1 : 0 } : { name: 'disarmed', idx: 1 };
      break;
    // Still holding the trunk (re-armed while the break timer runs), he just reels with it.
    case 'guardbreak': return !loose ? { name: 'hurt', idx: 0 } : t < 10 ? { name: 'guardbreak', idx: 0 } : { name: 'disarmed', idx: ((t - 10) >> 3) & 1 };
    case 'hurt': return loose ? { name: pose('dhurt', 'disarmed'), idx: (e.hurtN || 0) & 1 } : { name: 'hurt', idx: e.hitBack ? 1 : 0 };
    case 'grabbed': return loose ? { name: 'disarmed', idx: 0 } : { name: 'hurt', idx: 0 };
    // Bent forward, reaching for it: a stepping shuffle while he moves, arms out while CHAD is in the way.
    case 'fetch': return e.shuffling && has('shuffle') ? { name: 'shuffle', idx: Math.floor(e.stridePhase / SHUFFLE) } : { name: pose('dlook', 'disarmed'), idx: has('dlook') ? 0 : 1 };
    // Set the trunk on the floor, two beats of demanding the fine, then pick it back up.
    // Stoop to set the trunk down by his rear shoe, straighten with a hand on it, jeer; the same two cells reversed lift it.
    case 'taunt': return has('settrunk') && (t < 9 || t > 42) ? { name: 'settrunk', idx: t < 5 || t > 46 ? 0 : 1 } : { name: 'taunt', idx: ((t - 9) >> 4) & 1 };
    case 'pickup': return { name: 'pickup', idx: t < GRAB ? 0 : 1 };
    case 'stagger': if (loose) return { name: 'disarmed', idx: (t >> 4) & 1 }; break;
  }
  if (loose && !REARM.includes(e.state)) return { name: 'disarmed', idx: 0 };
  return null;
}

// The loose trunk, drawn at its own spot on the floor (tumbling while it flies).
export function drawTteTrunk(ctx, e, camX) {
  const k = e.trunk;
  if (!k?.loose || k.hidden || !getAIFrame(e.set._aiKey, 'trunk')) return;
  const air = k.z > 0 || k.vz > 0, idx = air ? 2 + ((k.t >> 2) & 1) : 0;
  const f = getFrame(e.set, 'trunk', idx, Math.sign(k.vx) || e.face);
  ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.ellipse(Math.round(k.x - camX), Math.round(k.y), 14, 3, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();
  blit(ctx, f, Math.round(k.x - camX) - Math.round(frameW(f) / 2), Math.round(k.y - k.z) - frameH(f) + 4);
}
