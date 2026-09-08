// player.js - CHAD: movement, flowing one-button combo, parry/counter,
// the single-target Boxing Rush, status effects and recovery.
import {
  G, FLOOR_TOP, FLOOR_BOT, METER_MAX, clamp, addScore, addMeter, bumpCombo, diff,
  clampToArena, clampToLane, laneMin, laneMax, zoneDrag, airborne, juggleMul, fall, inAir,
} from './engine.js';
import { input } from './input.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnSpark, spawnDust, spawnRing, spawnSmoke,
  impact, spawnPop, spawnBoxingImpact } from './effects.js';
import { reactStage } from './ambience.js';
import { getAIFrame } from './aiframes.js';

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

export const SUPER_VOICES=['duke_bring_it_on','duke_bring_pain','duke_come_get_some','duke_lets_rock'];

export const SUPER_MOVES = [
  { id: 'boxing_rush', name: 'BOXING RUSH', color: '#ff9b35', dur: 100 },
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
    invuln: 0, pitCd: 0,
    grabbedBy: null, grabTarget: null, mash: 0, superT: 0,
    runT: 0, idleT: 0, idleAnim: 0, quickGetup: false, groundT: 0,
    stridePhase: 0, moved: 0, chainSkip: 0,
    blind: 0, poison: 0, poisonT: 0, parryTarget: null,
    guardWindow: 0, counterT: 0, attackFamilies: [], superMove: 0, superOverride: null, specialTarget: null, superHits: {},
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
  const t = [...G.enemies, ...G.props.filter((pr) => !pr.decor)];
  if (G.boss && !G.boss.dead) t.push(G.boss);
  return t;
}

// apply a melee hit from the player to everything in range
function playerHit(p, spec) {
  const empowered = p.counterT>0 && p.state==='attack';
  if(empowered){spec={...spec,dmg:spec.dmg+4,heavy:true,impactHeavy:true};p.counterT=0;}
  const hx = p.x + p.face * spec.range * 0.6;
  let hitAny = false;
  let heaviest = 0;
  for (const e of hitTargets()) {
    if (e.dead || e.broken || e.superLocked) continue;
    if (e.state === 'grabbed' || e.state === 'thrown' || e.state === 'getup') continue;
    // Airborne bodies stay hittable (that is the juggle); grounded knockdowns
    // do not, so you cannot just stomp someone lying on the floor forever.
    if (e.state === 'down' && !airborne(e)) continue;
    // Something hanging above the lane is only in reach
    // from the air: any jump under it.
    const inReach = e.airOnly ? (p.z > 8 && e.z - p.z < 80)
      : e.z < 34 || (p.z > 8 && Math.abs(e.z - p.z) < 30);
    if (Math.abs(e.x - hx) < spec.range * 0.6 + e.w * 0.35 && Math.abs(e.y - p.y) < 16 && inReach) {
      const dealt = Math.round(spec.dmg * dmgMul(p));
      const before=e.hp;
      if(empowered)e.damageGuard?.(1);
      e.counterApplying=empowered;
      e.hurt(dealt, p.face, spec.heavy, spec.launch);
      e.counterApplying=false;
      if(e.kind!=='prop'&&e.hp===before)continue;
      if (spec.knock && !e.dead && e.state !== 'down' && e.state !== 'thrown') {
        e.vx = p.face * spec.knock;
      }
      // A prop scores when it BREAKS (props.js), not per hit - otherwise the heavy bag in
      // THE LAIR, which is unbreakable and there to be mashed, walks the persisted hi-score
      // and the next act's HIT BONUS up forever.
      // The cow gives nothing at all: she cannot be beaten, so she cannot be farmed.
      if (!e.cow) {
        if (e.kind !== 'prop') {
          addScore(10);
          if (G.stats) G.stats.hits++;
        }
        rewardAttack(p,empowered?'counter':spec.launch?'launcher':spec.heavy||spec.impactHeavy?'finisher':'strike',spec.heavy||spec.impactHeavy?6:4);
        comboPop(bumpCombo(), e.x, e.y);
      }
      heaviest = Math.max(heaviest, dealt * (airborne(e) ? juggleMul(e) : 1));
      hitAny = true;
    }
  }
  if (hitAny) {
    spawnSpark(p.x + p.face * spec.range * 0.7, p.y - 48);
    impact(spec.heavy || spec.impactHeavy, heaviest);
    G.audio.sfx(spec.sound || (spec.heavy || spec.impactHeavy ? 'heavy' : 'punch'));
    p.hitConfirm = true;
    if (spec.heavy || spec.impactHeavy) reactStage(hx, spec.heavy ? 1 : 0.55);
  }
  return hitAny;
}

// Meter rewards successful variety, never penalizes basic attack damage.
export function rewardAttack(p, family, base) {
  const history = p.attackFamilies || (p.attackFamilies = []);
  addMeter(history.includes(family) ? base : base * 1.5);
  history.push(family);
  if (history.length > 3) history.shift();
}

export function releaseGrab(p) {
  const e=p.grabTarget;
  if(e&&!e.dead&&e.state==='grabbed'){e.state='stagger';e.protectedStagger=20;e.t=0;}
  p.grabTarget=null;
}
function startGrab(p){
  const e=G.enemies.find(e=>!e.dead&&e.canGrab&&!e.superLocked&&e.z<12&&
    !['down','thrown','grabbed','getup'].includes(e.state)&&Math.abs(e.x-p.x)<38&&Math.abs(e.y-p.y)<16);
  if(!e)return false;
  p.grabTarget=e;p.face=e.x<p.x?-1:1;e.state='grabbed';e.t=0;e.vx=0;
  setState(p,'grabbing');G.audio.sfx('grab');return true;
}

export function releaseSuper(p) {
  const target = p.specialTarget;
  if (target) {
    target.superLocked = false;
    target.superApplying = false;
    if (!target.dead) { target.state = 'stagger'; target.t = 0; target.protectedStagger = Math.max(target.protectedStagger || 0, 45); }
  }
  p.specialTarget = null;
}

const RANKS = [[5, 'NICE'], [10, 'BRUTAL'], [15, 'SAVAGE'], [20, 'WORLD CLASS'], [30, 'GIGACHAD']];
function comboPop(n, x, y) {
  for (const [need, label] of RANKS) {
    if (n === need) {
      spawnPop(x, y - 56, label);
      G.audio.sfx('blip');
    }
  }
}

// A boss or bruiser locked the player into a hold.
export function grabPlayer(p, holder) {
  p.grabbedBy = holder;
  p.mash = 0;
  setState(p, 'held');
}

export function startSuper(p) {
  if (G.meter < METER_MAX) { G.audio.sfx('whiff'); return false; }
  const target = [...G.enemies, ...(G.boss && !G.boss.dead ? [G.boss] : [])]
    .filter(e => e && !e.dead && !e.superLocked && !['down','dying','thrown','grabbed','getup'].includes(e.state)
      && Math.abs(e.x-p.x)<=96 && (e.x-p.x)*p.face>=0 && Math.abs(e.y-p.y)<=20 && e.z<12)
    .sort((a,b)=>Math.abs(a.x-p.x)-Math.abs(b.x-p.x))[0];
  if (!target) { G.audio.sfx('whiff'); return false; }
  p.superMove=0; p.superOverride=null; p.boxingAfter=null; G.meter=0;
  setState(p,'special'); p.invuln=120; p.superT=0; p.superHits={};
  p.specialTarget=target; p.superGuarded=!!(target.guard>0 && !(target.protectedStagger>0));
  target.superLocked=true; target.vx=0; target.vz=0; target.z=0;
  G.audio.sfx('super'); G.audio.voiceRandom(SUPER_VOICES,1600,8,true);
  spawnDust(p.x,p.y,3);
  return true;
}

function comboMotion(p, c) {
  // A small load backwards followed by a short eased drive through contact.
  if (p.t < c.hitAt - 2) p.x -= p.face * 0.035;
  else if (p.t <= c.hitAt + 2) p.x += p.face * c.advance / 5;
  else if (p.t > c.cancelAt) p.x -= p.face * 0.025;
}

export function ragnarokPose(t,guarded=false) {
  const poses=guarded?[[0,0],[16,1],[24,2],[30,3],[40,4],[47,9],[52,10],[56,11],[60,12],[65,14],[70,15]]:
    [[0,0],[16,1],[24,2],[28,3],[32,4],[36,5],[40,6],[44,3],[48,4],[52,7],[60,8],[65,9],[72,10],[76,11],[80,12],[86,13],[92,14],[98,15]];
  let idx=0;for(const [at,pose]of poses)if(t>=at)idx=pose;
  return {name:'boxing_rush',idx};
}

// Draw-only reactions share the existing super clock. Collision, target locks,
// protected stagger and all physical coordinates remain under the combat update.
export function boxingVictimPose(e) {
  const p=G.player;
  // A lethal strike keeps its upright contact before the existing knockout arc.
  // Only the drawing changes: death, collision and score still resolve at impact.
  if(e.kind!=='boss'&&e.dead&&e.boxingKO&&e.t<8)return {name:e.t<2?'idle':'hurt',idx:0,dx:0,dy:0,angle:0,flash:e.t<2};
  if(!e.superLocked||p?.state!=='special'||p.specialTarget!==e||p.superT<24)return null;
  const t=p.superT,hits=p.superGuarded?[24,40,56]:[24,32,40,48,60,76];
  let n=0;for(let i=0;i<hits.length;i++)if(t>=hits[i])n=i;
  const age=t-hits[n],last=n===hits.length-1,flight=last&&!p.superGuarded?clamp((t-76)/23,0,1):0;
  const lift=last&&!p.superGuarded?Math.sin(flight*Math.PI)*21:0;
  let name=last&&age<2?'idle':'hurt';
  if(p.superGuarded&&!last)name=e.shieldActive?'shield':'block';
  else if(age>3&&getAIFrame(e.set?._aiKey,'stagger_polish'))name='stagger_polish';
  return {name,idx:name==='hurt'?n%2:0,dx:p.face*Math.max(0,4-age*.65),dy:-lift,
    angle:last&&!p.superGuarded?-p.face*Math.sin(flight*Math.PI)*.13:0,flash:age<2};
}

// True consumes a hostile contact. Projectiles inspect lastDefense to distinguish
// an absorbed guard hit from a reflected timed parry.
export function resolveIncomingHit(p, attacker, spec = {}) {
  p.lastDefense=null;
  const cls=spec.parryClass || (spec.parryable?'counter':'unblockable');
  if (!['counter','reflect'].includes(cls) || !input.held('parry') ||
      !['parry','parry_counter'].includes(p.state) || p.dying) return false;
  const origin=spec.x ?? attacker?.x ?? (p.x+p.face);
  if ((origin-p.x)*p.face < -4) return false;
  if (!(p.guardWindow>0)) {
    p.lastDefense='guard';
    const chip=Math.ceil((spec.dmg || 0)*diff().dmg*.1);
    p.hp=Math.max(0,p.hp-chip);
    spawnSpark(p.x+p.face*14,p.y-50); G.audio.sfx('armor');
    G.hitstop=Math.max(G.hitstop,2);
    if(p.hp===0){p.dying=true;setState(p,'down');p.vz=2;p.z=.1;}
    return true;
  }
  p.lastDefense='parry';p.guardWindow=0;p.counterT=60;p.parryTarget=attacker||null;
  setState(p,'parry_counter');p.invuln=12;
  G.hitstop=Math.max(G.hitstop,5);G.shake=Math.max(G.shake,3);
  spawnRing(p.x+p.face*8,p.y-44,'#6dff82');spawnSpark(p.x+p.face*14,p.y-50);
  rewardAttack(p,'parry',10);G.audio.sfx('parry');
  if(attacker&&!attacker.dead){
    attacker.parried?.(0,p.face);
    attacker.protectedStagger=Math.max(attacker.protectedStagger||0,45);
    attacker.state='stagger';attacker.t=0;attacker.vx=0;attacker.hitLanded=true;
    if(!attacker.parried)attacker.damageGuard?.(1);
  }
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

export function updatePlayer(p, bounds = null) {
  const x0 = p.x, y0 = p.y;
  p.t++;
  if(p.boxingAfter){p.boxingAfter.t++;if(p.boxingAfter.t>=16||p.state!=='idle')p.boxingAfter=null;}
  if(!['grabbing','throwing'].includes(p.state)&&p.grabTarget)releaseGrab(p);
  if(p.state!=='special' && p.specialTarget) releaseSuper(p);
  if(p.guardWindow>0)p.guardWindow--;
  if(p.counterT>0)p.counterT--;
  if(input.pressed('parry') && !['held','down','dead','special','hurt'].includes(p.state))p.guardWindow=12;
  if (p.invuln > 0) p.invuln--;
  if (p.pitCd > 0) p.pitCd--;
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
      if(input.pressed('use')&&startGrab(p))break;
      if (input.pressed('super')) { startSuper(p); break; }
      if (input.held('parry')) { setState(p, 'parry'); p.invuln = 0; G.audio.sfx('armor'); break; }
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
        const dg = zoneDrag(p);   // wet sand: it stays, and it slows everything in it
        // holding the direction after a dash keeps you running
        if (p.runT > 0 && ax === p.face) {
          p.state = 'run';
          p.x += ax * 2.5 * dg;
          p.y += ay * 1.1 * dg;
          if (G.time % 7 === 0) spawnDust(p.x, p.y, 1);
        } else {
          p.runT = 0;
          p.state = 'walk';
          p.x += ax * 1.38 * dg;
          p.y += ay * 1.0 * dg;
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
        if (playerHit(p, { dmg: 11, range: 46, heavy: true, launch: false })) p.hitDone = true;
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
        playerHit(p, { dmg: 10, range: 46, heavy: true, launch: true, sound: 'kick' });
        p.hitDone = true;
      }
      if (p.z <= 0) { p.z = 0; p.vz = 0; setState(p, 'idle'); spawnDust(p.x, p.y, 2); G.audio.sfx('land'); }
      break;
    }
    case 'attack': {
      const route = COMBO_FLOW;
      const c = route[Math.min(p.combo, route.length - 1)];
      // step into the punch, on the way to contact; the swing sounds as it starts
      comboMotion(p, c);
      if (p.t === 1) G.audio.sfx('whiff');
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
      if(input.pressed('jump')){p.vz=4.85;p.z=.1;setState(p,'jump');G.audio.sfx('jump');}
      else if(input.pressed('dashL')||input.pressed('dashR')){p.face=input.pressed('dashL')?-1:1;setState(p,'dash');p.vx=p.face*3.2;G.audio.sfx('dash');}
      else if(input.pressed('attack')){p.combo=0;p.queuedHits=0;setState(p,'attack');}
      else if(!input.held('parry'))setState(p,'parry_recover');
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
        }
      }
      if (p.t >= 6 && input.held('parry') && !input.pressed('attack')) { setState(p, 'parry'); break; }
      if (p.t >= 6 && input.pressed('attack')) {
        p.combo = 0; p.queuedHits = Math.max(0, input.count('attack') - 1); setState(p, 'attack'); break;
      }
      if (p.t >= 6 && (input.axisX() || input.axisY())) { p.parryTarget = null; setState(p, 'idle'); break; }
      if (p.t > 18) { p.parryTarget = null; setState(p, 'idle'); }
      break;
    }
    case 'special': {
      const t=++p.superT,target=p.specialTarget;
      if(!target || target.dead){releaseSuper(p);setState(p,'idle');break;}
      if(t<=16){p.x+=p.face*Math.min(5,Math.max(0,(target.x-p.x)*p.face-30));p.y+=clamp(target.y-p.y,-1.5,1.5);}
      if((p.superGuarded?t>=50&&t<=54:t>=70&&t<=74))p.x+=p.face*Math.min(2.4,Math.max(0,(target.x-p.x)*p.face-18));
      const hits=p.superGuarded?[[24,6],[40,6],[56,6]]:[[24,4],[32,4],[40,4],[48,4],[60,6],[76,14]];
      for(const [at,dmg] of hits)if(t===at){
        target.superApplying=true;
        target.hurt(dmg,p.face,true,false);
        target.superApplying=false;
        if(target.dead){target.boxingKO=true;p.boxingAfter={t:0,upper:at===76||p.superGuarded&&at===56,pose:ragnarokPose(t,p.superGuarded).idx};}
        if(!target.dead){target.state='stagger';target.t=0;target.vx=0;target.vz=0;target.z=0;}
        const upper=at===76||p.superGuarded&&at===56,hitX=upper?p.x+p.face*14:target.x-p.face*9,hitY=target.y-(upper?75:at===60?65:45);
        spawnSpark(hitX,hitY);
        spawnBoxingImpact(hitX,hitY,upper,p.face);
        G.shake=Math.max(G.shake,at===76?4:1.4);
        G.audio.sfx(at===76||at===56?'heavy':'punch');G.hitstop=Math.max(G.hitstop,at===76?7:3);
        if(G.stats)G.stats.hits++;addScore(10);
        if(p.superGuarded&&at===56)target.breakGuard?.();
      }
      if(t>=(p.superGuarded?72:100)||target.dead){releaseSuper(p);setState(p,'idle');}
      p.z=0;
      break;
    }
    case 'grabbing': {
      const e=p.grabTarget;
      if(!e||e.dead||e.state!=='grabbed'){releaseGrab(p);setState(p,'idle');break;}
      e.x=p.x+p.face*27;e.y=p.y;e.face=-p.face;
      if(p.t>=8&&(input.pressed('attack')||input.pressed('use'))){setState(p,'throwing');}
      else if(input.pressed('jump')||p.t>=120){releaseGrab(p);setState(p,'idle');}
      break;
    }
    case 'throwing': {
      const e=p.grabTarget;
      if(p.t===8&&e&&!e.dead){e.thrown(p.face);p.grabTarget=null;G.audio.sfx('throw');}
      if(p.t>=24){releaseGrab(p);setState(p,'idle');}
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
        else if (r === 'land') { spawnDust(p.x, p.y, 3); p.groundT = 0; G.audio.sfx('land'); }
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
  if (bounds) {
    p.x = clamp(p.x, bounds.left, bounds.right);
    p.y = clamp(p.y, bounds.back, bounds.front);
  } else {
    const over = clampToLane(p);
    if (over) pitFallPlayer(p, over);
    clampToArena(p, 0);
  }
  // measured after the clamp: pushing into a wall must not cycle the legs
  p.moved = Math.hypot(p.x - x0, p.y - y0);
  if (p.state === 'walk' || p.state === 'run') p.stridePhase += p.moved;
  else if (p.state === 'idle') p.stridePhase = 0;
}

// He goes in the river; he does not stay in it. A pit that eats a life on a knockdown
// near the edge is a loop you cannot climb out of, so this costs 20 hp and the dignity
// and puts him back on the lip. It is still more than a wall splat costs, which is the
// whole difference between a player who uses the water and one who does not.
function pitFallPlayer(p, side) {
  if (p.pitCd > 0) return;
  p.pitCd = 40;
  // -1 is the back of the lane (the river); +1 is a front edge (the train roof)
  const edge = side > 0 ? laneMax(p.x) : laneMin(p.x);
  spawnDust(p.x, edge, 8);
  spawnRing(p.x, edge, side > 0 ? '#c8c8d8' : '#8fd8c8');
  spawnPop(p.x, edge - 30, side > 0 ? 'HANGING ON' : 'SOAKED');
  p.hp = Math.max(1, p.hp - Math.round(20 * diff().dmg));
  p.y = side > 0 ? edge - 2 : edge + 2; p.z = 0; p.vz = 0; p.vx = 0;
  p.invuln = 90;
  G.combo = 0;
  G.shake = Math.max(G.shake, 5);
  G.audio.sfx('slam');
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
  const cinematicBody = p.state === 'special' || p.state === 'parry_counter' || (p.state==='idle'&&p.boxingAfter);
  if (p.invuln > 0 && !cinematicBody && !(p.invulnFlashAfter>G.time) && ((G.rawTime >> 1) & 1)) return; // invincibility blink
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
    case 'grabbing': name='grab';break;
    case 'throwing': name='throw';idx=p.t<8?0:1;break;
    case 'hurt': name = 'hurt'; break;
    case 'held': name = 'hurt'; break;
    case 'down': name = 'down'; break;
    case 'getup': name = 'getup'; break;
    case 'victory': name = 'victory'; break;
    case 'special': {
      const pose = ragnarokPose(p.superT,p.superGuarded);
      name = pose.name; idx = pose.idx;
      break;
    }
    case 'dead': name = 'down'; break;
  }
  if(p.state==='idle'&&p.boxingAfter){const a=p.boxingAfter;name='boxing_rush';idx=a.t<4?(a.upper?11:a.pose):a.t<9?(a.upper?12:a.pose):a.t<14?14:15;}
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
    ctx.filter = 'brightness(1.08) saturate(1.04)';
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
