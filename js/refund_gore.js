// Same generated gore banks and ballistic fragments as the train finale, replayed from the clock.
import {ASSETS} from './assets.js';
import {clamp} from './engine.js';
import {CLOSER_WALL} from './closer_arena.js';
import {gore,bloodDecal} from './finisher_fx.js';

// Cell, body offset, velocity, spin, resting centre, draw size, resting angle.
const PIECES=[
 [0,-4,24,-2.7,-3.8,-.18,243,48,1.1],
 [1,0,0,-1.5,-4.4,.11,233,56,.2],
 [2,-20,-5,-3.8,-2.5,-.24,243,38,-.5],
 [3,13,32,1.15,-3.3,.29,250,28,.1],
 [4,0,-35,-3.1,-4.3,.34,252,23,.05],
 [5,21,-4,1.35,-1.8,.21,248,25,-.2],
 [6,3,-18,-.55,-4.7,-.17,250,29,.25],
 [7,-10,9,-2.2,-1.2,.15,244,34,-.2],
];
const GRAVITY=.24,ORIGIN_Y=78;
const landAge=p=>(-p[4]+Math.sqrt(p[4]*p[4]+2*GRAVITY*(p[6]-ORIGIN_Y-p[2])))/GRAVITY;
export const REFUND_FRAGMENT_LANDINGS=PIECES.map((p,i)=>({age:Math.ceil(landAge(p)),i,metal:i===4||i===6}));
export function refundPieces(age){
 if(age<0)return [];
 return PIECES.map((p,i)=>{
  const [cell,dx,dy,vx,vy,spin,ground,size,rest]=p,land=landAge(p),a=Math.min(age,land);
  let x=CLOSER_WALL.x+2+dx+vx*a,y=ORIGIN_Y+dy+vy*a+GRAVITY*a*a/2,angle=spin*a;
  if(age>=land){const d=age-land,q=clamp(d/10,0,1),settle=rest+2*Math.PI*Math.round((angle-rest)/(2*Math.PI));
   x+=vx*.3*Math.min(d,10)*(1-q/2);y=ground-(d<10?4*Math.sin(Math.PI*d/10):0);angle+=(settle-angle)*q;
  }
  return {i,cell,x,y,angle,size,ground,landed:age>=land};
 });
}
export function drawRefundRemains(ctx,age,camX){
 if(age<0)return;
 for(const p of refundPieces(age))if(p.landed)bloodDecal(ctx,p.x-camX,Math.min(257,p.ground+12),p.cell===4||p.cell===6?1:5,p.cell===1?1.5:.8);
}
export function drawRefundBurst(ctx,age,camX){
 if(age<0)return;
 const x=CLOSER_WALL.x+2-camX,y=ORIGIN_Y,im=ASSETS.arcade_defeats,sheet=ASSETS.fragments_ic_closer;
 if(im&&age<20){ctx.save();ctx.globalAlpha=clamp((20-age)/5,0,1);ctx.drawImage(im,Math.min(3,age>>2)*128,128,128,128,x-88,y-72,176,144);ctx.restore();}
 if(age<30)for(let i=0;i<9;i++){
  const angle=-Math.PI+(i-4)*.32,d=age*(2.1+i%3*.6);
  gore(ctx,3+i%3,x+Math.cos(angle)*d,y+Math.sin(angle)*d+age*age*.055,{rot:angle,scale:1.5+i%2*.4,alpha:age<19?1:(30-age)/11});
 }
 if(age<42)for(let i=0;i<3;i++)gore(ctx,6+i,x-8-(i+1)*age*.65,y+(i-1)*16-age*.7+age*age*.045,{flip:-1,scale:1.4,alpha:age<28?1:(42-age)/14});
 const trails=[3,6,9].map(lag=>[lag,refundPieces(age-lag)]);
 for(const p of refundPieces(age)){
  if(p.cell!==4&&p.cell!==6)for(const [lag,trail] of trails){const q=trail[p.i];if(q&&!q.landed)gore(ctx,0,q.x-camX,q.y,{rot:q.angle,scale:.75-lag*.03,alpha:.85-lag*.06});}
  if(sheet){ctx.save();ctx.translate(Math.round(p.x-camX),Math.round(p.y));ctx.rotate(p.angle);ctx.drawImage(sheet,p.cell%4*128,Math.floor(p.cell/4)*128,128,128,-p.size/2,-p.size/2,p.size,p.size);ctx.restore();}
  else gore(ctx,3,p.x-camX,p.y,{rot:p.angle,scale:.6});
 }
}
