// Vikram owns his patterns; the shared boss machine handles knockdowns and grabs.
import {G,clamp,diff} from './engine.js';
import {SPR,getFrame,frameW,frameH} from './sprites.js';
import {spawnPop,spawnDust} from './effects.js';
import {grabPlayer} from './player.js';
import {spawnShot} from './shots.js';
import {spawnEnemy} from './enemies.js';
import {tryHitPlayer,blitTelegraph,drawCueMarker} from './bosslib.js';
import {startTrainCinematic,drawConductorDesk} from './train.js';
import {ASSETS} from './assets.js';
import {updateDialogue} from './room_dialogue.js';
const aliveSupport=()=>G.enemies.some(e=>!e.dead&&!e.noCount);
const guarded=(b,dir,heavy,launch)=>b.guard>0&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying&&!heavy&&!launch&&dir===-b.face&&['idle','windup','cane','charge','reach','punch'].includes(b.state);
function propCrash(b){const prop=b.fightProps?.find(q=>!q.broken&&Math.abs(q.x-b.x)<28&&Math.abs(q.y-b.y)<26);if(!prop)return false;prop.broken=true;b.breakGuard();spawnDust(prop.x,prop.y,12);G.audio.sfx('slam');return true;}
function strikeFurniture(b){for(const q of G.props||[])if(!q.broken&&Math.abs(q.x-(b.x+b.face*38))<40&&Math.abs(q.y-b.y)<24)q.hurt?.(12,b.face,true,false);}
function drawFightProps(ctx,b,camX){for(const [i,q]of (b.fightProps||[]).entries()){if(q.roof){const im=ASSETS.nr_roof_fittings;if(im)ctx.drawImage(im,((i%2)*2+(q.broken?1:0))*128,0,128,96,q.x-camX-32,q.y-47.5,64,48);}else{const im=ASSETS[q.broken?'prop_nr_case_b':'prop_nr_case'];if(im){const w=42,h=w*im.height/im.width;ctx.drawImage(im,q.x-camX-w/2,q.y-h,w,h);}}}}

const finish=b=>{b.state='recover';b.t=0;b.comboHits=0;b.atkCd=b.roof?44:68;};
const vikram={
 noRage:true,
 init(b){b.guard=b.maxGuard=3;b.comboHits=0;b.guardFlash=0;b.fightProps=[{x:7780,y:222},{x:8000,y:225}];b.roof=false;b.turn=0;b.support=0;b.mashNeed=7;b.slamDmg=16;},
 intro(b,t){
  b.x=G.camLock+440-Math.min(60,t)*(76/60);b.y=218;b.face=-1;
  if(t===180){G.audio.sfx('land');G.shake=2;}
  if(t===240)G.audio.sfx('whiff');
  if(t>=194&&t<300)updateDialogue(b.def.taunt,t-194,{remaining:300-t});
 },
 keepFace(b){return ['windup','cane','pistol','charge','reach','sweep'].includes(b.state);},
 beforeHurt(b,dmg,dir,heavy,launch){
  b.preservePattern=b.guard>0&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying;
  b.guardingHit=dir===-b.face&&b.guard>0&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying&&['idle','windup','cane','charge','reach','punch'].includes(b.state);
  if(b.trainWaiting)return false;
  if(guarded(b,dir,heavy,launch)){b.guardFlash=8;G.audio.sfx('armor');G.hitstop=Math.max(G.hitstop,3);return false;}
  return true;
 },
 onHurt(b){
  if(!b.roof&&b.hp<=b.maxhp/2){b.hp=b.maxhp/2;b.roofPending=true;}
  return b.preservePattern;
 },
 update(b){
  if(b.guardFlash>0)b.guardFlash--;
  if(b.roofPending&&!b.protectedStagger&&!b.superLocked){b.roofPending=false;b.roof=true;b.enraged=true;b.set=SPR.nr_vikram_roof;b.fightProps=[{x:8835,y:218,roof:true},{x:9060,y:218,roof:true}];G.enemies=[];G.spawnQueue=[];G.player.grabbedBy=null;startTrainCinematic('roof');return true;}
  if(b.trainWaiting){
   if(!b.roofGuardsSpawned){b.roofGuardsSpawned=true;G.train.roofChase=true;G.locked=true;G.camX=G.camLock=8160;for(const [x,y]of [[8440,195],[8540,215],[8650,205]])spawnEnemy('nr_guard',x,y);}
   if(!G.enemies.some(e=>!e.dead&&!e.noCount)&&!G.spawnQueue.length){G.locked=false;if(G.player.x>=8895){b.trainWaiting=false;G.train.roofChase=false;G.locked=true;G.camX=G.camLock=8640;b.x=9010;b.atkCd=75;G.audio.sfx('enrage');}}
   return true;
  }
  const p=G.player,speed=(b.roof?1.2:.82)*diff().aggro;
  switch(b.state){
   case 'recover':if(b.t>(b.roof?38:48)){b.state='idle';b.t=0;}return true;
   case 'idle':{
    b.y+=clamp(p.y-b.y,-speed*.55,speed*.55);
    if(Math.abs(p.x-b.x)>54)b.x+=Math.sign(p.x-b.x)*speed;
    if(--b.atkCd<=0){
     const sequence=b.roof?['cane','charge','cane','sweep','cane','reach']:['cane','pistol','cane','reach','pistol'];
     b.pattern=sequence[b.turn++%sequence.length];if(['reach','sweep'].includes(b.pattern)&&(b.x<G.camX+24||b.x>G.camX+456||G.enemies.some(e=>!e.dead&&['windup','attack','drop'].includes(e.state))))b.pattern='cane';b.state='windup';b.t=0;b.hitLanded=false;
     if(!b.roof&&b.support<2&&b.turn%3===0&&!aliveSupport()){b.support++;spawnEnemy('nr_guard',G.camX+440,230);}
    }return true;
   }
   case 'windup':
    if(b.t===(b.pattern==='pistol'?48:34)){b.state=b.pattern;b.t=0;if(b.pattern!=='pistol')G.audio.sfx(b.pattern==='charge'?'dash':'whiff');}return true;
   case 'cane':
    if([8,26,...(b.roof?[44]:[])].includes(b.t)){strikeFurniture(b);tryHitPlayer(b,b.roof?12:10,76,true,b.roof?13:24,'counter');}
    if(b.t>(b.roof?66:48))finish(b);return true;
   case 'pistol':
    if(b.t===6||b.t===22){spawnShot('bullet',b.x+b.face*22,b.y,b.face*5.5,10,{source:b,parryClass:'reflect'});G.audio.sfx('pistol');}
    if(b.t>54)finish(b);return true;
   case 'charge':
    if(b.t<32){b.x+=b.face*3.6;if(propCrash(b))return true;if(!b.hitLanded&&tryHitPlayer(b,17,36,true,12,'counter'))b.hitLanded=true;}
    if(b.t>56)finish(b);return true;
   case 'sweep':
    if(b.t===14&&p.z<18)tryHitPlayer(b,17,90,true,14,'unblockable');
    if(b.t>58)finish(b);return true;
   case 'reach':
    if(b.t<12)b.x+=b.face*1.5;
    if(b.t===12&&Math.abs(p.x-b.x)<39&&Math.abs(p.y-b.y)<(b.roof?12:15)&&p.z<12&&!p.invuln){G.audio.sfx('grab');grabPlayer(p,b);b.state='grabhold';b.t=0;return true;}
    if(b.t>34)finish(b);return true;
  }
  return false;
 },
 onDeath(b){G.train.knockoutBody=true;startTrainCinematic('knockout');},
 draw(ctx,b,camX){
  drawFightProps(ctx,b,camX);
  if(G.state==='bossintro'&&!b.roof){
   const t=G.rawTime-G.stateT,im=ASSETS.nr_seth_intro;
   if(t>=60&&im){
    const pose=t<94?0:t<114?1:t<136?2:t<158?3:t<180?4:t<240?5:t<280?6:7;
    ctx.save();ctx.translate(Math.round(b.x-camX),Math.round(b.y+4));ctx.scale(-1,1);
    ctx.drawImage(im,pose*320,0,320,240,-80,-120,160,120);ctx.restore();return;
   }
   const f=getFrame(b.set,t<60?'walk':'idle',Math.floor(t*(76/60)/6),-1);
   blitTelegraph(ctx,b,f,Math.round(b.x-camX-frameW(f)/2),Math.round(b.y-frameH(f)+4),false);return;
  }
  const wind=b.state==='windup',attack=['cane','pistol','charge','reach','sweep','grabhold'].includes(b.state);
  let state=b.dead||b.state==='down'?'down':['hurt','stagger'].includes(b.state)?'hurt':wind||attack?'atk':b.moved>.1?'walk':'idle';
  let index=wind?0:attack?(b.t<10?1:2):Math.floor(G.time/9);
  if(state==='walk')index=Math.floor(b.stridePhase/6);
  if(b.state==='getup'){state='getup';index=Math.min(3,Math.floor(b.t/4));}
  if(!b.roof&&(b.state==='pistol'||(wind&&b.pattern==='pistol'))){state='pistol';index=wind?(b.t<18?0:b.t<32?1:2):(b.t===6||b.t===22?3:2);}
  else if(!b.roof&&(b.state==='reach'||b.state==='grabhold'||(wind&&b.pattern==='reach'))){state='grab';index=wind?0:b.state==='grabhold'?1:2;}
  if(b.roof&&(b.state==='sweep'||wind&&b.pattern==='sweep')){state='sweep';index=wind?0:b.t<24?1:2;}
  if(b.guardFlash>0){state='block';index=0;}
  const f=getFrame(b.set,state,index,b.face),x=Math.round(b.x-camX),y=Math.round(b.y-b.z);
  blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,wind);
  if(wind)drawCueMarker(ctx,b,x,y-b.h-10);
 }
};
const conductor={
 noRage:true,
 init(b){b.guard=b.maxGuard=3;b.shieldHp=3;b.shieldUsed=false;b.fightProps=[{x:5860,y:220},{x:6150,y:222}];b.turn=0;b.backup=0;b.comboHits=0;b.state='rise';b.x=6065;b.y=188;b.t=0;},
 intro(b,t){
  b.introT=t;b.face=-1;b.y=t<170?188:188+30*clamp((t-170)/40,0,1);
  b.x=t<120?6065:6065-130*clamp((t-120)/50,0,1);
  if([28,72,132,150,176,194].includes(t))G.audio.roomSfx?.(t===28?'room_page':t===72?'room_chair':'entrance_boot',.35);
  if(t>=210)updateDialogue('TICKET. CASH ONLY.',t-210,{remaining:300-t});
 },
 keepFace(b){return ['windup','punch','charge','whistle'].includes(b.state);},
 beforeHurt(b,dmg,dir,heavy,launch){
  b.preservePattern=b.guard>0&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying;
  b.guardingHit=dir===-b.face&&b.guard>0&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying&&['idle','windup','cane','charge','reach','punch'].includes(b.state);
  if(b.state==='rise')return false;
  if(b.shieldActive&&!b.protectedStagger&&!b.superApplying&&!b.parryApplying){if(heavy||launch){b.shieldHp--;if(b.shieldHp<=0){b.shieldActive=false;b.breakGuard();}}else{G.audio.sfx('armor');return false;}}
  if(guarded(b,dir,heavy,launch)){G.audio.sfx('armor');return false;}
  return true;
 },
 onHurt(b){
  if(b.state==='whistle'||b.state==='windup'&&b.pattern==='whistle'){b.protectedStagger=Math.max(b.protectedStagger,45);b.state='stagger';b.t=0;spawnPop(b.x,b.y-96,'INTERRUPTED');return true;}
  return b.preservePattern;
 },
 update(b){
  const p=G.player;
  switch(b.state){
   case 'rise':
    if(b.t>36){b.x=6065-130*Math.min(1,(b.t-36)/36);b.y=183+35*clamp((b.t-72)/18,0,1);}
    if(b.t>=90){b.state='idle';b.t=0;b.atkCd=45;}return true;
   case 'idle':
    if(!b.shieldUsed&&b.hp<b.maxhp*.65){b.shieldUsed=true;b.shieldActive=true;G.audio.sfx('armor');}
    b.y+=clamp(p.y-b.y,-.45,.45);
    if(Math.abs(p.x-b.x)>68)b.x+=Math.sign(p.x-b.x)*.8;
    if(--b.atkCd<=0){b.pattern=b.shieldActive?'charge':++b.turn%3===0&&b.backup<2&&!aliveSupport()?'whistle':b.turn%2===0?'charge':'punch';b.state='windup';b.t=0;}
    return true;
   case 'windup':if(b.t>=42){b.state=b.pattern;b.t=0;b.hitLanded=false;if(b.pattern!=='whistle')G.audio.sfx(b.pattern==='charge'?'dash':'whiff');}return true;
   case 'punch':
    if(b.t<14)b.x+=b.face*.9;
    if(b.t===14||b.t===32)tryHitPlayer(b,10,54,true,18,'counter');
    if(b.t>=50){b.state='recover';b.t=0;b.comboHits=0;}
    return true;
   case 'charge':
    if(b.t<30){b.x+=b.face*3.1;if(propCrash(b))return true;}
    if(b.t>3&&b.t<30&&!b.hitLanded&&tryHitPlayer(b,15,40,true,20,'counter'))b.hitLanded=true;
    if(b.t>=58){b.state='recover';b.t=0;b.comboHits=0;}
    return true;
   case 'whistle':
    if(b.t===1)G.audio.roomSfx?.('conductor_whistle',.7);
    if(b.t===1)spawnPop(b.x,b.y-96,'BACKUP!');
    if(b.t===54&&!aliveSupport()&&b.backup<2){spawnEnemy('nr_tough',G.camX+440,220);b.backup++;}
    if(b.t>=72){b.state='recover';b.t=0;}
    return true;
   case 'recover':if(b.t>=54){b.state='idle';b.atkCd=38;b.t=0;b.comboHits=0;}return true;
  }
  return false;
 },
 draw(ctx,b,camX){
  drawFightProps(ctx,b,camX);
  if(G.state==='bossintro'){
   const t=b.introT||0,show=G.train?.review?.conductorActor!==false;
   // The seated officer is on the rear floor plane. Keep his cash above the
   // desktop, then follow the diagonal aisle down to the combat floor.
   const drawY=b.y-18*(1-clamp((t-120)/50,0,1));
   if(show){
    if(t>=120&&t<210){const f=getFrame(b.set,'walk',Math.floor((6065-b.x+Math.max(0,b.y-188))/6),-1);blitTelegraph(ctx,b,f,Math.round(b.x-camX-frameW(f)/2),Math.round(drawY-frameH(f)+4),false);}
    else{const pose=t<26?0:t<60?1:t<85?2:t<108?3:t<210?4:t<248?5:t<278?6:7,im=ASSETS.nr_conductor_intro;
     if(im){const braceDrop=pose===3?12*(1-clamp((t-96)/12,0,1)):0;ctx.save();ctx.translate(Math.round(b.x-camX),drawY+braceDrop);ctx.scale(-1,1);ctx.drawImage(im,pose*320,0,320,240,-80,-116.5,160,120);ctx.restore();}
     else{const f=getFrame(b.set,'idle',0,-1);blitTelegraph(ctx,b,f,b.x-camX-frameW(f)/2,drawY-frameH(f)+4,false);}
    }
   }
   if(b.y<204)drawConductorDesk(ctx,camX);
   return;
  }
  const wind=b.state==='windup',attack=b.state==='punch';
  let state=b.dead||b.state==='down'?'down':['hurt','stagger'].includes(b.state)?'hurt':b.state==='getup'?'getup':b.state==='rise'?(b.t>36?'walk':'rise'):b.state==='whistle'||wind&&b.pattern==='whistle'?'whistle':b.state==='charge'||wind&&b.pattern==='charge'?'charge':wind||attack?'atk':b.state==='recover'?'idle':b.moved>.1?'walk':'idle';
  let index=state==='getup'?Math.min(3,Math.floor(b.t/4)):state==='walk'?Math.floor(b.stridePhase/6):b.state==='rise'?Math.min(2,Math.floor(b.t/14)):wind?0:attack?(b.t<16?1:2):b.state==='charge'?1:Math.floor(G.time/9);
  if(b.shieldActive&&!b.dead){state='shield';index=b.protectedStagger||b.guardFlash>0?2:wind?0:1;}
  const f=getFrame(b.set,state,index,b.face);
  const x=Math.round(b.x-camX),y=Math.round(b.y-b.z);
  ctx.save();

  blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,wind);ctx.restore();

  if(wind)drawCueMarker(ctx,b,x,y-b.h-10);
 }
};
export function initTrainBoss(b){const own=b.key==='vikram'?vikram:b.key==='conductor'?conductor:null;if(own){b.delhi=own;own.init(b);}}
