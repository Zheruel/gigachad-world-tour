// The replacement India bosses use the shared guard/parry machine. Their own
// timelines only decide patterns, environmental opportunities and performances.
import { G, clamp, diff, laneMin, laneMax } from './engine.js';
import { SPR, getFrame, frameW, frameH } from './sprites.js';
import { getAIFrame } from './aiframes.js';
import { createProp, PROP_TYPES } from './props.js';
import { spawnShot } from './shots.js';
import { spawnDust, spawnPop } from './effects.js';
import { tryHitPlayer, blitTelegraph, drawCueMarker, hitEnemiesNear } from './bosslib.js';
import { ASSETS } from './assets.js';

// Logical positions relative to the encounter camera, also used by scenery tools.
export const INDIA_BOSS_ANCHORS = Object.freeze({
  vendor: [
    { role: 'cart', kind: 'ic_vendorcart', fallback: 'cart', x: 346, y: 224, hp: 64, w: 68, h: 50 },
    { role: 'station', kind: 'ic_cookingstation', fallback: 'table', x: 78, y: 220, hp: 36, w: 76, h: 64 },
    { role: 'valve', kind: 'ic_pressurevalve', fallback: 'matka', x: 106, y: 220, hp: 18, w: 22, h: 30 },
  ],
  closer: [
    { role: 'cabinet', kind: 'ic_cabinet', fallback: 'crate', x: 360, y: 226, hp: 30, w: 42, h: 64 },
    { role: 'desk', kind: 'ic_execdesk', fallback: 'table', x: 80, y: 226, hp: 40, w: 86, h: 52 },
    { role: 'partition', kind: 'ic_partition', fallback: 'sign', x: 185, y: 216, hp: 24, w: 54, h: 88 },
    { role: 'partition', kind: 'ic_partition', fallback: 'sign', x: 415, y: 216, hp: 24, w: 54, h: 88 },
  ],
});

function installProps(b) {
  // Recreating an encounter in the explorer must not duplicate its props.
  G.props = G.props.filter(p => !p.indiaBossProp);
  b.fightProps = INDIA_BOSS_ANCHORS[b.key].map(anchor => {
    const kind = PROP_TYPES[anchor.kind] ? anchor.kind : anchor.fallback;
    const x = G.camLock + anchor.x, y = clamp(anchor.y, laneMin(x), laneMax(x));
    const p = createProp(kind, x, y);
    Object.assign(p, { hp: anchor.hp, maxhp: anchor.hp, w: anchor.w, h: anchor.h,
      indiaBossProp: true, role: anchor.role, anchorKind: anchor.kind });
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
  b.pressureT = 0;
  b.phaseTwo = false;
  b.phasePending = false;
  installProps(b);
  const parried = b.parried;
  b.parried = (damage, direction) => {
    b.pressureT = 0;
    b.valveActive = false;
    if (b.valve) b.valve.decor = true;
    parried(damage, direction);
  };
}

function opening(b, ticks = 45) {
  b.protectedStagger = Math.max(b.protectedStagger, ticks);
  b.state = 'stagger';
  b.t = 0;
  b.vx = 0;
  b.atkCd = 50;
  b.pressureT = 0;
  b.valveActive = false;
  if (b.valve) b.valve.decor = true;
}

function recover(b, duration = 54) {
  b.state = 'recover';
  b.t = 0;
  b.recovery = duration;
  b.hitLanded = false;
  b.valveActive = false;
  if (b.valve) b.valve.decor = true;
}

function regroup(b) {
  // A completed parry/break already paid its full punish window. Return to a
  // readable guard, without accidentally granting another whole attack recovery.
  b.state = 'reguard'; b.t = 0; b.vx = 0; b.recovery = 0; b.atkCd = 0;
}

function preparationStep(b, x, y, speed=1.15) {
  const oldX=b.x;
  b.face=G.player.x<b.x?-1:1;
  b.x+=clamp(x-b.x,-speed,speed);
  b.y+=clamp(y-b.y,-.65,.65);
  b.stepDir=Math.sign(b.x-oldX);
  return Math.abs(x-b.x)<3&&Math.abs(y-b.y)<3;
}

function beforeHit(b, dmg, dir, heavy, launch) {
  const earned = b.protectedStagger > 0 || b.superApplying || b.parryApplying || b.counterApplying;
  const interruptible = ['valve', 'call'].includes(b.state) ||
    b.state === 'windup' && ['valve', 'call'].includes(b.pattern);
  // Being two pixels through the centre of a body is not a successful flank.
  // Without this, alternating jab advances could flip facing on every contact
  // and bypass guard indefinitely while both silhouettes occupied one spot.
  const frontal = dir === -b.face || Math.abs(G.player.x-b.x)<18;
  const guarded = !earned && !interruptible && frontal && b.guard > 0 &&
    ['idle', 'reguard', 'setup-rush', 'setup-valve', 'setup-shove', 'windup', 'ladle', 'boxing', 'rush', 'shove', 'utensil', 'handset', 'overhead', 'vendor-lunge'].includes(b.state);
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
      !['recover', 'stagger', 'hurt', 'down', 'getup'].includes(b.state)) recover(b, 38);
  return true;
}

function approach(b, distance) {
  const p = G.player, speed = b.def.speed * diff().aggro;
  b.y += clamp(p.y - b.y, -speed * .55, speed * .55);
  const dx = p.x - b.x;
  if (Math.abs(dx) > distance) b.x += Math.sign(dx) * speed;
}

function keepBodySpace(b) {
  if(!['idle','reguard','recover','setup-rush','setup-valve','setup-shove'].includes(b.state))return;
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
}

function crash(b, moving, targets) {
  const target = targets.find(p => !p.broken && p !== moving &&
    Math.abs(p.x - moving.x) < (p.w + moving.w) * .36 && Math.abs(p.y - moving.y) < 25);
  if (!target) return false;
  target.hurt(target.hp, b.face, true, true);
  if (!moving.broken) moving.hurt(Math.max(18, moving.maxhp * .5), b.face, true, true);
  b.breakGuard();
  spawnDust(moving.x, moving.y, 9);
  G.audio.sfx('slam');
  return true;
}

function drawPerformance(ctx, b, camX) {
  const wind = b.state === 'windup';
  const acting = ['ladle', 'utensil', 'rush', 'valve', 'boxing', 'handset', 'shove', 'call', 'overhead', 'vendor-lunge'].includes(b.state);
  let action = wind ? b.pattern : acting ? b.state :
    b.dead || b.state === 'down' ? 'down' :
    ['hurt', 'stagger'].includes(b.state) ? 'hurt' :
    b.state === 'getup' ? 'getup' : b.moved > .08 ? 'walk' : 'idle';
  let index = action === 'walk' ? Math.floor(b.stridePhase / 5.4) :
    wind ? 0 : acting ? (b.t < 14 ? 1 : 2) :
    action === 'getup' ? Math.min(3, Math.floor(b.t / 4)) : Math.floor(G.time / 12);
  if(b.key==='vendor') {
    if(action==='vendor-lunge')action='lunge';
    if(b.state==='setup-rush'){action='rush';index=0;}
    if(b.state==='setup-valve'){action='valve';index=0;}
    if(acting){
      if(b.state==='ladle')index=Math.min(8,Math.floor(b.t/22)*3+(b.t%22<10?0:b.t%22<15?1:2));
      else if(b.state==='rush')index=b.t<12?1:b.t<60?2+Math.floor(b.stridePhase/7)%2:4;
      else if(b.state==='vendor-lunge')index=b.t<8?1:b.t<22?2:b.t<30?3:4;
      else if(b.state==='overhead')index=b.t<10?1:b.t<18?2:b.t<23?3:4;
      else if(b.state==='utensil')index=b.t<14?1:b.t<20?2:3;
      else index=b.t<20?1:2;
    }
    if(b.state==='recover'&&['rush','vendor-lunge','overhead'].includes(b.pattern)){
      action=b.pattern==='vendor-lunge'?'lunge':b.pattern;index=5;
    }
  }
  if(action==='walk'&&b.state.startsWith('setup-')&&b.stepDir*b.face<0)index=(8-index%8)%8;
  if(b.state==='reguard'){action='block';index=0;}
  if (b.hitReactT > 0 && !b.dead) { action = 'hurt'; index = b.hitReactT > 4 ? 0 : 1; }
  if (b.guardFlash > 0 && !(b.key==='vendor'&&b.protectedStagger>0)) { action = 'block'; index = 0; }
  if (G.state === 'bossintro') {
    action = b.key === 'vendor' ? 'ladle' : 'call';
    index = Math.min(2, Math.floor((b.introT || 0) / 65));
  }
  // Missing dedicated action art has a shared, visible fallback and never blocks AI.
  if (!getAIFrame(b.set._aiKey, action) && !b.set[action]) action = acting || wind ? 'atk' : action;
  const f = getFrame(b.set, action, index, b.face);
  const x = Math.round(b.x - camX), y = Math.round(b.y - b.z);
  blitTelegraph(ctx, b, f, x - frameW(f) / 2, y - frameH(f) + 4, wind && b.t > 8);
  if (wind && b.t > 8) drawCueMarker(ctx, b, x, y - b.h - 10);
}

// Distance and action age choose patterns without consuming combat randomness.
// Equipment removal changes the vocabulary permanently, not just the artwork.
function vendorPattern(b) {
  const distance=Math.abs(G.player.x-b.x), lane=Math.abs(G.player.y-b.y);
  const choices=[['ladle',distance<95?6:1],['utensil',distance>95?6:2]];
  if(!b.cartGone) choices.push(['rush',distance>110?5:3]);
  else {
    choices.push(['overhead',distance<90?5:1]);
    if(b.turn-(b.lastLunge??-4)>=4&&distance>65&&lane<22)choices.push(['vendor-lunge',5]);
  }
  if(!b.station.broken&&!b.valve.broken&&G.player.x>=b.station.x+20&&G.player.x<=b.station.x+175&&b.turn-(b.lastValve??-3)>=3&&
    !G.enemies.some(e=>!e.dead&&['windup','attack','drop'].includes(e.state)))choices.push(['valve',4]);
  const previous=b.pattern;
  choices.sort((a,c)=>{
    const score=([name,weight])=>weight+Math.min(6,b.turn-(b.patternUsed[name]??-3));
    return score(c)-score(a);
  });
  const pattern=(choices.find(([name])=>name!==previous)||choices[0])[0];
  b.patternUsed[pattern]=b.turn++;
  if(pattern==='vendor-lunge')b.lastLunge=b.turn;
  if(pattern==='valve')b.lastValve=b.turn;
  return pattern;
}

function vendorStep(b,start,end,distance) {
  // A foot plants at the end of each step; no movement during the held contact.
  if(b.t<=start||b.t>end)return;
  const ease=t=>.5-.5*Math.cos(Math.PI*clamp(t,0,1));
  const travel=distance*(ease((b.t-start)/(end-start))-ease((b.t-1-start)/(end-start)));
  const gap=(G.player.x-b.x)*b.face;
  const sameLane=Math.abs(G.player.y-b.y)<17&&G.player.z<18;
  b.x+=b.face*(sameLane&&gap>=0?Math.min(travel,Math.max(0,gap-30)):travel);
}

const vendor = {
  noRage: true,
  afterOpening: regroup,
  init(b) {
    initialize(b);
    b.cart = b.fightProps.find(p => p.role === 'cart');
    b.station = b.fightProps.find(p => p.role === 'station');
    b.valve = b.fightProps.find(p => p.role === 'valve');
    b.cartGone = false;
    b.patternUsed = {};
    b.lastLunge = -4; b.lastValve = -3;
    b.cartFacing = -1;
    const hurtCart = b.cart.hurt;
    b.cart.hurt = (dmg, dir, heavy, launch) => hurtCart(heavy || launch ? dmg * 1.5 : dmg, dir);
    b.cart.onBreak = () => {
      b.cartGone = true;
      b.phaseTwo = true; b.phasePending = false;
      if (!b.dead) b.breakGuard();
    };
    const hurtValve = b.valve.hurt;
    b.valve.decor = true;
    b.valve.hurt = (dmg, dir) => {
      if (b.dead || !b.valveActive || b.valve.broken) return;
      b.valve.decor = false;
      hurtValve(dmg, dir);
      b.redirectedSteamUntil = G.time + 24;
      spawnDust(b.x,b.y-28,5);
      opening(b);
      b.damageGuard(1);
      b.hurt(24,dir,false,false);
      G.audio.roomSfx?.('train_brake',.2,.9);
      G.audio.sfx('armor');
    };
  },
  intro(b, t) {
    b.introT = t;
    if (t === 50) G.audio.sfx('weapon');
  },
  keepFace(b) { return !['idle', 'reguard', 'recover', 'hurt', 'setup-rush', 'setup-valve'].includes(b.state); },
  beforeHurt: beforeHit,
  onHurt(b) {
    if (b.state === 'valve' || b.state === 'windup' && b.pattern === 'valve') {
      opening(b);
      return true;
    }
    return cleanReaction(b);
  },
  update(b) {
    keepBodySpace(b);
    if (b.guardFlash > 0) b.guardFlash--;
    if (b.hitReactT > 0) b.hitReactT--;
    if (!b.cartGone && !b.dead) {
      b.cart.x = b.x + b.cartFacing * 26;
      b.cart.y = b.y + 3;
    }
    if (b.pressureT > 0) {
      b.pressureT--;
      if (b.pressureT % 14 === 0) {
        const nozzle = { x: b.station.x + 30, y: b.pressureLane, face: 1, pattern: 'steamjet' };
        tryHitPlayer(nozzle, 8, 132, false, 12, 'unblockable');
        hitEnemiesNear(nozzle.x + 66, nozzle.y, 66, 12, 8, 1, false);
      }
    }
    switch (b.state) {
      case 'idle': {
        approach(b, 68);
        if (--b.atkCd > 0) return true;
        const next=vendorPattern(b);
        if(next==='rush'){b.pattern=next;b.state='setup-rush';b.t=0;return true;}
        if(next==='valve'){b.pattern=next;b.state='setup-valve';b.t=0;return true;}
        begin(b, next);
        return true;
      }
      case 'reguard':
        if(b.t>=12){b.state='idle';b.t=0;b.atkCd=0;}
        return true;
      case 'setup-rush':
        if(b.cartGone){begin(b,'overhead');return true;}
        // Brace in place instead of walking to the opposite end of the room.
        if(b.t>=16){begin(b,'rush');b.cartFacing=b.face;b.attackLane=b.y;}
        return true;
      case 'setup-valve':
        if(b.station.broken||b.valve.broken){begin(b,'utensil');return true;}
        if(b.t>=16){
          begin(b,'valve');b.valveActive=true;b.valve.decor=false;b.pressureLane=G.player.y;
        }
        return true;
      case 'windup':
        if (b.t >= (b.pattern === 'valve' ? 80 : b.pattern === 'rush' ? 52 : b.pattern === 'vendor-lunge' ? 54 : b.pattern === 'overhead' ? 52 : 36)) {
          b.state = b.pattern; b.t = 0;
          G.audio.sfx(b.pattern === 'rush' ? 'dash' : 'whiff');
        }
        return true;
      case 'ladle':
        vendorStep(b,1,9,8);vendorStep(b,23,31,8);
        if(!b.cartGone)vendorStep(b,45,53,10);
        if (b.t === 12 || b.t === 34 || !b.cartGone&&b.t===56) tryHitPlayer(b, 8, 72, true, 17, 'counter');
        if (b.state==='ladle'&&b.t > (b.cartGone?53:77)) recover(b, 46);
        return true;
      case 'utensil':
        if (b.t === 14) { spawnShot('wrench', b.x + b.face * Math.min(30,Math.max(8,(G.player.x-b.x)*b.face-12)), b.y, b.face * 3.7, 9, { source: b, parryClass: 'reflect' }); G.audio.sfx('weapon'); }
        if (b.t > 36) recover(b, 40);
        return true;
      case 'rush':
        if (b.cartGone || b.face !== b.cartFacing) { recover(b, 70); return true; }
        if (b.t < 76) {
          const speed=3.4*Math.min(1,b.t/12,(76-b.t)/16);
          b.x += b.face * speed;
          b.cart.x = b.x + b.cartFacing * 26;
          if (crash(b, b.cart, [b.station])) return true;
          if (!b.hitLanded && tryHitPlayer(b, 12, 64, true, 17, 'counter')) b.hitLanded = true;
        }
        if (b.state==='rush'&&(b.t >= 76||b.x<G.camLock+48||b.x>G.camLock+432)) recover(b, 80);
        return true;
      case 'vendor-lunge':
        vendorStep(b,0,28,112);
        if(b.t>=8&&b.t<=28&&!b.hitLanded&&tryHitPlayer(b,12,47,true,13,'unblockable'))b.hitLanded=true;
        if(b.state==='vendor-lunge'&&b.t>=42)recover(b,82);
        return true;
      case 'overhead':
        vendorStep(b,0,10,14);
        if(b.t===18)tryHitPlayer(b,12,66,true,15,'counter');
        if(b.state==='overhead'&&b.t>=40)recover(b,72);
        return true;
      case 'valve':
        if (b.t === 1) { b.pressureT = 70; G.audio.roomSfx?.('train_brake', .18, .7); }
        if (b.t > 75) recover(b, 65);
        return true;
      case 'recover':
        if (b.t >= (b.recovery || 54)) { b.state = 'idle'; b.t = 0; b.atkCd = 32; }
        return true;
      case 'getup':
        if (b.t >= 16) { b.state = 'recover'; b.t = 0; b.recovery = 28; }
        return true;
    }
    return false;
  },
  onDeath(b) {
    b.pressureT = 0; b.valveActive = false; b.valve.decor = true;
    b.finishStarted = !!G.india?.startCinematic?.('vendor-finish', b);
  },
  draw(ctx, b, camX) {
    // The rear pressure vessel survives disabled equipment and anchors the finisher.
    const vessel=ASSETS.ic_delhi_mechanisms;
    if(vessel){const sw=vessel.width/4,sh=vessel.height/2,damaged=b.station.broken||b.valve.broken;ctx.drawImage(vessel,damaged?sw:0,0,sw,sh,G.camLock+303-camX,143,78,78);}
    // The floor marker establishes the locked lane before pressure releases.
    if (b.state === 'windup' && b.pattern === 'valve') {
      ctx.save(); ctx.fillStyle = 'rgba(248,123,54,.30)';
      ctx.fillRect(b.station.x + 30 - camX, b.pressureLane - 5, 132, 9);
      ctx.fillStyle = '#e59b43';
      for (let i = 0; i < 9; i++) ctx.fillRect(b.station.x + 30 + i * 15 - camX, b.pressureLane + 4, 7, 1);
      ctx.restore();
    }
    const redirectedSteamT=Math.max(0,(b.redirectedSteamUntil||0)-G.time);
    if(redirectedSteamT>0){
      const smoke=ASSETS.nr_finale_smoke;
      if(smoke){
        ctx.save();ctx.globalAlpha=.42*redirectedSteamT/24;
        const age=24-redirectedSteamT;
        for(let i=0;i<4;i++){
          const q=clamp(age/16-i*.12,0,1),frame=Math.floor(age/4)%6;
          const x=b.valve.x+(b.x-b.valve.x)*q-camX;
          ctx.drawImage(smoke,frame*64,0,64,96,x-10,b.y-38,20,30);
        }
        ctx.restore();
      }
    }
    // The valve's bright tell is a local affordance; steam stays below faces.
    if (b.valveActive && !b.valve.broken) {
      ctx.save(); ctx.fillStyle = '#ffce6c';
      ctx.fillRect(Math.round(b.valve.x - camX - 3), Math.round(b.valve.y - 25), 6, 3);
      ctx.restore();
    }
    if (b.pressureT > 0) {
      const im = ASSETS.nr_finale_smoke;
      ctx.save(); ctx.globalAlpha = .42;
      if (im) for (let i = 0; i < 6; i++) {
        const frame = (Math.floor((70 - b.pressureT) / 7) + i) % 6;
        ctx.drawImage(im, frame * 64, 0, 64, 96, b.station.x + 25 + i * 21 - camX, b.pressureLane - 34, 24, 36);
      }
      else { ctx.fillStyle = '#cad0bc'; ctx.fillRect(b.station.x + 30 - camX, b.pressureLane - 10, 132, 6); }
      ctx.restore();
    }
    drawPerformance(ctx, b, camX);
  },
};

const closer = {
  noRage: true,
  afterOpening: regroup,
  init(b) { initialize(b); b.cabinet = b.fightProps.find(p => p.role === 'cabinet'); b.calls = 0; },
  intro(b, t) {
    b.introT = t;
    if (t === 45) G.audio.roomSfx?.('room_page', .5);
  },
  keepFace(b) { return !['idle', 'reguard', 'recover', 'hurt', 'setup-shove'].includes(b.state); },
  beforeHurt: beforeHit,
  onHurt(b) {
    if (!b.phaseTwo && b.hp <= b.maxhp * .5) b.phasePending = true;
    if (b.state === 'call' || b.state === 'windup' && b.pattern === 'call') {
      opening(b); G.audio.sfx('armor'); return true;
    }
    return cleanReaction(b);
  },
  update(b) {
    keepBodySpace(b);
    if (b.guardFlash > 0) b.guardFlash--;
    if (b.hitReactT > 0) b.hitReactT--;
    if (b.phasePending && !b.protectedStagger && !b.superLocked && !b.dead) {
      b.phasePending = false; b.phaseTwo = true; b.enraged = true;
      for (const p of b.fightProps) if (p.role !== 'cabinet' && !p.broken) p.hurt(p.hp, b.face, true, true);
      if (SPR.ic_closer_damaged) b.set = SPR.ic_closer_damaged;
      G.audio.sfx('slam'); G.shake = Math.max(G.shake, 5);
      regroup(b);
    }
    switch (b.state) {
      case 'idle': {
        approach(b, 50);
        if (--b.atkCd > 0) return true;
        const sequence = b.phaseTwo?['handset','boxing','shove','boxing','call']:['call','shove','handset','boxing'];
        let next = sequence[b.turn++ % sequence.length];
        const ally = G.enemies.find(e => !e.dead && !e.noCount && !e.superLocked);
        if (next === 'call' && (!ally || b.calls >= 2)) next = 'boxing';
        if (next === 'shove' && b.cabinet.broken) next = 'boxing';
        if (next === 'shove') { b.state = 'setup-shove'; b.t = 0; return true; }
        begin(b, next);
        return true;
      }
      case 'reguard':
        if(b.t>=12){b.state='idle';b.t=0;b.atkCd=0;}
        return true;
      case 'setup-shove': {
        const face = G.player.x < b.cabinet.x ? -1 : 1;
        const target = b.cabinet.x - face * 38;
        if (preparationStep(b,target,b.cabinet.y-3,1.45)) begin(b, 'shove');
        else if (b.t > 140 || b.cabinet.broken) recover(b, 35);
        return true;
      }
      case 'windup':
        if (b.t >= (b.pattern === 'call' ? 70 : b.pattern === 'shove' ? 52 : 32)) {
          b.state = b.pattern; b.t = 0; G.audio.sfx(b.pattern === 'handset' ? 'weapon' : 'whiff');
        }
        return true;
      case 'boxing':
        if (b.t < 10) b.x += b.face * .65;
        if (b.t === 10 || b.t === 28 || b.phaseTwo && b.t === 46) tryHitPlayer(b, 11, 56, true, 16, 'counter');
        if (b.t > (b.phaseTwo ? 68 : 50)) recover(b, 38);
        return true;
      case 'handset':
        if (b.t === 12) { spawnShot('handset', b.x + b.face * 28, b.y, b.face * 4.2, 13, { source: b, parryClass: 'reflect' }); G.audio.sfx('weapon'); }
        if (b.t >= 42) recover(b, 40);
        return true;
      case 'shove':
        if (b.cabinet.broken) { recover(b, 75); return true; }
        if (b.t < 47) {
          b.x += b.face * 2.7;
          b.cabinet.x = b.x + b.face * 38;
          b.cabinet.y = b.y + 3;
          if (crash(b, b.cabinet, b.fightProps.filter(p => p.role !== 'cabinet'))) return true;
          if (!b.hitLanded && tryHitPlayer(b, 16, 78, true, 18, 'counter')) b.hitLanded = true;
        }
        if (b.t >= 47) recover(b, 85);
        return true;
      case 'call':
        if (b.t === 1) G.audio.roomSfx?.('room_page', .5);
        if (b.t === 20) {
          const ally = G.enemies.find(e => !e.dead && !e.noCount && !e.superLocked && !e.protectedStagger);
          if (ally) { ally.atkCd = Math.min(ally.atkCd, 18); ally.rallied = 180; b.calls++; spawnPop(ally.x, ally.y - 85, 'CLOSE THE DEAL!'); }
        }
        if (b.t > 48) recover(b, 65);
        return true;
      case 'recover':
        if (b.t >= (b.recovery || 54)) { b.state = 'idle'; b.t = 0; b.atkCd = 30; }
        return true;
      case 'getup':
        if (b.t >= 16) recover(b, 28);
        return true;
    }
    return false;
  },
  onDeath(b) {
    // The stage owns the finishing combination and exactly-one clear handoff.
    // If its art/runtime is unavailable, shared boss completion still works.
    b.finishStarted = !!G.india?.startCinematic?.('closer-finish', b);
  },
  draw: drawPerformance,
};

export function initIndiaBoss(b) {
  const own = b.key === 'vendor' ? vendor : b.key === 'closer' ? closer : null;
  if (own) { b.delhi = own; own.init(b); }
}
