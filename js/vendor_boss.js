import {vendorWalkMotion,VENDOR_WALK_CELLS,VENDOR_WALK_STRIDE,VENDOR_WALK_SETTLE} from './vendor_walk_motion.js';
// The Vendor: a street cook defending his kitchen, with one answer per attack, in three phases.
// LUNCH RUSH (full to half): skimmer string -> guard the two quick swings, parry the green
// overhead: parried, it buries the skimmer in the floor and he is stuck, seeing stars. Oil scoop -> hit him while he dips (hot foot), or jump the lob and walk clear of its floor fire. Belly bump (up close, instead of a second string or a point-blank throw) ->
// parry it for an opening, or take the shove: it only makes room for the oil lob or flop that follows.
// EXTRA SPICY (refills to 70%, then down to 30%): he eats chillies (armoured) and the kadai catches. Everything
// is quicker, and he adds one low fire surge (jump it or get behind him, punish the coughing fit)
// and the belly flop (jump its shockwave, punish him on the floor).
// LAST ORDER: devour the meal, smash the kadai, jump the shockwave, then face the mutated cook.
import {G,W,clamp,diff,laneMin,laneMax,arenaMin,arenaMax} from './engine.js';
import { GREEN_WARNING_TICKS, greenCue } from './combat_readability.js';
import {drawKadaiLife,drawKadaiSmoke,drawSpillLife,pappuHead,kadaiBurner,panFire} from './vendor_kitchen_life.js';
import {SPR,getFrame,blit,frameW,frameH,drawTextShadow,textWidth} from './sprites.js';
import {drawDisplayTitle} from './display_type.js';
import {getAIFrame} from './aiframes.js';
import {createProp,PROP_TYPES} from './props.js';
import {spawnArc} from './shots.js';
import {spawnDust,spawnPop,spawnRing,spawnSmoke,spawnDebris} from './effects.js';
import {vendorHotFrame,vendorSpicyFrame,drawVendorHeat} from './vendor_inferno.js';
import {FLOOR_FIRE,prepareFloorFire,updateFloorFire,drawFloorFire,drawGroundExhale,floorSpewCell,infernoRoarCell} from './vendor_floor_fire.js';
import {dazePose} from './daze.js';
import {tryHitPlayer,blitTelegraph,drawCueMarker} from './bosslib.js';
import {ASSETS} from './assets.js';
import {fx} from './fx.js';
import {SPICY_THROW,spicyThrowCell,spicyThrowOffset,updateSpicyThrow,throwSpicyVolley,drawSpicyRings,drawSpicyThrow} from './vendor_spicy_throw.js';
import {pappu,pappuBed,pappuBedStop,PAPPU_CUES as PC} from './vendor_sound.js';

// Arena, relative to the encounter camera: his kadai on its burner, out on the street in front of
// the stall's plinth (the lane starts at 213), so he stands on the street working it.
export const VK=Object.freeze({kadai:[372,222]});
// Wind-ups per phase [lunch rush, extra spicy, last order].
export const VENDOR_WIND={string:[26,18,14],naan:[24,24,24],breath:[34,26,FLOOR_FIRE.wind],flop:[26,20,24],bump:[20,20,20],forearm:[28,28,42],cleaver:[36,36,42]};
export const VENDOR_DIP=[54,40,32],VENDOR_FLING=14,VENDOR_RAGE=110,VENDOR_LAST=116,VENDOR_INTRO=384;
export const VENDOR_PHASE=Object.freeze({spicy:.5,spicyRevive:.7,last:.3,revive:.55});
export const VENDOR_DIP_X=48; // he stands this far left of the kadai to reach into it
export const VENDOR_WORK_Y=4; // and this far behind it
export const VENDOR_LANE_MAX=230; // his soles stay clear of the boss bar's name label at the bottom of the screen
// CHAD's front of the street in this fight (engine laneMax reads the boss's laneBot): never under the boss bar,
// and never out of reach of the skimmer, the belly or the oil, which all work within 17 px of Pappu's lane.
export const VENDOR_CHAD_MAX=VENDOR_LANE_MAX+4;
export const VENDOR_STING=56; // a phase change's banner
// His street's left wall stands 36 px further in (50 px inside the locked camera): CHAD knocked down against it
// lies on screen, head and all (engine arenaMin reads the boss's arenaLeftPad).
export const VENDOR_LEFT_PAD=36;
const DECKS=[
 ['string','scoop','bump','scoop','string','scoop'],
 ['string','breath','flop','scoop','bump','scoop','string','flop','breath'],
 ['forearm','cleaver','breath'],
];
const GUARDED=['idle','reguard','furnace-approach','furnace-plant','furnace-pivot','setup-scoop','advance','windup','string','naan','fling'];
// The belly bump's contact tick, its end, CHAD's knock back on contact, and the gap it keeps: the thrust belly reaches
// 41 px ahead of his feet and CHAD is 16 px either side of his, so at 53 the belly's edge meets CHAD's front.
// gap: his feet to CHAD's at contact, the thrust cell's belly front (~42) plus CHAD's half body; front/waist: where the belly meets him.
export const VENDOR_BUMP=Object.freeze({hit:5,end:28,push:11,gap:60,front:42,waist:50});
const COMMITTED=['breath','flop','forearm','cleaver'];
const OPEN=['stuck','cough','flopped','cleaver-stuck'];
const ARMOURED=['rage','fakeout','crawl-feast','feast-rise','setup-feast','lastorder','mutate'];
export const VENDOR_CAULDRON=Object.freeze({lift:12,drink:28,gulp:76,warning:76,release:114,mutation:102,damage:18});
export const VENDOR_BREATH=Object.freeze({ticks:24,range:170,jump:22,recovery:70,lastRecovery:30,finalTicks:32,finalRange:220,finalDamage:14});
export const vendorBreathRange=b=>(b.phase||1)>=3?VENDOR_BREATH.finalRange:VENDOR_BREATH.range;
const flopClear=b=>b.mutated?124:VENDOR_FLOP_CLEAR;
const bellyClear=b=>b.mutated?94:VENDOR_BELLY_CLEAR;
const ph=b=>(b.phase||1)-1; // 0, 1, 2
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1);
const sound=(name,v=.5)=>{if(!G.audio.roomSfx?.(name,v))G.audio.sfx(name);};

// String timings: two quick swings, a raised overhead (green cue), the slam, stuck. In the last
// order he rips the skimmer out of the street and brings it down a second time.
export function stringBeats(b){
 const P=ph(b),k=[1,.8,.72][P],r=v=>Math.round(v*k),o={a:r(4),b:r(24),raise:r(32),slam:r(56),end:r(62)};
 if(P===2)Object.assign(o,{raise2:r(68),slam2:r(92),end:r(98)});
 const extra=Math.max(0,GREEN_WARNING_TICKS-(o.slam-o.raise));o.slam+=extra;o.end+=extra;
 if(P===2){o.raise2+=extra;o.slam2+=extra;const extra2=Math.max(0,GREEN_WARNING_TICKS-(o.slam2-o.raise2));o.slam2+=extra2;o.end+=extra2;}
 return o;
}
// The raised skimmer: the window a parry turns into the long, starry opening.
function overhead(b,t=b.t){const k=stringBeats(b);return b.state==='string'&&(t>=k.raise&&t<k.slam+2||k.raise2!==undefined&&t>=k.raise2);}
export function vendorCueOn(b){
 const k=stringBeats(b),P=ph(b);
 if(b.state==='lastorder')return b.t>=VENDOR_CAULDRON.warning&&b.t<=VENDOR_CAULDRON.release;
 if(b.pattern==='bump'&&['windup','bump'].includes(b.state))return greenCue(b.state,b.t,VENDOR_WIND.bump[P]+(b.crush?6:0),VENDOR_BUMP.hit);
 if(b.pattern==='naan'&&['windup','naan'].includes(b.state))return b.state==='windup'?greenCue('windup',b.t,VENDOR_WIND.naan[P],1):b.t<=NAAN_THROWS[P].at(-1);
 if(b.state==='string')return b.t>=k.raise&&b.t<=k.slam||k.raise2!==undefined&&b.t>=k.raise2&&b.t<=k.slam2;
 if(b.pattern==='forearm'&&['windup','forearm'].includes(b.state))return greenCue(b.state,b.t,VENDOR_WIND.forearm[P],8);
 if(b.state==='windup'&&b.pattern==='cleaver')return b.t>=25;
 if(b.state==='windup')return b.pattern!=='string'&&b.t>4;
 if(b.state==='cleaver')return b.t<=7;
 return b.state==='fling'&&VOLLEYS[P].some(v=>b.t<=v.at&&b.t>=v.at-VENDOR_FLING);
}

// ---- the kadai --------------------------------------------------------------------------
function strip(ctx,key,i,n,x,y,face=1){
 const im=ASSETS[key];if(!im)return false;const cw=im.width/n,w=cw/2,h=im.height/2;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));if(face<0)ctx.scale(-1,1);
 const trim=key==='dv_kadai'&&i===1?82:0;
 if(key==='dv_kadai'&&i<2){
  // Match the held wok's 77px handle span; the stove keeps its original footprint.
  const bowlW=w*KADAI_BOWL_SCALE;ctx.drawImage(im,i*cw,trim,cw,KADAI_SPLIT-trim,-bowlW/2,-h+2+trim/2,bowlW,(KADAI_SPLIT-trim)/2);
  ctx.drawImage(im,i*cw,KADAI_SPLIT,cw,im.height-KADAI_SPLIT,-w/2,-h+2+KADAI_SPLIT/2,w,(im.height-KADAI_SPLIT)/2);
 }else ctx.drawImage(im,i*cw,trim,cw,im.height-trim,-w/2,-h+2+trim/2,w,h-trim/2);ctx.restore();return true;
}
// Painted props and the fat man himself need a contact shadow to sit on the wet street.
function contact(ctx,x,y,rx,ry=4,a=.42){
 if(G.reflecting)return;ctx.save();ctx.fillStyle=`rgba(12,7,5,${a})`;ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),rx,ry,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
// Cooking (0), lit by the chilli from the second phase (1), knocked over by the finisher (2).
const kadaiState=pr=>pr.broken?2:pr.hp>1?1:0;
// The kadai belongs to the street (a Delhi stage prop): until CHAD reaches the gate, Pappu is already
// at it, frying on a loop (cosmetic, drawn with the pan, no combat actor), so the reveal starts from
// what the player walked up to.
const vendorWaiting=()=>G.stage?.id==='delhi'&&G.stage.waves.some(w=>w.miniboss==='vendor'&&!w.done);
// Drawn under the pan (behind it): the finisher's burning spill (vendor_finisher.js sets it), so the flames never wash it out.
// spread(pr): how far the spilt ghee has run and caught (0..1, the finisher's clock; 1 outside it).
export const kadaiUnder={draw:null,spread:null};
export function drawKadai(ctx,pr,camX,{above}={}){
 const x=pr.x+(pr.slide||0)-camX+(pr.shakeT>0?((pr.shakeT&1)?1:-1):0),y=pr.y,s=kadaiState(pr),cook=s===0&&G.boss?.kadai!==pr&&vendorWaiting();
 // above: only what stands in front of an actor half in the pan (its bowl, and the flames' roots over its rim).
 if(above!==undefined){ctx.save();ctx.beginPath();ctx.rect(0,Math.round(above),W,300);ctx.clip();}
 try{
 if(pr.smashed){
  const wreck=ASSETS.dv_burner_wreck,sx=(pr.smashX??pr.x)-camX,sy=pr.smashY??pr.y;
  contact(ctx,x,sy+2,46,5);if(wreck)ctx.drawImage(wreck,Math.round(x-49),Math.round(sy-wreck.height/wreck.width*98+3),98,wreck.height/wreck.width*98);
  if(ASSETS.dv_cauldron_shards)drawIronFragments(ctx,pr,sx,sy);return;
 }
 if(pr.drained&&!pr.bowlLifted&&!pr.broken&&ASSETS.dv_empty_cauldron){
  const im=ASSETS.dv_kadai,cw=im.width/3,top=y+2-im.height/2,bowl=ASSETS.dv_empty_cauldron,w=77,h=bowl.height/bowl.width*w;
  ctx.drawImage(im,0,KADAI_SPLIT,cw,im.height-KADAI_SPLIT,Math.round(x-cw/4),Math.round(top+KADAI_SPLIT/2),cw/2,(im.height-KADAI_SPLIT)/2);
  const q=(pr.tip||0),f=(pr.fall||0)**2,angle=-KADAI_TIP*q+(KADAI_DOWN+KADAI_TIP)*f,px=x+KADAI_SLIDE*q,py=y-35;
  ctx.save();ctx.translate(Math.round(px),Math.round(py));ctx.rotate(angle);ctx.drawImage(bowl,-w/2,-h/2,w,h);ctx.restore();
  panFire(ctx,px,py-4,.25*(1-f));kadaiBurner(ctx,x,y,1-f);return;
 }
 if(pr.bowlLifted){const im=ASSETS.dv_kadai;if(im){const cw=im.width/3,top=y+2-im.height/2;ctx.drawImage(im,0,KADAI_SPLIT,cw,im.height-KADAI_SPLIT,Math.round(x-cw/4),Math.round(top+KADAI_SPLIT/2),cw/2,(im.height-KADAI_SPLIT)/2);}kadaiBurner(ctx,x,y,1);return;}
 if(cook)drawWaitingCook(ctx,pr,camX);
 if(above===undefined){contact(ctx,x,y,30,5);kadaiUnder.draw?.(ctx,pr,x,y);}
 if(pr.tip>0&&s!==2&&tipKadai(ctx,x,y,s,pr.tip,pr.fall||0))return;
 if(s===1)drawKadaiSmoke(ctx,x,y);
 if(!strip(ctx,'dv_kadai',s,3,x,y)){ctx.fillStyle='#1c1614';ctx.fillRect(x-30,y-44,60,20);ctx.fillStyle='#3a2a20';ctx.fillRect(x-20,y-24,40,24);}
 if(s!==2)drawKadaiLife(ctx,x,y,s,kadaiWork(pr,cook));else drawSpillLife(ctx,x,y,kadaiUnder.spread?.(pr)??1);
 }finally{if(above!==undefined)ctx.restore();}
}
// Painted iron fragments fly, bounce once, and remain exactly where they settle.
function drawIronFragments(ctx,pr,x,y){
 const im=ASSETS.dv_cauldron_shards,age=Math.max(0,G.time-(pr.smashAt??G.time-80)),seed=[[-3.2,-4.4], [2.8,-3.8],[-1.4,-5.1],[3.5,-4.9],[-3.9,-3.1],[1.2,-4.1]];
 for(let i=0;i<6;i++){let dx=0,dy=-8,vx=seed[i][0],vy=seed[i][1],bounce=0,rot=0;for(let t=0;t<Math.min(age,90);t++){dx+=vx;const lo=(pr.smashLeft??pr.x-340)-(pr.smashX??pr.x),hi=(pr.smashRight??pr.x+94)-(pr.smashX??pr.x);if(dx<lo||dx>hi){dx=clamp(dx,lo,hi);vx*=-.3;}vy+=.24;dy+=vy;rot+=vx*.045;if(dy>=0){dy=0;if(bounce++){vx=vy=0;break;}vy=-vy*.25;vx*=.38;}}
  ctx.save();ctx.translate(Math.round(x+dx),Math.round(y+dy-5));ctx.rotate(rot);ctx.drawImage(im,i*96,0,96,96,-24,-24,48,48);ctx.restore();
 }
}
// Knocked off its burner (the finisher). tip 0..1: the pan (dv_kadai rows above KADAI_SPLIT) rocks over to the left on
// its ring, up to KADAI_TIP, sliding KADAI_SLIDE px, and pours its ghee over the lip. fall 0..1: it goes on over, turning
// on to its side (KADAI_DOWN) as it drops to where the spilled cell (2) shows it (foreshortening to that cell's view of
// it), which the spill cuts to on its impact.
// The fire in it is drawn live and upright at its mouth (the lit cell's painted flames fade out as it starts to rock).
const KADAI_BOWL_SCALE=77/67;
const KADAI_SPLIT=146,KADAI_TIP=22*Math.PI/180,KADAI_DOWN=-100*Math.PI/180,KADAI_SLIDE=8,KADAI_REST=[25,-41],KADAI_RIM=-17;
function tipKadai(ctx,x,y,s,tip,fall){
 const im=ASSETS.dv_kadai;if(!im)return false;const cw=im.width/3,w=cw/2,top=y+2-im.height/2,base=top+KADAI_SPLIT/2,q=tip*tip*(3-2*tip),f=fall*fall,
  a=-KADAI_TIP*q+(KADAI_DOWN+KADAI_TIP)*f,px=x+KADAI_SLIDE*q+(KADAI_REST[0]-KADAI_SLIDE*q)*f,py=base+(y+KADAI_REST[1]-base)*f,
  sx=1-.35*f,sy=1+.4*f,bare=s===1?clamp(tip*4,0,1):1,t=G.time|0;
 const upper=(c,al)=>{if(al<=0)return;ctx.save();ctx.globalAlpha*=al;ctx.translate(Math.round(px),Math.round(py));ctx.rotate(a);ctx.scale(sx,sy);ctx.drawImage(im,c*cw,0,cw,KADAI_SPLIT,-w*KADAI_BOWL_SCALE/2,-KADAI_SPLIT/2,w*KADAI_BOWL_SCALE,KADAI_SPLIT/2);ctx.restore();};
 // the stand and its ring (knocked flat when it lands: the spill cuts to the spilled cell on the impact)
 ctx.drawImage(im,s*cw,KADAI_SPLIT,cw,im.height-KADAI_SPLIT,Math.round(x-w/2),Math.round(base),w,(im.height-KADAI_SPLIT)/2);
 kadaiBurner(ctx,x,y,1-fall);
 upper(0,1);if(s===1)upper(s,1-bare);
 // the burning ghee still in it, upright at its mouth, pouring out as it goes over
 const rim=(ox,oy)=>{ox*=sx;oy*=sy;return [px+Math.cos(a)*ox-Math.sin(a)*oy,py+Math.sin(a)*ox+Math.cos(a)*oy];};
 if(s===1){const [mx,my]=rim(0,KADAI_RIM);panFire(ctx,mx,my,(1-.35*q)*(1-fall*.8));}
 // the ghee over the lip: a sheet of gold falling to the street, thickening as it tips and running out as it falls
 const [lx,ly]=rim(-31,KADAI_RIM),n=Math.round((3+9*q)*(1-fall));
 for(let i=0;i<n;i++){const g=((t*3+i*7)%14)/14,yy=ly+(y+2-ly)*g,xx=lx-4*g*g-(i%3);ctx.fillStyle=i%3?'#f0b040':'#fff0a0';ctx.fillRect(Math.round(xx),Math.round(yy),i%3?2:1,2);}
 return true;
}
function drawWaitingCook(ctx,pr,camX){
 if(G.reflecting)return;const t=(G.time|0)%FRY.at(-1),x=pr.x-VENDOR_DIP_X-camX,y=pr.y-VENDOR_WORK_Y;
 if(x<-80||x>W+80)return;
 contact(ctx,x,y+1,26,4,.34);
 const f=getFrame(SPR.ic_vendor,'fry',FRY.findIndex(e=>t<e),1);
 if(f){blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));pappuHead(x,y-92);}
}
// What the kadai's oil is doing: whether he's working it, how long since it was last thrown up
// (a scoop, a dunk, a pakora going in) and since a phase change flared it.
function kadaiWork(pr,cook){
 if(cook)return {busy:true,burst:fryPop((G.time|0)%FRY.at(-1))};
 const b=G.boss,own=b?.kadai===pr,intro=own&&G.state==='bossintro'&&(b.introT||0)<80;
 const busy=own&&!b.dead&&Math.abs(b.x-pr.x)<VENDOR_DIP_X+8&&Math.abs(b.y-pr.y)<30;
 return {busy,burst:intro?fryPop(b.introT||0):own?G.time-(b.kadaiPopT??-99):99,flare:Math.min(own?G.time-(b.sting?.at??-99):99,pr.flareAt!==undefined?G.time-pr.flareAt:99)}; // (flareAt: the finisher's roll over it)
}
Object.assign(PROP_TYPES,{
 dv_kadai:{hp:1,w:66,h:48,shadowR:0,score:0,drop:null,decor:true,debris:[],draw:drawKadai},
});
// He takes over the street's kadai (india_stages.js places it with the area); a scene without it gets one.
function installKitchen(b){
 const [dx,dy]=VK.kadai,x=G.camLock+dx,y=clamp(dy,laneMin(x),laneMax(x));
 const k=G.props.find(p=>p.prop==='dv_kadai'&&!p.broken&&Math.abs(p.x-x)<8)||createProp('dv_kadai',x,y);
 G.props=G.props.filter(p=>!p.indiaBossProp&&p!==k);
 Object.assign(k,{x,y,hp:1,shakeT:0,indiaBossProp:true,role:'kadai'});G.props.push(k);
 b.kadai=k;b.fightProps=[k];
}

// ---- shared machine -------------------------------------------------------------------
function opening(b,ticks,kind){
 Object.assign(b,{protectedStagger:Math.max(b.protectedStagger,ticks),openKind:kind,deepStuck:false,state:'stagger',t:0,vx:0,atkCd:50});
}
function recover(b,duration=40){Object.assign(b,{state:'recover',t:0,recovery:duration,hitLanded:false});}
// A phase change lands: a freeze, the kadai flares, and Pappu's own roar carries the banner.
function sting(b,n){
 b.sting={n,at:G.time};G.hitstop=Math.max(G.hitstop,8);
 if(b.kadai){b.kadai.shakeT=14;b.kadaiPopT=G.time;spawnSmoke(b.kadai.x,b.kadai.y-80,4);}
}
const STING={2:['EXTRA SPICY!',"THE OIL'S ON FIRE",'#ff5a2a'],3:['LAST ORDER!',"KITCHEN'S CLOSING",'#ffd060']};
function drawSting(ctx,b){
 const s=b.sting,a=s?G.time-s.at:99;if(a<0||a>=VENDOR_STING||b.dead)return;
 const [title,sub,col]=STING[s.n],open=Math.min(1,a/8)*Math.min(1,(VENDOR_STING-a)/8),h=Math.round(30*open);if(h<3)return;
 const y=58+15-h/2;ctx.save();ctx.fillStyle='rgba(16,10,12,.88)';ctx.fillRect(0,y,W,h);ctx.fillStyle=col;ctx.fillRect(0,y,W,1);ctx.fillRect(0,y+h-1,W,1);
 if(h>=26){const slide=Math.round(40*(1-Math.min(1,a/10))**3);
  drawDisplayTitle(ctx,title,W/2-slide,y+3,{height:14,maxWidth:300});
  drawTextShadow(ctx,sub,Math.round((W-textWidth(sub,1))/2+slide),y+20,'#f8e0b8',1);}
 ctx.restore();
}
function regroup(b){Object.assign(b,{state:'reguard',t:0,vx:0,recovery:0,atkCd:0,openKind:null,deepStuck:false});}
function begin(b,pattern){Object.assign(b,{pattern,state:'windup',t:0,hitLanded:false,face:G.player.x<b.x?-1:1});if(b.mutated&&pattern==='breath')prepareFloorFire(b);}
function stepTo(b,x,y,speed=1.5){
 const ox=b.x,oy=b.y;b.face=G.player.x<b.x?-1:1;
 b.x+=clamp(x-b.x,-speed,speed);b.y+=clamp(y-b.y,-.7,.7);b.stepDir=Math.sign(b.x-ox);b.stepMoved=Math.hypot(b.x-ox,b.y-oy);
 return Math.abs(x-b.x)<3&&Math.abs(y-b.y)<3;
}
// A foot plants at the end of each step; he never slides through CHAD.
function lunge(b,start,end,distance,minGap=34){
 if(b.t<=start||b.t>end)return;
 const ease=t=>.5-.5*Math.cos(Math.PI*clamp(t,0,1));
 const travel=distance*(ease((b.t-start)/(end-start))-ease((b.t-1-start)/(end-start)));
 const gap=(G.player.x-b.x)*b.face,sameLane=Math.abs(G.player.y-b.y)<17&&G.player.z<18;
 b.x+=b.face*(sameLane&&gap>=0?Math.min(travel,Math.max(0,gap-minGap)):travel);
}
// A CHAD who came in at the very front of the street is walked up out from under the boss bar.
function easeLaneBot(b){if(b.laneBot>VENDOR_CHAD_MAX)b.laneBot=Math.max(VENDOR_CHAD_MAX,b.laneBot-.5);}
// Two bodies never merge into one: in every grounded state CHAD's middle stays VENDOR_BODY_GAP (36 while Pappu is
// free to step, 30 while he is open or rooted) clear of Pappu's. A free Pappu steps back off CHAD; one rooted to his
// kadai, his chug, his roar, his buried skimmer or a wall holds his ground and CHAD is eased back off the belly instead.
export const VENDOR_BODY_GAP=Object.freeze({free:36,open:30});
const FREE=['idle','reguard','recover','setup-scoop','setup-naan','hurt','taunt','flopup'];
const ROOTED=['dip','fling','naan-load','rage','lastorder','mutate','fakeout','crawl-feast','feast-rise','stuck','cough','cleaver-stuck'];
const SPACED=[...FREE,...ROOTED,'stagger'];
function keepBodySpace(b){
 if(!SPACED.includes(b.state)||b.z>1)return;
 const p=G.player,dx=p.x-b.x,gap=(FREE.includes(b.state)&&!(b.protectedStagger>0)?VENDOR_BODY_GAP.free:VENDOR_BODY_GAP.open)+(b.mutated?8:0);
 if(Math.abs(p.y-b.y)>=13||p.z>16||p.state==='special'||p.grabbedBy||p.dying||Math.abs(dx)>=gap)return;
 const d=Math.abs(dx)<1?b.face:Math.sign(dx),push=Math.min(1.6,(gap-Math.abs(dx))*.25);
 const rooted=ROOTED.includes(b.state)||ph(b)===2&&['recover','furnace-plant','furnace-pivot'].includes(b.state)||b.protectedStagger>0&&['stuck','hotfoot'].includes(b.openKind)||b.x-d*push<arenaMin()+20||b.x-d*push>arenaMax()-20;
 if(rooted)p.x=clamp(p.x+d*push,arenaMin(),arenaMax());else b.x-=d*push;
}
// Up close he never strings twice running and never throws or leaps point blank: a belly bump
// shoves CHAD out to where the oil lob or flop works. Ranged attacks alternate with physical pressure.
export function vendorChoose(b){
 const p=G.player,dist=Math.abs(p.x-b.x),P=ph(b),deck=DECKS[P],last=b.lastPick;
 let pick=deck[b.turn++%deck.length];b.queued=null;
 if(P===2){b.crush=false;if(pick===last)pick=deck[(deck.indexOf(pick)+1)%deck.length];return pick;}
 if(pick==='scoop'&&last==='scoop')pick=P?'flop':'string';
 if(pick==='string'&&dist>130&&P)pick=dist<240?'flop':'scoop'; // the lunch rush walks in to string (advance)
 if(pick==='breath'&&dist>vendorBreathRange(b)+20)pick='flop';
 if(pick==='bump'&&dist>=80)pick=P?'flop':'string'; // nothing to shove: straight to what the bump makes room for
 if(pick==='string'&&last==='string')pick=dist<70?'bump':'scoop';
 if(pick==='scoop'&&dist<56||pick==='flop'&&dist<60){b.queued=pick;pick='bump';}
 if(pick==='bump'&&last==='bump'){pick=b.queued||'scoop';b.queued=null;}
 // The lunch rush's answer to a turtle: CHAD sat in his guard up close gets the belly (still green: time the parry).
 b.crush=false;
 if(P===0&&(b.turtle||0)>=VENDOR_TURTLE&&dist<80&&last!=='bump'){b.queued=b.queued||'scoop';pick='bump';b.crush=true;}
 if(pick==='scoop')b.lastScoop=b.turn;
 return pick;
}
// The flop's left landing bound off camLock. On impact CHAD is blown out beside the belly, never left under it:
// launched from where he stood (VENDOR_FLOP_LIFT up) at the speed that carries him VENDOR_FLOP_CLEAR from its centre
// (belly half ~50 + CHAD lying ~40): his flight drags by VENDOR_FLOP_DRAG a tick, so it covers VENDOR_FLOP_REACH x
// its launch speed (between VENDOR_FLOP_SLIDE and VENDOR_FLOP_VMAX px/tick). Pinned by a wall on that side he flies out the other side.
export const VENDOR_FLOP_MIN=90,VENDOR_FLOP_CLEAR=90,VENDOR_FLOP_SLIDE=2.4,VENDOR_FLOP_VMAX=8,VENDOR_FLOP_LIFT=3.5,VENDOR_FLOP_DRAG=.93,VENDOR_FLOP_REACH=11.5;
// The breath's lane half-depth: from any lane he can stand in, CHAD can step out of it within the shallow street.
export const VENDOR_BREATH_LANE=10;
export const VENDOR_CRUSH=6; // the flop's impact freeze, CHAD squashed flat under the landing
export const VENDOR_REACH=66; // a string from further off walks in to here first
// Turtling in the lunch rush: VENDOR_TURTLE ticks of CHAD's held guard in reach and the next pick is a crush bump that
// denies his guard for VENDOR_CRUSH_DENY ticks and lands VENDOR_CRUSH_DMG (a timed parry still turns it).
export const VENDOR_TURTLE=40,VENDOR_CRUSH_DENY=24,VENDOR_CRUSH_DMG=9;
// Per phase: the string's two quick swings and its slam, how long the unparried skimmer stays stuck in the street, how
// much guard a light hit he blocks wears off (a CHAD who keeps hitting breaks it, without the parry), and a naan's hit.
export const VENDOR_SWING=[4,5,6],VENDOR_SLAM=[7,10,12],VENDOR_STUCK=[56,34,34],VENDOR_WEAR=[.2,.2,.15],VENDOR_NAAN=[8,9,9];
function start(b,pattern){
 // Old saved/review requests for naan use the replacement oil attack.
 if(pattern==='naan')pattern='scoop';
 if(ph(b)===2&&['naan','scoop','string','bump','flop'].includes(pattern))pattern='breath';
 b.lastPick=pattern;
 if(ph(b)===2&&['forearm','cleaver'].includes(pattern)&&(Math.abs(G.player.x-b.x)>112||Math.abs(G.player.y-b.y)>12)){Object.assign(b,{pattern,state:'furnace-approach',t:0});return;}
 if(pattern==='scoop'||pattern==='naan'){b.pattern=pattern;b.state=pattern==='scoop'?'setup-scoop':'setup-naan';b.t=0;return;}
 if(pattern==='string'&&Math.abs(G.player.x-b.x)>VENDOR_REACH+30){Object.assign(b,{pattern,state:'advance',t:0});return;}
 begin(b,pattern);
 if(pattern==='flop')b.flopChain=ph(b)===2?1:0;
}
export function enterVendorPhase(b,n){
 if((b.phase||1)>=n)return;
 Object.assign(b,{phase:n,phaseTwo:true,enraged:true,lastOrder:n>=3,turn:0});
 if(n===2){b.maxGuard=3;b.guard=3;}
 if(n===3){b.maxGuard=4;b.guard=4;vendorWalkMotion(b.set,0,1);}
 if(b.kadai&&!b.kadai.broken)b.kadai.hp=2;
}
const PHASE_READY=['idle','recover','reguard','hurt'];
// The health a phase change holds him at until it plays (0 in the last order).
export function vendorPhaseLine(b){const P=b.phase||1;return P===1?Math.floor(b.maxhp*VENDOR_PHASE.spicy):P===2?Math.floor(b.maxhp*VENDOR_PHASE.last):0;}

// ---- intro ----------------------------------------------------------------------------
// Frying at his kadai, facing away from CHAD; stuffs a pakora in, clocks CHAD, spits, waddles out from his
// kadai, hitches his lungi, wipes his hands down his vest, slaps the skimmer in his palm, belches
// and plants it (the name lands) before squaring up. [end tick, intro cell (-1 walk, -2 fry loop)];
// cells 12-18 are inbetweens: rising from the kadai, the 3/4 turn, recovering from the spit, planting, settling (16, step in 18, 17).
export const VENDOR_INTRO_BEATS=[[70,-2],[82,12],[100,2],[130,3],[136,13],[156,4],[170,5],[176,14],[206,-1],[236,6],[260,7],[278,8],[291,9],[296,15],[350,10],[372,11],[376,16],[380,18],[Infinity,17]];
const INTRO_FROM=VK.kadai[0]-VENDOR_DIP_X,INTRO_TO=INTRO_FROM-34,INTRO_WALK=[176,206];
// The fry loop (fry cells, end ticks): dip, stir, stir, lift a heap, shake it, tip it back in,
// lower, wipe his brow; the oil jumps when the skimmer goes in and when the pakoras drop back.
const FRY=[10,22,34,42,52,62,70,80],FRY_POPS=[0,12,24,55];
export function vendorIntroCell(t){
 const [,cell]=VENDOR_INTRO_BEATS.find(([end])=>t<end);
 return cell;
}
const fryPop=t=>t-FRY_POPS.filter(p=>p<=t).pop();
// He works the kadai standing on the street just behind it, never up on the stall's plinth.
export function vendorIntroPose(t,camLock=G.camLock){
 const [w0,w1]=INTRO_WALK,q=clamp((t-w0)/(w1-w0),0,1),y=VK.kadai[1]-VENDOR_WORK_Y;
 return {x:camLock+mix(INTRO_FROM,INTRO_TO,q),y:mix(y,226,q),face:t<136?1:-1,walk:t>=w0&&t<w1,stride:(INTRO_FROM-INTRO_TO)*q};
}
function endIntro(b){
 const q=vendorIntroPose(VENDOR_INTRO);Object.assign(b,{x:q.x,y:q.y,face:-1,state:'idle',t:0,atkCd:40});
}

// The nearest depth clear of a body lying across lane y, on whichever side has floor.
function outOfLane(p,y,gap){
 const lo=laneMin(p.x),hi=laneMax(p.x),up=y-gap,down=y+gap;
 return up>=lo&&(p.y<=y||down>hi)?up:Math.min(hi,down);
}
// CHAD is eased out of the belly's lane over a few ticks, never snapped across it.
export const VENDOR_CLEAR_TICKS=7;
// Where the street is too shallow to step out of his lane (it ends at VENDOR_CHAD_MAX), a standing CHAD is eased
// out along it instead, to VENDOR_BELLY_CLEAR from the belly's middle (never while the flop's throw carries him).
export const VENDOR_BELLY_CLEAR=70;
function clearLane(b,p,y){
 if(b.laneTo)return;const ty=outOfLane(p,y,24);
 if(Math.abs(ty-y)>=18){b.laneTo={y:ty,t:b.mutated?14:VENDOR_CLEAR_TICKS};return;}
 if(b.flung||b.crushed)return;
 let d=Math.sign(p.x-b.x)||-b.face,x=b.x+d*bellyClear(b);
 if(x<arenaMin()||x>arenaMax()){d=-d;x=b.x+d*bellyClear(b);}
 b.laneTo={y:p.y,x,t:Math.max(VENDOR_CLEAR_TICKS,Math.ceil(Math.abs(x-p.x)/4))};
}
// The flop's throw drags: CHAD's flight out from under the belly slows each airborne tick.
function updateFlung(b){
 const p=G.player;if(!b.flung)return;
 if(p.state!=='down'||p.grabbedBy){b.flung=false;return;}
 if(p.z>0&&!(G.hitstop>0))p.vx*=VENDOR_FLOP_DRAG;
}
function updateLaneEase(b){
 const e=b.laneTo,p=G.player;if(!e)return;
 if(p.dying||p.grabbedBy||e.t<=0){b.laneTo=null;return;}
 p.y+=(e.y-p.y)/e.t;if(e.x!==undefined)p.x+=(e.x-p.x)/e.t;e.t--;
}
// ---- poses ----------------------------------------------------------------------------
const WALK=6;
export function vendorPose(b){
 const t=b.t,s=b.state,P=ph(b);
 if(G.state==='bossintro'){const t=b.introT||0,c=vendorIntroCell(t);return c===-1?['walk',Math.floor(vendorIntroPose(t).stride/WALK)%8]:c===-2?['fry',FRY.findIndex(e=>t<e)]:['intro',c];}
 if(b.dead||s==='dying'||s==='down')return ['down',0];
 if(b.protectedStagger>0||s==='stagger'){
  if(b.openKind==='hotfoot')return ['hotfoot',Math.floor(G.time/9)%2];
  if(b.openKind==='blind')return ['blind',Math.floor(G.time/16)%2];
  if(b.openKind==='stuck')return ['string',bouncing(b)?4:6];
  if(b.openKind==='guard'&&(b.dazeT||0)<10)return ['guardbreak',0];
  const d=dazePose(b);return [d.name,d.idx];
 }
 if(b.hitReactT>0)return ['hurt',b.hitLow?1:0];
 if(s==='hurt')return ['hurt',t<7?0:1];
 if(b.guardFlash>0&&['idle','windup','reguard'].includes(s))return ['block',0];
 if(s==='reguard')return ['block',0];
 if(s==='fakeout')return ['fakeout_crawl',t<8?0:t<16?1:t<24?2:3];
 if(s==='crawl-feast')return ['fakeout_crawl',b.crawlArrived?6:4+Math.floor(b.stridePhase/7)%2];
 if(s==='feast-rise')return ['feast_rise',Math.min(3,Math.floor(t/6))];
 if(s==='rage'&&getAIFrame('ic_vendor','chilli_feast'))return ['chilli_feast',t<18?0:t<30?1:t<46?2:t<80?3:4];
 if(s==='rage')return ['rage',t<24?0:t<54?1:t<80?2:3];
 // The last order: slapping the skimmer on his palm, the roar with it held high, then red in the face.
 if(s==='lastorder'&&t<28&&getAIFrame('ic_vendor','meal_lift'))return ['meal_lift',t<8?0:t<18?1:2];
 if(s==='lastorder'&&t>=28&&t<104&&getAIFrame('ic_vendor','feast_growth'))return ['feast_growth',t<44?0:t<60?1:t<76?2:3];
 if(s==='lastorder'&&t>=104&&getAIFrame('ic_vendor','feast_smash'))return ['feast_smash',t<110?0:1];
 if(s==='lastorder'&&t>=28&&t<104&&getAIFrame('ic_vendor','devour_growth'))return ['devour_growth',t<44?0:t<60?1:t<76?2:3];
 if(s==='lastorder'&&t>=104&&getAIFrame('ic_vendor','smash_drive'))return ['smash_drive',t<110?0:1];
 if(s==='lastorder')return getAIFrame('ic_vendor','devour_smash')?['devour_smash',t<12?0:t<28?1:t<68?2+Math.floor((t-28)/10)%2:t<76?3:4]:['rage',t<24?0:t<68?1:3];
 if(s==='mutate'&&t>=78&&getAIFrame('ic_vendor','weapon_pickup'))return ['weapon_pickup',Math.min(3,Math.floor((t-78)/6))];
 if(s==='mutate'&&t<78&&getAIFrame('ic_vendor','feast_smash'))return ['feast_smash',t<12?2:t<30?3:4];
 if(s==='mutate'){if(t<12&&getAIFrame('ic_vendor','smash_drive'))return ['smash_drive',2];if(t>=90)return ['block',0];if(t>=78)return ['flopup',1];return ['devour_smash',t<12?5:t<38?6:7];}
 if(s==='taunt'&&b.mutated)return ['idle3',Math.floor(t/8)%4];
 if(s==='taunt')return ['lick',lickCell(t,tauntLen(G.player))];
 const walk=P===2?'walk3':'walk',count=b.mutated?VENDOR_WALK_CELLS:getAIFrame('ic_vendor',walk)?.f.length||8,pace=b.mutated?VENDOR_WALK_STRIDE/count:WALK;
 const walking=s==='idle'&&b.moved>.08||['setup-scoop','setup-naan','setup-feast','pot-retrieve','advance','furnace-approach'].includes(s)&&(b.stepMoved??b.moved)>.08;
 if(b.mutated&&!walking&&['idle','furnace-plant','furnace-pivot'].includes(s)&&G.time-(b.walkPoseTime??-99)<VENDOR_WALK_SETTLE)return ['walk3',b.walkPoseIndex||0];
 if(s==='furnace-plant'||s==='furnace-pivot')return ['block',0];
 if(s==='recover'&&P===2)return b.pattern==='forearm'&&t<12?['hammer',5]:b.pattern==='cleaver'&&t<8?['cleaver',6]:b.pattern==='breath'&&t<16?[getAIFrame('ic_vendor','demon_floor_spew')?'floor_spew':'floor_breath',getAIFrame('ic_vendor','demon_floor_spew')?7:5]:['idle3',0]; // distance-driven final stride, with stable planted recovery
 if(s==='setup-scoop'||s==='setup-naan'||s==='setup-feast'||s==='pot-retrieve'||s==='advance'||s==='furnace-approach'){
  if(!(b.stepMoved>.05))return [P===2?'idle3':'idle',[0,1,2,3,2,1][Math.floor(G.time/(P===2?8:11))%6]]; // held up: he stands his guard, never a frozen stride
  const i=Math.floor(b.stridePhase/pace)%count,index=b.stepDir*b.face<0?(count-i)%count:i;if(b.mutated){b.walkPoseIndex=index;b.walkPoseTime=G.time;b.walkPoseProgress=(b.stridePhase/pace)%1;}return [walk,index];}
 if(s==='windup'&&b.pattern==='forearm')return ['hammer',t<12?0:t<26?1:2];
 if(P===2&&s==='windup'&&b.pattern==='breath')return ['floor_breath',t<60?0:t<110?1:2];
 if(s==='windup'&&b.pattern==='cleaver')return ['cleaver',t<10?0:t<20?1:2];
 if(s==='forearm')return ['hammer',t<5?3:t<18?4:5];
 if(s==='cleaver')return ['cleaver',t<7?3:4];
 if(s==='cleaver-stuck')return ['cleaver',t<30?5:6];
 if(s==='windup')return b.pattern==='flop'&&getAIFrame('ic_vendor','flop_polish')?['flop_polish',0]:[b.pattern,0];
 if(s==='string'){
  const k=stringBeats(b);
  // The last order's second overhead: he rips the buried skimmer back out of the street, raises it and slams again.
  if(k.raise2!==undefined&&t>=k.slam+6)return t<k.raise2?(b.mutated?['string',6]:['tug',0]):['string',t<k.slam2?4:5];
  return ['string',t<k.a+6?1:t<k.a+14?2:t<k.b+6?3:t<k.slam?4:5];
 }
 if(s==='stuck')return ['string',6];
 if(s==='bump')return ['bump',t<14?1:2]; // the belly out, then rocking back on his heels
 if(s==='naan'){const T=NAAN_THROWS[P];return ['naan',T.some(at=>at>1&&t>=at-13&&t<at)?0:1];}
 // Working the oil: plunge, then drag/drag back/heave/dig on a loop, hauling the heap up at the end;
 // he turns with it before cocking the throw (again for the last order's second volley).
 if(s==='naan-load')return ['dip',t<7?0:5];
 if(s==='dip'){const end=VENDOR_DIP[P];return ['dip',t<6?0:t>=end-8?5:1+Math.floor((t-6)/8)%4];}
 if(s==='fling'&&P===1&&getAIFrame('ic_vendor','spicy_throw'))return ['spicy_throw',spicyThrowCell(t)];
 if(s==='fling'){const V=VOLLEYS[P],at=V.findLast(v=>t>=v.at-VENDOR_FLING+4)?.at??VENDOR_FLING;return t<5?['turn',0]:['scoop',t<at?1:2];}
 if(P===2&&s==='breath'&&infernoRoarCell(t)>=0&&getAIFrame('ic_vendor','demon_inferno_roar'))return ['inferno_roar',infernoRoarCell(t)];
 if(P===2&&s==='breath')return getAIFrame('ic_vendor','demon_floor_spew')?['floor_spew',floorSpewCell(t)]:['floor_breath',t<6?2:t<FLOOR_FIRE.burn?3+Math.floor(t/6)%2:5];
 if(s==='breath')return ['breath',1];
 if(s==='cough')return ['breath',2];
 if(s==='flop')return getAIFrame('ic_vendor','flop_polish')?['flop_polish',t<8?1:t<25?2:3]:['flop',1];
 if(s==='flopped')return getAIFrame('ic_vendor','flop_polish')?['flop_polish',4]:['flop',2];
 if(s==='flopup'&&b.chainUp)return t<4?['flopup',2]:t<8?['flopup',0]:t<12?['flopup',1]:['flop_polish',0];
 if(s==='flopup')return ['flopup',t<14?0:1]; // chained: the press-up that bounces him into the next flop
 if(s==='idle'&&b.moved>.08){const i=Math.floor(b.stridePhase/pace)%count,index=b.stepDir*b.face<0?(count-i)%count:i;if(b.mutated){b.walkPoseIndex=index;b.walkPoseTime=G.time;b.walkPoseProgress=(b.stridePhase/pace)%1;}return [walk,index];}
 if(s==='idle'&&b.lick)return ['lick',FLOURISH_CELLS[Math.min(FLOURISH_CELLS.length-1,b.lick>>2)]];
 return [P===2?'idle3':'idle',[0,1,2,3,2,1][Math.floor(G.time/(P===2?8:11))%6]];
}
// The licking taunt: he raises the skimmer, licks it (lick / savour, twice), then smacks his lips and beckons. The taunt runs the
// whole time CHAD lies down; the idle flourish is the short version he plays while he waits to attack.
const tauntLen=p=>p.state==='down'?90:56;
export const FLOURISH=32,FLOURISH_CELLS=[0,0,1,1,2,2,1,3];
function lickCell(t,len){return t<8?0:t>=len-24?3:(Math.floor((t-8)/10)&1)?2:1;}
// Lying winded on his belly the skimmer lies in front of him, nearer the camera, below his sole line:
// the frame is registered on it, so the cell is drawn this much lower to put his belly on the street.
const SINK={flop:[0,0,8]};
// Mouth, relative to his feet when facing right, in each breath cell.
const MOUTH=[21,-70];
const NAAN_THROWS=[[1],[1,27],[1,27,53]]; // each follow-up has room for a full green warning
// Oil volleys: [tick thrown, globs]; each volley aims where CHAD stands until it leaves the skimmer.
// Extra spicy: one violent hurl (js/vendor_spicy_throw.js) snapping a fan of five small globs.
export const VENDOR_OIL_VOLLEYS=[[{at:VENDOR_FLING,n:3}],[{at:SPICY_THROW.release,n:SPICY_THROW.n}],[{at:VENDOR_FLING,n:3},{at:VENDOR_FLING+22,n:3}]];
const VOLLEYS=VENDOR_OIL_VOLLEYS;

// A held guard (not a timed parry or deflect) against the lunch rush's skimmer leaks VENDOR_LUNCH_CHIP more on top of the
// shared 10% chip: sitting in guard costs something from the first phase on (never the last point of health).
export const VENDOR_LUNCH_CHIP=.15;
function lunchChip(P,dmg){const p=G.player;if(P||p.lastDefense!=='guard'||p.dying)return;p.hp=Math.max(1,p.hp-Math.ceil(dmg*diff().dmg*VENDOR_LUNCH_CHIP));}
// ---- the fight ------------------------------------------------------------------------
export function vendorCombatFrame(b,name,index,face=b.face){
 if(b.mutated&&name==='walk3'){const settle=b.walkPoseTime===undefined?0:clamp((G.time-b.walkPoseTime)/VENDOR_WALK_SETTLE,0,1),f=vendorWalkMotion(b.set,index,face,settle,b.walkPoseProgress??.5);if(f)return f;}
 if(b.mutated&&name==='idle')name='idle3';
 const authoredHot=['weapon_pickup','feast_growth','feast_smash','devour_smash','devour_growth','smash_drive'].includes(name)||name==='cauldron_last'&&index>=3;
 const wanted='demon_'+name,demonName=b.mutated&&!authoredHot?(getAIFrame('ic_vendor',wanted)?wanted:getAIFrame('ic_vendor','demon_hurt')?'demon_hurt':null):null;
 const anchor=b.inferno&&!b.mutated&&name==='idle3'&&getAIFrame('ic_vendor','inferno_idle');
 const base=getFrame(b.set,demonName|| (anchor?'inferno_idle':getAIFrame(b.set._aiKey,name)?name:'idle'),index,face);
 const alreadyHot=demonName||anchor||authoredHot;
 if(b.inferno&&!alreadyHot)return vendorHotFrame(base);
 return !b.mutated&&((b.phase||1)>=2||b.state==='rage'&&b.t>=46)?vendorSpicyFrame(base):base;
}

export const vendor={
 superFrame(b,pose){return vendorCombatFrame(b,pose.name,pose.idx);},
 noRage:true,
 afterOpening:regroup,
 beforeUpdate(b){if(b.pendingFeast&&!b.superLocked){b.pendingFeast=false;Object.assign(b,{hp:Math.floor(b.maxhp*VENDOR_PHASE.last),state:'fakeout',t:0,protectedStagger:0,guardFlash:0,hitReactT:0,vx:0,vz:0,z:0,wave:null,queued:null});b.face=b.kadai.x>b.x?1:-1;pappu('hurt',b.x);G.shake=Math.max(G.shake,5);G.hitstop=Math.max(G.hitstop,6);}},
 staggerTick(b){keepBodySpace(b);return false;}, // opened (the shared protected stagger) he still keeps his body off CHAD's
 init(b){
  Object.assign(b,{arenaLeftPad:VENDOR_LEFT_PAD,laneBot:Math.max(VENDOR_CHAD_MAX,G.player.y),popH:120,guard:3,maxGuard:3,guardFlash:0,turn:0,state:'idle',atkCd:60,hitReactT:0,phase:1,phaseTwo:false,lastOrder:false,wave:null,openKind:null});
  b.set=b.set||{_aiKey:'ic_vendor'};
  installKitchen(b);
  const parried=b.parried;
  b.parried=(damage,direction)=>{
   const high=overhead(b);
   parried(damage,direction);
   if(b.dead)return;
   // Turning the overhead earns the long opening, with the skimmer buried in the floor.
   if(high){b.protectedStagger=Math.max(b.protectedStagger,90);b.openKind='stuck';b.deepStuck=true;b.bounceAt=G.time;spawnPop(b.x,b.y-b.popH-8,'STUCK!');streetPuff(b,64,1);G.shake=Math.max(G.shake,6);}
   else b.openKind='guard';
  };
 },
 intro(b,t){
  easeLaneBot(b);
  const q=vendorIntroPose(t);b.introT=t;Object.assign(b,{x:q.x,y:q.y,face:q.face});
  // (sounds: js/vendor_sound.js. The kadai's frying bed runs under the whole intro; every oil jump, chew, sandal slap and the plant of the skimmer is on its beat)
  pappuBed(.12);
  if(FRY_POPS.includes(t))pappu('fry_pop',b.x,t===55?1.5:1,{i:Math.min(2,FRY_POPS.indexOf(t))});
  if(t===82)pappu('stir',b.x);
  if(t===104||t===116||t===128)pappu('chew',b.x);
  if(t===156)pappu('spit',b.x);
  if(t>INTRO_WALK[0]&&t<INTRO_WALK[1]&&(t-INTRO_WALK[0])%15===0)pappu('step',b.x,1,{i:((t-INTRO_WALK[0])/15)&1});
  if(t===212)pappu('cloth_hitch',b.x);
  if(t===240||t===250)pappu('cloth_wipe',b.x,1,{i:t===250?1:0});
  if(t===262||t===270)pappu('skimmer_slap',b.x,1,{i:t===270?1:0});
  if(t===282)pappu('burp',b.x);
  if(t===298)pappu('plant',b.x);
  if(t===352){pappu('roar_intro',b.x);G.shake=4;}
  if(t>=VENDOR_INTRO-1)endIntro(b);
 },
 endIntro,introTicks:VENDOR_INTRO,
 keepFace(b){if(ph(b)===2)return true;return !['idle','reguard','recover','hurt','setup-scoop','setup-naan','setup-feast','taunt'].includes(b.state);},
 beforeHurt(b,dmg,dir,heavy,launch){
  if(b.pendingFeast||ARMOURED.includes(b.state)){b.guardFlash=6;pappu('guard',b.x);return false;}
  const earned=b.protectedStagger>0||b.superApplying||b.parryApplying||b.counterApplying;
  const frontal=dir===-b.face||Math.abs(G.player.x-b.x)<18;
  const guarded=!earned&&frontal&&b.guard>0&&GUARDED.includes(b.state);
  b.preservePattern=guarded;b.guardingHit=guarded&&(heavy||launch);
  if(guarded&&!heavy&&!launch){b.guardFlash=8;pappu('guard',b.x);G.hitstop=Math.max(G.hitstop,3);b.damageGuard(VENDOR_WEAR[ph(b)]);return false;}
  return true;
 },
 onHurt(b,dmg,heavy){
  b.hitLow=!b.hitLow;b.turtle=0;
  // No combo carries him past a phase: his health holds at the line until he has played the change (a debug kill still kills).
  if((b.phase||1)===2&&b.hp<=vendorPhaseLine(b)){b.hp=vendorPhaseLine(b);b.pendingFeast=true;b.protectedStagger=0;b.hitReactT=0;return true;}
  const line=vendorPhaseLine(b),before=b.hp+dmg*(b.guardingHit?.2:1);if(line&&dmg<b.maxhp&&before>=line)b.hp=Math.max(b.hp,line);
  if(b.reflectedKind==='naan'&&!b.dead){opening(b,100,'blind');spawnPop(b.x,b.y-b.popH-8,'NAAN SENSE!');pappu('naan_slap',b.x);pappu('hurt',b.x,.9,{gap:0});return true;}
  if(b.state==='dip'&&!b.dead){
   // Caught with his arm in the oil.
   opening(b,90,'hotfoot');spawnPop(b.x,b.y-b.popH-8,'HOT OIL!');pappu('scald',b.x);pappu('hurt',b.x,.9,{gap:0});
   b.splashT=G.time;spawnSmoke(b.kadai.x,b.kadai.y-90,2);
   return true;
  }
  if(!b.dead&&!b.guardingHit)pappu('hurt',b.x,heavy?1.1:.7); // (his own grunt, at most one every 20 ticks so a combo is not a chorus)
  if(b.state==='taunt'){b.state='hurt';b.t=0;return true;}
  if(COMMITTED.includes(b.state)||b.state==='flopup'&&b.chainUp||OPEN.includes(b.state)){b.hitReactT=OPEN.includes(b.state)&&b.state!=='cleaver-stuck'?6:0;return true;}
  b.hitReactT=8;
  // A recovery clock belongs to the attack, not the hit that followed it.
  if(!b.preservePattern&&!b.protectedStagger&&!b.superLocked&&!(b.guard>0&&b.state.startsWith('setup-'))&&
   !['recover','stagger','hurt','flopup','reguard'].includes(b.state))recover(b,38);
  return true;
 },
 update(b){
  const p=G.player,P=ph(b);
  easeLaneBot(b);keepBodySpace(b);
  if(b.state!=='flop'&&b.y>VENDOR_LANE_MAX)b.y=VENDOR_LANE_MAX;
  // The intro's line hands over to the fight, but never sits over his first wind-up's cue.
  const s=G.bossSpeech;if(s?.boss===b&&(b.state!=='idle'||(s.fightT=(s.fightT||0)+1)>30))G.bossSpeech=null;
  // His kadai spits and hisses under the whole fight (a looping bed that heats up each phase; it fades out by itself when this stops being called).
  if(!b.dead&&b.kadai&&!b.kadai.broken&&!b.kadai.bowlLifted)pappuBed(b.kadai.drained?.1:[.15,.2,.27][P]);
  if(b.guardFlash>0)b.guardFlash--;
  if(b.hitReactT>0)b.hitReactT--;
  // The overhead meets CHAD at head height: that is where a parry flares.
  b.contactY=b.state==='forearm'?68:overhead(b)?(b.mutated?109:88):undefined;
  if(b.state!=='flop')b.z=0;
  // Steam from both ears once the chilli is in; the last order has him pouring sweat as well.
  if(P&&!b.dead&&G.time%(P===2?6:9)===0)spawnSmoke(b.x+((G.time/9)&1?-12:12),b.y-b.h+4,1);
  updateFloorFire(b,dmg=>tryHitPlayer({...b,x:p.x-1,face:1,y:p.y},dmg,4,false,40,'unblockable'));
  updateWave(b);updateShove(b);updateLaneEase(b);updateFlung(b);
  // How long CHAD has sat in his guard in reach without landing anything (a hit on Pappu clears it).
  b.turtle=p.state==='parry'&&Math.abs(p.x-b.x)<96&&Math.abs(p.y-b.y)<24?(b.turtle||0)+1:Math.max(0,(b.turtle||0)-.5);
  // The phases turn on his health, the moment he is free to turn them.
  if(!b.dead&&!b.protectedStagger&&!b.superLocked&&PHASE_READY.includes(b.state)){
   if(P===0&&b.hp<=b.maxhp*VENDOR_PHASE.spicy){Object.assign(b,{state:'rage',t:0,vx:0,wave:null});}
   else if(P===1&&b.hp<=vendorPhaseLine(b)){b.pendingFeast=true;vendor.beforeUpdate(b);}
  }
  switch(b.state){
   case 'furnace-pivot':if(b.t===VENDOR_WALK_SETTLE)b.face=p.x<b.x?-1:1;if(b.t>=VENDOR_WALK_SETTLE+4){b.state='idle';b.t=0;}return true;
   case 'furnace-plant':if(b.t>=VENDOR_WALK_SETTLE)begin(b,b.pattern);return true;
   case 'furnace-approach':{
    const face=p.x<b.x?-1:1;if(face!==b.face){b.state='furnace-pivot';b.t=0;return true;}
    stepTo(b,p.x-b.face*94,clamp(p.y,laneMin(b.x),VENDOR_LANE_MAX),Math.min(1.6,.4+b.t*.07));
    if(Math.abs(p.x-b.x)<=112&&Math.abs(p.y-b.y)<=12){b.state='furnace-plant';b.t=0;}
    else if(b.t>=120)recover(b,20);return true;
   }
   case 'idle':{
    if(P===2&&(p.x<b.x?-1:1)!==b.face){b.state='furnace-pivot';b.t=0;return true;}
    const dx=p.x-b.x,want=70,speed=b.def.speed*[1,1.2,1.35][P]*diff().aggro;
    if(P===2){if(Math.abs(p.y-b.y)>6)b.y+=clamp(p.y-b.y,-speed*.55,speed*.55);b.pursuing=Math.abs(dx)>108||b.pursuing&&Math.abs(dx)>94;if(b.pursuing)b.x+=Math.sign(dx)*speed;}else{b.y+=clamp(p.y-b.y,-speed*.55,speed*.55);if(Math.abs(dx)>want+8)b.x+=Math.sign(dx)*speed;else if(Math.abs(dx)<want-24)b.x-=Math.sign(dx)*speed*.6;}
    if(p.state!=='down')b.taunted=false;
    else if(!b.taunted&&!p.dying&&Math.abs(dx)>34){b.taunted=true;b.state='taunt';b.t=0;return true;}
    // Waiting to attack he now and then licks the skimmer (the taunt's beat, cosmetic only, first phase, never when he is on the move).
    if(b.t<2)b.lick=0;
    if(b.lick){if(++b.lick>=FLOURISH)b.lick=0;}
    else if(P===0&&b.atkCd>=FLOURISH&&b.t>=6&&!(b.moved>.08)&&p.state!=='down'&&G.time-(b.lickAt??-999)>420){b.lick=1;b.lickAt=G.time;}
    if(--b.atkCd<=0)start(b,vendorChoose(b));
    return true;
   }
   case 'reguard':if(b.t>=12){b.state='idle';b.t=0;b.atkCd=0;}return true;
   case 'taunt':
    if(b.t===10)pappu('chuckle',b.x);
    if(b.t>=tauntLen(p)||b.t>=150){b.state='idle';b.t=0;b.atkCd=14;}
    return true;
   case 'rage':
    if(b.t===1)b.chilliHp=b.hp;
    if(b.t>=30){const q=clamp((b.t-30)/38,0,1);b.hp=mix(b.chilliHp??b.maxhp*VENDOR_PHASE.spicy,Math.round(b.maxhp*VENDOR_PHASE.spicyRevive),.5-.5*Math.cos(Math.PI*q));}
    if(b.t===26)pappu('bottle',b.x);
    if(b.t===30||b.t===40||b.t===50)pappu('chew',b.x,1,{i:(b.t-30)/10});
    if(b.t===56){pappu('spicy',b.x);spawnSmoke(b.x,b.y-b.h+4,4);}
    if(b.t===68){b.kadai.hp=2;pappu('flare',b.kadai.x);spawnSmoke(b.kadai.x,b.kadai.y-70,5);}
    if(b.t===80){pappu('roar_spicy',b.x);G.shake=7;G.flash=2;spawnRing(b.x,b.y-4,'#ff5a2a');sting(b,2);}
    if(b.t>=VENDOR_RAGE){enterVendorPhase(b,2);regroup(b);}
    return true;
   case 'fakeout':
    if(b.t===16){pappu('drop_street',b.x);spawnDust(b.x,b.y,5);}
    if(b.t>=66){Object.assign(b,{state:'crawl-feast',t:0,crawlArrived:false});}
    return true;
   case 'crawl-feast':{
    const tx=b.kadai.x-54,ty=b.kadai.y-VENDOR_WORK_Y;
    if(!b.crawlArrived){b.face=tx>=b.x?1:-1;const dx=tx-b.x,dy=ty-b.y,d=Math.hypot(dx,dy);if(d<=2||b.t>360){b.x=tx;b.y=ty;b.crawlArrived=true;b.t=0;}else{const k=Math.min(1,1.15/d);b.x+=dx*k;b.y+=dy*k;if(b.t%18===0)spawnDust(b.x,b.y,1);}}
    else if(b.t>=12){b.riseFrom=b.x;b.state='feast-rise';b.t=0;}
    return true;
   }
   case 'feast-rise':
    b.face=1;b.x=mix(b.riseFrom??b.x,b.kadai.x-10,b.t/24);
    if(b.t>=24){b.state='lastorder';b.t=0;b.kadai.bowlLifted=true;}return true;
   case 'setup-feast':
    if(stepTo(b,b.kadai.x-10,b.kadai.y-VENDOR_WORK_Y,2.4)||b.t>180){b.state='lastorder';b.t=0;b.face=1;b.kadai.bowlLifted=true;}
    return true;
   case 'lastorder':{
    const k=b.kadai;
    if(b.t===1){k.bowlLifted=true;b.feastHp=b.hp;}
    if(b.t>=VENDOR_CAULDRON.drink){const q=clamp((b.t-VENDOR_CAULDRON.drink)/(VENDOR_CAULDRON.gulp-VENDOR_CAULDRON.drink),0,1),ease=.5-.5*Math.cos(Math.PI*q);b.hp=mix(b.feastHp??Math.floor(b.maxhp*VENDOR_PHASE.last),Math.round(b.maxhp*VENDOR_PHASE.revive),ease);}
    if(b.t===VENDOR_CAULDRON.lift){pappu('raise',b.x);sound('break_metal',.35);}
    if([32,44,56,68].includes(b.t)){pappu('glug',b.x,1,{i:((b.t-32)/12)%3});G.shake=Math.max(G.shake,b.t>=56?3:1);}
    if(b.t===VENDOR_CAULDRON.gulp){k.drained=true;b.pattern='cauldron';pappu('burp',b.x);}
    if(b.t===VENDOR_CAULDRON.release){
     Object.assign(k,{smashed:true,stoveDestroyed:true,broken:true,bowlLifted:false,smashX:b.x+22,smashY:b.y,smashAt:G.time,smashRight:G.camLock+466,smashLeft:G.camLock+30});
     b.wave={x:k.smashX,y:b.y,r:8,hit:false,max:390,damage:18};
     Object.assign(b,{state:'mutate',t:0});pappuBedStop(.15);sound('neta_roof_thud',.65);pappu('counter_crack',b.x);sound('break_metal',.8);G.shake=16;G.hitstop=Math.max(G.hitstop,12);G.flash=4;
     spawnDebris(k.smashX,b.y-8,20,['#251e18','#584332','#a99975']);spawnDust(k.smashX,b.y,18);spawnSmoke(k.smashX,b.y-10,6);
    }
    return true;
   }
   case 'mutate':
    if(b.t===78)b.face=-1;
    if(b.t===84)pappu('skimmer_slap',b.x);
    if(b.t===12){pappu('rib_crack',b.x);G.shake=5;spawnSmoke(b.x,b.y-60,4);}
    if(b.t===38){b.inferno=b.mutated=true;sting(b,3);pappu('roar_last',b.x);G.shake=8;G.flash=2;spawnRing(b.x,b.y-50,'#ff8a16');}
    if(b.t>=VENDOR_CAULDRON.mutation){b.wave=null;b.hp=Math.round(b.maxhp*VENDOR_PHASE.revive);enterVendorPhase(b,3);regroup(b);}
    return true;
   case 'windup':{
    const w=(VENDOR_WIND[b.pattern]?.[P]||26)+(b.pattern==='bump'&&b.crush?6:0); // the crush bump winds up a beat longer
    if(b.pattern==='breath'&&b.t===1){if(P===2&&!b.floorFire)prepareFloorFire(b);pappu('inhale',b.x);}
    if(P===2&&b.pattern==='breath'&&b.t===8){G.shake=Math.max(G.shake,7);pappu('roar_last',b.x);}
    if(b.pattern==='flop'&&b.t===1)pappu('grunt',b.x);
    if(b.pattern==='bump'&&b.t===4)pappu('grunt',b.x,.5,{i:2});
    // Leaning back into the bump he rocks off a CHAD standing too close, so the belly meets him rather than swallowing him.
    if(b.pattern==='bump'){const gap=(p.x-b.x)*b.face;if(gap>=0&&gap<VENDOR_BUMP.gap&&Math.abs(p.y-b.y)<17)b.x-=b.face*Math.min(5,VENDOR_BUMP.gap-gap);}
    if(b.t>=w){
     b.state=b.pattern;b.t=0;b.hitLanded=false;
     if(b.pattern==='flop'){
      // Never onto a floored CHAD or into a corner he can't leave: beside him, clear of the walls.
      // (the left bound leaves a knocked-down CHAD room to lie clear of the belly against the padded wall)
      const lo=G.camLock+VENDOR_FLOP_MIN,hi=G.camLock+410;let to=clamp(p.x,lo,hi);
      if(p.state==='down'||p.state==='getup'){const side=Math.sign(b.x-p.x)||1;to=clamp(p.x+side*56,lo,hi);if(Math.abs(to-p.x)<50)to=clamp(p.x-side*56,lo,hi);}
      Object.assign(b,{leapFrom:b.x,leapFromY:b.y,leapTo:to,leapY:clamp(p.y,laneMin(p.x),Math.min(VENDOR_LANE_MAX,laneMax(p.x)))});
      b.face=Math.sign(b.leapTo-b.x)||b.face;
     }else if(b.pattern==='breath'){pappu('breath',b.x,P===2?1.3:1);b.lane=b.y;b.breathHits=0;}
     if(b.pattern==='flop')pappu('flop_air',b.x);
    }
    return true;
   }
   case 'forearm':{
    lunge(b,0,8,36,74);b.x=clamp(b.x,arenaMin()+20,arenaMax()-20);
    if(b.t===1)pappu('swing_big',b.x);
    if(b.t===8){const hit=tryHitPlayer(b,18,70,true,17,'counter');if(b.state!=='forearm')return true;if(hit){G.shake=Math.max(G.shake,9);G.hitstop=Math.max(G.hitstop,7);spawnDust(b.x+b.face*65,b.y,6);pappu('slam',b.x);}}
    if(b.t>=36)recover(b,40);return true;
   }
   case 'cleaver':{
    if(b.t===1)pappu('swing_big',b.x);
    if(b.t===7){const x=b.x+b.face*64;b.wave={x,y:b.y,r:8,max:240,damage:18,hit:false,jumpCheck:true};streetPuff(b,64,1.7);G.shake=Math.max(G.shake,13);G.hitstop=Math.max(G.hitstop,10);G.flash=2;pappu('slam',x);spawnDust(x,b.y,12);spawnDebris(x,b.y,10);}
    if(b.t>=16){b.state='cleaver-stuck';b.t=0;}return true;
   }
   case 'cleaver-stuck':
    if(b.t===12)pappu('strain',b.x);
    if(b.t===30){pappu('rip',b.x);streetPuff(b,64,.8);}
    if(b.t>=42)recover(b,12);return true;
   case 'string':{
    const k=stringBeats(b);
    lunge(b,0,k.a+2,8);lunge(b,k.a+10,k.b,8);lunge(b,k.raise+10,k.slam,12);
    if(k.raise2!==undefined)lunge(b,k.raise2+6,k.slam2,10);
    // Sounds start a few ticks ahead so each swish peaks on its contact tick (lead: js/vendor_sound.js).
    if(b.t===Math.max(1,k.a-PC.swing.lead)||b.t===k.b-PC.swing.lead)pappu('swing',b.x);
    if(b.t===k.raise||b.t===k.raise2)pappu('raise',b.x);
    if(b.t===k.slam-PC.swing_big.lead||b.t===k.slam2-PC.swing_big.lead)pappu('swing_big',b.x);
    // The two quick swings are plain (guard or deflect; he swings on); the raised overhead is the one to parry.
    if(b.t===k.a||b.t===k.b){p.lastDefense=null;if(tryHitPlayer(b,VENDOR_SWING[P],76,false,17,'plain'))lunchChip(P,VENDOR_SWING[P]);}
    // (the lunch rush's slam staggers rather than floors: a CHAD who eats it can still punish the stuck skimmer)
    if(b.t===k.slam||b.t===k.slam2){G.shake=5;pappu('slam',b.x+b.face*64);streetPuff(b,64,.85);p.lastDefense=null;if(tryHitPlayer(b,VENDOR_SLAM[P],84,P>0,17,'counter'))lunchChip(P,VENDOR_SLAM[P]);}
    if(b.t===k.slam+10&&k.raise2!==undefined){pappu('rip',b.x);streetPuff(b,64,.6);} // ripped out of the street
    if(b.state==='string'&&b.t>=k.end){b.state='stuck';b.t=0;}
    return true;
   }
   case 'advance':{
    // Skimmer up, he waddles in on CHAD (guarding) until the string reaches, then swings.
    // (to the nearest lane he can stand in: CHAD at the front of the street is still in the string's reach)
    const d=Math.sign(p.x-b.x)||b.face,ty=clamp(p.y,laneMin(b.x),VENDOR_LANE_MAX);stepTo(b,p.x-d*VENDOR_REACH,ty,b.def.speed*[1.5,1.7,1.9][P]);
    // Never swings at thin air: if CHAD keeps away he returns to the oil pot.
    if(Math.abs(p.x-b.x)<=VENDOR_REACH+8&&Math.abs(ty-b.y)<10)begin(b,'string');
    else if(b.t>=90)start(b,P===2?'breath':'scoop');
    return true;
   }
   case 'bump':{
    // The gut thrust: a green (parryable) shove. Parried, he reels; guarded or taken, CHAD skids back
    // out to where the throw or the flop he was saving works, and that comes straight after.
    lunge(b,0,VENDOR_BUMP.hit,12,VENDOR_BUMP.gap);
    if(b.t===VENDOR_BUMP.hit-PC.bump_whoosh.lead)pappu('bump_whoosh',b.x);
    if(b.t===VENDOR_BUMP.hit){
     // The crush bump caves in a held guard: only a timed parry answers it.
     const crush=b.crush&&p.state==='parry'&&!(p.guardWindow>0)&&Math.abs(p.y-b.y)<17&&(p.x-b.x)*b.face>0&&(p.x-b.x)*b.face<VENDOR_BUMP.gap+20;
     if(crush){p.guardDenied=VENDOR_CRUSH_DENY;b.turtle=0;spawnPop(p.x,p.y-p.z-104,'GUARD CRUSH!');G.hitstop=Math.max(G.hitstop,5);pappu('crush',b.x+b.face*VENDOR_BUMP.front);}
     const n=G.effects.length,hit=tryHitPlayer(b,crush?VENDOR_CRUSH_DMG:[6,7,8][P],58,false,17,'counter');
     // The contact spark sits where the belly meets him: its front edge, at CHAD's waist.
     const spark=hit&&G.effects.length>n&&G.effects.at(-1);if(spark?.type==='spark')Object.assign(spark,{x:b.x+b.face*VENDOR_BUMP.front,y:p.y-VENDOR_BUMP.waist});
     if(b.state!=='bump')return true;
     // Shoved, not swallowed: the belly's edge meets him and he is knocked back off it on the contact tick.
     if(hit&&!p.dying&&p.lastDefense!=='parry'){p.x=clamp(p.x+b.face*VENDOR_BUMP.push,arenaMin(),arenaMax());b.shove={dir:b.face,t:16};pappu('belly',b.x+b.face*VENDOR_BUMP.front);G.shake=Math.max(G.shake,3);spawnDust(p.x,p.y,4);}
    }
    if(b.t>=VENDOR_BUMP.end){const q=b.queued;b.queued=null;
     if(q&&!p.dying&&p.state!=='down'&&Math.abs(p.x-b.x)>=52){b.lastPick=q;start(b,q);if(q==='flop')b.flopChain=P===2?1:0;}
     else recover(b,[30,22,18][P]);}
    return true;
   }
   case 'stuck':
    if(b.t===18||b.t===30)pappu('strain',b.x,1,{i:b.t===30?1:0});
    if(b.t>=VENDOR_STUCK[P]){streetPuff(b,60,.5);recover(b,10);}
    return true;
   case 'naan':case 'setup-naan':case 'naan-load':start(b,'scoop');return true; // legacy state migration
   case 'setup-scoop':{
    const k=b.kadai;
    if(stepTo(b,k.x-VENDOR_DIP_X,k.y-VENDOR_WORK_Y,P===2?2:1.5)||b.t>170){b.state='dip';b.t=0;b.face=1;b.kadaiPopT=G.time;}
    return true;
   }
   case 'dip':
    if(b.t===1)pappu('ladle_in',b.kadai.x);else if(b.t%27===10)pappu('stir',b.kadai.x);
    if(b.t>=VENDOR_DIP[P]){b.state='fling';b.t=0;b.face=p.x<b.x?-1:1;}
    return true;
   case 'fling':{
    const V=VOLLEYS[P],next=V.find(v=>b.t<=v.at);
    // Each volley aims at CHAD until it leaves the skimmer; the rings show where.
    if(next)b.flingTo={x:clamp(p.x,G.camLock+30,G.camLock+450),y:clamp(p.y,laneMin(p.x),laneMax(p.x)),n:next.n,spread:P===1?SPICY_THROW.spread:30,radius:P===1?SPICY_THROW.radius:11};
    const v=V.find(v=>v.at===b.t);
    if(V.some(u=>u.at-PC.fling.lead===b.t))pappu('fling',b.x);
    // Extra spicy: he turns to face CHAD as he coils, then commits.
    if(P===1){if(b.t<SPICY_THROW.whip)b.face=p.x<b.x?-1:1;updateSpicyThrow(b);}
    if(v){
     b.kadaiPopT=G.time;if(P!==1)b.face=p.x<b.x?-1:1;
     if(P===1)throwSpicyVolley(b,b.flingTo);
     // Out of the skimmer's basket, raised high in front of him; 38 ticks to the floor.
     else{const x0=b.x+b.face*55;for(let i=0;i<v.n;i++){const tx=b.flingTo.x+(i-(v.n-1)/2)*b.flingTo.spread;spawnArc('oil',x0,b.flingTo.y,(tx-x0)/38,2.2,10,'fire',{source:b,z:92,jumpSafe:true});}}
    }
    if(P===1?b.t>=SPICY_THROW.end:b.t>=V.at(-1).at+30)recover(b,P===1?SPICY_THROW.recovery:[40,28,26][P]);
    return true;
   }
   case 'breath':{
    if(P===2){if(b.t===1)pappu('breath',b.x,1.3);if(b.t>=FLOOR_FIRE.end)recover(b,FLOOR_FIRE.recovery);return true;}
    const mouth=b.x+b.face*MOUTH[0],L=vendorBreathRange(b);
    // One committed low surge. Its lane and facing lock at wind-up, and a full jump clears it.
    if(b.t>=5&&b.t<=16&&!b.hitLanded&&p.state!=='jump'&&p.z<=0&&tryHitPlayer({...b,x:mouth,y:b.lane??b.y,pattern:'breath'},10,L,false,VENDOR_BREATH_LANE,'unblockable')){b.hitLanded=true;b.breathHits=1;}
    if(b.t>=VENDOR_BREATH.ticks){b.state='cough';b.t=0;}
    return true;
   }
   case 'cough':
    if(b.t===2||b.t===26||b.t===48)pappu('cough',b.x);
    if(b.t===56)pappu('wheeze',b.x);
    if(b.t>=VENDOR_BREATH.recovery)recover(b,10);
    return true;
   case 'flop':{
    const q=clamp(b.t/38,0,1);
    b.x=mix(b.leapFrom,b.leapTo,q);b.y=mix(b.leapFromY,b.leapY,q);b.z=Math.sin(q*Math.PI)*80;
    if(q>=1){
     b.z=0;b.state='flopped';b.t=0;b.waitUp=false;b.upAt=0;G.shake=b.mutated?11:8;pappu('flop_land',b.x);
     spawnRing(b.x,b.y-4,'#ff8040');spawnDust(b.x,b.y,18);
     let d=Math.sign(p.x-b.x)||b.face;
     if(d<0?b.x-flopClear(b)<arenaMin():b.x+flopClear(b)>arenaMax())d=-d;
     // Crushed, then thrown clear: for the short impact freeze CHAD lies squashed flat on the street where he stood
     // (a floored CHAD draws in front of the belly) in a burst of dust; then the belly bounces him up and he flies out
     // from under it, still flat (fast at first, dragging to a stop), clearing it over about ten airborne ticks. Never a snap.
     if(Math.abs(p.x-b.x)<(b.mutated?55:42)&&Math.abs(p.y-b.y)<20&&p.z<10&&tryHitPlayer({...b,x:p.x-d,face:d},16,8,true,24,'unblockable')&&p.state==='down'){
      Object.assign(p,{z:0,vz:0,vx:0});G.hitstop=Math.min(G.hitstop,VENDOR_CRUSH);
      b.crushed={vx:d*clamp((flopClear(b)-(p.x-b.x)*d)/VENDOR_FLOP_REACH,VENDOR_FLOP_SLIDE,b.mutated?11:VENDOR_FLOP_VMAX)};
      spawnRing(p.x,p.y,'#e8d0a8');spawnDust(p.x-12,p.y,6);spawnDust(p.x+12,p.y,6);}
     if(p.z<4&&Math.abs(p.x-b.x)<(b.mutated?94:70)&&Math.abs(p.y-b.y)<22)clearLane(b,p,b.y);
     b.wave={x:b.x,y:b.y,r:30,hit:false};
    }
    return true;
   }
   case 'flopped':{
    if(b.crushed){if(p.state==='down'&&!p.grabbedBy&&!p.dying)Object.assign(p,{z:1,vz:VENDOR_FLOP_LIFT,vx:b.crushed.vx,fell:true});b.flung=p.state==='down';b.crushed=null;}
    if(b.t===40)pappu('groan',b.x);
    // Nobody lies under him: a floored CHAD slides clear of the belly.
    if(p.z<4&&!p.grabbedBy&&Math.abs(p.x-b.x)<(b.mutated?94:70)&&Math.abs(p.y-b.y)<22)clearLane(b,p,b.y);
    // The last order bounces straight back up for a second flop at wherever CHAD went.
    // ...but only when the first one missed. If it floored CHAD there is no second leap onto a man
    // getting up: Pappu lies there winded until CHAD has been back on his feet a good while.
    const floored=['down','getup'].includes(p.state)||p.dying;
    if(b.t===0)b.waitUp=false;
    if(b.flopChain>0&&floored){b.flopChain=0;b.waitUp=true;}
    if(b.flopChain>0&&b.t>=16){b.flopChain--;Object.assign(b,{state:'flopup',t:0,chainUp:true});pappu('grunt',b.x,.6);return true;}
    if(floored)b.upAt=b.t;
    if(b.t>=[72,72,90][P]&&(!b.waitUp||b.t-(b.upAt??0)>=36||b.t>=200)){b.state='flopup';b.t=0;b.chainUp=false;}
    return true;
   }
   case 'flopup':
    if(b.chainUp){if(b.t>=16){b.chainUp=false;begin(b,'flop');b.t=Math.max(0,VENDOR_WIND.flop[P]-18);b.wave=null;}return true;}
    if(b.t>=26)regroup(b);return true;
   case 'hurt':if(b.t>=14){b.state='idle';b.t=0;b.atkCd=Math.min(b.atkCd,24);}return true;
   case 'recover':if(b.t>=(b.recovery||40)){b.state='idle';b.t=0;b.atkCd=[44,26,22][P];}return true;
  }
  return false;
 },
 drawHud(ctx,b,x,y){
  drawSting(ctx,b);if(!Number.isFinite(x))return;
  let start,fade=1;
  if(b.state==='rage'&&b.t>=30){start=b.chilliHp??b.maxhp*VENDOR_PHASE.spicy;fade=clamp((110-b.t)/42,0,1);}
  else if(b.state==='lastorder'&&b.t>=28||b.state==='mutate'&&b.t<38){start=b.feastHp??b.maxhp*VENDOR_PHASE.last;fade=b.state==='mutate'?1-b.t/38:1;}
  else return;
  const bw=b.mini?110:160,from=Math.round(bw*start/b.maxhp),to=Math.round(bw*b.hp/b.maxhp);
  ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='#ffa83a';ctx.fillRect(x+from,y,Math.max(0,to-from),5);ctx.fillStyle='#fff0a6';ctx.fillRect(x+from,y,Math.max(0,to-from),1);
  if(to>from){ctx.fillStyle='#fff6cc';ctx.fillRect(x+to-1,y,2,5);for(let i=0;i<4;i++){const a=(G.time+i*6)%24;ctx.globalAlpha=fade*(1-a/24);ctx.fillRect(x+to-1-((i*5+a*.25)%Math.max(1,to-from)),y-1-a*.14,1,1);}}ctx.restore();
 },
 onDeath(b){
  b.wave=null;b.shove=null;b.cauldronShot=null;if(b.kadai)b.kadai.bowlLifted=false;b.laneTo=null;pappuBedStop(.4);
  for(const q of b.fightProps)q.decor=true;
  b.finishStarted=!!G.india?.startCinematic?.('vendor-finish',b);
 },
 draw(ctx,b,camX){
  const floor=!G.reflecting;
  if(floor)drawTells(ctx,b,camX);
  if(floor&&b.state==='flop')drawLandingRing(ctx,b,camX);
  const [name,index]=vendorPose(b);
  if(floor)drawCrater(ctx,b,camX,name,index);
  // His weight on the street: a soft contact shadow under both sandals (smaller while he is airborne).
  if(floor&&!b.dead){const lift=clamp((b.z||0)/80,0,1);contact(ctx,b.x-camX,b.y+1,26*(1-.4*lift),4*(1-.3*lift),.34*(1-.5*lift));}
  const face=G.state==='bossintro'?vendorIntroPose(b.introT||0).face:b.face;
  const f=vendorCombatFrame(b,name,index,face);
  // Breathing fire he shudders with the recoil; coughing, he heaves.
  // holding the roar he trembles with rage (a pixel each way) and his flames flare in beats
  const shiver=name==='inferno_roar'&&index===1?[((G.time>>1)&1)*2-1,(G.time>>2)&1]:[0,0];
  const jit=(b.t>>2)&1,hurl=name==='spicy_throw'?spicyThrowOffset(b):[0,0],x=Math.round(b.x-camX)+(b.state==='breath'&&name!=='inferno_roar'?jit*b.face:0)+hurl[0]+shiver[0],y=Math.round(b.y-b.z)-(b.state==='cough'?jit:0)+hurl[1]+(name==='flop_polish'&&index===4?12*clamp(b.t/7,0,1):(SINK[name]?.[index]||0))+shiver[1];
  const k=stringBeats(b),cue=vendorCueOn(b);
  const tell=b.state==='string'?'string':b.state==='fling'?'scoop':b.pattern;
  const hold=b.pattern;b.pattern=tell;
  // Shared overhead cue; only red attacks add a rim. Reflections retain his palette.
  const fx0=x-frameW(f)/2,fy0=y-frameH(f)+4,lit=cue;
  drawVendorHeat(ctx,b,x,y);
  const cls=b.state==='lastorder'&&b.t>=VENDOR_CAULDRON.warning?'unblockable':undefined;
  blitTelegraph(ctx,b,f,fx0,fy0,lit,cls);
  if(name==='inferno_roar'&&index===1&&b.t%6<2){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.22;blit(ctx,f,fx0,fy0);ctx.restore();}
  if(floor&&lit)drawCueMarker(ctx,b,x,y-b.h-12,cls);
  b.pattern=hold;
  if(!floor)return;
  if((b.state==='lastorder'||b.state==='mutate'&&b.t<84)&&(ASSETS.dv_skimmer_floor||ASSETS.dv_skimmer_long)){const im=ASSETS.dv_skimmer_floor||ASSETS.dv_skimmer_long;ctx.save();ctx.translate(Math.round(b.kadai.x-54-camX),Math.round(b.kadai.y+3));ctx.rotate(-.08);ctx.drawImage(im,-im.width/4,-im.height/4,im.width/2,im.height/2);ctx.restore();}
  if(b.state==='breath'||b.state==='windup'&&b.pattern==='breath')drawBreath(ctx,b,camX);
  if(name==='spicy_throw')drawSpicyThrow(ctx,b,camX);
  drawSplash(ctx,b,camX);drawStars(ctx,b,x,y,f);
  if(b.lastOrder&&!b.dead)drawSweat(ctx,b,x,y);
  if(G.state==='bossintro')drawIntroExtras(ctx,b,camX);
 },
};
// The flop's shockwave: an expanding ring along the floor. Jump it.
function updateWave(b){
 const w=b.wave;if(!w)return;
 w.r+=4.2;const p=G.player,d=Math.hypot(p.x-w.x,(p.y-w.y)*2.6);
 if(w.jumpCheck&&!w.hit&&Math.abs(d-w.r)<9&&(p.state==='jump'||p.z>=5))w.hit=true;
 if(!w.hit&&p.z<5&&Math.abs(d-w.r)<9){w.hit=tryHitPlayer({...b,x:p.x-Math.sign(p.x-w.x||1),face:Math.sign(p.x-w.x)||1,pattern:'flop'},w.damage||11,8,true,30,'unblockable');}
 if(w.r>(w.max||130))b.wave=null;
}
// The last order's roar skids CHAD back along the street: no damage, just space.
function updateShove(b){
 const s=b.shove,p=G.player;if(!s)return;
 if(s.t--<=0||p.dying||p.state==='down'||p.grabbedBy){b.shove=null;return;}
 if(p.z<4){p.x=clamp(p.x+s.dir*s.t*.32,arenaMin()+4,arenaMax()-4);if(s.t%4===0)spawnDust(p.x,p.y,1);}
}

// ---- drawing --------------------------------------------------------------------------
// Tells live on the floor, never over faces.
function drawTells(ctx,b,camX){
 const t=b.t,P=ph(b);
 // Breath: the fixed lane of the one low surge, in hot orange.
 if(!b.mutated&&b.state==='windup'&&b.pattern==='breath'){
  const w=VENDOR_WIND.breath[P],k=b.state==='breath'?1:clamp(t/w,0,1),x0=Math.round(b.x+b.face*MOUTH[0]*(b.mutated?1.32:1)-camX),L=vendorBreathRange(b);ctx.save();
  // The floor band marks the committed lane; jumping also clears it.
  const x=b.face>0?x0:x0-L,y=Math.round(b.state==='breath'?b.lane:b.y)-VENDOR_BREATH_LANE+1,H=2*VENDOR_BREATH_LANE-2;
  ctx.globalAlpha=(.3+.3*k)*(b.state==='breath'?.55:1);ctx.fillStyle='#e8280e';ctx.fillRect(x,y,L,H);
  // Hot pulsing edges and chevrons streaming away from his mouth.
  ctx.globalAlpha=(.65+.35*k)*(((t>>2)&1)?1:.6);ctx.fillStyle='#ffb020';ctx.fillRect(x,y-1,L,2);ctx.fillRect(x,y+H-1,L,2);
  if(b.state==='windup'){ctx.fillStyle='#fff0a0';for(let i=0;i<7;i++){const cx=x0+b.face*((i*22+t*2)%L);
   for(let j=0;j<4;j++){ctx.fillRect(cx+b.face*j*2,y+2+j*2,2,2);ctx.fillRect(cx+b.face*j*2,y+H-4-j*2,2,2);}}}
  ctx.restore();
 }
 // Fling: where each glob of the next volley will land.
 if(b.state==='fling'&&b.flingTo&&ph(b)===1)drawSpicyRings(ctx,b,camX);
 else if(b.state==='fling'&&b.flingTo){
  const n=b.flingTo.n||3;ctx.save();ctx.strokeStyle='#ff5a28';ctx.globalAlpha=.35+.35*((t>>2)&1);
  const spots=Array.from({length:n},(_,i)=>[b.flingTo.x+(i-(n-1)/2)*(b.flingTo.spread||30),b.flingTo.y]);
  for(const [sx,sy] of spots){const x=Math.round(sx-camX),y=Math.round(sy);ctx.beginPath();ctx.ellipse(x,y,b.flingTo.radius||11,(b.flingTo.radius||11)/3.5,0,0,Math.PI*2);ctx.stroke();}
  ctx.restore();
 }
 const w=b.wave;
 if(w){const x=Math.round(w.x-camX),y=Math.round(w.y),a=clamp(1-w.r/(w.max||130),0,1);ctx.save();ctx.globalAlpha=.8*a;
  ctx.strokeStyle='#ffb14a';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x,y,w.r,w.r/2.6,0,0,Math.PI*2);ctx.stroke();
  ctx.strokeStyle='#fff0c0';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,w.r-3,(w.r-3)/2.6,0,0,Math.PI*2);ctx.stroke();ctx.restore();}
}
function drawLandingRing(ctx,b,camX){
 const x=Math.round(b.leapTo-camX),y=Math.round(b.leapY),k=clamp(b.t/38,0,1);
 ctx.save();ctx.globalAlpha=.35+.45*k;ctx.strokeStyle='#ff4050';ctx.lineWidth=1;
 ctx.beginPath();ctx.ellipse(x,y,(b.mutated?62:48)*(1.2-.2*k),10*(1.2-.2*k),0,0,Math.PI*2);ctx.stroke();
 ctx.fillStyle='#00000066';ctx.beginPath();ctx.ellipse(x,y,16+16*k,4+3*k,0,0,Math.PI*2);ctx.fill();ctx.restore();
}
// Chilli fire: embers at his lips during the breath-in, then a roaring jet down the lane.
function drawBreath(ctx,b,camX){
 if(b.superLocked)return;
 if(b.mutated){drawGroundExhale(ctx,b,camX);return;}
 const t=b.t,origin=b.mutated?[MOUTH[0]*1.32,MOUTH[1]*1.32]:b.state==='windup'?[10,-84]:[22,-84],mx=b.x+b.face*origin[0]-camX,my=b.y+origin[1],P=ph(b),full=vendorBreathRange(b),lane=b.lane??b.y;
 ctx.save();
 if(b.state==='windup'){ctx.globalCompositeOperation='lighter';for(let i=0;i<4;i++){const a=(t+i*5)%14;ctx.fillStyle=i%2?'#ff7a20':'#ffd060';ctx.fillRect(Math.round(mx+b.face*(2+a*.6)),Math.round(my-a*.5+i),2,1);}ctx.restore();return;}
 if(P===2){ctx.save();ctx.globalCompositeOperation='lighter';const heat=ctx.createRadialGradient(mx,my,2,mx,my,35);heat.addColorStop(0,'rgba(255,225,120,.5)');heat.addColorStop(1,'rgba(255,80,10,0)');ctx.fillStyle=heat;ctx.fillRect(mx-35,my-35,70,70);ctx.restore();}
 const dur=P===2?VENDOR_BREATH.finalTicks:VENDOR_BREATH.ticks,L=Math.min(full,t*(P===2?48:34)),fade=t>dur-8?(dur-t)/8:1,im=ASSETS.dv_breath,dy=lane-b.y;
 for(let i=0;i<(P===2?6:4);i++){const f=fx('flame',(t>>2)+i*2);if(!f||L<40)break;const q=(i+1)/(P===2?7:5),x=mx+b.face*(L*q),scale=P===2?1.25:1;ctx.globalAlpha=fade*.8;ctx.save();ctx.translate(Math.round(x),Math.round(b.y+dy*q+2));ctx.scale(scale,P===2?1.12:1);blit(ctx,f,-Math.round(frameW(f)/2),-frameH(f));ctx.restore();}
 if(P===2&&ASSETS.dv_inferno_breath){
  // One painted turbulent blast: the game treats jumping as the simple escape rule.
  // Rotate the whole illustration rather than warping its flame anatomy into a pipe.
  const plume=ASSETS.dv_inferno_breath,fh=plume.height/4,frame=(t>>1)&3;
  ctx.translate(Math.round(mx),Math.round(my));if(b.face<0)ctx.scale(-1,1);ctx.rotate(.24);
  const width=Math.min(240,20+L),height=88;
  ctx.globalAlpha=fade;ctx.drawImage(plume,0,frame*fh,plume.width,fh,-4,-28,width,height);
  ctx.restore();return;
 }
 // The jet, mouth end at his lips, angled down the lane (and across to CHAD's lane when it sweeps); it unrolls to full length.
 ctx.globalAlpha=fade;ctx.translate(Math.round(mx),Math.round(my));if(b.face<0)ctx.scale(-1,1);const angle=P===2?Math.atan2(lane-10-my,full):.3+Math.atan2(dy,L||1);ctx.rotate(angle);
 if(im){const fw=im.width/4,h=im.height*(P===2?.68:.46);ctx.drawImage(im,((t>>(P===2?1:2))&3)*fw,0,fw,im.height,-3,-h/2,P===2?L/Math.cos(angle):L,h);}
 else{ctx.fillStyle='#ff8030';ctx.fillRect(0,-6,L,12);}
 ctx.restore();
}
// Hot oil thrown up out of the kadai when he's caught dipping.
function drawSplash(ctx,b,camX){
 const a=G.time-(b.splashT??-99),im=ASSETS.dv_splash;if(a<0||a>=26||!im)return;
 const s=a<5?.6+a*.08:1,w=im.width*s,h=im.height*s;ctx.save();ctx.globalAlpha=a>18?(26-a)/8:1;
 ctx.drawImage(im,Math.round(b.kadai.x-camX-w/2),Math.round(b.kadai.y-40-h),Math.round(w),Math.round(h));ctx.restore();
}
// The skimmer's head buried in the street: the broken cobbles (dv_crater, warmed once to the street's lamplit
// brown: the painted rubble is grey), and a puff of street dust thrown up where it goes in or comes out.
function streetPuff(b,ahead,size){b.puff={x:b.x+b.face*ahead,y:b.y,at:G.time,size};}
let WARM=null;
function warmCrater(){
 const im=ASSETS.dv_crater;if(!im||typeof document==='undefined')return im;if(WARM?.src===im)return WARM.c;
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
 const d=x.getImageData(0,0,c.width,c.height),a=d.data;
 for(let i=0;i<a.length;i+=4){const l=a[i]*.3+a[i+1]*.59+a[i+2]*.11;a[i]=Math.min(255,l*1.05+8);a[i+1]=l*.74;a[i+2]=l*.5;}
 x.putImageData(d,0,0);WARM={src:im,c};return c;
}
function drawCrater(ctx,b,camX,name,index){
 const im=warmCrater(),k=stringBeats(b);
 const buried=b.state==='string'&&b.t>=k.slam&&(k.raise2===undefined||b.t<k.raise2||b.t>=k.slam2);
 if(im&&(name==='cleaver'&&index>=4&&index<=5||name==='string'&&index===6||buried)){const w=im.width,h=im.height;ctx.drawImage(im,Math.round(b.x+b.face*64-camX-w/2),Math.round(b.y+4-h),w,h);}
 const p=b.puff,age=p?G.time-p.at:99,dust=ASSETS.nr_finale_dust,life=22;
 if(p&&dust&&age>=0&&age<life){const w=88*.62*p.size,h=80*.62*p.size;ctx.save();ctx.globalAlpha=Math.min(1,(life-age)/8)*.75;ctx.filter='sepia(.7) brightness(.72)';
  ctx.drawImage(dust,Math.min(3,Math.floor(age/life*4))*88,0,88,80,Math.round(p.x-camX-w/2),Math.round(p.y+3-h),Math.round(w),Math.round(h));ctx.restore();}
}
// Sweat off his scalp in the last order: beads flick off either side of his head and fall.
function drawSweat(ctx,b,x,y){
 const head=y-b.h+8,hx=x+b.face*11; // his bald crown leads his feet, hunched over in the last order
 for(let i=0;i<4;i++){const p=26+i*5,a=(G.time+i*11)%p;if(a>16)continue;const side=i&1?1:-1,px=Math.round(hx+side*(10+a*.9)),py=Math.round(head+i*3-a*1.1+a*a*.09);
  ctx.fillStyle=a<4?'#fffbe8':'#bfe4ff';ctx.fillRect(px,py,1,a<8?2:1);}
}
// Stars orbiting just above his scalp while a parried overhead holds him (head: 248,138 of
// the 448x300 stuck cell).
const STAR=['...#...','..#o#..','.#ooo#.','#ooxoo#','.#ooo#.','..#o#..','...#...'];
const bouncing=b=>G.time-(b.bounceAt??-99)<5;
function drawStars(ctx,b,x,y,f){
 if(!(b.deepStuck&&b.openKind==='stuck'&&b.protectedStagger>0&&!bouncing(b))||!f)return;
 const s=frameH(f)/300,cx=x+(248-224)*s*b.face,cy=y-frameH(f)+4+132*s;
 for(let i=0;i<3;i++){const a=G.time*.12+i*2.09,sx=Math.round(cx+Math.cos(a)*16)-3,sy=Math.round(cy+Math.sin(a)*4)-3,back=Math.sin(a)<0;
  for(let r=0;r<7;r++)for(let c=0;c<7;c++){const k=STAR[r][c];if(k==='.')continue;ctx.fillStyle=k==='#'?'#2a1406':back?'#d8a830':k==='x'?'#fffbe0':'#ffe050';ctx.fillRect(sx+c,sy+r,1,1);}}
}
function drawIntroExtras(ctx,b,camX){
 const t=b.introT||0,c=vendorIntroCell(t),k=b.kadai,im=ASSETS.dv_skimmer_long;
 // Turning to CHAD and spitting (cells 13/14) his hands are busy: the skimmer stands in the kadai,
 // handle up out of the rim towards him (the pan, drawn after him, hides the bowl).
 if((c===13||c===14)&&k&&im){
  ctx.save();ctx.translate(Math.round(k.x-camX+6),Math.round(k.y-32));ctx.rotate(-2.18);
  ctx.fillStyle='#120c0a';ctx.fillRect(9,-1.5,27,3);ctx.fillRect(35,-2.5,4,5);ctx.fillStyle='#cfc6b8';ctx.fillRect(9,-.5,26,1);ctx.fillRect(36,-1.5,2,1);
  ctx.rotate(-Math.atan2(8,-34));ctx.drawImage(im,-23,-11,im.width/2,im.height/2);ctx.restore();
 }
 // The pakora he tastes, then spits at CHAD.
 const s=t-158;if(s>=0&&s<30){const x=b.x-camX-27-s*3.2,y=b.y-84+s*s*.09;const im=ASSETS.dv_items;
  if(im){const cw=im.width/4,sz=14;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(-s*.35);ctx.drawImage(im,3*cw,0,cw,im.height,-sz/2,-sz/2,sz,Math.round(sz*im.height/cw));ctx.restore();}
  else{ctx.fillStyle='#c8841a';ctx.fillRect(Math.round(x),Math.round(y),5,4);}
  // A spray of spit and crumbs trails it out of his mouth.
  if(s<12){ctx.save();ctx.globalAlpha=1-s/12;for(let i=0;i<6;i++){const k=.35+i*.13,dx=-27-s*3.2*k-i,dy=-84+s*s*.09*k+((i*37)%7-3);ctx.fillStyle=i%2?'#e8e2cf':'#b98a3a';ctx.fillRect(Math.round(b.x-camX+dx),Math.round(b.y+dy),i%3?1:2,1);}ctx.restore();}}
}
