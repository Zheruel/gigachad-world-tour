// bosses.js - the Chandni Chowk bosses. One shared state machine, a shared
// pattern library, and a per-boss pattern list + tuning.
//   MIRCHI  (mid-boss) the Chaat King: fights from behind his cart - burning
//                      samosas, a poison chutney puddle, a pressure-cooker jet.
//                      Break the cart and he loses the charge for good.
//   YADAV   (boss)     corrupt inspector: lathi thrust, spinning lathi sweep,
//                      tear gas, and a whistle that brings two goondas running.
import { G, W, FLOOR_TOP, FLOOR_BOT, clamp, irand, rand, addScore, diff, clampToArena, fall, inAir } from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnSpark, spawnDust, spawnShock, impact, spawnPop, spawnRing } from './effects.js';
import { hurtPlayer, grabPlayer, resolveIncomingHit } from './player.js';
import { spawnShot, spawnArc, spawnZone } from './shots.js';
import { spawnEnemy } from './enemies.js';

export const BOSSES = {
  raja: {
    name: 'RICKSHAW RAJA', title: 'KING OF THE METER', taunt: 'NO CHANGE. ONLY PAIN.',
    set: 'raja', rageSet: 'rajaRage', portrait: 'portrait_raja',
    hp: 300, speed: 1.12, w: 66, h: 104, shadowR: 22, score: 3200, cart: true,
    patterns: ['wrench', 'cartcharge', 'dashpunch', 'grab'],
    rageLine: 'METER DOWN. FISTS UP.', lines: ['ROAD IS CLOSED', 'SURGE PRICING', 'NO CHANGE'],
  },
  mirchi: {
    name: 'MIRCHI', title: 'THE CHAAT KING', taunt: 'FRESH! VERY FRESH!',
    set: 'mirchi', rageSet: 'mirchiRage', portrait: 'portrait_mirchi',
    hp: 320, speed: 0.82, w: 62, h: 100, shadowR: 20, score: 3500, cart: true,
    patterns: ['samosa', 'chutney', 'steamjet', 'cartcharge', 'grab'],
    rageLine: 'YOU WANT EXTRA SPICY',
    lines: ['FRESH! VERY FRESH!', 'NO REFUND', 'ONE PLATE ONLY', 'IS GOOD FOR STOMACH'],
  },
  yadav: {
    name: 'INSPECTOR YADAV', title: 'CHANDNI CHOWK POLICE', taunt: 'YOU HAVE NO PERMIT',
    set: 'yadav', rageSet: 'yadavRage', portrait: 'portrait_yadav',
    hp: 430, speed: 1.0, w: 66, h: 108, shadowR: 22, score: 5000,
    patterns: ['lathi', 'lathisweep', 'teargas', 'dashpunch', 'whistle', 'grab'],
    rageLine: 'OFF DUTY',
    lines: ['YOU HAVE NO PERMIT', 'THIS IS MY MARKET', 'PAY THE FINE', 'RESISTING ARREST'],
  },
  refund: {
    name: 'MR. REFUND', title: 'ESCALATION MANAGER', taunt: 'YOUR CASE IS CLOSED',
    set: 'refund', rageSet: 'refundRage', portrait: 'portrait_refund',
    hp: 390, speed: 0.96, w: 64, h: 106, shadowR: 21, score: 4400,
    patterns: ['phone', 'dashpunch', 'teargas', 'whistle', 'grab'],
    rageLine: 'PLEASE REMAIN ON THE LINE', lines: ['TICKET DENIED', 'READ THE TERMS', 'HOLD PLEASE'],
  },
  rana: {
    name: 'COMMANDER RANA', title: 'THE IRON LION', taunt: 'DELHI BELONGS TO THE STRONG',
    set: 'rana', rageSet: 'ranaRage', portrait: 'portrait_rana',
    hp: 560, speed: 1.08, w: 76, h: 112, shadowR: 25, score: 8000,
    patterns: ['dashpunch', 'lathisweep', 'grab', 'whistle', 'lathi'],
    rageLine: 'NOW YOU FACE THE CHAMPION',
    lines: ['KNEEL OR BREAK', 'THE FORT IS MINE', 'NO MORE TOURISTS', 'SHOW ME YOUR STRENGTH'],
  },
};

const PARRY_CLASS = {
  dashpunch: 'counter', lathi: 'counter', samosa: 'reflect', wrench: 'reflect', phone: 'reflect',
  grab: 'unblockable', lathisweep: 'unblockable', teargas: 'reflect', steamjet: 'unblockable',
  cartcharge: 'unblockable', chutney: 'hazard', whistle: 'hazard',
};

export function createBoss(key, x, y) {
  const def = BOSSES[key] || BOSSES.yadav;
  const hp = Math.round(def.hp * diff().hp * (def.mini ? 1 : 1));
  const b = {
    kind: 'boss', key, def, x, y, z: 0, vx: 0, vy: 0, vz: 0, face: -1,
    hp, maxhp: hp, enraged: false, mini: !!def.mini,
    state: 'idle', t: 0, atkCd: 90, pattern: null, punchN: 0, hits: 0, spawnT: G.rawTime,
    dead: false, removeMe: false, flash: 0, hitLanded: false, armor: 0,
    summoned: false, holdT: 0, whistles: 0, cart: null, cartGone: false,
    posture: key === 'yadav' ? 3 : 0, maxPosture: key === 'yadav' ? 3 : 0,
    w: def.w, h: def.h, shadowR: def.shadowR, set: SPR[def.set],
    hurt(dmg, dir, heavy, launch) { hurtBoss(b, dmg, dir, heavy, launch); },
    parried(dmg, dir) {
      if (b.key === 'yadav' && b.posture > 1) {
        b.posture--; b.flash = 6; b.state = 'recover'; b.t = 0; b.atkCd = 55;
        spawnPop(b.x, b.y - b.h - 8, 'POSTURE ' + b.posture);
      } else {
        b.posture = b.maxPosture;
        hurtBoss(b, b.key === 'yadav' ? dmg + 8 : dmg, dir, false, false);
        if (!b.dead) { b.state = 'stagger'; b.t = 0; b.vx = dir * 0.5; b.atkCd = 90; }
      }
    },
    thrown() {},
  };
  G.boss = b;
  return b;
}

function hurtBoss(b, dmg, dir, heavy, launch) {
  if (b.dead) return;
  if (b.armor > 0 && !launch) {
    b.armor--; b.flash = 4;
    b.hp -= Math.round(dmg * 0.4);
    G.hitstop = Math.max(G.hitstop, 3);
    G.audio.sfx('armor');
    return;
  }
  b.hp -= dmg;
  b.flash = 5;
  if (!b.enraged && b.hp <= b.maxhp / 2) {
    b.enraged = true;
    b.set = SPR[b.def.rageSet] || b.set;
    G.flash = 4; G.shake = 6;
    spawnPop(b.x, b.y - b.h - 6, b.def.rageLine);
    G.audio.sfx('enrage');
  }
  if (b.hp <= 0) {
    b.hp = 0; b.dead = true;
    b.state = 'dying'; b.t = 0;
    b.vx = dir * 2.4; b.vz = 3.6; b.z = Math.max(b.z, 0.1);
    addScore(b.def.score);
    spawnPop(b.x, b.y - 74, '+' + b.def.score);
    G.audio.sfx('ko');
    impact(true);
    G.shake = 8;
    if (G.player.grabbedBy === b) { G.player.grabbedBy = null; G.player.state = 'idle'; }
  } else if (heavy && Math.random() < 0.3) {
    b.state = 'down'; b.t = 0;
    b.vx = dir * 1.8; b.vz = 2.8; b.z = Math.max(b.z, 0.1);
    if (G.player.grabbedBy === b) { G.player.grabbedBy = null; G.player.state = 'idle'; }
  } else if (b.state !== 'grabhold' && (!b.enraged || Math.random() < 0.5)) {
    b.state = 'hurt'; b.t = 0;
    b.vx = dir * 0.8;
  }
}

function tryHitPlayer(b, dmg, range, heavy, tol) {
  const p = G.player;
  if (p.state === 'down' || p.state === 'getup' || p.dying) return false;
  if (Math.abs(p.x - (b.x + b.face * range * 0.5)) < range * 0.5 + 11 && Math.abs(p.y - b.y) < (tol || 16) && p.z < 22) {
    if (resolveIncomingHit(p, b, { parryClass: PARRY_CLASS[b.pattern] || 'counter' })) return true;
    hurtPlayer(p, dmg, b.face, heavy);
    spawnSpark(p.x, p.y - 40);
    G.audio.sfx(heavy ? 'heavy' : 'punch');
    return true;
  }
  return false;
}

function pickPattern(b) {
  const d = Math.abs(G.player.x - b.x);
  const list = b.def.patterns.filter((p) => {
    if (p === 'whistle') return G.enemies.length === 0 && b.whistles < (b.enraged ? 2 : 1);
    if (p === 'grab') return d < 100;
    if (p === 'cartcharge') return !b.cartGone && d > 60;
    if (p === 'samosa' || p === 'teargas' || p === 'wrench' || p === 'phone') return d > 70;
    if (p === 'chutney') return d > 40;
    if (p === 'steamjet') return d < 90;
    if (p === 'lathisweep') return d < 90;
    if (p === 'lathi') return d > 40;
    return true;
  });
  return list.length ? list[irand(0, list.length - 1)] : 'dashpunch';
}

export function updateBoss() {
  const b = G.boss;
  if (!b || b.removeMe) return;
  const p = G.player;
  b.t++;
  if (b.flash > 0) b.flash--;
  // watchdog: never let a boss sit in a passive state forever
  if (b.state === 'grabhold' && p.grabbedBy !== b) { b.state = 'idle'; b.t = 0; b.atkCd = 50; }
  if (b.state === 'down' && b.t > 240) { b.z = 0; b.vz = 0; b.vx = 0; b.state = 'idle'; b.t = 0; b.atkCd = 40; }
  if (b.state !== 'dying' && b.state !== 'down' && b.state !== 'grabhold') b.face = p.x < b.x ? -1 : 1;
  const spd = b.def.speed * (b.enraged ? 1.5 : 1) * diff().aggro;
  // the cart stays parked in front of MIRCHI wherever he goes
  if (b.cart && !b.cart.broken && b.state !== 'cartcharge') {
    b.cart.x += clamp((b.x - b.face * 30) - b.cart.x, -1.2, 1.2);
    b.cart.y = b.y + 7;
  }
  const cdScale = (b.enraged ? 0.55 : 1) / diff().aggro;

  switch (b.state) {
    case 'idle': {
      const wantY = clamp(p.y, FLOOR_TOP, FLOOR_BOT);
      b.y += clamp(wantY - b.y, -spd * 0.6, spd * 0.6);
      const dx = p.x - b.x;
      if (Math.abs(dx) > 40) b.x += Math.sign(dx) * spd * 0.5;
      else if (Math.abs(dx) < 22) b.x -= Math.sign(dx) * spd * 0.3;
      if (--b.atkCd <= 0) {
        b.pattern = pickPattern(b);
        // occasional battle taunt straight out of the source material
        if (b.def.lines && G.rawTime - (b.lastLine || -999) > 260 && Math.random() < 0.35) {
          b.lastLine = G.rawTime;
          spawnPop(b.x, b.y - b.h - 8, b.def.lines[irand(0, b.def.lines.length - 1)]);
        }
        b.state = 'windup'; b.t = 0; b.punchN = 0; b.hits = 0;
        if (b.pattern === 'chop') b.armor = 1;
      }
      break;
    }
    case 'windup': {
      const wind = { samosa: 20, wrench: 22, phone: 20, chutney: 22, steamjet: 26, cartcharge: 32, whistle: 24, lathi: 18, lathisweep: 20, teargas: 22 }[b.pattern] || 16;
      if (b.t >= wind) {
        b.state = b.pattern; b.t = 0; b.hitLanded = false;
        switch (b.pattern) {
          case 'dashpunch': b.vx = b.face * (b.enraged ? 4 : 3); G.audio.sfx('dash'); break;
          case 'cartcharge': b.vx = b.face * (b.enraged ? 4.6 : 3.8); G.audio.sfx('dash'); break;
          case 'lathi': b.vx = b.face * 1.6; G.audio.sfx('dash'); break;
          case 'lathisweep': G.audio.sfx('whiff'); break;
          case 'whistle': G.audio.sfx('blip'); break;
        }
      }
      break;
    }
    case 'dashpunch': {
      if (b.punchN === 0) {
        b.x += b.vx;
        if (b.t > 16 || Math.abs(p.x - b.x) < 30) { b.punchN = 1; b.t = 0; b.vx = 0; }
      } else if (b.punchN === 1) {
        if (b.t === 4) tryHitPlayer(b, 9, 48, false);
        if (b.t > 12) { b.punchN = 2; b.t = 0; b.x += b.face * 6; }
      } else {
        if (b.t === 4) tryHitPlayer(b, 13, 50, true);
        if (b.t > 18) { b.state = 'idle'; b.atkCd = irand(60, 110) * cdScale; }
      }
      break;
    }
    case 'grab': {
      if (b.t < 10) b.x += b.face * 1.8;
      if (b.t === 8 && !b.hitLanded) {
        b.hitLanded = true;
        if (Math.abs(p.x - b.x) < 36 && Math.abs(p.y - b.y) < 15 && p.z < 11 && !p.dying &&
            p.state !== 'down' && p.state !== 'getup' && p.invuln <= 0) {
          grabPlayer(p, b);
          b.state = 'grabhold'; b.t = 0; b.holdT = 0; b.hits = 0;
          G.audio.sfx('throw');
          break;
        }
        tryHitPlayer(b, 10, 42, false, 14);
      }
      if (b.t > 26) { b.state = 'idle'; b.atkCd = irand(50, 100) * cdScale; }
      break;
    }
    case 'grabhold': {
      // crush: ticks damage until the player mashes free or the boss throws them
      if (p.grabbedBy !== b) { b.state = 'idle'; b.atkCd = 50; break; }
      p.x = b.x + b.face * 23; p.y = b.y; p.z = 0;
      b.holdT++;
      if (b.holdT % 26 === 0) {
        b.hits++;
        p.hp -= Math.round(6 * diff().dmg);
        spawnSpark(p.x, p.y - 40);
        G.audio.sfx('punch');
        G.shake = Math.max(G.shake, 3);
        if (p.hp <= 0) p.hp = 1;
      }
      if (p.mash >= 6 || b.hits >= 3 || b.holdT > 110) {
        // release: thrown away (or shoved off if the player mashed out)
        const escaped = p.mash >= 6;
        p.grabbedBy = null; p.mash = 0;
        if (escaped) {
          p.state = 'idle'; p.t = 0; p.invuln = 30;
          spawnPop(p.x, p.y - 40, 'BREAK');
          hurtBoss(b, 6, -b.face, false, false);
        } else {
          hurtPlayer(p, 14, b.face, true, true);
          G.audio.sfx('throw');
        }
        b.state = 'idle'; b.atkCd = irand(60, 110) * cdScale;
      }
      break;
    }
    // ---- MIRCHI ------------------------------------------------------
    case 'samosa': {
      // lobbed burning samosa that bursts into a patch of fire where it lands
      if (b.t === 6 || (b.enraged && b.t === 22)) {
        const dx = clamp((p.x - b.x) / 46, -3.2, 3.2);
        spawnArc('samosa', b.x + b.face * 16, b.y, dx, 2.6, 10, 'fire', { source: b, parryable: true });
        G.audio.sfx('throw');
      }
      if (b.t > (b.enraged ? 40 : 26)) { b.state = 'idle'; b.atkCd = irand(60, 110) * cdScale; }
      break;
    }
    case 'wrench': case 'phone': {
      if (b.t === 6 || (b.enraged && b.t === 18)) {
        const kind = b.pattern;
        spawnShot(kind, b.x + b.face * 18, b.y, b.face * 3.15, 10,
          { source: b, parryClass: 'reflect' });
        G.audio.sfx('throw');
      }
      if (b.t > (b.enraged ? 34 : 24)) { b.state = 'idle'; b.atkCd = irand(55, 95) * cdScale; }
      break;
    }
    case 'chutney': {
      // ladles a poison puddle onto the floor in front of him
      if (b.t === 8) {
        const tx = clamp(p.x, G.camX + 30, G.camX + W - 30);
        spawnZone('chutney', tx, p.y, 26, 260);
        spawnRing(tx, p.y, '#6fbf42');
        G.audio.sfx('whiff');
      }
      if (b.t > 30) { b.state = 'idle'; b.atkCd = irand(70, 120) * cdScale; }
      break;
    }
    case 'steamjet': {
      // pressure cooker: a short cone straight ahead. Change depth lane to dodge.
      if (b.t < 26 && b.t % 4 === 0) {
        spawnShot('steam', b.x + b.face * (18 + b.t), b.y, b.face * 1.2, 0);
        if (Math.abs(p.x - b.x) < 78 && Math.sign(p.x - b.x) === b.face &&
            Math.abs(p.y - b.y) < 13 && p.z < 20) {
          hurtPlayer(p, 5, b.face, false);
        }
      }
      if (b.t > 40) { b.state = 'idle'; b.atkCd = irand(70, 120) * cdScale; }
      break;
    }
    case 'cartcharge': {
      // shoves the cart across the lane. The cart is a real breakable prop:
      // smash it mid-charge and he loses this move for the rest of the fight.
      b.x += b.vx;
      if (b.cart && !b.cart.broken) {
        b.cart.x = b.x + b.face * 34;
        b.cart.y = b.y + 7;
        if (!b.hitLanded && tryHitPlayer(b, 14, 74, true, 18)) b.hitLanded = true;
      } else {
        b.cartGone = true;
        b.state = 'recover'; b.t = 0; b.recover = 46; b.vx = 0;
        spawnPop(b.x, b.y - b.h - 8, 'MY CART!');
        G.shake = 8;
        break;
      }
      if (b.t % 4 === 0) spawnDust(b.x - b.face * 12, b.y, 1);
      if (b.t > 34) { b.vx = 0; b.state = 'recover'; b.t = 0; b.recover = 20; }
      break;
    }

    // ---- YADAV -------------------------------------------------------
    case 'lathi': {
      // long bamboo baton thrust, two jabs at range
      if (b.t < 8) b.x += b.vx * 0.5;
      if (b.t === 8) tryHitPlayer(b, 12, 80, false, 15);
      if (b.t === 22 && b.enraged) tryHitPlayer(b, 13, 80, false, 15);
      if (b.t > (b.enraged ? 34 : 24)) { b.state = 'idle'; b.atkCd = irand(55, 100) * cdScale; }
      break;
    }
    case 'lathisweep': {
      // spinning low sweep, hits both sides twice - jump it
      if (b.t === 6 || b.t === 20) {
        if (Math.abs(p.x - b.x) < 64 && Math.abs(p.y - b.y) < 19 && p.z < 16) {
          hurtPlayer(p, 13, p.x < b.x ? -1 : 1, true);
          spawnSpark(p.x, p.y - 44);
          G.audio.sfx('heavy');
        }
        spawnRing(b.x, b.y - 10, '#d8c090');
        spawnDust(b.x, b.y, 2);
        G.shake = Math.max(G.shake, 4);
      }
      if (b.t > 34) { b.state = 'idle'; b.atkCd = irand(60, 100) * cdScale; }
      break;
    }
    case 'teargas': {
      // lobbed canister leaving a lingering poison cloud
      if (b.t === 8) {
        const dx = clamp((p.x - b.x) / 44, -3.4, 3.4);
        spawnArc('samosa', b.x + b.face * 18, b.y, dx, 3.0, 8, 'gas',
          { source: b, parryClass: 'reflect' });
        G.audio.sfx('throw');
      }
      if (b.t > 28) { b.state = 'idle'; b.atkCd = irand(80, 130) * cdScale; }
      break;
    }
    case 'whistle': {
      if (b.t === 6) {
        b.whistles++;
        const backup = b.key === 'refund' ? 'operator' : b.key === 'rana' ? 'sepoy' : 'constable';
        spawnEnemy(backup, G.camX - 20, FLOOR_TOP + 20);
        spawnEnemy(backup, G.camX + W + 20, FLOOR_BOT - 20);
        spawnPop(b.x, b.y - b.h - 8,
          b.key === 'refund' ? 'ESCALATION!' : b.key === 'rana' ? 'SEPOYS!' : 'CONSTABLES!');
        G.audio.sfx('blip');
      }
      if (b.t > 40) { b.state = 'idle'; b.atkCd = irand(50, 90) * cdScale; }
      break;
    }
    case 'recover': {
      if (b.t > (b.recover || 18)) { b.state = 'idle'; b.atkCd = irand(50, 100) * cdScale; }
      break;
    }
    case 'hurt': {
      b.x += b.vx; b.vx *= 0.85;
      if (b.t > (b.enraged ? 7 : 11)) b.state = 'idle';
      break;
    }
    case 'stagger': {
      b.x += b.vx; b.vx *= 0.82;
      if (b.t > 40) { b.state = 'idle'; b.atkCd = 70 * cdScale; }
      break;
    }
    case 'down': {
      if (inAir(b)) {
        if (fall(b, 0.28, 0) === 'land') { spawnDust(b.x, b.y, 4); G.shake = Math.max(G.shake, 4); }
      } else if (b.t > 30) { b.state = 'idle'; b.atkCd = 40 * cdScale; }
      break;
    }
    case 'dying': {
      if (inAir(b) && fall(b, 0.28, 0) === 'land') { spawnShock(b.x, b.y); G.shake = 6; }
      break;
    }
  }
  b.y = clamp(b.y, FLOOR_TOP, FLOOR_BOT);
  clampToArena(b, 0);
}

export function drawBoss(ctx, camX) {
  const b = G.boss;
  if (!b || b.removeMe) return;
  const sx = Math.round(b.x - camX), sy = Math.round(b.y - b.z);
  let name = 'idle', idx = (G.time >> 4) & 1;
  switch (b.state) {
    case 'idle': name = 'idle'; break;
    case 'windup':
      name = { grab: 'grab', whistle: 'grab', chutney: 'slam', steamjet: 'slam',
        lathisweep: 'slam', samosa: 'punch', teargas: 'punch', cartcharge: 'walk',
        lathi: 'punch' }[b.pattern] || 'punch';
      idx = 0; break;
    case 'dashpunch': name = 'punch'; idx = b.punchN === 0 ? 0 : (b.t < 8 ? 1 : 2); break;
    case 'grab': case 'grabhold': case 'whistle': name = 'grab'; break;
    case 'samosa': case 'teargas': name = 'punch'; idx = b.t < 6 ? 0 : (b.t < 18 ? 1 : 2); break;
    case 'chutney': name = 'slam'; idx = b.t < 8 ? 0 : (b.t < 20 ? 1 : 2); break;
    case 'steamjet': name = 'slam'; idx = 1; break;
    case 'cartcharge': name = 'walk'; idx = (G.time >> 2) & 1; break;
    case 'lathi': name = 'punch'; idx = b.t < 8 ? 0 : (b.t < 20 ? 1 : 2); break;
    case 'lathisweep': name = 'slam'; idx = b.t < 6 ? 0 : ((b.t >> 2) % 2 ? 1 : 2); break;
    case 'recover': name = 'slam'; idx = 1; break;
    case 'hurt': name = 'hurt'; idx = b.t < 5 ? 1 : 0; break;
    case 'stagger': name = 'hurt'; idx = (b.t >> 3) & 1; break;
    case 'down': case 'dying': name = 'down'; break;
  }
  if (b.state === 'dying' && b.t > 20 && ((G.time >> 1) & 1)) return;
  const f = getFrame(b.set, name, idx, b.face);
  const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4;
  const cue = b.state === 'windup' && b.t > 6;
  const telegraph = (cue && ((b.t >> 1) & 1)) || b.flash > 0;
  if (telegraph) {
    ctx.save();
    ctx.filter = cue && PARRY_CLASS[b.pattern] !== 'unblockable'
      ? 'brightness(1.8) sepia(1) saturate(5) hue-rotate(70deg)'
      : cue ? 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-35deg)' : 'brightness(2.2)';
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  // Rana's second phase is an Iron Asura silhouette. Two translucent secondary
  // arm pairs mirror the live attack pose without changing his collision size.
  if (b.key === 'rana' && b.enraged && b.state !== 'down' && b.state !== 'dying') {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.filter = 'sepia(1) saturate(3) hue-rotate(-25deg) brightness(1.3)';
    blit(ctx, f, dx - b.face * 11, dy + 4);
    blit(ctx, getFrame(b.set, name, idx + 1, -b.face), dx + b.face * 12, dy + 1);
    ctx.restore();
  }
  if (cue) {
    ctx.save();
    ctx.strokeStyle = PARRY_CLASS[b.pattern] !== 'unblockable' ? '#6dff82' : '#ff4050';
    ctx.lineWidth = 2;
    const cy = sy - b.def.h - 8;
    if (PARRY_CLASS[b.pattern] !== 'unblockable') {
      ctx.beginPath(); ctx.moveTo(sx, cy - 6); ctx.lineTo(sx + 6, cy); ctx.lineTo(sx, cy + 6); ctx.lineTo(sx - 6, cy); ctx.closePath(); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.moveTo(sx - 6, cy - 6); ctx.lineTo(sx + 6, cy + 6); ctx.moveTo(sx + 6, cy - 6); ctx.lineTo(sx - 6, cy + 6); ctx.stroke();
    }
    ctx.restore();
  }
  // spin blur on the lathi sweep
  if (b.state === 'lathisweep') {
    ctx.globalAlpha = 0.35;
    blit(ctx, getFrame(b.set, 'slam', ((G.time >> 1) & 1) ^ 1, -b.face), dx, dy);
    ctx.globalAlpha = 1;
  }
}
