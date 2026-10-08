// The replacement India bosses use the shared guard/parry machine. Their own
// timelines only decide patterns, environmental opportunities and performances.
import { G, clamp, diff, laneMin, laneMax, arenaMin, arenaMax } from './engine.js';
import { SPR } from './sprites.js';
import { createProp, PROP_TYPES } from './props.js';
import { spawnShot } from './shots.js';
import { spawnDust, spawnPop, spawnSpark, spawnDebris, spawnRing } from './effects.js';
import { tryHitPlayer } from './bosslib.js';
import { grabPlayer, hurtPlayer } from './player.js';
import { vendor } from './vendor_boss.js';
import { CLOSER_TIMING, getCloserTiming } from './refund_boss_timing.js';
import { CLOSER_INTRO_TICKS, updateCloserIntro, endCloserIntro, closerIntroLine, closerFightLine } from './refund_boss_intro.js';
import { drawCloser, drawHandsetShot, drawFlungItem } from './refund_boss_presentation.js';
import { refundGait, refundGaitFrame, refundGaitAimScale, refundGaitContactTravel } from './refund_gait.js';

// Logical positions relative to the encounter camera, also used by scenery tools.
// The chair and grand desk sit under his portrait; the accounting sideboard stays behind the combat lane.
export const INDIA_BOSS_ANCHORS = Object.freeze({
  closer: [
    { role: 'throne', kind: 'cl_throne', fallback: 'sign', x: 260, y: 215, hp: 1, w: 52, h: 86 },
    { role: 'sideboard', kind: 'cl_sideboard', fallback: 'sign', x: 410, y: 211, hp: 1, w: 105, h: 35 },
    { role: 'desk', kind: 'cl_desk', fallback: 'table', x: 250, y: 217, hp: 40, w: 168, h: 70 },
  ],
});
function installProps(b) {
  // Recreating an encounter in the explorer must not duplicate its props.
  G.props = G.props.filter(p => !p.indiaBossProp);
  b.fightProps = INDIA_BOSS_ANCHORS[b.key].map(anchor => {
    const kind = PROP_TYPES[anchor.kind] ? anchor.kind : anchor.fallback;
    const x = G.camLock + anchor.x, y = clamp(anchor.y, laneMin(x), laneMax(x));
    const p = createProp(kind, x, y);
    Object.assign(p, { hp: anchor.hp, maxhp: anchor.hp, w: anchor.w, h: anchor.h, scale: anchor.scale || 1,
      indiaBossProp: true, role: anchor.role, anchorKind: anchor.kind, face: anchor.role === 'throne' ? -1 : 1 });
    if (['throne','sideboard'].includes(anchor.role)) p.decor = true;
    G.props.push(p);
    return p;
  });
}

function initialize(b) {
  b.set = SPR[b.def.set] || { _aiKey: b.def.set };
  b.guard = b.maxGuard = 3;
  b.guardFlash = 0;
  b.turn = 0;
  b.state = 'idle';
  b.atkCd = 60;
  b.comboHits = 0;
  b.hitReactT = 0;
  b.phaseTwo = false;
  b.phasePending = false;
  installProps(b);
}

function opening(b, ticks = 45) {
  b.protectedStagger = Math.max(b.protectedStagger, ticks);
  b.state = 'stagger';
  b.t = 0;
  b.vx = 0;
  b.atkCd = 50;
}

function recover(b, duration = 54) {
  b.recoverPattern=b.pattern;
  b.state = 'recover';
  b.t = 0;
  b.recovery = duration;
  b.hitLanded = false;
}

function regroup(b) {
  if(b.phaseBreakActive){b.state='phase-break';b.t=b.phaseBreakT||0;b.vx=0;return;}
  // A completed parry/break already paid its full punish window. Return to a
  // readable guard, without accidentally granting another whole attack recovery.
  b.state = 'reguard'; b.t = 0; b.vx = 0; b.recovery = 0; b.atkCd = 0;
}

function preparationStep(b, x, y, speed=1.15) {
  const oldX=b.x;
  b.face=G.player.x<b.x?-1:1;
  const direction=Math.sign((x-b.x)*b.face)||b.refundWalkDirection||1;
  b.refundWalkDirection=direction;
  b.refundWalkK=refundGaitAimScale(b.set._aiKey,b.refundWalkPos||0,Math.hypot(x-b.x,y-b.y),direction);
  b.x+=clamp(x-b.x,-speed,speed);
  b.y+=clamp(y-b.y,-.65,.65);
  b.stepDir=Math.sign(b.x-oldX);
  return Math.abs(x-b.x)<.05&&Math.abs(y-b.y)<.05&&closerPlanted(b);
}

function closerPlanted(b){
 const gait=refundGait(b.set._aiKey);if(!gait)return true;
 const dx=b.x-(b.refundTickX??b.x),dy=b.y-(b.refundTickY??b.y);
 const distance=Math.hypot(dx,dy)*(Math.sign(dx*b.face)||b.refundWalkDirection||1)*(b.refundWalkK||1);
 const n=gait.beat.length;
 return gait.contacts.includes(refundGaitFrame(b.set._aiKey,b.refundWalkPos||0,false,n))&&
  gait.contacts.includes(refundGaitFrame(b.set._aiKey,(b.refundWalkPos||0)+distance,false,n));
}

function settleCloserStep(b){
 b.refundWalkK=1;
 if(closerPlanted(b)){b.settleStall=0;return true;}
 const dx=b.x-(b.refundTickX??b.x),dy=b.y-(b.refundTickY??b.y);
 let direction=Math.sign(dx*b.face)||b.refundWalkDirection||1;
 const clock=(b.refundWalkPos||0)+Math.hypot(dx,dy)*direction;
 let left=refundGaitContactTravel(b.set._aiKey,clock,direction);
 // Pinned between CHAD and a wall with no room for the closing step: plant the stance in place
 // rather than stall the fight (one pose pop, only in that corner case).
 if((b.settleStall=(b.settleStall||0)+1)>40){
  b.settleStall=0;const gait=refundGait(b.set._aiKey),n=gait?.beat.length||8;
  for(let d=0;d<240;d+=.25)if(gait?.contacts.includes(refundGaitFrame(b.set._aiKey,clock+d*direction,false,n))){b.refundWalkPos=clock+d*direction;break;}
  b.refundTickX=b.x;b.refundTickY=b.y;return true;
 }
 const endpoint=b.x+b.face*direction*left,p=G.player;
 // Finish away from a close fighter or arena edge when the forward step has
 // no room. A blocked preparation must still return to the fight.
 const safe=x=>x>=arenaMin()+2&&x<=arenaMax()-2&&
  (Math.abs(p.y-b.y)>=13||Math.abs(p.x-x)>=32);
 if(!safe(endpoint)){
  const back=refundGaitContactTravel(b.set._aiKey,clock,-direction);
  if(safe(b.x-b.face*direction*back)){direction=-direction;left=back;}
  else{
   // Beside a wall and CHAD there may be no horizontal landing room. Clear
   // their lane with a real step, then finish the stance on that open side.
   const lo=laneMin(b.x)+2,hi=laneMax(b.x)-2,target=Math.abs(p.y-lo)>Math.abs(p.y-hi)?lo:hi;
   b.refundWalkDirection=direction;
   b.y+=Math.sign(target-b.y)*Math.min(left,b.def.speed*diff().aggro,Math.abs(target-b.y));
   return false;
  }
 }
 b.refundWalkDirection=direction;
 b.x+=b.face*direction*Math.min(left,b.def.speed*diff().aggro);
 return false;
}

const GUARDED=['idle', 'reguard', 'setup-handset', 'phase-break', 'windup', 'boxing', 'handset', 'deal'];
function beforeHit(b, dmg, dir, heavy, launch) {
  const earned = b.protectedStagger > 0 || b.superApplying || b.parryApplying || b.counterApplying;
  const interruptible = b.state === 'call' || b.state === 'windup' && b.pattern === 'call';
  // Being two pixels through the centre of a body is not a successful flank.
  // Without this, alternating jab advances could flip facing on every contact
  // and bypass guard indefinitely while both silhouettes occupied one spot.
  const frontal = dir === -b.face || Math.abs(G.player.x-b.x)<18;
  const guarded = !earned && !interruptible && frontal && b.guard > 0 && GUARDED.includes(b.state);
  b.preservePattern = guarded;
  b.guardingHit = guarded && (heavy || launch);
  if (guarded && !heavy && !launch) {
    b.guardFlash = 8;
    G.audio.sfx('armor');
    G.hitstop = Math.max(G.hitstop, 3);
    return false;
  }
  return true;
}

function cleanReaction(b) {
  b.hitReactT = 8;
  // A recovery clock belongs to the attack, not the hit that followed it. Resetting
  // generic hurt on every jab made one clean hit an unlimited stun lock.
  if (!b.preservePattern && !b.protectedStagger && !b.superLocked &&
      !(b.guard>0&&b.state.startsWith('setup-')) &&
      !['recover', 'stagger', 'hurt', 'down', 'getup', 'phase-break', 'stumble', 'dealhold'].includes(b.state)) recover(b, 38);
  return true;
}

function approach(b, distance) {
  const p = G.player, speed = b.def.speed * diff().aggro;
  const dx = p.x - b.x,left=Math.max(0,Math.abs(dx)-distance);
  b.refundWalkDirection=1;
  b.refundWalkK=refundGaitAimScale(b.set._aiKey,b.refundWalkPos||0,Math.hypot(left,p.y-b.y));
  b.y += clamp(p.y - b.y, -speed * .55, speed * .55);
  if(left>0)b.x+=Math.sign(dx)*Math.min(left,speed);
}

function keepBodySpace(b) {
  if(!['idle','reguard','recover','setup-handset'].includes(b.state))return;
  const p=G.player,dx=p.x-b.x;
  if(Math.abs(p.y-b.y)>=13||p.z>16||p.state==='special'||Math.abs(dx)>=32)return;
  b.x-=(Math.abs(dx)<1?b.face:Math.sign(dx))*Math.min(1.6,(32-Math.abs(dx))*.2);
}

function begin(b, pattern) {
  b.pattern = pattern;
  b.state = 'windup';
  b.t = 0;
  b.face = G.player.x < b.x ? -1 : 1;
  b.hitLanded = false;
  // All motion follows this captured lane and direction after the tell starts.
  b.attackLane = b.y;
  b.wind=getCloserTiming(b).wind;
  b.hitCount=0;b.lastContact=null;
}

// The handshake: a collar grab within his arm's reach in a captured lane, guard or parry.
function dealReach(b){
 const p=G.player,k=getCloserTiming(b);
 return !p.dying&&!p.grabbedBy&&p.z<8&&(p.invuln||0)<=16&&!['down','getup','special','dead'].includes(p.state)&&
  Math.abs(p.y-b.y)<13&&(p.x-b.x)*b.face>6&&(p.x-b.x)*b.face<k.arms+k.reach;
}
function releaseDeal(b){const p=G.player;if(p.grabbedBy===b){p.grabbedBy=null;p.mash=0;p.state='idle';p.t=0;}}

function throwHandset(b,i){
 const k=getCloserTiming(b),s=spawnShot('handset', b.x + b.face * 60, b.y, b.face *k.speed,k.damage,{source:b,parryClass:'reflect'});
 s.draw=drawHandsetShot;s.spin=i;G.audio.sfx('weapon');
}

const closer = {
  noRage: true,
  afterOpening: regroup,
  init(b) { initialize(b); b.throne=b.fightProps.find(p=>p.role==='throne'); b.calls = 0;b.phaseBreakActive=false;b.phaseBreakT=0;b.recoverPattern=null;b.preparedPattern=null;b.flung=[]; },
  introTicks:CLOSER_INTRO_TICKS,
  intro:updateCloserIntro,
  endIntro:endCloserIntro,
  introLine:closerIntroLine,
  keepFace(b) { return !['idle', 'reguard', 'recover', 'hurt', 'setup-handset'].includes(b.state); },
  beforeHurt: beforeHit,
  onHurt(b) {
    if (!b.phaseTwo && b.hp <= b.maxhp * .5) b.phasePending = true;
    if (b.state === 'call' || b.state === 'windup' && b.pattern === 'call') {
      opening(b); G.audio.sfx('armor'); return true;
    }
    if(b.state==='dealhold')releaseDeal(b);
    return cleanReaction(b);
  },
  update(b) {
    keepBodySpace(b);
    if (b.guardFlash > 0) b.guardFlash--;
    if (b.hitReactT > 0) b.hitReactT--;
    for(const f of b.flung){f.t++;if(f.t<f.life){f.x+=f.vx;f.z=Math.max(0,f.z+f.vz);f.vz-=.22;if(f.z===0){f.vx*=.6;f.vz=Math.abs(f.vz)>1?-f.vz*.3:0;}}}
    if (b.phasePending && !b.protectedStagger && !b.superLocked && !b.dead&&
        ['idle','reguard','recover','setup-handset','stumble'].includes(b.state)) {
      b.phasePending = false; b.phaseTwo = true; b.enraged = true;
      b.phaseBreakActive=true;b.phaseBreakT=0;b.preparedPattern=null;b.state='phase-break';b.t=0;b.vx=0;b.turn=0;
      // A breather with a physical transformation beat, rather than an instant
      // swap. Shared parries and supers may pause it without losing it.
      for(const e of G.enemies)if(!e.dead&&!e.superLocked){e.atkCd=Math.max(e.atkCd,120);if(['approach','windup'].includes(e.state)){e.state='idle';e.t=0;}}
    }
    switch (b.state) {
      case 'idle': {
        approach(b, 50);
        if (--b.atkCd > 0) return true;
        const sequence = b.phaseTwo?['deal','boxing','handset','boxing','deal','call']:['boxing','deal','handset','boxing','call'];
        let next = b.preparedPattern||sequence[b.turn++ % sequence.length];
        const ally = G.enemies.find(e => !e.dead && !e.noCount && !e.superLocked);
        if (next === 'call' && (!ally || b.calls >= 2)) next = 'boxing';
        b.preparedPattern=next;
        if(next==='handset'){b.state='setup-handset';b.t=0;return true;}
        if(next==='boxing'&&(Math.abs(G.player.x-b.x)>76||Math.abs(G.player.y-b.y)>10))return true;
        if(next==='deal'&&(Math.abs(G.player.x-b.x)>84||Math.abs(G.player.y-b.y)>9))return true;
        if(!closerPlanted(b)&&!settleCloserStep(b))return true;
        b.preparedPattern=null;
        begin(b, next);
        return true;
      }
      case 'reguard':
        if(b.t>=CLOSER_TIMING.reguard){b.state='idle';b.t=0;b.atkCd=36;}
        return true;
      case 'phase-break':{
        const k=CLOSER_TIMING.phaseBreak;
        b.phaseBreakT=b.t;
        if(b.t===1)G.audio.sfx('shera_heave',.7);
        if(b.t===k.rip){G.audio.sfx('vendor_rip',.7);for(let i=0;i<5;i++)b.flung.push({key:'cl_button',x:b.x+b.face*(6+i*3),y:b.y,z:62-i*3,vx:b.face*(1+i*.5)*(i&1?1:-.6),vz:1.5+i*.3,t:0,life:70,spin:i});}
        if(b.t===k.impact){if(SPR.ic_closer_damaged)b.set=SPR.ic_closer_damaged;G.audio.sfx('cond_grunt_2',.8);G.flash=2;G.hitstop=Math.max(G.hitstop,5);G.shake=Math.max(G.shake,4);}
        if(b.t===k.sleeve){G.audio.sfx('vendor_cloth_2',.7);b.flung.push({key:'cl_sleeve',x:b.x-b.face*16,y:b.y+2,z:58,vx:-b.face*1.4,vz:1.2,t:0,life:150,spin:0});}
        if(b.t===k.shades){G.audio.sfx('throw',.5);b.flung.push({key:'cl_shades',x:b.x+b.face*24,y:b.y+1,z:90,vx:b.face*2.4,vz:2.6,t:0,life:240,spin:1,glint:true});}
        if(b.t===k.roar){G.audio.sfx('shera_roar',.8);G.audio.sfx('enrage');G.shake=Math.max(G.shake,8);G.flash=2;spawnRing(b.x,b.y-4,'#ff3a1a');spawnRing(b.x,b.y-2,'#ffd060');spawnDust(b.x,b.y,6);b.roarAt=G.time;}
        if(b.t===k.slam){G.audio.sfx('slam');G.shake=Math.max(G.shake,4);spawnDust(b.x+b.face*20,b.y,5);}
        if(b.t>=k.end){b.phaseBreakActive=false;regroup(b);}
        return true;
      }
      case 'setup-handset':{
        const p=G.player,side=Math.sign(b.x-p.x)||-b.face;
        if(b.t>=100){if(b.t>150||settleCloserStep(b)){b.preparedPattern=null;begin(b,Math.abs(p.x-b.x)<108?'boxing':'handset');}return true;}
        // The release palm reaches 60px in front of him. Step back far enough to preserve the
        // incoming phone's original travel/read window, and use boxing if CHAD corners him.
        const target=clamp(p.x+side*155,G.camLock+32,G.camLock+448);
        const ready=preparationStep(b,target,clamp(p.y,laneMin(b.x)+2,laneMax(b.x)-2),1.1);
        if(ready){b.preparedPattern=null;begin(b,Math.abs(p.x-b.x)<108?'boxing':'handset');}
        return true;
      }
      case 'windup':
        if(b.t===1){
          G.audio.roomSfx?.(b.pattern==='handset'?'room_pen':b.pattern==='call'?'room_page':'room_chair',b.pattern==='call'?.16:.11);
          if(b.pattern==='deal')G.audio.sfx('cond_laugh',.45);
        }
        if (b.t >= getCloserTiming(b).wind) {
          b.state = b.pattern; b.t = 0;
          G.audio.sfx(b.pattern === 'handset' ? 'whiff' : b.pattern==='deal'?'dash':'whiff');
        }
        return true;
      case 'boxing':
        if(b.t<8&&Math.abs(G.player.x-b.x)>42)b.x+=b.face*.55;
        for(const h of getCloserTiming(b).hits)if(b.t===h.at){
          b.contactY=h.height;b.lastContact=h.name;b.hitCount++;
          if(h.heavy)G.audio.sfx('cond_grunt_1',.5);
          tryHitPlayer(b,h.damage,h.range,h.heavy,14,h.cls);
          if(b.state!=='boxing')return true;
        }
        if (b.t >=getCloserTiming(b).end) recover(b,getCloserTiming(b).recover);
        return true;
      case 'handset':{
        const k=getCloserTiming(b);
        if (b.t ===k.release) throwHandset(b,0);
        if (k.release2&&b.t===k.release2) throwHandset(b,1);
        if (b.t >=k.end) recover(b,k.recover);
        return true;
      }
      case 'call':
        if (b.t === 1) G.audio.roomSfx?.('room_page', .5);
        if (b.t === 4) G.audio.sfx('cond_yell', .55);
        if (b.t ===getCloserTiming(b).rally) {
          const ally = G.enemies.find(e => !e.dead && !e.noCount && !e.superLocked && !e.protectedStagger);
          if (ally) { ally.atkCd = Math.min(ally.atkCd, 18); ally.rallied = 180; b.calls++; spawnPop(ally.x, ally.y - 85, 'CLOSE THE DEAL!');G.india&&(G.india.closerSales=(G.india.closerSales||0)+1); }
        }
        if (b.t >=getCloserTiming(b).end) recover(b,getCloserTiming(b).recover);
        return true;
      case 'deal':{
        // The lunge: its offered hand turns into a collar grab. Guard and parry cannot stop it.
        const k=getCloserTiming(b);
        if(b.t<=k.lunge){
          b.y=b.attackLane??b.y;b.x=clamp(b.x+b.face*k.step,G.camLock+16,G.camLock+464);
          if(dealReach(b)){b.dealOff=(G.player.x-b.x)*b.face-k.arms;grabPlayer(G.player,b);b.dealClosed=true;b.state='dealhold';b.t=0;b.hitLanded=true;G.audio.sfx('grab',.8);G.shake=Math.max(G.shake,2);return true;}
          return true;
        }
        b.dealClosed=false;b.state='stumble';b.t=0;G.audio.sfx('whiff');spawnPop(b.x,b.y-104,'NO DEAL?');
        return true;
      }
      case 'dealhold':{
        const k=getCloserTiming(b),p=G.player;
        if(p.grabbedBy!==b&&b.t<k.headbutt){recover(b,24);return true;}
        // He reels CHAD in by the collar (a pixel downstage, so CHAD's face draws in front of him) for the headbutt:
        // the heads meet on the contact tick, and CHAD stays
        // in his grip through the impact before the knockdown throws him clear.
        // A grab inside or outside arm's length eases CHAD to the grip point over 8 ticks instead of popping.
        const reel=b.phaseTwo?clamp((b.t-(k.headbutt-6))/6,0,1):0,HOLD=5,ease=(b.dealOff||0)*Math.max(0,1-b.t/8);
        if(b.t<=k.headbutt+HOLD&&p.grabbedBy===b){p.x=b.x+b.face*(k.arms-20*reel+ease);p.y=b.y+1;p.z=0;p.face=-b.face;}
        if(k.squeeze.includes(b.t)&&p.grabbedBy===b){
          const d=Math.round(k.damage.squeeze*diff().dmg);p.hp=Math.max(1,p.hp-d);spawnSpark(p.x,p.y-62);G.audio.sfx('shera_squeeze',.7);G.shake=Math.max(G.shake,2);
          if(b.t===k.squeeze[0])p.mash=0;
        }
        // Mashing after the first squeeze shakes his grip loose before the headbutt.
        if(b.t>(b.phaseTwo?k.squeeze[0]:6)&&b.t<k.headbutt&&p.grabbedBy===b&&p.mash>=6){
          releaseDeal(b);b.dealClosed=false;p.invuln=30;p.x+=b.face*6;spawnPop(p.x,p.y-100,'BREAK!');G.audio.sfx('armor');recover(b,40);return true;
        }
        if(b.t===k.headbutt&&p.grabbedBy===b){const hx=b.x+b.face*(k.arms-16);G.shake=Math.max(G.shake,6);G.hitstop=Math.max(G.hitstop,4);G.audio.sfx('heavy');G.audio.sfx('cond_grunt_3',.6);spawnSpark(hx,b.y-(b.phaseTwo?84:48));if(b.phaseTwo)spawnSpark(hx+b.face*3,b.y-88);}
        if(b.t===k.headbutt+HOLD&&p.grabbedBy===b){releaseDeal(b);p.invuln=0;hurtPlayer(p,k.damage.headbutt,b.face,true);spawnDust(p.x,p.y,5);}
        if(b.t>=k.end)recover(b,k.recover);
        return true;
      }
      case 'stumble':
        // A missed handshake carries him on, off balance, then winded: wide open.
        if(b.t<16)b.x=clamp(b.x+b.face*Math.max(0,1.6-b.t*.1),G.camLock+16,G.camLock+464);
        if(b.t===18)G.audio.sfx('cond_hurt_2',.4);
        if(b.t>=getCloserTiming(b).stumble)recover(b,getCloserTiming(b).recover);
        return true;
      case 'recover':
        if (b.t >= (b.recovery || 54)) { b.state = 'idle'; b.t = 0; b.atkCd = 30; }
        return true;
      case 'getup':
        if (b.t >= CLOSER_TIMING.getup) recover(b, 28);
        return true;
    }
    return false;
  },
  onDeath(b) {
    // The stage owns the finishing combination and exactly-one clear handoff.
    // If its art/runtime is unavailable, shared boss completion still works.
    releaseDeal(b);
    b.finishStarted = !!G.india?.startCinematic?.('closer-finish', b);
  },
  fightLine: closerFightLine,
  draw(ctx,b,camX){drawCloser(ctx,b,camX);for(const f of b.flung)drawFlungItem(ctx,f,camX);},
};

export function initIndiaBoss(b) {
  const own = b.key === 'vendor' ? vendor : b.key === 'closer' ? closer : null;
  if (own) { b.delhi = own; own.init(b); }
}
