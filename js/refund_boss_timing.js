// The Closer's choreography contract. Mechanics, poses and cues share these contact clocks;
// drawing never advances a fight or schedules a sound.
//   THE PITCH (full to half): two ring-knuckle jabs into the green "sign here" overhand, the thrown wine-red
//   handset (reflect it), a false handshake (red: evade the grab, punish the stumble) and an
//   interruptible escalation call that rallies his one security guard.
//   THE HARD SELL (half to zero): jab, body shot and a green cross; two handsets then a reload;
//   and the handshake (red): an offered hand, a lunge and a collar grab into headbutts. Leave his lane or jump;
//   a whiffed handshake leaves him stumbling, wide open.
import { GREEN_WARNING_TICKS } from './combat_readability.js';
const hit=(at,name,damage,range,heavy,cls,height)=>Object.freeze({at,name,damage,range,heavy,cls,height});
export const CLOSER_TIMING=Object.freeze({
 phase1:Object.freeze({
  boxing:Object.freeze({wind:26,hits:Object.freeze([hit(8,'jab',6,54,false,'plain',88),hit(18,'jab2',6,54,false,'plain',88),hit(19+GREEN_WARNING_TICKS,'overhand',13,60,true,'counter',50)]),end:62,recover:54}),
  handset:Object.freeze({wind:34,release:12,end:34,recover:66,speed:4.2,damage:13}),
  call:Object.freeze({wind:50,rally:20,end:48,recover:60}),
  deal:Object.freeze({wind:40,lunge:12,step:3.2,reach:24,arms:44,squeeze:Object.freeze([]),headbutt:24,release:30,end:44,stumble:46,recover:42,damage:Object.freeze({squeeze:0,headbutt:9})}),
 }),
 phase2:Object.freeze({
  boxing:Object.freeze({wind:22,hits:Object.freeze([hit(8,'jab',5,54,false,'plain',88),hit(22,'body',6,54,false,'plain',46),hit(23+GREEN_WARNING_TICKS,'cross',14,62,true,'counter',82)]),end:70,recover:48}),
  handset:Object.freeze({wind:28,release:9,release2:31,end:52,recover:60,speed:4.6,damage:13}),
  call:Object.freeze({wind:46,rally:20,end:44,recover:54}),
  deal:Object.freeze({wind:32,lunge:12,step:3.8,reach:24,arms:44,squeeze:Object.freeze([14,30]),headbutt:46,release:60,end:76,stumble:46,recover:30,damage:Object.freeze({squeeze:6,headbutt:14})}),
 }),
 // Gloves off: brace, grab the lapels, rip the jacket open (the damaged family takes over), tear the sleeve,
 // fling the shades, roar (the his rage becomes visible), slam, new guard.
 phaseBreak:Object.freeze({rip:24,impact:30,sleeve:38,shades:50,roar:62,slam:84,guard:94,end:104}),
 reguard:18,
 getup:30,
});
const MOVES=['boxing','handset','call','deal'];
export const getCloserTiming=b=>CLOSER_TIMING[b.phaseTwo?'phase2':'phase1'][MOVES.includes(b.state)?b.state:['dealhold','stumble'].includes(b.state)?'deal':b.pattern]||CLOSER_TIMING.phase1.boxing;
export function closerCueClass(b){
 if(b.state==='windup')return b.pattern==='deal'?'unblockable':b.pattern==='handset'?'reflect':b.pattern==='call'?'hazard':'plain';
 if(b.state==='boxing'){
  const next=getCloserTiming(b).hits.find(h=>h.at>=b.t);
  return next?.cls==='counter'&&next.at-b.t<=GREEN_WARNING_TICKS?'counter':'plain';
 }
 if(b.state==='handset'){const k=getCloserTiming(b);if(b.t<=k.release||k.release2&&b.t>k.release+6&&b.t<=k.release2)return 'reflect';}
 if(b.state==='deal'&&!b.hitLanded)return 'unblockable';
 return 'plain';
}
export function getCloserBeat(b){
 const timing=getCloserTiming(b),base={move:b.pattern,state:b.state,age:b.t,timing,cls:closerCueClass(b),part:'guard',strike:0};
 if(b.state==='windup')return{...base,part:'tell',remaining:Math.max(0,timing.wind-b.t)};
 if(b.state==='boxing'){
  let i=timing.hits.findIndex(h=>b.t<=h.at+7);if(i<0)i=timing.hits.length-1;
  const contact=timing.hits[i];
  return{...base,strike:i,name:contact.name,at:contact.at,part:b.t<contact.at?'tell':b.t<=contact.at+3?'contact':'retract',remaining:timing.end-b.t};
 }
 if(b.state==='handset'){
  const second=timing.release2&&b.t>timing.release+6,at=second?timing.release2:timing.release;
  return{...base,strike:second?1:0,part:b.t<at?'tell':b.t<at+7?'contact':second||!timing.release2?'reload':'rearm',at};
 }
 if(b.state==='call')return{...base,part:b.t<timing.rally?'call':b.t<timing.rally+12?'rally':'hangup'};
 if(b.state==='deal')return{...base,part:'lunge'};
 if(b.state==='dealhold'){const sq=timing.squeeze.findLast?.(s=>b.t>=s)??null;
  return{...base,move:'deal',part:b.t<timing.headbutt-10?'hold':b.t<timing.headbutt?'cock':b.t<timing.release?'headbutt':'shove',squeeze:sq};}
 if(b.state==='stumble')return{...base,move:'deal',part:b.t<timing.stumble*.5?'lurch':'winded'};
 if(b.state==='phase-break'){const k=CLOSER_TIMING.phaseBreak;return{...base,move:'phase-break',part:b.t<k.rip?'brace':b.t<k.impact+12?'impact':'recover'};}
 if(b.state==='recover')return{...base,move:b.recoverPattern||b.pattern,part:'recover',remaining:(b.recovery||54)-b.t};
 if(b.protectedStagger>0||b.state==='stagger')return{...base,part:'stagger'};
 if(b.state.startsWith('setup-'))return{...base,part:'walk'};
 return base;
}
