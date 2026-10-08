// THE THEKEDAR's finale: the bucket's hook on its chain.
//
// At half health he calls the boys, runs for the ladder, climbs it and swings down onto the deck on the
// boom's spare hook (CONTRACT TERMINATED!). He fights a chain's length off CHAD; the dead magnet still hangs off
// the boom, and between swings he radios it down on CHAD (MAGNET!).
//  fling (green)   - he whirls it overhead and flings it straight out: parry it and the chain wraps him
//                    up (TANGLED), open for a beating
//  slam (red ring) - whirl, a ring locks on CHAD and the hook comes down there; it sticks in the deck and
//                    he heaves at it, open
//  sweep (red lane)- whirl, then it skims the deck in front of him: jump it; he is left winded
import {G,clamp,laneMin,FLOOR_BOT} from './engine.js';
import {GREEN_WARNING_TICKS} from './combat_readability.js';
import {frameW,frameH} from './sprites.js';
import {spawnSpark,spawnDust,spawnShock,spawnSmoke} from './effects.js';
import {hurtPlayer,resolveIncomingHit} from './player.js';
import {tryHitPlayer} from './bosslib.js';
import {speedLines,dim} from './finisher_fx.js';
import {getAIFrame} from './aiframes.js';

export const HOOK_DECK=['hookfling','hookslam','grabcall','hooksweep','hookfling','sack','hookslam','grabcall','hookfling','hooksweep'];
let H=null;
export function bindHook(h){H=h;}
const late=b=>b.hp<b.maxhp*.25;
const whirlT=b=>late(b)?28:36;
// Opening lengths (shorter late).
export const hookOpenedAt={tangle:b=>late(b)?96:120,stuck:b=>late(b)?72:90};
// Fists of the registered hook poses (logical px from the sole centre, facing right):
// 0 whirl_a, 1 whirl_b, 2 fling, 3 slam, 4 sweep, 5 yank, 6 hang, 7 tangled.
const FIST=[[4,-89],[-18,-90],[53,-66],[48,-18],[44,-22],[-8,-46],[-2,-105],null];
const IDLE_FIST=[12,-42];
const HOOK_K=.55,RING=[15,3];   // hook draw scale; its top ring in the logical frame
const SWING={pivotX:250,pivotY:4,land:200,ticks:60};
// The transition: up the ladder with the wrench, he flings it away off the gantry and takes the hook (TOSS), swings
// down on it in slow motion, lands, and whirls it over his head through a red roar until the banner (ROAR).
const TOSS={release:16,grab:30,done:44},ROAR={whirl:10,banner:58,done:96};
export const OP_REFILL=.12;   // share of his health the roar puts back

export function hookStart(b,k){
 b.t=0;b.hitLanded=false;
 if(k==='hookrun'){G.shots=G.shots.filter(s=>s.reflected);b.state='hookrun';b.dialogue=null;H.line(b,"YOU WANT THE BUCKET? HAVE THE HOOK!");return;}
 b.pattern=k;b.hookNext=k;b.state='hookwhirl';b.slamAt=null;H.sound('magnet_chain',.4);G.audio.sfx('blip');
}
export function hookUpdate(b){
 const p=G.player;
 if(b.wrenchToss){const w=b.wrenchToss;w.t++;w.x+=w.vx;w.z+=w.vz;w.vz-=.32;   // the discarded wrench, end over end onto the deck
  if(w.z<=0){G.audio.sfx('armor');H.sound('magnet_clang',.4);spawnSpark(w.x,w.y-2);spawnDust(w.x,w.y,6);G.shake=Math.max(G.shake,3);b.wrenchToss=null;b.wrenchDown={x:w.x,y:w.y};}}
 switch(b.state){
  case 'hookrun':{
   const x0=H.ladder(),y0=clamp(212,laneMin(x0),FLOOR_BOT);b.face=x0>b.x?1:-1;
   b.x+=clamp(x0-b.x,-2.6,2.6);b.y+=clamp(y0-b.y,-1.4,1.4);
   if(Math.abs(b.x-x0)<1&&Math.abs(b.y-y0)<1||b.t>200){b.x=x0;b.y=y0;b.face=1;b.state='hookclimb';b.t=0;}
   return true;
  }
  case 'hookclimb':
   b.face=1;b.z=Math.min(H.ladderTop,b.z+2.4);if(b.t%8===0)G.audio.roomSfx?.('room_stamp',.18);
   if(b.z>=H.ladderTop){b.state='hooktoss';b.t=0;b.face=-1;}
   return true;
  case 'hooktoss':
   // On the gantry: the wrench goes, end over end, down onto the deck; then he takes the hook off the boom.
   if(b.t===4)H.line(b,'FORGET THE WRENCH!');
   if(b.t===TOSS.release){G.audio.sfx('throw');b.wrenchToss={x:b.x-10,y:b.y,z:b.z+70,vx:-2.6,vz:1.2,t:0};}
   if(b.t===TOSS.grab){b.hookArt=true;H.sound('magnet_chain',.6);G.audio.sfx('grab');}
   if(b.t>=TOSS.done){b.state='hookswing';b.t=0;b.swingFrom=[b.x,b.z];G.audio.sfx('dash');b.dialogue=null;H.line(b,'HOOK, LINE AND THEKEDAR!');}
   return true;
  case 'hookswing':{
   // Down off the gantry on the chain: out over the deck, low through the middle, and let go.
   const q=clamp(b.t/SWING.ticks,0,1),[x0,z0]=b.swingFrom,x1=G.camLock+SWING.land,s=q*q*(3-2*q);b.face=-1;
   b.x=x0+(x1-x0)*s;b.z=Math.max(0,z0*(1-q)*(1-q*.5)+26*Math.sin(q*Math.PI)*(1-q*.6));b.y+=clamp(clamp(226,laneMin(b.x),FLOOR_BOT)-b.y,-1,1);
   if(b.t%10===0)G.audio.sfx('whiff');
   if(b.t===Math.round(SWING.ticks*.42)){G.slowmo=Math.max(G.slowmo,22);H.sound('neta_roof_spin',.5);}   // the bottom of the arc, in slow motion
   if(q>=1){b.z=0;b.state='hookland';b.t=0;G.shake=Math.max(G.shake,11);G.hitstop=Math.max(G.hitstop,8);G.audio.sfx('slam');H.sound('neta_roof_thud',.6);spawnDust(b.x,b.y,20);spawnShock(b.x,b.y);
    b.gouges=(b.gouges||[]).concat(Array.from({length:14},(_,i)=>({x:b.x-20+i*3,y:b.y+((i*5)%5)-2,t:G.time+200})));}
   return true;
  }
  case 'hookland':
   if(b.t>=ROAR.whirl&&b.t<ROAR.banner){if(b.t%8===0)H.sound('magnet_chain',.25+b.t/ROAR.banner*.3);if(b.t%6===0)spawnSmoke(b.x-b.face*4,b.y-92,1);G.shake=Math.max(G.shake,b.t>40?2:1);}
   if(b.t===ROAR.banner){b.hook=true;b.sting=G.time;b.stingKind='hook';b.dialogue=null;G.hitstop=Math.max(G.hitstop,10);G.flash=3;G.shake=Math.max(G.shake,10);H.sound('enrage',.6);H.sound('break_metal',.5);H.sound('magnet_clang',.5);
    spawnShock(b.x,b.y);for(let i=0;i<8;i++)spawnSpark(b.x-30+i*8,b.y-100+((i*7)%14));
    b.hpFx={from:b.hp,to:Math.min(b.maxhp,b.hp+Math.round(b.maxhp*OP_REFILL)),t0:G.time,dur:40,col:'#ff5a3a'};
    if(b.grab&&b.grab.state!=='rest'){b.grab.state='rise';b.grab.t=0;}}   // the magnet goes back up to hang off the boom
   if(b.t>=ROAR.done){b.state='idle';b.t=0;b.atkCd=30;}
   return true;
  case 'hookwhirl':{
   const T=whirlT(b);if(b.t<T/2)b.face=p.x<b.x?-1:1;b.attackFace=b.face;
   if(b.t%12===0)H.sound('magnet_chain',.25);
   if(b.hookNext==='hookslam'){if(b.t<T-14)b.slamAt=[p.x,p.y];else if(b.t===T-14)G.audio.sfx('armor');}
   if(b.t>=T){b.state=b.hookNext;b.t=0;G.audio.sfx(b.state==='hookfling'?'dash':'whiff');}
   return true;
  }
  case 'hookfling':
   if(b.t===6&&tryHitPlayer(b,18,150,true,18,'counter'))G.shake=Math.max(G.shake,5);
   if(b.t>=34){b.state='hookwinded';b.t=0;b.windT=24;}
   return true;
  case 'hookslam':
   if(b.t===10){
    const [x,y]=b.slamAt||[p.x,p.y];G.shake=Math.max(G.shake,9);H.sound('magnet_clang',.6);G.audio.sfx('slam');spawnShock(x,y);spawnDust(x,y,12);
    if(Math.abs(p.x-x)<26&&Math.abs(p.y-y)<12&&p.z<14&&!['down','getup'].includes(p.state)&&!p.dying&&!resolveIncomingHit(p,b,{parryClass:'unblockable',dmg:18,dir:p.x<x?-1:1,heavy:true}))hurtPlayer(p,18,p.x<x?-1:1,true);
    // Bitten into the planks: he heaves at the chain, open.
    b.hookAt=[x,y];b.hookStuckAt=G.time;b.protectedStagger=Math.max(b.protectedStagger,hookOpenedAt.stuck(b));
   }
   return true;
  case 'hooksweep':{
   const hx=b.x+b.face*(20+150*clamp(b.t/16,0,1));
   if(b.t<18&&b.t%3===0)spawnSpark(hx,b.y-2);
   if(!b.hitLanded&&b.t<=16&&Math.abs(p.x-hx)<16&&Math.abs(p.y-b.y)<14&&p.z<12&&!['down','getup'].includes(p.state)&&!p.dying){
    b.hitLanded=true;if(!resolveIncomingHit(p,b,{parryClass:'unblockable',dmg:16,dir:b.face,heavy:true})){hurtPlayer(p,16,b.face,true);G.audio.sfx('heavy');G.shake=Math.max(G.shake,5);}}
   if(b.t>=22){b.state='hookwinded';b.t=0;b.windT=late(b)?32:40;}
   return true;
  }
  case 'hookwinded':if(b.t%14===0)spawnSmoke(b.x-b.face*4,b.y-80,1);if(b.t>=b.windT){b.state='idle';b.t=0;b.atkCd=late(b)?26:36;}return true;
 }
 return false;
}
export const hookGuarded=()=>false;
export function hookCue(b){
 if(b.state==='hookwhirl'){if(b.hookNext==='hookfling')return b.t>=whirlT(b)-GREEN_WARNING_TICKS?'counter':null;return b.t>=6?'unblockable':null;}
 if(b.state==='hookfling'&&b.t<=6)return 'counter';
 return null;
}
export function hookPose(b){
 const t=b.t;
 switch(b.state){
  case 'hookrun':return ['walk',Math.floor(G.time/3)%8];
  case 'hookclimb':return ['climb',Math.floor(t/6)%4];
  case 'hookswing':return ['hook',6];
  case 'hooktoss':return t<TOSS.grab?['toss',t<TOSS.release?0:1]:['idle',0];
  case 'hookland':return t<ROAR.whirl?['land',0]:['hook',(t>>2)&1];
  case 'hookwhirl':return ['hook',(t>>2)&1];
  case 'hookfling':return t<22?['hook',2]:['hook',5];
  case 'hookslam':return ['hook',3];
  case 'hooksweep':return ['hook',4];
  case 'hookwinded':return ['winded',0];
 }
 return null;
}
// Which hook pose index is on screen (for the fist), or -1 for his ordinary poses.
function poseIdx(b){
 const since=k=>b[k]==null?1e9:G.time-b[k];
 if(b.protectedStagger>0||b.state==='stagger'){if(since('tangledAt')<126)return 7;if(since('hookStuckAt')<96)return 5;return -1;}
 const p=hookPose(b);return p&&p[0]==='hook'?p[1]:-1;
}
const active=b=>b.phase==='operator'&&!b.dead&&(b.hook||b.hookArt||['hookswing','hookland'].includes(b.state));
// Under the actors: the slam ring and the sweep lane.
export function drawHookMarks(ctx,b,camX){
 if(!active(b)||G.reflecting)return;
 if(b.state==='hookwhirl'&&b.hookNext==='hookslam'&&b.slamAt||b.state==='hookslam'&&b.t<10){
  const [x,y]=b.slamAt,lock=b.state==='hookslam'||b.t>=whirlT(b)-14;
  ctx.save();ctx.globalAlpha=lock?((G.time>>2)&1?.95:.45):.55;ctx.strokeStyle='#ff4050';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.round(x-camX),Math.round(y),26,11,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.35;ctx.fillStyle='#ff4050';ctx.fill();ctx.restore();
 }
 if(b.state==='hookwhirl'&&b.hookNext==='hooksweep'||b.state==='hooksweep'&&b.t<4){
  const a=b.x+b.face*16-camX,z=b.x+b.face*176-camX;H.hazardLane(ctx,Math.min(a,z),Math.max(a,z),b.y,b.face,clamp(b.t/24,0,1),false,b.t);
 }
}
// The chain from his fists and the hook on the end of it.
export function drawHook(ctx,b,camX){
 if(!active(b))return;const i=poseIdx(b);if(i===7)return;   // tangled in it: the pose carries the chain
 const k=b.state==='hookswing'?H.rearScale(b.z):1,fp=i>=0?FIST[i]:IDLE_FIST;
 const fx=b.x-camX+b.face*fp[0]*k,fy=b.y-b.z+4+fp[1]*k,t=b.t;
 let hx,hy,ang=null;
 if(i===0||i===1){whirl(ctx,b,fx,fy,false);return;}
 if(b.state==='hookswing'){hx=G.camLock+SWING.pivotX-camX;hy=SWING.pivotY;chain(ctx,fx,fy,hx,hy);hook(ctx,hx,hy-2,Math.PI);return;}
 if(b.state==='hookfling'){const tx=b.x+b.face*150-camX,ty=b.y-40,q=t<6?t/6:t<20?1:clamp(1-(t-20)/14,0,1);hx=fx+(tx-fx)*q;hy=fy+(ty-fy)*q;ang=-b.face*Math.PI/2;}
 else if(b.state==='hookslam'&&t<10&&b.slamAt){const q=t/10;hx=fx+(b.slamAt[0]-camX-fx)*q;hy=fy+(b.slamAt[1]-6-fy)*q-Math.sin(q*Math.PI)*30;}
 else if(i===5&&b.hookAt&&G.time-(b.hookStuckAt??-1e9)<96){hx=b.hookAt[0]-camX;hy=b.hookAt[1]-14;ang=Math.PI*.15*b.face;}
 else if(b.state==='hooksweep'){hx=b.x+b.face*(20+150*clamp(t/16,0,1))-camX;hy=b.y-14;ang=-b.face*Math.PI/2;}
 else return;   // his ordinary poses carry the hook in their art
 chain(ctx,fx,fy,hx,hy);hook(ctx,hx,hy,ang??Math.atan2(-(hx-fx),hy-fy));
}
// Whirled overhead: the hook flies a flat circle round his raised fists (a short taut chain), a blur trailing it;
// on the far half of the circle it is drawn behind him (drawHookBack).
const ORBIT={rx:38,ry:9,lift:8,spin:.42};
function whirl(ctx,b,fx,fy,back){
 const a=G.time*ORBIT.spin*b.face,cx=fx,cy=fy-ORBIT.lift,hx=cx+Math.cos(a)*ORBIT.rx,hy=cy+Math.sin(a)*ORBIT.ry;
 if(Math.sin(a)<0!==back)return;
 if(!G.reflecting){ctx.save();ctx.strokeStyle='rgba(210,200,185,.35)';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(cx,cy,ORBIT.rx,ORBIT.ry,0,a-b.face*1.4,a,b.face<0);ctx.stroke();ctx.restore();}
 chain(ctx,fx,fy,hx,hy);hook(ctx,hx,hy,-Math.cos(a)*Math.PI*.42);
}
function chain(ctx,x0,y0,x1,y1){
 const d=Math.hypot(x1-x0,y1-y0),n=Math.max(1,Math.round(d/4));
 ctx.save();ctx.strokeStyle='#15100c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x0,y0);ctx.lineTo(x1,y1);ctx.stroke();
 for(let j=0;j<=n;j++){const q=j/n;ctx.fillStyle=j&1?'#8a7a68':'#4a3e34';ctx.fillRect(Math.round(x0+(x1-x0)*q)-1,Math.round(y0+(y1-y0)*q)-1,2,2);}
 ctx.restore();
}
// The hook hangs from its top ring at (x, y), rotated by ang (0: straight down).
function hook(ctx,x,y,ang){
 const f=getAIFrame('dl_grab','hook')?.f[0];if(!f){ctx.fillStyle='#6a6a70';ctx.fillRect(x-4,y,8,16);return;}
 const w=frameW(f)*HOOK_K,h=frameH(f)*HOOK_K;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(ang);ctx.drawImage(f,-RING[0]*HOOK_K,-RING[1]*HOOK_K,w,h);ctx.restore();
}

// Behind the fighters: the cab's red emergency lamp once he has the hook, the dimmed swing and the roar's red wash.
export function drawHookBack(ctx,b,camX){
 if(b.phase!=='operator'||G.reflecting)return;const t=b.t;
 if(b.state==='hookswing'){const q=t/SWING.ticks;dim(ctx,.35*Math.sin(q*Math.PI));speedLines(ctx,b.x-camX,b.y-b.z-50,G.time,.5*Math.sin(q*Math.PI));}
 if(b.state==='hookland'&&t>=ROAR.whirl&&t<ROAR.banner+20){const k=t<ROAR.banner?(t-ROAR.whirl)/(ROAR.banner-ROAR.whirl):1-(t-ROAR.banner)/20;
  ctx.fillStyle=`rgba(120,10,6,${.28*k})`;ctx.fillRect(0,0,480,270);}
 {const i=active(b)?poseIdx(b):-1;if(i===0||i===1)whirl(ctx,b,b.x-camX+b.face*FIST[i][0],b.y-b.z+4+FIST[i][1],true);}
 if(b.wrenchDown){const f=getAIFrame('dl_grab','wrench')?.f[0];if(f){const k=34/frameW(f),w=frameW(f)*k,h=frameH(f)*k;ctx.save();ctx.translate(Math.round(b.wrenchDown.x-camX),Math.round(b.wrenchDown.y));ctx.rotate(1.45);ctx.drawImage(f,-w/2,-h/2,w,h);ctx.restore();}}
 if(b.hook&&!b.dead&&H.cab){const c=H.cab(),cx=c.x-camX-14,cy=c.y-22,on=(Math.cos(G.time*.2)+1)/2;
  ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(cx,cy,0,cx,cy,24);g.addColorStop(0,`rgba(255,50,30,${.7*on})`);g.addColorStop(1,'rgba(255,20,10,0)');ctx.fillStyle=g;ctx.fillRect(cx-24,cy-24,48,48);ctx.restore();}
}
// The wrench in flight, drawn with the fighters.
export function drawWrenchToss(ctx,b,camX){
 const w=b.wrenchToss;if(!w)return;const f=getAIFrame('dl_grab','wrench')?.f[0];if(!f)return;const k=34/frameW(f),fw=frameW(f)*k,fh=frameH(f)*k;
 ctx.save();ctx.translate(Math.round(w.x-camX),Math.round(w.y-w.z));ctx.rotate(w.t*.45);ctx.drawImage(f,-fw/2,-fh/2,fw,fh);ctx.restore();
}
