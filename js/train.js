import {snapshotGrade,restoreGrade} from './grading.js';
import {beginBossEntry,updateBossEntry,drawBossEntry,seekBossEntry} from './boss_cinematic_entry.js';
// Fresh Night Train route. Simulation owns every timer; rendering never mutates it.
import {G,W,H,clamp,laneMin,resetCombo} from './engine.js';
import {ASSETS} from './assets.js';
import {input} from './input.js';
import {drawTextShadow,textWidth,SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {createProp} from './props.js';
import {createBoss} from './bosses.js';
import {drawWheelSparks} from './effects.js';
import {hurtPlayer} from './player.js';
import {drawFinale,updateFinale} from './train_finale.js';
import {drawTrainVista,updateTrainVista,resetTrainVista} from './train_vistas.js';
import {drawDirectionArrow} from './direction_arrow.js';
import {drawOfficeChain} from './train_conductor.js';
import {drawInspectorFinish,drawInspectorCap,drawInspectorBody,updateInspectorFinish,drawRetainedProps,drawRetainedCases} from './train_finishers.js';
import {SHERA_FINISH_TICKS,SHERA_FINISH_CUT,updateSheraFinish,drawSheraFinish,sheraFinishProps,updateNetaKnockout,drawNetaKnockout} from './train_neta_cinematics.js';
import {initTrainLife,updateTrainLife,drawTrainLife,seatShadow,seatIdleFrame} from './train_life.js';
import { updateStationLife, drawStationLife, drawStationFreight, drawStationForeground } from './station_life.js';
export const ABOARD_X=2880,ROOF_X=8160,ROOF_TRANSITION_TICKS=SHERA_FINISH_TICKS;
export {SHERA_FINISH_TICKS};
export const TRAIN_AREAS=[['yard',0,960],['hall',960,1920],['platform',1920,2880],['general',2880,3840],['sleeper',3840,5280],['pantry',5280,5760],['office',5760,6240],['ac',6240,7200],['private',7200,8160],['roof',8160,9120]];

export function initTrain(){G.train={t:0,motionT:0,distance:0,aboard:false,climbed:false,cinematic:null,endingDone:false,checkpoint:0,checkpointScore:G.score,gradeCheckpoint:snapshotGrade(),gate:true,sway:0,scene:0,claimedLives:[],arrival:-1,vistaX:0,vistaTarget:0,passengerReactions:[{t:-1,ready:0},{t:-1,ready:0}]};initTrainLife(G.train);}
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
export function position(x,y=218){G.lurch=null;Object.assign(G.player,{x,y,z:0,vz:0,vx:0,vy:0,state:'idle',t:0,face:1,runT:0,idleT:0,moved:0,stridePhase:0,hitDone:false,chainQueued:false,queuedHits:0,hitConfirm:false,chainSkip:0,grabbedBy:null,invuln:90,guardWindow:0,guardDenied:0,parryLock:0,counterT:0,attackFamilies:[],grabTarget:null,specialTarget:null,superT:0});}
function clearArena(){G.enemies=[];G.shots=[];G.zones=[];G.spawnQueue=[];G.waveActive=false;G.locked=false;G.arenaSqueeze=G.arenaSqueezeTarget=0;}
export function restoreTrainCheckpoint(){
 if(!G.train)return;const tr=G.train,x=tr.checkpoint,kept=G.boss?.key==='neta'&&G.boss.phase===2?G.boss.hp:0;restoreGrade(tr.gradeCheckpoint);clearArena();G.boss=null;tr.cinematic=null;tr.endingDone=false;tr.climbed=false;tr.knockoutBody=false;tr.inspectorBody=null;tr.officeDeskBroken=false;tr.passengerReactions=[{t:-1,ready:0},{t:-1,ready:0}];tr.retryBoss=x>=7950;tr.conductorRetry=!!tr.conductorMet;tr.aboard=x>=ABOARD_X;tr.gate=true;
 initTrainLife(tr);
 G.camX=G.camLock=x>=7950?7680:x;position(x>=7950?7950:x+60);G.player.hp=G.player.maxhp;G.player.dying=false;G.score=tr.checkpointScore;
 for(const w of G.stage.waves)w.done=w.x<x;
 G.waveIndex=G.stage.waves.findLastIndex(w=>w.x<x);
 G.props=G.stage.props.map(d=>createProp(d.kind,d.x,d.y,d.z));
 for(const pr of G.props)if(pr.x<x||tr.claimedLives.includes(pr.x)){pr.broken=true;pr.hp=0;}
 G.pickups=[];G.effects=[];resetCombo();G.meter=x>=7950?0:Math.max(G.meter,40);tr.scene=x>=7200?2:x>=4320?1:0;
 tr.vistaX=tr.vistaTarget=vistaTargetFor(x);tr.motionT=tr.vistaX/.12;resetTrainVista(tr,x);
 G.audio.music(x>=ABOARD_X?G.stage.musicB:G.stage.music);
 if(tr.roofCheckpoint)restoreRoof(tr,kept);
 else if(tr.sheraRage)restoreShera(tr);

}
// A roof death resumes the roof duel with Netaji at no less than half health (never below what he had); the guards stay beaten.
function restoreRoof(tr,kept=0){
 tr.aboard=tr.climbed=true;tr.retryBoss=false;tr.scene=2;G.camX=G.camLock=8640;position(8760);G.locked=true;G.meter=0;
 for(const w of G.stage.waves)w.done=true;G.waveIndex=G.stage.waves.length-1;
 const b=createBoss('neta',8980,218);b.delhi.toRoof(b);Object.assign(b,{hp:Math.max(kept,b.maxhp/2),atkCd:90,roofGuardsSpawned:true});
 G.audio.music(G.stage.bossMusic);
}
// Shera's UNPAID phase is its own checkpoint: a death there restarts it (Netaji already fled) at 45%.
export function markSheraCheckpoint(){const tr=G.train;if(!tr)return;tr.sheraRage=true;tr.checkpointScore=G.score;tr.gradeCheckpoint=snapshotGrade();}
function restoreShera(tr){
 tr.retryBoss=false;tr.scene=2;G.camX=G.camLock=7680;position(7800);G.locked=true;G.meter=Math.max(G.meter,40);
 for(const w of G.stage.waves)w.done=true;G.waveIndex=G.stage.waves.length-1;
 const b=createBoss('neta',8030,218);b.delhi.enrage(b);b.face=-1;
 G.audio.music(G.stage.bossMusic);
}
export function vistaTargetFor(x){return clamp((x-ABOARD_X)/(ROOF_X-ABOARD_X)*2400,0,2400);}
function checkpoint(x){if(G.train.checkpoint<x){G.train.checkpoint=x;G.train.checkpointScore=G.score;G.train.gradeCheckpoint=snapshotGrade();}}
export function startTrainCinematic(kind){if(G.train.cinematic)return;if(kind==='roof')kind='shera-finish';if(kind==='escape'){G.audio.stopSamples?.();G.audio.stopRoomAudio?.();}G.train.cinematic={kind,t:0,fromX:G.player.x,fromY:G.player.y,fromCam:G.camX,fromBossX:G.boss?.x,fromBossY:G.boss?.y,deskBroken:!!G.train.officeDeskBroken,fightProps:(G.boss?.fightProps||[]).map(p=>({...p}))};G.player.grabbedBy=null;G.player.z=0;G.shots=[];G.zones=[];if(['inspector-finish','knockout','shera-finish'].includes(kind))beginBossEntry(G.train.cinematic,kind==='inspector-finish'?48:kind==='knockout'?20:0);if(!['escape','inspector-finish','knockout','shera-finish'].includes(kind))G.audio.sfx(kind==='boarding'?'go':'heavy');}
export function updateTrainMotion(){const tr=G.train;if(!tr?.aboard||tr.endingDone||tr.cinematic?.kind==='escape')return;tr.distance+=2.6;tr.motionT++;updateTrainVista(tr,G.stage.waves,tr.checkpoint);if(tr.motionT%24===0)G.audio.trainSfx?.('roll');}
// Background reactions use the simulation clock and never influence encounters.
function updatePassengerReactions(tr){
 tr.passengerReactions||=[{t:-1,ready:0},{t:-1,ready:0}];
 if(!tr.aboard||tr.cinematic)return;
 for(const [i,x]of [3170,4235].entries()){
  const reaction=tr.passengerReactions[i];
  if(reaction.t>=0){if(++reaction.t>=150)reaction.t=-1;continue;}
  if(tr.t<reaction.ready)continue;
  const threat=G.enemies.some(e=>!e.dead&&Math.abs(e.x-x)<185&&['windup','attack','charge','drop'].includes(e.state));
  if(threat){reaction.t=0;reaction.ready=tr.t+360+i*37;}
 }
}
export function updateTrain(){
 const tr=G.train;if(!tr)return false;tr.t++;updatePassengerReactions(tr);updateTrainLife(tr);updateStationLife(tr);
 if(tr.endingDone)return false;
 if(!input.held('use'))tr.gate=false;
 const c=tr.cinematic;
 if(c){
  if(updateBossEntry(c,()=>stageTrainFinish(c)))return true;
  c.t++;if(G.shake>0){G.shake*=.86;if(G.shake<.2)G.shake=0;}if(G.flash>0)G.flash--;
  if(c.kind==='boarding'){
   if(c.t===24)G.audio.sfx('entrance_boot');
   if(c.t===52||c.t===76)G.audio.sfx('entrance_boot');
   if(c.t===106)G.audio.sfx('slam');
   if(c.t>=120){clearArena();tr.aboard=true;tr.cinematic=null;G.camX=ABOARD_X;position(ABOARD_X+60);checkpoint(ABOARD_X);G.audio.music(G.stage.musicB);G.audio.trainSfx?.('whistle');}
  }else if(c.kind==='inspector-finish'){
   if(updateInspectorFinish(c)){tr.cinematic=null;if(G.boss){G.boss.removeMe=true;G.boss.t=90;}Object.assign(G.player,{state:'idleanim',idleAnim:0,t:52,idleT:0});G.player.invuln=45;G.player.x=c.endX||G.player.x;G.player.y=c.endY||G.player.y;}
  }else if(c.kind==='shera-finish'){
   updateSheraFinish(c);
   if(c.t>=ROOF_TRANSITION_TICKS){tr.cinematic=null;tr.climbed=true;tr.roofCheckpoint=true;tr.checkpointScore=G.score;tr.gradeCheckpoint=snapshotGrade();G.camX=G.camLock=ROOF_X;position(ROOF_X+105);if(G.player.dying||G.player.hp<=0){G.player.dying=false;G.player.hp=Math.max(G.player.hp,30);}G.locked=true;if(G.boss){Object.assign(G.boss,{x:ROOF_X+850,y:218,z:0,state:'idle',t:0,atkCd:90,trainWaiting:true,roofGuardsSpawned:false});}}
  }else if(c.kind==='knockout'){
   if(updateNetaKnockout(c)){tr.cinematic=null;startTrainCinematic('escape');}
  }else if(c.kind==='escape'){
   if(updateFinale(c)){tr.endingDone=true;position(ROOF_X+180);G.fade=0;G.shake=0;G.flash=0;if(G.boss)G.boss.t=71;}

  }
  return true;
 }
 if(!tr.aboard){
  const stationClear=G.waveIndex>=3&&!G.locked&&!G.waveActive&&!G.spawnQueue.length&&!G.enemies.some(e=>!e.dead&&!e.noCount);
  if(tr.arrival<0&&stationClear&&G.player.x>=2420){tr.arrival=0;tr.gate=true;G.audio.trainSfx?.('whistle');G.audio.roomSfx?.('train_arrive',.6);}
  else if(tr.arrival>=0&&tr.arrival<240){tr.arrival++;if(tr.arrival===238)G.shake=Math.max(G.shake,1);if(tr.arrival===240)tr.gate=true;}
  G.player.x=Math.min(G.player.x,2810);
  if(stationClear&&tr.arrival>=240&&Math.abs(G.player.x-2715)<55&&!tr.gate&&input.pressed('use')&&G.player.z===0){startTrainCinematic('boarding');return true;}
 }
 if(tr.aboard){

  tr.scene=Math.max(tr.scene,G.player.x>=7200?2:G.player.x>=4320?1:0);
  tr.sway=0;

  if(G.player.x>=5700&&!G.locked)checkpoint(5700);  // office door: a death at the conductor replays only the office
  if(G.player.x>=6240&&!G.locked)checkpoint(6240);
  if(G.player.x>=7200&&!G.locked)checkpoint(7200);
  if(G.player.x>=8160&&!tr.climbed)G.player.x=8150;
 }
 return false;
}
function image(ctx,key,x,y,w,h){const im=ASSETS['nr_'+key];if(im)ctx.drawImage(im,Math.round(x),Math.round(y),w,h);}
// Station chai-wallah routine over station_tea.png: rest, sip, a double pulled pour, offer,
// wipe a glass, greet. [frame, ticks]; frames 0 rest 1 sip 2 greet 3 reach 4-6 low/high/mid
// pour 7 set down 8 lift glass 9 offer 10-11 wipe.
const TEA_ROUTINE=[[0,90],[1,50],[0,60],[3,14],[4,10],[5,40],[6,12],[4,10],[5,36],[6,12],[7,16],[8,14],[9,60],[8,12],[0,40],...Array.from({length:12},(_,i)=>[10+i%2,8]),[0,40],[2,50]];
const TEA_TICKS=TEA_ROUTINE.reduce((n,[,d])=>n+d,0);
function teaPose(t){let c=t%TEA_TICKS;for(const [f,d]of TEA_ROUTINE){if(c<d)return f;c-=d;}return 0;}
function sprite(ctx,key,frame,x,y,w,h,cw=256,ch=224){const im=ASSETS['nr_'+key];if(!im)return false;ctx.drawImage(im,frame*cw,0,cw,ch,Math.round(x-w/2),Math.round(y-h),w,h);return true;}
export function drawTrainHeroPose(ctx,frame,x,y){if(!sprite(ctx,'chad_cinema',frame,x,y,112,112,224,224)){const f=getFrame(SPR.player,'idle',0,1);blit(ctx,f,x-frameW(f)/2,y-frameH(f)+4);}}
export function drawTrainEntryPose(ctx,frame,x,y){if(!sprite(ctx,'chad_entry',frame,x,y,112,112,224,224))drawTrainHeroPose(ctx,0,x,y);}
export function drawTicketClerk(ctx,t,camX=0){
 // Defiance gives way to a duck at the smash, then a timid surrender.
 const state=t<55?0:t<123?1:t<143?2:t<210?3:4+(t<242?0:Math.floor((t-242)/24)%2);
 const duck=t<123?8:t<143?8+Math.round(15*ease((t-128)/15)):t<210?11:5+Math.round(22*(1-ease((t-210)/32)));
 // The painted opening begins below the lintel and ends at the sill's top
 // pixel (321 on the 2x plate). Snap both mask and actor to the same camera.
 const x=Math.round(camX);
 ctx.save();ctx.beginPath();ctx.rect(50-x,134,88,26.5);ctx.clip();
 sprite(ctx,'ticket_clerk',state,96-x,168+duck,80,56,160,112);ctx.restore();
}
export function drawTicketScanner(ctx,t,camX=0){
 const state=t<143?0:t<151?1:2;
 sprite(ctx,'ticket_scanner',state,275-camX,207,140,80,280,160);
}
export function drawTicketPanels(ctx,t){
 if(t<151||t>=199)return;
 const age=t-151;
 for(const side of [-1,1]){
  ctx.save();ctx.translate(Math.round(275+side*(17+age*2.1)),Math.round(177-age*1.6+age*age*.072));
  ctx.rotate(side*age*.075);ctx.globalAlpha=Math.min(1,(199-t)/8);
  sprite(ctx,'ticket_scanner',side<0?3:4,0,40,140,80,280,160);ctx.restore();
 }
}
export function drawOutside(ctx,camX){drawTrainVista(ctx,G.train);
}
export function drawTrainScene(ctx,camX){
 if(G.train?.review?.art===false){ctx.fillStyle='#18202b';ctx.fillRect(0,0,W,H);return;}
 drawOutside(ctx,camX);
 for(const [key,start,end]of TRAIN_AREAS){
  if(end<camX||start>camX+W)continue;
  ctx.save();ctx.beginPath();ctx.rect(start-camX,0,end-start,H);ctx.clip();
  const artKey=key==='private'&&G.boss?.key==='neta'&&(G.boss.roof||G.boss.wrecked)&&ASSETS.nr_private_damaged?'private_damaged':key;
  const im=ASSETS['nr_'+artKey];
  const plateWidth=['pantry','office'].includes(key)?480:960;
  if(im&&G.train?.review?.interior!==false){for(let x=start,i=0;x<end;x+=plateWidth,i++){ctx.save();if(i%2){ctx.translate(2*(x-camX)+plateWidth,0);ctx.scale(-1,1);}image(ctx,artKey,x-camX,0,plateWidth,H);ctx.restore();}}
  else{ctx.fillStyle='#171c29';ctx.fillRect(start-camX,181,end-start,89);}
  ctx.restore();
 }
 for(const [x,key]of [[960,'join_yard_hall'],[1920,'join_hall_platform']])if(x+240>camX&&x-240<camX+W)image(ctx,key,x-240-camX,0,480,270);
 for(const x of [3840,5280,5760,6240,7200])if(x+44>camX&&x-44<camX+W&&G.train?.review?.interior!==false){
  ctx.save();ctx.beginPath();ctx.rect(x-44-camX,0,88,185);ctx.clip();
  drawOutside(ctx,camX);ctx.restore();image(ctx,'gangway',x-44-camX,0,88,H);
 }
 if(G.train&&G.train.review?.interior!==false&&G.train.review?.npc!==false)drawStationFreight(ctx,G.train,camX,()=>drawPlatformFront(ctx,camX));
 if(camX+W>1920&&camX<2880&&G.train?.review?.interior!==false)drawPlatformTrain(ctx,camX);
 drawTrainWallPlane(ctx,camX);
}
export function drawConductorDesk(ctx,camX){
 if(G.train?.review?.conductorDesk===false)return;
 const desk=G.train?.officeDeskBroken?(ASSETS.nr_office_desk_broken||ASSETS.nr_office_desk):ASSETS.nr_office_desk;if(desk)ctx.drawImage(desk,5985-camX,116,155,78);
 if(!G.boss||G.boss.removeMe)drawRetainedCases(ctx,G.train?.officeFightProps,camX);
 const body=G.train?.inspectorBody;if(body)drawInspectorBody(ctx,body,camX);
}
export function drawTrainWallPlane(ctx,camX){
 const tr=G.train;if(!tr)return;
 if(tr.review?.npc!==false&&tr.review?.interior!==false)drawStationLife(ctx,tr,camX);
 drawTrainLife(ctx,tr,camX);
 if(tr.climbed)image(ctx,'hatch_open',ROOF_X+65-camX,165,80,50);
 if(tr.review?.fx!==false&&tr.review?.interior!==false&&tr.aboard&&!tr.cinematic){
  // Rotating blade shadows stay inside the authored general-coach fan cages.
  for(const [i,localX]of [283,510,688].entries()){
   const x=2880+localX-camX;if(x<-24||x>W+24)continue;
   ctx.save();ctx.beginPath();ctx.ellipse(x,32,18,7,0,0,Math.PI*2);ctx.clip();
   ctx.translate(x,32);ctx.scale(1,.39);ctx.rotate(tr.t*.19+i*1.8);
   for(let j=0;j<3;j++){ctx.rotate(Math.PI*2/3);ctx.fillStyle='#090a0ba0';ctx.fillRect(4,-2,14,4);ctx.fillStyle='#ae774535';ctx.fillRect(5,-2,12,1);}
   ctx.restore();
  }
 }
 if(tr.review?.npc===false)return;
 if(camX<6240&&camX+W>5900){
  const chair=ASSETS.nr_office_chair;
  const chairT=G.boss?.def?.set==='nr_conductor'?(G.boss.introT||0):G.stage.waves.find(w=>w.miniboss==='conductor')?.done?100:0;
  const chairPush=4*clamp((chairT-60)/40,0,1);
  if(chair&&!tr.officeDeskBroken)ctx.drawImage(chair,6065-camX-24+chairPush,94,48,76);
  if(G.boss?.key==='conductor'&&!G.boss.removeMe)G.boss.delhi?.wall?.(ctx,G.boss,camX);
  else drawOfficeChain(ctx,camX);
  if(!G.boss&&!G.stage.waves.find(w=>w.miniboss==='conductor')?.done&&tr.review?.conductorActor!==false){
   // Counts and fans the takings until CHAD walks in.
   const im=ASSETS.nr_conductor_intro,pose=[0,8,0,9][Math.floor(G.time/50)%4];if(im){ctx.save();ctx.translate(6065-camX,170);ctx.scale(-1,1);ctx.drawImage(im,pose*320,0,320,240,-80,-116.5,160,120);ctx.restore();}
  }
  drawConductorDesk(ctx,camX);
 }
 // Actor sheets are seated/wiping performances, grounded behind the combat plane.
 for(const [x,row,feet]of [[3170,0,189],[4235,1,191]]){
  const y=feet+3;  // cell floor sits 3px below the soles
  if(x<camX-80||x>camX+W+80)continue;
  const clock=(tr.t+row*91)%360,restPose=clock<220?0:clock<260?1:clock<310?2:3;
  const reaction=tr.passengerReactions?.[row]?.t??-1;
  const reacting=reaction>=0,pose=reacting?(reaction<18?0:reaction<60?1:reaction<92?2:reaction<132?3:0):restPose;
  seatShadow(ctx,x-camX,feet);ctx.save();
  // Graded idle loop (frames 0-7) with the reaction poses after it (8-11): seated_life / sari_life.
  const life=row?'sari_life':'seated_life';
  if(ASSETS['nr_'+life]){const f=reacting?8+(row===0?pose:reaction<18?1:reaction<112?2:3):seatIdleFrame(row?'sari':'seated',tr.t+row*91);sprite(ctx,life,f,x-camX,y,row?93:81,row?106:81,row?186:162,row?212:162);}
  else if(row===0){if(!reacting||!sprite(ctx,'passenger_reaction',pose,x-camX,y,81,81,162,162))sprite(ctx,'passenger_seated',restPose,x-camX,y,81,81,162,162);}
  else sprite(ctx,'passengers',row*4+(reacting?(reaction<18?1:reaction<112?2:3):pose),x-camX,y,93,106,186,212);ctx.restore();
 }
 if(camX<550){
  const t=G.state==='intro'?G.rawTime-G.stateT:tr.t;
  sprite(ctx,'station_tea',teaPose(t),425-camX,218,92,92,184,184);
  if(tr.review?.fx!==false){
   // Soft steam wisps curling off the brass urn.
   ctx.save();
   for(let i=0;i<5;i++){
    const age=(t*.3+i*9)%45,k=age/45,r=2+k*7,x=446-camX+Math.sin(age*.12+i*1.7)*(1+k*5),y=160-age*.9;
    const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(232,220,198,${.24*Math.sin(Math.PI*k)})`);g.addColorStop(1,'rgba(232,220,198,0)');
    ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
   }
   ctx.fillStyle='#eac778';ctx.globalAlpha=.5;
   for(const [x,y]of [[178,128],[361,128],[392,159]])for(let i=0;i<3;i++)ctx.fillRect(Math.round(x-camX+Math.sin(t*.023+i*2)*7),Math.round(y+Math.cos(t*.031+i)*5),1,1);
   ctx.restore();
  }
 }
 if(camX<400){
  drawTicketClerk(ctx,G.state==='intro'?G.rawTime-G.stateT:480+tr.t,camX);
  if(G.state!=='intro')drawTicketScanner(ctx,480,camX);
 }

}
export function drawTrainOverlay(ctx,camX){
 const tr=G.train;if(!tr)return;const c=tr.cinematic;
 if(c){drawCinematic(ctx,tr,c);drawBossEntry(ctx,c);return;}
 if(tr.review?.fx!==false&&tr.review?.interior!==false)drawStationForeground(ctx,tr,camX);
 if(!tr.aboard&&tr.arrival>=240&&!G.locked){
  drawDirectionArrow(ctx,{x:PLATFORM_DOOR_X-camX,y:96,direction:'down',size:24,time:tr.t});
  if(Math.abs(G.player.x-2715)<55){const s='F / LB: CLIMB ABOARD';ctx.fillStyle='#090810dc';ctx.fillRect(163,247,154,15);drawTextShadow(ctx,s,(W-textWidth(s,1))/2,252,'#ffdd94',1);}
 }
 if(['conductor','neta'].includes(G.boss?.key)&&!G.boss.removeMe)G.boss.delhi?.overlay?.(ctx,G.boss,camX);
}
// The sleeper enters at speed and brakes steadily to rest at the platform door.
export function platformTrainPosition(t){const q=1-clamp(t/240,0,1);return 1925+1600*q*q;}
const PLATFORM_DOOR_X=2707,PLATFORM_LIP_Y=153;
// Bogie centres along each coach, measured on the 880-pixel exterior plate; the
// locomotive trucks sit under its 505-pixel body. Wheels are hidden by the platform
// lip, so shoe sparks spray over its edge.
const PLATFORM_BOGIES=[-392,-128,159,718,1029,1588];
function drawBrakeSparks(ctx,tr,trainX){
 const t=tr.arrival,power=clamp((t-84)/40,0,1)*clamp((238-t)/14,0,1);
 if(tr.review?.fx===false)return;
 drawWheelSparks(ctx,PLATFORM_BOGIES.map(o=>Math.round(trainX+o)).filter(x=>x>-30&&x<W+30),PLATFORM_LIP_Y,t,power,2*(1-t/240));
}
// Cut-out fronts over anything on the tracks: the hall join's own over its span (it is drawn over
// the platform plate there), the platform's beyond it, so the fronts match the plates exactly.
function drawPlatformFront(ctx,camX){
 if(!ASSETS.nr_join_hall_platform_front){image(ctx,'platform_front',1920-camX,0,960,270);return;}
 image(ctx,'join_hall_platform_front',1680-camX,0,480,270);
 ctx.save();ctx.beginPath();ctx.rect(2160-camX,0,720,H);ctx.clip();image(ctx,'platform_front',1920-camX,0,960,270);ctx.restore();
}
function drawPlatformTrain(ctx,camX){
 const tr=G.train;if(tr.arrival<0)return;
 const x=platformTrainPosition(tr.arrival)-camX;
 ctx.save();ctx.beginPath();ctx.rect(1920-camX,0,960,H);ctx.clip();
 const sheet=ASSETS.nr_train_exterior;
 if(sheet){ctx.save();ctx.filter='brightness(0.78)';ctx.drawImage(sheet,0,tr.arrival>=240?224:0,1024,224,x,0,880,192.5);ctx.drawImage(sheet,0,0,1024,224,x+870,0,880,192.5);ctx.restore();}
 image(ctx,'locomotive',x-500,43,505,142);
 drawPlatformFront(ctx,camX);
 drawBrakeSparks(ctx,tr,x);
 if(tr.arrival>=240){
  // The coach's steel ladder hangs from the door sill to the platform lane.
  const stepX=2703-camX,ladder=ASSETS.nr_platform_ladder;
  if(ladder)ctx.drawImage(ladder,Math.round(stepX-13.5),149,27,66);
  else{ctx.fillStyle='#171c21';ctx.fillRect(stepX-13,165,3,50);ctx.fillRect(stepX+10,165,3,50);
   for(const y of [177,193,209]){ctx.fillStyle='#11151b';ctx.fillRect(stepX-14,y,28,5);ctx.fillStyle='#62543d';ctx.fillRect(stepX-14,y,28,1);}}
 }
 ctx.restore();
}
function drawPlatformBoarding(ctx,tr,c){
 const t=c.t,cam=c.fromCam;
 drawTrainScene(ctx,cam);
 const q=ease(t/84),x=c.fromX+(2703-c.fromX)*ease(t/24);
 const y=c.fromY+(171-c.fromY)*q;
 const frame=t<18?0:t<36?1:t<54?2:t<72?3:t<90?4:5;
 if(t<108){ctx.save();if(t>=84){ctx.beginPath();ctx.rect(2693-cam,38,44,140);ctx.clip();}sprite(ctx,'chad_board',frame,x-cam,y,112,120,224,240);ctx.restore();}
 const sheet=ASSETS.nr_train_exterior;
 if(sheet&&t>=96){ctx.save();ctx.filter='brightness(0.78)';const q=ease((t-96)/18),width=47*q;ctx.drawImage(sheet,939-width,54,width,131,1925-cam+(939-width)*880/1024,54*880/1024,width*880/1024,131*880/1024);ctx.restore();}
 if(t>112){ctx.fillStyle=`rgba(0,0,0,${(t-112)/8})`;ctx.fillRect(0,0,W,H);}
}
function drawCinematic(ctx,tr,c){
 const t=c.t;
 if(c.kind==='boarding'){drawPlatformBoarding(ctx,tr,c);return;}
 ctx.fillStyle='#101521';ctx.fillRect(0,0,W,H);
 if(c.kind==='inspector-finish'){
  const cam=c.fromCam;drawOutside(ctx,cam);image(ctx,'office',5760-cam,0,480,270);drawConductorDesk(ctx,cam);drawRetainedProps(ctx,c,cam);drawInspectorFinish(ctx,c);
 }else if(c.kind==='knockout'){
  const cam=c.fromCam;drawOutside(ctx,cam);image(ctx,'roof',ROOF_X-cam,0,960,270);drawRetainedProps(ctx,c,cam);drawNetaKnockout(ctx,c);
 }else if(c.kind==='shera-finish'){
  if(t<SHERA_FINISH_CUT){
   drawOutside(ctx,7680);image(ctx,'private_damaged',-480,0,960,270);drawRetainedProps(ctx,{...c,fightProps:sheraFinishProps(c)},7680);
   const ceiling=()=>{ctx.save();ctx.beginPath();ctx.rect(0,0,W,52);ctx.clip();image(ctx,'private_damaged',-480,0,960,270);ctx.restore();};
   drawSheraFinish(ctx,c,sprite,ceiling);
   if(t>=SHERA_FINISH_CUT-12){ctx.fillStyle=`rgba(5,5,10,${(t-SHERA_FINISH_CUT+12)/12})`;ctx.fillRect(0,0,W,H);}
  }else{
   // Roof shot: CHAD hauls himself out of the hatch (Netaji already fled up here mid-fight).
   const rt=t-SHERA_FINISH_CUT;drawOutside(ctx,ROOF_X);image(ctx,'roof',0,0,960,270);image(ctx,'hatch_open',65,191,80,27);
   const pose=rt<14?4:rt<28?5:rt<46?6:7;
   const handY=[65.7,101.5,108.2][Math.min(2,pose-4)],footY=pose<6?211+116.5-handY:218;
   // While he is still in the hole (poses 4-5) everything below the hatch's front lip is inside the carriage.
   if(pose<6){ctx.save();ctx.beginPath();ctx.rect(0,0,W,213);ctx.clip();}
   sprite(ctx,'chad_roof_climb',pose,105,footY,160,120,320,240);if(pose<6)ctx.restore();image(ctx,'hatch_open',65,191,80,27);
   if(rt<12){ctx.fillStyle=`rgba(5,5,10,${1-rt/12})`;ctx.fillRect(0,0,W,H);}
  }
 }else{
  drawFinale(ctx,t);

 }
 if(c.kind!=='escape'){ctx.fillStyle='#050409';ctx.fillRect(0,0,W,16);ctx.fillRect(0,254,W,16);}
}

export function stageTrainFinish(c){
 const roof=c.kind==='shera-finish';const cam=roof?7680:c.kind==='inspector-finish'?5760:c.fromCam;
 const bx=roof?7880:c.kind==='inspector-finish'?5970:Math.max(cam+150,Math.min(cam+350,c.fromBossX??cam+240));
 Object.assign(c,{fromCam:cam,fromX:bx-(c.kind==='inspector-finish'?50:38),fromY:218,fromBossX:bx,fromBossY:218});
 G.camX=cam;G.player.x=c.fromX;G.player.y=218;G.player.face=1;
}
export function seekTrainFinish(t){const c=G.train?.cinematic;if(c?.entry){seekBossEntry(c,t,()=>stageTrainFinish(c));G.train.officeDeskBroken=c.deskBroken||(c.kind==='inspector-finish'&&c.t>=198);}}
