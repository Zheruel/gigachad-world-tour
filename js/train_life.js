// Train-only background performances and fixture light. No combat RNG or physics.
import { G, W, clamp } from './engine.js';
import { ASSETS } from './assets.js';

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
function roomCue(name,x,volume){
 const dx=x-(G.camX+W/2),amount=clamp(1-Math.abs(dx)/300,0,1);
 if(amount===0)return;
 if(G.audio.roomSfxAt)G.audio.roomSfxAt(name,volume*amount,clamp(dx/(W/2),-1,1));
 else G.audio.roomSfx?.(name,volume*amount);
}
export function updateTrainLife(tr){
 if(G.state!=='play'||tr.cinematic||tr.endingDone)return;
 if(!tr.stationLife)initTrainLife(tr);
 for(const [row,a]of TRAIN_LIFE_ACTORS.entries()){
  const state=tr.stationLife[row];
  if(state.alert>=0){if(++state.alert>=104)state.alert=-1;}
  else if(tr.t>=state.ready&&G.enemies.some(e=>!e.dead&&Math.abs(e.x-a.x)<160&&['windup','attack','charge'].includes(e.state))){state.alert=0;state.ready=tr.t+540;}
  if(state.alert>=0)continue;
  const phase=(tr.t+a.offset)%a.period;
  if(row===2&&phase===500)roomCue('room_page',a.x,.065);
  if(row===1&&phase===300&&tr.arrival<0)roomCue('room_glass',a.x,.035);
 }
}
function glow(ctx,x,y,r,alpha,tint='222,154,66'){
 const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(${tint},${alpha})`);g.addColorStop(1,`rgba(${tint},0)`);
 ctx.fillStyle=g;ctx.fillRect(x-r,y-r,r*2,r*2);
}
export function drawTrainLife(ctx,tr,camX){
 if(G.state!=='play'||tr.cinematic||tr.endingDone)return;
 if(tr.review?.fx!==false&&tr.review?.interior!==false){
  // Light stays registered to the existing lamps; the scenery and camera never sway.
  const lamps=[[1118,69,23],[1990,97,18],[2189,97,18],[3177,60,12],[3982,121,15],[4250,122,15],[5519,30,16],[7339,129,13],[7992,79,16]];
  for(const [i,[worldX,y,r]]of lamps.entries()){
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
 if(tr.review?.npc===false||tr.review?.interior===false)return;
 const im=ASSETS.nr_station_life;if(!im)return;
 for(const [row,a]of TRAIN_LIFE_ACTORS.entries()){
  const x=a.x-camX;if(x<-50||x>W+50)continue;
  const pose=trainLifePose(tr,row);
  ctx.save();ctx.filter=row===2?'brightness(.80)':'brightness(.72)';
  ctx.drawImage(im,pose*200,row*200,200,200,Math.round(x-50),a.y-97.5,100,100);ctx.restore();
  if(row===1&&tr.review?.fx!==false){
   const lantern=[[-16,174],[-4,157],[-16,168],[8,153]][pose];
   glow(ctx,x+lantern[0],lantern[1],8,.052+.012*Math.sin(tr.t*.13));
  }
 }
}
