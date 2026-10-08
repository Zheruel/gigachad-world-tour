import {updateDaze,drawDaze,beginDazePose,dazePose} from './daze.js';
// enemies.js - the Chandni Chowk street crew: AI states, turn-taking attacks,
// hit reactions, wall splats.
import {
  G, W, FLOOR_TOP, FLOOR_BOT, clamp, rand, irand, addScore, addMeter, diff, clampToArena, arenaMin, arenaMax, clampToLane, laneAt, laneMin, laneMax, zoneDrag,
  airborne, juggleMul, fall, inAir,
} from './engine.js';
import { SPR, getFrame, blit, frameW, frameH, liveSet } from './sprites.js';
import { drawAttackMarker, drawAttackAccent, poseAttackMarkerY } from './combat_cues.js';
import { fx } from './fx.js';
import { ASSETS } from './assets.js';
import { getAIFrame, hasAIState } from './aiframes.js';
import { spawnSpark, spawnDust, impact, screenFlash, spawnPop, spawnRing, spawnDebris, spawnSmoke } from './effects.js';
import { pullChock, inCargoPath } from './india_environment.js';
import { hurtPlayer, grabPlayer, blindPlayer, resolveIncomingHit, rewardAttack, boxingVictimPose } from './player.js';
import { spawnShot, spawnArc, spawnZone } from './shots.js';
import { createProp } from './props.js';
import { spawnDefeatFX, defeatVictimPose } from './defeat_fx.js';
import { knockTrunk, tteTrunk, tteStep, dropPickup, ttePose, drawTteTrunk, tteLoose, tteWaitHit, tteBargeDone } from './train_tte.js';
import { REFUND_FAMILY, REFUND_MOVES, isRefund, refundRestRange, refundPlan, refundMove, refundIdle, refundWind, refundStrike, refundAttack, refundShield, refundPose } from './refund_combat.js';
import { delhiCastPose } from './delhi_cast.js';
import { refundGait } from './refund_gait.js';
import { GREEN_WARNING_TICKS, GREEN_FOLLOWUP, GREEN_CONTACT, greenLead, greenWind } from './combat_readability.js';

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
  berth: { hp: 24, speed: 1.30, dmg: 7, score: 260, canGrab: false, set: 'nr_rack', w: 36, h: 84, range: 45, shadowR: 12, perch: true },



};

const WINDUP = { goonda: 18, batta: 28, masala: 22, bandar: 12, pehlwan: 24,
  constable: 22, operator: 25, sepoy: 24,
  cooker: 26, thela: 30, mudlark: 20, dhobi: 26, dabbawala: 0, bull: 40, berth: 20 };
// frame at which an attack switches from the strike to the follow-through
const ATK_RECOVER = { goonda: 9, batta: 14, masala: 12, bandar: 99, pehlwan: 16,
  cooker: 20, thela: 18, mudlark: 12, dhobi: 16, bull: 12, berth: 12 };
// below this much movement in a frame a body counts as standing still
const MOVE_EPS = 0.12;
// The states a body walks or stands its guard in (the walk cell comes from how far it moved).
const LOCO = new Set(['idle', 'approach', 'backoff', 'spawn', 'loot']);
const JUGGLE_CAP = 4;
const PARRY_CLASS = { goonda: 'counter', batta: 'unblockable', masala: 'reflect',
  bandar: 'counter', pehlwan: 'unblockable', constable: 'counter',
  operator: 'reflect', sepoy: 'counter',
  cooker: 'unblockable', thela: 'unblockable', mudlark: 'counter',
  dhobi: 'unblockable', dabbawala: 'counter', bull: 'unblockable',
  berth: 'unblockable' };

// Fresh train skins use the shared combat roles, never their legacy artwork.
for(const [key,role,hp]of [['tough','goonda',36],['bruiser','batta',50],['runner','sepoy',30],['ambusher','berth',28],['heavy','thela',70],['guard','constable',52],['bodyguard','goonda',48]]){
 TYPES['nr_'+key]={...TYPES[role],role,set:'nr_'+key,hp,h:key==='heavy'?96:86,rig:key==='heavy'?'nr_cargo':undefined};
}
// Train families each own one job and one answer; ranges are where their opening move starts.
Object.assign(TYPES.nr_runner,{speed:1.7,range:64,dmg:8,poise:0});
Object.assign(TYPES.nr_bruiser,{range:150,dmg:12});
Object.assign(TYPES.nr_heavy,{range:110,dmg:13});
Object.assign(TYPES.nr_guard,{dmg:10});
Object.assign(TYPES.nr_bodyguard,{speed:1.1,poise:1,range:38,dmg:6,canGrab:true});
// The chai wallah keeps his distance and lobs scalding chai: parry it back, or step off the puddle.
TYPES.nr_chai={...TYPES.masala,role:'masala',set:'nr_chai',hp:30,h:86,range:150,dmg:7,walkBeat:[13,8,18,9,15,17],dazeSeq:[1,2,3,2,1,2]};
// The Night Train cast: sleeper-class brawler, paan uncle, TTE, top-bunk thief, black-cat commando
// and their captain. Each keeps one job and one answer (docs/night-train.md).
for(const [key,role,hp,speed,h,extra]of [
  ['brawler','goonda',34,.95,84,{range:40,walkBeat:[3,4.5,7,6.5,4.5,6,3,3,3,3]}],
  ['paan','goonda',42,.8,80,{range:40,dmg:7,score:220}],
  ['tte','constable',72,.6,92,{poise:2,range:50,dmg:11,w:56,score:320}],
  ['rack','berth',28,1.3,82,{}],
  ['commando','goonda',46,1.3,88,{range:46,dmg:9,score:260}],
  ['captain','constable',96,.95,94,{poise:3,range:46,dmg:11,w:54,score:600}],
]) TYPES['nr_'+key]={...TYPES[role],role,set:'nr_'+key,hp,speed,h,canGrab:false,...extra};
// Chapter families share proven roles while their source art and identity remain
// separate. Their ordinary weapon strikes stay blockable like the train cast.
for(const [key,role,hp,speed,h]of [
  ['brawler','goonda',36,.95,86],['runner','sepoy',28,1.7,86],
  ['enforcer','batta',48,.82,90],['heavy','thela',66,.58,94],
  ['kitchen','cooker',34,.85,86],['docker','goonda',44,.95,90],
  ['headset','goonda',38,1,86],['operator','sepoy',32,1.6,86],
  ['thrower','operator',32,.95,86],['security','constable',54,.86,90],
  ['cabinet','thela',70,.6,92],['lead','goonda',48,1,86],
]) TYPES['ic_'+key]={...TYPES[role],role,set:'ic_'+key,hp,speed,h,
  range:['runner','operator'].includes(key)?38:TYPES[role].range,
  dmg:['runner','operator'].includes(key)?8:TYPES[role].dmg,
  rig:key==='cabinet'?'ic_cabinet':undefined};
// Dirty Delhi families run on the same one-job, one-answer move system as the train.
// Ranges are where their opening move starts; everyone in the market can be grabbed.
const DELHI_FAMILY = new Set(['ic_brawler', 'ic_runner', 'ic_enforcer', 'ic_heavy', 'ic_kitchen', 'ic_docker']);
Object.assign(TYPES.ic_brawler, { range: 42, dmg: 7 });
Object.assign(TYPES.ic_runner, { range: 64, dmg: 8, poise: 0 });   // the snatcher dodges instead of absorbing
Object.assign(TYPES.ic_enforcer, { range: 64, dmg: 10, poise: 1 });
Object.assign(TYPES.ic_heavy, { range: 166, dmg: 13, rig: 'ic_thela' });
Object.assign(TYPES.ic_kitchen, { range: 120, dmg: 10 });
Object.assign(TYPES.ic_docker, { range: 44, dmg: 9 });
for (const k of DELHI_FAMILY) TYPES[k].canGrab = true;
// Measured logical distance covered by each registered walking pose.
TYPES.ic_brawler.walkBeat = [11.14, 13.515, 2.715, 14.295, 5.08, 0.5, 6.425, 8.1, 7.591, 14.959, 7.68, 0.5];
TYPES.ic_runner.walkBeat = [6.17, 9.315, 9.1, 12.735, 3.395, 0.5, 4.73, 5.44, 9.78, 8.5, 9.845, 0.325, 0.5];
TYPES.ic_enforcer.walkBeat = [7.38, 4.375, 10.175, 11.81, 11.655, 0.5, 0.5, 8.945, 6.845, 5.98, 12.78, 5.99, 2.845, 0.5];
TYPES.ic_heavy.walkBeat = [4.53, 0.5, 6.715, 13.555, 12.545, 7.645, 5.42, 0.5, 0.5, 6.195, 9.03, 9.1, 7.03, 8.11, 0.5, 0.5];
TYPES.ic_kitchen.walkBeat = [8.95, 3.115, 14.91, 0.625, 0.5, 15.985, 1.22, 0.5, 6.88, 5.83, 15.87, 0.5, 1.825, 13.035, 3.42, 0.5];
TYPES.ic_docker.walkBeat = [1.37, 6.275, 11.75, 11.95, 6.21, 0.5, 0.5, 5.045, 4.21, 13.06, 9.8, 3.565, 8.01, 0.5];
TYPES.ic_heavy.unarmedWalkBeat = [6.435, 7.335, 4.0, 11.235, 2.795, 7.97, 2.615, 0.5, 6.405, 6.275, 9.185, 0.5, 4.015, 11.485, 0.25, 0.5];
TYPES.ic_heavy.unarmedContacts = [0, 7, 8, 15];
TYPES.ic_heavy.unarmedStarts = [[7, 8]];
Object.assign(TYPES.ic_headset,{range:42,dmg:7});
Object.assign(TYPES.ic_operator,{range:66,dmg:8,poise:0});
Object.assign(TYPES.ic_thrower,{range:145,dmg:7});
// Match the rebuilt families' physical stature; tells stay above their heads.
for(const [key,h]of [['headset',87],['operator',84],['thrower',87],['security',94],['cabinet',104],['lead',90]])TYPES['ic_'+key].h=h;
for(const key of REFUND_FAMILY)if(refundGait(key))TYPES[key].walkBeat=refundGait(key).beat;
// Ramming actors pick an edge and charge one lane.
const isRam = (e) => e.kind === 'bull' || e.ram;
// Where a pushed rig sits: the recovery agent's palms are flat on his cabinet's back face.
const rigReach = e => e.trainType === 'ic_cabinet' ? 43 : e.trainType === 'ic_heavy' ? 66 : 32;
const rigDepth = e => e.trainType === 'ic_cabinet' ? 2 : e.trainType === 'ic_heavy' ? -2 : 6;
const CARRY_LET_GO = ['down', 'getup', 'thrown', 'dying', 'stagger', 'corpse'];
const isFamily = key => !!key && (key.startsWith('nr_') || DELHI_FAMILY.has(key) || REFUND_FAMILY.has(key));
const familyAI = e => isFamily(e.trainType);
// A rig pushed in front of him: the recovery agent's cabinet, the thela-wallah's cart.
const pushes = e => !!e.rig && !e.rig.broken && (e.trainType === 'ic_cabinet' || e.trainType === 'ic_heavy' && !e.cartBroken && !e.cartReleased);
// Family moves carry their own class: plain (guard or deflect), counter/reflect (green), unblockable (red).
export const attackClass = e => familyAI(e) ? e.cls || 'counter' : e.trainType ? 'counter' : PARRY_CLASS[e.kind];
const greenClass = e => ['counter', 'reflect'].includes(attackClass(e));
const greenContact = e => GREEN_CONTACT[e.move] ?? (e.smack ? 8 : {goonda:5, constable:8, sepoy:8, masala:7, operator:7, bandar:1, mudlark:5}[e.kind] ?? 6);
const windOf = e => greenClass(e) ? greenWind(e.wind || WINDUP[e.kind] || 18, greenContact(e)) : e.wind || WINDUP[e.kind] || 18;
export const enemyCueOn = e => (e.state === 'windup' && e.t > (attackClass(e)==='unblockable'?0:windOf(e) - (greenClass(e) ? greenLead(greenContact(e)) : e.cueLead || 10)) || e.state === 'attack' && (attackClass(e)==='unblockable'||e.t < (e.cueTo || (greenClass(e) ? ({kick:16,barge:26,pounce:21}[e.move] || (e.kind==='bandar'?80:greenContact(e))) + 1 : 0)))
  || e.state === 'drop' && e.t < (e.coilT || 0)) && attackClass(e) !== 'plain';
const cueOn = enemyCueOn;
const pose = (e, name, alt) => getAIFrame(e.set._aiKey, name) ? name : alt;
const settle = (e, cd, cadenceTime = G.time) => { e.settleMove = e.move; e.recAt = e.stoodAt = G.time; e.state = 'idle'; e.t = 0; e.atkCd = cd + (cadenceTime * 7 + e.maxhp) % 40;
  // the reach his last move committed from (a taser's 170) is not how far he keeps off CHAD in his guard
  if (e.plan && e.trainType?.startsWith('nr_') && TYPES[e.trainType]) e.range = TYPES[e.trainType].range;
  if(isRefund(e))e.range=refundRestRange(e,TYPES[e.trainType].range);
  // A family that floored CHAD goes straight into its gloat rather than flashing its idle for a frame.
  if (G.player.state === 'down' && TAUNTS.has(e.trainType) && !e.taunted) {
    const gap = Math.abs(G.player.x - e.x);
    // The captain gloats from a pace off: too close, he backs away first and familyIdle starts the taunt.
    if (e.trainType === 'nr_captain' && gap < 70) { e.state = 'backoff'; e.backTo = 96; }
    else if (gap > 40 && gloatFree(e) && (e.trainType === 'nr_commando' ? floored(G.player) : e.trainType !== 'nr_captain' || G.player.z > .5 || (G.player.groundT || 0) < 8)) { e.taunted = true; e.state = 'taunt';
      if (e.trainType === 'nr_commando') e.face = Math.sign(G.player.x - e.x) || e.face; } } };
// (in a group a gloat never restarts his wait: a man whose swing was due keeps it due)
const tauntEnd = e => { const cd = e.atkCd; settle(e, 20); if (groupMates(e).length) e.atkCd = Math.min(e.atkCd, Math.max(cd, 0)); };
// Knocked off his feet he shows the fall pose from the first frame of the flight, not after 4px; a floor bounce stays flat
// (latched at the first floor contact, so the bounce never flickers fall/down; a new launch clears it).
// His everyday reach: a planned long shot (the captain's taser, 170) never leaks into where he waits.
const restRange = e => isRefund(e)?refundRestRange(e,TYPES[e.trainType].range):e.trainType?.startsWith('nr_') && TYPES[e.trainType] ? TYPES[e.trainType].range : e.range;
const aloft = e => !(e.floored || e.dead && e.koLanded) && (e.z > 4 || e.z > 0 && e.vz > 1.6);
// Families never roll dice for a decision: their waits come from the clock and their own health.
const wait = (e, lo, hi) => familyAI(e) ? lo + (G.time * 7 + e.maxhp) % (hi - lo + 1) : irand(lo, hi);
// An exact authored state, not an alias chain: the first one this family has, else the last (a fallback).
const art = (e, ...names) => names.find(n => hasAIState(e.set._aiKey, n)) || names[names.length - 1];
const lastFrame = (e, name) => (getAIFrame(e.set._aiKey, name)?.f.length || 1) - 1;

export function spawnEnemy(type, x, y) {
  const T = TYPES[type];
  y = clamp(y, laneMin(x), laneMax(x));   // a spawn lands in its lane, never a frame outside it
  const scale = diff().hp * (1 + G.stageIndex * 0.15), fam = isFamily(T.role && type), n = G.enemies.length;
  const hp = Math.round(T.hp * scale);
  const e = {
    kind: T.role || type, trainType:T.role?type:null, set: liveSet(T.set),
    x, y, z: 0, vx: 0, vy: 0, vz: 0, face: x < G.player.x ? 1 : -1,
    hp, maxhp: hp, dmg: T.dmg, score: T.score, canGrab: T.canGrab,
    poise: T.poise || 0, maxPoise: T.poise || 0,
    speed: T.speed * diff().aggro, baseSpeed: T.speed * diff().aggro, range: T.range, holdT: 0,
    // walkBeat: ground covered by each walk cell, timed to the drawn foot travel so the planted foot holds still
    walkBeat: T.walkBeat, dazeSeq: T.dazeSeq, tint: '', juggle: 0, orbit: fam ? (n & 1 ? 1 : -1) : Math.random() < 0.5 ? -1 : 1, stridePhase: 0, moved: 0,
    state: 'spawn', t: 0, targetX: arrival(x),
    atkCd: fam ? 30 + (n * 23) % 50 : irand(30, 80), rallyCd:240, dead: false, removeMe: false, flash: 0, swings: 0,
    w: T.w, h: T.h, shadowR: T.shadowR, hitLanded: false,
    offSlot: !!T.offSlot, noCount: !!T.noCount, runner: !!T.runner,
    noLane: false, ffCd: 0, pitCd: 0, rig: null, ramGone: false,
    ram: !!T.ram, perched: false, perchZ: 0, airOnly: false, throws: 0, throwCd: 60, groundT: 0,
    hurt(dmg, dir, heavy, launch) { hurtEnemy(e, dmg, dir, heavy, launch); },
    parried(dmg, dir) {
      hurtEnemy(e, dmg, dir, false, false);
      if (!e.dead) { e.state = 'stagger'; e.t = 0; e.vx = dir * 0.7; e.atkCd = 100; }
    },
    // A deflected plain strike knocks him back out of his string: a 12-tick recoil, no stagger.
    deflected(dir) {
      if (e.dead || e.superLocked || e.protectedStagger > 0 || e.state !== 'attack') return;
      e.state = 'hurt'; e.t = 0; e.vx = dir * 1.6; e.hitLanded = true; e.recoil = true;   // recoil art, not a hit reaction (familyPose)
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
    e.rig = createProp(rigKind, x + e.face * rigReach(e), y + rigDepth(e));
    if (e.trainType === 'ic_cabinet') { e.rig.scale = 1.5; e.range = 78; }  // back edge meets the palm heels; front remains the ram's reach
    if(e.trainType==='nr_heavy')carryCrate(e);
    else if(e.trainType==='ic_heavy')carryCart(e);
    else e.rig.onBreak = () => { e.ramGone = true; e.range = 40; e.rig.scale = 1; };  // wreck art stays at its native size
    G.props.push(e.rig);
  } else if (e.trainType === 'ic_heavy') { Object.assign(e, { cartBroken: true, range: 44, poise: 0, maxPoise: 0 }); cartGait(e); }
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

// A berth spot clear of the steel pillars between bays: he squats on a mattress, never on a post.
function berthX(x) {
  const post = laneAt(x)?.pillars?.find(q => Math.abs(q - x) < 28);
  return post === undefined ? x : post + (G.player.x < post ? -28 : 28);
}
function perch(e) {
  e.perched = true; e.airOnly = true; e.noLane = true;
  e.x = berthX(e.x); e.z = e.perchZ; e.vz = 0; e.vx = 0;
  e.y = laneMin(e.x) + 2;
  e.state = 'perch'; e.t = 0; e.throws = 0; e.throwCd = wait(e, 60, 120); e.perchT = 0;
}

// Off the berth and onto the floor, where he is an ordinary boy for a while.
function unperch(e) {
  e.perched = false; e.airOnly = false; e.noLane = false;
  e.groundT = 300;
}

// The smuggler's crate is the front of his sprite: it rides there, only heavies from the
// front or a thrown body crack it while carried, and a knockdown drops it on the floor.
function carryCrate(e) {
  const c = e.rig, hurt = c.hurt;
  c.hidden = c.carried = true; e.crateHits = 0;
  c.hurt = (dmg, dir, heavy, launch, body) => {
    if (!c.carried) return hurt(dmg, dir);
    if (body || heavy && (G.player.x - e.x) * e.face > 0 && ++e.crateHits >= 3) return hurt(999, dir);
    c.flash = 4; spawnSpark(c.x, c.y - 20); G.audio.sfx('armor');
  };
  c.onBreak = () => {
    c.hidden = false; addScore(200); addMeter(10);
    spawnDebris(c.x, c.y - 16, 16, ['#e8c14a', '#fff0a0', '#6fa35a']); spawnPop(c.x, c.y - 44, 'CONTRABAND!');
    if (!e.dead) loseLoad(e, false);
  };
}
// The thela-wallah's cart is his front: from behind he is in the way, not the cart. Three
// heavies or one thrown body break it, the produce spills, and he comes at you bare-handed.
function carryCart(e) {
  const c = e.rig, hurt = c.hurt;
  c.face=e.face;
  e.cartHits = 0;
  c.hurt = (dmg, dir, heavy, launch, body) => {
    if (e.dead || e.cartBroken || e.cartReleased) return hurt(dmg, dir);
    if (!body && (G.player.x - e.x) * e.face <= 0) return;
    if (body || heavy && ++e.cartHits >= 3) return hurt(999, dir);
    c.flash = 4; c.shakeT = 6; spawnSpark(c.x, c.y - 24); G.audio.sfx('armor');
  };
  c.onBreak = () => {
    if (e.dead) return;
    Object.assign(e, { cartBroken: true, range: 44, poise: 0, maxPoise: 0, baseSpeed: 1.0 * diff().aggro });
    cartGait(e);
    if (!e.cartReleased) e.rageDue = true;
    spawnDebris(c.x, c.y - 16, 14, ['#e0a030', '#6fa35a', '#d84a2a']); spawnPop(c.x, c.y - 50, 'SPILLED!');
  };
}
// Knocked away from his handles, the porter leaves the intact cart where it stood.
// It becomes an ordinary breakable; he finishes the fight without fetching it.
function releaseCart(e) {
  if (!pushes(e) || e.trainType !== 'ic_heavy') return;
  Object.assign(e, { cartReleased: true, rageDue: true, range: 44, poise: 0, maxPoise: 0, baseSpeed: 1.0 * diff().aggro });
  cartGait(e);
}
function cartGait(e) {
  const b = TYPES.ic_heavy.unarmedWalkBeat;
  if (!b) return;
  e.walkBeat = b; e.walkK = 1;
  e.walkPos = cellPos(b, 0, TYPES.ic_heavy.unarmedStarts[0][1]) + 1e-6;
}
// Trunk or crate gone: a quicker, lighter brawler for the rest of his life.
function loseLoad(e, dropped) {
  if (e.unarmed) return;
  e.unarmed = true; e.range = 40; e.baseSpeed = (e.trainType === 'nr_heavy' ? 1.05 : 1) * diff().aggro;
  if (e.trainType === 'nr_heavy') {
    Object.assign(e, { ramGone: true, set: SPR.nr_heavy_unarmed, poise: 0, maxPoise: 0, dmg: 8, rageDue: true });
    const c = e.rig;
    if (dropped && c && !c.broken) Object.assign(c, { carried: false, hidden: false, dead: false, x: e.x + e.face * 14, y: e.y + 2 });
  } else {
    e.set = SPR.nr_bruiser_unarmed; e.altSet = SPR.nr_bruiser;
    if (dropped) G.props.push(createProp('nr_trunk', e.x + e.face * 14, e.y + 2));
  }
}
// Floored: loads fall where he lands and a stolen pickup goes back on the floor.
function knocked(e) {
  if (['nr_heavy', 'nr_bruiser'].includes(e.trainType)) loseLoad(e, true);
  if (e.trainType === 'ic_heavy') releaseCart(e);
  if (e.carry) { G.pickups.push({ ...e.carry, x: e.x, y: e.y, t: 0 }); e.carry = null; }
  if (e.chain) { addMeter(e.chain); e.chain = 0; spawnPop(e.x, e.y - 62, 'CHAIN BACK!'); G.audio.sfx('pickup'); }
}

function hurtEnemy(e, dmg, dir, heavy, launch) {
  if (e.dead || e.state === 'thrown' || (e.superLocked && !e.superApplying)) return;
  e.recoil = false;
  const free = !(e.protectedStagger > 0) && !e.superApplying, t = e.trainType;
  if(refundShield(e,dir,heavy,launch,free))return;
  if (t === 'nr_runner' && e.state === 'dodge') return;
  // The bodyguard reads a mashed string: three quick lights, and he slips the fourth.
  if (t === 'nr_bodyguard' && free) {
    if (e.state === 'slip') return;
    if (heavy || launch) e.lightN = 0;
    else if (!['stagger', 'down', 'grabbed', 'getup'].includes(e.state)) {
      e.lightN = G.time - (e.lightT ?? -99) < 40 ? (e.lightN || 0) + 1 : 1; e.lightT = G.time;
      if (e.lightN >= 4) { e.lightN = 0; e.state = 'slip'; e.t = 0; e.vx = 0; e.face = dir === 0 ? e.face : -dir; G.audio.sfx('whiff'); return; }
    }
  }
  if(free&&['nr_guard','ic_security'].includes(t)&&!heavy&&!launch&&dir===-e.face&&!(e.blockCd>0)&&!(e.gbT>0)&&['idle','approach','windup'].includes(e.state)){
    e.blockCd=150;e.state='block';e.t=0;G.audio.sfx('armor');spawnSpark(e.x+e.face*12,e.y-52);return;
  }
  // The TTE's trunk and the captain's riot shield stop every light hit from the front.
  const shield=['nr_tte','nr_captain'].includes(t);
  // The captain walks in behind his shield, and it stays up through the shield bash he answers a mashed string with.
  const capGuard=t==='nr_captain'&&(e.state==='spawn'||e.state==='windup'&&e.move==='bash'&&G.time-(e.riposteAt??-99)<20);
  if(free&&shield&&!heavy&&!launch&&dir===-e.face&&!(e.gbT>0)&&!tteLoose(e)&&(capGuard||['idle','approach','block','backoff'].includes(e.state))){
    G.audio.sfx('armor');spawnSpark(e.x+e.face*(t==='nr_captain'?30:16),e.y-50);G.hitstop=Math.max(G.hitstop,3);
    if(capGuard&&e.state==='windup')return;
    // A mashed string into his shield earns the green shield bash straight back: parry it, or stop and go round him.
    if(t==='nr_captain'){e.blockN=G.time-(e.blockT??-99)<30?(e.blockN||0)+1:1;e.blockT=G.time;
      if(e.blockN>=2&&e.state!=='spawn'){e.blockN=0;familyMove(e,'bash');e.state='windup';e.t=0;e.vx=0;e.face=-dir;e.riposteAt=G.swingAt=G.time;return;}}
    if(e.state==='spawn')return;
    e.state='block';e.t=0;e.vx=dir*.6;return;
  }
  // Mid-chew, the paan uncle takes the hit on his forearm without flinching (block pose), then puffs up to spit.
  if(free&&t==='nr_paan'&&['chew','absorb'].includes(e.state)&&!launch){
    e.hp-=Math.min(dmg,e.hp-1);e.flash=5;G.hitstop=Math.max(G.hitstop,3);spawnSpark(e.x+e.face*10,e.y-50);
    e.face=dir===0?e.face:-dir;if(e.state==='chew'){e.state='absorb';e.t=0;}G.audio.sfx('armor');return;
  }
  // Freshly hit, he does not reach for the paan box straight away: the chew is a tell, never a trap mid-combo.
  if(t==='nr_paan')e.chewCd=Math.max(e.chewCd||0,60);
  // The constable's answer: a heavy, or anything from behind, knocks the lathi guard open.
  const guardBreak = ['nr_guard', 'nr_tte', 'nr_captain', 'ic_security'].includes(t) && free && !(e.gbT > 0) && !launch && (heavy || dir === e.face) && ['idle', 'approach', 'windup', 'block'].includes(e.state);
  // (a blow that kills him outright is a KO, not a guard break: no pop over the score)
  if (guardBreak) { e.gbT = 50; e.poise = 0; if (e.hp > Math.round(dmg * 1.5)) spawnPop(e.x, e.y - e.h - 6, 'GUARD BREAK'); G.audio.sfx('armor'); }
  if (e.gbT > 0 || t === 'ic_enforcer' && e.state === 'stuck') dmg = Math.round(dmg * 1.5);
  // A wedged bat or a jammed cart holds him there through light hits: that is the punish.
  const wedged = (DELHI_FAMILY.has(t)||t==='ic_cabinet') && e.state === 'stuck' && !heavy && !launch;
  // The chain-snatcher hops clear of a lazy jab, then comes straight back in: commit or go heavy.
  const opener = t !== 'nr_runner' || G.player.state === 'attack' && G.player.combo === 0;
  if(['ic_runner','nr_runner'].includes(t)&&opener&&free&&!heavy&&!launch&&!(e.dodgeCd>0)&&['idle','approach'].includes(e.state)&&e.z<=0){
    const hop=t==='nr_runner'?[1.8,1.5]:[3.2,2.4];
    e.dodgeCd=240;e.state='dodge';e.t=0;e.face=dir===0?e.face:-dir;e.vx=(dir||-e.face)*hop[0];e.vz=hop[1];e.z=.1;G.audio.sfx('whiff');spawnDust(e.x,e.y,2);return;
  }
  // a hit on the berth: light ones rock him, heavy ones knock him off it
  // Knocked off, he tumbles out over the aisle rather than down the back of the lower berth.
  const offBerth = e.perched && (heavy || launch || dmg >= e.hp);
  if (offBerth) { unperch(e); e.fallY = clamp(G.player.y, laneMin(e.x) + 12, laneMax(e.x) - 4); }
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
  if (['nr_guard', 'nr_commando', 'nr_captain'].includes(t) && !e.called && e.hp > 0 && e.hp < e.maxhp * (t === 'nr_captain' ? .5 : .6)
    && (t !== 'nr_commando' || partnerOf(e) && !G.enemies.some(o => o.trainType === 'nr_commando' && o.called))) e.called = e.wantCall = true;   // (a lone commando has nobody to radio)
  // Black-cat pairs cover each other: hit one and his partner steps straight in.
  if (t === 'nr_commando' && e.hp > 0) for (const o of G.enemies) if (o !== e && !o.dead && o.trainType === 'nr_commando' && o.state === 'idle') { o.atkCd = Math.min(o.atkCd, 8); break; }
  // The attacker owns contact audio. The old "hurt voices" were extra hit
  // impacts, which randomly doubled each strike and grew noisy in crowds.
  if(e.hp<=0&&e.superLocked){e.hp=1;e.pendingSuperDefeat=true;return;}
  if (e.hp <= 0) {
    e.dead = true;
    knocked(e);
    spawnDefeatFX(e,dir,heavy,launch);
    e.state = 'dying'; e.t = 0; e.floored = false;
    e.vx = dir * 3.2; e.vz = 4.0; e.z = Math.max(e.z, 0.1);
    addScore(e.score);
    if (G.stats) G.stats.kos++;if(G.grading)G.grading.knockouts++;
    spawnPop(e.x, e.y - 70, '+' + e.score);
    if (e.kind !== 'prop') G.audio.sfx(Math.random() < 0.5 ? 'edie1' : 'edie2');
    impact(true); screenFlash();
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
    // The dhaba cook's vent is telegraphed: a red ring for half a second, then the burst.
    if (t === 'ic_kitchen') e.ventT = 30;
    else if (e.kind === 'cooker') {
      spawnZone('fire', e.x, e.y, 34, 90);
      tryHitLane({ x: e.x, y: e.y, z: e.z, face: 0 }, 14, 70, true, 22);
      G.shake = Math.max(G.shake, 6);
      G.audio.sfx('heavy');
    }
  } else if(e.superLocked || e.protectedStagger>0){e.state='stagger';e.vx=0;if(e.superLocked||!(e.z>0)||e.perched){e.vz=0;e.z=0;}   // a parried leaper keeps falling
  } else if (guardBreak) { e.state = 'guardbreak'; e.t = 0; e.vx = dir * 1.2; if (t === 'nr_tte') knockTrunk(e, dir);
  } else if (launch || heavy || e.state === 'attack' && e.z > 4) {   // swatted out of a leap, he comes down in a heap
    knocked(e);
    const wasAir = airborne(e);
    if (!wasAir) e.juggle = 0;
    e.state = 'down'; e.t = 0; e.hitLanded = false; e.floored = false;
    // A launched body already in the air gets popped up again rather than reset,
    // which is what makes a juggle read as one continuous move - until the cap,
    // after which hits still land but stop lifting, so the body drops out.
    e.vx = dir * 2.4;
    if (wasAir) { if (e.juggle < JUGGLE_CAP) e.vz = Math.max(e.vz, 0) + 2.2; }
    else e.vz = 3.6;
    e.z = Math.max(e.z, 0.1);
  } else if (!wedged) {
    if (e.state === 'pickup') dropPickup(e);
    if (t === 'nr_tte' && tteWaitHit(e)) e.flash = 5;   // kept off his trunk and hit again: he barges instead of flinching
    else { e.state = 'hurt'; e.t = 0; e.hurtN = (e.hurtN || 0) + 1; e.hurtTuck = e.gbT > 0; e.hitBack = dir === e.face; e.vx = dir * 1.3; }
  }
  if (offBerth) { e.vz = Math.min(e.vz, 1.2); e.vx = clamp(e.vx, -1.4, 1.4); }   // he tips off the bunk edge and drops
  if (e.state !== 'grabhold' && G.player.grabbedBy === e) {
    G.player.grabbedBy = null; G.player.mash = 0;
    G.player.state = 'idle'; G.player.t = 0;
  }
}

function throwEnemy(e, dir) {
  if(e.superLocked)return;
  rewardAttack(G.player,'grab',6);
  knocked(e); e.lightN = 0;
  e.bossCollision=false;
  e.state = 'thrown'; e.t = 0; e.floored = false;
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
  e.t = 0; e.floored = false;
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
// Walk-ons stop on their own side of CHAD, never on top of him or through him.
function arrival(x) {
  const side = x < G.player.x ? -1 : 1, t = x - side * 70;
  return clamp(side * (t - G.player.x) < 36 ? G.player.x + side * 36 : t, G.camX + 24, G.camX + W - 24);
}
// A Delhi family waiting on CHAD's side keeps a body apart from the man in front of him (nearer CHAD), stepping
// back out of him (never past the arena or screen edge), so two never idle merged into one silhouette.
// (a shortfall under half a step is left alone unless he is already stepping: no glide on a held cell)
// crowdOf: the body standing in his (in front of him only, unless `any`), or anyone taking his turn (approach,
// windup, attack) through his cell from either side, whose telegraph he would hide; a crowded man also never
// starts a gloat.
const TURN = ['approach', 'windup', 'attack'];
function crowdOf(e, p, any = false) {
  const side = Math.sign(e.x - p.x) || -e.face, d = Math.abs(e.x - p.x), i = G.enemies.indexOf(e);
  return G.enemies.find((o, j) => o !== e && !o.dead && !o.dying && !o.removeMe && (o.z || 0) < 12 && !o.offSlot
    && !['down', 'thrown', 'getup', 'grabbed', 'dying', 'spawn'].includes(o.state)
    && Math.abs(o.x - e.x) < CROWD_DX && Math.abs(o.y - e.y) < 16
    && (TURN.includes(o.state) || Math.sign(o.x - p.x) === side && (any || Math.abs(o.x - p.x) < d || Math.abs(o.x - p.x) === d && j < i)));
}
const CROWD_DX = 38;
// A waiting man in someone's way steps back from CHAD out of him (unless the man is behind him, walking in for
// his turn, or the arena edge is at his back), and while they share a depth he also takes the other lane of his
// orbit, away from the man, so an attacker's wind-up is never hidden inside a waiting body (two men waiting at the
// same end of the floor would otherwise settle on one lane). Deterministic: no combat RNG.
function crowdStep(e, p, stepX = true) {
  const side = Math.sign(e.x - p.x) || -e.face, o = crowdOf(e, p);
  if (!o) return;
  const need = CROWD_DX - Math.abs(o.x - e.x), bx = e.x + side * e.speed * 0.5;
  const behind = Math.abs(o.x - p.x) > Math.abs(e.x - p.x) || Math.sign(o.x - p.x) !== side;
  const room = bx > Math.max(arenaMin(), G.camX) + 20 && bx < Math.min(arenaMax(), G.camX + W) - 20;
  if (stepX && !behind && room && (need >= 4 || e.walking || !WALK_BEATS[e.trainType])) e.x = bx;
  if (Math.abs(o.y - e.y) < 12) {
    const away = e.y < o.y || e.y === o.y && G.enemies.indexOf(e) < G.enemies.indexOf(o) ? -1 : 1;
    // (the far lane only if it is really off his: at the floor's edge both orbits can clamp to one depth)
    const lane = y => clamp(p.y + away * 16, laneMin(e.x), laneMax(e.x));
    if (e.orbit !== away && Math.abs(lane() - o.y) >= 10) e.orbit = away;
  }
}
function slotsUsed() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead && !e.offSlot && (['windup','attack','drop','rally'].includes(e.state))) n++;
  return n;
}
function slotCap() {
  if (G.boss&&!G.boss.dead&&!G.boss.trainWaiting) return 1;
  if(G.stage?.id==='refund')return 2;
  let n = 0;
  for (const e of G.enemies) if (!e.dead && !e.offSlot && e.state !== 'dying') n++;
  return n >= 5 ? 3 : 2;
}
// Swings start a beat apart, so two attackers never land one flat squeeze.
const swingReady = () => { const d = G.time - (G.swingAt ?? -99); return d > 16 || d < 0; };

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
    // An invulnerable or super-locked CHAD takes nothing (hurtPlayer ignores it), so no spark or impact sound either.
    const immune = p.invuln > 0 || p.state === 'special' || G.state !== 'play';
    hurtPlayer(p, dmg, e.face, heavy);
    if (immune) return true;
    // the spark sits where the blow lands: a move can name its contact height ('none': the move draws its own contact)
    if (sound !== 'none') { spawnSpark(p.x, p.y - (e.contactY ?? 48)); G.audio.sfx(sound || (heavy ? 'heavy' : 'punch')); }
    return true;
  }
  return false;
}

// The macaque robs the floor: if a pickup is closer than the player, go take it.
// Not the 1-up: there is one in the level, and losing it to an RNG roll is a tax,
// not a decision.
function nearestPickup(e, bd = 150) {
  let best = null;
  for (const q of G.pickups) {
    if (q.kind === 'life' || q.kind === 'bribe') continue;
    const d = Math.abs(q.x - e.x);
    if (d < bd) { bd = d; best = q; }
  }
  return best;
}

// ---- FAMILIES: one job and one answer each, on the Night Train and in Dirty Delhi ----
// [class, windup]: plain is guarded or deflected, counter/reflect parry green, unblockable is red.
const MOVES = { string: ['plain', 18], jab: ['plain', 14], hook: ['counter', 10], grab: ['unblockable', 16],
  dash: ['counter', 20], swing: ['counter', 20], lathi: ['counter', 26], punch: ['counter', 22], smash: ['counter', 16],
  hurl: ['reflect', 26], ram: ['unblockable', 24], cram: ['unblockable', 34], lob: ['reflect', 22],
  // Night Train: brawler, chai wallah, paan uncle, TTE, top-bunk thief, commando, captain
  push: ['unblockable', 16], boxjab: ['counter', 18], fkick: ['counter', 18], bonk: ['counter', 16], spit: ['unblockable', 24],
  bump: ['unblockable', 22], tslam: ['counter', 26], tbarge: ['unblockable', 14], pounce: ['counter', 18], baton: ['plain', 16],
  lunge: ['counter', 18], sweep: ['unblockable', 22], bash: ['counter', 18], taser: ['unblockable', 34], charge: ['unblockable', 26],
  // Dirty Delhi: tout, snatcher, cricketer, thela-wallah, dhaba cook, dock crew
  backgrab: ['unblockable', 12], kick: ['counter', 18], drive: ['counter', 26], slam: ['unblockable', 30],
  shove: ['counter', 16], barge: ['counter', 22], jet: ['unblockable', 48], ladle: ['counter', 16],
  toss: ['reflect', 20], wrench: ['counter', 20], ...REFUND_MOVES };
export const FAMILY_MOVES = MOVES;
// Where each blow lands on CHAD (px above his feet) for the hit spark; unlisted moves use the belt.
const CONTACT_Y = { boxjab: 70, string: 70, jab: 70, hook: 70, push: 60, fkick: 42, bonk: 62, lunge: 62, sweep: 12 };
// Families that gloat over a floored CHAD; the snatcher saves his for the chain.
// A black-cat commando gloats only over CHAD landed and still (two ticks down, not sliding), from beyond 40px, facing where he lies.
const floored = p => !inAir(p) && (p.groundT || 0) >= 2;
const TAUNTS = new Set(['nr_brawler', 'nr_paan', 'nr_tte', 'nr_rack', 'nr_commando', 'nr_captain', 'ic_brawler', 'ic_enforcer', 'ic_heavy', 'ic_kitchen', 'ic_docker']);
const TOOTS = [6, 22, 38];   // the cooker's three whistles, inside its 48-frame windup
// In the Dredger's machine phase his crew only throw: a parried wrench flies on into the cab glass.
const crewThrows = e => e.dredgerCrew && G.boss?.phase === 'machine' && !G.boss.dead;
function familyMove(e, move) {
  const d = Math.abs(G.player.x - e.x), t = e.trainType;
  const n = e.swings || 0;
  if(isRefund(e)){
    move=move||refundMove(e);e.move=move;[e.cls,e.wind]=MOVES[move];e.cueTo=0;e.cueLead=e.wind;return;
  }
  // Every other time the paan uncle closes in, he stops to work his paan instead of swinging.
  if (!move && t === 'nr_paan' && !(e.chewCd > 0) && n % 2 === 0) { e.swings = n + 1; e.state = 'chew'; e.t = 0; e.chewCd = 300; return; }
  move ||= t === 'nr_brawler' ? (e.guardWatch > 40 ? 'push' : n % 3 === 2 ? 'fkick' : 'string')
    : t === 'nr_chai' && d < 48 ? 'bonk' : t === 'nr_paan' ? 'boxjab'
    : t === 'nr_captain' && e.plan === 'charge' && d < 70 ? 'bash'   // too close to run: the shield goes straight in
    : ['nr_tte', 'nr_rack', 'nr_commando', 'nr_captain'].includes(t) && e.plan ? e.plan
    : t === 'nr_runner' ? 'dash'
    : t === 'nr_bruiser' ? (e.unarmed ? 'punch' : d < 70 ? 'ram' : 'hurl') : t === 'nr_chai' ? 'lob'
    : t === 'nr_rack' ? 'swing' : t === 'nr_heavy' ? (e.unarmed ? 'smash' : 'cram') : t === 'nr_guard' ? 'lathi'
    : t === 'ic_brawler' ? 'string' : t === 'ic_runner' ? 'kick' : t === 'ic_enforcer' ? e.plan || 'drive'
    : t === 'ic_heavy' ? (pushes(e) ? 'cram' : e.swings % 2 ? 'barge' : 'shove')
    : t === 'ic_kitchen' ? (d < 45 ? 'ladle' : 'jet') : t === 'ic_docker' ? (d > 75 || crewThrows(e) ? 'toss' : 'wrench') : 'jab';
  e.move = move; [e.cls, e.wind] = MOVES[move]; e.cueTo = 0; e.cueLead = move === 'spit' ? 14 : 0;
  if (t?.startsWith('nr_')) e.swings = n + 1;
}
// Where a Delhi family commits from is decided as it leaves the queue.
function familyPlan(e, p) {
  if(isRefund(e)){refundPlan(e,p);return;}
  const gap = Math.abs(p.x - e.x), t = e.trainType;
  // Every third ball, or CHAD standing off: the run-up and the overhead slam.
  if (t === 'ic_enforcer') { e.plan = gap > 90 || e.swings % 3 === 2 ? 'slam' : 'drive'; e.range = e.plan === 'slam' ? 180 : 64; }
  if (t === 'ic_docker') e.range = gap > 90 || crewThrows(e) ? 118 : 44;
  // Night Train: the move is chosen as he leaves the queue, and it sets where he commits from.
  const n = e.swings || 0, R = { taser: 170, charge: 150, bash: 46, pounce: 96, swing: 44, lunge: 72, baton: 46, sweep: 50, bump: 64, tslam: 40 };
  if (t === 'nr_captain') e.plan = n % 3 === 0 && gap > 80 ? 'taser' : n % 3 === 1 && gap >= 70 ? 'charge' : 'bash';
  if (t === 'nr_rack') e.plan = n % 2 ? 'swing' : 'pounce';
  if (t === 'nr_commando') e.plan = n % 3 === 2 ? 'sweep' : n % 3 === 1 ? 'lunge' : 'baton';
  if (t === 'nr_tte') e.plan = n % 2 ? 'tslam' : 'bump';
  if (e.plan && R[e.plan] && t?.startsWith('nr_')) e.range = R[e.plan];
}
// The tout watches CHAD's back: swing at somebody else with him behind you and he takes hold.
function backGrabReady(e, p) {
  return !(e.grabCd > 0) && ['attack', 'grabbing'].includes(p.state) && (e.x - p.x) * p.face < 0 && Math.abs(e.x - p.x) < 40
    && Math.abs(e.y - p.y) < 14 && p.z < 12 && !p.grabbedBy && !p.dying && slotsUsed() < slotCap() && swingReady();
}
// River crew pull a cargo chock when CHAD is standing in its slide.
function chockPull(e, p) {
  if (e.dredgerCrew || e.chockCd > 0) return false;
  const c = G.props.find(q => q.prop === 'ic_cargo' && !q.broken && Math.abs(q.x - e.x) < 60);
  if (!c || !inCargoPath(c, p) || !pullChock(c, true)) return false;
  e.chock = c; e.chockCd = 600; e.state = 'lever'; e.t = 0; e.face = c.x < e.x ? -1 : 1;
  return true;
}
// The partner a hurt commando radios (and who covers him).
const partnerOf = e => G.enemies.find(o => o !== e && !o.dead && o.trainType === 'nr_commando'
  && !['down', 'getup', 'dying', 'thrown', 'stagger'].includes(o.state));
// The black-cat group (commandos and their captain) share CHAD by slots. Each takes a side: his own, or with a
// comrade before him on it, the far side when it is free and on screen. Two on one side split the floor: the man whose
// turn is next holds the attack lane (CHAD's, 8px off towards the near edge), the rest wait 40px apart on the far edge
// (27px+ off it), and anyone going round CHAD walks that far edge too - so nobody ever walks through a comrade.
// Turns alternate on a side: the man who swung longest ago goes next. In his slot he stands (a 12px dead-band).
const GROUP = new Set(['nr_commando', 'nr_captain']), ACTIVE = ['approach', 'windup', 'attack'], HOLD = [...ACTIVE, 'backoff', 'coverstep'];   // (a gloater never holds the turn: he goes to the back of the order)
const groupMates = e => GROUP.has(e.trainType) ? G.enemies.filter(o => o !== e && GROUP.has(o.trainType) && !o.dead && !o.removeMe && o.state !== 'dying') : [];
const sideOf = (x, p) => Math.sign(x - p.x) || 1;
const onFloor = x => x > G.camX + 24 && x < G.camX + W - 24;
// (a step of u from x: on the floor, or at least no further off it - a man pinned by the wall may always step in off it)
const inward = (x, u) => onFloor(x + u) || Math.abs(x + u - G.camX - W / 2) < Math.abs(x - G.camX - W / 2);
// The far edge of the floor from CHAD (-1 top, 1 bottom; kept through a 2px wobble about mid-floor) and the attack lane.
let farEdge = 1;
function lanes(x, p) {
  const lo = laneMin(x), hi = laneMax(x), mid = (lo + hi) / 2;
  if (Math.abs(p.y - mid) > 2) farEdge = p.y > mid ? -1 : 1;
  return { A: farEdge < 0 ? lo : hi, B: clamp(p.y - farEdge * 8, lo, hi), dir: farEdge };
}
// o before e in the turn order on a side: one walking in, swinging, backing off or gloating first; then who swung longest ago; then the nearer.
const turnKey = o => HOLD.includes(o.state) ? -2e9 : o.swungAt ?? -1e9;
// (level on that, the one nearer the attack lane, then the nearer CHAD)
// (but a man still more than 90px short of his attack slot never takes the turn over one waiting in place - unless he has gone
// 240 ticks without a swing: then he is next wherever he waits, and walks in)
const due = o => G.time - (o.swungAt ?? o.groupSince ?? G.time) > 240, nearSlot = (o, p) => Math.abs(o.x - p.x) < 142 || due(o);
// One gloater at a time, with 30px along and 40px across clear of a standing comrade.
// (nor the man whose swing is next and ready: he uses CHAD's time on the floor to walk to his slot; nor one standing in that
// man's lane between him and CHAD - he clears it first)
const gloatFree = e => { if (!GROUP.has(e.trainType)) return true;
  const m = groupMates(e), p = G.player, next = o => o.atkCd <= 0 && o.slot?.first;
  return !(next(e) && m.length) && !m.some(o => o.state === 'taunt' || Math.abs(o.x - e.x) < 30 && Math.abs(o.y - e.y) < 40
    || next(o) && sideOf(o.x, p) === sideOf(e.x, p) && Math.abs(o.x - p.x) > Math.abs(e.x - p.x) && Math.abs(e.y - o.slot.y) < 27); };
const before = (o, e, p) => { if (!HOLD.includes(o.state) && !HOLD.includes(e.state) && nearSlot(o, p) !== nearSlot(e, p)) return nearSlot(o, p);
  if (turnKey(o) !== turnKey(e)) return turnKey(o) < turnKey(e);
  const B = lanes(e.x, p).B, ly = Math.abs(o.y - B) - Math.abs(e.y - B), lx = Math.abs(o.x - p.x) - Math.abs(e.x - p.x);
  return Math.abs(ly) > 8 ? ly < 0 : Math.abs(lx) > 2 ? lx < 0 : G.enemies.indexOf(o) < G.enemies.indexOf(e); };
const sideMates = (s, p, mates) => mates.filter(o => sideOf(o.x, p) === s && !o.crossing);
// After two ticks holding a planted step, show two actual guard ticks before
// restarting a stride or committing a windup. A facing change starts a new stand.
const groupGuardReady = e => e.walking || G.time - (e.stoodAt ?? -99) >= (e.locoAt === e.stoodAt - 1 && e.locoPose?.face === e.face ? 4 : 2);
// His turn on his side: first in its order, nobody there busy, nobody of the group still going round CHAD onto it, the attack
// lane clear in front of him (and he on it), and no red sweep of theirs out close by.
function groupTurn(e, p, mates) {
  // (nor while stepping back: he stands before he walks in, so his stride is never turned round)
  if (!groupGuardReady(e) || e.yieldTo != null || e.crossing || Math.abs(e.x - p.x) < 30 || e.walking && e.lastDx === sideOf(e.x, p)) return false;
  const s = sideOf(e.x, p), d = Math.abs(e.x - p.x), side = sideMates(s, p, mates);
  // (a comrade still going round CHAD never holds the turn up: he walks the far lane, clear of the attack lane)
  if (mates.some(o => ['windup', 'attack'].includes(o.state) && attackClass(o) === 'unblockable' && Math.abs(o.x - e.x) < 110)) return false;
  if (!side.length) return true;
  const { B } = lanes(e.x, p);
  // (the man whose turn it is held up 60 ticks by him standing in the attack lane between him and CHAD: he takes the turn himself)
  // (so too when he, next in turn, has been 60 ticks getting into the attack lane from the far one: the man in the lane takes it)
  if (Math.abs(e.y - B) < 14 && side.some(o => o.laneBlk > 60 && (Math.abs(o.x - p.x) > d || Math.abs(o.y - B) > 4))) return true;
  // (kept waiting 90 ticks past his turn, he no longer waits on the order: the next man in place takes it - see groupSlot)
  // (never past a man ready before him, though)
  if (side.some(o => HOLD.includes(o.state) || !(e.atkCd <= -90 && o.atkCd > 0) && before(o, e, p))) return false;
  // (his lane clear between him and CHAD: a comrade waiting behind him never holds him up)
  const held = side.some(o => Math.abs(o.x - p.x) < d && Math.abs(o.y - B) < 27);
  return Math.abs(e.y - B) <= 4 && !held;
}
// Where he waits: {s: side, lo/hi: his distance band from CHAD along the carriage, y: his lane, k: his place in the turn order}.
function groupSlot(e, p, mates) {
  const own = sideOf(e.x, p);
  if (e.yieldTo != null && (!onFloor(e.yieldTo) || sideOf(e.yieldTo, p) !== own || Math.abs(e.yieldTo - p.x) < 30)) e.yieldTo = null;
  let s = e.crossing && e.slotSide ? e.slotSide : own;
  const farLo = clamp(own > 0 ? p.x - G.camX - 30 : G.camX + W - 30 - p.x, 36, 52);   // (by the carriage end the far slot is nearer CHAD, 36px at least)
  // (a comrade already going round to the far side has it: he never makes a second, longer trip round CHAD)
  // (nor while a comrade stands in the far lane between him and CHAD - he would only be stopped behind him - or just after a trip
  // round was blocked)
  const L0 = lanes(e.x, p), d0 = Math.abs(e.x - p.x);
  if (!e.crossing && sideMates(own, p, mates).some(o => before(o, e, p)) && !mates.some(o => (o.crossing ? o.slotSide : sideOf(o.x, p)) === -own) && onFloor(p.x - own * farLo)
    && !(G.time < (e.noCross ?? -1)) && !sideMates(own, p, mates).some(o => Math.abs(o.x - p.x) < d0 && Math.abs(o.y - L0.A) < 27)) s = -own;
  // (CHAD by the carriage end with no room for a man on this side of him: he waits on the other)
  if (!e.crossing && s === own && !onFloor(p.x + own * 36) && onFloor(p.x - own * 36)) s = -own;
  // (nor room behind the man next in turn for a waiter, 92px off CHAD: a waiter there goes round to the other side, if it has the room)
  if (!e.crossing && s === own && !onFloor(p.x + own * 88) && onFloor(p.x - own * 92) && sideMates(own, p, mates).some(o => before(o, e, p)) && !(G.time < (e.noCross ?? -1))) s = -own;
  // Finish clearing a ready comrade's attack corridor before changing bands or
  // walking round CHAD. Reassigning midway can send both men back into it.
  e.yielding = e.yieldTo != null || !e.crossing && !HOLD.includes(e.state) && Math.abs(e.y - L0.B) < 27 && sideMates(own, p, mates).some(o => o.atkCd <= 0 && !HOLD.includes(o.state) && before(o, e, p) && Math.abs(o.x - p.x) > d0);
  if (e.yielding) s = own;
  // (a comrade going round CHAD by him splits the floor too: he walks its far edge, so this man takes the attack lane)
  // (kept waiting 90 ticks past his turn within 90px of his attack slot, he makes for the attack lane himself - unless a comrade is
  // already walking in on it)
  // (of several kept waiting so, only the first in the order does: the others keep their places behind him)
  const sm = sideMates(s, p, mates), late = o => o.atkCd <= -90 && nearSlot(o, p);
  const k = late(e) && !sm.some(o => HOLD.includes(o.state) || o.atkCd <= 0 && before(o, e, p)) ? 0 : sm.filter(o => before(o, e, p)).length, L = lanes(e.x, p), split = mates.some(o => sideOf(o.x, p) === s);
  // (waiting on the far lane, his place along it goes by who stands nearer CHAD, not by the turn order: no two waiters swap
  // places down one lane - only the man next in turn walks to the front)
  let kk = k;
  if (k >= 1) { const q = [e, ...sm], first = q.find(a => !q.some(o => o !== a && before(o, a, p)));
    kk = 1 + sm.filter(o => o !== first && Math.abs(o.x - p.x) < d0).length; }
  const lo = s !== own ? farLo : 52 + 40 * kk;
  // (next in turn, he keeps the far lane while a comrade stands in the attack lane within 30px of CHAD: dropping in behind him
  // would pen that man against CHAD)
  const wa = !k && split && s === own && Math.abs(e.y - L.B) > 4 && sm.some(o => !HOLD.includes(o.state) && Math.abs(o.y - L.B) < 14 && Math.abs(o.x - p.x) < 30);
  const y = !split ? clamp(p.y, laneMin(e.x), laneMax(e.x)) : k || wa ? L.A : L.B;
  // (the man next in turn - first in the order, or first behind the man swinging - waits close in, 24px of band: he takes
  // his turn the moment it comes)
  const next = s === own && (k === 0 || k === 1 && sm.some(o => ['windup', 'attack'].includes(o.state)));
  return { s, lo, hi: next ? lo + 24 : Math.max(lo + 40, 140), y, k, split, L, first: !sm.some(o => !HOLD.includes(o.state) && before(o, e, p)) };
}
// Apart: how far outside the stacked box (38px along the carriage, 27px across it) he is from his nearest comrade.
const apart = (x, y, mates) => Math.min(1e9, ...mates.map(o => Math.max(Math.abs(x - o.x) - 38, Math.abs(y - o.y) - 27)));
// Walking on one of his planted cells (both boots down).
function onPlanted(e) {
  const g = gaitOf(e);
  return !!g && e.walking && !sideStepping(e) && g.C.includes(beatAt(g.b, e[g.key] || 0)[0]);
}
// Ground left to his next planted cell, walking on the way he goes (0 on one).
function toPlant(e) {
  const g = gaitOf(e);
  if (!g || !e.walking || sideStepping(e)) return 0;
  const { b, key, C } = g, n = b.length, [i, u] = beatAt(b, e[key] || 0);
  if (C.includes(i)) return 0;
  const s = key !== 'walkPos' ? 1 : e.lastDx ? e.lastDx * e.face : e.backstep ? -1 : 1;
  let d = (s > 0 ? b[i] - u : u) + .5, j = i;
  while (!C.includes(j = (j + s + n) % n)) d += b[j];
  return d;
}
// A step of mx along the carriage, with the rest of his stride to its planted cell (he finishes it if stopped after it).
function ahead(e, mx) {
  const g = gaitOf(e);
  if (!mx || !g || g.key !== 'walkPos' || sideStepping(e)) return mx;
  const { b, C } = g, n = b.length, [i, u] = beatAt(b, (e.walkPos || 0) + mx * e.face), s = Math.sign(mx) * e.face;
  if (C.includes(i)) return mx;
  let d = s > 0 ? b[i] - u : u, j = i;
  while (!C.includes(j = (j + s + n) % n)) d += b[j];
  return mx + Math.sign(mx) * d;
}
function groupMove(e, p, mates) {
  // (the way he faces is chosen as he sets off and kept till he stands: never swung round mid-walk)
  if (!e.walking) {
    e.walkFace = 0;
    if (e.guardFace != null && e.guardFace !== e.face && e.locoPose?.face !== e.face) { e.stoodAt = G.time; e.standDir = -1; }
  } else if (e.walkFace) e.face = e.walkFace;
  e.guardFace = e.face;
  e.groupSince ??= G.time;
  const sl = groupSlot(e, p, mates), s = sl.s; e.slot = sl; e.slotSide = s;
  // (his turn come round after 240 ticks without a swing, from far off he hurries in: a longer, quicker stride)
  e.hurry = due(e) && Math.abs(e.x - p.x) > 60 && sl.k === 0 ? 1.4 : 1;
  // (and no wait of his own holds him past it: his turn comes round inside 30 ticks)
  if (due(e) && sl.k === 0 && e.atkCd > 30) e.atkCd = 30;
  const d = Math.abs(e.x - p.x), wrong = sideOf(e.x, p) !== s, B = sl.L.B;
  // A due actor keeps his turn while approaching its slot. Only a stalled
  // approach permits the man already in the lane to take over after 60 ticks.
  const laneGap = (x, y) => Math.max(0, Math.abs(x - p.x) - 76) + Math.abs(y - B) / .7;
  const progressing = !e.lanePos || laneGap(e.lanePos.x, e.lanePos.y) - laneGap(e.x, e.y) > .05;
  e.lanePos = { x: e.x, y: e.y };
  const clearancePending = e.atkCd <= 0 && mates.some(o => o.yieldTo != null && sideOf(o.x, p) === s && before(e, o, p) && Math.abs(o.y - B) < 27 && Math.abs(o.x - p.x) < d + 38);
  e.laneBlk = !clearancePending && !progressing && !wrong && sl.first && e.atkCd <= 0 && !mates.some(o => HOLD.includes(o.state) && sideOf(o.x,p)===s) && (Math.abs(e.y - B) > 4 || mates.some(o => sideOf(o.x, p) === s && Math.abs(o.x - p.x) < d && Math.abs(o.y - B) < 27)) ? (e.laneBlk || 0) + 1 : 0;
  // Keep the beneficiary clear of the target it reserved for its partner.
  // Chasing that target along the far lane would block the lane change again.
  if (clearancePending) { e.slotGo = false; e.crowdTx = null; return; }
  if (!wrong && !e.crossing && Math.abs(e.y - B) < 14 && d >= 30 && mates.some(o => o.laneBlk > 60 && sideOf(o.x, p) === s && (Math.abs(o.x - p.x) > d || Math.abs(o.y - B) > 4))) {
    e.atkCd = Math.min(e.atkCd, 0); e.slotGo = false; e.crowdTx = null; return; }
  let tx = wrong ? p.x + s * sl.lo : d < sl.lo ? p.x + s * sl.lo : d > sl.hi ? p.x + s * sl.hi : e.x;
  // A ready front fighter stops on a planted cell when CHAD enters his reach.
  // Retreating toward the wait band forever would leave a moving player unopposed.
  if (!wrong && sl.k === 0 && e.atkCd <= 0 && d >= 30 && d <= restRange(e) && Math.abs(e.y - B) <= 4) { tx = e.x; e.slotGo = false; e.crowdTx = null; }
  if (e.yielding) {
    e.crowdTx = null;
    if (e.yieldTo == null) {
      const xs = [e.x];
      for (let n = 1; n <= 6; n++) xs.push(e.x - s * n * 40, e.x + s * n * 40);
      e.yieldTo = xs.find(x => onFloor(x) && sideOf(x, p) === s && Math.abs(x - p.x) >= 30 && apart(x, sl.L.A, mates) >= 4) ?? null;
    }
    if (e.yieldTo != null) {
      tx = e.yieldTo;
      if (Math.abs(e.y - sl.L.A) <= 2 && Math.abs(e.x - tx) <= 3) e.yieldTo = null;
    }
  }
  // (standing on a comrade who stands too - within 30px along and across - for eight ticks, he steps off him along the carriage,
  // the way that keeps him in his band: whole steps, never a glide)
  // (a comrade standing 40px or less across the floor from him counts too - one lane behind another reads as one two-headed man -
  // and the wall pinning them both never excuses it; of the two, the one not already stepping off moves, away from him first,
  // else the other way past him, to a spot free of all of them)
  const crowd = !e.walking && !wrong && !e.crossing && !e.yielding && mates.find(o => !o.walking && o.crowdTx == null && Math.abs(o.x - e.x) < 30 && Math.abs(o.y - e.y) < 40);
  e.crowdN = crowd ? (e.crowdN || 0) + 1 : 0;
  if (crowd && e.crowdN >= 8 && !e.slotGo) {
    const a0 = Math.sign(e.x - crowd.x) || (G.enemies.indexOf(e) < G.enemies.indexOf(crowd) ? -s : s);
    for (const away of [a0, -a0]) { const u = away * (away === a0 ? 31 - Math.abs(e.x - crowd.x) : 31 + Math.abs(e.x - crowd.x)), nd = Math.abs(e.x + u - p.x);
      if (sideOf(e.x + u, p) === s && nd >= 30 && nd <= Math.max(sl.hi, d) + 40 && inward(e.x, u) && !mates.some(o => Math.abs(o.x - e.x - u) < 30 && Math.abs(o.y - e.y) < 40)) { e.crowdTx = e.x + u; e.slotGo = true; break; } } }
  if (e.crowdTx != null && e.slotGo && !wrong) tx = e.crowdTx; else e.crowdTx = null;
  tx = clamp(tx, G.camX + 24, G.camX + W - 24);
  e.slotDir = Math.sign(tx - e.x);   // (the way his slot lies: see familyPose, standing a beat on his way on)
  const ty = e.yielding ? sl.L.A : sl.y, ex = tx - e.x, ey = ty - e.y;
  // (off his slot by more than the dead-band he walks to it; on a split floor his lane is kept to 3px)
  // (CHAD floored, he holds his ground for the gloat; landed on or behind him, he first steps back off him)
  // (once he has stood - at the end of a walk, or to turn his stride round - he stands eight ticks before he sets off again:
  // never a one-tick guard between two walks; only CHAD on top of him moves him sooner - his guard shown two ticks, out of a swing or a stand)
  const rested = groupGuardReady(e) && (G.time - (e.stoodAt ?? -99) >= 8 || d < 30 && G.time - (e.recAt ?? -99) >= 2 && G.time - e.stoodAt >= 2);
  if (!e.slotGo && rested && (wrong || Math.abs(ex) > 12 || Math.abs(ey) > (sl.split ? 3 : 10)) && !(p.state === 'down' && TAUNTS.has(e.trainType) && !e.taunted && gloatFree(e) && !(e.trainType === 'nr_commando' && d <= 40))) e.slotGo = true;
  // (nor the tick his breath cell has just come round: never a one-tick breath before the first step)
  const bt = G.time - 1 - (e.stoodAt ?? -99), flip = d >= 30 && !e.walking && e.stoodAt != null && bt >= 16 && (bt & 15) === 0;
  if (!e.slotGo || !rested && !e.walking || flip) return;
  const vy = e.speed * .7 * e.hurry; let mx = 0, my = 0;
  if (wrong || e.crossing && d < 24) {
    // going round CHAD: on the far edge of the floor from him before he comes within 30px of him along the carriage
    e.crossing = true;
    const ly = sl.L.A, clear = Math.abs(e.y - p.y) >= Math.min(22, Math.abs(ly - p.y) - 1);
    my = clamp(ly - e.y, -vy, vy);
    mx = Math.sign(tx - e.x) * Math.min(e.speed, Math.abs(tx - e.x));
    if (!clear && Math.abs(e.x + ahead(e, mx) - p.x) < 30) mx = 0;
    // (left standing on CHAD - he walked through the swing - he first backs off him along the carriage as he changes lane)
    if (!clear && d < 24) mx = (Math.sign(e.x - p.x) || -s) * e.speed;
  } else {
    e.crossing = false;
    // (CHAD walking in on him, he gives ground at his walking pace - never a lurch - and keeps off CHAD's lane till clear)
    mx = Math.sign(ex) * Math.min(e.speed * e.hurry, Math.abs(ex)); my = clamp(ey, -vy, vy);
    // (his turn come, he takes the attack lane from 24px off CHAD: his swing reaches him from there)
    // (already level with CHAD across the floor, he walks on through to a lane beyond him rather than stand stuck in his)
    if (d < (sl.k === 0 && due(e) ? 24 : 30) && Math.abs(e.y + my - p.y) < Math.abs(e.y - p.y) && !(Math.abs(e.y - p.y) < 12 && Math.abs(ey) > 12)) my = 0;
    // (with CHAD walking on to him faster than he can give ground, he steps out of CHAD's lane as well)
    if (d < 24 && Math.abs(e.y - p.y) < 12) { const w = Math.sign(e.y - p.y) || 1, room = w > 0 ? laneMax(e.x) - e.y : e.y - laneMin(e.x);
      my = (room >= 12 - Math.abs(e.y - p.y) ? w : -w) * vy; }
    // (his last stride's planted step brings him in: he stops walking once it will)
    if (Math.abs(ey) < 1 && Math.abs(ex) <= Math.max(1, e.walking && Math.sign(ex) === e.lastDx ? toPlant(e) : 0)) { e.slotGo = false; return; }
  }
  // (never a turn of his stride: walking the other way, he finishes his step and stands before he sets off back)
  if (mx && e.walking && Math.sign(mx) !== e.lastDx) mx = 0;
  // (never into a comrade: a step that would stack him is taken across the floor only, or along it only, or not at all)
  // (a stride or side-step stopped here still finishes on its planted cell: that ground is counted in)
  // (within a comrade's length along the carriage he never closes on him across it: he opens the gap along it first)
  // (nor a stride whose planted cell lies past the carriage end: stopped there it could never be finished)
  const a0 = Math.min(0, apart(e.x, e.y, mates)), ok = (u, v) => { const x = e.x + ahead(e, u), y = e.y + v + Math.sign(v) * SIDESTEP_PX * .7;
    return apart(x, y, mates) >= a0 && !(u && (x < arenaMin() + .5 || x > arenaMax() - .5)) && !(v && mates.some(o => Math.abs(x - o.x) < 38 && Math.abs(y - o.y) < 27 && Math.abs(y - o.y) < Math.abs(e.y - o.y) - .01)); };
  // (his lane blocked by a comrade within a stride along the carriage: he first opens that gap, stepping away from him -
  // his turn come, never out past his band: there he waits for the comrade to clear)
  const o = my && !ok(0, my) && !e.crossing && mates.find(o => Math.abs(o.x - e.x) < 38 && (o.y - e.y) * my > 0 && Math.abs(o.y - e.y) < Math.abs(ey) + 27);
  // (his slot beyond the comrade along the carriage, he walks on past him in his own lane first, then changes lane)
  const past = o && Math.abs(ex) > 1 && Math.sign(ex) === Math.sign(o.x - e.x) ? Math.sign(ex) * Math.min(e.speed * e.hurry, Math.abs(ex)) : 0;
  if (o && past && inward(e.x, past) && ok(past, 0) && !(e.walking && Math.sign(past) !== e.lastDx)) { my = 0; mx = past; }
  else if (o) { const u0 = (Math.sign(e.x - o.x) || (sl.k ? s : -s)) * e.speed;
    // (penned in that way for 20 ticks, he opens the gap the other way, past the comrade)
    const can = u => sideOf(e.x + u, p) === s && Math.abs(e.x + u - p.x) >= 30 && (sl.k || Math.abs(e.x + u - p.x) <= Math.max(sl.hi, d)) && inward(e.x, u) && ok(u, 0) && !(e.walking && Math.sign(u) !== e.lastDx);
    my = 0; mx = can(u0) ? u0 : (e.oHeld || 0) >= 20 && can(-u0) ? -u0 : 0; }
  else if ((mx || my) && !ok(mx, my)) { if (my && ok(0, my)) mx = 0; else if (mx && ok(mx, 0)) my = 0; else mx = my = 0; }
  e.oHeld = o && !mx ? (e.oHeld || 0) + 1 : o ? e.oHeld : 0;
  // (a step up or down the floor on the way to his slot turns his stride the way he is going along the carriage)
  if (my && !mx && !e.crossing && Math.abs(ex) > 1 && !e.walking) e.backstep = Math.sign(ex) * e.face < 0;
  // (a trip round CHAD held up by a comrade for 20 ticks is given up: he waits on his own side a while instead)
  e.crossHeld = e.crossing && !mx && !my ? (e.crossHeld || 0) + 1 : 0;
  if (e.crossHeld >= 20) { e.crossing = false; e.crossHeld = 0; e.noCross = G.time + 180; }
  e.x += mx; e.y += my;
  if (Math.abs(my) > .01) e.lastDy = Math.sign(my);
  // (going round CHAD, or on a long walk, he faces the way he goes; else he keeps his eyes on CHAD and steps back facing him)
  // (setting off across the floor only, he keeps facing CHAD)
  if ((mx || my) && !e.walkFace) e.walkFace = !mx ? e.face : e.crossing || Math.abs(tx - e.x) > 60 ? Math.sign(mx) : Math.sign(p.x - e.x) || e.face;
  if (e.walkFace) e.face = e.walkFace;
}
// Hurt and radioing, he raises his guard: his partner side-steps straight in to cover him.
function coverFor(e) {
  const o = partnerOf(e);
  if (!o || !['idle', 'approach', 'backoff'].includes(o.state)) return;
  o.atkCd = 0;
  // from across the carriage he just comes on; from close by, two quick shuffle-steps in
  // (already in his place he just squares up: no shuffle of a tick or two)
  const R = Math.hypot(Math.max(0, Math.abs(o.x - G.player.x) - 44), Math.abs(G.player.y - o.y));
  if (Math.abs(o.x - G.player.x) < 120 && R >= 6) { o.state = 'coverstep'; o.t = 0; }
}
function familyIdle(e, p) {
  if(isRefund(e))refundIdle(e,p);
  const t = e.trainType, gap = Math.abs(p.x - e.x);
  if (e.rageDue) { e.rageDue = false; e.state = 'rage'; e.t = 0; return true; }
  if (tteLoose(e)) { e.state = 'fetch'; e.t = 0; return true; }
  if (e.wantCall) { e.wantCall = false; e.state = 'rally'; e.t = 0; return true; }
  if (e.chain) { e.state = 'flee'; e.t = 0; e.fleeDir = Math.sign(e.x - p.x) || e.face; return true; }
  if (p.state !== 'down') e.taunted = false;
  // (the captain gloats from a pace off, never standing over CHAD's legs)
  // (the captain only starts one with CHAD still in the air or just landed, so it isn't played to a standing man)
  else if (TAUNTS.has(t) && !e.taunted && gloatFree(e) && !(t.startsWith('ic_') && crowdOf(e, p, true)) && !(WALK_BEATS[t] && (e.walking || e.slotGo)) && gap > (t === 'nr_captain' ? 70 : 40) && (t === 'nr_commando' ? floored(p) : t !== 'nr_captain' || p.z > .5 || (p.groundT || 0) < 8)) { e.taunted = true; e.state = 'taunt'; e.t = 0;
    if (t === 'nr_commando') e.face = Math.sign(p.x - e.x) || e.face; return true; }
  if (t === 'nr_brawler' && e.guardWatch > 40) e.atkCd = Math.min(e.atkCd, 1);
  if (t === 'ic_brawler' && backGrabReady(e, p)) {
    familyMove(e, 'backgrab'); e.grabCd = 240; e.state = 'windup'; e.t = 0; e.flash = 0; G.swingAt = G.time;
    return true;
  }
  if (t === 'ic_docker' && chockPull(e, p)) return true;
  // The paan uncle's tell: he works the paan until his cheeks bulge, and then he spits.
  if (t === 'nr_paan' && !(e.chewCd > 0) && gap < 110 && slotsUsed() < slotCap()) { e.state = 'chew'; e.t = 0; e.chewCd = 300; return true; }
  if (t === 'nr_runner' || t === 'ic_runner' || t === 'nr_rack' && !e.perched) {
    if (t === 'nr_runner' && !e.carry && nearestPickup(e, 120)) { e.state = 'loot'; e.t = 0; return true; }
    // a flanker drifts round to CHAD's back before he commits
    // (never by shouldering into CHAD: pressed against his keep-off distance he waits his turn instead of creeping on the spot)
    const wx = p.x - p.face * 56, into = Math.sign(wx - e.x) === Math.sign(p.x - e.x) && Math.abs(p.x - e.x) < Math.max(restRange(e) * 0.6, 32) + 4;
    if (Math.abs(wx - e.x) > 8 && !into) e.x += Math.sign(wx - e.x) * e.speed * .6;
  }
  // The chai wallah and the dhaba cook keep their distance between throws.
  const [near, far] = t === 'nr_chai' ? [110, 170] : t === 'ic_kitchen' ? [90, 140] : [];
  if (near && e.atkCd > 0) {
    if (gap < near) e.x -= Math.sign(p.x - e.x || -e.face) * e.speed * .7;
    else if (gap > far) e.x += Math.sign(p.x - e.x) * e.speed * .5;
  }
  // Unhurt and left alone, the berth thief goes back up once.
  if (t === 'nr_rack' && e.perchZ && !e.reclimbed && e.hp >= e.maxhp && gap > 200) {
    const top = laneMin(e.x) + 2, bx = berthX(e.x);
    e.y += clamp(top - e.y, -.8, .8); e.x += clamp(bx - e.x, -.8, .8);
    if (Math.abs(e.y - top) < 1 && Math.abs(e.x - bx) < 1) { e.reclimbed = true; e.state = 'climb'; e.t = 0; e.noLane = e.airOnly = e.perched = true; }
    return true;
  }
  return false;
}
function familyWind(e) {
  if(isRefund(e)){refundWind(e);return;}
  const gap = Math.abs(G.player.x - e.x);
  // The berth thief squares up on CHAD's depth, a step to the front, so the sack and the claws land in view.
  if (e.move === 'swing' || e.move === 'pounce') e.y += clamp(G.player.y + 3 - e.y, -.6, .6);
  if (e.move === 'tbarge' && e.t < 8) e.x -= e.face * .35;   // the TTE rocks back off his front foot before the barge
  if (e.move === 'cram') { if (e.t % 6 === 0) spawnDust(e.x - e.face * 18, e.y, 2); if (e.t % 12 === 0) spawnRing(e.x, e.y - 8, '#ff4050'); }
  if (e.move === 'dash' && e.t % 5 === 0) spawnDust(e.x - e.face * 8, e.y, 1);
  // The captain's taser shows its aim for the whole wind-up; the charge paws the floor.
  if (e.move === 'charge' && e.t % 6 === 0) spawnDust(e.x - e.face * 16, e.y, 2);
  if (e.move === 'taser' && e.t === 1) G.audio.sfx('blip');
  // The paan uncle backpedals to spitting distance, then leans back and fills his cheeks (red for the whole inhale).
  if (e.move === 'spit') {
    const room = e.x - e.face * 2.2 > G.camX + 26 && e.x - e.face * 2.2 < G.camX + W - 26;
    e.stepping = gap < 60 && room && e.t < windOf(e) - 14;
    if (e.stepping) { e.x -= e.face * 2.2; e.stridePhase = (e.stridePhase || 0) + 2.2; }
    if (e.t === windOf(e) - 14) G.audio.wet?.('chew');
  }
  // The snatcher's run-up and the cricketer's charge to the crease both eat ground.
  if (e.move === 'kick') { if (gap > 40) e.x += e.face * 1.2; if (e.t % 4 === 0) spawnDust(e.x - e.face * 8, e.y, 1); }
  if (e.move === 'slam') { if (gap > 52) e.x += e.face * 2.2; if (e.t % 5 === 0) spawnDust(e.x - e.face * 10, e.y, 1); }
  if (e.move === 'jet' && TOOTS.includes(e.t)) {
    if (!G.audio.roomSfx?.('conductor_whistle', .28, .14)) G.audio.sfx('blip');
    spawnSmoke(e.x + e.face * 8, e.y - 52, 1);
  }
}
function familyStrike(e) {
  if(isRefund(e)){refundStrike(e);return;}
  const v = { dash: 5.5, ram: 3.2, cram: 2.6, kick: 6, barge: 2.6, pounce: 4.6, lunge: 3.4, charge: 3.6, bump: 3.4, tbarge: 2.6 }[e.move];
  if (v) { e.vx = e.face * v; G.audio.sfx('dash'); }
  // The commando's thrust covers just enough floor that the baton tip (54px out) meets CHAD at contact:
  // 5.15 is the distance a unit push travels by frame 7 at .88 decay.
  if (e.move === 'lunge') e.vx = e.face * clamp((Math.abs(G.player.x - e.x) - 50) / 5.15, 0, 3.4);
  if (e.move === 'tslam') e.cueTo = 3;   // the green diamond stays lit until the trunk lands
}
function stick(e) {
  e.vx = 0; e.state = 'stuck'; e.t = 0; e.poise = 0; G.shake = Math.max(G.shake, 5);
  G.audio.sfx('slam'); spawnDust(e.x + e.face * 26, e.y, 8); spawnPop(e.x, e.y - e.h - 6, 'STUCK!');
}
// A landed flying kick lifts fifteen meter off CHAD's neck.
function snatch(e) {
  const amount = Math.min(15, Math.floor(G.meter));
  if (amount <= 0) return;
  G.meter -= amount; e.chain = amount;
  spawnPop(G.player.x, G.player.y - 84, 'CHAIN!'); G.audio.sfx('blip');
}
// Off the edge with the chain: the meter is gone, and he comes back later empty-handed.
function escape(e) {
  e.removeMe = true; e.chain = 0;
  spawnPop(clamp(e.x, G.camX + 34, G.camX + W - 34), e.y - 70, 'GOT AWAY!');
  if (G.waveActive) G.spawnQueue.push(e.trainType);
}
// The cooker's last word: half a second of red ring, then everything next to him gets it.
function vent(e) {
  const p = G.player, near = o => Math.abs(o.x - e.x) < 50 && Math.abs(o.y - e.y) < 20 && o.z < 20;
  if (near(p) && !p.dying) hurtPlayer(p, 12, Math.sign(p.x - e.x) || 1, true);
  for (const o of G.enemies) {
    if (o === e || o.dead || o.runner || ['down', 'thrown', 'getup', 'dying'].includes(o.state) || !near(o)) continue;
    o.hurt(12, Math.sign(o.x - e.x) || 1, true, true); spawnPop(o.x, o.y - 78, 'FRIENDLY');
  }
  for (const d of [-1, 1]) spawnShot('steam', e.x + d * 12, e.y, d * 1.8, 0, { source: e, fx: true, h: 12 });
  spawnRing(e.x, e.y - 8, '#ff4050'); spawnDust(e.x, e.y, 6); spawnSmoke(e.x, e.y - 30, 3);
  G.shake = Math.max(G.shake, 6); G.audio.sfx('heavy');
}
// A floored CHAD slides ~29px per unit of launch speed; aim his pelvis BARGE_CLEAR px past the trunk centre.
const BARGE_CLEAR = 76;   // his boots lie ~38px behind his pelvis; the trunk in the bend-and-grab cell reaches ~25px either side of its centre
const bargeFling = (e, p) => clamp((e.trunk.x + e.face * BARGE_CLEAR - p.x) * e.face, 24, 130) / 29;
function familyAttack(e, p) {
  if(isRefund(e)){refundAttack(e,p,{hit:tryHitPlayer,settle});return;}
  const t = e.t, hit = (dmg, range, heavy, cls, sound, cy) => { e.contactY = cy ?? CONTACT_Y[e.move]; return tryHitPlayer(e, dmg, range, heavy, 14, cls, sound); };
  switch (e.move) {
    case 'string': case 'jab': {
      // a plain opener, then a green follow-up: guard or deflect the first, parry the second.
      // The sleeper brawler's two punches are both plain: his green is the front kick.
      const j = e.move === 'jab', [a, originalB, originalEnd] = j ? [4, 10, 20] : [5, 14, 24], green = e.trainType !== 'nr_brawler';
      const b = green ? a + 1 + GREEN_WARNING_TICKS : originalB, end = originalEnd + b - originalB;
      if (t === a) hit(j ? 4 : 5, 42, false, 'plain');
      if (t === a + 1 && green) { e.cls = 'counter'; e.cueTo = b + 1; }
      if (t > a && t < originalB - 2) e.x += e.face * .7;
      if (t === b) hit(j ? 6 : 7, 46, false, green ? 'counter' : 'plain');
      if (t > end) settle(e, j ? 40 : 60);
      break;
    }
    // Paan: one green brass-box jab, lit for the whole wind-up (no plain opener to stun CHAD through the cue).
    case 'boxjab': if (t < 3) e.x += e.face; if (t === 3) hit(8, 48, false, 'counter'); if (t > 22) settle(e, 60); break;
    case 'hook': if (t === 4) hit(9, 46, true, 'counter', 'heavy'); if (t > 22) settle(e, 50); break;
    // Night Train cast.
    case 'push': if (t === 6) { e.guardWatch = 0; hit(6, 46, true, 'unblockable'); } if (t > 22) settle(e, 60); break;
    case 'fkick': if (t === 6) hit(8, 54, false, 'counter'); if (t > 22) settle(e, 60); break;
    case 'bonk': if (t === 5) hit(7, 44, false, 'counter', 'weapon'); if (t > 18) settle(e, 40); break;
    // Paan: a red spray from his mouth down the lane; a face-full blinds and dazes CHAD. Then the wipe: the opening.
    case 'spit':
      if (t === 1) { const s = spawnShot('paan', e.x + e.face * PAAN_MOUTH[0], e.y, 0, 0, { source: e, fx: true }); s.face = e.face; s.mouthY = PAAN_MOUTH[1]; e.paanShot = s; G.audio.wet?.('spit');
        // aimed at CHAD's face when he is in the lane, otherwise a flat spray down it
        const inLane = Math.abs(p.y - e.y) < 20 && (p.x - e.x) * e.face > 0;
        s.aimX = inLane ? clamp(Math.abs(p.x - s.x), 40, 90) : 70; s.aimY = inLane ? p.y - p.z - 84 - (e.y - PAAN_MOUTH[1]) : -14;
        e.spitHitAt = clamp(Math.round(s.aimX / 13) + 1, 3, 8); }   // the hit lands when the spray arrives
      if (t === (e.spitHitAt || 4)) {
        const hp = p.hp;
        if (hit(6, 74, false, 'unblockable', 'none') && p.hp < hp) {
          blindPlayer(p, 64, 'paan'); p.vx = e.face * 1.6; if (e.paanShot) Object.assign(e.paanShot, { stopAt: p.x - e.face * 4, hitT: e.paanShot.t }); G.audio.wet?.('splat'); G.hitstop = Math.max(G.hitstop, 4);
        }
      }
      if (t >= 18) { e.state = 'wipe'; e.t = 0; }
      break;
    // The TTE's trunk dash: he drives through sixteen ticks behind the trunk (its face is 40px ahead of him), then skids.
    case 'bump':
      e.x += e.vx; e.vx *= t < 16 ? .985 : .82;
      if (t < 16 && t % 4 === 0) spawnDust(e.x - e.face * 14, e.y, 1);
      if (t === 16) { spawnDust(e.x + e.face * 6, e.y, 3); G.audio.sfx('land'); }
      if (!e.hitLanded && t >= 2 && t < 16 && hit(12, 40, true, 'unblockable', 'heavy')) { e.hitLanded = true; e.vx *= .5; }
      if (t > 32) { e.vx = 0; settle(e, 70); }
      break;
    // Disarmed and kept off his trunk: a bare-handed red shoulder-barge that knocks CHAD off it, then back to the fetch.
    // The knockdown is sized so CHAD comes to rest (whole body) BARGE_CLEAR px past the trunk, never across it.
    case 'tbarge':
      e.x += e.vx; e.vx *= .86;
      if (!e.hitLanded && t < 9 && hit(6, 34, true, 'unblockable', 'heavy')) { e.hitLanded = true; e.vx *= .4; if (p.state === 'down' && e.trunk?.loose) p.vx = e.face * bargeFling(e, p); }
      if (t > 18) tteBargeDone(e);
      break;
    // Overhead trunk slam: the green cue runs to the impact on tick 2, where the trunk meets the floor 30px ahead.
    case 'tslam':
      if (t === 2) { G.shake = Math.max(G.shake, 5); G.audio.sfx('slam'); spawnDust(e.x + e.face * 30, e.y, 6); hit(12, 40, true, 'counter', 'heavy'); }
      if (t > 32) settle(e, 60);
      break;
    // The berth thief's pounce: a crouch, then a real leap from his distance that lands just short
    // of CHAD, the claws connecting on the way down; he lands in a crouch and scuttles off.
    case 'pounce':
      if (t < 3) { e.vx = 0; e.landAt = 0; }
      if (t === 3) { e.vz = 4.9; e.z = .1; e.vx = e.face * clamp((Math.abs(p.x - e.x) - 20) / 18, 1.2, 4.6); }
      if (t > 3 && e.z > 0) {
        e.x += e.vx; e.z = Math.max(0, e.z + e.vz); e.vz -= .54;
        if (!e.hitLanded && e.vz < 1 && hit(8, 40, false, 'counter')) e.hitLanded = true;
        if (e.z <= 0) { e.vz = e.vx = 0; e.landAt = t; spawnDust(e.x, e.y, 2); G.audio.sfx('land'); }
      }
      if (e.landAt && t > e.landAt + 10) { e.landAt = 0; e.state = 'backoff'; e.t = 0; }
      break;
    // The commando's baton string: guard or deflect the first, parry the second.
    case 'baton': {
      if (t === 5) hit(6, 52, false, 'plain', 'weapon');
      // A sliding knockdown can bring CHAD under the prolonged follow-up.
      // Withdraw at walking pace instead of striking over his get-up.
      if (t > 5 && ['down', 'getup'].includes(p.state) && Math.abs(p.x - e.x) < 24 && Math.abs(p.y - e.y) < 12 && groupMates(e).length) {
        e.state = 'backoff'; e.t = 0; e.backTo = 52; e.stoodAt = e.recAt = G.time; e.settleMove = e.move; e.cls = 'plain'; break;
      }
      if (t === 6) { e.cls = 'counter'; e.cueTo = GREEN_FOLLOWUP + 1; }
      if (t === GREEN_FOLLOWUP) hit(8, 54, false, 'counter', 'weapon', 30);
      if (t > GREEN_FOLLOWUP + 10) { const extra = GREEN_FOLLOWUP - 14; settle(e, 55 - extra, G.time - extra); }
      break;
    }
    // (in a group, a lunge that has floored CHAD pulls up short of him: he never lands on top of him)
    case 'lunge': if (G.player.state === 'down' && Math.sign(G.player.x - e.x) === Math.sign(e.vx) && Math.abs(G.player.x - e.x - e.vx) < 24 && groupMates(e).length) e.vx = 0;
      e.x += e.vx; e.vx *= .88; if (t === 7) hit(9, 60, false, 'counter', 'weapon'); if (t > 24) settle(e, 60); break;
    case 'sweep': if (t === 8) hit(10, 58, true, 'unblockable'); if (t > 26) settle(e, 60); break;
    // Pressed up close, the captain bashes and then gives ground, so his taser and charge range opens again.
    case 'bash': if (t === 6) hit(10, 50, true, 'counter', 'heavy');
      if (t > 22) { if (e.trainType === 'nr_captain' && Math.abs(p.x - e.x) < 70) { e.state = 'backoff'; e.t = 0; e.backTo = 96; e.stoodAt = e.recAt = G.time; e.settleMove = e.move; } else settle(e, 55); }
      break;
    // Two red prongs down his lane: sidestep or jump. Parrying does not stop electricity.
    case 'taser':
      if (t === 3) { spawnShot('taser', e.x + e.face * 30, e.y, e.face * 6.5, 11, { source: e }); G.audio.sfx('pistol'); e.lowerAt = 99; }
      // He holds the aim while the wires are out (they are strung to the gun), lowers it as soon as they are gone,
      // and is back in his guard ten ticks later. A latched shock ends by t 53 anyway; at t 50 he reels in what is left.
      if (t > 12 && e.lowerAt === 99) { const w = G.shots.filter(s => s.source === e && s.kind === 'taser');
        if (t >= 50) w.forEach(s => { s.life = s.t; }); if (!w.length || t >= 50) e.lowerAt = t; }
      if (t >= e.lowerAt + 10 || t > 66) settle(e, 90);
      break;
    // The shield charge does not stop for anything but CHAD or the end of the carriage:
    // dodge it and he runs on into the wall and sticks there, which is the punish.
    case 'charge': {
      e.x += e.vx;
      const front = e.x + e.face * 34;
      if (e.hitLanded) { e.vx *= .88; if (Math.abs(e.vx) < .3 || t > 90) { e.vx = 0; settle(e, 80); } }
      else if (front < G.camX + 20 || front > G.camX + W - 20) { stick(e); e.stuckFor = 70; break; }
      else if (t > 150) { e.vx = 0; settle(e, 80); }
      if (!e.hitLanded && hit(13, 52, true, 'unblockable', 'heavy')) e.hitLanded = true;
      if (t % 4 === 0 && Math.abs(e.vx) > 1) spawnDust(e.x - e.face * 14, e.y, 1);
      break;
    }
    case 'grab': case 'backgrab': {
      const back = e.move === 'backgrab', at = back ? 6 : 8;
      if (t < at) e.x += e.face * (back ? 1.2 : 1.4);
      if (t === at) {
        e.guardWatch = 0;
        if (Math.abs(p.x - e.x) < (back ? 42 : 38) && Math.abs(p.y - e.y) < 14 && p.z < 12 && !p.dying && p.invuln <= 0 && !['down', 'getup'].includes(p.state) && !p.grabbedBy) {
          grabPlayer(p, e); e.state = 'grabhold'; e.t = 0; e.holdT = 0; G.audio.sfx('throw'); break;
        }
      }
      if (t > 22) settle(e, 50);
      break;
    }
    case 'dash':
      e.x += e.vx; e.vx *= .9;
      if (t === 8) hit(8, 44, false, 'counter', 'weapon');
      if (t > 26) { e.state = 'backoff'; e.t = 0; }
      break;
    // The flying kick carries him through CHAD's lane and out the far side.
    case 'kick':
      e.x += e.vx; e.vx *= .96;
      if (!e.hitLanded && t >= 3 && t <= 16) {
        const hp = p.hp;
        if (hit(8, 44, false, 'counter', 'weapon')) { e.hitLanded = true; if (p.hp < hp && !p.lastDefense) snatch(e); }
      }
      if (t > 30 && e.state === 'attack') { if (e.chain) { e.state = 'snatch'; e.t = 0; } else settle(e, 70); }
      break;
    case 'swing': if (t === 5) hit(7, 42, false, 'counter'); if (t > 16) settle(e, 60); break;
    case 'lathi': if (t === 8) hit(10, e.range + 10, false, 'counter', 'weapon'); if (t > 26) settle(e, 70); break;
    case 'punch': if (t === 7) hit(11, 46, true, 'counter', 'heavy'); if (t > 24) settle(e, 50); break;
    case 'smash': if (t === 6) hit(8, 44, false, 'counter'); if (t > 18) { e.smashes = (e.smashes || 0) + 1; settle(e, 30); } break;
    case 'drive': if (t === 8) hit(10, 72, false, 'counter', 'weapon'); if (t > 26) { e.swings++; settle(e, 70); } break;
    // The overhead into the dirt: red on impact, and a crack runs on down his lane.
    case 'slam':
      if (t === 8) {
        G.shake = Math.max(G.shake, 6); G.audio.sfx('slam'); spawnDust(e.x + e.face * 40, e.y, 8);
        hit(12, 60, true, 'unblockable', 'heavy');
        spawnShot('crack', e.x + e.face * 40, e.y, e.face * 4, 12, { source: e });
      }
      if (t >= 14) { e.swings = 0; e.state = 'stuck'; e.t = 0; e.stuckFor = 45; e.poise = 0; spawnPop(e.x, e.y - e.h - 6, 'STUCK!'); }
      break;
    case 'shove': if (t === 6) hit(9, 44, false, 'counter'); if (t > 20) { e.swings++; settle(e, 50); } break;
    case 'barge':
      e.x += e.vx; e.vx *= .93;
      if (!e.hitLanded && t >= 3 && hit(11, 50, true, 'counter', 'heavy')) e.hitLanded = true;
      if (t > 26) { e.vx = 0; e.swings++; settle(e, 60); }
      break;
    // One lid, one jet: a single red hit down the lane, then the lid has to be resealed.
    case 'jet':
      if (t === 2) { hit(10, 120, false, 'unblockable', 'heavy'); G.audio.sizzle?.(.5, .25, 2); }
      if (t < 22 && t % 2 === 0) spawnShot('steam', e.x + e.face * (37 + t * 3.8), e.y, e.face * 1.6, 0, { source: e, fx: true, h: 61, spout: e.x + e.face * 37 });
      if (t >= 26) { e.state = 'reseal'; e.t = 0; }
      break;
    case 'ladle': if (t === 6) hit(7, 44, false, 'counter', 'weapon'); if (t > 18) settle(e, 40); break;
    case 'toss':
      if (t === 7) {
        const src = crewThrows(e) ? G.boss : e;
        spawnShot('wrench', e.x + e.face * 48, e.y, e.face * 3.2, 7, { source: src, h: 68, parryClass: 'reflect', bowl: src === e });
        G.audio.sfx('weapon'); e.hitLanded = true;
      }
      if (t > 20) { e.state = 'backoff'; e.t = 0; }
      break;
    case 'wrench': if (t === 6) hit(9, 48, false, 'counter', 'weapon'); if (t > 20) settle(e, 50); break;
    case 'hurl':
      if (t === 4) { spawnShot('suitcase', e.x + e.face * 30, e.y, e.face * 3.4, 10, { source: e, parryClass: 'reflect', bowl: true }); G.audio.sfx('throw'); loseLoad(e, false); }
      if (t > 20) { e.state = 'backoff'; e.t = 0; }
      break;
    case 'ram':
      e.x += e.vx; e.vx *= .95;
      if (!e.hitLanded && hit(14, 50, true, 'unblockable')) e.hitLanded = true;
      if (t % 4 === 0) spawnDust(e.x - e.face * 12, e.y, 1);
      if (t > 30) settle(e, 70);
      break;
    case 'cram': {
      e.x += e.vx; e.vx *= .985;
      // A wall or a prop in his path stops him dead: that is the punish window. A cart's
      // front is further out than a crate's, and it rams whoever is standing in it.
      const cart = pushes(e), reach = cart ? e.trainType === 'ic_heavy' ? rigReach(e) + 54 : 84 : 60;
      const front = e.x + e.face * (cart ? rigReach(e) + (e.trainType === 'ic_heavy' ? 54 : 33) : 34);
      const ahead = q => (q.x - front) * e.face, block = Math.abs(e.vx) > 1 && G.props.find(q => q !== e.rig && !q.broken && !q.decor && !q.hidden && ahead(q) > -14 && ahead(q) < (cart ? 24 : 14) && Math.abs(q.y - e.y) < 14);
      if (block) { block.hurt(13, e.face, true); stick(e); break; }
      if (Math.abs(e.vx) > 1 && (front < G.camX + (cart ? 6 : 20) || front > G.camX + W - (cart ? 6 : 20))) { stick(e); break; }
      if (!e.hitLanded && hit(13, reach, true, 'unblockable')) e.hitLanded = true;
      if (t % 4 === 0) spawnDust(e.x - e.face * 12, e.y, 1);
      if (t > 50) { e.vx = 0; e.poise = e.maxPoise; settle(e, 80); }
      break;
    }
    case 'lob':
      if (t === 7) {
        // Out of the can's mouth in his release cell (b 14: 52 px ahead, 51 up to the gob's centre line).
        const x0 = e.x + e.face * 52, z0 = 51, dx = clamp(p.x - x0, -150, 150), vz = 2.6, T = (vz + Math.sqrt(vz * vz + 2 * 0.24 * z0)) / 0.24;
        spawnArc('chai', x0, e.y, dx * e.face > 8 ? dx / T : e.face * .4, vz, e.dmg, 'chai',
          { source: e, parryClass: 'reflect', z: z0, landed: () => { if (!e.dead && ['idle', 'backoff'].includes(e.state)) { e.state = 'taunt'; e.t = 0; } } });
        G.audio.sfx('throw');
      }
      // every second pot runs dry: a sixty-frame refill is the opening
      if (t > 20) { e.lobs = (e.lobs || 0) + 1; e.state = e.lobs % 2 ? 'backoff' : 'reload'; e.t = 0; }
      break;
    default: settle(e, 40);
  }
}
// The drop is aimed where CHAD stands as he coils: a short red crouch, then a half-second leap onto that spot.
const DROP_COIL = 8, DROP_G = .5;
function dropFromBerth(e, p) {
  unperch(e);
  const vz = 2.4, T = Math.ceil((vz + Math.sqrt(vz * vz + 2 * DROP_G * e.z)) / DROP_G);
  e.state = 'drop'; e.t = 0; e.hitLanded = false; e.cls = 'unblockable'; e.coilT = DROP_COIL;
  e.face = Math.sign(p.x - e.x) || e.face;
  e.dropY0 = e.y; e.dropY = clamp(p.y, laneMin(p.x), laneMax(p.x));
  e.vx = clamp((p.x - e.x) / T, -3.6, 3.6); e.vz = vz; e.airT = T; e.landT = DROP_COIL + T; e.landX = e.x + e.vx * T;
}
const HURT_ALT = new Set(['nr_brawler', 'nr_commando', 'nr_chai']);
// The paan uncle's mouth in his spit cell from the pelvis/sole anchor, and the ticks of lid-open and leaf-in (logical px, ticks).
const PAAN_MOUTH = [26, 48], PAAN_POP = 18;
const STRIDE = { nr_tte: 6, nr_rack: 7.5 };
// Near-even walk beats: logical px of ground the planted boot covers in each drawn cell (two steps per cycle).
// The body moves with the ground every tick (no hold-then-catch-up); the boot creeps at most one beat inside a cell.
const WALK_BEATS = { nr_commando: [4.5, 5, 4.5, 4.5, 4.5, 5, 4.5, 4, 4.5, 4.5, 4.5, 4, 4.5, 4.5, 4, 4.5, 4.5, 4, 5, 4], nr_captain: [9.5, 11, 13, 12.5, 10, 11, 13, 11.5] };
// the commando's cover shuffle: px advanced leaving each of its six cells (art: build_train_passengers.py)
const STEP_BEATS = [5.25, 4.75, 4.5, 4.75, 5.5, 5.5], stepCell = e => beatCell(STEP_BEATS, e.stepPos || 0);   // (its own clock, e.stepPos)
const STAGGER_T = 73;   // an ordinary stagger's length (ticks); the daze cells know it (dazePose)
const SIDESTEP_PX = 8, WALK_SLIDE = { nr_commando: .4 };
// the side-step cell a side-step opens part-way into (feet together, nearest the guard)
const SIDE_START = { nr_commando: 3.5 };
// side-step cells with both feet down near the guard, that he may stand from (the others step on to one: contact.py FAMILY sidestep)
const SIDE_DOWN = { nr_commando: [2, 3], nr_captain: [1, 2, 3] };   // per-family walk drag inside a cell (pelvis hitch = k x beat, under 2.6px)
// Walk cells with both boots down, in pairs [first, second]: within a few px of the guard (a_00), so a stride ends
// on one of these before the wind-up's settle, and a stride starts from one (tools: stutter_fix/contact.py).
const WALK_START = { nr_commando: [[0, 1], [10, 11]], nr_captain: [[0, 1], [4, 5]], ic_brawler: [[5, 6]], ic_runner: [[5, 6]], ic_docker: [[0, 13]], ic_enforcer: [[6, 7]], ic_kitchen: [[7, 8]], ic_heavy: [[7, 8]], ...Object.fromEntries([...REFUND_FAMILY].map(k=>[k,refundGait(k)?.starts])) };
// every planted walk cell (within ~8px of the guard), per family; a stride stops on, and commits from, one of these
const WALK_CONTACT = { nr_commando: [0, 1, 10, 11], nr_captain: [0, 1, 4, 5], nr_brawler: [0, 1, 8], nr_chai: [0, 4], nr_rack: [0, 1, 4, 5], ic_brawler: [0, 5, 6, 11], ic_runner: [0, 5, 6, 12], ic_docker: [0, 6, 7, 13], ic_enforcer: [0, 6, 7, 13], ic_kitchen: [0, 7, 8, 15], ic_heavy: [0, 7, 8, 15], ...Object.fromEntries([...REFUND_FAMILY].map(k=>[k,refundGait(k)?.contacts])) };
// Ticks at the head of a wind-up drawn as his planted guard when he commits mid-stride; moves that travel in their wind-up skip it.
const SETTLE_T = 4, NO_SETTLE = new Set(['dash', 'kick', 'slam', 'spit', 'tbarge', 'backgrab', 'cram', 'ram']);   // depth px per cell of the commando's guard side-step (lift, plant)
const HOP_T = 14;   // the chai wallah's hop back at the start of a retreat
const KO_REST = 44;   // ticks a KO'd body lies on the floor before it is gone (the last 16 blink)
// The berth thief's own performance: the perch, the drop, the climb back up, the sack swing and the pounce.
// Where his hands sit below the berth top in each climbing cell (logical px): the grip stays on the lip
// while the cells change, so the pull-up is the drawing, not the sprite sliding up the bunk.
const CLIMB_Z = { reach: 76, hang: 77.5, pullup: 48.5, mantle: 33 };
function climbBerth(e) {
  const t = e.t, top = e.perchZ;
  if (t < 8) e.z = 0;                                                             // crouch under the bunk
  else if (t < 20) e.z = (top - CLIMB_Z.reach) * (1 - (1 - (t - 8) / 12) ** 2);   // the spring up to the lip
  else if (t < 32) e.z = top - CLIMB_Z.hang - (t < 23 ? 1 : 0);                   // caught, hanging by his hands
  else if (t < 40) e.z = top - CLIMB_Z.pullup;
  else if (t < 54) e.z = top - CLIMB_Z.mantle;                                    // pressed up, then a knee over
  else perch(e);
}
function rackPose(e) {
  const t = e.t, m = e.move, key = e.set._aiKey, has = n => hasAIState(key, n);
  if (!has('mantle')) return null;
  switch (e.state) {
    // breathing on the mattress, and every few seconds a look back down the coach
    case 'perch': { const ph = (G.time + e.maxhp * 7) % 200; return { name: 'perch', idx: ph < 150 ? (ph / 25 | 0) & 1 : 2 }; }
    case 'hurt':
      // the flung-up hand would reach the HUD at the screen corners: there he just rocks in his crouch
      if (e.perched) { const sx = e.x - G.camX, clear = sx > 220 && sx < 420;
        return { name: clear ? 'perchhurt' : 'perch', idx: 0, lift: t < 6 ? (t & 1) * 2 : 0 }; }
      if (!((e.hurtN || 0) & 1)) return { name: 'hurtlow', idx: 0 };   // every other hit doubles him over
      break;
    case 'climb': return t < 8 ? { name: 'land', idx: 0 } : t < 20 ? { name: 'climb', idx: 0 } : t < 32 ? { name: 'hang', idx: 0 }
      : t < 40 ? { name: 'pullup', idx: 0 } : { name: 'mantle', idx: t < 47 ? 0 : 1 };
    case 'drop': return t < (e.coilT || 0) ? { name: 'perch', idx: 0, lift: -2 } : { name: e.vz > .5 ? 'leap' : 'drop', idx: 0 };
    case 'taunt': return t < 8 || t > 44 ? { name: 'sling', idx: 0 } : { name: 'taunt', idx: (t >> 3) & 1 };
    // backing off, or backing out to his pounce distance: the walk plays in reverse, so his feet push him away
    case 'backoff': case 'approach':
      if (e.walking && (e.state === 'backoff' || e.plan === 'pounce' && Math.abs(G.player.x - e.x) < 80))
        return { name: 'walk', idx: 7 - (Math.floor(e.stridePhase / STRIDE.nr_rack) & 7) };
      break;
    case 'windup':
      if (m === 'swing') return { name: 'swing', idx: t < 7 ? 0 : 1 };   // the sack off his shoulder, then drawn back
      break;
    case 'attack':
      if (m === 'swing') return { name: 'swing', idx: t < 3 ? 1 : t < 12 ? 2 : 0 };   // round, then hoisted back on
      if (m === 'pounce') return e.landAt ? { name: 'land', idx: 0 } : t <= 3 ? { name: 'run', idx: 0 } : { name: 'pounce', idx: 0 };
      break;
  }
  return null;
}
const PARRY_LAND = 5;
// A wider, longer-lived puff than a footstep's, rolling out to both sides, so the touchdown reads at 480.
function landPuff(x, y) {
  const n = G.effects.length;
  spawnDust(x - 9, y, 4); spawnDust(x + 9, y, 4);
  for (let i = n; i < G.effects.length; i++) { const d = G.effects[i]; d.vx = (d.x < x ? -1 : 1) * (.7 + Math.random() * .7); d.life += 14; }
}
function parryFallPose(e) {
  const key = e.set._aiKey;
  if (!(e.z > 0)) return { name: 'land', idx: 0 };
  return { name: [e.move, 'fall', 'drop', 'jump'].find(n => n && hasAIState(key, n)) || 'hurt', idx: 0 };
}
// The reel after an impact: the struggle cells only (cell 0 is the impact itself, played once by its own state).
const REEL = [1, 2, 3, 2];
function familyPose(e, name, idx) {
  const t = e.t, m = e.move, k = e.trainType, delhi = DELHI_FAMILY.has(k);
  if (delhi && e.stanceAt != null) { const performance = delhiCastPose(e, name, idx, windOf(e)); if (performance) return performance; }
  // Committing out of a stride he first plants both boots in his guard, then winds up (no mid-stride teleport).
  if (e.state === 'windup' && G.time < (e.settleAt || 0)) return { name: 'idle', idx: 0 };
  if(isRefund(e))return refundPose(e,name,idx);
  if (delhi) { const performance = delhiCastPose(e, name, idx, windOf(e)); if (performance) return performance; }
  if (e.state === 'idle' && e.wantCall && hasAIState(e.set._aiKey, 'call')) return { name: 'call', idx: 0 };   // (the tick between a hurt and his call already raises the handset)
  // Out of his sweep (boots together, c 13) the commando rises to his guard through his side-step's planted cells, two ticks
  // each (t 05, s 02: boots within 2px of both), never popping his boots 9px straight into a 00.
  if (k === 'nr_commando' && (e.state === 'idle' || e.state === 'approach') && !e.walking && e.settleMove === 'sweep' && G.time - (e.recAt ?? -99) < 4 && lastFrame(e, 'sidestep') >= 3)
    return { name: 'sidestep', idx: G.time - e.recAt < 2 ? 2 : 3 };
  // (in a group, standing from a walk or a swing he shows his guard first: the breath cell comes round sixteen ticks later,
  // never flashed for a tick as he stands)
  // Hold the planted step for two ticks, then his guard. AI uses the same
  // boundary so the first guard cell cannot disappear after a single tick.
  if (WALK_BEATS[k] && GROUP.has(k) && !e.walking && G.time - e.stoodAt < 2 && e.locoAt === e.stoodAt - 1 && e.locoPose?.face === e.face && LOCO.has(e.state) && groupMates(e).length) {
    const lp = e.locoPose, b = WALK_BEATS[k];   // (the cell his finishing step planted, not the one drawn before it)
    if (lp.name === 'sidestep') return { name: lp.name, idx: Math.floor((e.sidePos || 0) / SIDESTEP_PX) % (lastFrame(e, 'sidestep') + 1) };
    if (lp.name !== 'walk' || b.length !== lastFrame(e, 'walk') + 1) return lp;
    const [i, u] = beatAt(b, e.walkPos || 0), kS = WALK_SLIDE[k] || 0;
    return { name: lp.name, idx: i, slide: kS ? Math.round(e.face * kS * (u - b[i] / 2) * 2) / 2 : 0 }; }
  if (name === 'idle' && WALK_BEATS[k] && GROUP.has(k) && e.stoodAt != null && ['idle', 'approach', 'backoff'].includes(e.state) && !e.walking && groupMates(e).length)
    return { name, idx: (Math.max(0, G.time - (e.state === 'approach' ? e.t + 1 : 0) - e.stoodAt) >> 4) & 1 };   // (held as he sets off to swing)
  if (k === 'nr_rack') { const r = rackPose(e); if (r) return r; }
  if (k === 'nr_tte') { const r = ttePose(e); if (r) return r; }
  switch (e.state) {
    // One reaction per hit, alternating head snap and doubled over, instead of both in turn.
    // A deflected swing: the weapon arm flung back, boots planted (families with a recoil cell).
    case 'hurt': if (e.recoil && hasAIState(e.set._aiKey, 'recoil')) return { name: 'recoil', idx: 0 };
      if (HURT_ALT.has(k)) return { name, idx: 1 - ((e.hurtN || 0) & 1) };
      // The captain's head snaps with the shield still wide; winded and tucked only once his guard is broken.
      // (latched at the hit, not re-read mid-reaction); the snap settles back into his guard (d 02) before he stands.
      if (k === 'nr_captain') return { name, idx: e.hurtTuck || t >= 7 ? 1 : 0 };
      if (k === 'nr_paan') return { name, idx: t < 7 ? 0 : 1 };   // head snap, then the recovery
      break;
    case 'backoff': if (t < HOP_T && hasAIState(e.set._aiKey, 'hop')) return { name: 'hop', idx: 0, lift: Math.round(9 * Math.sin(Math.PI * t / HOP_T)) }; break;
    // The chai wallah sips, then lowers the cup at CHAD.
    // The captain's taunt is a rap: a short lift (c 13), the downswing (t 0), then the taser butt held on the shield rim (c 14) with the clang.
    case 'taunt': return { name: 'taunt', idx: k === 'nr_captain' ? (t % 24 < 7 ? 0 : t % 24 < 10 ? 1 : 2) : k === 'nr_chai' ? +(t >= 30) : k === 'nr_commando' ? (lastFrame(e, 'taunt') >= 2 ? (t >= 32 ? 2 : +(t % 16 >= 6)) : +(t % 16 >= 10)) : (t >> (k === 'nr_paan' ? 3 : 4)) & 1 };
    // The commando radios (upright, then back in his stance) and settles into his cover guard;
    // the captain shouts into the handset, then turns to wave his backup in.
    case 'rally': if (k === 'nr_captain') return { name: 'call', idx: t < 10 ? 0 : t < 28 ? 1 : 2 };   // handset up, shout, wave in (backup spawns at 30)
      if (hasAIState(e.set._aiKey, 'cover')) return { name: t < 22 ? 'call' : 'cover', idx: t >= 12 && t < 22 ? 1 : 0 }; break;
    // Shuffling in to cover: the six-cell guard shuffle, boot-locked by its beats (STEP_BEATS), from and back to its guard cell (1).
    case 'coverstep': { if (lastFrame(e, 'step') < 2) return { name: art(e, 'step', 'walk'), idx: 0 };
      // (a light drag inside each cell, k .4 as the walk, so the planted boot does not creep with the body)
      if (lastFrame(e, 'step') === STEP_BEATS.length - 1) { const [i, u] = beatAt(STEP_BEATS, e.stepPos || 0);
        return { name: 'step', idx: i, slide: Math.round(Math.sign(G.player.x - e.x) * .4 * (u - STEP_BEATS[i] / 2) * 2) / 2 }; }
      const u = e.stridePhase % 6, last = Math.abs(e.x - G.player.x) - 44 < 6;   // (older three-cell sheet)
      return { name: 'step', idx: last ? 2 : [2, 0, 1][Math.floor(e.stridePhase / 6) % 3], slide: last ? 0 : Math.round(Math.sign(G.player.x - e.x) * .4 * (u - 3) * 2) / 2 }; }
    case 'reload': return { name: pose(e, 'reload', 'idle'), idx: +(t >= 22) };   // unscrew the can, then pour
    // Lid open, leaf in; then the chew: near cheek, both cheeks, near cheek, jaw open (five ticks a beat).
    case 'chew': return t < PAAN_POP ? { name: art(e, 'pop', 'idle'), idx: +(t >= PAAN_POP / 2) }
      : { name: art(e, 'chew', 'idle'), idx: [0, 1, 0, 2][((t - PAAN_POP) / 5 | 0) & 3] };
    // Hit mid-chew: he keeps the box and the mouthful, cheeks full (the hit flash is the flinch).
    case 'absorb': return { name: art(e, 'chew', 'idle'), idx: 1 };
    // Hand up, a scrub back and forth across the mouth, hand down: forty-eight ticks to punish him.
    case 'wipe': return { name: art(e, 'wipe', 'idle'), idx: t < 8 || t >= 40 ? 0 : 1 - (((t - 8) >> 3) & 1) };
    case 'rage': return { name: k === 'ic_heavy' ? art(e, 'call', 'taunt') : pose(e, 'rage', 'taunt'), idx: 0 };
    case 'stuck': {
      // The captain's shield hits the carriage end: a jolt back off it, then he reels, seeing stars.
      if (k === 'nr_captain') return t < 12 && hasAIState(e.set._aiKey, 'stunned') ? { name: 'stunned', idx: 0 } : { name: 'stagger_polish', idx: REEL[(t >> 3) & 3] };
      if (k === 'ic_enforcer') { const n = art(e, 'stuck', 'slam', 'throw', 'hurt'); return { name: n, idx: ['slam', 'throw'].includes(n) ? 1 : 0 }; }
      return { name: delhi ? art(e, 'stuck', 'hurt') : pose(e, 'stunned', 'hurt'), idx: 0 };
    }
    case 'guardbreak':
      // Knocked open, the captain is flung wide, hauls the shield back, then reels until his guard returns.
      if (k === 'nr_captain') return e.gbT > 38 ? { name: 'guardbreak', idx: 0 } : e.gbT > 30 ? { name: 'guardbreak', idx: lastFrame(e, 'guardbreak') } : { name: 'stagger_polish', idx: REEL[(e.gbT >> 3) & 3] };
      return { name: pose(e, 'guardbreak', 'hurt'), idx: 0 };
    case 'slip': return { name: pose(e, 'slip', 'block'), idx: 0 };
    case 'dodge': return { name: pose(e, 'dodge', 'jump'), idx: 0, lift: Math.round(4 * Math.sin(Math.PI * Math.min(t, 10) / 10)) };
    case 'snatch': { if (t >= 14) return { name: 'taunt', idx: 0 }; const n = art(e, 'snatch', 'atk'); return { name: n, idx: n === 'atk' ? 1 : 0 }; }
    case 'flee': return { name: art(e, 'carry', 'run'), idx: Math.floor(e.stridePhase / 6) };
    case 'lever': return { name: art(e, 'lever', 'atk'), idx: 0 };
    case 'reseal': return { name: art(e, 'reseal', 'idle'), idx: 0 };
    case 'grabhold': if (k === 'ic_brawler') return { name: 'grab', idx: 1 }; break;
    case 'windup':
      if (m === 'dash' || m === 'kick') return { name: 'run', idx: (t >> 2) & 3 };
      if (m === 'slam') { const n = art(e, 'charge', 'run'); return { name: n, idx: n === 'run' ? (t >> 2) & 3 : 0 }; }
      if (m === 'cram' && k === 'ic_heavy') return { name: art(e, 'ram', 'atk'), idx: 0 };
      if (m === 'shove' || m === 'barge') { const n = art(e, m, 'punch'); return { name: n, idx: 0 }; }
      if (m === 'jet') { const n = art(e, 'whistle', 'beam', 'atk'); return { name: n, idx: n === 'whistle' ? (t >> 3) & 1 : 0 }; }
      if (m === 'toss') return { name: art(e, 'throw', 'atk'), idx: 0 };
      if (m === 'spit' && e.stepping) return { name: 'walk', idx: 7 - (Math.floor(e.stridePhase / 6) & 7) };
      { const W0 = { push: ['shove', 0], fkick: ['kick', 0], bonk: ['swing', 0], spit: ['puff', 0], bump: ['bump', 0], tslam: ['slam', 0],
          lunge: ['lunge', 0], sweep: ['sweep', 0], taser: ['taser', 0], charge: ['charge', 0], baton: ['baton', 0] }[m];
        if (m === 'taser' && k === 'nr_captain') return { name: 'taser', idx: t < 14 ? 1 : lastFrame(e, 'taser') >= 3 && ((t - 14) >> 2) & 1 ? 3 : 0 };   // hip draw, then the aim trembling
        // The captain sets behind the shield for his charge: he rocks back onto his rear foot, then paws with each puff of dust.
        if (m === 'charge' && k === 'nr_captain' && hasAIState(e.set._aiKey, 'chargeset') && t < windOf(e) - 4) return { name: 'chargeset', idx: t < 12 ? 0 : t % 6 < 3 || t >= windOf(e) - 7 ? 1 : 2, slide: e.face * Math.round(4 * Math.min(1, t / 8)) };   // set, then paw (with the dust) and rock
        if (m === 'charge' && k === 'nr_captain') return { name: 'charge', idx: 0, slide: e.face * Math.round(4 * Math.min(1, t / 8)) - (t >= 8 && t % 6 < 2 ? e.face : 0), lift: t >= 8 && t % 6 < 2 ? 2 : 0 };
        // The commando's baton rises into his chop: planted, then onto the balls of his feet with the arm trembling as the cue lights.
        if (m === 'baton' && k === 'nr_commando' && hasAIState(e.set._aiKey, 'batonup')) { const c = e.settleAt ? 5 + SETTLE_T : 5;   // (after a planting settle the cock still gets its 5 ticks)
          if (t < c || t >= windOf(e) - 8 && ((t - windOf(e) + 8) / 3 | 0) & 1) return { name: 'batonup', idx: t < c ? 0 : 1, lift: t >= 8 && t >= c ? 1 : 0 }; }   // cocked on the way up; the drawn-back tremble as the cue lights
        if (m === 'baton' && k === 'nr_commando') return { name: 'baton', idx: 0, lift: t >= 8 ? 1 : 0 };
        if (W0 && hasAIState(e.set._aiKey, W0[0])) return { name: W0[0], idx: W0[1] }; }
      return { name: { grab: 'grab', backgrab: 'grab', hurl: 'throw', ram: 'charge', punch: 'punch', jab: pose(e, 'jab', 'atk'), hook: pose(e, 'counter', 'atk') }[m] || 'atk', idx: 0 };
    case 'attack': {
      // The brawler's string: lead jab held into the rear cross, then back to guard (atk: wind, jab, cross, guard).
      if (m === 'string' && k === 'nr_brawler') return { name: 'atk', idx: t < 12 ? 1 : t < 20 ? 2 : 3 };
      if (m === 'boxjab') return { name: 'atk', idx: 2 };
      if (m === 'string') return { name: 'atk', idx: t < 9 ? 1 : t < GREEN_FOLLOWUP - 2 ? 0 : t < GREEN_FOLLOWUP + 6 ? 1 : 2 };
      if (m === 'jab') { const n = pose(e, 'jab', 'atk'); return { name: n, idx: n === 'jab' ? +(t >= GREEN_FOLLOWUP - 3) : t < 8 ? 1 : t < GREEN_FOLLOWUP - 3 ? 0 : t < GREEN_FOLLOWUP + 4 ? 1 : 2 }; }
      if (m === 'hook') { const n = pose(e, 'counter', 'atk'); return { name: n, idx: n === 'atk' ? 1 + (t >= 10) : 1 }; }
      if (m === 'grab' || m === 'backgrab') return { name: 'grab', idx: 0 };
      // the lunge sheet is a flat dive: it gets its own arc off the floor
      if (m === 'dash') return t < 16 ? { name: pose(e, 'lunge', 'atk'), idx: pose(e, 'lunge', 'atk') === 'atk' ? 1 : 0, lift: Math.round(12 * Math.sin(Math.PI * t / 16)) } : { name: 'atk', idx: 2 };
      if (m === 'kick') { const n = art(e, 'kick', 'atk'); return t < 20 ? { name: n, idx: n === 'atk' ? 1 : lastFrame(e, n), lift: Math.round(14 * Math.sin(Math.PI * t / 20)) } : { name: 'atk', idx: 2 }; }
      if (m === 'slam') { const n = art(e, 'slam', 'throw', 'atk'); return { name: n, idx: t < 8 ? 0 : 1 }; }
      if (m === 'shove' || m === 'barge') { const n = art(e, m, 'punch'); return { name: n, idx: n === 'punch' ? (t < 6 ? 1 : 2) : 1 }; }
      if (m === 'jet') { const n = art(e, 'jet', 'beam', 'atk'); return { name: n, idx: n === 'jet' ? +(t >= 6) : n === 'beam' ? Math.min(3, 1 + (t >> 3)) : 1 }; }
      if (m === 'toss') return { name: art(e, 'throw', 'atk'), idx: t < 7 ? 0 : 1 };
      if (k?.startsWith('nr_') && !['string', 'lob', 'swing', 'lathi', 'dash'].includes(m)) {
        const A1 = { push: t < 14 ? ['shove', 1] : ['atk', 3], fkick: ['kick', t < 5 ? 0 : t < 14 ? 1 : 2], bonk: ['swing', t < 3 ? 1 : t < 10 ? 2 : 3], spit: ['spit', t < 6 ? 0 : 1],
          bump: ['bump', 1], tslam: ['slam', t < 10 ? 0 : 1], lunge: ['lunge', t < 16 ? 1 : lastFrame(e, 'lunge') >= 2 && t < 21 ? 2 : 0], sweep: ['sweep', t < 5 ? 0 : t < 16 ? 1 : 2], taser: ['taser', t < 12 ? 1 : 0],
          charge: ['charge', 0], bash: ['atk', t < 12 ? 1 : 2], baton: hasAIState(e.set._aiKey, 'baton') ? ['baton', t < 2 ? 0 : t < 9 ? 1 : t < GREEN_FOLLOWUP - 1 ? 2 : t < GREEN_FOLLOWUP + 6 ? 3 : 4] : ['atk', t < 9 ? 1 : t < GREEN_FOLLOWUP ? 0 : 2] }[m];
        // The captain holds the aim while the barbs fly and bite; his charge is a run cycle behind the shield.
        if (k === 'nr_captain' && m === 'taser') { const n = lastFrame(e, 'taser'); const L0 = e.lowerAt ?? 99, L = L0 + (L0 >= 9 && L0 % 4 === 1);   // (a tremble cell the lowering would cut to one tick is held two)
          return { name: 'taser', idx: t >= 3 && t < 9 && n >= 2 ? 2 : n >= 5 && t >= L + 7 ? 5 : n >= 5 && t >= L ? 4 : n >= 3 && t >= 9 && (t >> 2) & 1 ? 3 : 0 }; }   // the kick as the barbs fire (t 3), the aim held trembling, then lowered
        if (k === 'nr_captain' && m === 'charge') { const n = lastFrame(e, 'charge'); return { name: 'charge', idx: n && Math.abs(e.vx) > 1 ? 1 + ((e.stridePhase / 14 | 0) % n) : 0 }; }
        if (A1 && hasAIState(e.set._aiKey, A1[0])) return { name: A1[0], idx: A1[1] };
      }
      if (m === 'hurl') return t < 12 ? { name: 'throw', idx: 1 } : { name: 'idle', idx: 0 };
      if (m === 'lob') return { name: 'atk', idx: t < 7 ? 1 : 2 };
      if (m === 'ram') return { name: 'charge', idx: 0 };
      if (m === 'punch') return { name: 'punch', idx: t < 12 ? 1 : 2 };
      if (m === 'cram' && k === 'ic_heavy') return { name: art(e, 'ram', 'atk'), idx: Math.abs(e.vx) > .6 ? 1 + ((e.stridePhase / 6 | 0) & 1) : 0 };
      if (m === 'cram') return Math.abs(e.vx) > .6 ? (pose(e, 'charge', 'atk') === 'charge' ? { name: 'charge', idx: (e.stridePhase / 6 | 0) & 1 } : { name: 'atk', idx: 1 }) : { name: 'atk', idx: 2 };
      if (m === 'smash' && e.smashes % 2 && t < 10) return { name: pose(e, 'smash', 'atk'), idx: pose(e, 'smash', 'atk') === 'atk' ? 1 : 0 };
      return { name: 'atk', idx: t < (m === 'lathi' || m === 'drive' ? 14 : m === 'smash' || m === 'ladle' ? 10 : 12) ? 1 : 2 };
    }
  }
  // A long planted stride: the walk advances one cell per this many px so the boots keep pace with the floor.
  if (name === 'walk' && STRIDE[k]) idx = Math.floor(e.stridePhase / STRIDE[k]);
  // An even cadence over the drawn cycle; walkPos runs backwards while he backs off facing CHAD, so the cells play in reverse (no moonwalk).
  if (name === 'walk' && WALK_BEATS[k]) {
    // Up or down the lane he keeps his guard and side-steps (lift, plant) instead of striding at nobody.
    if (e.depthWalk && hasAIState(e.set._aiKey, 'sidestep')) return { name: 'sidestep', idx: Math.floor((e.sidePos || 0) / SIDESTEP_PX) % (lastFrame(e, 'sidestep') + 1) };
    // (without side-step art he shuffles in his guard: a small bob per step, never a stride on the spot)
    if (e.depthWalk) return { name: 'idle', idx: 0, lift: Math.floor((e.sidePos || 0) / SIDESTEP_PX) & 1 };
    if (WALK_BEATS[k].length !== lastFrame(e, 'walk') + 1) return { name, idx: Math.floor(((e.walkPos || 0) % 9e5 + 9e5) / 9) };   // (cells re-cut: even 9px beats)
    const [i, u] = beatAt(WALK_BEATS[k], e.walkPos || 0), kS = WALK_SLIDE[k] || 0;
    // a light drag inside each cell keeps the planted boot nearer the floor; small enough (<2px) that the cell change never pops
    return { name, idx: i, slide: kS ? Math.round(e.face * kS * (u - WALK_BEATS[k][i] / 2) * 2) / 2 : 0 };
  }
  // Behind the cart his hands stay on the handles, walking or standing.
  if (k === 'ic_heavy' && pushes(e) && (name === 'walk' || name === 'idle') && hasAIState(e.set._aiKey, 'push')) return { name: 'push', idx: name === 'walk' ? idx : 0 };
  return { name, idx };
}

export function updateEnemies() {
  const p = G.player;
  for (const e of G.enemies) {
    if (e.removeMe) continue;
    if(isRefund(e)&&refundGait(e.trainType,pushes(e)))e.walkBeat=refundGait(e.trainType,pushes(e)).beat;
    if (e.stanceAt != null && (!['idle', 'approach', 'backoff', 'windup'].includes(e.state) || e.dead || e.z > .5 || G.time - e.stanceAt >= 10)) {
      if (G.time - e.stanceAt >= 10 && ['idle', 'approach', 'backoff', 'windup'].includes(e.state)) {
        const c = gaitStart(e)?.[0]?.[1];
        if (c != null && e.walkBeat) e.walkPos = cellPos(e.walkBeat, e.walkPos || 0, c) + 1e-6;
      }
      e.stanceAt = null;
    }
    updateDaze(e);
    if (e.trunk) tteTrunk(e);
    if (['nr_heavy', 'nr_bruiser'].includes(e.trainType) && !e.unarmed && !e.dead && ['stagger', 'down', 'thrown', 'getup'].includes(e.state)) loseLoad(e, true);
    // Protected stun bypasses the ordinary state update, not flash expiry.
    if (e.flash > 0) e.flash--;
    if(e.superLocked){
      // held for CHAD's super he stands in his guard, not frozen mid-stride
      if(G.player.state==='special'&&G.player.specialTarget===e){e.moved=0;e.walking=false;continue;}
      e.superLocked=false;
    }
    if(e.pendingSuperDefeat){e.pendingSuperDefeat=false;e.superApplying=true;e.hurt(e.hp,G.player.face,true,false);e.superApplying=false;continue;}
    if(e.protectedStagger>0&&!e.dead){e.protectedStagger--;e.state='stagger';e.vx=0;e.t=0;
      // Parried mid-leap (the berth thief's pounce), he falls in his leap cell, lands in a crouch, then reels.
      if(e.z>0&&!e.perched){e.vz=Math.min(e.vz||0,0)-.54;e.z=Math.max(0,e.z+e.vz);
        if(!e.z){e.vz=0;landPuff(e.x,e.y);G.audio.sfx('land');if(hasAIState(e.set?._aiKey,'land'))e.parryLandT=PARRY_LAND;}}
      else if(e.parryLandT>0&&!--e.parryLandT)e.dazeT=0;
      if(!e.protectedStagger){e.state='idle';e.atkCd=24;e.parryLandT=0;}continue;}

    const x0 = e.x, y0 = e.y, wasWalking = e.walking;
    e.t++;
    if(e.rallyCd>0)e.rallyCd--;
    if(e.blockCd>0)e.blockCd--;
    if(e.dodgeCd>0)e.dodgeCd--;
    if(e.grabCd>0)e.grabCd--;
    if(e.chewCd>0)e.chewCd--;
    if(e.chockCd>0)e.chockCd--;
    if(e.gbT>0)e.gbT--;
    if (e.wallCd > 0) e.wallCd--;
    if (e.ffCd > 0) e.ffCd--;
    if (e.pitCd > 0) e.pitCd--;
    if (e.rig && !e.rig.broken && e.dead && e.trainType !== 'nr_heavy') e.rig.onBreak = null;   // debris outlives its owner
    if (e.state !== 'down' && e.state !== 'thrown' && e.z <= 0) e.juggle = 0;
    // (a black-cat or the captain gloats the way he turned to start it: no flip mid-taunt)
    if (e.trainType === 'ic_heavy' && pushes(e) && !['windup', 'attack'].includes(e.state) && (p.x - e.x) * e.face < -8)
      releaseCart(e);   // flanked at the handles, he leaves the cart parked and turns to fight unarmed
    if (e.stanceAt != null) e.face = e.stanceFace;
    else if (e.kind !== 'bull' && !['loot','runner','windup','attack','grabhold','stuck','slip','flee','lever'].includes(e.state) && !(e.state === 'taunt' && WALK_BEATS[e.trainType])) e.face = p.x < e.x ? -1 : 1;
    // Turtling in front of a freeloader for long enough earns a grab.
    // His swing is drawn in front of CHAD when he commits from a step up the lane, so the fist is never hidden.
    if (e.trainType === 'nr_brawler') e.sortBias = ['windup', 'attack'].includes(e.state) && p.y - e.y > 0 && p.y - e.y < 12 ? p.y - e.y + 1 : 0;
    if (e.trainType === 'nr_brawler') e.guardWatch = p.state === 'parry' && (e.x - p.x) * p.face > 0 && Math.abs(e.x - p.x) < 70 && Math.abs(e.y - p.y) < 24 ? (e.guardWatch || 0) + 1 : 0;
    // Wet sand slows both sides, which is the point of it. Derived from the base
    // each frame so every e.speed read downstream gets it without knowing about it.
    e.speed = e.baseSpeed * zoneDrag(e);

    // Watchdogs: a body must never be able to freeze. Passive states only
    // survive while whoever put the enemy there is still holding up their end.
    if (e.state === 'grabbed' && p.grabTarget===e && ['grabbing','throwing'].includes(p.state))continue;
    if (e.state === 'grabbed') {
      e.state = 'idle'; e.t = 0; e.atkCd = wait(e, 20, 50);
    }
    if (e.state === 'grabhold' && p.grabbedBy !== e) { e.state = 'idle'; e.t = 0; e.atkCd = wait(e, 40, 80); }
    if ((e.state === 'down' || e.state === 'thrown') && e.t > 240) {
      e.z = 0; e.vz = 0; e.vx = 0;
      e.state = 'getup'; e.t = 0;e.superLaunched=false;
    }

    switch (e.stanceAt != null ? 'guardsettle' : e.state) {
      case 'guardsettle': e.t--; break;   // the authored foot exchange holds position before the normal AI resumes
      case 'block':e.x+=e.vx;e.vx*=.8;if(e.t>20){e.state='idle';e.t=0;e.atkCd=Math.min(e.atkCd,26);}break;
      case 'taunt':if(e.trainType==='nr_captain'){if(e.t%24===10)G.audio.sfx('armor');
        // two raps, ending on the strike (c 14); cut short on a strike once CHAD is back on his feet
        if(e.t>46||e.t%24>=12&&!['down','getup'].includes(G.player.state))tauntEnd(e);break;}
        if(e.t>50)tauntEnd(e);break;
      case 'reload':
        if(e.trainType==='ic_thrower'&&e.t===28)G.audio.roomSfx?.('room_page',.12);
        if(e.t>=(e.trainType==='ic_thrower'?48:60))settle(e,10);break;
      // The tell: the leaf goes in, then a wet squelch on every jaw-open beat. Crowd him, or wait it out close, and he spits.
      case 'chew':{
        const beat=e.t-PAAN_POP,lane=Math.abs(p.y-e.y)<20,gap=Math.abs(p.x-e.x);
        if(e.t===PAAN_POP-6||beat>=0&&beat%20===15)G.audio.wet?.('chew');
        e.crowd=beat>=0&&lane&&gap<52?(e.crowd||0)+1:0;
        if(e.crowd>=30||beat>=60){if(gap<100&&lane){familyMove(e,'spit');e.state='windup';e.t=0;}else settle(e,40);e.crowd=0;}
        break;}
      case 'absorb':if(e.t>=6){familyMove(e,'spit');e.wind=22;e.state='windup';e.t=0;}break;
      case 'wipe':if(e.t>=48)settle(e,50);break;
      case 'rage':if(e.t>=(e.trainType==='ic_heavy'?24:30))settle(e,0);break;
      case 'stuck':if(e.t%12===0)spawnSpark(e.x,e.y-e.h+6);if(e.t>=(e.stuckFor||60)){e.stuckFor=0;if(DELHI_FAMILY.has(e.trainType))e.poise=e.maxPoise;settle(e,50);}break;
      // Chain in hand: a gloat over the loot, then a sprint for whichever edge is further from CHAD.
      case 'snatch':if(e.t>=38){e.state='flee';e.t=0;e.fleeDir=Math.sign(e.x-p.x)||e.face;}break;
      case 'flee':
        e.fleeT=(e.fleeT||0)+1;e.face=e.fleeDir;e.x+=e.fleeDir*e.speed*1.25;
        if(e.t%16===0)spawnSpark(e.x+e.face*8,e.y-e.h+2);
        if(e.x<G.camX-30||e.x>G.camX+W+30||e.fleeT>=180)escape(e);
        break;
      case 'lever':if(e.t===12&&e.chock)pullChock(e.chock);if(e.t>=20)settle(e,40);break;
      case 'reseal':if(e.t===30)G.audio.sfx('armor');if(e.t>=50)settle(e,50);break;
      case 'guardbreak':e.x+=e.vx;e.vx*=.85;if(e.gbT<=0){if(tteLoose(e)){e.state='fetch';e.t=0;}else settle(e,20);}break;
      case 'fetch':case 'pickup':tteStep(e);break;
      case 'slip':e.x-=e.face*.8;if(e.t>=10){familyMove(e,'hook');e.state='windup';e.t=0;e.flash=0;}break;
      case 'dodge':
        e.x=clamp(e.x+e.vx,G.camX+14,G.camX+W-14);e.z+=e.vz;e.vz-=.3;
        if(e.z<=0){e.z=0;e.vz=0;e.vx=0;e.state='idle';e.t=0;e.atkCd=12;spawnDust(e.x,e.y,2);}
        break;
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
        // The berth thief always comes down: at once when CHAD is close, or after four seconds wherever he is.
        if (e.trainType === 'nr_rack') {
          if (++e.perchT >= 240 || --e.throwCd <= 0 && Math.abs(p.x - e.x) < 160 && slotsUsed() < slotCap()) dropFromBerth(e, p);
          break;
        }
        if (--e.throwCd <= 0 && Math.abs(p.x - e.x) < 220 && slotsUsed()<slotCap()) {
          if ((e.trainType === 'nr_rack' || e.throws >= 3) && Math.abs(p.x - e.x) < 160) {
            unperch(e);
            e.state = 'drop'; e.t = 0; e.hitLanded = false;
            e.dropY=p.y;
            e.vx = Math.sign(p.x - e.x || 1) * 2.0; e.vz = 1.6;
            G.audio.sfx('dash');
          } else if(e.trainType!=='nr_rack') { e.state = 'pthrow'; e.t = 0; }
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
        if (e.t > 34) { e.state = 'perch'; e.t = 0; e.throwCd = wait(e, 80, 140); }
        break;
      }
      case 'drop': {
        // The berth thief coils on the mattress edge (red), then springs up and off and comes down on his ring.
        if (e.t < (e.coilT || 0)) { e.z = e.perchZ; if (e.t === e.coilT - 1) G.audio.sfx('dash'); break; }
        e.x += e.vx; e.z += e.vz; e.vz -= e.coilT ? DROP_G : 0.22;
        if (e.dropY0 !== undefined) { const k = clamp((e.t - e.coilT) / e.airT, 0, 1); e.y = e.dropY0 + (e.dropY - e.dropY0) * k * k; }
        else if(e.dropY!==undefined)e.y+=clamp(e.dropY-e.y,-1.2,1.2);
        if (e.z <= 0) {
          e.z = 0; e.vz = 0; e.vx = 0; e.coilT = 0; e.dropY0 = undefined;
          // the hit is the ring: anyone standing in it, on either side of where he lands
          if (!e.hitLanded) { e.face = Math.sign(p.x - e.x) || e.face; tryHitPlayer(e, 10, 22, true, 16, 'unblockable'); e.hitLanded = true; }
          spawnDust(e.x, e.y, 3);
          G.shake = Math.max(G.shake, 3);
          e.state = e.trainType==='nr_rack'&&getAIFrame(e.set._aiKey,'land')?'land':'idle'; e.t = 0; e.atkCd = e.trainType ? 50 : irand(40, 80);
        }
        break;
      }
      case 'climb': {
        if (hasAIState(e.set._aiKey, 'mantle')) { climbBerth(e); break; }
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
        if (p.grabbedBy !== e) { e.state = 'idle'; e.t = 0; e.atkCd = wait(e, 40, 80); break; }
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
        if (familyAI(e) && familyIdle(e, p)) break;
        if(e.trainType==='ic_lead'&&e.rallyCd<=0&&e.x>G.camX+20&&e.x<G.camX+W-20&&slotsUsed()<slotCap()&&swingReady()&&
          G.enemies.some(o=>o!==e&&!o.dead&&o.trainType?.startsWith('ic_'))){
          e.state='rally';e.t=0;e.rallyCd=420;G.swingAt=G.time;break;
        }
        // The bull does not queue for a turn and does not orbit: he walks to whichever
        // edge is further away, locks one depth lane, and paws. Everything after that
        // is the ordinary windup -> attack chain, so he gets the red telegraph free.
        // Train ambushers drop once, then remain in the floor fight.
        if (e.trainType!=='nr_rack' && e.perchZ && !e.perched && --e.groundT <= 0) {
          e.state='climb';e.t=0;e.noLane=true;e.airOnly=true;e.perched=true;e.y=laneMin(e.x)+2;break;
        }
        // The bull has his three charges in the lull, then trots off before the next crowd arrives.
        if (e.kind === 'bull' && (G.waveActive || e.charges >= 3)) {
          if(!e.bullLeaving){e.bullLeaving=true;e.leaveFace=e.x<G.camX+W/2?-1:1;}
          e.face=e.leaveFace;e.x += e.face * e.speed * .6;
          if (e.x < G.camX - 90 || e.x > G.camX + W + 90) e.removeMe = true;
          break;
        }
        if (isRam(e)) {
          if(e.kind==='bull'&&e.ramRest>0){e.ramRest--;break;}
          if(e.kind==='bull'&&e.ramSide==null)e.ramSide=e.x<G.camX+W/2?-1:1;
          const edge = e.kind==='bull'?G.camX+(e.ramSide<0?56:W-56):p.x>G.camX+W/2?G.camX+24:G.camX+W-24;
          const dx=clamp(edge-e.x,-1.6,1.6);if(dx)e.face=Math.sign(dx);
          e.x += dx;
          e.y += clamp(p.y - e.y, -0.8, 0.8);
          if (Math.abs(edge - e.x) < 6) { e.face = e.kind==='bull'?-e.ramSide:-e.face;e.state = 'windup'; e.t = 0; }
          break;
        }
        // Orbit the player instead of bunching up on one spot, so a crowd
        // spreads across the arena and stays readable.
        // laneMin, not FLOOR_TOP: on the ghat the AI must never aim into the river.
        // The black-cat commando and his captain hold CHAD's lane in their guard (a commando's pair sets his lane),
        // so they never drift off it between swings only to walk back into it before the next.
        const mates = groupMates(e), grp = mates.length > 0;
        if (grp) groupMove(e, p, mates); else {
        const cmd = e.trainType === 'nr_commando' || e.trainType === 'nr_captain', vy = 0.6;
        const wantY = clamp(cmd ? p.y : p.y + e.orbit * (e.kind === 'masala' || e.kind === 'operator' ? 26 : 16), laneMin(e.x), laneMax(e.x));
        // (they hold their guard through a lane error under 6px; side-stepping to a lane, the steps are timed to close on it)
        // (under 6px out, a step already going his way finishes; none is turned round for it)
        if ((!cmd || Math.abs(wantY - e.y) >= 6 || e.walking && Math.abs(wantY - e.y) > .3 && Math.sign(wantY - e.y) === e.lastDy) && !sideHold(e, wantY - e.y, clamp(wantY - e.y, -vy, vy))) { if (cmd && Math.abs(wantY - e.y) >= 6) e.laneGo = G.time;   // (a real change of lane: he steps off at once)
          e.y += clamp(wantY - e.y, -vy, vy);
          if (sideStepping(e) && Math.abs(wantY - e.y) > 1) { const n = lastFrame(e, 'sidestep') + 1, R = Math.abs(wantY - e.y) / .7;
            e.sideK = aimK(Array(n).fill(SIDESTEP_PX), e.sidePos || 0, [n - 1], R, R + 1, .7, 1.4); } }
        if (Math.abs(e.y - wantY) < 2 && (familyAI(e) ? (G.time + e.maxhp * 13) % 240 === 0 : Math.random() < 0.004)) e.orbit *= -1;
        const gap = Math.abs(p.x - e.x);
        // Waiting bodies keep off CHAD, so he is never buried under a queue.
        // (a shortfall under half a step is left alone unless he is already stepping: no glide on a held cell)
        const short = Math.max(restRange(e) * 0.6, 32) - gap;
        const backing = short > 0 && (short >= 4 || e.walking || !WALK_BEATS[e.trainType]);
        if (backing) e.x -= Math.sign(p.x - e.x || -e.face) * e.speed * 0.5;
        if (e.trainType?.startsWith('ic_')) crowdStep(e, p, !backing);   // (backing off CHAD, he still takes a free lane)
        }
        if (e.kind === 'bandar' && nearestPickup(e) && Math.random() < 0.02) { e.state = 'loot'; e.t = 0; break; }
        // (a black-cat takes his turn on his side of CHAD: groupTurn)
        if (--e.atkCd <= 0 && slotsUsed() < slotCap() && (!grp || groupTurn(e, p, mates))) {
          e.state = 'approach'; e.t = 0; e.slotGo = e.crossing = false;
          if (familyAI(e)) familyPlan(e, p);
        }
        // (families stand in their guard: a sway would only shuffle their feet on the spot)
        if (!familyAI(e)) e.x += Math.sin(G.time * 0.05 + e.y) * 0.2;
        break;
      }
      case 'loot': {
        const q = nearestPickup(e);
        if (!q) { e.state = 'idle'; e.atkCd = wait(e, 20, 50); break; }
        e.face = q.x < e.x ? -1 : 1;
        e.x += Math.sign(q.x - e.x) * e.speed * 1.1;
        e.y += clamp(q.y - e.y, -1, 1);
        if (Math.abs(q.x - e.x) < 10 && Math.abs(q.y - e.y) < 8) {
          G.pickups.splice(G.pickups.indexOf(q), 1);
          if (e.trainType === 'nr_runner') e.carry = q;
          spawnPop(e.x, e.y - 40, 'STOLEN!');
          G.audio.sfx('blip');
          e.state = 'idle'; e.atkCd = wait(e, 40, 80);
        }
        if (e.t > 160) { e.state = 'idle'; e.atkCd = wait(e, 30, 60); }
        break;
      }
      case 'approach': {
        const dx = p.x - e.x, dy = p.y - e.y;
        // (a black-cat sharing his side with a comrade walks in on the attack lane: see groupSlot)
        const lane = GROUP.has(e.trainType) && groupMates(e).some(o => sideOf(o.x, p) === sideOf(e.x, p)) ? lanes(e.x, p).B : null;
        // (a black-cat of a group just stood from a walk sets off in two ticks - eight if he turned round, or the captain - never a
    // one-tick guard)
        // (out of a swing, likewise two ticks of his guard - after a sweep, after its rise)
        if (GROUP.has(e.trainType) && !e.walking && groupMates(e).length && (!groupGuardReady(e) || e.locoPose && G.time - (e.stoodAt ?? -99) < (e.locoPose.face !== e.face || e.trainType === 'nr_captain' ? 8 : 2) || G.time - (e.recAt ?? -99) < (e.settleMove === 'sweep' ? 6 : 2))
          && (Math.abs(dx) > e.range || (lane !== null ? Math.abs(lane - e.y) > .5 : Math.abs(dy) > 6))) break;
        if (lane !== null) { if (Math.abs(lane - e.y) > .5) e.y += clamp(lane - e.y, -e.speed * .7, e.speed * .7); }
        else if (Math.abs(dy) > 6) e.y += Math.sign(dy) * e.speed * 0.7;
        // A wrench thrower, or the berth thief about to pounce, steps back out to his distance first.
        if ((e.trainType === 'ic_docker' && e.range > 60 || e.trainType === 'nr_rack' && e.plan === 'pounce') && Math.abs(dx) < 80 && e.t < 90) { e.x -= Math.sign(dx || -e.face) * e.speed; e.face = Math.sign(dx) || e.face; break; }
        // (walking in, his strides are timed to bring him to his range on a planted cell: see aimGait)
        // (a black-cat of a group, a stride short of his range on a planted cell, commits from there: his reach covers it,
        // and a short walk in never has to step back to a planted cell)
        if (Math.abs(dx) > e.range && !e.plantBack && !(e.trainType === 'nr_commando' && Math.abs(dx) <= e.range + 8 && onPlanted(e) && groupMates(e).length)) { aimGait(e, Math.abs(dx) - e.range, dy); e.x += Math.sign(dx) * e.speed * (lane !== null && Math.abs(dx) > 60 && e.hurry > 1 ? e.hurry : 1); }
        else if (lane !== null ? Math.abs(lane - e.y) <= .5 : Math.abs(dy) <= 9) {
          if (GROUP.has(e.trainType) && groupMates(e).length && !groupGuardReady(e)) break;
          // Nobody piles onto CHAD while a tout has him held.
          if (slotsUsed() < slotCap() && swingReady() && !(G.player.state === 'held' && G.player.grabbedBy !== e)) { if (plantStep(e, dx)) break;
            e.state = 'windup'; e.t = 0; e.flash = 0; G.swingAt = G.time;
            if (familyAI(e)) familyMove(e);
            // out of a stride, the first ticks of the wind-up are spent planting his feet (see familyPose)
            e.settleAt = familyAI(e) && (e.walking || G.time - (e.locoAt ?? -99) <= SETTLE_T) && !NO_SETTLE.has(e.move) ? G.time + SETTLE_T : 0; e.plantBack = false;
            beginDelhiStance(e);
            // The IT guy hurls a desk phone from range, but smacks with his keyboard when cornered.
            e.smack = e.trainType === 'ic_thrower' && Math.abs(G.player.x - e.x) < 48 && Math.abs(G.player.y - e.y) < 14; }
          else { e.state = 'idle'; e.atkCd = wait(e, 20, 50); e.range = restRange(e); }
        }
        if (slotsUsed()<slotCap() && e.kind === 'bandar' && Math.abs(dx) < 90 && Math.abs(dx) > 34 && Math.abs(dy) < 9) {
          e.state = 'windup'; e.t = 0;
        }
        break;
      }
      case 'backoff': {
        // The chai wallah opens his retreat with a quick hop back (see familyPose).
        // (a captain of a group squares up two ticks out of his bash before he steps back: never a one-tick guard between them)
        // (in a group he stops short of a comrade behind him - 38px along, 27px across - and a stride short of the wall)
        const bm = groupMates(e), bx = e.x - e.face * e.speed * 1.4;
        if (bm.length && e.t >= 2 && (bm.some(o => Math.abs(bx - o.x) < 38 && Math.abs(e.y - o.y) < 27 && Math.abs(bx - o.x) < Math.abs(e.x - o.x)) || bx < arenaMin() + 20 || bx > arenaMax() - 20)) { e.state = 'idle'; e.atkCd = wait(e, 40, 80); e.backTo = 0; break; }
        if (!(GROUP.has(e.trainType) && e.t < 2 && bm.length)) e.x -= e.face * e.speed * (e.trainType === 'nr_chai' && e.t < HOP_T ? 2.2 : 1.4);
        // a set distance to reach (the captain's step back after a close bash) keeps him going, within reason
        if (e.t > 26 && !(e.backTo && Math.abs(p.x - e.x) < e.backTo && e.t < 80)) { e.state = 'idle'; e.atkCd = wait(e, 40, 80); e.backTo = 0; }
        break;
      }
      case 'grabhold': {
        if (p.grabbedBy !== e) { e.state = 'idle'; e.atkCd = wait(e, 40, 80); break; }
        p.x = e.x + e.face * 25; p.y = e.y; p.z = 0;
        e.holdT++;
        // The tout's hold from behind is short and cheap: a jab every third of a second, then he lets go.
        const tout = e.trainType === 'ic_brawler', [every, bite, hold] = tout ? [20, 4, 60] : [30, 5, 100];
        if (e.holdT % every === 0) {
          p.hp -= Math.round(bite * diff().dmg);
          spawnSpark(p.x, p.y - 44);
          G.audio.sfx('punch');
          if (p.hp <= 0) p.hp = 1;
        }
        if (p.mash >= 5 || e.holdT > hold) {
          const escaped = p.mash >= 5;
          p.grabbedBy = null; p.mash = 0;
          if (escaped) {
            p.state = 'idle'; p.t = 0; p.invuln = 24;
            hurtEnemy(e, 6, -e.face, true, false);
            spawnPop(p.x, p.y - 48, 'BREAK');
          } else if (tout) {
            p.state = 'idle'; p.t = 0; p.invuln = 20;
          } else {
            hurtPlayer(p, 10, e.face, true);
          }
          // A BREAK knocks him down; only a grabber still standing goes back to idle.
          if (!e.dead && e.state === 'grabhold') { e.state = 'idle'; e.atkCd = wait(e, 70, 120); }
          else if (!e.dead) e.atkCd = wait(e, 70, 120);
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
          e.state='idle';e.atkCd=35;if(GROUP.has(e.trainType))e.stoodAt=G.time;break;   // (a black-cat stands his guard eight ticks: no step flashed out of it)
        }

        if (familyAI(e) && e.t < windOf(e)) familyWind(e);
        if (e.t >= windOf(e)) {
          e.state = 'attack'; e.t = 0; e.hitLanded = false;
          G.audio.sfx('whiff');   // the swing itself; contact adds the impact
          if (familyAI(e)) { familyStrike(e); break; }
          if (e.kind === 'bandar') { e.vx = e.face * 3.6; e.vz = 3.0; e.z = 0.1; G.audio.sfx('dash'); }
          if (e.kind === 'pehlwan') { e.vx = e.face * 2.2; G.audio.sfx('dash'); }
          if (e.kind === 'constable') e.armor = 1;
          if (e.kind === 'thela' && !e.ramGone) { e.vx = e.face * 2.6; G.audio.sfx('dash'); }
          if (isRam(e)) { e.vx = e.face * e.speed; e.charges = (e.charges || 0) + 1;if(e.kind==='bull')e.stridePhase=0; G.audio.sfx('dash'); }
        } else if (e.kind === 'bull' && e.t % 6 === 0) {
          spawnDust(e.x + e.face * 26, e.y, 2);   // dust under the pawing forehoof
        }
        break;
      }
      case 'rally': {
        // A visible, hittable call coordinates only existing crew. Interrupting
        // it loses this opportunity; it never bypasses the shared attack budget.
        const cmd=e.trainType==='nr_commando',rpf=['nr_guard','nr_commando','nr_captain'].includes(e.trainType),at=cmd?16:rpf?30:32;
        // the commando lowers the radio into his cover guard and holds his ground (a held cell never skates) while his partner comes in
        if(cmd&&e.t===at)coverFor(e);
        if(e.trainType==='nr_captain'&&e.t===at&&!e.backup){e.backup=true;const side=e.x<G.camX+W/2?G.camX+W+20:G.camX-20;spawnEnemy('nr_commando',side,e.y);}
        if(e.trainType==='nr_guard'&&e.t===4)G.audio.roomSfx?.('conductor_whistle',.6);
        if(rpf&&e.trainType!=='nr_guard'&&e.t===4)G.audio.sfx('blip');
        if(e.t===at){
          spawnPop(e.x,e.y-e.h-7,rpf?'BACKUP!':'CLOSE HIM!');
          for(const ally of G.enemies)if(ally!==e&&!ally.dead&&ally.trainType?.slice(0,3)===e.trainType.slice(0,3)&&ally.state==='idle')ally.atkCd=Math.min(ally.atkCd,10);
        }
        if(e.t>=(cmd?46:rpf?40:48)){e.state='idle';e.t=0;e.atkCd=30;}
        break;
      }
      // The partner's quick side-step in: square up on CHAD from his own side and swing.
      case 'coverstep': {
        const side=Math.sign(e.x-p.x)||e.face,tx=clamp(p.x+side*44,G.camX+16,G.camX+W-16);
        // a quick guard shuffle (1.6px a tick, one step cell per 6px) that he finishes before he squares up
        const there=(Math.abs(tx-e.x)<3||Math.abs(e.x-p.x)<=44)&&Math.abs(p.y-e.y)<4||e.t>=48;
        // timed to arrive on his guard cell: the shuffle's steps lengthen or shorten a little over the ground left
        const R=Math.hypot(Math.max(0,Math.min(Math.abs(tx-e.x)-3,Math.abs(e.x-p.x)-44)),Math.max(0,Math.abs(p.y-e.y)-4));
        e.stepK=R>3?aimK(STEP_BEATS,e.stepPos||0,[1],R,R+1,.7,1.4,3.2):1;
        // (short of it, he finishes the shuffle on its guard cell, a cell every two ticks, before he squares up)
        if(there&&e.t<64&&lastFrame(e,'step')===STEP_BEATS.length-1&&stepCell(e)!==1){if(G.time&1)break;const to=(stepCell(e)+1)%STEP_BEATS.length;e.stepPos=cellPos(STEP_BEATS,e.stepPos||0,to)+STEP_BEATS[to]/2;break;}
        if(there&&(e.sCellN||0)<2&&e.t<64)break;   // (his guard cell shows two ticks at least)
        if(there){e.state='idle';e.t=0;e.atkCd=1;e.walking=false;break;}
        if(Math.abs(e.x-p.x)>44)e.x+=clamp(tx-e.x,-1.6,1.6);e.y+=clamp(p.y-e.y,-1,1);
        if(e.t===1)spawnDust(e.x-e.face*10,e.y,2);
        break;
      }
      case 'attack': {
        if (familyAI(e)) familyAttack(e, p);
        else if (e.kind === 'goonda' || e.kind === 'berth') {
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
        } else if (e.smack) {
          if (e.t === 8 && !e.hitLanded) { tryHitPlayer(e, e.dmg, 46, false, 14, 'counter', 'weapon'); e.hitLanded = true; }
          if (e.t > 22) { e.state = 'backoff'; e.t = 0; e.smack = false; }
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
              { source: e, parryClass: 'unblockable', h: 37, spout: e.x + e.face * 20 });
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
            if (e.rig && !e.rig.broken) { e.rig.x = e.x + e.face * rigReach(e); e.rig.y = e.y + rigDepth(e); }
            if (!e.hitLanded && tryHitPlayer(e, e.dmg, e.rig ? 82 : 50, true, 18)) e.hitLanded = true;
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
            if(e.kind==='bull'){e.ramSide=null;e.ramRest=18;}
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
        if (e.perched) { e.vx = 0; e.z = e.perchZ; }   // rocked on the berth, not shoved along it
        e.x += e.vx; e.vx *= 0.88;
        if (e.t > 12) { e.state = e.perched ? 'perch' : e.gbT > 0 ? 'guardbreak' : tteLoose(e) ? 'fetch' : 'idle'; e.atkCd = wait(e, 30, 80); }
        break;
      }
      case 'stagger': {
        e.x += e.vx; e.vx *= 0.82;
        if (e.t >= STAGGER_T) { e.state = 'idle'; e.atkCd = wait(e, 60, 100); }
        break;
      }
      case 'down': {
        if (e.fallY !== undefined) { e.y += clamp(e.fallY - e.y, -1.5, 1.5); if (!inAir(e)) e.fallY = undefined; }
        if (inAir(e)) {
          const r = fall(e,undefined,e.superLaunched?(e.superBounced?0:.25):undefined);if(e.superLaunched&&r==='bounce')e.superBounced=true;
          if (r !== 'air') { e.fallY = undefined; e.floored = true; }   // first floor contact ends the tip off the berth; the bounce is a floor bounce
          if (r === 'bounce') { spawnDust(e.x, e.y, 2); G.audio.sfx('land'); }
          else if (r === 'land') { spawnDust(e.x, e.y, 3); G.shake = Math.max(G.shake, 2); G.audio.sfx('land'); }
        } else if (e.t > 45) { e.state = 'getup'; e.t = 0;e.superLaunched=false; }
        break;
      }
      case 'getup': {
        if (e.t >= getupTicks(e)) { e.state = 'idle'; e.atkCd = wait(e, 40, 90); }
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
          if (!pr.broken && !pr.decor && !pr.dead && Math.abs(pr.x - e.x) < 22 && Math.abs(pr.y - e.y) < 15) pr.hurt(20, Math.sign(e.vx) || 1, true, false, true);
        }
        if (!e.bossCollision && G.boss && !G.boss.dead && !G.boss.superLocked && !G.boss.backupProtected && G.boss.z < 30 && Math.abs(G.boss.x - e.x) < 28 && Math.abs(G.boss.y - e.y) < 18) {
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
        if (e.ventT > 0 && --e.ventT === 0) vent(e);
        if (e.fallY !== undefined && inAir(e)) e.y += clamp(e.fallY - e.y, -1.5, 1.5);
        if (inAir(e) && e.z > 30) e.t = Math.min(e.t, 12);   // KO'd off a berth: he hits the floor before he fades
        // one bounce off the floor, so the KO reads as a body and not a sprite
        if (inAir(e)) { const r = fall(e, 0.28, 0.3); if (r !== 'air') { e.koLanded = true; e.fallY = undefined; spawnDust(e.x, e.y, r === 'land' ? 3 : 2); } }
        // The body stays whole in the air; it lies a beat on the floor, blinks out and goes (the rest counts on the floor only).
        if (e.koLanded && !inAir(e)) e.koRest = (e.koRest || 0) + 1;
        if (e.koRest > KO_REST || e.t > 150) e.removeMe = true;
        break;
      }
    }

    // separation from other enemies, and nobody idles in a scalding puddle
    if (e.state === 'idle' || e.state === 'approach' || e.state === 'windup') {
      // nobody stands inside CHAD; the thela's belly needs the most room
      const pdx = e.x - p.x, keep = pushes(e) ? 76 : e.kind === 'thela' ? 34 : 20;  // the pushed cabinet or cart is his front
      // (a black-cat of a group, out of his swing, first shows his guard two ticks: then he steps off CHAD himself - see groupMove)
      if (!isRam(e) && Math.abs(pdx) < keep && Math.abs(e.y - p.y) < 12 && p.z < 10 && !(GROUP.has(e.trainType) && G.time - (e.recAt ?? -99) < 2 && groupMates(e).length)) {
        // (for a black-cat of a group it is a shove, not a step of his: CHAD walking over him never turns his stride round)
        const sx = Math.sign(pdx || -e.face) * 0.9; e.x += sx; if (GROUP.has(e.trainType) && groupMates(e).length) e.shove = (e.shove || 0) + sx; }
      if (e.state !== 'windup') for (const z of G.zones) if (z.both && Math.abs(e.x - z.x) < z.r + 8 && Math.abs(e.y - z.y) < z.r * .5 + 6) e.x += Math.sign(e.x - z.x || -e.face) * 0.9;
      for (const o of G.enemies) {
        if (o === e || o.dead || o.perched) continue;
        const dx = e.x - o.x, dy = e.y - o.y;
        const room = e.kind === 'thela' || o.kind === 'thela' ? 42 : 32;  // the barge-bellied need more of it
        if (Math.abs(dx) < room && Math.abs(dy) < 12) {
          const sx = Math.sign(dx || (familyAI(e) ? e.orbit : rand(-1, 1))) * 0.6;
          e.x += sx; e.shove = (e.shove || 0) + sx;   // (a shove is not a step: it never turns his stride round)
          e.y += Math.sign(dy || (familyAI(e) ? e.orbit : rand(-1, 1))) * 0.3;
        }
      }
    }

    // Animation is chosen from how far a body actually moved, not from the name of
    // its AI state: enemies drift in depth, back off and sway while nominally 'idle',
    // and playing the standing frame through that is what reads as sliding. Measuring
    // after the arena clamp also stops the legs cycling while walking into a wall.
    // (a black-cat of a group never goes faster along the carriage than he walks - his back-off pace backing off - whatever
    // adds up in the tick: his slot walk, keeping off CHAD, a comrade's shove. A lone captain keeps his own approved pacing.)
    if (GROUP.has(e.trainType) && ['idle', 'approach', 'backoff'].includes(e.state) && groupMates(e).length) {
      const cap = e.speed * (e.state === 'backoff' ? 1.4 : e.hurry || 1) + .05, dx = e.x - x0;
      if (Math.abs(dx) > cap) { const k = cap / Math.abs(dx); e.x = x0 + dx * k; e.shove = (e.shove || 0) * k; } }
    // (a black-cat or the captain never turns his stride round inside eight ticks of the last turn: the reversal waits)
    if (e.state === 'idle' && WALK_BEATS[e.trainType] && e.walking && Math.abs(e.x - x0 - (e.shove || 0)) > .05 && Math.sign(e.x - x0 - (e.shove || 0)) !== e.runDx && G.time - (e.runAt ?? -99) < 8) e.x = x0 + (e.shove || 0);
    const wet = clampToLane(e);
    if (e.stay && e.x < G.camX - 160) e.removeMe = true;
    // Arrivals walk on from off-screen (the captain's backup, wave spawns) instead of popping in at the wall.
    if(e.kind==='bull'&&e.x<G.camX-110)e.removeMe=true;
    const side = e.runner || e.stay || e.bullLeaving || e.state === 'flee' || e.state === 'spawn' ? 0 : clampToArena(e);
    e.moved = Math.hypot(e.x - x0, e.y - y0);
    // Signed stride along his facing; a move mostly up or down the lane walks forward, at the cadence
    // of his approach (the foreshortened floor: he closes the lane at .7 of his pace across it).
    const mx = e.x - x0, my = e.y - y0, sideFam = WALK_BEATS[e.trainType] && hasAIState(e.set._aiKey, 'sidestep');
    // (a tick mostly up or down the lane keeps the way the stride was going, so a zig-zag never rocks it across a cell edge;
    // a family with a side-step shows that instead, so its stride clock rests. Walking in, aimGait may lengthen or shorten his strides.)
    const sm = mx - (e.shove || 0); e.shove = 0;   // his own step, without any shove (a shove slides him; it never rocks his stride)
    // (turning from a stride into a side-step, he changes over from the planted cell he is on: the stride clock holds there)
    const toSide = sideFam && e.walking && e.depthWalk === false && Math.abs(my) > Math.abs(mx) * 1.5 && onPlanted(e);
    { const wb = WALK_BEATS[e.trainType], half = toSide ? 0 : wb && e.walking ? Math.min(...wb) / 2 : 1e9;   // (his gait never runs past a cell in under two ticks)
      e.wpBase = e.walkPos || 0; e.wpHalf = half;
      e.walkPos = (e.walkPos || 0) + clamp(Math.abs(mx) >= Math.abs(my) ? sm * e.face * (e.state === 'approach' ? e.walkK || 1 : 1) : sideFam && e.depthWalk ? 0 : (e.backstep ? -1 : 1) * e.moved / .7, -half, half); }
    if (Math.abs(sm) > .05) { e.backstep = sm * e.face < 0; e.lastDx = Math.sign(sm); }   // retreating while still facing CHAD (kept through a depth step)
    if (Math.abs(my) > .05) e.lastDy = Math.sign(my);
    if (Math.abs(sm) > .05 && Math.sign(sm) !== e.runDx) { e.runDx = Math.sign(sm); e.runAt = G.time; }
    if (e.state !== 'approach') e.plantBack = false;
    // (ticks walked in without getting anywhere: a black-cat held off by his partner stands down, and is never waited on; see approach)
    if (e.state === 'windup' && e.t <= 1) e.swungAt = G.time;   // (the black-cat group takes turns: groupTurn)
    if (e.state !== 'idle') e.slotGo = e.crossing = false;
    // Side-step or stride: switched only after three ticks the other way, never a one-tick swap (latched while he stands).
    // A fresh start picks its gait at once (no stride flashed before the side-step); a diagonal between the two keeps the one he is in.
    // (a step or so short of his swing he keeps the gait he is in: no change of gait flashed before the wind-up)
    // (though a black-cat never side-steps along the carriage: moving only along it, he changes to his stride all the same)
    const nearSwing = e.state === 'approach' && Math.abs(G.player.x - e.x) <= e.range + 12 && Math.abs(G.player.y - e.y) <= 15;
    if (e.moved > MOVE_EPS) { const dw = e.depthWalk ? Math.abs(my) >= Math.abs(mx) : Math.abs(my) > Math.abs(mx) * 1.5;
      if (!e.walking || e.depthWalk === undefined) { e.depthWalk = dw; e.depthRun = 0; }
      else { e.depthRun = dw !== e.depthWalk && (!nearSwing || e.depthWalk && sideFam && e.trainType === 'nr_commando' && Math.abs(my) <= .05) ? (e.depthRun || 0) + 1 : 0; if (e.depthRun >= 3) {
        // (between stride and side-step he changes on a planted cell: the gait he is in steps on to one first)
        // (in a group, the finishing step shares his walking pace with the step he took this tick)
        // (in a group, the finishing step and the tick's own walk share one stride: never over a cell in two ticks)
        // (in a group, giving up on the planted cell waits for the cell he is in to show its second tick)
        const grpM = GROUP.has(e.trainType) && groupMates(e).length > 0;
        if (sideFam && (e.depthRun < 16 || grpM && (G.time - (e.landAt ?? -9) < 2 || e.depthRun < 18 && (e.gCellN || 0) < 2)) && plantOn(e, grpM ? Math.max(0, e.speed + .05 - Math.abs(e.x - x0)) : Infinity)) { if (e.depthWalk) e.x -= sm;
          else if (grpM && e.wpHalf < 1e9) e.walkPos = e.wpBase + clamp(e.walkPos - e.wpBase, -e.wpHalf, e.wpHalf); }   // (pending: closing his side-step, he holds his ground along the carriage)
        else { e.depthWalk = dw; e.depthRun = 0; if (!DELHI_FAMILY.has(e.trainType)) alignGait(e); } } } }
    // the side-step's own clock: a diagonal never runs it backwards (aimed at a closing cell by the lane he walks to: e.sideK)
    if (!e.depthRun) e.sidePos = (e.sidePos || 0) + e.moved / .7 * (e.sideK || 1);
    e.sideK = 1;
    // A step or two short of his swing he stays in his guard: no stride flashed just before the wind-up.
    const commit = e.state === 'approach' && !e.walking && Math.abs(G.player.x - e.x) <= e.range + 3 * e.speed && Math.abs(G.player.y - e.y) <= 9 + 2 * e.speed;
    // Walk or stand, with hysteresis: moving with a purpose (in, or backing off) he strides from the first tick;
    // drifting (idle) it takes two ticks and three px, and four still ticks end it, so a nudge never flashes a frozen walk cell in the guard.
    if (!LOCO.has(e.state)) { e.walking = false; e.moveRun = e.stillRun = 0; }
    else if ((GROUP.has(e.trainType) && groupMates(e).length ? Math.hypot(sm, my) : e.moved) > MOVE_EPS) { e.stillRun = 0; e.plantRun = 0; e.moveAcc = (e.moveAcc || 0) + e.moved;
      const purpose = WALK_BEATS[e.trainType] && (e.state === 'approach' || e.state === 'backoff' || e.laneGo === G.time || e.state === 'idle' && e.slotGo);
      if ((e.moveRun = (e.moveRun || 0) + 1) >= (purpose ? 1 : 2) && !commit && !e.walking && (!GROUP.has(e.trainType) || !groupMates(e).length || groupGuardReady(e)) && (!WALK_BEATS[e.trainType] || purpose || e.moveAcc >= 3)) {
        e.walking = true; alignGait(e); if (Math.abs(sm) > .05) { e.runDx = Math.sign(sm); e.runAt = G.time; } } }
    else { e.moveRun = 0; e.moveAcc = 0; e.stillRun = (e.stillRun || 0) + 1;
      // (stopping, he finishes the step he is in - real steps on to a planted cell - within reason)
      if (e.walking && (e.plantRun = (e.plantRun || 0) + 1) <= 40 && plantOn(e, Infinity, true)) e.stillRun = Math.min(e.stillRun, 3);
      // (standing a beat just before he walks in, he keeps the planted cell he stopped on: no guard flashed between two walks)
      // (a side-step ends in his guard, not held on its last cell)
      if (e.stillRun >= 4 && !(WALK_BEATS[e.trainType] && (!sideStepping(e) || GROUP.has(e.trainType) && e.atkCd <= 3 && groupMates(e).length > 0) && e.stillRun < 8 && (e.state === 'idle' && e.atkCd <= 3 || e.state === 'approach' && e.t <= 2))) { if (e.walking) { e.stoodAt = G.time; e.standDir = e.slotGo ? (e.slotDir === e.lastDx ? 1 : -1) : 0; } e.walking = false; } }
    if (wasWalking && !e.walking && LOCO.has(e.state)) beginDelhiStance(e);
    if (e.walking || e.state === 'coverstep') e.locoAt = G.time;
    // Attached rigs track the hands; a floored porter permanently leaves his cart behind.
    if (pushes(e) && !e.dead && !CARRY_LET_GO.includes(e.state)) {
      if(e.trainType==='ic_heavy')e.rig.face=e.face;
      const previousX = e.rig.x;
      const tx = e.x + e.face * rigReach(e), ty = e.y + rigDepth(e), d = Math.hypot(tx - e.rig.x, ty - e.rig.y);
      if (d <= 4) { e.rig.x = tx; e.rig.y = ty; } else { e.rig.x += (tx - e.rig.x) * 4 / d; e.rig.y += (ty - e.rig.y) * 4 / d; }
      if (e.trainType === 'ic_heavy') e.rig.wheelTravel = (e.rig.wheelTravel || 0) + (e.rig.x - previousX) * e.face;
    }
    if (e.trainType === 'nr_heavy' && e.rig?.carried && !e.rig.broken && !e.dead) {
      e.rig.x = e.x + e.face * rigReach(e); e.rig.y = e.y + rigDepth(e); e.rig.dead = CARRY_LET_GO.includes(e.state);
    }
    e.stridePhase += e.moved * (e.state === 'approach' ? e.walkK || 1 : 1); e.walkK = 1;
    // (the step he finishes on to his planted cell counts as moving too)
    if (WALK_BEATS[e.trainType] && e.state !== 'coverstep') e.moved = Math.max(e.moved, Math.hypot(e.x - x0, e.y - y0));
    { const g = WALK_CONTACT[e.trainType] && gaitOf(e), c = g && e.walking ? beatAt(g.b, e[g.key] || 0)[0] : -1;   // ticks the gait cell has shown
      if (c !== e.gCell) { e.gCell = c; e.gCellN = 0; } e.gCellN++;
      const sc = sideStepping(e) && e.walking ? Math.floor((e.sidePos || 0) / SIDESTEP_PX) : -1; if (sc !== e.sdCell) { e.sdCell = sc; e.sdCellN = 0; } e.sdCellN++; }
    // the cover shuffle's own clock opens on its guard cell (whatever brought him there), its steps timed by e.stepK
    if (e.state === 'coverstep') { e.stepPos = e.t <= 1 ? STEP_BEATS[0] + .01 : (e.stepPos || 0) + e.moved * (e.stepK || 1);
      const c = beatCell(STEP_BEATS, e.stepPos); if (c !== e.sCell) { e.sCell = c; e.sCellN = 0; } e.sCellN++; }
    // wallSplat owns the x axis and pitFall the depth axis, so they can never
    // compete for the same body - the else makes that precedence explicit.
    if (side && !e.dead && (e.state === 'down' || e.state === 'thrown')) wallSplat(e, side);
    else if (wet && !e.dead) pitFall(e);
  }
  // sweep removed
  for (let i = G.enemies.length - 1; i >= 0; i--) if (G.enemies[i].removeMe) G.enemies.splice(i, 1);
}

// The walk cell for a distance walked, from a per-cell list of the ground each drawn step covers.
const beatCell = (beat, d) => beatAt(beat, d)[0];
// A new stride or side-step starts at the top of its cell, so its first pose is held a full beat, never flashed.
// With planted cells known, it starts from the nearer planted pair (backing off, from its far end: the cycle runs in reverse),
// and a side-step starts from its first cell (lifting the near boot).
function alignGait(e) {
  const b = WALK_BEATS[e.trainType] || (DELHI_FAMILY.has(e.trainType)||isRefund(e) ? e.walkBeat : null), w = e.walkPos || 0, C = gaitStart(e);
  if (!b) return;
  if (e.depthWalk && WALK_BEATS[e.trainType]) { const n = hasAIState(e.set._aiKey, 'sidestep') ? lastFrame(e, 'sidestep') + 1 : 2, L = SIDESTEP_PX * n, o = SIDE_START[e.trainType];
    e.sidePos = Math.ceil((e.sidePos || 0) / L) * L + (o && o < n ? (o - n) * SIDESTEP_PX : 0); }
  else if (b.length === gaitCount(e)) {
    const [i, u] = beatAt(b, w);
    if (!C) { e.walkPos = e.backstep ? w + b[i] - u - .01 : w - u; return; }
    const n = b.length, gap = k => Math.min((k - i + n) % n, (i - k + n) % n), pr = C.reduce((a, c) => gap(c[0]) < gap(a[0]) ? c : a);
    // (standing on one cell of the pair already, he starts from that cell: no step flashed the other way first)
    // (in a group, the cell he stood on is the one before this tick's step: backing off a planted cell's first ply, the
    // step behind it never makes him start from the pair's far cell - no step flashed forward first)
    const i0 = GROUP.has(e.trainType) && groupMates(e).length && e.wpBase != null ? beatAt(b, e.wpBase)[0] : i;
    const k = pr.includes(i0) ? i0 : pr.includes(i) ? i : e.backstep ? pr[1] : pr[0];
    e.walkPos = e.backstep ? cellPos(b, w, k) + b[k] - .01 : cellPos(b, w, k) + (GROUP.has(e.trainType) && groupMates(e).length ? 1e-6 : 0);   // (in a group, a hair inside the cell: float dust never shows the one before)
  }
}
// An opposite planted stance changes guard in place, rather than swapping leg identities in one tick.
function beginDelhiStance(e) {
  if (!DELHI_FAMILY.has(e.trainType) || e.stanceAt != null || !hasAIState(e.set._aiKey, 'stance_settle')) return;
  const g = gaitOf(e), preferred = gaitStart(e)?.[0];
  if (!g || !preferred) return;
  const c = beatCell(g.b, e[g.key] || 0);
  if (!g.C.includes(c) || preferred.includes(c)) return;
  e.stanceAt = G.time; e.stanceFace = e.face; e.walking = false;
}
// walkPos at the start of cell k in the cycle w is on
const cellPos = (b, w, k) => { const L = b.reduce((a, c) => a + c, 0); let x = w - (((w % L) + L) % L); for (let j = 0; j < k; j++) x += b[j]; return x; };
// Out of a stride he commits only from a planted cell (both boots down, near his guard), never from a lifted boot.
// Walking in, his strides are timed to arrive on one at his range (aimGait); short of one, he takes real steps to it -
// on toward CHAD while that leaves room for his body or attached cart, else back to the one behind.
function plantStep(e, dx) {
  // (side-stepping in, he swings from a cell with both feet down: from any other, he side-steps on to one first)
  if (sideStepping(e)) return e.walking && !NO_SETTLE.has(e.plan) && plantOn(e);
  const g = gaitOf(e);
  if (!g || !e.walking || NO_SETTLE.has(e.plan)) return false;
  const { b, key, C } = g, n = b.length, [i, u] = beatAt(b, e[key] || 0);
  // Finishing a cart step into its separation radius would undo the step every tick and trap its gait between contacts.
  const cart = e.trainType === 'ic_heavy' && pushes(e), clearance = cart ? 76 : 26;
  const backRoom = dx > 0 ? e.x - arenaMin() : arenaMax() - e.x;
  if (cart && Math.abs(dx) < clearance && backRoom < clearance - Math.abs(dx) + .5) {
    releaseCart(e); e.walking = false; e.state = 'idle'; return true;
  }
  if (cart && Math.abs(dx) < clearance) {
    e.plantBack = true; e.x -= Math.sign(dx || e.face) * e.speed; return true;
  }
  // on a planted cell he swings once it has shown two ticks: if it has not, one more step inside it (the way he is going)
  if (C.includes(i)) {
    if ((e.gCellN || 0) >= 2) return false;
    const room = (key === 'walkPos' && e.plantBack ? u : b[i] - u) - .3, go = Math.min(e.speed, room);
    // (in a group, with no room for that step, he holds the cell where he stands for its second tick)
    if (go < .3 || !e.plantBack && Math.abs(dx) - go < clearance) return GROUP.has(e.trainType) && groupMates(e).length > 0;
    e.x += (e.plantBack ? -1 : 1) * Math.sign(dx) * go; return true;
  }
  let a = b[i] - u, r = u, j = i;
  while (!C.includes(j = (j + 1) % n)) a += b[j];
  j = i; while (!C.includes(j = (j - 1 + n) % n)) r += b[j];
  // (a black-cat only a few ticks into his walk in, with CHAD come on to him, finishes the step forward if it leaves him
  // 16px off: stepping back to the last planted cell would turn his stride straight round - in a group, however long the walk)
  const fresh = GROUP.has(e.trainType) && e.runDx === Math.sign(dx) && (G.time - (e.runAt ?? -99) < 24 || groupMates(e).length > 0);
  const on = !e.plantBack && Math.abs(dx) - a - .5 >= (fresh ? 16 : clearance), back = key === 'walkPos' && !on;
  // Boxed against a wall, he parks the intact cart instead of trying to finish a step beyond the arena.
  if (cart && !on && r + .5 > backRoom) {
    releaseCart(e); e.walking = false; e.state = 'idle'; return true;
  }
  // (in a group, with CHAD come on too close for that, he commits where he is - his wind-up plants his boots first - never
  // stepping back)
  if (!on && fresh && groupMates(e).length && !e.plantBack) return false;
  if (!on) e.plantBack = true;
  e.x += (on ? 1 : -1) * Math.sign(dx) * Math.min((back ? r : a) + .5, e.speed);
  return true;
}
// The stride factor (.8-1.25 of his step) that brings a gait clock at w onto one of the cells A after lo-hi px more ground,
// at least m px into that cell.
function aimK(b, w, A, lo, hi, kmin = .8, kmax = 1.25, m = .5) {
  const L = b.reduce((x, y) => x + y, 0);
  let best = 1, err = 1e9;
  for (let j = 0; j < 4; j++) for (const c of A) {
    const s0 = cellPos(b, w, c) + j * L + Math.min(m, b[c] - 1), s1 = cellPos(b, w, c) + j * L + b[c] - .3;
    if (s1 <= w) continue;
    const kl = (s0 - w) / hi, kh = (s1 - w) / Math.max(lo, .5);
    if (kl > kh) continue;
    const k = clamp(1, kl, kh);
    if (Math.abs(k - 1) < err) { err = Math.abs(k - 1); best = k; }
  }
  return clamp(best, kmin, kmax);
}
// Walking in: from his range to 9px inside it he may swing, so he times his strides (a little longer or shorter) to land a planted cell there.
function aimGait(e, D, dy) {
  const g = gaitOf(e);
  if (!g || !e.walking || sideStepping(e) || e.backstep || D > 140) return;
  const q = g.key === 'stridePhase' && Math.abs(dy) > 6 ? Math.hypot(1, .7) : 1;   // (a stride clock also runs on the depth he closes)
  e.walkK = aimK(g.b, e[g.key] || 0, g.C, (D + e.speed) * q, (D + 9) * q);   // (he reaches his range up to a step past it)
}
const sideStepping = e => e.depthWalk && WALK_BEATS[e.trainType] && hasAIState(e.set._aiKey, 'sidestep');
// A family's drawn walk as beats over its clock (walkPos, or stridePhase at a fixed stride), with its planted cells;
// null when its planted cells are unmeasured (tools: stutter_fix/contact.py) or the art does not match.
function gaitOf(e) {
  const k = e.trainType, C = k === 'ic_heavy' && !pushes(e) ? TYPES.ic_heavy.unarmedContacts : WALK_CONTACT[k], n = gaitCount(e);
  if (!C) return null;
  const wb = WALK_BEATS[k] || e.walkBeat;
  if (wb) return wb.length === n ? { b: wb, key: 'walkPos', C } : null;
  if (!STRIDE[k]) return null;
  // (the berth thief's cycle runs in reverse as he backs off)
  const rev = k === 'nr_rack' && (e.state === 'backoff' || e.state === 'approach' && e.plan === 'pounce' && Math.abs(G.player.x - e.x) < 80);   // (as his pose plays it)
  return { b: Array(n).fill(STRIDE[k]), key: 'stridePhase', C: rev ? C.map(c => n - 1 - c) : C };
}
const gaitCount = e => lastFrame(e, ['ic_heavy','ic_cabinet'].includes(e.trainType) && pushes(e) ? 'push' : 'walk') + 1;
const gaitStart = e => e.trainType === 'ic_heavy' && !pushes(e) ? TYPES.ic_heavy.unarmedStarts : WALK_START[e.trainType];
// Stopping (or changing gait) out of a stride, he finishes the step he is in: real steps on, the body moving with the beat,
// to the next planted cell, then holds it two ticks; false once planted. A side-step stands from any cell with both feet
// down (SIDE_DOWN), else side-steps on to one the same way. (stride clocks run on whichever way he moves)
// Side-stepping onto his lane from a cell with both feet down, the last scrap of it (under 2px) is not worth stepping off that cell for.
function sideHold(e, left, dy) {
  if (!sideStepping(e) || Math.abs(left) >= 2) return false;
  const n = lastFrame(e, 'sidestep') + 1, w = e.sidePos || 0, c = Math.floor(w / SIDESTEP_PX);
  return (SIDE_DOWN[e.trainType] || [n - 1]).includes(c % n) && Math.floor((w + Math.abs(dy) / .7) / SIDESTEP_PX) !== c;
}
function plantOn(e, lim = Infinity, stand = false) {
  if (sideStepping(e)) {
    const n = lastFrame(e, 'sidestep') + 1, c = Math.floor((e.sidePos || 0) / SIDESTEP_PX), i = c % n, S = SIDE_DOWN[e.trainType] || [n - 1];
    // (in a group, a planted side-step cell shows two ticks before he swings or stands from it: never a one-tick side-step)
    if (S.includes(i)) return G.time - (e.landAt ?? -9) < 2 || (e.sdCellN || 0) < 2 && GROUP.has(e.trainType) && groupMates(e).length > 0;
    let d = (c + 1) * SIDESTEP_PX - (e.sidePos || 0) + .5, j = i;
    while (!S.includes(j = (j + 1) % n)) d += SIDESTEP_PX;
    if (d > SIDESTEP_PX + .5) return false;   // (more than a cell from a planted one, he stands at once: no drift down the lane)
    const st = Math.min(d, .6 / .7);
    e.y += (e.lastDy || 1) * st * .7; e.sidePos = (e.sidePos || 0) + st;
    if (st >= d) e.landAt = G.time;
    return true;
  }
  const g = gaitOf(e);
  if (!g) return false;
  const { b, key, C } = g, n = b.length, [i, u] = beatAt(b, e[key] || 0);
  // (in a group, however he came on to the planted cell, it shows two ticks before he turns or swings from it)
  if (C.includes(i)) return G.time - (e.landAt ?? -9) < 2 || (e.gCell !== i || (e.gCellN || 0) < 2) && GROUP.has(e.trainType) && groupMates(e).length > 0;
  // (the step goes on the way he was walking: turned about mid-step, passing behind CHAD, it finishes as a back-step, never swung round)
  const s = key !== 'walkPos' ? 1 : e.lastDx ? e.lastDx * e.face : e.backstep ? -1 : 1;
  let d = (s > 0 ? b[i] - u : u) + .5, j = i;
  while (!C.includes(j = (j + s + n) % n)) d += b[j];
  if (d > 46) return false;
  const st = Math.min(d, Math.max(e.speed, 1), lim), dx = (key === 'walkPos' ? s * e.face : e.lastDx || e.face) * st;
  // (standing, in a group, never finished into a comrade: one lunging or walking into his way, he stands where he is -
  // (nor on to CHAD: within 30px of him along the carriage, and nearer, he stands where he is; nor, in a group, a step into the
  // carriage end at all - the wall would turn his stride round)
  if (stand && GROUP.has(e.trainType) && groupMates(e).some(o => Math.abs(e.x + dx - o.x) < 38 && Math.abs(e.y - o.y) < 27 && Math.abs(e.x + dx - o.x) < Math.abs(e.x - o.x))) return false;
  if (stand && GROUP.has(e.trainType) && groupMates(e).length && Math.abs(e.x + dx - G.player.x) < 30 && Math.abs(e.y - G.player.y) < 30 && Math.abs(e.x + dx - G.player.x) < Math.abs(e.x - G.player.x) || GROUP.has(e.trainType) && groupMates(e).length && (e.x + dx < arenaMin() || e.x + dx > arenaMax())) return false;
  e.x += dx; e[key] = (e[key] || 0) + s * st;
  // (in a group, a step that ends inside the planted cell lands there too: it holds its two ticks before he turns or swings)
  if (st >= d || C.includes(beatAt(b, e[key])[0]) && GROUP.has(e.trainType) && groupMates(e).length > 0) e.landAt = G.time;
  return true;
}
// [cell, px into it] along the cycle
const beatAt = (beat, d) => { const L = beat.reduce((a, b) => a + b, 0); let x = ((d % L) + L) % L, i = 0; while (x >= beat[i]) x -= beat[i++]; return [i, x]; };
// The Night Train cast push themselves up through four drawn cells: slow enough to read each one.
// A heavy man can weight his cells: ticks spent on each (the TTE lingers kneeling, then hoists the trunk).
const GETUP_W = { nr_tte: [6, 7, 10, 7],
  ...Object.fromEntries([...DELHI_FAMILY].map(k => [k,
    k === 'ic_heavy' ? [5, 6, 7, 6, 6, 4] : [4, 5, 6, 5, 5, 4]])),
};
const getupTicks = e => GETUP_W[e.trainType] ? GETUP_W[e.trainType].reduce((a, b) => a + b) : e.trainType?.startsWith('nr_') || isRefund(e) ? 26 : 15;
const getupCell = (e, count) => { const w = GETUP_W[e.trainType]; if (!w) return Math.min(count - 1, Math.floor(e.t * count / getupTicks(e)));
  let t = e.t, i = 0; while (i < w.length - 1 && t >= w[i]) t -= w[i++]; return Math.min(count - 1, i); };

export function drawEnemy(ctx, e, camX) {
  // Once the body has burst into pieces it stays gone (the super's end resets the dying clock and clears superImpact).
  if(e.dead&&e.dismembered&&(e.piecesGone||e.superImpact?.finish||e.t>=8)){e.piecesGone=true;return;}
  const sx = Math.round(e.x - camX), sy = Math.round(e.y - e.z);
  let name = 'idle', idx = (G.time >> 4) & 1;
  const k = e.kind;
  switch (e.state) {
    case 'block':name='block';idx=0;break;
    case 'rally':name='call';idx=Math.min(2,Math.floor(e.t/16));break;
    case 'spawn': case 'approach': case 'backoff': case 'loot': case 'idle':
      // Backing away plays the stride in reverse, so the feet step back instead of moonwalking.
      // (a scripted walk that sets moved itself, e.g. an India cinematic, walks at once)
      if (e.walking || e.moved >= 2) { name = 'walk'; idx = e.walkBeat ? beatCell(e.walkBeat, e.walkPos || 0) : Math.floor(e.stridePhase / 6); if (e.backstep && !e.walkBeat) idx = 719999 - idx; }
      else { name = 'idle'; idx = (G.time >> 4) & 1; }
      break;
    case 'runner': name = 'run'; idx = Math.floor(e.stridePhase / 5); break;
    case 'rise': name = 'rise'; idx = Math.min(3, (e.t / 6) | 0); break;
    case 'drag': case 'grabhold': ({name,idx}=e.set?._aiKey&&getAIFrame(e.set._aiKey,'grab')?{name:'grab',idx:0}:{name:'atk',idx:1}); break;
    // Every family with a signature strip winds up in it: the bull paws, the cooker
    // primes, the dhobi draws the whip back, the thela drops behind his cart.
    case 'windup':
      name = k === 'bull' ? 'paw' : k === 'cooker' ? 'beam' : k === 'dhobi' ? 'whip'
        : k === 'thela' ? (e.ramGone ? 'punch' : 'ram') : 'atk';
      idx = k === 'bull' ? Math.min(3,Math.floor(e.t*4/windOf(e))) : 0;
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
    case 'stagger': ({name,idx}=dazePose(e, STAGGER_T - e.t)); break;
    case 'down': case 'dying': case 'corpse': name = 'down'; break;
    // a family without a getup strip rises through its hurt pose rather than
    // snapping from the floor straight into the idle
    case 'getup':
      if (getAIFrame(e.set._aiKey, 'getup')) {
        name = 'getup';
        if(e.trainType){const count=getAIFrame(e.set._aiKey,'getup').f.length;idx=getupCell(e,count);}
      }
      else { name = e.t < 7 ? 'down' : 'hurt'; idx = 0; }
      break;
    case 'grabbed': name = 'hurt'; break;
    case 'thrown': name = 'down'; break;
    case 'perch': name = 'perch'; idx = (G.time >> 4) & 3; break;
    case 'climb':name=getAIFrame(e.set._aiKey,'climb')?'climb':'perch';idx=Math.floor(e.t/6);break;
    case 'land':name='land';idx=Math.min(1,Math.floor(e.t/4));break;
    case 'pthrow': name = 'throw'; idx = e.t < 10 ? 0 : e.t < 14 ? 1 : e.t < 24 ? 2 : 3; break;
    case 'drop': name='drop';idx=e.vz>0?1:2;break;
  }
  // The luggage carrier strikes with the trunk in his hands. The shared thela
  // renderer's ram alias is a walking cycle, not this new attack performance.
  let lift = 0, slide = 0;
  if (familyAI(e)) { ({ name, idx, lift = 0, slide = 0 } = familyPose(e, name, idx)); if (e.walking && WALK_BEATS[e.trainType]) e.locoPose = { name, idx, lift, slide, face: e.face }; }
  // Parried in the air, a leaper keeps his leap cell on the way down and holds his landing crouch.
  if(e.state==='stagger'&&e.set?._aiKey&&(e.z>0&&!e.perched||e.parryLandT>0))({name,idx}=parryFallPose(e));
  if(familyAI(e)&&['down','dying','thrown'].includes(e.state)&&aloft(e)&&getAIFrame(e.set._aiKey,'fall')){name=e.fallY!==undefined&&hasAIState(e.set._aiKey,'tip')?'tip':'fall';idx=0;}
  // A family with its own corpse cell (limp, props dropped) lies in it once dead on the floor.
  else if(['dying','corpse'].includes(e.state)&&!aloft(e)&&hasAIState(e.set?._aiKey,'dead')){name='dead';idx=0;}
  // Refund Tower's office roles keep their own shared-role poses.
  if(e.trainType?.startsWith('ic_')&&!familyAI(e)){
    const pitch=e.trainType==='ic_thrower'&&!e.smack;
    if(e.state==='windup'&&e.kind!=='cooker'){name=pitch?'throw':'atk';idx=0;}
    if(e.state==='attack'&&pitch){name='throw';idx=e.t<7?0:1;}
    if(e.state==='attack'&&e.smack){name='atk';idx=e.t<10?1:2;}
    if(e.state==='dodge'){name='dodge';idx=0;}
    if(e.trainType==='ic_cabinet'){
      const carry=e.rig&&!e.rig.broken&&!e.ramGone;
      if(carry&&['idle','approach','backoff','spawn','loot'].includes(e.state)){name='ram';idx=e.walking?Math.floor(e.stridePhase/8)%3:0;}
      if(['windup','attack'].includes(e.state)){name=e.ramGone?'punch':'ram';idx=e.state==='windup'?0:e.ramGone?(e.t<6?1:2):(e.t>>2)%3;}
    }
  }
  if(e.trainType?.startsWith('ic_')){
    if(['down','dying','thrown'].includes(e.state)){name=aloft(e)?'fall':'down';idx=(DELHI_FAMILY.has(e.trainType)||isRefund(e))&&aloft(e)&&e.vz<0?1:0;}
    if(e.state==='stagger')({name,idx}=dazePose(e, STAGGER_T - e.t));
  }
  // The dead cooker's vent ring, and the red lane of a live one's whistle.
  if (e.ventT > 0 || e.state === 'windup' && e.move === 'jet' && e.t > 20) {
    ctx.save(); ctx.globalAlpha = .4 + .35 * ((G.time >> 2) & 1); ctx.strokeStyle = '#ff4050'; ctx.lineWidth = 1;
    if (e.ventT > 0) { ctx.beginPath(); ctx.ellipse(sx, Math.round(e.y), 50, 12, 0, 0, Math.PI * 2); ctx.stroke(); }
    else { const x0 = e.face > 0 ? sx + 10 : sx - 130; ctx.globalAlpha *= .5; ctx.fillStyle = '#ff4050'; ctx.fillRect(x0, Math.round(e.y) - 7, 120, 1); ctx.fillRect(x0, Math.round(e.y) + 6, 120, 1); }
    ctx.restore();
  }
  if (e.state === 'dying' && ((G.time >> 1) & 1) && e.koRest > KO_REST - 16) return; // KO blink-out, on the floor only
  const boxing=boxingVictimPose(e)||defeatVictimPose(e);if(boxing){name=boxing.name;idx=boxing.idx;}
  // An unarmed coolie borrows his armed sheet for poses his own does not have yet.
  let set = e.set;
  if (e.altSet && !getAIFrame(set._aiKey, name)) { set = e.altSet; if (name === 'idle' || name === 'walk') { name = 'unarmed'; idx = 0; } }
  const f = getFrame(set, name, idx, e.face);
  const dx = Math.round(e.x - camX - slide) - Math.round(frameW(f) / 2), dy = sy - frameH(f) + 4 - lift;   // rounded once
  // Red landing ring under a berth drop, from the coil to the landing.
  if (e.state === 'drop' && e.landT) {
    ctx.save(); ctx.globalAlpha = .45 + .35 * ((e.t >> 2) & 1); ctx.strokeStyle = '#ff4050'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(Math.round(e.landX - camX), Math.round(e.dropY), 24, 6, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
  if (e.trunk) drawTteTrunk(ctx, e, camX);
  const dazed=beginDazePose(ctx,e,sx,sy);
  if(boxing){const py=boxing.py??40;ctx.save();ctx.translate(sx+boxing.dx,sy+boxing.dy-py);ctx.rotate(boxing.angle);ctx.translate(-sx,-sy+py);}
  // Attack tells stay overhead so they never recolour the actor.
  const cue = cueOn(e);
  const hot = boxing?boxing.flash:e.flash > 0;
  if (hot || e.tint) {
    ctx.save();
    ctx.filter = hot ? 'brightness(1.18)' : e.tint;
    blit(ctx, f, dx, dy);
    ctx.restore();
  } else {
    // the snatcher's back-hop leaves a short whiff trail
    if(e.state==='dodge')for(const [k,a]of [[6,.14],[3,.26]]){ctx.save();ctx.globalAlpha=a;blit(ctx,f,dx-Math.round(e.vx*k),dy+Math.round(e.vz*k));ctx.restore();}
    blit(ctx, f, dx, dy);
  }
  if(boxing)ctx.restore();
  if(dazed)ctx.restore();
  // the pickpocket holds up what he stole
  if (e.carry) { const im = fx(e.carry.kind === 'shake' ? 'pick_lassi' : 'pick_chaat', 0); if (im) blit(ctx, im, sx + e.face * 10 - frameW(im) / 2, sy - e.h + 6 - frameH(im)); }
  // Delhi's snatcher has the stolen chain painted into his authored poses.
  if (e.chain && e.trainType !== 'ic_runner' && (G.time >> 3) & 1) { ctx.fillStyle = '#ffe680'; const gx = sx + e.face * 9, gy = sy - e.h - 2; ctx.fillRect(gx - 1, gy, 3, 1); ctx.fillRect(gx, gy - 1, 1, 3); }
  drawDaze(ctx,e,camX);
  if (e.state === 'chew' || e.state === 'absorb') drawChewCue(ctx, e, sx, sy);
  if(cue&&!G.reflecting){drawAttackAccent(ctx,f,dx,dy,e,attackClass(e));drawAttackMarker(ctx,attackClass(e),sx,poseAttackMarkerY(f,dy,e,sy-e.h-8),e);}
  // poise pips: shows a heavy is still absorbing, and when it is about to break
  if (!cue && e.maxPoise && e.poise > 0 && e.state !== 'down' && e.state !== 'dying') {
    // (the bull's hitbox is taller than his hump: his pips sit just over the horns, not in mid-air)
    const top = e.kind === 'bull' ? 62 : e.h;
    for (let i = 0; i < e.poise; i++) {
      ctx.fillStyle = '#ffd94a';
      ctx.fillRect(sx - e.maxPoise * 2 + i * 4, sy - top - 8, 3, 2);
    }
  }
}

// The paan uncle's chew tell over his cap: a folded paan leaf that bobs on every jaw beat, outlined for the dark train.
const PAAN_ICON = ['........oooo', '......ooGGLo', '.....oGGGLSo', '....oGGGLGSo', '...oGGGLGSo.', '..oGGLGGSo..', '..oGLGSoo...', '.oLoooo.....', 'oo..........'];
const PAAN_INK = { o: '#0e1f0a', G: '#46a830', L: '#b4ec78', S: '#2a6a1c' };
function drawChewCue(ctx, e, sx, sy) {
  const beat = Math.max(0, e.t - PAAN_POP), bob = e.state === 'chew' && e.t >= PAAN_POP && ((beat / 5 | 0) & 1) ? 1 : 0;
  const x0 = sx - 6 + e.face * 5, y0 = sy - 86 + bob;   // resting just over the cap
  ctx.save(); ctx.globalAlpha = e.t < 4 && e.state === 'chew' ? e.t / 4 : 1;
    PAAN_ICON.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const c = PAAN_INK[row[e.face > 0 ? x : row.length - 1 - x]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x0 + x, y0 + y, 1, 1); } } });
  ctx.restore();
}

// The count the wave gate and the spawn cap read. Runners and the bull are exempt:
// a wave that waited for the dabbawala to be killed could never clear, and a bull
// crossing the lane must not eat one of the six slots the wave was written for.
export function aliveEnemies() {
  let n = 0;
  for (const e of G.enemies) if (!e.dead && !e.noCount) n++;
  return n;
}
