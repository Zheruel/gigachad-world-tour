// enemies.js - the Chandni Chowk street crew: AI states, turn-taking attacks,
// hit reactions, wall splats.
import {
  G, W, FLOOR_TOP, FLOOR_BOT, clamp, rand, irand, addScore, diff, clampToArena,
  airborne, juggleMul, fall, inAir,
} from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnSpark, spawnDust, impact, spawnPop } from './effects.js';
import { hurtPlayer, grabPlayer, resolveIncomingHit } from './player.js';
import { spawnShot } from './shots.js';

const TYPES = {
  // street thug in a vest and lungi: the baseline, comes at you in threes
  goonda: { hp: 34, speed: 0.9, dmg: 7, score: 100, canGrab: true, set: 'goonda', w: 46, h: 80, range: 36, shadowR: 14 },
  // cricket bat: long telegraphed arc that knocks you flat
  batta: { hp: 44, speed: 0.85, dmg: 11, score: 180, canGrab: true, set: 'batta', w: 48, h: 82, range: 62, shadowR: 14 },
  // lobs chilli powder from range, then backs off out of punching distance
  masala: { hp: 28, speed: 1.0, dmg: 6, score: 200, canGrab: true, set: 'masala', w: 44, h: 79, range: 130, shadowR: 13 },
  // Delhi macaque: fast, low, leaps at your head and robs the pickups
  bandar: { hp: 19, speed: 1.9, dmg: 5, score: 150, canGrab: false, set: 'bandar', w: 30, h: 46, range: 52, shadowR: 9 },
  // akhara wrestler: poise armour and a bear hug you have to mash out of
  pehlwan: { hp: 92, speed: 0.66, dmg: 13, score: 320, canGrab: false, set: 'pehlwan', w: 56, h: 97, range: 34, shadowR: 18, poise: 3 },
  // Three reusable roles introduced across the chapter. Their silhouettes and
  // behaviour stay legible even when six enemies share the arena.
  constable: { hp: 58, speed: 0.76, dmg: 9, score: 250, canGrab: true, set: 'constable', w: 50, h: 86, range: 58, shadowR: 15, poise: 2 },
  operator: { hp: 31, speed: 0.95, dmg: 7, score: 240, canGrab: false, set: 'operator', w: 45, h: 80, range: 145, shadowR: 13 },
  sepoy: { hp: 78, speed: 1.02, dmg: 12, score: 360, canGrab: false, set: 'sepoy', w: 54, h: 94, range: 70, shadowR: 17, poise: 1 },
};

const WINDUP = { goonda: 18, batta: 28, masala: 22, bandar: 12, pehlwan: 24,
  constable: 22, operator: 25, sepoy: 24 };
// frame at which an attack switches from the strike to the follow-through
const ATK_RECOVER = { goonda: 9, batta: 14, masala: 12, bandar: 99, pehlwan: 16 };
// below this much movement in a frame a body counts as standing still
const MOVE_EPS = 0.12;
const JUGGLE_CAP = 4;
const PARRY_CLASS = { goonda: 'counter', batta: 'unblockable', masala: 'reflect',
  bandar: 'counter', pehlwan: 'unblockable', constable: 'counter',
  operator: 'reflect', sepoy: 'counter' };

export function spawnEnemy(type, x, y) {
  const T = TYPES[type];
  const scale = diff().hp * (1 + G.stageIndex * 0.15);
  const hp = Math.round(T.hp * scale);
  const e = {
    kind: type, set: SPR[T.set],
    x, y, z: 0, vx: 0, vy: 0, vz: 0, face: x < G.player.x ? 1 : -1,
    hp, maxhp: hp, dmg: T.dmg, score: T.score, canGrab: T.canGrab,
    poise: T.poise || 0, maxPoise: T.poise || 0,
    speed: T.speed * diff().aggro, range: T.range, holdT: 0,
    tint: '', juggle: 0, orbit: Math.random() < 0.5 ? -1 : 1, stridePhase: 0, moved: 0,
    state: 'spawn', t: 0, targetX: clamp(x + (x < G.player.x ? 70 : -70), G.camX + 24, G.camX + W - 24),
    atkCd: irand(30, 80), dead: false, removeMe: false, flash: 0,
    w: T.w, h: T.h, shadowR: T.shadowR, hitLanded: false,
    hurt(dmg, dir, heavy, launch) { hurtEnemy(e, dmg, dir, heavy, launch); },
    parried(dmg, dir) {
      hurtEnemy(e, dmg, dir, false, false);
      if (!e.dead) { e.state = 'stagger'; e.t = 0; e.vx = dir * 0.7; e.atkCd = 100; }
    },
    thrown(dir) { throwEnemy(e, dir); },
  };
  G.enemies.push(e);
  return e;
}

function hurtEnemy(e, dmg, dir, heavy, launch) {
  if (e.dead || e.state === 'thrown') return;
  // Poise: heavies shrug off light hits, but the meter drains visibly so they
  // read as "still coming" instead of "ignoring you", and it breaks with a clash.
  if (e.poise > 0 && !heavy) {
    e.poise--;
    e.flash = 5;
    G.hitstop = Math.max(G.hitstop, 3);
    spawnSpark(e.x, e.y - 48);
    G.audio.sfx('armor');
    if (e.poise === 0) {
      spawnPop(e.x, e.y - 66, 'BREAK');
      G.shake = Math.max(G.shake, 4);
    }
    return;
  }
  if (airborne(e)) { dmg = Math.round(dmg * juggleMul(e)); e.juggle++; }
  e.hp -= dmg;
  e.flash = 5;
  if (e.hp <= 0) {
    e.dead = true;
    e.state = 'dying'; e.t = 0;
    e.vx = dir * 2.6; e.vz = 3.6; e.z = Math.max(e.z, 0.1);
    addScore(e.score);
    if (G.stats) G.stats.kos++;
    spawnPop(e.x, e.y - 70, '+' + e.score);
    G.audio.sfx('ko');
    impact(true);
    if (G.player.grabbedBy === e) { G.player.grabbedBy = null; G.player.state = 'idle'; }
    // Enemy defeats never generate resources. Health is authored through
    // specific breakable objects, keeping stage balance deterministic.
  } else if (launch || heavy) {
    const wasAir = airborne(e);
    if (!wasAir) e.juggle = 0;
    e.state = 'down'; e.t = 0; e.hitLanded = false;
    // A launched body already in the air gets popped up again rather than reset,
    // which is what makes a juggle read as one continuous move - until the cap,
    // after which hits still land but stop lifting, so the body drops out.
    e.vx = dir * 2.4;
    if (wasAir) { if (e.juggle < JUGGLE_CAP) e.vz = Math.max(e.vz, 0) + 2.2; }
    else e.vz = 3.6;
    e.z = Math.max(e.z, 0.1);
  } else {
    e.state = 'hurt'; e.t = 0;
    e.vx = dir * 1.3;
  }
  if (e.state !== 'grabhold' && G.player.grabbedBy === e) {
    G.player.grabbedBy = null; G.player.mash = 0;
    G.player.state = 'idle'; G.player.t = 0;
  }
}

function throwEnemy(e, dir) {
  e.state = 'thrown'; e.t = 0;
  e.vx = dir * 3.8; e.vz = 3.8; e.z = Math.max(e.z, 0.1);
  e.hitLanded = false;
  e.juggle = 0;
}

// A body driven into a screen edge splats: bonus damage, a bounce back into the
// arena, and it stays hittable. Nobody has to walk back on from off-screen.
function wallSplat(e, side) {
  if (e.dead || e.wallCd > 0) return;
  e.wallCd = 24;
  e.hp -= 8;
  e.flash = 6;
  e.vz = Math.max(e.vz, 1.8);
  e.z = Math.max(e.z, 0.1);
  e.state = e.state === 'thrown' ? 'thrown' : 'down';
  e.t = 0;
  spawnSpark(e.x, e.y - 48);
  spawnDust(e.x, e.y, 3);
  spawnPop(e.x, e.y - 74, 'WALL!');
  impact(true);
  G.shake = Math.max(G.shake, 7);
  G.audio.sfx('slam');
  addScore(25);
  if (e.hp <= 0) { e.hp = 1; e.state = 'down'; hurtEnemy(e, 1, -side, true, false); }
}

// Attacker slots: two at a time normally, three once the crowd is big, so a
// full wave actually pressures you instead of politely queueing.
function slotsUsed() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead && (e.state === 'windup' || e.state === 'attack')) n++;
  return n;
}
function slotCap() { return aliveEnemies() >= 4 ? 3 : 2; }

function tryHitPlayer(e, dmg, range, heavy, tol, parryClass = PARRY_CLASS[e.kind]) {
  const p = G.player;
  if (p.state === 'down' || p.state === 'getup' || p.dying) return;
  if (Math.abs(p.x - (e.x + e.face * range * 0.5)) < range * 0.5 + 11 && Math.abs(p.y - e.y) < (tol || 15) && p.z < 24) {
    if (resolveIncomingHit(p, e, { parryClass })) return true;
    hurtPlayer(p, dmg, e.face, heavy);
    spawnSpark(p.x, p.y - 48);
    G.audio.sfx(heavy ? 'heavy' : 'punch');
    return true;
  }
  return false;
}

// The macaque robs the floor: if a pickup is closer than the player, go take it.
function nearestPickup(e) {
  let best = null, bd = 150;
  for (const q of G.pickups) {
    const d = Math.abs(q.x - e.x);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

export function updateEnemies() {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.removeMe) continue;
    const x0 = e.x, y0 = e.y;
    e.t++;
    if (e.flash > 0) e.flash--;
    if (e.wallCd > 0) e.wallCd--;
    if (e.state !== 'down' && e.state !== 'thrown' && e.z <= 0) e.juggle = 0;
    if (e.state !== 'loot') e.face = p.x < e.x ? -1 : 1;

    // Watchdogs: a body must never be able to freeze. Passive states only
    // survive while whoever put the enemy there is still holding up their end.
    if (e.state === 'grabbed') {
      e.state = 'idle'; e.t = 0; e.atkCd = irand(20, 50);
    }
    if (e.state === 'grabhold' && p.grabbedBy !== e) { e.state = 'idle'; e.t = 0; e.atkCd = irand(40, 80); }
    if ((e.state === 'down' || e.state === 'thrown') && e.t > 240) {
      e.z = 0; e.vz = 0; e.vx = 0;
      e.state = 'getup'; e.t = 0;
    }

    switch (e.state) {
      case 'spawn': {
        const dx = e.targetX - e.x;
        e.x += Math.sign(dx) * e.speed * 1.8;
        if (Math.abs(dx) < 4) { e.state = 'idle'; e.t = 0; }
        break;
      }
      case 'idle': {
        // Orbit the player instead of bunching up on one spot, so a crowd
        // spreads across the arena and stays readable.
        const wantY = clamp(p.y + e.orbit * (e.kind === 'masala' || e.kind === 'operator' ? 26 : 16), FLOOR_TOP, FLOOR_BOT);
        e.y += clamp(wantY - e.y, -0.6, 0.6);
        if (Math.abs(e.y - wantY) < 2 && Math.random() < 0.004) e.orbit *= -1;
        const gap = Math.abs(p.x - e.x);
        if (gap < e.range * 0.6) e.x -= Math.sign(p.x - e.x) * e.speed * 0.4;
        if (e.kind === 'bandar' && nearestPickup(e) && Math.random() < 0.02) { e.state = 'loot'; e.t = 0; break; }
        if (--e.atkCd <= 0 && slotsUsed() < slotCap()) { e.state = 'approach'; e.t = 0; }
        e.x += Math.sin(G.time * 0.05 + e.y) * 0.2;
        break;
      }
      case 'loot': {
        const q = nearestPickup(e);
        if (!q) { e.state = 'idle'; e.atkCd = irand(20, 50); break; }
        e.face = q.x < e.x ? -1 : 1;
        e.x += Math.sign(q.x - e.x) * e.speed * 1.1;
        e.y += clamp(q.y - e.y, -1, 1);
        if (Math.abs(q.x - e.x) < 10 && Math.abs(q.y - e.y) < 8) {
          G.pickups.splice(G.pickups.indexOf(q), 1);
          spawnPop(e.x, e.y - 40, 'STOLEN!');
          G.audio.sfx('blip');
          e.state = 'idle'; e.atkCd = irand(40, 80);
        }
        if (e.t > 160) { e.state = 'idle'; e.atkCd = irand(30, 60); }
        break;
      }
      case 'approach': {
        const dx = p.x - e.x, dy = p.y - e.y;
        if (Math.abs(dy) > 6) e.y += Math.sign(dy) * e.speed * 0.7;
        if (Math.abs(dx) > e.range) e.x += Math.sign(dx) * e.speed;
        else if (Math.abs(dy) <= 9) {
          if (slotsUsed() < slotCap()) { e.state = 'windup'; e.t = 0; e.flash = 0; }
          else { e.state = 'idle'; e.atkCd = irand(20, 50); }
        }
        if (e.kind === 'bandar' && Math.abs(dx) < 90 && Math.abs(dx) > 34 && Math.abs(dy) < 9) {
          e.state = 'windup'; e.t = 0;
        }
        break;
      }
      case 'backoff': {
        e.x -= e.face * e.speed * 1.4;
        if (e.t > 26) { e.state = 'idle'; e.atkCd = irand(40, 80); }
        break;
      }
      case 'grabhold': {
        if (p.grabbedBy !== e) { e.state = 'idle'; e.atkCd = irand(40, 80); break; }
        p.x = e.x + e.face * 25; p.y = e.y; p.z = 0;
        e.holdT++;
        if (e.holdT % 30 === 0) {
          p.hp -= Math.round(5 * diff().dmg);
          spawnSpark(p.x, p.y - 44);
          G.audio.sfx('punch');
          if (p.hp <= 0) p.hp = 1;
        }
        if (p.mash >= 5 || e.holdT > 100) {
          const escaped = p.mash >= 5;
          p.grabbedBy = null; p.mash = 0;
          if (escaped) {
            p.state = 'idle'; p.t = 0; p.invuln = 24;
            hurtEnemy(e, 6, -e.face, true, false);
            spawnPop(p.x, p.y - 48, 'BREAK');
          } else {
            hurtPlayer(p, 10, e.face, true);
          }
          if (!e.dead) { e.state = 'idle'; e.atkCd = irand(70, 120); }
        }
        break;
      }
      case 'windup': {
        if (e.t >= (WINDUP[e.kind] || 18)) {
          e.state = 'attack'; e.t = 0; e.hitLanded = false;
          if (e.kind === 'bandar') { e.vx = e.face * 3.6; e.vz = 3.0; e.z = 0.1; G.audio.sfx('dash'); }
          if (e.kind === 'pehlwan') { e.vx = e.face * 2.2; G.audio.sfx('dash'); }
          if (e.kind === 'constable') e.armor = 1;
        }
        break;
      }
      case 'attack': {
        if (e.kind === 'goonda') {
          if (e.t === 5 && !e.hitLanded) { tryHitPlayer(e, e.dmg, 42, false); e.hitLanded = true; }
          if (e.t > 14) { e.state = 'idle'; e.atkCd = irand(50, 110); }
        } else if (e.kind === 'batta' || e.kind === 'constable' || e.kind === 'sepoy') {
          // big cricket bat arc: slow, telegraphed, knocks you flat
          const red = e.kind === 'batta' || (e.kind === 'sepoy' && e.hp < e.maxhp / 2);
          if (e.t === 8 && !e.hitLanded) {
            tryHitPlayer(e, e.dmg, e.range + 10, red, 14, red ? 'unblockable' : 'counter');
            e.hitLanded = true; G.audio.sfx(red ? 'heavy' : 'weapon');
          }
          if (e.t > 26) { e.state = 'idle'; e.atkCd = irand(70, 130); }
        } else if (e.kind === 'masala' || e.kind === 'operator') {
          // handful of chilli powder, then get out of punching range
          if (e.t === 7 && !e.hitLanded) {
            e.hitLanded = true;
            spawnShot(e.kind === 'operator' ? 'phone' : 'powder', e.x + e.face * 14,
              e.y, e.face * 2.6, e.dmg, { source: e, parryClass: 'reflect' });
            G.audio.sfx('whiff');
          }
          if (e.t > 20) { e.state = 'backoff'; e.t = 0; }
        } else if (e.kind === 'bandar') {
          // leaping pounce
          e.x += e.vx; e.z += e.vz; e.vz -= 0.22;
          if (!e.hitLanded) { tryHitPlayer(e, e.dmg, 34, false, 16); if (G.hitstop > 0) e.hitLanded = true; }
          if (e.z <= 0) { e.z = 0; e.vz = 0; e.state = 'backoff'; e.t = 0; spawnDust(e.x, e.y, 2); }
        } else { // pehlwan: charge into a bear hug
          e.x += e.vx; e.vx *= 0.94;
          if (e.t === 10 && !e.hitLanded) {
            e.hitLanded = true;
            const canHold = Math.abs(p.x - e.x) < 38 && Math.abs(p.y - e.y) < 14 && p.z < 12 &&
              !p.dying && p.invuln <= 0 && p.state !== 'down' && p.state !== 'getup' && !p.grabbedBy;
            if (canHold) {
              grabPlayer(p, e);
              e.state = 'grabhold'; e.t = 0; e.holdT = 0;
              G.audio.sfx('throw');
              break;
            }
            tryHitPlayer(e, e.dmg, 40, true, 16);
          }
          spawnDust(e.x - e.face * 10, e.y, 1);
          if (e.t > 26) { e.vx = 0; e.state = 'idle'; e.atkCd = irand(70, 130); e.poise = e.maxPoise; }
        }
        break;
      }
      case 'hurt': {
        e.x += e.vx; e.vx *= 0.88;
        if (e.t > 12) { e.state = 'idle'; e.atkCd = irand(30, 80); }
        break;
      }
      case 'stagger': {
        e.x += e.vx; e.vx *= 0.82;
        if (e.t > 72) { e.state = 'idle'; e.atkCd = irand(60, 100); }
        break;
      }
      case 'down': {
        if (inAir(e)) {
          const r = fall(e);
          if (r === 'bounce') spawnDust(e.x, e.y, 2);
          else if (r === 'land') { spawnDust(e.x, e.y, 3); G.shake = Math.max(G.shake, 2); }
        } else if (e.t > 45) { e.state = 'getup'; e.t = 0; }
        break;
      }
      case 'getup': {
        if (e.t > 14) { e.state = 'idle'; e.atkCd = irand(40, 90); }
        break;
      }
      case 'grabbed': break; // player controls position
      case 'thrown': {
        const landed = fall(e, 0.26) !== 'air';
        // a thrown body bowls through everything it passes
        for (const o of G.enemies) {
          if (o === e || o.dead || o.state === 'down' || o.state === 'thrown') continue;
          if (Math.abs(o.x - e.x) < 21 && Math.abs(o.y - e.y) < 15 && Math.abs(o.z - e.z) < 24) {
            o.hurt(10, Math.sign(e.vx) || 1, true, true);
            spawnSpark(o.x, o.y - 44);
          }
        }
        for (const pr of G.props) {
          if (!pr.broken && Math.abs(pr.x - e.x) < 22 && Math.abs(pr.y - e.y) < 15) pr.hurt(20, Math.sign(e.vx) || 1);
        }
        if (G.boss && !G.boss.dead && Math.abs(G.boss.x - e.x) < 28 && Math.abs(G.boss.y - e.y) < 18) {
          G.boss.hurt(12, Math.sign(e.vx) || 1, true, false);
          spawnSpark(G.boss.x, G.boss.y - 56);
        }
        if (landed) {
          e.vz = 0; e.vx = 0;
          e.hp -= 6; e.flash = 5;
          spawnDust(e.x, e.y, 3); G.shake = Math.max(G.shake, 3);
          G.audio.sfx('land');
          // hurtEnemy refuses anything still in `thrown`, so the state has to come off
          // BEFORE the lethal blow or the kill is swallowed, the body lands again next
          // frame, and it spams dust, shake and the land SFX at 60 Hz until the watchdog.
          e.state = 'down'; e.t = 20;
          if (e.hp <= 0) { e.hp = 1; hurtEnemy(e, 1, Math.sign(e.vx) || 1, true, false); }
        }
        break;
      }
      case 'dying': {
        if (inAir(e) && fall(e, 0.28, 0) === 'land') spawnDust(e.x, e.y, 3);
        if (e.t > 34) e.removeMe = true;
        break;
      }
    }

    // separation from other enemies
    if (e.state === 'idle' || e.state === 'approach') {
      for (const o of G.enemies) {
        if (o === e || o.dead) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        if (Math.abs(dx) < 19 && Math.abs(dy) < 11) {
          e.x += Math.sign(dx || rand(-1, 1)) * 0.4;
          e.y += Math.sign(dy || rand(-1, 1)) * 0.3;
        }
      }
    }

    // Animation is chosen from how far a body actually moved, not from the name of
    // its AI state: enemies drift in depth, back off and sway while nominally 'idle',
    // and playing the standing frame through that is what reads as sliding. Measuring
    // after the arena clamp also stops the legs cycling while walking into a wall.
    e.y = clamp(e.y, FLOOR_TOP, FLOOR_BOT);
    const side = clampToArena(e);
    e.moved = Math.hypot(e.x - x0, e.y - y0);
    e.stridePhase += e.moved;
    if (side && !e.dead && (e.state === 'down' || e.state === 'thrown')) wallSplat(e, side);
  }
  // sweep removed
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].removeMe) G.enemies.splice(i, 1);
}

export function drawEnemy(ctx, e, camX) {
  const sx = Math.round(e.x - camX), sy = Math.round(e.y - e.z);
  let name = 'idle', idx = (G.time >> 4) & 1;
  switch (e.state) {
    case 'spawn': case 'approach': case 'backoff': case 'loot': case 'idle':
      if (e.moved > MOVE_EPS) { name = 'walk'; idx = Math.floor(e.stridePhase / 6); }
      else { name = 'idle'; idx = (G.time >> 4) & 1; }
      break;
    case 'grabhold': name = 'atk'; idx = 1; break;
    case 'windup': name = 'atk'; idx = 0; break;
    // strike then follow-through, so the swing has weight instead of popping
    case 'attack': name = 'atk'; idx = e.t < (ATK_RECOVER[e.kind] || 10) ? 1 : 2; break;
    case 'hurt': name = 'hurt'; idx = e.t < 5 ? 1 : 0; break;
    case 'stagger': name = 'hurt'; idx = (e.t >> 3) & 1; break;
    case 'down': case 'dying': name = 'down'; break;
    case 'getup': name = 'getup'; break;
    case 'grabbed': name = 'hurt'; break;
    case 'thrown': name = 'down'; break;
  }
  if (e.state === 'dying' && ((G.time >> 1) & 1) && e.t > 10) return; // KO blink-out
  const f = getFrame(e.set, name, idx, e.face);
  const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4;
  // windup telegraph flash + damage flash
  const cue = e.state === 'windup' && e.t > (WINDUP[e.kind] || 18) - 10;
  const cueHot = cue && ((e.t >> 1) & 1);
  const hot = cueHot || e.flash > 0;
  if (hot || e.tint) {
    ctx.save();
    ctx.filter = cueHot ? (PARRY_CLASS[e.kind] !== 'unblockable'
      ? 'brightness(1.8) sepia(1) saturate(5) hue-rotate(70deg)'
      : 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-35deg)')
      : e.flash > 0 ? 'brightness(2.2)' : e.tint;
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  if (cue) {
    ctx.save();
    ctx.strokeStyle = PARRY_CLASS[e.kind] !== 'unblockable' ? '#6dff82' : '#ff4050';
    ctx.lineWidth = 2;
    const cy = sy - e.h - 8;
    if (PARRY_CLASS[e.kind] !== 'unblockable') {
      ctx.beginPath(); ctx.moveTo(sx, cy - 5); ctx.lineTo(sx + 5, cy); ctx.lineTo(sx, cy + 5); ctx.lineTo(sx - 5, cy); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(sx - 5, cy - 5); ctx.lineTo(sx + 5, cy + 5); ctx.moveTo(sx + 5, cy - 5); ctx.lineTo(sx - 5, cy + 5); ctx.stroke();
    }
    ctx.restore();
  }
  // poise pips: shows a heavy is still absorbing, and when it is about to break
  if (e.maxPoise && e.poise > 0 && e.state !== 'down' && e.state !== 'dying') {
    for (let i = 0; i < e.poise; i++) {
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(sx - e.maxPoise * 2 + i * 4, sy - e.h - 8, 3, 2);
    }
  }
}

export function aliveEnemies() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead) n++;
  return n;
}
