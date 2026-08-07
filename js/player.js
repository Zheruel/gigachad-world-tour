// player.js - CHAD: movement, flowing one-button combo, parry/counter,
// the full-meter Meteor Lariat, status effects and recovery.
import {
  G, W, FLOOR_TOP, FLOOR_BOT, METER_MAX, clamp, addScore, addMeter, bumpCombo, diff,
  clampToArena, airborne, juggleMul, fall, inAir,
} from './engine.js';
import { input } from './input.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnSpark, spawnDust, spawnRing, spawnSmoke, spawnShock,
  impact, spawnPop } from './effects.js';
import { reactStage } from './ambience.js';

// keys: the frame advances each time p.t crosses one of these, so a punch reads as
// wind-up -> strike -> recovery instead of popping to a single pose. The strike frame
// is deliberately held longest - what sells a punch is the contact pose plus hitstop,
// not a long wind-up.
// cancelAt: with the hit confirmed and another attack buffered, the chain advances
// here instead of at dur. That is what makes a combo feel rhythmic rather than three
// animations played back to back; a whiff still pays the full recovery.
export const COMBO = [
  { name: 'jab', dur: 15, hitAt: 4, cancelAt: 9, dmg: 6, range: 43, heavy: false, launch: false, keys: [3, 9] },
  { name: 'hook', dur: 18, hitAt: 5, cancelAt: 11, dmg: 7, range: 43, heavy: false, launch: false, keys: [4, 11] },
  { name: 'upper', dur: 24, hitAt: 7, cancelAt: 15, dmg: 13, range: 48, heavy: true, launch: true, keys: [5, 10, 17] },
];

// One coherent sheet is used from first jab through final uppercut. Every hit
// begins on the preceding recovery pose, so chaining never jumps to a new
// camera angle or restarts from guard.
export const COMBO_FLOW = [
  { name: 'combo_power_a', frames: [0, 1, 2, 3], keys: [3, 5, 8], dur: 12, hitAt: 5, cancelAt: 9, dmg: 5, range: 43, advance: 3.2 },
  { name: 'combo_power_a', frames: [3, 4, 5], keys: [4, 6], dur: 13, hitAt: 5, cancelAt: 10, dmg: 6, range: 46, advance: 3.6 },
  { name: 'combo_power_a', frames: [5, 6, 7], keys: [4, 7], dur: 14, hitAt: 6, cancelAt: 11, dmg: 7, range: 47, advance: 4.0 },
  { name: 'combo_power_b', frames: [0, 1, 2, 3], keys: [4, 7, 11], dur: 15, hitAt: 6, cancelAt: 11, dmg: 9, range: 50, impactHeavy: true, advance: 5.0 },
  { name: 'combo_power_finish', frames: [0, 1, 2, 3, 4], keys: [2, 4, 6, 8], dur: 24, hitAt: 8, cancelAt: 16, dmg: 15, range: 55, heavy: true, launch: true, advance: 6.8 },
];
export const COMBO_ROUTES = { flow: COMBO_FLOW };

export const SUPER_MOVES = [
  { id: 'meteor_lariat', name: 'METEOR LARIAT', color: '#ff9b35', dur: 70 },
];

// A chained attack skips its wind-up: it starts partway in so the chain reads as one
// continuous motion instead of restarting from a guard between every hit.
export const CHAIN_SKIP = 3;

// index of the current keyframe: how many thresholds t has passed
export function keyFrame(t, keys) {
  let i = 0;
  while (i < keys.length && t >= keys[i]) i++;
  return i;
}

// Walk and run cycles are driven by distance travelled, not by the clock, so
// the feet never slide against the ground no matter what the move speed is.
export const WALK_STRIDE = 10.9; // logical px per walk frame; measured from the step
                                 // length in the sheet's contact poses (6-frame cycle)
export const RUN_STRIDE = 15;   // logical px per run frame (6-frame cycle)
const MOVE_EPS = 0.12;   // below this a body counts as standing still

// Idle flavour animations. They fire when you stand still and cancel the
// instant you touch anything, so they never cost you a frame of control.
export const IDLES = [
  { name: 'idle_cigar', frames: 6, hold: 26, weight: 3 },
  { name: 'idle_shades', frames: 4, hold: 18, weight: 2 },
  { name: 'idle_flex', frames: 4, hold: 20, weight: 2 },
  { name: 'idle_knuckles', frames: 4, hold: 18, weight: 2 },
];
const IDLE_DELAY = 220;

export function createPlayer() {
  return {
    kind: 'player', x: 90, y: 211, z: 0, vx: 0, vy: 0, vz: 0,
    face: 1, hp: 100, maxhp: 100,
    state: 'idle', t: 0, combo: 0, route: 'flow',
    hitDone: false, chainQueued: false, queuedHits: 0, hitConfirm: false,
    invuln: 0,
    grabbedBy: null, mash: 0, superT: 0,
    runT: 0, idleT: 0, idleAnim: 0, quickGetup: false, groundT: 0,
    stridePhase: 0, moved: 0, chainSkip: 0,
    blind: 0, poison: 0, poisonT: 0, parryTarget: null,
    superMove: 0, superOverride: null, specialTarget: null, superHits: {},
    w: 55, h: 96, shadowR: 16,
  };
}

function setState(p, s) {
  p.state = s; p.t = 0; p.hitDone = false; p.chainQueued = false; p.hitConfirm = false;
  p.chainSkip = 0;
  if (s !== 'idle') p.idleT = 0;
}

function dmgMul() { return 1; }

// ---- status effects ----------------------------------------------------
export function blindPlayer(p, frames) {
  if (p.invuln > 0 || p.state === 'special') return;
  p.blind = Math.max(p.blind, frames);
  if (p.state !== 'down' && p.state !== 'getup') { setState(p, 'hurt'); p.vx = 0; }
  spawnPop(p.x, p.y - 96, 'BLIND!');
}

export function poisonPlayer(p, frames) {
  if (p.invuln > 0 || p.state === 'special') return;
  if (p.poison <= 0) spawnPop(p.x, p.y - 96, 'POISON!');
  p.poison = Math.max(p.poison, frames);
}

// ---- hit detection -----------------------------------------------------
function hitTargets() {
  const t = [...G.enemies, ...G.props];
  if (G.boss && !G.boss.dead) t.push(G.boss);
  return t;
}

// apply a melee hit from the player to everything in range
function playerHit(p, spec) {
  const hx = p.x + p.face * spec.range * 0.6;
  let hitAny = false;
  let heaviest = 0;
  for (const e of hitTargets()) {
    if (e.dead || e.broken) continue;
    if (e.state === 'grabbed' || e.state === 'thrown' || e.state === 'getup') continue;
    // Airborne bodies stay hittable (that is the juggle); grounded knockdowns
    // do not, so you cannot just stomp someone lying on the floor forever.
    if (e.state === 'down' && !airborne(e)) continue;
    if (Math.abs(e.x - hx) < spec.range * 0.6 + e.w * 0.35 && Math.abs(e.y - p.y) < 16 && e.z < 34) {
      const dealt = Math.round(spec.dmg * dmgMul(p));
      e.hurt(dealt, p.face, spec.heavy, spec.launch);
      if (spec.knock && !e.dead && e.state !== 'down' && e.state !== 'thrown') {
        e.vx = p.face * spec.knock;
      }
      addScore(10);
      if (G.stats) G.stats.hits++;
      addMeter(spec.heavy || spec.impactHeavy ? 6 : 4);
      comboPop(bumpCombo(), e.x, e.y);
      heaviest = Math.max(heaviest, dealt * (airborne(e) ? juggleMul(e) : 1));
      hitAny = true;
    }
  }
  if (hitAny) {
    spawnSpark(p.x + p.face * spec.range * 0.7, p.y - 48);
    impact(spec.heavy || spec.impactHeavy, heaviest);
    G.audio.sfx(spec.heavy || spec.impactHeavy ? 'heavy' : 'punch');
    p.hitConfirm = true;
    if (spec.heavy || spec.impactHeavy) reactStage(hx, spec.heavy ? 1 : 0.55);
  } else {
    G.audio.sfx('whiff');
  }
  return hitAny;
}

// Radial contact used by Meteor Lariat's finishing impact.
function radialHit(p, dmg, radius, launch) {
  let n = 0;
  for (const e of hitTargets()) {
    if (e.dead || e.broken || e.state === 'thrown') continue;
    if (Math.abs(e.x - p.x) < radius && Math.abs(e.y - p.y) < 24 && e.z < 42) {
      e.hurt(Math.round(dmg * dmgMul(p)), e.x < p.x ? -1 : 1, true, launch);
      spawnSpark(e.x, e.y - 48);
      addScore(20);
      if (G.stats) G.stats.hits++;
      comboPop(bumpCombo(), e.x, e.y);
      n++;
    }
  }
  if (n) impact(true, dmg);
  return n;
}

const RANKS = [[5, 'NICE'], [10, 'BRUTAL'], [15, 'SAVAGE'], [20, 'WORLD CLASS'], [30, 'GIGACHAD']];
function comboPop(n, x, y) {
  for (const [need, label] of RANKS) {
    if (n === need) {
      spawnPop(x, y - 56, label);
      G.audio.sfx('pickup');
    }
  }
}

// A boss or bruiser locked the player into a hold.
export function grabPlayer(p, holder) {
  p.grabbedBy = holder;
  p.mash = 0;
  setState(p, 'held');
}

function startSuper(p) {
  if (G.meter < METER_MAX) {
    G.audio.sfx('whiff');
    spawnPop(p.x, p.y - 98, 'SUPER NOT READY');
    return;
  }
  p.superMove = 0;
  p.superOverride = null;
  const move = SUPER_MOVES[p.superMove];
  G.meter = 0;
  setState(p, 'special');
  p.invuln = move.dur + 20;
  p.superT = 0;
  p.superHits = {};
  p.specialTarget = [...G.enemies, ...(G.boss && !G.boss.dead ? [G.boss] : [])]
    .filter((e) => e && !e.dead)
    .sort((a, b) => Math.abs(a.x - p.x) - Math.abs(b.x - p.x))[0] || null;
  if (p.specialTarget) p.face = p.specialTarget.x < p.x ? -1 : 1;
  G.audio.sfx('super');
  spawnRing(p.x, p.y - 24, move.color);
  spawnDust(p.x, p.y, 4);
}

function comboMotion(p, c) {
  // A small load backwards followed by a short eased drive through contact.
  if (p.t < c.hitAt - 2) p.x -= p.face * 0.035;
  else if (p.t <= c.hitAt + 2) p.x += p.face * c.advance / 5;
  else if (p.t > c.cancelAt) p.x -= p.face * 0.025;
}

export function ragnarokPose(t) {
  const cuts = [5, 11, 17, 24, 32, 40, 50];
  let idx = 0;
  while (idx < cuts.length && t > cuts[idx]) idx++;
  return { name: 'meteor_lariat', idx };
}

// All hostile contact funnels through here. Returning true means the attack was
// consumed by the parry and callers must not apply damage or secondary effects.
export function resolveIncomingHit(p, attacker, spec = {}) {
  // The first simulation tick after the button press is active. Requiring a
  // second tick made a correctly anticipated strike lose to update order.
  const parryClass = spec.parryClass || (spec.parryable ? 'counter' : 'unblockable');
  if (p.state !== 'parry' || !input.held('parry') ||
      (parryClass !== 'counter' && parryClass !== 'reflect')) return false;
  p.parryTarget = attacker || null;
  setState(p, 'parry_counter');
  p.invuln = 26;
  G.hitstop = Math.max(G.hitstop, 4);
  G.parrySlow = Math.max(G.parrySlow, 12);
  G.shake = Math.max(G.shake, 4);
  spawnRing(p.x + p.face * 8, p.y - 44, '#6dff82');
  spawnSpark(p.x + p.face * 14, p.y - 50);
  spawnPop(p.x, p.y - 104, 'PARRY');
  addMeter(10);
  G.audio.sfx('parry');
  if (parryClass === 'counter' && attacker && attacker.parried) attacker.parried(7, p.face);
  return true;
}

// Attack recovery can be cut short into a dash or a jump, but only when the
// hit actually landed. Whiffing still pays the full recovery.
function tryCancel(p) {
  if (!p.hitConfirm) return false;
  if (input.pressed('jump')) { p.vz = 4.85; p.z = 0.1; setState(p, 'jump'); G.audio.sfx('jump'); return true; }
  if (input.pressed('dashL') || input.pressed('dashR')) {
    p.face = input.pressed('dashL') ? -1 : 1;
    setState(p, 'dash'); p.vx = p.face * 3.2;
    spawnDust(p.x, p.y, 2); G.audio.sfx('dash');
    return true;
  }
  return false;
}

export function updatePlayer(p) {
  const x0 = p.x, y0 = p.y;
  p.t++;
  if (p.invuln > 0) p.invuln--;
  if (p.blind > 0) p.blind--;
  if (p.poison > 0) {
    p.poison--;
    if (++p.poisonT % 45 === 0) {
      p.hp -= 2;
      spawnSpark(p.x, p.y - 50);
      if (p.hp <= 0) { p.hp = 1; }
    }
    if (p.poison === 0) spawnPop(p.x, p.y - 92, 'CURED');
  }
  switch (p.state) {
    case 'idle': case 'walk': case 'run': {
      const ax = input.axisX(), ay = input.axisY();
      if (input.pressed('super')) { startSuper(p); break; }
      if (input.held('parry')) { setState(p, 'parry'); p.invuln = 0; G.audio.sfx('whiff'); break; }
      if (input.pressed('dashL') || input.pressed('dashR')) {
        p.face = input.pressed('dashL') ? -1 : 1;
        setState(p, 'dash'); p.vx = p.face * 3.2;
        spawnDust(p.x, p.y, 2);
        G.audio.sfx('dash');
        break;
      }
      if (input.pressed('jump')) {
        const running = p.state === 'run';
        p.vz = 4.85; p.z = 0.1;
        setState(p, 'jump');
        p.vx = running ? p.face * 1.6 : 0;   // a running jump carries momentum
        G.audio.sfx('jump');
        break;
      }
      if (input.pressed('attack')) {
        // running into an attack gives the shoulder tackle instead of the combo
        if (p.state === 'run') { setState(p, 'tackle'); p.vx = p.face * 3.4; }
        else { p.combo = 0; p.route = 'flow'; p.queuedHits = Math.max(0, input.count('attack') - 1); setState(p, 'attack'); }
        break;
      }
      if (ax || ay) {
        if (ax) p.face = ax;
        // holding the direction after a dash keeps you running
        if (p.runT > 0 && ax === p.face) {
          p.state = 'run';
          p.x += ax * 2.5;
          p.y += ay * 1.1;
          if (G.time % 7 === 0) spawnDust(p.x, p.y, 1);
        } else {
          p.runT = 0;
          p.state = 'walk';
          p.x += ax * 1.38;
          p.y += ay * 1.0;
        }
      } else { p.state = 'idle'; p.runT = 0; p.stridePhase = 0; }

      // idle flavour animation after a few seconds of standing still
      if (p.state === 'idle') {
        if (++p.idleT > IDLE_DELAY) {
          let total = 0;
          for (const a of IDLES) total += a.weight;
          let r = Math.random() * total;
          p.idleAnim = 0;
          for (let i = 0; i < IDLES.length; i++) {
            r -= IDLES[i].weight;
            if (r <= 0) { p.idleAnim = i; break; }
          }
          setState(p, 'idleanim');
        }
      } else p.idleT = 0;
      break;
    }
    case 'idleanim': {
      const a = IDLES[p.idleAnim];
      // cigar: a puff of smoke on the light and the exhale
      if (a.name === 'idle_cigar' && (p.t === a.hold * 4 || p.t === a.hold * 5 ||
          p.t === a.hold * 4 + 12)) {
        spawnSmoke(p.x + p.face * 8, p.y - 78, 3);
      }
      // any input at all drops straight back to control
      if (input.axisX() || input.axisY() || input.pressed('attack') || input.pressed('jump') ||
          input.held('parry') || input.pressed('super') ||
          input.pressed('dashL') || input.pressed('dashR')) {
        setState(p, 'idle');
        break;
      }
      if (p.t >= a.frames * a.hold) setState(p, 'idle');
      break;
    }
    case 'dash': {
      p.x += p.vx;
      if (input.pressed('jump')) { p.vz = 4.85; p.z = 0.1; setState(p, 'jump'); G.audio.sfx('jump'); }
      else if (input.pressed('attack')) {
        // dash elbow: heavy launcher
        p.combo = 4; p.route = 'flow'; setState(p, 'attack');
      } else if (p.t > 18) {
        // hand off into a run if the direction is still held
        p.runT = input.axisX() === p.face ? 90 : 0;
        setState(p, p.runT ? 'run' : 'idle');
      }
      break;
    }
    case 'tackle': {
      p.x += p.vx; p.vx *= 0.94;
      if (!p.hitDone) {
        if (playerHit(p, { dmg: 11, range: 46, heavy: true, launch: false })) {
          p.hitDone = true;
          G.audio.sfx('weapon');
        }
      }
      if (G.time % 4 === 0) spawnDust(p.x - p.face * 8, p.y, 1);
      if (p.t > 22 || Math.abs(p.vx) < 0.9) { p.vx = 0; p.runT = 0; setState(p, 'idle'); }
      break;
    }
    case 'jump': {
      const ax = input.axisX();
      p.x += ax * 1.6 + p.vx * 0.4;
      p.y += input.axisY() * 0.8;
      p.z += p.vz; p.vz -= 0.28;
      if (input.pressed('attack') && !p.hitDone) {
        setState(p, 'jumpkick'); p.hitDone = false;
        break;
      }
      if (p.z <= 0) { p.z = 0; p.vz = 0; p.vx = 0; setState(p, 'idle'); spawnDust(p.x, p.y, 2); G.audio.sfx('land'); }
      break;
    }
    case 'jumpkick': {
      const ax = input.axisX();
      p.x += ax * 1.4 + p.face * 0.9;
      p.z += p.vz; p.vz -= 0.28;
      if (!p.hitDone) {
        if (playerHit(p, { dmg: 10, range: 46, heavy: true, launch: true })) G.audio.sfx('kick');
        p.hitDone = true;
      }
      if (p.z <= 0) { p.z = 0; p.vz = 0; setState(p, 'idle'); spawnDust(p.x, p.y, 2); G.audio.sfx('land'); }
      break;
    }
    case 'attack': {
      const route = COMBO_FLOW;
      const c = route[Math.min(p.combo, route.length - 1)];
      // step into the punch, on the way to contact
      comboMotion(p, c);
      if (p.t >= c.hitAt && !p.hitDone) { playerHit(p, c); p.hitDone = true; }
      // buffer the next hit from the moment the strike starts
      if (input.pressed('attack') && p.t >= 2) {
        p.queuedHits = Math.min(4, p.queuedHits + input.count('attack'));
        p.chainQueued = true;
      }
      if (input.held('parry') && p.hitConfirm && p.t > c.hitAt) {
        setState(p, 'parry');
        break;
      }
      if (p.t > c.hitAt && tryCancel(p)) break;
      const wantsChain = p.queuedHits > 0;
      const chainNow = wantsChain && p.combo < route.length - 1 && p.hitConfirm && p.t >= c.cancelAt;
      if (chainNow || p.t >= c.dur) {
        if (wantsChain && p.combo < route.length - 1) {
          const hc = p.hitConfirm;
          p.queuedHits--;
          p.combo++;
          setState(p, 'attack');
          p.hitConfirm = hc;
          p.chainSkip = hc ? CHAIN_SKIP : 0;
          p.t = p.chainSkip;
        } else { p.queuedHits = 0; setState(p, 'idle'); }
      }
      break;
    }
    case 'parry': {
      // Hold to maintain the stance. Releasing creates a short vulnerable
      // recovery, so an obviously early release can still be punished.
      if (!input.held('parry')) setState(p, 'parry_recover');
      break;
    }
    case 'parry_recover': {
      if (p.t > 8) setState(p, input.held('parry') ? 'parry' : 'idle');
      break;
    }
    case 'parry_counter': {
      if (p.t === 4) {
        const e = p.parryTarget;
        if (e && !e.dead) {
          p.face = e.x < p.x ? -1 : 1;
          spawnSpark(e.x, e.y - Math.min(56, e.h * 0.6));
          G.audio.sfx('heavy');
        }
      }
      if (p.t >= 6 && input.held('parry')) { setState(p, 'parry'); break; }
      if (p.t >= 6 && input.pressed('attack')) {
        p.combo = 0; p.queuedHits = Math.max(0, input.count('attack') - 1); setState(p, 'attack'); break;
      }
      if (p.t >= 6 && (input.axisX() || input.axisY())) { p.parryTarget = null; setState(p, 'idle'); break; }
      if (p.t > 18) { p.parryTarget = null; setState(p, 'idle'); }
      break;
    }
    case 'special': {
      p.superT++;
      const move = SUPER_MOVES[p.superMove] || SUPER_MOVES[0];
      const target = p.specialTarget;
      const t = p.superT;
      if (target && !target.dead && t < 50) {
        const dx = target.x - p.x;
        p.face = dx < 0 ? -1 : 1;
        if (t > 7 && Math.abs(dx) > 25) p.x += Math.sign(dx) * Math.min(5.2, Math.abs(dx) - 24);
        p.y += clamp(target.y - p.y, -1.4, 1.4);
      } else if (t > 7 && t < 50) p.x += p.face * 4.2;
      // Three readable contacts: shoulder, body hook, then the lariat. The
      // camera never leaves gameplay and each pose has time to register.
      for (const [at, dmg, radius] of [[18, 7, 58], [31, 10, 64], [48, 30, 150]]) {
        if (t === at && !p.superHits[at]) {
          p.superHits[at] = true;
          radialHit(p, dmg, radius, at === 48);
          spawnRing(p.x + p.face * 20, p.y - 42, at === 48 ? '#ffd56a' : '#ff8a35');
          if (at === 48) {
            spawnShock(p.x, p.y); spawnDust(p.x, p.y, 7);
            reactStage(p.x, 1.5); G.shake = 10; G.hitstop = Math.max(G.hitstop, 14);
            G.audio.sfx('slam');
          }
        }
      }
      p.z = 0;
      if (p.superT > move.dur) {
        p.z = 0; p.specialTarget = null; setState(p, 'idle');
      }
      break;
    }
    case 'held': {
      // mash attack to break the hold
      if (input.pressed('attack') || input.pressed('parry') || input.pressed('jump')) p.mash++;
      if (!p.grabbedBy || p.grabbedBy.dead) { p.grabbedBy = null; p.mash = 0; setState(p, 'idle'); }
      break;
    }
    case 'hurt': {
      p.x += p.vx; p.vx *= 0.9;
      if (p.t > (p.blind > 0 ? 18 : 14)) setState(p, 'idle');
      break;
    }
    case 'down': {
      // Quick getup. The input is buffered across the whole knockdown, not just
      // the grounded part - you spend most of a launch in the air, so demanding
      // a late press would leave almost no window. SoR2 gives you none at all.
      if (input.pressed('attack') || input.pressed('jump')) p.quickGetup = true;
      if (inAir(p)) {
        const r = fall(p);
        if (r === 'bounce') { spawnDust(p.x, p.y, 3); G.shake = Math.max(G.shake, 3); G.audio.sfx('land'); }
        else if (r === 'land') { spawnDust(p.x, p.y, 3); p.groundT = 0; }
      } else if (!p.dying) {
        p.groundT++;
        if ((p.quickGetup && p.groundT > 2) || p.groundT > 26) {
          const quick = p.quickGetup;
          setState(p, 'getup');
          p.invuln = quick ? 40 : 50;
          if (quick) { spawnDust(p.x, p.y, 3); G.audio.sfx('dash'); }
        }
      }
      break;
    }
    case 'getup': {
      if (p.t > 14) setState(p, 'idle');
      break;
    }
    case 'victory': break;
    case 'dead': break;
  }

  if (p.runT > 0 && p.state !== 'run' && p.state !== 'dash' && p.state !== 'jump' && p.state !== 'tackle') p.runT = 0;
  else if (p.runT > 0) p.runT--;

  // clamp to floor band + arena walls
  p.y = clamp(p.y, FLOOR_TOP, FLOOR_BOT);
  clampToArena(p, 0);
  // measured after the clamp: pushing into a wall must not cycle the legs
  p.moved = Math.hypot(p.x - x0, p.y - y0);
  if (p.state === 'walk' || p.state === 'run') p.stridePhase += p.moved;
  else if (p.state === 'idle') p.stridePhase = 0;
}

export function hurtPlayer(p, dmg, dir, heavy) {
  if (p.invuln > 0 || p.state === 'down' || p.state === 'getup' || p.state === 'dead') return;
  if (p.state === 'special') return;
  if (G.state !== 'play') return;
  p.hp -= Math.round(dmg * diff().dmg);
  G.combo = 0;
  addMeter(3);
  G.audio.sfx('phurt');
  if (p.grabbedBy) { p.grabbedBy = null; p.mash = 0; }
  if (p.hp <= 0 || heavy) {
    p.hp = Math.max(0, p.hp);
    p.vx = dir * 2.4; p.vz = 3.0; p.z = Math.max(p.z, 0.1);
    p.quickGetup = false; p.groundT = 0;
    setState(p, 'down');
    impact(true, dmg);
    if (p.hp <= 0) p.dying = true;
  } else {
    p.vx = dir * 1.4;
    setState(p, 'hurt');
    G.hitstop = Math.max(G.hitstop, 3);
  }
}

export function drawPlayer(ctx, p, camX) {
  const sx = Math.round(p.x - camX), sy = Math.round(p.y - p.z);
  const cinematicBody = p.state === 'special' || p.state === 'parry_counter';
  if (p.invuln > 0 && !cinematicBody && ((G.rawTime >> 1) & 1)) return; // invincibility blink
  let name = 'idle', idx = 0;
  switch (p.state) {
    case 'idle': name = 'idle'; idx = (G.time >> 4) % 3; break;
    case 'walk':
      if (p.moved > MOVE_EPS) { name = 'walk'; idx = Math.floor(p.stridePhase / WALK_STRIDE); }
      else { name = 'idle'; idx = (G.time >> 4) % 3; }
      break;
    case 'run':
      if (p.moved > MOVE_EPS) { name = 'run'; idx = Math.floor(p.stridePhase / RUN_STRIDE); }
      else { name = 'idle'; idx = (G.time >> 4) % 3; }
      break;
    case 'idleanim': {
      const a = IDLES[p.idleAnim];
      name = a.name; idx = Math.min(a.frames - 1, (p.t / a.hold) | 0);
      break;
    }
    case 'dash': name = 'dash'; idx = (G.time >> 2) & 1; break;
    case 'tackle': name = 'dash'; idx = 1; break;
    case 'jump': name = p.vz > 0 ? 'jump' : 'jumpfall'; break;
    case 'jumpkick': name = 'jumpkick'; break;
    case 'attack': {
      const c = COMBO_FLOW[Math.min(p.combo, COMBO_FLOW.length - 1)];
      name = c.name;
      idx = c.frames[Math.min(c.frames.length - 1, keyFrame(p.t, c.keys))];
      break;
    }
    case 'parry': name = 'parry_counter'; idx = p.t < 3 ? 0 : (p.t < 9 ? 1 : 2); break;
    case 'parry_recover': name = 'parry_counter'; idx = 2; break;
    case 'parry_counter': name = 'parry_counter'; idx = Math.min(7, 3 + ((p.t / 3) | 0)); break;
    case 'hurt': name = 'hurt'; break;
    case 'held': name = 'hurt'; break;
    case 'down': name = 'down'; break;
    case 'getup': name = 'getup'; break;
    case 'victory': name = 'victory'; break;
    case 'special': {
      const pose = ragnarokPose(p.superT);
      name = pose.name; idx = pose.idx;
      break;
    }
    case 'dead': name = 'down'; break;
  }
  const f = getFrame(SPR.player, name, idx, p.face);
  const fw = frameW(f), fh = frameH(f);
  const dx = sx - Math.round(fw / 2), dy = sy - fh + 4;
  if (p.poison > 0 || p.blind > 0) {
    ctx.save();
    ctx.filter = p.blind > 0 ? 'sepia(1) saturate(3) hue-rotate(-20deg)' : 'hue-rotate(60deg) saturate(1.5)';
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else if (p.state === 'special' && !G.reflecting) {
    // Tint the sprite itself instead of drawing offset copies around it. The old
    // aura read as a bright outline, especially on generated combat frames.
    ctx.save();
    ctx.filter = 'brightness(1.28) saturate(1.08)';
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  // struggle prompt while held
  if (p.state === 'held' && ((G.rawTime >> 3) & 1)) {
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(sx - 7, sy - fh - 7, 14, 2);
  }
}
