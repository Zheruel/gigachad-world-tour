// Goods train on the platform's far track. Each pass (every FREIGHT_PERIOD ticks of the station
// clock) shuffles a new rake behind the locomotive and runs it right to left, easing its speed
// up and down; couplers take up slack, vehicles dip over rail joints, wheels turn, the diesel
// puffs exhaust and the rake picks up the platform lamps. Everything is a pure function of the
// clock, so drawing never changes state; the tick update only plays the rail-joint clack.
import { G, W } from './engine.js';
import { ASSETS } from './assets.js';

const PERIOD=1800,RAIL=129,EAST=2880,WEST=1838,JOINT=56,SWING=560;
// st_freight_cars.png (tools/production/build_station_freight.py): [atlas x, width, wheel x...]
// in 2x pixels, wheels from the vehicle's left edge; tyres sit on the cell's row 85.
const CARS=[[4,306,[36,67,96,214,242,269]],[314,146,[21,44,102,124]],[464,137,[18,39,96,118]],[605,138,[20,41,96,118]],[747,147,[20,43,102,126]],[898,129,[20,40,90,110]]];
const CELL=87,LOCO=0,VAN=5,WAGONS=[1,2,3,4];
// Wheel radius (logical) and bogies (wheel groups) per vehicle.
const RADIUS=CARS.map((_,i)=>i===LOCO?3.5:3);
const BOGIES=CARS.map(([,,ws])=>{const g=[];for(const x of ws){const b=g[g.length-1];if(b&&x-b[b.length-1]<36)b.push(x);else g.push([x]);}return g.map(b=>b.reduce((s,x)=>s+x,0)/b.length/2);});
// Lamps between the viewer and the track [worldX, y, radius, strength]: hall lamp post, column
// lanterns and canopy pendants.
const LAMPS=[[1877,84,40,.4],[1991,98,32,.28],[2186,98,32,.28],[2538,98,32,.28],[2830,98,32,.28],[2272,50,52,.18],[2505,50,52,.18],[2670,50,52,.18]];
const NOSE=[[5,22.5,10],[16.5,6,7]],TAIL=[60.5,26.5],STACK=[74,5];

const passes=new Map();
function hash(a,b=0,c=0){let h=(a*374761393+b*668265263+c*2246822519)>>>0;h=Math.imul(h^h>>>13,1274126177);return((h^h>>>16)>>>0)/4294967296;}
function rake(n){
 let p=passes.get(n);if(p)return p;
 let k=0;const r=()=>hash(n,97,k++);
 const cars=[LOCO],count=6+Math.floor(r()*6);
 while(cars.length<=count){const c=WAGONS[Math.floor(r()*WAGONS.length)];if(c!==cars[cars.length-1]||r()<.35)cars.push(c);}
 cars.push(VAN);
 const v=1.75+r()*.5;
 p={cars,v,phase:r()*Math.PI*2,amp:.2*v*SWING/(Math.PI*2)};
 if(passes.size>6)passes.clear();passes.set(n,p);return p;
}
const halfPx=x=>Math.round(x*2)/2;
// Leftward distance run since the pass began; speed swings +-20% around v.
function run(p,t){const w=Math.PI*2/SWING;return p.v*t+p.amp*(Math.sin(w*t+p.phase)-Math.sin(p.phase));}
function pull(p,t){return -Math.sin(Math.PI*2/SWING*t+p.phase);}  // +1 accelerating, -1 easing off
// World layout of the rake at a clock time: [vehicle, left x, bogie xs].
function layout(clock){
 const n=Math.floor(clock/PERIOD),t=clock-n*PERIOD,p=rake(n),out=[];
 let x=EAST-run(p,t);
 for(const [i,c]of p.cars.entries()){
  out.push([c,x,BOGIES[c].map(b=>x+b)]);
  // Couplers stretch while the engine pulls and bunch up as it eases, rippling back along the rake.
  x+=CARS[c][1]/2-1+.5+.5*pull(p,t-5*(i+1));
 }
 return {n,t,p,cars:out,end:x};
}
const onJoint=x=>((x%JOINT)+JOINT)%JOINT<2;

// Rail-joint clack for the axles passing the joint nearest the middle of the screen.
export function updateStationFreight(tr,clock){
 if(G.state!=='play'||tr.aboard||G.camX+W<WEST||G.camX>EAST||clock<1)return;
 const now=layout(clock),before=layout(clock-1);if(now.n!==before.n)return;
 const ear=Math.round(Math.min(EAST,Math.max(WEST,G.camX+W/2))/JOINT)*JOINT;
 // Each axle strikes it in turn: ta-tak for a wagon bogie, ta-ta-tak for the engine's.
 let hits=0;
 for(const [i,[car,x]]of now.cars.entries())for(const w of CARS[car][2]){const a=x+w/2;if(a<=ear&&before.cars[i][1]+w/2>ear)hits++;}
 if(hits&&now.cars[0][1]<G.camX+W&&now.end>G.camX)G.audio?.trainSfx?.('roll',.22);
}

let layer=null,mask=null;
function canvas(c,w,h){c=c||document.createElement('canvas');if(c.width!==w||c.height!==h){c.width=w;c.height=h;}return c;}
function glow(ctx,x,y,r,rgb,a){const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(1,`rgba(${rgb},0)`);ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);}

// Far track: between the opaque plates and their cut-out fronts (drawTrainScene).
export function drawStationFreight(ctx,tr,clock,camX,drawFront){
 const im=ASSETS.nr_st_freight_cars;
 if(tr.aboard||camX+W<WEST||camX>EAST||!im||typeof document==='undefined')return;
 const L=layout(clock);if(L.cars[0][1]>camX+W+4||L.end<WEST||L.end<camX-4)return;
 const {t,p}=L,top=RAIL+1-CELL/2,s=ctx.getTransform().a||1,bw=Math.ceil(W*s),bh=Math.ceil((CELL/2+4)*s);
 layer=canvas(layer,bw,bh);mask=canvas(mask,bw,bh);
 const c=layer.getContext('2d');c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='source-over';c.clearRect(0,0,bw,bh);
 c.imageSmoothingEnabled=false;c.setTransform(s,0,0,s,0,4*s);  // 4px of headroom for bobbing
 const turned=run(p,t);
 for(const [i,[car,x,bs]]of L.cars.entries()){
  const [ax,aw,ws]=CARS[car],sx=halfPx(x-camX),w=aw/2;if(sx>W||sx+w<0)continue;
  // Drops a pixel as each bogie rides over a rail joint, and lifts now and then on its springs.
  const front=onJoint(bs[0]),back=onJoint(bs[bs.length-1]);
  const sway=Math.sin(t*.13+i*2.1)+Math.sin(t*.051+i*1.3)>1.3?-.5:0;
  c.save();c.translate(sx,sway+(front||back?.5:0));
  c.drawImage(im,ax,0,aw,CELL,0,0,w,CELL/2);
  // Wheels turning: a pair of bright spots on the tyre's lower half.
  const r=RADIUS[car],a0=-turned/r;
  for(const wx of ws){
   const cx=wx/2,cy=CELL/2-1-r;
   for(const k of [0,Math.PI]){const a=a0+k+wx;if(Math.sin(a)<-.1)continue;
    c.fillStyle='#f2e4c4';c.fillRect(halfPx(cx+Math.cos(a)*(r-.5)-.25),halfPx(cy+Math.sin(a)*(r-.5)-.25),.5,.5);}
  }
  c.restore();
 }
 // Grade the vehicles only: darker and cooler with distance, warmed as they pass each lamp.
 const m=mask.getContext('2d');m.setTransform(1,0,0,1,0,0);m.globalCompositeOperation='copy';m.drawImage(layer,0,0);
 c.setTransform(s,0,0,s,0,4*s);
 c.globalCompositeOperation='multiply';const shade=c.createLinearGradient(0,0,0,CELL/2);shade.addColorStop(0,'#aeb0cc');shade.addColorStop(.7,'#8a8cae');shade.addColorStop(1,'#5c5e80');c.fillStyle=shade;c.fillRect(0,-4,W,CELL/2+4);
 c.globalCompositeOperation='screen';
 for(const [lx,ly,r,a]of LAMPS){
  const x=lx-camX,y=ly-top;if(x<-r||x>W+r)continue;
  const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,150,66,${a})`);g.addColorStop(.5,`rgba(240,120,50,${a*.4})`);g.addColorStop(1,'rgba(240,120,50,0)');
  c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);
 }
 c.setTransform(1,0,0,1,0,0);c.globalCompositeOperation='destination-in';c.drawImage(mask,0,0);c.globalCompositeOperation='source-over';

 ctx.save();ctx.beginPath();ctx.rect(WEST-camX,0,EAST-WEST,152);ctx.clip();
 // Diesel exhaust: puffs left where the stack was, rising and spreading on the night air.
 for(let j=23;j>=0;j--){
  const te=t-(t%2)-2*j,age=t-te;if(te<0)continue;
  const x0=EAST-run(p,te)+STACK[0],pr=hash(L.n,te,3),puff=.6+.4*Math.max(0,pull(p,te))+.2*pr;
  const x=x0-camX+age*.35+(pr-.5)*2,y=top+STACK[1]-age*.62+age*age*.005,r=2.5+age*.22,fade=1-age/48;
  glow(ctx,x,y,r,'132,124,136',.4*puff*fade*fade);
 }
 ctx.drawImage(layer,0,0,bw,bh,0,top-4,bw/s,bh/s);
 ctx.globalCompositeOperation='lighter';
 const [,lx]=L.cars[0],nose=lx-camX,flick=.88+.12*Math.sin(t*1.7)*Math.sin(t*.63+1);
 for(const [dx,y,r]of NOSE)glow(ctx,nose+dx,top+y,r,'255,214,140',.5*flick);
 ctx.save();ctx.translate(nose+4,RAIL-2);ctx.scale(1,.08);
 const beam=ctx.createRadialGradient(0,0,0,0,0,56);beam.addColorStop(0,`rgba(255,208,140,${.3*flick})`);beam.addColorStop(1,'rgba(255,208,140,0)');
 ctx.fillStyle=beam;ctx.fillRect(-56,-56,56,112);ctx.restore();
 // Sparks where a tyre strikes a joint, now and then, more often as the engine eases off.
 for(const [i,[car,x,bs]]of L.cars.entries())for(const b of bs){
  const d=((b%JOINT)+JOINT)%JOINT;if(d>=3)continue;
  const joint=Math.round((b-d)/JOINT);if(hash(L.n,i*31+joint,7)>.1+.12*Math.max(0,-pull(p,t)))continue;
  for(let q=0;q<4;q++){const u=hash(i,joint,q+11),sx=b-camX+d*1.5+u*4,sy=RAIL-.5-u*2.5*(3-d)/3;ctx.fillStyle=`rgba(255,${170+Math.round(u*70)},90,${.9-d*.25})`;ctx.fillRect(halfPx(sx),halfPx(sy),.5,.5);}
 }
 // Flashing tail lamp on the brake van.
 const [,vx]=L.cars[L.cars.length-1];if(Math.floor(t/24)%2===0)glow(ctx,vx-camX+TAIL[0],top+TAIL[1],7,'255,40,28',.7);
 ctx.restore();
 drawFront();
}
