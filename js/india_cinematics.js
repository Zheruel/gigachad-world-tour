import {vendorVariantConfig} from './vendor_finish_variants.js';
import {drawFloorFire} from './vendor_floor_fire.js';
import {DELHI_FINISHERS,delhiFinisherPose} from './delhi_finisher_performance.js';
import {drawVendorKitchenLife,drawKitchenWall} from './vendor_kitchen_life.js';
import {DF,DF_BLASTS,updateDredgerFinish,drawDredgerFinish} from './dredger_finisher.js';
import {beginBossEntry,updateBossEntry,drawBossEntry} from './boss_cinematic_entry.js';
// Authored India set pieces. Timelines own state and cues; drawing only samples them.
import { G, W, clamp, fall, inAir } from './engine.js';
import { ASSETS } from './assets.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { releaseSuper, releaseGrab, IDLES } from './player.js';
import { spawnDust, spawnDebris, spawnSpark, spawnShock, spawnRing, spawnSmoke } from './effects.js';
import { drawMarketAftermath } from './delhi_intro.js';
import { withoutOldSellers, drawDelhiStreetSellers } from './delhi_life_market.js';
import { updateVendorFinish, drawVendorFinish, drawVendorUnder } from './vendor_finisher.js';
import {refundChadPose,refundVictim,refundCamera,refundDesk,refundContact,drawRefundChad,drawRefundFinish,drawRefundWallBlast,REFUND_FINISH,REFUND_FLOOR} from './refund_finisher.js';
import {REFUND_FRAGMENT_LANDINGS,refundPieces} from './refund_gore.js';
import { refundGaitFrame } from './refund_gait.js';
import { drawCloserRoom, drawCloserWall, spawnCash, CLOSER_WALL } from './closer_arena.js';
import { punchBurst } from './finisher_fx.js';

export const INDIA_FINISHERS = Object.freeze({
 'vendor-finish': DELHI_FINISHERS['vendor-finish'],
 'dredger-finish': DELHI_FINISHERS['dredger-finish'],
 'closer-finish': { ticks:REFUND_FINISH.ticks+30, performanceTicks:REFUND_FINISH.ticks, camera:6000, voice:'duke_price_wrong', voiceAt:10, voiceMs:2555, hits:[REFUND_FINISH.punch,REFUND_FINISH.desk,REFUND_FINISH.wallPunch], damage:[REFUND_FINISH.wall,REFUND_FINISH.blast+8,REFUND_FINISH.blast+24], exit:'clear' },
});
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1), ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
function frame(ctx,key,i,x,y,w=128,h=128,cols=4,rows=4,face=1){
 const im=ASSETS[key];if(!im)return false;
 const fw=im.width/cols,fh=im.height/rows;i=clamp(i,0,cols*rows-1)|0;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
 ctx.drawImage(im,i%cols*fw,Math.floor(i/cols)*fh,fw,fh,-w/2,-h,w,h);ctx.restore();return true;
}
function actor(ctx,set,pose,i,x,y,face=1){const f=getFrame(SPR[set],pose,i,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
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
 s.cinematic={kind,t:0,boss,cues:new Set(),cameraX:G.camX,playerX:p.x,playerY:p.y,bossX:boss.x,bossY:boss.y,bx,px:bx-(kind==='closer-finish'?64:56),
  priorDamage:(boss.fightProps||[]).map(q=>({role:q.role,broken:!!q.broken}))};
 if(kind==='vendor-finish')s.cinematic.variant='puri';
 if(kind==='closer-finish'){const desk=boss.fightProps?.find(q=>q.role==='desk');s.cinematic.desk={x:desk?.x??cfg.camera+250,y:desk?.y??217};s.cinematic.px=s.cinematic.desk.x-152;}
 if(kind==='dredger-finish'&&boss.glass<3)s.damage.dredger=Math.max(s.damage.dredger,1);
 s.pendingFinisher=null;s.pendingEntries=0;
 for(const e of G.enemies)if(!e.dead){e.state='spawn';e.face=e.x<bx?-1:1;e.moved=2;e.vx=0;}
 p.state='idle';p.z=p.vx=p.vz=0;p.invuln=999;
 G.effects=[];G.shots=[];G.zones=[];G.spawnQueue=[];G.hitstop=G.slowmo=G.parrySlow=0;
 beginBossEntry(s.cinematic,DELHI_FINISHERS[kind]||kind==='closer-finish'?0:72);
 boss.finishStarted=true;boss.removeMe=true;boss.vx=boss.vz=boss.z=0;
 return true;
}
export function finisherPose(c,t=c.t){
 if(DELHI_FINISHERS[c.kind])return delhiFinisherPose(c,t);
 const cfg=INDIA_FINISHERS[c.kind],setup=72,b=c.bx,px=c.px;
 if(c.kind==='closer-finish')return Object.assign(refundVictim(c,t),refundChadPose(c,t));
 const pos={x:mix(c.playerX,px,t/setup),y:mix(c.playerY,236,t/setup),pose:0,walk:t<setup,
  vx:mix(c.bossX,b,t/60),vy:mix(c.bossY,236,t/60),victim:0};
 if(t<setup)return Object.assign(pos,refundChadPose(c,t));
 return Object.assign(pos,refundChadPose(c,t));
}
// The Closer's last call (finish frames of ic_closer_damaged): 0 dazed 1 body blow 2 jaw 3 launched 4 flying
// 5 pinned to the screen wall 6 slumped at its foot 7 out cold. vx/vy is his foot point; lift raises the body
// off that point (into the wall) without changing his depth.
// The final straight holds contact before the rotating flight into the screen wall.
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
 const cfg=vendorVariantConfig(c,INDIA_FINISHERS[c.kind]);if(!cfg)return false;
 const stagingCamera=c.kind==='closer-finish'?refundCamera(c,0):cfg.camera;
 if(updateBossEntry(c,()=>{G.camX=stagingCamera;c.cameraX=stagingCamera;c.playerX=c.px;c.playerY=236;c.bossX=c.bx;c.bossY=236;G.player.x=c.px;G.player.y=236;G.player.face=1;
 }))return true;
 c.t++;const t=c.t,p=G.player,pose=finisherPose(c),cam=c.kind==='closer-finish'?refundCamera(c):cfg.camera;
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
 if(cfg.voice)quote(c,cfg.voiceAt,cfg.voice,cfg.voiceMs);
  for(const [i,at]of cfg.hits.entries())once(c,'hit'+i,t,at,()=>{sound(i===0?'punch':i===1?'slam':'heavy',i===0?.6:.7);G.shake=c.kind==='closer-finish'?[5,9,10][i]:i===0?1:i===1?6:5;spawnDust(pose.vx,pose.vy-40,i===0?3:8);});
 if(c.kind==='closer-finish'){
  once(c,'desk-charge',t,REFUND_FINISH.deskCharge,()=>sound('charge_arm',.28));
  once(c,'first-punch',t,REFUND_FINISH.punch,()=>sound('finale_gore',.3));
  once(c,'launch',t,REFUND_FINISH.release,()=>sound('neta_roof_whip',.35));
  once(c,'desk-smash',t,REFUND_FINISH.desk,()=>{
   const desk=c.boss.fightProps?.find(q=>q.role==='desk');
   if(desk&&!desk.broken){desk.hurt?.(999,1,true,true);G.hitstop=G.slowmo=G.parrySlow=0;}
   const d=refundContact(c,'desk');spawnDebris(d.x,d.y+12,22,['#422a1b','#a1763a','#d8cfae']);spawnRing(d.x,d.y,'#fff1c8');
   spawnCash(d.x,d.y,16,238,1.5);sound('break_wood',.6);sound('finale_gore',.48);
  });
  once(c,'desk-drop',t,REFUND_FINISH.drop,()=>{sound('land',.5);spawnDust(refundDesk(c).x,REFUND_FLOOR,6);G.shake=Math.max(G.shake,3);});
  once(c,'super-charge',t,REFUND_FINISH.charge,()=>sound('charge_arm',.55));
  once(c,'super-current',t,REFUND_FINISH.charge+20,()=>sound('super_electric',.22));
  once(c,'jaw-break',t,REFUND_FINISH.wallPunch,()=>{const h=refundContact(c,'wallPunch');sound('finale_gore',.6);spawnRing(h.x,h.y,'#fff1c8');});
  // Contact is held before the screens and the King burst together.
  once(c,'pinned',t,cfg.damage[0],()=>{G.audio.sfx('cond_hurt_2',.6);G.audio.sfx('room_glass',.5);sound('finale_gore',.5);G.shake=Math.max(G.shake,10);spawnSpark(pose.vx,pose.vy-pose.lift-50);});
  once(c,'screen-detonation',t,REFUND_FINISH.blast,()=>{sound('train_blast',.72);sound('finale_gore',.8);G.shake=Math.max(G.shake,12);spawnShock(CLOSER_WALL.x,180);spawnRing(CLOSER_WALL.x,88,'#fff0be');spawnDebris(CLOSER_WALL.x,90,32,['#c5e4e9','#34474d','#bd8d37']);spawnSmoke(CLOSER_WALL.x,130,12);});
  for(const {age,i,metal}of REFUND_FRAGMENT_LANDINGS)once(c,'fragment'+i,t,REFUND_FINISH.blast+age,()=>{const q=refundPieces(age)[i];sound(metal?'neta_roof_click':'neta_roof_thud',i===1?.45:.22);if(!metal)spawnDust(q.x,q.ground+10,3);});
  for(const [i,at]of [REFUND_FINISH.wall+48,REFUND_FINISH.wall+80,REFUND_FINISH.wall+108,REFUND_FINISH.wall+132].entries())once(c,'cash'+i,t,at,()=>{spawnCash(CLOSER_WALL.x+(i%3-1)*44,CLOSER_WALL.y-40,i===2?22:12,206,2.2);sound(i%2?'cond_coins_1':'neta_cash',.4);});
  once(c,'zippo',t,REFUND_FINISH.cigar+32,()=>sound('remote_click',.45));
 }
 const group=c.kind==='vendor-finish'?'kitchen':c.kind==='dredger-finish'?'dredger':'success';
 for(const [i,at]of cfg.damage.entries())once(c,'damage'+i,t,at,()=>{
  s.damage[group]=Math.max(s.damage[group]||0,i+1);if(group==='success')s.displayBroken=true;
  for(const q of c.boss.fightProps||[])if(group==='kitchen'&&q.role==='station'){q.broken=q.dead=true;q.hp=0;}
 });
 if(group==='kitchen'){
  updateVendorFinish(c,t,cam);
 }
 if(group==='dredger')updateDredgerFinish(c,t,cam);
 if(group==='dredger')for(const [i,at]of DF_BLASTS.entries())smash(c,'blast'+i,at,cam+276+i%4*34,90+Math.min(i,4)*20,i>=2&&i%2===0,['room_glass','armor','train_blast','heavy','train_blast','armor','train_blast','slam','heavy'][i]);
 if(group==='success')for(const [i,at]of CLOSER_BLASTS.entries()){
  const shake=G.shake;smash(c,'blast'+i,at,CLOSER_BLAST_X[i%3],CLOSER_BLAST_Y[i%2],i===2,['room_glass','armor','slam','room_glass','heavy','room_chair'][i]);G.shake=Math.max(shake,G.shake);
 }
 if(t>=(cfg.performanceTicks??cfg.ticks)){
  s.finishersDone.add(c.kind);s.completedScenes??={};s.completedScenes[c.kind]={...c,t:cfg.performanceTicks??cfg.ticks};
  s.cinematic=null;c.boss.t=80;p.invuln=90;s.pendingFinisher=null;
  G.audio.stopRoomAudio();G.effects=[];G.shake=G.hitstop=G.slowmo=0;
  if(cfg.exit==='clear'){s.endingDone=true;s.finalPose=pose;p.state='victory';c.boss.victoryLine=true;}
  else{
   p.state='idle';p.invuln=0;c.boss.finishDone=true;
   // Ending on his cigar, he carries on from the frame the cinematic held rather than restarting its drag.
   if(pose.chad?.pose==='idle_cigar'){const i=IDLES.findIndex(a=>a.name==='idle_cigar');p.state='idleanim';p.idleAnim=i;p.t=IDLES[i].hold*pose.chad.i+1;}
   // Completed arena props belong to the street now, including checkpoint saves.
   for(const q of c.boss.fightProps||[]){q.indiaBossProp=false;q.onBreak=null;}
  }
 }
 return true;
}
const DREDGER_FIRES=[[258,203,20],[296,195,30],[331,206,22],[352,190,16],[384,201,26],[418,207,18]];
const CLOSER_BLASTS=[REFUND_FINISH.wall,236,250,264,278,292],CLOSER_BLAST_X=[-68,0,70].map(d=>CLOSER_WALL.x+d),CLOSER_BLAST_Y=[137,92];
function structure(ctx,key,state,x,y,w,h){return frame(ctx,key,state,x,y,w,h,2,2);}
function explosion(ctx,t,at,x,y,w=72,life=90){
 const age=(t-at)*90/life;if(age<0||age>=90)return;
 ctx.save();if(age>57)ctx.globalAlpha=1-(age-57)/33;
 frame(ctx,'nr_explosion',Math.min(7,Math.floor(age/11)),x,y,w,w*.8,8,1);ctx.restore();
}
// The wreck going into the river: the painted eruption (8 frames: crown, column, peak, curtains, rain,
// surge, settle, fade) plus spray, mist and rings drawn over it. e = ticks since DF.splash.
const SPLASH_AT=[0,5,12,24,40,58,80,106,136],SPLASH_END=176,SPLASH_W=270,WATER_Y=200,RIVER_EDGE=191;   // the river ends at the deck's front rail: nothing of it spills onto the boards
const SPRAY=Array.from({length:46},(_,i)=>{const r=Math.sin(i*91.7)*43758.5%1,q=Math.abs(r);return {vx:(q-.5)*4.6+Math.sin(i)*.8,vy:-(3.2+Math.abs(Math.sin(i*12.9))*4.4),at:6+i%9*3,sz:1+(i%3===0)};});
function drawRiverSplash(ctx,e,x,layer,k=1){   // k scales it down for smaller things going in (the cut-loose grab)
 if(e<0||e>=SPLASH_END)return;
 ctx.save();
 if(layer==='back'){
  // Behind the rig, kept to the river: rings in the sunset-lit water and the painted eruption.
  ctx.beginPath();ctx.rect(0,0,W,RIVER_EDGE);ctx.clip();
  for(let k=0;k<4;k++){const a=e-8-k*16;if(a<0)continue;const r=(24+a*1.7)*k,al=clamp(1-a/120,0,1);if(al<=0)continue;
   for(const [dy,c,w] of [[0,`rgba(255,196,128,${.55*al})`,1],[2,`rgba(30,16,14,${.45*al})`,1]]){ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,RIVER_EDGE-6+dy,r,r*.09,0,Math.PI,Math.PI*2);ctx.stroke();}}
  let i=0;while(i<8&&e>=SPLASH_AT[i+1])i++;
  ctx.globalAlpha=e>SPLASH_END-40?(SPLASH_END-e)/40:1;
  frame(ctx,'ic_cine_splash',i,x,RIVER_EDGE+6,SPLASH_W*k,SPLASH_W*k,8,1);
  ctx.restore();return;
 }
 // In front: a warm mist that swells and drifts off, and chunky droplets arcing out of the column.
 const m=clamp(e/30,0,1)*clamp((SPLASH_END-e)/70,0,1);
 if(m>0){const g=ctx.createRadialGradient(x,WATER_Y-60*k-e*.25*k,8*k,x,WATER_Y-50*k-e*.25*k,(110+e*.4)*k);g.addColorStop(0,`rgba(232,214,196,${.3*m})`);g.addColorStop(1,'rgba(232,214,196,0)');ctx.fillStyle=g;ctx.fillRect(x-200,WATER_Y-240,400,260);}
 for(const d of SPRAY){const a=e-d.at;if(a<0)continue;const px=x+d.vx*a*k,py=WATER_Y-120*k+(d.vy*a+.11*a*a)*k;if(py>RIVER_EDGE-4)continue;
  const X=Math.round(px),Y=Math.round(py),z=d.sz+1;ctx.fillStyle='rgba(28,14,12,.8)';ctx.fillRect(X,Y+z,z,1);ctx.fillStyle=py<WATER_Y-90?'#f2c48a':'#8a5a40';ctx.fillRect(X,Y,z,z);ctx.fillStyle='#ffe8c0';ctx.fillRect(X,Y,1,1);}
 ctx.restore();
}
export function drawIndiaSetPieces(ctx,camX){
 const s=G.india;if(!s||s.review?.sets===false)return;
 const d=s.damage||{};
 if(G.stage.id==='delhi'){
  withoutOldSellers(()=>drawMarketAftermath(ctx,camX));drawDelhiStreetSellers(ctx,camX); // sellers: 8-pose art, delhi_life_market.js
  if(camX>2380&&camX<3220){drawKitchenWall(ctx,camX);structure(ctx,'ic_kitchen_set',d.kitchen||0,3000-camX,213,246,164);drawVendorKitchenLife(ctx,camX,d.kitchen||0);drawVendorUnder(ctx,camX);if(G.boss?.key==='vendor')drawFloorFire(ctx,G.boss,camX);}
  // The river erupts behind the rig as it goes in: the plume rises past the falling wreck.
  const dc=s.cinematic?.kind==='dredger-finish'&&s.review?.fx!==false?s.cinematic:null;
  if(dc&&camX>5630)drawRiverSplash(ctx,dc.t-DF.splash,INDIA_FINISHERS['dredger-finish'].camera+334-camX,'back');
  if(camX>5630&&G.boss?.key==='dredger')G.boss.delhi?.drawRiver?.(ctx,G.boss,camX,drawRiverSplash);   // the cut-loose grab goes into the river behind the rig
  if(camX>5630)structure(ctx,'ic_dredger_set',d.dredger||0,6322-camX,210,260,174);
  if(camX>5630&&G.boss?.key==='dredger')G.boss.delhi?.drawBackFx?.(ctx,G.boss,camX);   // transition lighting over the set, under the actors
 }else if(camX>5640){
  const state=d.success||0;
  // The wrecked wall art first; screens still alive on it and the ticker draw over it.
  drawCloserWall(ctx,camX,state);drawCloserRoom(ctx,camX,state);
 }
 const c=s.cinematic||(s.endingDone?s.completedScenes?.['dredger-finish']||s.completedScenes?.['closer-finish']:null);
 const dredger=s.cinematic?.kind==='dredger-finish'?s.cinematic:s.completedScenes?.['dredger-finish'];
 if(c&&s.review?.fx!==false){
  const cam=INDIA_FINISHERS[c.kind].camera,t=c.t;
  if(c.kind==='dredger-finish')for(const [i,at]of DF_BLASTS.entries())explosion(ctx,t,at,cam+276+i%4*34-camX,100+Math.min(i,4)*19,i%2?70:110);
  // Fires left burning through the wreck: scattered, each its own size and flicker.
  if(c.kind==='dredger-finish'&&t>=DF.splash+42)for(const [i,[x,y,w]]of DREDGER_FIRES.entries())if(t>=DF.splash+42+i*9)frame(ctx,'nr_explosion',3+Math.floor((t+i*23)/(14+i*3))%2,cam+x-camX,y,w,w*.95,8,1);
  if(c.kind==='dredger-finish')drawRiverSplash(ctx,t-DF.splash,cam+334-camX,'front');
  if(c.kind==='closer-finish'){drawRefundWallBlast(ctx,c,camX);for(const [i,at]of CLOSER_BLASTS.entries())if(i>0)explosion(ctx,t,at,CLOSER_BLAST_X[i%3]-camX,CLOSER_BLAST_Y[i%2],i===2?100:56,54);}
 }
}
export function drawIndiaFinisher(ctx){drawIndiaFinisherActors(ctx);drawBossEntry(ctx,G.india?.cinematic);}
function drawIndiaFinisherActors(ctx){
 const s=G.india;if(s?.review?.actors===false)return;
 const scenes=Object.values(s?.completedScenes||{});
 if(s?.cinematic)scenes.push(s.cinematic);
 for(const c of scenes){
  if(DELHI_FINISHERS[c.kind]){drawDelhiPerformance(ctx,c,c===s.cinematic||s.endingDone);continue;}
  // The Closer's victim performance; CHAD keeps his gameplay anatomy and registration.
  const pos=finisherPose(c),set='ic_closer_damaged';
  if(c.kind==='closer-finish'){drawRefundFinish(ctx,c,pos,G.camX,s.review?.fx!==false);continue;}
  if(pos.vx-G.camX>-120&&pos.vx-G.camX<600){
   const approach=pos.walk&&c.t<60&&Math.abs(c.bx-c.bossX)>2,face=Math.sign(c.bx-c.bossX)||-1;
   if(approach)actor(ctx,set,'walk',refundGaitFrame(set,Math.abs(pos.vx-c.bossX),false,8),pos.vx-G.camX,pos.vy,face);
   else{
    // Contact shadow stays on the floor under him while he is in the air or pinned up the wall.
    if(!G.reflecting){ctx.save();ctx.fillStyle=`rgba(6,4,10,${.35-Math.min(.2,pos.lift/300)})`;ctx.beginPath();ctx.ellipse(Math.round(pos.vx-G.camX),Math.round(pos.vy),pos.victim>=6?30:18,4,0,0,Math.PI*2);ctx.fill();ctx.restore();}
    const f=SPR[set]&&getFrame(SPR[set],'finish',pos.victim,-1);
    if(f&&pos.spin){
     // Tumbling: rotate about his middle, not his feet.
     const cx=Math.round(pos.vx-G.camX),cy=Math.round(pos.vy-pos.lift-frameH(f)*.3);
     ctx.save();ctx.translate(cx,cy);ctx.rotate(pos.spin);blit(ctx,f,-Math.round(frameW(f)/2),Math.round(-frameH(f)*.7+4));ctx.restore();
    }
    else if(f)blit(ctx,f,Math.round(pos.vx-G.camX-frameW(f)/2),Math.round(pos.vy-pos.lift-frameH(f)+4));
    else actor(ctx,set,pos.victim>=6?'down':'hurt',0,pos.vx-G.camX,pos.vy-pos.lift,-1);
   }
  }
  if(c===s.cinematic||s.endingDone)drawRefundChad(ctx,c,pos,G.camX);

 }
}
function drawDelhiPerformance(ctx,c,showChad){
 if(c.kind==='vendor-finish')return drawVendorFinish(ctx,c,showChad,G.camX);
 return drawDredgerFinish(ctx,c,showChad,G.camX);
}
