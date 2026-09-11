import {snapshotGrade,restoreGrade} from './grading.js';
import {beginBossEntry,updateBossEntry,drawBossEntry,seekBossEntry} from './boss_cinematic_entry.js';
// Fresh Night Train route. Simulation owns every timer; rendering never mutates it.
import {G,W,H,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {input} from './input.js';
import {drawTextShadow,textWidth,SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {createProp} from './props.js';
import {hurtPlayer} from './player.js';
import {drawFinale,updateFinale} from './train_finale.js';
import {drawTrainVista,updateTrainVista,resetTrainVista} from './train_vistas.js';
import {drawDirectionArrow} from './direction_arrow.js';
import {drawInspectorFinish,updateInspectorFinish,drawSethKnockout,drawSethInterior,updateSethRetreat,SETH_RETREAT_TICKS,drawRetainedProps,drawRetainedCases} from './train_finishers.js';
import {initTrainLife,updateTrainLife,drawTrainLife} from './train_life.js';
export const ABOARD_X=2880,ROOF_X=8160,BERTH_Z=115,ROOF_TRANSITION_TICKS=SETH_RETREAT_TICKS;
export const TRAIN_AREAS=[['yard',0,960],['hall',960,1920],['platform',1920,2880],['general',2880,3840],['sleeper',3840,5280],['pantry',5280,5760],['office',5760,6240],['ac',6240,7200],['private',7200,8160],['roof',8160,9120]];

export function trainArea(x){return TRAIN_AREAS.find(a=>x<a[2])||TRAIN_AREAS.at(-1);}
export function initTrain(){G.train={t:0,motionT:0,distance:0,aboard:false,climbed:false,cinematic:null,endingDone:false,checkpoint:0,checkpointScore:G.score,gradeCheckpoint:snapshotGrade(),gate:true,sway:0,steam:0,roofTell:0,scene:0,claimedLives:[],arrival:-1,vistaX:0,vistaTarget:0,passengerReactions:[{t:-1,ready:0},{t:-1,ready:0}]};initTrainLife(G.train);}
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
function position(x,y=218){Object.assign(G.player,{x,y,z:0,vz:0,vx:0,state:'idle',t:0,face:1,grabbedBy:null,invuln:90,guardWindow:0,counterT:0,attackFamilies:[],grabTarget:null,specialTarget:null,superT:0});}
function clearArena(){G.enemies=[];G.shots=[];G.zones=[];G.spawnQueue=[];G.waveActive=false;G.locked=false;G.arenaSqueeze=G.arenaSqueezeTarget=0;}
export function restoreTrainCheckpoint(){
 if(!G.train)return;const tr=G.train,x=tr.checkpoint;restoreGrade(tr.gradeCheckpoint);clearArena();G.boss=null;tr.cinematic=null;tr.endingDone=false;tr.climbed=false;tr.knockoutBody=false;tr.sethJacketDropped=false;tr.inspectorBody=null;tr.officeDeskBroken=false;tr.passengerReactions=[{t:-1,ready:0},{t:-1,ready:0}];tr.retryBoss=x>=7950;tr.aboard=x>=ABOARD_X;tr.gate=true;
 initTrainLife(tr);
 G.camX=G.camLock=x>=7950?7680:x;position(x>=7950?7950:x+60);G.player.hp=G.player.maxhp;G.player.dying=false;G.score=tr.checkpointScore;
 for(const w of G.stage.waves)w.done=w.x<x;
 G.waveIndex=G.stage.waves.findLastIndex(w=>w.x<x);
 G.props=G.stage.props.map(d=>createProp(d.kind,d.x,d.y,d.z));
 for(const pr of G.props)if(pr.x<x||tr.claimedLives.includes(pr.x)){pr.broken=true;pr.hp=0;}
 G.pickups=[];G.effects=[];G.combo=0;G.comboT=0;G.meter=0;tr.scene=x>=7200?2:x>=4320?1:0;
 tr.vistaX=tr.vistaTarget=vistaTargetFor(x);tr.motionT=tr.vistaX/.12;resetTrainVista(tr,x);
 G.audio.music(x>=ABOARD_X?G.stage.musicB:G.stage.music);

}
export function vistaTargetFor(x){return clamp((x-ABOARD_X)/(ROOF_X-ABOARD_X)*2400,0,2400);}
function checkpoint(x){if(G.train.checkpoint<x){G.train.checkpoint=x;G.train.checkpointScore=G.score;G.train.gradeCheckpoint=snapshotGrade();}}
export function startTrainCinematic(kind){if(G.train.cinematic)return;if(kind==='escape'){G.audio.stopSamples?.();G.audio.stopRoomAudio?.();}G.train.cinematic={kind,t:0,fromX:G.player.x,fromY:G.player.y,fromCam:G.camX,fromBossX:G.boss?.x,fromBossY:G.boss?.y,deskBroken:!!G.train.officeDeskBroken,fightProps:(G.boss?.fightProps||[]).map(p=>({...p}))};G.player.grabbedBy=null;G.player.z=0;G.shots=[];G.zones=[];if(['inspector-finish','knockout','roof'].includes(kind))beginBossEntry(G.train.cinematic,kind==='inspector-finish'?48:kind==='knockout'?20:0);if(!['escape','inspector-finish','knockout','roof'].includes(kind))G.audio.sfx(kind==='boarding'?'go':'heavy');}
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
 const tr=G.train;if(!tr)return false;tr.t++;updatePassengerReactions(tr);updateTrainLife(tr);
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
   if(updateInspectorFinish(c)){tr.cinematic=null;if(G.boss){G.boss.removeMe=true;G.boss.t=90;}G.player.state='idle';G.player.invuln=45;G.player.x=c.endX||G.player.x;G.player.y=c.endY||G.player.y;}
  }else if(c.kind==='roof'){
   updateSethRetreat(c);
   if(c.t>=ROOF_TRANSITION_TICKS){tr.cinematic=null;tr.climbed=true;G.camX=G.camLock=ROOF_X;position(ROOF_X+105);G.locked=true;if(G.boss){Object.assign(G.boss,{x:ROOF_X+850,y:218,z:0,state:'idle',t:0,atkCd:90,trainWaiting:true,roofGuardsSpawned:false});}}
  }else if(c.kind==='knockout'){
   if([24,32,40,48,60,76].includes(c.t)){G.audio.sfx(c.t===76?'slam':'punch');G.shake=c.t===76?5:2;}
   if(c.t===111||c.t===129){G.audio.sfx('land');G.shake=c.t===111?3:1;}
   if(c.t===140)G.audio.voice('duke_game_over',1700,true);
   if(c.t>=216){tr.cinematic=null;startTrainCinematic('escape');}
  }else if(c.kind==='escape'){
   if(updateFinale(c)){tr.endingDone=true;position(ROOF_X+180);G.fade=0;G.shake=0;G.flash=0;if(G.boss)G.boss.t=71;}

  }
  return true;
 }
 if(!tr.aboard){
  const stationClear=G.waveIndex>=3&&!G.locked&&!G.waveActive&&!G.spawnQueue.length&&!G.enemies.some(e=>!e.dead&&!e.noCount);
  if(tr.arrival<0&&stationClear&&G.player.x>=2420){tr.arrival=0;tr.gate=true;G.audio.trainSfx?.('whistle');}
  else if(tr.arrival>=0&&tr.arrival<240){tr.arrival++;if(tr.arrival===225)G.audio.sfx('land');if(tr.arrival===240)tr.gate=true;}
  G.player.x=Math.min(G.player.x,2810);
  if(stationClear&&tr.arrival>=240&&Math.abs(G.player.x-2715)<55&&!tr.gate&&input.pressed('use')&&G.player.z===0){startTrainCinematic('boarding');return true;}
 }
 if(tr.aboard){

  tr.scene=Math.max(tr.scene,G.player.x>=7200?2:G.player.x>=4320?1:0);
  tr.sway=0;

  if(G.player.x>=6240&&!G.locked)checkpoint(6240);
  if(G.player.x>=7200&&!G.locked)checkpoint(7200);
  if(G.player.x>=8160&&!tr.climbed)G.player.x=8150;
  const pantry=G.player.x>=5280&&G.player.x<6240;
  tr.steam=pantry?tr.t%480:0;
  if(pantry&&tr.steam===390){
   G.audio.sfx('whiff');
   const inSteam=a=>[5490,5820].some(x=>Math.abs(a.x-x)<44)&&Math.abs(a.y-198)<15&&a.z<16;
   if(inSteam(G.player))hurtPlayer(G.player,8,1,false);
   for(const e of G.enemies)if(!e.dead&&inSteam(e))e.hurt(8,1,false,false);
  }
  tr.roofTell=tr.climbed?tr.t%660:0;
  if(tr.climbed&&tr.roofTell===600){G.audio.sfx('heavy');if(G.player.y<203&&G.player.z<12)hurtPlayer(G.player,10,-1,true);}
 }
 return false;
}
function image(ctx,key,x,y,w,h){const im=ASSETS['nr_'+key];if(im)ctx.drawImage(im,Math.round(x),Math.round(y),w,h);}
function sprite(ctx,key,frame,x,y,w,h,cw=256,ch=224){const im=ASSETS['nr_'+key];if(!im)return false;ctx.drawImage(im,frame*cw,0,cw,ch,Math.round(x-w/2),Math.round(y-h),w,h);return true;}
export function drawTrainHeroPose(ctx,frame,x,y){if(!sprite(ctx,'chad_cinema',frame,x,y,112,112,224,224)){const f=getFrame(SPR.player,'idle',0,1);blit(ctx,f,x-frameW(f)/2,y-frameH(f)+4);}}
export function drawTrainEntryPose(ctx,frame,x,y){if(!sprite(ctx,'chad_entry',frame,x,y,112,112,224,224))drawTrainHeroPose(ctx,0,x,y);}
export function drawTicketClerk(ctx,t,camX=0){
 const state=t<55?0:t<112?1:t<206?2:3;
 ctx.save();ctx.beginPath();ctx.rect(49-camX,126,91,38);ctx.clip();
 sprite(ctx,'ticket_clerk',state,96-camX,168,80,56,160,112);ctx.restore();
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
  const artKey=key==='private'&&G.boss?.key==='vikram'&&G.boss.hp<G.boss.maxhp*.8&&ASSETS.nr_private_damaged?'private_damaged':key;
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
 if(camX+W>1920&&camX<2880&&G.train?.review?.interior!==false)drawPlatformTrain(ctx,camX);
 drawTrainWallPlane(ctx,camX);
}
export function drawConductorDesk(ctx,camX){
 if(G.train?.review?.conductorDesk===false)return;
 const desk=G.train?.officeDeskBroken?(ASSETS.nr_office_desk_broken||ASSETS.nr_office_desk):ASSETS.nr_office_desk;if(desk)ctx.drawImage(desk,5985-camX,116,155,78);
 if(!G.boss||G.boss.removeMe)drawRetainedCases(ctx,G.train?.officeFightProps,camX);
 const body=G.train?.inspectorBody;if(body){const f=getFrame(SPR.nr_conductor,'down',0,-1);blit(ctx,f,body.x-camX-frameW(f)/2,body.y-frameH(f)+4);}
}
export function drawTrainWallPlane(ctx,camX){
 const tr=G.train;if(!tr)return;
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
  if(chair)ctx.drawImage(chair,6065-camX-24+chairPush,94,48,76);
  if(!G.boss&&!G.stage.waves.find(w=>w.miniboss==='conductor')?.done&&tr.review?.conductorActor!==false){
   const im=ASSETS.nr_conductor_intro;if(im){ctx.save();ctx.translate(6065-camX,170);ctx.scale(-1,1);ctx.drawImage(im,0,0,320,240,-80,-116.5,160,120);ctx.restore();}
  }
  drawConductorDesk(ctx,camX);
 }
 // Actor sheets are seated/wiping performances, grounded behind the combat plane.
 for(const [x,row,y]of [[3170,0,201],[4235,1,190]]){
  if(x<camX-80||x>camX+W+80)continue;
  const clock=(tr.t+row*91)%360,restPose=clock<220?0:clock<260?1:clock<310?2:3;
  const reaction=tr.passengerReactions?.[row]?.t??-1;
  const reacting=reaction>=0,pose=reacting?(reaction<18?0:reaction<60?1:reaction<92?2:reaction<132?3:0):restPose;
  ctx.save();
  if(row===0){if(!reacting||!sprite(ctx,'passenger_reaction',pose,x-camX,y,92,92,224,224))sprite(ctx,'passenger_seated',restPose,x-camX,y,92,92,224,224);}
  else sprite(ctx,'passengers',row*4+(reacting?(reaction<18?1:reaction<112?2:3):pose),x-camX,y,78,91,224,256);ctx.restore();
 }
 if(camX<550){
  const t=G.state==='intro'?G.rawTime-G.stateT:tr.t,cycle=t%720;
  const pose=cycle<260?0:cycle<420?1:cycle<510?2:3;
  sprite(ctx,'station_tea',pose,425-camX,218,92,92,256,256);
  if(tr.review?.fx!==false){
   ctx.save();ctx.fillStyle='#ceb795';
   for(let i=0;i<9;i++){const age=(t*.35+i*4)%32;ctx.globalAlpha=(1-age/32)*.22;ctx.fillRect(Math.round(416-camX+Math.sin(age*.16+i)*3),Math.round(168-age),2,3);}
   ctx.fillStyle='#eac778';ctx.globalAlpha=.5;
   for(const [x,y]of [[178,128],[361,128],[392,159]])for(let i=0;i<3;i++)ctx.fillRect(Math.round(x-camX+Math.sin(t*.023+i*2)*7),Math.round(y+Math.cos(t*.031+i)*5),1,1);
   ctx.restore();
  }
 }
 if(camX<400){
  drawTicketClerk(ctx,G.state==='intro'?G.rawTime-G.stateT:480,camX);
  if(G.state!=='intro')drawTicketScanner(ctx,480,camX);
 }

}
export function drawTrainOverlay(ctx,camX){
 const tr=G.train;if(!tr)return;const c=tr.cinematic;
 if(c){drawCinematic(ctx,tr,c);drawBossEntry(ctx,c);return;}
 if(!tr.aboard&&tr.arrival>=240&&!G.locked){
  drawDirectionArrow(ctx,{x:2715-camX,y:96,direction:'down',size:24,time:tr.t});
  if(Math.abs(G.player.x-2715)<55){const s='F / LB: CLIMB ABOARD';ctx.fillStyle='#090810dc';ctx.fillRect(163,247,154,15);drawTextShadow(ctx,s,(W-textWidth(s,1))/2,252,'#ffdd94',1);}
 }
 if(tr.review?.fx===false)return;
 if(tr.steam>330){
  for(const x of [5490,5820]){
   if(x<camX-50||x>camX+W+50)continue;
   ctx.fillStyle=tr.steam<390?'#d99f5277':'#eee5ce88';
   if(tr.steam<390)ctx.fillRect(x-camX-40,198,80,2);
   for(let i=0;i<20;i++){const rise=(tr.t*2+i*11)%65,spread=(tr.steam<390?10:36);ctx.fillRect(Math.round(x-camX+Math.sin(i*3.7)*spread*(rise/65)),198-rise,2+(i%3),4);}
  }
 }
 if(tr.roofTell>540&&tr.roofTell<600){drawTextShadow(ctx,'LOW GANTRY — KEEP FORWARD',130,34,'#efc376',1);}
 if(tr.roofTell>=596&&tr.roofTell<612){const x=W-(tr.roofTell-596)*42;ctx.fillStyle='#302725';ctx.fillRect(x,160,14,31);ctx.fillStyle='#c1a46d';ctx.fillRect(x,160,3,31);}
}
export function platformTrainPosition(t){return 1925+1600*(1-ease(t/240));}
function drawPlatformTrain(ctx,camX){
 const tr=G.train;if(tr.arrival<0)return;
 const x=platformTrainPosition(tr.arrival)-camX;
 ctx.save();ctx.beginPath();ctx.rect(1920-camX,0,960,H);ctx.clip();
 const sheet=ASSETS.nr_train_exterior;
 if(sheet){ctx.save();ctx.filter='brightness(0.78)';ctx.drawImage(sheet,0,tr.arrival>=240?224:0,1024,224,x,0,880,192.5);ctx.drawImage(sheet,0,0,1024,224,x+870,0,880,192.5);ctx.restore();}
 image(ctx,'locomotive',x-500,43,505,142);
 image(ctx,'platform_front',1920-camX,0,960,270);
 if(tr.arrival>=240){
  // Narrow steel boarding steps connect the platform lane to the raised threshold.
  const stepX=2703-camX;ctx.fillStyle='#171c21';ctx.fillRect(stepX-13,165,3,50);ctx.fillRect(stepX+10,165,3,50);
  for(const y of [177,193,209]){ctx.fillStyle='#11151b';ctx.fillRect(stepX-14,y,28,5);ctx.fillStyle='#62543d';ctx.fillRect(stepX-14,y,28,1);ctx.fillStyle='#30312d';ctx.fillRect(stepX-13,y+1,26,2);}
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
  const cam=c.fromCam;drawOutside(ctx,cam);image(ctx,'roof',ROOF_X-cam,0,960,270);drawRetainedProps(ctx,c,cam);drawSethKnockout(ctx,c);
 }else if(c.kind==='roof'){
  if(t<630){
   drawOutside(ctx,7680);image(ctx,'private_damaged',-480,0,960,270);drawRetainedProps(ctx,c,7680);
   const ceiling=()=>{ctx.save();ctx.beginPath();ctx.rect(0,0,W,52);ctx.clip();image(ctx,'private_damaged',-480,0,960,270);ctx.restore();};
   drawSethInterior(ctx,c,7680,sprite,ceiling);
   if(t>=618){ctx.fillStyle=`rgba(5,5,10,${(t-618)/12})`;ctx.fillRect(0,0,W,H);}
  }else{
   const rt=t-630;drawOutside(ctx,ROOF_X);image(ctx,'roof',0,0,960,270);image(ctx,'hatch_open',65,191,80,27);
   const f=getFrame(SPR.nr_vikram_roof,'walk',Math.floor(rt*1.8/6),1);blit(ctx,f,335+rt*1.8-frameW(f)/2,218-frameH(f)+4);
   const pose=rt<14?4:rt<28?5:rt<46?6:7;
   const handY=[65.2,101.5,108.2][Math.min(2,pose-4)],footY=pose<6?211+116.5-handY:218;
   sprite(ctx,'chad_roof_climb',pose,105,footY,160,120,320,240);image(ctx,'hatch_open',65,191,80,27);
   if(rt<12){ctx.fillStyle=`rgba(5,5,10,${1-rt/12})`;ctx.fillRect(0,0,W,H);}
  }
 }else{
  drawFinale(ctx,t);

 }
 if(c.kind!=='escape'){ctx.fillStyle='#050409';ctx.fillRect(0,0,W,16);ctx.fillRect(0,254,W,16);}
}

export function stageTrainFinish(c){
 const roof=c.kind==='roof';const cam=roof?7680:c.kind==='inspector-finish'?5760:c.fromCam;
 const bx=roof?7880:c.kind==='inspector-finish'?5970:Math.max(cam+150,Math.min(cam+350,c.fromBossX??cam+240));
 Object.assign(c,{fromCam:cam,fromX:bx-(roof?38:c.kind==='inspector-finish'?50:48),fromY:218,fromBossX:bx,fromBossY:218});
 G.camX=cam;G.player.x=c.fromX;G.player.y=218;G.player.face=1;
}
export function seekTrainFinish(t){const c=G.train?.cinematic;if(c?.entry){seekBossEntry(c,t,()=>stageTrainFinish(c));G.train.officeDeskBroken=c.deskBroken||(c.kind==='inspector-finish'&&c.t>=198);}}
