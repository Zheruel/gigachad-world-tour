// Dredger equipment and frightened operator: deterministic encounter-owned clocks.
import {G,clamp,laneMin} from './engine.js';
import {ASSETS} from './assets.js';
import {createProp} from './props.js';
import {spawnEnemy} from './enemies.js';
import {spawnShot} from './shots.js';
import {spawnDust} from './effects.js';
import {tryHitPlayer} from './bosslib.js';
import {drawDialogue,updateDialogue} from './room_dialogue.js';
import {getFrame,blit,frameW,frameH,SPR} from './sprites.js';
export const OPERATOR_HEALTH=360;
const recover=(b,n=54)=>{b.state='recover';b.t=0;b.recovery=n;b.atkCd=28;};
const begin=(b,pattern)=>{b.pattern=pattern;b.lastPattern=pattern;b.state='windup';b.t=0;b.attackLane=b.y;b.attackFace=b.face;b.hitLanded=false;};
export function dredgerLine(b,text){b.dialogue={text,t:0};}
export function initDredgerEquipment(b){
 b.crewSpawned=0;b.crewActors=[];b.machineTurn=0;b.restarts=0;b.coverUsed=new Set();b.operatorCall=false;b.pumpGone=false;b.machineClock=0;
 b.fightProps=[b.winch];b.winch.role='winch';
 for(const [role,kind,x,hp]of [['pump','ic_boiler',210,54],['cab','ic_cargo',352,64],['cover','ic_cargo',110,24],['cover','ic_cargo',390,24]]){
  const p=createProp(kind,G.camLock+x,Math.max(218,laneMin(G.camLock+x)+3));p.role=role;p.indiaBossProp=true;p.hp=p.maxhp=hp;
  if(role==='cab'){p.hidden=true;p.w=36;p.h=85;b.cab=p;}
  if(role==='pump')b.pump=p;
  p.onBreak=()=>{if(b.dead)return;if(role==='pump'){b.pumpGone=true;if(b.phase==='machine'){b.componentApplying=true;b.hurt(90,1,true,false);b.componentApplying=false;}}
   if(role==='cab'){b.glass=0;if(b.phase==='machine'){b.componentApplying=true;b.hurt(110,1,true,false);b.componentApplying=false;}}
   if(role==='cover'&&b.phase==='operator'&&b.coverTarget===p){b.breakGuard();b.coverTarget=null;}
  };
  b.fightProps.push(p);G.props.push(p);
 }
 b.covers=b.fightProps.filter(p=>p.role==='cover');
}
export function spawnDredgerCrew(b,count=2){
 b.crewActors=b.crewActors.filter(e=>!e.dead&&!e.removeMe&&G.enemies.includes(e));
 const n=Math.min(count,2-b.crewActors.length,6-b.crewSpawned);
 for(let i=0;i<n;i++){const x=G.camLock+(b.crewSpawned%2?430:50);const e=spawnEnemy('ic_docker',x,laneMin(x)+16);if(e){e.dredgerCrew=true;e.scrapClock=180+i*70;b.crewActors.push(e);b.crewSpawned++;}}
 b.crewCd=720;
}
export function updateDredgerLife(b){
 b.machineClock++;if(b.dialogue){b.dialogue.t++;updateDialogue(b.dialogue.text,b.dialogue.t,{remaining:180-b.dialogue.t});if(b.dialogue.t>=180)b.dialogue=null;}
 b.crewActors=b.crewActors.filter(e=>!e.dead&&!e.removeMe&&G.enemies.includes(e));
 const danger=['sweepaim','sweep','dropaim','bucketfall','hose'].includes(b.state)||b.state==='windup'&&b.phase==='machine';
 for(const e of b.crewActors){
  if(danger){if(['windup','attack','pthrow'].includes(e.state)){e.state='idle';e.t=0;}e.atkCd=Math.max(e.atkCd,30);e.scrapTell=0;continue;}
  if(e.superLocked||e.protectedStagger||!['idle','approach'].includes(e.state)){if(e.scrapTell){e.scrapTell=0;e.scrapClock=90;}continue;}
  if(b.phase==='machine'&&--e.scrapClock<=0){e.scrapTell=(e.scrapTell||0)+1;e.atkCd=Math.max(e.atkCd,45);e.vx=0;
   if(e.scrapTell>=40){spawnShot('wrench',e.x,e.y,Math.sign(G.player.x-e.x)*3.3,10,{source:b,parryClass:'reflect'});G.audio.sfx('weapon');e.scrapClock=300;e.scrapTell=0;}
  }
 }
}
export function operatorUpdate(b){
 const p=G.player;
 switch(b.state){
 case 'openter':
  b.z=Math.max(0,78*(1-b.t/90));b.x=G.camLock+365;b.face=1;
  if(b.t===20)dredgerLine(b,'I ONLY DRIVE IT!');
  if(b.t>=90){b.z=0;b.state='idle';b.t=0;b.atkCd=40;}return true;
 case 'idle':{
  const dx=p.x-b.x;b.face=dx<0?-1:1;b.y+=clamp(p.y-b.y,-.55,.55);
  if(Math.abs(dx)>56)b.x+=Math.sign(dx)*.65;
  if(--b.atkCd>0)return true;
  let next=Math.abs(dx)>90?'toolthrow':'wrench';
  const cover=b.covers.filter(q=>!q.broken&&!b.coverUsed.has(q)&&Math.abs(q.x-b.x)<140).sort((a,c)=>Math.abs(a.x-b.x)-Math.abs(c.x-b.x))[0];
  if(b.restarts<2&&b.hp<b.maxhp*(b.restarts===0?.8:.45)&&b.lastPattern!=='restart')next='restart';
  else if(b.hp<b.maxhp*.8&&cover&&b.lastPattern!=='cover'){b.coverTarget=cover;b.coverUsed.add(cover);next='cover';}
  else if(!b.operatorCall&&b.hp<b.maxhp*.55&&b.crewActors.length<2&&b.crewSpawned<6)next='call';
  if(next===b.lastPattern)next=next==='wrench'?'toolthrow':'wrench';
  b.operatorTurn++;b.lastPattern=next;
  if(next==='cover'||next==='restart'){b.state=next==='cover'?'opretreat':'oprestartwalk';if(next==='restart')b.restarts++;b.t=0;}
  else begin(b,next);return true;
 }
 case 'opretreat':case 'oprestartwalk':{
  const cover=b.state==='opretreat';const x=cover?b.coverTarget?.x:b.pump.x+30;
  if(x===undefined||cover&&b.coverTarget.broken){recover(b);return true;}
  const delta=x-b.x;b.face=delta<0?-1:1;b.x+=clamp(delta,-1.7,1.7);
  if(Math.abs(delta)<3){if(cover){b.state='cower';b.t=0;dredgerLine(b,'PLEASE!');}else{b.face=-1;begin(b,'restart');}}return true;
 }
 case 'cower':
  if(!b.coverTarget||b.coverTarget.broken){b.breakGuard();return true;}
  if(b.t===40)spawnShot('wrench',b.x,b.y,Math.sign(p.x-b.x)*3,9,{source:b,parryClass:'reflect'});
  if(b.t>=90)recover(b,42);return true;
 case 'windup':
  if(b.t>=(b.pattern==='restart'?84:b.pattern==='call'?60:b.pattern==='toolthrow'?38:32)){b.state=b.pattern;b.t=0;b.face=b.attackFace;}return true;
 case 'wrench':
  if(b.t<8)b.x+=b.attackFace*.55;
  if(b.t===10||b.t===30)tryHitPlayer(b,9,48,true,16,'counter');
  if(b.t>=48)recover(b,66);return true;
 case 'toolthrow':
  if(b.t===12){spawnShot('wrench',b.x+b.attackFace*20,b.y,b.attackFace*3.6,10,{source:b,parryClass:'reflect'});G.audio.sfx('weapon');}
  if(b.t>=30)recover(b,52);return true;
 case 'restart':
  if(b.t===1){G.audio.sfx('whiff');b.residualLane=p.y;}
  if(b.t===38){tryHitPlayer({x:G.camLock+265,y:b.residualLane,face:p.x<G.camLock+265?-1:1,pattern:'steamjet'},8,150,false,12,'unblockable');spawnDust(G.camLock+265,b.residualLane,8);G.audio.roomSfx('train_brake',.16,.7);}
  if(b.t>=62)recover(b,80);return true;
 case 'call':
  if(b.t===1){b.operatorCall=true;spawnDredgerCrew(b,1);dredgerLine(b,'HELP ME!');G.audio.sfx('blip');}
  if(b.t>=24)recover(b,56);return true;
 case 'flinch':if(b.t>=12){b.state=b.resumeOperatorState||'idle';b.t=0;b.resumeOperatorState=null;}return true;
 case 'recover':if(b.t>=(b.recovery||54)){b.state='idle';b.t=0;b.atkCd=0;}return true;
 default:return false;
 }
}
export function operatorReaction(b){
 if(b.phase!=='operator')return false;
 if(['oprestartwalk','restart','call'].includes(b.state)||b.state==='windup'&&['restart','call'].includes(b.pattern)){b.protectedStagger=Math.max(b.protectedStagger,45);b.state='stagger';b.t=0;return true;}
 if(b.state==='openter')return true;
 if(['opretreat','flinch'].includes(b.state)){if(b.state!=='flinch'){b.resumeOperatorState=b.state;b.t=0;}b.state='flinch';return true;}
 if(b.state==='recover')return true;
 if(!b.protectedStagger&&!b.superLocked){recover(b,38);return true;}return false;
}
export function operatorFrame(b){
 if(b.state==='flinch')return ['hurt',0];
 if(b.state==='openter')return ['climbdown',Math.min(3,Math.floor(b.t/23))];
 if(['opretreat','oprestartwalk'].includes(b.state))return ['walk',Math.floor(b.stridePhase/5.4)%8];
 if(b.state==='cower')return ['cower',Math.floor(b.t/12)%3];
 if(b.state==='windup')return [b.pattern==='wrench'?'wrench':b.pattern,0];
 if(b.state==='wrench')return ['wrench',Math.min(5,Math.floor(b.t/8))];
 if(['toolthrow','restart','call'].includes(b.state))return [b.state,Math.min(2,1+Math.floor(b.t/22))];
 return null;
}
export function drawDredgerDetails(ctx,b,camX){
 if(b.dialogue)drawDialogue(ctx,{text:b.dialogue.text,x:b.x-camX,bottom:b.y-b.z-b.h-8,age:b.dialogue.t,remaining:180-b.dialogue.t});
 // The same latch is established during combat and released by CHAD later.
 const mechanisms=ASSETS.ic_delhi_mechanisms;
 if(mechanisms){const sw=mechanisms.width/4,sh=mechanisms.height/2;ctx.drawImage(mechanisms,2*sw,sh,sw,sh,G.camLock+239-camX,154,52,52);}
 if(b.phase==='machine'){
  const f=getFrame(SPR.thekedar,'seated',Math.floor(b.machineClock/36)%2,-1);
  ctx.save();ctx.beginPath();ctx.rect(G.camLock+326-camX,64,52,34);ctx.clip();
  blit(ctx,f,G.camLock+352-camX-frameW(f)/2,150-frameH(f));ctx.restore();
 }
 for(const e of b.crewActors)if(e.scrapTell){ctx.fillStyle='#e4b960';ctx.fillRect(e.x-camX-5,e.y-90,10,2);}
 if(b.state==='restart'&&b.t<38){ctx.fillStyle='rgba(232,150,65,.35)';ctx.fillRect(G.camLock+115-camX,b.residualLane-6,300,12);}
}
