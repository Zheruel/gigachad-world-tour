// The Dredger's finisher, "Last Load", on a zero-based clock after the shared entry (camera 6000), all
// in gameplay frames. The beaten Thekedar backs off and radios the scrap magnet down on CHAD. CHAD
// doesn't move: he catches the falling magnet overhead, stands up under it and rips it off its cable,
// then pitches it over the Thekedar, whose iron hook snaps him onto its face, kicking. CHAD takes the
// snapped cable, whirls the loaded magnet round his head and hurls it into the cab. The dredger goes up in a chain of blasts and
// folds into the river; with the wreck going down behind him CHAD lights a cigar off his Zippo.
import {G,clamp} from './engine.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {getAIFrame} from './aiframes.js';
import {spawnDust,spawnSpark,spawnShock,spawnRing,spawnSmoke,spawnDebris} from './effects.js';
import {dim,flash,speedLines,aura,silhouette,punchBurst,gore,bloodSpray,bloodArc,crackFlash,tooth,bloodDecal} from './finisher_fx.js';
import {drawMagnetArt} from './dredger_magnet.js';
import {drawDialogue,updateDialogue} from './room_dialogue.js';
import {drawCigarReplay,chadCigarAt} from './cigar_smoke.js';
import {drawContactShadow} from './contact_shadow.js';

export const DF=Object.freeze({call:16,drop:44,lock:62,catch:80,stand:118,rip:136,toss:156,clamp:176,walk:188,take:210,spin:222,
 release:292,impact:314,tilt:352,collapse:392,splash:400,cigar:404,quote:470,end:660});
// The lighting (chad_dredge_light 0-7): cigar out, in the teeth with the Zippo, flicked open, cupped to it,
// the draw (it is lit), snapped shut, head back to exhale, then the folded-arms hold.
export const DL=Object.freeze({frames:[404,414,424,434,446,462,470,498],lit:446,drag:16,exhale:472});
// Marks relative to the camera: CHAD's spot, the Thekedar's daze (he holds it: no slide back), the cab glass.
export const DM=Object.freeze({chad:190,home:262,back:262,take:208,cab:[352,78],floor:236});
export const DF_BLASTS=[0,10,26,38,52,66,78,90,104].map(d=>DF.impact+d);
export const DF_DAMAGE=[DF.impact,DF.tilt,DF.collapse];
const CALL='MAGNET! FLATTEN HIM!',CALL_T=[DF.call,DF.drop+14];
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const track=(keys,t)=>{let i=0;while(i+1<keys.length&&t>keys[i+1][0])i++;if(i===keys.length-1)return keys[i][1];const [a,va]=keys[i],[b,vb]=keys[i+1];return mix(va,vb,ease((t-a)/(b-a)));};
const catchArt=()=>!!getAIFrame('player','dredge_catch'),loadedArt=i=>getAIFrame('dl_grab','magnet_loaded')?.f[i%2]||null,gapeArt=()=>!!getAIFrame('dl_thekedar','gape');
function actor(ctx,set,pose,i,x,y,face=1){const f=getFrame(SPR[set],pose,i,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));return f;}

// Measured on the registered chad_dredge_catch1/2 (logical px from his feet): where his palms carry the bowl.
const PALMS=[[-2,-90],[-9,-109]],LAND_DY=5;   // the magnet's face sits LAND_DY under its lip point
// The whirl: CHAD's raised fist holds the snapped cable; the grab orbits his head on it.
const HANDS=[22,-52],FIST=[10,-78];   // fist on special 3 (the fallback whirl)
// The hammer throw: CHAD spins in place (chad_dredge_spin, a quarter turn a frame), fists locked on the cable
// stub; the loaded grab orbits him flat out at fist height on a long taut cable, nearer and larger on the
// near side, behind him on the far side. SPIN_FIST: each frame's fists (logical px from his feet).
const ORBIT={r:80,ry:14,k:.84,depth:.12},SPIN_FIST=[[28,-68],[17,-69],[-24,-68],[-20,-68]];
const spinArt=()=>!!getAIFrame('player','dredge_spin');
// Orbit angle: 0 is out to his right, positive toward the viewer. It turns front-right, back-right, back-left, front-left.
const orbitA=t=>-spinAngle(t);
function spinFrame(t){const a=Math.atan2(Math.sin(orbitA(t)),Math.cos(orbitA(t)));return a>=0?(a<Math.PI/2?0:3):(a>-Math.PI/2?1:2);}
function spinAngle(t){
 // Three turns from his right, slow to fast, ending out to his right again as he lets go.
 const q=clamp((t-DF.spin)/(DF.release-DF.spin),0,1);return Math.PI*6*Math.pow(q,1.7);
}

// CHAD: x and pose.
// His fists on the cable during the whirl (world), from the frame he is in.
function spinHand(t,c){if(!spinArt())return [c+FIST[0],DM.floor+FIST[1]];const f=SPIN_FIST[spinFrame(t)];return [c+f[0],DM.floor+f[1]];}
function chadX(t){return track([[0,DM.chad],[DF.walk,DM.chad],[DF.take-4,DM.take],[600,DM.take]],t);}
export function dredgerChad(t){
 const x=chadX(t);let pose='idle',i=Math.floor(t/10)%4;
 if(t>=DF.call&&t<DF.drop)pose='idle_shades',i=Math.min(3,Math.floor((t-DF.call)/7));
 else if(t>=DF.drop&&t<DF.catch)pose='idle_shades',i=3;                                         // he doesn't move
 else if(t>=DF.catch&&t<DF.stand)[pose,i]=catchArt()?['dredge_catch',0]:['suplex',0];         // caught, in a deep squat
 else if(t>=DF.stand&&t<DF.toss)[pose,i]=catchArt()?['dredge_catch',1]:['suplex',0];          // stands up under it
 else if(t>=DF.toss&&t<DF.toss+6)[pose,i]=['throw',0];
 else if(t>=DF.toss+6&&t<DF.walk)[pose,i]=['throw',1];
 else if(t>=DF.walk&&t<DF.take-4)[pose,i]=['walk',Math.floor((t-DF.walk)/4)%6];
 else if(t>=DF.take-4&&t<DF.spin)[pose,i]=['grab',0];
 else if(t>=DF.spin&&t<DF.release)[pose,i]=spinArt()?['dredge_spin',spinFrame(t)]:['special',3];   // the whirl
 else if(t>=DF.release&&t<DF.release+30)[pose,i]=['throw',1];
 else if(t>=DF.release+30&&t<DF.cigar)[pose,i]=['idle_shades',3];
 else if(t>=DF.cigar)[pose,i]=lightArt()?['dredge_light',lightFrame(t)]:['idle_cigar',cigarFrame(t)];
 return {x,pose,i};
}
// idle_cigar from DF.cigar: he takes it out and bites it, then waits, hands down, for the cable's sparks;
// it catches, he draws, throws his head back to exhale and holds it lit.
const CIG_PERIOD=12;
function cigarFrame(t){const e=t-DF.cigar;return e<CIG_PERIOD?1:e<CIG_PERIOD*3?2+((e/CIG_PERIOD)|0)-1:t<DL.exhale?5:t<DL.exhale+30?4:5;}
const lightArt=()=>!!getAIFrame('player','dredge_light');
function lightFrame(t){let i=0;while(i<7&&t>=DL.frames[i+1])i++;return i;}
// The cigar's end and lips per lighting frame (logical px from his feet, facing right); unlit before DL.lit.
const LIGHT_CIGAR=[null,null,null,{tip:[7,-75]},{tip:[13.5,-76],mouth:[5,-77]},{tip:[9,-73.5],mouth:[4,-76]},{tip:[14.5,-78],mouth:[6,-77.5]},{tip:[13.5,-77.5],mouth:[6,-76.5]}];
function cigarAt(t,x){
 if(t<DL.lit)return null;
 if(!lightArt())return chadCigarAt(cigarFrame(t),x,DM.floor,1);
 const f=LIGHT_CIGAR[lightFrame(t)];if(!f)return null;const pt=p=>p&&[x+p[0],DM.floor+p[1]];return {tip:pt(f.tip),mouth:pt(f.mouth||f.tip),face:1};
}
// The Zippo's flame while it is open (frames 2-4): a flicker and a warm glow on him and the deck.
const FLAME=[null,null,[15,-69],[8,-68],[10,-70]];
function zippoGlow(ctx,t,x){
 if(!lightArt()||t<DL.frames[2]||t>=DL.frames[5])return;const f=FLAME[lightFrame(t)];if(!f)return;
 const fx=x+f[0],fy=DM.floor+f[1],k=.85+.15*Math.sin(t*1.7)+.08*hash(t);
 ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createRadialGradient(fx,fy,0,fx,fy,26*k);g.addColorStop(0,'rgba(255,190,90,.42)');g.addColorStop(.5,'rgba(255,140,50,.14)');g.addColorStop(1,'rgba(255,120,40,0)');
 ctx.fillStyle=g;ctx.fillRect(fx-30,fy-30,60,60);
 const d=ctx.createRadialGradient(x,DM.floor,0,x,DM.floor,22);d.addColorStop(0,`rgba(255,160,70,${.16*k})`);d.addColorStop(1,'rgba(255,160,70,0)');ctx.fillStyle=d;ctx.fillRect(x-24,DM.floor-6,48,12);
 ctx.restore();
}
export function dredgerFinishPose(t,cam){
 const c=dredgerChad(t),v=dredgerVictim(t,cam);
 return {x:cam+c.x,y:DM.floor,pose:0,chad:{pose:c.pose,i:c.i},walk:false,vx:v.x,vy:v.y};
}
// The Thekedar until the grab takes him: {x, y, state, i, face, hidden}.
export function dredgerVictim(t,cam){
 const home=cam+DM.home,back=cam+DM.back;
 if(t<DF.call)return {x:home,y:DM.floor,state:'stagger_polish',i:Math.floor(t/8)%4,face:-1};
 if(t<DF.drop)return {x:mix(home,back,(t-DF.call)/16),y:DM.floor,state:'call',i:0,face:-1};
 if(t<DF.catch)return {x:back,y:DM.floor,state:t<DF.lock?'call':'gloat',i:0,face:-1};
 if(t<DF.clamp)return {x:back+(t<DF.catch+40?((t>>1)&1):0),y:DM.floor,state:gapeArt()?'gape':'cower',i:0,face:-1};
 return {x:back,y:DM.floor,hidden:true};
}

// The grab, as a world point: {x, y (its lip, world), cell, rot, k, cable}. cable: 'crane' (taut to the
// boom), 'stub' (snapped short), 'fist' (the stub in CHAD's fist).
export function dredgerGrab(t,cam){
 const chad=cam+DM.chad,back=cam+DM.back;
 if(t<DF.drop)return {x:cam+320,y:DM.floor-150,cell:'closed',cable:'crane'};
 if(t<DF.lock)return {x:mix(cam+320,chad,ease((t-DF.drop)/16)),y:DM.floor-150,cell:'closed',cable:'crane',aim:true};
 if(t<DF.catch){const q=clamp((t-DF.lock)/(DF.catch-DF.lock),0,1),top=DM.floor-150,palm=DM.floor+PALMS[0][1]-LAND_DY;
  return {x:chad,y:mix(top,palm,q*q),cell:'closed',cable:'crane',lock:t<DF.lock+8};}
 if(t<DF.stand){const sag=t<DF.catch+6?(t-DF.catch)/6*3:3+Math.sin((t-DF.catch)*.8);return {x:chad+PALMS[0][0],y:DM.floor+PALMS[0][1]-LAND_DY+sag,cell:'closed',cable:'crane',strain:true};}
 if(t<DF.toss){const q=ease((t-DF.stand)/10),y=mix(DM.floor+PALMS[0][1]+3,DM.floor+PALMS[1][1],q),x=mix(chad+PALMS[0][0],chad+PALMS[1][0],q);return t<DF.rip?{x,y:y-LAND_DY,cell:'closed',cable:'crane'}:{x,y,cell:'closed',cable:'stub'};}
 if(t<DF.clamp){
  // Pitched over the Thekedar: an arc, opening in the air, biting shut on him as it lands.
  const q=(t-DF.toss)/(DF.clamp-DF.toss),x=mix(chad+PALMS[1][0],back,q),y=mix(DM.floor+PALMS[1][1],DM.floor+2,q)-Math.sin(q*Math.PI)*34;
  return {x,y,cell:q<.3?'half':'open',cable:'stub',rot:Math.sin(q*Math.PI)*.18};
 }
 if(t<DF.take){const k=t-DF.clamp;return {x:back+(k<4?0:((k>>2)&1)),y:DM.floor+2,cell:'loaded',li:Math.floor(k/6),cable:'stub',land:k<6?k:null};}
 if(t<DF.spin){const k=t-DF.take;return {x:back+(k%10<5?1:0),y:DM.floor+2,cell:'loaded',li:Math.floor(t/6),cable:'hands'};}
 if(t<DF.release){
  // Whirled flat round his fist on the cable stub: it comes off the deck on his right, flies out level
  // with his fist as it picks up speed, its far side passing behind him; the orbit seen from the side.
  const c=cam+DM.take,a=orbitA(t),depth=Math.sin(a),out=ease(clamp((t-DF.spin)/26,0,1)),hand=spinHand(t,c);
  // the bowl's middle on the orbit, flying flat out from him: seen side-on at his sides, end-on in front and behind
  const k=ORBIT.k*(1+ORBIT.depth*depth),px=c+Math.cos(a)*ORBIT.r,py=DM.floor-64+depth*ORBIT.ry;
  const g={x:px,y:py+(MROW.loaded.lip-MROW.loaded.pivot)*GRAB_K*k,rot:-Math.PI/2*Math.cos(a)};
  // first it is dragged up off the deck into the orbit, the jaws still on the boards
  if(out<1){g.x=mix(back,g.x,out);g.y=mix(DM.floor+2,g.y,out);g.rot=mix(0,g.rot,out);}
  return {...g,cell:'loaded',li:Math.floor(t/4),cable:'fist',behind:depth<0,k:mix(1,k,out),orbit:a};
 }
 if(t<DF.impact){
  // Hurled: a flat spinning flight up into the cab glass, shrinking as it carries back.
  const q=(t-DF.release)/(DF.impact-DF.release),r=dredgerGrab(DF.release-1,cam);
  return {x:mix(r.x,cam+DM.cab[0],q),y:mix(r.y,DM.cab[1]+40,q)-Math.sin(q*Math.PI)*22,cell:'loaded',li:Math.floor(t/3),rot:r.rot-q*Math.PI*3,k:mix(r.k,.86,q)};
 }
 return null;
}

// The cab impact's gore, replayed from the clock: a crack star and blood bursts out of the shattered glass,
// chunks and teeth thrown in arcs that land and stain the deck, a long arc down the cab, and his slipper.
const GORE=Array.from({length:16},(_,i)=>({vx:-(.9+hash(i*3.1)*3.2),vy:-(1.2+hash(i*7.7)*3),cell:3+i%3,s:.35+hash(i*5.3)*.35,tooth:i%5===4,at:DF.impact+(i%4)}));
const GORE_G=.16;
function goreAt(p,t,cx,cy){const a=t-p.at,land=DM.floor-2-cy,tl=(-p.vy+Math.sqrt(p.vy*p.vy+2*GORE_G*land))/GORE_G;const e=Math.min(a,tl);
 return {x:cx+p.vx*e,y:cy+p.vy*e+GORE_G*e*e/2,landed:a>=tl,spin:e*.3*(p.vx<0?-1:1)};}
function drawGore(ctx,t,X){
 const e=t-DF.impact;if(e<0)return;const cx=X+DM.cab[0]-8,cy=DM.cab[1]+4;
 // stains first, under everything that is still flying
 for(const p of GORE){if(t<p.at)continue;const g=goreAt(p,t,cx,cy);if(g.landed&&!p.tooth)bloodDecal(ctx,g.x,DM.floor-1,2,.32+p.s*.4);}
 crackFlash(ctx,t,DF.impact,cx+4,cy-4,2,12);
 bloodSpray(ctx,t,DF.impact,cx,cy,-1,5);bloodSpray(ctx,t,DF.impact+3,cx+6,cy-6,-1,4);bloodSpray(ctx,t,DF.impact+2,cx+12,cy+2,1,3);
 bloodArc(ctx,t,DF.impact+1,cx-4,cy,-1,1);bloodArc(ctx,t,DF.impact+4,cx+10,cy-2,1,2);
 // the long smear running down the cab front while it still stands
 if(e<DF.tilt-DF.impact)gore(ctx,7,cx+4,cy+12+Math.min(e,20)*.6,{rot:1.5,scale:.55+Math.min(e,20)*.02,alpha:Math.min(1,(DF.tilt-DF.impact-e)/10)});
 for(const p of GORE){if(t<p.at)continue;const g=goreAt(p,t,cx,cy);
  if(p.tooth){tooth(ctx,p.at,g.x,g.y,g.landed?0:g.spin,.4);continue;}
  if(!g.landed)gore(ctx,p.cell,g.x,g.y,{rot:g.spin,scale:p.s});}
 // His slipper, cartwheeling out to land by CHAD.
 const sl=getAIFrame('dl_grab','trash')?.f[4];
 if(sl){const q=clamp(e/34,0,1),x=mix(cx,X+DM.chad+30,q),y=mix(cy,DM.floor-6,q)-Math.sin(q*Math.PI)*46;
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(q<1?e*.45:.2);const w=frameW(sl)*.8,h=frameH(sl)*.8;ctx.drawImage(sl,-w/2,-h/2,w,h);ctx.restore();}
}

// The boom cable's snapped end whips up out of shot at the rip. Returns its end point (screen) or null.
function cableEnd(t,X){
 if(t<DF.rip||t>=DF.rip+18)return null;
 const top=[X+DM.chad+10,-6];
 if(t<DF.rip+18){const q=(t-DF.rip)/18;return {top,x:X+DM.chad+4+q*30,y:mix(DM.floor-118,-30,ease(q)),whip:1-q};}
  return null;
}

// Cues. Called every performance tick.
export function updateDredgerFinish(c,t,cam){
 const once=(k,at,fn)=>{if(t>=at&&!c.cues.has(k)){c.cues.add(k);fn();}},sound=(n,v=.5)=>{if(!G.audio.roomSfx(n,v))G.audio.sfx(n);};
 const chad=cam+DM.chad,back=cam+DM.back;
 once('call',CALL_T[0],()=>sound('blip',.45));
 if(t>=CALL_T[0]&&t<CALL_T[1])updateDialogue(CALL,t-CALL_T[0],{remaining:CALL_T[1]-t});
 once('drop',DF.drop,()=>{sound('armor',.45);sound('train_brake',.25);});
 once('lock',DF.lock,()=>sound('enrage',.4));
 once('catch',DF.catch,()=>{sound('slam',.9);sound('heavy',.8);sound('break_metal',.4);G.shake=11;G.hitstop=Math.max(G.hitstop,12);
  spawnShock(chad,DM.floor);spawnDust(chad,DM.floor,22);spawnDebris(chad,DM.floor-4,14,['#6a4a2a','#3a2a1a','#8a6a3a']);spawnSpark(chad,DM.floor+PALMS[0][1]);});
 once('gape',DF.catch+6,()=>sound('ehurt2',.5));
 once('walkie',DF.catch+30,()=>sound('remote_click',.4));
 once('stand',DF.stand,()=>{sound('charge_arm',.35);G.shake=3;});
 once('rip',DF.rip,()=>{sound('neta_roof_snap',.7);sound('neta_roof_whip',.6);sound('break_metal',.5);G.shake=6;G.hitstop=Math.max(G.hitstop,6);
  for(let i=0;i<4;i++)spawnSpark(chad+6+i*3,DM.floor+PALMS[1][1]-120+i*6);});
 once('toss',DF.toss,()=>sound('throw',.6));
 once('clamp',DF.clamp,()=>{sound('slam',.8);sound('armor',.6);sound('edie1',.5);G.shake=9;G.hitstop=Math.max(G.hitstop,8);spawnShock(back,DM.floor);spawnDust(back,DM.floor,18);
  spawnDebris(back,DM.floor-6,10,['#6a4a2a','#3a2a1a','#8a6a3a']);});
 for(const k of [0,1,2,3])once('kick'+k,DF.clamp+10+k*7,()=>sound('neta_roof_thud',.22));
 once('take',DF.take,()=>{sound('grab',.5);sound('ehurt3',.35);});
 // The whirl: a whoosh per turn, quickening, under a rising charge.
 once('spin-charge',DF.spin,()=>{sound('charge_arm',.55);sound('super',.35);});
 for(let k=0;k<5;k++){const at=Math.round(DF.spin+(DF.release-DF.spin)*Math.pow((k+.5)/5,1/1.7));once('whoosh'+k,at,()=>sound(k<3?'whiff':'neta_roof_spin',.35+k*.08));}
 once('release',DF.release,()=>{sound('dash',.6);sound('heavy',.7);G.shake=6;G.hitstop=Math.max(G.hitstop,10);G.slowmo=Math.max(G.slowmo,14);});
 once('scream',DF.release+4,()=>sound('edie1',.45));
 once('impact',DF.impact,()=>{sound('room_glass',.9);sound('finale_gore',.85);G.audio.sfx('edie1');sound('slam',.8);sound('train_blast',.6);G.shake=12;G.hitstop=Math.max(G.hitstop,10);
  spawnDebris(cam+DM.cab[0],DM.cab[1],22,['#9ad0e0','#e8f4ff','#3a5060']);spawnRing(cam+DM.cab[0],DM.cab[1],'#fff1c8');});
 once('tilt',DF.tilt,()=>{sound('break_metal',.7);sound('train_brake',.45);G.shake=8;spawnDebris(cam+330,150,14,['#6a4a2a','#3a2a1a','#8a6a3a']);});
 once('collapse',DF.collapse,()=>{sound('train_blast',.8);sound('slam',.9);G.shake=14;spawnSmoke(cam+330,180,10);spawnDebris(cam+320,180,20,['#6a4a2a','#3a2a1a','#8a6a3a']);});
 once('splash',DF.splash,()=>{G.audio.splat?.();sound('heavy',.5);});
 // the Zippo: the lid's ting and the wheel catching, a draw, then the clack shut
 once('zippo-open',DL.frames[2],()=>{sound('zippo_open',.5);spawnSpark(cam+DM.take+15,DM.floor-70);});
 once('zippo-shut',DL.frames[5]+2,()=>sound('zippo_close',.55));
}

// The magnet at world (x, lip y), its frames' 1x rows: both share the shackle row and the hazard band (the
// pivot), so they swap without a jump. The lip is LAND_DY over the bare face, the Thekedar's slippers once loaded.
const GRAB_K=.78,MROW={magnet:{x:80,shackle:9,pivot:61,lip:98+LAND_DY/GRAB_K},loaded:{x:115,shackle:9,pivot:61,lip:118}};
// Cells: closed hangs dead; half/open (aimed, pitched) is live and arcing; loaded carries him.
const magnetIdx=cell=>cell==='closed'?0:1;
function grabSprite(ctx,g,camX,alpha=1){
 const ld=g.cell==='loaded',f=ld?loadedArt(g.li||0):getAIFrame('dl_grab','magnet')?.f[magnetIdx(g.cell)];if(!f)return null;
 const ROW=MROW[ld?'loaded':'magnet'],k=GRAB_K*(g.k||1),w=frameW(f)*k,h=frameH(f)*k,a=g.rot||0,cx=g.x-camX,cy=g.y-(ROW.lip-ROW.pivot)*k;
 ctx.save();ctx.globalAlpha=alpha;ctx.translate(Math.round(cx),Math.round(cy));ctx.rotate(a);ctx.drawImage(f,-ROW.x*k,-ROW.pivot*k,w,h);ctx.restore();
 const r=(ROW.pivot-ROW.shackle)*k;return [cx+Math.sin(a)*r,cy-Math.cos(a)*r];
}
function cable(ctx,x0,y0,x1,y1,w=2){
 ctx.save();ctx.strokeStyle='#15100c';ctx.lineWidth=w;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
 ctx.strokeStyle='#6a5a48';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x0+1,y0);ctx.lineTo(x1+1,y1);ctx.stroke();ctx.restore();
}
function frayed(ctx,x,y,t,live){
 // The snapped end: splayed strands and, while live, a spitting arc.
 ctx.save();ctx.strokeStyle='#8a7a62';ctx.lineWidth=1;
 for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+i*2,y+4+Math.abs(i));ctx.stroke();}
 if(live&&(t>>1)%3!==0){ctx.globalCompositeOperation='lighter';
  for(let i=0;i<5;i++){const a=hash(t*7+i)*Math.PI*2,r=3+hash(t*3+i)*7;ctx.fillStyle=i%2?'rgba(170,220,255,.9)':'rgba(255,240,190,.95)';ctx.fillRect(Math.round(x+Math.cos(a)*r),Math.round(y+4+Math.sin(a)*r),1,1);}
  const g=ctx.createRadialGradient(x,y+4,0,x,y+4,10);g.addColorStop(0,'rgba(190,230,255,.6)');g.addColorStop(1,'rgba(190,230,255,0)');ctx.fillStyle=g;ctx.fillRect(x-10,y-6,20,20);}
 ctx.restore();
}
function ring(ctx,t,X){
 if(t<DF.drop+4||t>=DF.catch)return;
 const lock=t>=DF.lock,x=X+DM.chad,a=lock?((t>>2)&1?.95:.45):.55;
 ctx.save();ctx.globalAlpha=a;ctx.strokeStyle='#ff4050';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,DM.floor,38,16,0,0,Math.PI*2);ctx.stroke();
 ctx.globalAlpha*=.35;ctx.fillStyle='#ff4050';ctx.fill();ctx.restore();
}
function drawGrab(ctx,t,cam,camX,live){
 const g=dredgerGrab(t,cam);if(!g)return;const X=cam-camX,sx=Math.round(g.x-camX);
 if(g.cable==='crane'){
  // Still on its boom cable: drawn hanging, as in the fight; live and red while it is locked on CHAD, dead in his hands.
  const blink=g.lock?(t>>2)&1:g.aim&&(t>>1)&1;
  drawMagnetArt(ctx,sx,Math.round(g.y)+LAND_DY,g.aim||g.lock?1:0,{cue:blink?'unblockable':null,jolt:g.strain?((t>>1)&1):0});return;
 }
 if(!G.reflecting&&g.y>DM.floor-60)drawContactShadow(ctx,g.x-camX,DM.floor,30,Math.max(0,DM.floor-g.y),1);
 const top=grabSprite(ctx,g,camX);if(!top)return;
 if(g.cable==='stub'){const [x,y]=top;cable(ctx,x,y,x+(g.rot||0)*-10,y-12);frayed(ctx,x+(g.rot||0)*-10,y-12,t,false);}
 if(g.cable==='fist'){const h=spinHand(t,cam+dredgerChad(t).x);cable(ctx,h[0]-camX,h[1],top[0],top[1],3);}
 if(g.cable==='hands'){const c=dredgerChad(t);cable(ctx,X+c.x+HANDS[0],DM.floor+HANDS[1],top[0],top[1]);}
 if(g.land!=null&&g.land<6)punchBurst(ctx,t,DF.clamp,sx,DM.floor-30,150);
}
function drawCable(ctx,t,X){
 const e=cableEnd(t,X);if(!e)return;
 cable(ctx,e.top[0],e.top[1],e.x,e.y);frayed(ctx,e.x,e.y,t,e.whip>0);
}

export function drawDredgerFinish(ctx,c,showChad,camX){
 const t=c.t,cam=6000,X=cam-camX,live=c===G.india?.cinematic,ch=dredgerChad(t),v=dredgerVictim(t,cam),g=dredgerGrab(t,cam);
 const charge=t<DF.spin?0:t<DF.release?clamp((t-DF.spin)/20,0,1):clamp(1-(t-DF.release)/20,0,1);
 if(live){dim(ctx,charge*.55);if(t>=DF.spin+20&&t<DF.release)speedLines(ctx,X+ch.x,DM.floor-60,t,charge);if(t>=DF.release&&t<DF.impact)speedLines(ctx,0,0,t,.5,1);}
 ring(ctx,t,X);
 // The catch: one negative impact frame.
 if(live&&t===DF.catch){
  flash(ctx,1,'255,214,120');silhouette(ctx,SPR.player,ch.pose,ch.i,X+ch.x,DM.floor,1,'#1a0c08');
  if(g){ctx.save();ctx.filter='brightness(0)';drawMagnetArt(ctx,Math.round(g.x-camX),Math.round(g.y)+LAND_DY,0);ctx.restore();}return;
 }
 if(g?.behind)drawGrab(ctx,t,cam,camX,live);
 if(!v.hidden)actor(ctx,'dl_thekedar',getAIFrame('dl_thekedar',v.state+'_h')?v.state+'_h':v.state,v.i,v.x-camX,v.y,v.face);   // he has the hook by now
 if(showChad){
  if(live&&t>=DF.spin&&t<DF.release+6)aura(ctx,X+ch.x,DM.floor-50,58,t,charge);
  if(live&&t>=DF.catch&&t<DF.stand)aura(ctx,X+ch.x,DM.floor-60,44,t,.35,'255,210,140');
  // The strain: a tremor under the weight.
  const shake=t>=DF.catch+6&&t<DF.stand?((t>>1)&1):0;
  actor(ctx,'player',ch.pose,ch.i,X+ch.x+shake,DM.floor,1);
  if(live&&t>=DF.cigar){const x=cam+ch.x;zippoGlow(ctx,t,X+ch.x);drawCigarReplay(ctx,camX,t,b=>cigarAt(b,x),{drags:[[DL.lit,DL.drag]],exhales:[DL.exhale],trickleEvery:9});}
 }
 if(!g?.behind)drawGrab(ctx,t,cam,camX,live);
 drawCable(ctx,t,X);
 if(live)drawGore(ctx,t,X);
 if(live&&t>=CALL_T[0]&&t<CALL_T[1])drawDialogue(ctx,{text:CALL,x:X+DM.back,bottom:DM.floor-116,age:t-CALL_T[0],remaining:CALL_T[1]-t});
 punchBurst(ctx,t,DF.catch,X+DM.chad,DM.floor+PALMS[0][1],120);
 punchBurst(ctx,t,DF.impact,X+DM.cab[0],DM.cab[1],190);
 if(live)flash(ctx,t===DF.impact?.8:t===DF.impact+1?.45:t===DF.release?.35:t===DF.clamp?.3:t===DF.collapse?.45:t===DF.rip?.25:0);
}
