// The furniture stays in world space. Only the two actors travel through the set.
import {ASSETS} from './assets.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {drawContactShadow} from './contact_shadow.js';
import {drawChadCigarReplay,chadCigarAt} from './cigar_smoke.js';
import {drawRefundBurst,drawRefundRemains} from './refund_gore.js';
import {clamp} from './engine.js';
import {CLOSER_WALL} from './closer_arena.js';
import {dim,flash,speedLines,aura,silhouette,punchBurst,debrisBurst,bloodSpray,bloodArc,bloodDecal,crackFlash,tooth,gore} from './finisher_fx.js';

export const REFUND_FINISH=Object.freeze({ticks:420,deskCharge:8,punch:32,release:38,desk:58,drop:118,charge:146,wallPunch:190,launch:196,wall:212,blast:220,shades:306,cigar:332});
export const REFUND_FLOOR=236;
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1),ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
const CIGAR_BEAT=10,TOP_OFFSET=68;
export function refundDesk(c){return c.desk||{x:6250,y:217};}
export function refundCamera(c,t=c.t){return refundDesk(c).x-250+24*ease((t-REFUND_FINISH.wall+4)/4)+76*ease((t-REFUND_FINISH.wall-4)/18);}
export function refundContact(c,kind){
 const d=refundDesk(c),floor=REFUND_FLOOR;
 return kind==='punch'?{x:d.x-104,y:floor-73}:kind==='desk'?{x:d.x-25,y:d.y-TOP_OFFSET}:{x:d.x-13,y:floor-65};
}
export function refundChadPose(c,t=c.t){
 const F=REFUND_FINISH,d=refundDesk(c),start=d.x-152,first=d.x-138,end=d.x-58;
 let x=start,y=REFUND_FLOOR,pose='idle',i=Math.floor(t/18)%4;
 if(t<56){
  if(t>=F.deskCharge){pose='combo_power_a';i=t<12?0:t<F.punch?1:t<F.release?2:t<46?3:0;x=mix(start,first,ease((t-F.punch+4)/4));}
 }
 else if(t<138){x=mix(first,end,(t-56)/82);pose='walk';i=Math.floor((t-56)/7)%6;}
 else {x=end;
  if(t>=F.charge&&t<F.wallPunch){pose='combo_power_b';i=t<F.wallPunch-10?0:1;x-=12*ease((t-F.charge)/10)*(1-ease((t-F.wallPunch+4)/4));}
  else if(t>=F.wallPunch&&t<F.wallPunch+18){pose='combo_power_b';i=2;}
  else if(t<F.wallPunch+28&&t>=F.wallPunch+18){pose='combo_power_b';i=3;}
  else if(t>=F.shades&&t<F.cigar){pose='idle_shades';i=Math.min(3,Math.floor((t-F.shades)/6));}
  else if(t>=F.cigar){pose='idle_cigar';i=Math.min(5,Math.floor((t-F.cigar)/CIGAR_BEAT));}
 }
 return {x,y,walk:false,chad:{pose,i}};
}
// Desk reaction poses use their lower silhouette edge as an anchor; upright reactions use feet.
export function refundVictim(c,t=c.t){
 const F=REFUND_FINISH,d=refundDesk(c),top=d.y-TOP_OFFSET,start=d.x-88;
 const p={vx:start,vy:REFUND_FLOOR,victim:0,kingThrow:null,lift:0,spin:0,exploded:t>=F.blast};
 if(t<F.punch){p.victim=0;}
 else if(t<F.release){p.victim=1;p.vy-=2.5;}
 else if(t<F.desk){const age=t-F.release,duration=F.desk-F.release,q=age/duration,from=182.39,to=top+9-24.75;
  // One ballistic centre of mass through the folded, diagonal and flat-back poses.
  const cx=mix(start-4.11,d.x-1.88,q),cy=from+((to-from)/duration-.3*duration)*age+.3*age*age;
  p.kingThrow=age<6?2:3;p.vx=cx+(age<6?2.17:1.88);p.vy=cy+(age<6?43.05:24.75);
 }
 else if(t<F.desk+20){p.kingThrow=4;p.vx=d.x;p.vy=top+9;}
 else if(t<F.desk+32){p.kingThrow=5;p.vx=d.x;p.vy=top+9-8*Math.sin((t-F.desk-20)/12*Math.PI);}
 else if(t<F.desk+44){p.kingThrow=7;p.vx=d.x;p.vy=mix(top+9,top+27,ease((t-F.desk-32)/12));}
 else if(t<F.drop){const q=ease((t-F.desk-44)/(F.drop-F.desk-44));p.kingThrow=8;p.vx=mix(d.x+3.5,d.x,q);p.vy=mix(top+37.5,REFUND_FLOOR,q);}
 else if(t<F.wallPunch){p.kingThrow=9;p.vx=d.x;p.vy=REFUND_FLOOR;}
 else if(t<F.launch){p.kingThrow=11;p.victim=2;p.vx=d.x;p.vy=REFUND_FLOOR+2;}
 else if(t<F.wall){const q=(t-F.launch)/(F.wall-F.launch);p.kingThrow=null;p.victim=3;p.vx=mix(d.x+15.5,CLOSER_WALL.x+2,q);p.vy=mix(REFUND_FLOOR+21,CLOSER_WALL.y+14,q);p.lift=8+54*q+22*Math.sin(q*Math.PI);p.spin=mix(-.18,.42,q);}
 else {p.kingThrow=null;p.vx=CLOSER_WALL.x+2;p.vy=CLOSER_WALL.y+14;
  p.victim=5;p.lift=62;if(t<F.wall+4)p.vx+=3-(t-F.wall);
 }
 return p;
}
function custom(ctx,key,i,x,y,spin=0){
 const im=ASSETS[key];if(!im)return false;
 const cw=256,ch=256;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));if(spin)ctx.rotate(spin);
 ctx.drawImage(im,i%4*cw,Math.floor(i/4)*ch,cw,ch,-64,-124,128,128);ctx.restore();return true;
}
export function drawRefundChad(ctx,c,pos,camX){
 drawContactShadow(ctx,pos.x-camX,pos.y,12,0,.85);
 const {pose,i}=pos.chad,f=getFrame(SPR.player,pose,i,1);if(!f)return;
 blit(ctx,f,Math.round(pos.x-camX-frameW(f)/2),Math.round(pos.y-frameH(f)+4));
 if(c.t>=REFUND_FINISH.cigar){
  drawChadCigarReplay(ctx,camX,c.t,REFUND_FINISH.cigar,CIGAR_BEAT,pos.x,pos.y,1);
  const age=c.t-REFUND_FINISH.cigar-32,tip=chadCigarAt(i,pos.x,pos.y)?.tip;
  if(tip&&age>=0&&age<9){const [x,y]=tip,heat=Math.sin((age+1)/10*Math.PI);ctx.save();ctx.globalCompositeOperation='lighter';
   const g=ctx.createRadialGradient(x-camX,y,1,x-camX,y,14);g.addColorStop(0,`rgba(255,190,80,${heat*.45})`);g.addColorStop(1,'rgba(255,100,30,0)');ctx.fillStyle=g;ctx.fillRect(x-camX-14,y-14,28,28);ctx.restore();
  }
 }
}
function victim(ctx,p,camX,shadow=true){
 if(p.exploded)return;
 if(shadow)drawContactShadow(ctx,p.vx-camX,p.kingThrow!==null?REFUND_FLOOR:p.vy,p.victim>=6?26:19,0,p.lift||p.vy<210?.25:.65);
 if(p.kingThrow!==null&&custom(ctx,'cl_king_throw',p.kingThrow,p.vx-camX,p.vy,p.spin))return;
 const f=getFrame(SPR.ic_closer_damaged,'finish',p.victim,-1);if(!f)return;
 const x=p.vx-camX,y=p.vy-p.lift;
 if(p.spin){ctx.save();ctx.translate(Math.round(x),Math.round(y-frameH(f)*.3));ctx.rotate(p.spin);blit(ctx,f,-Math.round(frameW(f)/2),Math.round(-frameH(f)*.7+4));ctx.restore();}
 else blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));
}
export function drawRefundUnder(ctx,c,pos,camX){
 const t=c.t,F=REFUND_FINISH,d=refundDesk(c),h=refundContact(c,'wallPunch');
 if(t>=F.desk){const grow=clamp((t-F.desk)/10,0,1);bloodDecal(ctx,d.x-camX-22,d.y-TOP_OFFSET+8,5,grow*1.3);}
 if(t>=F.drop)bloodDecal(ctx,d.x-camX+8,REFUND_FLOOR+1,4,clamp((t-F.drop)/20,0,1));
 if(t>=F.wallPunch+24)bloodDecal(ctx,h.x-camX+35,REFUND_FLOOR+2,5,clamp((t-F.wallPunch-24)/18,0,1));
 if(t>=F.wall){ctx.save();ctx.filter='brightness(.45) saturate(.85)';
  for(const [dx,dy,scale,rot]of [[4,54,1.65,0],[-18,78,.9,-.3],[23,92,.7,.5]])gore(ctx,5,CLOSER_WALL.x-camX+dx,dy,{scale,squash:1.3,rot,alpha:.9});ctx.restore();
  if(t>=F.wall+76)bloodDecal(ctx,CLOSER_WALL.x-camX-18,255,5,clamp((t-F.wall-76)/30,0,1)*1.6);
 }
 drawRefundRemains(ctx,t-F.blast,camX);
 if(t>=F.cigar)dim(ctx,.2*clamp((t-F.cigar)/12,0,1));
 if(t>=F.desk-6&&t<F.desk+20)dim(ctx,.36*clamp(Math.min(t-F.desk+7,F.desk+20-t)/5,0,1));
 for(const [at,hit,power] of [[F.deskCharge,F.punch,false],[F.charge,F.wallPunch,true]])if(t>=at&&t<hit){
  const charge=clamp((t-at)/(power?hit-at-8:12),0,1),x=pos.x-camX-(power?3:4),y=pos.y-(power?(pos.chad.i===0?42.5:49):60.5);
  dim(ctx,charge*(power?.68:.5));flash(ctx,charge*.12,'113,28,25');
  speedLines(ctx,x,y,t,charge*(power?1:.65));
  aura(ctx,x,y,power?38:28,t,charge);aura(ctx,pos.x-camX,pos.y-42,power?70:48,t,charge*.8);
  // Sparks converge on the loaded fist, before the real gameplay pose drives it forward.
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=power?'#fff1a3':'#e8ad60';
  for(let j=0;j<(power?14:9);j++){const phase=(t-at+j*5)%22/22,r=(1-phase)*(power?45:24),angle=j*2.4+t*.025;
   ctx.globalAlpha=charge*phase;ctx.fillRect(Math.round(x+Math.cos(angle)*r),Math.round(y+Math.sin(angle)*r*.7),2,2);}
  ctx.restore();
 }
}
function teeth(ctx,t,at,x,y,dir,count,floor){
 const age=t-at;if(age<0||age>90)return;
 for(let i=0;i<count;i++){
  const vx=dir*(1.05+i*.4),vy=-1.9-i*.45,gravity=.095;
  const land=(-vy+Math.sqrt(vy*vy+4*gravity*(floor-y)))/(2*gravity),a=Math.min(age,land);
  const bounce=age>land&&age<land+14?Math.sin((age-land)/14*Math.PI)*3:0;
  ctx.save();ctx.globalAlpha*=age>76?(90-age)/14:1;tooth(ctx,i,x+vx*a,Math.min(floor,y+vy*a+gravity*a*a)-bounce,a*(i%2?-.25:.22),.6);ctx.restore();
 }
}
export function drawRefundGore(ctx,c,pos,camX){
 const t=c.t,F=REFUND_FINISH,w=refundContact(c,'punch'),d=refundContact(c,'desk'),h=refundContact(c,'wallPunch');
 crackFlash(ctx,t,F.punch,w.x-camX,w.y,1,10);bloodSpray(ctx,t,F.punch+1,w.x-camX,w.y,1,2);
 bloodSpray(ctx,t,F.desk+1,d.x-camX,d.y,1,5);bloodSpray(ctx,t,F.desk+3,d.x-camX,d.y,-1,3);
 bloodArc(ctx,t,F.desk+2,d.x-camX,d.y,1,0);teeth(ctx,t,F.desk+2,d.x-camX,d.y,1,2,REFUND_FLOOR);crackFlash(ctx,t,F.desk,d.x-camX,d.y,1,12);
 bloodSpray(ctx,t,F.wallPunch+1,h.x-camX,h.y,1,5);bloodArc(ctx,t,F.wallPunch+1,h.x-camX,h.y,1,1);
 teeth(ctx,t,F.wallPunch+1,h.x-camX,h.y,1,5,REFUND_FLOOR);crackFlash(ctx,t,F.wallPunch,h.x-camX,h.y,2,12);
 // Drops leave the flying mouth in world space, so the trail never follows the camera.
 for(let at=REFUND_FINISH.launch+2;at<F.wall;at+=3){const v=refundVictim(c,at);bloodSpray(ctx,t,at,v.vx-camX-16,v.vy-v.lift-72,-1,at%2?3:2);}
 if(t>=F.wall){const wx=CLOSER_WALL.x-camX;
  bloodSpray(ctx,t,F.wall+1,wx-2,35,-1,5);bloodSpray(ctx,t,F.wall+3,wx+2,44,1,4);
  bloodArc(ctx,t,F.wall+2,wx,35,-1,2);bloodArc(ctx,t,F.wall+5,wx,45,1,1);
  teeth(ctx,t,F.wall+2,wx-2,35,-1,7,252);crackFlash(ctx,t,F.wall,wx,66,2,14);
  // A second wet burst is blown off the impact point by the exploding screens.
  bloodSpray(ctx,t,F.wall+8,wx-5,52,-1,5);bloodArc(ctx,t,F.wall+9,wx,58,-1,1);
 }

}
const masks=new WeakMap();
function customSilhouette(ctx,key,i,x,y,color){
 const im=ASSETS[key];if(!im)return;let bank=masks.get(im);if(!bank){bank=new Map();masks.set(im,bank);}
 const id=i+color;let mask=bank.get(id);if(!mask){mask=document.createElement('canvas');mask.width=mask.height=256;const m=mask.getContext('2d');m.drawImage(im,i%4*256,Math.floor(i/4)*256,256,256,0,0,256,256);m.globalCompositeOperation='source-in';m.fillStyle=color;m.fillRect(0,0,256,256);bank.set(id,mask);}
 ctx.drawImage(mask,Math.round(x-64),Math.round(y-124),128,128);
}
// The electrical fireball comes eight ticks after the body hits: contact, compression, detonation.
export function drawRefundWallBlast(ctx,c,camX){
 const age=c.t-REFUND_FINISH.blast,im=ASSETS.nr_explosion;if(age<0||age>=54||!im)return;
 const x=CLOSER_WALL.x-camX,y=110,i=Math.min(7,Math.floor(age/5)),sw=im.width/8;
 ctx.save();ctx.globalAlpha=age>38?(54-age)/16:1;
 ctx.drawImage(im,i*sw,0,sw,im.height,Math.round(x-110),Math.round(y-88),220,176);ctx.restore();
}
// The train finishers use a full gold-to-crimson impact plate behind actor silhouettes.
function impactPlate(ctx,x,y,age,power){
 const negative=age===1,r=power?360:270;
 const g=ctx.createRadialGradient(x,y,4,x,y,r);
 g.addColorStop(0,negative?'#9c3020':'#fff6de');g.addColorStop(.28,negative?'#651713':'#ffb347');g.addColorStop(1,negative?'#230b14':'#b3260f');
 ctx.fillStyle=g;ctx.fillRect(-16,-16,512,302);speedLines(ctx,x,y,age,1);
 return negative?'#fff0bf':'#170908';
}
export function drawRefundFinish(ctx,c,pos,camX,fx=true){
 const t=c.t,F=REFUND_FINISH,h=refundContact(c,'wallPunch');
 if(fx)drawRefundUnder(ctx,c,pos,camX);
 if(fx&&t>=F.launch&&t<F.wall){speedLines(ctx,0,0,t,.65,1);for(const lag of [6,4,2]){ctx.save();ctx.globalAlpha=(8-lag)*.045;victim(ctx,refundVictim(c,Math.max(F.launch,t-lag)),camX,false);ctx.restore();}}
 victim(ctx,pos,camX);drawRefundChad(ctx,c,pos,camX);
 if(!fx)return;
 if(t>=F.deskCharge&&t<F.punch){const q=clamp((t-F.deskCharge)/12,0,1);aura(ctx,pos.x-camX-4,pos.y-60.5,9,t,q*1.1);}
 if(t>=F.punch&&t<F.punch+3){const w=refundContact(c,'punch'),color=impactPlate(ctx,w.x-camX,w.y,t-F.punch,false);
  silhouette(ctx,SPR.ic_closer_damaged,'finish',1,pos.vx-camX,pos.vy,-1,color);silhouette(ctx,SPR.player,'combo_power_a',2,pos.x-camX,pos.y,1,color);}
 else if(t>=F.punch+3&&t<F.release)flash(ctx,.24*(1-(t-F.punch-3)/3),'255,210,137');
 if(t>=F.wallPunch&&t<F.wallPunch+3){const color=impactPlate(ctx,h.x-camX,h.y,t-F.wallPunch,true);
  customSilhouette(ctx,'cl_king_throw',pos.kingThrow,pos.vx-camX,pos.vy,color);silhouette(ctx,SPR.player,'combo_power_b',2,pos.x-camX,pos.y,1,color);}
 for(const [kind,at,size]of [['punch',F.punch,64],['desk',F.desk,88],['wallPunch',F.wallPunch,126]]){const p=refundContact(c,kind);punchBurst(ctx,t,at,p.x-camX,p.y,size,0,kind==='punch'?2:3);}
 drawRefundGore(ctx,c,pos,camX);
 drawRefundBurst(ctx,t-F.blast,camX);
 punchBurst(ctx,t,F.wall,CLOSER_WALL.x-camX,66,120,.4,3);
 const wallAge=t-F.wall;
 if(wallAge>=0&&wallAge<3){flash(ctx,1,wallAge===1?'107,18,10':'255,226,159');speedLines(ctx,CLOSER_WALL.x-camX,65,t,1);
  silhouette(ctx,SPR.ic_closer_damaged,'finish',5,pos.vx-camX,pos.vy-pos.lift,-1,'#270706');
  silhouette(ctx,SPR.player,pos.chad.pose,pos.chad.i,pos.x-camX,pos.y,1,'#0e0605');
  drawRefundGore(ctx,c,pos,camX);
 }
 if(wallAge>=8&&wallAge<26){debrisBurst(ctx,t,F.blast,CLOSER_WALL.x-camX,165,184,3);punchBurst(ctx,t,F.blast,CLOSER_WALL.x-camX,84,176,0,3);}
 if(t===F.desk)flash(ctx,.32);else if(t===F.desk+1)flash(ctx,.1);
 if(wallAge===8)flash(ctx,.55,'255,174,84');else if(wallAge===9)flash(ctx,.22,'255,196,121');
}
