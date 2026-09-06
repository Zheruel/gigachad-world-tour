import { clamp } from './engine.js';
import { audio } from './audio.js';
import { drawJet, drawDepartureJet, drawAirportEnvironment, drawWaitingOfficial, imageAt, ease, JET } from './airport.js';

export const FLIGHT_FILES = {
 scenic_vista:'assets/travel/airport/scenic_vista.png',scenic_mountains:'assets/travel/airport/scenic_mountains.png',scenic_vista_near:'assets/travel/airport/scenic_vista_near.png',
 approach_vista:'assets/travel/india/approach_vista.png',approach_vista_near:'assets/travel/india/approach_vista_near.png',
 jet_rear:'assets/travel/airport/jet_rear.png',cloud_sunset:'assets/travel/airport/cloud_sunset.png',cloud_dust:'assets/travel/airport/cloud_dust.png',
};
export const FLIGHT_PHASES=['takeoff','flight','india-approach','landing'];
export function updateFlight(tr) {
 const speed=tr.phase==='takeoff'?.25+.75*ease(tr.t/220):tr.phase==='landing'?1-.8*ease((tr.t-150)/130):.65;
 audio.jetEngine(speed);
 if(tr.phase==='landing'&&tr.t===150){audio.roomSfx('land',.7);tr.airport.events.push({phase:'landing',t:150,name:'touchdown'});}
}
export function landingAt(t) {
 const close=ease((t-210)/80),scale=.66+.34*close,age=Math.max(0,t-150);
 const settle=t>=150?Math.sin(age*.22)*Math.exp(-age*.09)*1.2:0;
 return {scale,tx:-(110+370*close)*scale,ty:270*(1-scale),
  x:JET.x-280*(1-ease(t/240)),y:JET.y-95*(1-ease(t/150))+settle,
  gear:ease((t-12)/78),angle:-.055*(1-ease((t-110)/68))};
}
function clouds(ctx,tr,art,india,front) {
 if(tr.streetLayers?.effects===false)return;
 const key=india?'cloud_dust':'cloud_sunset',im=art[key];if(!im)return;
 const width=front?330:180,height=width*im.height/im.width;
 const x=(front?540:380)-tr.t*(front?2.2:.42),y=front?211:51;
 imageAt(ctx,art,key,x,y,width,height);
}
function vista(ctx,tr,art) {
 const india=tr.phase==='india-approach',key=india?'approach_vista':'scenic_vista',p=tr.t/(india?300:360);
 ctx.fillStyle=india?'#9a663c':'#683657';ctx.fillRect(0,0,480,270);
 if(tr.streetLayers?.architecture!==false){
  imageAt(ctx,art,key,-18-p*12,-20-p*7,540,304);
  if(!india)imageAt(ctx,art,'scenic_mountains',-18-p*19,-20-p*5,540,304);
  // Opaque, cut-out terrain overlaps the matching source at frame zero. Its
  // faster motion reads as depth; there are no translucent city rectangles.
  imageAt(ctx,art,key+'_near',-18-p*30,-20-p*2,540,304);
 }
 clouds(ctx,tr,art,india,false);
 const jet=art.jet_rear;
 const x=156+p*12,y=104+(india?p*17:-p*5)+Math.sin(tr.t*.023)*1.2,w=218;
 ctx.save();ctx.translate(x+w/2,y+40);ctx.rotate(Math.sin(tr.t*.009)*.017);ctx.translate(-w/2,-40);
 if(jet)imageAt(ctx,art,'jet_rear',0,0,w,w*jet.height/jet.width);
 else drawJet(ctx,art,{x:0,y:0,w:218,h:69,gear:0});
 if(tr.streetLayers?.effects!==false){ctx.fillStyle=tr.t%72<7?'#ffe6bf':'#663934';ctx.fillRect(211,70,2,1);}
 ctx.restore();clouds(ctx,tr,art,india,true);
}
export function drawFlight(ctx,tr,art,{label}) {
 if(['flight','india-approach'].includes(tr.phase))vista(ctx,tr,art);
 else if(tr.phase==='landing') {
  const a=landingAt(tr.t);
  ctx.save();ctx.translate(a.tx,a.ty);ctx.scale(a.scale,a.scale);
  // Keep the entire skyline in view while dollying toward the parked aircraft.
  ctx.save();ctx.translate(0,-a.ty/a.scale);ctx.scale(1,1/a.scale);
  drawAirportEnvironment(ctx,tr,art,true);ctx.restore();
  drawDepartureJet(ctx,art,{...JET,x:a.x,y:a.y,gear:a.gear,angle:a.angle,open:0});
  if(tr.t>=150&&tr.t<212&&tr.streetLayers?.effects!==false){
   const age=tr.t-150;ctx.fillStyle='#b8aa95';ctx.globalAlpha=(212-tr.t)/90;
   for(let i=0;i<20;i++)ctx.fillRect(Math.round(a.x+(i%2?264:327)-age*(.6+i%3*.25)-i*2),Math.round(220-age*.12-(i%4)*2),3+i%4,2+i%2);ctx.globalAlpha=1;
  }
  drawWaitingOfficial(ctx,tr,art);
  ctx.restore();
 } else {
  const t=tr.t,p=clamp(t/270,0,1),scroll=t*t*.004;
  ctx.fillStyle='#402842';ctx.fillRect(0,0,480,270);
  if(tr.streetLayers?.architecture!==false)imageAt(ctx,art,'private_apron',-scroll*.15,-22,960,270);
  for(let i=0;i<3;i++)imageAt(ctx,art,'private_apron_ground',i*960-scroll%960,0,960,270);
  const lift=ease((t-98)/172);
  drawDepartureJet(ctx,art,{x:8+p*p*145,y:70-lift*170,w:473,h:164,gear:1-ease((t-138)/75),open:0,angle:-.095*ease((t-80)/75)});
  if(tr.streetLayers?.effects!==false){ctx.fillStyle='#efc171';for(let i=0;i<10;i++)ctx.fillRect(Math.round((i*84-scroll*2)%840),236,16,1);}
 }
 label(ctx,tr.phase==='india-approach'||tr.phase==='landing'?'INDIA':'PRIVATE FLIGHT',tr.phase==='takeoff'?'CLEARED FOR TAKEOFF':tr.phase==='flight'?'ABOVE THE CITY':tr.phase==='india-approach'?'DELHI APPROACH':'DELHI / TOUCHDOWN');
}
