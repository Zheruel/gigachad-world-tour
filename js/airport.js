import { clamp, W } from './engine.js';
import { audio } from './audio.js';
import { drawDialogue, updateDialogue } from './room_dialogue.js';
import { drawDirectionArrow } from './direction_arrow.js';

export const AIRPORT_FILES = {
 private_apron:'assets/travel/airport/private_apron.png',private_apron_ground:'assets/travel/airport/private_apron_ground.png',
 arrival_terminal:'assets/travel/india/arrival_terminal.png',arrival_terminal_ground:'assets/travel/india/arrival_terminal_ground.png',
 airport_staff:'assets/travel/airport/staff.png',chad_stairs:'assets/travel/airport/chad_stairs.png',chad_duck:'assets/travel/airport/chad_duck.png',
 official:'assets/travel/india/official.png',
 jet_body:'assets/travel/airport/jet_body.png',jet_gear:'assets/travel/airport/jet_gear.png',
 attendant_service:'assets/travel/airport/attendant_service.png',porter_work:'assets/travel/airport/porter_work.png',
 chad_low_board:'assets/travel/airport/chad_low_board.png',chad_disembark:'assets/travel/airport/chad_disembark.png',
 chad_redirection:'assets/travel/india/chad_redirection.png',chad_pivot:'assets/travel/india/chad_pivot.png',official_airborne:'assets/travel/india/official_airborne.png',
 chad_distance_throw:'assets/travel/india/chad_distance_throw.png',official_receding:'assets/travel/india/official_receding.png',
 departure_jet_open:'assets/travel/airport/departure_jet_open.png',departure_jet_body:'assets/travel/airport/departure_jet_body.png',departure_jet_gear:'assets/travel/airport/departure_jet_gear.png',
};
export const AIRPORT = { width:960,arrivalWidth:1280,boardX:774,boardY:228,stairsX:707,stairsY:228,doorX:733,doorY:167,exitX:968,exitY:208 };
export const ENCOUNTER={heroX:858,officialX:900,y:236,waitX:728,camera:600,approachStart:126,approachEnd:204,throwDelay:40};
export const AIRPORT_PHASES = ['apron-arrival','apron','jet-board','disembark','papers','arrival-exit'];
export const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
export const JET = {x:263,y:20,w:600,h:208};
export const DEPARTURE_JET={x:330,y:20,w:600,h:208,doorX:800,doorY:167,attendantX:365,attendantY:219,porterX:138,porterY:194};
export function nearJet(tr) {return !tr.gate&&tr.actor.z===0&&Math.abs(tr.x-AIRPORT.boardX)<32&&Math.abs(tr.y-AIRPORT.boardY)<23;}
export function nearArrivalExit(tr) {return !tr.gate&&tr.actor.z===0&&Math.abs(tr.x-AIRPORT.exitX)<32&&Math.abs(tr.y-AIRPORT.exitY)<30;}
export function enterAirportPhase(tr,name,previous) {
 tr.airport ||= {clock:0,greeted:false,greetingAt:-1,encounterDone:false,events:[]};
 tr.airport.from=previous;
 if(['apron-arrival','apron'].includes(name)){tr.x=285;tr.y=228;tr.cam=0;}
 if(name==='jet-board'){tr.x=previous?.x??AIRPORT.boardX;tr.y=previous?.y??228;tr.cam=previous?.cam??480;}
 if(name==='disembark'){tr.x=AIRPORT.doorX;tr.y=AIRPORT.doorY;tr.cam=480;}
 if(name==='papers'){tr.x=ENCOUNTER.waitX;tr.y=ENCOUNTER.y;tr.cam=480;}
 if(name==='arrival-exit'){tr.x=ENCOUNTER.heroX;tr.y=ENCOUNTER.y;tr.cam=ENCOUNTER.camera;}
 if(name==='arrival-exit')tr.airport.encounterDone=true;
 Object.assign(tr.actor,{x:tr.x,y:tr.y,z:0});
 audio.music(null);audio.travelLoop('airport');
}
function cue(tr,name,sound=name){tr.airport.events.push({phase:tr.phase,t:tr.t,name});if(!audio.roomSfx(sound,name==='stair-step'?.12:name==='distant-crash'?.35:.55))audio.streetSfx(name==='distant-crash'?'car_close':'handle');}
export function updateAirport(tr) {
 const a=tr.airport;a.clock++;
 if(tr.phase==='apron'&&!a.greeted&&Math.abs(tr.x-DEPARTURE_JET.attendantX)<90){a.greeted=true;a.greetingAt=a.clock;}
 if(tr.phase==='jet-board') {
  tr.cam=(a.from?.cam??480)+(480-(a.from?.cam??480))*ease(tr.t/35);
  if(tr.t===148)audio.streetSfx('hinge');
  if([35,51,67,83,99,115,131].includes(tr.t))cue(tr,'stair-step','land');
  if(tr.t===177)audio.streetSfx('car_close');
 }
 if(tr.phase==='disembark') {
  if(tr.t===1)audio.streetSfx('hinge');
  if([54,68,82,96,110,126].includes(tr.t))cue(tr,'stair-step','land');
  if(tr.t>=100&&tr.t<148)updateDialogue('HALT!',tr.t-100,{remaining:148-tr.t});
 }
 if((tr.phase==='jet-board'&&tr.t<25)||(tr.phase==='disembark'&&tr.t>=128)) {
  const down=tr.phase==='disembark',from=down?{x:AIRPORT.stairsX,y:228}:{x:a.from?.x??AIRPORT.boardX,y:a.from?.y??228};
  const p=ease(down?(tr.t-128)/22:tr.t/25),x=from.x+((down?ENCOUNTER.waitX:AIRPORT.boardX)-from.x)*p,y=from.y+((down?ENCOUNTER.y:228)-from.y)*p;
  const moved=Math.hypot(x-tr.actor.x,y-tr.actor.y);
  Object.assign(tr.actor,{x,y,z:0,moved,face:x>=tr.actor.x?1:-1,state:moved>.01?'walk':'idle'});tr.actor.stridePhase+=moved;tr.actor.t++;
 }
 if(tr.phase==='apron'&&a.greeted)updateDialogue('Welcome aboard, sir.',a.clock-a.greetingAt,{remaining:180-(a.clock-a.greetingAt),visible:Math.abs(tr.x-DEPARTURE_JET.attendantX)<220});
 if(tr.phase==='papers') {
  const walk=ease((tr.t-ENCOUNTER.approachStart)/(ENCOUNTER.approachEnd-ENCOUNTER.approachStart));
  const x=ENCOUNTER.waitX+(ENCOUNTER.heroX-ENCOUNTER.waitX)*walk,moved=Math.abs(x-tr.actor.x);
  tr.x=x;tr.y=ENCOUNTER.y;tr.cam=480+(ENCOUNTER.camera-480)*walk;
  Object.assign(tr.actor,{x,y:tr.y,z:0,moved,face:1,state:moved>.01?'walk':'idle'});tr.actor.stridePhase+=moved;tr.actor.t++;
  const speech=papersDialogue(tr.t);if(speech)updateDialogue(speech.text,tr.t-speech.start,{remaining:speech.end-tr.t});
  if(tr.t===212){a.events.push({phase:tr.phase,t:tr.t,name:'charge'});audio.roomSfx('enrage',.18,.24);}
  if(tr.t===230)cue(tr,'grab');
  if(tr.t===244){a.events.push({phase:tr.phase,t:tr.t,name:'pivot'});audio.roomSfx('whiff',.38,.25);}
  if(tr.t===258){cue(tr,'throw');a.events.push({phase:tr.phase,t:tr.t,name:'grunt'});audio.roomSfx('ehurt2',.34,.48);}
  if(tr.t===304)cue(tr,'distant-crash','slam');
  if(tr.t===310){a.events.push({phase:tr.phase,t:tr.t,name:'duke-payoff'});audio.roomSfx('duke_gotta_hurt',.62);}
  if(tr.t>=305)a.encounterDone=true;
 }
}
export function stairPose(tr) {
 const down=tr.phase==='disembark',t=tr.t;
 const p=clamp((t-(down?42:25))/(down?86:95),0,1);
 const q=down?1-p:p;
 const startX=down?AIRPORT.stairsX:AIRPORT.boardX,endX=down?AIRPORT.doorX:DEPARTURE_JET.doorX,endY=down?AIRPORT.doorY:DEPARTURE_JET.doorY;
 return {x:startX+(endX-startX)*q,y:AIRPORT.stairsY+(endY-AIRPORT.stairsY)*q,
  frame:(down?3:0)+([0,1,2,1][Math.floor(p*12)%4]),p};
}
export function departureStaffAt(tr) {
 const t=tr.airport?.clock??tr.t,age=t-(tr.airport?.greetingAt??-1000);
 const greeting=[[1,26],[2,12],[3,18],[4,42],[3,14],[2,12],[0,40]];
 let attendant=0,clock=age;
 if(age>=0&&age<164){for(const [frame,hold]of greeting){if(clock<hold){attendant=frame;break;}clock-=hold;}}
 else {const idle=t%780;attendant=idle<560?0:idle<590?5:idle<642?6:idle<670?5:7;}
 // A deliberate lift/check/lower, with the worker's feet fixed independently of
 // the suitcase. Adjacent bends bridge the changes in load height.
 const work=[[2,65],[3,24],[5,22],[6,75],[5,22],[3,24],[2,80]];
 let wt=(t+113)%312,porter=2;for(const [frame,hold]of work){if(wt<hold){porter=frame;break;}wt-=hold;}
 return {attendant,porter};
}
export function drawDepartureJet(ctx,art,{x=DEPARTURE_JET.x,y=DEPARTURE_JET.y,w=600,h=208,gear=1,open=1,angle=0}={}) {
 if(!art.departure_jet_body){drawJet(ctx,art,{x,y,w,h,gear,open,angle});return;}
 ctx.save();ctx.translate(x+w/2,y+h*.75);ctx.rotate(angle);ctx.translate(-w/2,-h*.75);ctx.scale(w/1200,h/360);
 if(gear>0){ctx.save();ctx.beginPath();ctx.rect(0,259,1200,101);ctx.clip();imageAt(ctx,art,'departure_jet_gear',0,-68*(1-gear),1200,360);ctx.restore();}
 imageAt(ctx,art,'departure_jet_body',0,0,1200,360);
 const im=art.departure_jet_open;
 if(open>0&&im){
  ctx.save();ctx.beginPath();ctx.rect(872,144,100*open,112);ctx.clip();imageAt(ctx,art,'departure_jet_open',0,0,1200,360);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(0,250,1200,110);ctx.clip();ctx.translate(940,256);ctx.rotate((1-open)*2.6);ctx.drawImage(im,862,256,117,104,-78,0,117,104);ctx.restore();
 }
 ctx.restore();
}
export function papersDialogue(t) {
 if(t>=0&&t<44)return {text:'PAPERS.',start:0,end:44};
 if(t>=44&&t<126)return {text:'AND THE PROCESSING FEE.',start:44,end:126};
 return null;
}
export function papersAt(t) {
 t-=ENCOUNTER.throwDelay;
 const pivot=t>=199&&t<218;
 const frame=pivot?(t<204?0:t<211?1:t<218?2:3):(t<190?0:t<199?1:t<236?5:t<258?6:7);
 const age=t-218,u=clamp(age/40,0,1),depth=1-Math.pow(1-u,2.5);
 return {frame,sheet:pivot?'chad_pivot':'chad_redirection',paired:t>=180&&t<280,release:t>=218&&t<280,releaseFrame:t<228?0:t<246?1:2,
  officialX:ENCOUNTER.officialX,officialFrame:t<44?3+((t>>3)%2):t<103?1:2,
  airborne:t>=218&&t<258,airX:ENCOUNTER.heroX+73-187*depth,airY:ENCOUNTER.y-64-90*depth-35*Math.sin(Math.PI*u),
  airScale:.5*Math.pow(1-u,2.1)+.016,airAngle:-.25-Math.sin(u*Math.PI)*.55,far:age>=10,glint:t>=258&&t<265,
  shake:t>=218&&t<228?Math.sin((t-218)*2.1)*(228-t)*.22:0};
}
function drawLaunchedOfficial(ctx,tr,art,behind) {
 const p=papersAt(tr.t);if(p.far!==behind)return;
 if(p.airborne){
  const im=art.official_receding||art.official_airborne;
  ctx.save();ctx.translate(Math.round(p.airX),Math.round(p.airY));ctx.rotate(p.airAngle);
  if(im)ctx.drawImage(im,-im.width*p.airScale/2,-im.height*p.airScale/2,im.width*p.airScale,im.height*p.airScale);
  else frameAt(ctx,art.official,5,224,208,0,0,p.airScale,112,104);
  ctx.restore();
 }
 if(p.glint&&tr.streetLayers?.effects!==false){
  const r=tr.t<261+ENCOUNTER.throwDelay?3:1,x=ENCOUNTER.heroX-114,y=ENCOUNTER.y-154;ctx.fillStyle='#ffe7ba';ctx.fillRect(x-r,y,r*2+1,1);ctx.fillRect(x,y-r,1,r*2+1);
 }
}
export function descentFrame(t) {
 return t<64?0:t<82?1:t<94?2:t<104?3:t<114?4:t<121?5:t<128?6:7;
}
function redirectionEffects(ctx,tr) {
 if(tr.streetLayers?.effects===false)return;
 const t=tr.t-ENCOUNTER.throwDelay;
 if(t>=168&&t<198){
  const pulse=Math.sin((t-168)/30*Math.PI)*(.65+.35*Math.sin(t*.65));
  const glow=ctx.createRadialGradient(666,190,8,666,190,50);
  glow.addColorStop(0,`rgba(225,40,18,${pulse*.28})`);glow.addColorStop(1,'rgba(150,8,0,0)');
  ctx.fillStyle=glow;ctx.fillRect(616,140,100,100);
 }
 if(t>=213&&t<226){
  const age=t-213;ctx.globalAlpha=(226-t)/13;ctx.fillStyle='#f09d65';
  for(let i=0;i<5;i++)ctx.fillRect(Math.round(716-age*9+i*6),155-age*4+i*3,8+i*3,1);
  ctx.globalAlpha=1;
 }
}

export function imageAt(ctx,art,key,x,y,w,h) {
 const im=art[key];if(im)ctx.drawImage(im,Math.round(x),Math.round(y),Math.round(w),Math.round(h));
}
function frameAt(ctx,im,frame,cw,ch,x,y,scale=.5,anchor=cw/2,baseline=ch-8) {
 if(im)ctx.drawImage(im,frame*cw,0,cw,ch,Math.round(x-anchor*scale),Math.round(y-baseline*scale),cw*scale,ch*scale);
}
// Side view is shared by runway, parked aircraft and stair scenes, including all
// fuselage and wheel landmarks. Undercarriage retracts behind the opaque body.
export function drawJet(ctx,art,{x=JET.x,y=JET.y,w=JET.w,h=JET.h,gear=1,open=0,angle=0}={}) {
 ctx.save();ctx.translate(x+w/2,y+h*.75);ctx.rotate(angle);ctx.translate(-w/2,-h*.75);
 if(gear>0) {
  ctx.save();ctx.beginPath();ctx.rect(0,h*.765,w,h*.235);ctx.clip();
  imageAt(ctx,art,'jet_gear',0,-h*.19*(1-gear),w,h);ctx.restore();
 }
 imageAt(ctx,art,art.jet_body?'jet_body':'jet_closed',0,0,w,h);
 if(open>0&&art.jet) {
  const im=art.jet,s=w/1100;
  // Open doorway remains fixed; the separate stair assembly unfolds vertically.
  ctx.save();ctx.beginPath();ctx.rect(809*s,147*s,69*s*open,104*s);ctx.clip();imageAt(ctx,art,'jet',0,0,w,h);ctx.restore();
  ctx.drawImage(im,779,248,100,102,779*s,248*s,100*s,102*s*open);
 }
 ctx.restore();
}
export function drawAirportEnvironment(ctx,tr,art,india=false) {
 const width=india?1280:960,key=india?'arrival_terminal':'private_apron';
 ctx.fillStyle=india?'#81532d':'#35234b';ctx.fillRect(0,0,width,270);
 if(tr.streetLayers?.architecture!==false){imageAt(ctx,art,art[key]?key:india?'india':'apron',0,0,width,270);imageAt(ctx,art,key+'_ground',0,0,width,270);}
 if(tr.streetLayers?.effects!==false){
  // Small physical lights and drifting litter; opaque scenery is never crossfaded.
  ctx.fillStyle=india?'#e0b885':'#eac481';
  for(let i=0;i<8;i++){const x=75+i*141;ctx.globalAlpha=.18+.08*Math.sin(tr.animT*.023+i);ctx.fillRect(x,india?139:126,2,2);}ctx.globalAlpha=1;
  if(india)for(let i=0;i<8;i++){const x=(i*159+tr.animT*.07)%1280;ctx.fillStyle='#9e8b62';ctx.fillRect(Math.round(x),242+i%3,3,1);}
  else {ctx.save();ctx.translate(912,132);ctx.rotate(Math.sin(tr.animT*.045)*.06);ctx.fillStyle='#dd8757';ctx.fillRect(0,0,14,3);ctx.fillStyle='#dbc4a0';ctx.fillRect(4,0,3,3);ctx.fillRect(10,0,3,3);ctx.restore();}
 }
}
function staff(ctx,tr,art,india) {
 if(india||tr.streetLayers?.actors===false)return;
 const t=tr.airport?.clock??tr.t;
 if(!india){
  const poses=departureStaffAt(tr);
  frameAt(ctx,art.attendant_service,poses.attendant,224,200,DEPARTURE_JET.attendantX,DEPARTURE_JET.attendantY,.47);
  frameAt(ctx,art.porter_work,poses.porter,224,200,DEPARTURE_JET.porterX,DEPARTURE_JET.porterY,.42);
  return;
 }
}
export function waitingOfficialAt(tr) {
 if(tr.phase==='landing')return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:0,visible:true};
 if(tr.phase==='disembark')return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:tr.t<60?0:1,visible:true};
 return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:tr.t<44?1:tr.t<126?2:0,visible:tr.phase==='papers'&&!papersAt(tr.t).paired&&tr.t<220};
}
export function drawWaitingOfficial(ctx,tr,art) {
 const p=waitingOfficialAt(tr);if(!p.visible||tr.streetLayers?.actors===false)return;
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(-1,1);frameAt(ctx,art.official,p.frame,224,208,0,0,.5);ctx.restore();
}
export function drawAirport(ctx,tr,art,{hero,prompt,label}) {
 const india=['disembark','papers','arrival-exit'].includes(tr.phase),cam=tr.cam||0;
 ctx.save();ctx.translate(-cam+(tr.phase==='papers'&&tr.streetLayers?.effects!==false?papersAt(tr.t).shake:0),0);drawAirportEnvironment(ctx,tr,art,india);
 if(tr.phase==='papers')drawLaunchedOfficial(ctx,tr,art,true);
 let open=tr.phase==='jet-board'?1-ease((tr.t-148)/29):tr.phase==='disembark'?ease(tr.t/25):1;
 if(india)drawDepartureJet(ctx,art,{...JET,open});else drawDepartureJet(ctx,art,{open});
 staff(ctx,tr,art,india);
 if(tr.phase==='disembark')drawWaitingOfficial(ctx,tr,art);
 if(!india)imageAt(ctx,art,tr.phase==='apron-arrival'&&tr.t<30?'car_driver':'car',45-28*(1-ease(tr.t/28))*(tr.phase==='apron-arrival'),187,200,55);
 if(tr.phase==='jet-board'||tr.phase==='disembark') {
  const s=stairPose(tr),down=tr.phase==='disembark';
  if((!down&&tr.t<25)||(down&&tr.t>=128))hero(ctx,tr,tr.actor.x,tr.actor.y);
  else if((down&&tr.t>=25)||(!down&&tr.t<149)){
   ctx.save();
   const duck=(!down&&tr.t>=105)||(down&&tr.t<48);
   const into=!down?ease((tr.t-120)/28):1-ease((tr.t-25)/23);
   if(duck) {ctx.beginPath();if(down)ctx.rect(712,101,35,127);else ctx.rect(779,104,34,124);ctx.clip();}
   if(down&&art.chad_disembark)frameAt(ctx,art.chad_disembark,descentFrame(tr.t),256,208,s.x+(duck?into*27:0),s.y);
   else if(duck&&art.chad_duck)frameAt(ctx,art.chad_duck,down?1:2,256,208,s.x+into*27,s.y);
   else if(!down&&art.chad_low_board)frameAt(ctx,art.chad_low_board,tr.t<68?Math.floor((tr.t-25)/10)%2:tr.t<83?2:3,256,208,s.x,s.y);
   else if(art.chad_stairs)frameAt(ctx,art.chad_stairs,s.frame,256,208,s.x,s.y);
   else hero(ctx,tr,s.x,s.y);
   ctx.restore();
   // Painted rail in front of hands/legs; cabin jamb in front of entering torso.
   if(down&&art.departure_jet_open){ctx.save();ctx.beginPath();ctx.moveTo(747,160);ctx.lineTo(727,222);ctx.lineTo(722,226);ctx.lineTo(743,163);ctx.closePath();ctx.clip();imageAt(ctx,art,'departure_jet_open',JET.x,JET.y,JET.w,JET.h);ctx.restore();}
   else if(!down&&art.departure_jet_open){ctx.save();ctx.beginPath();ctx.moveTo(814,160);ctx.lineTo(794,222);ctx.lineTo(789,226);ctx.lineTo(810,163);ctx.closePath();ctx.clip();imageAt(ctx,art,'departure_jet_open',330,20,600,208);ctx.restore();}
  }
 } else if(tr.phase==='papers') {
  const p=papersAt(tr.t);
  ctx.save();ctx.translate(ENCOUNTER.heroX-666,ENCOUNTER.y-228);redirectionEffects(ctx,tr);ctx.restore();
  if(p.release&&art.chad_distance_throw)frameAt(ctx,art.chad_distance_throw,p.releaseFrame,256,240,ENCOUNTER.heroX,ENCOUNTER.y,.5,128,232);
  else if(p.paired&&art[p.sheet])frameAt(ctx,art[p.sheet],p.frame,384,288,ENCOUNTER.heroX,ENCOUNTER.y,.5,100,280);
  else hero(ctx,tr,tr.actor.x,tr.actor.y);
  drawWaitingOfficial(ctx,tr,art);
  drawLaunchedOfficial(ctx,tr,art,false);
  if(tr.t>=218+ENCOUNTER.throwDelay&&tr.streetLayers?.effects!==false)for(let i=0;i<18;i++){
   const age=tr.t-218-ENCOUNTER.throwDelay,x=ENCOUNTER.heroX+57+age*(.5+i*.13)+Math.sin(age*.06+i)*9,y=ENCOUNTER.y-83-age*.22+age*age*.005+i%5*4;
   ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(Math.sin(age*.08+i)*.9);ctx.fillStyle=i%3?'#d8c39c':'#ac946e';ctx.fillRect(-2,-1,4,3);ctx.restore();
  }
 } else if(tr.phase!=='apron-arrival'||tr.t>=30)hero(ctx,tr,tr.x,tr.y);
 if(tr.streetLayers?.effects!==false){ctx.fillStyle=tr.animT%70<8?'#ffbca2':'#722921';ctx.fillRect(india?94:338,india?154:177,2,1);}
 ctx.restore();
 if(tr.phase==='apron'&&tr.airport?.greeted){const age=tr.airport.clock-tr.airport.greetingAt;drawDialogue(ctx,{text:'Welcome aboard, sir.',speaker:'Attendant',x:DEPARTURE_JET.attendantX-cam,bottom:126,age,remaining:180-age});}
 if(tr.phase==='disembark'&&tr.t>=100&&tr.t<148)drawDialogue(ctx,{text:'HALT!',x:ENCOUNTER.officialX-cam,bottom:142,age:tr.t-100,remaining:148-tr.t,width:130});
 if(tr.phase==='papers'){const speech=papersDialogue(tr.t);if(speech)drawDialogue(ctx,{text:speech.text,x:ENCOUNTER.officialX-cam,bottom:142,age:tr.t-speech.start,remaining:speech.end-tr.t,width:198});}
 label(ctx,india?'DELHI / ARRIVAL':'PRIVATE AVIATION',india?'INDIA':'DESTINATION: INDIA');
 if(['apron','arrival-exit'].includes(tr.phase)){
  const target=india?AIRPORT.exitX:AIRPORT.boardX,x=target-cam,onscreen=x>28&&x<W-28;
  drawDirectionArrow(ctx,{x:clamp(x,26,W-26),y:india?173:183,direction:onscreen?'down':x<28?'left':'right',size:29,time:tr.animT});
  if(india?nearArrivalExit(tr):nearJet(tr))prompt(ctx,india?'F / LB: EXIT':'F / LB: BOARD JET');
 }
 if(tr.phase==='apron-arrival'){ctx.fillStyle=`rgba(0,0,0,${ease((tr.t-20)/9)*(1-ease((tr.t-32)/15))})`;ctx.fillRect(0,0,480,270);}
}
