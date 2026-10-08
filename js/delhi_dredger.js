// THE DREDGER and THE THEKEDAR - the Delhi chapter's final boss.
//
// Machine phase: the clamshell grab is the boss's body; the Thekedar drives it from the cab.
//  pendulum swing (green)   - parry it: the grab flies back into the cab (RETURN TO SENDER),
//                             cracks the glass and lands dented on the deck for a beating
//  grab drop (red shadow)   - leave the shadow; it bites into the deck and sticks: beat it
//  deck scoop (red lane)    - jump it or leave the lane
//  sludge dump (red, late)  - blobs of river sludge that leave slowing puddles
//  crew wrenches (green)    - parry the thrown ones into the cab glass
// The glass takes six: a returned swing is two cracks, a returned wrench one. When it
// shatters the Thekedar jumps down to finish it himself.
// At MAGNET_LINE (or the glass gone) he cuts the grab loose and fights on with a scrap magnet (dredger_magnet.js).
// Thekedar phase: a scrawny operator with a wrench too heavy for him; the grab and the crew
// do his fighting, on his walkie-talkie.
//  wrench string (green)    - a slow, wobbling heave; parry the overhead and it jams in the deck
//  sand sack (green)        - parry it back: sand in his eyes
//  "BUCKET!" (red shadow)   - the grab hunts CHAD; stand next to him and step out late,
//                             and it lands on its own boss (SELF-DREDGED)
//  the ladder               - he scrambles for his cab; hit him before he is out of reach and
//                             he falls off it, else he drops the grab on CHAD from the cab
// A swing that misses in front of him makes him flinch with his guard down.
// At half health he swings down on the bucket's hook and fights with it on its chain (dredger_hook.js).
// He goes down only inside those openings (a heavy while STUCK, SELF-DREDGED or sand-blind);
// anywhere else a flurry earns one flinch, and a third hit in it has him backstep behind his guard.
import {G,W,H,clamp,diff,laneMin,FLOOR_BOT,inAir,fall} from './engine.js';
import { GREEN_WARNING_TICKS, greenCue } from './combat_readability.js';
import {SPR,getFrame,blit,frameW,frameH,drawTextShadow,textWidth} from './sprites.js';
import {drawDisplayTitle} from './display_type.js';
import {ASSETS} from './assets.js';
import {spawnSpark,spawnDust,spawnShock,spawnPop,spawnDebris,spawnSmoke} from './effects.js';
import {hurtPlayer,resolveIncomingHit} from './player.js';
import {spawnShot,spawnArc,spawnZone} from './shots.js';
import {spawnEnemy} from './enemies.js';
import {tryHitPlayer,blitTelegraph,drawCueMarker,isGreen} from './bosslib.js';
import {drawAttackAccent,drawAttackMarker} from './combat_cues.js';
import {getAIFrame} from './aiframes.js';
import {drawDialogue,updateDialogue} from './room_dialogue.js';
import {dazePose} from './daze.js';
import {MAGNET_LINE,bindMagnet,startCutloose,cutlooseUpdate,drawCutRiver,magnetUpdate,magnetReflect,magnetOpen,magnetDanger,releaseYank,
 drawMagnetMarks,drawMagnet,drawMagnetArt,CUT,cutDark,drawCutBack} from './dredger_magnet.js';
import {HOOK_DECK,bindHook,hookStart,hookUpdate,hookOpenedAt,hookPose,drawHook,drawHookMarks,drawHookBack,drawWrenchToss,hookCue,hookGuarded} from './dredger_hook.js';

export const MACHINE_HEALTH=1300,OPERATOR_HEALTH=440,OPERATOR_FLOOR=90,DREDGER_INTRO=300;
const REST=92,HOOK_REST=150,CAB_SMASH=180,SCRAP_SMASH=40;
export const GLASS=6,CREW_TOTAL=6,CREW_CALL=2;   // the crewcall's two are held back from the machine's reinforcements
const L=()=>G.camLock+56,R=()=>G.camLock+424;
const cab=()=>({x:G.camLock+352,y:74});
const PARK=()=>G.camLock+276;  // the grab idles left of the cab, never over the Thekedar's window
// The tower ladder up to the cab: he stands at its foot, hands on the rungs, and climbs LADDER_TOP.
export const LADDER_TOP=111;
const LADDER=()=>G.camLock+368,CLIMB_RATE=1;
// Wrench string timings: the side swing lands at SWING, the trembling overhead at SLAM.
export const WRENCH={wind:30,swing:14,raise:[18,50],slam:50,done:92};
export const dredgerCueOn=b=>b.state==='windup'&&greenCue('windup',b.t,b.pattern==='sack'?26:WRENCH.wind,b.pattern==='sack'?4:WRENCH.swing)
 ||b.state==='wrench'&&(b.t<=WRENCH.swing||b.t>=WRENCH.slam-GREEN_WARNING_TICKS&&b.t<=WRENCH.slam)
 ||b.state==='sack'&&b.t<=4||b.state==='call'&&b.t<8;
const since=(b,k)=>b[k]==null?1e9:G.time-b[k];
const lane=x=>clamp(G.player.y,laneMin(x),FLOOR_BOT);
const MACHINE=['swingwind','swing','swingout','dropaim','droplock','dropfall','stuck','rip','scoopaim','scoop','scooprise','dumpaim','dump'];
const OPERATOR=['windup','wrench','sack','call','gloat','crewcall','leap','backstep','down','getup','flinch','scurry','climb','incab'];
const DECK_A=['grabswing','grabdrop','grabswing','grabscoop','grabdrop','grabswing'];
const DECK_B=['grabswing','grabdump','grabdrop','grabscoop','grabswing','grabdrop','grabdump'];
const DECK_OP=['grabcall','wrenchcombo','ladder','grabcall','sack','wrenchcombo','grabcall','ladder'];

const SWING_REACH=Math.sqrt(18/54)/2;  // the arc is below z 34 for this share of the arena either side of the middle
function line(b,text){b.dialogue={text,t:0};}
// Intro beats: the gob leaves the window at spit and lands gob ticks later; the lever at drop.
// Intro beats: he steps out of the cab onto the gantry at out, spits (the gob lands gob ticks
// later), jeers under his name, steps back in at back and pulls the lever at drop.
export const INTRO={out:36,spit:54,gob:30,back:176,drop:190,landed:224};
const GANTRY={x:334,y:101,cab:350};  // world x (from camLock) where he stands on the gantry, its floor y, the cab door
const CAB_SCALE=.68;
const CLIMB_GRIP=[30,22.5,25.5,17];  // raised palm offsets measured from registered d_02..d_05
const CLIMB_HEAD=[[214,137],[204,135],[214,137],[207,137]];
const CAB_HEAD=[[224,155],[217,161],[245,160],[239,172]]; // left-facing native frame coordinates
const CAB_MOOD_HEAD=[[228,140],[211,141],[220,148],[197,147]];
const LEAP_HEAD=[196,183],CAB_SOLE=116,CAB_ENTRY_TICKS=12;
const smooth=q=>q*q*(3-2*q);
const rearScale=(z,height)=>1-(1-CAB_SCALE)*smooth(clamp(z/height,0,1));
// These anchors join authored poses without moving the head when the pose changes.
const headOffset=(a,k)=>[(a[0]-200)*k/2,(a[1]-292)*k/2];
function leaveCab(b,pose){
 const c=cab(),y=clamp(226,laneMin(c.x),FLOOR_BOT),z=y-CAB_SOLE;
 b.cabLeapHead=(pose?.[0]==='cabmood'?CAB_MOOD_HEAD:CAB_HEAD)[pose?.[1]||0];b.cabEntry=null;b.hideInCab=false;
 Object.assign(b,{x:c.x,y,z,face:-1,state:'leap',t:0,from:[c.x,z],to:[G.camLock+300,clamp(226,laneMin(G.camLock+300),FLOOR_BOT)]});
}
// The cab and gantry occupy the rear plane; feet remain registered as the body recedes.
function projectedActor(ctx,f,x,y,k){
 const w=Math.round(frameW(f)*k),h=Math.round(frameH(f)*k);
 blit(ctx,f,Math.round(x-w/2),Math.round(y-h+4*k),w,h);
}
function spray(x,y,n=10){spawnDebris(x,y,n,['#9ad0e0','#e8f4ff','#3a5060']);}

// ---------------------------------------------------------------- machine
function pick(b){
 const late=b.hp<b.maxhp*.6||b.glass<=2,deck=late?DECK_B:DECK_A;
 return deck[b.turn++%deck.length];
}
function start(b,pattern){
 const p=G.player;b.pattern=pattern;b.t=0;b.hitLanded=false;
 if(pattern==='grabswing'){b.dir=p.x<(L()+R())/2?-1:1;b.lockY=lane(p.x);b.state='swingwind';G.audio.sfx('blip');}
 if(pattern==='grabdrop'){b.state='dropaim';G.audio.sfx('blip');}
 if(pattern==='grabscoop'){b.dir=p.x<b.x?-1:1;b.lockY=lane(p.x);b.state='scoopaim';G.audio.sfx('blip');}
 if(pattern==='grabdump'){b.state='dumpaim';G.audio.sfx('blip');}
}
function machineUpdate(b){
 const p=G.player,late=b.hp<b.maxhp*.6;
 switch(b.state){
  case 'idle':case 'recover':
   b.state='idle';b.z+=clamp(REST-b.z,-2.5,2.5);b.x+=clamp(clamp(p.x,L(),PARK())-b.x,-.7,.7);b.y+=clamp(lane(b.x)-b.y,-.8,.8);
   if(b.crewBusy){b.atkCd=Math.max(b.atkCd,10);}
   if(['down','getup'].includes(p.state))b.atkCd=Math.max(b.atkCd,20);
   if(--b.atkCd<=0&&Math.abs(b.z-REST)<2)start(b,pick(b));
   return true;
  case 'swingwind':{
   // Hauled back to the far side of the lane: the long green tell of the fight.
   const x0=b.dir<0?R():L();b.x+=clamp(x0-b.x,-4.5,4.5);b.y+=clamp(b.lockY-b.y,-1.6,1.6);b.z+=clamp(64-b.z,-2,2);
   if(b.t===20)G.audio.roomSfx?.('train_brake',.3);
   if(b.t>=(late?36:46)&&Math.abs(b.x-x0)<3){b.state='swing';b.t=0;b.swingFrom=b.x;G.audio.sfx('dash');}
   return true;
  }
  case 'swing':{
   // A pendulum pass: lowest (chest height) in the middle of the arena.
   const span=R()-L(),q=clamp(b.t/(late?40:46),0,1),u=b.dir<0?1-q:q;
   b.x=L()+span*u;b.z=16+54*Math.pow(2*u-1,2);b.y=b.lockY;
   if(!b.hitLanded&&Math.abs(p.x-b.x)<30&&Math.abs(p.y-b.y)<14&&p.z<24&&b.z<34&&!['down','getup'].includes(p.state)&&!p.dying){
    b.hitLanded=true;
    if(!resolveIncomingHit(p,b,{parryClass:'counter',dmg:14,dir:b.dir,heavy:true})){hurtPlayer(p,14,b.dir,true);spawnSpark(p.x,p.y-44);G.audio.sfx('heavy');G.shake=Math.max(G.shake,5);}
   }
   if(q>=1){b.state='swingout';b.t=0;}
   return true;
  }
  case 'swingout':b.z+=clamp(REST-b.z,-2.4,2.4);if(b.t>=30){b.state='idle';b.t=0;b.atkCd=late?30:44;}return true;
  case 'dropaim':
   // The shadow hunts CHAD; the Thekedar leans on the levers.
   b.z+=clamp(REST-b.z,-2,2);b.x+=clamp(clamp(p.x,L(),R())-b.x,-2.3,2.3);b.y+=clamp(lane(b.x)-b.y,-1.6,1.6);
   if(b.t>=(late?34:46)){b.state='droplock';b.t=0;G.audio.sfx('armor');}
   return true;
  case 'droplock':if(b.t>=14){b.state='dropfall';b.t=0;b.vz=0;}return true;
  case 'dropfall':
   b.vz=Math.min(b.vz+1.4,11);b.z-=b.vz;
   if(b.z<=0){b.z=0;land(b,b);b.state='stuck';b.t=0;}
   return true;
  case 'stuck':if(b.t>=(late?96:120)){b.state='rip';b.t=0;G.audio.sfx('enrage');spawnDust(b.x,b.y,14);spawnDebris(b.x,b.y-10,8,['#6a4a2a','#3a2a1a','#8a6a3a']);}return true;
  case 'rip':b.z=Math.min(REST,b.z+2.6);if(b.z>=REST){b.state='idle';b.t=0;b.atkCd=late?26:40;}return true;
  case 'scoopaim':{
   const x0=b.dir>0?L():R();b.x+=clamp(x0-b.x,-4.5,4.5);b.y+=clamp(b.lockY-b.y,-1.8,1.8);b.z+=clamp(6-b.z,-2.4,2.4);
   if(b.t>=34&&Math.abs(b.x-x0)<3&&b.z<8){b.state='scoop';b.t=0;G.audio.sfx('dash');G.audio.roomSfx?.('train_brake',.4);}
   return true;
  }
  case 'scoop':
   b.x+=b.dir*(late?4:3.5);b.y=b.lockY;b.z=6;if(b.t%4===0)spawnDust(b.x-b.dir*24,b.y,1);
   if(!b.hitLanded&&Math.abs(p.x-b.x)<32&&Math.abs(p.y-b.y)<13&&p.z<14&&!['down','getup'].includes(p.state)&&!p.dying){
    b.hitLanded=true;if(!resolveIncomingHit(p,b,{parryClass:'unblockable',dmg:14,dir:b.dir,heavy:true})){hurtPlayer(p,14,b.dir,true);G.audio.sfx('heavy');G.shake=Math.max(G.shake,5);}
   }
   if(b.dir>0?b.x>=R():b.x<=L()){b.state='scooprise';b.t=0;}
   return true;
  case 'scooprise':b.z+=clamp(REST-b.z,-2.6,2.6);if(b.z>=REST-1){b.state='idle';b.t=0;b.atkCd=late?28:40;}return true;
  case 'dumpaim':
   b.z+=clamp(REST-b.z,-2,2);b.x+=clamp(clamp(p.x,L(),R())-b.x,-2,2);b.y+=clamp(lane(b.x)-b.y,-1.4,1.4);
   if(b.t>=36){b.state='dump';b.t=0;G.audio.sfx('slam');}
   return true;
  case 'dump':
   if(b.t===6||b.t===16||b.t===26){const k=(b.t-16)/10;spawnArc('sludge',b.x+k*34,b.y+k*6,k*.9,-.5,8,'sludge',{source:b,parryClass:'unblockable',z:b.z-16});G.audio.sfx('land');}
   if(b.t>=56){b.state='idle';b.t=0;b.atkCd=40;}
   return true;
 }
 return false;
}
// The grab lands. Anything under it - CHAD or its own boss - is under it.
function land(b,g){
 const p=G.player;G.shake=Math.max(G.shake,9);G.audio.sfx('slam');G.audio.sfx('heavy');spawnShock(g.x,g.y);spawnDust(g.x,g.y,18);
 spawnDebris(g.x,g.y-6,10,['#6a4a2a','#3a2a1a','#8a6a3a']);
 if(Math.abs(p.x-g.x)<38&&Math.abs(p.y-g.y)<16&&p.z<14&&!['down','getup'].includes(p.state)&&!p.dying){
  if(!resolveIncomingHit(p,b,{parryClass:'unblockable',dmg:16,dir:p.x<g.x?-1:1,heavy:true}))hurtPlayer(p,16,p.x<g.x?-1:1,true);
 }
 if(b.phase==='operator'&&!b.dead&&b.z<14&&!b.hideInCab&&Math.abs(b.x-g.x)<46&&Math.abs(b.y-g.y)<20&&b.state!=='leap'){
  b.crushedAt=G.time;b.componentApplying=true;b.hurt(Math.round(b.maxhp*.18),1,true,false);b.componentApplying=false;
  if(!b.dead){b.protectedStagger=Math.max(b.protectedStagger,130);b.state='stagger';b.t=0;}
  spawnPop(b.x,b.y-64,'SELF-DREDGED!');G.hitstop=Math.max(G.hitstop,8);line(b,'MY OWN BUCKET?!');
 }
}
function smashCab(b,dmg,label,cracks=1){
 const c=cab(),was=b.glass;b.glass=Math.max(0,b.glass-cracks);b.cabHitAt=G.time;spray(c.x,c.y,14);G.shake=Math.max(G.shake,8);G.hitstop=Math.max(G.hitstop,6);
 G.audio.roomSfx?.('room_glass',.7);G.audio.sfx('slam');if(label||!b.glass)spawnPop(c.x,c.y+44,b.glass?label:'CAB SMASHED!');
 b.componentApplying=true;b.hurt(dmg,1,true,false);b.componentApplying=false;
 if(was>4&&b.glass<=4&&b.glass)line(b,'OYE! THAT GLASS IS IMPORTED!');
 else if(was>2&&b.glass<=2&&b.glass)line(b,'YOU KNOW WHOSE RIVER THIS IS?');
 if(b.glass===0){if(b.rig==='grab'){b.magnetPending=true;b.hp=Math.min(b.hp,b.magLine);}else b.operatorPending=true;}
}

// The diesel under the fight: it labours when the winch hauls, chokes off in the blowout and
// limps along, rougher and quieter, for the grab he still calls down.
function engineBed(b){
 if(b.dead||b.state==='blowout'&&b.t<70||b.state==='cutloose'&&b.t>=CUT.dark&&b.t<CUT.banner)return;
 const g=b.phase==='machine'?b:b.grab,busy=g&&g.state!=='idle'&&g.state!=='rest';
 G.audio.roomLoop?.('dredger_engine',b.phase==='machine'?(busy?.34:.24):(busy?.2:.1));
}
// ---------------------------------------------------------------- blowout
// The machine's last gasp, an armoured set piece between the phases: the cab blows, the grab loses
// power and crashes onto the deck, the rig burns and the Thekedar rages behind the broken glass,
// kicks out what is left of it and jumps down. His bar fills as he lands and the banner drops.
const BLOW={crash:0,blast:[0,14,34,58],rage:22,kick:84,out:100},STING_T=60;
const STINGS={operator:['OVERTIME!','THE THEKEDAR CLOCKS IN','#ffc23a'],magnet:['MAGNET MODE!','THE SCRAPYARD JOINS IN','#6ad0ff'],hook:['CONTRACT TERMINATED!','HOOK, LINE AND THEKEDAR','#ff5a3a']};
const sound=(name,v=.5)=>{if(!G.audio.roomSfx?.(name,v))G.audio.sfx(name);};
function startBlowout(b){
 const c=cab();b.operatorPending=false;releaseYank(b);G.audio.stopRoomLoop?.('dredger_engine',.3);
 Object.assign(b,{state:'blowout',t:0,returnT:null,protectedStagger:0,blowFrom:[b.x,b.z],vz:0,dialogue:null});
 // Everything in the air goes; CHAD gets the set piece to himself.
 G.shots=G.shots.filter(s=>s.reflected);G.player.invuln=Math.max(G.player.invuln||0,230);
 for(const e of b.crewActors)if(!e.dead){e.atkCd=Math.max(e.atkCd,240);e.state='idle';e.t=0;}
 G.hitstop=Math.max(G.hitstop,12);G.flash=3;G.shake=Math.max(G.shake,12);
 spray(c.x,c.y,24);spawnPop(c.x,c.y+44,'CAB SMASHED!');sound('room_glass',.8);sound('break_metal',.7);
 if(G.india?.damage)G.india.damage.dredger=Math.max(G.india.damage.dredger||0,1);
}
function blowoutUpdate(b){
 const c=cab(),t=b.t;
 // The dead grab: the winch lets go and it drops on its cable, bounces once and lies open.
 if(b.z>0||b.vz){b.vz-=.55;b.z=Math.max(0,b.z+b.vz);if(b.z===0&&b.vz<0){
  if(b.vz<-4){G.shake=Math.max(G.shake,9);sound('slam',.7);sound('neta_roof_thud',.6);spawnDust(b.x,b.y,16);spawnShock(b.x,b.y);spawnDebris(b.x,b.y-10,10,['#6a4a2a','#a0703a','#2a1a10']);b.vz=-b.vz*.28;b.landedAt=t;}else b.vz=0;}}
 for(const [i,at]of BLOW.blast.entries())if(t===at){G.shake=Math.max(G.shake,6+i*2);sound(i%2?'train_blast':'heavy',.45);spawnSmoke(c.x+(i%2?18:-14),c.y-10,4);spawnDebris(c.x,c.y,8,['#ffcf6a','#ff7a2a','#3a2a20']);}
 if(t%5===0&&t<BLOW.out){spawnSpark(c.x+((t*37)%40)-20,c.y+((t*13)%20)-8);if(t%15===0)spawnSmoke(c.x+((t*11)%30)-15,c.y-18,2);}
 if(t===BLOW.rage){line(b,'MY MACHINE! MY BEAUTIFUL MACHINE!');sound('enrage',.6);}
 if(t===BLOW.kick){sound('slam',.6);spray(c.x-20,c.y+4,18);G.shake=Math.max(G.shake,5);}
 if(t>=BLOW.out){b.blowDone=true;toOperator(b);}
 return true;
}
function drawBlowout(ctx,b,camX){
 // Fireballs bursting out of the cab and along the boom.
 const im=ASSETS.nr_explosion,c=cab();if(!im)return;const fw=im.width/8;
 for(const [i,at]of BLOW.blast.entries()){const a=b.t-at;if(a<0||a>=40)continue;const w=[96,58,74,52][i],x=c.x-camX+[0,-40,22,-70][i],y=c.y+[18,10,26,4][i];
  ctx.save();if(a>28)ctx.globalAlpha=(40-a)/12;ctx.drawImage(im,Math.min(7,a/5|0)*fw,0,fw,im.height,Math.round(x-w/2),Math.round(y-w*.8),w,Math.round(w*.8));ctx.restore();}
}
function stingBanner(ctx,b){
 const a=b.sting==null?99:G.time-b.sting;if(a<0||a>=STING_T||b.dead)return;
 const [title,sub,col]=STINGS[b.stingKind||'operator'],open=Math.min(1,a/8)*Math.min(1,(STING_T-a)/8),h=Math.round(30*open);if(h<3)return;
 const y=58+15-h/2;ctx.save();ctx.fillStyle='rgba(16,10,12,.88)';ctx.fillRect(0,y,W,h);ctx.fillStyle=col;ctx.fillRect(0,y,W,1);ctx.fillRect(0,y+h-1,W,1);
 if(h>=26){const slide=Math.round(40*(1-Math.min(1,a/10))**3);
  drawDisplayTitle(ctx,title,W/2-slide,y+3,{height:14,maxWidth:300});
  drawTextShadow(ctx,sub,Math.round((W-textWidth(sub,1))/2+slide),y+20,'#f8e0b8',1);}
 ctx.restore();
}

// ---------------------------------------------------------------- operator
function toOperator(b){
 const c=cab(),p=G.player,departure=cabPose(b);b.phase='operator';b.operatorPending=false;
 // The hand-over is a breather: everything in the air or on the deck is washed away.
 G.shots=G.shots.filter(s=>s.reflected);for(const z of G.zones)if(z.kind==='sludge')spawnDust(z.x,z.y,3);G.zones=G.zones.filter(z=>z.kind!=='sludge');
 p.invuln=Math.max(p.invuln||0,90);
 b.grab={x:b.x,y:b.y,z:b.blowDone?b.z:Math.max(b.z,40),state:'rest',t:0,rig:b.rig};
 b.reflectTarget=null;b.maxhp=Math.round(OPERATOR_HEALTH*diff().hp);b.hp=b.blowDone?1:b.maxhp;b.refill=!!b.blowDone;b.guard=b.maxGuard=3;b.turn=0;b.crewCalled=false;
 b.set=SPR.dl_thekedar||b.set;b.label='THE THEKEDAR';b.sortBias=0;b.w=40;b.h=88;b.shadowR=14;b.popH=100;b.hideInCab=false;
 leaveCab(b,departure);
 spray(c.x,c.y,16);G.audio.sfx('ko');line(b,"FINE. I'LL DREDGE YOU MYSELF.");
 if(G.india?.damage)G.india.damage.dredger=Math.max(G.india.damage.dredger||0,1);
 for(const e of b.crewActors)if(!e.dead){e.atkCd=Math.max(e.atkCd,90);e.state='idle';e.t=0;}
}
function grabUpdate(b){
 const g=b.grab,p=G.player;if(!g)return;g.t++;
 switch(g.state){
  case 'dead':g.z=Math.min(320,g.z+3.5);if(g.t%10===0&&g.z<200)spawnSmoke(G.camLock+300+((g.t>>3)&1)*6,150,1);break;   // the dead rig is winched up out of his way
  // In the hook finale it hangs higher, out of the whirling chain's way.
  case 'rest':g.z+=clamp((b.hook?HOOK_REST:REST)-g.z,-2,2);g.x+=clamp(PARK()-10+Math.sin(G.time*.01)*20-g.x,-.8,.8);
   if(!b.refill&&!b.hook&&g.t>=(g.sweepCd??420)&&!['call','crewcall','climb','incab','leap','land'].includes(b.state)&&!p.dying){g.state='sweepwind';g.t=0;g.dir=p.x<(L()+R())/2?1:-1;g.lockY=p.y;sound('train_brake',.35);G.audio.sfx('blip');}
   break;
  case 'sweepwind':{
   // The winch hauls it out to one end, then it swings low down CHAD's lane (red: jump or step out).
   const x0=g.dir<0?R():L();g.x+=clamp(x0-g.x,-4,4);g.y+=clamp(g.lockY-g.y,-1.6,1.6);g.z+=clamp(64-g.z,-2,2);
   if(g.t>=48&&Math.abs(g.x-x0)<3){g.state='sweep';g.t=0;g.hitP=g.hitB=false;G.audio.sfx('dash');sound('neta_roof_spin',.4);}
   break;
  }
  case 'sweep':{
   const q=clamp(g.t/44,0,1),u=g.dir<0?1-q:q;g.x=L()+(R()-L())*u;g.z=16+54*Math.pow(2*u-1,2);g.y=g.lockY;
   if(!g.hitP&&g.z<34&&Math.abs(p.x-g.x)<30&&Math.abs(p.y-g.y)<14&&p.z<24&&!['down','getup'].includes(p.state)&&!p.dying){
    g.hitP=true;if(!p.invuln){hurtPlayer(p,14,g.dir,true);spawnSpark(p.x,p.y-44);G.audio.sfx('heavy');G.shake=Math.max(G.shake,5);}}
   // Caught in his own bucket's path: it bowls him over (WRONG LANE).
   if(!g.hitB&&g.z<34&&Math.abs(b.x-g.x)<28&&Math.abs(b.y-g.y)<16&&b.z<10&&!b.dead&&!['climb','incab','leap'].includes(b.state)){
    g.hitB=true;b.crushedAt=G.time;b.componentApplying=true;b.hurt(Math.round(b.maxhp*.1),g.dir,true,false);b.componentApplying=false;
    if(!b.dead){b.protectedStagger=Math.max(b.protectedStagger,110);b.state='stagger';b.t=0;spawnPop(b.x,b.y-64,'WRONG LANE!');G.hitstop=Math.max(G.hitstop,8);G.audio.sfx('ehurt3');}}
   if(q>=1){g.state='rise';g.t=0;}
   break;
  }
  case 'aim':g.z+=clamp(REST-g.z,-2,2);g.x+=clamp(clamp(p.x,L(),R())-g.x,-2.1,2.1);g.y+=clamp(lane(g.x)-g.y,-1.5,1.5);if(g.t>=56){g.state='lock';g.t=0;G.audio.sfx('armor');}break;
  case 'lock':if(g.t>=16){g.state='fall';g.t=0;g.vz=0;}break;
  case 'fall':g.vz=Math.min(g.vz+1.4,11);g.z-=g.vz;if(g.z<=0){g.z=0;land(b,g);g.state='stuck';g.t=0;}break;
  case 'stuck':if(g.t>=80){g.state='rise';g.t=0;}break;
  case 'rise':g.z=Math.min(REST,g.z+2.4);if(g.z>=REST){g.state='rest';g.t=0;g.sweepCd=340+((G.time*7)%90);}break;
 }
}
function opPick(b){
 const p=G.player,d=Math.abs(p.x-b.x);
 if(!b.crewCalled&&b.hp<b.maxhp*.5)return 'crewcall';
 if(b.hook){let k=HOOK_DECK[b.turn++%HOOK_DECK.length];if(k==='sack'&&d<70)k='hookslam';if(k==='grabcall'&&b.grab?.state!=='rest')k='hookfling';return k;}
 let k=DECK_OP[b.turn++%DECK_OP.length];
 if(k==='ladder'&&b.grab.state!=='rest')k='grabcall';
 if(k==='grabcall'&&b.grab.state!=='rest')k=d>110?'sack':'wrenchcombo';
 if(k==='wrenchcombo'&&d>120)k=b.grab.state==='rest'?'grabcall':'sack';
 if(k==='sack'&&d<60)k='wrenchcombo';
 return k;
}
// A swing that whiffs in front of him, close: he flinches with his guard down.
function feinted(b){
 const p=G.player,dx=(p.x-b.x)*b.face;
 return p.state==='attack'&&p.hitDone&&!p.hitConfirm&&dx>20&&dx<96&&Math.abs(p.y-b.y)<18&&p.face===-b.face&&since(b,'flinchAt')>150;
}
function opUpdate(b){
 const p=G.player,f=p.x<b.x?-1:1;
 if(hookUpdate(b))return true;
 switch(b.state){
  case 'leap':{
   const q=clamp(b.t/44,0,1);if(b.refill)b.hp=Math.max(1,Math.round(b.maxhp*q*.6));b.x=b.from[0]+(b.to[0]-b.from[0])*q;b.y=b.to[1];b.z=b.from[1]*(1-q)+Math.sin(q*Math.PI)*30;
   if(q>=1){b.z=0;b.state='land';b.t=0;G.shake=8;G.audio.sfx('slam');spawnDust(b.x,b.y,14);spawnShock(b.x,b.y);}
   return true;
  }
  case 'land':
   if(b.refill){b.hp=Math.round(b.maxhp*(.6+.4*clamp(b.t/24,0,1)));if(b.t===8){b.sting=G.time;b.stingKind='operator';b.dialogue=null;G.hitstop=Math.max(G.hitstop,8);G.flash=2;sound('enrage',.5);sound('neta_roof_thud',.5);}if(b.t>=24){b.hp=b.maxhp;b.refill=false;}}
   if(b.t>=30){b.state='idle';b.t=0;b.atkCd=30;}return true;
  case 'idle':case 'recover':{
   b.state='idle';if(p.dying){b.state='victory';b.t=0;return true;}
   if(p.state!=='down')b.taunted=false;else if(!b.taunted){b.taunted=true;b.state='taunt';b.t=0;return true;}
   b.face=f;const dx=p.x-b.x;b.y+=clamp(p.y-b.y,-.6,.6);
   if(feinted(b)){b.state='flinch';b.t=0;b.flinchAt=G.time;return true;}
   // With the hook he keeps a chain's length off CHAD, steaming.
   if(b.hook){if(G.time%40===0)spawnSmoke(b.x-b.face*4,b.y-86,1);if(Math.abs(dx)>130)b.x+=Math.sign(dx)*1.1;else if(Math.abs(dx)<92)b.x-=Math.sign(dx)*.9;b.x=clamp(b.x,L()-20,R()+20);}
   else if(Math.abs(dx)>64)b.x+=Math.sign(dx)*.8;else if(Math.abs(dx)<36)b.x-=Math.sign(dx)*.5;
   if(--b.atkCd<=0){const k=opPick(b);b.pattern=k;b.t=0;b.hitLanded=false;b.attackFace=f;
    if(k.startsWith('hook'))hookStart(b,k);else b.state=k==='grabcall'?'call':k==='crewcall'?'crewcall':k==='ladder'?'scurry':'windup';}
   return true;
  }
  case 'flinch':if(b.t>=30){b.state='idle';b.t=0;b.atkCd=Math.max(b.atkCd,20);}return true;
  case 'windup':
   b.face=b.attackFace;
   if(b.t>=(b.pattern==='sack'?26:WRENCH.wind)){b.state=b.pattern==='sack'?'sack':'wrench';b.t=0;}
   return true;
  case 'wrench':
   // A side swing that drags him after it, then the trembling overhead: parry the overhead and
   // it jams in the deck. Either way he is left overbalanced and wheezing.
   b.face=b.attackFace;if(b.t<8||b.t>=WRENCH.slam-6&&b.t<WRENCH.slam+10)b.x+=b.face*1.1;
   if(b.t===WRENCH.swing){G.audio.sfx('whiff');tryHitPlayer(b,9,62,false,15,'counter');}
   if(b.t===WRENCH.slam){G.audio.sfx('slam');spawnDust(b.x+b.face*40,b.y,6);if(tryHitPlayer(b,14,72,true,16,'counter'))G.shake=5;}
   if(b.t>=WRENCH.done){b.state='idle';b.t=0;b.atkCd=40;}
   return true;
  case 'scurry':{
   // Off for the ladder and the safety of his cab.
   const x0=LADDER(),y0=clamp(212,laneMin(x0),FLOOR_BOT);b.face=x0>b.x?1:-1;
   b.x+=clamp(x0-b.x,-1.5,1.5);b.y+=clamp(y0-b.y,-1,1);
   if(Math.abs(b.x-x0)<1&&Math.abs(b.y-y0)<1){b.x=x0;b.y=y0;b.face=1;b.state='climb';b.t=0;}
   else if(b.t>240){b.state='idle';b.t=0;b.atkCd=30;}
   return true;
  }
  case 'climb':{
   const lastZ=b.z,lastIdx=Math.floor(Math.max(0,b.t-1)/10)%4;
   b.face=1;b.x=LADDER();b.z=Math.min(LADDER_TOP,b.z+CLIMB_RATE);
   if(b.t%16===0)G.audio.roomSfx?.('room_stamp',.18);  // a slipper on a rung
   if(b.z>=LADDER_TOP){
    const k=rearScale(lastZ,LADDER_TOP);
    b.cabEntry={idx:lastIdx,x:G.camLock+398-CLIMB_GRIP[lastIdx]*k,y:b.y-lastZ,k,seatedIdx:((G.time+CAB_ENTRY_TICKS)>>3)&1};
    b.state='incab';b.t=0;b.hideInCab=true;
   }
   return true;
  }
  case 'incab':{
   // Back at his levers: one drop on CHAD, then he comes down again.
   if(b.t===12){spawnPop(cab().x,cab().y+40,b.grab.rig==='magnet'?'MAGNET!':'BUCKET!');G.audio.sfx('blip');b.grab.state='aim';b.grab.t=0;}
   if(b.t>=12&&b.grab.state!=='aim'&&b.grab.state!=='lock'&&b.t>=90){
    leaveCab(b,['cab',((G.time-1)>>3)&1]);
   }
   return true;
  }
  case 'sack':
   if(b.t===4){spawnArc('sack',b.x+b.face*24,b.y,clamp((p.x-b.x)/34,-4.2,4.2),3.4,12,'sand',{source:b,parryClass:'reflect',z:78});G.audio.sfx('throw');}
   if(b.t>=34){b.state='idle';b.t=0;b.atkCd=36;}
   return true;
  case 'call':
   // "BUCKET!" - the grab hunts CHAD. The boss stays in the fight, greedy for the kill.
   if(b.t===6){spawnPop(b.x,b.y-b.popH-8,b.grab.rig==='magnet'?'MAGNET!':'BUCKET!');G.audio.sfx('blip');b.grab.state='aim';b.grab.t=0;}
   if(b.t>=26){b.state='gloat';b.t=0;}
   return true;
  case 'gloat':{
   const g=b.grab;b.face=f;
   if(g.state==='aim'){const dx=p.x-b.x;if(Math.abs(dx)>42)b.x+=Math.sign(dx)*.8;b.y+=clamp(p.y-b.y,-.5,.5);}
   if(g.state==='stuck'||g.state==='rest'||b.t>150){b.state='idle';b.t=0;b.atkCd=24;}
   return true;
  }
  case 'crewcall':
   // Half way down he loses it: calls the boys, then runs for the ladder and swings down on the hook.
   if(b.t===10){b.crewCalled=true;spawnPop(b.x,b.y-b.popH-8,'BOYS! DOUBLE SHIFT!');spawnCrew(b,CREW_CALL,true);}
   if(b.t>=40){hookStart(b,'hookrun');}
   return true;
  case 'hurt':if(b.t>=16){b.state='idle';b.t=0;b.atkCd=Math.max(b.atkCd,14);}return true;
  case 'backstep':b.x-=b.face*1.6;if(b.t>=14){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,10);}return true;
  case 'taunt':if(b.t>=50||p.state!=='down'&&b.t>=20){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,20);}return true;
  case 'down':
   if(inAir(b)){if(fall(b,.28,0)==='land'){spawnDust(b.x,b.y,6);G.shake=Math.max(G.shake,4);G.audio.sfx('land');}}
   else if(b.t>=40){b.state='getup';b.t=0;}
   return true;
  case 'getup':if(b.t>=16){b.state='idle';b.t=0;b.atkCd=24;}return true;
  case 'victory':if(!p.dying){b.state='idle';b.t=0;b.atkCd=40;}return true;
 }
 return false;
}

// ---------------------------------------------------------------- crew
function spawnCrew(b,count,melee=false){
 b.crewActors=b.crewActors.filter(e=>!e.dead&&!e.removeMe&&(G.enemies.includes(e)||e===b.yankee?.e||e===b.flung?.e));
 // The machine keeps two crew on the deck at most; the Thekedar's call always brings his two.
 const n=Math.min(count,melee?count:2-b.crewActors.length,CREW_TOTAL-b.crewSpawned);
 const used=new Set();
 for(let i=0;i<n;i++){const L0=G.camLock+28,R0=G.camLock+452;let x=b.crewSpawned%2?R0:L0;
  // They walk in ~70px from the rail they enter by: never to a spot under the grab (an embedded grab is CHAD's punish).
  if(b.phase==='machine'&&Math.abs((x===L0?x+70:x-70)-b.x)<56)x=x===L0?R0:L0;
  if(used.has(x)){used.add(x);x+=x===L0?-36:36;}else used.add(x);   // (two by one rail come in a pace apart, not stacked)
  const e=spawnEnemy('ic_docker',x,laneMin(x)+16);if(e){e.dredgerCrew=!melee;e.atkCd=90+i*70;b.crewActors.push(e);b.crewSpawned++;}}
 b.crewCd=720;
}
function tickDialogue(b){if(b.dialogue){b.dialogue.t++;updateDialogue(b.dialogue.text,b.dialogue.t,{remaining:180-b.dialogue.t});if(b.dialogue.t>=180)b.dialogue=null;}}
function crewUpdate(b){
 tickDialogue(b);
 b.crewActors=b.crewActors.filter(e=>!e.dead&&!e.removeMe&&(G.enemies.includes(e)||e===b.yankee?.e||e===b.flung?.e));
 // While he takes the hook, the crew stand back and watch (the transition is his moment, not a free beating).
 if(b.phase==='operator'&&(['hooktoss','hookswing'].includes(b.state)||b.state==='hookland'&&b.t<78))for(const e of b.crewActors){if(['windup','approach'].includes(e.state)||e.state==='attack'&&!e.hitLanded){e.state='idle';e.t=0;}e.atkCd=Math.max(e.atkCd,40);}
 if(b.phase!=='machine')return;
 if(b.crewCd>0)b.crewCd--;
 if(b.crewCd<=0&&b.crewSpawned<CREW_TOTAL-CREW_CALL&&b.crewActors.length<2&&b.t>0)spawnCrew(b,2);
 // The grab and a crewman never commit at the same moment.
 const danger=['swingwind','swing','dropaim','dropfall','droplock','scoopaim','scoop','dumpaim','dump'].includes(b.state)||b.rig==='magnet'&&magnetDanger(b.state);
 b.crewBusy=b.crewActors.some(e=>['windup','attack'].includes(e.state));
 if(danger)for(const e of b.crewActors){if(['windup','approach'].includes(e.state)||e.state==='attack'&&!e.hitLanded){e.state='idle';e.t=0;}e.atkCd=Math.max(e.atkCd,30);}
}

// ---------------------------------------------------------------- hooks
export const dredger={
 // The reveal's line rides over his head: out on the gantry, then over the cab as he goes back in.
 introLine(b,t,camX){
  if(t<58||t>=182)return null;
  const g=introGantryPose(t),x=G.camLock+(g?g.x:GANTRY.cab)-camX;
  return {text:b.def.taunt,x,bottom:g?GANTRY.y-Math.round(88*CAB_SCALE)-(g.dy||0)-2:46,age:t-58,remaining:182-t,width:210,minTop:4};   // no HUD up during the reveal: the panel may ride high
 },
 noRage:true,
 init(b){
  Object.assign(b,{phase:'machine',z:REST,face:-1,x:G.camLock+250,w:64,h:70,shadowR:30,glass:GLASS,turn:0,crewCd:300,crewSpawned:0,crewActors:[],atkCd:40,
   label:b.def.name,popH:80,guard:0,maxGuard:0,sortBias:-10,rig:'grab',hook:false,overload:0,scraps:[],introSpeech:{x:G.camLock+215,bottom:66}});
  b.y=clamp(216,laneMin(b.x),FLOOR_BOT);b.hp=b.maxhp=Math.round(MACHINE_HEALTH*diff().hp);b.magLine=Math.round(b.maxhp*MAGNET_LINE);
  if(G.india?.damage)G.india.damage.dredger=0;   // a retry starts on the whole rig
  const c=cab();b.reflectTarget={x:c.x,y:c.y};
  const parried=b.parried;
  b.parried=(dmg,dir)=>{
   if(b.phase==='machine'){
    // RETURN TO SENDER: the swing goes back up its own cable into the cab.
    if(b.state==='swing'){b.returnT=0;b.retFrom=[b.x,b.z];b.protectedStagger=Math.max(b.protectedStagger,118);spawnPop(b.x,b.y-b.z-60,'RETURN TO SENDER');G.audio.sfx('heavy');}
    return;
   }
   const overhead=b.state==='wrench'&&b.t>=WRENCH.raise[0]+12,fling=b.state==='hookfling';
   parried(dmg,dir);if(b.dead)return;
   if(fling){b.protectedStagger=Math.max(b.protectedStagger,hookOpenedAt.tangle(b));b.tangledAt=G.time;spawnPop(b.x,b.y-b.popH-8,'TANGLED!');G.audio.sfx('armor');sound('magnet_chain',.6);G.shake=Math.max(G.shake,5);}
   if(overhead){b.protectedStagger=Math.max(b.protectedStagger,100);b.stuckAt=G.time;spawnPop(b.x,b.y-b.popH-8,'STUCK!');spawnDust(b.x+b.face*44,b.y,10);G.shake=Math.max(G.shake,6);}
  };
 },
 // The intro: the Thekedar at his levers, a gob out of the cab window at CHAD, his jeer and his
 // name, then he yanks the lever and the grab comes down out of the dark.
 introTicks:DREDGER_INTRO,
 intro(b,t){
  b.introT=t;b.z=t<INTRO.drop?260:Math.max(REST,260-(t-INTRO.drop)*5);
  if(t===INTRO.spit)G.audio.roomSfx?.('room_pen',.3)||G.audio.sfx('whiff');
  if(t===INTRO.spit+INTRO.gob)G.audio.sfx('land');
  if(t===INTRO.drop){G.audio.sfx('armor');G.audio.sfx('enrage');}
  if(t===INTRO.landed){G.shake=Math.max(G.shake,6);G.audio.sfx('slam');}
 },
 keepFace(b){return b.phase==='machine'||OPERATOR.includes(b.state)||b.state==='land'||b.state.startsWith('hook');},
 beforeUpdate(b){const g=b.phase==='machine'?b:b.grab;if(g&&(g===b?b.rig:g.rig)!=='magnet'&&b.state!=='cutloose')grabLife(b,g);},
 beforeHurt(b,dmg,dir,heavy,launch){
  b.guardingHit=false;
  if(b.componentApplying||b.superApplying||b.counterApplying)return true;
  if(b.phase==='machine'){
   if(b.state==='blowout'||b.state==='cutloose')return false;
   // Steel only gives when it is down on the deck.
   const open=b.rig==='magnet'?magnetOpen(b):b.state==='stuck'||b.returnT!=null&&b.returnT>=40||b.z<10&&b.protectedStagger>0;
   if(!open){spawnSpark(b.x,b.y-b.z-30);G.audio.sfx('armor');return false;}
   return true;
  }
  if(b.state==='incab'||b.refill||['hookrun','hookclimb','hooktoss','hookswing','hookland'].includes(b.state))return false;
  if(b.protectedStagger||b.parryApplying)return true;
  if(b.state==='backstep'){b.guardFlash=6;G.audio.sfx('armor');spawnSpark(b.x+b.face*14,b.y-60);return false;}
  const guard=b.guard>0&&dir===-b.face&&(['idle','windup'].includes(b.state)||hookGuarded(b))&&b.pattern!=='grabcall'&&since(b,'flinchAt')>30;
  if(guard&&!heavy&&!launch){b.guardFlash=6;G.audio.sfx('armor');spawnSpark(b.x+b.face*14,b.y-60);return false;}
  b.guardingHit=guard;return true;
 },
 onHurt(b,dmg,heavy,launch){
  if(b.phase==='machine'){
   if(b.rig==='grab'&&b.hp<=b.magLine){b.hp=b.magLine;b.magnetPending=true;}
   if(b.hp<=OPERATOR_FLOOR){b.hp=OPERATOR_FLOOR;b.operatorPending=true;}
   spawnSpark(b.x,b.y-b.z-24);if(heavy)G.shake=Math.max(G.shake,3);
   return true;
  }
  if(b.counterApplying&&b.reflectedKind==='sack'){
   b.blindAt=G.time;b.protectedStagger=Math.max(b.protectedStagger,110);b.state='stagger';b.t=0;spawnPop(b.x,b.y-b.popH-8,'SAND IN THE EYES');G.audio.sfx('ehurt3');return true;
  }
  if(b.state==='climb'&&!b.componentApplying){
   // Knocked off his ladder: he hits the deck hard, open while he gets up.
   Object.assign(b,{state:'down',t:0,vx:-1.2,vz:1.5,face:1});b.pluckedAt=G.time;
   b.componentApplying=true;b.hurt(Math.round(b.maxhp*.08),1,true,false);b.componentApplying=false;
   if(!b.dead){spawnPop(b.x,b.y-b.z-60,'OFF THE LADDER!');G.audio.sfx('ehurt3');}
   return true;
  }
  // Floored only inside an opening he earned: the jammed wrench, his own bucket, sand in his eyes.
  const opened=since(b,'stuckAt')<100||since(b,'crushedAt')<130||since(b,'blindAt')<110||since(b,'tangledAt')<130||since(b,'hookStuckAt')<100;
  if(heavy&&opened&&b.protectedStagger&&!b.superLocked&&!b.superApplying&&!b.counterApplying&&!b.parryApplying&&!b.dead){
   Object.assign(b,{protectedStagger:0,state:'down',t:0,vx:(G.player.x<b.x?1:-1)*1.8,vz:2.8,z:Math.max(b.z,.1)});
   G.shake=Math.max(G.shake,5);return true;
  }
  if(b.protectedStagger||b.superLocked)return true;
  if(['wrench','sack','call','crewcall','leap','land','down','getup','backstep','scurry','hookfling','hookslam','hooksweep','hookwinded'].includes(b.state))return true;  // committed: he takes it
  // One flinch per flurry: a hit does not restart it, and the third hit inside it has him
  // step back behind his guard instead of standing there to be mashed.
  if(b.state==='hurt'){if(++b.flinchHits>=3){Object.assign(b,{state:'backstep',t:0,guardFlash:10});G.audio.sfx('armor');spawnSpark(b.x+b.face*14,b.y-60);}return true;}
  b.state='hurt';b.t=0;b.hurtHigh=!heavy;b.flinchHits=1;return true;
 },
 staggerTick(b){
  if(b.phase==='operator'){grabUpdate(b);crewUpdate(b);return false;}
  tickDialogue(b);if(b.returnT==null)return true;
  const r=b.returnT++,c=cab(),[x0,z0]=b.retFrom,cz=b.y-c.y-28;
  if(r<16){const q=r/16;b.x=x0+(c.x-x0)*q*q;b.z=z0+(cz-z0)*q;}
  if(r===16)smashCab(b,CAB_SMASH,null,2);
  if(r>16&&r<40){const q=(r-16)/24;b.x=c.x-54*q;b.z=Math.max(0,cz*(1-q*q));}
  if(r===40){b.z=0;G.shake=Math.max(G.shake,6);G.audio.sfx('slam');spawnDust(b.x,b.y,12);}
  return true;
 },
 afterOpening(b){
  b.returnT=null;
  if(b.phase==='machine'){if(b.rig==='magnet'){b.state='magrise';b.t=0;}else{b.state=b.z<REST-2?'rip':'idle';b.t=0;b.atkCd=30;}if(b.operatorPending)startBlowout(b);else if(b.magnetPending)startCutloose(b);return;}
  b.state='idle';b.t=0;b.atkCd=18;
 },
 update(b){
  crewUpdate(b);engineBed(b);
  // A transition's recharge: the bar climbs back on an eased curve while the banner is up.
  if(b.hpFx){const q=clamp((G.time-b.hpFx.t0)/b.hpFx.dur,0,1),e=(1-Math.cos(q*Math.PI))/2;b.hp=Math.round(b.hpFx.from+(b.hpFx.to-b.hpFx.from)*e);if(q>=1)b.hpFx=null;}
  if(b.phase==='machine'){
   if(b.state==='blowout')return blowoutUpdate(b);
   if(b.state==='cutloose')return cutlooseUpdate(b);
   if(b.operatorPending&&!b.dead&&!b.superLocked){startBlowout(b);return true;}
   if(b.magnetPending&&!b.dead&&!b.superLocked){startCutloose(b);return true;}
   return b.rig==='magnet'?magnetUpdate(b):machineUpdate(b);
  }
  grabUpdate(b);
  return opUpdate(b);
 },
 drawHud(ctx,b,x,y){
  stingBanner(ctx,b);
  // A recharge: the regained stretch glows in the transition's colour, with a bright leading edge and sparks rising off it.
  if(b.hpFx&&Number.isFinite(x)){const bw=160,f=b.hpFx,a=Math.round(bw*f.from/b.maxhp),to=Math.round(bw*b.hp/b.maxhp),age=G.time-f.t0;
   ctx.save();ctx.fillStyle=f.col;ctx.fillRect(x+a,y,Math.max(0,to-a),5);ctx.fillStyle='#ffffff';ctx.fillRect(x+to-1,y,2,5);
   for(let i=0;i<6;i++){const sx=x+a+((i*37+age*3)%Math.max(1,to-a+1)),sy=y-((age*.6+i*5)%12);ctx.globalAlpha=.8-((age*.6+i*5)%12)/15;ctx.fillRect(Math.round(sx),Math.round(sy),1,1);}ctx.restore();}
  // The new bar fills in gold as he lands.
  if(!b.refill||!Number.isFinite(x))return;const bw=160,to=Math.round(bw*b.hp/b.maxhp);
  ctx.save();ctx.fillStyle='#ffc23a';ctx.fillRect(x,y,to,5);ctx.fillStyle='#fff0a6';ctx.fillRect(x,y,to,1);ctx.fillStyle='#fff6cc';ctx.fillRect(x+to-1,y,2,5);ctx.restore();
 },
 operatorPhase(b){toOperator(b);b.x=b.to[0];b.z=0;b.state='idle';b.t=0;b.dialogue=null;},
 onReflectHit(b,s){
  if(b.phase!=='machine')return;
  if(b.rig==='magnet')magnetReflect(b,s);else smashCab(b,SCRAP_SMASH,'THE GLASS');
 },
 drawRiver(ctx,b,camX,splash){drawCutRiver(ctx,b,camX,splash);},
 drawBackFx(ctx,b,camX){drawCutBack(ctx,b,camX);drawHookBack(ctx,b,camX);},
 onDeath(b){
  G.audio.stopRoomLoop?.('dredger_engine',.6);b.finishStarted=!!G.india?.startCinematic?.('dredger-finish',b);
 },
 draw(ctx,b,camX){
  drawCab(ctx,b,camX);
  drawGouges(ctx,b,camX);
  if(b.phase==='machine'){
   const cut=b.state==='cutloose';
   if(b.rig==='magnet'){if(b.state!=='blowout')drawMagnetMarks(ctx,b,camX);drawMagnet(ctx,b,camX);}
   else if(!cut||b.t<CUT.snap){if(b.state!=='blowout')drawMarks(ctx,b,b,camX);drawGrab(ctx,b,b,camX);}
   else if(b.t<CUT.snap+6){const sx=Math.round(b.x-camX);ctx.save();ctx.strokeStyle='#15100c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(sx,-4);ctx.lineTo(sx+((b.t&1)?3:-3),Math.max(0,b.y-b.z-80));ctx.stroke();ctx.restore();}   // the cut cable whips
   if(b.state==='blowout')drawBlowout(ctx,b,camX);
  }
  else{
   if(b.grab&&b.grab.z<300){drawMarks(ctx,b,b.grab,camX);drawGrab(ctx,b,b.grab,camX);}
   if(!b.hideInCab&&b.state!=='incab'){drawHookMarks(ctx,b,camX);drawThekedar(ctx,b,camX);drawHook(ctx,b,camX);drawWrenchToss(ctx,b,camX);}
  }
  if(G.state==='bossintro'){drawIntroGantry(ctx,b,camX);drawGob(ctx,b,camX);}
  if(b.dialogue){const x=b.phase==='machine'?cab().x:b.x,bottom=b.phase==='machine'?cab().y-24:b.y-b.z-b.popH-30;drawDialogue(ctx,{text:b.dialogue.text,x:x-camX,bottom,age:b.dialogue.t,remaining:180-b.dialogue.t});}
 },
};

// ---------------------------------------------------------------- grab life
// Cosmetic, deterministic and paused with play: the bucket swings on its cable when it is hauled about,
// its jaws work through the half-open cell instead of snapping, it drips river muck, scrapes sparks and
// gouges the deck on a scoop, and the dredger's engine coughs smoke as the winch pulls.
const SWAY={k:.012,damp:.9,push:.016,max:.42};
function grabLife(b,g){
 if(!g)return;const s=g===b?b.state:g.state;
 const x=g.x,dx=g.lastX==null?0:x-g.lastX,dz=g.lastZ==null?0:g.z-g.lastZ;g.lastX=x;g.lastZ=g.z;
 const hanging=g.z>4&&!['swingwind','swing','swingout','sweepwind','sweep'].includes(s)&&!(g===b&&b.returnT!=null);
 g.swayV=((g.swayV||0)-(g.sway||0)*SWAY.k-dx*SWAY.push)*SWAY.damp;g.sway=hanging?clamp((g.sway||0)+g.swayV,-SWAY.max,SWAY.max):(g.sway||0)*.7;
 // jaws: a change between shut and open goes through half for a few ticks
 const want=grabCell(b,g),open=n=>n==='open'||n==='dump'?2:n==='half'?1:0;
 if(want!==g.cellNow){if(g.cellNow&&Math.abs(open(want)-open(g.cellNow))===2&&!g.cellMid){g.cellMid=5;}g.cellNow=want;}
 if(g.cellMid>0)g.cellMid--;
 // the winch working: engine smoke when the bucket is hauled up fast
 if(dz>1.6&&G.time%8===0)spawnSmoke(G.camLock+300+((G.time>>3)&1)*6,150,1);
 // a scoop scores the deck: sparks at the lip and a gouge that fades
 if(s==='scoop'&&g===b){if(G.time%3===0)spawnSpark(b.x-b.dir*10,b.y-2);b.gouges=(b.gouges||[]).filter(q=>G.time-q.t<360);if(G.time%2===0)b.gouges.push({x:b.x,y:b.y,t:G.time});}
 muckLife(b,g,s);
}
// ---------------------------------------------------------------- muck
// A bucket that bites the deck comes up full: it splats down in a burst of sludge and river trash, strains
// against the planks while it is stuck, then hauls up pouring a rope of muck that splashes on the boards,
// shedding bits of trash that tumble, bounce and lie there, and leaves sludge puddles that slowly fade.
const MUCK={life:420,bit:300,grav:.32};
const stuckState=s=>s==='stuck',pourState=s=>s==='rip'||s==='rise';
function muckLife(b,g,s){
 const M=g.muck||(g.muck={pools:[],bits:[],n:0});const t=g===b?b.t:g.t,seed=()=>{M.n++;const v=Math.sin(M.n*91.7+g.x*.37)*43758.5;return v-Math.floor(v);};
 const bit=(x,z,vx,vz)=>M.bits.push({x,y:g.y+(seed()-.5)*10,z,vx,vz,i:Math.floor(seed()*6),spin:(seed()-.5)*.5,a:seed()*6,t:G.time,rest:false});
 if(stuckState(s)&&t===1){
  M.pools.push({x:g.x,y:g.y+2,t:G.time,big:true});
  for(let i=0;i<3;i++)bit(g.x+(i-1)*14,8,(i-1)*1.4+(seed()-.5),2.6+seed()*1.6);
 }
 // the strain: a tug on the cable every so often, the planks creak and spit dust
 if(stuckState(s)&&t>10&&t%22===0){spawnDust(g.x+(seed()-.5)*30,g.y,3);G.audio.roomSfx?.('neta_roof_thud',.14);}
 // the pour: heavy for the first stretch of the haul, then thinning; splats where it lands and sheds trash
 if(pourState(s)&&g.z>3&&t<70){
  if(t%7===0)M.pools.push({x:g.x+(seed()-.5)*14,y:g.y+2+(seed()-.5)*4,t:G.time});
  if(t%16===4)bit(g.x+(seed()-.5)*12,g.z-6,(seed()-.5)*1.6,-.4);
 }
 M.pools=M.pools.filter(q=>G.time-q.t<MUCK.life);
 for(const q of M.bits){
  if(q.rest)continue;q.vz-=MUCK.grav;q.z+=q.vz;q.x+=q.vx;q.a+=q.spin;
  if(q.z<=0){q.z=0;if(q.vz<-1.6){q.vz=-q.vz*.32;q.vx*=.5;q.spin*=.5;}else{q.rest=true;q.vz=0;q.restT=G.time;}}
 }
 M.bits=M.bits.filter(q=>!q.rest||G.time-q.restT<MUCK.bit);
}
const muckArt=(n,i)=>getAIFrame('dl_grab',n)?.f[i]||null;
function sprite(ctx,f,x,y,k,{alpha=1,rot=0,anchor='bottom'}={}){
 if(!f)return;const w=frameW(f)*k,h=frameH(f)*k;ctx.save();ctx.globalAlpha*=alpha;ctx.translate(Math.round(x),Math.round(y));if(rot)ctx.rotate(rot);
 ctx.drawImage(f,-w/2,anchor==='bottom'?-h:anchor==='top'?0:-h/2,w,h);ctx.restore();
}
// On the deck, under the actors: puddles (a burst that settles, then fades).
function drawMuckFloor(ctx,g,camX){
 const M=g.muck;if(!M||G.reflecting)return;
 for(const q of M.pools){const a=G.time-q.t,fade=clamp((MUCK.life-a)/90,0,1),x=q.x-camX;
  if(q.big)sprite(ctx,muckArt('muck',a<5?0:a<12?1:2),x,q.y+4,a<5?.5+a*.06:.8,{alpha:fade});
  else sprite(ctx,muckArt('muck',2),x,q.y+2,.26+Math.min(a,30)*.006,{alpha:fade*.9});}
}
// Over the bucket: the stuck strain and the pour, the trash in flight and lying about.
function drawMuck(ctx,b,g,camX,sx,sy){
 const M=g.muck;if(!M||G.reflecting)return;const s=g===b?b.state:g.state,t=g===b?b.t:g.t;
 if(pourState(s)&&g.z>2&&t<90){
  const f=muckArt('pour',(G.time>>2)&3),k=.62,thin=clamp(1-(t-36)/54,0,1);
  if(f){ctx.save();ctx.beginPath();ctx.rect(sx-40,sy-6,80,Math.max(0,g.y-sy+8));ctx.clip();
   // two ropes of it while it is heavy, one thinning strand after
   sprite(ctx,f,sx,sy-8,k*(.55+.45*thin),{alpha:.6+.4*thin,anchor:'top'});ctx.restore();}
  if(t<70)sprite(ctx,muckArt('muck',(G.time>>2)&1),sx,g.y+3,.34*(.6+.4*thin));
 }
 for(const q of M.bits){const f=muckArt('trash',q.i),x=q.x-camX,y=q.y-q.z,fade=q.rest?clamp((MUCK.bit-(G.time-q.restT))/60,0,1):1;
  if(q.z<30)drawContactShadowLite(ctx,x,q.y,4);
  sprite(ctx,f,x,y,.8,{alpha:fade,rot:q.rest?q.a%.6-.3:q.a,anchor:'mid'});}
}
function drawContactShadowLite(ctx,x,y,r){ctx.save();ctx.fillStyle='rgba(0,0,0,.25)';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),r,1.5,0,0,Math.PI*2);ctx.fill();ctx.restore();}
function drawGouges(ctx,b,camX){
 if(!b.gouges?.length||G.reflecting)return;ctx.save();
 for(const q of b.gouges){const a=clamp(1-(G.time-q.t)/360,0,1)*.55;ctx.fillStyle=`rgba(18,10,6,${a})`;ctx.fillRect(Math.round(q.x-camX)-2,Math.round(q.y)+1,5,1);ctx.fillStyle=`rgba(190,170,140,${a*.5})`;ctx.fillRect(Math.round(q.x-camX)-2,Math.round(q.y),5,1);}
 ctx.restore();
}
// Muck dripping off the bowl: drops fall from the lip to the deck, replayed from the clock.
function drawDrips(ctx,g,sx,lip,camX,wet){
 if(!wet||G.reflecting)return;const floor=Math.round(g.y)+1;ctx.save();
 for(let i=0;i<4;i++){const period=34+i*9,ph=(G.time+i*17)%period,x=sx+[-14,-5,7,15][i],y0=lip-2,y=y0+ph*ph*.06;
  if(y<floor){ctx.fillStyle='#3a2a16';ctx.fillRect(x,Math.round(y),1,2);ctx.fillStyle='#8a7048';ctx.fillRect(x,Math.round(y),1,1);}
  else if(y<floor+10){ctx.globalAlpha=.6;ctx.fillStyle='#3a2a16';ctx.fillRect(x-1,floor,3,1);ctx.globalAlpha=1;}}
 ctx.restore();
}
// ---------------------------------------------------------------- drawing
function grabCell(b,g){
 const s=g===b?b.state:g.state;
 if(g===b&&b.returnT!=null)return 'battered';
 if(s==='blowout')return b.landedAt!=null?'wrecked':'battered';
 if(s==='stuck')return 'stuck';
 if(s==='rip')return 'full';
 if(['dropaim','droplock','dropfall','scoop','scoopaim','aim','lock','fall'].includes(s))return s==='dropaim'||s==='aim'?'half':'open';
 if(s==='dump')return 'dump';if(s==='dumpaim')return 'half';
 if(b.phase==='operator')return 'battered';
 return b.hp<b.maxhp*.5?'battered':'closed';
}
const GRAB_K=.78,GRAB_LIP=130,GRAB_TOP=4;  // draw scale; canvas rows (1x) of the closed jaws' lip and the shackle
const LAND_DY=5;   // the open jaws' tips sit this far above the lip row: drawn lower so they bite at the drop ring's centre
const CELL_DROP={stuck:33.5};   // the bitten-in grab's shackle sits this much lower in its cell (1x): the cable runs down to it
const grabArt=n=>getAIFrame('dl_grab',n)?.f[0]||null;
// The grab on its cable at screen (sx, sy = the jaws' lip). The cable runs up to (px, py).
function drawGrabArt(ctx,sx,sy,cell,{px=sx,py=-4,filter='',jolt=0,cueActor=null}={}){
 const f=grabArt(cell),shackle=sy+LAND_DY-(GRAB_LIP-GRAB_TOP)*GRAB_K,ang=px===sx?0:-Math.atan2(sx-px,shackle-py),end=shackle+(CELL_DROP[cell]||0)*GRAB_K;
 ctx.save();ctx.strokeStyle='#15100c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(sx,end);ctx.stroke();
 ctx.strokeStyle='#6a5a48';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+1,py);ctx.lineTo(sx+1,end);ctx.stroke();ctx.restore();
 if(!f){ctx.fillStyle='#4a3a2a';ctx.fillRect(sx-30,sy-58,60,56);return shackle;}
 const w=frameW(f)*GRAB_K,h=frameH(f)*GRAB_K;
 const cue=filter===GRAB_TINT.green?'counter':filter===GRAB_TINT.red?'unblockable':null,y0=-GRAB_TOP*GRAB_K;
 ctx.save();ctx.translate(sx+jolt,shackle);ctx.rotate(ang);if(filter&&!cue)ctx.filter=filter;
 ctx.drawImage(f,-w/2,y0,w,h);
 if(cue)drawAttackAccent(ctx,f,-w/2,y0,cueActor,cue,w,h);
 ctx.restore();return shackle;
}
// Cue tokens for the grab renderer.
const GRAB_TINT={green:'counter',red:'unblockable'};
export function dredgerGrabWarning(b,g){
 const s=g===b?b.state:g.state,pat=g===b?b.pattern:['aim','lock','fall'].includes(s)?'grabcall':b.pattern;
 const on=g===b?(['swingwind','dropaim','droplock','scoopaim','dumpaim'].includes(s)||s==='swing'&&!b.hitLanded)&&!(s==='dropaim'&&b.t<8):['aim','lock'].includes(s);
 return {on,cls:isGreen(pat)?'counter':'unblockable'};
}
function drawGrab(ctx,b,g,camX){
 const s=g===b?b.state:g.state,sx=Math.round(g.x-camX),sy=Math.round(g.y-g.z);
 if(g.rig==='magnet'){
  // The shorted magnet he still calls down: it sparks back to life (charged) for a drop.
  const live=['aim','lock','fall','sweepwind','sweep'].includes(s),warn=dredgerGrabWarning(b,g);
  const top=drawMagnetArt(ctx,sx,sy,live?1:2,{cue:warn.on?warn.cls:null,cueActor:g});
  if(warn.on&&!G.reflecting&&!['aim','lock'].includes(s))drawAttackMarker(ctx,warn.cls,sx,top-10,g);
  if(!live&&G.time%23===0&&s!=='dead')spawnSpark(g.x+((G.time*13)%40)-20,g.y-g.z-10);
  return;
 }
 // The boom sits above the arena middle; a swing hangs the cable off it at an angle.
 const swinging=g===b&&['swingwind','swing','swingout'].includes(s)&&b.returnT==null;
 const pat=g===b?b.pattern:['aim','lock','fall'].includes(s)?'grabcall':b.pattern;
 const cue=dredgerGrabWarning(b,g).on;
 const jolt=b.superLocked&&g===b||b.flash>0&&g===b?((G.time>>1)&1?1:-1):0;
 const filter=cue?GRAB_TINT[isGreen(pat)?'green':'red']:b.flash>0&&g===b?'brightness(1.3)':'';
 const cell=g.cellMid>0?'half':grabCell(b,g),swayX=swinging?0:Math.round(Math.sin(g.sway||0)*(sy+4));
 // stuck: every so often the cable tugs it, lifting the bowl a pixel or two and rocking it, and it sinks back
 const st=g===b?b.t:g.t,tug=s==='stuck'&&st>10?st%22:99,lift=tug<5?[1,2,2,1,0][tug]:0,rock=tug<5?(tug&1?1:-1):0;
 const shackle=drawGrabArt(ctx,sx,sy-lift,cell,{px:swinging?Math.round((L()+R())/2-camX):sx-swayX,py:swinging?-70:-4,filter,jolt:jolt||rock,cueActor:g});
 drawMuck(ctx,b,g,camX,sx,sy);
 drawDrips(ctx,g,sx,sy,camX,['full','dump','stuck','battered','wrecked'].includes(cell)||b.hp<b.maxhp*.6);
 if(cue&&!G.reflecting&&!['dropaim','droplock','aim','lock'].includes(s))drawAttackMarker(ctx,dredgerGrabWarning(b,g).cls,sx,shackle-10,g);
}
function drawMarks(ctx,b,g,camX){
 const s=g===b?b.state:g.state,x=Math.round(g.x-camX),y=Math.round(g.y);
 // shadow: always, so the height reads
 if(g.rig!=='magnet')drawMuckFloor(ctx,g,camX);
 const k=clamp(1-g.z/120,.25,1);
 ctx.save();ctx.fillStyle=`rgba(0,0,0,${.18+.25*k})`;ctx.beginPath();ctx.ellipse(x,y,30*k+8,7*k+2,0,0,Math.PI*2);ctx.fill();
 if(['dropaim','droplock','dropfall','aim','lock','fall','dumpaim'].includes(s)){
  const lock=s==='droplock'||s==='lock'||s==='dropfall'||s==='fall';
  ctx.globalAlpha=lock?((G.time>>2)&1?.95:.45):.55;ctx.strokeStyle='#ff4050';ctx.lineWidth=1;
  ctx.beginPath();ctx.ellipse(x,y,38,16,0,0,Math.PI*2);ctx.stroke();
  ctx.globalAlpha*=.35;ctx.fillStyle='#ff4050';ctx.fill();
 }
 ctx.restore();
 if(s==='scoopaim'||s==='scoop'){
  const k2=s==='scoop'?1:clamp(b.t/30,0,1),x0=b.dir>0?g.x-camX:L()-camX-20,x1=b.dir>0?R()-camX+20:g.x-camX;
  hazardLane(ctx,x0,x1,b.lockY,b.dir,k2,false,b.t);
 }
 if(s==='sweepwind'||s==='sweep'&&g.t<6){
  const k2=clamp(g.t/40,0,1),half=(R()-L())*SWING_REACH+28,mid=(L()+R())/2-camX;
  hazardLane(ctx,mid-half,mid+half,g.lockY,g.dir,s==='sweep'?1:k2,false,g.t);
 }
 if(s==='swingwind'){
  // Only the low middle of the pendulum arc can connect (z<34), so only that stretch is marked.
  const k2=clamp(b.t/40,0,1),half=(R()-L())*SWING_REACH+28,mid=(L()+R())/2-camX;
  hazardLane(ctx,mid-half,mid+half,b.lockY,b.dir,k2,true,b.t);
 }
}
// Floor-projected warning on the deck: a soft shadow growing along the grab's path, a strip of worn
// hazard paint (amber and black diagonals, soft ends) and chevrons in the cue colour (green: parry it,
// red: get out) marching the way the grab will travel. Drawn on the grab's lane, lifted to y 233 at most so
// the band (and its arrows) stay clear of the boss name and bar (y 243+); drawn with the boss, so the
// bottom foreground railing still covers it.
const HAZARD={green:['#7dff8c','#1c5a24'],red:['#ff5a3c','#6a140c']};
function hazardLane(ctx,x0,x1,ly,dir,k,green,t){
 const w=x1-x0;if(w<=4||G.reflecting)return;   // paint on the deck: no mirrored copy in the floor-reflection pass
 const cy=Math.round(Math.min(ly,233)),fade=x=>clamp(Math.min(x-x0,x1-x)/22,0,1),[hot,deep]=HAZARD[green?'green':'red'];
 const pulse=.8+.2*Math.sin(t*.35);
 ctx.save();
 // The grab's shadow, spreading along the path as it winds up.
 const sg=ctx.createRadialGradient(0,0,0,0,0,1);sg.addColorStop(0,`rgba(8,4,2,${.42*k})`);sg.addColorStop(.7,`rgba(8,4,2,${.25*k})`);sg.addColorStop(1,'rgba(8,4,2,0)');
 ctx.save();ctx.translate((x0+x1)/2,cy);ctx.scale(w/2*(.55+.45*k),9);ctx.fillStyle=sg;ctx.fillRect(-1,-1,2,2);ctx.restore();
 // Hazard paint: slanted stripes in a thin band, dithered by alternating rows, fading at both ends.
 for(let x=Math.floor(x0/8)*8;x<x1;x+=8){
  const a=fade(x+4)*(.2+.25*k)*pulse;if(a<=.02)continue;
  for(let r=-3;r<3;r++){const y=cy+r,xx=x+(r+3)*.5;
   ctx.globalAlpha=a*(r&1?.7:1);ctx.fillStyle='#e8a428';ctx.fillRect(xx,y,4,1);
   ctx.globalAlpha=a*.8*(r&1?.7:1);ctx.fillStyle='#1a120c';ctx.fillRect(xx+4,y,4,1);}
 }
 ctx.globalAlpha=1;
 for(let x=x0+4;x<x1-4;x+=2){const a=fade(x)*(.45+.3*k);ctx.fillStyle=`rgba(20,12,8,${a})`;ctx.fillRect(x,cy-4,2,1);ctx.fillRect(x,cy+3,2,1);}
 // Arrowheads in the cue colour, a bright wave running the way the grab will travel: whole-pixel rows (a 7-row
 // head, 2 px strokes) with a dark drop behind, so they read as arrows at 1x rather than antialiased squiggles.
 const step=16,d=dir<0?-1:1;
 const head=(x,y,col)=>{ctx.fillStyle=col;for(let r=-3;r<=3;r++)ctx.fillRect(Math.round(x+(3-Math.abs(r))*d)-1,y+r,2,1);};
 for(let x=x0+10;x<x1-6;x+=step){
  const f=fade(x);if(f<=.05)continue;
  const wave=Math.max(0,Math.cos(((x-x0)*d-t*1.6)/step*1.2)),a=f*(.3+.35*k+.35*wave*k);
  ctx.globalAlpha=a;head(x-d,cy+1,deep);head(x-d*2,cy,deep);head(x,cy,wave>.7?'#fff4d0':hot);
 }
 ctx.restore();
}
// The intro in the cab: levers, a gob out of the window, jeers, then the lever that drops the grab.
// cabx busts: 0 smug, 1 exhale, 2 lever grip, 3 lever yank, 4 point, 5 laugh, 6 furious, 7 flinch,
// 8 walkie, 9 grin, 10 wave, 11 spit. Without them, the old full-figure cab frames.
const CABX_OLD=[['cabmood',0],['cabmood',1],['cab',2],['cab',1],['cab',3],['cabmood',2],['cabjeer',0],['cab',3],['cabmood',3],['cabmood',2],['cabjeer',1],['cabmood',1]];
const cx=i=>getAIFrame('dl_thekedar','cabx')?['cabx',i]:CABX_OLD[i];
function introCabPose(t){
 if(t<INTRO.out)return cx(t<12?0:t<24?1:t<30?9:2);
 if(t<INTRO.back+12)return null;  // out on the gantry
 if(t<INTRO.drop+6)return cx(t<INTRO.drop-4?2:3);
 return cx(t<236?((t>>3)&1?5:9):t<262?4:(t>>4)&1?10:9);
}
// Out on the gantry in front of his cab, at full size: the spit, the jeers under his name.
function introGantryPose(t){
 if(t<INTRO.out||t>=INTRO.back+12)return null;
 const {x,cab:door}=GANTRY;
 if(t<INTRO.out+12){const q=(t-INTRO.out)/12;return {x:door+(x-door)*q,face:-1,pose:['walk',Math.floor(t/3)%8]};}
 if(t>=INTRO.back){const q=(t-INTRO.back)/12;return {x:x+(door-x)*q,face:1,pose:['walk',Math.floor(t/3)%8]};}
 if(!getAIFrame('dl_thekedar','reveal')){const pose=t<INTRO.spit+8?['jeer',1]:t<120?((t>>4)&1?['jeer',0]:['taunt',0]):['gloat',0];return {x,face:-1,pose};}
 // reveal: 0 hawk, 1 spit, 2 point-shout, 3 wrench shake, 4 cackle, 5 beckon; a bob or a tremble on the held ones.
 if(t<INTRO.spit)return {x,face:-1,pose:['reveal',0],dy:t>=INTRO.out+16&&(t>>1)&1?1:0};
 if(t<66)return {x:x-1,face:-1,pose:['reveal',1]};
 if(t<100)return {x,face:-1,pose:['reveal',2],dy:(t>>3)&1};
 if(t<126)return {x:x+((t>>1)&1),face:-1,pose:['reveal',3]};
 if(t<150)return {x,face:-1,pose:['reveal',4],dy:(t>>2)&1};
 return {x,face:-1,pose:['reveal',5],dy:(t>>4)&1};
}
function drawIntroGantry(ctx,b,camX){
 const g=introGantryPose(b.introT||0);if(!g)return;
 const f=getFrame(b.set,g.pose[0],g.pose[1],g.face);if(!f)return;
projectedActor(ctx,f,G.camLock+g.x-camX,GANTRY.y+(g.dy||0),CAB_SCALE);
}
function cabPose(b){
 if(G.state==='bossintro')return introCabPose(b.introT||0);
 if(b.phase!=='machine'&&b.state!=='incab')return null;  // he is down on the deck
 if(b.state==='cutloose')return cx(b.t<CUT.lever?6:b.t<CUT.snap+6?((G.time>>3)&1?3:2):b.t<CUT.banner?((G.time>>4)&1?4:9):5);
 if(b.state==='blowout')return cx(b.t<BLOW.rage?7:b.t<BLOW.kick?((b.t>>3)&1?6:4):3);
 if(since(b,'cabHitAt')<34)return cx(7);
 if(b.state==='incab')return cx(b.t<12?2:(G.time>>3)&1?3:2);
 if(b.phase!=='machine')return null;
 if(['dropaim','droplock','scoopaim','dumpaim','swingwind'].includes(b.state))return cx(b.state==='droplock'?4:2);
 if(['swing','dropfall','scoop','dump','rip'].includes(b.state))return cx((G.time>>3)&1?3:2);
 if(b.state==='stuck')return cx((G.time>>4)&1?6:3);
 if(b.state==='crewcall')return cx(8);
 // laughing whenever CHAD is on the floor; otherwise smoking, gloating, waving him on, barking orders
 if(['down','getup'].includes(G.player.state))return cx((G.time>>3)&1?5:9);
 return cx([0,1,0,9,0,10,1,8][(G.time>>6)&7]);
}
function drawCabEntry(ctx,b,camX){
 const e=b.cabEntry,q=smooth(clamp(b.t/CAB_ENTRY_TICKS,0,1));
 const start=headOffset(CLIMB_HEAD[e.idx],e.k),end=headOffset(CAB_HEAD[e.seatedIdx],CAB_SCALE);
 const hx=e.x+start[0]+(cab().x+end[0]-e.x-start[0])*q;
 const hy=e.y+start[1]+(CAB_SOLE+end[1]-e.y-start[1])*q;
 const climbing=b.t<CAB_ENTRY_TICKS/2,k=e.k+(CAB_SCALE-e.k)*q;
 const f=getFrame(SPR.dl_thekedar,climbing?'climb':'cab',climbing?e.idx:e.seatedIdx,climbing?1:-1);
 if(!f)return;
 const a=headOffset(climbing?CLIMB_HEAD[e.idx]:CAB_HEAD[e.seatedIdx],k),left=G.camLock+326-camX;
 ctx.save();ctx.beginPath();ctx.rect(0,0,W,H);
 // The operator can be seen outside the housing and through its window, as he steps in.
 ctx.rect(left,0,52,124);ctx.rect(left+7,60,45,23);ctx.clip('evenodd');
 projectedActor(ctx,f,hx-a[0]-camX,hy-a[1],k);ctx.restore();
}
// The cab glass over him: a warm sunset cast, darker at the top, and a slow sheen sliding across.
const CABX={x:6,bottom:96};
function glass(ctx,x,y,w,h){
 const g=ctx.createLinearGradient(0,y,0,y+h);g.addColorStop(0,'rgba(40,18,14,.38)');g.addColorStop(.5,'rgba(255,150,80,.10)');g.addColorStop(1,'rgba(255,190,120,.16)');
 ctx.fillStyle=g;ctx.fillRect(x,y,w,h);
 const s=(G.time*.35)%(w+60)-30;ctx.fillStyle='rgba(255,236,200,.13)';ctx.beginPath();ctx.moveTo(x+s,y);ctx.lineTo(x+s+9,y);ctx.lineTo(x+s-3,y+h);ctx.lineTo(x+s-12,y+h);ctx.fill();
 ctx.fillStyle='rgba(255,236,200,.08)';ctx.beginPath();ctx.moveTo(x+s+13,y);ctx.lineTo(x+s+16,y);ctx.lineTo(x+s+4,y+h);ctx.lineTo(x+s+1,y+h);ctx.fill();
}
function drawCab(ctx,b,camX){
 const c=cab(),x=Math.round(c.x-camX),pose=cabPose(b),entering=b.state==='incab'&&b.cabEntry&&b.t<CAB_ENTRY_TICKS;
 if(entering)drawCabEntry(ctx,b,camX);
 ctx.save();ctx.beginPath();ctx.rect(G.camLock+326-camX,58,52,40);ctx.clip();
 if(pose&&!entering){
  // Seated at his levers behind the glass, at the size he fights at: head and shoulders show
  // above the dashboard.
  const f=getFrame(SPR.dl_thekedar,pose[0],pose[1],-1);
  if(f){ctx.save();ctx.beginPath();ctx.rect(G.camLock+333-camX,60,52,23);ctx.clip();
   if(pose[0]==='cabx'){
    // A bust: head centred on the seat, its chest cut hidden under the sill; it bobs with the engine.
    const w=frameW(f),h=frameH(f),bob=b.phase==='machine'&&(G.time>>3)%4===0?1:0;blit(ctx,f,Math.round(x+CABX.x-w/2),CABX.bottom-h+bob,w,h);
   }else projectedActor(ctx,f,x,CAB_SOLE,CAB_SCALE);
   glass(ctx,G.camLock+333-camX,60,52,23);ctx.restore();}
 }
 if(b.glass<3&&b.phase==='machine'&&b.state!=='blowout'){   // after the blowout the rig art shows the smashed cab
  ctx.strokeStyle='rgba(230,245,255,.85)';ctx.lineWidth=1;
  for(let i=0;i<Math.round((GLASS-b.glass)*2.5);i++){const a=i*2.4+.3,r=7+(i%4)*5;ctx.beginPath();ctx.moveTo(x,c.y);ctx.lineTo(x+Math.cos(a)*r,c.y+Math.sin(a)*r*.7);ctx.stroke();}
  if(b.glass<=0&&!pose){ctx.fillStyle='rgba(12,8,8,.78)';ctx.fillRect(x-24,c.y-14,48,26);}  // the empty, smashed cab
 }
 ctx.restore();
}
// The intro gob: out of the cab window in an arc to the deck at CHAD's feet, then a splat.
function drawGob(ctx,b,camX){
 const e=(b.introT||0)-INTRO.spit;if(e<0||e>=INTRO.gob+40)return;
 const x0=G.camLock+GANTRY.x-10*CAB_SCALE,y0=GANTRY.y-74*CAB_SCALE,x1=G.player.x+22,y1=G.player.y+2;
 ctx.save();
 if(e<INTRO.gob){const q=e/INTRO.gob,x=x0+(x1-x0)*q,y=y0+(y1-y0)*q*q-38*Math.sin(q*Math.PI)*(1-q);
  ctx.fillStyle='#6a6a3a';ctx.fillRect(Math.round(x-camX)-1,Math.round(y)-1,3,2);ctx.fillStyle='#c8c890';ctx.fillRect(Math.round(x-camX)-1,Math.round(y)-1,1,1);}
 else{ctx.globalAlpha=clamp(1-(e-INTRO.gob)/40,0,1)*.8;ctx.fillStyle='#5a5a30';ctx.beginPath();ctx.ellipse(Math.round(x1-camX),Math.round(y1),5,1.6,0,0,Math.PI*2);ctx.fill();}
 ctx.restore();
}
function thekPose(b){
 const t=b.t,s=b.state;
 if(b.dead||s==='dying')return ['down',0];
 if(s==='stagger'||b.protectedStagger>0){
  if(since(b,'crushedAt')<124)return ['crushed',0];
  if(since(b,'tangledAt')<126)return ['hook',7];
  if(since(b,'hookStuckAt')<96)return ['hook',5];
  if(since(b,'blindAt')<104)return ['sandblind',(G.time>>4)&1];
  if(since(b,'stuckAt')<96)return ['stuck',0];
  const d=dazePose(b);return [d.name,d.idx];
 }
 const hp=hookPose(b);if(hp)return hp;
 if(s==='leap')return ['leap',0];
 if(s==='down'&&b.z>4&&since(b,'pluckedAt')<60)return ['falloff',0];
 if(s==='down')return [b.z>4&&getAIFrame('dl_thekedar','fall')?'fall':'down',0];
 if(s==='flinch')return ['flinch',t<14?0:1];
 if(s==='scurry')return ['walk',Math.floor(G.time/5)%8];
 if(s==='climb')return ['climb',Math.floor(t/10)%4];
 if(s==='getup')return ['getup',Math.min(3,b.t>>2)];
 if(s==='taunt')return t<20?['jeer',0]:t<34?['jeer',1]:['taunt',0];
 if(s==='backstep')return ['block',0];
 if(s==='land')return ['land',0];
 if(s==='hurt')return ['hurt',b.hurtHigh===false?1:0];
 if(b.guardFlash>0&&['idle','windup'].includes(s))return ['block',0];
 if(s==='windup')return b.pattern==='sack'?['sack',0]:['wrench_string',0];
 if(s==='wrench'){
  // wrench_string: wind, mid-swing, swing, follow-through, haul-up, overhead, mid-slam, slam.
  const W=WRENCH,i=t<W.swing-8?1:t<W.swing+2?2:t<W.raise[0]+4?3:t<W.raise[0]+12?4:t<W.slam-5?5:t<W.slam?6:t<W.slam+10?7:-1;
  return i>=0?['wrench_string',i]:t<W.slam+26?['wobble',0]:['winded',0];
 }
 if(s==='sack')return t<6?['sack_release',0]:['sack',1];
 if(s==='call'||s==='crewcall')return ['call',(t>>3)&1];
 if(s==='gloat'){const g=b.grab,p=G.player;if(g&&(g.state==='lock'||g.state==='fall')&&Math.abs(b.x-g.x)<44)return ['cower',0];return b.moved>.2?['walk',Math.floor(b.stridePhase/6)%8]:['gloat',0];}
 if(s==='victory')return ['victory',0];
 if(b.moved>.1)return ['walk',Math.floor(b.stridePhase/6)%8];
 // Breathing, then now and again a cough or a spit (fidget) between attacks.
 const c=G.time%300;if(c>=200&&c<236)return ['fidget',0];if(c>=236&&c<262)return ['fidget',1];
 return ['idle',(G.time>>5)&1];
}
// Poses with no hook-holding edit borrow the nearest one that has it, so the discarded wrench never comes back.
const HOOK_ALIAS={cower:'flinch',crushed:'down'};
function drawThekedar(ctx,b,camX){
 // The overhead trembles in his thin arms.
 const shake=b.state==='wrench'&&b.t>=WRENCH.raise[0]&&b.t<WRENCH.slam?((G.time>>1)&1)*(b.t>=WRENCH.slam-14?2:1):0;
 const [p0,idx]=thekPose(b),hooked=b.hookArt||b.hook,pn=hooked&&!getAIFrame('dl_thekedar',p0+'_h')&&HOOK_ALIAS[p0]||p0,name=hooked&&getAIFrame('dl_thekedar',pn+'_h')?pn+'_h':pn,f=getFrame(b.set,name,idx,b.face),x=Math.round(b.x-camX)+shake,y=Math.round(b.y-b.z);
 const hc=hookCue(b),cue=dredgerCueOn(b)||!!hc;
 if(b.state==='hookclimb'||b.state==='hooktoss'||b.state==='hookswing'){projectedActor(ctx,f,x,y,rearScale(b.z,LADDER_TOP));return;}
 if(b.state==='climb'||b.state==='leap'||b.state==='down'&&b.z>4&&since(b,'pluckedAt')<60){
  const k=rearScale(b.z,b.state==='leap'?(b.from?.[1]||76):LADDER_TOP);
  let cx=b.state==='climb'?G.camLock+398-camX-CLIMB_GRIP[idx]*k:x,cy=y;
  if(b.state==='leap'&&b.cabLeapHead&&b.t<8){
   const a=headOffset(b.cabLeapHead,k),l=headOffset(LEAP_HEAD,k),q=1-smooth(b.t/8);
   cx+=(a[0]-l[0])*q;cy+=(a[1]-l[1])*q;
  }
  projectedActor(ctx,f,cx,cy,k);return;
 }
 blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,cue,hc||undefined);
 if(cue)drawCueMarker(ctx,b,x,y-b.popH,hc||undefined);
}
export {REST as DREDGER_REST};
bindMagnet({sound,line,cab,L,R,park:PARK,lane,floor:OPERATOR_FLOOR,smashSmall(b){spawnSpark(b.x,b.y-b.z-30);G.audio.sfx('armor');b.componentApplying=true;b.hurt(SCRAP_SMASH,1,true,false);b.componentApplying=false;}});
bindHook({sound,line,cab,ladder:LADDER,ladderTop:LADDER_TOP,rearScale:z=>rearScale(z,LADDER_TOP),hazardLane});
