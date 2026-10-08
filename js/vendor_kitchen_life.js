// Ghee Pappu's kitchen at work: fire, lamps, steam, puffing puris, the boiling kadai and its gas
// ring, drawn over the painted stall from the kitchen effect strips (dv_steam, dv_flame, dv_burner,
// dv_puri, dv_oil). Cosmetic only: deterministic from G.time, no combat randomness, paused with the game.
import {G} from './engine.js';
import {ASSETS} from './assets.js';

const O=2670,W0=560; // world x of the vendor arena's screen origin (its camera lock); cull margin
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
const clamp01=v=>v<0?0:v>1?1:v;
const wave=(t,s)=>.72+.14*Math.sin(t*.21+s)+.09*Math.sin(t*.53+s*2.3)+.05*Math.sin(t*1.37+s*.7);
const FRAMES={dv_steam:8,dv_flame:8,dv_burner:8,dv_puri:4,dv_oil:8};

// Cell i of a strip, drawn w wide from its bottom-centre (x,y); h follows the strip's aspect.
function cell(ctx,key,i,x,y,w,{flip=false,h}={}){
 const im=ASSETS[key];if(!im)return false;const n=FRAMES[key],fw=im.width/n,full=w*im.height/fw;h??=full;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));if(flip)ctx.scale(-1,1);
 if(Math.abs(h-full)>.5){ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';} // a squash filters instead of dropping rows
 ctx.drawImage(im,(i%n)*fw,0,fw,im.height,-Math.round(w/2),-Math.round(h),Math.round(w),Math.round(h));ctx.restore();return true;
}
// Steam tinted to soot for smoke off burning wreckage and a starved kadai.
const tinted={};
function tint(key,rgb,a=1){
 const im=ASSETS[key];if(!im)return null;const id=key+rgb+a;if(tinted[id]?.src===im)return tinted[id].c;
 const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');
 x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.fillStyle=`rgba(${rgb},${a})`;x.fillRect(0,0,c.width,c.height);
 tinted[id]={src:im,c};return c;
}

// The thick smoke painted above the lit bowl now billows in independently moving bands.
// Reuse its exact illustrated pixels; motion stays on the deterministic simulation clock.
export function drawKadaiSmoke(ctx,x,y){
 const im=ASSETS.dv_kadai;if(!im)return;const cw=im.width/3,trim=82,t=G.time,top=y+2-im.height/2;
 ctx.save();ctx.globalAlpha=1;
 for(let sy=0;sy<trim;sy+=8){const h=Math.min(8,trim-sy),height=(trim-sy)/trim,drift=Math.sin(t*.045+sy*.045)*height*3.2,rise=Math.sin(t*.026)*height*1.4;
  ctx.drawImage(im,cw,sy,cw,h,Math.round(x-cw/4+drift),Math.round(top+sy/2+rise),cw/2,h/2+1);
 }
 ctx.restore();
}
// One puff of steam on its own cycle: it swells off the food, billows, thins out and goes; each
// cycle leans, drifts and sizes itself differently so no source repeats a shape.
export function wisp(ctx,x,y,t,seed=0,{period=96,size=1,alpha=.42,smoke=false}={}){
 const im=smoke?tint('dv_steam','118,106,98'):ASSETS.dv_steam;if(!im)return;
 const s=t+seed*53,cyc=Math.floor(s/period),q=(s%period)/period,k=seed*7+cyc*3;
 const sz=size*(.8+.4*hash(k)),w=24*sz,h=w*im.height/(im.width/8),lean=hash(k+1)<.5;
 const px=x+(hash(k+2)-.5)*5*size+Math.sin(s*.04)*1.2*size,py=y-q*5*size;
 ctx.save();ctx.globalAlpha=alpha*Math.min(1,q/.12);
 ctx.translate(Math.round(px),Math.round(py));if(lean)ctx.scale(-1,1);
 ctx.drawImage(im,Math.min(7,Math.floor(q*8))*im.width/8,0,im.width/8,im.height,-Math.round(w/2),-Math.round(h),Math.round(w),Math.round(h));ctx.restore();
}
// A source that never stops steaming: staggered puffs over each other.
function steamer(ctx,x,y,t,seed,{n=2,period=100,size=1,alpha=.4,smoke=false}={}){
 for(let i=0;i<n;i++)wisp(ctx,x+(i-(n-1)/2)*3*size,y,t,seed*5+i,{period:period+i*13,size:size*(1-i*.12),alpha,smoke});
}
function glow(ctx,x,y,r,rgb,a){
 if(a<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);ctx.restore();
}
// Sparks lifting off a fire mouth, each on its own drifting column.
export function embers(ctx,x,y,t,seed,{n=4,w=16,rise=26}={}){
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<n;i++){const k=seed*13+i,p=46+Math.floor(hash(k)*40),q=((t+hash(k+5)*p)%p)/p;
  const ex=Math.round(x+(hash(k+9)-.5)*w+Math.sin(q*5+k)*3),ey=Math.round(y-q*rise);
  ctx.globalAlpha=(1-q)*.9;ctx.fillStyle=q<.35?'#ffe7a0':'#ff8a34';ctx.fillRect(ex,ey,1,1);}
 ctx.restore();
}
// Flame tongues licking up from (x,y): w wide, a few out of step with each other.
function flames(ctx,x,y,t,seed,{w=14,n=2,spread=8,alpha=1,add=false}={}){
 ctx.save();if(add)ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;
 for(let i=0;i<n;i++){const k=seed*3+i,f=Math.floor((t+k*11)/(4+(k%3)))+k;
  cell(ctx,'dv_flame',f,x+(n>1?(i/(n-1)-.5)*spread:0),y+(i&1),w*(.8+.35*hash(k)),{flip:(k&1)===1});}
 ctx.restore();
}
function fire(ctx,x,y,t,seed,r=22,n=4){glow(ctx,x,y,r*(.94+.06*wave(t,seed)),'255,128,44',.3*wave(t,seed));embers(ctx,x,y-4,t,seed,{n,w:r*.7});}
// Surface pops across an ellipse of liquid: a bead rises, swells to a dome, bursts into a ring.
function boil(ctx,x,y,rx,ry,t,seed,n,[hi,mid,dark]){
 for(let i=0;i<n;i++){const k=seed*7+i,p=26+Math.floor(hash(k)*26),off=Math.floor(hash(k+3)*p),a=(t+off)%p;if(a>11)continue;
  const c=Math.floor((t+off)/p),ang=hash(k+11+c*3)*Math.PI*2,rad=Math.sqrt(hash(k+17+c))*.85;
  const bx=Math.round(x+Math.cos(ang)*rx*rad),by=Math.round(y+Math.sin(ang)*ry*rad);
  if(a<3){ctx.fillStyle=hi;ctx.fillRect(bx,by,1,1);}
  else if(a<8){ctx.fillStyle=mid;ctx.fillRect(bx-1,by-1,3,2);ctx.fillStyle=hi;ctx.fillRect(bx-1,by-1,1,1);ctx.fillStyle=dark;ctx.fillRect(bx-1,by+1,3,1);}
  else{ctx.fillStyle=hi;ctx.fillRect(bx-2,by,1,1);ctx.fillRect(bx+2,by,1,1);ctx.fillRect(bx,by-1,1,1);}
 }
}
// A slow bead of ghee gathers on the counter lip, drops and splats.
function drip(ctx,x,y0,y1,t,seed,period=170){
 const a=(t+seed*61)%period;ctx.fillStyle='#e0a83a';
 if(a<40){const r=a<20?0:1;ctx.fillRect(x,y0,1,1+r);ctx.fillStyle='#fff0a8';ctx.fillRect(x,y0,1,1);}
 else if(a<52){const q=(a-40)/12,y=Math.round(y0+(y1-y0)*q*q);ctx.fillRect(x,y,1,2);ctx.fillStyle='#fff0a8';ctx.fillRect(x,y,1,1);}
 else if(a<62){const s=a-52;ctx.globalAlpha=1-s/10;ctx.fillRect(x-1-s/3,y1,1,1);ctx.fillRect(x+1+s/3,y1,1,1);ctx.fillRect(x,y1,1,1);ctx.globalAlpha=1;}
}
// Flies loop over the food, now and then land on it (only open food or the case lid: spots, screen
// px), shuffle about and take off again, and scatter when someone brawls close by.
function flies(ctx,x,y,t,seed,n,spots){
 const near=[G.player,G.boss].some(a=>a&&!a.dead&&Math.abs(a.x-(x+G.camX))<46&&/attack|string|slam|hurt|ram|fling|super|punch|hook/.test(a.state||''));
 const r=near?14:8;
 for(let i=0;i<n;i++){
  const k=seed*11+i,cyc=Math.floor((t+k*29)/170),a=(t+k*29)%170,sit=!near&&a<56,q=(t+i*37+seed)*.09+i;
  let fx=x+Math.sin(q)*r+Math.sin(q*2.7)*2,fy=y+Math.cos(q*1.6)*r*.45-(near?4:0);
  if(sit){const [sx,sy]=spots[Math.floor(hash(k+cyc)*spots.length)];
   // Landing and take-off glide the last few ticks; sitting, it shuffles a pixel every so often.
   const at=[sx+(Math.floor(a/20)&1)*(hash(k+cyc*5)<.5?-1:1),sy],land=Math.min(1,a/5,(56-a)/5);
   fx=fx+(at[0]-fx)*land;fy=fy+(at[1]-fy)*land;}
  fx=Math.round(fx);fy=Math.round(fy);
  ctx.fillStyle='#1a120c';ctx.fillRect(fx,fy,2,1);ctx.fillStyle='#3c4a30';ctx.fillRect(fx+((t>>3)+i&1),fy,1,1);
  if(!sit||((t+i*5)>>2)%4===0){ctx.fillStyle=(t+i)&1?'rgba(255,246,222,.5)':'rgba(255,246,222,.28)';ctx.fillRect(fx+((t+i)&1),fy-1,1,1);}}
}
// The sweets case: a warm lamp inside, syrup glistening on the jalebis, a glint across the glass.
function glass(ctx,x0,y0,x1,y1,t){
 glow(ctx,(x0+x1)/2,(y0+y1)/2+4,24,'255,160,70',.12+.04*Math.sin(t*.07));
 for(let i=0;i<5;i++){const k=i*9+3,p=40+Math.floor(hash(k)*50),a=(t+Math.floor(hash(k+1)*p))%p;if(a>5)continue;
  const c=Math.floor((t+Math.floor(hash(k+1)*p))/p),sx=Math.round(x0+7+hash(k+c*2)*(x1-x0-14)),sy=Math.round(y0+12+hash(k+c*2+1)*(y1-y0-16));
  ctx.fillStyle=a<2||a>3?'#ffe0a0':'#fffbe8';ctx.fillRect(sx,sy,1,1);if(a===2||a===3){ctx.fillRect(sx-1,sy,3,1);ctx.fillRect(sx,sy-1,1,3);}}
 const a=t%180;if(a>30)return;const gx=x0-8+(x1-x0+16)*a/30;
 ctx.save();ctx.beginPath();ctx.rect(x0,y0,x1-x0,y1-y0);ctx.clip();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.3*Math.sin(a/30*Math.PI);
 ctx.fillStyle='#fff4d8';ctx.beginPath();ctx.moveTo(gx,y0);ctx.lineTo(gx+5,y0);ctx.lineTo(gx-4,y1);ctx.lineTo(gx-9,y1);ctx.fill();ctx.restore();
}
// A puri on the tawa (painted flat) balloons in the ghee, holds with the ghee shimmering over it,
// sighs, and settles flat again, letting off a burst of steam.
// [from tick, to tick, cell, height]: hard cuts through squashed inbetweens (a crossfade ghosts).
const PURI=[[70,76,0,1.25],[76,82,1,.78],[82,86,1,1],[86,89,2,.7],[89,92,2,.85],[92,95,2,1.06],[95,140,2,1],[140,144,2,.9],[144,147,2,.75],[147,152,1,1],[152,158,1,.78],[158,164,0,1.25]];
// (The first and last steps rise from the flat cell: the half-puffed one squashed thinner bands its highlight.)
// Pappu's head in front of a slot (near) never pops it: a puff due to start while he's there is
// skipped, and one already up when he arrives sighs back down through its own settle, then stays flat
// for the rest of that cycle.
const PURI_HOLD=[];
function puriPhase(t,seed,near){ // [phase, the steam's own clock]
 const n=t+seed*97,cyc=Math.floor(n/260),a=n%260;let h=PURI_HOLD[seed];
 if(!h||h.cyc!==cyc)h=PURI_HOLD[seed]={cyc,mode:null};
 if(a<70)return [a,a];
 if(!h.mode)h.mode=near?'skip':'play';
 if(h.mode==='play'&&near&&a<144){h.mode='settle';h.from=a;h.to=a<95?Math.max(144,164-(a-70)):144;}
 return h.mode==='skip'?[0,0]:h.mode==='settle'?[h.to+a-h.from,Math.max(a,88)]:[a,a];
}
function puri(ctx,x,y,t,seed,near=false){
 const [a,w]=puriPhase(t,seed,near),f=a>=86&&a<144?2:-1;
 if(a<70||a>=164)return;
 // It swells out of the painted puri and sinks back into it.
 const [,,c,k]=PURI.find(([a0,a1])=>a>=a0&&a<a1);cell(ctx,'dv_puri',c,x,y+4,22,{h:14.5*k});
 if(f===2)glow(ctx,x,y-2,12,'255,210,120',.1);
 if(a>=88&&a<160)wisp(ctx,x,y-3,w-88,seed*3+70,{period:72,size:.9,alpha:.5});
}

// Backdrop fires and lamps (camera-relative to the arena) that burn whatever happens to the stall.
const HEARTHS=[[57,160,24,5],[202,162,15,3],[140,155,11,0]]; // x, y, glow, embers
const LAMPS=[[22,110],[78,110],[110,98],[298,96]];
// Where the wrecked stall burns, per damage state.
// [x, base y (on the debris it burns), flame width]
const WRECK_FIRES=[[],[],
 [[403,177,14],[308,193,12],[252,148,18],[264,150,9],[288,152,22],[301,153,8],[316,156,13],[326,150,10]],
 [[256,154,16],[290,190,20],[322,158,12],[401,180,18],[239,199,11],[275,172,9],[320,200,14],[402,201,10]]];

// A glowing bed of char and embers at a fire's foot, so flames grow out of the debris.
function embed(ctx,x,y,w,t,seed){
 glow(ctx,x,y,w*.7,'255,110,30',.3+.1*wave(t,seed));const h=Math.round(w*.3);
 for(let i=-h;i<=h;i++){const k=hash(seed*31+i),hot=((t>>2)+Math.floor(k*9))%9<3;ctx.fillStyle=hot?'#ffd060':k<.4?'#3a1a0e':'#c8401a';ctx.fillRect(Math.round(x+i),Math.round(y+(k<.3?-1:0)),1,1);}
}
// Fresh fried food gives off heat: a glint of ghee slides across it and steam lifts off in turns.
function tray(ctx,x0,x1,y,t,seed){
 const p=150,a=(t+seed*57)%p;if(a<40){const q=a/40,gx=Math.round(x0+(x1-x0)*q),gy=Math.round(y+Math.sin(q*9+seed)*1.5);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.8*Math.sin(q*Math.PI);ctx.fillStyle='#fff2c0';ctx.fillRect(gx,gy,2,1);ctx.fillRect(gx+1,gy-1,1,1);ctx.restore();}
 for(let i=0;i<2;i++)wisp(ctx,x0+(x1-x0)*(.3+.4*i),y-2,t,seed*9+i,{period:120+i*23,size:.75,alpha:.4});
}
// The jalebi pile: syrup gathers into a bead and drops, and a slow gloss rolls over the coils.
function syrup(ctx,t,dx){
 const a=t%240;if(a<60){ctx.save();ctx.beginPath();ctx.rect(396+dx,128,40,24);ctx.clip();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.22*Math.sin(a/60*Math.PI);
  ctx.fillStyle='#ffe0a0';const gx=392+dx+a*.8;ctx.beginPath();ctx.moveTo(gx,128);ctx.lineTo(gx+4,128);ctx.lineTo(gx-2,152);ctx.lineTo(gx-6,152);ctx.fill();ctx.restore();}
 const d=(t+90)%200;ctx.fillStyle='#f0a030';
 if(d<50){ctx.fillRect(421+dx,146,1,d<25?1:2);ctx.fillStyle='#fff0b0';ctx.fillRect(421+dx,146,1,1);}
 else if(d<58){const y=Math.round(146+(d-50)*(d-50)*.12);ctx.fillRect(421+dx,y,1,2);}
}

// A fire at street level lights the wet cobbles in front of it: a warm pool that breathes with the
// flames, and broken vertical streaks of reflected flame that jitter on the wet stone.
function streetGlow(ctx,x,y,w,t,seed){
 const f=wave(t*1.3,seed);ctx.save();ctx.globalCompositeOperation='lighter';
 ctx.translate(x,y+13);ctx.scale(1,.2);const g=ctx.createRadialGradient(0,0,0,0,0,w/2);
 g.addColorStop(0,`rgba(255,150,60,${.26*f})`);g.addColorStop(.6,`rgba(255,110,40,${.1*f})`);g.addColorStop(1,'rgba(255,90,30,0)');
 ctx.fillStyle=g;ctx.fillRect(-w/2,-w/2,w,w);ctx.restore();
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let i=0;i<Math.round(w/9);i++){const k=seed*17+i,j=Math.floor((t+k*3)/(3+(k&1))),sx=Math.round(x+(hash(k)-.5)*w*.8+(hash(k+j)-.5)*2);
  // Each streak breaks into dashes that wobble a pixel apart and fade down its length.
  const len=8+Math.floor(hash(k+j*7)*9),sy=Math.round(y+5+hash(k+3)*4),near=1-Math.abs(sx-x)/w,a0=(.22+.2*hash(k+j*3))*(.6+.4*near),bw=1+(hash(k+j)>.5);
  ctx.fillStyle='#ffe0a0';ctx.globalAlpha=a0;ctx.fillRect(sx,sy,bw,1);ctx.fillStyle=k%3?'#ffb060':'#ff8a34';
  for(let d=1,n=0;d<len;n++){const dl=2+Math.floor(hash(k+n*5+j)*3);ctx.globalAlpha=a0*(1-d/len);ctx.fillRect(sx+((n+j)&1?(hash(k+n)<.5?-1:1):0),sy+d,bw,Math.min(dl,len-d));d+=dl+1;}}
 ctx.restore();
}

// The spilled kadai's burning ghee (drawn over its prop): live flames along the pool, a pulse of
// light off the burning oil, embers and greasy smoke.
export function drawSpillLife(ctx,x,y,spread=1){
 if(G.reflecting||G.india?.review?.ambient===false||spread<=0)return;const t=G.time|0,k=clamp01(spread*1.4);
 streetGlow(ctx,x,y,72*(.4+.6*k),t,61);
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(.16+.12*wave(t*1.3,7))*k;
 const g=ctx.createRadialGradient(x,y-6,0,x,y-6,46);g.addColorStop(0,'rgba(255,190,80,1)');g.addColorStop(1,'rgba(255,90,20,0)');ctx.fillStyle=g;ctx.fillRect(x-46,y-30,92,34);ctx.restore();
 // (spreading: each tongue catches as the burning ghee reaches it from the pan's mouth)
 for(const [i,[ox,oy,w]]of [[-30,-3,14],[-14,-1,20],[4,-4,24],[21,-2,18],[36,-6,13],[-2,-16,16]].entries()){const lit=clamp01(spread*2.2-Math.abs(ox+2)/30);if(lit<=0)continue;
  embed(ctx,x+ox,y+oy,w*.8*lit,t,i+40);flames(ctx,x+ox,y+oy+1,t,i*7+50,{w:w*(.3+.7*lit),n:w>16?2:1,spread:w*.45,alpha:Math.min(1,lit*1.5)});}
 embers(ctx,x,y-20,t,57,{n:Math.round(6*k),w:60*k,rise:40});
 if(k>.5)steamer(ctx,x+4,y-24,t,58,{n:2,period:120,size:1.8,alpha:.5*k,smoke:true});
}

// The kadai going over (the finisher): its gas ring under it (a = 1..0 as it is knocked off and snuffed), and the burning
// ghee still in the pan, drawn upright at its mouth (k = 1..0 as it pours out) so the fire never turns with the iron.
export function kadaiBurner(ctx,x,y,a=1){
 if(a<=0||G.reflecting||G.india?.review?.ambient===false)return;const t=G.time|0;ctx.save();ctx.globalAlpha*=a;
 cell(ctx,'dv_burner',t>>2,x+1,y-13,28);glow(ctx,x,y-18,18,'70,120,255',.24*wave(t,4));ctx.restore();
}
export function panFire(ctx,x,y,k){
 if(k<=0||G.reflecting)return;const t=G.time|0;
 fire(ctx,x,y-10,t,44,24*k+6,Math.round(6*k));flames(ctx,x,y,t,44,{w:22*k+4,n:3,spread:26*k});
 if(k>.3)steamer(ctx,x,y-30,t,45,{n:2,period:90,size:1.6*k,alpha:.4*k,smoke:true});
}
// The kadai's ghee catching as it spills (the finisher): a low, wide sheet of the kitchen's flames hugging the spill
// line at x,y, k 0..1 (up to ~46 px high in the middle, lower at the ends), flashing along the street as it catches.
// spread 0..1: how far along the street it has run left from the pan's mouth (x+10); a tongue catches as it arrives.
export function gheeFire(ctx,x,y,t,k,age=99,spread=1){
 if(k<=0||G.reflecting)return;const run=x+10-60*spread,c=x+10-30*spread;
 streetGlow(ctx,c,y-6,(150*k+40)*(.4+.6*spread),t,62);glow(ctx,c,y-12,50+30*k,'255,120,40',.4*k);
 if(age<6)glow(ctx,c,y-4,90*(.5+.5*spread),'255,220,140',.45*(1-age/6));
 for(let i=0;i<9;i++){const u=i/8-.5,edge=1-Math.abs(u)*1.2,fx=x+u*100,lit=fx>x+10?clamp01(spread*2.5-.2):clamp01((fx-run)/14+.15);if(lit<=0)continue;embed(ctx,fx,y+1,8,t,70+i);
  flames(ctx,fx+(hash(i+70)-.5)*6,y+(i&1),t,70+i,{w:((8+18*k)*edge+4)*lit,n:1,alpha:Math.min(1,lit*1.5)});}
 flames(ctx,c-4,y-1,t,80,{w:18*k+2,n:3,spread:56*spread,add:true,alpha:.7*k});
 embers(ctx,c,y-10-24*k,t,81,{n:Math.round(4+8*k),w:100*spread,rise:40+30*k});
}

// The ladles, skimmer and chilli garlands hanging on the back wall (dv_hang, cut from the painted
// wall at 2x): each swings a little from its hook in the draught, out of step with the others, and
// they all jangle when a slam shakes the stall. [x0, x1, hook row] in 2x px.
const HANG=[[0,20,25],[44,76,25],[80,106,9],[106,126,0],[132,154,28]],HANG_AT=[191,91];
let knock={t:-1e9,s:0,last:0};
export function drawKitchenWall(ctx,camX){
 if(G.reflecting||G.india?.review?.ambient===false)return;
 const im=ASSETS.dv_hang,dx=O-camX;if(!im||dx>W0||dx<-W0)return;const t=G.time|0;
 if(G.shake>=2&&G.shake>knock.last)knock={t,s:Math.min(3,G.shake*.6),last:G.shake};else knock.last=G.shake;
 const age=t-knock.t,jolt=age<120?knock.s*Math.exp(-age/40):0;
 for(const [i,[x0,x1,y0]]of HANG.entries()){
  const len=im.height-y0,amp=(.9+.3*hash(i))*Math.sin(t*2*Math.PI/(62+i*7)+i*1.9)+jolt*Math.sin(age*2*Math.PI/(26+i*3)+i);
  // Row bands with the same offset go down in one draw: 0 at the hook, the full swing at the end.
  // Half-pixel offsets, so the bend steps half a pixel at a time at 2x.
  let r=0;while(r<im.height){const o=Math.round(2*amp*Math.max(0,r-y0)/len)/2;let e=r+1;
   while(e<im.height&&Math.round(2*amp*Math.max(0,e-y0)/len)/2===o)e++;
   ctx.drawImage(im,x0,r,x1-x0,e-r,Math.round(HANG_AT[0]+dx)+x0/2+o,HANG_AT[1]+r/2,(x1-x0)/2,(e-r)/2);r=e;}
 }
}

// Pappu's head on screen, from the finisher that draws him outside the boss entity (see puris).
let head=null;export function pappuHead(x,y){head={x,y,t:G.time|0};}
export function drawVendorKitchenLife(ctx,camX,state=0){
 if(G.reflecting||G.india?.review?.ambient===false)return;
 const dx=O-camX;if(dx>W0||dx<-W0)return;const t=G.time|0;
 // Firelight breathing across the whole back wall and the wet street.
 glow(ctx,150+dx,170,150,'255,120,50',.05*wave(t*.7,9));
 // Ripples on the wet street under the fires: broken warm streaks that swim and flicker.
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(const [i,[x,y,w]]of [[57,214,26],[202,212,18],[140,212,14],[372,230,22]].entries())for(let j=0;j<4;j++){
  const k=i*7+j,ph=t*.06+k*1.7,sx=Math.round(x+dx+Math.sin(ph)*3+(hash(k)-.5)*w),sy=y+j*2+((t+k*5)>>4&1),len=2+Math.round((1+Math.sin(ph*1.3))*w*.12);
  ctx.globalAlpha=.1+.1*wave(t,k);ctx.fillStyle=i===3&&j<2?'#6a9cff':'#ffb060';ctx.fillRect(sx,sy,len,1);}
 ctx.restore();
 for(const [i,[x,y,r,n]]of HEARTHS.entries())fire(ctx,x+dx,y,t,i*3+1,r,n);
 // Bulbs on bare flex: a slow sway of the light, a flicker in the filament, the odd brown-out stutter.
 for(const [i,[x,y]]of LAMPS.entries()){const stutter=(t+i*97)%480<10&&((t>>1)&1),f=wave(t*1.7,i*2.1),sw=Math.sin(t*.025+i*1.3)*1.5;
  glow(ctx,x+dx+sw,y+2,12,'255,206,120',stutter?.05:.1+.1*f);if(!stutter&&f>.8){ctx.fillStyle='#fff6d8';ctx.fillRect(x+dx,y,1,1);}}
 // The shrine's diya, and the kitchen's steam rolling up the back room.
 const d=wave(t*2,5);glow(ctx,340+dx,115,7,'255,190,90',.22*d);ctx.fillStyle=d>.72?'#fff2b0':'#ffc860';ctx.fillRect(340+dx,113-(d>.8?1:0),1,2);
 steamer(ctx,148+dx,134,t,80,{n:3,period:150,size:1.5,alpha:.22});
 if(state===0){
  // Dal on a rolling boil, steam off the pot; puris puffing on the tawa; the trays still warm.
  boil(ctx,235+dx,133,8,2,t,1,6,['#ffe9a0','#d89a30','#8a5a14']);
  steamer(ctx,235+dx,131,t,1,{n:2,period:96,size:1.1,alpha:.4});
  // A puri ballooning right behind Pappu's bald head reads as a hat: it stays down while he's in front
  // of it (the boss, or the finisher's victim once it has drawn him; the dead boss stands in until then).
  const drawn=t-(head?.t??-9)<3,b=G.boss;
  const heads=[b?.kadai&&(!b.dead||(G.india?.cinematic&&!drawn))&&{x:b.x-camX,y:b.y-(b.z||0)-92},drawn&&head].filter(Boolean);
  // The finisher holds Pappu right in front of the back puri, which sat on his crown like a flat cap:
  // bare tawa there from the entry's black frames on (the swap is never seen; the stall is rubble by the end).
  const c=G.india?.cinematic,bare=c?.kind==='vendor-finish'&&(!c.entry||c.entry.staged),tawa=ASSETS.dv_tawa_patch;
  if(bare&&tawa){const k=246/768;ctx.drawImage(tawa,Math.round(330+dx)-123+180*k,49+270*k,tawa.width*k,tawa.height*k);}
  for(const [i,[x,y]]of [[280,142],[272,149],[298,150]].entries())if(!(bare&&i===0))puri(ctx,x+dx,y,t,i,heads.some(h=>Math.abs(h.x-x-dx)<22&&Math.abs(h.y-y)<16));
  steamer(ctx,287+dx,146,t,3,{n:1,period:130,size:1.2,alpha:.24});
  tray(ctx,330+dx,354+dx,134,t,1);tray(ctx,362+dx,384+dx,131,t,2);
  flies(ctx,356+dx,127,t,0,3,[[336+dx,131],[346+dx,132],[366+dx,128],[380+dx,129]]);flies(ctx,412+dx,112,t,19,2,[[400+dx,119],[413+dx,119],[427+dx,119]]);
  glass(ctx,391+dx,121,439+dx,155,t);syrup(ctx,t,dx);
  for(const [i,[x,y0,y1,p]]of [[292,175,207,170],[300,175,207,215],[348,170,207,190],[352,160,166,230]].entries())drip(ctx,x+dx,y0,y1,t,i*2,p);
 }else if(state===1){
  boil(ctx,235+dx,127,8,2,t,1,3,['#ffe9a0','#d89a30','#8a5a14']);wisp(ctx,235+dx,125,t,1,{size:.9,alpha:.3});
  for(const [i,[x,y]]of [[272,140],[291,145]].entries())wisp(ctx,x+dx,y,t,i*3+5,{size:.8,alpha:.26,period:120});
  flies(ctx,380+dx,134,t,7,3,[[374+dx,139],[386+dx,139]]);
 }
 const wreck=WRECK_FIRES[state]||[];
 if(state>1){steamer(ctx,296+dx,146,t,90,{n:3,period:130,size:state>2?2.6:2.2,alpha:.62,smoke:true});steamer(ctx,398+dx,176,t,92,{n:2,period:110,size:1.6,alpha:.5,smoke:true});}
 for(const [i,[x,y,w]]of wreck.entries()){if(y>=190)streetGlow(ctx,x+dx,y,w*2.6,t,i+30);fire(ctx,x+dx,y-4,t,i*5+20,w,2);embed(ctx,x+dx,y,w,t,i);flames(ctx,x+dx,y+1,t,i*5+20,{w,n:w>14?2:1,spread:w*.4});}
}

// The painted oil's outline in the kadai (state 0), so the boiling oil strip only covers the oil.
let oilMask=null;
function oilClip(){
 const im=ASSETS.dv_kadai;if(!im)return null;if(oilMask?.src===im)return oilMask;
 const cw=Math.floor(im.width/3),c=document.createElement('canvas');c.width=cw;c.height=im.height;const x=c.getContext('2d');
 x.drawImage(im,0,0,cw,im.height,0,0,cw,im.height);const d=x.getImageData(0,0,cw,im.height).data;
 const spans=[];for(let y=0;y<im.height*.6;y++){let l=-1,r=-1;for(let i=0;i<cw;i++){const p=(y*cw+i)*4;if(d[p+3]>200&&d[p]>200&&d[p+1]>110&&d[p+2]<120){if(l<0)l=i;r=i;}}if(r-l>12)spans.push([y,l,r]);}
 x.clearRect(0,0,cw,im.height);x.fillStyle='#fff';for(const [y,l,r]of spans)x.fillRect(l,y,r-l+1,1);
 const ys=spans.map(s=>s[0]),box=spans.length?{x0:Math.min(...spans.map(s=>s[1])),x1:Math.max(...spans.map(s=>s[2]))+1,y0:Math.min(...ys),y1:Math.max(...ys)+1}:null;
 const buf=document.createElement('canvas');buf.width=cw;buf.height=im.height;
 oilMask={src:im,c,box,buf,cw,h:im.height};return oilMask;
}
// Oil jumps out of the kadai: a crown of droplets and a flash on the surface.
function splash(ctx,x,y,a,seed){
 if(a<0||a>=18)return;const q=a/18;
 if(a<5)glow(ctx,x,y,18,'255,220,130',.35*(1-a/5));
 const im=tint('dv_splash','255,200,80',.55);if(im&&a<12){const k=.35+.25*Math.min(1,a/4),w=im.width*k,h=im.height*k;ctx.save();ctx.globalAlpha=a>7?(12-a)/5:.9;ctx.drawImage(im,Math.round(x-w/2),Math.round(y+2-h),Math.round(w),Math.round(h));ctx.restore();}
 for(let i=0;i<16;i++){const k=seed*17+i,ang=Math.PI*(.1+.8*hash(k)),v=1.3+hash(k+1)*1.9,px=Math.round(x+Math.cos(ang)*v*a*(hash(k+2)<.5?-1:1)*1.4),py=Math.round(y-Math.sin(ang)*v*a*1.3+.2*a*a);
  ctx.globalAlpha=1-q*q;ctx.fillStyle=i%3?'#ffcf5a':'#fff4c0';ctx.fillRect(px,py,i%3?1:2,i%3?1:2);}
 ctx.globalAlpha=1;
}
// Kadai at work (called from its prop draw at screen x,y): the gas ring under it, the oil at a
// rolling boil with the pakoras bobbing, glints, spits and steam. work = {busy (he's at it),
// burst (ticks since the oil was thrown up), flare (ticks since a phase change set it roaring)}.
export function drawKadaiLife(ctx,x,y,state,{busy=false,burst=99,flare=99}={}){
 if(G.reflecting||G.india?.review?.ambient===false)return;const t=G.time|0;
 cell(ctx,'dv_burner',t>>2,x+1,y-13,28);
 glow(ctx,x,y-18,18,'70,120,255',.24*wave(t,4));
 // A phase change: a column of fire off the pan that sinks back over a second.
 if(flare>=0&&flare<48){const k=1-flare/48;glow(ctx,x,y-56,70*k+20,'255,140,40',.55*k);
  flames(ctx,x,y-34,t,48,{w:18+10*k,n:5,spread:36,alpha:Math.min(1,k*1.6)});
  flames(ctx,x,y-40-16*k,t,49,{w:16+8*k,n:3,spread:18,alpha:k,add:true});embers(ctx,x,y-60,t,50,{n:12,w:50,rise:60+40*k});}
 if(state===0){
  glow(ctx,x,y-40,28,'255,170,60',.08+.05*wave(t,2));
  const m=oilClip();
  if(m?.box&&ASSETS.dv_oil){
   // The strip runs quicker while he's working the oil.
   const f=Math.floor(t/(busy?4:6)),b=m.box,g=m.buf.getContext('2d');
   g.clearRect(0,0,m.cw,m.h);g.globalCompositeOperation='source-over';
   const bw=b.x1-b.x0+2,bh=b.y1-b.y0+6;cell(g,'dv_oil',f,(b.x0+b.x1)/2,b.y1+2,bw,{h:bh});
   g.globalCompositeOperation='destination-in';g.drawImage(m.c,0,0);g.globalCompositeOperation='source-over';
   ctx.save();ctx.drawImage(m.buf,Math.round(x-m.cw/4),Math.round(y-m.h/2+2),Math.round(m.cw/2),Math.round(m.h/2));ctx.restore();
  }
  boil(ctx,x,y-39,20,3,t,40,busy?12:6,['#fff4b8','#f0c050','#8a5a14']);
  for(let i=0;i<2;i++){const q=((t*.6+i*55)%110)/110,gx=Math.round(x-18+36*q),gy=Math.round(y-40+Math.sin(q*Math.PI)*2);
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.55*Math.sin(q*Math.PI);ctx.fillStyle='#fff6cc';ctx.fillRect(gx,gy,3,1);ctx.restore();}
  {const n=busy?3:1;for(let i=0;i<n;i++){const p=busy?34:90,a=(t+i*23)%p;if(a>14)continue;const k=Math.floor((t+i*23)/p)*3+i,side=hash(k)<.5?-1:1;
   const q=a/14,sx=Math.round(x+side*(6+hash(k+1)*12)+side*q*10),sy=Math.round(y-41-Math.sin(q*Math.PI)*(8+hash(k+2)*8));
   ctx.fillStyle='#ffe08a';ctx.fillRect(sx,sy,1,1);}}
  splash(ctx,x,y-40,burst,Math.floor(t/97));
  // Ghee running down the pan's outside drips onto the burner and flares.
  for(const [i,[ox,oy]]of [[-9,-33],[4,-28],[17,-30]].entries()){drip(ctx,x+ox,y+oy,y-15,t,i*3+7,150+i*37);const a=(t+(i*3+7)*61)%(150+i*37);if(a>=52&&a<58)glow(ctx,x+ox,y-15,5,'255,170,70',.5);}
  steamer(ctx,x,y-40,t,41,{n:3,period:busy?76:92,size:1.25,alpha:busy?.5:.4});
 }else if(state===1){fire(ctx,x,y-46,t,44,24,6);flames(ctx,x,y-36,t,44,{w:22,n:3,spread:26});steamer(ctx,x,y-66,t,45,{n:2,period:90,size:1.6,alpha:.4,smoke:true});}
}
