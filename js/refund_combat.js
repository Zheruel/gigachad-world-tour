// Refund Tower's six jobs, performed with their approved office-family poses.
// Shared enemies.js still owns turn-taking, protected parries, grabs and supers.
import { G, W, clamp, laneMin, laneMax } from './engine.js';
import { spawnDust, spawnSpark, spawnPop } from './effects.js';
import { spawnShot } from './shots.js';
import { GREEN_FOLLOWUP } from './combat_readability.js';
import { getAIFrame } from './aiframes.js';
import { refundGaitFrame } from './refund_gait.js';

export const REFUND_FAMILY=new Set(['ic_headset','ic_operator','ic_thrower','ic_security','ic_cabinet','ic_lead']);
export const REFUND_MOVES={
 rf_string:['plain',20],rf_kick:['counter',22],rf_phone:['reflect',28],
 rf_keyboard:['counter',22],rf_lathi:['counter',28],rf_jab:['counter',18],
 rf_ram:['unblockable',36],rf_punch:['counter',24],
};
export const isRefund=e=>REFUND_FAMILY.has(e.trainType);
export const refundRestRange=(e,base)=>e.trainType==='ic_cabinet'&&(!e.rig||e.rig.broken)?44:base;
export function refundPlan(e,p){
 const gap=Math.abs(p.x-e.x),n=e.swings||0;
 switch(e.trainType){
  case 'ic_headset':case 'ic_lead':e.plan='rf_string';e.range=42;break;
  case 'ic_operator':e.plan='rf_kick';e.range=66;break;
  case 'ic_thrower':e.plan=gap<56?'rf_keyboard':'rf_phone';e.range=gap<56?46:145;break;
  case 'ic_security':e.plan=n%3===2?'rf_jab':'rf_lathi';e.range=e.plan==='rf_jab'?42:58;break;
  case 'ic_cabinet':e.plan=e.rig&&!e.rig.broken?'rf_ram':'rf_punch';e.range=e.plan==='rf_ram'?78:44;break;
 }
}
export function refundMove(e){refundPlan(e,G.player);e.swings=(e.swings||0)+1;return e.plan;}
export function refundIdle(e,p){
 const gap=Math.abs(e.x-p.x);
 // The quick operator uses the free edge to get behind CHAD. He first changes
 // depth, then crosses: no invisible dodge or walking through CHAD's torso.
 if(e.trainType==='ic_operator'&&e.atkCd>20&&gap<150){
  const lo=laneMin(e.x)+2,hi=laneMax(e.x)-2,edge=Math.abs(lo-p.y)>Math.abs(hi-p.y)?lo:hi;
  const x=clamp(p.x-p.face*64,G.camX+32,G.camX+W-32);
  e.orbit=Math.sign(edge-p.y)||e.orbit;
  e.y+=clamp(edge-e.y,-e.speed*.65,e.speed*.65);
  if(Math.abs(e.y-p.y)>13&&Math.abs(x-e.x)>8)e.x+=Math.sign(x-e.x)*e.speed*.7;
 }
 if(e.trainType==='ic_thrower'&&e.atkCd>20){
  if(gap<80)e.x-=Math.sign(p.x-e.x||-e.face)*e.speed*.7;
  else if(gap>165)e.x+=Math.sign(p.x-e.x)*e.speed*.5;
 }
}
export function refundWind(e){
 if(e.move==='rf_kick'&&Math.abs(G.player.x-e.x)>60)e.x+=e.face*.65;
 if(e.move==='rf_ram'&&e.t%9===0)spawnDust(e.x-e.face*12,e.y,1);
}
export function refundStrike(e){
 if(e.move==='rf_kick'){e.vx=e.face*clamp((Math.abs(G.player.x-e.x)-40)/4.2,1.3,5);G.audio.sfx('dash');}
 if(e.move==='rf_ram'){e.vx=e.face*3.1;e.ramLane=e.y;e.walkPos=0;G.audio.sfx('dash');}
}
function jam(e){
 e.vx=0;e.state='stuck';e.t=0;e.stuckFor=54;e.poise=0;
 G.shake=Math.max(G.shake,5);spawnDust(e.x+e.face*43,e.y,6);
 spawnPop(e.x,e.y-e.h-6,'JAMMED!');G.audio.sfx('slam');
}
export function refundAttack(e,p,{hit,settle}){
 const t=e.t;
 switch(e.move){
  // First fist can be guarded or deflected; the second fist has its own full
  // green opening. A successful defence changes state, so it cannot land later.
  case 'rf_string':
   if(t===5)hit(e,5,42,false,14,'plain','punch');
   if(t===6){e.cls='counter';e.cueTo=GREEN_FOLLOWUP+1;}
   if(t>6&&t<12)e.x+=e.face*.4;
   if(t===GREEN_FOLLOWUP)hit(e,7,46,false,14,'counter','punch');
   if(t>=GREEN_FOLLOWUP+14)settle(e,58);break;
  case 'rf_kick':
   if(t<10){e.x+=e.vx;e.vx*=.84;}
   if(t===5){e.contactY=42;hit(e,8,52,false,14,'counter','kick');}
   if(t>=28){e.vx=0;settle(e,62);}break;
  case 'rf_phone':
   if(t===7){spawnShot('phone',e.x+e.face*25,e.y,e.face*3.2,7,{source:e,parryClass:'reflect'});G.audio.sfx('weapon');}
   // The receiver is gone; he visibly readies the next one. Hittable throughout.
   if(t>=22){e.state='reload';e.t=0;e.vx=0;}break;
  case 'rf_keyboard':
   if(t===7){e.contactY=62;hit(e,8,48,false,14,'counter','weapon');}
   if(t>=28)settle(e,60);break;
  case 'rf_lathi':
   if(t===9){e.contactY=62;hit(e,9,68,false,14,'counter','weapon');}
   if(t>=34)settle(e,72);break;
  case 'rf_jab':
   if(t===5){e.contactY=70;hit(e,6,46,false,14,'counter','punch');}
   if(t>=25)settle(e,60);break;
  case 'rf_punch':
   if(t===8)hit(e,9,48,false,14,'counter','heavy');
   if(t>=32)settle(e,70);break;
  case 'rf_ram':{
   if(!e.rig||e.rig.broken){e.vx=0;settle(e,65);break;}
   // One committed lane; sidestepping baits the cabinet into furniture or the
   // arena end, leaving the pusher exposed instead of tracking CHAD mid-charge.
   e.y=e.ramLane;e.x+=e.vx;e.vx*=.982;
   const front=e.x+e.face*76;
   const block=G.props.find(q=>q!==e.rig&&!q.broken&&!q.decor&&!q.hidden&&
    (q.x-front)*e.face>-14&&(q.x-front)*e.face<24&&Math.abs(q.y-e.y)<14);
   if(block){block.hurt(13,e.face,true);jam(e);break;}
   if(front<G.camX+6||front>G.camX+W-6){jam(e);break;}
   if(!e.hitLanded&&hit(e,12,84,true,14,'unblockable','heavy'))e.hitLanded=true;
   if(t%5===0)spawnDust(e.x-e.face*12,e.y,1);
   if(t>=42){e.vx=0;settle(e,90);}break;
  }
 }
}
// Return true only for an absorbed frontal light. Protected parries and super
// applications bypass this hook, and a heavy / rear hit still owns normal hurt.
export function refundShield(e,dir,heavy,launch,free){
 if(!free||e.trainType!=='ic_cabinet'||heavy||launch||dir!==-e.face||!e.rig||e.rig.broken||
  Math.abs(e.rig.x-e.x-e.face*43)>12||!['idle','approach','block','windup'].includes(e.state))return false;
 spawnSpark(e.rig.x,e.rig.y-40);G.audio.sfx('armor');e.rig.flash=4;
 if(e.state!=='windup'){e.state='block';e.t=0;e.vx=0;}
 return true;
}
function legacyRefundPose(e,name,idx){
 const t=e.t,move=e.move;
 if(['idle','approach','spawn','backoff'].includes(e.state)&&e.trainType==='ic_cabinet'&&e.rig&&!e.rig.broken)
  return{name:'ram',idx:e.walking?1+(Math.floor(e.stridePhase/8)&1):0};
 if(e.state==='reload')return{name:t<28?'throw':'idle',idx:0};
 if(e.state==='stuck')return{name:'hurt',idx:t<10?1:0};
 if(e.state==='guardbreak')return{name:'hurt',idx:0};
 if(e.state==='rally')return{name:'call',idx:t<12?0:t<32?1:2};
 if(e.state==='windup')return{name:move==='rf_phone'?'throw':move==='rf_ram'?'ram':move==='rf_punch'?'punch':move==='rf_kick'?'run':move==='rf_jab'?'jab':'atk',idx:move==='rf_kick'?Math.floor(t/5)%4:0};
 if(e.state==='attack'){
  if(move==='rf_phone')return{name:'throw',idx:t<7?0:t<15?1:0};
  if(move==='rf_ram')return{name:'ram',idx:1+(Math.floor(e.stridePhase/7)&1)};
  if(move==='rf_punch')return{name:'punch',idx:t<17?1:2};
  if(move==='rf_kick')return t<16?{name:'kick',idx:1}:{name:'atk',idx:2};
  if(move==='rf_jab')return{name:t<15?'jab':'atk',idx:t<15?1:2};
  if(move==='rf_string')return{name:'atk',idx:t<11?1:t<GREEN_FOLLOWUP-2?0:t<GREEN_FOLLOWUP+7?1:2};
  return{name:'atk',idx:t<19?1:2};
 }
 return{name,idx};
}

// Contact clocks own pose selection. Anticipation progresses while the fighter
// stays planted; the strike frame first appears with its actual hit/release.
export function refundPose(e,name,idx){
 if((getAIFrame(e.set?._aiKey,'walk')?.f.length||0)<12)return legacyRefundPose(e,name,idx);
 const t=e.t,move=e.move,pose=(name,idx=0)=>({name,idx});
 const anticipation=(count)=>Math.min(count-1,Math.floor(t*count/Math.max(1,e.wind)));
 if(['idle','approach','spawn','backoff','loot'].includes(e.state)){
  if(e.trainType==='ic_cabinet'&&e.rig&&!e.rig.broken)
   return pose(e.walking?'push':'push_idle',e.walking?idx:((G.time>>5)&1));
  if(name==='walk'&&e.depthWalk)return{name:'idle',idx:0,lift:Math.floor((e.sidePos||0)/8)&1};
  return{name,idx};
 }
 if(e.state==='reload')return pose('reload',t<18?0:t<36?1:2);
 if(e.state==='stuck')return pose('stuck',t<10?0:t<38?1:2);
 if(e.state==='guardbreak')return pose('hurt',t<14?0:1);
 if(e.state==='rally')return pose('call',t<6?0:t<12?1:t<24?2:t<34?3:t<42?4:5);
 if(e.state==='windup'){
  if(move==='rf_string')return pose('string',0);
  if(move==='rf_phone')return pose('throw',anticipation(3));
  if(move==='rf_ram')return pose('ram',anticipation(3));
  if(move==='rf_punch')return pose('punch',anticipation(2));
  if(move==='rf_kick')return pose('kick',anticipation(3));
  if(move==='rf_lathi')return pose('lathi',anticipation(3));
  if(move==='rf_jab')return pose('jab',0);
  if(move==='rf_keyboard')return pose('keyboard',0);
 }
 if(e.state==='attack'){
  if(move==='rf_string')return pose('string',t<5?0:t<8?1:t<12?2:t<18?3:t<25?4:t<GREEN_FOLLOWUP?5:t<GREEN_FOLLOWUP+4?6:t<GREEN_FOLLOWUP+9?7:8);
  if(move==='rf_phone')return pose('throw',t<7?2:t<13?3:4);
  if(move==='rf_ram')return pose('push',refundGaitFrame(e.trainType,e.walkPos||0,true,getAIFrame(e.set._aiKey,'push')?.f.length||12));
  if(move==='rf_punch')return pose('punch',t<8?1:t<12?2:t<21?3:4);
  if(move==='rf_kick')return pose('kick',t<5?2:t<9?3:t<13?4:t<18?5:t<23?6:7);
  if(move==='rf_jab')return pose('jab',t<5?0:t<9?1:t<17?2:3);
  if(move==='rf_lathi')return pose('lathi',t<9?2:t<13?3:t<19?4:t<27?5:6);
  if(move==='rf_keyboard')return pose('keyboard',t<7?0:t<11?1:t<20?2:3);
 }
 return{name,idx};
}
