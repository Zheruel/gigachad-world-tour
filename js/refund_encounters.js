// Brief performances by the crew CHAD is actually fighting. No combat, spawning,
// locks or rewards live here; checkpointed cues own the once-only route history.
import { G, W } from './engine.js';
import { drawDialogue, updateDialogue, dialogueLife } from './room_dialogue.js';

const INTERRUPTED=new Set(['hurt','stagger','down','thrown','dying']);
const live=e=>e&&!e.dead&&!e.dying&&!e.removeMe;
const onScreen=e=>e&&e.x>G.camX+24&&e.x<G.camX+W-24;
const blocked=()=>G.state!=='play'||G.boss||G.cinematic||G.player?.state==='special'||G.parrySlow>0||
 G.india.cinematic||G.india.endingDone||G.bossSpeech;
function state(){
 const s=G.india;if(G.stage?.id!=='refund'||!s)return null;
 let q=s.refundEncounters;
 // A retry restores the clock/cue Set and creates a new player. A scene seek
 // does the same: never carry a bubble or interrupted-call observation across it.
 if(!q||q.cues!==s.cues||q.player!==G.player||s.t<q.clock){
  q=s.refundEncounters={cues:s.cues,player:G.player,clock:s.t,wave:G.waveIndex,
   enteredAt:s.t,speech:null,gap:0,actors:new Map(),props:new Map()};
 }
 return q;
}
function say(q,key,text,speaker){
 if(!text||q.speech||q.gap>0||q.cues.has(key)||!live(speaker)||!onScreen(speaker))return false;
 q.cues.add(key);q.speech={key,text,speaker,age:0,life:dialogueLife(text)};return true;
}
function observe(q){
 for(const e of G.enemies){
  if(!e.trainType?.startsWith('ic_'))continue;
  const before=q.actors.get(e);
  if(before?.state==='rally'&&before.t<32&&INTERRUPTED.has(e.state)){
   say(q,'refund:call-interrupted','Call cancelled.',G.player);
  }
  if(e.trainType==='ic_cabinet'&&before?.rigIntact&&e.rig?.broken){
   say(q,'refund:cabinet-broken','Escalation denied.',G.player);
  }
  q.actors.set(e,{state:e.state,t:e.t,rigIntact:!!e.rig&&!e.rig.broken});
 }
 for(const e of q.actors.keys())if(!G.enemies.includes(e))q.actors.delete(e);
 for(const shot of G.shots){
  if(shot.reflected&&shot.source?.trainType==='ic_thrower'){
   say(q,'refund:phone-returned','Return to sender.',G.player);
  }
 }
 for(const pr of G.props){
  const before=q.props.get(pr);
  if(before===false&&pr.broken&&onScreen(pr)&&!pr.indiaBossProp){
   if(pr.prop==='ic_server')say(q,'refund:server-offline','Disconnected.',G.player);
   else if(pr.prop==='ic_shelf'&&pr.x>=4050)say(q,'refund:records-shredded','Keep the receipt.',G.player);
  }
  q.props.set(pr,!!pr.broken);
 }
 for(const pr of q.props.keys())if(!G.props.includes(pr))q.props.delete(pr);
}
export function updateRefundEncounters(){
 const q=state();if(!q||G.paused)return;
 q.clock=G.india.t;
 if(q.wave!==G.waveIndex){
  q.wave=G.waveIndex;q.enteredAt=G.india.t;q.speech=null;q.gap=0;q.actors.clear();
 }
 if(blocked()){
  q.speech=null;q.gap=45;q.actors.clear();q.props.clear();return;
 }
 if(q.gap>0)q.gap--;
 if(q.speech){
  const s=q.speech;
  if(!live(s.speaker)||!onScreen(s.speaker)||++s.age>=s.life){q.speech=null;q.gap=90;}
  else updateDialogue(s.text,s.age,{remaining:s.life-s.age});
 }
 const beat=G.stage.waves[G.waveIndex]?.refundBeat;
 // New faces get a line after their desk exit / arena pan. An already defeated
 // speaker cannot talk from the floor, and a missed entrance cannot fire late.
 if(G.waveActive&&beat?.line&&G.india.t-q.enteredAt<220){
  const speaker=G.enemies.find(e=>e.trainType===beat.role&&live(e)&&onScreen(e)&&
   !['spawn','hurt','stagger','down','thrown','getup','grabbed'].includes(e.state));
  if(speaker)say(q,'refund:entrance:'+beat.id,beat.line,speaker);
 }
 observe(q);
}
export function drawRefundEncounters(ctx,camX=G.camX){
 const q=G.stage?.id==='refund'&&G.india?.refundEncounters,s=q?.speech;
 if(!s||blocked()||
  !live(s.speaker)||!onScreen(s.speaker)||G.india.review?.dialogue===false)return;
 const e=s.speaker;
 drawDialogue(ctx,{text:s.text,x:e.x-camX,bottom:e.y-(e.z||0)-(e.h||86)-9,
  age:s.age,remaining:s.life-s.age,width:176});
}
