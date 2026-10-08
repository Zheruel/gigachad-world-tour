// Train-only background performances and fixture light. No combat RNG or physics.
import { G, W, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { maskBackdropActor } from './defeat_fx.js';

const TRAIN_LAMPS=[[1118,69,23],[1990,97,18],[2189,97,18],[3177,60,12],[3982,121,15],[4250,122,15],[5519,30,16],[7339,129,13],[7992,79,16]];
// Hanging fixtures sway from their hooks: [worldX, hookY, fixture (0 strap, 1 lamp, 2 bag, 3 towel)].
export const TRAIN_FIXTURES=[[3060,66,3],[3350,66,2],[3640,66,3],[3990,88,3],[4440,88,2],[4930,88,3],[5180,88,2],[6390,70,2],[6940,70,3],[7430,24,1],[7890,24,1]];
// Seated passengers (passengers_life rows): [worldX, row, footY]; they stay planted on the seat.
export const LIFE_PASSENGERS=[[3500,1,189],[3700,0,189],[4020,2,190],[4640,3,190],[4970,1,190],[6880,3,189]];
export const TRAIN_LIFE_ACTORS=[
 {x:1338,y:199,period:720,offset:130},
 {x:2280,y:198,period:840,offset:270},
 {x:6625,y:195,period:900,offset:75},
];
export function initTrainLife(tr){tr.stationLife=TRAIN_LIFE_ACTORS.map(()=>({alert:-1,ready:0}));}
export function trainLifePose(tr,row){
 const clock=(tr.t+TRAIN_LIFE_ACTORS[row].offset)%TRAIN_LIFE_ACTORS[row].period;
 if(tr.stationLife?.[row]?.alert>=0)return 3;
 if(row===1&&tr.arrival>=0&&tr.arrival<240)return tr.arrival<75?1:tr.arrival<170?2:0;
 if(row===2)return clock<500?0:clock<565?1:clock<710?2:0;
 return clock<300?0:clock<380?1:clock<500?0:clock<585?2:0;
}
// Lively routines over st_worker / st_guard / st_reader (200px display cells, feet at y 194):
// [frame, ticks]. Worker: 0-1 breathe, 2 hands on hips, 3 reads the board, 4-7 pocket watch,
// 8 yawn, 9 stretch, 10 scratches neck, 11 wipes brow, 12-14 startled (flinch, recoil, wary).
// Guard: 0-1 breathe, 2-3 lantern swing, 4-5 looks down the track, 6 wristwatch, 7 cap, 8-10
// whistle, 11 neck, 12-13 startled, 14-17 swings the lantern overhead to wave the train in.
// Sheets are graded into their plates at build time (tools/production/backdrop_tone.py).
const WORKER_ROUTINE=[[0,40],[1,40],[0,40],[1,40],[3,70],[0,30],[1,40],[4,14],[5,60],[6,30],[5,30],[7,16],[0,40],[1,40],[0,40],[2,120],[0,30],[1,40],[8,50],[9,60],[0,30],[1,40],[10,50],[0,40],[11,60],[0,30]];
const GUARD_ROUTINE=[[0,40],[1,40],[0,20],[2,14],[0,10],[3,14],[0,20],[1,40],[0,40],[4,90],[0,30],[1,40],[5,80],[0,30],[6,60],[0,30],[1,40],[7,40],[0,40],[1,40],[11,60],[0,30],[8,20],[9,40],[10,16],[0,40],[1,40]];
const GUARD_LANTERN=[[-17,-18],[-16,-21],[-13,-23],[-21,-20],[-18,-18],[14,-61],[-17,-19],[-17,-19],[-16,-21],[-17,-19],[-17,-18],[-17,-18],[-17,-44],[-20,-40],[20,-49],[13,-70],[5,-76],[20,-47]];
const LEGACY_LANTERN=[[-16,-24],[-4,-41],[-16,-30],[8,-45]];
const GUARD_WAVE=[14,15,16,15,14,17];
const ROUTINE_TICKS=r=>r.reduce((n,[,d])=>n+d,0);
function routineFrame(r,t){let c=t%ROUTINE_TICKS(r);for(const [f,d]of r){if(c<d)return f;c-=d;}return 0;}
// Reader (st_reader): 0-1 breathe, 2 reads across, 3-5 lowers the paper to his lap and lifts it
// again, 6 snaps it straight, 7 tilts his head; 8-11 startled, clutches the paper, hides behind it, peeks.
const READER_ROUTINE=[[0,50],[1,45],[0,50],[1,45],[2,70],[0,40],[1,45],[7,70],[0,40],[3,10],[4,90],[5,10],[6,14],[0,40],[1,45]];
export function trainLifeFrame(tr,row){
 const alert=tr.stationLife?.[row]?.alert??-1;
 if(row===2)return alert>=0?(alert<10?8:alert<40?9:alert<85?10:11):routineFrame(READER_ROUTINE,tr.t+TRAIN_LIFE_ACTORS[2].offset);
 if(alert>=0)return alert<8?12:row===0&&alert>=72?14:13;
 if(row===1&&tr.arrival>=0&&tr.arrival<240)return tr.arrival<75?5:tr.arrival<170?GUARD_WAVE[Math.floor((tr.arrival-75)/8)%GUARD_WAVE.length]:0;
 return routineFrame(row?GUARD_ROUTINE:WORKER_ROUTINE,tr.t+TRAIN_LIFE_ACTORS[row].offset);
}
function roomCue(name,x,volume){
 const dx=x-(G.camX+W/2),amount=clamp(1-Math.abs(dx)/300,0,1);
 if(amount===0)return;
 if(G.audio.roomSfxAt)G.audio.roomSfxAt(name,volume*amount,clamp(dx/(W/2),-1,1));
 else G.audio.roomSfx?.(name,volume*amount);
}
const threatNear=(x,r)=>G.enemies.some(e=>!e.dead&&Math.abs(e.x-x)<r&&['windup','attack','charge','drop','hurt','stagger'].includes(e.state));
const foesNear=(x,r)=>G.enemies.some(e=>!e.dead&&Math.abs(e.x-x)<r);
// Passengers flinch and cower while a fight is near, then cheer once it is over.
function updatePassengers(tr){
 const st=tr.lifePassengers||=LIFE_PASSENGERS.map(()=>({fear:0,cheer:0,fought:false}));
 for(const [i,[x]]of LIFE_PASSENGERS.entries()){
  const s=st[i];
  if(threatNear(x,200)){s.fear=Math.min(s.fear+1,400);s.fought=true;s.cheer=0;}
  else if(s.fear>0&&!foesNear(x,260))s.fear=0;  // stays down until the fight moves off
  if(s.fought&&!foesNear(x,320)){s.cheer=130;s.fought=false;}
  if(s.cheer>0)s.cheer--;
 }
}
export function updateTrainLife(tr){
 if(G.state!=='play'||tr.cinematic||tr.endingDone)return;
 if(!tr.stationLife)initTrainLife(tr);
 if(tr.aboard)updatePassengers(tr);
 for(const [row,a]of TRAIN_LIFE_ACTORS.entries()){
  const state=tr.stationLife[row];
  if(state.alert>=0){if(++state.alert>=104)state.alert=-1;}
  else if(tr.t>=state.ready&&G.enemies.some(e=>!e.dead&&Math.abs(e.x-a.x)<160&&['windup','attack','charge'].includes(e.state))){state.alert=0;state.ready=tr.t+540;}
  if(state.alert>=0)continue;
  const phase=(tr.t+a.offset)%a.period;
  if(row===2&&(tr.t+a.offset)%ROUTINE_TICKS(READER_ROUTINE)===565)roomCue('room_page',a.x,.065);  // snaps the paper straight (frame 6)
  if(row===1&&phase===300&&tr.arrival<0)roomCue('room_glass',a.x,.035);
 }
}
// Contact shade for a seated passenger (feet at footY): the body presses into the cushion and
// blocks lamplight from the upper left, and the feet rest on the floor.
export function seatShadow(ctx,x,footY){
 const hip=footY-21;ctx.save();
 let g=ctx.createRadialGradient(x+3,hip,2,x+3,hip,26);g.addColorStop(0,'rgba(6,4,8,.42)');g.addColorStop(1,'rgba(6,4,8,0)');
 ctx.fillStyle=g;ctx.setTransform(ctx.getTransform().translate(x+3,hip).scale(1,.45).translate(-x-3,-hip));ctx.fillRect(x-23,hip-26,52,52);ctx.restore();ctx.save();
 g=ctx.createRadialGradient(x+2,footY,1,x+2,footY,16);g.addColorStop(0,'rgba(4,3,6,.5)');g.addColorStop(1,'rgba(4,3,6,0)');
 ctx.fillStyle=g;ctx.setTransform(ctx.getTransform().translate(x+2,footY).scale(1,.22).translate(-x-2,-footY));ctx.fillRect(x-14,footY-16,32,32);ctx.restore();
}
function glow(ctx,x,y,r,alpha,tint='222,154,66'){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${tint},${alpha})`);g.addColorStop(1,`rgba(${tint},0)`);
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
export function drawTrainLife(ctx,tr,camX){
 if(G.state!=='play'||tr.cinematic||tr.endingDone)return;
 if(tr.review?.fx!==false&&tr.review?.interior!==false){
  // Light stays registered to the existing lamps; the scenery and camera never sway.
  for(const [i,[worldX,y,r]]of TRAIN_LAMPS.entries()){
   const x=worldX-camX;if(x<-r||x>W+r)continue;
   glow(ctx,x,y,r,.025+.011*Math.sin(tr.t*.041+i*2.3)+.006*Math.sin(tr.t*.107+i));
  }
  // Small moths orbit the station lamps, never the fighting lane.
  if(!tr.aboard)for(const [i,worldX]of [1118,1990,2189].entries()){
   const x=worldX-camX;if(x<5||x>W-5)continue;
   for(let j=0;j<2;j++){
    const t=tr.t*.031+j*2.7+i*.9,y=i===0?69:97;
    ctx.fillStyle=j?'#e2be7655':'#dec99b99';ctx.fillRect(Math.round(x+Math.sin(t)*9),Math.round(y+Math.sin(t*1.7)*6),1,1);
   }
  }
 }
 if(tr.review?.interior!==false&&tr.aboard)drawFixtures(ctx,tr,camX);
 if(tr.review?.npc!==false&&tr.review?.interior!==false&&tr.aboard)drawPeople(ctx,tr,camX);
 if(tr.review?.npc===false||tr.review?.interior===false)return;
 const legacy=ASSETS.nr_station_life;
 for(const [row,a]of TRAIN_LIFE_ACTORS.entries()){
  const x=a.x-camX;if(x<-50||x>W+50)continue;
  const sheet=ASSETS[['nr_st_worker','nr_st_guard','nr_st_reader'][row]];
  const frame=sheet?trainLifeFrame(tr,row):trainLifePose(tr,row);
  if(!sheet&&!legacy)continue;
  if(sheet)ctx.drawImage(sheet,frame*200,0,200,200,Math.round(x-50),a.y-97.5,100,100);
  else{ctx.save();ctx.filter=row===2?'brightness(.80)':'brightness(.72)';ctx.drawImage(legacy,frame*200,row*200,200,200,Math.round(x-50),a.y-97.5,100,100);ctx.restore();}
  if(row===1&&tr.review?.fx!==false){
   const lantern=(sheet?GUARD_LANTERN:LEGACY_LANTERN)[frame];
   glow(ctx,x+lantern[0],a.y+lantern[1],8,.052+.012*Math.sin(tr.t*.13));
  }
 }
}
// Calm idle loops [frame, ticks] over 8-pose seated sheets (0 rest, 1 breath, gestures eased in and
// out): passengers_idle rows (0 reader, 1 youth, 2 tiffin, 3 vest) and the two seated regulars.
// Sheets are graded into the coach light at build time (tools/production/build_train_life.py).
const SEAT_IDLE={
 0:[[0,50],[1,45],[0,50],[1,45],[7,60],[0,40],[1,45],[2,70],[3,14],[4,20],[0,40],[1,45],[5,50],[0,40],[6,80],[7,20],[0,30],[1,45]],
 1:[[0,50],[1,45],[2,18],[3,18],[2,18],[3,18],[0,40],[1,45],[4,20],[5,110],[4,16],[6,70],[0,40],[1,45],[7,60],[0,40],[1,45]],
 2:[[0,50],[1,45],[0,50],[1,45],[2,40],[3,12],[0,40],[4,50],[0,30],[1,45],[5,90],[0,30],[6,60],[1,45],[7,50],[0,40]],
 3:[[0,50],[1,45],[0,50],[1,45],[2,14],[3,10],[4,10],[3,10],[4,10],[3,10],[4,10],[2,14],[0,40],[1,45],[5,60],[0,40],[6,50],[7,120],[0,40],[1,45]],
 seated:[[0,50],[1,45],[0,50],[1,45],[2,70],[0,40],[1,45],[3,8],[4,8],[5,60],[4,8],[6,8],[0,40],[1,45],[7,60],[0,40]],
 sari:[[0,50],[1,45],[0,50],[1,45],[2,12],[3,70],[4,10],[5,40],[6,10],[3,40],[7,12],[0,40],[1,45]],
};
export function seatIdleFrame(kind,t){return routineFrame(SEAT_IDLE[kind],t);}
function drawPeople(ctx,tr,camX){
 const pim=ASSETS.nr_passengers_life,idle=ASSETS.nr_passengers_idle;
 if(pim)for(const [i,[worldX,row,y]]of LIFE_PASSENGERS.entries()){
  const x=worldX-camX;if(x<-60||x>W+60)continue;const s=tr.lifePassengers?.[i]||{};
  const col=s.fear>0?(s.fear<14?1:2):s.cheer>0?3:0;
  seatShadow(ctx,x,y);
  if(col===0&&idle)ctx.drawImage(idle,(row*8+seatIdleFrame(row,tr.t+i*137))*156,0,156,182,Math.round(x-39),y-88,78,91);
  else ctx.drawImage(pim,(row*4+col)*156,0,156,182,Math.round(x-39),y-88,78,91);
  maskBackdropActor(Math.round(x-30),y-86,60,88);
 }
}
function drawFixtures(ctx,tr,camX){
 const hang=ASSETS.nr_fixtures_hang;
 if(hang){
  const sw=hang.width/4,sh=hang.height;
  for(const [i,[worldX,y,kind]]of TRAIN_FIXTURES.entries()){
   const x=worldX-camX;if(x<-30||x>W+30)continue;
   // Carriage sway plus a kick from nearby impacts; lamps swing slower on their chains.
   const k=kind===1?.6:1,angle=k*(.07*Math.sin(tr.t*.045+i*1.9)+.03*Math.sin(tr.t*.13+i))+G.shake*.025*Math.sin(tr.t*.8+i);
   ctx.save();ctx.translate(Math.round(x),y);ctx.rotate(angle);ctx.drawImage(hang,kind*sw,0,sw,sh,-sw/4,0,sw/2,sh/2);ctx.restore();
   if(kind===1)glow(ctx,x+Math.sin(angle)*-18,y+20,26,.09+.02*Math.sin(tr.t*.2+i));
  }
 }
}
