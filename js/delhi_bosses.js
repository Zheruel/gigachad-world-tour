// delhi_bosses.js - the two DIRTY DELHI fights with their own mechanics. Each one is a set of hooks the shared
// boss machine in bosses.js calls: init on spawn, update (return true to own the frame,
// false to fall through to the generic hurt/down/dying/grab states), draw, and the
// reactions to being hurt, enraged and killed. Every fight has one thing that is not
// damage: Pappu's ring, the dredger's winch and cab.
import { G, W, FLOOR_TOP, FLOOR_BOT, clamp, irand, diff, arenaMin, arenaMax, laneMin, fall, inAir } from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { ASSETS } from './assets.js';
import { spawnSpark, spawnDust, spawnShock, spawnPop, spawnRing, spawnDebris, impact } from './effects.js';
import { hurtPlayer, grabPlayer, resolveIncomingHit } from './player.js';
import { spawnShot, spawnArc, spawnZone } from './shots.js';
import { spawnEnemy, aliveEnemies } from './enemies.js';
import { createProp } from './props.js';
import { reactStage } from './ambience.js';
import { PARRY_CLASS, tryHitPlayer, hitEnemiesNear, blitTelegraph, drawCueMarker } from './bosslib.js';

const cdScale = (b) => (b.enraged ? 0.6 : 1) / diff().aggro;
const bossSpeed = (b) => b.def.speed * (b.enraged ? 1.45 : 1) * diff().aggro;

// The generic idle: track the player's lane, close to punching distance, count down.
function approach(b, spd, near, far) {
  const p = G.player;
  const wantY = clamp(p.y, laneMin(b.x), FLOOR_BOT);
  b.y += clamp(wantY - b.y, -spd * 0.6, spd * 0.6);
  const dx = p.x - b.x;
  if (Math.abs(dx) > (far || 40)) b.x += Math.sign(dx) * spd * 0.55;
  else if (Math.abs(dx) < (near || 22)) b.x -= Math.sign(dx) * spd * 0.3;
}

function say(b, line) {
  if (!line || G.rawTime - (b.lastLine || -999) < 240) return;
  b.lastLine = G.rawTime;
  spawnPop(b.x, b.y - b.z - b.h - 8, line);
}

// ============================================================ USTAD PAPPU
// The fight is the arena: the crowd walks inward and the walls tighten from 480 to
// about 300. No weapons, no projectiles, nothing to break - and poise, so trading
// loses and you have to parry the charge.
const PAPPU_WIND = { charge: 24, grab: 14, stomp: 28 };
const pappu = {
  init(b) {
    b.poise = 3; b.maxPoise = 3; b.poiseT = 0;
    b.mashNeed = 9; b.slamDmg = 17;
    G.arenaSqueezeTarget = 88;
  },
  intro(b, t) {
    // the crowd closes while he walks in
    const sq = G.arenaSqueezeTarget - G.arenaSqueeze;
    if (sq) G.arenaSqueeze += clamp(sq, -0.6, 0.6);
    if (t > 28 && b.x > G.camX + 320) b.x -= 0.9;
    b.introWalking = t > 28 && b.x > G.camX + 320;
  },
  update(b) {
    const p = G.player;
    if (b.poise < b.maxPoise && ++b.poiseT > 150) { b.poise = b.maxPoise; b.poiseT = 0; }
    const spd = bossSpeed(b);
    switch (b.state) {
      case 'idle': {
        approach(b, spd, 24, 44);
        if (--b.atkCd <= 0) {
          const d = Math.abs(p.x - b.x);
          const pick = [];
          if (d > 80) pick.push('charge', 'charge');
          if (d < 64) pick.push('grab');
          if (d < 110) pick.push('stomp', 'stomp');
          if (d > 50 && d < 140) pick.push('charge');
          b.pattern = pick.length ? pick[irand(0, pick.length - 1)] : 'stomp';
          if (Math.random() < 0.35) say(b, b.def.lines[irand(0, b.def.lines.length - 1)]);
          b.state = 'windup'; b.t = 0; b.hitLanded = false;
        }
        return true;
      }
      case 'windup': {
        if (b.t >= PAPPU_WIND[b.pattern]) {
          b.state = b.pattern; b.t = 0; b.hitLanded = false;
          if (b.pattern === 'charge') { b.vx = b.face * (b.enraged ? 4.0 : 3.4); G.audio.sfx('dash'); }
          if (b.pattern === 'stomp') G.audio.sfx('whiff');
        }
        return true;
      }
      case 'charge': {
        // shoulder first, the whole man behind it. Countering it is the fight's answer.
        b.x += b.vx;
        if (b.t % 3 === 0) spawnDust(b.x - b.face * 14, b.y, 1);
        if (!b.hitLanded && tryHitPlayer(b, 12, 46, true, 16)) b.hitLanded = true;
        const wallHit = b.x <= arenaMin() + 2 || b.x >= arenaMax() - 2;
        if (b.t > 30 || wallHit || (b.hitLanded && b.t > 6)) {
          b.vx = 0; b.state = 'recover'; b.t = 0; b.recover = wallHit ? 48 : 36;
          if (wallHit) { G.shake = Math.max(G.shake, 5); spawnDust(b.x, b.y, 4); }
        }
        return true;
      }
      case 'stomp': {
        // the ground shakes: on the floor you are hit, in the air you are not
        if (b.t === 6) {
          G.shake = Math.max(G.shake, 8);
          spawnShock(b.x, b.y);
          spawnRing(b.x, b.y - 4, '#e8d0a0');
          spawnDust(b.x - 20, b.y, 3); spawnDust(b.x + 20, b.y, 3);
          G.ringWobble = 40;
          G.audio.sfx('slam');
          if (Math.abs(p.x - b.x) < 88 && Math.abs(p.y - b.y) < 26 && p.z < 14 && !p.dying
              && p.state !== 'down' && p.state !== 'getup') {
            hurtPlayer(p, 13, p.x < b.x ? -1 : 1, true);
            spawnSpark(p.x, p.y - 30);
          }
          hitEnemiesNear(b.x, b.y, 88, 26, 10, undefined, true);
          reactStage(b.x, 1.4);
        }
        if (b.t > 36) { b.state = 'idle'; b.atkCd = irand(60, 100) * cdScale(b); }
        return true;
      }
      default: return false;   // grab, grabhold, recover, hurt, stagger, down, dying
    }
  },
  onHurt(b, dmg, heavy, launch) {
    // poise 3: he does not flinch until the third light hit in a row
    if (b.poise > 0 && !heavy && !launch && b.state !== 'grabhold') {
      b.poise--; b.poiseT = 0;
      G.audio.sfx('armor');
      return true;
    }
    b.poise = b.maxPoise;
    return false;
  },
  onEnrage(b) {
    // he throws the first man out of the ring, and the crowd widens it by 60
    G.arenaSqueezeTarget = 58;
    G.ringWobble = 60;
    spawnDebris(arenaMax() - 6, 200, 8, ['#241a14', '#c8a070', '#e8e0cc']);
  },
  onDeath(b) { G.arenaSqueezeTarget = 0; },
  frame(b) {
    switch (b.state) {
      case 'idle': return b.moved > 0.2 ? ['walk', (G.time >> 3) & 3] : ['idle', (G.time >> 4) & 3];
      case 'windup': return b.pattern === 'charge' ? ['charge', 0] : b.pattern === 'grab' ? ['grab', 0] : ['stomp', Math.min(2, b.t >> 3)];
      case 'charge': return ['charge', b.t < 10 ? 1 : 2];
      case 'recover': return [b.pattern === 'charge' ? 'charge' : 'stomp', 3];
      case 'stomp': return ['stomp', 3];
      case 'grab': return ['grab', b.t < 8 ? 0 : 1];
      case 'grabhold': return ['grab', 2];
      case 'hurt': return ['hurt', b.t < 5 ? 1 : 0];
      case 'stagger': return ['hurt', (b.t >> 3) & 1];
      case 'down': case 'dying': return ['down', 0];
    }
    return ['idle', 0];
  },
  draw(ctx, b, camX) {
    const [name, idx] = pappu.frame(b);
    const f = getFrame(b.set, name, idx, b.face);
    const sx = Math.round(b.x - camX), sy = Math.round(b.y - b.z);
    const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4;
    const cue = b.state === 'windup' && b.t > 6;
    blitTelegraph(ctx, b, f, dx, dy, cue);
    if (cue) drawCueMarker(ctx, b, sx, sy - b.h - 8);
    // poise pips: three, and every light hit takes one until he flinches
    if (!b.dead && b.maxPoise) {
      for (let i = 0; i < b.maxPoise; i++) {
        ctx.fillStyle = i < b.poise ? '#f0e0b0' : 'rgba(40,24,20,0.7)';
        ctx.fillRect(sx - 8 + i * 6, sy - b.h - 2, 4, 3);
      }
    }
  },
};

// ============================================================ THE DREDGER
// A machine. The bucket is the boss's body: hittable when it is down on the pontoon
// or dragging the lane, unreachable at rest. The winch on the deck is an ordinary
// breakable that stops the bucket for good. The hose is a reflectable projectile, and
// reflecting it into the cab glass is the fast way through. Then the operator comes out.
const BUCKET_REST = 80;      // above a jump; a jump kick reaches 42
const SWEEP_Z = 8;
const OPERATOR_HP = 90;
const DREDGER_WIND = { hose: 18, swing: 22 };

const dredger = {
  init(b) {
    b.phase = 'machine';
    b.z = BUCKET_REST; b.face = -1;
    b.x = G.camLock + 250; b.y = clamp(216, laneMin(G.camLock + 250), FLOOR_BOT);
    b.w = 60; b.h = 66; b.shadowR = 28;
    b.glass = 3; b.crewCd = 240; b.hoseCd = 360; b.jaws = 0; b.sweeps = 0;
    b.winchGone = false;
    b.label = b.def.name;
    // where the crew stands and where the glass is, measured off the pontoon plate
    b.rail = { x: G.camLock + 268, y: 118 };
    b.reflectTarget = { x: G.camLock + 352, y: 74 };
    b.winch = createProp('winch', G.camLock + 300, laneMin(G.camLock + 300) + 3);
    b.winch.onBreak = () => {
      b.winchGone = true;
      spawnPop(b.winch.x, b.winch.y - 50, 'THE WINCH IS DEAD');
      G.shake = Math.max(G.shake, 8);
      G.audio.sfx('enrage');
      b.hurt(100, 1, false, false);
      if (b.phase === 'machine' && !b.dead) { b.state = 'bucketfall'; b.t = 0; b.dead_bucket = true; }
    };
    G.props.push(b.winch);
  },
  intro(b, t) {
    // the crane starts: the bucket comes down out of the dark to its rest height
    b.z = t < 50 ? 260 : Math.max(BUCKET_REST, 260 - (t - 50) * 4);
    if (t === 50 || t === 120) G.shake = Math.max(G.shake, 6);
    if (t === 50) G.audio.sfx('enrage');
  },
  crew(b) {
    // the guard: there must always be something to punch
    if (b.crewCd > 0) b.crewCd--;
    const mud = G.enemies.filter((e) => !e.dead && e.kind === 'mudlark').length;
    if (b.z > 34 && aliveEnemies() === 0 && b.crewCd > 150) b.crewCd = 150;
    if (b.crewCd <= 0 && mud < 2 && aliveEnemies() < 4) {
      b.crewCd = b.winchGone ? 660 : 1140;
      spawnEnemy('mudlark', G.camX + 60, laneMin(G.camX + 60));
      spawnEnemy('mudlark', G.camX + W - 80, laneMin(G.camX + W - 80));
      spawnPop(G.camX + W / 2, 150, 'OVER THE SIDE');
      G.audio.sfx('blip');
    }
  },
  operatorPhase(b) {
    if (b.phase !== 'machine') return;
    b.phase = 'operator';
    // a fresh bar for a new man; the machine's enrage line must not fire for him
    b.hp = OPERATOR_HP; b.maxhp = OPERATOR_HP; b.enraged = true;
    b.bucket = { x: b.x, y: b.y, z: b.z, dead: !!b.dead_bucket };
    b.set = SPR.thekedar; b.label = 'THE THEKEDAR';
    b.w = 40; b.h = 88; b.shadowR = 13; b.z = 0;
    b.x = b.reflectTarget.x - 10; b.y = laneMin(b.x) + 6; b.face = -1;
    b.state = 'openter'; b.t = 0; b.armor = 0;
    spawnPop(b.x, b.y - 100, 'THE OPERATOR');
    spawnDebris(b.reflectTarget.x, b.reflectTarget.y, 10, ['#9ad0e0', '#e8f4ff', '#3a5060']);
    G.shake = Math.max(G.shake, 6);
    G.audio.sfx('ko');
    // the crane goes still
    G.enemies.forEach((e) => { if (e.kind === 'mudlark' && !e.dead) e.hurt(999, 1, true, true); });
  },
  update(b) {
    const p = G.player;
    if (b.phase === 'operator') {
      switch (b.state) {
        case 'openter': {
          b.x -= 1.1;
          if (b.t > 70) { b.state = 'idle'; b.atkCd = 40; }
          return true;
        }
        case 'idle': {
          approach(b, bossSpeed(b) * 1.3, 26, 40);
          if (--b.atkCd <= 0) {
            b.pattern = 'swing';
            if (Math.random() < 0.4) say(b, ['PLEASE', 'I ONLY DRIVE IT', 'NOT MY RIVER'][irand(0, 2)]);
            b.state = 'windup'; b.t = 0;
          }
          return true;
        }
        case 'windup': {
          if (b.t >= DREDGER_WIND.swing) { b.state = 'swing'; b.t = 0; b.hitLanded = false; G.audio.sfx('whiff'); }
          return true;
        }
        case 'swing': {
          if (b.t < 6) b.x += b.face * 1.2;
          if (b.t === 6 && !b.hitLanded) { b.hitLanded = true; tryHitPlayer(b, 9, 44, false, 15, 'counter'); }
          if (b.t > 30) { b.state = 'idle'; b.atkCd = irand(50, 90); }
          return true;
        }
        default: return false;
      }
    }
    // ---- the machine ----
    if (b.hp <= OPERATOR_HP && !b.dead) { dredger.operatorPhase(b); return true; }
    dredger.crew(b);
    if (b.hoseCd > 0) b.hoseCd--;
    if (b.jaws > 0) b.jaws--;
    const spd = b.enraged ? 1.15 : 1;
    switch (b.state) {
      case 'idle': {
        // at rest: drifting over the lane, out of reach
        b.z += clamp(BUCKET_REST - b.z, -2.5, 2.5);
        b.x += clamp(p.x - b.x, -0.6, 0.6) * spd;
        b.y += clamp(clamp(p.y, laneMin(b.x), FLOOR_BOT) - b.y, -0.8, 0.8);
        if (--b.atkCd <= 0 && b.z >= BUCKET_REST - 1) {
          const opts = [];
          if (!b.winchGone) opts.push('sweep', 'sweep', 'bucketdrop', 'bucketdrop');
          if (b.hoseCd <= 0) opts.push('hose', 'hose');
          if (!opts.length) { b.atkCd = 30; return true; }
          b.pattern = opts[irand(0, opts.length - 1)];
          b.t = 0; b.hitLanded = false;
          if (b.pattern === 'sweep') {
            b.state = 'sweepaim';
            b.sweepDir = p.x < b.x ? -1 : 1;
            b.sweepY = clamp(p.y, laneMin(b.x), FLOOR_BOT);
            b.sweeps = b.enraged ? 2 : 1;
            G.audio.sfx('blip');
          } else if (b.pattern === 'bucketdrop') {
            b.state = 'dropaim'; G.audio.sfx('blip');
          } else { b.state = 'windup'; }
        }
        return true;
      }
      case 'sweepaim': {
        // to the far edge of the side it starts on, and down to lane height, red
        const startX = b.sweepDir < 0 ? arenaMax() - 10 : arenaMin() + 10;
        b.x += clamp(startX - b.x, -4, 4);
        b.y += clamp(b.sweepY - b.y, -2, 2);
        b.z += clamp(SWEEP_Z - b.z, -2.2, 2.2);
        if (Math.abs(b.x - startX) < 2 && Math.abs(b.z - SWEEP_Z) < 1 && b.t > 30) {
          b.state = 'sweep'; b.t = 0; b.hitLanded = false;
          G.audio.sfx('dash');
        }
        return true;
      }
      case 'sweep': {
        // the bucket drags the full width of the lane at one depth. Change lane or jump it.
        b.z = SWEEP_Z;
        b.x += b.sweepDir * 2.8 * spd;
        if (b.t % 4 === 0) spawnDust(b.x - b.sweepDir * 20, b.y, 1);
        if (!b.hitLanded && Math.abs(p.x - b.x) < 34 && Math.abs(p.y - b.y) < 16 && p.z < 24 && !p.dying
            && p.state !== 'down' && p.state !== 'getup') {
          b.hitLanded = true;
          hurtPlayer(p, 14, b.sweepDir, true);
          spawnSpark(p.x, p.y - 40); G.audio.sfx('heavy');
        }
        hitEnemiesNear(b.x, b.y, 34, 16, 14, b.sweepDir, true);
        const done = b.sweepDir < 0 ? b.x <= arenaMin() + 10 : b.x >= arenaMax() - 10;
        if (done) {
          b.sweeps--;
          if (b.sweeps > 0) {
            // and back, at whatever lane you moved to
            b.sweepDir = -b.sweepDir; b.sweepY = clamp(p.y, laneMin(b.x), FLOOR_BOT);
            b.state = 'sweepaim'; b.t = 20; b.hitLanded = false;
          } else { b.state = 'rise'; b.t = 0; }
        }
        return true;
      }
      case 'dropaim': {
        // it hangs over your shadow for 40 frames and comes straight down
        b.x += clamp(p.x - b.x, -2.6, 2.6) * spd;
        b.y += clamp(clamp(p.y, laneMin(b.x), FLOOR_BOT) - b.y, -2, 2);
        b.z += clamp(BUCKET_REST + 10 - b.z, -2, 2);
        if (b.t >= (b.enraged ? 32 : 40)) { b.state = 'bucketfall'; b.t = 0; b.hitLanded = false; }
        return true;
      }
      case 'bucketfall': {
        b.z -= 7;
        if (b.z <= 0) {
          b.z = 0;
          spawnShock(b.x, b.y); spawnDust(b.x - 24, b.y, 4); spawnDust(b.x + 24, b.y, 4);
          G.shake = Math.max(G.shake, 10); G.audio.sfx('slam'); impact(true, 16);
          reactStage(b.x, 1.6);
          if (Math.abs(p.x - b.x) < 38 && Math.abs(p.y - b.y) < 18 && p.z < 14 && !p.dying
              && p.state !== 'down' && p.state !== 'getup') {
            hurtPlayer(p, 16, p.x < b.x ? -1 : 1, true);
            spawnSpark(p.x, p.y - 30);
          }
          hitEnemiesNear(b.x, b.y, 38, 18, 16, undefined, true);
          if (!b.dead_bucket) {
            // the spoil dump: wet sand across the pontoon that stays and slows everything in it
            spawnZone('spoil', b.x, b.y, b.enraged ? 56 : 44, 900, { both: true, drag: 0.55 });
            b.jaws = 40;
          }
          b.state = 'grounded'; b.t = 0;
        }
        return true;
      }
      case 'grounded': {
        // the punish window: it sits on the pontoon and you hit it
        b.z = 0;
        if (b.dead_bucket) return true;   // the winch is gone: it never lifts again
        if (b.t > (b.enraged ? 66 : 96)) { b.state = 'rise'; b.t = 0; }
        return true;
      }
      case 'rise': {
        b.z += 2.4;
        if (b.z >= BUCKET_REST) { b.z = BUCKET_REST; b.state = 'idle'; b.atkCd = irand(50, 90) * cdScale(b); }
        return true;
      }
      case 'windup': {
        if (b.t >= DREDGER_WIND.hose) { b.state = 'hose'; b.t = 0; }
        return true;
      }
      case 'hose': {
        // the deck crew turn the slurry hose on you: green, and it goes back where it came from
        if (b.t === 4 || b.t === 20 || b.t === 36) {
          spawnShot('slurry', b.rail.x - 8, clamp(p.y, laneMin(b.rail.x), FLOOR_BOT), -3.2, 9,
            { source: b, parryClass: 'reflect' });
          G.audio.sfx('whiff');
        }
        if (b.t > 50) { b.hoseCd = b.enraged ? 320 : 480; b.state = 'idle'; b.atkCd = irand(30, 60) * cdScale(b); }
        return true;
      }
      case 'dying': {
        if (b.z > 0 || b.vz) { if (fall(b, 0.28, 0) === 'land') { spawnShock(b.x, b.y); G.shake = 8; } }
        return true;
      }
      default: return false;
    }
  },
  onReflectHit(b, s) {
    // a reflected hose into the cab glass: the best-kept secret in the level
    if (b.phase !== 'machine') { b.hurt(Math.round(s.dmg * 1.5), 1, true, false); return; }
    b.glass = Math.max(0, b.glass - 1);
    spawnDebris(b.reflectTarget.x, b.reflectTarget.y, 8, ['#9ad0e0', '#e8f4ff', '#3a5060']);
    spawnPop(b.reflectTarget.x, b.reflectTarget.y - 16, b.glass ? 'THE GLASS' : 'THE CAB');
    G.shake = Math.max(G.shake, 6);
    G.audio.sfx('slam');
    b.hurt(45, 1, false, false);
    if (b.glass <= 0 && !b.dead) dredger.operatorPhase(b);
  },
  onHurt(b, dmg, heavy, launch) {
    if (b.phase === 'operator') return false;
    // a machine does not flinch; it just takes it
    if (b.state === 'grounded' && heavy) { G.shake = Math.max(G.shake, 4); spawnDust(b.x, b.y, 2); }
    return true;
  },
  onEnrage(b) {
    if (b.phase === 'machine') G.shake = Math.max(G.shake, 8);
  },
  onDeath(b) {
    if (b.phase === 'operator') return;
    // killed as a machine: the bucket comes down for good
    b.state = 'dying'; b.vz = 0; b.vx = 0;
    if (b.z > 0) b.vz = -0.5;
  },
  frame(b) {
    switch (b.state) {
      case 'openter': return ['walk', (G.time >> 3) & 3];
      case 'idle': return b.moved > 0.2 ? ['walk', (G.time >> 3) & 3] : ['idle', (G.time >> 4) & 3];
      case 'windup': return ['punch', 0];
      case 'swing': return ['punch', b.t < 10 ? 1 : 2];
      case 'recover': return ['punch', 2];
      case 'hurt': return ['hurt', b.t < 5 ? 1 : 0];
      case 'stagger': return ['hurt', (b.t >> 3) & 1];
      case 'down': case 'dying': return ['down', 0];
    }
    return ['idle', 0];
  },
  drawBucket(ctx, camX, x, y, z, jaws, cue, b, swing) {
    const img = jaws ? (ASSETS.prop_bucket_open || ASSETS.prop_bucket) : ASSETS.prop_bucket;
    const sx = Math.round(x - camX), sy = Math.round(y - z);
    // the chain, up out of frame
    ctx.save();
    ctx.strokeStyle = '#1a1412'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(sx, -8); ctx.lineTo(sx, sy - (img ? frameH(img) : 60) + 6); ctx.stroke();
    ctx.strokeStyle = '#4a3c30'; ctx.lineWidth = 1;
    for (let yy = -6; yy < sy - 60; yy += 6) { ctx.strokeRect(sx - 1.5, yy, 3, 4); }
    ctx.restore();
    ctx.save();
    if (swing) { ctx.translate(sx, sy - 70); ctx.rotate(swing); ctx.translate(-sx, -(sy - 70)); }
    if (img) {
      const dx = sx - Math.round(frameW(img) / 2), dy = sy - frameH(img) + 4;
      if (b) blitTelegraph(ctx, b, img, dx, dy, cue);
      else blit(ctx, img, dx, dy);
    } else {
      ctx.fillStyle = '#4a3a2a'; ctx.fillRect(sx - 28, sy - 60, 56, 58);
      ctx.fillStyle = '#2a201a'; ctx.fillRect(sx - 28, sy - 20, 56, 18);
    }
    ctx.restore();
  },
  drawCab(ctx, b, camX) {
    // cracks in the cab glass, one set per reflected hose
    if (b.glass >= 3) return;
    const cx = Math.round(b.reflectTarget.x - camX), cy = b.reflectTarget.y;
    ctx.save();
    ctx.strokeStyle = 'rgba(230,245,255,0.85)'; ctx.lineWidth = 1;
    const n = (3 - b.glass) * 4;
    for (let i = 0; i < n; i++) {
      const a = (i * 2.4) + 0.3, r = 8 + (i % 3) * 5;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7); ctx.stroke();
    }
    if (b.glass <= 0) { ctx.fillStyle = 'rgba(10,8,8,0.8)'; ctx.fillRect(cx - 12, cy - 9, 24, 16); }
    ctx.restore();
  },
  drawHose(ctx, b, camX) {
    if (b.phase !== 'machine' || (b.state !== 'windup' && b.state !== 'hose')) return;
    const img = ASSETS.prop_hose_nozzle;
    const sx = Math.round(b.rail.x - camX), sy = b.rail.y;
    if (img) blit(ctx, img, sx - frameW(img) + 4, sy - frameH(img) / 2);
    else { ctx.fillStyle = '#3a3a3a'; ctx.fillRect(sx - 18, sy - 3, 18, 6); }
    // slurry spitting from it during the wind-up
    if (b.state === 'windup' && (b.t & 2)) { ctx.fillStyle = '#8a8070'; ctx.fillRect(sx - 24, sy - 1, 4, 3); }
  },
  draw(ctx, b, camX) {
    dredger.drawCab(ctx, b, camX);
    dredger.drawHose(ctx, b, camX);
    if (b.phase === 'operator') {
      if (b.bucket) dredger.drawBucket(ctx, camX, b.bucket.x, b.bucket.y, b.bucket.z, false, false, null, 0);
      const [name, idx] = dredger.frame(b);
      const f = getFrame(b.set, name, idx, b.face);
      const sx = Math.round(b.x - camX), sy = Math.round(b.y - b.z);
      const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4;
      const cue = b.state === 'windup' && b.t > 6;
      blitTelegraph(ctx, b, f, dx, dy, cue);
      if (cue) drawCueMarker(ctx, b, sx, sy - b.h - 8);
      return;
    }
    const cue = b.state === 'sweepaim' || b.state === 'dropaim' || (b.state === 'windup' && b.t > 6);
    const swing = b.z > 20 && b.state !== 'dying' ? Math.sin(G.rawTime * 0.06) * 0.035 : 0;
    dredger.drawBucket(ctx, camX, b.x, b.y, b.z, b.jaws > 0, cue, b, swing);
    if (cue && b.state !== 'windup') {
      // the red cross sits on the ground under it: that is where it is going
      const sx = Math.round(b.x - camX);
      drawCueMarker(ctx, b, sx, Math.round(b.y) - 6);
    } else if (cue) {
      drawCueMarker(ctx, b, Math.round(b.rail.x - camX) - 10, b.rail.y - 14);
    }
  },
};

export const DELHI = { pappu, dredger };

export function initDelhi(b) {
  const d = DELHI[b.key];
  if (!d) return;
  b.delhi = d;
  d.init(b);
}

export function delhiIntro(b, t) {
  if (b.delhi && b.delhi.intro) { b.delhi.intro(b, t); return true; }
  return false;
}
