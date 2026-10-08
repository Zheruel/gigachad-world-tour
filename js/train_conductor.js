// Head Conductor: red tape, then the emergency chain. Every move has one answer.
//  DENIED stamp (green) - parry it and he is stamped VOID (long stun, box knocked loose). If it lands,
//    or is only guarded, CHAD cannot guard for four seconds.
//  SEIZED stamp (green) - same answer; if it lands CHAD's super meter streams into the steel cash box.
//  Box swing (red) - the loaded box as a club; step out or jump. Turtling invites it; a whiff leaves him off balance.
//  Guard - he blocks frontal jabs (with the box, or his forearms once it is loose); heavies wear it down.
//  The box - Any stun, knockdown or heavy from behind knocks it loose; hits on a
//    loaded loose box pay the meter back and make him dive onto it, sprawled and open.
//  Phase 2 - EMERGENCY CHAIN: he walks under the chain and reaches (red), yanks: the office lurches and luggage and
//    ledger drawers slide across the floor (jump them), then he stands on tiptoe re-hooking it (punish).
import {G,clamp,addScore,addMeter,laneMin,laneMax,W} from './engine.js';
import {SPR,getFrame,frameW,frameH,drawText,textWidth} from './sprites.js';
import {spawnDust,spawnPop,spawnSpark,spawnRing} from './effects.js';
import {hurtPlayer,PARRY_WINDOW} from './player.js';
import {tryHitPlayer,blitTelegraph,drawCueMarker} from './bosslib.js';
import {drawConductorDesk,startTrainCinematic} from './train.js';
import {ASSETS} from './assets.js';
import {dazePose} from './daze.js';
import {note} from './finisher_fx.js';

const OFFICE_X=5760,DESK_X=6065,CHAIN_X=6000,CONTRABAND_X=6080,DENIED_TICKS=150,DENIED_REST=90,VOID_TICKS=150;
// Back-to-back VOIDs shrink, and one VOID pays out at most VOID_CAP before he is floored.
const VOID_CHAIN=[150,110,80],VOID_CAP=36;
// A parry has to be timed to the slam: pressed more than PARRY_LATE ticks before contact is too early.
const PARRY_LATE=14,EARLY_SPAN=32;
// Phase 2 pulls the chain again this long after the last re-hook; health cannot pass a floor
// until that pull has happened (one pull by 50%, two by 22%).
const BRAKE_EVERY=420,FLOORS=[[.5,1],[.22,2]];
const phase2=b=>b.hp<=b.maxhp*.5;
const ATTACKS=['windup','stamp','seize','swing','brake','rehook','tochain'];
// Wind-up ticks [phase 1, phase 2].
const WIND={stamp:[30,24],seize:[34,28],swing:[36,30],brake:[46,40]};
export const conductorCueOn=b=>b.state==='windup'&&b.pattern!=='tochain'||b.state==='stamp'&&b.t<=5||b.state==='seize'&&b.t<=6;
// Where the box sits in each held pose (logical px from the feet, facing right).
const BOX_AT={idle:[-6,-50],walk:[-6,-50],hurt:[-8,-50],count:[-5,-43],victory:[-6,-50],point:[-10,-51],block:[17,-71],
 stamp:[[-5,-46],[-8,-51],[-8,-50]],seize:[[34,-49],[-8,-32]],swing:[[-8,-91],[50,-79],[27,-24]],chain:[[-8,-54],[-15,-52]],rehook:[[-10,-42],[-10,-44]]};
const HAND={chain:[[29,-108],[2,-67]],rehook:[[22,-109],[32,-98]]};
// Without the box he reaches the chain with his stamp hand (free set).
const HAND_FREE={chain:[[29,-96],[11,-70]],rehook:[[24,-100],[20,-94]]};
// Spark heights on CHAD per move (the stamp lands on his face, the box swing on his chest).
const CONTACT_Y={stamp:72,seize:62,swing:56};
const INK={'TOO EARLY':'#e8a21a',DENIED:'#d8252d',SEIZED:'#2f6fd8',VOID:'#d8252d',REFUND:'#1f9a4a'};

// ---- sound ---------------------------------------------------------------------------------
// His own set (audio/sfx/cond_*, tools/production/build_conductor_audio.py): Final Fight voices, synthesized
// office Foley. A pool never repeats its last pick; `gap` ticks rate-limit a cue so holds and combos cannot
// machine-gun it. Samples go through sfx() (per-play detune, stopped with the rest on pause/exit).
const SND={grunt:['cond_grunt_1','cond_grunt_2','cond_grunt_3'],hurt:['cond_hurt_1','cond_hurt_2'],note:['cond_note_1','cond_note_2'],coins:['cond_coins_1','cond_coins_2'],step:['cond_step_1','cond_step_2']};
const lastPick={},lastAt={};
function cue(name,vol=1,{gap=0,pan=0,fallback=null}={}){
 const pool=SND[name]||[name],at=lastAt[name];
 if(gap&&at!==undefined&&G.time>=at&&G.time-at<gap)return false;
 const opts=pool.length>1?pool.filter(n=>n!==lastPick[name]):pool,pick=opts[Math.floor(Math.random()*opts.length)];
 lastAt[name]=G.time;lastPick[name]=pick;
 if(fallback&&G.audio.has&&!G.audio.has(pick))G.audio.sfx(fallback,vol);
 else if(pan){if(!G.audio.roomSfxAt?.(pick,vol,pan)&&fallback)G.audio.sfx(fallback,vol);}
 else G.audio.sfx(pick,vol);
 return true;
}
// Seated count, notes into the box, chair back, up, a hand on the desk, then round it (walk cells 132-194).
const INTRO_CUES={4:['note',.45],13:['note',.4],22:['note',.5],30:['cond_lid',.5],62:['cond_chair',.7],68:['grunt',.3],88:['cond_desk',.45],132:['step',.5],150:['step',.5],176:['step',.55],194:['step',.55]};

// ---- ink stamps ---------------------------------------------------------------------------
// A rubber-stamp impression drawn once at 2x (bitmap letters, double border, worn ink), then placed rotated.
const inkCache={};
function inkStamp(label){
 if(inkCache[label])return inkCache[label];
 const s=4,pad=7,tw=textWidth(label,s),c=document.createElement('canvas');c.width=tw+pad*4;c.height=5*s+pad*4;
 const x=c.getContext('2d'),col=INK[label]||'#d8252d';
 // Dark rim first so the ink reads on skin, cloth and the dark office alike.
 x.strokeStyle='#1a0606';x.lineWidth=5;x.strokeRect(3,3,c.width-6,c.height-6);
 for(const [dx,dy]of [[-2,0],[2,0],[0,-2],[0,2]])drawText(x,label,pad*2+dx,pad*2+dy,'#1a0606',s);
 x.strokeStyle=col;x.lineWidth=3;x.strokeRect(3,3,c.width-6,c.height-6);x.lineWidth=1.5;x.strokeRect(8,8,c.width-16,c.height-16);
 drawText(x,label,pad*2,pad*2,col,s);
 // Worn rubber: seeded pinholes and a dry corner.
 let seed=label.length*977;const r=()=>(seed=(Math.imul(seed,1103515245)+12345)>>>0)/4294967296;
 x.globalCompositeOperation='destination-out';
 for(let i=0;i<c.width*c.height/90;i++){x.globalAlpha=.3+r()*.5;x.fillRect(Math.floor(r()*c.width),Math.floor(r()*c.height),1,1);}
 x.globalAlpha=.35;x.fillRect(0,c.height-4,Math.floor(c.width*.3),4);
 return inkCache[label]=c;
}
// scale is in logical px per stamp pixel/2; slam-in from 1.7x over the first six ticks.
function drawInk(ctx,label,x,y,age,angle=-.16,scale=1,alpha=1){
 const im=inkStamp(label),k=scale*(age<6?1+.7*(1-age/6):1);
 ctx.save();ctx.globalAlpha=alpha*(age<6?.4+age/10:1);ctx.translate(Math.round(x),Math.round(y));ctx.rotate(angle);
 ctx.drawImage(im,-im.width*k/4,-im.height*k/4,im.width*k/2,im.height*k/2);ctx.restore();
}

// ---- the cash box --------------------------------------------------------------------------
function boxProp(b,x,y,vx){
 const q={kind:'prop',prop:'conductor_box',hidden:true,x,y,z:14,vx,vz:2.2,w:26,h:18,shadowR:10,hp:99,maxhp:99,broken:false,dead:false,decor:false,t:0,flash:0,shakeT:0,state:'idle',face:1,
  hurt(dmg,dir){boxHit(b,q,dir);},thrown(){},draw(ctx,camX){drawLooseBox(ctx,b,q,camX);}};
 G.props.push(q);return q;
}
// The box is tossed clear of both fighters (away from CHAD) and of the office's contraband trunk.
function dropBox(b,quiet){
 if(!b.hasBox||b.dead&&b.boxLoose)return;
 b.hasBox=false;b.set=SPR.nr_conductor_free;
 b.laughAt=null;
 const away=Math.sign(b.x-G.player.x)||-b.face;
 let x=clamp(b.x+away*38,G.camX+34,G.camX+W-34);
 if(Math.abs(x-b.x)<24)x=clamp(b.x-away*38,G.camX+34,G.camX+W-34);  // pinned against a wall: over his other shoulder
 if(Math.abs(x-CONTRABAND_X)<34)x=CONTRABAND_X+(x<CONTRABAND_X?-34:34);
 b.boxLoose=boxProp(b,x,clamp(b.y+6,laneMin(x)+4,laneMax(x)-2),Math.sign(x-b.x)*.6);
 b.boxLoose.z=26;b.boxLoose.vz=2.6;
 cue('cond_box_hit',.6,{fallback:'armor'});if(b.boxMeter>0){cue('coins',.7);if(!b.saidOhNo&&!b.voidT){b.saidOhNo=true;cue('cond_ohno',.75);}}
 if(!quiet)spawnPop(b.x,b.y-b.popH-8,b.boxMeter>0?'LOOSE CHANGE!':'MY BOX!');
}
function removeLooseBox(b){if(b.boxLoose){G.props=G.props.filter(q=>q!==b.boxLoose);b.boxLoose=null;}}
function pickUp(b){removeLooseBox(b);b.hasBox=true;b.set=SPR.nr_conductor;cue('cond_lid',.45,{fallback:'pickup'});if(b.boxMeter>0)cue('coins',.35);}
// Hits on a loose box pay the seized meter back; the first one sends him diving onto it.
function boxHit(b,q,dir){
 if(q.covered||b.dead||G.state!=='play')return;
 q.flash=5;q.shakeT=8;q.vx+=dir*.8;spawnSpark(q.x,q.y-12);cue('cond_box_hit',.55,{fallback:'armor'});G.hitstop=Math.max(G.hitstop,3);
 const busy=['dive','sprawl','down','getup','dying','brake','rehook','tochain'].includes(b.state)||b.state==='windup'&&['brake','tochain'].includes(b.pattern)||b.superLocked;
 // An empty box still holds his bribes: the first smack after each drop sends him diving (once).
 if(b.boxMeter<=0){if(!q.dived&&!busy&&!(b.protectedStagger>0)){q.dived=true;startDive(b,q,'MY BRIBES!');}return;}
 const give=Math.min(b.boxMeter,Math.max(10,Math.ceil(b.seizedTotal/3)));refund(b,give,q.x,q.y-14);
 if(b.boxMeter<=0){spawnPop(q.x,q.y-40,'REFUND!');addScore(300);if(!b.saidCash){b.saidCash=true;G.audio.voice?.('duke_payback',2100,true);}}
 if(!busy){q.dived=true;startDive(b,q,'MY BOX!');}
}
function startDive(b,q,line){b.protectedStagger=0;b.voidT=0;b.voidLen=0;b.state='dive';b.t=0;b.diveFrom=[b.x,b.y];b.face=Math.sign(q.x-b.x)||b.face;spawnPop(b.x,b.y-b.popH-8,line);cue('cond_yell',.8,{fallback:'ehurt4'});}
function refund(b,n,x,y){
 b.boxMeter=Math.max(0,b.boxMeter-n);addMeter(n);
 for(let i=0;i<Math.min(10,Math.ceil(n/3));i++)b.streams.push({x0:x,y0:y,t:-i*2,life:26,back:true,seed:i});
 G.audio.sfx('pickup',.45);cue('coins',.4,{gap:18});
}

// ---- sliding hazards -----------------------------------------------------------------------
// [slot, width, height] in conductor_hazards.png (128px slots, drawn at half size).
// Slots: mail sack, card drawer, ticket cabinet, ledgers, toolbox, tiffin hamper, stamp tray, spilled bin.
const HAZARD=[[1,46,32],[0,39,39],[4,46,33],[3,48,31],[5,44,35],[7,45,35],[2,46,34],[6,47,32]];
function queueSlides(b){
 const n=b.pulls,p=G.player,rows=[];
 const lanes=[p.y,p.y+(p.y>215?-14:14),p.y,p.y+(p.y>215?-24:22),p.y];
 const count=n===1?3:n===2?4:5;
 for(let i=0;i<count;i++){
  const fromLeft=n===1?true:n===2?false:i%2===0;
  rows.push({at:22+i*(n>2?24:28),fromLeft,y:clamp(lanes[i],laneMin(OFFICE_X+240)+6,laneMax(OFFICE_X+240)-4),kind:HAZARD[(i+n)%HAZARD.length]});
 }
 b.slideQueue=rows;b.slideT=0;
}
function spawnSlide(b,row){
 const x=row.fromLeft?G.camX-40:G.camX+W+40,dir=row.fromLeft?1:-1;
 const q={kind:'prop',prop:'conductor_slide',hidden:true,decor:true,sortBias:-8,broken:false,dead:false,x,y:row.y,z:0,w:row.kind[1],h:row.kind[2],t:0,flash:0,shakeT:0,state:'idle',face:dir,
  vx:dir*(4.4+(b.pulls>2?.4:0)),slot:row.kind[0],hitDone:false,hurt(){},thrown(){},draw(ctx,camX){drawSlide(ctx,q,camX);}};
 G.props.push(q);b.slides.push(q);cue('cond_scrape',.45,{pan:row.fromLeft?-.6:.6,fallback:'entrance_skid'});
}
function updateSlides(b){
 if(b.slideQueue?.length){b.slideT++;while(b.slideQueue.length&&b.slideT>=b.slideQueue[0].at-30){const row=b.slideQueue[0];if(!row.warned){row.warned=true;b.warnings.push({y:row.y,fromLeft:row.fromLeft,t:0});}if(b.slideT>=row.at){b.slideQueue.shift();spawnSlide(b,row);}else break;}}
 for(const w of b.warnings)w.t++;b.warnings=b.warnings.filter(w=>w.t<34);
 const p=G.player;
 for(const q of b.slides){
  q.t++;q.x+=q.vx;q.vx*=.998;
  if(q.t%7===0)spawnDust(q.x-Math.sign(q.vx)*q.w*.4,q.y,1);
  if(!q.hitDone&&!p.dying&&Math.abs(p.x-q.x)<q.w/2+6&&Math.abs(p.y-q.y)<10&&p.z<12&&p.invuln<=0&&!['down','getup'].includes(p.state)){
   q.hitDone=true;hurtPlayer(p,10,Math.sign(q.vx),true);spawnSpark(p.x,p.y-20);cue('cond_thud',.8,{fallback:'heavy'});G.shake=Math.max(G.shake,4);
  }
 }
 const gone=b.slides.filter(q=>q.x<G.camX-80||q.x>G.camX+W+80);
 if(gone.length){b.slides=b.slides.filter(q=>!gone.includes(q));G.props=G.props.filter(q=>!gone.includes(q));}
}
function clearSlides(b){G.props=G.props.filter(q=>!b.slides.includes(q));b.slides=[];b.slideQueue=[];b.warnings=[];}

// ---- shared per-tick upkeep (also runs through protected staggers) -----------------------------
function tick(b){
 const p=G.player;
 if(b.laughAt===G.time){b.laughAt=null;if(b.hitLanded&&b.boxMeter>0&&['seize','recover'].includes(b.state))cue('cond_laugh',.6,{gap:1200});}
 if(b.voidT>0)b.voidT--;
 if(b.inkDenied){b.inkDenied.t++;if(!(p.guardDenied>0))b.inkDenied=null;}
 if(b.inkSeized){b.inkSeized.t++;if(b.inkSeized.t>110&&!(b.drain>0))b.inkSeized=null;}
 if(b.inkEarly&&++b.inkEarly.t>54)b.inkEarly=null;
 if(p.guardWindow===PARRY_WINDOW)b.parryAt=G.time;
 // A super's opening pays out like a VOID: capped, then he is floored.
 if(b.superOpen&&!b.superLocked&&!b.superApplying&&!(b.protectedStagger>0))b.superOpen=false;
 // Meter streams into the box while the seize holds.
 if(b.drain>0){const n=Math.min(b.drain,2.6,G.meter);if(n<=0)b.drain=0;else{G.meter-=n;b.boxMeter+=n;b.seizedTotal+=n;b.drain-=n;if(G.time%3===0)b.streams.push({t:0,life:24,seed:G.time});if(G.time%14===0)cue('cond_coin_tick',.45);}}
 for(const s of b.streams)s.t++;b.streams=b.streams.filter(s=>s.t<s.life);
 const q=b.boxLoose;
 if(q){q.t++;if(q.flash>0)q.flash--;if(q.shakeT>0)q.shakeT--;
  if(q.z>0||q.vz>0){q.vz-=.3;q.z=Math.max(0,q.z+q.vz);if(q.z===0){q.vz=0;cue('cond_box_drop',.7,{fallback:'land'});if(b.boxMeter>0)cue('coins',.35);spawnDust(q.x,q.y,3);}}
  q.x=clamp(q.x+q.vx,G.camX+24,G.camX+W-24);q.vx*=q.z>0?.98:.84;if(Math.abs(q.x-CONTRABAND_X)<30){q.x=CONTRABAND_X+(q.x<CONTRABAND_X?-30:30);q.vx=0;}}
 updateSlides(b);
 if(G.lurch){G.lurch.t++;if(G.lurch.t>40)G.lurch=null;}
 if(b.quipAt===G.time)G.audio.voice?.('duke_train_nowhere',2200,true);
 if(G.lurch&&G.lurch.t<14&&!['down','getup','special'].includes(p.state)&&!p.dying){p.x=clamp(p.x+G.lurch.dir*1.1,G.camX+20,G.camX+W-20);if(G.lurch.t%4===0)spawnDust(p.x,p.y,1);}
}

function boxAt(b,name,idx){
 const a=BOX_AT[name],v=Array.isArray(a?.[0])?a[Math.min(idx,a.length-1)]:a||BOX_AT.idle;
 return [b.x+b.face*(v[0]-(name==="walk"?b.walkHold||0:0)),b.y-b.z+v[1]];
}
function handAt(b,name,idx){const v=(b.hasBox?HAND:HAND_FREE)[name][Math.min(idx,1)];return [b.x+b.face*v[0],b.y-b.z+v[1]];}

function begin(b,pattern){b.pattern=pattern;b.state='windup';b.t=0;b.hitLanded=false;b.feinted=false;if(pattern==='brake'){b.face=Math.sign(G.player.x-b.x)||b.face;}}
function finish(b,recover,pose=null){b.state='recover';b.t=0;b.recoverFor=recover;b.recoverPose=pose;}
const denied=()=>G.player.guardDenied>0;
function choose(b,p){
 const dist=Math.abs(p.x-b.x),p2=phase2(b);
 // Phase 2 always gets its chain turns, box or no box.
 if(p2&&b.brakeDue){b.brakeDue=false;b.turn++;return 'tochain';}
 if(!b.hasBox)return 'stamp';
 // Turtling or crowding his box invites the swing.
 if(b.guardHeld>28&&dist<120){b.turn++;return 'swing';}
 let pick;
 if(p2){const deck=['stamp','swing','seize','stamp','stamp'];pick=deck[b.turn++%deck.length];}
 else{
  // Phase 1 deals in short bars: always a stamp first (the parry lesson), then the seize and the
  // swing in either order, sometimes with a second stamp between them. Readable, never rote.
  if(!b.deck?.length){const rest=Math.random()<.5?['seize','swing']:['swing','seize'];if(Math.random()<.35)rest.splice(1,0,'stamp');b.deck=['stamp',...rest];}
  pick=b.deck.shift();b.turn++;
  // A seize dealt while DENIED holds is saved for later in the bar (after the swing), not thrown away.
  if(pick==='seize'&&denied()&&G.meter>=15&&b.boxMeter<80){b.deck.push('seize');pick=b.deck[0]!=='seize'?b.deck.shift():'swing';b.saved=(b.saved||0)+1;if(b.saved>2){b.deck=b.deck.filter(x=>x!=='seize');b.saved=0;}}
  else if(pick==='seize')b.saved=0;
 }
 // He only seizes a meter worth taking, and never from a CHAD who cannot guard it.
 if(pick==='seize'&&(G.meter<15||b.boxMeter>=80||denied()))pick='stamp';
 if(pick==='swing'&&dist>150)pick='stamp';
 b.double=p2&&pick==='stamp'&&b.turn%2===0&&!denied();
 return pick;
}
// A landed or guarded stamp marks CHAD. DENIED never refreshes while it holds, and rests between uses.
function inkChad(b,label){
 const p=G.player;cue('cond_stamp',.8);G.shake=Math.max(G.shake,3);
 if(label==='DENIED'){
  if(p.guardDenied>0||G.time<(b.deniedRestUntil||0))return;
  b.inkDenied={t:0};p.guardDenied=DENIED_TICKS;p.guardWindow=0;b.deniedRestUntil=G.time+DENIED_TICKS+DENIED_REST;
 }else{b.inkSeized={t:0};b.drain=G.meter;b.seizedTotal=0;if(G.meter<1)spawnPop(p.x,p.y-104,'NOTHING TO SEIZE');else b.laughAt=G.time+26;}
}
function strike(b,label,range,dmg){
 const p=G.player,before=p.hp;b.contactY=CONTACT_Y[b.state];
 // Only a parry pressed into the slam counts; an early tap has already run out of steam.
 const early=p.guardWindow>0&&PARRY_WINDOW-p.guardWindow>PARRY_LATE;
 const saved=p.guardWindow;if(early)p.guardWindow=0;
 const hit=tryHitPlayer(b,dmg,range,false,18,'counter');
 const age=G.time-(b.parryAt??-999);
 if(hit&&p.lastDefense!=='parry'&&!p.dying&&age>PARRY_LATE&&age<=EARLY_SPAN){b.inkEarly={t:0};b.parryAt=-999;cue('cond_punch',.8);}
 else if(early&&!hit)p.guardWindow=saved;
 if(!hit)return false;
 b.hitLanded=true;
 if(p.lastDefense==='parry')return true;
 if(p.lastDefense!=='guard')b.voidChain=0;
 if(p.lastDefense==='guard'||p.hp<before||p.state==='hurt')inkChad(b,label);
 return true;
}
function voidStamp(b){
 const len=VOID_CHAIN[Math.min(b.voidChain||0,VOID_CHAIN.length-1)];b.voidChain=(b.voidChain||0)+1;
 b.protectedStagger=Math.max(b.protectedStagger,len);b.voidT=len;b.voidLen=len;b.voidDmg=0;b.double=false;b.drain=0;
 addScore(400);cue('cond_stamp',1);cue('cond_yell',.85,{gap:45,fallback:'ehurt2'});G.hitstop=Math.max(G.hitstop,6);
 if(b.hasBox)dropBox(b);
}
// Health floors that only a pull of the chain unlocks, so phase 2 is always played.
function floorHp(b,dealt){
 // Only a hit that crosses a floor is clamped, so review scenes that preset low health still work.
 for(const [k,pulls] of FLOORS)if(b.pulls<pulls&&b.hp<b.maxhp*k&&b.hp+dealt>=b.maxhp*k){b.hp=b.maxhp*k;b.brakeDue=true;return true;}
 return false;
}
// Floor him (the end of a VOID payout or a phase gate) with the generic knockdown arc.
function knockDown(b){
 b.protectedStagger=0;b.voidT=0;b.voidLen=0;b.state='down';b.t=0;b.vx=G.player.face*1.8;b.vz=2.8;b.z=Math.max(b.z,.1);
 if(b.maxGuard&&b.guard===0)b.guard=b.maxGuard;conductor.onDown(b);
}

export const conductor={
 noRage:true,
 init(b){
  for(const key of Object.keys(lastAt))delete lastAt[key];
  for(const key of Object.keys(lastPick))delete lastPick[key];
  Object.assign(b,{guard:3,maxGuard:3,turn:0,guardFlash:0,recoverFor:40,popH:108,hasBox:true,boxMeter:0,seizedTotal:0,drain:0,streams:[],slides:[],slideQueue:[],warnings:[],
   pulls:0,lastBrakeTurn:-9,guardHeld:0,flinch:0,flinchT:0,voidT:0,voidChain:0,inkDenied:null,inkSeized:null,boxLoose:null,brakeAt:0,openToSupers:true,notes:[],fightProps:[],state:'rise',x:DESK_X,y:188,t:0});
  G.lurch=null;if(G.player)G.player.guardDenied=0;
  b.dropBox=dir=>dropBox(b);  // review scenarios start from a loose box
  const parried=b.parried;
  b.parried=(dmg,dir)=>{const stamp=['stamp','seize'].includes(b.state);parried(dmg,dir);if(stamp)voidStamp(b);};
 },
 intro(b,t){
  // A retry after dying to him skips the seated count and the walk round the desk.
  const tr=G.train;if(tr){if(tr.conductorRetry&&t<200){tr.conductorRetry=false;G.stateT-=200-t;t=200;}tr.conductorMet=true;}
  b.introT=t;b.face=-1;b.y=t<170?188:188+30*clamp((t-170)/40,0,1);
  b.x=t<120?DESK_X:DESK_X-130*clamp((t-120)/50,0,1);
  const c=INTRO_CUES[t];if(c)cue(c[0],c[1]);
 },
 keepFace(b){return ATTACKS.includes(b.state)||['recover','dive','sprawl','pickup'].includes(b.state);},
 beforeHurt(b,dmg,dir,heavy,launch){
  b.guardingHit=false;
  if(b.state==='rise')return false;
  // Floored is floored: no juggling him on the carpet.
  if(['down','getup'].includes(b.state)&&!b.superApplying)return false;
  // A super's first contact knocks the box out of his arms.
  if(b.superApplying||b.superLocked){if(b.hasBox)dropBox(b);b.superOpen=true;b.voidDmg=0;return true;}
  const open=b.protectedStagger>0||b.counterApplying||b.parryApplying;
  const guarding=!open&&dir===-b.face&&['idle','windup','hurt','count','recover'].includes(b.state)&&!(b.state==='recover'&&b.recoverPose)&&!(b.state==='windup'&&b.pattern==='brake');
  if(guarding&&!heavy&&!launch){
   b.guardFlash=8;G.audio.sfx('armor');if(b.hasBox)cue('cond_box_hit',.3,{gap:8});const [bx,by]=boxAt(b,'block',0);spawnSpark(bx,by);G.player.x+=b.face*4;G.hitstop=Math.max(G.hitstop,3);
   if(G.time-(b.blockPop??-99)>90){b.blockPop=G.time;spawnPop(b.x,b.y-b.popH-8,'BLOCK');}
   return false;
  }
  // Hitting the open box while it pours spills it out of his hands.
  if(!open&&b.state==='seize'&&b.t>6&&dir===-b.face&&b.hasBox){
   const full=b.boxMeter>0||b.seizedTotal>0;b.drain=0;dropBox(b,true);spawnPop(b.x,b.y-b.popH-8,full?'SPILLED!':'MY BOX!');cue('hurt',.75);G.hitstop=Math.max(G.hitstop,4);
   finish(b,34);b.state='hurt';b.t=0;b.hurtHigh=true;return false;
  }
  if(guarding)b.guardingHit=true;
  if(heavy&&b.hasBox&&dir===b.face&&b.boxMeter>0)dropBox(b);
  return true;
 },
 onHurt(b,dmg,heavy){
  const dealt=dmg*(b.guardingHit?.2:1);
  // A parry/knockdown owns its yell; don't stack a second pain voice underneath it.
  const willFloor=heavy&&(b.protectedStagger>0||b.state==='stagger')&&!b.superApplying&&!b.counterApplying&&!b.parryApplying;
  // Phase gates: health stops at the floor until the chain has been pulled; he shrugs off the combo.
  if(floorHp(b,dealt)&&!b.dead){
   if(!b.p2Called){b.p2Called=true;spawnPop(b.x,b.y-b.popH-18,'ENOUGH RED TAPE!');G.audio.sfx('enrage');cue('cond_whistle',.8,{gap:60});}
   if(b.protectedStagger>0||b.state==='stagger'){knockDown(b);return true;}
  }
  if(!b.p2Called&&phase2(b)){b.p2Called=true;b.brakeDue=true;spawnPop(b.x,b.y-b.popH-18,'ENOUGH RED TAPE!');G.audio.sfx('enrage');cue('cond_whistle',.8,{gap:60});}
  // One VOID pays out VOID_CAP; the rest of the combo floors him instead of juggling him.
  if(!b.superLocked&&!b.superApplying&&(b.voidT>0||b.protectedStagger>0&&(b.voidLen||b.superOpen))){b.voidDmg=(b.voidDmg||0)+dealt;if(b.voidDmg>=VOID_CAP){b.voidLen=0;b.superOpen=false;knockDown(b);return true;}}
  if(!b.guardingHit&&!b.parryApplying&&!willFloor&&b.hp>0&&b.state!=='sprawl')cue('hurt',.65,{gap:34});
  if(b.state==='sprawl'){if(b.boxMeter>0)refund(b,Math.min(b.boxMeter,8),b.x,b.y-10);return true;}
  if(ATTACKS.includes(b.state)||['dive','pickup'].includes(b.state)||b.state==='recover'&&b.recoverPose)return true;
  if(['idle','recover','hurt','count','victory'].includes(b.state)){
   // Three flinches in a row and he stops flinching and answers with a stamp.
   b.flinch=G.time-b.flinchT<50?b.flinch+1:1;b.flinchT=G.time;
   if(b.flinch>=3){b.flinch=0;b.atkCd=0;if(b.state!=='idle'){b.state='idle';b.t=0;}return true;}
   b.state='hurt';b.t=0;b.hurtHigh=!heavy;return true;
  }
  return false;
 },
 onDown(b){b.flinch=0;b.drain=0;b.double=false;b.sndAir=true;cue('cond_yell',.8,{gap:45});if(b.hasBox)dropBox(b);},
 staggerTick(b){if(b.hasBox)dropBox(b);b.drain=0;tick(b);return false;},
 update(b){
  const p=G.player,p2=phase2(b);
  if(b.guardFlash>0)b.guardFlash--;
  b.guardHeld=p.state==='parry'?b.guardHeld+1:Math.max(0,b.guardHeld-2);
  tick(b);
  // The generic knockdown arc lands after this returns; catch it the tick after, and the grunt of getting up.
  if(b.state==='down'&&b.sndAir&&!b.vz&&b.t>1){b.sndAir=false;cue('cond_thud',.7,{fallback:'land'});}
  if(b.state==='getup'&&b.t===1)cue('grunt',.45);
  if(!['dive'].includes(b.state))b.z=0;
  // A super (or any knock) off the sprawl skips the pick-up: uncover the box so he goes and fetches it.
  if(b.boxLoose?.covered&&!['sprawl','boxgetup'].includes(b.state))b.boxLoose.covered=false;
  switch(b.state){
   case 'rise':
    if(b.t>36){b.x=DESK_X-130*Math.min(1,(b.t-36)/36);b.y=183+35*clamp((b.t-72)/18,0,1);}
    if(b.t>=90){b.state='idle';b.t=0;b.atkCd=40;}return true;
   case 'hurt':if(b.t>=14){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,24);}return true;
   case 'idle':{
    if(p.dying){b.state='victory';b.t=0;cue('cond_laugh',.8);return true;}
    const q=b.boxLoose,speed=p2?1.05:.9;
    if(p2&&b.pulls>0&&G.time>=b.brakeAt)b.brakeDue=true;
    // The chain comes first in phase 2, with or without the box.
    if(p2&&b.brakeDue){begin(b,choose(b,p));return true;}
    // Box on the floor: fetch it, unless CHAD is standing over it.
    if(!b.hasBox&&q&&!q.covered){
     const guarding=Math.abs(p.x-q.x)<56&&Math.abs(p.y-q.y)<20;
     if(!guarding){
      const side=b.x<q.x?-1:1,tx=q.x+side*16;b.face=Math.sign(q.x-b.x)||b.face;
      if(Math.abs(tx-b.x)>3||Math.abs(q.y-b.y)>3){b.x+=clamp(tx-b.x,-speed*1.2,speed*1.2);b.y+=clamp(q.y-b.y,-.8,.8);return true;}
      if(q.z===0){b.state='pickup';b.t=0;return true;}
     }
    }
    const dx=p.x-b.x,want=64;
    b.y+=clamp(p.y-b.y,-.55,.55);
    if(Math.abs(dx)>want+8)b.x+=Math.sign(dx)*speed;else if(Math.abs(dx)<want-26)b.x-=Math.sign(dx)*speed*.6;
    if(p.state!=='down')b.taunted=false;
    else if(!b.taunted&&b.hasBox&&Math.abs(dx)>40){b.taunted=true;b.state='count';b.t=0;cue('cond_laugh',.6,{gap:900});return true;}
    if(b.atkCd>0)b.atkCd--;
    if(b.atkCd<=0&&Math.abs(dx)<want+30&&Math.abs(p.y-b.y)<26)begin(b,choose(b,p));
    return true;
   }
   case 'windup':{
    const wind=b.combo2?14:WIND[b.pattern]?.[p2?1:0]??24;
    if(b.pattern==='tochain'){
     // Walk under the chain first: the approach is part of the tell.
     const ty=laneMin(CHAIN_X)+4,tx=CHAIN_X-8;b.face=Math.sign(G.player.x-b.x)||b.face;
     b.x+=clamp(tx-b.x,-1.6,1.6);b.y+=clamp(ty-b.y,-1,1);
     if(Math.abs(tx-b.x)<2&&Math.abs(ty-b.y)<2||b.t>150){b.x=tx;b.y=ty;b.pattern='brake';b.t=0;}
     return true;
    }
    // The tell has a sound: inking the stamp, the box's catch flipped open, the loaded box hefted, the whistle.
    if(b.t===1){if(b.pattern==='brake'){cue('cond_whistle',.7,{gap:60});spawnPop(b.x,b.y-b.popH-8,'EMERGENCY!');}
     else if(b.pattern==='stamp')cue('cond_ink',.7,{fallback:'grab'});
     else if(b.pattern==='seize')cue('cond_latch',.5,{fallback:'grab'});
     else{G.audio.sfx('grab',.45);if(b.boxMeter>0)cue('coins',.25);}}
    // The seize is thrust from arm's length, so he steps back to make room for the open box.
    if(b.pattern==='seize'&&Math.abs(p.x-b.x)<92&&b.t<wind-4)b.x=clamp(b.x-b.face*2,G.camX+30,G.camX+W-30);
    // An early parry still locks CHAD out, without shortening the visible warning.
    if((b.pattern==='stamp'||b.pattern==='seize')&&!b.combo2&&!b.feinted&&p.parryLock>0&&b.t>=8&&b.t<wind-3&&!denied())b.feinted=true;
    if(b.pattern==='brake'&&b.t%12===6)cue('cond_chain_1',.55);
    if(b.t>=wind){
     b.state=b.pattern;b.t=0;b.combo2=false;
     if(b.pattern==='brake')yank(b);
     else{if(b.pattern!=='swing')G.audio.sfx('whiff',.55);cue('grunt',.5,{gap:40});}
    }
    return true;
   }
   case 'stamp':{
    if(b.t<6)b.x+=b.face*1.4;
    if(b.t===5)strike(b,'DENIED',60,7);
    if(b.t>=16&&b.double&&b.hasBox){b.double=false;b.combo2=true;begin(b,G.meter>=15&&b.boxMeter<80?'seize':'stamp');b.combo2=true;return true;}
    if(b.t>=20)finish(b,b.hitLanded?(p2?20:28):(p2?30:38),b.hitLanded?null:'stamp');
    return true;
   }
   case 'seize':{
    // A thrust from range: the lunge closes the gap he opened in the wind-up (up to ~95px) to arm's length.
    if(b.t<6){const gap=Math.abs(p.x-b.x);b.x=clamp(b.x+b.face*Math.min(Math.max(0,gap-48)/(6-b.t),10),G.camX+30,G.camX+W-30);}
    if(b.t===6)strike(b,'SEIZED',70,7);
    // Holds the box open while the meter pours in, at arm's length: a seized CHAD is eased back
    // so the open box never sits over his face and the stream reads across the gap.
    const pour=b.drain>0||b.t<22;
    if(b.hitLanded&&pour&&b.t>6&&!['down','getup'].includes(p.state)&&!p.dying&&Math.abs(p.x-b.x)<92){p.x=clamp(p.x+b.face*1.6,G.camX+16,G.camX+W-16);b.x=clamp(b.x-b.face*1.2,G.camX+30,G.camX+W-30);}
    if(!pour||b.t>=110){cue('cond_lid',.6,{fallback:'armor'});finish(b,b.hitLanded?(p2?18:24):36,b.hitLanded?null:'seize');}
    return true;
   }
   case 'swing':{
    if(b.t<10)b.x+=b.face*1.6;
    if(b.t===5)cue('cond_swing',.65,{fallback:'whiff'});
    if(b.t===8){b.contactY=CONTACT_Y.swing;if(tryHitPlayer(b,13,74,true,20,'unblockable')){b.hitLanded=true;b.voidChain=0;G.shake=5;cue('cond_box_hit',.7);if(b.boxMeter>0)cue('coins',.3);}}
    if(b.t>=18)finish(b,b.hitLanded?22:(p2?40:48),b.hitLanded?null:'swing');
    return true;
   }
   case 'brake':if(b.t>=26){b.state='rehook';b.t=0;}return true;
   case 'rehook':
    if(b.t%20===10)cue('cond_chain_1',.4);
    if(b.t>=(b.pulls>2?104:120)){cue('cond_latch',.8,{fallback:'armor'});finish(b,18);b.brakeAt=G.time+BRAKE_EVERY;b.voidChain=0;}
    return true;
   case 'dive':{
    // Crouch, then a flat dive onto the box.
    const q=b.boxLoose;if(!q){b.state='recover';b.t=0;b.recoverFor=10;return true;}
    if(b.t<8){b.z=0;b.face=Math.sign(q.x-b.x)||b.face;return true;}
    const n=Math.max(12,Math.abs(q.x-b.diveFrom[0])/6),k=clamp((b.t-8)/n,0,1);
    b.x=b.diveFrom[0]+(q.x-b.face*8-b.diveFrom[0])*k;b.y=b.diveFrom[1]+(q.y-b.diveFrom[1])*k;b.z=Math.sin(k*Math.PI)*18;
    if(k>=1){b.z=0;b.state='sprawl';b.t=0;q.covered=true;q.vx=0;cue('cond_thud',.8,{fallback:'slam'});if(b.boxMeter>0)cue('coins',.35);G.shake=4;spawnDust(b.x,b.y,8);}
    return true;
   }
   case 'sprawl':if(b.t>=52){b.state='boxgetup';b.t=0;cue('grunt',.45);}return true;
   case 'boxgetup':if(b.t>=18){pickUp(b);b.state='recover';b.t=0;b.recoverFor=12;b.recoverPose=null;}return true;
   case 'pickup':if(b.t===12)pickUp(b);if(b.t>=22){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,30);}return true;
   case 'count':
    if(b.t%12===4)cue('note',.5);
    if(b.t>=(p.state==='down'?110:70)||b.t>=150){b.state='idle';b.t=0;b.atkCd=12;}
    return true;
   case 'victory':if(!p.dying){b.state='idle';b.t=0;b.atkCd=40;}return true;
   case 'recover':if(b.t>=b.recoverFor){b.state='idle';b.t=0;b.recoverPose=null;b.atkCd=p2?22:34;}return true;
  }
  return false;
 },
 onDeath(b){
  if(b.boxMeter>0){addMeter(b.boxMeter);b.boxMeter=0;}
  clearSlides(b);removeLooseBox(b);b.hasBox=false;b.drain=0;G.lurch=null;G.player.guardDenied=0;b.inkDenied=b.inkSeized=b.inkEarly=null;
  // The box stays in the office, clear of the finisher's staging.
  b.fightProps=[{x:6140,y:232,box:true}];
  // Pops and sparks from the last exchange must not resume after the finisher.
  G.effects=[];
  startTrainCinematic('inspector-finish');
 },
 afterOpening(b){b.state='recover';b.t=0;b.recoverFor=16;b.recoverPose=null;b.flinch=0;b.voidLen=0;},
 draw(ctx,b,camX){
  if(G.state==='bossintro'){drawIntro(ctx,b,camX);return;}
  const [name,index]=pose(b);
  const f=getFrame(b.set,name,index,b.face),x=Math.round(b.x-camX-(name==='walk'?b.face*(b.walkHold||0):0)),y=Math.round(b.y-b.z);
  const cue=conductorCueOn(b);
  if(b.hasBox&&b.boxMeter>0&&BOX_AT[name]){const [gx,gy]=boxAt(b,name,index);glow(ctx,gx-camX,gy,b.boxMeter);}
  const was=b.pattern;b.pattern=b.pattern==='stamp'?'denied':b.pattern==='seize'?'seized':b.pattern==='swing'?'boxswing':b.pattern;
  blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,cue);
  if(cue)drawCueMarker(ctx,b,x,y-b.popH);
  b.pattern=was;
  if(b.hasBox&&b.boxMeter>0&&BOX_AT[name]){const [gx,gy]=boxAt(b,name,index);glow(ctx,gx-camX,gy,b.boxMeter,true);}
  // The ink he is about to use, held up over his head.
  if(G.reflecting)return;  // the floor reflection mirrors the body, not the ink
  if(cue&&['stamp','seize'].includes(b.pattern))drawInk(ctx,b.pattern==='stamp'?'DENIED':'SEIZED',x,y-b.popH-22,99,Math.sin(b.t*.3)*.08,.7,.75+.25*((b.t>>2)&1));
  if(b.voidT>0)drawInk(ctx,'VOID',x,y-62,(b.voidLen||VOID_TICKS)-b.voidT,.2,.9,b.voidT<30&&(b.voidT>>2)&1?.3:.95);
 },
 // Drawn on the carriage wall: the alarm chain and its red handle.
 wall(ctx,b,camX){drawChain(ctx,b,camX);},
 // Over everything: ink on CHAD, the meter stream, slide warnings.
 overlay(ctx,b,camX){
  const p=G.player;
  for(const s of b.streams){
   const k=clamp(s.t/s.life,0,1),[bx,by]=b.hasBox?boxAt(b,...pose(b)):b.boxLoose?[b.boxLoose.x,b.boxLoose.y-12]:[b.x,b.y-50];
   const from=s.back?[s.x0,s.y0]:[p.x,p.y-p.z-52],to=s.back?[p.x,p.y-p.z-52]:[bx,by];
   if(k<=0)continue;
   const at=kk=>{const e=kk*kk*(3-2*kk);return [from[0]+(to[0]-from[0])*e-camX,from[1]+(to[1]-from[1])*e-Math.sin(kk*Math.PI)*(18+(s.seed%5)*4)];};
   const [x,y]=at(k);
   // A glowing blue trail so the meter is visibly carried from CHAD to the box (or back).
   ctx.save();ctx.globalCompositeOperation='lighter';
   for(let i=3;i>=1;i--){const [tx,ty]=at(Math.max(0,k-i*.05));ctx.fillStyle=`rgba(90,170,255,${.22*(4-i)/3})`;ctx.fillRect(Math.round(tx)-1,Math.round(ty)-1,3,3);}
   const g=ctx.createRadialGradient(x,y,0,x,y,7);g.addColorStop(0,'rgba(170,225,255,.85)');g.addColorStop(1,'rgba(40,120,255,0)');ctx.fillStyle=g;ctx.fillRect(x-7,y-7,14,14);
   ctx.restore();
   note(ctx,s.seed,x,y,s.t*.3+s.seed,.14);
   ctx.fillStyle='#e8f6ff';ctx.fillRect(Math.round(x),Math.round(y),1,1);
  }
  // Two separate marks above CHAD's head (never over his face): DENIED, and SEIZED stacked above it.
  if(!p.dying){
   const hx=p.x-camX,hy=p.y-p.z-104;
   if(b.inkDenied){const ink=b.inkDenied,blink=p.guardDenied<40&&(ink.t>>2)&1;drawInk(ctx,'DENIED',hx-8,hy,ink.t,-.14,.8,blink?.35:.95);
    const k=clamp(p.guardDenied/DENIED_TICKS,0,1);ctx.fillStyle='rgba(20,4,4,.85)';ctx.fillRect(Math.round(hx-19),hy+9,38,3);ctx.fillStyle='#d8252d';ctx.fillRect(Math.round(hx-18),hy+10,Math.round(36*k),1);}
   if(b.inkSeized){const ink=b.inkSeized,fade=ink.t>80&&!(b.drain>0)?clamp(1-(ink.t-80)/30,0,1):1;drawInk(ctx,'SEIZED',hx+8,hy-(b.inkDenied?20:0),ink.t,.12,.8,.95*fade);}
   if(b.inkEarly){const ink=b.inkEarly;drawInk(ctx,'TOO EARLY',hx,hy-(b.inkDenied?20:0)-(b.inkSeized?20:0),ink.t,-.08,.72,.95*clamp((54-ink.t)/14,0,1));}
  }
  for(const w of b.warnings){
   if((w.t>>2)&1)continue;
   const d=w.fromLeft?1:-1,x=w.fromLeft?6:W-6,y=w.y-12;ctx.save();
   ctx.fillStyle='#2a0505';ctx.beginPath();ctx.moveTo(x-d,y-9);ctx.lineTo(x+d*14,y);ctx.lineTo(x-d,y+9);ctx.closePath();ctx.fill();
   ctx.fillStyle='#ff3b3b';ctx.beginPath();ctx.moveTo(x,y-7);ctx.lineTo(x+d*11,y);ctx.lineTo(x,y+7);ctx.closePath();ctx.fill();
   drawText(ctx,'!',x+d*16-1,y-3,'#ff5a4a',1);ctx.restore();
  }
  if(b.state==='windup'&&b.pattern==='brake'||b.state==='brake'||b.slideQueue.length||b.slides.length&&b.state==='rehook'&&b.t<60){
   // Below the HUD bars, on a dark plate.
   const txt='EMERGENCY CHAIN - JUMP THE LUGGAGE',w=textWidth(txt,1),x=Math.round((W-w)/2),y=46;
   ctx.fillStyle='rgba(14,4,4,.82)';ctx.fillRect(x-5,y-3,w+10,11);ctx.fillStyle='#8a1712';ctx.fillRect(x-5,y-3,w+10,1);ctx.fillRect(x-5,y+7,w+10,1);
   drawText(ctx,txt,x,y,(G.time>>3)&1&&b.state==='windup'?'#ffd3c8':'#ff6a55',1);
  }
 },
};
// The office's cases, and after the fight the cash box he dropped.
export function drawFightProps(ctx,props,camX){
 for(const q of props||[]){
  if(q.box){const im=ASSETS.nr_conductor_box_open||ASSETS.nr_conductor_box;if(im)ctx.drawImage(im,Math.round(q.x-camX-im.width/4),Math.round(q.y-im.height/2),im.width/2,im.height/2);continue;}
  if(!q.roof){const im=ASSETS[q.broken?'prop_nr_case_b':'prop_nr_case'];if(im){const w=q.broken?48:42,h=w*im.height/im.width;ctx.drawImage(im,Math.round(q.x-camX-w/2),Math.round(q.y-h),w,h);}}
 }
}

function yank(b){
 b.pulls++;G.audio.roomSfx?.('train_brake',.45,.85);cue('cond_chain_2',.8,{fallback:'slam'});cue('grunt',.55);G.shake=Math.max(G.shake,6);
 G.lurch={t:0,dir:b.pulls===2?-1:1};queueSlides(b);
 spawnPop(b.x,b.y-b.popH-8,b.pulls===1?'EMERGENCY STOP!':'AGAIN!');
 if(b.pulls===1)b.quipAt=G.time+50;
}

function glow(ctx,x,y,amount,front=false){
 const k=clamp(amount/100,0,1),pulse=.75+.25*Math.sin(G.time*.2);
 ctx.save();ctx.globalCompositeOperation='lighter';
 if(!front){const r=10+10*k,g=ctx.createRadialGradient(x,y,1,x,y,r);g.addColorStop(0,`rgba(120,200,255,${(.35+.4*k)*pulse})`);g.addColorStop(1,'rgba(40,110,255,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}
 else{ctx.fillStyle=`rgba(150,215,255,${.25*k*pulse})`;for(let i=0;i<3;i++){const a=G.time*.07+i*2.1;ctx.fillRect(Math.round(x+Math.cos(a)*(6+3*k)),Math.round(y+Math.sin(a)*4),1,1);}}
 ctx.restore();
}
function drawLooseBox(ctx,b,q,camX){
 if(q.covered)return;
 const im=b.boxMeter>0?ASSETS.nr_conductor_box:ASSETS.nr_conductor_box_open,wob=q.shakeT>0?((q.t&1)?1:-1):0,x=Math.round(q.x-camX)+wob,y=Math.round(q.y-q.z);
 if(!G.reflecting){ctx.save();ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(Math.round(q.x-camX),Math.round(q.y),13,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 if(b.boxMeter>0)glow(ctx,x,y-10,b.boxMeter);
 if(im){ctx.save();if(q.flash>0)ctx.filter='brightness(1.6)';ctx.drawImage(im,x-im.width/4,y-im.height/2+2,im.width/2,im.height/2);ctx.restore();}
 else{ctx.fillStyle='#8a8f96';ctx.fillRect(x-12,y-14,24,14);}
 if(b.boxMeter>0){glow(ctx,x,y-10,b.boxMeter,true);if(!G.reflecting&&(G.time>>4)&1){const w=textWidth('HIT IT',1);ctx.fillStyle='rgba(8,14,28,.8)';ctx.fillRect(x-w/2-2,y-45,w+4,9);drawText(ctx,'HIT IT',Math.round(x-w/2),y-43,'#8fd0ff',1);}}
}
function drawSlide(ctx,q,camX){
 const im=ASSETS.nr_conductor_hazards,x=Math.round(q.x-camX),y=Math.round(q.y),rock=Math.sin(q.t*.8)*.07,hop=q.t%8<2?-1:0;
 if(!G.reflecting){ctx.save();ctx.fillStyle='rgba(0,0,0,.35)';ctx.beginPath();ctx.ellipse(x,y,q.w/2,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
 if(!im){ctx.fillStyle='#6b4a2a';ctx.fillRect(x-q.w/2,y-q.h,q.w,q.h);return;}
 ctx.save();ctx.translate(x,y+1+hop);if(q.vx<0)ctx.scale(-1,1);ctx.rotate(rock);ctx.drawImage(im,q.slot*128,0,128,128,-32,-64,64,64);ctx.restore();
}
// The office's alarm chain before he rises and after he falls.
export function drawOfficeChain(ctx,camX){drawChain(ctx,null,camX);}
// Art (2x, drawn at half size; tools/production/build_conductor_chain.py): the mount and handle are centred on
// their anchors (the pulley ring's hole, the shackle eye) and the link tile is one seamless face+edge period.
const CHAIN_TOP=10,CHAIN_HANG=74;
function drawChain(ctx,b,camX){
 const live=b&&!b.dead&&G.state!=='bossintro';
 let hand=null;const [name,idx]=live?pose(b):['idle',0];
 if(name==='chain'||name==='rehook')hand=handAt(b,name,idx);
 const M=ASSETS.nr_conductor_chain_mount,L=ASSETS.nr_conductor_chain_link,Hd=ASSETS.nr_conductor_chain_handle;
 if(M&&L&&Hd){
  const top=[CHAIN_X-camX,CHAIN_TOP],end=hand?[hand[0]-camX,hand[1]]:[top[0]+Math.sin(G.time*.05)*1.5,CHAIN_HANG];
  const dx=top[0]-end[0],dy=top[1]-end[1],len=Math.hypot(dx,dy),tw=L.width/2,p=L.height/2;
  // Filtered only when pulled clearly off plumb: nearest sampling breaks the links into stair steps there.
  const ang=Math.atan2(dx/len,-dy/len);ctx.save();ctx.translate(end[0],end[1]);ctx.rotate(ang);if(Math.abs(ang)>.08)ctx.imageSmoothingEnabled=true;
  // Tiled up from the handle, so the link that meets the shackle never changes; the pulley hides the cut end.
  for(let d=0;d<len;d+=p){const r=Math.min(p,len-d);ctx.drawImage(L,0,(p-r)*2,L.width,r*2,-tw/2,-d-r,tw,r);}
  ctx.restore();
  ctx.drawImage(M,Math.round((top[0]-M.width/4)*2)/2,top[1]-M.height/4,M.width/2,M.height/2);
  // In the chain poses the handle is in his fist; re-hooking, he holds it by the shackle.
  if(!hand||name==='rehook')ctx.drawImage(Hd,Math.round((end[0]-Hd.width/4)*2)/2,Math.round((end[1]-Hd.height/4)*2)/2,Hd.width/2,Hd.height/2);
  return;
 }
 const top=[CHAIN_X-camX,20];
 const end=hand?[hand[0]-camX,hand[1]]:[top[0]+Math.sin(G.time*.05)*1.5,84];
 ctx.save();
 const n=Math.max(4,Math.round(Math.hypot(end[0]-top[0],end[1]-top[1])/3));
 ctx.strokeStyle='rgba(12,9,7,.85)';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(top[0],top[1]);ctx.lineTo(end[0],end[1]);ctx.stroke();
 for(let i=0;i<n;i++){const k=i/n,x=Math.round(top[0]+(end[0]-top[0])*k),y=Math.round(top[1]+(end[1]-top[1])*k);
  if(i%2){ctx.fillStyle='#c9c3b2';ctx.fillRect(x-1,y,2,2);}else{ctx.fillStyle='#8d877a';ctx.fillRect(x,y,1,3);}}
 ctx.fillStyle='#262320';ctx.fillRect(Math.round(top[0])-5,top[1]-2,10,4);ctx.fillStyle='#b8201c';ctx.fillRect(Math.round(top[0])-3,top[1]-1,6,2);
 // In the chain poses the handle is drawn in his fist; re-hooking, it is drawn here at his hand.
 if(!hand||name==='rehook'){const x=Math.round(end[0]),y=Math.round(end[1])+(hand?-2:0);
  ctx.fillStyle='#1a0c0a';ctx.fillRect(x-7,y-1,14,6);ctx.fillRect(x-2,y-4,4,4);
  ctx.fillStyle='#c8231d';ctx.fillRect(x-6,y,12,4);ctx.fillRect(x-1,y-3,2,4);
  ctx.fillStyle='#ff7a5c';ctx.fillRect(x-5,y,10,1);ctx.fillStyle='#f3e6c8';ctx.fillRect(x-3,y+2,6,1);}
 ctx.restore();
}

// Walk cells advance by the ground each one covers (the planted shoe's measured travel), and the body
// is held back within a cell so that shoe stays put on the floor instead of skating.
// Measured with tools/verification/conductor_walk_check.py (logical px per cell, error <= 2.5).
const WALK_BEAT={nr_conductor:[3,12,9,18,2.5],nr_conductor_free:[2.5,13.5,7,20,2.5]},WALK_SLIDE=1;
function walkCell(b){
 const B=WALK_BEAT[b.set?._aiKey]||WALK_BEAT.nr_conductor,L=B.reduce((a,c)=>a+c);
 let ph=((b.stridePhase||0)%L+L)%L,i=0;while(ph>=B[i])ph-=B[i++];b.walkHold=ph*WALK_SLIDE;b.walkIdx=i;return i;
}
function pose(b){
 const t=b.t,s=b.state;
 if(b.dead||s==='down'||s==='dying')return ['down',0];
 if(s==='getup')return ['getup',Math.min(3,Math.floor(t/4))];
 if(s==='stagger'||b.protectedStagger>0){
  if(b.voidT>(b.voidLen||VOID_TICKS)-30)return ['void',0];
  const d=dazePose(b);return [d.name,d.idx];
 }
 if(s==='hurt')return ['hurt',b.hurtHigh===false?1:0];
 if(b.guardFlash>0&&['idle','windup','recover','hurt'].includes(s))return ['block',0];
 if(s==='rise')return t>36?['walk',walkCell(b)]:['idle',0];
 if(s==='windup'){
  if(b.pattern==='stamp')return ['stamp',0];
  if(b.pattern==='seize')return ['seize',0];
  if(b.pattern==='swing')return ['swing',0];
  if(b.pattern==='brake')return ['chain',0];
 }
 if(s==='stamp')return ['stamp',t<12?1:2];
 if(s==='seize')return ['seize',t<14?1:0];
 if(s==='swing')return ['swing',t<6?0:t<14?1:2];
 if(s==='brake')return ['chain',1];
 if(s==='rehook')return ['rehook',Math.floor(t/14)%2];
 if(s==='dive')return t<8?['getup',3]:['dive',0];
 if(s==='sprawl')return ['sprawl',0];
 if(s==='boxgetup')return ['getup',t<9?2:3];
 if(s==='pickup')return ['pickup',0];
 if(s==='count')return ['count',0];
 if(s==='victory')return b.hasBox?['victory',0]:['idle',0];
 if(s==='recover'){
  if(b.recoverPose==='swing')return ['swing',2];
  if(b.recoverPose==='stamp')return ['stamp',2];
  if(b.recoverPose==='seize')return ['seize',1];
  return ['idle',0];
 }
 if(b.moved>.1)return ['walk',walkCell(b)];
 return ['idle',Math.floor(G.time/28)%2];
}
function drawIntro(ctx,b,camX){
 const t=b.introT||0,show=G.train?.review?.conductorActor!==false;
 // Seated behind the desk on the rear floor plane, then down the aisle to the combat floor.
 const drawY=b.y-18*(1-clamp((t-120)/50,0,1));
 if(show){
  if(t>=120&&t<210){const f=getFrame(b.set,'walk',Math.floor((DESK_X-b.x+Math.max(0,b.y-188))/6)%8,-1);blitTelegraph(ctx,b,f,Math.round(b.x-camX-frameW(f)/2),Math.round(drawY-frameH(f)+4),false);}
  else{
   const pose=t<26?0:t<60?1:t<85?2:t<108?3:t<210?4:t<248?5:t<278?6:7,im=ASSETS.nr_conductor_intro;
   if(im){ctx.save();ctx.translate(Math.round(b.x-camX),drawY);ctx.scale(-1,1);ctx.drawImage(im,pose*320,0,320,240,-80,-116.5,160,120);ctx.restore();}
   else{const f=getFrame(b.set,'idle',0,-1);blitTelegraph(ctx,b,f,b.x-camX-frameW(f)/2,drawY-frameH(f)+4,false);}
  }
 }
 if(b.y<204)drawConductorDesk(ctx,camX);
}
