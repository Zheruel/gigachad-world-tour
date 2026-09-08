// enemies.js - the Chandni Chowk street crew: AI states, turn-taking attacks,
// hit reactions, wall splats.
import {
  G, W, FLOOR_TOP, FLOOR_BOT, clamp, rand, irand, addScore, diff, clampToArena, clampToLane, laneAt, laneMin, laneMax, zoneDrag,
  airborne, juggleMul, fall, inAir,
} from './engine.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { ASSETS } from './assets.js';
import { getAIFrame } from './aiframes.js';
import { spawnSpark, spawnDust, impact, spawnPop } from './effects.js';
import { hurtPlayer, grabPlayer, resolveIncomingHit, rewardAttack, boxingVictimPose } from './player.js';
import { spawnShot, spawnArc, spawnZone } from './shots.js';
import { createProp } from './props.js';
import { spawnDefeatFX, defeatVictimPose } from './defeat_fx.js';

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

  // ---- DIRTY DELHI ----
  // screaming pressure cooker: a slow steam beam down the lane that hurts anyone
  // standing in it, and he vents when he dies. The level's anti-mash lesson, taught
  // in one death rather than in a tooltip.
  cooker: { hp: 30, speed: 0.80, dmg: 8, score: 220, canGrab: false, set: 'cooker', w: 46, h: 82, range: 110, shadowR: 14 },
  // one rig, four props across the chapter: a handcart here, a boat pole on the ghat.
  // Break the prop and the ram is gone for good and he is a slow brawler.
  thela: { hp: 85, speed: 0.55, dmg: 12, score: 400, canGrab: false, set: 'thela', w: 58, h: 92, range: 40, shadowR: 20, poise: 2, rig: 'thelacart' },
  // comes out of the water at the back of the lane and drags you toward the edge.
  // Its whole job is making you notice which way you are facing.
  mudlark: { hp: 22, speed: 1.40, dmg: 6, score: 180, canGrab: false, set: 'mudlark', w: 40, h: 70, range: 30, shadowR: 12, fromWater: true },
  // a named elite, not a boss: no intro card and no health bar, but the longest
  // reach in the game and a wrap-and-drag that hauls you at the water.
  dhobi: { hp: 120, speed: 0.90, dmg: 13, score: 900, canGrab: false, set: 'dhobi', w: 50, h: 90, range: 96, shadowR: 16, poise: 3, rig: 'dhobislab' },
  // a runner is a wave flag, not a role: no attack, ignores you, sprints the arena.
  dabbawala: { hp: 12, speed: 2.60, dmg: 0, score: 120, canGrab: false, set: 'dabbawala', w: 40, h: 84, range: 0, shadowR: 13, runner: true, offSlot: true, noCount: true },
  // SANDH: paws the ground at one edge, then charges one depth lane. Hittable,
  // stays down, and hurts everything it touches - which is most of the point.
  bull: { hp: 60, speed: 3.20, dmg: 18, score: 500, canGrab: false, set: 'bull', w: 90, h: 74, range: 60, shadowR: 26, poise: 9, offSlot: true, noCount: true },

  // ---- THE NIGHT TRAIN ----
  // Berth ambushers climb and drop into the fighting lane.
  berth: { hp: 24, speed: 1.30, dmg: 7, score: 260, canGrab: false, set: 'nr_ambusher', w: 36, h: 84, range: 45, shadowR: 12, perch: true },



};

const WINDUP = { goonda: 18, batta: 28, masala: 22, bandar: 12, pehlwan: 24,
  constable: 22, operator: 25, sepoy: 24,
  cooker: 26, thela: 30, mudlark: 20, dhobi: 26, dabbawala: 0, bull: 40, berth: 20 };
// frame at which an attack switches from the strike to the follow-through
const ATK_RECOVER = { goonda: 9, batta: 14, masala: 12, bandar: 99, pehlwan: 16,
  cooker: 20, thela: 18, mudlark: 12, dhobi: 16, bull: 12, berth: 12 };
// below this much movement in a frame a body counts as standing still
const MOVE_EPS = 0.12;
const JUGGLE_CAP = 4;
const PARRY_CLASS = { goonda: 'counter', batta: 'unblockable', masala: 'reflect',
  bandar: 'counter', pehlwan: 'unblockable', constable: 'counter',
  operator: 'reflect', sepoy: 'counter',
  cooker: 'unblockable', thela: 'unblockable', mudlark: 'counter',
  dhobi: 'unblockable', dabbawala: 'counter', bull: 'unblockable',
  berth: 'unblockable' };

// Fresh train skins use the shared combat roles, never their legacy artwork.
for(const [key,role,hp]of [['tough','goonda',36],['bruiser','batta',50],['runner','sepoy',32],['ambusher','berth',28],['heavy','thela',70],['guard','constable',52]]){
 TYPES['nr_'+key]={...TYPES[role],role,set:'nr_'+key,hp,h:key==='heavy'?96:86,rig:key==='heavy'?'nr_case':undefined};
}
Object.assign(TYPES.nr_runner,{speed:1.7,range:36,dmg:8});
// Chapter families share proven roles while their source art and identity remain
// separate. Their ordinary weapon strikes stay blockable like the train cast.
for(const [key,role,hp,speed,h]of [
  ['brawler','goonda',38,.95,86],['runner','sepoy',30,1.65,86],
  ['enforcer','batta',48,.82,90],['heavy','thela',66,.58,94],
  ['kitchen','cooker',36,.85,86],['docker','goonda',48,.95,90],
  ['headset','goonda',38,1,86],['operator','sepoy',32,1.6,86],
  ['thrower','operator',32,.95,86],['security','constable',54,.86,90],
  ['cabinet','thela',70,.6,92],['lead','goonda',48,1,86],
]) TYPES['ic_'+key]={...TYPES[role],role,set:'ic_'+key,hp,speed,h,
  range:['runner','operator'].includes(key)?38:TYPES[role].range,
  dmg:['runner','operator'].includes(key)?8:TYPES[role].dmg,
  rig:key==='heavy'?'ic_cart':key==='cabinet'?'ic_cabinet':undefined};
// Ramming actors pick an edge and charge one lane.
const isRam = (e) => e.kind === 'bull' || e.ram;
const chapterPressure = e => e.trainType === 'ic_kitchen';
const attackClass = e => chapterPressure(e) ? 'unblockable' : e.trainType ? 'counter' : PARRY_CLASS[e.kind];

export function spawnEnemy(type, x, y) {
  const T = TYPES[type];
  y = clamp(y, laneMin(x), laneMax(x));   // a spawn lands in its lane, never a frame outside it
  const scale = diff().hp * (1 + G.stageIndex * 0.15);
  const hp = Math.round(T.hp * scale);
  const e = {
    kind: T.role || type, trainType:T.role?type:null, set: SPR[T.set],
    x, y, z: 0, vx: 0, vy: 0, vz: 0, face: x < G.player.x ? 1 : -1,
    hp, maxhp: hp, dmg: T.dmg, score: T.score, canGrab: T.canGrab,
    poise: T.poise || 0, maxPoise: T.poise || 0,
    speed: T.speed * diff().aggro, baseSpeed: T.speed * diff().aggro, range: T.range, holdT: 0,
    tint: '', juggle: 0, orbit: Math.random() < 0.5 ? -1 : 1, stridePhase: 0, moved: 0,
    state: 'spawn', t: 0, targetX: clamp(x + (x < G.player.x ? 70 : -70), G.camX + 24, G.camX + W - 24),
    atkCd: irand(30, 80), rallyCd:240, dead: false, removeMe: false, flash: 0,
    w: T.w, h: T.h, shadowR: T.shadowR, hitLanded: false,
    offSlot: !!T.offSlot, noCount: !!T.noCount, runner: !!T.runner,
    noLane: false, ffCd: 0, pitCd: 0, rig: null, ramGone: false,
    ram: !!T.ram, perched: false, perchZ: 0, airOnly: false, throws: 0, throwCd: 60, groundT: 0,
    hurt(dmg, dir, heavy, launch) { hurtEnemy(e, dmg, dir, heavy, launch); },
    parried(dmg, dir) {
      hurtEnemy(e, dmg, dir, false, false);
      if (!e.dead) { e.state = 'stagger'; e.t = 0; e.vx = dir * 0.7; e.atkCd = 100; }
    },
    thrown(dir) { throwEnemy(e, dir); },
  };
  G.enemies.push(e);

  // "One heavy, four props" is this hook and nothing else: the prop is an ordinary
  // breakable in G.props, so the y-sort, the player's target list and hurtProp all
  // work on it already, and onBreak is the whole mechanic.
  // the heavy's prop is the stage's to choose: a handcart, a boat pole, a steel trunk
  const rigKind = (G.stage && G.stage.rigs && G.stage.rigs[type]) || T.rig;
  if (rigKind) {
    e.rig = createProp(rigKind, x + e.face * 32, y + 6);
    e.rig.hidden=e.trainType==='nr_heavy';
    e.rig.onBreak = () => { e.ramGone = true; e.range = 40;if(e.trainType==='nr_heavy'){e.set=SPR.nr_heavy_unarmed;e.rig.hidden=false;e.baseSpeed=1.05;} };
    G.props.push(e.rig);
  }
  // He arrives out of the river, behind the lane, and walks up onto the lip. He is
  // visible and not yet dangerous for those 20 frames - that IS his telegraph.
  if (T.fromWater && laneMin(x) > FLOOR_TOP) {
    e.y = laneMin(x) - 12; e.noLane = true; e.state = 'rise'; e.t = 0;
  }
  if (T.runner) { e.state = 'runner'; e.face = 1; e.noLane = true; }
  // The berth: the lane says how high it is. On the roof there is none, and he is a
  // quick boy on the steel like everyone else.
  if (T.perch) {
    const lane = laneAt(x);
    e.perchZ = lane && lane.berth ? lane.berth : 0;
    if (e.perchZ) perch(e);
  }
  return e;
}

function perch(e) {
  e.perched = true; e.airOnly = true; e.noLane = true;
  e.z = e.perchZ; e.vz = 0; e.vx = 0;
  e.y = laneMin(e.x) + 2;
  e.state = 'perch'; e.t = 0; e.throws = 0; e.throwCd = irand(60, 120);
}

// Off the berth and onto the floor, where he is an ordinary boy for a while.
function unperch(e) {
  e.perched = false; e.airOnly = false; e.noLane = false;
  e.groundT = 300;
}

function hurtEnemy(e, dmg, dir, heavy, launch) {
  if (e.dead || e.state === 'thrown' || (e.superLocked && !e.superApplying)) return;
  if(!(e.protectedStagger>0)&&!e.superApplying&&['nr_guard','ic_security'].includes(e.trainType)&&!heavy&&!launch&&dir===-e.face&&!(e.blockCd>0)&&['idle','approach','windup'].includes(e.state)){
    e.blockCd=150;e.state='block';e.t=0;G.audio.sfx('armor');spawnSpark(e.x+e.face*12,e.y-52);return;
  }
  // a hit on the berth: light ones rock him, heavy ones knock him off it
  if (e.perched && (heavy || launch)) unperch(e);
  // Poise: heavies shrug off light hits, but the meter drains visibly so they
  // read as "still coming" instead of "ignoring you", and it breaks with a clash.
  if (e.poise > 0 && !heavy && !(e.protectedStagger>0) && !e.superApplying) {
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
  // his own voice, not every hit: a grunt on about a third of them, a scream on the KO
  if (e.hp > 0 && e.kind !== 'prop' && Math.random() < 0.35) G.audio.sfx('ehurt' + (1 + Math.floor(Math.random() * 4)));
  if (e.hp <= 0) {
    e.dead = true;
    spawnDefeatFX(e,dir,heavy,launch);
    e.state = 'dying'; e.t = 0;
    e.vx = dir * 3.2; e.vz = 4.0; e.z = Math.max(e.z, 0.1);
    addScore(e.score);
    if (G.stats) G.stats.kos++;
    spawnPop(e.x, e.y - 70, '+' + e.score);
    G.audio.sfx('ko');
    if (e.kind !== 'prop') G.audio.sfx(Math.random() < 0.5 ? 'edie1' : 'edie2');
    impact(true);
    G.hitstop = Math.max(G.hitstop, 9); G.shake = Math.max(G.shake, 7);
    if (G.player.grabbedBy === e) { G.player.grabbedBy = null; G.player.state = 'idle'; }
    // Enemy defeats never generate resources. Health is authored through
    // specific breakable objects, keeping stage balance deterministic.
    // The one exception is placed, not looted: the runner is carrying lunch, and
    // dropping him is a decision the wave asked you to make under a timer.
    if (e.runner) {
      G.pickups.push({ x: e.x, y: e.y, kind: 'tiffin', heal: 45, t: 0 });
      G.runnerEscaped = false;
    }
    // He vents when he dies, burning whatever is next to him. The zone is the
    // player's half of it and tryHitLane is the neighbours' - a full-width box,
    // because a pressure cooker does not care which way it was facing.
    if (e.kind === 'cooker' && !chapterPressure(e)) {
      spawnZone('fire', e.x, e.y, 34, 90);
      tryHitLane({ x: e.x, y: e.y, z: e.z, face: 0 }, 14, 70, true, 22);
      G.shake = Math.max(G.shake, 6);
      G.audio.sfx('heavy');
    }
  } else if(e.superLocked || e.protectedStagger>0){e.state='stagger';e.vx=0;e.vz=0;e.z=0;
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
  if(e.superLocked)return;
  rewardAttack(G.player,'grab',6);
  e.bossCollision=false;
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

// Over the lip and into the river. A ring-out is a free kill, which is the whole
// reason the ghat's crowd is bigger and tougher than the market's. `thrown` has to
// go first: hurtEnemy refuses that state, the same trap the throw code documents.
function pitFall(e) {
  if (e.dead || e.pitCd > 0) return;
  e.pitCd = 24;
  e.state = 'down'; e.t = 0; e.vx = 0; e.vz = 0;
  spawnDust(e.x, e.y, 6);
  spawnPop(e.x, e.y - 70, laneAt(e.x) && laneAt(e.x).edge ? 'OVER THE SIDE' : 'RING OUT');
  G.shake = Math.max(G.shake, 6);
  G.audio.sfx('slam');
  addScore(150);
  hurtEnemy(e, 9999, 0, true, false);
  e.z = -40;   // the dying arc sinks instead of lying on a floor that is not there
}

// Attacker slots: two at a time normally, three once the crowd is big, so a
// full wave actually pressures you instead of politely queueing.
// A runner is not fighting and the bull is not queueing, so neither takes a slot
// or counts toward the wave - a wave that waited for the bull could never clear.
function slotsUsed() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead && !e.offSlot && (['windup','attack','drop','rally'].includes(e.state))) n++;
  return n;
}
function slotCap() { return G.boss&&!G.boss.dead&&!G.boss.trainWaiting ? 1 : 2; }

// A red attack does not care who is standing in it. The same box tryHitPlayer uses,
// swept over the other bodies and the breakables instead of the player. There is no
// separate `friendly:` flag: red IS the flag, it already drives the telegraph colour,
// and a second source of truth for the same fact would drift.
// It never touches G.boss - a summoned crew shredding the thing that summoned it is
// not a mechanic, it is an exploit.
export function tryHitLane(src, dmg, range, heavy, tol) {
  const face = src.face || 0;
  const cx = src.x + face * range * 0.5, halfW = range * 0.5 + 11;
  let hit = false;
  for (const o of G.enemies) {
    if (o === src || o.dead || o.state === 'dying' || o.runner || o.ffCd > 0) continue;
    // Friendly fire is a punish, never a stunlock engine. A body already reeling is
    // skipped: re-entering 'down' or 'hurt' resets the stuck watchdog, and two
    // cookers beaming each other could then hold each other still forever and the
    // wave would never clear. ?auto=soak found exactly that.
    if (o.state === 'down' || o.state === 'thrown' || o.state === 'getup'
      || o.state === 'hurt' || o.state === 'stagger') continue;
    if (Math.abs(o.x - cx) < halfW && Math.abs(o.y - src.y) < (tol || 15) && Math.abs(o.z - src.z) < 30) {
      o.ffCd = 20;   // a 26-frame beam is one hit on a neighbour, not twenty
      o.hurt(dmg, Math.sign(o.x - src.x) || face || 1, heavy, heavy);
      spawnSpark(o.x, o.y - 44);
      spawnPop(o.x, o.y - 78, 'FRIENDLY');
      hit = true;
    }
  }
  for (const pr of G.props) {
    if (pr.broken || pr.decor || pr === src.rig) continue;
    if (Math.abs(pr.x - cx) < halfW && Math.abs(pr.y - src.y) < (tol || 15)) pr.hurt(dmg, face || 1);
  }
  return hit;
}

// `sound` names the impact for a hit; the default is the plain punch/heavy pair.
function tryHitPlayer(e, dmg, range, heavy, tol, parryClass = attackClass(e), sound) {
  const p = G.player;
  if (parryClass === 'unblockable') tryHitLane(e, dmg, range, heavy, tol);
  if (p.state === 'down' || p.state === 'getup' || p.dying) return;
  if (Math.abs(p.x - (e.x + e.face * range * 0.5)) < range * 0.5 + 11 && Math.abs(p.y - e.y) < (tol || 15) && p.z < 24) {
    if (resolveIncomingHit(p, e, { parryClass, dmg, dir:e.face, heavy })) return true;
    hurtPlayer(p, dmg, e.face, heavy);
    spawnSpark(p.x, p.y - 48);
    G.audio.sfx(sound || (heavy ? 'heavy' : 'punch'));
    return true;
  }
  return false;
}

// The macaque robs the floor: if a pickup is closer than the player, go take it.
// Not the 1-up: there is one in the level, and losing it to an RNG roll is a tax,
// not a decision.
function nearestPickup(e) {
  let best = null, bd = 150;
  for (const q of G.pickups) {
    if (q.kind === 'life') continue;
    const d = Math.abs(q.x - e.x);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

export function updateEnemies() {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.removeMe) continue;
    if(e.superLocked){
      if(G.player.state==='special'&&G.player.specialTarget===e)continue;
      e.superLocked=false;
    }
    if(e.protectedStagger>0&&!e.dead){e.protectedStagger--;e.state='stagger';e.vx=0;e.t=0;
      if(!e.protectedStagger){e.state='idle';e.atkCd=24;}continue;}

    const x0 = e.x, y0 = e.y;
    e.t++;
    if(e.rallyCd>0)e.rallyCd--;
    if(e.blockCd>0)e.blockCd--;
    if (e.flash > 0) e.flash--;
    if (e.wallCd > 0) e.wallCd--;
    if (e.ffCd > 0) e.ffCd--;
    if (e.pitCd > 0) e.pitCd--;
    if (e.rig && !e.rig.broken && e.dead) e.rig.onBreak = null;   // debris outlives its owner
    if (e.state !== 'down' && e.state !== 'thrown' && e.z <= 0) e.juggle = 0;
    if (!['loot','runner','windup','attack','grabhold'].includes(e.state)) e.face = p.x < e.x ? -1 : 1;
    // Wet sand slows both sides, which is the point of it. Derived from the base
    // each frame so every e.speed read downstream gets it without knowing about it.
    e.speed = e.baseSpeed * zoneDrag(e);

    // Watchdogs: a body must never be able to freeze. Passive states only
    // survive while whoever put the enemy there is still holding up their end.
    if (e.state === 'grabbed' && p.grabTarget===e && ['grabbing','throwing'].includes(p.state))continue;
    if (e.state === 'grabbed') {
      e.state = 'idle'; e.t = 0; e.atkCd = irand(20, 50);
    }
    if (e.state === 'grabhold' && p.grabbedBy !== e) { e.state = 'idle'; e.t = 0; e.atkCd = irand(40, 80); }
    if ((e.state === 'down' || e.state === 'thrown') && e.t > 240) {
      e.z = 0; e.vz = 0; e.vx = 0;
      e.state = 'getup'; e.t = 0;
    }

    switch (e.state) {
      case 'block':if(e.t>20){e.state='idle';e.t=0;e.atkCd=26;}break;
      case 'spawn': {
        const dx = e.targetX - e.x;
        e.x += Math.sign(dx) * e.speed * 1.8;
        if (Math.abs(dx) < 4) { e.state = 'idle'; e.t = 0; }
        break;
      }
      // He ignores you and runs for the far side. Two things happen at the end of
      // it and both are wave state: he gets away, or you get a meal.
      case 'runner': {
        e.x += e.face * e.speed;
        if (e.x > G.camX + W + 40 || e.x < G.camX - 40) { e.removeMe = true; G.runnerEscaped = true; }
        break;
      }
      // Berth ambushers show their drop before crossing into the fighting lane.
      case 'perch': {
        e.z = e.perchZ;
        if (--e.throwCd <= 0 && Math.abs(p.x - e.x) < 220 && slotsUsed()<slotCap()) {
          if ((e.trainType === 'nr_ambusher' || e.throws >= 3) && Math.abs(p.x - e.x) < 160) {
            unperch(e);
            e.state = 'drop'; e.t = 0; e.hitLanded = false;
            e.dropY=p.y;
            e.vx = Math.sign(p.x - e.x || 1) * 2.0; e.vz = 1.6;
            G.audio.sfx('dash');
          } else if(e.trainType!=='nr_ambusher') { e.state = 'pthrow'; e.t = 0; }
        }
        break;
      }
      case 'pthrow': {
        e.z = e.perchZ;
        if (e.t === 14) {
          e.throws++;
          spawnArc('weight', e.x + e.face * 10, e.y, e.face * 3.0, 1.0, e.dmg, null,
            { source: e, parryClass: 'reflect', z: e.z + 30 });
          G.audio.sfx('whiff');
        }
        if (e.t > 34) { e.state = 'perch'; e.t = 0; e.throwCd = irand(80, 140); }
        break;
      }
      case 'drop': {
        e.x += e.vx; e.z += e.vz; e.vz -= 0.22;
        if(e.dropY!==undefined)e.y+=clamp(e.dropY-e.y,-1.2,1.2);
        if (e.z <= 0) {
          e.z = 0; e.vz = 0; e.vx = 0;
          if (!e.hitLanded) { tryHitPlayer(e, 10, 34, true, 16, e.trainType?'counter':'unblockable'); e.hitLanded = true; }
          spawnDust(e.x, e.y, 3);
          G.shake = Math.max(G.shake, 3);
          e.state = e.trainType==='nr_ambusher'&&getAIFrame(e.set._aiKey,'land')?'land':'idle'; e.t = 0; e.atkCd = irand(40, 80);
        }
        break;
      }
      case 'climb': {
        e.z += 2;
        if (e.z >= e.perchZ) perch(e);
        break;
      }
      case 'land':if(e.t>=8){e.state='idle';e.t=0;}break;
      // Out of the water and onto the lip. Twenty frames of visible and harmless.
      case 'rise': {
        e.y += 0.6;
        if (e.y >= laneMin(e.x)) { e.y = laneMin(e.x); e.noLane = false; e.state = 'approach'; e.t = 0; }
        break;
      }
      // The drag: he has you, and every frame he takes you a little further back
      // toward the edge he came out of. Mash out on the ordinary grab contract.
      case 'drag': {
        if (p.grabbedBy !== e) { e.state = 'idle'; e.t = 0; e.atkCd = irand(40, 80); break; }
        e.holdT++;
        p.y = Math.max(laneMin(p.x), p.y - 0.8);
        e.y = p.y; e.x = p.x + e.face * 22;
        if (p.mash >= 5) {
          p.grabbedBy = null; p.mash = 0;
          e.state = 'stagger'; e.t = 0; e.vx = -e.face * 1.2;
          hurtEnemy(e, 6, -e.face, false, false);
        } else if (e.holdT > 90) {
          p.grabbedBy = null; p.mash = 0;
          hurtPlayer(p, 8, e.face, true);
          e.state = 'backoff'; e.t = 0;
        }
        break;
      }
      case 'idle': {
        if(e.trainType==='ic_lead'&&e.rallyCd<=0&&e.x>G.camX+20&&e.x<G.camX+W-20&&slotsUsed()<slotCap()&&
          G.enemies.some(o=>o!==e&&!o.dead&&o.trainType?.startsWith('ic_'))){
          e.state='rally';e.t=0;e.rallyCd=420;break;
        }
        // The bull does not queue for a turn and does not orbit: he walks to whichever
        // edge is further away, locks one depth lane, and paws. Everything after that
        // is the ordinary windup -> attack chain, so he gets the red telegraph free.
        // Train ambushers drop once, then remain in the floor fight.
        if (e.trainType!=='nr_ambusher' && e.perchZ && !e.perched && --e.groundT <= 0) {
          e.state='climb';e.t=0;e.noLane=true;e.airOnly=true;e.perched=true;e.y=laneMin(e.x)+2;break;
        }
        if (isRam(e)) {
          const edge = p.x > (G.camX + W / 2) ? G.camX + 24 : G.camX + W - 24;
          e.face = edge < e.x ? -1 : 1;
          e.x += Math.sign(edge - e.x) * 1.6;
          e.y += clamp(p.y - e.y, -0.8, 0.8);
          if (Math.abs(edge - e.x) < 6) { e.face = -e.face; e.state = 'windup'; e.t = 0; }
          break;
        }
        // Orbit the player instead of bunching up on one spot, so a crowd
        // spreads across the arena and stays readable.
        // laneMin, not FLOOR_TOP: on the ghat the AI must never aim into the river.
        const wantY = clamp(p.y + e.orbit * (e.kind === 'masala' || e.kind === 'operator' ? 26 : 16), laneMin(e.x), laneMax(e.x));
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
        if (slotsUsed()<slotCap() && e.kind === 'bandar' && Math.abs(dx) < 90 && Math.abs(dx) > 34 && Math.abs(dy) < 9) {
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
        // Only one red special may occupy the screen; no hidden windups.
        const red=attackClass(e)==='unblockable';
        if(e.x<G.camX+12||e.x>G.camX+W-12||(red&&G.india?.environment?.dangerActive)||
          (red&&[...G.enemies,...(G.boss&&!G.boss.dead?[G.boss]:[])].some(o=>o!==e&&!o.dead&&
            ['windup','attack','reach','sweep'].includes(o.state)&&
            (attackClass(o)==='unblockable'||['reach','sweep','grab'].includes(o.pattern))&&o.t>=e.t))){
          e.state='idle';e.atkCd=35;break;
        }

        if (e.t >= (WINDUP[e.kind] || 18)) {
          e.state = 'attack'; e.t = 0; e.hitLanded = false;
          G.audio.sfx('whiff');   // the swing itself; contact adds the impact
          if (e.kind === 'bandar') { e.vx = e.face * 3.6; e.vz = 3.0; e.z = 0.1; G.audio.sfx('dash'); }
          if (e.kind === 'pehlwan') { e.vx = e.face * 2.2; G.audio.sfx('dash'); }
          if (e.kind === 'constable') e.armor = 1;
          if (e.kind === 'thela' && !e.ramGone) { e.vx = e.face * 2.6; G.audio.sfx('dash'); }
          if (isRam(e)) { e.vx = e.face * e.speed; G.audio.sfx('dash'); }
        } else if (e.kind === 'bull' && e.t % 6 === 0) {
          spawnDust(e.x - e.face * 26, e.y, 2);   // pawing the ground, for 40 frames
        }
        break;
      }
      case 'rally': {
        // A visible, hittable call coordinates only existing crew. Interrupting
        // it loses this opportunity; it never bypasses the shared attack budget.
        if(e.t===32){
          spawnPop(e.x,e.y-e.h-7,'NOW!');G.audio.sfx('ehurt1');
          for(const ally of G.enemies)if(ally!==e&&!ally.dead&&ally.trainType?.startsWith('ic_')&&ally.state==='idle')ally.atkCd=Math.min(ally.atkCd,10);
        }
        if(e.t>=48){e.state='idle';e.t=0;e.atkCd=30;}
        break;
      }
      case 'attack': {
        if (e.kind === 'goonda' || e.kind === 'berth') {
          if (e.t === 5 && !e.hitLanded) { tryHitPlayer(e, e.dmg, 42, false); e.hitLanded = true; }
          if (e.t > 14) { e.state = 'idle'; e.atkCd = irand(50, 110); }
        } else if (e.kind === 'batta' || e.kind === 'constable' || e.kind === 'sepoy') {
          // big cricket bat arc: slow, telegraphed, knocks you flat
          const red = !e.trainType && (e.kind === 'batta' || (e.kind === 'sepoy' && e.hp < e.maxhp / 2));
          if (e.t === 8 && !e.hitLanded) {
            tryHitPlayer(e, e.dmg, e.range + 10, red, 14, red ? 'unblockable' : 'counter', red ? 'heavy' : 'weapon');
            e.hitLanded = true;
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
          if (!e.hitLanded) {
            tryHitPlayer(e, e.dmg, 34, false, 16);
            if (G.hitstop > 0) {
              e.hitLanded = true;

            }
          }
          if (e.z <= 0) { e.z = 0; e.vz = 0; e.state = 'backoff'; e.t = 0; spawnDust(e.x, e.y, 2); }
        } else if (e.kind === 'cooker') {
          // A screaming beam down the lane. It is a sweep, not a strike, so it calls
          // tryHitLane itself rather than riding tryHitPlayer's one-line hook.
          if (e.t < 26 && e.t % 3 === 0) {
            spawnShot('steam', e.x + e.face * (16 + e.t * 2.4), e.y, e.face * 1.4, 0,
              { source: e, parryClass: 'unblockable' });
            tryHitPlayer(e, 3, 110, false, 12);
            if (e.t === 0) G.audio.sfx('whiff');
          }
          if (e.t > 38) { e.state = 'backoff'; e.t = 0; }
        } else if (e.kind === 'thela') {
          // With the cart gone he is a slow brawler for the rest of his life, and
          // that is the whole reward for breaking it.
          if (e.ramGone) {
            if (e.t === 6 && !e.hitLanded) { tryHitPlayer(e, 8, 44, false, 14, 'counter'); e.hitLanded = true; }
            if (e.t > 22) { e.state = 'idle'; e.atkCd = irand(60, 110); }
          } else {
            e.x += e.vx; e.vx *= 0.97;
            if (e.rig && !e.rig.broken) { e.rig.x = e.x + e.face * 32; e.rig.y = e.y + 6; }
            if (!e.hitLanded && tryHitPlayer(e, e.dmg, 74, true, 18)) e.hitLanded = true;
            if (e.t % 4 === 0) spawnDust(e.x - e.face * 12, e.y, 1);
            if (e.t > 40) { e.vx = 0; e.state = 'idle'; e.atkCd = irand(80, 140); e.poise = e.maxPoise; }
          }
        } else if (e.kind === 'mudlark' || e.kind === 'dhobi') {
          // The mudlark always tries for the drag; the dhobi mostly whips and
          // sometimes wraps you up. His slab is what gives him the long reach.
          const reach = e.kind === 'dhobi' ? (e.rig && !e.rig.broken ? 96 : 62) : 30;
          const strike = e.kind === 'dhobi' ? 8 : 5;
          if (e.t === strike && !e.hitLanded) {
            e.hitLanded = true;
            const canHold = Math.abs(p.x - e.x) < reach && Math.abs(p.y - e.y) < 14 && p.z < 12 &&
              !p.dying && p.invuln <= 0 && p.state !== 'down' && p.state !== 'getup' && !p.grabbedBy;
            if (canHold && (e.kind === 'mudlark' || Math.random() < 0.4)) {
              grabPlayer(p, e);
              e.state = 'drag'; e.t = 0; e.holdT = 0;
              G.audio.sfx('throw');
              break;
            }
            tryHitPlayer(e, e.dmg, reach, e.kind === 'dhobi', 15, undefined, e.kind === 'dhobi' ? 'weapon' : 'punch');
          }
          if (e.t > (e.kind === 'dhobi' ? 30 : 20)) { e.state = 'idle'; e.atkCd = irand(60, 120); }
        } else if (isRam(e)) {
          // 18 damage to anything he touches, both sides - and "both sides" is free,
          // because the charge is red and tryHitPlayer routes every red through the lane.
          e.x += e.vx;
          if (!e.hitLanded && tryHitPlayer(e, e.dmg, 60, true, 20)) e.hitLanded = true;
          else if (e.hitLanded) tryHitLane(e, e.dmg, 60, true, 20);
          if (e.t % 3 === 0) spawnDust(e.x - e.face * 20, e.y, 2);
          if (e.x < G.camX + 16 || e.x > G.camX + W - 16 || e.t > 200) {
            e.vx = 0; e.state = 'idle'; e.t = 0; e.hitLanded = false;
          }
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
        if (e.perched) { e.vx = 0; e.z = e.perchZ; }
        if (e.t > 12) { e.state = e.perched ? 'perch' : 'idle'; e.atkCd = irand(30, 80); }
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
          if (r === 'bounce') { spawnDust(e.x, e.y, 2); G.audio.sfx('land'); }
          else if (r === 'land') { spawnDust(e.x, e.y, 3); G.shake = Math.max(G.shake, 2); G.audio.sfx('land'); }
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
          if (!pr.broken && !pr.decor && Math.abs(pr.x - e.x) < 22 && Math.abs(pr.y - e.y) < 15) pr.hurt(20, Math.sign(e.vx) || 1);
        }
        if (!e.bossCollision && G.boss && !G.boss.dead && !G.boss.superLocked && G.boss.z < 30 && Math.abs(G.boss.x - e.x) < 28 && Math.abs(G.boss.y - e.y) < 18) {
          e.bossCollision=true;G.boss.damageGuard?.(1);G.boss.counterApplying=true;
          G.boss.hurt(12, Math.sign(e.vx) || 1, true, false);G.boss.counterApplying=false;
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
        // one bounce off the floor, so the KO reads as a body and not a sprite
        if (inAir(e)) { const r = fall(e, 0.28, 0.3); if (r !== 'air') spawnDust(e.x, e.y, r === 'land' ? 3 : 2); }
        if(e.t>40)e.removeMe=true;
        break;
      }
    }

    // separation from other enemies
    if (e.state === 'idle' || e.state === 'approach') {
      for (const o of G.enemies) {
        if (o === e || o.dead || o.perched) continue;
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
    const wet = clampToLane(e);
    if (e.stay && e.x < G.camX - 160) e.removeMe = true;
    const side = e.runner || e.stay ? 0 : clampToArena(e);
    e.moved = Math.hypot(e.x - x0, e.y - y0);
    e.stridePhase += e.moved;
    // wallSplat owns the x axis and pitFall the depth axis, so they can never
    // compete for the same body - the else makes that precedence explicit.
    if (side && !e.dead && (e.state === 'down' || e.state === 'thrown')) wallSplat(e, side);
    else if (wet && !e.dead) pitFall(e);
  }
  // sweep removed
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].removeMe) G.enemies.splice(i, 1);
}

export function drawEnemy(ctx, e, camX) {
  const sx = Math.round(e.x - camX), sy = Math.round(e.y - e.z);
  let name = 'idle', idx = (G.time >> 4) & 1;
  const k = e.kind;
  switch (e.state) {
    case 'block':name='block';idx=0;break;
    case 'rally':name='call';idx=Math.min(2,Math.floor(e.t/16));break;
    case 'spawn': case 'approach': case 'backoff': case 'loot': case 'idle':
      if (e.moved > MOVE_EPS) { name = 'walk'; idx = Math.floor(e.stridePhase / 6); }
      else { name = 'idle'; idx = (G.time >> 4) & 1; }
      break;
    case 'runner': name = 'run'; idx = Math.floor(e.stridePhase / 5); break;
    case 'rise': name = 'rise'; idx = Math.min(3, (e.t / 6) | 0); break;
    case 'drag': case 'grabhold': name = 'atk'; idx = 1; break;
    // Every family with a signature strip winds up in it: the bull paws, the cooker
    // primes, the dhobi draws the whip back, the thela drops behind his cart.
    case 'windup':
      name = k === 'bull' ? 'paw' : k === 'cooker' ? 'beam' : k === 'dhobi' ? 'whip'
        : k === 'thela' ? (e.ramGone ? 'punch' : 'ram') : 'atk';
      idx = k === 'bull' ? (e.t >> 3) & 3 : 0;
      break;
    // strike then follow-through, so the swing has weight instead of popping
    case 'attack':
      if (isRam(e)) { name = 'charge'; idx = Math.floor(e.stridePhase / 7) & 3; }
      else if (k === 'thela' && !e.ramGone) { name = 'ram'; idx = 1 + ((e.t >> 2) % 3); }
      else if (k === 'thela') { name = 'punch'; idx = e.t < 6 ? 0 : (e.t < 14 ? 1 : 2); }
      else if (k === 'cooker') { name = 'beam'; idx = Math.min(3, 1 + (e.t >> 3)); }
      else if (k === 'dhobi') { name = 'whip'; idx = e.t < 8 ? 1 : (e.t < 16 ? 2 : 3); }
      else { name = 'atk'; idx = e.t < (ATK_RECOVER[e.kind] || 10) ? 1 : 2; }
      break;
    case 'hurt': name = 'hurt'; idx = e.t < 5 ? 1 : 0; break;
    case 'stagger': name = 'hurt'; idx = (e.t >> 3) & 1; break;
    case 'down': case 'dying': case 'corpse': name = 'down'; break;
    // a family without a getup strip rises through its hurt pose rather than
    // snapping from the floor straight into the idle
    case 'getup':
      if (getAIFrame(e.set._aiKey, 'getup')) {
        name = 'getup';
        if(e.trainType){const count=getAIFrame(e.set._aiKey,'getup').f.length;idx=Math.min(count-1,Math.floor(e.t*count/15));}
      }
      else { name = e.t < 7 ? 'down' : 'hurt'; idx = 0; }
      break;
    case 'grabbed': name = 'hurt'; break;
    case 'thrown': name = 'down'; break;
    case 'perch': name = 'perch'; idx = (G.time >> 4) & 3; break;
    case 'climb':name=e.trainType==='nr_ambusher'&&e.z>60?'perch':getAIFrame(e.set._aiKey,'climb')?'climb':'perch';idx=Math.floor(e.t/6);break;
    case 'land':name='land';idx=Math.min(1,Math.floor(e.t/4));break;
    case 'pthrow': name = 'throw'; idx = e.t < 10 ? 0 : e.t < 14 ? 1 : e.t < 24 ? 2 : 3; break;
    case 'drop': name=e.trainType==='nr_ambusher'&&e.z>60?'perch':'drop';idx=name==='perch'?1:e.vz>0?1:2;break;
  }
  // The luggage carrier strikes with the trunk in his hands. The shared thela
  // renderer's ram alias is a walking cycle, not this new attack performance.
  if(e.trainType==='nr_heavy'&&!e.ramGone&&['windup','attack'].includes(e.state)){
    name='atk';idx=e.state==='windup'?0:e.t<12?1:2;
  }
  if(e.trainType?.startsWith('ic_')){
    if(e.state==='windup'&&e.kind!=='cooker'){name='atk';idx=0;}
    if(e.state==='attack'&&e.kind==='thela'){name='atk';idx=e.t<10?1:2;}
    if(['down','dying','thrown'].includes(e.state)){name=e.z>4?'fall':'down';idx=0;}
    if(e.state==='stagger'){name='stagger';idx=0;}
  }
  if (e.state === 'dying' && ((G.time >> 1) & 1) && e.t > 18) return; // KO blink-out
  const boxing=boxingVictimPose(e)||defeatVictimPose(e);if(boxing){name=boxing.name;idx=boxing.idx;}
  const f = getFrame(e.set, name, idx, e.face);
  const dx = sx - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4;
  if(boxing){ctx.save();ctx.translate(sx+boxing.dx,sy+boxing.dy-40);ctx.rotate(boxing.angle);ctx.translate(-sx,-sy+40);}
  // windup telegraph flash + damage flash
  const cue = e.state === 'windup' && e.t > (WINDUP[e.kind] || 18) - 10;
  const cueHot = cue && ((e.t >> 1) & 1);
  const hot = cueHot || (boxing?boxing.flash:e.flash > 0);
  if (hot || e.tint) {
    ctx.save();
    ctx.filter = cueHot ? ((attackClass(e) !== 'unblockable')
      ? 'brightness(1.8) sepia(1) saturate(5) hue-rotate(70deg)'
      : 'brightness(1.8) sepia(1) saturate(6) hue-rotate(-35deg)')
      : (boxing?boxing.flash:e.flash > 0) ? 'brightness(1.7)' : e.tint;
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    blit(ctx, f, dx, dy);
  }
  if(boxing)ctx.restore();
  if (cue) {
    ctx.save();
    ctx.strokeStyle = attackClass(e) !== 'unblockable' ? '#6dff82' : '#ff4050';
    ctx.lineWidth = 2;
    const cy = sy - e.h - 8;
    if (attackClass(e) !== 'unblockable') {
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

// The count the wave gate and the spawn cap read. Runners and the bull are exempt:
// a wave that waited for the dabbawala to be killed could never clear, and a bull
// crossing the lane must not eat one of the six slots the wave was written for.
export function aliveEnemies() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead && !e.noCount) n++;
  return n;
}
