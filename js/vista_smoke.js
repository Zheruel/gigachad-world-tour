// Night Train vista life: chimney plumes, birds and river glints over the scrolling vista plates.
// Everything is anchored in plate pixels (so it rides the plate's parallax) and is a pure function of
// G.time and the train's distance: drawing never mutates state. The baked plumes were cleared from
// vista_river.png by tools/production/build_vista_smoke.py, which also bakes the puff sheet.
import {G,W} from './engine.js';
import {ASSETS} from './assets.js';
// Keep in step with SIZES/CELL in build_vista_smoke.py (sheet: 8 puff columns, one row per size). Sizes are
// plate pixels, which the plate draws at one physical pixel each on the RS canvas: puffs share its detail.
const SIZES=[6,8,10,12,14,16,18,20,22,24,28,32,36,40,46,52,60,68],CELL=72;
// Plate-pixel plumes. mouth, rise/drift (plate px over the puff life), start/end size (plate px),
// emission interval and life (ticks), h0/h1: how much sky colour is mixed in (young -> old puffs).
// SKY: the river plate's sky by plate row (orange at the horizon, plum overhead) for that haze.
const SKY={river:[[40,'#6a2840'],[70,'#842c36'],[100,'#a3372a'],[130,'#cf5a10'],[160,'#dc6412']]};
const LEFT=[[40,'#6a247a'],[70,'#ad3a65'],[100,'#c0485a'],[130,'#cb4f52'],[160,'#c05e58']],RIGHT=[[130,'#5c2b89'],[160,'#a6376f'],[190,'#c84859']];
// river_near rows are in the roadside layer's pixels (drawn at .4 from y 34): the same sky bands.
SKY.river_near=SKY.river.map(([y,c])=>[(y*.5-58)/.4,c]);
// bend: how quickly the rise levels off (higher = the column tips over into a trailing drift sooner);
// fade > 1 thins a plume out sooner; lean < 1.35 lets the wind take the column earlier.
const PLUMES={
 river:[
  {x:561,y:154,rise:190,drift:240,bend:1.6,lean:1.05,s0:14,s1:68,every:4,life:420,h0:0,h1:.4,sway:40,spread:.8},
  {x:191,y:198,rise:70,drift:110,bend:2.6,s0:6,s1:28,every:6,life:280,h0:.3,h1:.6,sway:12,spread:.55},
  {x:961,y:172,rise:82,drift:130,bend:2.6,s0:6,s1:32,every:6,life:300,h0:.15,h1:.5,sway:14,spread:.55},
  {x:1133,y:176,rise:88,drift:136,bend:2.5,s0:6,s1:34,every:6,life:310,h0:.15,h1:.5,sway:14,spread:.55},
  {x:1381,y:184,rise:74,drift:120,bend:2.6,s0:6,s1:30,every:6,life:290,h0:.2,h1:.55,sway:12,spread:.55},
  {x:1494,y:174,rise:84,drift:130,bend:2.5,s0:6,s1:32,every:6,life:310,h0:.18,h1:.52,sway:14,spread:.55},
 ],
 // Dusk factory district: the sky shifts from sunset red (left) to violet (centre), so each stack names its own.
 industry:[
  {x:168,y:139,rise:62,drift:70,bend:2.4,s0:5,s1:22,every:7,life:240,h0:.3,h1:.6,sway:8,spread:.55,sky:LEFT},
  {x:293,y:99,rise:80,drift:92,bend:2.3,s0:6,s1:28,every:6,life:270,h0:.25,h1:.6,sway:10,spread:.55,sky:LEFT},
  {x:706,y:117,rise:110,drift:124,bend:2.2,s0:6,s1:36,every:5,life:300,h0:.45,h1:.75,sway:12,spread:.555,sky:[[40,'#21136d'],[70,'#371c7e'],[100,'#421f80'],[130,'#412680']]},
  {x:1062,y:158,rise:104,drift:116,bend:2.3,s0:6,s1:34,every:5,life:300,h0:.45,h1:.75,sway:12,spread:.555,sky:[[40,'#24146d'],[70,'#341b7b'],[100,'#4e2086'],[130,'#772987'],[160,'#742b81']]},
  {x:1453,y:196,rise:52,drift:54,bend:2.4,s0:4,s1:16,every:8,life:220,h0:.35,h1:.65,sway:6,spread:.55,sky:RIGHT},
  {x:1464,y:196,rise:46,drift:50,bend:2.4,s0:4,s1:14,every:8,life:200,h0:.35,h1:.65,sway:6,spread:.55,sky:RIGHT},
 ],
 // The brick stack on the roadside embankment: closer, so bigger, faster-growing puffs.
 river_near:[{x:1834,y:219,rise:190,drift:300,bend:2.2,s0:14,s1:46,every:5,life:260,h0:0,h1:.5,sway:26,spread:.7,fade:1.4}],
};
const hash=n=>{n=Math.imul(n^0x9e3779b9,0x85ebca6b);n^=n>>>13;n=Math.imul(n,0xc2b2ae35);return((n^n>>>16)>>>0)/4294967296;};
const cache=new Map();
// One puff cell: sheet column v, size row s, haze colour mixed by `mix`.
function puff(sheet,v,s,haze,mix){
 const key=v+','+s+','+haze+','+mix;let c=cache.get(key);if(c)return c;
 c=document.createElement('canvas');c.width=c.height=CELL;const x=c.getContext('2d');x.imageSmoothingEnabled=false;
 x.drawImage(sheet,v*CELL,s*CELL,CELL,CELL,0,0,CELL,CELL);
 if(mix>0){x.globalCompositeOperation='source-atop';x.globalAlpha=mix;x.fillStyle=haze;x.fillRect(0,0,CELL,CELL);x.globalAlpha=1;}
 cache.set(key,c);return c;
}
const sizeRow=px=>{let r=0;while(r<SIZES.length-1&&SIZES[r+1]<=px)r++;return r;};
function drawPlume(ctx,sheet,p,sky,ox,oy,k,T){
 const mx=ox+p.x*k,my=oy+p.y*k;if(mx<-90||mx>W+40)return;
 const n0=Math.floor((T-p.life)/p.every)+1,n1=Math.floor(T/p.every),base=ctx.globalAlpha;
 for(let n=n0;n<=n1;n++){
  const born=n*p.every,u=(T-born)/p.life;if(u<0||u>=1)continue;
  const r1=hash(n*3+p.x),r2=hash(n*7+p.y),r3=hash(n*13+p.x+p.y);
  // Fast jet out of the stack that slows into a drifting billow; the wind at emission bends the column.
  const gust=Math.sin(born*.017+p.x)*.6+Math.sin(born*.0061+p.y)*.4;
  // The stack chuffs: emission swells and ebbs, so the column breaks into lumpy clusters, not a band.
  const pulse=.5+.5*Math.sin(born*.09+p.x)*Math.sin(born*.023+p.y);
  const px=(p.s0+(p.s1-p.s0)*Math.pow(u,.45))*(.6+r3*.35+pulse*.35);
  const s=sizeRow(px),dim=SIZES[s],grow=Math.min(1,u*5);
  // Scatter grows with the puff (both axes) so the edges billow instead of reading as a rope.
  const rise=p.rise*(1-Math.pow(1-u,p.bend))*(.9+r1*.2)+(r2-.5)*p.spread*dim*grow;
  const drift=p.drift*Math.pow(u,p.lean||1.35)*(.85+r2*.3)+gust*p.sway*u+(r3-.5)*2*p.spread*dim*grow;
  // Dense young puffs, then looser broken shapes that grow translucent before they vanish (an ordered
  // dither aliases into a visible grid once the plate or roadside layer scales the cell).
  const v=u<.5?Math.floor(r1*4):4+Math.floor(r2*4);
  const f=u*(p.fade||1),alpha=f<.38?1:1-Math.pow((f-.38)/.62,.8);if(alpha<=0)continue;
  const mix=Math.round((p.h0+(p.h1-p.h0)*u)*4)/4,py=p.y-rise-dim*.5;
  const haze=(p.sky||sky).reduce((a,b)=>Math.abs(b[0]-py)<Math.abs(a[0]-py)?b:a)[1];
  // Snap to the physical pixel grid (half a logical pixel on the RS canvas).
  const x=Math.round((mx+(drift-CELL/2)*k)*2)/2,y=Math.round((my+(2-rise-dim*.5-CELL/2)*k)*2)/2;
  ctx.globalAlpha=base*alpha;ctx.drawImage(puff(sheet,v,s,haze,mix),x,y,CELL*k,CELL*k);
 }
 ctx.globalAlpha=base;
}
// River glints: the plate's own brightest water highlights (found once) flare for a few ticks each.
const WATER={river:[[800,250,1560,420]]},glints={};
function glintsFor(kind,im){
 if(glints[kind]!==undefined)return glints[kind];if(!im.complete||!im.width)return [];   // not decoded yet: look again next frame
 glints[kind]=[];
 try{
  const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const x=c.getContext('2d');x.drawImage(im,0,0);
  for(const [x0,y0,x1,y1]of WATER[kind]){const d=x.getImageData(x0,y0,x1-x0,y1-y0).data,w=x1-x0,L=i=>d[i*4]*.3+d[i*4+1]*.59+d[i*4+2]*.11;
   for(let y=1;y<y1-y0-1;y++)for(let i=1;i<w-1;i++){const n=y*w+i,l=L(n);if(l>118&&l>=L(n-1)&&l>L(n+1)&&l>=L(n-w)&&l>L(n+w)&&hash(n+x0*7)<.5)glints[kind].push([x0+i,y0+y,hash(n)]);}}
 }catch{}
 return glints[kind];
}
function drawGlints(ctx,kind,im,ox,oy,k,T){
 // One physical pixel per plate pixel: a 1-3 px sparkle on the plate's own highlight.
 for(const [gx,gy,r]of glintsFor(kind,im)){
  const x=Math.round((ox+gx*k)*2)/2;if(x<-2||x>W+1)continue;
  const period=90+Math.floor(r*140),t=(T+Math.floor(r*9973))%period;if(t>=9)continue;
  const y=Math.round((oy+gy*k)*2)/2,hot=t>=3&&t<6;
  ctx.fillStyle=hot?'#fff0c0':'#ffc46a';ctx.fillRect(x-(hot?.5:0),y,hot?1.5:.5,.5);
 }
}
// A small flock crosses the sky now and then (screen space, drawn once per frame, not per tile), drawn in
// physical pixels (half a logical pixel) like the plate: wings up, level, down, level.
const BIRD=[['X.....X','.X...X.','..XXX..'],['.......','XXXXXXX','..XXX..'],['..XXX..','.X...X.','X.....X'],['.......','XXXXXXX','..XXX..']]
 .map(rows=>rows.flatMap((r,y)=>[...r].map((c,x)=>c==='X'?[x/2,y/2]:null).filter(Boolean)));
// The flock drifts back with the train from where it was when its pass began (a wrapped offset jumped 40 px).
let flock={cycle:-1,d:0};
function drawBirds(ctx,T,distance){
 const period=1500,cycle=Math.floor(T/period),t=T-cycle*period;if(t>=1100)return;
 if(flock.cycle!==cycle)flock={cycle,d:distance};
 const r=hash(cycle*31+7),baseY=30+Math.round(r*26),x0=W+16-t*.52-(distance-flock.d)*.03;
 ctx.fillStyle='#2b1418';
 for(let i=0;i<4;i++){
  const bx=Math.round(x0+i*9+hash(cycle*5+i)*5),by=Math.round((baseY+(i%2?4:0)+i*2+Math.sin((T+i*37)*.05)*1.2)*2)/2;if(bx<-6||bx>W)continue;
  for(const [px,py]of BIRD[Math.floor((T+i*5)/6)%4])ctx.fillRect(bx+px,by+py,.5,.5);
 }
}
// ox: this plate tile's screen x; oy: its top; k: screen px per plate px.
export function drawVistaLife(ctx,kind,ox,oy,k,tr,im){
 if(tr?.review?.vistaLife===false)return;
 const sheet=ASSETS.nr_vista_smoke,T=G.time||0,tile=im?im.width*k:0;
 if(im&&WATER[kind])drawGlints(ctx,kind,im,ox,oy,k,T);
 // Oldest plume puffs first so fresh smoke sits on top at each stack mouth.
 if(sheet)for(const p of PLUMES[kind]||[])drawPlume(ctx,sheet,p,SKY[kind],ox,oy,k,T);
 if(kind==='river'&&ox<=0&&ox+tile>0)drawBirds(ctx,T,tr?.distance||0);
}
