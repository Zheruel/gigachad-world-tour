import {beginDazePose} from './daze.js';
// bosslib.js - the pieces every boss shares: the parry class of each pattern, the
// player hit test, friendly fire on reds, and the attack cues. bosses.js and the
// per-act boss modules both import from here, so neither has to import the other.
import { G } from './engine.js';
import { blit, getFrame, frameW, frameH } from './sprites.js';
import { drawAttackMarker, drawAttackAccent, poseAttackMarkerY } from './combat_cues.js';
import { spawnSpark } from './effects.js';
import { hurtPlayer, resolveIncomingHit, boxingVictimPose } from './player.js';

// green counter | green reflect | red unblockable | hazard
export const PARRY_CLASS = {
  dashpunch: 'counter', lathi: 'counter', samosa: 'reflect', wrench: 'reflect', phone: 'reflect',
  reach: 'unblockable', grab: 'unblockable', lathisweep: 'unblockable', teargas: 'reflect', steamjet: 'unblockable',
  cartcharge: 'unblockable', chutney: 'hazard', whistle: 'hazard',
  // DIRTY DELHI
  charge: 'counter', stomp: 'unblockable',
  drop: 'counter', snatch: 'unblockable', screech: 'unblockable', throw: 'reflect',
  troop: 'hazard', lunge: 'counter',
  grabswing: 'counter', grabdrop: 'unblockable', grabscoop: 'unblockable', grabdump: 'unblockable', grabcall: 'unblockable',
  wrenchcombo: 'counter', sack: 'reflect', crewcall: 'hazard',
  magyank: 'reflect', magpull: 'unblockable', magscrap: 'unblockable', hookfling: 'counter', hookslam: 'unblockable', hooksweep: 'unblockable',
  // Replacement India encounters; their ordinary rushes remain parryable.
  'vendor-lunge':'unblockable', overhead:'counter', ladle: 'counter', utensil: 'reflect', rush: 'unblockable', valve: 'unblockable', pot: 'reflect', flop: 'unblockable', slam: 'counter',
  forearm: 'counter', cleaver: 'unblockable', cauldron: 'unblockable', string: 'counter', naan: 'reflect', scoop: 'unblockable', ram: 'unblockable', breath: 'unblockable',
  boxing: 'counter', handset: 'reflect', shove: 'unblockable', call: 'hazard', deal: 'unblockable',
  // THE NIGHT TRAIN
  torch: 'reflect', ledger: 'counter', check: 'hazard', clip: 'counter', toss: 'reflect', leap: 'unblockable', barge: 'unblockable', stamp: 'unblockable', lunge: 'unblockable',
  chain: 'counter', hook: 'unblockable', shoulder: 'unblockable', lift: 'unblockable', uncouple: 'hazard',
  // Netaji and Shera (the cue colour of each wind-up; hits pass their class explicitly)
  pound: 'counter', bullrush: 'unblockable', quake: 'unblockable', shot: 'unblockable', swing: 'counter', grit: 'unblockable', bribe: 'reflect',
  // Head Conductor: stamps are parried, the loaded box and the emergency chain are moved from.
  denied: 'counter', seized: 'counter', boxswing: 'unblockable', brake: 'unblockable',
};

export function isGreen(pattern) {
  const c = PARRY_CLASS[pattern] || 'counter';
  return c === 'counter' || c === 'reflect';
}

// A melee hit from a boss on the player. `parryClass` defaults to the pattern's.
export function tryHitPlayer(b, dmg, range, heavy, tol, parryClass) {
  const p = G.player;
  if (p.state === 'down' || p.state === 'getup' || p.dying) return false;
  if (Math.abs(p.x - (b.x + b.face * range * 0.5)) < range * 0.5 + 11 && Math.abs(p.y - b.y) < (tol || 16) && p.z < 22) {
    if (resolveIncomingHit(p, b, { parryClass: parryClass || PARRY_CLASS[b.pattern] || 'counter', dmg, dir:b.face, heavy })) return true;
    hurtPlayer(p, dmg, b.face, heavy);
    spawnSpark(p.x, p.y - p.z - (b.contactY ?? 40));
    G.audio.sfx(heavy ? 'heavy' : 'punch');
    return true;
  }
  return false;
}

// The telegraph: green for something you can parry, red for something you must move
// from, white on a hit. `cue` spans the visible warning and contact.
const CUE_POSITIONS=new WeakMap();
export function blitTelegraph(ctx, b, f, dx, dy, cue, cls=PARRY_CLASS[b.pattern]||'counter') {
  const boxing=boxingVictimPose(b);
  if(boxing){
    const cx=dx+frameW(f)/2,cy=dy+frameH(f)-4;
    // Phase-specific material and body size must survive the shared super reaction.
    const hit=b.delhi?.superFrame?.(b,boxing)||getFrame(b.set,boxing.name,boxing.idx,b.face);
    ctx.save();ctx.translate(cx+boxing.dx,cy+boxing.dy-40);ctx.rotate(boxing.angle);
    if(boxing.flash)ctx.filter='brightness(1.18)';
    blit(ctx,hit,-frameW(hit)/2,40-frameH(hit)+4);ctx.restore();return;
  }
  const dazed=beginDazePose(ctx,b,dx+frameW(f)/2,dy+frameH(f)-4);
  ctx.save();
  if (b.flash>0) ctx.filter='brightness(1.18)';
  blit(ctx, f, dx, dy);
  if(cue){
    drawAttackAccent(ctx,f,dx,dy,b,cls);
    if(!G.reflecting)CUE_POSITIONS.set(b,{time:G.time,y:poseAttackMarkerY(f,dy,b,dy-12)});
  }
  ctx.restore();
  if(dazed)ctx.restore();
}

// The diamond (parry it) or the cross (move) over the wind-up.
export function drawCueMarker(ctx, b, sx, cy, cls=PARRY_CLASS[b.pattern]||'counter') {
  const position=CUE_POSITIONS.get(b);
  if(!G.reflecting)drawAttackMarker(ctx,cls,sx,position?.time===G.time?position.y:cy,b);
}
