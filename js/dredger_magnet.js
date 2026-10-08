// THE DREDGER, phase two: the scrap magnet.
//
// Cut loose: at half the machine's health (or the cab glass gone) the Thekedar hauls the grab up, cuts it
// loose into the river and lowers a lifting electromagnet on the same cable (MAGNET MODE!).
//  pull (red ring, late)   - it charges and drags CHAD toward it; walk or run out before the power cuts and
//                            it slams down on the ring, then lies on the deck to be beaten
//  scrap drop (red ring)   - it fetches junk off the barge (taxi shell, auto-rickshaw, a line of rebar
//                            spears, a fridge), hunts CHAD with the shadow and lets go; the scrap lies on
//                            the deck afterwards, and a fridge stays standing to be smashed open for food
//  scrap yank (green)      - it rips a crewman off the deck by his steel wrench (or a hatch lid out of the
//                            deck), swings back and flings him at CHAD: parry him back up into the magnet and
//                            it shorts out (SHORT CIRCUIT), crashes onto the deck and is open. Three shorts blow the rig.
// The crew keep coming; while it pulls, the magnet rips the odd wrench out of a crewman's hand.
import {G,W,clamp,laneMin,FLOOR_BOT} from './engine.js';
import {GREEN_WARNING_TICKS} from './combat_readability.js';
import {frameW,frameH} from './sprites.js';
import {spawnSpark,spawnDust,spawnShock,spawnPop,spawnDebris,spawnSmoke} from './effects.js';
import {hurtPlayer,resolveIncomingHit} from './player.js';
import {spawnArc} from './shots.js';
import {drawAttackAccent,drawAttackMarker} from './combat_cues.js';
import {getAIFrame} from './aiframes.js';
import {PROP_TYPES,createProp} from './props.js';

export const MAGNET_LINE=.46;     // share of the machine's health where the grab is cut loose
export const OVERLOADS=3;
export const MREST=96;            // the magnet's pole face rides this high over the deck between moves
const MAG_K=.78,MAG_SHACKLE=[80,9],MAG_BOTTOM=98;   // draw scale; shackle and pole-face rows of the registered frames (1x)
const DECK=['magyank','magpull','magscrap','magyank','magscrap','magpull'];
const JUNK=['taxi','rickshaw','rebar','fridge'];
const YANK={reach:200,hang:116,seek:90,hold:34,lateHold:26,fling:30};   // hang: magnet face height with a crewman dangling, feet on the deck
const PULL={wind:44,lateWind:34,hold:110,lateHold:130,cut:24,ring:34,speed:.9,lateSpeed:1.1};
// The cut-loose beats: he rages in the cab under the klaxon and yanks the release, the winch hauls the grab up, the cable
// snaps and it tumbles into the river; the gantry lights die, the magnet comes down glowing in the dark, scrap on the
// deck creeps toward it, and on the surge the lights slam back on (MAGNET MODE!) as its bar recharges.
export const CUT={lever:28,haul:34,snap:78,splash:100,dark:112,lower:124,lowered:176,surge:160,banner:220,done:252};
export const MAG_REFILL=.08;   // share of the machine's health the magnet's power-up puts back

let H=null;   // helpers from delhi_dredger.js (bound at init: the modules import each other)
export function bindMagnet(h){H=h;}
const art=(n,i)=>getAIFrame('dl_grab',n)?.f[i]||null;
const crewArt=i=>getAIFrame('dl_grab','yanked')?.f[i]||null;
const late=b=>b.overload>=1||b.hp<(b.magLine+H.floor)/2;
const grounded=p=>p.z<1&&!['down','getup'].includes(p.state)&&!p.dying;

// ---------------------------------------------------------------- the cut-loose transition
export function startCutloose(b){
 b.magnetPending=false;
 Object.assign(b,{state:'cutloose',t:0,returnT:null,protectedStagger:0,dialogue:null,cutFrom:[b.x,b.z],cutBits:null});
 G.shots=G.shots.filter(s=>s.reflected);G.player.invuln=Math.max(G.player.invuln||0,CUT.done+20);G.player.invulnFlashAfter=G.time+CUT.done+20;
 for(const e of b.crewActors)if(!e.dead){e.atkCd=Math.max(e.atkCd,CUT.done+60);e.state='idle';e.t=0;}
 G.hitstop=Math.max(G.hitstop,10);G.shake=Math.max(G.shake,7);G.flash=2;H.sound('break_metal',.5);H.sound('enrage',.4);
}
export function cutlooseUpdate(b){
 const t=b.t,c=H.cab();
 if(t===4)H.line(b,'ENOUGH! CUT IT LOOSE!');
 if(t===10||t===58)H.sound('rig_klaxon',.45);
 if(t===CUT.lever){H.sound('train_brake',.5);G.audio.sfx('armor');G.shake=Math.max(G.shake,4);}
 if(t>=CUT.haul&&t<CUT.snap){b.z=Math.min(150,b.z+Math.min(5,1+(t-CUT.haul)*.3));if(t%6===0)spawnSmoke(G.camLock+300+((t>>3)&1)*6,150,1);}
 if(t===CUT.snap){H.sound('break_metal',.8);H.sound('neta_roof_snap',.6);H.sound('slam',.4);G.slowmo=Math.max(G.slowmo,14);G.flash=1;
  for(let i=0;i<8;i++)spawnSpark(b.x-14+i*4,b.y-b.z-60+((i*5)%9));b.splashX=G.camLock+150+((b.x-G.camLock)>240?0:60);b.cutFall=[b.x,b.y-b.z];}
 if(t===CUT.splash){G.shake=Math.max(G.shake,8);H.sound('neta_roof_thud',.6);G.audio.sfx('land');G.audio.splat?.();}
 if(t===CUT.dark){H.sound('slam',.35);G.audio.sfx('armor');}   // the breaker trips: the lights die
 if(t===CUT.lower){b.rig='magnet';b.x=clamp(b.x,H.L()+60,H.park());b.z=250;H.sound('magnet_zap',.4);
  // loose bolts and nails on the deck, which creep in under it as it powers up
  b.cutBits=Array.from({length:22},(_,i)=>{const s=Math.sin(i*91.7)*43758.5,r=s-Math.floor(s);return {x:G.camLock+70+((i*67+r*40)%340),y:clamp(200+((i*29)%40),laneMin(G.camLock+240),FLOOR_BOT),c:i%3};});}
 if(t>CUT.lower&&t<=CUT.lowered){b.z=Math.max(MREST,250-(t-CUT.lower)*(250-MREST)/(CUT.lowered-CUT.lower));if(t%3===0)spawnSpark(b.x+((t*17)%60)-30,b.y-b.z+((t*7)%10));}
 if(t>CUT.lowered&&t<CUT.banner){if(t%4===0)spawnSpark(b.x+((t*23)%70)-35,b.y-b.z+2);if(t%10===0)H.sound('magnet_zap',.2);}
 if(b.cutBits&&t>CUT.lowered-20&&t<CUT.banner)for(const q of b.cutBits){const d=b.x-q.x;q.x+=Math.sign(d)*Math.min(Math.abs(d),.15+(t-CUT.lowered+20)*.02*(1+q.c*.3));q.y+=clamp(b.y-q.y,-.2,.2);}
 if(t===CUT.surge)H.sound('rig_surge',.7);
 if(t===CUT.banner){b.sting=G.time;b.stingKind='magnet';G.hitstop=Math.max(G.hitstop,10);G.flash=3;G.shake=Math.max(G.shake,10);H.sound('magnet_zap',.8);H.sound('enrage',.4);
  spawnShock(b.x,b.y);for(let i=0;i<10;i++)spawnSpark(b.x-40+i*9,b.y-b.z+((i*7)%14));
  b.cutBits=null;b.hpFx={from:b.hp,to:Math.min(b.maxhp,b.hp+Math.round(b.maxhp*MAG_REFILL)),t0:G.time,dur:40,col:'#6ad0ff'};}
 if(t>=CUT.done){Object.assign(b,{state:'idle',t:0,atkCd:50,overload:0,turn:0});for(const e of b.crewActors)if(!e.dead)e.atkCd=Math.max(e.atkCd,60);}
 return true;
}
// The power cut, behind the actors: the stage dark (they stay lit), the cab's amber beacon sweeping while the klaxon
// sounds, the magnet's blue light pooling on the deck and the scrap creeping in under it.
export function cutDark(b){
 if(b.state!=='cutloose')return 0;const t=b.t;
 if(t<CUT.dark)return 0;if(t<CUT.banner)return .58*clamp((t-CUT.dark)/8,0,1)*(t>CUT.lowered&&t%13<2?.8:1);
 return .58*clamp(1-(t-CUT.banner)/10,0,1);
}
export function drawCutBack(ctx,b,camX){
 if(b.state!=='cutloose'||G.reflecting)return;const t=b.t,c=H.cab(),cx=c.x-camX;
 const dark=cutDark(b);if(dark>0){ctx.fillStyle=`rgba(6,8,18,${dark})`;ctx.fillRect(0,0,W,270);}
 ctx.save();ctx.globalCompositeOperation='lighter';
 if(t>=8&&t<CUT.dark){   // the beacon: a rotating amber lamp on the cab roof throwing a sweep across the deck
  const a=t*.22,on=(Math.cos(a)+1)/2,g=ctx.createRadialGradient(cx-14,c.y-22,0,cx-14,c.y-22,26);g.addColorStop(0,`rgba(255,170,40,${.75*on})`);g.addColorStop(1,'rgba(255,120,20,0)');ctx.fillStyle=g;ctx.fillRect(cx-40,c.y-48,52,52);
  ctx.fillStyle=`rgba(255,160,50,${.07*on})`;ctx.beginPath();ctx.moveTo(cx-14,c.y-22);ctx.lineTo(cx-14-260*Math.abs(Math.sin(a)),230);ctx.lineTo(cx-14-200*Math.abs(Math.sin(a))+60,250);ctx.closePath();ctx.fill();}
 if(b.rig==='magnet'&&t>CUT.lower){   // the magnet's light on the deck under it, swelling as it comes down and surges
  const k=clamp((t-CUT.lower)/(CUT.lowered-CUT.lower),0,1)*(t<CUT.banner?.8+.2*Math.sin(t*.7):clamp(1-(t-CUT.banner)/20,0,1)*1.4),x=b.x-camX,y=b.y;
  const g=ctx.createRadialGradient(x,y,0,x,y,90);g.addColorStop(0,`rgba(90,170,255,${.45*k})`);g.addColorStop(1,'rgba(40,90,255,0)');ctx.save();ctx.translate(x,y);ctx.scale(1,.32);ctx.translate(-x,-y);ctx.fillStyle=g;ctx.fillRect(x-90,y-90,180,180);ctx.restore();
  const g2=ctx.createRadialGradient(x,y-b.z,0,x,y-b.z,60);g2.addColorStop(0,`rgba(120,200,255,${.35*k})`);g2.addColorStop(1,'rgba(60,120,255,0)');ctx.fillStyle=g2;ctx.fillRect(x-60,y-b.z-60,120,120);}
 ctx.restore();
 if(b.cutBits)for(const q of b.cutBits){const x=Math.round(q.x-camX),y=Math.round(q.y);ctx.fillStyle='#1a1410';ctx.fillRect(x-1,y-1,3+(q.c&1),2);ctx.fillStyle=q.c===2?'#b0a090':'#7a6a58';ctx.fillRect(x,y-1,1+(q.c&1),1);}
}
// Behind the rig: the grab dropping into the river and the splash it throws up.
export function drawCutRiver(ctx,b,camX,splash){
 if(b.state!=='cutloose'||b.splashX==null)return;const t=b.t,x=b.splashX-camX;
 // Cut free it drops back out over the rail and into the river, shrinking into the distance as it tumbles.
 if(t>=CUT.snap&&t<CUT.splash&&b.cutFall){const q=(t-CUT.snap)/(CUT.splash-CUT.snap),f=art('battered',0),[fx,fy]=b.cutFall;
  if(f){const k=.78-.4*q,w=frameW(f)*k,h=frameH(f)*k,px=fx-camX+(x-fx+camX)*q,py=fy+(195-fy)*q*q-40*Math.sin(q*Math.PI);
   ctx.save();ctx.beginPath();ctx.rect(0,0,W,191);ctx.clip();ctx.translate(px,py);ctx.rotate(q*1.2);ctx.drawImage(f,-w/2,-h*.85,w,h);ctx.restore();}}
 if(t>=CUT.splash){splash(ctx,t-CUT.splash,x,'back',.36);splash(ctx,t-CUT.splash,x,'front',.36);}
}

// ---------------------------------------------------------------- the magnet's moves
function start(b,k){
 const p=G.player;b.pattern=k;b.t=0;b.hitLanded=false;
 if(k==='magpull'){b.state='pullwind';H.sound('magnet_zap',.35);}
 if(k==='magscrap'){b.state='scrapup';b.carry=null;b.scrapKind=JUNK[(JUNK.indexOf(b.scrapKind)+1)%JUNK.length];}
 if(k==='magyank'){b.state='yankseek';b.yankee=null;b.yankAt=yankTarget(b);H.sound('magnet_zap',.3);}
 G.audio.sfx('blip');
}
export function magnetUpdate(b){
 const p=G.player,L=late(b);
 b.reflectTarget={x:b.x,y:b.y-b.z-34};
 G.audio.roomLoop?.('magnet_hum',['pullwind','pull'].includes(b.state)?.4:b.state==='shorted'?0:.16);
 scrapsUpdate(b);
 if(b.flung&&!G.shots.includes(b.flung.s))landFlung(b);
 if(b.yankee&&!['yankseek','yankhold','yankfling'].includes(b.state))dropYankee(b);
 switch(b.state){
  case 'idle':case 'recover':
   b.state='idle';b.carry=null;b.z+=clamp(MREST-b.z,-2.5,2.5);b.x+=clamp(clamp(p.x,H.L()+30,H.park())-b.x,-.8,.8);b.y+=clamp(H.lane(b.x)-b.y,-.8,.8);
   if(b.crewBusy)b.atkCd=Math.max(b.atkCd,10);
   if(['down','getup'].includes(p.state))b.atkCd=Math.max(b.atkCd,20);
   if(--b.atkCd<=0&&Math.abs(b.z-MREST)<3)start(b,DECK[b.turn++%DECK.length]);
   return true;
  case 'pullwind':
   b.x+=clamp(clamp(p.x,H.L()+20,H.R()-20)-b.x,-2,2);b.y+=clamp(H.lane(b.x)-b.y,-1.2,1.2);b.z+=clamp(70-b.z,-2,2);
   if(b.t>=(L?PULL.lateWind:PULL.wind)){b.state='pull';b.t=0;b.yanked=null;H.sound('magnet_zap',.5);}
   return true;
  case 'pull':{
   const hold=L?PULL.lateHold:PULL.hold,on=b.t<hold-PULL.cut;
   if(b.t===hold-PULL.ring){b.slamAt=[b.x,b.y];G.audio.sfx('armor');}
   if(on&&grounded(p)&&!p.invuln){const dx=b.x-p.x,d=Math.abs(dx);if(d>4&&d<220){const v=(L?PULL.lateSpeed:PULL.speed)*(d>150?.6:1);p.x+=Math.sign(dx)*Math.min(d-4,v);p.y+=clamp(b.y-p.y,-.25,.25);p.magnetPull=G.time;}}
   // The gag: it rips a wrench out of a crewman's hand on the way.
   if(b.t===24&&!b.yanked){const e=b.crewActors.find(e=>!e.dead&&Math.abs(e.x-b.x)<200);if(e){b.yanked={x:e.x,y:e.y-44,t:0};e.atkCd=Math.max(e.atkCd,150);spawnPop(e.x,e.y-96,'MY WRENCH!');G.audio.sfx('whiff');}}
   if(b.yanked)b.yanked.t++;
   if(b.t>=hold){b.state='pullslam';b.t=0;b.vz=0;}
   return true;
  }
  case 'pullslam':
   if(b.slamAt){b.x+=clamp(b.slamAt[0]-b.x,-3,3);}
   b.vz=Math.min(b.vz+1.6,13);b.z-=b.vz;
   if(b.z<=0){b.z=0;b.state='slammed';b.t=0;b.yanked=null;impact(b,b.x,b.y,36,16,18,'magnet_clang');}
   return true;
  case 'slammed':
   if(b.t%7===0)spawnSpark(b.x+((b.t*23)%50)-25,b.y-6);
   if(b.t>=(L?72:92)){b.state='magrise';b.t=0;}
   return true;
  case 'magrise':b.z+=clamp(MREST-b.z,-2.4,2.4);if(b.z>=MREST-1){b.state='idle';b.t=0;b.atkCd=L?28:40;}return true;
  case 'scrapup':
   b.z+=4;b.x+=clamp(clamp(p.x,H.L()+40,H.R()-40)-b.x,-2,2);
   if(b.z>=200){b.state='scrapaim';b.t=0;b.carry=b.scrapKind;G.audio.sfx('armor');}
   return true;
  case 'scrapaim':
   b.z+=clamp(112-b.z,-4,4);b.x+=clamp(clamp(p.x,H.L()+40,H.R()-40)-b.x,-2.2,2.2);b.y+=clamp(H.lane(b.x)-b.y,-1.5,1.5);
   if(b.t>=(L?40:52)&&b.z<116){b.state='scraplock';b.t=0;G.audio.sfx('armor');}
   return true;
  case 'scraplock':
   if(b.t>=14){dropScrap(b);b.carry=null;b.state='scrapdone';b.t=0;H.sound('magnet_zap',.3);}
   return true;
  case 'scrapdone':b.z+=clamp(MREST-b.z,-2,2);if(b.t>=36){b.state='idle';b.t=0;b.atkCd=L?30:44;}return true;
  case 'yankseek':{
   const a=b.yankAt,e=a?.e;
   if(e&&(e.dead||!G.enemies.includes(e)||!yankable(e))){b.yankAt=yankTarget(b,true);b.t=0;return true;}
   const tx=e?e.x:a.x,tz=e?YANK.hang:8;
   b.x+=clamp(tx-b.x,-3,3);b.z+=clamp(tz-b.z,-3,3);b.y+=clamp((e?e.y:a.y)-b.y,-1.2,1.2);
   if(e){e.vx=0;e.atkCd=Math.max(e.atkCd,60);if(['walk','approach','windup','attack'].includes(e.state)){e.state='idle';e.t=0;}if(b.t%6===0)spawnSpark(e.x+(e.face||1)*14,e.y-48);}
   if(Math.abs(tx-b.x)<4&&Math.abs(tz-b.z)<4)rip(b);
   else if(b.t>=YANK.seek){b.state='idle';b.t=0;b.atkCd=20;}   // never got there: give up rather than rip from afar
   return true;
  }
  case 'yankhold':{
   const away=clamp(G.camLock+(p.x<G.camLock+240?340:140),H.L()+30,H.R()-30);
   b.x+=clamp(away-b.x,-2.4,2.4);b.z+=clamp(150-b.z,-3,3);b.y+=clamp(H.lane(b.x)-b.y,-1,1);
   if(b.t>=(L?YANK.lateHold:YANK.hold)){b.state='yankfling';b.t=0;fling(b);}
   return true;
  }
  case 'yankfling':
   b.z+=clamp(MREST-b.z,-2,2);
   if(b.t>=YANK.fling){b.state='idle';b.t=0;b.atkCd=L?30:42;}
   return true;
  case 'shorted':
   b.vz=(b.vz||0)-.55;b.z=Math.max(0,b.z+b.vz);
   if(b.z===0&&b.vz<0){if(b.vz<-4){G.shake=Math.max(G.shake,8);H.sound('slam',.6);spawnDust(b.x,b.y,12);spawnShock(b.x,b.y);b.vz=-b.vz*.25;}else b.vz=0;}
   if(b.t%4===0)spawnSpark(b.x+((b.t*29)%60)-30,b.y-b.z-20+((b.t*11)%16));
   if(b.t%12===0)spawnSmoke(b.x+10,b.y-b.z-50,1);
   if(b.t>=(L?118:146)){b.state='magrise';b.t=0;}
   return true;
 }
 return false;
}
// Where scrap or the magnet comes down: anything under it is under it.
function impact(b,x,y,rx,ry,dmg,snd){
 const p=G.player;G.shake=Math.max(G.shake,9);H.sound(snd,.7);G.audio.sfx('heavy');spawnShock(x,y);spawnDust(x,y,14);spawnDebris(x,y-6,8,['#5a4a3a','#2a2018','#8a6a3a']);
 if(Math.abs(p.x-x)<rx&&Math.abs(p.y-y)<ry&&p.z<14&&!['down','getup'].includes(p.state)&&!p.dying){
  if(!resolveIncomingHit(p,b,{parryClass:'unblockable',dmg,dir:p.x<x?-1:1,heavy:true}))hurtPlayer(p,dmg,p.x<x?-1:1,true);
 }
}
// Scrap: one heavy piece, or the rebar as three spear clusters in a row across CHAD's lane. A fridge lands upright
// and stays as a breakable (dl_fridge) with food inside.
const SCRAP={taxi:{art:'scrap',rx:66,ry:20,dmg:20,life:420,snd:'break_metal'},rickshaw:{art:'rickshaw',rx:52,ry:18,dmg:18,life:420,snd:'break_metal'},
 rebar:{art:'rebar',rx:16,ry:10,dmg:12,life:300,snd:'magnet_clang',row:[-36,0,36],sink:5},fridge:{art:'fridge',rx:30,ry:14,dmg:16,life:0,snd:'magnet_clang'}};
const scrapArt=kind=>art(SCRAP[kind]?.art,0);
const carryHang=f=>frameH(f)-Math.min(20,frameH(f)*.25);   // how far the carried piece's bottom hangs under the pole face
function dropScrap(b){
 b.scraps=b.scraps||[];const d=SCRAP[b.carry],f=scrapArt(b.carry);if(!d)return;const z=b.z-(f?carryHang(f):8);   // let go from where it hung
 for(const [i,dx]of (d.row||[0]).entries())b.scraps.push({kind:b.carry,x:b.x+dx,y:b.y,z,vz:0,delay:i*7,t:0});
}
function scrapsUpdate(b){
 if(!b.scraps)return;
 for(const s of b.scraps){
  if(s.delay>0){s.delay--;continue;}s.t++;
  if(!s.down){s.vz=Math.min(s.vz+1.2,12);s.z-=s.vz;if(s.z<=0){s.z=0;s.down=G.time;const d=SCRAP[s.kind];impact(b,s.x,s.y,d.rx,d.ry,d.dmg,d.snd);
   if(d.rx>40){G.shake=Math.max(G.shake,11);H.sound('neta_roof_thud',.6);}
   if(s.kind==='fridge')standFridge(s);}}
 }
 b.scraps=b.scraps.filter(s=>!s.down||G.time-s.down<SCRAP[s.kind].life);
}
// The fridge stays on the deck: smash it open and the crew's lunch falls out.
PROP_TYPES.dl_fridge={update(pr){if(pr.broken&&(pr.brokenT=(pr.brokenT||0)+1)>360)pr.hidden=true;},hp:18,w:30,h:58,shadowR:14,score:80,drop:'plate',breakSound:'break_metal',debris:['#d8d0b8','#8a6a44','#4a4038'],
 draw(ctx,pr,camX){
  const f=art('fridge',pr.broken?1:0);if(!f||pr.hidden)return;
  const wob=pr.shakeT>0?((pr.t&1)?1:-1):0,x=Math.round(pr.x-camX)+wob,y=Math.round(pr.y-pr.z),w=frameW(f),h=frameH(f);
  ctx.save();ctx.globalAlpha*=pr.broken?clamp((360-(pr.brokenT||0))/40,0,1):1;
  ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(x,y,16,4,0,0,Math.PI*2);ctx.fill();
  ctx.drawImage(f,x-Math.round(w/2),y-h+2,w,h);
  if(pr.flash>0&&!pr.broken){ctx.globalCompositeOperation='lighter';ctx.globalAlpha*=.5;ctx.drawImage(f,x-Math.round(w/2),y-h+2,w,h);}
  ctx.restore();
 }};
function standFridge(s){
 s.gone=true;const pr=createProp('dl_fridge',s.x,s.y);pr.dredgerFridge=true;
 const old=G.props.filter(q=>q.dredgerFridge);if(old.length>=2)G.props=G.props.filter(q=>q!==old[0]);
 G.props.push(pr);
}
// Scrap yank: the nearest crewman on his feet within reach, by his steel wrench; failing that, a hatch lid out of the deck.
const yankable=e=>!e.dead&&e.z<1&&!['down','getup','thrown','grabbed','dying','stagger','spawn'].includes(e.state);
function yankTarget(b,hatch=false){
 const p=G.player,e=hatch?null:b.crewActors.filter(e=>yankable(e)&&G.enemies.includes(e)&&Math.abs(e.x-b.x)<YANK.reach).sort((u,v)=>Math.abs(u.x-b.x)-Math.abs(v.x-b.x))[0];
 if(e)return {e};
 const dir=Math.sign(b.x-p.x)||1;return {x:clamp(b.x+dir*30,H.L()+30,H.R()-30),y:b.y};
}
function rip(b){
 const e=b.yankAt?.e;G.audio.sfx('whiff');H.sound('magnet_clang',.6);G.shake=Math.max(G.shake,4);
 if(e){G.enemies=G.enemies.filter(o=>o!==e);b.yankee={kind:'crew',e};spawnPop(e.x,e.y-110,'BOSS, NOOO!');spawnDust(e.x,e.y,6);}
 else{b.yankee={kind:'hatch'};(b.holes=b.holes||[]).push({x:b.x,y:b.y});if(b.holes.length>3)b.holes.shift();
  spawnDust(b.x,b.y,10);spawnDebris(b.x,b.y-4,8,['#5a4a3a','#2a2018','#8a6a3a']);for(let i=0;i<5;i++)spawnSpark(b.x-12+i*6,b.y-4);}
 b.state='yankhold';b.t=0;
}
// Flung in an arc into CHAD's lane: green, parry it back up into the magnet.
function fling(b){
 const p=G.player,y=b.yankee;if(!y)return;
 const crew=y.kind==='crew',z0=Math.max(10,b.z-(crew?58:14)),dx=clamp(p.x-b.x,-220,220),T=clamp(Math.round(Math.abs(dx)/4.5),30,44);
 spawnArc(crew?'crewman':'hatch',b.x,p.y,dx/T,(.12*T*T-z0)/T,crew?16:14,null,{source:b,parryClass:'reflect',z:z0,hitRadius:crew?22:16});
 const s=G.shots[G.shots.length-1];s.draw=drawFlung;s.crew=y.e;b.flung={s,e:y.e};b.yankee=null;
 G.audio.sfx('throw');H.sound('magnet_zap',.35);if(crew)G.audio.sfx('whiff');
}
// Whatever it threw hits the deck (or CHAD): a crewman crashes down and has to get up again; a hatch lid clangs.
function landFlung(b){
 const {s,e}=b.flung;b.flung=null;if(s.handled)return;
 if(e)reinsert(e,s.x,s.y,Math.sign(s.vx)||1,8);
 else{H.sound('magnet_clang',.5);spawnDust(s.x,s.y,6);for(let i=0;i<4;i++)spawnSpark(s.x-8+i*5,s.y-4);}
}
function dropYankee(b){
 const y=b.yankee;b.yankee=null;if(y.kind==='crew')reinsert(y.e,b.x,b.y,Math.sign(b.x-G.player.x)||1,4);
}
// The rig is going down: whoever it holds or threw lands now, before the magnet stops updating.
export function releaseYank(b){
 if(b.yankee)dropYankee(b);
 if(b.flung){G.shots=G.shots.filter(s=>s!==b.flung.s);landFlung(b);}
}
function reinsert(e,x,y,dir,dmg){
 Object.assign(e,{x:clamp(x,H.L()+16,H.R()-16),y:clamp(y,laneMin(x),FLOOR_BOT),z:0,vx:0,vz:0,state:'idle',t:0});
 if(!G.enemies.includes(e))G.enemies.push(e);e.hurt(dmg,dir,true,false);G.audio.sfx('heavy');spawnDust(e.x,e.y,8);
}
// A parried crewman or hatch lid hits the magnet: a short (and the crewman is out cold). Crew wrenches only dent it.
export function magnetReflect(b,s){
 if(s.kind!=='crewman'&&s.kind!=='hatch'){H.smashSmall(b);return;}
 s.handled=true;if(b.flung?.s===s)b.flung=null;
 if(s.crew){reinsert(s.crew,b.x,b.y,s.vx<0?-1:1,s.crew.hp+99);spawnPop(b.x,b.y-60,'OUT COLD!');}
 b.overload=(b.overload||0)+1;G.hitstop=Math.max(G.hitstop,10);G.flash=2;H.sound('magnet_zap',.8);H.sound('break_metal',.6);
 spawnPop(b.x,b.y-b.z-80,b.overload>=OVERLOADS?'TOTAL BLACKOUT!':`SHORT CIRCUIT ${b.overload}/${OVERLOADS}`);
 for(let i=0;i<6;i++)spawnSpark(b.x-30+i*12,b.y-b.z-30+((i*7)%12));
 b.componentApplying=true;b.hurt(Math.round(b.maxhp*.085),1,true,false);b.componentApplying=false;
 if(b.yankee)dropYankee(b);Object.assign(b,{state:'shorted',t:0,vz:0,carry:null,yanked:null});
 if(b.overload>=OVERLOADS)b.operatorPending=true;
}
export const magnetOpen=b=>b.state==='slammed'||b.state==='shorted'&&b.z<12;
export const magnetDanger=s=>['pull','pullslam','scrapaim','scraplock','yankhold','yankfling'].includes(s);
export function magnetCue(b){
 const s=b.state;
 if(s==='yankhold'&&b.t>=(late(b)?YANK.lateHold:YANK.hold)-GREEN_WARNING_TICKS)return 'counter';
 if(['pullwind','scrapaim','scraplock'].includes(s)||s==='pull'&&b.t>=(late(b)?PULL.lateHold:PULL.hold)-PULL.ring)return 'unblockable';
 return null;
}

// ---------------------------------------------------------------- drawing
const charged=b=>['pullwind','pull','yankseek','yankhold','scrapaim','scraplock'].includes(b.state)||b.state==='cutloose'&&b.t>CUT.lower;
export function magnetFrame(b,g){
 if(g!==b||b.state==='shorted'||b.state==='blowout'||b.phase==='operator')return 2;
 if(b.state==='pullwind')return (b.t>>2)&1?1:0;
 return charged(b)?1:0;
}
// The magnet at screen (sx, sy = its pole face). The cable runs up to (px, py).
export function drawMagnetArt(ctx,sx,sy,idx,{px=sx,py=-4,jolt=0,cue=null,cueActor=null}={}){
 const f=art('magnet',idx),k=MAG_K,top=sy-(MAG_BOTTOM-MAG_SHACKLE[1])*k;
 ctx.save();ctx.strokeStyle='#15100c';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(px,py);ctx.lineTo(sx,top);ctx.stroke();
 ctx.strokeStyle='#6a5a48';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(px+1,py);ctx.lineTo(sx+1,top);ctx.stroke();ctx.restore();
 if(!f){ctx.fillStyle='#4a3a2a';ctx.fillRect(sx-40,sy-30,80,28);return top;}
 const w=frameW(f)*k,h=frameH(f)*k,x=sx-MAG_SHACKLE[0]*k+jolt,y=sy-MAG_BOTTOM*k;
 ctx.drawImage(f,x,y,w,h);if(cue)drawAttackAccent(ctx,f,x,y,cueActor,cue,w,h);
 return top;
}
function drawScrapPiece(ctx,kind,x,y,{alpha=1}={}){
 const f=scrapArt(kind);if(!f)return;const w=frameW(f),h=frameH(f);
 ctx.save();ctx.globalAlpha*=alpha;ctx.drawImage(f,Math.round(x-w/2),Math.round(y-h),w,h);ctx.restore();
}
// A flung crewman (flat out, tumbling once he is sent back) or a spinning hatch lid, with its shadow and the parry glint.
function drawFlung(ctx,s,sx,sy){
 ctx.save();ctx.fillStyle='rgba(0,0,0,.3)';ctx.beginPath();ctx.ellipse(sx,Math.round(s.y),s.crew?22:10,4,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const dir=s.vx<0?-1:1,f=s.crew?crewArt(s.reflected?2:1):art('hatch',0);
 ctx.save();ctx.translate(sx,sy-10);ctx.scale(dir,1);
 if(s.crew)ctx.rotate(s.reflected?s.t*.25:Math.atan2(-(s.vz||0),Math.abs(s.vx)||1)*.5);else ctx.scale(Math.max(.15,Math.abs(Math.cos(s.t*.35))),1);
 if(f){const w=frameW(f),h=frameH(f);ctx.drawImage(f,-w/2,-h/2,w,h);}else{ctx.fillStyle='#4a3a2a';ctx.fillRect(-10,-6,20,12);}
 ctx.restore();
 if(!s.reflected&&(s.t>>2)%3===0){ctx.fillStyle='#b8ffc4';const gx=sx+dir*8,gy=sy-14;ctx.fillRect(gx-2,gy,5,1);ctx.fillRect(gx,gy-2,1,5);ctx.fillStyle='#6dff82';ctx.fillRect(gx-1,gy-1,3,3);ctx.fillStyle='#fff';ctx.fillRect(gx,gy,1,1);}
}
// What hangs off the pole face: a crewman by his wrench (grip at the frame's top), a hatch lid, a load of junk.
const GRIP=[22.5,3];
function drawYankee(ctx,b,sx,sy,cue){
 const y=b.yankee;if(!y)return;
 if(y.kind==='crew'){const f=crewArt(0);if(!f)return;const face=G.player.x<b.x?-1:1;
  ctx.save();ctx.translate(sx,sy-2);ctx.scale(face,1);ctx.rotate(Math.sin(b.t*.22)*.1);ctx.drawImage(f,-GRIP[0],-GRIP[1],frameW(f),frameH(f));
  if(cue)drawAttackAccent(ctx,f,-GRIP[0],-GRIP[1],b,cue,frameW(f),frameH(f));ctx.restore();}
 else{const f=art('hatch',0);if(!f)return;const w=frameW(f),h=frameH(f);ctx.drawImage(f,Math.round(sx-w/2),sy-4,w,h);if(cue)drawAttackAccent(ctx,f,Math.round(sx-w/2),sy-4,b,cue,w,h);}
}
// Under the actors: its shadow, the red rings and the scrap lying about.
export function drawMagnetMarks(ctx,b,camX){
 const x=Math.round(b.x-camX),y=Math.round(b.y),k=clamp(1-b.z/140,.25,1);
 ctx.save();ctx.fillStyle=`rgba(0,0,0,${.16+.24*k})`;ctx.beginPath();ctx.ellipse(x,y,32*k+8,7*k+2,0,0,Math.PI*2);ctx.fill();ctx.restore();
 const ring=(rx,ry,cx,cy,lock)=>{ctx.save();ctx.globalAlpha=lock?((G.time>>2)&1?.95:.45):.55;ctx.strokeStyle='#ff4050';ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(Math.round(cx-camX),Math.round(cy),rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha*=.35;ctx.fillStyle='#ff4050';ctx.fill();ctx.restore();};
 if(b.state==='pull'&&b.slamAt||b.state==='pullslam')ring(36,16,b.slamAt?.[0]??b.x,b.slamAt?.[1]??b.y,true);
 if(b.state==='scrapaim'||b.state==='scraplock'){const lock=b.state==='scraplock';
  const d=SCRAP[b.carry];if(d)for(const dx of d.row||[0])ring(d.rx,d.ry,b.x+dx,b.y,lock);}
 for(const h of b.holes||[]){const f=art('hole',0);if(f)ctx.drawImage(f,Math.round(h.x-camX-frameW(f)/2),Math.round(h.y-frameH(f)/2),frameW(f),frameH(f));}
 for(const s of b.scraps||[]){
  if(s.gone)continue;const d=SCRAP[s.kind];
  if(!s.down){if(s.delay<8)ring(d.rx,d.ry,s.x,s.y,true);continue;}
  drawScrapPiece(ctx,s.kind,s.x-camX,s.y+3+(d.sink||0),{alpha:clamp((d.life-(G.time-s.down))/60,0,1)});}
}
// The magnet itself, what it carries and its arcs.
export function drawMagnet(ctx,b,camX){
 const sx=Math.round(b.x-camX),sy=Math.round(b.y-b.z),cue=magnetCue(b),idx=magnetFrame(b,b);
 const jolt=b.superLocked||b.flash>0||b.state==='shorted'&&b.t<30?((G.time>>1)&1?1:-1):0;
 // Falling scrap, and rebar spears still waiting their turn to drop, hanging where they were.
 for(const s of b.scraps||[])if(!s.down)drawScrapPiece(ctx,s.kind,s.x-camX,s.y-s.z);
 // What it carries hangs stuck to the pole face.
 const cf=b.carry&&scrapArt(b.carry);
 if(cf){const y=sy+carryHang(cf);for(const dx of SCRAP[b.carry].row||[0])drawScrapPiece(ctx,b.carry,sx+dx,y);}
 drawYankee(ctx,b,sx,sy,cue==='counter'?'counter':null);
 const top=drawMagnetArt(ctx,sx,sy,idx,{px:sx,py:-4,jolt,cue:cue==='unblockable'?'unblockable':null,cueActor:b});
 // The ripped-out wrench flies up to the magnet, as big as a thrown crew wrench.
 if(b.yanked){const q=clamp(b.yanked.t/20,0,1),f=art('wrench',0);if(f){const wx=b.yanked.x-camX+(sx-(b.yanked.x-camX))*q,wy=b.yanked.y+(sy-8-b.yanked.y)*q;const k=30/frameW(f);ctx.save();ctx.translate(wx,wy);ctx.rotate(q*4+.3);ctx.drawImage(f,-frameW(f)*k/2,-frameH(f)*k/2,frameW(f)*k,frameH(f)*k);ctx.restore();}}
 if(charged(b)&&b.state!=='cutloose'||b.state==='cutloose'&&b.t>CUT.lower)arcs(ctx,b,sx,sy);
 if(cue&&!G.reflecting&&b.state!=='pull'&&b.state!=='scrapaim'&&b.state!=='scraplock')drawAttackMarker(ctx,cue,sx,top-10,b);
}
// Blue-white arcs round the rim, and while it pulls, crawling down to CHAD.
function arcs(ctx,b,sx,sy){
 if(G.reflecting)return;const p=G.player,seed=Math.floor(G.time/2);
 const bolt=(x0,y0,x1,y1,n,s)=>{ctx.beginPath();ctx.moveTo(x0,y0);for(let i=1;i<n;i++){const q=i/n,j=Math.sin((s+i)*12.9898)*43758.5;ctx.lineTo(x0+(x1-x0)*q+((j-Math.floor(j))-.5)*8,y0+(y1-y0)*q+((j*7-Math.floor(j*7))-.5)*6);}ctx.lineTo(x1,y1);ctx.stroke();};
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<2;i++){ctx.strokeStyle=i?'rgba(220,245,255,.9)':'rgba(90,170,255,.55)';ctx.lineWidth=i?1:2;
  bolt(sx-38,sy-10,sx-20,sy+2,4,seed+i);bolt(sx+38,sy-12,sx+22,sy+2,4,seed+7+i);
  if(b.state==='pull'&&b.t<(late(b)?PULL.lateHold:PULL.hold)-PULL.cut&&Math.abs(p.x-b.x)<170&&seed%3!==1)bolt(sx,sy+2,Math.round(p.x-G.camX),Math.round(p.y-p.z-40),7,seed*3+i);}
 ctx.restore();
}
