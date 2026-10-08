// Station life before the sleeper arrives: hall and platform background performers, yard crows,
// a goods train on the far track and a near foreground layer. Every sheet is baked at its
// 2x display size (tools/production/build_station_life.py), so it is blitted 1:1.
import { G, W } from './engine.js';
import { ASSETS } from './assets.js';
import { drawStationFreight as drawFreight, updateStationFreight } from './station_freight.js';

// [frame, ticks] loops.
const loop=(...steps)=>{const n=steps.reduce((s,[,d])=>s+d,0);return t=>{let c=((t%n)+n)%n;for(const [f,d]of steps){if(c<d)return f;c-=d;}return 0;};};
const ROUTINES={
 // Idle sheets (8 poses): 0 rest, 1 breath, then gestures eased in and out through in-between poses.
 // Man: 2 weight shift, 3-5 wristwatch up/look/down, 6 glance back, 7 taps the paper.
 queue_man:loop([0,50],[1,45],[0,50],[1,45],[2,90],[0,40],[1,45],[5,8],[3,10],[4,70],[3,12],[5,10],[0,50],[1,45],[0,50],[6,80],[0,40],[1,45],[7,14],[0,10],[7,14],[0,40],[1,45]),
 // Woman: 2-4 straightens the dupatta, 5 looks into her bag, 6 shifts her hip, 7 turns her head.
 queue_woman:loop([0,50],[1,45],[0,50],[1,45],[2,10],[3,60],[4,10],[0,40],[1,45],[0,45],[5,100],[0,30],[1,45],[6,90],[0,40],[1,45],[7,70],[0,40],[1,45]),
 // Family: 2-4 the mother strokes the child's hair, 5 the father looks down the platform, 6-7 scratches his head.
 family:loop([0,55],[1,50],[0,55],[1,50],[2,12],[3,40],[2,10],[3,40],[4,60],[0,40],[1,50],[5,90],[0,40],[1,50],[6,70],[7,40],[0,40],[1,50]),
 sleeper:loop([0,110],[1,110],[0,110],[3,100],[0,130],[2,80]),
 crow:loop([0,90],[1,10],[0,12],[1,10],[0,140],[3,14],[0,20],[3,14],[0,100]),
};
// [sheet, worldX, footY, clock offset, flip, contact-shadow half width]; ordered back to front.
const PERFORMERS=[
 // Queue centred on ticket windows 3 and 5, on the floor just off the counter plinth (y 203).
 ['queue_man',1602,207,0,false,12],['queue_woman',1696,207,160,false,12],
 // Platform floor meets the back wall at y 188; bench legs and pillar bases stand at 197.
 ['family',2130,199,60,false,36],['sleeper',2440,200,0,false,38],
];
// Perched crows [worldX, footY, flip]; each takes off when CHAD comes close.
const CROWS=[[388,101,true],[676,123,false],[905,123,true],[2330,152,false],[2598,152,true]];
const FANS=[1075,1292];
// Porter shuttles a trunk along the platform walkway; x from/to and the foot line.
const PORTER={a:1995,b:2860,y:203,speed:.5,stride:8};  // in front of the trolley and seated passengers
const PORTER_REST=[[6,40],[7,24],[6,8],[7,24],[6,36]];
const REST_TICKS=PORTER_REST.reduce((s,[,d])=>s+d,0);
// Foreground layer, moving FG_K times the camera: [sheet, x at camX 0, y (feet or hook)].
// Tall pieces only sweep past between the combat camera locks (295, 595, 1295, 2125).
const FG_K=1.5,FG=[['fg_pillar',1480,280],['fg_column',1830,280],['fg_column',2500,280],['fg_pillar',2900,280]];
const LANTERN_K=1.3,FG_LANTERNS=[1530,2180,2830,3420];

function put(ctx,key,frame,x,y,flip=false,hang=false){
 const im=ASSETS['nr_st_'+key];if(!im)return;
 const n=key.startsWith('fg_')?1:im.width/cellW(key),cw=im.width/n,ch=im.height;
 x=Math.round(x);const top=hang?y-1:y-ch/2+1;
 if(flip){ctx.save();ctx.translate(x,0);ctx.scale(-1,1);ctx.drawImage(im,frame*cw,0,cw,ch,-cw/4,top,cw/2,ch/2);ctx.restore();}
 else ctx.drawImage(im,frame*cw,0,cw,ch,x-cw/4,top,cw/2,ch/2);
}
const CELLS={family:168,sleeper:164,porter:114,crow:54,queue_man:88,queue_woman:88,fan:116};
const cellW=key=>CELLS[key];
function shadow(ctx,x,y,rx){
 const g=ctx.createRadialGradient(x,y,0,x,y,rx);g.addColorStop(0,'rgba(5,4,8,.45)');g.addColorStop(1,'rgba(5,4,8,0)');
 ctx.save();ctx.fillStyle=g;ctx.translate(x,y);ctx.scale(1,.18);ctx.translate(-x,-y);ctx.fillRect(x-rx,y-rx,rx*2,rx*2);ctx.restore();
}

export function stationClock(tr){return G.state==='intro'?G.rawTime-G.stateT:tr.t;}
function porterAt(t){
 const leg=(PORTER.b-PORTER.a)/PORTER.speed,cycle=2*(leg+REST_TICKS);let c=t%cycle;
 for(const dir of [1,-1]){
  if(c<leg){const d=c*PORTER.speed;return {x:dir>0?PORTER.a+d:PORTER.b-d,frame:Math.floor(d/PORTER.stride)%6,flip:dir<0};}
  c-=leg;
  if(c<REST_TICKS){let r=c;for(const [f,d]of PORTER_REST){if(r<d)return {x:dir>0?PORTER.b:PORTER.a,frame:f,flip:dir<0};r-=d;}}
  c-=REST_TICKS;
 }
 return {x:PORTER.a,frame:6,flip:false};
}
// Tick update (drawing stays pure): crows take off and later return to their perch; the goods
// train's rail-joint clack.
export function updateStationLife(tr){
 if(tr.aboard)return;
 const s=tr.stationCrows||(tr.stationCrows=CROWS.map(()=>-1));
 for(const [i,[x]]of CROWS.entries()){
  if(s[i]<0&&G.state==='play'&&Math.abs(G.player.x-x)<70)s[i]=tr.t;
  // Back once the perch has been off screen for a while.
  else if(s[i]>=0&&tr.t-s[i]>480&&(x<G.camX-40||x>G.camX+W+40))s[i]=-1;
 }
 updateStationFreight(tr,stationClock(tr));
}

// Wall plane, behind every actor: drawn from drawTrainWallPlane while on the ground.
export function drawStationLife(ctx,tr,camX){
 if(tr.aboard||camX>2880||tr.cinematic)return;
 const t=stationClock(tr);
 for(const x of FANS){if(x-camX<-40||x-camX>W+40)continue;put(ctx,'fan',Math.floor(t/3)%4,x-camX,8,false,true);}
 for(const [key,x,y,off,flip,rx]of PERFORMERS){
  if(x-camX<-100||x-camX>W+100)continue;
  let frame=ROUTINES[key](t+off);
  // The man in the queue turns to look at a fight close by.
  if(G.state==='play'&&Math.abs(G.player.x-x)<80&&key==='queue_man')frame=6;
  shadow(ctx,x-camX,y-1,rx);put(ctx,key,frame,x-camX,y,flip);
 }
 const crows=tr.stationCrows||[];
 for(const [i,[x,y,flip]]of CROWS.entries()){
  if(x-camX<-40||x-camX>W+40)continue;
  const gone=crows[i]??-1;
  if(gone<0){put(ctx,'crow',ROUTINES.crow(t+i*67),x-camX,y,flip);continue;}
  const a=tr.t-gone;if(a>90)continue;
  // Flap (wings open/closed) up and away from CHAD.
  const dir=G.player.x<x?1:-1;put(ctx,'crow',Math.floor(a/3)%2?2:0,x-camX+dir*a*1.7,y-a*1.1-a*a*.01,dir<0);
 }
 if(camX+W>PORTER.a-60&&camX<PORTER.b+60){const p=porterAt(t);shadow(ctx,p.x-camX,PORTER.y-1,15);put(ctx,'porter',p.frame,p.x-camX,PORTER.y,p.flip);}
}

// Far track: the goods train (station_freight.js), between the plates and their cut-out fronts.
export function drawStationFreight(ctx,tr,camX,drawFront){drawFreight(ctx,tr,stationClock(tr),camX,drawFront);}

// Near layer over the fight, in play only (not during cinematics or the intro).
export function drawStationForeground(ctx,tr,camX){
 if(G.state!=='play'||tr.aboard||tr.cinematic||camX>2880)return;
 for(const x0 of FG_LANTERNS){
  const x=Math.round(x0-camX*LANTERN_K);if(x<-30||x>W+30)continue;
  const f=.9+.1*Math.sin(tr.t*.07+x0)*Math.sin(tr.t*.023+x0*.3);
  const g=ctx.createRadialGradient(x,58,0,x,58,34);g.addColorStop(0,`rgba(255,170,80,${.2*f})`);g.addColorStop(1,'rgba(255,170,80,0)');
  ctx.fillStyle=g;ctx.fillRect(x-34,24,68,68);put(ctx,'fg_lantern',0,x,-10,false,true);
 }
 for(const [key,x0,y]of FG){const x=x0-camX*FG_K;if(x<-100||x>W+100)continue;put(ctx,key,0,x,y);}
}
