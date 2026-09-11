import {DELHI_FINISHERS,delhiFinisherPose,delhiBucketPose} from './delhi_finisher_performance.js';
import {spawnDefeatFX} from './defeat_fx.js';
import {beginBossEntry,updateBossEntry,drawBossEntry} from './boss_cinematic_entry.js';
// Authored India set pieces. Timelines own state and cues; drawing only samples them.
import { G, clamp, fall, inAir } from './engine.js';
import { ASSETS } from './assets.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { releaseSuper, releaseGrab } from './player.js';
import { spawnDust, spawnDebris } from './effects.js';
import { CINEMATIC_ANCHORS } from './india_cinematic_anchors.js';

export const INDIA_INTRO_TICKS = 720;
export const MARKET_RIDE_TICKS=180;
export const INDIA_FINISHERS = Object.freeze({
 'vendor-finish': DELHI_FINISHERS['vendor-finish'],
 'dredger-finish': DELHI_FINISHERS['dredger-finish'],
 'closer-finish': { ticks:840, camera:6000, voice:'duke_checks_cash', voiceAt:84, voiceMs:3330, hits:[302,330,364], damage:[412,486,578], exit:'clear' },
});
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1), ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function frame(ctx,key,i,x,y,w=128,h=128,cols=4,rows=4,face=1){
 const im=ASSETS[key];if(!im)return false;
 const fw=im.width/cols,fh=im.height/rows;i=clamp(i,0,cols*rows-1)|0;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
 ctx.drawImage(im,i%cols*fw,Math.floor(i/cols)*fh,fw,fh,-w/2,-h,w,h);ctx.restore();return true;
}
function actor(ctx,set,pose,i,x,y,face=1){const f=getFrame(SPR[set],pose,i,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
function chad(ctx,i,x,y,face=1){if(!frame(ctx,'ic_cine_chad',i,x,y+4,128,128,4,4,face))actor(ctx,'player',i>=10&&i<14?'hook':'idle',0,x,y,face);}
function once(c,key,t,at,fn){if(t>=at&&!c.cues.has(key)){c.cues.add(key);fn();}}
function sound(name,volume=.5){if(!G.audio.roomSfx(name,volume))G.audio.sfx(name);}
function quote(c,at,name,ms){once(c,'voice',c.t,at,()=>G.audio.voice(name,ms,true));}
function smash(c,key,at,x,y,major=false,sample=major?'train_blast':'room_glass'){
 once(c,key,c.t,at,()=>{sound(sample,major?.56:.4);G.shake=major?5:2;spawnDebris(x,y,major?12:6,['#74523a','#b2945b','#413331']);});
}
export function startIndiaFinisher(kind,boss){
 const s=G.india,cfg=INDIA_FINISHERS[kind],p=G.player;
 if(!s||!cfg||s.cinematic||s.endingDone||s.finishersDone?.has(kind)||p.dying||p.hp<=0)return false;
 // A lethal super already queues defeat until its last hit. Direct callers obey it too.
 if(p.specialTarget||boss.superLocked){s.pendingFinisher={kind,boss};return true;}
 releaseSuper(p);releaseGrab(p);
 if(p.grabbedBy){p.grabbedBy.holding=false;p.grabbedBy=null;}
 s.finishersDone??=new Set();s.damage??={kitchen:0,dredger:0,success:0};
 const bx=cfg.camera+(DELHI_FINISHERS[kind]?246:280);
 s.cinematic={kind,t:0,boss,cues:new Set(),cameraX:G.camX,playerX:p.x,playerY:p.y,bossX:boss.x,bossY:boss.y,bx,px:bx-56,
  priorDamage:(boss.fightProps||[]).map(q=>({role:q.role,broken:!!q.broken})),bucket:boss.bucket?{...boss.bucket}:null,bucketStartZ:boss.bucket?.z||0,winchGone:!!boss.winchGone};
 if(kind==='dredger-finish'&&boss.glass<3)s.damage.dredger=Math.max(s.damage.dredger,1);
 if(kind==='vendor-finish'&&boss.station?.broken)s.damage.kitchen=Math.max(s.damage.kitchen,1);
 s.pendingFinisher=null;s.pendingEntries=0;
 for(const e of G.enemies)if(!e.dead){e.state='spawn';e.face=e.x<bx?-1:1;e.moved=2;e.vx=0;}
 p.state='idle';p.z=p.vx=p.vz=0;p.invuln=999;
 G.effects=[];G.shots=[];G.zones=[];G.spawnQueue=[];G.hitstop=G.slowmo=G.parrySlow=0;
 beginBossEntry(s.cinematic,DELHI_FINISHERS[kind]?0:72);
 boss.finishStarted=true;boss.removeMe=true;boss.vx=boss.vz=boss.z=0;
 return true;
}
export function finisherPose(c,t=c.t){
 if(DELHI_FINISHERS[c.kind])return delhiFinisherPose(c,t);
 const cfg=INDIA_FINISHERS[c.kind],setup=72,b=c.bx,px=c.px;
 const pos={x:mix(c.playerX,px,t/setup),y:mix(c.playerY,236,t/setup),pose:0,walk:t<setup,
  vx:mix(c.bossX,b,t/60),vy:mix(c.bossY,236,t/60),victim:0};
 if(t<setup)return pos;
 const launch=cfg.hits[2],contact=cfg.damage[0];
 if(c.kind!=='closer-finish'&&t>=launch-12){pos.x=px+mix(0,24,(t-launch+12)/6);pos.step=t<launch-6;}
 if(c.kind==='vendor-finish'){
  pos.pose=t<176?0:t<194?6:t<210?7:t<218?10:t<228?0:t<236?6:t<244?11:t<252?6:t<262?7:t<274?8:t<310?9:t<440?0:t<498?14:15;
  if(t>=launch&&t<contact){const q=(t-launch)/(contact-launch);pos.vx=mix(b,cfg.camera+345,q);pos.vy=236-58*q-30*Math.sin(q*Math.PI);pos.victim=q<.4?2:3;}
  else if(t>=contact){const q=clamp((t-contact)/78,0,1);pos.vx=mix(cfg.camera+345,cfg.camera+396,q);pos.vy=mix(178,238,q)-32*Math.sin(q*Math.PI);pos.victim=t<contact+24?4:q<1?5:7;}
 }else if(c.kind==='dredger-finish'){
  pos.pose=t<112?0:t<130?6:t<138?10:t<152?0:t<166?6:t<174?11:t<188?6:t<204?7:t<218?8:t<262?9:t<644?0:t<700?14:15;
  if(t>=launch&&t<contact){const q=(t-launch)/(contact-launch);pos.vx=mix(b,cfg.camera+352,q);pos.vy=mix(236,102,q)-24*Math.sin(q*Math.PI);pos.victim=q<.45?2:3;}
  else if(t>=contact){const q=clamp((t-contact)/60,0,1);pos.vx=mix(cfg.camera+352,cfg.camera+369,q);pos.vy=mix(102,210,q*q);pos.victim=t<contact+10?4:q<1?5:7;}
 }else{
  pos.pose=t<282?0:t<302?6:t<310?10:t<320?0:t<330?6:t<338?11:t<352?12:t<364?6:t<380?13:t<426?9:t<660?0:t<720?14:15;
  if(t>=352)pos.x=px+mix(0,38,(t-352)/28);
  if(t>=launch&&t<contact){const q=(t-launch)/(contact-launch);pos.vx=mix(b,cfg.camera+344,q);pos.vy=236-44*q-24*Math.sin(q*Math.PI);pos.victim=q<.45?2:3;}
  else if(t>=contact){const q=clamp((t-contact)/94,0,1);pos.vx=mix(cfg.camera+344,cfg.camera+376,q);pos.vy=mix(192,241,q)-8*Math.sin(q*Math.PI);pos.victim=t<contact+22?4:q<1?5:7;}
 }
 if(t>=cfg.hits[0]&&t<launch)pos.victim=1;
 return pos;
}
export function updateIndiaFinisher(){
 const s=G.india;
 // A simultaneous lethal trade belongs to the existing death/checkpoint flow.
 // Never overwrite its down state with an immortal zero-health performance.
 if(G.player.dying||G.player.hp<=0){
  const boss=s.cinematic?.boss||s.pendingFinisher?.boss;
  if(boss){boss.finishStarted=false;boss.removeMe=false;boss.t=0;G.audio.stopRoomAudio();G.audio.stopSamples?.();}
  s.cinematic=null;s.pendingFinisher=null;return false;
 }
 if(s.pendingFinisher&&!G.player.specialTarget&&!s.pendingFinisher.boss.superLocked)startIndiaFinisher(s.pendingFinisher.kind,s.pendingFinisher.boss);
 const c=s.cinematic;if(!c)return false;
 const cfg=INDIA_FINISHERS[c.kind];if(!cfg)return false;
 if(updateBossEntry(c,()=>{G.camX=cfg.camera;c.cameraX=cfg.camera;c.playerX=c.px;c.playerY=236;c.bossX=c.bx;c.bossY=236;G.player.x=c.px;G.player.y=236;G.player.face=1;}))return true;
 c.t++;const t=c.t,p=G.player,pose=finisherPose(c),cam=cfg.camera;
 G.camX=cam;p.x=pose.x;p.y=pose.y;p.z=0;p.face=pose.walk?(Math.sign(c.px-c.playerX)||1):1;p.invuln=10;
 for(const e of G.enemies){
  if(!e.dead){e.x+=e.face*2.4;e.stridePhase=(e.stridePhase||0)+2.4;e.moved=2.4;}
  else{
   // Keep the existing KO bounce/lifetime running while hostile AI is suspended.
   e.t++;if(e.flash>0)e.flash--;
   if(inAir(e)){const landed=fall(e,.28,.3);if(landed!=='air')spawnDust(e.x,e.y,landed==='land'?3:2);}
   if(e.t>40)e.removeMe=true;
  }
 }
 G.enemies=G.enemies.filter(e=>!e.removeMe&&e.x>G.camX-90&&e.x<G.camX+570);
 quote(c,cfg.voiceAt,cfg.voice,cfg.voiceMs);
  for(const [i,at]of cfg.hits.entries())once(c,'hit'+i,t,at,()=>{sound(i===2?'heavy':'punch',i===2?.7:.55);G.shake=i===2?4:1;spawnDust(pose.vx,pose.vy-40,3);});
 if(c.kind==='closer-finish')once(c,'desk-drive',t,364,()=>{for(const q of c.boss.fightProps||[])if(['desk','cabinet'].includes(q.role)&&!q.broken){q.broken=q.dead=true;q.hp=0;spawnDebris(q.x,q.y-30,8,['#634c33','#ad8b4f']);}sound('slam',.5);});
 const group=c.kind==='vendor-finish'?'kitchen':c.kind==='dredger-finish'?'dredger':'success';
 for(const [i,at]of cfg.damage.entries())once(c,'damage'+i,t,at,()=>{
  s.damage[group]=Math.max(s.damage[group]||0,i+1);if(group==='success')s.displayBroken=true;
  for(const q of c.boss.fightProps||[])if((group==='kitchen'&&q.role==='station')||(group==='success'&&q.role!=='cabinet')){q.broken=q.dead=true;q.hp=0;}
 });
 if(group==='kitchen'){
  for(const [i,at]of [218,326,354,422,480].entries())smash(c,'blast'+i,at,cam+310+i%3*27,180-i%2*35,i===2||i===4,['room_glass','armor','train_blast','room_glass','slam'][i]);
  once(c,'pressure-release',t,326,()=>G.audio.roomSfx('train_brake',.15,.65));
 }
 if(group==='dredger')for(const [i,at]of [354,398,468,516,558,588,612,654,684].entries())smash(c,'blast'+i,at,cam+276+i%4*34,90+Math.min(i,4)*20,i>=2&&i%2===0,['room_glass','armor','train_blast','heavy','train_blast','armor','train_blast','slam','heavy'][i]);
 if(group==='dredger'){c.bucketPose=delhiBucketPose(t);once(c,'latch-release',t,260,()=>sound('armor',.38));}
 if(group==='success')for(const [i,at]of [412,450,486,532,578,620].entries())smash(c,'blast'+i,at,cam+312+i%3*38,155-i%2*32,i===2,['room_glass','armor','slam','room_glass','heavy','room_chair'][i]);
 const landing=group==='kitchen'?453:group==='dredger'?188:cfg.damage[0]+94;
 once(c,'victim-land',t,landing,()=>{sound('land',.24);spawnDust(pose.vx,pose.vy,3);});
 if(t>=(cfg.performanceTicks??cfg.ticks)){
  s.finishersDone.add(c.kind);s.completedScenes??={};s.completedScenes[c.kind]={...c,t:cfg.ticks};
  s.cinematic=null;c.boss.t=80;p.invuln=90;s.pendingFinisher=null;
  G.audio.stopRoomAudio();G.effects=[];G.shake=0;
  if(cfg.exit==='clear'){s.endingDone=true;s.finalPose=pose;p.state='victory';c.boss.victoryLine=true;}
  else{
   p.state='idle';p.invuln=0;c.boss.finishDone=true;
   // Completed arena props belong to the street now, including checkpoint saves.
   for(const q of c.boss.fightProps||[]){q.indiaBossProp=false;q.onBreak=null;}
  }
 }
 return true;
}
function structure(ctx,key,state,x,y,w,h){return frame(ctx,key,state,x,y,w,h,2,2);}
function explosion(ctx,t,at,x,y,w=72){
 const age=t-at;if(age<0||age>=90)return;
 ctx.save();if(age>57)ctx.globalAlpha=1-(age-57)/33;
 frame(ctx,'nr_explosion',Math.min(7,Math.floor(age/11)),x,y,w,w*.8,8,1);ctx.restore();
}
export function drawIndiaSetPieces(ctx,camX){
 const s=G.india;if(!s||s.review?.sets===false)return;
 const d=s.damage||{};
 if(G.stage.id==='delhi'){
  if(camX<560&&G.state!=='intro'){drawMarketStalls(ctx,camX,s.marketBroken?3:0);if(s.marketBroken)frame(ctx,'ic_rampage_bike',7,85-camX,240,192,160,4,2);}
  if(camX>2380&&camX<3220)structure(ctx,'ic_kitchen_set',d.kitchen||0,3000-camX,213,246,164);
  if(camX>5630)structure(ctx,'ic_dredger_set',d.dredger||0,6322-camX,210,260,174);
 }else if(camX>5640){
  const state=d.success||0;
  if(state)structure(ctx,'ic_success_set',state,6353-camX,218,256,218);
 }
 const c=s.cinematic||(s.endingDone?s.completedScenes?.['dredger-finish']||s.completedScenes?.['closer-finish']:null);
 const dredger=s.cinematic?.kind==='dredger-finish'?s.cinematic:s.completedScenes?.['dredger-finish'];
 if(c&&s.review?.fx!==false){
  const cam=INDIA_FINISHERS[c.kind].camera,t=c.t;
  if(c.kind==='vendor-finish'&&t>=294&&t<354)frame(ctx,'ic_steam',Math.floor((t-294)/8)%8,cam+343-camX,166,50,43,4,2);
  if(c.kind==='vendor-finish')for(const [i,at]of [354,422,480].entries())explosion(ctx,t,at,cam+310+i%3*27-camX,180-i%2*35,i===2?94:65);
  if(c.kind==='dredger-finish')for(const [i,at]of [354,398,468,516,558,588,612,654,684].entries())explosion(ctx,t,at,cam+276+i%4*34-camX,100+Math.min(i,4)*19,i%2?70:110);
  if(c.kind==='dredger-finish'&&t>=612&&t<790){ctx.save();ctx.globalAlpha=t>750?(790-t)/40:1;frame(ctx,'ic_cine_splash',Math.min(7,Math.floor((t-612)/21)),cam+334-camX,196,260,145,8,1);ctx.restore();}
  if(c.kind==='dredger-finish'&&t>=690)for(let i=0;i<4;i++)frame(ctx,'nr_explosion',3+Math.floor((t+i*17)/18)%2,cam+272+i*33-camX,198,32,31,8,1);
  if(c.kind==='closer-finish')for(const [i,at]of [412,450,486,532,578,620].entries())explosion(ctx,t,at,cam+312+i%3*38-camX,155-i%2*32,i===2?78:44);
 }
}
export function drawIndiaFinisher(ctx){drawIndiaFinisherActors(ctx);drawBossEntry(ctx,G.india?.cinematic);}
function drawIndiaFinisherActors(ctx){
 const s=G.india;if(s?.review?.actors===false)return;
 const scenes=Object.values(s?.completedScenes||{});
 if(s?.cinematic)scenes.push(s.cinematic);
 for(const c of scenes){
  if(DELHI_FINISHERS[c.kind]){drawDelhiPerformance(ctx,c,c===s.cinematic||s.endingDone);continue;}
  const pos=finisherPose(c),key=c.kind==='vendor-finish'?'ic_cine_vendor':c.kind==='dredger-finish'?'ic_cine_operator':'ic_cine_closer';
  const set=c.kind==='vendor-finish'?'ic_vendor':c.kind==='dredger-finish'?'thekedar':'ic_closer_damaged';
  if(pos.vx-G.camX>-120&&pos.vx-G.camX<600){
   const operator=c.kind==='dredger-finish',sheet=operator?'operator_finish':c.kind==='vendor-finish'?'vendor_finish':'closer_cascade';
   let index=(operator?[0,1,4,5,6,6,7,7]:[0,1,4,5,7,8,10,11])[pos.victim];
   const cfg=INDIA_FINISHERS[c.kind],fall=operator?60:c.kind==='vendor-finish'?78:94;
   if(operator&&c.t>=cfg.hits[2]&&c.t<cfg.hits[2]+4)index=0;
   if(pos.victim===1){const last=cfg.hits[1];index=c.t<cfg.hits[0]+8?1:c.t>=last&&c.t<last+8?2:c.t>=cfg.hits[2]-12?(operator?0:3):0;}
   if(!operator&&pos.victim===5){const left=cfg.damage[0]+fall-c.t;index=left<24?9:8;}
   const anchors=CINEMATIC_ANCHORS[sheet];
   let x=pos.vx-G.camX,y=pos.vy+4;
   if(pos.victim>=2&&pos.victim<7){
    // Air paths describe the pelvis, independent of curled legs or extended boots.
    const start=cfg.hits[2],impact=cfg.damage[0];
    const firstHip=236-124+anchors.hip[operator?0:3][1],impactHip=operator?80:c.kind==='vendor-finish'?160:161;
    const finalFoot=operator?210:c.kind==='vendor-finish'?238:241,finalHip=finalFoot-124+anchors.hip[operator?7:11][1];
    const q=clamp((c.t-start)/(impact-start),0,1),r=clamp((c.t-impact)/fall,0,1);
    const hipY=c.t<impact?mix(firstHip,impactHip,q)-(operator?28:30)*Math.sin(q*Math.PI):mix(impactHip,finalHip,operator?r*r:r)-(operator?0:20)*Math.sin(r*Math.PI);
    x+=64-anchors.hip[index][0];y=hipY+128-anchors.hip[index][1];
   }
   const approach=pos.walk&&c.t<60&&Math.abs(c.bx-c.bossX)>2,face=Math.sign(c.bx-c.bossX)||-1;
   if(approach){
    const gait=Math.floor(Math.abs(pos.vx-c.bossX)/(operator?4.5:5.4))%8;
    if(!operator||!frame(ctx,'ic_cine_operator_limp',gait,pos.vx-G.camX,pos.vy+4,128,128,4,2,-face))actor(ctx,set,'walk',gait,pos.vx-G.camX,pos.vy,face);
   }else if(!frame(ctx,key,index,x,y,128,128,4,anchors.rows))actor(ctx,set,pos.victim>=5?'down':'hurt',0,pos.vx-G.camX,pos.vy,-1);
  }
  if(c===s.cinematic||s.endingDone&&c.kind!=='vendor-finish'){
   if(pos.walk)actor(ctx,'player','walk',Math.floor(Math.abs(pos.x-c.playerX)/5.4)%8,pos.x-G.camX,pos.y,Math.sign(c.px-c.playerX)||1);
   else if(pos.step)actor(ctx,'player','run',Math.floor((c.t-INDIA_FINISHERS[c.kind].hits[2]+12)/2),pos.x-G.camX,pos.y,1);
   else chad(ctx,pos.pose,pos.x-G.camX,pos.y);
  }
 }
}
function drawDelhiPerformance(ctx,c,showChad){
 const pos=delhiFinisherPose(c),vendor=c.kind==='vendor-finish',t=c.t,cam=G.camX;
 const key=vendor?'ic_pressure_vendor':'ic_bucket_operator';
 const bp=delhiBucketPose(t);
 if(!vendor){
  // The scoop's real silhouette occludes the seated operator below its rim.
  frame(ctx,'ic_delhi_mechanisms',t<260?6:7,6265-cam,206,52,52,4,2);
  ctx.save();ctx.translate(bp.x-cam,bp.y);ctx.rotate(bp.angle);frame(ctx,'ic_delhi_mechanisms',t<354?4:5,0,0,83,83,4,2);ctx.restore();
 }
 if(!frame(ctx,key,pos.art,pos.vx-cam,pos.vy+4,128,128,4,3))actor(ctx,vendor?'ic_vendor':'thekedar',t>350?'down':'hurt',0,pos.vx-cam,pos.vy,-1);
 if(vendor){
  frame(ctx,'ic_delhi_mechanisms',t<354?Math.min(1,c.priorDamage.some(q=>q.broken)?1:0):t<480?2:3,3012-cam,221,78,78,4,2);
 }else{
  ctx.save();ctx.translate(bp.x-cam,bp.y);ctx.rotate(bp.angle);
  const im=ASSETS.ic_delhi_mechanisms;if(im){const k=t<354?4:5,w=im.width/4,h=im.height/2;ctx.drawImage(im,k%4*w,h+h*.73,w,h*.27,-41.5,-83*.27,83,83*.27);}ctx.restore();
 }
 if(showChad){
  if(pos.walk)actor(ctx,'player','walk',Math.floor(Math.abs(pos.x-c.px)/5.4)%8,pos.x-cam,pos.y,1);
  else if(!frame(ctx,'ic_delhi_finish_chad',pos.pose,pos.x-cam,pos.y+4,128,128,4,4))chad(ctx,pos.pose,pos.x-cam,pos.y);
 }
}
export const MARKET_IMPACTS=[216,286,356];
export function marketPose(t){
 if(t<120)return -1;
 if(t<145)return 0;if(t<158)return 1;if(t<170)return 2;if(t<180)return 3;
 if(t>=216&&t<224||t>=286&&t<294)return 8;
 if(t>=224&&t<234||t>=294&&t<304)return 9;
 if(t<322)return 4+Math.floor((t-180)/5)%4;
 if(t<338)return 11;if(t<360)return 12;if(t<382)return 13;if(t<402)return 14;return 15;
}
function drawMarketStalls(ctx,camX,state){
 if(G.india.review?.sets===false)return;
 frame(ctx,'ic_rampage_stalls',state,300-camX,242,280,186.667,2,2);

}
function drawMarketCounter(ctx,state){
 const im=ASSETS.ic_rampage_stalls;if(!im||G.india.review?.sets===false)return;
 const sw=im.width/2,sh=im.height/2,cut=sh*320/512;
 ctx.drawImage(im,state%2*sw,Math.floor(state/2)*sh+cut,sw,sh-cut,160,242-186.667+186.667*320/512,280,186.667*(1-320/512));
 if(state===2&&ASSETS.ic_rampage_awning){const q=ease(((G.india.marketIntro?.t||286)-300)/56);ctx.save();ctx.translate(300,99.083+q*61);ctx.rotate(Math.sin(q*Math.PI)*.06);ctx.drawImage(ASSETS.ic_rampage_awning,-140,0,280,65.625);ctx.restore();}
}
export function updateMarketEntrance(T){
 const t=Math.max(0,T-MARKET_RIDE_TICKS);
 const s=G.india,p=G.player;s.t=T;s.marketIntro??={t:0,cues:new Set(),damage:0};const c=s.marketIntro;c.t=t;
 p.face=1;p.z=p.vx=p.vz=0;p.y=236;p.invuln=10;p.state='idle';
 G.camX=0;
 once(c,'engine',T,0,()=>sound('entrance_engine',.38));
 once(c,'skid',T,60,()=>sound('entrance_skid',.32));
 if(T<MARKET_RIDE_TICKS){p.x=T<75?mix(-100,85,ease(T/75)):T<130?65:mix(65,130,(T-130)/50);return;}
 // Continuous rightward approach; contact holds preserve shoulder registration.
 p.x=t<180?130:t<216?mix(130,192,(t-180)/36):t<224?192:t<286?mix(192,316,(t-224)/62):t<294?316:t<322?mix(316,382,(t-294)/28):t<338?mix(382,392,ease((t-322)/16)):392;
 G.camX=0;
 for(const at of [185,195,205,238,248,258,268,278,308,318,334])once(c,'boot'+at,t,at,()=>sound('entrance_boot',.24));
 for(const [i,at]of MARKET_IMPACTS.entries())once(c,'stall'+i,t,at,()=>{
  c.damage=i+1;s.marketBroken=i===2;G.shake=i===2?3:5;
  if(i===0){c.vendorBurst=true;spawnDefeatFX({kind:'scenery',trainType:'ic_operator',x:265,y:221,z:0,h:74,state:'idle',superApplying:true,cosmeticSeed:73419},1,true,true);}
  sound(i===2?'entrance_crack':'slam',i===2?.4:.55);sound('room_glass',.22);
  spawnDebris(i===0?222:i===1?340:300,198,12,['#76502d','#b28b46','#4c3422','#8c6c3a']);spawnDust(i===0?222:340,230,5);
 });
 for(const at of [229,244,300,315,366])once(c,'pot'+at,t,at,()=>sound('armor',.24));
 quote(c,420,'duke_who_wants_some',1800);
}
export function drawMarketEntrance(ctx,T){
 const t=Math.max(0,T-MARKET_RIDE_TICKS),p=G.player,s=G.india;
 drawMarketStalls(ctx,0,s.marketIntro?.damage||0);
 // Vendors stand in front of hanging cookware but behind the actual counter silhouette.
 if(s.review?.actors!==false)for(const [i,x]of [265,378].entries()){
  if(i===0&&s.marketIntro?.vendorBurst)continue;
  const flee=i===0?Math.min(8,Math.max(0,t-205)):Math.max(0,t-222);
  const vx=x+Math.max(0,flee-16)*2.6;
  if(vx<535){
   if(flee<1){
    // Independent routines run during arrival too; each has a deliberate rest beat.
    const loop=i?[0,1,2,3,2,3,4,5,4,6,7,0]:[0,1,2,3,2,1,4,5,4,6,7,0];
    const pose=loop[Math.floor((T+i*57)/(i?12:10))%loop.length]+i*8;
    if(!frame(ctx,'ic_rampage_work',pose,vx,225,128,128,4,4))frame(ctx,'ic_rampage_vendor',i, vx,225,128,128,4,2);
   }else if(i===1){
    frame(ctx,'ic_rampage_chai',flee<8?0:flee<16?1:2+Math.floor((flee-16)/5)%6,vx,225,128,128,4,2);
   }else frame(ctx,'ic_rampage_vendor',2,vx,225,128,128,4,2);
  }
 }
 drawMarketCounter(ctx,s.marketIntro?.damage||0);
 if(s.review?.actors===false)return;
 if(T<MARKET_RIDE_TICKS){const idx=T<60?0:T<75?1:T<90?2:T<105?3:T<120?4:T<130?5:7;frame(ctx,'ic_rampage_bike',idx,T<75?mix(-100,85,ease(T/75)):85,240,192,160,4,2);if(T>=130)actor(ctx,'player','walk',Math.floor((p.x-65)/5.4)%8,p.x,p.y);return;}
 frame(ctx,'ic_rampage_bike',7,85,240,192,160,4,2);
 const pose=t<120?0:marketPose(t);
 if(pose<0)actor(ctx,'player','walk',Math.floor((p.x-40)/5.4)%8,p.x,p.y);
 else if(!frame(ctx,'ic_rampage_chad',pose,p.x,p.y+4,128,128,4,4))actor(ctx,'player',t>=180&&t<322?'run':'idle',Math.floor(t/5)%8,p.x,p.y);
}
