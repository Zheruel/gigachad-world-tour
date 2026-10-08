// Extra spicy oil hurl: Pappu coils deep with the skimmer brimming, whips it overhead and snaps a fan of small
// hot-ghee globs at CHAD, then staggers through the follow-through and rocks back. Each glob is jump-safe and the fan
// lands in one short ripple, so a single timed jump clears the lot (tools/verification/pappu_oil_fairness_check.cjs).
// Frames: assets/frames/ic_vendor/spicy_throw_00-04 (tools/production/build_pappu_spicy_throw.py).
import {G,clamp} from './engine.js';
import {spawnArc} from './shots.js';
import {spawnDust,spawnSmoke} from './effects.js';
import {pappu} from './vendor_sound.js';

// Ticks: wind-up hold, whip overhead, snap release (globs leave), follow-through, recoil, end.
export const SPICY_THROW=Object.freeze({whip:14,release:27,follow:32,recoil:42,end:58,recovery:24,n:5,spread:27,dmg:12,radius:19});
// Skimmer basket in each pose, relative to his feet facing right (game px).
export const SPICY_BASKET=[[-46,-44],[22,-122],[94,-70],[68,-20],[-70,-24]];
export function spicyThrowCell(t){const T=SPICY_THROW;return t<T.whip?0:t<T.release?1:t<T.follow?2:t<T.recoil?3:4;}
// Body offset on top of the authored pose: sinking into the coil, then straining up on his toes with the skimmer held
// overhead (shaking), a jolt at the snap, rocking back.
export function spicyThrowOffset(b){
 const t=b.t,T=SPICY_THROW;let dx=0,dy=0;
 if(t<T.whip)dy=Math.round(clamp(t/8,0,1)*2);
 else if(t<T.release){dy=-Math.round(clamp((t-T.whip)/6,0,1));if(t>=T.whip+3)dx=((t>>1)&1)?1:-1;}
 else if(t>=T.release&&t<T.release+3)dx=2;
 else if(t>=T.recoil&&t<T.recoil+8)dx=-Math.round(3*Math.sin((t-T.recoil)/8*Math.PI));
 return [dx*b.face,dy];
}
// He plants a half step out from behind the kadai as he coils, so the whole hurl plays in front of the fire.
export function spicyThrowStep(b){if(b.t<=6&&b.kadai)b.y=Math.min(b.y+1,b.kadai.y+4);}
const basket=(b,cell)=>{const [x,y]=SPICY_BASKET[cell],[ox,oy]=spicyThrowOffset(b);return [b.x+b.face*x+ox,b.y+y+oy];};

// Sounds and impact for the throw (called each tick of the Extra spicy 'fling').
export function updateSpicyThrow(b){
 const t=b.t,T=SPICY_THROW;
 spicyThrowStep(b);
 if(t===2)pappu('strain',b.x,1.1);
 if(t===T.whip)pappu('raise',b.x,1.1);
 if(t===T.release-7)pappu('swing_big',b.x,1.1);
 if(t===T.release){
  const [bx,by]=basket(b,2);
  pappu('skimmer_slap',b.x,1.1,{gap:0});pappu('flare',b.x,.8,{gap:0});
  G.hitstop=Math.max(G.hitstop,4);G.shake=Math.max(G.shake,7);spawnSmoke(bx,by,3);spawnDust(b.x+b.face*40,b.y,6);
 }
 if(t===T.follow+1)spawnDust(b.x+b.face*60,b.y,4);
}
// The fan: aimed at CHAD's spot, spread along the lane with a little depth zigzag. Nearer globs fly flatter and land
// first, farther ones arc higher, so the five separate in the air and the splats roll away from him across the street.
export function throwSpicyVolley(b,to){
 const T=SPICY_THROW,x0=b.x+b.face*(SPICY_BASKET[2][0]+6),z=-SPICY_BASKET[2][1],spots=spicyTargets(to);
 const order=spots.map((s,i)=>i).sort((a,c)=>Math.abs(spots[a][0]-x0)-Math.abs(spots[c][0]-x0));b.spicyLand=[];
 // Already fanned as they leave the lip (a few px apart), and separating within a handful of ticks.
 order.forEach((i,rank)=>{const [tx,ty]=spots[i],vz=.6+rank*.66,zz=z+8-rank*4,air=(vz+Math.sqrt(vz*vz+.48*zz))/.24,xs=x0+b.face*(4+rank*3);
  spawnArc('oil',xs,ty,(tx-xs)/air,vz,T.dmg,'fire',{source:b,z:zz,jumpSafe:true,visualScale:1.1,burstRadius:T.radius,hitRadius:16,spicy:true});b.spicyLand[i]=G.time+air;});
}
export const spicyTargets=to=>{const n=to.n||SPICY_THROW.n;return Array.from({length:n},(_,i)=>{const k=i-(n-1)/2;return [to.x+k*to.spread,to.y+(i&1?5:-3)*(k?1:0)];});};

// Code-drawn heat around the authored poses: glowing ghee in the coil, the whip's smear, the spray off the snap, drips after.
export function drawSpicyThrow(ctx,b,camX){
 const t=b.t,T=SPICY_THROW,cell=spicyThrowCell(t);if(G.reflecting)return;
 ctx.save();ctx.globalCompositeOperation='lighter';
 const px=(x,y,w,h,c,a)=>{ctx.globalAlpha=a;ctx.fillStyle=c;ctx.fillRect(Math.round(x-camX),Math.round(y),w,h);};
 if(cell<=1&&t<T.release){
  const [x,y]=basket(b,cell),k=clamp(t/T.release,0,1),g=ctx.createRadialGradient(x-camX,y,1,x-camX,y,10+8*k);
  g.addColorStop(0,`rgba(255,250,215,${.45+.4*k})`);g.addColorStop(.35,`rgba(255,190,70,${.3+.3*k})`);g.addColorStop(1,'rgba(255,70,10,0)');ctx.globalAlpha=1;ctx.fillStyle=g;ctx.fillRect(x-camX-20,y-20,40,40);
  for(let i=0;i<5;i++){const a=(t*1.3+i*7)%16;px(x+((i*13)%9-4),y-3-a*1.1,1,i%2+1,i%2?'#ffd060':'#ff7a20',(1-a/16)*(.5+.5*k));}
 }
 if(t>=T.release&&t<T.release+3){
  // The snap's smear: a crescent from overhead behind his head down to the release, wide and white-hot at the leading
  // edge, tapering through orange to red, gone within three ticks of the snap.
  const [cx,cy]=basket(b,1),[ex,ey]=basket(b,2),C=[ex-b.face*2,cy-4],fade=1-(t-T.release)/3;
  for(const [grow,col,al] of [[2.2,'#c01808',.45],[1,'#ff8a20',.7],[-.6,'#fff2c0',.9]])for(let s=0;s<=48;s++){const u=s/48,v=1-u,x=v*v*cx+2*u*v*C[0]+u*u*ex,y=v*v*cy+2*u*v*C[1]+u*u*ey,r=Math.max(.4,.5+5.5*u*u+grow*u);
   ctx.globalAlpha=fade*al*(.2+.8*u);ctx.fillStyle=col;ctx.beginPath();ctx.arc(x-camX,y,r,0,Math.PI*2);ctx.fill();}
 }
 if(t>=T.release&&t<T.release+16){
  const [bx,by]=basket(b,2),x=bx+b.face*8,y=by,a=t-T.release;
  if(a<2){const r=4+a*3,g=ctx.createRadialGradient(x-camX,y,0,x-camX,y,r);g.addColorStop(0,'rgba(255,255,220,.95)');g.addColorStop(.5,'rgba(255,180,60,.6)');g.addColorStop(1,'rgba(255,60,0,0)');ctx.globalAlpha=1-a/4;ctx.fillStyle=g;ctx.fillRect(x-camX-r,y-r,2*r,2*r);}
  // Spray: deterministic droplets thrown forward and down off the basket.
  for(let i=0;i<18;i++){const sp=2.2+(i*37%11)/3,ang=-.65+(i*53%13)/10,vx=Math.cos(ang)*sp*b.face,vy=Math.sin(ang)*sp,dx=vx*a,dy=vy*a+.09*a*a;
   px(x+dx,y+dy,i%3?1:2,i%3?1:2,i%4?'#ffc040':'#fff4c0',clamp(1-a/16,0,1));}
 }
 if(cell===3){const [x,y]=basket(b,cell);for(let i=0;i<3;i++){const a=(t+i*5)%12;px(x+(i-1)*3,y+3+a*1.4,1,2,'#ffb030',(1-a/12)*.8);}}
 ctx.restore();
}

// The landing marks: a dark under-stroke and a hot pulsing ring per glob, filling in as its glob drops, flashing white just before it lands.
export function drawSpicyRings(ctx,b,camX){
 const T=SPICY_THROW,r=T.radius,spots=spicyTargets(b.flingTo),t=b.t;ctx.save();
 spots.forEach(([sx,sy],i)=>{
  const land=b.spicyLand?.[i],left=land!==undefined?land-G.time:null;if(left!==null&&left<-1)return;
  const x=Math.round(sx-camX),y=Math.round(sy),k=left===null?clamp(t/T.release,0,1)*.5:clamp(1-left/34,.5,1),flash=left!==null&&left<6&&((G.time>>1)&1);
  const ring=(rr,w,c,a)=>{ctx.globalAlpha=a;ctx.strokeStyle=c;ctx.lineWidth=w;ctx.beginPath();ctx.ellipse(x,y,rr,rr/3.4,0,0,Math.PI*2);ctx.stroke();};
  ctx.globalAlpha=.18+.3*k;ctx.fillStyle=flash?'#fff6d0':'#ff3a10';ctx.beginPath();ctx.ellipse(x,y,r*k,r*k/3.4,0,0,Math.PI*2);ctx.fill();
  ring(r,3,'#2a0800',.55);ring(r,1,flash?'#ffffff':'#ffb030',.75+.25*((G.time>>2)&1));
 });
 ctx.restore();
}
