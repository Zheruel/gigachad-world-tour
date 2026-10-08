// Refund Tower's cosmetic machinery. All anchors come from the authored plates;
// this clock never spawns a fighter, consumes combat RNG or changes prop physics.
import { G, W, clamp } from './engine.js';
import { ASSETS } from './assets.js';

const PANEL=810;
export { REFUND_SCREENS } from './refund_layout.js';
import { REFUND_SCREENS, REFUND_LIGHTS as LIGHTS, REFUND_RACKS as RACKS } from './refund_layout.js';
const THREATS=['windup','attack','charge','special','super','hook','kick'];
function state(){return G.stage?.id==='refund'&&G.india?.refundLife;}
const areaAt=x=>clamp(Math.floor(x/PANEL),0,7)|0;
export function refundRoomCue(name,x,volume=.1,rate=1){
 if(G.paused||G.india?.cinematic||G.india?.endingDone||G.india?.review?.ambient===false)return false;
 const dx=x-(G.camX+W/2),falloff=clamp(1-Math.abs(dx)/310,0,1);
 if(falloff===0)return false;
 const audio=G.audio;
 return !!(audio?.roomSfxAt?audio.roomSfxAt(name,volume*falloff,clamp(dx/(W/2),-1,1),rate):audio?.roomSfx?.(name,volume*falloff));
}
export function initRefundLife(id=G.stage?.id,x=0){
 G.audio?.stopRoomLoop?.('refund_cooling',.12);
 if(!G.india)return;
 G.india.refundLife=id==='refund'?{t:G.india.t||0,lastTick:-1,nextDeskCue:0,nextPhoneCue:0,
  props:new Set(),broken:new WeakSet(),areas:Array.from({length:8},(_,i)=>({fought:i*PANEL+PANEL<x-120,
   clearAt:i*PANEL+PANEL<x-120?0:null,shock:0,damage:0}))}:null;
}
export function updateRefundLife(){
 const life=state(),s=G.india;if(!life)return;
 if(G.paused||!['play','intro'].includes(G.state)||s.cinematic||s.endingDone){
  if(!G.paused)G.audio?.stopRoomLoop?.('refund_cooling',.15);return;
 }
 if(life.lastTick===s.t)return;
 life.lastTick=life.t=s.t;
 for(const p of G.props||[])life.props.add(p);
 // Keep a reference through prop-array cleanup so a smashed terminal still leaves a quiet room.
 for(const p of life.props){
  if(!p.broken||life.broken.has(p))continue;
  life.broken.add(p);const a=life.areas[areaAt(p.x)];a.shock=24;a.damage++;a.fought=true;
 }
 for(const [i,a]of life.areas.entries()){
  a.shock=Math.max(0,a.shock-1);
  const nearby=G.enemies.some(e=>!e.dead&&areaAt(e.x)===i);
  const currentWave=G.waveActive&&areaAt(G.player.x)===i;
  if(nearby||currentWave){a.fought=true;a.clearAt=null;}
  else if(a.fought&&a.clearAt==null&&!s.pendingEntries)a.clearAt=s.t;
  const impact=(G.effects||[]).some(e=>['boxingImpact','koBurst'].includes(e.type)&&e.t<3&&areaAt(e.x)===i);
  if(impact)a.shock=Math.max(a.shock,8);
 }
 if(s.review?.ambient===false||s.review?.environment===false){G.audio?.stopRoomLoop?.('refund_cooling',.2);return;}
 const room=areaAt(G.camX+W/2),a=life.areas[room],quiet=a.clearAt!=null;
 // A restrained air bed becomes a closer, heavier cooling sound in the server wing.
 const cooling=room===4?.15:room<4?.037:room===5?.05:.017;
 G.audio?.roomLoop?.('refund_cooling',cooling*(quiet?.55:1),.5,0);
 for(const n of s.office||[]){
  if(n.row!==0||n.phase!=='working'||n.alert>0||THREATS.includes(G.player.state)&&Math.abs(G.player.x-n.x)<200)continue;
  const phase=(s.t+n.seed)%(620+n.seed%181);
  // One caller's phone at a time, and his own handset gesture answers it.
  if(phase===0&&s.t>=life.nextPhoneCue&&refundRoomCue('refund_ring',n.x,.115)){
   n.callAt=s.t;life.nextPhoneCue=s.t+130;
  }
 }
}
function glow(ctx,x,y,rx,ry,alpha,warm=false){
 if(alpha<=0)return;
 ctx.save();ctx.translate(x,y);ctx.scale(rx,ry);
 const g=ctx.createRadialGradient(0,0,0,0,0,1),rgb=warm?'246,178,89':'138,204,224';
 g.addColorStop(0,`rgba(${rgb},${alpha})`);g.addColorStop(.35,`rgba(${rgb},${alpha*.42})`);g.addColorStop(1,`rgba(${rgb},0)`);
 ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
}
function screenActivity(ctx,i,screen,index,camX,life){
 if(i===0&&index===0&&G.india.refundBreachDone&&
  (G.state!=='intro'||G.india.deskWrecked))return;
 const [local,y,w,h]=screen,x=i*PANEL+local-camX;
 if(x<-30||x>W+30)return;
 const a=life.areas[i],n=(G.india.office||[]).find(n=>areaAt(n.x)===i&&Math.abs((n.keyboardX??n.x)-(i*PANEL+local))<18);
 const left=n?.phase==='gone',age=left?life.t-(n.leftAt??0):a.clearAt==null?0:life.t-a.clearAt;
 const quiet=(left||a.clearAt!=null)?clamp(age/170,0,1):0;
 const seed=i*173+index*67,phase=(life.t+seed)%(430+index*13),f=.92+.08*Math.sin((life.t+seed)*.06);
 const disruption=a.shock>12?.5:1;
 // Dim only the screen's interior: its painted bezel and CRT highlights remain intact.
 ctx.save();ctx.beginPath();ctx.rect(Math.round(x-w/2),Math.round(y-h/2),w,h);ctx.clip();
 if(quiet>0){ctx.fillStyle=`rgba(5,13,18,${quiet*.42})`;ctx.fillRect(x-w/2,y-h/2,w,h);}
 if(quiet<.9){
  const alpha=(1-quiet)*disruption*.24*f;
  ctx.fillStyle=`rgba(154,220,225,${alpha})`;
  const lines=Math.min(4,Math.floor(h/3));
  for(let k=0;k<lines;k++){
   const len=3+(seed+k*17+Math.floor(phase/28))%Math.max(4,w-5);
   ctx.fillRect(Math.round(x-w/2+2),Math.round(y-h/2+2+k*3),len,1);
  }
  if(phase%52<25)ctx.fillRect(Math.round(x+w/2-3),Math.round(y+h/2-3),1,2);
 }
 ctx.restore();
 glow(ctx,x,y+4,21,20,.035*(1-quiet*.8)*disruption*f);
 // Very weak desk/floor bounce, never a bright pickup-sized puddle in the aisle.
 glow(ctx,x,y+25,26,7,.013*(1-quiet));
}
export function drawRefundLife(ctx,camX){
 const life=state(),s=G.india;if(!life||s.review?.environment===false||s.review?.ambient===false||s.review?.fx===false)return;
 if(s.cinematic||s.endingDone)return;
 const first=clamp(Math.floor(camX/PANEL),0,7)|0,last=clamp(Math.floor((camX+W)/PANEL),0,7)|0;
 for(let i=first;i<=last;i++){
  if(!ASSETS[`ic_refund_${['office','annex','calling','calling_east','servers','records','executive','closer'][i]}`])continue;
  const a=life.areas[i];
  for(const [j,[local,y,r,warm]]of LIGHTS[i].entries()){
   const x=i*PANEL+local-camX;if(x<-r||x>W+r)continue;
   const pulse=.86+.08*Math.sin(life.t*.041+j*2.3+i)+.035*Math.sin(life.t*.11+i*3+j);
   glow(ctx,x,y+8,r*1.3,23,(warm?.022:.024)*pulse*(a.shock>12?.45:1),!!warm);
  }
  for(const [j,screen]of REFUND_SCREENS[i].entries())screenActivity(ctx,i,screen,j,camX,life);
 }
 if(first<=4&&last>=4){
  const a=life.areas[4];
  for(const [i,[local,y,rows]]of RACKS.entries()){
   const x=4*PANEL+local-camX;if(x<0||x>W)continue;
   for(let k=0;k<rows;k++){
    const cycle=(life.t+i*79+k*37)%(73+k%5*11);
    if(cycle>11||a.shock>12)continue;
    ctx.fillStyle=k%4?'rgba(109,188,224,.49)':'rgba(171,209,122,.43)';
    ctx.fillRect(Math.round(x+k%3),Math.round(y+k*3.1),1,1);
   }
  }
 }
}
