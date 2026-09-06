// Delhi arrival: one connected train, one camera, one deterministic completion.
import {G,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
export const FINALE_TICKS=1260;
export const FINALE_APPROACH_TICKS=180;
export const FINALE_VOICES=[{tick:8,name:'duke_getting_off',duration:1950},{tick:424,name:'duke_rest_pieces',duration:1850}].map(c=>({...c,tick:c.tick+180}));
// Locations are coach-local; damage belongs to the same registered regions as its blast.
const majorSpecs=[
 [552,'left',578,193,[5,6]],[600,'right',65,155,[0]],
 [654,'left',480,180,[3,4]],[714,'right',150,178,[1]],
 [780,'left',810,135,[7]],[846,'right',90,130,[2,3]],
 [918,'left',600,160,[0,1,2]],[990,'right',125,155,[4,5,6,7]],
];
export const FINALE_BLASTS=majorSpecs.map(([tick,carriage,x,y,damageRegions],i)=>({
 tick:tick+180,carriage,x,y,damageRegions,family:'fireball',width:i===0?280:112+i%3*18,
 sound:i===6?'train_blast':i%2?'slam':'heavy',volume:.55+i*.035,major:true,
}));
export const FINALE_SECONDARIES=Array.from({length:20},(_,i)=>({
 tick:720+i*25,carriage:i%3===1?'right':'left',
 x:i%3===1?35+(i*29)%125:480+(i*61)%370,y:[128,180,213][i%3],
 width:36+(i%4)*8,family:i%3===0?'flash':i%3===1?'sparks':'smoke',
 sound:i%2?'entrance_crack':'entrance_boot',volume:.12+(i%3)*.035,damageRegions:[],major:false,
}));
export const FINALE_EXPLOSIONS=[...FINALE_BLASTS,...FINALE_SECONDARIES].sort((a,b)=>a.tick-b.tick);
export const FINALE_CUES=[
 {tick:2,sound:'train_brake',volume:.32},
 {tick:207,sound:'charge_arm',volume:.45},{tick:275,sound:'entrance_boot',volume:.45},{tick:285,sound:'jump',volume:.5},
 {tick:330,sound:'land',volume:.55},{tick:344,sound:'phurt',volume:.2},{tick:373,sound:'entrance_boot',volume:.2},
 {tick:415,sound:'entrance_boot',volume:.25},{tick:535,sound:'remote_click',volume:.45},
 {tick:590,sound:'remote_click',volume:.15},
].map(c=>({...c,tick:c.tick+180})).concat([{tick:1,sound:'train_approach',volume:.28}],FINALE_EXPLOSIONS.map(({tick,sound,volume})=>({tick,sound,volume}))).sort((a,b)=>a.tick-b.tick);
function damageAt(t,carriage){
 return Array.from({length:8},(_,region)=>{
  const hit=FINALE_BLASTS.find(c=>c.carriage===carriage&&c.damageRegions.includes(region));
  const age=t-hit.tick;
  return age<10?0:age<24?1:age<40?2:age<60?3:age<80?4:5;
 });
}
const smooth=p=>p*p*(3-2*p);
const carAt=t=>{
 if(t<180)return -1600+Math.max(0,t)*10/3;
 const q=clamp((t-180)/360,0,1);return -1000+600*(2*q-q*q);
};
const cameraAt=t=>{
 if(t<180)return -1150+Math.max(0,t)*10/3;
 const p=clamp((t-180)/270,0,1);return -550+900*p-150*p*p-200*p*p*p;
};
export function finaleState(t){
 const timelineT=clamp(t,0,FINALE_TICKS),carX=carAt(timelineT),cameraX=cameraAt(timelineT);
 t=Math.max(0,timelineT-180);
 let heroX=carX+625,heroY=114,pose=0,actorSheet='charge',phase=timelineT<180?'approach':'reaction';
 if(t<150){pose=0;}
 else if(t<270){phase='plant';const a=t-150;pose=a<20?2:a<45?3:a<85?4:5;}
 else if(t<285){phase='run';actorSheet='roll';heroX=carX+625+55*(t-270)/15;pose=Math.floor(t/5)%2;}
 else if(t<330){phase='jump';actorSheet='roll';const p=(t-285)/45,launch=carAt(465)+680;heroX=launch+(410-launch)*p;heroY=114-90*p+221*p*p;pose=p<.15?3:p<.65?4:5;}
 else if(t<405){phase='roll';actorSheet='roll';const a=t-330;heroX=410+38*smooth(clamp(a/65,0,1));heroY=245;pose=a<4?6:a<10?7:a<20?8:a<32?9:a<45?10:a<59?11:12;}
 else if(t<420){phase='rise';actorSheet='roll';heroX=448;heroY=245;pose=13;}
 else if(t<540){phase='remote';heroX=448;heroY=245;pose=t<435?7:t<535?8:9;}
 else if(t<630){phase='light';actorSheet='cigar';heroX=448;heroY=245;pose=Math.min(5,Math.floor((t-540)/15));}
 else if(t<990){phase='cigar-walk';actorSheet='cigar';heroX=448+92*(t-630)/360;heroY=245;pose=6+Math.floor((heroX-448)/5)%4;}
 else{phase='cigar-hold';actorSheet='cigar';heroX=540;heroY=245;pose=t<1020?10:11;}
 const damage={left:damageAt(timelineT,'left'),right:damageAt(timelineT,'right')};
 return {t:timelineT,actionT:t,cameraX,phase,carX,passengerX:carX+858,couplerX:carX+866,carState:Math.max(...damage.left),damage,
  heroX,heroY,pose,actorSheet,chargePlaced:t>=195,chargeState:t<195?'held':t<207?'planted':'armed',
  cigarLit:t>=596,detonated:t>=535,fade:0,complete:timelineT>=FINALE_TICKS};
}
export function updateFinale(c){
 for(const cue of FINALE_VOICES)if(c.t===cue.tick)G.audio.voice?.(cue.name,cue.duration,true);
 for(const cue of FINALE_CUES)if(c.t===cue.tick){
  if(!G.audio.roomSfx?.(cue.sound,cue.volume))G.audio.sfx(cue.sound);
  if(cue.tick===510||FINALE_BLASTS.some(b=>b.tick===cue.tick))G.shake=cue.tick===510?2:3;
 }
 if(c.t===FINALE_TICKS){G.audio.stopRoomAudio?.();G.audio.stopSamples?.();}
 return c.t>=FINALE_TICKS;
}
function cell(ctx,key,pose,x,y,w,h,cw,ch){const im=ASSETS[key];if(!im)return false;ctx.drawImage(im,pose*cw,0,cw,ch,Math.round(x-w/2),Math.round(y-h+3.5),w,h);return true;}
function gear(ctx,x,t){
 const im=ASSETS.nr_finale_bogie;if(!im)return;
 for(const bx of [110,670]){
  ctx.drawImage(im,Math.round(x+bx),207,134,32);
  // Small hub glints rotate with actual displacement, leaving the authored tyres intact.
  if(t<540)for(const wx of [29,105]){const a=carAt(t)/6;ctx.strokeStyle='#968373';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x+bx+wx-4*Math.cos(a),227-4*Math.sin(a));ctx.lineTo(x+bx+wx+4*Math.cos(a),227+4*Math.sin(a));ctx.stroke();}
 }
}
// Adjacent masks share their exact jagged boundary: no uncovered seam or double-drawn edge.
function regionPath(ctx,x,region){
 const boundary=(i,y)=>i===0?0:i===8?1024:i*128+[0,13,-9,17,-12,5,-15,8,0,11,-7,0,0][Math.floor(y/20)%13];
 ctx.beginPath();
 for(let y=0;y<=240;y+=20){const px=x+boundary(region,y)*880/1024,py=62+y*880/1024;if(y===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
 for(let y=240;y>=0;y-=20)ctx.lineTo(x+boundary(region+1,y)*880/1024,62+y*880/1024);
 ctx.closePath();ctx.clip();
}
function carriage(ctx,im,x,t,r,damage){
 if(r.finaleGear!==false)gear(ctx,x,t);
 if(!im)return;
 const bodyOnly=ASSETS.nr_finale_bogie&&r.finaleGear!==false;
 for(let region=0;region<8;region++){
  ctx.save();regionPath(ctx,Math.round(x),region);
  ctx.drawImage(im,damage[region]*1024,0,1024,bodyOnly?190:224,Math.round(x),62,880,bodyOnly?163.28:192.5);
  ctx.restore();
 }
}
function drawEnvironment(ctx,layer,cameraX){
 const wide=ASSETS['nr_finale_approach_'+layer],im=ASSETS['nr_finale_'+layer];
 if(wide)ctx.drawImage(wide,-1200-cameraX,-67.5,1800,337.5);
 else if(im){
  // Missing extension keeps readable scenery without preventing arrival.
  const start=Math.floor(cameraX/600)*600;
  for(let x=start;x<cameraX+600;x+=600)ctx.drawImage(im,x-cameraX,-67.5,600,337.5);
 }
}
export function drawFinale(ctx,t){
 const s=finaleState(t),a=s.actionT,r=G.train?.review||{},env=r.finaleEnvironment!==false,car=r.finaleCar!==false,actor=r.finaleActor!==false,fx=r.fx!==false;
 ctx.fillStyle='#15111b';ctx.fillRect(0,0,480,270);ctx.save();ctx.translate(0,54);ctx.scale(.8,.8);
 if(env)for(const layer of ['sky','station','track']){
  drawEnvironment(ctx,layer,s.cameraX);
  if(layer==='sky'&&s.cameraX<0&&ASSETS.nr_finale_approach_clouds){
   ctx.save();ctx.globalAlpha=.16*clamp(-s.cameraX/280,0,1);
   ctx.drawImage(ASSETS.nr_finale_approach_clouds,-750-s.cameraX*.35,-210,1200,400);ctx.restore();
  }
 }
 ctx.save();ctx.translate(-s.cameraX,0);
 if(car){
  carriage(ctx,ASSETS.nr_finale_passenger_damage||ASSETS.nr_train_exterior,s.passengerX,t,r,r.finaleRightDamage===false||!ASSETS.nr_finale_passenger_damage?Array(8).fill(0):s.damage.right);
  carriage(ctx,ASSETS.nr_finale_car,s.carX,t,r,r.finaleLeftDamage===false?Array(8).fill(0):s.damage.left);
  if(r.finaleCoupling!==false&&ASSETS.nr_finale_coupling)ctx.drawImage(ASSETS.nr_finale_coupling,Math.round(s.couplerX-17),218,34,12);

 }
 if(G.train?.knockoutBody&&a<580){const f=getFrame(SPR.nr_vikram_roof,'down',0,-1);blit(ctx,f,Math.round(s.carX+570-frameW(f)/2),Math.round(121-frameH(f)+4));}
 if(env){ctx.save();ctx.translate(s.cameraX,0);drawEnvironment(ctx,'platform',s.cameraX);ctx.restore();}
 if(fx){
  if(t>180&&t<540)for(const base of [s.carX+778,s.passengerX+139])for(let i=0;i<8;i++){const age=(t+i*5)%43;if(age>=24)continue;ctx.fillStyle=age<8?'#ffdd85':'#b85629';ctx.fillRect(Math.round(base-age*(1-a/360)),Math.round(238-age*.25+age*age*.012),2,1);}
  for(const cue of FINALE_EXPLOSIONS){
   const age=t-cue.tick,base=cue.carriage==='left'?s.carX:s.passengerX,x=base+cue.x;
   const life=cue.major?150:70;
   if(age>=0&&age<life){
    const frame=cue.family==='smoke'?Math.min(7,5+Math.floor(age/24)):Math.min(7,Math.floor(age/life*8));
    const smokePhase=cue.family==='smoke'||frame>=5;
    const drift=cue.family==='smoke'?age:Math.max(0,age-life*5/8);
    ctx.save();
    if(smokePhase)ctx.globalAlpha=Math.max(0,1-drift/(cue.family==='smoke'?life:life*3/8));
    cell(ctx,'nr_explosion',frame,x+(smokePhase?drift*.12:0),cue.y-(smokePhase?drift*.3:0),cue.width,cue.width*.82,320,256);
    ctx.restore();
   }
   if(age>=0&&age<68)for(let i=0;i<(cue.major?5:2);i++){ctx.fillStyle=i%2?'#553d2c':'#c18d48';ctx.fillRect(Math.round(x+age*(i-2)*.45),Math.round(cue.y-25-age*(1.2+i*.12)+age*age*.03),3,2);}
  }
  // Small persistent pockets of fire survive after the cascade; actor is always in front.
  if(a>=700)for(const [side,xs]of [['left',[490,585,710,820]],['right',[55,120]]])for(const [i,x]of xs.entries()){
   const base=side==='left'?s.carX:s.passengerX;
   cell(ctx,'nr_explosion',3+Math.floor((a+i*13)/14)%3,base+x,203,34,40,320,256);
  }
 }
 const actorPose=s.actorSheet==='cigar'&&r.finaleCigar===false?(s.phase==='cigar-walk'?16+(s.pose-6)%4:15):s.pose;
 if(actor&&!cell(ctx,s.actorSheet==='charge'?'nr_finale_charge':s.actorSheet==='cigar'&&r.finaleCigar!==false?'nr_finale_cigar':'nr_finale_roll',actorPose,s.heroX,s.heroY,160,120,320,240)){
  const f=getFrame(SPR.player,s.phase==='jump'?'jump':'idle',0,1);blit(ctx,f,Math.round(s.heroX-frameW(f)/2),Math.round(s.heroY-frameH(f)+4));
 }
 if(car){
  if(r.finaleDynamite!==false&&s.chargePlaced&&a>=235&&a<552){
   const prop=ASSETS.nr_finale_dynamite;
   if(prop)ctx.drawImage(prop,(s.chargeState==='armed'?2:1)*96,0,96,64,Math.round(s.carX+627.5),96.75,28,18.7);
  }
 }
 if(actor&&r.finaleCigar!==false&&s.cigarLit&&fx){
  const tips=[[179,87],[179,87],[179,87],[179,87],[185,87],[186,87],[185,85],[186,88],[187,90],[187,91],[179,89],[187,88]];
  const tip=tips[s.pose]||tips[11],x=s.heroX+(tip[0]-160)*.5,y=s.heroY-116.5+tip[1]*.5;
  ctx.fillStyle=a%24<9?'#ffc878':'#c45b2c';ctx.fillRect(Math.round(x),Math.round(y),1.5,1);
  const smoke=ASSETS.nr_finale_smoke,age=(a-596)%84;
  if(smoke&&age<72){ctx.save();ctx.globalAlpha=.4*(1-Math.max(0,age-42)/30);ctx.drawImage(smoke,Math.min(5,Math.floor(age/12))*64,0,64,96,Math.round(x-9),Math.round(y-27),18,28);ctx.restore();}
 }
 if(fx&&a>=330&&a<370){const a=(s.actionT-330)/40;ctx.fillStyle=`rgba(181,146,100,${(1-a)*.4})`;for(let i=0;i<10;i++)ctx.fillRect(Math.round(410+(i-5)*(2+a*3)),Math.round(245-Math.sin(a*Math.PI)*(i%3)),2,1);}
 ctx.restore();ctx.restore();
}
