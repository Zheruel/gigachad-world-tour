import {initDredgerEquipment,updateDredgerLife,spawnDredgerCrew,operatorUpdate,operatorReaction,operatorFrame,drawDredgerDetails,dredgerLine,OPERATOR_HEALTH} from './delhi_dredger_rebuild.js';
// Dredger encounter: independent machinery, reflected crew scrap and cab operator.
// Hooks run through the shared boss lifecycle without altering its combat rules.
import { G, W, FLOOR_BOT, clamp, irand, diff, arenaMin, arenaMax, laneMin, fall } from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { ASSETS } from './assets.js';
import { spawnSpark, spawnDust, spawnShock, spawnPop, spawnDebris, impact } from './effects.js';
import { hurtPlayer, resolveIncomingHit } from './player.js';
import { spawnShot, spawnZone } from './shots.js';
import { spawnEnemy, aliveEnemies } from './enemies.js';
import { createProp } from './props.js';
import { reactStage } from './ambience.js';
import { tryHitPlayer, hitEnemiesNear, blitTelegraph, drawCueMarker } from './bosslib.js';

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

// ============================================================ THE DREDGER
// A machine. The bucket is the boss's body: hittable when it is down on the pontoon
// or dragging the lane, unreachable at rest. The winch on the deck is an ordinary
// breakable that stops the bucket for good. The live pump keeps its lane discharge;
// reflected crew tools crack the cab. Then the operator comes out.
const BUCKET_REST = 80;      // above a jump; a jump kick reaches 42
const SWEEP_Z = 8;
const OPERATOR_HP = 90;
const DREDGER_WIND = { hose: 18, swing: 22 };

const dredger = {
  noRage:true,
  beforeHurt(b,dmg,dir,heavy,launch){
    b.guardingHit=false;
    if(b.phase!=='operator'||b.protectedStagger||b.superApplying||b.parryApplying||b.counterApplying)return true;
    if(b.state==='cower'&&b.coverTarget&&!b.coverTarget.broken){b.coverTarget.hurt(dmg,dir,heavy,launch);return false;}
    const guard=b.guard>0&&dir===-b.face&&['idle','windup','wrench','toolthrow'].includes(b.state)&&!['restart','call'].includes(b.pattern);
    if(guard&&!heavy&&!launch){b.guardFlash=6;G.audio.sfx('armor');return false;}
    b.guardingHit=guard;return true;
  },
  afterOpening(b){if(b.phase==='operator'){b.state='idle';b.t=0;b.atkCd=18;}},
  keepFace(b){return b.phase==='operator'&&!['idle','recover','hurt'].includes(b.state);},
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
    initDredgerEquipment(b);
  },
  intro(b, t) {
    // the crane starts: the bucket comes down out of the dark to its rest height
    b.z = t < 50 ? 260 : Math.max(BUCKET_REST, 260 - (t - 50) * 4);
    if (t === 50 || t === 120) G.shake = Math.max(G.shake, 6);
    if (t === 50) G.audio.sfx('enrage');
  },
  crew(b) {
    if(b.crewCd>0)b.crewCd--;
    if(b.crewCd<=0&&b.crewSpawned<5&&b.crewActors.length<2)spawnDredgerCrew(b,Math.min(2,5-b.crewSpawned));
  },
  operatorPhase(b) {
    if (b.phase !== 'machine') return;
    b.phase = 'operator';
    // a fresh bar for a new man; the machine's enrage line must not fire for him
    b.hp = Math.round(OPERATOR_HEALTH*diff().hp); b.maxhp=b.hp; b.enraged=false;
    b.guard=b.maxGuard=3;b.operatorTurn=0;b.operatorPending=false;
    b.bucket = { x: G.camLock+320, y:194, z:0, dead:!!b.dead_bucket };
    b.operatorExitX=b.reflectTarget.x; b.reflectTarget=null;
    b.set = SPR.thekedar; b.label = 'THE THEKEDAR';
    b.w = 40; b.h = 88; b.shadowR = 13; b.z = 78;
    b.x = G.camLock + 365; b.y = laneMin(b.x) + 6; b.face = 1;
    b.state = 'openter'; b.t = 0; b.armor = 0;
    spawnPop(b.x, b.y - 100, 'THE OPERATOR');
    spawnDebris(b.operatorExitX, 74, 10, ['#9ad0e0', '#e8f4ff', '#3a5060']);
    G.shake = Math.max(G.shake, 6);
    G.audio.sfx('ko');
    // the crane goes still
    for(const e of b.crewActors){e.atkCd=Math.max(e.atkCd,90);e.state='idle';e.t=0;}
    dredgerLine(b,'I ONLY DRIVE IT!');
  },
  update(b) {
    const p = G.player;
    updateDredgerLife(b);
    if(b.phase==='operator')return operatorUpdate(b);
    // ---- the machine ----
    if ((b.hp <= OPERATOR_HP||b.operatorPending) && !b.dead) { dredger.operatorPhase(b); return true; }
    // Shared parry/super recovery returns bosses to recover/idle. A severed
    // winch cannot hoist its bucket again when that protected opening ends.
    if (b.dead_bucket && ['idle','recover','rise'].includes(b.state)) {
      b.state = 'grounded'; b.t = 0; b.z = b.vz = b.vx = 0;
    }
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
          if (b.hoseCd <= 0&&!b.pumpGone) opts.push('hose');
          if (!opts.length) { b.atkCd = 30; return true; }
          if(b.crewActors.some(e=>['windup','attack'].includes(e.state))){b.atkCd=12;return true;}
          const available=opts.filter(p=>p!==b.lastMachinePattern);b.pattern=(available.length?available:opts)[b.machineTurn++%(available.length||opts.length)];b.lastMachinePattern=b.pattern;
          b.t = 0; b.hitLanded = false;
          if (b.pattern === 'sweep') {
            b.state = 'sweepaim';
            b.sweepDir = p.x < b.x ? -1 : 1;
            b.sweepY = clamp(p.y, laneMin(b.x), FLOOR_BOT);
            b.sweeps = b.enraged ? 2 : 1;
            G.audio.sfx('blip');
          } else if (b.pattern === 'bucketdrop') {
            b.state = 'dropaim'; G.audio.sfx('blip');
          } else { b.state = 'windup';b.hoseLane=p.y; }
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
        if(b.t<20){b.x += clamp(p.x - b.x, -2.6, 2.6) * spd;
        b.y += clamp(clamp(p.y, laneMin(b.x), FLOOR_BOT) - b.y, -2, 2);}
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
        if (b.dead_bucket) {if(!b.pumpGone&&b.hoseCd<=0&&!b.crewActors.some(e=>['windup','attack'].includes(e.state))){b.state='windup';b.pattern='hose';b.hoseLane=p.y;b.t=0;}return true;}   // the winch is gone: it never lifts again
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
        if(b.pumpGone){b.state=b.dead_bucket?'grounded':'idle';b.t=0;return true;}
        if([10,28,46].includes(b.t)){
          tryHitPlayer({x:b.rail.x,y:b.hoseLane,face:-1,pattern:'steamjet'},9,220,false,12,'unblockable');
          spawnDust(b.rail.x-80,b.hoseLane,7);G.audio.roomSfx('train_brake',.15,.65);
        }
        if(b.t>=60){b.hoseCd=360;b.state=b.dead_bucket?'grounded':'idle';b.t=0;b.atkCd=40;}
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
    // reflected crew scrap damages the cab protection
    if (b.phase !== 'machine') { b.hurt(Math.round(s.dmg * 1.5), 1, true, false); return; }
    b.glass = Math.max(0, b.glass - 1);
    spawnDebris(b.reflectTarget.x, b.reflectTarget.y, 8, ['#9ad0e0', '#e8f4ff', '#3a5060']);
    spawnPop(b.reflectTarget.x, b.reflectTarget.y - 16, b.glass ? 'THE GLASS' : 'THE CAB');
    G.shake = Math.max(G.shake, 6);
    G.audio.sfx('slam');
    b.hurt(45, 1, false, false);
    if(b.glass<=0&&!b.dead&&b.cab&&!b.cab.broken)b.cab.hurt(b.cab.hp,1,true,true);
  },
  onHurt(b, dmg, heavy, launch) {
    if (b.phase === 'operator') return operatorReaction(b);
    // Resolve the threshold before the shared death branch. A large final hit
    // used to kill the machine outright, skipping its living operator.
    if (b.hp <= OPERATOR_HP) {
      b.hp = OPERATOR_HP;
      if (!b.superLocked && !b.protectedStagger) dredger.operatorPhase(b);
      return true;
    }
    // a machine does not flinch; it just takes it
    if (b.state === 'grounded' && heavy) { G.shake = Math.max(G.shake, 4); spawnDust(b.x, b.y, 2); }
    return true;
  },
  onEnrage(b) {
    if (b.phase === 'machine') G.shake = Math.max(G.shake, 8);
  },
  onDeath(b) {
    if (b.phase === 'operator') {
      b.finishStarted = !!G.india?.startCinematic?.('dredger-finish', b);
      return;
    }
    // killed as a machine: the bucket comes down for good
    b.state = 'dying'; b.vz = 0; b.vx = 0;
    if (b.z > 0) b.vz = -0.5;
  },
  frame(b) {
    const authored=operatorFrame(b);if(authored)return authored;
    switch (b.state) {
      case 'openter': return ['walk', (G.time >> 3) & 3];
      case 'idle': return b.moved > 0.2 ? ['walk', Math.floor(b.stridePhase / 5.4) % 8] : ['idle', (G.time >> 4) & 3];
      case 'windup': return ['punch', 0];
      case 'swing': return ['punch', b.t < 10 ? 1 : 2];
      case 'recover': return b.t<18?['wrench',5]:['idle',0];
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
    // cracks in the cab glass, one set per reflected tool
    if (b.glass >= 3||!b.reflectTarget) return;
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
    drawDredgerDetails(ctx,b,camX);
    dredger.drawCab(ctx, b, camX);
    dredger.drawHose(ctx, b, camX);
    if(b.phase==='machine'&&['hose','windup'].includes(b.state)){ctx.fillStyle=b.state==='hose'?'rgba(111,121,70,.45)':'rgba(218,131,55,.3)';ctx.fillRect(b.rail.x-220-camX,b.hoseLane-6,220,12);}
    if (b.phase === 'operator') {
      if(b.bucket){const im=ASSETS.ic_delhi_mechanisms;if(im){const sw=im.width/4,sh=im.height/2;ctx.drawImage(im,0,sh,sw,sh,b.bucket.x-camX-41.5,b.bucket.y-83,83,83);}else dredger.drawBucket(ctx, camX, b.bucket.x, b.bucket.y, b.bucket.z, false, false, null, 0);}
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
    const swing = b.z > 20 && b.state !== 'dying' ? Math.sin(b.machineClock * 0.06) * 0.035 : 0;
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

export const DELHI = { dredger };

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
