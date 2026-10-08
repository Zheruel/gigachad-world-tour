// The Closer's performance: pose selection from the shared contact clock, his thrown wine-red handsets and
// the things he tears off in the phase break. Drawing never advances a fight or schedules a sound.
import { G } from './engine.js';
import { ASSETS } from './assets.js';
import { getFrame, frameW, frameH } from './sprites.js';
import { getAIFrame } from './aiframes.js';
import { blitTelegraph,drawCueMarker } from './bosslib.js';
import { poseAttackMarkerY } from './combat_cues.js';
import { CLOSER_TIMING, getCloserBeat } from './refund_boss_timing.js';
import { closerIntroPose } from './refund_boss_intro.js';
import { refundGaitFrame } from './refund_gait.js';
export const closerVisibleCue=b=>['counter','reflect','unblockable'].includes(getCloserBeat(b).cls)&&
 (['boxing','handset','deal'].includes(b.state)||b.state==='windup'&&b.t>6)&&!b.superLocked&&!b.protectedStagger;

// Frame families (see tools/production/build_closer_king.py):
//  boxing 0 guard 1 breath 2 jab tell 3 jab 4 retract 5 overhand cocked 6 swing 7 overhand contact
//  cross 0 body tell 1 body shot 2 cross tell 3 cross 4 follow-through 5 retract; block; stumble
//  handset 0 draw 1 cocked 2 release 3 follow-through; reload 0 new handset 1 smug; call 0 shout 1 point
//  deal 0 offer 1 lunge 2 grip 3 headbutt tell 4 headbutt 5 shove-off 6 whiff 7 winded
//  phasebreak 0 brace 1 lapels 2 rip 3 sleeve 4 shades 5 roar 6 slam 7 new guard
export function closerPose(b) {
 const t=b.t||0, beat=getCloserBeat(b), pose=(action,index=0)=>({action,index,cls:beat.cls});
 if(G.state==='bossintro'){const p=closerIntroPose(b.introT||0);return pose(p.action,p.frame);}
 if(b.dead||b.state==='down')return pose('down');
 if(b.state==='getup')return pose('getup',Math.min(2,Math.floor(t*3/CLOSER_TIMING.getup)));
 if(b.guardFlash>0)return pose('block');
 if(b.hitReactT>0)return pose('hurt',Math.floor(b.hp/9)%2);
 if(b.protectedStagger>0||['stagger','hurt'].includes(b.state))return pose('stagger',Math.floor((b.protectedStagger||t)/14)%2);
 if(b.state==='phase-break'){
  const k=CLOSER_TIMING.phaseBreak;
  return pose('phasebreak',t<12?0:t<k.rip?1:t<k.impact+4?2:t<k.shades?3:t<k.roar?4:t<k.slam?5:t<k.guard?6:7);
 }
 if(b.state==='windup'){
  const w=beat.timing.wind,late=t>=w-8;
  if(b.pattern==='boxing')return late?pose('boxing',2):pose('idle',Math.floor(t/8)%2);
  if(b.pattern==='handset')return pose('handset',t<14?0:1);
  if(b.pattern==='call')return pose('call',0);
  if(b.pattern==='deal')return pose('deal',0);
 }
 if(b.state==='boxing'){
  const age=t-beat.at;
  if(beat.name==='body')return pose('cross',age<0?0:age<=5?1:0);
  if(beat.name==='cross')return pose('cross',age<0?2:age<=3?3:age<=8?4:age<=14?5:5);
  if(beat.name==='overhand'){
   if(age<-4)return pose('boxing',5);
   if(age<0)return pose('boxing',6);
   return age<=8?pose('boxing',7):pose('boxing',age<=14?4:0);
  }
  // jabs: a short tell, the snap, the retract, then guard
  if(age<-6)return pose('idle',0);
  return pose('boxing',age<0?2:age<=3?3:age<=7?4:0);
 }
 if(b.state==='handset'){
  const at=beat.at;
  if(beat.part==='tell')return pose('handset',beat.strike?1:1);
  if(beat.part==='contact')return pose('handset',2);
  if(beat.part==='rearm')return t<at+12?pose('handset',3):pose('reload',0);
  return pose('handset',3);
 }
 // On the phone to his floor: he barks into it (shout/point alternating), then points CHAD out.
 if(b.state==='call')return pose('call',beat.part==='call'?Math.floor(t/9)%2:1);
 if(b.state==='deal')return pose('deal',1);
 if(b.state==='dealhold'){
  const hb=beat.timing.headbutt;
  if(!b.phaseTwo)return pose('deal',t<hb?2:5);
  if(t<hb-10)return pose('deal',2);
  if(t<hb-3)return pose('deal',3);
  if(t<hb+10)return pose('deal',4);
  // The deal is closed: he points down at CHAD, then squares up.
  return t<beat.timing.end-8?pose('taunt',4):pose('idle',0);
 }
 if(b.state==='stumble')return pose('deal',beat.part==='lurch'?6:7);
 if(b.state==='recover'){
  const early=t<(b.recovery||54)*.45,move=beat.move;
  if(move==='boxing')return early?pose(b.phaseTwo?'cross':'stumble',b.phaseTwo?5:0):pose('idle',0);
  if(move==='handset')return t<18?pose('reload',0):t<36?pose('reload',1):pose('idle',0);
  if(move==='call')return early?pose('call',1):pose('idle',0);
  if(move==='deal')return early&&!b.dealClosed?pose('deal',7):pose('idle',Math.floor(t/18)%2);
 }
 if(b.state==='reguard')return pose('block');
 if(b.moved>.08){
  const d=b.refundWalkPos??(b.stridePhase||0)*(b.state.startsWith('setup-')&&b.stepDir*b.face<0?-1:1);
  return pose('walk',refundGaitFrame(b.set._aiKey,d,false,getAIFrame(b.set._aiKey,'walk')?.f.length||8));
 }
 return pose('idle',Math.floor(t/18)%2);
}

export function drawCloser(ctx,b,camX) {
 const p=closerPose(b), exact=getAIFrame(b.set._aiKey,p.action);
 // Missing families fall back to a readable neighbour while art loads.
 const action=exact||b.set[p.action]?p.action:['phasebreak','stumble'].includes(p.action)?'hurt':p.action==='seated'?'idle':'idle';
 const f=getFrame(b.set,action,p.index,b.face);
 const seatLift=G.state==='bossintro'&&p.action==='seated'&&p.index<4?12:0;
 const x=Math.round(b.x-camX),y=Math.round(b.y-b.z-seatLift);
 const cue=closerVisibleCue(b);
 blitTelegraph(ctx,b,f,x-frameW(f)/2,y-frameH(f)+4,cue,p.cls);
 if(cue){
  const top=y-frameH(f)+4,my=Math.round(poseAttackMarkerY(f,top,b,top-12)),mx=x;
  drawCueMarker(ctx,b,mx,my,p.cls);
 }
 drawCloserFx(ctx,b,x,y,f);
}
// Dizzy stars over a broken guard; the call's ring; the roar's shockwave.
function drawCloserFx(ctx,b,x,y,f){
 if(G.reflecting)return;
 // `top` is the top of his drawn head (the frame canvas has headroom above it).
 const top=poseAttackMarkerY(f,y-frameH(f)+4,{y:b.y,z:b.z},y-110)+12,t=G.time;
 if(b.protectedStagger>45||b.guard===0&&b.protectedStagger>0){
  ctx.save();
  for(let i=0;i<3;i++){const a=t*.12+i*Math.PI*2/3,sx=Math.round(x+Math.cos(a)*14),sy=Math.round(top-4+Math.sin(a)*4);
   for(const [c,g] of [['#140a0e',1],[Math.sin(a)<0?'#c9a24a':'#fff3a8',0]]){ctx.fillStyle=c;ctx.fillRect(sx-1-g,sy-4-g,3+2*g,9+2*g);ctx.fillRect(sx-4-g,sy-1-g,9+2*g,3+2*g);}}
  ctx.restore();
 }
 if(b.state==='call'&&b.t<getCloserBeat(b).timing.rally+10||b.state==='windup'&&b.pattern==='call'&&b.t>10){
  // Ring arcs off the handset at his ear (the side away from CHAD): dark under-stroke, screen-blue arc.
  const hx=x-b.face*14,hy=top+16,a0=b.face<0?0:Math.PI;ctx.save();ctx.lineCap='round';
  for(let i=0;i<3;i++){const r=7+((b.t*.6+i*5)%15);ctx.globalAlpha=Math.min(1,1.4-r/22);
   for(const [w,c] of [[4,'#08101c'],[2,'#4fd2ff']]){ctx.lineWidth=w;ctx.strokeStyle=c;ctx.beginPath();ctx.arc(hx,hy,r,a0-Math.PI/3.2,a0+Math.PI/3.2);ctx.stroke();}}
  ctx.restore();
 }
 const age=t-(b.roarAt??-99);
 if(age>=0&&age<22){ctx.save();ctx.globalAlpha=1-age/22;ctx.strokeStyle=age<8?'#fff2c0':'#ff4a2a';ctx.lineWidth=3-age/11;ctx.beginPath();ctx.arc(x,top+14,10+age*5,0,Math.PI*2);ctx.stroke();ctx.restore();}
}

// Wine-red handsets spin out of his hand at shoulder height and settle to chest height.
export function drawHandsetShot(ctx,s,sx,sy){
 const im=ASSETS.cl_handset,lift=46+Math.max(0,40-s.t*3),dir=Math.sign(s.vx)||1,spin=a=>a*.32*dir+(s.spin||0),k2=1.35;
 // Motion trail: two fading copies behind it, then the spinning wine-red handset with a glint.
 for(let k=2;k>=0;k--){
  ctx.save();ctx.globalAlpha=k?.38/k:1;ctx.translate(sx-s.vx*k*3,sy-lift);ctx.rotate(spin(s.t-k*2));
  if(s.reflected&&!k){ctx.shadowColor='#7dff8a';ctx.shadowBlur=8;}
  ctx.scale(k2,k2);
  if(im)ctx.drawImage(im,-im.width/4,-im.height/4,im.width/2,im.height/2);
  else{ctx.fillStyle='#d9a53a';ctx.fillRect(-11,-4,22,8);}
  ctx.restore();
 }
 if(s.t%10<3&&!G.reflecting){ctx.save();ctx.fillStyle=s.reflected?'#b8ffbe':'#fff6c8';ctx.fillRect(Math.round(sx)-1,Math.round(sy-lift)-5,2,10);ctx.fillRect(Math.round(sx)-5,Math.round(sy-lift)-1,10,2);ctx.restore();}
}
// Buttons, the torn sleeve and the gold shades: tossed in the phase break, they stay where they land.
export function drawFlungItem(ctx,f,camX){
 if(f.t>=f.life)return;const im=ASSETS[f.key];
 const x=Math.round(f.x-camX),y=Math.round(f.y-f.z);
 ctx.save();ctx.translate(x,y);if(f.z>0)ctx.rotate(f.t*.25*(f.spin%2?1:-1));
 if(f.life<9999)ctx.globalAlpha=Math.min(1,(f.life-f.t)/15);
 if(im)ctx.drawImage(im,-im.width/4,-im.height/2,im.width/2,im.height/2);else{ctx.fillStyle='#d9a53a';ctx.fillRect(-2,-2,4,4);}
 ctx.restore();
 // The flung gold shades catch the light on their way down.
 if(f.glint&&f.z>0&&(f.t>>1)%3===0&&!G.reflecting){ctx.save();ctx.fillStyle='#fff6c8';ctx.fillRect(x-1,y-8,2,8);ctx.fillRect(x-4,y-5,8,2);ctx.restore();}
}
