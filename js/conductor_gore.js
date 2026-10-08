// Clock-driven shared gore and native source-space wound registration.
import {gore,bloodSpray,bloodArc,bloodDecal,crackFlash} from './finisher_fx.js';
export const CONDUCTOR_CHEST={7:[213,181],8:[160,237],9:[244,253],10:[223,234],11:[178,226]};
export function conductorChest(v){const [x,y]=CONDUCTOR_CHEST[v.cell]||CONDUCTOR_CHEST[11];return {x:v.x+(200-x)/2,y:v.y+(y-300)/2+4};}
export function conductorAtChest(cell,x,y){const [sx,sy]=CONDUCTOR_CHEST[cell];return {cell,x:x-(200-sx)/2,y:y-(sy-300)/2-4};}
export function drawConductorStains(ctx,cam,grow=1){
 bloodDecal(ctx,6052-cam,226,5,grow*1.65);bloodDecal(ctx,6022-cam,232,3,grow);
}
export function drawConductorBlood(ctx,t,v,cam,contact){
 if(t<153)return;const p=conductorChest(v),age=t-153;
 bloodSpray(ctx,t,153,contact.x-cam,contact.y,1,5);
 bloodArc(ctx,t,153,contact.x-cam,contact.y,1,1);
 crackFlash(ctx,t,153,contact.x-cam,contact.y,1,7);
 // The jet leaves the puncture, while smaller arcs stay attached to the flying torso.
 if(t<194){const k=Math.min(1,(194-t)/10);gore(ctx,age<4?4:2,p.x-cam+8,p.y+3,{scale:.7,alpha:k,rot:.3});}
 for(let i=0;i<9;i++){
  const a=age-i*2;if(a<0||a>44)continue;
  gore(ctx,i%2,p.x-cam+5+a*(.9+i*.1),p.y+4-a*(.45+i%3*.25)+a*a*.055,{scale:.38+i%3*.08,rot:a*.06,alpha:Math.min(1,(44-a)/10)});
 }
 if(t>=198){
  const a=t-198;bloodSpray(ctx,t,198,p.x-cam,p.y,-1,5);bloodArc(ctx,t,198,p.x-cam,p.y,-1,0);
  if(a<24)gore(ctx,4,p.x-cam+12,p.y+4+a*.55,{scale:1.3,rot:.6,alpha:Math.min(1,(24-a)/7)});
  // Wound leakage remains on the corpse as the impact settles; no face or cigar wash.
  if(t>=210&&t<252)gore(ctx,0,p.x-cam,p.y+9+(t-210)*.32,{scale:.4,rot:1.5,alpha:Math.min(1,(252-t)/12)});
 }
}
