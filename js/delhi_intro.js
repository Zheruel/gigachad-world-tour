// Dirty Delhi market entrance: CHAD's chopper power-slides in; a rat swims in the cook's frying
// oil; a wound-up haymaker blasts the cook through his stall, the ghee goes up in a fireball and
// CHAD wrecks the other grimy stalls.
// Timelines own state and cues; drawing only samples them, so any tick can be scrubbed.
import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { SPR, getFrame, blit, frameW, frameH } from './sprites.js';
import { spawnDust, spawnSpark, spawnRing, spawnSmoke } from './effects.js';
import { drawDialogue, updateDialogue } from './room_dialogue.js';
import { drawIntroStreet } from './delhi_life_market.js';
import { burstProp } from './props.js';
import { IDLES } from './player.js';
import { drawCigarReplay, chadCigarAt } from './cigar_smoke.js';
import { dim, flash, speedLines, aura, punchBurst } from './finisher_fx.js';

const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hash=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453;return x-Math.floor(x);};
function cell(ctx,key,i,x,y,w,h,cols,rows,face=1){
 const im=ASSETS[key];if(!im)return false;
 const fw=im.width/cols,fh=im.height/rows;i=clamp(i,0,cols*rows-1)|0;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
 ctx.drawImage(im,i%cols*fw,Math.floor(i/cols)*fh,fw,fh,-w/2,-h,w,h);ctx.restore();return true;
}
// A cell scaled to w x h, rotated by a about its local point (ax,ay), which lands on (x,y).
function turned(ctx,key,i,cols,rows,w,h,x,y,ax,ay,a,alpha=1){
 const im=ASSETS[key];if(!im)return false;const fw=im.width/cols,fh=im.height/rows;
 ctx.save();ctx.globalAlpha*=alpha;ctx.imageSmoothingEnabled=true;ctx.translate(x,y);ctx.rotate(a);
 ctx.drawImage(im,i%cols*fw,Math.floor(i/cols)*fh,fw,fh,-ax,-ay,w,h);ctx.restore();return true;
}
function actor(ctx,pose,i,x,y,face=1){const f=getFrame(SPR.player,pose,i,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
function once(c,key,t,at,fn){if(t>=at&&!c.cues.has(key)){c.cues.add(key);fn();}}
function sound(name,volume=.5){if(!G.audio.roomSfx(name,volume))G.audio.sfx(name);}


// ---- Shared set: stalls, awnings, vendors, debris, fire ----------------------------------
// Stall sheet (3x2, 1:1): 0 intact, 1 left wrecked, 2 both, 3 flattened, 4 state 2 without
// awnings; 'burn' is stall_burn.png (the ghee fireball's kitchen, burnt out; row drawn separately). The awning halves hinge on their outer posts, drop, and the wreck crossfades to the
// flattened state under a dust burst.
const STALL_W=280,STALL_H=186.5,STALL_TOP=242-STALL_H,FLATTEN=5,COUNTER_Y=STALL_TOP+124; // the counter front's top edge
function stallLayers(state,t,collapse){
 if(state<2||!collapse||t<collapse[0])return [[state,1]];
 const k=clamp((t-collapse[1])/FLATTEN,0,1);return k<1?[[4,1],[3,k]]:[[3,1]];
}
// The rest of the market row either side (3x1 sheets at 2x, bases on the stalls' street line):
// the mithai and butcher stalls (side_stalls cells 0-1; side_wreck once smashed).
const ROW=[['ic_rampage_side',0,126],['ic_rampage_side',1,476]];
// hits: {row index: tick it is smashed}; the stall shudders, then its wreck (side_wreck) fades in.
function marketRow(ctx,camX,hits={},t=0){for(const [n,[k,i,x]]of ROW.entries()){
 const d=n in hits?t-hits[n]:-1e9,q=clamp(d/3,0,1),j=d>=0&&d<14?Math.round(Math.sin(d*2.3)*3*(1-d/14)):0;
 if(q<1){ctx.save();ctx.globalAlpha*=1-q;cell(ctx,k,i,x-camX+j,226,112,136,3,1);ctx.restore();}
 if(q>0&&!cell(ctx,k+'_wreck',i,x-camX+j,226,112,136,3,1)&&q>=1)cell(ctx,k,i,x-camX,226,112,136,3,1);}}
// Stall workers stand inside their kitchens: graded to the warm interior (deeper under the awning),
// lit from the kitchen lamp, with a soft shadow thrown on the back wall. draw(c) paints the sprite
// into c at world coordinates; light = {top, bottom, lamp:[x,y,r], shadow:[dx,dy]}.
const LIGHT={curry:{top:120,bottom:225,lamp:[204,170,90],shadow:[4,-2]},chai:{top:120,bottom:225,lamp:[430,150,90],shadow:[-4,-2]}};
let stallCanvas=null;
function inStall(ctx,light,draw){
 const cv=ctx.canvas;if(!cv||typeof document==='undefined'||G.india.review?.sets===false)return draw(ctx);
 if(!stallCanvas||stallCanvas.width!==cv.width||stallCanvas.height!==cv.height){stallCanvas=document.createElement('canvas');stallCanvas.width=cv.width;stallCanvas.height=cv.height;}
 const o=stallCanvas.getContext('2d'),m=ctx.getTransform();o.setTransform(1,0,0,1,0,0);o.clearRect(0,0,cv.width,cv.height);
 o.setTransform(m);o.imageSmoothingEnabled=ctx.imageSmoothingEnabled;o.globalAlpha=1;o.globalCompositeOperation='source-over';o.filter='none';
 if(draw(o)===false)return false;
 o.save();o.globalCompositeOperation='source-atop';
 const g=o.createLinearGradient(0,light.top,0,light.bottom);g.addColorStop(0,'rgba(34,16,6,.5)');g.addColorStop(.55,'rgba(60,30,10,.22)');g.addColorStop(1,'rgba(80,40,14,.1)');o.fillStyle=g;o.fillRect(-2000,-2000,5000,5000);
 const [lx,ly,lr]=light.lamp,h=o.createRadialGradient(lx,ly,0,lx,ly,lr);h.addColorStop(0,'rgba(255,196,120,.3)');h.addColorStop(1,'rgba(255,170,90,0)');o.fillStyle=h;o.fillRect(lx-lr,ly-lr,2*lr,2*lr);
 o.restore();
 const [sx,sy]=light.shadow;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha*=.38;ctx.filter=`brightness(0) blur(${Math.max(1,m.a*1.4)}px)`;ctx.drawImage(stallCanvas,sx*m.a,sy*m.d);ctx.restore();
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(stallCanvas,0,0);ctx.restore();return true;
}
function footShadow(ctx,x,y,rx){ctx.save();ctx.fillStyle='rgba(12,8,6,.34)';ctx.beginPath();ctx.ellipse(x,y,rx,3,0,0,Math.PI*2);ctx.fill();ctx.restore();}
// Steam off a pot or pan at (x,y), drifting up in front of whoever works it.
function steam(ctx,t,x,y,w=16,a=.22){for(let i=0;i<5;i++){const p=((t+i*17)%60)/60,px=x+(hash(i*7.1)-.5)*w+Math.sin(t*.05+i)*3*p,py=y-p*34;puff(ctx,px,py,3+p*7,a*Math.sin(p*Math.PI),'235,228,215');}}
// Street sellers in front of the row (street_vendors.png, 4x3 at 2x: pani puri cart, sugarcane press,
// vegetable seller, pakora fryer; rows work A, work B, cower). They work on a slow two-pose loop
// out of step, and cower once the engine roars (in play, while CHAD is near: cower(x)).
const STREET=[[0,42,232,0],[3,964,232,14],[1,1100,232,5],[2,1170,236,9]],STREET_END=1230;
function streetVendors(ctx,camX,t,cower,minX=-Infinity){
 if(G.india.review?.sets===false)return;
 if(G.state==='intro'&&drawIntroStreet(ctx,t,cower,GH_SIDE))return;  // the 8-pose sellers and stall keepers (delhi_life_market.js)
 for(const [i,x,y,ph]of STREET){if(x<minX)continue;const scared=typeof cower==='function'?cower(x):cower,r=scared?2:Math.floor((t+ph*7)/(26+ph%3*4))%2;cell(ctx,'ic_rampage_street',r*4+i,x-camX+(scared?shiver(t+ph):0),y,104,88,4,3);}
}
// The market intact (before the entrance wrecks it).
function drawStalls(ctx,camX){
 if(G.india.review?.sets===false)return;
 marketRow(ctx,camX);cell(ctx,'ic_rampage_stalls',0,300-camX,242,STALL_W,STALL_H,3,2);
}
function awnings(ctx,t,collapse,sides=[1,-1]){
 const im=ASSETS.ic_rampage_awning;if(!im)return;
 const q=clamp((t-collapse[0])/(collapse[1]-collapse[0]),0,1),fade=1-clamp((t-collapse[1])/FLATTEN,0,1);if(fade<=0)return;
 const creak=t<collapse[0]?Math.sin(t*.9)*.012*clamp((t-collapse[0]+14)/12,0,1):0;
 for(const [side,px]of [[1,182],[-1,422.5]]){if(!sides.includes(side))continue;
  const py=STALL_TOP+45;ctx.save();ctx.globalAlpha*=fade;ctx.translate(Math.round(px),Math.round(py+q*q*40));ctx.rotate(side*(creak+.5*q*q));
  ctx.drawImage(im,(side>0?0:1)*im.width/2,0,im.width/2,im.height,160-px,STALL_TOP-py,STALL_W,STALL_H);ctx.restore();
 }
}
// The intact stalls' front plane redrawn over the vendors (stall_front.png: awning, what hangs from
// its beam, the pots on the counter and the counter itself); without it, just the counter front.
function counter(ctx){
 if(G.india.review?.sets===false)return;const f=ASSETS.ic_rampage_stall_front;
 if(f)return ctx.drawImage(f,160,STALL_TOP,STALL_W,STALL_H);
 const im=ASSETS.ic_rampage_stalls;if(!im)return;
 const sw=im.width/3,sh=im.height/2,cut=Math.round(sh*248/373);
 ctx.drawImage(im,0,cut,sw,sh-cut,160,STALL_TOP+cut/2,STALL_W,(sh-cut)/2);
}
// Debris sprites (4x4): 0-3 wood, 4-7 steel cups/bowl/lid/ladle, 8-11 food, 12-15 kettle bits.
// Sampled arcs with one bounce, then rest and fade.
function debris(ctx,t,bursts){
 const im=ASSETS.ic_rampage_debris;if(!im)return;
 for(const [n,d]of bursts.entries())for(const [i,k]of d.set.entries()){
  const a=t-d.at,seed=n*97+i*13+(d.seed||0);if(a<0||a>=150)continue;
  const s=d.spread||0,vx=s?(hash(seed)-.5)*4.4*s:(hash(seed)-.2)*3.4*(d.dir||1),vy=-2-hash(seed+1)*2.8*(d.lift||1),g=.2,floor=231+hash(seed+2)*10,x0=d.x+(hash(seed+3)-.5)*(s?120:16);
  const land=(-vy+Math.sqrt(vy*vy+2*g*Math.max(0,floor-d.y)))/g,up=-(vy+g*land)*.32,hop=-2*up/g;
  let x,y,rot;
  if(a<land){x=x0+vx*a;y=d.y+vy*a+g*a*a/2;rot=hash(seed+4)>.25?Math.floor(a/3+hash(seed+5)*4)%4:0;}
  else if(a<land+hop){const b=a-land;x=x0+vx*land+vx*.5*b;y=floor+up*b+g*b*b/2;rot=Math.floor(land/3+hash(seed+5)*4+b/4)%4;}
  else{x=x0+vx*(land+hop*.5);y=floor;rot=Math.floor(land/3+hash(seed+5)*4+hop/4)%4;}
  ctx.save();if(a>120)ctx.globalAlpha=(150-a)/30;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot*Math.PI/2);
  ctx.drawImage(im,k%4*32,Math.floor(k/4)*32,32,32,-8,-8,16,16);ctx.restore();
 }
}
// Impact blasts skip the spark and reach the full fireball within eight ticks; they end on the
// charcoal cloud (the sheet's last, violet cap reads as a flat blob this large) and fade into
// the timeline's own smoke.
const BLAST=[[2,1],[4,2],[20,3],[32,4],[44,5],[80,6]];
function explosion(ctx,t,at,x,y,w=72,impact=false){
 const age=t-at,end=impact?80:90,fade=impact?50:57;if(age<0||age>=end)return;
 ctx.save();if(age>fade)ctx.globalAlpha=1-(age-fade)/(end-fade);
 cell(ctx,'nr_explosion',impact?BLAST.find(([end])=>age<end)[1]:Math.min(7,Math.floor(age/11)),x,y,w,w*.8,8,1);ctx.restore();
}
function flashAt(ctx,t,at,x,y,r=70,len=10){
 const a=t-at;if(a<0||a>=len)return;const k=1-a/len;
 ctx.save();ctx.globalCompositeOperation='screen';
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,236,190,${.85*k})`);g.addColorStop(.35,`rgba(255,170,70,${.35*k})`);g.addColorStop(1,'rgba(255,120,40,0)');
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
// Fire sheet (4x1, 160x128 cells, base on row 108): a burning ghee puddle loop.
function fire(ctx,t,x,y,scale=1,seed=0){
 const i=Math.floor((t+seed*7)/6)%4,w=80*scale,h=64*scale;cell(ctx,'ic_intro_fire',i,x,y+10*scale,w,h,4,1);
 ctx.save();ctx.globalCompositeOperation='screen';const f=.8+.2*hash(Math.floor(t/4)+seed);
 const g=ctx.createRadialGradient(x,y-12*scale,0,x,y-12*scale,40*scale);g.addColorStop(0,`rgba(255,150,60,${.35*f})`);g.addColorStop(1,'rgba(255,120,40,0)');
 ctx.fillStyle=g;ctx.fillRect(x-40*scale,y-52*scale,80*scale,80*scale);ctx.restore();
}
// Soft smoke drawn from the timeline (particle puffs are too small to read at game scale).
function puff(ctx,x,y,r,a,rgb){
 if(a<=0||r<=0)return;const g=ctx.createRadialGradient(x-r*.2,y-r*.25,0,x,y,r);
 g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.6,`rgba(${rgb},${a*.7})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
// Dust wall across the stalls as they flatten: rolls up, spreads, settles.
function dustWall(ctx,t,at,fade=1.4){
 for(let i=0;i<10;i++){const a=t-at+3-hash(i*2.7)*4;if(a<0||a>=70)continue;const q=a/70,x=176+i*27+(hash(i)-.5)*12+(i%2?1:-1)*a*.25;
  puff(ctx,x,224-a*.35-hash(i+5)*10,16+42*Math.sqrt(q)+hash(i+2)*10,.68*(1-q)**fade,i%3?'150,128,102':'176,156,128');}
}
// A smoke column off a burning wreck: puffs every 9 ticks, rising and spreading.
function smokeColumn(ctx,t,x,y,from=-Infinity){
 for(let b=Math.floor(t/9)*9,n=0;n<11;n++,b-=9){if(b<from)break;const a=t-b,q=a/99,seed=b*.37;if(q>=1)continue;
  puff(ctx,x+Math.sin(seed)*4+a*.18+q*q*18,y-a*.75,7+q*30,.5*(1-q)*Math.min(1,a/6),q<.3?'70,62,58':'92,86,82');}
}
// Letterbox bars and a warm grade mark slow motion.
function cinemaBars(ctx,k){
 if(k<=0)return;const h=Math.round(14*k);ctx.fillStyle='#050305';ctx.fillRect(0,0,480,h);ctx.fillRect(0,270-h,480,h);
}
function grade(ctx,k,rgb='255,150,70'){
 if(k<=0)return;ctx.save();ctx.globalCompositeOperation='soft-light';ctx.fillStyle=`rgba(${rgb},${.55*k})`;ctx.fillRect(0,0,480,270);ctx.restore();
}

// The street line, the cook's pitch, CHAD's mark and cigar tip (idle_cigar 5), and his gameplay
// px per walk frame.
const LAND_Y=236,VENDOR_X=265,SX=202,CIGAR_TIP=[8.5,-80],WALK_STRIDE=10.9;

// ---- The ride-in: CHAD's chopper --------------------------------------------------------
// chopper.png (4x2 of 384x320, drawn at half size): 0 arms up, 1 cruising, 2 the power-slide (boot
// down, rear locked), 3 arms folded, 4 leg over, 5 standing beside it, 6-7 parked. Every cell has
// the rear tyre's contact 40px in on row 300; CHAD's feet in 5 are on LAND_Y. He cruises in, locks
// the rear and slides to a stop in a cloud of tyre smoke (the fork dives and rebounds), the pipes
// backfire twice, he folds his arms (glint), steps off and struts over to the stalls.
const BIKE_X=80,BIKE_Y=231,BIKE_V=4.6,RIDE={brake:56,stop:84,pop:88,glint:100,kick:118,over:130,off:144},RIDE_WALK=2.4;
// Points on the bike from the rear contact: the pipes' mouths, the skull lamp, the hubs and
// radius, the dragged boot, the shades in 3, CHAD in 5; the painted cigars' lit tips.
const BK={pipe:[4,-15],lamp:[94,-50],rear:[20,-20],front:[115,-20],r:19,boot:[96,0],shades:[41,-69],stand:50,
 tip:{0:[44,-65],1:[53,-65],2:[39,-64],3:[45,-65],4:[73,-75],5:[69,-75]}};
// He reaches his mark (SX) at RIDE.at.
RIDE.at=RIDE.off+Math.ceil((SX-BIKE_X-BK.stand)/RIDE_WALK);
const brakeD=()=>BIKE_V*(RIDE.stop-RIDE.brake)/2;
function bikeX(T){
 const b=RIDE.brake,e=RIDE.stop;if(T>=e)return BIKE_X;if(T<b)return BIKE_X-brakeD()-BIKE_V*(b-T);
 const u=T-b;return BIKE_X-brakeD()+BIKE_V*u-BIKE_V*u*u/(2*(e-b));
}
const bikeV=T=>T<RIDE.brake?BIKE_V:T<RIDE.stop?BIKE_V*(1-(T-RIDE.brake)/(RIDE.stop-RIDE.brake)):0;
// The engine's chug (1px, faster at speed), none while sliding; off once he steps off.
const bikeDy=T=>T>=RIDE.kick||(T>=RIDE.brake&&T<RIDE.stop)?0:Math.floor(T/(T<RIDE.brake?3:5))%2?-1:0;
// The fork dives under the brake and rebounds after the stop (radians about the front contact).
function pitch(T){
 if(T<RIDE.brake)return 0;if(T<RIDE.stop)return .05*Math.min(1,(T-RIDE.brake)/5);
 const a=T-RIDE.stop;return .05*Math.exp(-a/6)*Math.cos(a*.5);
}
const bikeCell=T=>T<RIDE.brake?1:T<RIDE.stop+4?2:T<RIDE.kick?3:T<RIDE.over?4:T<RIDE.off?5:6;
function chopper(ctx,i,xr,yr=BIKE_Y,a=0){
 ctx.save();ctx.translate(Math.round(xr)+BK.front[0],yr);ctx.rotate(a);cell(ctx,'ic_chopper',i,76-BK.front[0],10,192,160,4,2);ctx.restore();
}
const parkedBike=(ctx,camX=0)=>chopper(ctx,6,BIKE_X-camX);
// Spokes blurred by speed: a dark disc and three bright arcs turning with the distance covered.
function spin(ctx,x,y,v,d){
 const k=clamp(v/3,0,1);if(k<=0)return;const a=d/BK.r;ctx.save();ctx.fillStyle=`rgba(30,28,32,${.3*k})`;ctx.beginPath();ctx.arc(x,y,BK.r-5,0,Math.PI*2);ctx.fill();ctx.lineWidth=2;
 for(let n=0;n<3;n++){ctx.strokeStyle=`rgba(225,225,230,${.5*k})`;ctx.beginPath();ctx.arc(x,y,BK.r-8,a+n*2.09,a+n*2.09+1.1);ctx.stroke();}ctx.restore();
}
// Behind the bike: the skid mark, exhaust, road dust, the back half of the tyre smoke.
function rideBack(ctx,T){
 const x0=bikeX(RIDE.brake)+BK.rear[0],x1=bikeX(Math.min(T,RIDE.stop))+BK.rear[0],fade=clamp(1-(T-360)/80,0,1);
 if(T>RIDE.brake&&fade>0){ctx.save();ctx.globalAlpha=fade;ctx.fillStyle='rgba(18,14,12,.55)';ctx.fillRect(Math.round(x0),BIKE_Y,Math.round(x1-x0),2);
  ctx.fillStyle='rgba(18,14,12,.3)';ctx.fillRect(Math.round(x0+76),BIKE_Y+5,Math.round(Math.max(0,x1-x0-8)),1);ctx.restore();}
 for(let b=Math.floor(T/3)*3,n=0;n<14;n++,b-=3){if(b<0||b>=RIDE.kick)continue;const a=T-b,q=a/40;if(q>=1)continue;const px=bikeX(b)+BK.pipe[0],py=BIKE_Y+BK.pipe[1],v=bikeV(b);
  puff(ctx,px-a*(.5+v*.2),py-a*.35+Math.sin(b)*1.5,2+a*.28,(v>0?.34:.22)*(1-q),'96,90,92');
  if(v>1.5&&n%2===0)puff(ctx,bikeX(b)+BK.rear[0]-8-a*.6,BIKE_Y-2-a*.2,3+a*.3,.22*(1-q),'150,128,102');}
 tyreSmoke(ctx,T,0);
}
// Tyre smoke off the locked rear wheel: fat pale puffs that billow, lift and hang after the stop.
function tyreSmoke(ctx,T,front){
 for(let b=RIDE.brake+front;b<RIDE.stop+4;b+=2){const a=T-b,life=64+(b-RIDE.brake)*.6;if(a<0||a>=life)continue;const q=a/life,x=bikeX(b)+BK.rear[0]-4,s=hash(b*1.7);
  const lift=a*.45+q*q*22+s*6,r=4+18*Math.sqrt(q)+s*4,k=(1-q)**1.5*Math.min(1,a/3);
  puff(ctx,x-a*.3-s*8+3,BIKE_Y-1-lift*.4,r*.8,.34*k,'120,114,110');
  puff(ctx,x-a*.3-s*8,BIKE_Y-4-lift,r,.5*k,s>.5?'232,228,222':'206,200,194');}
}
// In front: the other half of the smoke, boot sparks, the backfire, the lamp, wind, glint, cigar.
function rideFront(ctx,T){
 tyreSmoke(ctx,T,1);
 const x=bikeX(T),y=BIKE_Y+bikeDy(T),v=bikeV(T),c=bikeCell(T);
 if(c<=2&&T<RIDE.stop){spin(ctx,x+BK.front[0],y+BK.front[1],v,x);if(T<RIDE.brake)spin(ctx,x+BK.rear[0],y+BK.rear[1],v,x);}
 // Boot sparks: bright streaks kicked back off the dragged heel.
 if(T>=RIDE.brake&&T<RIDE.stop+6)for(let b=T-7;b<=T;b++){if(b<RIDE.brake||b>=RIDE.stop)continue;const e=T-b,bx=bikeX(b)+BK.boot[0];
  for(let k=0;k<3;k++){const h=hash(b*3.1+k),sx=bx-e*(1.5+h*2.5),sy=BIKE_Y-e*(1+h*1.6)+.18*e*e;ctx.fillStyle=e<3?'#fff4c8':'#ffa040';ctx.fillRect(Math.round(sx),Math.round(sy),e<4?2:1,1);}}
 for(const at of [RIDE.pop,RIDE.pop+7])backfire(ctx,T,at,x);
 // The skull lamp: a warm cone down the street while the engine runs.
 const lk=T<RIDE.kick?1:clamp(1-(T-RIDE.kick)/8,0,1);if(lk>0){const lx=x+BK.lamp[0],ly=y+BK.lamp[1];ctx.save();ctx.globalCompositeOperation='screen';
  const g=ctx.createLinearGradient(lx,0,lx+110,0);g.addColorStop(0,`rgba(255,226,160,${.28*lk})`);g.addColorStop(1,'rgba(255,200,120,0)');ctx.fillStyle=g;
  ctx.beginPath();ctx.moveTo(lx,ly-2);ctx.lineTo(lx+110,ly-16);ctx.lineTo(lx+110,BIKE_Y+4);ctx.lineTo(lx,ly+3);ctx.closePath();ctx.fill();
  const r=ctx.createRadialGradient(lx,ly,0,lx,ly,9);r.addColorStop(0,`rgba(255,246,210,${.9*lk})`);r.addColorStop(1,'rgba(255,200,120,0)');ctx.fillStyle=r;ctx.fillRect(lx-9,ly-9,18,18);ctx.restore();}
 // Wind streaks past the rider at speed.
 if(v>2){ctx.save();ctx.fillStyle=`rgba(255,240,220,${.3*clamp((v-2)/2,0,1)})`;for(let i=0;i<6;i++){const d=(T*7+i*29)%90,wy=y-40-hash(i)*40;ctx.fillRect(Math.round(x+30-d),Math.round(wy),14+(i%3)*6,1);}ctx.restore();}
 if(c===3){glint(ctx,T,x+BK.shades[0],y+BK.shades[1]);const t=BK.tip[3];ctx.fillStyle=T%20<10?'#ffd070':'#ff9a40';ctx.fillRect(Math.round(x+t[0]),Math.round(y+t[1]),1,1);}
 if(T>=RIDE.off&&T<RIDE.at){const ch=strut(T);cigarSprite(ctx,ch.x+10,LAND_Y-66,T);}
}
// Two backfire pops out of the drag pipes as he kills the throttle.
function backfire(ctx,T,at,x){
 const a=T-at;if(a<0||a>=26)return;const px=x+BK.pipe[0],py=BIKE_Y+BK.pipe[1];
 if(a<6){const q=a/6;ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(px-4,py,0,px-4,py,14*(1-q)+4);g.addColorStop(0,'rgba(255,250,210,.95)');g.addColorStop(.4,'rgba(255,150,40,.8)');g.addColorStop(1,'rgba(255,80,20,0)');ctx.fillStyle=g;ctx.fillRect(px-24,py-14,28,28);
  ctx.fillStyle='#ffd070';ctx.beginPath();ctx.moveTo(px,py-2);ctx.lineTo(px-18*(1-q)-4,py-1+Math.sin(a)*2);ctx.lineTo(px,py+2);ctx.fill();ctx.restore();}
 if(a>=3){const q=(a-3)/23;puff(ctx,px-10-a*.6,py-3-a*.4,3+a*.35,.3*(1-q),'150,142,138');}
}
// Off the bike he struts over to his mark in his gameplay walk.
function strut(T){const d=(T-RIDE.off)*RIDE_WALK;return {x:Math.min(SX,BIKE_X+BK.stand+d),y:LAND_Y,pose:'walk',i:Math.floor(d/WALK_STRIDE)%6};}
function rideCues(T,c){
 once(c,'engine',T,0,()=>sound('entrance_engine',.5));
 once(c,'skid',T,RIDE.brake,()=>{sound('entrance_skid',.34);G.shake=2;});
 once(c,'skid2',T,RIDE.brake+12,()=>sound('entrance_skid',.26));
 once(c,'stop',T,RIDE.stop,()=>{sound('land',.3);G.shake=4;spawnDust(BIKE_X+BK.rear[0],236,4);spawnDust(BIKE_X+BK.front[0],236,3);});
 once(c,'pop',T,RIDE.pop,()=>sound('pistol',.2));
 once(c,'pop2',T,RIDE.pop+7,()=>sound('pistol',.14));
 once(c,'glint',T,RIDE.glint,()=>sound('parry',.12));
 once(c,'stand',T,RIDE.kick,()=>sound('entrance_stand',.3));
 once(c,'step-off',T,RIDE.over,()=>{sound('entrance_boot',.26);spawnDust(BIKE_X+BK.stand,236,2);});
 for(let k=RIDE.off+8;k<RIDE.at;k+=Math.round(3*WALK_STRIDE/RIDE_WALK))once(c,'strut'+k,T,k,()=>sound('entrance_boot',.18));
}
function rideDraw(ctx,T){
 rideBack(ctx,T);const c=bikeCell(T);chopper(ctx,c===5?6:c,bikeX(T),BIKE_Y+bikeDy(T),pitch(T));
 // Off the bike he is in his gameplay frames: standing beside it before the strut.
 if(c===5)actor(ctx,'idle_cigar',5,bikeX(T)+BK.stand,LAND_Y);
 rideFront(ctx,T);
}
// Where the cigar's lit tip is: painted on the bike, the small sprite while strutting, then
// idle_cigar 5 held on his mark.
function cigarTip(T){
 if(T<RIDE.off){const c=bikeCell(T),x=bikeX(T),y=BIKE_Y+bikeDy(T);const t=BK.tip[c]||BK.tip[5];return [x+t[0],y+t[1]];}
 if(T<RIDE.at)return [strut(T).x+17,LAND_Y-66];
 return [SX+CIGAR_TIP[0],LAND_Y+CIGAR_TIP[1]];
}
// A small lit cigar drawn where the sprite has none.
function cigarSprite(ctx,x,y,T){
 x=Math.round(x);y=Math.round(y);ctx.fillStyle='#3a1c0a';ctx.fillRect(x,y,7,2);ctx.fillStyle='#8a5028';ctx.fillRect(x,y,6,1);ctx.fillStyle='#d8b060';ctx.fillRect(x+1,y,1,2);
 ctx.fillStyle=Math.floor(T/5)%3?'#ff7a28':'#ffcf70';ctx.fillRect(x+7,y,1,2);
}
// The shades glint once he has stopped: a four-point star on the lens.
function glint(ctx,T,x,y){
 const a=T-RIDE.glint;if(a<0||a>=12)return;const r=Math.round(2+7*Math.sin(a/12*Math.PI));
 ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,250,220,.95)';ctx.fillRect(x-r,y,2*r+1,1);ctx.fillRect(x,y-r,1,2*r+1);
 ctx.fillStyle='rgba(255,240,200,.5)';ctx.fillRect(x-1,y-1,3,3);ctx.restore();
}
// CHAD's cigar smoke, the one system he smokes with everywhere (cigar_smoke.js), replayed from
// the clock. Riding in and strutting, the lit end trails wisps behind him; on his mark it trickles
// off idle_cigar 5; the drag (3) and the exhale (4) before the fight; lit in the cook's burning
// hair (LIGHT_TIP, the flame's own glow is bendEmber) with a drag, then the exhale as he
// straightens and the held smoke with its exhales until play takes over.
function cigarAt(T){
 if(T<GH.drag)return {tip:cigarTip(T),face:1,moving:T<RIDE.at};
 if(T>=GR.lit&&T<GR.up)return {tip:[BEND_X+LIGHT_TIP[0],LAND_Y+LIGHT_TIP[1]],face:1};
 const ch=T<GH.knuck||T>=GR.up?gheeChad(T):null;
 return ch?.pose==='idle_cigar'?chadCigarAt(ch.i,ch.x,LAND_Y,ch.face||1):null;
}
function chadSmoke(ctx,T){
 if(T>=GH.end)return;const ch=gheeChad(T);
 drawCigarReplay(ctx,0,T,cigarAt,{drags:[[GH.drag+6,GH.exhale-GH.drag-6],[GR.lit,GR.up-GR.lit]],exhales:[GH.exhale,GR.up+16,GR.up+80],
  trickleEvery:6,ember:ch?.pose==='idle_cigar'&&!ch.lighting});
}
// idle_cigar held (5), with an exhale (4) for 30 of every 100 ticks from `at`, and its smoke.
// On the last intro tick the player takes over mid idle_cigar (held, cell 5), as the station does.
function handOff(T,end){if(T<end-1)return;const p=G.player,i=IDLES.findIndex(a=>a.name==='idle_cigar');p.state='idleanim';p.idleAnim=i;p.t=IDLES[i].hold*5+1;}
function smoking(T,x,at,face){const a=T-at;return {x,y:LAND_Y,pose:'idle_cigar',i:a>=40&&a%100>=40&&a%100<70?4:5,face};}

// ---- The stall workers and diners ----------------------------------------------------------
// Diners at the curry counter; knocked flying, their tumble cells spin off up and to the right.
const CHAI_X=346,CHAI_Y=216,EATER=[322,362];
function flung(ctx,T,at,x,i){
 const d=T-at;if(d<0)return false;const fx=x+5.5*d,fy=196-5*d+.07*d*d;if(fx>560)return true;
 turned(ctx,'ic_intro_crowd',i,4,2,128,128,fx,fy,64,64,d*.22);return true;
}
function flies(ctx,T,x,y){ctx.fillStyle='#1d1812';for(let i=0;i<4;i++){const t=(T+i*31+x)*.13,r=4+i*1.5;ctx.fillRect(Math.round(x+Math.sin(t)*r),Math.round(y+Math.cos(t*1.7)*r*.5),1,1);}}
// Side stalls CHAD wrecks: on the hit the stall shudders for six ticks while side_wreck.png fades
// in over it, under a local dust burst.
function sideDust(ctx,t,at,x){
 for(let i=0;i<7;i++){const a=t-at-hash(i*1.9)*4;if(a<0||a>=64)continue;const q=a/64;
  puff(ctx,x+(i-3)*14+(hash(i)-.5)*8+(i-3)*a*.2,226-a*.4-hash(i+3)*10,12+34*Math.sqrt(q)+hash(i+5)*8,.7*(1-q)**1.4,i%3?'150,128,102':'176,156,128');}
}
function drain(ctx,k){if(k<=0)return;ctx.save();ctx.globalCompositeOperation='saturation';ctx.fillStyle=`rgba(128,128,128,${k})`;ctx.fillRect(0,0,480,270);ctx.restore();}
const shiver=T=>Math.floor(T/3)%2;
const workLoop=(T,chai)=>chai?[0,1,2,3,2,3,4,5,4,6,7,0][Math.floor((T+57)/12)%12]+8:[0,1,2,3,2,1,4,5,4,6,7,0][Math.floor(T/10)%12];
const chaiFlee=(ctx,T,at)=>{const f=T-at,x=CHAI_X+Math.max(0,f-10)*2.8;if(x<540)cell(ctx,'ic_rampage_chai',f<5?0:f<10?1:2+Math.floor((f-10)/5)%6,x,225,128,128,4,2);};
// The flurry lands on the chai counter at RUSH_AT on these boxing_rush frames (arm out).
const RUSH_AT=[372,196],RUSH_REACH=[2,5,7,10,12];
// The camera trails CHAD through the rampage: the mean of his last 24 positions, CAM_LEAD px from the left edge.
const CAM_LEAD=290;

// ---- The ghee fireball ---------------------------------------------------------------------
// CHAD rolls in and parks; a rat swims laps in the curry cook's frying oil. The cook fishes it out
// bare-handed, tosses it away and offers a samosa: "FRESH, SIR!" CHAD takes a long drag, blows it
// out, cracks his knuckles and charges one absurd haymaker, slow as a god: he plants (the street
// cracks under his boots), coils, and the world drains to grey while the grit lifts off the street
// round him while he trembles with the fist drawn back. One swing, a silhouette frame, and the
// colour comes back with a shockwave that sends the cook through the fireball it sets off in the
// ghee pan and up into the sky (a twinkle); the kitchen and the mithai stall go up. CHAD walks
// into the rampage: a lariat through the two diners, a flurry that levels the chai counter, and a
// shoulder charge through the butcher's; he brushes off his shoulder. The cook falls back out of
// the sky onto his knees, his hair on fire; CHAD strolls over, takes a knee beside him, relights
// his cigar in the flames, stands and blows out the smoke: "That's one crispy critter." CHAD is
// drawn in his own gameplay frames throughout; there are no close-ups.
// ghee_vendor.png (4x2, the cook facing left): 0 hand in the pan, 1 rat up, 2 the toss, 3 the samosa,
// 4 horror, 5 blown back (charred). ghee_cook.png (4x1, like it): 0 kneeling, dazed, 1 wailing,
// 2 toppling, 3 face down. ghee_hit.png: 0 punched, 1 flying, 2 tumbling.
const GH={fish:190,hold:206,toss:232,offer:250,drag:318,exhale:342,knuck:368};
GH.plant=GH.knuck+28;GH.coil=GH.plant+30;GH.swing=GH.coil+90;GH.hit=GH.swing+4;GH.fly=GH.hit+14;GH.boom=GH.hit+20;
// The charge builds in three stages; each one hits harder (shake, aura, arcs, the dark).
const chargeStage=T=>clamp(Math.floor((T-GH.coil)/30),0,2);
GH.follow=GH.fly+8;GH.shake=GH.follow+24;GH.cool=GH.shake+26;GH.star=GH.fly+58;
// The cook stands where the samosa put him; the fist lands on his face (impact cell 4's reach);
// the cocked fist; the pan he fries in; the point in the sky he vanishes at.
// CHAD's gameplay power punch: HX puts combo_power_b 2's fist on the cook's face.
const GH_COOK=280,GH_HIT_X=276,HX=GH_HIT_X-50,GH_FIST=[HX+50,LAND_Y-62],GH_COCK=[SX-2,LAND_Y-36],GH_OIL=[240,173],GH_SKY=[392,34],GH_TOSS=[293,141];
// The rampage, in CHAD's gameplay frames (x: his feet), paced so every hit gets a beat. The cook
// comes down on his knees at GR_FALL; his burning hair is COOK_HEAD from there and its near side
// COOK_SIDE; the cigar CHAD holds out (idle_cigar 1) has its tip at LIGHT_TIP from his feet, so he
// stops at BEND_X with it in the flames; once the cook wails he shuffles COOK_HOP clear of CHAD.
const GR_X={lar:252,rush:340,ram:428,through:452},GR_SPEED=1.3,GR_RUSH=5,GR_SPRINT=5,GR_FALL=[500,LAND_Y];
const COOK_HEAD=[-7,-52],COOK_SIDE=[-15,-44],LIGHT_TIP=[17,-72],BEND_X=GR_FALL[0]+COOK_HEAD[0]-LIGHT_TIP[0],COOK_HOP=16,STROLL_V=1.6;
const GR=(()=>{const at=GH.cool+40,R={at,lariat:at+Math.round((GR_X.lar-HX)/GR_SPEED)};
 R.lx=T=>mix(GR_X.lar,GR_X.rush,clamp((T-R.lariat)/52,0,1));const reach=x=>{let T=R.lariat;while(R.lx(T)+26<x)T++;return T;};
 R.hitA=reach(EATER[0]);R.hitB=reach(EATER[1]);R.rush=R.lariat+70;R.finish=R.rush+16*GR_RUSH;R.crash=R.finish+18;
 R.hits=RUSH_REACH.map(i=>R.rush+i*GR_RUSH+1);R.collapse=[R.crash+30,R.crash+58];
 R.drop=R.crash+80;R.go=R.drop+18;R.ram=R.go+Math.ceil((GR_X.ram-GR_X.rush-4)/GR_SPRINT);R.brush=R.ram+24;R.watch=R.brush+28;
 R.fall=R.brush+6;R.thud=R.fall+30;R.step=R.thud+18;R.bend=R.step+Math.ceil((BEND_X-GR_X.through)/STROLL_V);R.lit=R.bend+14;R.up=R.bend+54;
 R.quote=R.up+8;R.topple=R.up+30;R.end=R.quote+140;return R;})();
GH.end=GR.end;
const GH_SIDE={0:GH.boom+8,1:GR.ram},RAM_HIT=[444,190];
const GH_DEBRIS=[{at:GH.boom,x:GH_OIL[0],y:GH_OIL[1]-6,set:[8,9,10,11,4,5,6,7,0,1,2,3,8,10,12,13],spread:1.2,lift:1.6,seed:23},
 {at:GH.boom+8,x:126,y:186,set:[8,9,10,11,0,1,2,3,8,10,4,6],spread:1,lift:1.1,seed:3},
 {at:GR.hitA,x:EATER[0],y:210,set:[8,9,10,11,8,10],dir:1},{at:GR.hitB,x:EATER[1],y:210,set:[9,11,8,10,4,7],dir:1},
 ...GR.hits.map((at,n)=>({at,x:RUSH_AT[0]+4,y:RUSH_AT[1],set:[[4,8],[12,9],[5,10],[11,14],[7,13],[6,8],[15,11],[9,4]][n%8],dir:1,seed:n*7})),
 {at:GR.crash,x:RUSH_AT[0]+10,y:190,set:[4,5,12,15,8,11,13,4,14,1,9,15,0,2,3,6],spread:1.2,lift:1.3},{at:GR.collapse[1],x:360,y:170,set:[0,2,3,1,14,0,3,2,13,6,7,12],spread:.7,seed:5},
 {at:GR.ram,x:RAM_HIT[0],y:RAM_HIT[1],set:[0,1,2,3,4,6,8,10,0,2,5,7,9,11,1,3,12,13],spread:1.3,lift:1.4,seed:9},{at:GR.ram+5,x:540,y:204,set:[0,1,2,3,12,13],spread:.9,seed:19}];
function gheeChad(T){
 if(T<RIDE.off)return null;if(T<RIDE.at)return strut(T);
 const C=i=>({x:SX,y:LAND_Y,pose:'idle_cigar',i});
 if(T<GH.drag)return C(5);
 if(T<GH.exhale)return C(T<GH.drag+6?1:3);
 if(T<GH.knuck)return C(4);
 if(T<GH.plant)return {x:SX,y:LAND_Y,pose:'idle_knuckles',i:Math.floor((T-GH.knuck)/7)%4};
 // The charge: fist chambered, then drawn right back and held, trembling harder and harder.
 if(T<GH.coil)return {x:SX,y:LAND_Y,pose:'ragnarok_ground',i:1};
 if(T<GH.swing)return {x:SX+Math.round(Math.sin(T*1.7)*[.6,1.4,2.4][chargeStage(T)]),y:LAND_Y,pose:'combo_power_b',i:0};
 if(T<GH.hit)return {x:mix(SX,HX,.5),y:LAND_Y,pose:'combo_power_b',i:1};
 if(T<GH.follow)return {x:HX,y:LAND_Y,pose:'combo_power_b',i:2};
 if(T<GH.shake)return {x:HX,y:LAND_Y,pose:'combo_power_b',i:3};
 if(T<GH.cool)return {x:HX,y:LAND_Y,pose:'idle_knuckles',i:Math.floor((T-GH.shake)/6)%4};
 if(T<GR.at)return {x:HX,y:LAND_Y,pose:'idle_shades',i:Math.min(3,Math.floor((T-GH.cool)/8))};
 if(T<GR.lariat){const d=(T-GR.at)*GR_SPEED;return {x:HX+d,y:LAND_Y,pose:'walk',i:Math.floor(d/WALK_STRIDE)%6};}
 if(T<GR.rush)return {x:GR.lx(T),y:LAND_Y,pose:'meteor_lariat',i:Math.min(7,1+Math.floor((T-GR.lariat)/7))};
 const x=GR_X.rush;
 if(T<GR.finish){const i=Math.floor((T-GR.rush)/GR_RUSH);return {x:x+(i%2),y:LAND_Y,pose:'boxing_rush',i};}
 if(T<GR.drop)return {x:x+Math.min(4,(T-GR.finish)/3),y:LAND_Y,pose:'combo_power_finish',i:Math.min(4,Math.floor((T-GR.finish)/5))};
 // The shoulder charge: he drops the shoulder, sprints, bursts through the butcher's, shakes it off.
 if(T<GR.go)return {x:x+4+(T>=GR.go-8?T%2:0),y:LAND_Y,pose:'dash',i:0};
 if(T<GR.ram){const d=(T-GR.go)*GR_SPRINT;return {x:Math.min(GR_X.ram,x+4+d),y:LAND_Y,pose:'run',i:Math.floor(d/14)%6};}
 if(T<GR.brush){const q=clamp((T-GR.ram-3)/14,0,1);return {x:mix(GR_X.ram,GR_X.through,1-(1-q)**2),y:LAND_Y,pose:'dash',i:1};}
 if(T<GR.watch)return {x:GR_X.through,y:LAND_Y,pose:'idle_knuckles',i:Math.floor((T-GR.brush)/7)%4};
 // He lowers his shades at the cook, strolls over and holds his cigar out in the burning hair, then
 // takes a drag and blows out the smoke.
 if(T<GR.step)return {x:GR_X.through,y:LAND_Y,pose:'idle_shades',i:Math.min(3,Math.floor((T-GR.watch)/9))};
 if(T<GR.bend){const d=(T-GR.step)*STROLL_V;return {x:GR_X.through+d,y:LAND_Y,pose:'walk',i:Math.floor(d/WALK_STRIDE)%6};}
 if(T<GR.up)return {x:BEND_X,y:LAND_Y,pose:'idle_cigar',i:T<GR.bend+4?2:1,lighting:T>=GR.bend+4};
 if(T<GR.up+16)return {x:BEND_X,y:LAND_Y,pose:'idle_cigar',i:T<GR.up+4?2:3};
 if(T<GR.up+40)return {x:BEND_X,y:LAND_Y,pose:'idle_cigar',i:4};
 return smoking(T,BEND_X,GR.up+40,1);
}
// CHAD's own gameplay frames throughout.
function drawChad(ctx,ch){actor(ctx,ch.pose,ch.i,ch.x,ch.y,ch.face);}
// The cook: frying; reaching into the pan, up with the rat, the toss, the samosa, horror (shaking
// while the punch charges); then punched where he stands, behind his counter (CHAD's fist comes
// over it). The work loop is drawn facing right, so it is mirrored to face his kadai.
function gheeCook(ctx,T){
 if(T<GH.fish)return cell(ctx,'ic_rampage_work',workLoop(T),VENDOR_X,225,128,128,4,4,-1);
 if(T>=GH.fly)return;
 if(T>=GH.hit)return cell(ctx,'ic_ghee_hit',0,GH_HIT_X+(T<GH.hit+4?0:T-GH.hit-4),237,128,128,4,2);
 const f=T<GH.hold?0:T<GH.toss?1:T<GH.offer?2:T<GH.plant?3:4,x=[266,272,266,282,GH_COOK][f]+(f===4&&T>=GH.coil?shiver(T)*(T>=GH.coil+30?2:1):0);
 if(!cell(ctx,'ic_ghee_vendor',f,x,225,128,128,4,2))cell(ctx,'ic_rampage_work',workLoop(T),VENDOR_X,225,128,128,4,4,-1);
}
// Up through the fireball and away into the sky, shrinking and spinning, charred and trailing
// flame once it's through.
function flyingCook(ctx,T){
 const e=T-GH.fly,D=GH.star-GH.fly;if(e<0||e>=D)return;
 const at=q=>{const k=1-(1-q)**2;return [mix(GH_COOK+8,GH_SKY[0],k),mix(172,GH_SKY[1],k)-24*Math.sin(q*Math.PI),mix(1,.08,k**.7)];};
 const q=e/D,[x,y,s]=at(q);
 for(let j=1;j<=6;j++){const [px,py]=at(Math.max(0,q-j*.03));puff(ctx,px,py,(2+j)*s*1.6,.3*(1-j/7)*(T>=GH.boom?1:.3),'70,62,58');}
 if(T>=GH.boom+2){ctx.save();ctx.globalCompositeOperation='screen';for(let j=1;j<=7;j++){const [px,py]=at(Math.max(0,q-j*.018));puff(ctx,px,py,(4+j*.8)*s*1.5,.55*(1-j/8),j<3?'255,220,140':'255,130,40');}ctx.restore();}
 ctx.save();if(T>=GH.boom+2)ctx.filter='brightness(.45) sepia(.4)';turned(ctx,'ic_ghee_hit',e<12?1:2,4,2,128*s,128*s,x,y,64*s,64*s,e<12?-.15:(e-12)*.32);ctx.restore();
}
// The twinkle where he vanishes.
function twinkle(ctx,T){
 const a=T-GH.star;if(a<0||a>=18)return;const [x,y]=GH_SKY,r=Math.round(2+7*Math.sin(a/18*Math.PI));
 ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle='rgba(255,252,230,.95)';ctx.fillRect(x-r,y,2*r+1,1);ctx.fillRect(x,y-r,1,2*r+1);
 const d=Math.round(r*.5);for(let i=-d;i<=d;i++){ctx.fillRect(x+i,y+i,1,1);ctx.fillRect(x+i,y-i,1,1);}ctx.fillStyle='rgba(255,240,190,.6)';ctx.fillRect(x-1,y-1,3,3);ctx.restore();
}
// The samosa, knocked out of his hand by the punch, lands in the street.
function flyingSamosa(ctx,T){
 const d=T-GH.fly;if(d<0)return;const D=30,q=Math.min(1,d/D),x=mix(GH_COOK+26,334,q),y=d<D?mix(170,LAND_Y,q)-40*Math.sin(q*Math.PI):LAND_Y;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(d<D?d*.4:.3);ctx.fillStyle='#8a4c14';ctx.beginPath();ctx.moveTo(-4,2);ctx.lineTo(4,2);ctx.lineTo(0,-4);ctx.closePath();ctx.fill();
 ctx.fillStyle='#e0a040';ctx.beginPath();ctx.moveTo(-3,1);ctx.lineTo(3,1);ctx.lineTo(0,-3);ctx.closePath();ctx.fill();ctx.restore();
}
// He comes back down, blackened and spinning, his hair alight, and lands on his knees. He kneels,
// dazed, wails when the cigar goes in, and topples onto his face once CHAD straightens up.
const cookCell=T=>T<GR.up?0:T<GR.topple?1:T<GR.topple+8?2:3;
function cookHead(T){
 if(T<GR.thud){const q=(T-GR.fall)/(GR.thud-GR.fall);return [GR_FALL[0],mix(-80,GR_FALL[1]-30,q*q)-18];}
 const i=cookCell(T),b=T-GR.thud,bounce=b<4?[0,5,6,2][b]:0;
 return [GR_FALL[0]+(i?COOK_HOP:0)+[COOK_HEAD[0],-20,-26,-20][i],LAND_Y+[COOK_HEAD[1]-bounce,COOK_HEAD[1]-bounce,-26,-18][i]];
}
function fallingCook(ctx,T){
 const d=T-GR.fall;if(d<0)return;
 if(T<GR.thud){const q=d/(GR.thud-GR.fall);turned(ctx,'ic_ghee_vendor',5,4,2,128,128,GR_FALL[0],mix(-80,GR_FALL[1]-30,q*q),64,64,d*.28);return;}
 const b=T-GR.thud,h=T-GR.up,i=cookCell(T),y=GR_FALL[1]+4-(b<4?[0,5,6,2][b]:0)-(h>=0&&h<6?[3,5,6,5,3,1][h]:0),x=GR_FALL[0]+(i?COOK_HOP:0);
 if(!cell(ctx,'ic_ghee_cook',i,x,y,128,128,4,1))cell(ctx,'ic_ghee_vendor',6,x,y,128,128,4,2);
}
// His hair burns from the fireball until he's face down, then smokes; it lights his face and the street.
function burnGlow(ctx,T,x,y){
 const f=.85+.15*hash(Math.floor(T/3));ctx.save();ctx.globalCompositeOperation='screen';
 for(const [gx,gy,r,a] of [[x,y+6,22,.4],[x-4,LAND_Y-2,26,.22]]){const g=ctx.createRadialGradient(gx,gy,0,gx,gy,r);g.addColorStop(0,`rgba(255,150,60,${a*f})`);g.addColorStop(1,'rgba(255,110,30,0)');ctx.fillStyle=g;ctx.fillRect(gx-r,gy-r,2*r,2*r);}
 ctx.restore();
}
function hairFire(ctx,T){
 if(T<GR.fall)return;const [x,y]=cookHead(T),out=GR.topple+14;
 if(T<out){if(T>=GR.thud)burnGlow(ctx,T,x,y);fire(ctx,T,x,y,T<GR.thud?.34:T>=GR.bend+4&&T<GR.up?.44:.32,3);if(T>=GR.thud&&cookCell(T)<1)fire(ctx,T,GR_FALL[0]+COOK_SIDE[0]+2,LAND_Y+COOK_SIDE[1]-2,.14,5);}else smokeColumn(ctx,T,x,y-4,out-20);
}
// Charge: cracks run out from his boots as he plants; grit, pebbles and the stalls' cups lift off
// the street round him and hang there trembling until the shockwave blows them away.
const CRACKS=[...Array(11)].map((_,i)=>({x:i<7?SX-6:SX+42,a:(i<7?i/7:(i-7)/4)*Math.PI*2+hash(i)*.6,len:34+hash(i*3.1)*70,seed:i}));
function cracks(ctx,T){
 const g=clamp((T-GH.plant-2)/36,0,1);if(g<=0)return;
 ctx.save();for(const c of CRACKS){let x=c.x,y=LAND_Y+1,a=c.a;const pts=[[x,y]];
  for(let k=0;k<Math.round(9*g);k++){a+=(hash(c.seed*9+k)-.5)*.9;x+=Math.cos(a)*c.len/9;y+=Math.sin(a)*c.len/9*.2;pts.push([x,y]);}
  for(const [dy,col]of [[1,'rgba(210,180,140,.35)'],[0,'rgba(18,10,6,.9)']]){ctx.beginPath();for(const [k,[px,py]]of pts.entries())ctx[k?'lineTo':'moveTo'](Math.round(px)+.5,Math.round(py)+.5+dy);ctx.strokeStyle=col;ctx.lineWidth=1;ctx.stroke();}}
 ctx.restore();
}
const GRIT=[...Array(34)].map((_,i)=>({x:SX-100+hash(i*1.3)*240,y:LAND_Y-hash(i*2.1)*8,h:12+hash(i*4.7)*80,s:1+(i%3===0),k:i%5===0?[4,5,6,8,0,9,1][i%7]:-1}));
function grit(ctx,T){
 const a=T-GH.plant-6;if(a<0||T>=GH.fly+50)return;const im=ASSETS.ic_rampage_debris;
 for(const [n,g]of GRIT.entries()){const rise=1-Math.exp(-Math.max(0,a-(n%9)*5)/45);if(rise<=0)continue;
  let x=g.x+Math.sin(T*.9+n)*.8*rise,y=g.y-g.h*rise+Math.sin(T*.07+n)*2*rise;
  if(T>=GH.fly){const d=T-GH.fly,dx=x-GH_FIST[0],dy=y-GH_FIST[1],r=Math.hypot(dx,dy)||1;x+=dx/r*d*7;y+=dy/r*d*3+d*d*.06;}
  if(g.k>=0&&im)ctx.drawImage(im,g.k%4*32,Math.floor(g.k/4)*32,32,32,Math.round(x)-5,Math.round(y)-5,10,10);
  else{ctx.fillStyle=n%2?'#4a3a2c':'#8a7862';ctx.fillRect(Math.round(x),Math.round(y),g.s,g.s);}}
}
// Rings of air sucked in onto the cocked fist.
// The last stage of the charge: small lightning arcs crackling round his drawn-back fist.
function arcs(ctx,T){
 const t=Math.floor(T/2);ctx.save();ctx.globalCompositeOperation='screen';ctx.lineWidth=1;
 for(let n=0;n<3;n++){const a=hash(t*3+n)*Math.PI*2,r=10+hash(t*7+n)*14;let x=GH_COCK[0],y=GH_COCK[1];ctx.strokeStyle=`rgba(255,248,${190+n*20},${.6+.4*hash(t+n*5)})`;ctx.beginPath();ctx.moveTo(x,y);
  for(let k=1;k<=4;k++){x=GH_COCK[0]+Math.cos(a)*r*k/4+(hash(t*11+n*4+k)-.5)*6;y=GH_COCK[1]+Math.sin(a)*r*k/4+(hash(t*13+n*4+k)-.5)*6;ctx.lineTo(Math.round(x)+.5,Math.round(y)+.5);}ctx.stroke();}
 ctx.restore();
}
function pullRings(ctx,T){
 if(T<GH.coil+10||T>=GH.swing)return;ctx.save();ctx.globalCompositeOperation='screen';
 for(let k=0;k<3;k++){const p=((T-GH.coil+k*8)%24)/24,r=90*(1-p)+4;ctx.strokeStyle=`rgba(255,236,200,${.55*p})`;ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(GH_COCK[0],GH_COCK[1],r,r*.8,0,0,Math.PI*2);ctx.stroke();}
 ctx.restore();
}
// The punch lands: rings rip out across the whole street and a white line races along the ground.
function shockwave(ctx,T,cam){
 const d=T-GH.fly;if(d<0||d>=40)return;const x=GH_FIST[0]-cam,y=GH_FIST[1];
 ctx.save();ctx.globalCompositeOperation='screen';
 for(const [lag,w,a]of [[0,5,.9],[4,3,.6],[9,1,.4]]){const e=(d-lag)/34;if(e<0||e>=1)continue;const r=20+560*Math.sqrt(e);
  ctx.strokeStyle=`rgba(255,246,220,${a*(1-e)})`;ctx.lineWidth=w*(1-e)+1;ctx.beginPath();ctx.ellipse(x,y,r,r*.6,0,0,Math.PI*2);ctx.stroke();}
 const q=d/40,r=30+520*Math.sqrt(q);ctx.fillStyle=`rgba(255,240,210,${.75*(1-q)})`;ctx.fillRect(Math.round(x-r),LAND_Y-1,Math.round(2*r),2);ctx.restore();
}
function punchImpact(ctx,T){punchBurst(ctx,T,GH.fly,GH_FIST[0]+4,GH_FIST[1],110,0,2);}
// Oil spitting in the pan until it goes up; the shockwave throws the ghee into the flame.
function oilSpits(ctx,T){
 if(T<GH.fly){for(let i=0;i<5;i++){const p=(T+i*11)%22;if(p>6)continue;const x=GH_OIL[0]-10+hash(i*3.3+Math.floor((T+i*11)/22))*20;ctx.fillStyle=p<4?'#ffd890':'#c89040';ctx.fillRect(Math.round(x),GH_OIL[1]-2-(p>>1),1,1);}return;}
 const d=T-GH.fly;if(d>=GH.boom-GH.fly+2)return;for(let i=0;i<14;i++){const vx=(hash(i*1.7)-.5)*3,vy=-2-hash(i*2.3)*3,x=GH_OIL[0]+vx*d,y=GH_OIL[1]-2+vy*d+.12*d*d;ctx.fillStyle=i%3?'#ffd070':'#e08a20';ctx.fillRect(Math.round(x),Math.round(y),2,2);}
}
// The rat paddles circles in the oil until the cook grabs it; tossed, it lands on the chai counter and bolts.
function oilRat(ctx,T){
 const im=ASSETS.ic_rat;if(!im)return;const sw=im.width/8,sh=im.height;
 if(T<GH.fish+4){const a=T*.08,x=GH_OIL[0]+2+Math.cos(a)*6,y=GH_OIL[1];ctx.save();ctx.beginPath();ctx.rect(x-24,y-20,48,21);ctx.clip();
  ctx.translate(Math.round(x),Math.round(y+8));if(Math.sin(a)<0)ctx.scale(-1,1);ctx.drawImage(im,Math.floor(T/5)%8*sw,0,sw,sh,-18,-19,36,19);ctx.restore();
  for(let i=0;i<3;i++){const r=(T*.35+i*5)%14;ctx.fillStyle=`rgba(255,214,120,${.7*(1-r/14)})`;ctx.fillRect(Math.round(x-r),Math.round(y+1),Math.round(2*r),1);}
  const sp=T%20;if(sp<6)for(let i=0;i<3;i++){ctx.fillStyle='#ffe0a0';ctx.fillRect(Math.round(x-3+i*3+(i-1)*sp*.6),Math.round(y-1-sp*(1.2-sp*.2)),1,1);}return;}
 const d=T-GH.toss-4;if(d<0)return;
 if(d<22){const q=d/22,x=mix(GH_TOSS[0],338,q),y=mix(GH_TOSS[1],164,q)-26*Math.sin(q*Math.PI);ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(d*.5);ctx.drawImage(im,3*sw,0,sw,sh,-15,-7,30,13);ctx.restore();return;}
 const e=d-22,x=338+e*2.6;if(x<470){ctx.save();ctx.translate(Math.round(x),164);ctx.drawImage(im,Math.floor(e/2)%8*sw,0,sw,sh,-15,-13,30,13);ctx.restore();}
}
// The fireball: the blast out of the pan, a flame column that swells over the kitchen and settles
// into fires on the burnt stall (they keep burning in play).
const GH_FIRES=[[212,198,.42],[250,190,.36],[284,197,.46],[186,214,.3]];
function gheeFire(ctx,T){
 const d=T-GH.boom;if(d<0)return;
 explosion(ctx,T,GH.boom,GH_OIL[0]-10,GH_OIL[1]+44,230,true);
 if(d<80){const k=d<6?d/6:1-(d-6)/74;for(const [dx,dy,m]of [[0,0,1],[-40,10,.8],[30,8,.75],[-16,-20,.7],[14,-30,.55]])fire(ctx,T,GH_OIL[0]+dx,GH_OIL[1]+14+dy,1.5*m*k,Math.abs(dx));}
 stallFires(ctx,T,clamp((d-24)/30,0,1));
}
function stallFires(ctx,t,k){if(k>0)for(const [x,y,s]of GH_FIRES)fire(ctx,t,x,y,s*k,x);}
function gheeSmoke(ctx,T){
 const c=T-GH.cool;if(c>=0&&c<50)for(let i=0;i<5;i++){const a=c-i*3;if(a<0)continue;const q=a/40;if(q>=1)continue;puff(ctx,SX+18+a*.5,LAND_Y-90-a*.7,2+q*9,.4*(1-q),'220,215,210');}
}
// The stall pair split at the middle post: the curry half burns at the fireball, the chai half is
// wrecked by the flurry and flattened with its awning.
const STALL_MID=304;
function halfStall(ctx,camX,key,i,cols,rows,left,a=1){
 if(a<=0)return;ctx.save();ctx.globalAlpha*=a;ctx.beginPath();if(left)ctx.rect(-1e4,-1e4,STALL_MID-camX+1e4,3e4);else ctx.rect(STALL_MID-camX,-1e4,1e4,3e4);ctx.clip();
 cell(ctx,key,i,300-camX,242,STALL_W,STALL_H,cols,rows);ctx.restore();
}
function gheeStalls(ctx,T,camX,front){
 const burn=clamp((T-GH.boom-3)/6,0,1);
 if(front){
  if(burn<1){ctx.save();ctx.beginPath();ctx.rect(-1e4,-1e4,STALL_MID-camX+1e4,3e4);ctx.clip();ctx.globalAlpha*=1-burn;counter(ctx);ctx.restore();}
  if(T<GR.crash){ctx.save();ctx.beginPath();ctx.rect(STALL_MID-camX,-1e4,1e4,3e4);ctx.clip();counter(ctx);ctx.restore();}
  else if(T>=GR.collapse[0])awnings(ctx,T,GR.collapse,[-1]);
  return;}
 if(G.india.review?.sets===false)return;
 marketRow(ctx,camX,GH_SIDE,T);
 halfStall(ctx,camX,'ic_rampage_stalls',0,3,2,true,1-burn);halfStall(ctx,camX,'ic_rampage_stall_burn',0,1,1,true,burn);
 if(T<GR.crash)halfStall(ctx,camX,'ic_rampage_stalls',0,3,2,false);else for(const [c,a]of stallLayers(2,T,GR.collapse))halfStall(ctx,camX,'ic_rampage_stalls',c,3,2,false,a);
}
function gheeEaters(ctx,T){
 for(const [n,x]of EATER.entries()){const hit=n?GR.hitB:GR.hitA;if(T>=hit){flung(ctx,T,hit,x,6+n);continue;}
  const shocked=T>=GH.coil;footShadow(ctx,x,239,13);cell(ctx,'ic_intro_crowd',n*2+(shocked?0:Math.floor((T+n*13)/22)%2),x+(shocked?shiver(T+n):0),240,128,128,4,2);if(!shocked)flies(ctx,T,x-8,200);}
}
// Camera: still until the rampage, then it trails CHAD (averaged, so it never jerks), and at the
// end eases onto the play camera.
const GH_CAM_MAX=BEND_X-CAM_LEAD;
function gheeCam(T){let a=0;for(let k=0;k<24;k++){const t=T-k,ch=t>=GR.at?gheeChad(t):null;a+=ch?clamp(ch.x-CAM_LEAD,0,GH_CAM_MAX):0;}return a/24;}
function updateGhee(T,c){
 const s=G.india,p=G.player,ch=gheeChad(T);p.x=ch?ch.x:bikeX(T)+BK.stand;p.y=LAND_Y;p.face=1;
 c.scare=T>=GH.plant;
 rideCues(T,c);
 for(const k of [140,168])once(c,'squeak'+k,T,k,()=>sound('blip',.12));
 once(c,'fish',T,GH.fish+4,()=>{G.audio.splat();sound('blip',.14);});
 once(c,'toss',T,GH.toss+4,()=>sound('whiff',.24));
 once(c,'rat-land',T,GH.toss+26,()=>sound('blip',.16));
 once(c,'offer',T,GH.offer,()=>sound('room_page',.2));
 if(T>=GH.offer+4&&T<GH.exhale)updateDialogue('FRESH, SIR!',T-GH.offer-4,{remaining:GH.exhale-T});
 once(c,'drag',T,GH.drag+4,()=>sound('parry',.06));
 once(c,'exhale',T,GH.exhale,()=>sound('whiff',.1));
 once(c,'knuck',T,GH.knuck+8,()=>sound('knuckle',.4));
 // The charge: the boot plants and the street cracks; a rumble that builds under every cut.
 once(c,'plant',T,GH.plant,()=>{sound('entrance_boot',.4);sound('entrance_crack',.45);G.shake=3;spawnDust(SX-6,236,4);spawnDust(SX+42,236,3);});
 once(c,'charge',T,GH.coil,()=>{sound('charge_arm',.55);sound('room_shaker',.3);});
 once(c,'charge2',T,GH.coil+30,()=>{sound('super',.4);sound('room_shaker',.35);sound('heavy',.4);G.shake=5;});
 once(c,'charge3',T,GH.coil+60,()=>{sound('charge_arm',.6);sound('heavy',.55);sound('entrance_crack',.4);G.shake=7;});
 for(let k=GH.plant+6;k<GH.swing;k+=6)once(c,'rumble'+k,T,k,()=>{G.shake=Math.max(G.shake,k<GH.coil?1:1+chargeStage(k));});
 once(c,'swing',T,GH.swing,()=>{sound('whiff',.6);sound('dash',.3);});
 once(c,'hit',T,GH.hit,()=>{G.shake=14;sound('slam',.75);sound('heavy',.6);sound('punch',.5);});
 once(c,'shock',T,GH.fly,()=>{G.shake=16;sound('train_blast',.5);sound('heavy',.5);spawnRing(GH_FIST[0],GH_FIST[1],'#fff1c8');spawnSpark(GH_FIST[0]+4,GH_FIST[1]);spawnSpark(GH_FIST[0]+8,GH_FIST[1]-6);for(let x=60;x<=440;x+=40)spawnDust(x,236,4);});
 once(c,'scream',T,GH.fly+2,()=>sound('edie1',.45));
 once(c,'boom',T,GH.boom,()=>{c.damage=1;s.marketBroken=true;G.shake=12;sound('train_blast',.72);sound('room_glass',.3);spawnSmoke(GH_OIL[0],170,7);spawnSmoke(GH_OIL[0]-40,190,5);spawnRing(GH_OIL[0],GH_OIL[1],'#ffd08a');for(const x of [200,250,300,350])spawnDust(x,234,4);});
 once(c,'mithai',T,GH_SIDE[0],()=>{sound('slam',.4);sound('room_glass',.22);spawnDust(126,232,6);spawnSmoke(126,200,3);});
 once(c,'star',T,GH.star,()=>sound('parry',.2));
 for(let k=GR.at+6;k<GR.lariat;k+=16)once(c,'step'+k,T,k,()=>sound('entrance_boot',.18));
 once(c,'lariat',T,GR.lariat,()=>{sound('whiff',.45);spawnDust(GR_X.lar,236,4);});
 for(const k of ['hitA','hitB'])once(c,'hit-'+k,T,GR[k],()=>{G.shake=5;sound('heavy',.55);sound(k==='hitA'?'ehurt1':'ehurt3',.35);spawnSpark(k==='hitA'?EATER[0]:EATER[1],200);spawnDust(GR.lx(GR[k]),236,3);});
 for(const [n,t]of GR.hits.entries())once(c,'rush'+n,T,t,()=>{G.shake=2;sound(n%2?'heavy':'punch',.36);if(n%2)sound('room_glass',.14);spawnSpark(RUSH_AT[0]+(n%3-1)*5,RUSH_AT[1]+(n%2?6:-4));});
 once(c,'crash',T,GR.crash,()=>{c.damage=2;G.shake=10;sound('entrance_slam',.62);sound('entrance_heavy',.5);sound('room_glass',.35);spawnSpark(RUSH_AT[0]+6,194);spawnRing(RUSH_AT[0]+6,196,'#fff1c8');spawnSmoke(400,210,4);for(const x of [330,370,410,450])spawnDust(x,234,4);});
 once(c,'creak',T,GR.collapse[0]-10,()=>sound('room_chair',.3));
 once(c,'dustwall',T,GR.collapse[1]-2,()=>{for(let x=300;x<=420;x+=30)spawnDust(x,236,3);});
 once(c,'flatten',T,GR.collapse[1],()=>{G.shake=6;sound('entrance_slam',.45);spawnSmoke(340,222,5);spawnSmoke(410,226,4);});
 // Shoulder charge.
 once(c,'drop',T,GR.drop,()=>{sound('entrance_boot',.3);sound('knuckle',.25);});
 once(c,'go',T,GR.go,()=>{sound('dash',.45);sound('whiff',.3);});
 for(let k=GR.go;k<GR.ram;k+=3)once(c,'sprint'+k,T,k,()=>{spawnDust(ch?ch.x-10:GR_X.rush,236,2);if((k-GR.go)%6===0)sound('entrance_boot',.22);});
 once(c,'ram',T,GR.ram,()=>{G.shake=12;sound('entrance_slam',.7);sound('entrance_heavy',.55);sound('room_glass',.35);sound('train_blast',.25);spawnSpark(RAM_HIT[0],RAM_HIT[1]);spawnRing(RAM_HIT[0],RAM_HIT[1],'#fff1c8');spawnSmoke(476,214,6);for(const x of [436,466,496])spawnDust(x,232,5);});
 once(c,'cart',T,GR.ram+5,()=>{for(const pr of G.props)if(!pr.dead&&Math.abs(pr.x-540)<30){pr.broken=pr.dead=true;sound('heavy',.4);burstProp(pr,1);}});
 once(c,'brush',T,GR.brush+4,()=>sound('whiff',.12));
 // The cook comes back down, alight; CHAD lights up off him.
 once(c,'fall',T,GR.fall,()=>{sound('whiff',.35);sound('edie2',.3);});
 once(c,'thud',T,GR.thud,()=>{G.shake=6;sound('slam',.5);sound('land',.45);sound('ehurt2',.4);spawnDust(GR_FALL[0],236,6);spawnSmoke(GR_FALL[0],214,4);});
 once(c,'shades',T,GR.watch+6,()=>sound('parry',.06));
 once(c,'bend',T,GR.bend,()=>sound('whiff',.12));
 once(c,'light',T,GR.lit,()=>sound('parry',.14));
 for(const k of [GR.lit+10,GR.lit+22])once(c,'draw'+k,T,k,()=>sound('whiff',.06));
 once(c,'puff',T,GR.up+4,()=>sound('whiff',.12));
 once(c,'voice',T,GR.quote,()=>G.audio.voice('duke_crispy_critter',1900,true));
 once(c,'topple',T,GR.topple+8,()=>{sound('land',.4);spawnDust(GR_FALL[0]-30,236,4);});
 G.camX=mix(gheeCam(T),Math.max(0,p.x-255),ease(clamp((T-GH.end+40)/40,0,1)));
 handOff(T,GH.end);
}
// CHAD's cigar tip glowing as he draws on it in the flames.
function bendEmber(ctx,T,ch){
 if(!ch?.lighting||T<GR.lit)return;const x=ch.x+LIGHT_TIP[0],y=LAND_Y+LIGHT_TIP[1],a=T-GR.lit,k=a%12<6?1:.55,r=a<8?10:5+2*k;
 ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,140,50,${.85*k})`);g.addColorStop(1,'rgba(255,90,20,0)');ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
 ctx.fillStyle=k>.9?'#ffe090':'#ff8a30';ctx.fillRect(Math.round(x),Math.round(y),1,1);
}
function drawGhee(ctx,T,c){
 const s=G.india,act=s.review?.actors!==false;
 gheeStalls(ctx,T,0,false);
 if(act){inStall(ctx,LIGHT.curry,cx=>gheeCook(cx,T));if(T<GH.boom)inStall(ctx,LIGHT.chai,cx=>cell(cx,'ic_rampage_work',workLoop(T,true),CHAI_X,CHAI_Y,128,128,4,4));else chaiFlee(ctx,T,GH.boom);}
 gheeStalls(ctx,T,0,true);
 sideDust(ctx,T,GH_SIDE[0],126);sideDust(ctx,T,GH_SIDE[1],476);
 streetVendors(ctx,0,T,x=>T>=GH.plant&&(T<GR.end||Math.abs(G.player.x-x)<110));
 if(!act)return;
 cracks(ctx,T);
 if(T<GH.boom){steam(ctx,T,GH_OIL[0]+6,GH_OIL[1]-2,22,.2);steam(ctx,T+30,402,150,8,.16);}
 oilSpits(ctx,T);oilRat(ctx,T);gheeFire(ctx,T);flyingCook(ctx,T);gheeEaters(ctx,T);
 rideDraw(ctx,T);gheeSmoke(ctx,T);
 dustWall(ctx,T,GR.collapse[1],3);
 fallingCook(ctx,T);
 const ch=gheeChad(T),behind=T>=GR.fall&&cookCell(T)>=1;if(behind)hairFire(ctx,T);
 if(ch){
  drawChad(ctx,ch);bendEmber(ctx,T,ch);
  // Firelight on him from the burning kitchen behind.
  const d=T-GH.boom;if(d>=0&&d<220){const k=(1-d/220)*.5;ctx.save();ctx.globalCompositeOperation='screen';const g=ctx.createRadialGradient(ch.x-30,LAND_Y-50,0,ch.x-30,LAND_Y-50,80);g.addColorStop(0,`rgba(255,140,50,${k})`);g.addColorStop(1,'rgba(255,100,30,0)');ctx.fillStyle=g;ctx.fillRect(ch.x-120,LAND_Y-130,200,140);ctx.restore();}
 }
 if(!behind)hairFire(ctx,T);chadSmoke(ctx,T);
 grit(ctx,T);punchImpact(ctx,T);twinkle(ctx,T);flyingSamosa(ctx,T);
 debris(ctx,T,GH_DEBRIS);flashAt(ctx,T,GH.boom,GH_OIL[0],GH_OIL[1],150,16);flashAt(ctx,T,GH_SIDE[0],126,186,80,10);
 flashAt(ctx,T,GR.crash,RUSH_AT[0]+6,196,90,12);flashAt(ctx,T,GR.ram,RAM_HIT[0],RAM_HIT[1],110,14);for(const t of GR.hits)flashAt(ctx,T,t,RUSH_AT[0],RUSH_AT[1],26,5);
 if(T>=GH.offer+4&&T<GH.exhale)drawDialogue(ctx,{text:'FRESH, SIR!',x:250,bottom:140,age:T-GH.offer-4,remaining:GH.exhale-T,width:110});
}
// Screen space. The charge drains the world to grey and dims it; only CHAD keeps his colour,
// burning, with the air pulled in on his fist, between the close-ups. The hit is one white frame
// with the two of them cut out in black, then the impact panel; the colour comes back with the
// shockwave, and the fireball grades the scene warm.
function gheeOverlay(ctx,T){
 const cam=G.camX||0;
 if(T>=GH.plant&&T<GH.hit){
  const k=clamp((T-GH.plant)/30,0,1),ch=gheeChad(T),c=T>=GH.coil?T-GH.coil:-1,st=c<0?-1:chargeStage(T),per=c<0?30:Math.round(20-12*c/(GH.swing-GH.coil)),beat=c<0?0:Math.max(0,1-(c%per)/5);
  drain(ctx,.94*k);dim(ctx,.32*k+(st===2?.22*clamp((c-60)/20,0,1):0));
  ctx.save();ctx.translate(-cam,0);aura(ctx,ch.x-4,LAND_Y-50,46+16*k+8*st+10*beat,T,.25+.55*k+.25*beat);drawChad(ctx,ch);pullRings(ctx,T);if(st===2)arcs(ctx,T);ctx.restore();
  if(T>=GH.coil+40&&T<GH.swing)speedLines(ctx,GH_COCK[0]-cam,GH_COCK[1],T,.55*clamp((T-GH.coil-40)/30,0,1));
 }
 if(T>=GH.swing&&T<GH.hit)speedLines(ctx,0,0,T,.8,1);
 if(T===GH.hit||T===GH.hit+1){flash(ctx,T===GH.hit?.92:.5);if(T===GH.hit){ctx.save();ctx.beginPath();ctx.rect(0,0,480,COUNTER_Y);ctx.clip();cutout(ctx,'ic_ghee_hit',0,GH_HIT_X-cam,237,128,128,4,2);ctx.restore();cutoutFrame(ctx,getFrame(SPR.player,'combo_power_b',2,1),HX-cam,LAND_Y);}}
 const bars=T<GH.plant?0:T<GH.fly?clamp((T-GH.plant)/10,0,1):clamp(1-(T-GH.fly-30)/10,0,1);cinemaBars(ctx,bars);
 if(T===GH.fly||T===GH.fly+1)flash(ctx,T===GH.fly?.75:.35);
 shockwave(ctx,T,cam);
 if(T>=GR.go&&T<GR.ram)speedLines(ctx,0,0,T,.45,1);
 const b=T-GH.boom;if(b>=0){if(b<2)flash(ctx,b?.35:.7,'255,244,220');if(b<260)grade(ctx,.55*(1-b/260),'255,140,60');}
 for(const [at,a]of [[GR.hitA,.22],[GR.hitB,.22],[GR.crash,.5],[GR.crash+1,.25],[GR.collapse[1],.3],[GR.ram,.6],[GR.ram+1,.3],[GR.thud,.25]])if(T===at)flash(ctx,a);
}
// The curry counter as a flat black cut-out: the cook is behind it in the impact frame.
// A sheet cell as a flat black cut-out (the impact frame).
function cutout(ctx,key,i,x,y,w,h,cols,rows){
 const im=ASSETS[key];if(!im||typeof document==='undefined')return;const fw=im.width/cols,fh=im.height/rows,c=document.createElement('canvas');c.width=fw;c.height=fh;const o=c.getContext('2d');
 o.drawImage(im,i%cols*fw,Math.floor(i/cols)*fh,fw,fh,0,0,fw,fh);o.globalCompositeOperation='source-in';o.fillStyle='#120a08';o.fillRect(0,0,fw,fh);ctx.drawImage(c,Math.round(x-w/2),Math.round(y-h),w,h);
}
function cutoutFrame(ctx,f,x,y){
 if(!f||typeof document==='undefined')return;const w=frameW(f),h=frameH(f),c=document.createElement('canvas');c.width=w*2;c.height=h*2;const o=c.getContext('2d');
 o.scale(2,2);blit(o,f,0,0);o.globalCompositeOperation='source-in';o.fillStyle='#120a08';o.fillRect(0,0,w,h);ctx.drawImage(c,Math.round(x-w/2),Math.round(y-h+4),w,h);
}
// Play continues on the intro's last frame: the same layers, drawn in world space.
function gheeAftermath(ctx,camX,t){
 ctx.save();ctx.translate(-camX,0);gheeStalls(ctx,GH.end,0,true);stallFires(ctx,t,1);
 parkedBike(ctx);fallingCook(ctx,GH.end);const [x,y]=cookHead(GH.end);smokeColumn(ctx,t,x,y-4);ctx.restore();
}

// ---- Entry points --------------------------------------------------------------------------
export const DELHI_INTRO_TICKS=GH.end;
// First and second stall contact (the fireball burns one kitchen), and the flatten.
export const DELHI_ACT_TIMING=Object.freeze({hit1:GH.boom,hit2:GR.crash,flat:GR.collapse[1],voices:1,first:1});
export const DELHI_INTRO_BEATS=Object.freeze([[0,'Ride in'],[RIDE.kick,'Dismount'],[GH.fish,'Rat'],[GH.offer,'Fresh, sir'],[GH.drag,'Drag'],[GH.knuck,'Knuckles'],[GH.plant,'Plant'],[GH.coil,'Charge'],[GH.hit,'Haymaker'],[GH.fly,'Shockwave'],[GH.boom,'Fireball'],[GH.star,'Twinkle'],[GR.lariat,'Lariat'],[GR.rush,'Chai flurry'],[GR.crash,'Crash'],[GR.go,'Shoulder charge'],[GR.ram,'Butcher stall'],[GR.thud,'Cook lands'],[GR.bend,'Light'],[GR.quote,'Crispy critter']]);
export function updateMarketEntrance(T){
 const s=G.india,p=G.player;s.t=T;
 if(!s.marketIntro||T===0)s.marketIntro={t:0,cues:new Set(),damage:0,scare:false};
 const c=s.marketIntro;c.t=T;G.stage.introTicks=DELHI_INTRO_TICKS;
 p.face=1;p.z=p.vx=p.vz=0;p.invuln=10;p.state='idle';G.camX=0;
 updateGhee(T,c);
}
export function drawMarketEntrance(ctx,T){
 const c=G.india.marketIntro;if(c)drawGhee(ctx,T,c);
}
export function drawMarketOverlay(ctx,T){
 if(G.india.marketIntro&&G.india.review?.fx!==false)gheeOverlay(ctx,T);
}
// Persistent aftermath once play begins.
export function drawMarketAftermath(ctx,camX){
 const s=G.india;if(camX>=STREET_END||G.state==='intro')return;
 if(s.marketBroken){ctx.save();ctx.translate(-camX,0);gheeStalls(ctx,GH.end,0,false);ctx.restore();}
 else drawStalls(ctx,camX);
 streetVendors(ctx,camX,G.time||0,x=>s.marketBroken&&Math.abs(G.player.x-x)<110);
 if(s.marketBroken&&s.review?.sets!==false)gheeAftermath(ctx,camX,s.t);
}
