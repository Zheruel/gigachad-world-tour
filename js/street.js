import { W, H, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { audio } from './audio.js';
import { drawDialogue, updateDialogue } from './room_dialogue.js';
import { drawDirectionArrow } from './direction_arrow.js';

export const STREET_FILES = {
 exterior_open:'assets/travel/city/exterior_open.png',street_road:'assets/travel/city/street_road.png',drive_railing:'assets/travel/city/drive_railing.png',
 doorman:'assets/travel/city/doorman.png',fans:'assets/travel/city/fans.png',
 vip_carpet:'assets/travel/city/vip_carpet.png',vip_ropes:'assets/travel/city/vip_ropes.png',
};
export const STREET = {width:640,doorX:121,doorY:182,carX:290,carY:187,carW:200,carH:55,handleX:388,arrivalDuration:132,boardDuration:78,driveDuration:300};
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const mod=(n,m)=>(n%m+m)%m;
export function nearStreetCar(tr) {return !tr.street?.arriving && !tr.gate && tr.actor.z===0 && Math.abs(tr.x-STREET.handleX)<48 && Math.abs(tr.y-225)<24;}
export function enterStreetPhase(tr,name,previous) {
 if(name==='curb') {
  tr.street={arriving:true,clock:0,greeting:-1,events:[],boardFrom:null};
  tr.x=STREET.doorX;tr.y=STREET.doorY;tr.actor.x=tr.x;tr.actor.y=tr.y;
  audio.music('lobby');audio.streetMusic(.2);audio.travelLoop('street');
 } else if(name==='car-board') {
  tr.street ||= {clock:0,greeting:-1,events:[]};
  tr.street.arriving=false;tr.street.boardFrom={x:previous?.x??STREET.handleX,y:previous?.y??225};
  tr.x=tr.street.boardFrom.x;tr.y=tr.street.boardFrom.y;tr.actor.x=tr.x;tr.actor.y=tr.y;
  tr.cam=previous?.cam??160;audio.music(null);audio.travelLoop('street');
 } else if(name==='drive') {
  tr.street ||= {clock:0,greeting:-1,events:[]};audio.music(null);audio.travelLoop('car');
 }
}
function cue(tr,name){tr.street.events.push({name,t:tr.t});audio.streetSfx(name);}
export function updateStreet(tr) {
 const st=tr.street;if(!st)return false;st.clock++;
 if(tr.phase==='curb') {
  if(st.arriving){
   const p=ease((tr.t-35)/65),oldX=tr.x,oldY=tr.y;
   tr.x=STREET.doorX+29*p;tr.y=STREET.doorY+43*p;
   Object.assign(tr.actor,{x:tr.x,y:tr.y,z:0,face:1,moved:Math.hypot(tr.x-oldX,tr.y-oldY)});
   tr.actor.stridePhase+=tr.actor.moved;tr.actor.state=tr.actor.moved>.02?'walk':'idle';tr.actor.t++;
   if(tr.t===12)cue(tr,'hotel_open');if(tr.t===105)cue(tr,'hotel_close');
   audio.streetMusic(.2*(1-ease((tr.t-70)/62)));
   if(tr.t>=STREET.arrivalDuration){st.arriving=false;tr.gate=true;audio.music(null);}
   return true;
  }
  if(st.greeting<0&&Math.abs(tr.x-190)<75){st.greeting=st.clock;}
  if(st.greeting>=0)updateDialogue('Your car awaits, sir.',st.clock-st.greeting,{remaining:220-(st.clock-st.greeting),visible:Math.abs(tr.x-185)<220});
 }else if(tr.phase==='car-board'){
  if(tr.t<=18){const p=ease(tr.t/18),oldX=tr.x;tr.x=st.boardFrom.x+(STREET.handleX-st.boardFrom.x)*p;tr.y=st.boardFrom.y+(228-st.boardFrom.y)*p;tr.actor.x=tr.x;tr.actor.y=tr.y;tr.actor.face=tr.x>=oldX?1:-1;tr.actor.moved=Math.abs(tr.x-oldX);tr.actor.stridePhase+=tr.actor.moved;tr.actor.state=tr.actor.moved>.02?'walk':'idle';tr.actor.t++;}
  for(const [t,name]of [[18,'handle'],[30,'car_close'],[48,'ignition']])if(tr.t===t)cue(tr,name);
 }else if(tr.phase==='drive')audio.streetEngine(driveAt(tr.t).speed);
 return false;
}
export function streetActorsAt(tr) {
 const st=tr.street||{clock:0,greeting:-1},t=st.clock,arrival=st.arriving;
 let doorman=0;
 if(arrival)doorman=tr.t<12?2:tr.t<32?4:tr.t<90?5:tr.t<111?6:7;
 else if(st.greeting>=0&&t-st.greeting<100)doorman=t-st.greeting<62?5:6;
 else{const n=t%540;doorman=n<270?0:n<330?1:n<400?2:7;}
 return {doorman};
}
export const STREET_FANS = [
 {row:1,x:294,y:181,offset:57},
 {row:0,x:268,y:188,offset:0},
 {row:2,x:326,y:187,offset:163},
];
// Frame-specific holds preserve the gesture's rhythm instead of cycling a sheet.
const FAN_ROUTINES = [
 [[0,48],[3,10],[1,14],[2,16],[1,14],[2,16],[3,12],[4,40],[5,28],[4,25],[7,12],[6,28],[7,12],[4,35]],
 [[0,38],[4,12],[1,12],[5,10],[2,9],[3,9],[6,9],[3,9],[2,9],[3,9],[5,10],[4,12],[7,32],[0,38]],
 [[0,60],[4,14],[5,12],[1,18],[2,22],[6,18],[5,12],[4,12],[7,35],[3,20],[0,55]],
];
export function streetFansAt(tr) {
 const clock=tr.street?.clock??tr.t;
 return STREET_FANS.map(fan=>{
  const routine=FAN_ROUTINES[fan.row],period=routine.reduce((n,step)=>n+step[1],0);
  let t=mod(clock+fan.offset,period),frame=0;
  for(const [pose,hold]of routine){if(t<hold){frame=pose;break;}t-=hold;}
  return {...fan,frame,flash:fan.row===2&&frame===2&&t>=6&&t<9};
 });
}
export function boardingAt(t) {
 return {seated:t>=30,lights:t>=48,blackout:ease((t-18)/10)*(1-ease((t-32)/12))};
}
export function driveAt(t) {
 return {speed:.82+.12*Math.sin(t*.014),distance:t*4.8,x:128+28*ease(t/150),y:187,w:STREET.carW};
}

function image(ctx,art,key,x,y,w,h){const im=art[key];if(im)ctx.drawImage(im,Math.round(x),Math.round(y),w,h);}
function pose(ctx,art,key,f,x,y,cw,ch){const im=art[key];if(im)ctx.drawImage(im,f*cw,0,cw,ch,Math.round(x-cw/4),Math.round(y-ch/2+4),cw/2,ch/2);}
function sky(ctx,cam,time){const im=ASSETS.bg_lair_sky_far;if(im){const x=-mod(cam*.14+time*.015,960);ctx.drawImage(im,x,0,960,192);ctx.drawImage(im,x+960,0,960,192);}else{ctx.fillStyle='#66274b';ctx.fillRect(0,0,W,H);}}
function exterior(ctx,art,tr,cam,layers){
 const time=tr.street?.clock??tr.t;
 // Use the complete authored exterior: no straight crop through the skyline,
 // no repeated panorama join, and no mismatch between shrubs and background.
 if(layers.architecture!==false)image(ctx,art,art.exterior_open?'exterior_open':'street',-cam,0,640,270);
 else sky(ctx,cam,time);
 if(layers.effects!==false){
  ctx.save();ctx.globalCompositeOperation='screen';
  const pulse=.025+.012*Math.sin(time*.033);ctx.fillStyle=`rgba(255,181,61,${pulse})`;ctx.fillRect(25-cam,74,221,5);
  // Wet street catches tiny passing glints; no broad transparent texture overlays.
  for(let i=0;i<12;i++){ctx.globalAlpha=.04+.035*Math.sin(time*.023+i);ctx.fillStyle='#ffbe71';ctx.fillRect(28+i*45-cam,238+(i%4)*6,12+(i%3)*7,1);}
  ctx.restore();
 }
}
function hotelDoors(ctx,tr,art,cam){
 const t=tr.t,open=tr.street?.arriving?ease(t/35)*(1-ease((t-94)/35)):0;
 const im=art.entrance_leaves;if(!im)return;
 // The generated brass leaves swing around fixed jambs, revealing the lit lobby.
 for(let side=0;side<2;side++){
  const x=73+side*99-cam,w=49.5*(1-.92*open);
  ctx.drawImage(im,side*im.width/2,0,im.width/2,im.height,side?x-w:x,94+open*3,w,88-open*6);
 }
}
export const CAR_WHEELS=[{x:89,y:86,rx:24,ry:28},{x:350,y:91,rx:25,ry:28}];
// Rotate the authored rims inside their fixed elliptical tyre silhouettes.
// Bodywork and tyre contact patches keep their original registration.
export function drawCarWheels(ctx,im,x,y,w,h,distance,art={}){
 // The original complete wheels remain untouched when either layer is missing.
 if(!im||!art.wheel_brake||!art.wheel_rims)return;
 const sx=w/im.width,sy=h/im.height;
 for(const [i,wheel] of CAR_WHEELS.entries()){
  const {rx,ry}=wheel;ctx.save();ctx.translate(x+wheel.x*sx,y+wheel.y*sy);ctx.scale(rx*sx,ry*sy);
  ctx.beginPath();ctx.arc(0,0,.9,0,Math.PI*2);ctx.clip();
  ctx.drawImage(art.wheel_brake,-1,-1,2,2);
  ctx.rotate(distance/(ry*sy));
  ctx.drawImage(art.wheel_rims,i*96,0,96,96,-1,-1,2,2);ctx.restore();
 }
}
function paintCar(ctx,art,key,x,y,w=STREET.carW,h=STREET.carH){
 if(art[key])image(ctx,art,key,x,y,w,h);else if(art.car)image(ctx,art,'car',x,y,w,h);
 else{ctx.fillStyle='#a42332';ctx.fillRect(x,y+18,w,38);}
}
function lights(ctx,x,y,w,time){
 const scale=w/230;ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);x=0;y=0;w=230;ctx.globalCompositeOperation='screen';ctx.globalAlpha=.18;
 const g=ctx.createLinearGradient(x+w-8,y+37,x+w+80,y+48);g.addColorStop(0,'#ffe3a1');g.addColorStop(1,'rgba(255,210,140,0)');ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(x+w-8,y+37);ctx.lineTo(x+w+80,y+40);ctx.lineTo(x+w+80,y+55);ctx.lineTo(x+w-8,y+40);ctx.fill();
 ctx.fillStyle='#ffdd88';ctx.globalAlpha=.7;ctx.fillRect(x+w-13,y+37,5,1);ctx.fillStyle='#f04e26';ctx.fillRect(x+2,y+35,2,4);ctx.restore();
}
function drive(ctx,tr,art,layers){
 const p=driveAt(tr.t),d=p.distance;
 sky(ctx,d*.3,tr.t);
 // A short, open skyline shot. Fast road and slow distant city sell speed.
 if(art.street_road){const scroll=mod(d,640);for(const x of [-scroll,640-scroll])image(ctx,art,'street_road',x,0,640,270);}
 else{ctx.fillStyle='#241827';ctx.fillRect(0,183,W,87);}
 if(art.drive_railing){const scroll=mod(d*.6,320);for(const x of [-scroll,320-scroll,640-scroll])image(ctx,art,'drive_railing',x,164,320,28);}
 else{ctx.fillStyle='#241526';ctx.fillRect(0,170,W,22);}
 ctx.fillStyle='#d5bba0';for(let i=0;i<8;i++)ctx.fillRect(mod(i*90-d*1.7,720)-90,249,37,1);
 const bump=layers.effects===false?0:Math.sin(tr.t*.24)*.35*p.speed;
 paintCar(ctx,art,'car_driver',p.x,p.y+bump,p.w,STREET.carH);
 drawCarWheels(ctx,art.car_driver||art.car,Math.round(p.x),Math.round(p.y+bump),p.w,STREET.carH,d,art);
 if(layers.effects!==false){
  lights(ctx,p.x,p.y,p.w,tr.t);
  ctx.save();ctx.globalCompositeOperation='screen';ctx.globalAlpha=(.5+.5*Math.sin(d*.016))*.09;ctx.fillStyle='#f4c176';ctx.fillRect(p.x+35,p.y+26,p.w-63,2);ctx.restore();
 }
}
export function drawStreet(ctx,tr,art,{hero,prompt,label},layers=tr.streetLayers||{}) {
 if(tr.phase==='drive'){drive(ctx,tr,art,layers);label(ctx,'CITY EXPRESS','PRIVATE TERMINAL');return;}
 const cam=tr.cam||0,st=tr.street||{},t=st.clock||tr.t;
 exterior(ctx,art,tr,cam,layers);
 const actors=streetActorsAt(tr);
 if(layers.architecture!==false)image(ctx,art,'vip_carpet',243-cam,175,111,17);
 if(layers.actors!==false){
  for(const fan of streetFansAt(tr)){
   if(art.fans)ctx.drawImage(art.fans,fan.frame*160,fan.row*192,160,192,fan.x-cam-40,fan.y-92,80,96);
   if(fan.flash&&layers.effects!==false){
    // Authored flash position (60,34) inside the 160×192 firing frame.
    // Use the same half-scale transform as the sprite, snapped to game pixels.
    const x=Math.round(fan.x-cam-40+60/2),y=Math.round(fan.y-92+34/2);
    ctx.save();ctx.globalCompositeOperation='screen';ctx.fillStyle='#fff3cf';
    ctx.fillRect(x-3,y,7,1);ctx.fillRect(x,y-3,1,7);ctx.fillRect(x-1,y-1,3,3);ctx.restore();
   }
  }
  pose(ctx,art,'doorman',actors.doorman,185-cam,190,144,192);
 }
 if(layers.architecture!==false)image(ctx,art,'vip_ropes',240-cam,157,118,36);
 if(layers.effects!==false&&art.palm){ctx.save();ctx.translate(214-cam,187);ctx.transform(1,0,Math.sin(t*.018)*.009,1,0,0);ctx.drawImage(art.palm,-16,-60,32,60);ctx.restore();}
 if(tr.phase==='curb'){
  // CHAD first emerges behind the moving leaves, then steps onto the forecourt.
  if(st.arriving&&tr.t<65){hero(ctx,tr,tr.x-cam,tr.y);hotelDoors(ctx,tr,art,cam);}
  else{hotelDoors(ctx,tr,art,cam);hero(ctx,tr,tr.x-cam,tr.y);}
  paintCar(ctx,art,'car',STREET.carX-cam,STREET.carY);
  if(!st.arriving){drawDirectionArrow(ctx,{x:STREET.handleX-cam,y:175,direction:'down',size:20,time:t,bob:1});if(nearStreetCar(tr))prompt(ctx,'F / LB: ENTER CAR');}
 }else{
  hotelDoors(ctx,tr,art,cam);
  const b=boardingAt(tr.t),cx=STREET.carX-cam;
  if(!b.seated)hero(ctx,tr,tr.x-cam,tr.y);
  paintCar(ctx,art,b.seated?'car_driver':'car',cx,STREET.carY);
  if(b.lights&&layers.effects!==false)lights(ctx,cx,STREET.carY,STREET.carW,tr.t);
 }
 if(tr.phase==='curb'&&st.greeting>=0&&layers.actors!==false)drawDialogue(ctx,{text:'Your car awaits, sir.',x:185-cam,bottom:99,age:t-st.greeting,remaining:220-(t-st.greeting),width:152});
 label(ctx,'THE GRAND ENTRANCE','PRIVATE TERMINAL');
 if(tr.phase==='car-board'){ctx.save();ctx.globalAlpha=boardingAt(tr.t).blackout;ctx.fillStyle='#08070b';ctx.fillRect(0,0,W,H);ctx.restore();}
}
