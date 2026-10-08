// Severed head: uppercut, ceiling ricochet, floor impact and a short settling bounce.
import {ASSETS} from './assets.js';
import {clamp} from './engine.js';
import {gore,bloodSpray,bloodArc,bloodDecal,crackFlash,punchBurst} from './finisher_fx.js';
export const SHERA_DECAP={sever:105,ceiling:124,land:156,rest:168};
export function sheraHead(t,land){
 const B=SHERA_DECAP;if(t<B.sever)return null;
 const start={x:308,y:126},ceiling={x:360,y:44},end={x:Math.min(465,land+82),y:215};
 if(t<B.ceiling){const q=(t-B.sever)/(B.ceiling-B.sever);return {x:start.x+(ceiling.x-start.x)*q,y:start.y+(ceiling.y-start.y)*(q*(2-q)),angle:q*3.8,airborne:true};}
 if(t<B.land){const q=(t-B.ceiling)/(B.land-B.ceiling);return {x:ceiling.x+(end.x-ceiling.x)*q,y:ceiling.y+(end.y-ceiling.y)*(.34*q+.66*q*q),angle:3.8+q*5.6,airborne:true};}
 const q=clamp((t-B.land)/(B.rest-B.land),0,1);return {x:end.x-4*Math.sin(q*Math.PI),y:end.y-9*Math.sin(q*Math.PI),angle:9.4+q*.5,airborne:q<1};
}
export function drawSheraHead(ctx,t,land){
 const p=sheraHead(t,land),im=ASSETS.shera_severed_head;if(!p||!im)return;
 if(t>=SHERA_DECAP.ceiling)bloodDecal(ctx,360,51,3,.8);
 if(t>=SHERA_DECAP.land)bloodDecal(ctx,Math.min(465,land+82),231,4,1.2);
 if(p.airborne)for(const lag of [2,4,6]){const q=sheraHead(t-lag,land);if(q)gore(ctx,lag===2?1:0,q.x,q.y+8,{scale:.42,rot:q.angle,alpha:.85-lag*.09});}
 ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(p.angle);ctx.scale(-1,1);ctx.drawImage(im,-24,-24,48,48);ctx.restore();
 bloodSpray(ctx,t,SHERA_DECAP.ceiling,360,45,1,3);crackFlash(ctx,t,SHERA_DECAP.ceiling,360,39,0,6);
 punchBurst(ctx,t,SHERA_DECAP.ceiling,360,43,46,0,2);
 bloodSpray(ctx,t,SHERA_DECAP.land,Math.min(465,land+82),215,-1,4);
 punchBurst(ctx,t,SHERA_DECAP.land,Math.min(465,land+82),224,40,0,2);
}
// Source-space neck landmarks on each 552×410 edited reaction, facing right.
export const SHERA_NECK={5:[249,247],6:[196,246],7:[173,318],8:[175,330],9:[174,343],10:[170,350]};
export function sheraNeck(s){const [x,y]=SHERA_NECK[s.i]||SHERA_NECK[9];return {x:s.x+(276-x)/2,y:s.y+(y-410)/2+4};}
export function drawSheraNeckBlood(ctx,t,s,land){
 const p=sheraNeck(s),age=t-SHERA_DECAP.sever;if(age<0)return;
 if(age<30){gore(ctx,age<5?5:3,p.x+8,p.y-10,{scale:1.2,rot:-1.1,alpha:age<19?1:(30-age)/11});bloodArc(ctx,t,SHERA_DECAP.sever,p.x,p.y,-1,0);}
 if(t>=150){bloodSpray(ctx,t,150,p.x,p.y,1,4);bloodDecal(ctx,land+42,234,5,1.7);}
}
