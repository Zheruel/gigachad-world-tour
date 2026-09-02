// train_bosses.js - THE NIGHT TRAIN's two fights, on the same hooks bosses.js gives the
// Delhi cast: init, intro, update (true = the module owns the frame), draw, and the
// reactions to being hurt, enraged and killed.
//
// THE TTE is the rules: he does not rage, he does not flip, and every seven seconds he
// stamps a fallen man back onto his feet. BIRJU is the arena: twice he pulls a pin and
// the roof behind you falls away, and once he is angry the bridges start arriving
// while he holds you up to meet them.
import { G, W, H, FLOOR_TOP, clamp, irand, diff, arenaMin, arenaMax, laneMin, laneMax, fall, inAir } from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnSpark, spawnDust, spawnShock, spawnPop, spawnRing, impact } from './effects.js';
import { hurtPlayer, grabPlayer, resolveIncomingHit } from './player.js';
import { spawnShot } from './shots.js';
import { spawnEnemy } from './enemies.js';
import { tryHitPlayer, hitEnemiesNear, blitTelegraph, drawCueMarker } from './bosslib.js';
import { startBridge } from './train.js';

const cdScale = (b) => (b.enraged ? 0.7 : 1) / diff().aggro;
const bossSpeed = (b) => b.def.speed * (b.enraged ? 1.3 : 1) * diff().aggro;

function approach(b, spd, near, far) {
  const p = G.player;
  const wantY = clamp(p.y, laneMin(b.x), laneMax(b.x));
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

function frameOf(b, name, idx) { return getFrame(b.set, name, idx, b.face); }

function drawGeneric(ctx, b, camX, name, idx, cue) {
  const sx = Math.round(b.x - camX), sy = Math.round(b.y - b.z);
  const f = frameOf(b, name, idx);
  blitTelegraph(ctx, b, f, sx - Math.round(frameW(f) / 2), sy - frameH(f) + 4, cue);
  if (cue) drawCueMarker(ctx, b, sx, sy - b.h - 12);
}

// ================================================================ THE TTE
const TTE_WIND = { torch: 20, ledger: 16 };
const CHECK_EVERY = 420;
const tte = {
  noRage: true,
  reviver: true,
  init(b) {
    b.checkCd = 240; b.blindT = 0; b.target = null;
    b.label = G.train && G.train.ticket ? 'THE TTE' : 'THE TTE - TICKET?';
    b.hostile = !(G.train && G.train.ticket);
    b.mashNeed = 6; b.slamDmg = 10;
  },
  intro(b, t) {
    // in through the bellows, at his own pace
    if (t > 20 && b.x > G.camX + 330) b.x -= 0.8;
    if (t === 90 && b.hostile) {
      spawnEnemy('goonda', G.camX + W - 30, 208);
      spawnEnemy('goonda', G.camX + 20, 214);
    }
  },
  keepFace(b) { return b.state === 'walkto' || b.state === 'stamp'; },
  update(b) {
    const p = G.player;
    const spd = bossSpeed(b);
    if (b.blindT > 0) b.blindT--;
    if (b.checkCd > 0) b.checkCd--;
    switch (b.state) {
      case 'idle': {
        if (b.blindT > 0) {
          // blind: he feels along the wall and attacks nothing
          b.x += Math.sin(G.rawTime * 0.05) * 0.4;
          return true;
        }
        // the check comes first: a fallen man in the arena is his business
        if (b.checkCd <= 0) {
          const c = nearestCorpse(b);
          if (c) { b.target = c; b.state = 'walkto'; b.t = 0; say(b, 'TICKET?'); return true; }
        }
        approach(b, spd, 30, 48);
        if (--b.atkCd <= 0) {
          const d = Math.abs(p.x - b.x);
          b.pattern = d > 60 || Math.random() < 0.4 ? 'torch' : 'ledger';
          b.state = 'windup'; b.t = 0; b.hitLanded = false;
        }
        return true;
      }
      case 'windup': {
        if (b.t >= TTE_WIND[b.pattern]) { b.state = b.pattern; b.t = 0; }
        return true;
      }
      case 'torch': {
        if (b.t === 6) {
          const dx = (p.x - b.x) * b.face;
          if (dx > 0 && dx < 210 && Math.abs(p.y - b.y) < 22 && p.z < 30 && p.state !== 'down') {
            if (resolveIncomingHit(p, b, { parryClass: 'reflect' })) {
              // reflected: he is the one who cannot see
              b.blindT = 150; b.state = 'stagger'; b.t = 0; b.vx = -b.face * 0.6;
              spawnPop(b.x, b.y - b.h - 10, 'BLINDED');
              G.audio.sfx('parry');
              return true;
            }
            G.train.blind = 30;
            hurtPlayer(p, 4, b.face, false);
            G.audio.sfx('whiff');
          }
        }
        if (b.t > 40) { b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(70, 110) * cdScale(b)); }
        return true;
      }
      case 'ledger': {
        if (b.t === 8 && !b.hitLanded) { b.hitLanded = true; tryHitPlayer(b, 9, 40, false, 14, 'counter'); G.audio.sfx('weapon'); }
        if (b.t > 24) { b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(50, 90) * cdScale(b)); }
        return true;
      }
      case 'walkto': {
        const c = b.target;
        if (!c || c.removeMe || !c.dead || c.state !== 'corpse') { b.target = null; b.state = 'idle'; b.t = 0; b.atkCd = 30; return true; }
        b.face = c.x < b.x ? -1 : 1;
        const dx = c.x - b.face * 26 - b.x;
        b.x += clamp(dx, -spd * 1.1, spd * 1.1);
        b.y += clamp(c.y - b.y, -spd * 0.7, spd * 0.7);
        if (Math.abs(dx) < 3 && Math.abs(c.y - b.y) < 4) { b.state = 'stamp'; b.t = 0; }
        if (b.t > 240) { b.target = null; b.state = 'idle'; b.atkCd = 30; }
        return true;
      }
      case 'stamp': {
        const c = b.target;
        if (b.t === 24 && c && c.state === 'corpse') revive(c);
        if (b.t > 44) { b.target = null; b.checkCd = CHECK_EVERY; b.state = 'idle'; b.t = 0; b.atkCd = 40; }
        return true;
      }
    }
    return false;   // hurt / stagger / down / dying / grabhold: the shared machine
  },
  onHurt(b, dmg) {
    // blind, he cannot brace: every hit lands twice
    if (b.blindT > 0) b.hp -= dmg;
    return false;
  },
  onDeath(b) {
    for (const e of G.enemies) if (e.state === 'corpse') e.removeMe = true;
    say(b, 'NEXT STATION.');
  },
  draw(ctx, b, camX) {
    let name = 'idle', idx = (G.time >> 4) & 3;
    switch (b.state) {
      case 'idle': name = b.moved > 0.12 ? 'walk' : 'idle'; idx = b.moved > 0.12 ? (G.time >> 3) & 3 : idx; break;
      case 'windup': name = b.pattern === 'torch' ? 'torch' : 'ledger'; idx = 0; break;
      case 'torch': name = 'torch'; idx = b.t < 6 ? 1 : b.t < 30 ? 2 : 3; break;
      case 'ledger': name = 'ledger'; idx = b.t < 8 ? 1 : 2; break;
      case 'walkto': name = 'walk'; idx = (G.time >> 3) & 3; break;
      case 'stamp': name = 'stamp'; idx = b.t < 10 ? 0 : b.t < 24 ? 1 : b.t < 34 ? 2 : 3; break;
      case 'hurt': name = 'hurt'; idx = b.t < 5 ? 1 : 0; break;
      case 'stagger': name = 'hurt'; idx = (b.t >> 3) & 1; break;
      case 'down': case 'dying': name = 'down'; idx = 0; break;
      case 'grabhold': name = 'ledger'; idx = 1; break;
    }
    const cue = b.state === 'windup' && b.t > 4;
    // the beam, under him so it reads as light on the floor
    if (b.state === 'torch' && b.t < 30) {
      const sx = Math.round(b.x - camX), sy = Math.round(b.y - b.z - 52);
      ctx.save();
      const g = ctx.createLinearGradient(sx, 0, sx + b.face * 210, 0);
      g.addColorStop(0, 'rgba(255,250,220,0.55)');
      g.addColorStop(1, 'rgba(255,250,220,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(sx + b.face * 10, sy - 3);
      ctx.lineTo(sx + b.face * 210, sy - 40);
      ctx.lineTo(sx + b.face * 210, sy + 44);
      ctx.lineTo(sx + b.face * 10, sy + 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    drawGeneric(ctx, b, camX, name, idx, cue);
    if (b.blindT > 0 && (G.rawTime >> 3) & 1) {
      ctx.fillStyle = '#fff';
      ctx.fillRect(Math.round(b.x - camX) - 6, Math.round(b.y - b.z - b.h + 12), 12, 2);
    }
  },
};

function nearestCorpse(b) {
  let best = null, bd = 1e9;
  for (const e of G.enemies) {
    if (e.state !== 'corpse' || e.removeMe) continue;
    if (e.x < arenaMin() || e.x > arenaMax()) continue;
    const d = Math.abs(e.x - b.x);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

function revive(e) {
  e.dead = false; e.removeMe = false;
  e.hp = Math.max(1, Math.ceil(e.maxhp / 2));
  e.state = 'getup'; e.t = 0; e.z = 0; e.vz = 0; e.vx = 0;
  e.atkCd = irand(40, 80);
  spawnPop(e.x, e.y - 70, 'CHECKED');
  spawnRing(e.x, e.y, '#e8e0c0');
  G.audio.sfx('blip');
}

// ================================================================ BIRJU
const BIRJU_WIND = { chain: 30, hook: 22, shoulder: 26, lift: 18 };
const birju = {
  init(b) {
    b.uncouples = 0; b.girdered = false; b.hookShot = null; b.holdT = 0;
    G.arenaRearTarget = 0;
    if (G.train) G.train.bridgesArmed = true;
  },
  intro(b, t) {
    // up out of the gap between the coaches, into the headlight
    if (t < 20) { b.z = -70; return; }
    b.z = Math.min(0, -70 + (t - 20) * 1.4);
    if (t > 40 && b.x > G.camX + 330) b.x -= 1.0;
    if (t === 70) { G.shake = 5; G.audio.sfx('heavy'); }
  },
  keepFace(b) { return b.state === 'uncouplewalk' || b.state === 'uncouple' || b.state === 'shoulder';
  },
  update(b) {
    const p = G.player;
    const spd = bossSpeed(b);
    // the pin: at two thirds and one third, whatever else he is doing between attacks
    const due = b.hp < b.maxhp * (b.uncouples === 0 ? 0.66 : 0.34) && b.uncouples < 2;
    switch (b.state) {
      case 'idle': {
        if (due) { b.state = 'uncouplewalk'; b.t = 0; say(b, 'ONE COACH LESS'); return true; }
        approach(b, spd, 34, 54);
        if (--b.atkCd <= 0) {
          const d = Math.abs(p.x - b.x);
          const list = [];
          if (d < 110) list.push('chain', 'chain');
          if (d > 70) list.push('hook');
          if (d > 90) list.push('shoulder', 'shoulder');
          if (b.enraged && d < 60) list.push('lift', 'lift');
          b.pattern = list[irand(0, list.length - 1)] || 'chain';
          b.state = 'windup'; b.t = 0; b.hitLanded = false;
          if (b.pattern === 'shoulder') b.armor = 1;
        }
        return true;
      }
      case 'windup': {
        if (b.t >= BIRJU_WIND[b.pattern]) {
          b.state = b.pattern; b.t = 0;
          if (b.pattern === 'shoulder') { b.vx = b.face * 4.2; G.audio.sfx('dash'); }
          if (b.pattern === 'hook') {
            const s = spawnShot('hook', b.x + b.face * 20, b.y, b.face * 5.5, 12, { source: b, parryClass: 'unblockable' });
            s.z = 0; s.vz = 0;
            s.onHit = () => { birju.hooked(b); };
            b.hookShot = s;
            G.audio.sfx('throw');
          }
        }
        return true;
      }
      case 'chain': {
        if (b.t === 8 && !b.hitLanded) {
          b.hitLanded = true;
          tryHitPlayer(b, 14, 96, true, 18, 'counter');
          hitEnemiesNear(b.x + b.face * 40, b.y, 60, 18, 14, b.face, true, null);
          G.audio.sfx('weapon');
        }
        if (b.t > 34) { b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(60, 100) * cdScale(b)); }
        return true;
      }
      case 'hook': {
        // the throw and the haul: the shot decides whether it caught anything
        if (b.t > 60 || !G.shots.includes(b.hookShot)) {
          b.hookShot = null; b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(70, 110) * cdScale(b));
        }
        return true;
      }
      case 'drag': {
        if (p.grabbedBy !== b) { b.state = 'idle'; b.t = 0; b.atkCd = 60; return true; }
        // hauled toward the rear of the roof, hand over hand
        const rear = arenaMin() + 20;
        p.x += clamp(rear - p.x, -2.2, 2.2);
        p.y = b.y; p.z = 0;
        b.x += clamp(rear + 40 - b.x, -1.2, 1.2);
        if (b.t > 60 || Math.abs(p.x - rear) < 3) {
          p.grabbedBy = null; p.mash = 0;
          hurtPlayer(p, 12, -1, true);
          b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(60, 100) * cdScale(b));
        }
        return true;
      }
      case 'shoulder': {
        b.x += b.vx;
        if (!b.hitLanded && tryHitPlayer(b, 16, 50, true, 20, 'unblockable')) b.hitLanded = true;
        hitEnemiesNear(b.x, b.y, 30, 16, 16, b.face, true, null);
        if (b.t % 3 === 0) spawnDust(b.x - b.face * 20, b.y, 2);
        if (b.x <= arenaMin() + 4 || b.x >= arenaMax() - 4 || b.t > 90) {
          b.vx = 0; b.armor = 0; b.state = 'recover'; b.t = 0;
          G.shake = Math.max(G.shake, 4); G.audio.sfx('slam');
        }
        return true;
      }
      case 'recover': {
        if (b.t > 40) { b.state = 'idle'; b.t = 0; b.atkCd = Math.round(irand(40, 80) * cdScale(b)); }
        return true;
      }
      case 'lift': {
        if (b.t === 1) {   // bosses.js counts the frame before it delegates
          const can = Math.abs(p.x - (b.x + b.face * 26)) < 30 && Math.abs(p.y - b.y) < 16 && p.z < 12 &&
            !p.dying && p.invuln <= 0 && p.state !== 'down' && p.state !== 'getup' && !p.grabbedBy;
          if (!can) { b.state = 'idle'; b.t = 0; b.atkCd = 50; return true; }
          grabPlayer(p, b); b.holdT = 0; b.girdered = false;
          // a girder is coming, whether or not one was due
          if (G.train) G.train.bridgeCd = Math.min(G.train.bridgeCd || 999, 110);
          say(b, 'HOLD STILL');
          G.audio.sfx('throw');
        }
        if (b.girdered) { b.girdered = false; b.state = 'stagger'; b.t = 0; b.vx = -b.face * 0.4; return true; }
        if (p.grabbedBy !== b) { b.state = 'idle'; b.t = 0; b.atkCd = 60; return true; }
        p.x = b.x + b.face * 24; p.y = b.y; p.z = 26;
        b.holdT++;
        if (p.mash >= 8) {
          p.grabbedBy = null; p.mash = 0; p.z = 0; p.state = 'idle'; p.t = 0; p.invuln = 24;
          spawnPop(p.x, p.y - 60, 'BREAK');
          b.hurt(8, -b.face, true, false);
          if (!b.dead) { b.state = 'stagger'; b.t = 0; b.atkCd = 90; }
        } else if (b.holdT > 240) {
          p.grabbedBy = null; p.mash = 0; p.z = 0;
          hurtPlayer(p, 12, b.face, true);
          b.state = 'idle'; b.t = 0; b.atkCd = 70;
        }
        return true;
      }
      case 'uncouplewalk': {
        const tx = arenaMin() + 44;
        b.face = tx < b.x ? -1 : 1;
        b.x += clamp(tx - b.x, -spd * 1.2, spd * 1.2);
        b.y += clamp(laneMin(b.x) + 30 - b.y, -1, 1);
        if (Math.abs(tx - b.x) < 3) { b.state = 'uncouple'; b.t = 0; b.face = 1; }
        if (b.t > 300) { b.state = 'idle'; b.t = 0; }
        return true;
      }
      case 'uncouple': {
        if (b.t === 50) {
          b.uncouples++;
          G.arenaRearTarget += 60;
          if (G.train) G.train.detached = { t: 0 };
          G.shake = 10; G.audio.sfx('heavy'); impact(true);
          spawnPop(b.x, b.y - b.h - 10, 'UNCOUPLED');
        }
        if (b.t > 80) { b.state = 'idle'; b.t = 0; b.atkCd = 30; }
        return true;
      }
      case 'dying': {
        // over the side into the dark
        if (b.t < 24) { fall(b, 0.28, 0); return true; }
        b.y = Math.min(b.y + 2.4, laneMax(b.x) + 30);
        b.z -= 2.6;
        b.vx = 0;
        return true;
      }
    }
    return false;
  },
  parried(b, dmg, dir) {
    // countering the sweep staggers him hard
    b.hurt(dmg + 10, dir, false, false);
    if (!b.dead) { b.state = 'down'; b.t = 0; b.vx = dir * 1.6; b.vz = 2.4; b.z = Math.max(b.z, 0.1); }
  },
  hooked(b) {
    const p = G.player;
    if (p.grabbedBy || p.state === 'down' || p.dying) return;
    grabPlayer(p, b);
    b.hookShot = null;
    b.state = 'drag'; b.t = 0;
    spawnPop(p.x, p.y - 60, 'HOOKED');
    G.audio.sfx('throw');
  },
  onHurt(b, dmg, heavy, launch) {
    // pulling the pin, he cannot brace: the punish window is real
    if (b.state === 'uncouple') { b.hp -= dmg; return true; }
    if (b.state === 'lift' || b.state === 'drag') {
      if (heavy || launch) { G.player.grabbedBy = null; G.player.mash = 0; G.player.z = 0; return false; }
      return true;
    }
    return false;
  },
  onEnrage(b) {
    if (G.train) { G.train.bridgeEvery = 480; G.train.bridgeCd = 200; }
    say(b, 'DUCK.');
  },
  onDeath(b) {
    if (G.train) { G.train.bridgeEvery = 0; }
    G.arenaRearTarget = 0;
  },
  draw(ctx, b, camX) {
    const tr = G.train;
    // the roof behind the rear wall is gone: a black gap and the coach falling away
    if (G.arenaRear > 1) {
      const rx = Math.round(arenaMin() - camX - 14);
      ctx.fillStyle = 'rgba(4,4,10,0.9)';
      ctx.fillRect(0, FLOOR_TOP - 4, rx, H - FLOOR_TOP + 4);
      if (tr && tr.detached) {
        tr.detached.t++;
        const k = Math.min(1, tr.detached.t / 240);
        const w = Math.round(rx * (1 - k * 0.7));
        ctx.fillStyle = '#1a1c22';
        ctx.fillRect(rx - w, FLOOR_TOP + Math.round(k * 30), w, 40);
        ctx.fillStyle = '#c03030';
        ctx.fillRect(rx - 6, FLOOR_TOP + Math.round(k * 30) + 8, 3, 3);
      }
    }
    if (b.state === 'dying' && b.z < -60) return;
    let name = 'idle', idx = (G.time >> 4) & 3;
    switch (b.state) {
      case 'idle': name = b.moved > 0.12 ? 'walk' : 'idle'; idx = b.moved > 0.12 ? (G.time >> 3) & 3 : idx; break;
      case 'windup': name = { chain: 'chain', hook: 'hook', shoulder: 'charge', lift: 'grab' }[b.pattern]; idx = b.pattern === 'chain' && b.t > 12 ? 1 : 0; break;
      case 'chain': name = 'chain'; idx = b.t < 8 ? 2 : 3; break;
      case 'hook': name = 'hook'; idx = b.t < 6 ? 2 : 3; break;
      case 'drag': name = 'hook'; idx = 3; break;
      case 'shoulder': name = 'charge'; idx = 2 + ((b.t >> 2) & 1); break;
      case 'recover': name = 'charge'; idx = 0; break;
      case 'lift': name = 'grab'; idx = b.holdT < 8 ? 1 : 2; break;
      case 'uncouplewalk': name = 'walk'; idx = (G.time >> 3) & 3; break;
      case 'uncouple': name = 'uncouple'; idx = b.t < 30 ? 0 : b.t < 50 ? 1 : 2; break;
      case 'hurt': name = 'hurt'; idx = b.t < 5 ? 1 : 0; break;
      case 'stagger': name = 'hurt'; idx = (b.t >> 3) & 1; break;
      case 'down': case 'dying': name = 'down'; idx = 0; break;
      case 'grabhold': name = 'grab'; idx = 1; break;
    }
    const cue = b.state === 'windup' && b.t > 6;
    ctx.save();
    if (b.state === 'dying' && b.t > 24) ctx.globalAlpha = clamp(1 + b.z / 60, 0, 1);
    drawGeneric(ctx, b, camX, name, idx, cue);
    ctx.restore();
    // the pin, held up, while the coach goes
    if (b.state === 'uncouple' && b.t > 50) {
      ctx.fillStyle = '#c8c8d0';
      ctx.fillRect(Math.round(b.x - camX) + b.face * 8, Math.round(b.y - b.z - b.h - 14), 3, 14);
    }
  },
};

const TRAIN = { tte, birju };

export function initTrainBoss(b) {
  const d = TRAIN[b.key];
  if (!d) return;
  b.delhi = d;   // the same hook slot the Delhi fights use; bosses.js reads it by that name
  if (d.parried) b.parried = (dmg, dir) => d.parried(b, dmg, dir);
  d.init(b);
}
