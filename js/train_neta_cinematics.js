// Netaji and Shera cinematics: Shera's brutal finisher and CHAD's climb to the roof, and the rooftop knockout.
// CHAD's gameplay frames play against victim-only reaction frames; every clock is the simulation's and nothing
// here changes combat.
import {G,clamp} from './engine.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {ASSETS} from './assets.js';
import {getAIFrame} from './aiframes.js';
import {SHERA_DECAP,drawSheraHead,drawSheraNeckBlood} from './shera_gore.js';
import {dim,flash,speedLines,aura,ghost,silhouette,punchBurst,debrisBurst,bloodSpray,bloodArc,crackFlash,tooth,bloodDecal} from './finisher_fx.js';
import {drawDazeRing} from './daze.js';
import {netaProp} from './train_neta.js';

const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const actorsOn=()=>G.train?.review?.finishActors!==false;
function actor(ctx,set,state,index,x,y,face=1){if(!actorsOn())return;const f=getFrame(set,state,index,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
function contact(ctx,t,at,x,y,upper=false){
 const age=t-at,im=ASSETS.boxing_impacts;if(age<0||age>=12||!im)return;
 const frame=Math.min(3,Math.floor(age/3)),w=upper?36:24,h=w*1.5;
 ctx.drawImage(im,frame*128,upper?192:0,128,192,x-w/2,y-h*.65,w,h);
}
function shadow(ctx,x,y,r){ctx.fillStyle='rgba(0,0,0,.28)';ctx.beginPath();ctx.ellipse(Math.round(x),Math.round(y),r,r*.3,0,0,Math.PI*2);ctx.fill();}
// Paper and brass on a ballistic, fluttering path; deterministic from the launch tick.
function flight(age,vx,vy,floor,y0){let x=0,y=y0,v=vy;for(let i=0;i<age;i++){x+=vx*(v>0?.55:1);v=Math.min(.9,v+.12);y+=v;if(y>=floor)return {x,y:floor,rest:true};}return {x,y,rest:false};}

// ---- Shera's finisher ('shera-finish'): six gut punches, rib crunch, kneel, super uppercut, crash on a trunk ----
// Fresh clock for the approved finisher beats; the camera stays on the private
// carriage (x 7680). Shera plays nr_neta_guard `rage_finish` (0-2 gut, 3 rib, 4 kneel, 5 jaw snap, 6-7 airborne,
// 8 landing, 9-10 twitch) facing CHAD; CHAD plays his original gameplay frames. From AFTER he walks to the ladder
// and climbs out (chad_roof_climb), then the roof shot shows him leaving the hatch (train.js).
const CAM=7680,FLOOR=218,LAND_Y=228,HX0=184,SX0=256,LADDER_X=318;
const RIB=60,KNEEL=78,CHARGE=80,JAW=104,CRASH=150,AFTER=240;
// Cell data in logical px, facing right (tools/verification/shera_finisher_points.py, 113 px Shera): mouth [dx, up] and
// the front of the body at the height CHAD's fist meets each standing cell (jab 76, hook 68, rib 78).
const MOUTH=[[6.5,80.0],[12.8,69.4],[7.5,62.0],[2.2,81.0],[-8.2,74.2],[-10.7,77.4],[-47.7,72.6],[-58.6,36.8],[-48.4,23.8],[-48.1,21.8],[-50.0,16.5]];
const FRONT=[34.0,38.5,36.0,33.0];
// Gut hits: [contact tick, CHAD state, contact frame, fist dx, fist up, Shera cell, spit size]. Hooks step in.
const GUT=[[13,'jab',2,27,76,0,0],[20,'jab',2,27,76,0,0],[27,'jab',2,27,76,1,1],[34,'hook',1,20,68,1,1],[41,'hook',1,20,68,2,2],[48,'hook',1,20,68,2,2]];
const RIB_HIT=[RIB,'hook',2,19,78,3,2];
const gutX=n=>SX0+3*(n+1);                                        // Shera's boots, pushed back 3 px a hit
const chadAt=([,,,dx],n,cell)=>gutX(n)-FRONT[cell]+3-dx;          // CHAD's x so the fist meets his front
const SXK=gutX(6)+6;                                               // kneel spot (he staggers back off the rib hit)
const CHIN=[SXK-MOUTH[4][0],FLOOR-MOUTH[4][1]],JAW_X=CHIN[0]-12,CROUCH_X=JAW_X-34;
const WALK_T=AFTER,CLIMB_T=WALK_T+Math.ceil((310-JAW_X)/1.4),CLIMB_END=CLIMB_T+41;
export const SHERA_FINISH_CUT=CLIMB_END,SHERA_FINISH_TICKS=SHERA_FINISH_CUT+120;
export const SHERA_FINISH_BEATS={gut:GUT.map(h=>h[0]),rib:RIB,kneel:KNEEL,charge:CHARGE,jaw:JAW,crash:CRASH,after:AFTER,climb:CLIMB_T,cut:CLIMB_END};
// Landing: flat on his back on the floor, head on the nearest trunk if one is left (F6), which breaks.
function landing(c){
 const props=c.fightProps||[],ok=q=>!q.roof&&(!q.broken||q.sheraCrash);
 const q=props.filter(ok).sort((a,b)=>Math.abs(a.x-CAM-454)-Math.abs(b.x-CAM-454)).find(q=>Math.abs(q.x-CAM-440)<120);
 return {prop:q||null,x:q?clamp(q.x-CAM-78,350,384):376};
}
export function sheraFinishProps(c){const {prop}=landing(c);return (c.fightProps||[]).map(q=>q===prop&&c.t>=CRASH?{...q,broken:true}:q);}
function gutIndex(t){let n=-1;for(let i=0;i<GUT.length;i++)if(t>=GUT[i][0]-3)n=i;return n;}
// CHAD: [state, index, x, y]
function chadPose(t){
 if(t<12)return ['walk',Math.floor(t/3)%6,HX0+(chadAt(GUT[0],0,0)-HX0)*ease(t/12),FLOOR];
 if(t<RIB-4){
  const n=gutIndex(t);if(n<0)return ['idle_knuckles',0,chadAt(GUT[0],0,0),FLOOR];
  const h=GUT[n],x=chadAt(h,n,h[5]),a=t-h[0];
  return [h[1],a<0?0:a<4?h[2]:3,x,FLOOR];
 }
 if(t<KNEEL){const x=chadAt(RIB_HIT,6,3),a=t-RIB;return ['hook',a<0?0:a<6?2:a<12?3:0,x,FLOOR];}
 if(t<JAW-4){const q=ease((t-KNEEL)/6);return [t<CHARGE?'idle_knuckles':'upper',t<CHARGE?0:1,chadAt(RIB_HIT,6,3)+(CROUCH_X-chadAt(RIB_HIT,6,3))*q,FLOOR+5*q];}
 if(t<JAW)return ['upper',2,CROUCH_X+(JAW_X-CROUCH_X)*ease((t-JAW+4)/4),FLOOR+5];
 if(t<140)return ['upper',3,JAW_X,FLOOR+5];
 if(t<CRASH)return [t<146?'upper':'idle',t<146?2:0,JAW_X,FLOOR+5*(1-ease((t-140)/10))];
 if(t<WALK_T)return t<198?['idle_shades',Math.min(3,Math.floor((t-CRASH)/12)),JAW_X,FLOOR]:['idle',Math.floor(t/14)%4,JAW_X,FLOOR];
 const x=Math.min(310,JAW_X+(t-WALK_T)*1.4);return t<CLIMB_T?['walk',Math.floor((x-JAW_X)/5.4)%6,x,FLOOR]:['climb',0,310,FLOOR];
}
// Shera: {st, i, x, y (sole)}; faces CHAD (-1) throughout, so the knock-back is +x.
function sheraPose(t,c){
 const recoil=(at,k)=>t>=at&&t<at+8?k*Math.sin((t-at)/8*Math.PI):0;
 if(t<GUT[0][0])return {st:'rage_out',i:0,x:SX0,y:FLOOR};// out cold: still until the first blow
 if(t<RIB){const n=gutIndex(t),h=GUT[Math.max(0,n)],hit=t>=h[0]?n:n-1;return {st:'rage_finish',i:hit<0?0:GUT[hit][5],x:gutX(Math.max(0,hit))+(hit>=0?recoil(GUT[hit][0],3):0),y:FLOOR};}
 if(t<KNEEL)return {st:'rage_finish',i:3,x:gutX(6)+recoil(RIB,5)+6*ease((t-RIB-6)/12),y:FLOOR};
 if(t<JAW)return {st:'rage_finish',i:4,x:SXK+(t>=CHARGE?Math.sin((t-CHARGE)*.22)*2:0),y:FLOOR};
 const land=landing(c).x,base=t=>FLOOR+(LAND_Y-FLOOR)*clamp((t-JAW)/(CRASH-JAW),0,1);
 if(t<110){const q=(t-JAW)/6;return {st:'rage_finish',i:5,x:SXK+4+6*q,y:base(t)-14*q};}
 if(t<128){const q=1-(1-(t-110)/18)**2;return {st:'rage_finish',i:6,x:SXK+10+50*q,y:base(t)-14-44*q};}
 if(t<CRASH){const q=(t-128)/22;return {st:'rage_finish',i:7,x:SXK+60+(land-SXK-60)*q,y:base(t)-58*(1-q*q)};}
 if(t<168)return {st:'rage_finish',i:8,x:land,y:LAND_Y-(t>=151&&t<157?Math.sin((t-151)/6*Math.PI)*3:0)};
 const tw=(t-168)%40<6;return {st:'rage_finish',i:tw?10:9,x:land+(tw&&t%2?1:0),y:LAND_Y};
}
const mouthOf=s=>{const m=MOUTH[s.st==='rage_finish'?s.i:0];return [s.x-m[0],s.y-m[1]];};
// Four teeth off the jaw: ballistic with spin, one small bounce, then resting on the boards.
function ballistic(age,vx,vy,floor,y0){let x=0,y=y0,v=vy,b=0;for(let i=0;i<age;i++){x+=vx;v+=.3;y+=v;if(y>=floor){if(b++)return {x,y:floor,rest:true};y=floor;v=-v*.3;vx*=.4;}}return {x,y,rest:false};}
const TEETH=[[1.7,-3.4,-3],[2.6,-2.6,2],[1.1,-4,5],[3.1,-2.1,-1]];
function drawTeeth(ctx,t){
 if(t<JAW)return;
 for(const [i,[vx,vy,dy]]of TEETH.entries()){const f=ballistic(t-JAW,vx,vy,LAND_Y+dy,CHIN[1]);tooth(ctx,i,CHIN[0]+f.x,f.y-2,f.rest?(i%2?.4:-.3):(t-JAW)*.45*(i%2?1:-1));}
}
export function updateSheraFinish(c){
 const t=c.t,sfx=(...n)=>n.forEach(s=>G.audio.sfx(s));
 for(const [n,h]of GUT.entries())if(t===h[0]){sfx(h[1]==='jab'?'punch':'kick');G.shake=n<3?2:3+(n===5);if(n>=3)G.hitstop=Math.max(G.hitstop,2);if(n===2)sfx('shera_hurt');if(n===5)sfx('shera_hurt2');}
 if(t===RIB){sfx('heavy','bone_crack');G.shake=5;G.hitstop=Math.max(G.hitstop,6);}
 if(t===RIB+2)sfx('shera_grunt');
 if(t===KNEEL)G.audio.sfx('land',.6);
 if(t===CHARGE)sfx('super');
 if(t===JAW){sfx('heavy','ko','bone_crack');G.shake=8;G.hitstop=Math.max(G.hitstop,12);}
 if(t===JAW+2)G.slowmo=Math.max(G.slowmo,20);
 if(t===JAW+4)sfx('shera_ko');
 if(t===SHERA_DECAP.ceiling){G.audio.sfx('bone_crack',.55);G.shake=Math.max(G.shake,3);}
 if(t===SHERA_DECAP.land)G.audio.sfx('land',.65);
 if(t===CRASH){sfx('shera_hammer','land');G.shake=7;const {prop}=landing(c);if(prop){prop.broken=true;prop.sheraCrash=true;}}
 if(t===SHERA_DECAP.land+4)G.audio.voice('duke_ahead',2520,true);   // the head has just landed
 if([0,10,20,30].includes(t-CLIMB_T))sfx('entrance_boot');
}
export function drawSheraFinish(ctx,c,sprite,ceiling){
 const t=c.t,[cs,ci,cx,cy]=chadPose(t),s=sheraPose(t,c),land=landing(c).x,on=actorsOn();
 const decapReady=ASSETS.shera_severed_head&&getAIFrame('nr_neta_guard','rage_decap')?.f.length===11;
 const decap=t>=SHERA_DECAP.sever&&decapReady;
 const victimState=decap?'rage_decap':s.st;
 const charge=t>=CHARGE&&t<JAW?clamp((t-CHARGE)/12,0,1):0,fist=[cx+14,cy-60];
 // Rib crunch: a dark freeze under the actors; super charge: dim, speed lines and aura.
 dim(ctx,t>=RIB&&t<RIB+4?.62:charge*.45+(t>=JAW&&t<CRASH?.45*(1-(t-JAW)/46):0));
 if(charge){speedLines(ctx,fist[0],fist[1],t,charge);if(on)aura(ctx,cx,cy-44,56,t,charge);}
 if(t>JAW&&t<CRASH&&on)speedLines(ctx,0,0,t,.8*(1-(t-JAW)/46),1);
 if(t===JAW&&on){
  // One negative frame (held by the hitstop) as the uppercut shatters the jaw.
  const g=ctx.createRadialGradient(CHIN[0],CHIN[1],4,CHIN[0],CHIN[1],300);g.addColorStop(0,'#fff6de');g.addColorStop(.25,'#ffb347');g.addColorStop(1,'#b3260f');ctx.fillStyle=g;ctx.fillRect(0,0,480,270);
  speedLines(ctx,CHIN[0],CHIN[1],t,1);
  silhouette(ctx,SPR.nr_neta_guard,'rage_finish',5,s.x,s.y,-1,'#4a170b');silhouette(ctx,SPR.player,'upper',3,cx,cy,1,'#0e0605');
  punchBurst(ctx,t,JAW,CHIN[0],CHIN[1],190,-Math.PI/2);bloodArc(ctx,t+6,JAW,CHIN[0],CHIN[1]-4,1,1);
  if(!decapReady)for(const [i,[vx,vy]]of TEETH.entries())tooth(ctx,i,CHIN[0]+vx*5,CHIN[1]+vy*4,i*.7);
  crackFlash(ctx,t+3,JAW,CHIN[0],CHIN[1],2,12);return;
 }
 if(on){
  // Floor blood under his head once he is down (mouth only, F3).
  if(t>=CRASH){const g=Math.min(1,.5+(t-CRASH)*.05);bloodDecal(ctx,land+70,LAND_Y+7,3,g);bloodDecal(ctx,land+52,LAND_Y+5,1,g);}
  if(t>=CLIMB_T&&t<CLIMB_END)drawClimb(ctx,t,sprite,ceiling);
  if(t>JAW&&t<CRASH)for(const [lag,a]of [[6,.16],[4,.26],[2,.4]]){const g=sheraPose(t-lag,c);if(g.i>=5)ghost(ctx,SPR.nr_neta_guard,decap?'rage_decap':g.st,g.i,g.x,g.y,-1,a);}
  shadow(ctx,s.x,t<JAW?FLOOR:Math.max(s.y,LAND_Y),s.i>=7&&s.st==='rage_finish'?34:24);
  actor(ctx,SPR.nr_neta_guard,victimState,s.i,s.x,s.y,-1);
  if(t<GUT[0][0])drawDazeRing(ctx,s.x-6,s.y-136,t);
  if(t>=176&&!decap)drawDazeRing(ctx,land+58,LAND_Y-48,t);
 }
 if(t<CLIMB_T)actor(ctx,SPR.player,cs,ci,cx,cy,1);
 if(!on)return;
 // Impacts on Shera's body, spit and blood from the mouth only.
 for(const [n,h]of [...GUT.entries(),[6,RIB_HIT]]){
  const [at,,,dx,up,cell,spit]=h,x=chadAt(h,n,cell)+dx,y=FLOOR-up;
  contact(ctx,t,at,x,y,n>=3);punchBurst(ctx,t,at,x+4,y,n>=3?80:60,0,2);
  const m=[gutX(n)-MOUTH[cell][0],FLOOR-MOUTH[cell][1]];bloodSpray(ctx,t,at+1,m[0],m[1],-1,spit);
 }
 crackFlash(ctx,t,RIB,chadAt(RIB_HIT,6,3)+19,FLOOR-84,1,10);
 crackFlash(ctx,t,JAW+1,CHIN[0],CHIN[1],2,10);
 bloodArc(ctx,t,JAW+1,CHIN[0],CHIN[1]-4,1,1);
 if(decap){drawSheraNeckBlood(ctx,t,s,land);drawSheraHead(ctx,t,land);}
 else{drawTeeth(ctx,t);if(t>=CRASH){const m=mouthOf(s);bloodSpray(ctx,t,CRASH,m[0],m[1]+2,1,1);}}
 debrisBurst(ctx,t,CRASH,land+44,LAND_Y+4,120,4);contact(ctx,t,CRASH,land+30,LAND_Y-6,true);
 flash(ctx,t>JAW&&t<JAW+6?.3*(1-(t-JAW-1)/5):0);
}
// CHAD's ladder climb: the chad_roof_climb cells hang from the far fist on the plate's rungs; the ceiling strip
// is redrawn over him so he disappears through the hatch.
function drawClimb(ctx,t,sprite,ceiling){
 const q=clamp((t-CLIMB_T)/41,0,1),pose=Math.min(3,Math.floor(q*4)),handX=[101.7,99.2,97.2,95.9][pose];
 if(!sprite(ctx,'chad_roof_climb',pose,332-handX+80,218-q*110,160,120,320,240))actor(ctx,SPR.player,'climb',0,310,218-q*110,1);
 ceiling();
}

// ---- rooftop knockout: jab barrage, uppercut out of frame, RAGNAROK on the way down ---------------
const BARRAGE=[['jab',2],['jab',3],['hook',2],['hook',3]],BARRAGE_HITS=[22,26,30,34,38,42,46];
const KO_BEATS=[[20,'idle_knuckles',-8],[50,'barrage',0],[60,'upper',1],[62,'upper',2],[88,'upper',3],[102,'combo_power_finish',1],[106,'ragnarok_ground',2],[128,'ragnarok_ground',3],[136,'ragnarok_ground',5],[Infinity,'victory',0]];
function knockoutPose(c){
 const t=c.t,bx=c.fromBossX??c.fromX+38,by=c.fromBossY??218,hx=c.fromX,cam=c.fromCam;
 const n=KO_BEATS.findIndex(([end])=>t<end);let [,state,index]=KO_BEATS[n];
 if(state==='barrage')[state,index]=BARRAGE[Math.floor(t/2)%4];else if(index<0)index=Math.floor(t/-index);
 const land=Math.min(cam+430,bx+110);
 let v;
 if(t<50){const hit=BARRAGE_HITS.findLast(h=>t>=h);v={st:t>=20&&hit!==undefined&&t-hit<3?'ko':'wobble',i:hit===46?0:1+(hit/4|0)%2,x:bx+Math.min(6,Math.max(0,(t-20)/4)),y:by,face:-1};}
 else if(t<60)v={st:'wobble',i:0,x:bx+6+Math.sin(t*.8),y:by,face:-1};
 else if(t<84){const q=clamp((t-60)/20,0,1);v={st:'ko',i:3,x:bx+6,y:by-(1-(1-q)*(1-q))*220,face:-1};}
 else if(t<106){const q=clamp((t-92)/14,0,1);v={st:'ko',i:4,x:hx+50,y:by-220+q*q*180,face:-1,hidden:t<92};}
 else if(t<124){const q=(t-106)/18;v={st:'ko',i:6,x:hx+50+(land-hx-50)*q*(2-q),y:by-40+40*q*q-Math.sin(q*Math.PI)*16,face:-1};}
 else if(t<140)v={st:'ko',i:7,x:land,y:by-Math.sin((t-124)/16*Math.PI)*8,face:-1};
 else v={st:'ko',i:t%70<6?9:8,x:land,y:by,face:-1};
 return {chad:{state,index,x:hx,y:by},neta:v,land};
}
export function updateNetaKnockout(c){
 const t=c.t;
 if(BARRAGE_HITS.includes(t)){G.audio.sfx(t%8===2?'punch':'kick');G.shake=2;if(t===30)G.audio.sfx('ehurt4');}
 if(t===50)G.audio.sfx('super');
 if(t===60){G.audio.sfx('heavy');G.audio.sfx('ko');G.shake=6;G.hitstop=Math.max(G.hitstop,10);}
 if(t===92)G.audio.sfx('dash');
 if(t===106){G.audio.sfx('heavy');G.audio.sfx('slam');G.shake=7;G.hitstop=Math.max(G.hitstop,12);}
 if(t===108)G.slowmo=Math.max(G.slowmo,16);
 if(t===124){G.audio.sfx('slam');G.audio.sfx('land');G.shake=8;}
 if(t===140)G.audio.voice('duke_game_over',1700,true);
 return t>=216;
}
export function drawNetaKnockout(ctx,c){
 const t=c.t,cam=c.fromCam,{chad,neta,land}=knockoutPose(c),x=chad.x-cam,y=chad.y;
 if(t<20){actor(ctx,SPR.player,chad.state,chad.index,x,y,1);actor(ctx,SPR.nr_neta,'wobble',0,neta.x-cam,neta.y,-1);return;}
 const charge=t>=50&&t<60?clamp((t-50)/6,0,1):t>=92&&t<106?clamp((t-92)/6,0,1):t>=60&&t<70?1-(t-60)/10:t>=106&&t<120?1-(t-106)/14:0;
 dim(ctx,charge*.6);
 if(t>=20&&t<50)speedLines(ctx,0,0,t,.45,1);
 if((t>=50&&t<60)||(t>=92&&t<106))speedLines(ctx,x+20,y-60,t,charge);
 if(t>=106&&t<126)speedLines(ctx,0,0,t,.8,1);
 if((t>=50&&t<60)||(t>=92&&t<106))aura(ctx,x,y-44,60,t,charge);
 if((t===60||t===106)&&actorsOn()){
  const hit=t===60?[x+20,y-92]:[x+56,y-62];flash(ctx,1,'255,214,120');
  const g=ctx.createRadialGradient(hit[0],hit[1],4,hit[0],hit[1],230);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,480,270);
  silhouette(ctx,SPR.nr_neta,'ko',t===60?2:5,t===60?neta.x-cam:x+56,t===60?y:y-30,-1,'#1a0c08');
  silhouette(ctx,SPR.player,t===60?'upper':'ragnarok_ground',3,x,y,1,'#1a0c08');
  return;
 }
 if(!neta.hidden&&actorsOn()){
  const air=['ko'].includes(neta.st)&&neta.i>=3&&neta.i<=7;
  if(air&&t<140)for(const [lag,a] of [[6,.18],[4,.3],[2,.45]]){const g=knockoutPose({...c,t:t-lag}).neta;if(!g.hidden&&g.st==='ko')ghost(ctx,SPR.nr_neta,g.st,g.i,g.x-cam,g.y,g.face,a);}
  if(neta.y>150)shadow(ctx,neta.x-cam,y,15);
  actor(ctx,SPR.nr_neta,neta.st,neta.i,neta.x-cam+(neta.st==='ko'&&neta.i<2?(t%2?1:-1):0),neta.y,neta.face);
  if(t>=150)drawDazeRing(ctx,land-cam+22,y-22,t);
 }
 // Notes shaken out of his garland by the landing.
 if(t>=124&&actorsOn())for(let i=0;i<10;i++){const f=flight(t-124,(i%2?1:-1)*(.4+i*.12),-(2+(i*3)%5*.4),y+2+(i%3)*3,y-20);netaProp(ctx,i%3?3:11,land-cam+f.x,f.y,10,f.rest?(i%4-1.5)*.4:(t-124)*.25);}
 if(t>=20&&t<50&&actorsOn())for(const [lag,a,off] of [[2,.35,-5],[4,.18,-10]]){const [s,i]=BARRAGE[Math.floor((t-lag)/2)%4];ghost(ctx,SPR.player,s,i,x+off,y,1,a);}
 actor(ctx,SPR.player,chad.state,chad.index,x,y,1);
 for(const at of BARRAGE_HITS)contact(ctx,t,at,x+20+(at*7)%9,y-62-(at*13)%16,at===46);
 punchBurst(ctx,t,61,x+20,y-96,200,-Math.PI/2);
 punchBurst(ctx,t,107,x+56,y-62,230);
 punchBurst(ctx,t,124,land-cam-10,y-6,150,-Math.PI/2,4);
 flash(ctx,(t>=58&&t<60)||(t>=104&&t<106)?.85:(t>60&&t<66)||(t>106&&t<112)?.35:t>=124&&t<128?.4:0);
}
