// Netaji and Shera: the Night Train's final boss duo. Every move has one answer.
// PRIVATE CARRIAGE - Shera (113 px) fights; Netaji never lays a finger on CHAD. He hangs back, heckles and pays.
//  Shera blocks jabs from the front and shrugs off hits mid-attack (super armour). Punish windows:
//   count  - after every string he stops to count his fee (full damage, but no knockdown)
//   pound  - two plain hooks (guard, or deflect: he doesn't flinch) into an overhead hammer (green: parry it)
//   rush   - red bull rush; sidestep and he ploughs into the wall or the luggage, dazed
//   quake  - red flexing leap; jump the shockwave, then hit him while he kneels
//   hug    - red bear hug (beats guard and parry): jump or change lane; a whiff leaves his back open
//   palm   - three lights in an opening (two enraged) and he catches the fourth and headbutts: end on a heavy
//  He only goes down to a parry riposte, a crash, a guard break, a reflected trunk or a DENIED bonus, and he
//  shoves CHAD off as he gets up.
//  BONUS: every so often Netaji calls "SHERA! BONUS!", waddles up behind him and slaps a bundle into his palm;
//   Shera turns his back on CHAD to take it. Hit Shera before he closes his hand and the bundle flies (DENIED:
//   a stagger he can be floored out of); miss it and he is PAID for 9 s - gold, armour between strings, faster,
//   no counting - until he is floored or crashes (PAY CUT).
//  At 50% Netaji has had enough ("USELESS! YOU'RE FIRED, SHERA!") and climbs out by the ladder; Shera turns
//  UNPAID: red, faster, no counting, plus the chain sweep (jump it) and the luggage hurl (parry it back).
// ROOF - Netaji alone: backpedals, fires single shots (red), CLICK and reloads every 3 (punish), briefcase
//  swing (green), grit in the eyes (red), shove (green), and a begging bribe that is a fake-out: hit him while
//  he kneels (REFUSED) or parry the flung cash back into his face, then the pistol-whip (green). Four hits in
//  a row trip him.
import {G,W,clamp,diff,laneMin,laneMax,addScore,fall} from './engine.js';
import { GREEN_WARNING_TICKS, greenWind } from './combat_readability.js';
import {SPR,getFrame,blit,frameW,frameH,drawTextShadow,textWidth} from './sprites.js';
import {spawnDust,spawnSpark,spawnPop,spawnRing,spawnShock,screenFlash} from './effects.js';
import {hasAIState} from './aiframes.js';
import {gradeDamage} from './grading.js';
import {hurtPlayer,grabPlayer,PARRY_WINDOW,boxingVictimPose} from './player.js';
import {spawnShot} from './shots.js';
import {spawnEnemy} from './enemies.js';
import {tryHitPlayer,blitTelegraph,drawCueMarker} from './bosslib.js';
import {startTrainCinematic,markSheraCheckpoint} from './train.js';
import {ASSETS} from './assets.js';
import {dazePose,drawDazeRing} from './daze.js';
import {aura} from './finisher_fx.js';
import {drawFightProps} from './train_conductor.js';
import {drawDialogue,updateDialogue,dialogueLife} from './room_dialogue.js';

// Shera stands 113 px (~1.2x CHAD): reach, anchors and the quake follow the art.
const ROOF_HP=320,PAID_TICKS=540,DOWN_TICKS=70,DOWN_RAGE=50,COUNT_TICKS=70,QAIR=44,QRX=61,QRY=18,QARC=72,SPAM_LOCK=44,WHIFF_LOCK=26;
// On the back lip of the roof (the walkable band is 181-220): nobody can step behind them.
const ROOF_PROPS=()=>[{x:8835,y:182,roof:true},{x:9060,y:182,roof:true}];
const MUZZLE=[44,66];
// Intro beats (ticks): Netaji's line from 100, Shera's from 369 (flex), hand-off at 590.
const INTRO={lines:[['neta',100,'SHERA! TEACH HIM OUR RATES.'],['shera',369,'FIVE HUNDRED A PUNCH.']],flex:369,end:590};
const sgn=v=>v<0?-1:1;
const app=b=>b.superApplying||b.parryApplying||b.counterApplying;

// ---- props strip: 16 slots of 128px at 2x ------------------------------------------------------
// 0-2 cash bricks, 3 medal note, 4 rupee pendant, 5 loafer (unused), 6-7 briefcase, 8 revolver, 9 knuckles,
// 10 vest scrap, 11 torn note, 12-13 shades, 14 garland heap, 15 casing
export function netaProp(ctx,i,x,y,size,rot=0,alpha=1){
 const im=ASSETS.nr_neta_props;if(!im||alpha<=0)return;
 ctx.save();ctx.globalAlpha*=alpha;ctx.translate(Math.round(x),Math.round(y));if(rot)ctx.rotate(rot);
 ctx.drawImage(im,i*128,0,128,128,-size/2,-size/2,size,size);ctx.restore();
}
function drawFrame(ctx,set,state,idx,x,y,face,filter){
 const f=getFrame(set,state,idx,face);if(!f)return;
 if(filter){ctx.save();ctx.filter=filter;}
 blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));
 if(filter)ctx.restore();
}
function shadow(ctx,x,y,r){if(G.reflecting)return;ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),r,r*.3,0,0,Math.PI*2);ctx.fill();}

// ---- speech (room_dialogue frame; one line at a time) --------------------------------------------
// Every quip is typed at two ticks a letter, then held long enough to read before its 20-tick fade:
// scripted lines 3 ticks a letter + 90 after the type-on (5c+110), barks (14 letters at most) 60 + the fade.
const lineLife=dialogueLife;
const barkLife=text=>2*text.length+90,SAY_GAP=24;
// Quips queue one at a time, 24 ticks apart, and never start over a red tell; a bark that waits too
// long is dropped (a late "OW! BOSS!" reads as a non sequitur). urgent: cuts in (the bribe).
function say(b,who,text,{life,wait=45,urgent=false}={}){
 const q={who,text,life:life||barkLife(text),wait,age:0};b.sayQ||=[];
 if(urgent){b.speech={...q,age:0};b.sayQ=[];b.sayGap=0;return;}
 if(b.speech?.text===text||b.sayQ.some(o=>o.text===text))return;
 b.sayQ.push(q);
}
function redTell(b){
 if(b.phase===1)return b.state==='windup'&&b.pattern!=='pound'||b.state==='bullrush'||b.state==='quake'&&b.t<QAIR;
 return b.state==='windup'&&['shot','grit'].includes(b.pattern)||b.state==='shot'&&b.t<25;
}
function tickSpeech(b){
 const s=b.speech;
 if(s){s.age++;updateDialogue(s.text,s.age,{remaining:s.life-s.age});if(s.age>=s.life){b.speech=null;b.sayGap=SAY_GAP;}return;}
 if(b.sayGap>0){b.sayGap--;}
 b.sayQ=(b.sayQ||[]).filter(q=>++q.age<=q.wait);
 if(!b.sayGap&&b.sayQ.length&&!redTell(b)){const q=b.sayQ.shift();b.speech={...q,age:0};}
}
function drawSpeech(ctx,b,camX){
 // Never in the glossy-floor reflection pass: on the roof the mirrored copy landed on screen as a second,
 // upside-down bubble under the speaker (neta_roof_check.cjs).
 const s=b.speech;if(!s||G.reflecting)return;const o=s.who==='neta'?b.ally||b:b;
 // Above the speaker, and in the carriage always above Shera's head and his cue marker, so the bubble
 // never covers a face or a tell.
 const bottom=b.phase===1?Math.min(o.y-o.z-92,b.y-b.z-b.h-20):o.y-o.z-(o===b?b.popH+8:92);
 drawDialogue(ctx,{text:s.text,x:o.x-camX,bottom,age:s.age,remaining:s.life-s.age,width:170});
}
// System callouts (mechanics, not characters) stay pops: longer lived and stacked clear of each other.
const sysPop=(x,y,text)=>spawnPop(x,y,text,{life:70,stack:true});

// ---- loose notes (medals, denied bundles) ---------------------------------------------------------
function burstNotes(b,x,y,z,n,dir=0){
 for(let i=0;i<n;i++){const k=(b.noteSeed=(b.noteSeed||7)*1103515245+12345>>>0)/4294967296;
  b.notes.push({x,y:y+((i*5)%9)-4,z,vx:(dir||(i%2?1:-1))*(.6+k*1.8),vz:1.6+((i*37)%10)*.22,spin:k*6,t:0,kind:i%3?11:3});}
}
function updateNotes(b){
 for(const q of b.notes){q.t++;if(q.z>0||q.vz>0){q.x+=q.vx;q.vx*=.97;q.z+=q.vz;q.vz=Math.max(-1.1,q.vz-.1);if(q.z<=0){q.z=0;q.vz=0;}}}
 b.notes=b.notes.filter(q=>q.t<150);
}
function drawNotes(ctx,b,camX){
 for(const q of b.notes){const a=q.t>110?(150-q.t)/40:1,rest=q.z<=0;netaProp(ctx,q.kind,q.x-camX,q.y-q.z-3,11,rest?q.spin*.3:q.spin+q.t*.25*sgn(q.vx),a);}
}

// ---- bullets and grit (roof; drawn by shots.js through s.draw) ------------------------------------------
function bulletDraw(ctx,s,sx,sy){
 const y=sy-(s.hy||60),d=sgn(s.vx);
 ctx.fillStyle='#fff6c8';ctx.fillRect(sx-3,y,7,1);ctx.fillStyle='#ffb347';ctx.fillRect(sx-d*10,y,7,1);ctx.fillStyle='rgba(255,180,90,.45)';ctx.fillRect(sx-d*18,y,8,1);
}
function gritDraw(ctx,s,sx,sy){
 // A fistful of road grit: a pale dust cloud with coarse grains, readable against the roof.
 const a=clamp(1-s.t/s.life,.25,1),y=sy-58,r=7+Math.min(9,s.t*.35);ctx.save();ctx.globalAlpha=a*.55;
 ctx.fillStyle='#d8c49a';ctx.beginPath();ctx.ellipse(sx,y,r,r*.55,0,0,Math.PI*2);ctx.fill();ctx.globalAlpha=a;
 for(let i=0;i<22;i++){const k=(i*53+s.t*3)%29,ox=((i*17)%23-11)*(1+s.t*.03),oy=(k%13)-6;ctx.fillStyle=['#5a4632','#a88c64','#f0e2c0'][i%3];ctx.fillRect(Math.round(sx+ox),Math.round(y+oy),i%4?2:3,i%3?1:2);}
 ctx.restore();
}
function cashShotDraw(ctx,s,sx,sy){netaProp(ctx,1,sx,sy-(s.hy||56),18,s.t*.35*sgn(s.vx));}
function fire(b,src,x,y,face,dmg,hy){
 const s=spawnShot('bullet',x,y,face*6.6,dmg,{source:src,parryClass:'unblockable'});s.draw=bulletDraw;s.hy=hy;s.life=90;
 G.audio.sfx('pistol');G.shake=Math.max(G.shake,1);spawnSpark(x,y-hy);return s;
}

// ---- the politician in phase one (a G.props actor: y-sorted, draws itself; decor, so nothing hits him) --
// He never touches CHAD: he hangs BACK px behind Shera (on the side away from CHAD, up at the back of the
// carriage), heckles, and every so often pays Shera a BONUS. The hand-off mirrors the intro: Netaji an arm's
// length (PAY.gap) off, slapping the bundle into Shera's open palm (PALM, belt height).
const BACK=112,PALM=[57,79];
// Hand-off clock (Shera's 'bonus' state): he turns (0-8), opens his palm (8), the bundle lands (PAY.slap-PAY.grab),
// he closes his hand on it (PAY.close: PAID) and pockets it (PAY.end). Netaji's first bonus comes ~11 s in, then
// one every ~15 s after the last one ends, and he gives up on a walk-up Shera is too busy for after PAY.wait.
const PAY={gap:83,turn:8,slap:14,grab:22,close:34,end:46,first:660,every:900,wait:240,stagger:45};
// Heckles: one list per occasion, each cycled in order so no line repeats back to back; at most one every
// HECKLE_GAP ticks and never over a line already on screen or queued.
const HECKLE={idle:['HIT HIM, SHERA!','EVERYONE HAS A PRICE!','BREAK HIS FACE!','SHOW HIM OUR RATES!'],
 gloat:["THAT'S FIVE HUNDRED!",'ADD IT TO HIS BILL!','PAY UP, HERO!'],nag:['GET UP! I PAY YOU!','ON YOUR FEET, SHERA!']};
const HECKLE_SFX={idle:'neta_heckle',gloat:'neta_gloat',nag:'neta_heckle'},HECKLE_GAP=420,FIRED="USELESS! YOU'RE FIRED, SHERA!",FIRE_T=30;
function makeNeta(b){
 const n={kind:'neta',hidden:true,decor:true,broken:false,dead:false,x:b.x+BACK,y:laneMin(b.x+BACK)+2,z:0,vx:0,vz:0,w:42,h:84,shadowR:16,
  face:-1,st:'back',clock:0,flash:0,t:0,shakeT:0,payCd:PAY.first,heckleCd:240,lines:{},moved:0,stride:0,
  hurt(){},thrown(){},draw(ctx,camX){drawAlly(ctx,b,n,camX);}};
 return n;
}
function heckle(b,kind,force=false){
 const n=b.ally;if(!n||b.phase!==1||rage(b)||!['back','taunt'].includes(n.st)||(!force&&n.heckleCd>0)||b.speech||b.sayQ?.length)return;
 const list=HECKLE[kind],k=n.lines[kind]=(n.lines[kind]??-1)+1;say(b,'neta',list[k%list.length]);
 n.heckleCd=HECKLE_GAP;n.st='taunt';n.clock=0;n.tauntKind=kind;G.audio.sfx(HECKLE_SFX[kind],.8);
}
// Where he stands to pay: an arm's length behind Shera, on the side away from CHAD.
const paySpot=b=>{const side=sgn(G.player.x-b.x)||1;return [b.x-side*PAY.gap,b.y-6];};
const payable=b=>!b.paid&&!rage(b)&&b.abandonT==null&&!b.protectedStagger&&!b.finishPending&&['idle','recover','count','pocket'].includes(b.state)&&G.player.state!=='held';
function updateAlly(b,n){
 const p=G.player,x0=n.x,y0=n.y;n.clock++;if(n.heckleCd>0)n.heckleCd--;
 const move=(tx,ty,sp)=>{n.x+=clamp(tx-n.x,-sp,sp);n.y+=clamp(ty-n.y,-sp*.6,sp*.6);};
 const side=sgn(p.x-b.x)||1;
 switch(n.st){
  case 'back':case 'taunt':case 'flinch':{
   // Well behind his man, up at the back wall: switching sides he goes round the back of Shera.
   n.face=sgn(b.x-n.x)||-1;move(b.x-side*BACK,laneMin(b.x)+2,1.1);
   if(n.st!=='back'&&n.clock>=(n.st==='taunt'?50:30)){n.st='back';n.clock=0;}
   if(n.st==='back'&&--n.payCd<=0&&!b.paid&&!rage(b)&&b.abandonT==null){n.st='pay';n.clock=0;say(b,'neta','SHERA! BONUS!',{urgent:true});G.audio.sfx('neta_cash',.7);}
   else heckle(b,'idle');
   break;}
  case 'pay':{
   // He waddles up behind Shera and waits for a beat Shera can take the money in.
   const [tx,ty]=paySpot(b),reachable=tx>G.camX+22&&tx<G.camX+W-22;n.face=sgn(b.x-n.x)||1;move(tx,ty,1.3);
   if(reachable&&Math.abs(n.x-tx)<2&&Math.abs(n.y-ty)<2&&payable(b)){b.state='bonus';b.t=0;b.vx=0;b.runUp=0;n.st='handoff';n.clock=0;}
   else if(n.clock>PAY.wait||b.paid||rage(b)){n.st='back';n.clock=0;n.payCd=300;}
   break;}
  case 'handoff':
   n.face=sgn(b.x-n.x)||1;
   if(b.state!=='bonus'){n.st='back';n.clock=0;n.payCd=PAY.every;}
   break;
  case 'sulk':if(n.clock>=50){n.st='back';n.clock=0;}break;
  // USELESS! YOU'RE FIRED, SHERA!: he yells it, then waddles for the ladder at the far end of the carriage and climbs out.
  case 'flee':{
   const dx=LADDER.x-n.x,dy=LADDER.y-n.y,d=Math.hypot(dx,dy);
   if(n.clock<FIRE_T){n.face=sgn(b.x-n.x)||1;break;}
   n.face=sgn(dx)||1;
   if(d>1.5){const k=Math.min(2.4,d)/d;n.x+=dx*k;n.y+=dy*k*.7;}
   if(d<=1.5&&n.clock>=FLEE_MIN){n.st='climb';n.clock=0;n.x=LADDER.x;n.y=LADDER.y;n.face=1;n.sortBias=-60;G.audio.sfx('entrance_boot',.5);}// the ladder is on the back wall: he climbs behind Shera
   break;}
  case 'climb':if(n.clock>=CLIMB_TICKS)n.fled=true;break;
 }
 if(n.st==='climb'){n.moved=0;return;}
 n.x=clamp(n.x,G.camX+22,G.camX+W-22);n.y=clamp(n.y,laneMin(n.x),Math.max(laneMax(n.x),n.st==='flee'?LADDER.y:0));
 n.moved=Math.hypot(n.x-x0,n.y-y0);n.mdx=n.x-x0;n.mdy=n.y-y0;n.stride+=n.moved;
}
// Hit before his hand closes on it, Shera loses the bundle: notes everywhere, a stagger he can be floored out of.
function denyBonus(b){
 const n=b.ally,px=b.x+b.face*PALM[0];burstNotes(b,px,b.y,PALM[1]-10,10,b.face);
 sysPop(b.x,b.y-b.h-8,'DENIED!');addScore(300);G.audio.sfx('neta_denied');G.hitstop=Math.max(G.hitstop,4);
 b.protectedStagger=Math.max(b.protectedStagger,PAY.stagger);b.floorBy='denied';b.state='stagger';b.t=0;b.vx=0;
 if(n){n.st='sulk';n.clock=0;n.payCd=PAY.every;say(b,'neta','MY MONEY!',{urgent:true});}
}
// Running for the ladder: the waddle-run once it lands, the scurry until then; the climb registers on his fists.
const nCell=(key,i,alt)=>hasAIState('nr_neta',key)?[key,i]:alt;
const climbRise=c=>{const step=c/4.5;return Math.min(LADDER.y-18,(Math.floor(step)+clamp((step%1-.25)/.75,0,1))*15.4);};
// Taunts: he yells (shout), then wags a finger (a gloat) or points at CHAD. The hand-off: he fans the bundle,
// slaps it into Shera's palm and laughs. FIRED: he yells it at Shera, then flee_run (6) with a flee_glance back
// over his shoulder, then climb_start (3) into the climb loop (4).
const ALLY_POSE={
 taunt:(c,n)=>c<30?nCell('shout',(c/6|0)%3,['point',0]):n.tauntKind==='gloat'?['laugh',(c>>3)&1]:n.tauntKind==='nag'?['wag',0]:['point',0],
 handoff:(c,n,b)=>b.t<PAY.slap?['fan',0]:b.t<PAY.grab+6?['slap',0]:['laugh',(b.t>>3)&1],
 sulk:c=>c<20?['clutch',0]:['mop',0],flinch:()=>['panic',0],
 flee:c=>c<FIRE_T?nCell('shout',(c/6|0)%3,['point',0]):c>=FIRE_T+18&&c<FIRE_T+30?nCell('flee_glance',0,nCell('cornered',0,['scurry',0])):nCell('flee_run',(c/5|0)%6,['scurry',(c/5|0)%4]),
 climb:c=>c<12&&hasAIState('nr_neta','climb_start')?['climb_start',c/4|0]:nCell('climb_back',Math.floor(c/4.5)%4,['climb',Math.floor(c/4.5)%4])};
function allyPose(b,n){
 if(ALLY_POSE[n.st])return ALLY_POSE[n.st](n.clock,n,b);
 // Moving away from the way he faces is a backpedal, not a moonwalk.
 if(n.moved>.25)return n.mdx*n.face<-.2&&Math.abs(n.mdx)>=Math.abs(n.mdy)?['backpedal',n.stride/7|0]:['walk',n.stride/6|0];
 if(n.st==='pay')return ['fan',0];
 return b.state==='count'?['fan',0]:b.paid?['laugh',(G.time>>4)&1]:['idle',G.time/16|0];
}
function drawAlly(ctx,b,n,camX){
 if(G.state==='bossintro')return;
 const [st,i]=allyPose(b,n),x=n.x-camX,climb=n.st==='climb',y=n.y-n.z-(climb?climbRise(n.clock):0);
 if(!climb)shadow(ctx,x,n.y,15);
 // Up the ladder he goes through the ceiling hatch (the plate's ceiling band ends at y 52).
 if(climb){ctx.save();ctx.beginPath();ctx.rect(0,52,W,218);ctx.clip();}
 drawFrame(ctx,SPR.nr_neta,st,i,x,y,n.face,null);
 if(climb)ctx.restore();
}
function aimLine(ctx,x,y,face,t){
 ctx.save();ctx.globalAlpha=.6+.35*((t>>2)&1);
 // Red dashes with a dark underline so the lane reads over the roof's bright rails.
 for(let d=(t>>1)%4;d<480;d+=4){const lx=Math.round(x+face*d);if(lx<0||lx>W)break;ctx.fillStyle='#ff4050';ctx.fillRect(lx,Math.round(y),2,1);ctx.fillStyle='#2a0508';ctx.fillRect(lx,Math.round(y)+1,2,1);}
 ctx.restore();
}

// Roof shots are sidestep-only: while CHAD stands in the line, bright arrows beside his waist point to the
// lane(s) he can step into. Drawn in the overlay so no sprite covers them.
function laneCue(ctx,x,y,t,up,down){
 if((t&7)>5)return;
 const X=Math.round(x),Y=Math.round(y),arrow=(cy,s,fill,grow)=>{for(let r=0;r<7;r++){const w=2*r+1+grow*2;ctx.fillRect(X-r-grow,cy+s*(6-r)-grow,w,1+grow*2);}},
  both=(fn)=>{if(up)fn(Y-11,-1);if(down)fn(Y+11,1);};
 ctx.fillStyle='#1a0306';both((cy,s)=>arrow(cy,s,0,1));
 ctx.fillStyle='#ff7a86';both((cy,s)=>arrow(cy,s,0,0));
 ctx.fillStyle='#fff0c8';both((cy,s)=>ctx.fillRect(X,s<0?cy-5:cy+3,1,3));
}
// ---- Shera ---------------------------------------------------------------------------------------
// The hammer lands 24 ticks after its flash (48+pd): a reaction window, not a memory test.
const WIND={pound:22,bullrush:40,quake:34,hug:30,chain:20},HAMMER=72;
// Reach and effect anchors (logical px) follow the 113 px art. The hooks no longer step in, so their
// reach covers the old step.
const HOOK_RANGE=83,HAMMER_RANGE=48,FIST=36,RUSH_RANGE=43,RUSH_PROBE=21,WALL=33,RUSH_ROOM=65;
// A string CHAD reads cleanly (took no damage) earns a long count; one that hurt him, a short one.
const COUNT_CLEAN=70,COUNT_HIT=40;
// Damage per hit before difficulty; UNPAID Shera hits 15% harder.
const DMG={hook:8,hammer:18,crush:7,rush:24,quake:20,headbutt:14,squeeze:7,slam:8,chain:18,trunk:16,shove:6};
// Palm catch: front lights landed in an opening less than CATCH_GAP ticks apart. After three (two
// UNPAID) he shows a yellow '!' and catches the next one.
const CATCH_GAP=90,SOFT=['count','quake','stumble','snag','roar','recover','idle','hurt','totrunk'];
// Bear hug: a 40 px lunge over 10 ticks, three squeezes and a slam; mashing frees CHAD after the second.
const HUG={lunge:10,step:4,reach:22,arms:20,hold:22,squeeze:[14,34,54],slam:62,end:92,mash:6,stumble:40};
// Chain sweep: a shin-high arc from 18 px behind him to 118 px in front, +-12 px of CHAD's lane (it tracks
// him until it swings), so only a jump clears it. It wraps his own forearm: a 45-tick snag.
const CHAIN={from:6,to:12,end:16,back:18,reach:118,lane:12,snag:45};
// Luggage hurl: a fight trunk within 80 px, a 24-tick lift, thrown at 4.5 px a tick. Parried back it
// deals 30 and a 70-tick crash stagger.
const HURL={near:80,grab:8,lift:GREEN_WARNING_TICKS+1,end:41,speed:4.5,reflect:30,stagger:70};
// Phase two: at 50% Netaji fires him and climbs out, and Shera turns UNPAID. He cannot drop below 45%
// before then; a death once UNPAID restarts there at 45%.
// A crash dazes him for 80 ticks (56 UNPAID: recoveries run 30% shorter).
const CRASH=80,CRASH_RAGE=56;
const LADDER={x:8000,y:240},FLEE_MIN=70,CLIMB_TICKS=60,RAGE_AT=.5,RAGE_FLOOR=.45,OUT_TICKS=40,ROAR=36;
const CALM_DECK=['pound','quake','bullrush','hug','pound','quake','bullrush','pound','quake'];
const RAGE_DECK=['bullrush','pound','chain','hug','quake2','hurl','bullrush','pound','chain','hug','hurl'];
const rage=b=>!!b.enragedShera;
const dm=(b,n)=>Math.round(n*(rage(b)?1.15:1));
const armoured=b=>['windup','pound','bullrush','pocket','abandon','turnroar','wakeshove','catch','headbutt','hug','hughold','chain','hurl'].includes(b.state)||b.state==='quake'&&b.t<QAIR+16||b.paid>0&&['idle','recover'].includes(b.state);
// Guard up, calm Shera eats nothing from the front - not even a heavy; openings come from his mechanics.
const guardedShera=(b,dir,heavy,launch)=>!rage(b)&&b.guard>0&&!b.protectedStagger&&!app(b)&&dir===-b.face&&['idle','recover'].includes(b.state);
function startString(b){b.hitLanded=false;b.lastPat=b.pattern;b.stringHp=G.player.hp;}
function afterString(b){
 if(rage(b)){
  // Every second string he stops to roar: a short breather that is the UNPAID opening.
  if(++b.strings%2===0){b.state='roar';b.t=0;G.audio.sfx('shera_roar',.7);return;}
  b.state='recover';b.t=0;b.recoverT=21;return;
 }
 if(b.paid>0){b.state='recover';b.t=0;b.recoverT=24;return;}
 b.state='count';b.t=0;b.countHits=0;b.countLen=G.player.hp<(b.stringHp??0)?COUNT_HIT:COUNT_CLEAN;
}
// PAID: 9 s of armour, speed and no counting, cut short when he is floored or crashes (PAY CUT). Netaji's
// next bonus waits PAY.every after the shift ends, so one missed hand-off can't chain into the next.
function startPaid(b){
 b.paid=PAID_TICKS;b.guard=b.maxGuard;b.label='SHERA — PAID';sysPop(b.x,b.y-b.h-8,'PAID!');
 spawnRing(b.x,b.y,'#ffd25a');G.audio.sfx('neta_paid');G.audio.sfx('armor',.6);
}
// His grunts on a hit: at most one every 22 ticks (a heavy always), alternating the two takes.
function sheraHurtSfx(b,heavy){
 if(!heavy&&G.time-(b.hurtSfxAt??-99)<22)return;b.hurtSfxAt=G.time;
 G.audio.sfx((b.hurtSfxN=(b.hurtSfxN||0)+1)%2?'shera_hurt':'shera_hurt2',heavy?.9:.6);
}
function endPaid(b,word='PAY CUT!'){
 b.paid=0;if(!rage(b))b.label='SHERA';if(b.ally)b.ally.payCd=Math.max(b.ally.payCd,PAY.every);
 if(word)sysPop(b.x,b.y-b.h-8,word);
}
// A crash or a quake landing wrecks the carriage (the damaged plate swaps in under the shake).
function crash(b,what){
 if(b.paid)endPaid(b,null);
 b.wrecked=true;b.state='stagger';b.t=0;b.vx=0;b.protectedStagger=rage(b)?CRASH_RAGE:CRASH;b.crashT=18;b.floorBy='crash';G.shake=8;G.hitstop=Math.max(G.hitstop,6);
 G.audio.sfx('shera_hammer');G.audio.sfx('shera_hurt2',.8);spawnDust(b.x+b.rushDir*28,b.y,10);sysPop(b.x,b.y-b.h-8,what==='prop'?'CRASH!':'THUD!');
}
const trunks=b=>(b.fightProps||[]).filter(q=>!q.broken&&!q.roof&&!q.thrown);
function nearTrunk(b,r){let best=null,bd=r;for(const q of trunks(b)){const d=Math.abs(q.x-b.x)+Math.abs(q.y-b.y)*.5;if(d<=bd){bd=d;best=q;}}return best;}
function sheraPick(b){
 const p=G.player,d=Math.abs(p.x-b.x),deck=rage(b)?RAGE_DECK:CALM_DECK;
 let pat=deck[b.turn++%deck.length],quakes=1;
 if(pat==='quake2'){pat='quake';quakes=2;}
 if(pat==='hurl'&&!trunks(b).length)pat='bullrush';
 // The hug only comes out at close range.
 if(pat==='hug'&&d>90)pat='pound';
 // Never two rushes in a row. Too close to rush, he backs off a few steps for a run-up (quake if walled in).
 if(pat==='bullrush'&&b.lastPat==='bullrush')pat='quake';
 if(pat==='bullrush'&&d<RUSH_ROOM){b.runUp=40;return;}
 if(d>156&&['pound','chain'].includes(pat)){b.turn--;b.atkCd=12;return;}
 if(pat==='hurl'){const q=nearTrunk(b,HURL.near);if(q)startHurl(b,q);else{b.state='totrunk';b.t=0;b.trunk=nearTrunk(b,9999);}return;}
 b.pattern=pat;b.state='windup';b.t=0;b.face=sgn(p.x-b.x);b.quakes=quakes;startString(b);
 if(pat==='chain')b.chainY=p.y;
}
function startHurl(b,q){b.pattern='hurl';b.state='hurl';b.t=0;b.trunk=q;b.face=sgn(G.player.x-b.x);startString(b);}
// The thrown trunk breaks where it stops: on CHAD, back on Shera, or at the end of its flight.
function smashTrunk(b,s){
 if(!s||s.smashed)return;s.smashed=true;if(b.thrownTrunk===s)b.thrownTrunk=null;
 const x=clamp(s.x,G.camX+24,G.camX+W-24),y=clamp(s.y,laneMin(x),laneMax(x));
 (b.fightProps||=[]).push({x,y:y+6,broken:true,thrown:true});burstNotes(b,x,y,20,6,sgn(s.vx));spawnDust(x,y,6);G.audio.sfx('slam');G.shake=Math.max(G.shake,3);
}
function trunkDraw(ctx,s,sx,sy){
 const im=ASSETS.prop_nr_case;if(!im)return;const w=42,h=w*im.height/im.width;
 ctx.save();ctx.translate(Math.round(sx),Math.round(sy-(s.hy||70)));ctx.rotate(s.t*.18*sgn(s.vx));ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();
}
function hugReach(b){
 const p=G.player;
 return !p.dying&&!p.grabbedBy&&p.z<8&&(p.invuln||0)<=16&&!['down','getup','special','dead'].includes(p.state)&&Math.abs(p.y-b.y)<14&&Math.abs(p.x-(b.x+b.face*HUG.arms))<HUG.reach;
}
function catchReady(b){return !b.hitBehind&&G.rawTime-(b.lightAt??-999)<=CATCH_GAP&&(b.lights||0)>=(rage(b)?2:3);}
function countLight(b){
 if(G.rawTime-(b.lightAt??-999)>CATCH_GAP)b.lights=0;
 b.lights=(b.lights||0)+1;b.lightAt=G.rawTime;
 if(b.lights===(rage(b)?2:3))b.palmT=8;
}
function startCatch(b){
 const p=G.player;b.state='catch';b.t=0;b.face=sgn(p.x-b.x)||b.face;b.lights=0;b.palmT=0;
 grabPlayer(p,b);p.x=b.x+b.face*28;p.y=b.y;p.z=0;
 G.hitstop=Math.max(G.hitstop,4);G.audio.sfx('armor');G.audio.sfx('shera_grunt',.7);spawnSpark(b.x+b.face*25,b.y-70);
}
// Shoving CHAD off (the roar, the wake-up shove): a few px a tick, never through the arena walls.
function pushPlayer(b,dir,px){const p=G.player;p.x=clamp(p.x+dir*px,G.camX+12,G.camX+W-12);}
function becomeEnraged(b,restored=false){
 Object.assign(b,{enragedShera:true,label:'SHERA — UNPAID',paid:0,guard:b.maxGuard,strings:0,turn:0,floorBy:null,lights:0,runUp:0,behind:0,countHits:0});
 if(!restored)markSheraCheckpoint();
}
// At 50% Netaji fires him (once Shera is between strings) and climbs out; Shera watches him go.
function checkRage(b){
 if(rage(b)||b.finishPending||b.outFeet)return false;
 const n=b.ally,p=G.player;
 // Knocked out of the abandon beat (a stagger or floor): he turns and roars as soon as he is back on his feet.
 if(b.abandonT!=null){if(['idle','recover'].includes(b.state)&&!b.protectedStagger){b.state='turnroar';b.t=0;b.face=sgn(p.x-b.x)||b.face;return true;}return false;}
 if(b.hp>b.maxhp*RAGE_AT+.01)return false;
 const safe=['idle','recover','count','pocket'].includes(b.state)&&!b.protectedStagger&&p.state!=='held';
 if(!safe)return false;
 b.abandonT=0;b.state='abandon';b.t=0;b.vx=0;b.runUp=0;if(b.paid)endPaid(b,null);
 if(n){n.st='flee';n.clock=0;b.speech=null;b.sayQ=[];say(b,'neta',FIRED,{urgent:true});G.audio.sfx('neta_heckle');}
 return true;
}
function updateShera(b){
 const p=G.player,paid=b.paid>0,spd=(rage(b)?.95:.72*(paid?1.3:1))*diff().aggro,n=b.ally;
 b.backing=false;
 if(b.palmT>0)b.palmT--;
 if(checkRage(b))return true;
 switch(b.state){
  case 'recover':
   // Out of a rush he skids to a stop on his heels.
   if(b.afterRush&&b.t<12){b.x=clamp(b.x+b.rushDir*Math.max(0,2.6-b.t*.22),G.camX+WALL,G.camX+W-WALL);}
   if(b.t>(b.recoverT||30)){b.state='idle';b.t=0;b.recoverT=0;b.afterRush=false;if(rage(b))b.atkCd=b.hp<b.maxhp*.15?0:40;}return true;
  case 'idle':{
   const dx=p.x-b.x;
   b.y+=clamp(p.y-b.y,-spd*.6,spd*.6);
   if(b.runUp>0){const nx=b.x-sgn(dx)*spd*1.1,walled=nx<G.camX+WALL+4||nx>G.camX+W-WALL-4;
    if(!walled){b.x=nx;b.backing=true;}
    if(--b.runUp<=0||Math.abs(dx)>=RUSH_ROOM+8||walled){b.runUp=0;b.pattern=walled&&Math.abs(dx)<RUSH_ROOM?'quake':'bullrush';b.quakes=1;b.state='windup';b.t=0;b.face=sgn(dx);startString(b);}
    return true;}
   if(Math.abs(dx)>84)b.x+=sgn(dx)*spd;else if(Math.abs(dx)<48&&!b.turnT){b.x-=sgn(dx)*.4;b.backing=true;}
   if(b.behind>=2){b.behind=0;b.pattern='pound';b.state='windup';b.t=WIND.pound-8;b.face=sgn(dx);startString(b);say(b,'shera','OI!',{urgent:true});return true;}
   if(b.t%90===0)b.behind=0;
   if(--b.atkCd<=0)sheraPick(b);
   return true;}
  case 'windup':
   // The wind-up is voiced: a snort and a heave for the red moves, a grunt into the hug, the chain rattling loose.
   if(b.t===1)G.audio.sfx({bullrush:'shera_heave',quake:'shera_heave',hug:'shera_grunt',chain:'shera_chain'}[b.pattern]||'shera_grunt',b.pattern==='pound'?.5:.8);
   if(b.pattern==='bullrush'&&b.t%12===6)G.audio.sfx('shera_step',.5);
   if(b.pattern==='hug')b.y+=clamp(p.y-b.y,-.6,.6);
   if(b.pattern==='chain')b.chainY+=clamp(p.y-b.chainY,-1.2,1.2);
   if(b.t>=Math.round(WIND[b.pattern]*(paid?.8:1))){
    b.state=b.pattern;b.t=0;b.hitLanded=false;
    if(b.pattern==='bullrush'){b.rushDir=b.face;G.audio.sfx('dash');}
    if(b.pattern==='quake'){b.qx=clamp(p.x,G.camX+40,G.camX+W-40);b.qy=p.y;G.audio.sfx('jump');}
    if(b.pattern==='pound'){b.pd=[8,0,16,4,12][(b.poundN=(b.poundN||0)+1)%5];}
    if(b.pattern==='hug'){b.face=sgn(p.x-b.x)||b.face;G.audio.sfx('dash');}
   }
   return true;
  case 'pound':{
   // Two hooks from planted feet, then the hammer after a varying hold: parry on the flash, not on a rhythm.
   const at=HAMMER+(b.pd||0);
   if(b.t===6||b.t===28){tryHitPlayer(b,dm(b,DMG.hook),HOOK_RANGE,false,19,'plain');G.audio.sfx('whiff');if(b.t===6)G.audio.sfx('shera_grunt',.55);}
   if(b.t===34)G.audio.sfx('whiff');
   // The hammer goes up with a heave on its flash.
   if(b.t===48+(b.pd||0))G.audio.sfx('shera_heave',.8);
   // The hammer lunges in over its last 8 ticks: from where the hooks leave CHAD it still lands, so it can be parried.
   if(b.t>=at-8&&b.t<at){const d=(p.x-b.x)*b.face,gap=d-(FIST+4);
    if(gap>0&&d<HOOK_RANGE+24&&Math.abs(p.y-b.y)<22){b.x=clamp(b.x+b.face*Math.min(gap,7),G.camX+WALL,G.camX+W-WALL);if(b.t===at-8)spawnDust(b.x-b.face*20,b.y,2);}}
   if(b.t===at){
    // The fists land FIST px out; tryHitPlayer adds 11px of slack.
    const hit=tryHitPlayer(b,dm(b,DMG.hammer),HAMMER_RANGE,true,22,'counter');spawnDust(b.x+b.face*FIST,b.y,6);spawnRing(b.x+b.face*FIST,b.y,'#e8c890');G.shake=Math.max(G.shake,rage(b)?6:5);
    if(!hit||p.lastDefense!=='parry')G.audio.sfx('shera_hammer',hit?.7:1);
    // A held guard does not stop a hammer: it caves in (only the parry turns it).
    else if(p.lastDefense==='guard'){hurtPlayer(p,dm(b,DMG.crush),b.face,false);sysPop(p.x,p.y-p.z-112,'GUARD CRUSHED');}
   }
   if(b.t>=at+34)afterString(b);
   return true;}
  case 'bullrush':{
   const v=paid||rage(b)?5:4.2;
   if(b.t<84){
    b.x+=b.rushDir*v;b.face=b.rushDir;if(b.t%5===0)spawnDust(b.x-b.rushDir*20,b.y,1);if(b.t%10===0)G.audio.sfx('shera_step',.7);
    // The lane locks when he launches: a sidestep of a dozen pixels clears him.
    if(!b.hitLanded&&tryHitPlayer(b,dm(b,DMG.rush),RUSH_RANGE,true,14,'unblockable'))b.hitLanded=true;
    const prop=b.fightProps.find(q=>!q.broken&&!q.thrown&&Math.abs(q.x-(b.x+b.rushDir*RUSH_PROBE))<24&&Math.abs(q.y-b.y)<31);
    if(prop){prop.broken=true;burstNotes(b,prop.x,prop.y,24,4);crash(b,'prop');return true;}
    if(b.x<G.camX+WALL||b.x>G.camX+W-WALL){b.x=clamp(b.x,G.camX+WALL,G.camX+W-WALL);crash(b,'wall');return true;}
    return true;
   }
   b.state='recover';b.t=0;b.recoverT=rage(b)?24:34;b.afterRush=true;return true;}
  case 'quake':
   // He lands where CHAD stood at take-off: walk out of the ring or jump the shockwave.
   if(b.t<QAIR){const q=b.t/QAIR;b.z=Math.sin(q*Math.PI)*QARC;b.x+=clamp(b.qx-b.x,-3.8,3.8);b.y+=clamp(b.qy-b.y,-1.7,1.7);return true;}
   if(b.t===QAIR){
    b.z=0;b.wrecked=true;spawnShock(b.x,b.y);spawnRing(b.x,b.y,'#ff8a50');spawnDust(b.x-28,b.y,4);spawnDust(b.x+28,b.y,4);G.shake=8;G.audio.sfx('shera_quake');G.audio.sfx('heavy',.6);
    if(Math.abs(p.x-b.x)<QRX&&Math.abs(p.y-b.y)<QRY&&p.z<8&&!p.dying)hurtPlayer(p,dm(b,DMG.quake),sgn(p.x-b.x),true);
    // The landing rattles Netaji at the back wall (a flinch; he is never in reach).
    if(n&&Math.abs(n.x-b.x)<130&&n.st==='back'){n.st='flinch';n.clock=0;}
   }
   // UNPAID, the double quake takes off again after a short landing.
   if(b.quakes>1&&b.t>=QAIR+20){b.quakes--;b.t=0;b.qx=clamp(p.x,G.camX+40,G.camX+W-40);b.qy=p.y;G.audio.sfx('jump');return true;}
   if(b.t>=QAIR+48)afterString(b);
   return true;
  case 'count':
   if(b.flinchT>0)b.flinchT--;
   if(b.t%14===1)G.audio.sfx(b.t%28===1?'cond_note_1':'cond_note_2',b.t===1?.45:.3);
   if(b.t>=(b.countLen||COUNT_TICKS)){b.state='pocket';b.t=0;}
   return true;
  case 'pocket':if(b.t>=18){b.state='idle';b.t=0;b.atkCd=paid?24:56;}return true;
  case 'bonus':
   // Netaji's hand-off: Shera turns his back on CHAD, opens his palm, closes it on the bundle (PAID) and pockets it.
   if(!n||n.st!=='handoff'){b.state='idle';b.t=0;b.atkCd=20;return true;}
   b.face=sgn(n.x-b.x)||b.face;
   if(b.t===PAY.slap+4)G.audio.sfx('neta_cash');
   if(b.t===PAY.close)startPaid(b);
   if(b.t===PAY.close+4)G.audio.sfx('neta_laugh',.7);
   if(b.t>=PAY.end){b.state='idle';b.t=0;b.atkCd=18;b.face=sgn(p.x-b.x)||b.face;}
   return true;
  case 'down':
   if(b.z>0||b.vz){b.x+=b.vx;b.vx*=.9;if(fall(b,.28,0)==='land'){spawnDust(b.x,b.y,8);G.shake=Math.max(G.shake,6);G.audio.sfx('land');G.audio.sfx('shera_hammer',.55);}b.t=0;return true;}
   if(b.t>=(rage(b)?DOWN_RAGE:DOWN_TICKS)){b.state='getup';b.t=0;}
   return true;
  case 'getup':
   // No free bark into a hammer: close in, he shoves CHAD off as he rises.
   if(b.t>=24){const close=Math.abs(p.x-b.x)<54&&Math.abs(p.y-b.y)<22&&!['down','getup'].includes(p.state)&&!p.dying;
    b.face=sgn(p.x-b.x)||b.face;b.t=0;if(close)b.state='wakeshove';else{b.state='idle';b.atkCd=rage(b)?24:40;}}
   return true;
  case 'wakeshove':
   if(b.t===10){const hp=p.hp;tryHitPlayer(b,dm(b,DMG.shove),54,false,22,'plain');G.audio.sfx('whiff');G.audio.sfx('shera_grunt',.6);
    if(p.hp<hp||p.lastDefense)b.shoveT=10;}
   if(b.shoveT>0){b.shoveT--;pushPlayer(b,b.face,p.state==='hurt'?0:3);}
   if(b.t>=26){b.state='idle';b.t=0;b.atkCd=30;}
   return true;
  case 'catch':
   if(p.grabbedBy===b){p.x=b.x+b.face*28;p.y=b.y;p.z=0;}
   if(b.t>=10){b.state='headbutt';b.t=0;}
   return true;
  case 'headbutt':
   if(b.t<6&&p.grabbedBy===b){p.x=b.x+b.face*(28-b.t*2);p.y=b.y;p.z=0;}
   if(b.t===6){
    if(p.grabbedBy===b){p.grabbedBy=null;p.mash=0;p.state='idle';p.t=0;}
    const hp=p.hp;hurtPlayer(p,dm(b,DMG.headbutt),b.face,false);if(p.hp<hp){p.vx=b.face*4;spawnSpark(p.x,p.y-p.z-84);}
    G.shake=Math.max(G.shake,4);G.hitstop=Math.max(G.hitstop,4);G.audio.sfx('heavy');G.audio.sfx('shera_heave',.7);
   }
   if(b.t>=18){b.state='recover';b.t=0;b.recoverT=20;}
   return true;
  case 'hug':
   // The lunge: 40 px over 10 ticks. It grabs whatever stands in front of him, guard or parry.
   if(b.t<=HUG.lunge){b.x=clamp(b.x+b.face*HUG.step,G.camX+WALL,G.camX+W-WALL);
    if(hugReach(b)){grabPlayer(p,b);b.state='hughold';b.t=0;G.audio.sfx('shera_grunt',.8);G.shake=Math.max(G.shake,3);return true;}return true;}
   b.state='stumble';b.t=0;G.audio.sfx('whiff');say(b,'shera','HUH?',{wait:20});return true;
  case 'hughold':{
   if(p.grabbedBy!==b&&b.t<HUG.slam){b.state='recover';b.t=0;b.recoverT=20;return true;}
   if(b.t<HUG.slam){p.x=b.x+b.face*HUG.hold;p.y=b.y;p.z=0;p.face=-b.face;}
   const sq=HUG.squeeze.indexOf(b.t);
   if(sq>=0){const d=Math.round(dm(b,DMG.squeeze)*diff().dmg),hit=Math.min(d,p.hp-1);gradeDamage(Math.max(0,hit));p.hp=Math.max(1,p.hp-d);spawnSpark(p.x,p.y-60);G.audio.sfx('shera_squeeze');G.shake=Math.max(G.shake,3);if(sq===1)p.mash=0;}
   // After the second squeeze CHAD can mash his way out.
   if(b.t>HUG.squeeze[1]&&b.t<HUG.slam&&p.mash>=HUG.mash){p.grabbedBy=null;p.mash=0;p.state='idle';p.t=0;p.invuln=30;pushPlayer(b,b.face,10);sysPop(p.x,p.y-p.z-100,'BREAK!');b.state='recover';b.t=0;b.recoverT=30;G.audio.sfx('armor');return true;}
   if(b.t===HUG.slam){if(p.grabbedBy===b){p.grabbedBy=null;p.mash=0;p.state='idle';}p.invuln=0;hurtPlayer(p,dm(b,DMG.slam),b.face,true);G.shake=Math.max(G.shake,6);G.audio.sfx('shera_hammer',.8);spawnDust(p.x,p.y,6);}
   if(b.t>=HUG.end)afterString(b);
   return true;}
  case 'stumble':
   // A whiffed hug carries him on a few steps, back open.
   if(b.t<20)b.x=clamp(b.x+b.face*Math.max(0,1.8-b.t*.09),G.camX+WALL,G.camX+W-WALL);
   if(b.t>=HUG.stumble){b.state='recover';b.t=0;b.recoverT=10;}
   return true;
  case 'chain':
   if(b.t<CHAIN.from)b.chainY+=clamp(p.y-b.chainY,-1.2,1.2);
   if(b.t===CHAIN.from){G.audio.sfx('shera_chain');G.audio.sfx('dash',.6);}
   if(b.t>=CHAIN.from&&b.t<=CHAIN.to&&!b.hitLanded){
    const ax=(p.x-b.x)*b.face;
    if(ax>-CHAIN.back&&ax<CHAIN.reach&&Math.abs(p.y-b.chainY)<=CHAIN.lane&&p.z<6&&!['down','getup'].includes(p.state)&&!p.dying){
     const hp=p.hp;hurtPlayer(p,dm(b,DMG.chain),b.face,true);if(p.hp<hp){b.hitLanded=true;spawnSpark(p.x,p.y-12);G.audio.sfx('heavy');}}
   }
   if(b.t>=CHAIN.end){b.state='snag';b.t=0;G.audio.sfx('shera_snag');sysPop(b.x,b.y-b.h-8,'SNAGGED!');}
   return true;
  case 'snag':if(b.t>=CHAIN.snag)afterString(b);return true;
  case 'totrunk':{
   const q=b.trunk;if(!q||q.broken||!trunks(b).includes(q)||b.t>150){b.state='idle';b.t=0;b.atkCd=10;return true;}
   const side=sgn(b.x-q.x)||1,tx=clamp(q.x+side*26,G.camX+WALL,G.camX+W-WALL);b.face=sgn(tx-b.x)||b.face;
   b.x+=clamp(tx-b.x,-spd*1.3,spd*1.3);b.y+=clamp(q.y-b.y,-spd*.7,spd*.7);
   if(Math.abs(q.x-b.x)<40&&Math.abs(q.y-b.y)<30)startHurl(b,q);
   return true;}
  case 'hurl':{
   const q=b.trunk;
   if(b.t<HURL.lift)b.face=sgn(p.x-b.x)||b.face;
   if(b.t===HURL.grab){if(q&&!q.broken){b.fightProps=b.fightProps.filter(o=>o!==q);b.carry=true;G.audio.sfx('shera_grunt',.8);}else{b.state='idle';b.t=0;b.atkCd=10;return true;}}
   if(b.t===HURL.lift&&b.carry){
    b.carry=false;const s=spawnShot('trunk',b.x+b.face*22,b.y,b.face*HURL.speed,dm(b,DMG.trunk),{source:b,parryClass:'reflect'});
    Object.assign(s,{draw:trunkDraw,hy:69,life:150,netaTrunk:true,landed:()=>smashTrunk(b,s)});b.thrownTrunk=s;G.audio.sfx('throw');G.audio.sfx('whiff');
   }
   if(b.t>=HURL.end)afterString(b);
   return true;}
  case 'roar':if(b.t===4)G.shake=Math.max(G.shake,3);if(b.t>=ROAR){b.state='idle';b.t=0;b.atkCd=b.hp<b.maxhp*.15?0:20;}return true;
  case 'abandon':{
   // Netaji leaves him to it: Shera watches him go, then turns on CHAD.
   b.abandonT++;const gone=!b.ally||b.ally.st==='climb'&&b.ally.clock>24;
   if(b.ally)b.face=sgn(b.ally.x-b.x)||b.face;
   if(b.t===24&&b.ally)say(b,'shera','FIRED?!',{wait:200});
   if(gone&&b.t>=40||b.t>=280){b.state='turnroar';b.t=0;b.face=sgn(p.x-b.x)||b.face;}
   return true;}
  case 'turnroar':
   if(b.t===14){becomeEnraged(b);screenFlash();G.shake=8;G.hitstop=Math.max(G.hitstop,4);G.audio.sfx('shera_roar');G.audio.sfx('heavy',.7);spawnRing(b.x,b.y,'#ff5030');spawnShock(b.x,b.y);sysPop(b.x,b.y-b.h-10,'UNPAID!');}
   // The roar blows CHAD 40 px off him.
   if(b.t>14&&b.t<=24&&Math.abs(p.x-b.x)<140&&!p.grabbedBy)pushPlayer(b,sgn(p.x-b.x)||1,4);
   if(b.t>=44){b.state='idle';b.t=0;b.atkCd=20;}
   return true;
  case 'outfeet':
   // Out on his feet: frozen where he stands (no sway, no slide), then the finisher.
   if(b.t>=OUT_TICKS)startFinish(b);
   return true;
 }
 return false;
}
// Poses. Every move has its own cells: the brace and bull paw loop before a rush, a four-cell run and a
// skid; flex, squat, tuck, stomp, landing and rise for the quake; hooks retract before the next one; the
// hammer trembles on its flash; a slow turn shows him looking back over his shoulder. New moves use their
// own states as the art lands (hasAIState) and the nearest existing cell until then.
const GUARD_KEY='nr_neta_guard';
const cell=(key,i,alt)=>hasAIState(GUARD_KEY,key)?[key,i]:alt;
function sheraPose(b){
 const t=b.t;
 if(b.finishPending||b.outFeet)return cell('rage_out',0,['stagger_polish',1]);
 if(b.guardFlash>0)return ['block',0];
 switch(b.state){
  case 'windup':
   if(b.pattern==='bullrush')return ['charge',(t>>3)&1?3:0];
   if(b.pattern==='quake')return t<WIND.quake-12?['flex',0]:['quake',2];
   if(b.pattern==='hug')return cell('hug',0,['flex',0]);
   if(b.pattern==='chain')return t<10?cell('chain',0,['neck',0]):cell('chain',1,['hook',0]);
   return ['hook',0];
  case 'pound':{
   const at=HAMMER+(b.pd||0);
   if(t<10)return ['hook',1];if(t<16)return ['hook',3];if(t<22)return ['hook',0];if(t<32)return ['hook',2];if(t<38)return ['hook',3];
   if(t<at)return ['hammer',t>=48+(b.pd||0)&&(t>>2)&1?3:0];
   return t<at+10?['hammer',1]:['hammer',2];}
  case 'bullrush':return ['charge',[1,4,2,5][(t/5|0)%4]];
  case 'recover':if(b.afterRush)return t<14?['charge',6]:t<22?['charge',0]:['idle',0];return ['idle',G.time/16|0];
  case 'quake':if(t<QAIR)return t<QAIR*.55?['quake',0]:['quake',3];return t-QAIR<20?['quake',1]:t-QAIR<34?['quake',4]:['idle',0];
  case 'count':return b.flinchT>0?[b.countHits%2?'gut':'facehit',0]:['count',(t/14|0)%2];
  case 'pocket':return ['pocket',0];
  case 'totrunk':return ['walk',b.stridePhase/7|0];
  // Netaji's hand-off: the slow turn to him, the open palm, the palm closing on the bundle, the pocket.
  case 'bonus':return t<PAY.turn?['turn',0,-b.face]:t<PAY.grab?['pay',0]:t<PAY.close?['pay',1]:['pocket',0];
  case 'hurt':return ['hurt',b.hitBehind?1:0];
  case 'wakeshove':return t<10?cell('shove',0,['getup',3]):cell('shove',1,['hook',1]);
  case 'catch':return t<5?cell('palmcatch',1,['catch',0]):cell('palmcatch',2,['catch',0]);
  case 'headbutt':return t<6?cell('palmcatch',2,['hook',3]):cell('palmcatch',3,['hammer',1]);
  case 'hug':return cell('hug',1,['charge',1]);
  case 'hughold':return b.t<HUG.slam?cell('hug',2+((t/10|0)&1),['catch',0]):b.t<HUG.slam+10?cell('hug',4,['hammer',1]):cell('hug',5,['hammer',2]);
  case 'stumble':return t>=HUG.stumble-12?cell('stumble_recover',0,['stagger_polish',1]):cell('stumble',0,['stagger_polish',t<25?0:1]);
  case 'chain':return t<CHAIN.from?cell('chain',1,['hook',0]):t<CHAIN.to?cell('chain',2,['hook',1]):cell('chain',3,['hook',2]);
  case 'snag':return cell('chain',4,['guardbreak',0]);
  case 'hurl':return t<HURL.grab?cell('hurl',0,['stoop',0]):t<HURL.lift?cell('hurl',1,['taunt',0]):cell('hurl',2,['hammer',1]);
  case 'roar':case 'turnroar':return b.state==='turnroar'&&t<14?['turn',0,-b.face]:cell('roar',(t>>3)&1,['flex',0]);
  case 'abandon':return t<24?['turn',0,-b.face]:['idle',G.time/16|0];
  // Knocked out he is a statue: one cell, no sway, until the finisher takes over.
  case 'outfeet':return cell('rage_out',0,['stagger_polish',1]);
  // His daze is a slow sway on his feet: recoil, then 22 ticks each on the two standing cells (hand to head,
  // slumped) - the crouch and kneel cells (2, 3) dropped his head 20px and read as a bob.
  case 'stagger':if(b.crashT>0)return ['crash',0];if(b.gbT>0)return ['guardbreak',0];{const d=dazePose(b),t=b.dazeT||0;return d.name==='stagger_polish'?['stagger_polish',t<7?0:(Math.floor((t-7)/22)&1)?0:1]:[d.name,d.idx];}
  case 'down':return b.z>0?['fall',0]:['down',0];
  case 'getup':return ['getup',Math.min(3,t/6|0)];
 }
 // Slow to turn: he looks back over his shoulder (drawn facing the new way) until the turn completes.
 if(b.turnT>0&&b.phase===1)return ['turn',0,-b.face];
 // Giving CHAD room he steps backwards: the walk cycle played in reverse.
 if(b.moved>.1)return ['walk',b.backing?7-((b.stridePhase/7|0)%8):b.stridePhase/7|0];
 return ['idle',G.time/16|0];
}
// UNPAID: every pose with a registered rage_<state> set is drawn from it (red flush, torn vest). The enraged-only
// moves (chain, hurl) and rage_out are drawn red already.
const RED_DRAWN=['chain','hurl','rage_out'];
// The telegraph colour of each new move's cue (the PARRY_CLASS entry it reads as).
const CUE_AS={hug:'grab',chain:'lathisweep',hurl:'toss'};
const redName=(st,red)=>red&&!st.startsWith('rage_')&&hasAIState(GUARD_KEY,'rage_'+st)?'rage_'+st:st;
// The palm-to-bundle hand-off: Netaji's cash flies from his hand into Shera's open palm.
function drawBundle(ctx,b,camX){
 const n=b.ally;if(b.state!=='bonus'||!n||b.t<PAY.slap||b.t>=PAY.grab)return;
 const k=clamp((b.t-PAY.slap)/(PAY.grab-PAY.slap),0,1),x0=n.x+n.face*10,y0=n.y-60,x1=b.x+b.face*PALM[0]*.5,y1=b.y-PALM[1]*.72;
 netaProp(ctx,0,x0+(x1-x0)*k-camX,y0+(y1-y0)*k-Math.sin(k*Math.PI)*14,16,k*2.4*b.face);
}
// A super on him: the victim cells (block, hurt, stagger) drawn from the UNPAID set when he is enraged.
function drawBoxed(ctx,b,box,x,y,red){
 const nm=redName(box.name,red),f=getFrame(b.set,nm,box.idx,b.face);b.drawnCell=nm+':'+box.idx;
 ctx.save();ctx.translate(x+box.dx,y+box.dy-40);ctx.rotate(box.angle);if(box.flash)ctx.filter='brightness(1.18)';
 blit(ctx,f,-frameW(f)/2,40-frameH(f)+4);
 if(red&&!G.reflecting){ctx.filter='sepia(1) saturate(6) hue-rotate(-30deg) brightness(.95)';ctx.globalAlpha=nm.startsWith('rage_')?.1:.35;blit(ctx,f,-frameW(f)/2,40-frameH(f)+4);}
 ctx.restore();
}
function drawShera(ctx,b,camX){
 let [st,i,fc]=sheraPose(b);const x=Math.round(b.x-camX),y=Math.round(b.y-b.z),face=fc||b.face,red=rage(b);
 st=redName(st,red);
 const redCell=st.startsWith('rage_')||RED_DRAWN.includes(st);
 // PAID: a thick gold aura, glints rising off him; UNPAID: red.
 if(b.paid>0&&!G.reflecting){aura(ctx,x,y-60,61,G.time,.7+.2*Math.sin(G.time*.2),'255,196,60');}
 if(red&&!G.reflecting){aura(ctx,x,y-60,54,G.time,.28+.1*Math.sin(G.time*.15),'255,70,40');}
 const box=boxingVictimPose(b);
 if(box){drawBoxed(ctx,b,box,x,y,red);return;}
 if(b.state==='quake'&&b.t<QAIR&&!G.reflecting){
  const k=b.t/QAIR;ctx.save();ctx.strokeStyle=`rgba(255,64,80,${.45+.4*((b.t>>2)&1)})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.round(b.qx-camX),Math.round(b.qy),QRX*(1.3-.3*k),QRY*(1.3-.3*k),0,0,Math.PI*2);ctx.stroke();ctx.restore();
 }
 const f=getFrame(b.set,st,i,face);b.drawnCell=st+':'+i;
 const cue=netaCueOn(b);
 const pat=b.pattern;if(b.state==='pound'&&b.t>=36)b.pattern='pound';if(CUE_AS[b.pattern])b.pattern=CUE_AS[b.pattern];
 const fx=x-frameW(f)/2,fy=y-frameH(f)+4;
 // Out cold he is drawn flat: no telegraph flash and no daze tilt.
 if(b.finishPending||b.outFeet)blit(ctx,f,fx,fy);else blitTelegraph(ctx,b,f,fx,fy,cue);
 if(b.paid>0&&!G.reflecting){ctx.save();ctx.globalAlpha=.16+.12*Math.sin(G.time*.2);ctx.filter='sepia(1) saturate(4) brightness(1.4)';blit(ctx,f,fx,fy);ctx.restore();
  for(let k=0;k<4;k++){const a=(G.time*1.2+k*17)%68,q=a/68,sx=x+Math.sin(k*2.3+G.time*.05)*24,sy=y-18-a*1.3;ctx.fillStyle=`rgba(255,226,120,${.9*(1-q)})`;ctx.fillRect(Math.round(sx),Math.round(sy),1,3);ctx.fillRect(Math.round(sx)-1,Math.round(sy)+1,3,1);}}
 // UNPAID: a red flush pulses over him (lighter once the red cells carry it) and steam comes off his head.
 if(red&&!G.reflecting&&!cue){ctx.save();ctx.globalAlpha=(redCell?.06:.3)+(redCell?.06:.12)*Math.sin(G.time*.12);ctx.filter='sepia(1) saturate(6) hue-rotate(-30deg) brightness(.95)';blit(ctx,f,fx,fy);ctx.restore();
  if(!b.outFeet&&!b.finishPending)for(let k=0;k<3;k++){const a=(G.time*.9+k*20)%60,q=a/60,sx=x-b.face*6+Math.sin(a*.15+k)*4,sy=y-b.h+6-a*.5;ctx.fillStyle=`rgba(236,232,226,${.3*(1-q)})`;ctx.beginPath();ctx.arc(Math.round(sx),Math.round(sy),2+q*4,0,Math.PI*2);ctx.fill();}}
 if(cue&&!G.reflecting){
  const top=frameTop(f);let cy=top==null?y-b.h-10:Math.round(fy+top-9);
  if(b.state==='hurl'&&b.carry&&ASSETS.prop_nr_case){const im=ASSETS.prop_nr_case,h=42*im.height/im.width,lift=clamp((b.t-HURL.grab)/10,0,1);cy=Math.min(cy,Math.round(y-27-lift*(b.h-16)-h/2-9));}
  drawCueMarker(ctx,b,x,cy);
 }
 b.pattern=pat;
 // The trunk overhead from the lift to the throw.
 if(b.state==='hurl'&&b.carry&&ASSETS.prop_nr_case){const im=ASSETS.prop_nr_case,w=42,h=w*im.height/im.width,lift=clamp((b.t-HURL.grab)/10,0,1);ctx.drawImage(im,Math.round(x+b.face*(16-13*lift)-w/2),Math.round(y-27-lift*(b.h-16)-h/2),w,h);}
 // Palm catch tell: a yellow '!' over his head for 8 ticks once the next light will be caught.
 if(b.palmT>0&&!G.reflecting){const s='!',tx=x-textWidth(s,2)/2,ty=y-b.h-26;drawTextShadow(ctx,s,tx,ty,'#ffe04a',2);}
 if(b.state==='down'&&b.z<=0&&!G.reflecting)drawDazeRing(ctx,x-b.face*36,y-33,b.t);
 drawBundle(ctx,b,camX);
}
// The chain's floor streak: a red band on CHAD's lane from the rip to the end of the sweep (jump it).
function drawChainCue(ctx,b,camX){
 if(!(b.state==='windup'&&b.pattern==='chain'||b.state==='chain'&&b.t<=CHAIN.to))return;
 const x0=Math.round(b.x-camX-b.face*CHAIN.back),x1=Math.round(b.x-camX+b.face*CHAIN.reach),y=Math.round(b.chainY),lo=Math.min(x0,x1),w=Math.abs(x1-x0);
 ctx.save();ctx.globalAlpha=.35+.35*((G.time>>2)&1);ctx.fillStyle='#ff3040';ctx.fillRect(lo,y-2,w,4);ctx.globalAlpha=.9;ctx.fillStyle='#ffd0a0';
 for(let d=(G.time>>1)%6;d<w;d+=6)ctx.fillRect(lo+d,y,3,1);ctx.restore();
}

// ---- rooftop duel --------------------------------------------------------------------------------
// One shot a string (8, a long 44-tick aim), a reload every 3; grit 5, swing 10, whip 10, shove 5.
const ROOF_WIND={shot:44,swing:30,grit:24,shove:greenWind(14,1)},ROOF_DMG={shot:8,grit:5,swing:10,whip:10,shove:5},ROOF_PARRY_TRIM=12,ROOF_STAGGER_CAP=18,ROOF_AMMO=3,ROOF_GUARD=2,TRIP_HITS=3;
// Point-blank grit winds up longer so the lane change (or the jump) is readable.
const roofWind=b=>b.pattern==='grit'&&b.gritClose?32:ROOF_WIND[b.pattern];
// The briefcase covers his front only while he cowers under it in a corner.
const guardedNeta=(b,dir,heavy,launch)=>b.guard>0&&!b.protectedStagger&&!app(b)&&dir===-b.face&&b.state==='cower';
// The duel loses its nerve in three moods: bravado (gun), panic (dirty tricks, a bribe), flight (runs, trips, begs).
const mood=b=>b.hp>b.maxhp*.6?1:b.hp>b.maxhp*.3?2:3;
const COWER_T=64,FLEE_T=80,BEG_T=84,PANIC_T=40,ROOF_EDGE=40;
// After the commandos he turns on CHAD himself: one line, then the duel.
const ROOF_BARK="FINE. I'LL DO IT MYSELF.",BARK_HOLD=60;
// The bribe: he kneels and begs long enough to read his plea (hit him: REFUSED), flings the cash at
// BRIBE (parry it back: REFUND), gets up and pistol-whips (green).
const BRIBE=130,BRIBE_LINE='TAKE IT! LET ME GO!';
const WHIP=BRIBE+34;
export function netaCueOn(b){
 if(b.phase===1)return b.state==='windup'&&b.pattern!=='pound'||b.state==='pound'&&b.t>=HAMMER-GREEN_WARNING_TICKS+(b.pd||0)&&b.t<=HAMMER+(b.pd||0)||b.state==='hurl'&&b.t<=HURL.lift;
 return b.state==='windup'||b.state==='swing'&&b.t<=2||b.state==='shove'&&b.t<=1||b.state==='bribe'&&(b.t>=BRIBE-GREEN_WARNING_TICKS&&b.t<=BRIBE||b.t>=WHIP-GREEN_WARNING_TICKS&&b.t<=WHIP);
}
// The coward's beats (ticks): an empty-gun click routine opens every reload (then the fumble), a trip ends in a crawl
// away before he stands, and a laugh at a floored CHAD chokes into a gulp.
const CLICK_T=24,CRAWL_T=30,GULP_T=18,RELOAD_JABS=5;
// Rooftop Netaji's voice and Foley (audio/sfx/neta_roof_*, tools/production/build_neta_roof_audio.py). One voice line
// at a time (VOICE_GAP) and a floor per Foley kind, so combos, stamps and steps never machine-gun.
const VOICES=new Set(['yelp','whimper','beg','laugh','scream','gulp']),VOICE_GAP=16,FOLEY_GAP={step:8,cash:10,thud:10,click:4};
function nr(b,name,vol,force=false){
 const kind=name.replace(/\d+$/,''),at=(b.nrAt||={}),now=G.rawTime,voice=VOICES.has(kind);
 if(!force&&(voice&&now-(at.voice??-99)<VOICE_GAP||now-(at[kind]??-99)<(FOLEY_GAP[kind]||0)))return;
 at[kind]=now;if(voice)at.voice=now;G.audio.sfx('neta_roof_'+name,vol);
}
const yelp=b=>nr(b,'yelp'+(1+(b.yelps=((b.yelps||0)+1)%3)));
// Landing thud and the time he has lain on the roof (the beetle kick waits for it).
function roofBody(b){
 if(['down','dying'].includes(b.state)){if(b.z>0)b.airT=1;else if(b.airT){b.airT=0;nr(b,'thud');G.shake=Math.max(G.shake,2);}b.floorT=b.z>0?0:(b.floorT||0)+1;}
 else{b.airT=0;b.floorT=0;}
}
function roofPick(b){
 const p=G.player,d=Math.abs(p.x-b.x),m=mood(b),deck=m===1?['shot','shot','swing']:m===2?['grit','shot','swing','shot']:['shot','grit'];
 let pat=deck[b.turn++%deck.length];
 if(pat==='swing'&&d>96)pat='shot';
 if(pat==='grit'&&d>170)pat='shot';
 // Crowded, he swings the briefcase or shoves (green: parry) instead of throwing grit in CHAD's face.
 if(d<50&&pat!=='bribe')pat=['shove','swing'][(b.close=(b.close||0)+1)%2];
 // Between moves he backs off for a beat: nothing chains without an idle.
 b.atkCd=Math.round((26+(b.turn%3)*10)/diff().aggro);
 if(pat==='shot'&&b.ammo<=0){b.state='reload';b.t=0;b.reloadHits=0;sysPop(b.x,b.y-b.h-10,'CLICK!');nr(b,'click');return;}
 b.pattern=pat;b.t=0;b.hitLanded=false;b.face=sgn(p.x-b.x);b.gritClose=pat==='grit'&&d<70;
 if(pat==='bribe'){b.state='bribe';b.bribes=(b.bribes||0)+1;say(b,'neta',BRIBE_LINE,{life:BRIBE,urgent:true});nr(b,'beg');return;}
 b.state='windup';b.aimY=b.y;
}
// Mood changes are scenes, not stat bumps: the bribe opens his panic, a shriek for security opens his flight.
function roofMood(b){
 const m=mood(b);if(m<=(b.mood||1))return false;
 b.mood=m;b.t=0;b.pattern=null;b.cornered=0;
 if(m===2&&!b.bribes){b.state='bribe';b.bribes=1;b.face=sgn(G.player.x-b.x)||b.face;say(b,'neta',BRIBE_LINE,{life:BRIBE,urgent:true});nr(b,'beg');return true;}
 b.state='panic';say(b,'neta',m===3?'SECURITY! SECURITY!':'STAY BACK!',{urgent:true});nr(b,'scream',1,true);return true;
}
function startFlee(b){const p=G.player;b.state='flee';b.t=0;b.pattern='flee';b.fleeDir=sgn(b.x-p.x)||1;
 // Running for the far edge; if his back is already to it he bolts past along the other lane.
 if(b.fleeDir>0?b.x>G.camX+W-ROOF_EDGE-50:b.x<G.camX+ROOF_EDGE+50)b.fleeDir=-b.fleeDir;
 b.face=b.fleeDir;b.flees=(b.flees||0)+1;nr(b,'yelp1');}
function startBeg(b){b.state='beg';b.t=0;b.pattern='grit';b.face=sgn(G.player.x-b.x)||b.face;say(b,'neta',['NOT THE FACE!','I HAVE A FAMILY!','PLEASE! I VOTE!'][(b.begs=(b.begs||0)+1)%3],{urgent:true});nr(b,'beg');}
function knockNeta(b,dir,trip=false){b.tripDown=trip;b.state='down';b.t=0;b.vz=2.8;b.z=Math.max(b.z,.1);b.vx=dir*1.8;b.protectedStagger=0;if(b.maxGuard)b.guard=b.maxGuard;}
function updateRoof(b){
 const p=G.player,agg=diff().aggro;
 if(b.trainWaiting){
  if(!b.roofGuardsSpawned){b.roofGuardsSpawned=true;G.locked=true;G.camX=G.camLock=8160;for(const [x,y]of [[8460,198],[8600,214]])spawnEnemy('nr_commando',x,y);}
  if(!G.enemies.some(e=>!e.dead&&!e.noCount)&&!G.spawnQueue.length){G.locked=false;if(p.x>=8895){b.trainWaiting=false;G.train.roofChase=false;G.locked=true;G.camX=G.camLock=8640;b.x=8980;b.y=218;b.state='bark';b.t=0;b.face=-1;say(b,'neta',ROOF_BARK,{urgent:true});nr(b,'scream');}}
  return true;
 }
 roofBody(b);
 switch(b.state){
  case 'recover':if(b.t>(b.recoverT||26)){b.state='idle';b.t=0;roofMood(b);}return true;
  // The bark is a stamping tantrum (a thud a stamp) into "I'll do it myself" with a point.
  case 'bark':if(b.t<36&&b.t%12===1){nr(b,'step',1);G.shake=Math.max(G.shake,1);}if(b.t>=BARK_HOLD){b.state='idle';b.t=0;b.atkCd=60;}return true;
  // He trips over his own feet running away (he faces away from CHAD) and belly-flops; the roof thud is roofBody's.
  case 'trip':if(b.t<14)b.x+=b.face*1.1;if(b.t===14){knockNeta(b,b.tripDir||b.face,true);G.shake=Math.max(G.shake,3);}return true;
  // Up from the belly-flop he crawls off on all fours before he stands (hits still land: generic hurt).
  case 'getup':if(!b.tripDown)return false;b.tripDown=false;b.state='crawl';b.t=0;b.face=sgn(b.x-p.x)||1;return true;
  case 'crawl':if(b.t<CRAWL_T){b.x+=b.face*.7;if(b.t%10===3)nr(b,'step',.35);}else{b.state='getup';b.t=6;b.face=sgn(p.x-b.x);}return true;
  case 'gulp':if(b.t>=GULP_T){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,20);}return true;
  case 'idle':{
   if(roofMood(b))return true;
   const dx=p.x-b.x,d=Math.abs(dx),m=mood(b);
   if(p.state==='down'&&!b.laughed&&d<200){b.laughed=true;b.state='laugh';b.t=0;say(b,'neta','HA HA HA!');nr(b,'laugh');return true;}
   if(p.state!=='down')b.laughed=false;
   const wall=b.x<G.camX+ROOF_EDGE||b.x>G.camX+W-ROOF_EDGE;
   // Flight: CHAD near means run; cornered means beg.
   if(m===3&&d<120&&p.state!=='down'){if(wall&&d<84)startBeg(b);else startFlee(b);return true;}
   b.backing=d<84&&!wall;if(b.backing)b.x-=sgn(dx)*1.05*agg;else if(d>150)b.x+=sgn(dx)*.9*agg;
   b.cornered=wall&&d<84?(b.cornered||0)+1:0;if(b.cornered===1)nr(b,'whimper');
   // Panicked little steps while he scurries back (or waddles in).
   if(b.backing||d>150){b.stepAcc=(b.stepAcc||0)+1;if(b.stepAcc%13===0)nr(b,'step',.45);}
   b.y+=clamp(p.y-b.y,-.5,.5);
   // Backed into the edge he ducks under the briefcase (the only time it blocks).
   if(b.cornered>10){b.cornered=0;b.state='cower';b.t=0;b.pattern=null;b.guard=b.maxGuard;nr(b,'whimper');return true;}
   if(--b.atkCd<=0)roofPick(b);
   return true;}
  case 'cower':{
   // Peeks out when CHAD gives him room or the nerve runs out, and shoves (green) if CHAD is still on him.
   const d=Math.abs(p.x-b.x);if(b.t%21===5)nr(b,'whimper',.5);
   if(b.t>=COWER_T||d>110&&b.t>16){b.t=0;b.hitLanded=false;b.face=sgn(p.x-b.x)||b.face;if(d<64){b.pattern='shove';b.state='windup';}else{b.state='idle';b.atkCd=20;}}
   return true;}
  case 'panic':if(b.t%12===1)nr(b,'step',.8);if(b.t>=PANIC_T){b.state='idle';b.t=0;b.atkCd=30;}return true;
  case 'flee':{
   // A waddling sprint with one terrified look back; every other run his feet tangle (the trip is his).
   const edge=b.fleeDir>0?b.x>G.camX+W-ROOF_EDGE:b.x<G.camX+ROOF_EDGE;
   // He veers for the lane CHAD is not on (so the chase is a diagonal, not a straight line).
   b.fleeY??=p.y>(laneMin(b.x)+laneMax(b.x))/2?laneMin(b.x)+8:laneMax(b.x)-8;
   if(b.t<18||b.t>=30){b.x+=b.fleeDir*1.7*agg;b.y+=clamp(b.fleeY-b.y,-.6,.6);}
   if(b.t%9===2)nr(b,'step',.5);
   if(b.flees%2===0&&b.t===44){b.state='trip';b.t=0;b.tripDir=b.fleeDir;b.fleeY=null;sysPop(b.x,b.y-b.h-10,'TRIPPED!');nr(b,'scream',1,true);return true;}
   if(edge||b.t>=FLEE_T){b.fleeY=null;b.face=sgn(p.x-b.x)||-b.fleeDir;if(Math.abs(p.x-b.x)<84)startBeg(b);else{b.state='recover';b.t=0;b.recoverT=30;b.atkCd=40;}}
   return true;}
  case 'beg':
   if(b.t===40||b.t===70)nr(b,'beg',.8);
   // Pocket sand: the plea ends in a fistful of grit (the red grit wind-up).
   if(b.t>=BEG_T){b.state='windup';b.t=0;b.pattern='grit';b.gritClose=true;b.hitLanded=false;}
   return true;
  case 'windup':
   if(b.pattern==='shot'&&b.t<20)b.y+=clamp(p.y-b.y,-.9,.9);
   if(b.t>=roofWind(b)){b.state=b.pattern;b.t=0;b.hitLanded=false;if(b.pattern!=='shot')G.audio.sfx('whiff');}
   return true;
  case 'shot':
   if(b.t===1){
    if(b.ammo<=0){b.state='reload';b.t=0;b.reloadHits=0;sysPop(b.x,b.y-b.h-10,'CLICK!');nr(b,'click');return true;}
    b.ammo--;fire(b,b,b.x+b.face*MUZZLE[0],b.y,b.face,ROOF_DMG.shot,MUZZLE[1]);
   }
   if(b.t>=20){b.state='recover';b.t=0;b.recoverT=22;}
   return true;
  case 'reload':
   // The click routine (trigger again, stare down the barrel, shake it, sickly grin), then the fumble: cylinder
   // out, rounds spilled and juggled, one picked off the roof, thumbed in, snapped shut (r_click, r_fumble).
   if(b.flinchT>0)b.flinchT--;
   if(b.t===3||b.t===19)nr(b,'click');if(b.t===9)nr(b,'whimper');
   if(b.t===CLICK_T+1)nr(b,'spin');if(b.t===CLICK_T+9)nr(b,'drop');if(b.t===CLICK_T+25)nr(b,'gulp');
   if(b.t===CLICK_T+33)nr(b,'spin',.6);if(b.t===CLICK_T+41)nr(b,'snap');
   if(b.t>=72){b.ammo=ROOF_AMMO;b.state='idle';b.t=0;b.atkCd=24;}
   return true;
  case 'swing':
   if(b.t<6)b.x+=b.face*1.4;
   if(b.t===2&&tryHitPlayer(b,ROOF_DMG.swing,78,true,18,'counter'))b.hitLanded=true;
   if(b.t>=24){if(b.hitLanded){b.state='recover';b.t=0;b.recoverT=20;}else{b.state='dizzy';b.t=0;say(b,'neta','WHOA-',{wait:10});nr(b,'whimper');}}
   return true;
  case 'dizzy':if(b.flinchT>0)b.flinchT--;if(b.t>=34){b.state='idle';b.t=0;b.atkCd=30;}return true;
  case 'grit':
   if(b.t===2){const s=spawnShot('powder',b.x+b.face*26,b.y,b.face*3.4,ROOF_DMG.grit,{source:b,parryClass:'unblockable'});s.draw=gritDraw;G.audio.sfx('throw');}
   if(b.t>=30){b.state='recover';b.t=0;b.recoverT=24;}
   return true;
  case 'shove':
   // Belly and forearm, then a little recoil hop back off it (airborne, so the step back is a jump).
   if(b.t===1&&tryHitPlayer(b,ROOF_DMG.shove,58,false,16,'counter'))b.hitLanded=true;
   // A quick airborne hop (one cell, so it must stay short or it reads as a slide).
   if(b.t>=10&&b.t<20){b.x-=b.face*1.4;b.z=Math.sin((b.t-10)/10*Math.PI)*8;}
   if(b.t===20){b.z=0;G.audio.sfx('land');}
   if(b.t>=30){b.state='recover';b.t=0;b.recoverT=16;}
   return true;
  case 'bribe':
   // Waving the cash (rustles), then the plea on his knees (begging blips).
   if(b.t===9||b.t===17||b.t===25)nr(b,'cash',.8);if(b.t===52||b.t===90)nr(b,'beg');
   if(b.t===BRIBE){nr(b,'cash');const s=spawnShot('bullet',b.x+b.face*30,b.y,b.face*4.2,8,{source:b,parryClass:'reflect'});s.draw=cashShotDraw;s.hy=56;s.life=110;G.audio.sfx('throw');}
   // He gets up, takes a step in, and swings the revolver butt down.
   if(b.t>=BRIBE+22&&b.t<BRIBE+28)b.x+=b.face*3;
   if(b.t===WHIP){if(tryHitPlayer(b,ROOF_DMG.whip,62,true,16,'counter'))nr(b,'whip');else G.audio.sfx('whiff');}
   if(b.t>=WHIP+22){b.state='recover';b.t=0;b.recoverT=24;}
   return true;
  case 'laugh':if(b.t>=56||G.player.state!=='down'&&b.t>=30){b.state='gulp';b.t=0;nr(b,'gulp');}return true;
 }
 return false;
}
// Every roof state plays a real cycle of the coward's roof cells (r_*, build_train_neta_moves.py); the older
// sheet cells stay as fallbacks if the art is missing.
function roofPose(b){
 const t=b.t,rc=nCell;
 switch(b.state){
  // Under the briefcase: a blocked hit jolts him into the deepest crouch.
  case 'cower':return rc('r_cower',b.guardFlash>0?2:(t/7|0)%4,['cower',0]);
  case 'panic':return rc('shout',(t/5|0)%3,['point',0]);
  case 'flee':if(b.moved<.1)return rc('flee_glance',0,['panic',0]);return rc('flee_run',(b.stridePhase/6|0)%6,['walk',b.stridePhase/6|0]);
  // On his knees, hands clasped; the last beat he gets one foot under him for the pocket sand.
  case 'beg':return t>=BEG_T-8?['kneel',2]:rc('beg',(t/8|0)%4,['kneel',0]);
  case 'windup':
   if(b.pattern==='shot'&&b.moved>.3)return ['walk',b.stridePhase/6|0];
   // The one-handed aim shakes (a new cell every 4 ticks) and steadies for the last 10 ticks before the shot.
   if(b.pattern==='shot')return t>=roofWind(b)-10?rc('r_shot',0,['r_aim',0]):rc('r_aim',(t>>2)&3,['aim',0]);
   if(b.pattern==='swing'&&hasAIState('nr_neta','r_swing'))return ['r_swing',t<6?0:t<16?1:2];
   if(b.pattern==='grit'&&hasAIState('nr_neta','r_grit'))return ['r_grit',t<6?0:t<roofWind(b)-8?1:2];
   if(b.pattern==='shove'&&hasAIState('nr_neta','r_shove'))return ['r_shove',t<8?0:1];
   {const h=t>=roofWind(b)/2?1:0;// run-2 production cells (N1) with the old cells as fallbacks
   return b.pattern==='swing'?nCell('swing_full',h,['swing',0]):b.pattern==='grit'?nCell('grit_full',h,['grit',0]):nCell('shove_full',h,['shove',1]);}
  case 'shot':if(hasAIState('nr_neta','r_shot'))return ['r_shot',t<1?0:t<3?1:t<6?2:t<10?3:t<15?4:5];
   return t>=1&&t<5?['fire',0]:t>=5&&t<11?nCell('recoil',0,['fire',0]):rc('r_aim',((t-11)>>2)&3,['aim',0]);
  case 'bark':return t<36?rc('r_tantrum',[0,1,2,3,0,1][t/6|0],['cornered',0]):t<44?rc('r_tantrum',4,['point',0]):['point',0];
  case 'trip':return rc('r_trip',t<4?0:t<9?1:2,['balance',0]);
  case 'reload':
   if(b.flinchT>0)return rc('r_whimper',1,['hurt',1]);
   return t<CLICK_T?rc('r_click',t/6|0,['reload',0]):rc('r_fumble',Math.min(5,(t-CLICK_T)/8|0),['reload',1+Math.min(3,(t-CLICK_T)/12|0)]);
  case 'swing':if(hasAIState('nr_neta','r_swing'))return ['r_swing',t<2?2:t<6?3:t<12?4:5];
   return hasAIState('nr_neta','swing_full')?['swing_full',t<6?2:t<14?3:4]:t<8?['swing',1]:['swing',2];
  case 'dizzy':return b.flinchT>0?rc('r_whimper',0,['hurt',0]):t<10?['balance',0]:nCell('dizzy',((t-10)/8|0)%4,['wobble',(t/8|0)&1]);
  case 'grit':if(hasAIState('nr_neta','r_grit'))return ['r_grit',t<2?2:t<6?3:t<14?4:5];
   return nCell('grit_full',2,['grit',1]);
  case 'shove':if(hasAIState('nr_neta','r_shove'))return ['r_shove',t<1?1:t<4?2:t<10?3:t<20?4:5];
   return t<26?nCell('shove_full',t<10?2:3,['shove',t<10?2:3]):rc('r_wheeze',0,['idle',0]);
  case 'bribe':{
   // Standing, he waves the cash at CHAD, clasps it, then drops to his knees to beg (R2 loop).
   if(t<30)return rc('r_bribe',[0,1,2,1][t/8|0],['kneel',0]);if(t<36)return rc('r_bribe',3,['kneel',0]);
   if(t<BRIBE-GREEN_WARNING_TICKS)return nCell('beg',((t-36)/8|0)%4,['kneel',0]);if(t<BRIBE+10)return ['kneel',1];if(t<BRIBE+22)return ['kneel',2];
   if(t<BRIBE+28)return ['walk',(t-BRIBE-22)/3|0];if(t<WHIP)return nCell('whip_full',0,['whip',0]);if(t<WHIP+8)return nCell('whip_full',1,['whip',1]);if(t<WHIP+22)return nCell('whip_full',2,t<WHIP+14?['whip',1]:['idle',0]);return rc('r_wheeze',0,['idle',0]);}
  case 'laugh':return rc('r_laugh',(t/6|0)&1,['laugh',(t>>3)&1]);
  case 'gulp':return rc('r_laugh',t<8?2:3,['panic',0]);
  // Between moves: trembling after a shot, wheezing after anything physical.
  case 'recover':
   if(t<6&&b.pattern==='shot'&&hasAIState('nr_neta','r_shot'))return ['r_shot',5];
   if(t<6&&b.pattern==='swing'&&hasAIState('nr_neta','r_swing'))return ['r_swing',5];
   if(t<6&&b.pattern==='grit'&&hasAIState('nr_neta','r_grit'))return ['r_grit',5];
   if(t<6&&b.pattern==='shove'&&hasAIState('nr_neta','r_shove'))return ['r_shove',5];
   return b.pattern==='shot'?rc('r_tremble',(t/7|0)%4,['idle',0]):rc('r_wheeze',(t/8|0)%4,['pant',0]);
  case 'hurt':return rc('r_whimper',t<3?0:t<7?1:2,['hurt',t<6?0:1]);
  case 'stagger':{if(b.gbT>0)return ['guardbreak',0];const d=dazePose(b);return [d.name,d.idx];}
  case 'down':case 'dying':{
   const f=b.floorT||0;
   if(b.tripDown)return b.z>0?rc('r_trip',2,['fall',0]):rc('r_trip',f<10?3:4,['down',0]);
   if(b.z>0)return ['fall',0];
   // Flat on his back like an upturned beetle: dazed, then kicking and rocking.
   return f<4||b.state==='dying'?rc('r_downed',0,['down',0]):rc('r_downed',[1,2,1,3][((f-4)/4|0)%4],['down',0]);}
  case 'crawl':return rc('r_crawl',(t/5|0)%6,['down',0]);
  case 'getup':return b.tripDown?rc('r_crawl',0,['down',0]):['getup',Math.min(3,t/4|0)];// the tick before the crawl takes over
 }
 // Pinned at the edge with CHAD in his face he cowers under the briefcase; otherwise he trembles.
 if(b.cornered>0&&!b.backing)return rc('r_cower',(G.time/7|0)%4,['cower',0]);
 if(b.moved>.1)return b.backing?['backpedal',b.stridePhase/8|0]:['walk',b.stridePhase/6|0];
 return rc('r_tremble',(G.time/7|0)%4,['idle',G.time/16|0]);
}
function drawRoofProp(ctx,q,i,camX){const im=ASSETS.nr_roof_fittings;if(im)ctx.drawImage(im,((i%2)*2+(q.broken?1:0))*128,0,128,96,q.x-camX-32,q.y-47.5,64,48);}
const TOPS=new WeakMap();
function frameTop(f){
 if(!f?.getContext)return null;
 if(!TOPS.has(f)){const a=f.getContext('2d').getImageData(0,0,f.width,f.height).data;let top=0;
  scan:for(;top<f.height;top++)for(let x=0;x<f.width;x++)if(a[(top*f.width+x)*4+3]>64)break scan;TOPS.set(f,top/(f._as||1));}
 return TOPS.get(f);
}
function drawNetaRoof(ctx,b,camX){
 if(b.trainWaiting)return;
 const [st,i]=roofPose(b),x=Math.round(b.x-camX),y=Math.round(b.y-b.z),f=getFrame(b.set,st,i,b.face);
 const cue=netaCueOn(b);
 const pat=b.pattern;if(b.state==='bribe')b.pattern='bribe';
 blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,cue);
 // 9px over the top of the pose actually shown (a raised case or a crouch moves it); popH-based if art is missing.
 if(cue&&!G.reflecting){const top=frameTop(f);drawCueMarker(ctx,b,x,top==null?y-b.popH+18:Math.round(y-frameH(f)+4+top-9));}
 b.pattern=pat;
 if(!G.reflecting&&(b.state==='windup'&&b.pattern==='shot'||b.state==='shot'&&b.t<25)){aimLine(ctx,x+b.face*MUZZLE[0],y-MUZZLE[1],b.face,b.state==='shot'?b.t+8:b.t);}
}

// ---- module --------------------------------------------------------------------------------------
// Rooftop health is its own bar and starts full (frac is for review scenes only).
function toRoof(b,frac=1){
 const max=Math.round(ROOF_HP*diff().hp),hp=Math.round(max*frac);
 Object.assign(b,{phase:2,roof:true,set:SPR.nr_neta,w:48,h:84,popH:90,shadowR:18,contactY:52,label:null,maxhp:max,hp,guard:ROOF_GUARD,maxGuard:ROOF_GUARD,paid:0,
  state:'idle',t:0,z:0,vz:0,vx:0,ammo:ROOF_AMMO,turn:0,bribes:0,mood:1,flees:0,begs:0,fleeY:null,enraged:false,finishPending:false,outFeet:false,enragedShera:false,floorBy:null,fightProps:ROOF_PROPS(),ally:null,notes:[],speech:null,sayQ:[],crashT:0,flinches:0});
 G.props=G.props.filter(q=>q.kind!=='neta');
}
// Out on his feet after the UNPAID phase: the finisher cinematic takes over ('shera-finish', train.js).
function startFinish(b){
 G.enemies=[];G.spawnQueue=[];G.player.grabbedBy=null;if(G.player.state==='held')G.player.state='idle';
 G.props=G.props.filter(q=>q.kind!=='neta');
 b.protectedStagger=0;b.finishPending=false;b.outFeet=false;
 startTrainCinematic('shera-finish');
 toRoof(b);
 const p=G.player;if(p.dying||p.hp<=0){p.dying=false;p.hp=Math.max(p.hp,30);}
}
// Both of them read a flailing guard: tapping parry again while a window is still open cancels it
// (TOO EARLY) and locks the next tap; a tap that runs out unused locks it for longer than usual.
function watchParry(b){
 const p=G.player,gw=p.guardWindow||0,prev=b.gwPrev||0;
 if(gw===PARRY_WINDOW&&prev>0&&prev<PARRY_WINDOW){p.guardWindow=0;p.parryLock=Math.max(p.parryLock||0,SPAM_LOCK);if(G.time-(b.spamPopAt||-99)>40){b.spamPopAt=G.time;sysPop(p.x,p.y-p.z-112,'TOO EARLY');}}
 else if(gw===0&&prev===1&&p.state!=='parry')p.parryLock=Math.max(p.parryLock||0,WHIFF_LOCK);
 b.gwPrev=p.guardWindow||0;
}
// Guard wears down under heavies but knits back after a quiet spell, so only sustained pressure breaks it.
function regenGuard(b){
 if(!b.maxGuard)return;
 if(b.guard<(b.guardSeen??b.guard))b.guardQuiet=0;else b.guardQuiet=(b.guardQuiet||0)+1;
 if(b.guard>0&&b.guard<b.maxGuard&&b.guardQuiet>=100&&b.guardQuiet%40===0)b.guard=Math.min(b.maxGuard,b.guard+.35);
 b.guardSeen=b.guard;if(b.gbT>0)b.gbT--;
}
function tick(b){
 tickSpeech(b);updateNotes(b);watchParry(b);regenGuard(b);
 if(b.parryTrim){if(b.protectedStagger>0&&b.protectedStagger<=45)b.protectedStagger=Math.max(1,b.protectedStagger-b.parryTrim);b.parryTrim=0;}
 // Both phases: on the roof this used to freeze him in the briefcase block for the rest of the duel.
 if(b.guardFlash>0)b.guardFlash--;
 // The shove's recoil hop settles if a hit interrupts it.
 if(b.phase===2&&b.z>0&&!b.vz&&!['shove','down','dying'].includes(b.state))b.z=Math.max(0,b.z-1.5);
 // On the roof the guard is the briefcase he cowers under: stray heavies elsewhere never wear it down.
 if(b.phase===2&&b.state!=='cower'&&!b.protectedStagger)b.guard=b.maxGuard;
 if(b.phase!==1)return;
 // The big man keeps to the lower lanes, so the hammer never reaches up over the HUD.
 if(!['quake','down'].includes(b.state)&&!b.z)b.y=Math.max(b.y,laneMin(b.x)+13);
 if(b.crashT>0)b.crashT--;
 if(b.paid>0&&--b.paid===0)endPaid(b,'SHIFT OVER');
 // Netaji gloats when Shera lands one on CHAD, and nags while Shera is on the floor.
 const php=G.player.hp;if(b.ally&&php<(b.pHp??php)&&!G.player.dying)heckle(b,'gloat');b.pHp=php;

 if(!rage(b)&&b.hp<b.maxhp*RAGE_FLOOR)b.hp=b.maxhp*RAGE_FLOOR;
 if(b.ally&&G.state==='play')updateAlly(b,b.ally);
 if(b.ally?.fled){G.props=G.props.filter(q=>q!==b.ally);b.ally=null;b.netaFled=true;if(b.speech?.who==='neta')b.speech=null;b.sayQ=(b.sayQ||[]).filter(q=>q.who!=='neta');}
 if(b.thrownTrunk&&!G.shots.includes(b.thrownTrunk))smashTrunk(b,b.thrownTrunk);
 // Every stride is a heavy footfall; UNPAID he stamps and the floor shakes.
 if(b.moved>.3&&(b.stepAt=(b.stepAt||0)+b.moved)>=(rage(b)?28:22)){b.stepAt=0;G.audio.sfx('shera_step',rage(b)?.75:.45);if(rage(b))G.shake=Math.max(G.shake,1.5);}
 // Out cold: pinned in place, nothing moves him.
 if(b.finishPending||b.outFeet){b.vx=0;b.moved=0;if(b.koX==null)b.koX=b.x;b.x=b.koX;}else b.koX=null;
 // The killing blow waits for a super to finish; then he stands out on his feet.
 if(b.finishPending&&!b.superLocked&&G.state==='play'&&!G.train?.cinematic){b.finishPending=false;b.outFeet=true;b.protectedStagger=0;b.floorBy=null;b.state='outfeet';b.t=0;b.z=0;b.vz=0;b.vx=0;G.audio.sfx('shera_ko');}
}
export const neta={
 noRage:true,introTicks:INTRO.end,
 init(b){
  const brk=b.breakGuard;b.breakGuard=()=>{if(b.backupProtected)return;brk();b.gbT=22;if(b.phase===1)b.floorBy='guardbreak';};
  // A parry riposte is one of the five ways to floor him; his parry stagger is 40 ticks, not 45.
  const par=b.parried;b.parried=(d,dir)=>{par(d,dir);if(b.phase===1&&!b.dead&&!b.outFeet){b.floorBy='riposte';b.parryTrim=5;}else if(b.phase!==1)b.parryTrim=ROOF_PARRY_TRIM;};
  b.phase=1;b.guard=b.maxGuard=3;b.label='SHERA';b.w=57;b.h=114;b.popH=118;b.shadowR=24;b.contactY=85;
  b.turn=0;b.paid=0;b.notes=[];b.speech=null;b.sayQ=[];b.behind=0;b.roof=false;b.fightProps=[{x:7760,y:222},{x:8134,y:244}];
  b.ally=makeNeta(b);
  G.props=G.props.filter(q=>q.kind!=='neta');G.props.push(b.ally);
 },
 toRoof,
 // Straight into the UNPAID phase (the enraged checkpoint and review scenes): Netaji has already fled.
 enrage(b,frac=RAGE_FLOOR){
  G.props=G.props.filter(q=>q.kind!=='neta');b.ally=null;b.netaFled=true;b.abandonT=0;b.speech=null;b.sayQ=[];
  becomeEnraged(b,true);Object.assign(b,{hp:b.maxhp*frac,state:'idle',t:0,atkCd:60,protectedStagger:0});
 },
 // Only a parry riposte, a crash, a guard break, a reflected trunk or a DENIED bonus floors Shera.
 canFloor(b){return b.phase!==1||!!b.floorBy&&!b.finishPending&&!b.outFeet;},
 intro(b,t){
  b.x=G.camLock+440-Math.min(60,t)*(76/60);b.y=218;b.face=introFace(t);
  const n=b.ally;if(n){n.x=b.x+introGap(t);n.y=212;n.face=-1;}
  if(t===124||t===132)G.audio.sfx('cond_note_2',.5);
  if(t===152)G.audio.sfx('pickup');
  for(const c of [184,196,208,246,256,266])if(t===c)G.audio.sfx('entrance_crack');
  if(t===INTRO.flex){G.audio.sfx('land');G.shake=2;}
 },
 endIntro(b){Object.assign(b,{x:G.camLock+364,y:218,face:-1,state:'idle',t:0,atkCd:60});const n=b.ally;if(n)Object.assign(n,{x:b.x+introGap(INTRO.end),y:212,st:'back',clock:0,payCd:PAY.first,heckleCd:240});},
 // Both lines sit above Shera's head (never over a face): Netaji's first, then Shera's after a beat.
 introLine(b,t,camX){
  const n=b.ally||b;
  for(const [who,from,text] of INTRO.lines){const life=lineLife(text);if(t>=from&&t<from+life)return {text,x:(who==='neta'?n.x:b.x)-camX,bottom:90,age:t-from,remaining:from+life-t,width:190};}
  return null;
 },
 // Called once a tick. Shera is slow to turn round (26 ticks, restarted by a hit from behind) while idle or recovering, so slipping behind him
 // is a real opening for the two behind-hits that provoke his OI! pound.
 keepFace(b){if(b.phase===1&&b.state==='hurt'&&b.hitBehind)return true;// the hit-from-behind flinch faces away
  if(b.phase===1&&['idle','recover'].includes(b.state)){const want=G.player.x<b.x?-1:1;if(want!==b.face&&Math.abs(G.player.x-b.x)<108&&(b.turnT=(b.turnT||0)+1)<(rage(b)?14:26))return true;b.turnT=0;return false;}
  return b.phase===1?['windup','pound','bullrush','quake','bonus','count','pocket','wakeshove','catch','headbutt','hug','hughold','stumble','chain','snag','hurl','totrunk','roar','abandon','turnroar','outfeet'].includes(b.state):['windup','shot','swing','grit','shove','bribe','dizzy','reload','trip','crawl','flee'].includes(b.state);},
 beforeHurt(b,dmg,dir,heavy,launch){
  if(b.trainWaiting||G.train?.cinematic)return false;
  b.hitBehind=dir===b.face;
  if(b.phase===1){
   if(b.outFeet){spawnSpark(b.x-dir*6,b.y-76);return false;}
   if(b.finishPending)return true;
   const light=!heavy&&!launch&&!app(b);
   // The palm catch: the light after three (two UNPAID) in an opening is caught.
   if(light&&SOFT.includes(b.state)&&catchReady(b)&&!G.player.dying&&G.player.z<8){startCatch(b);return false;}
   if(guardedShera(b,dir,heavy,launch)){if(!b.guardFlash)sysPop(b.x,b.y-b.h-8,'BLOCK');b.guardFlash=12;G.audio.sfx('armor');spawnSpark(b.x+b.face*21,b.y-83);G.player.x+=b.face*5;G.hitstop=Math.max(G.hitstop,3);return false;}
   // UNPAID, lights between his strings sting (30%) but never make him flinch.
   if(rage(b)&&light&&['idle','recover','totrunk'].includes(b.state)){b.hp=Math.max(.001,b.hp-dmg*.3);b.flash=4;spawnSpark(b.x-dir*6,b.y-76);G.audio.sfx('armor');G.hitstop=Math.max(G.hitstop,2);if(!b.hitBehind)countLight(b);return false;}
   if(!app(b)&&armoured(b)){
    b.hp-=dmg*.1;b.flash=4;spawnSpark(b.x-dir*6,b.y-76);G.audio.sfx('armor');G.hitstop=Math.max(G.hitstop,3);
    if(!rage(b))b.hp=Math.max(b.hp,b.maxhp*RAGE_FLOOR);else if(b.hp<=0){b.hp=.001;b.finishPending=true;}
    return false;
   }
   return true;
  }
  // Flat on the roof he is under the punches (as in SoR2): only a super still reaches him.
  if(['down','getup'].includes(b.state)&&!b.superApplying&&b.state!=='dying')return false;
  // Cowering, the briefcase takes the hit (BLOCK); two lights or one heavy knock it out of his hands.
  if(guardedNeta(b,dir,heavy,launch)){if(!b.guardFlash)sysPop(b.x,b.y-b.h-8,'BLOCK');G.audio.sfx('armor');spawnSpark(b.x+b.face*14,b.y-40);G.player.x+=b.face*3;G.hitstop=Math.max(G.hitstop,3);
   b.damageGuard(heavy||launch?b.maxGuard:1);if(b.guard>0)b.guardFlash=8;else{sysPop(b.x,b.y-b.h-24,'CASE DROPPED!');nr(b,'scream',1,true);}return false;}
  return true;
 },
 onHurt(b,dmg,heavy,launch){
  const dir=b.hitBehind?b.face:-b.face;
  if(b.phase===1){
   if(!rage(b)&&b.hp<b.maxhp*RAGE_FLOOR)b.hp=b.maxhp*RAGE_FLOOR;
   if(b.hp<=0){b.hp=.001;if(!b.finishPending){b.finishPending=true;b.floorBy=null;b.state='stagger';b.t=0;b.protectedStagger=Math.max(b.protectedStagger,20);}return true;}
   // Hit before his hand closes on Netaji's bundle: DENIED.
   if(b.state==='bonus'&&b.t<PAY.close&&dmg>0){denyBonus(b);sheraHurtSfx(b,true);return true;}
   if(dmg>0)sheraHurtSfx(b,heavy||launch);
   const light=!heavy&&!launch&&!app(b)&&dmg>0;
   if(light&&!b.hitBehind&&SOFT.includes(b.state))countLight(b);else if(!light&&dmg>0)b.lights=0;
   // A trunk parried back into him: 30 in all and a crash stagger he can be floored out of.
   if(b.reflectedKind==='trunk'){b.hp=Math.max(.001,b.hp-Math.max(0,HURL.reflect-dmg));b.protectedStagger=Math.max(b.protectedStagger,HURL.stagger);b.parryTrim=0;b.crashT=18;b.floorBy='reflect';b.state='stagger';b.t=0;
    smashTrunk(b,b.thrownTrunk||{x:b.x,y:b.y,vx:-b.face});sysPop(b.x,b.y-b.h-8,'RETURN TO SENDER!');G.shake=Math.max(G.shake,6);return true;}
   if(b.state==='count'){b.countHits++;b.flinchT=8;burstNotes(b,b.x,b.y,75,2);if(b.countHits===1)say(b,'shera','HEY!');return true;}
   if(['quake','snag','roar'].includes(b.state)){burstNotes(b,b.x,b.y,72,1);return true;}
   // A whiffed hug leaves his back open: hits from behind pay half as much again.
   if(b.state==='stumble'){if(b.hitBehind)b.hp=Math.max(.001,b.hp-dmg*.5);return true;}
   // A stagger is earned (a dodged rush or quake, a guard break, his boss's stray bullet).
   if(b.state==='stagger')return false;
   if(['down','getup'].includes(b.state))return true;
   if(b.hitBehind&&['idle','recover','hurt'].includes(b.state)){b.behind=(b.behind||0)+1;b.turnT=0;return false;}
   return true;
  }
  // Each mood plays its scene before the next: damage stops at the threshold until roofMood has run.
  {const floor=(b.mood||1)<2?.6:b.mood<3?.3:0;if(floor&&b.hp<b.maxhp*floor)b.hp=b.maxhp*floor;}
  // Every hit on the roof gets a squeak (rotating yelps, rate-limited by nr); the big moments scream over them.
  if(b.reflectedKind==='bullet'&&b.state!=='down'){sysPop(b.x,b.y-b.h-10,'REFUND!');burstNotes(b,b.x,b.y,50,6);nr(b,'scream',1,true);nr(b,'cash');}else yelp(b);
  if(b.state==='bribe'&&b.t<BRIBE){b.speech=null;b.sayQ=[];burstNotes(b,b.x,b.y,30,10);b.breakGuard();sysPop(b.x,b.y-b.h-10,'REFUSED!');nr(b,'cash');return true;}
  // Mashed through a whole reload he panics, slams the cylinder shut half-loaded and scurries off (the reload
  // is a heavy-hit opening, not a free jab bag).
  if(b.state==='reload'&&!heavy&&!launch&&++b.reloadHits>=RELOAD_JABS){b.ammo=Math.max(b.ammo,2);b.state='idle';b.t=0;b.atkCd=36;b.flinchT=0;nr(b,'snap');return true;}
  if(['reload','dizzy','laugh','gulp'].includes(b.state)){if(heavy||launch){knockNeta(b,dir);return true;}b.flinchT=7;if(['laugh','gulp'].includes(b.state)){b.state='idle';b.t=0;b.atkCd=12;}return true;}
  if(b.state==='trip')return true;
  // Kicked while he crawls he squeals and keeps crawling (popping upright into a flinch read as a glitch).
  if(b.state==='crawl'){b.x+=dir*3;b.t=Math.max(0,b.t-4);return true;}
  // A parry buys a short punish, not the whole bar: past ROOF_STAGGER_CAP damage he shakes the daze off.
  if(b.protectedStagger>0){b.stagDmg=(b.stagDmg||0)+dmg;if(b.stagDmg>=ROOF_STAGGER_CAP&&b.protectedStagger>4){b.protectedStagger=4;b.stagDmg=0;}}else b.stagDmg=0;
  // A coward, not a fighter: four hits in a row and he trips over his own feet (a free knockdown).
  if(['idle','recover','windup','shot','grit','swing','shove','hurt','flee','beg','panic'].includes(b.state)){
   b.flinches=G.rawTime-(b.flinchAt||-99)<60?(b.flinches||0)+1:1;b.flinchAt=G.rawTime;
   // Two in a row and he ducks under the briefcase (moods 1-2): CHAD has to knock it out of his hands.
   if(b.flinches===2&&mood(b)<3&&b.state!=='flee'){b.flinches=0;b.state='cower';b.t=0;b.pattern=null;b.guard=b.maxGuard;b.guardFlash=6;b.vx=0;nr(b,'whimper');return true;}
   if(b.flinches>=TRIP_HITS){b.flinches=0;b.state='trip';b.t=0;b.tripDir=dir;b.face=dir||b.face;b.pattern=null;sysPop(b.x,b.y-b.h-10,'TRIPPED!');nr(b,'scream',1,true);return true;}
  }
  return false;
 },
 onDown(b){b.floorBy=null;b.lights=0;if(b.phase===1){if(b.paid)endPaid(b);G.audio.sfx('shera_hurt2',.8);heckle(b,'nag',true);}},
 afterOpening(b){b.floorBy=null;if(b.outFeet){b.state='outfeet';}},
 staggerTick(b){tick(b);return false;},
 update(b){
  tick(b);
  if(G.train?.cinematic)return true;
  return b.phase===1?updateShera(b):updateRoof(b);
 },
 roofPose,
 // The roof fittings sort at their own depth (main.js drawWorld), not at Netaji's.
 sceneProps(b){return (b.fightProps||[]).map((q,i)=>q.roof&&{kind:'prop',y:q.y-4,draw:(c,camX)=>drawRoofProp(c,q,i,camX)}).filter(Boolean);},
 onDeath(b){b.speech=null;if(b.phase!==1)nr(b,'ko',1,true);G.train.knockoutBody=true;startTrainCinematic('knockout');},
 // PAID: a gold timer bar beside his health (floor him or crash him to cut it short).
 drawHud(ctx,b,bx,by){
  if(b.phase!==1||!(b.paid>0))return;
  const x=bx+172,w=60,label='PAID',k=b.paid/PAID_TICKS,blink=b.paid<90&&(G.time>>2)&1;
  ctx.fillStyle='rgba(12,8,12,0.7)';ctx.fillRect(x-2,by-9,textWidth(label,1)+4,8);drawTextShadow(ctx,label,x,by-8,'#ffd46a',1);
  ctx.fillStyle='#100a0c';ctx.fillRect(x-1,by-1,w+2,7);ctx.fillStyle='#2c2412';ctx.fillRect(x,by,w,5);
  if(!blink){ctx.fillStyle='#e0b43c';ctx.fillRect(x,by,Math.round(w*k),5);ctx.fillStyle='#fff0a8';ctx.fillRect(x,by,Math.round(w*k),1);}
  return label;
 },
 demo(b,value){
  const p=G.player;b.protectedStagger=0;b.t=0;b.face=sgn(p.x-b.x);b.hitLanded=false;
  if(b.phase===1){
   if(value==='count'){b.state='count';b.countHits=0;return;}
   // The bonus hand-off: Netaji is placed at his pay spot and Shera turns to take it.
   if(value==='paid'||value==='bonus'){const n=b.ally;if(!n){startPaid(b);b.state='idle';b.atkCd=30;return;}
    const [tx,ty]=paySpot(b);Object.assign(n,{x:tx,y:ty,st:'handoff',clock:0});b.state='bonus';b.atkCd=30;return;}
   if(value==='abandon'){b.hp=Math.min(b.hp,b.maxhp*RAGE_AT);b.state='idle';b.atkCd=999;checkRage(b);return;}
   if(value==='enraged'){this.enrage(b);return;}
   if(value==='catch'){b.state='count';b.countHits=0;b.lights=3;b.lightAt=G.rawTime;b.palmT=8;p.x=b.x+b.face*44;p.y=b.y;return;}
   if(value==='shove'){b.state='getup';b.t=24;p.x=b.x+b.face*40;p.y=b.y;return;}
   if(value==='hurl'){if(!rage(b))this.enrage(b);const q=nearTrunk(b,9999);if(q){b.x=q.x+(sgn(b.x-q.x)||1)*26;b.y=q.y;startHurl(b,q);}return;}
   if(value==='chain'){if(!rage(b))this.enrage(b);b.chainY=p.y;}
   if(value==='hug'){p.x=b.x+b.face*60;p.y=b.y;}
   b.pattern=value;b.quakes=1;b.state='windup';startString(b);return;
  }
  if(value==='reload'){b.ammo=0;b.state='reload';b.t=0;b.reloadHits=0;sysPop(b.x,b.y-b.h-10,'CLICK!');return;}
  if(value==='bribe'){b.hp=Math.min(b.hp,b.maxhp*.6);b.mood=1;b.bribes=0;roofMood(b);return;}
  if(value==='cower'){b.x=G.camX+W-ROOF_EDGE-2;p.x=b.x-56;p.y=b.y;b.state='cower';b.guard=b.maxGuard;return;}
  if(value==='flee'){b.hp=Math.min(b.hp,b.maxhp*.3-1);b.mood=3;b.flees=1;p.x=b.x-70;p.y=b.y;startFlee(b);return;}
  if(value==='beg'){b.hp=Math.min(b.hp,b.maxhp*.3-1);b.mood=3;b.x=G.camX+W-ROOF_EDGE-2;p.x=b.x-60;p.y=b.y;startBeg(b);return;}
  b.pattern=value;b.state='windup';b.aimY=b.y;b.gritClose=value==='grit'&&Math.abs(p.x-b.x)<70;
 },
 // Drawn after every sprite: the chain streak and the roof lane arrows must never hide behind a body.
 overlay(ctx,b,camX){
  if(G.reflecting||b.trainWaiting)return;
  if(b.phase===1)drawChainCue(ctx,b,camX);
  const p=G.player;
  if(b.phase===2&&(b.state==='windup'&&b.pattern==='shot'||b.state==='shot'&&b.t<25)&&Math.abs(p.y-b.y)<18&&(p.x-b.x)*b.face>0&&!p.dying){
   const t=b.state==='shot'?b.t+8:b.t;
   laneCue(ctx,p.x-camX-b.face*20,p.y-p.z-34,t,p.y-18>laneMin(p.x)+1,p.y+18<laneMax(p.x)-1);
  }
 },
 draw(ctx,b,camX){
  if(b.phase===1){
   if(G.state==='bossintro'){drawFightProps(ctx,b.fightProps,camX);drawIntro(ctx,b,camX);return;}
   drawFightProps(ctx,b.fightProps,camX);drawShera(ctx,b,camX);drawNotes(ctx,b,camX);drawSpeech(ctx,b,camX);return;
  }
  drawNetaRoof(ctx,b,camX);drawNotes(ctx,b,camX);drawSpeech(ctx,b,camX);
 },
};
// Intro: Shera walks in counting, turns to take his fee from Netaji's hand into his palm, turns back, cracks
// his neck and knuckles, points and flexes. Netaji's line types while he pays; Shera's follows after a beat.
// Netaji stands an arm's length off while paying (his hand meets Shera's palm), then tucks in behind.
const introGap=t=>83-30*clamp((t-548)/30,0,1);
const introFace=t=>t>=100&&t<178?1:-1;
function introShera(t){
 if(t<60)return ['walk',t*(76/60)/7|0];if(t<100)return ['count',(t/14|0)%2];if(t<110)return ['turn',1];if(t<150)return ['pay',t<128?0:1];
 if(t<168)return ['pocket',0];if(t<178)return ['turn',1];if(t<240)return ['neck',((t-178)/12|0)%2];if(t<300)return ['knuckles',((t-240)/10|0)%2];
 if(t<INTRO.flex)return ['point',0];return t<450||t>=520?['flex',0]:['taunt',0];
}
function introNeta(t){
 if(t<60)return ['walk',t*(76/60)/6|0];if(t<100)return ['fan',0];if(t<118)return ['point',0];if(t<140)return ['slap',0];
 if(t<150)return ['idle',t/16|0];if(t<240)return ['point',0];if(t<345)return ['wag',0];if(t<548)return ['laugh',(t>>3)&1];
 if(t<578)return ['walk',(t-548)/5|0];return ['idle',t/16|0];
}
function drawIntro(ctx,b,camX){
 const t=G.rawTime-G.stateT,n=b.ally,sh=introShera(t),ne=introNeta(t);
 const draws=[[b.y,()=>{shadow(ctx,b.x-camX,b.y,25);drawFrame(ctx,b.set,sh[0],sh[1],b.x-camX,b.y,introFace(t));}]];
 // The fee: slapped from Netaji's hand onto Shera's open palm (belt height, b.x+PALM[0]); from t128 his closed-hand cell holds it.
 if(n)draws.push([n.y,()=>{shadow(ctx,n.x-camX,n.y,15);drawFrame(ctx,SPR.nr_neta,ne[0],ne[1],n.x-camX,n.y,-1);
  if(t>=118&&t<128){const q=clamp((t-118)/8,0,1),px=b.x+PALM[0]-camX,py=b.y-PALM[1];netaProp(ctx,0,px+(1-q)*8,py-(1-q)*4,16,(1-q)*.4);}}]);
 for(const [,d] of draws.sort((p,q)=>p[0]-q[0]))d();
 if(t>=60&&t<100&&(t>>3)%2)netaProp(ctx,11,b.x-camX-42,b.y-100-(t%16),8,t*.2);
}
