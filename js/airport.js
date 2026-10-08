import { clamp, W } from './engine.js';
import { drawCigarReplay } from './cigar_smoke.js';
import { audio } from './audio.js';
import { drawDialogue, updateDialogue } from './room_dialogue.js';
import { drawDirectionArrow } from './direction_arrow.js';
import { drawContactShadow } from './contact_shadow.js';

export const AIRPORT_FILES = {
 private_apron:'assets/travel/airport/private_apron.png',private_apron_ground:'assets/travel/airport/private_apron_ground.png',
 arrival_terminal:'assets/travel/india/arrival_terminal.png',arrival_terminal_ground:'assets/travel/india/arrival_terminal_ground.png',
 airport_staff:'assets/travel/airport/staff.png',chad_stairs:'assets/travel/airport/chad_stairs.png',chad_duck:'assets/travel/airport/chad_duck.png',
 official:'assets/travel/india/official.png',
 jet_body:'assets/travel/airport/jet_body.png',jet_gear:'assets/travel/airport/jet_gear.png',
 attendant_service:'assets/travel/airport/attendant_service.png',
 chad_low_board:'assets/travel/airport/chad_low_board.png',chad_disembark:'assets/travel/airport/chad_disembark.png',
 chad_redirect:'assets/travel/india/chad_redirect.png',chad_redirect_after:'assets/travel/india/chad_redirect_after.png',official_tumble:'assets/travel/india/official_tumble.png',official_held:'assets/travel/india/official_held.png',
 arrival_jet_body:'assets/travel/india/arrival_jet_body.png',arrival_jet_open:'assets/travel/india/arrival_jet_open.png',arrival_jet_gear:'assets/travel/india/arrival_jet_gear.png',
 departure_jet_open:'assets/travel/airport/departure_jet_open.png',departure_jet_body:'assets/travel/airport/departure_jet_body.png',departure_jet_gear:'assets/travel/airport/departure_jet_gear.png',
};
export const AIRPORT = { width:960,arrivalWidth:1280,boardX:774,boardY:228,stairsX:707,stairsY:228,doorX:733,doorY:167,exitX:944,exitY:208 };
// Kesarganj airstrip, midnight. The official lunges from his post; CHAD catches the charge and turns it into a
// rising corkscrew throw (catch, pivot, spiral, release), then watches him sail away before lighting a cigar.
export const ENCOUNTER={heroX:795,officialX:920,y:236,waitX:728,camera:560,approachStart:146,approachEnd:204};
export const REDIRECT={fury:204,lunge:216,reach:222,catch:230,pivot:245,spiral:251,over:257,release:266,flight:84,watch:276,dust:300,settle:330,light:340,puff:368,payoff:376};
export const AIRPORT_PHASES = ['apron-arrival','apron','jet-board','disembark','papers','arrival-exit'];
export const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
export const JET = {x:263,y:20,w:600,h:208};
export const DEPARTURE_JET={x:330,y:20,w:600,h:208,doorX:800,doorY:167,attendantX:365,attendantY:219};
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
 if(name==='arrival-exit'){tr.airport.encounterDone=true;tr.airport.hold=true;tr.actor.face=-1;tr.facing=-1;}
 Object.assign(tr.actor,{x:tr.x,y:tr.y,z:0});
 audio.music(null);audio.travelLoop('airport');
}
function cue(tr,name,sound=name){tr.airport.events.push({phase:tr.phase,t:tr.t,name});if(!audio.roomSfx(sound,name==='stair-step'?.12:name==='distant-crash'?.2:.55))audio.streetSfx(name==='distant-crash'?'car_close':'handle');}
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
  const R=REDIRECT,mark=name=>a.events.push({phase:tr.phase,t:tr.t,name});
  if(tr.t===R.fury+2){mark('charge');audio.roomSfx('enrage',.42,(R.catch-R.fury-2)/60);}  // cut at the catch
  if(tr.t===R.lunge){mark('lunge');audio.roomSfx('dash',.34);}
  if(tr.t===R.catch){cue(tr,'grab');audio.roomSfx('parry',.6);audio.roomSfx('heavy',.22);}  // the accent of the scene
  if(tr.t===R.pivot){mark('pivot');audio.roomSfx('whiff',.3);audio.whoosh(.36,.3,500,1900);}
  if(tr.t===R.spiral+3)audio.whoosh(.2,.55,600,2600);  // the apex: over the top, 254..265
  if(tr.t===R.release){cue(tr,'throw');audio.roomSfx('heavy',.32);}
  // He screams away into the night: the yell drops in pitch and pans off to the left as he recedes.
  if(tr.t===R.release+3){mark('yell');audio.roomSweep('edie1',.42,1.06,.74,-.1,-.75);audio.whoosh(1.1,.16,1500,380);}
  if(tr.t===R.release+R.flight-2)cue(tr,'distant-crash','slam');
  if(tr.t===R.payoff){mark('duke-payoff');audio.roomSfx('duke_too_easy',.66);}
  if(tr.t>=R.release+R.flight)a.encounterDone=true;
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
 return {attendant};
}
// Parked on the wet Kesarganj tarmac: wheel contact points in jet art pixels (1200x360), shared by shadows and blocking.
const JET_WHEELS=[[531,352,44],[664,348,34],[1072,355,36]];
// The parked jet is solid: CHAD cannot walk under or behind it (its ground footprint, x 255..870 back of y 226), nor
// through its wheels or the airstair foot (ground ellipses, world px). Left of the tail he may pass behind it.
export const JET_GROUND=225;
const JET_FOOT={left:255,right:870,front:226};
const JET_BLOCKS=[...JET_WHEELS.map(([x,y,r])=>[JET.x+x*JET.w/1200,JET.y+y*JET.h/360,r*JET.w/1200+9,7]),[723,227,33,7]];
export function clampArrivalActor(a) {
 const F=JET_FOOT;
 if(a.x>F.left&&a.x<F.right&&a.y<F.front){
  // Leave by the shortest way out: forward onto the apron, or sideways past the nose or the tail.
  const out=[[F.front-a.y,'y'],[F.right-a.x,'r'],[a.x-F.left,'l']].sort((p,q)=>p[0]-q[0])[0][1];
  if(out==='y')a.y=F.front;else if(out==='r')a.x=F.right;else a.x=F.left;
 }
 for(const [cx,cy,rx,ry] of JET_BLOCKS){
  const dx=(a.x-cx)/rx,dy=(a.y-cy)/ry,d=Math.hypot(dx,dy);if(d>=1)continue;
  if(d<1e-3){a.y=cy+ry;continue;}
  a.x=cx+dx/d*rx;a.y=cy+dy/d*ry;
 }
}
export function drawDepartureJet(ctx,art,{x=DEPARTURE_JET.x,y=DEPARTURE_JET.y,w=600,h=208,gear=1,open=1,angle=0,night=false,reflect=false}={}) {
 if(!art.departure_jet_body){drawJet(ctx,art,{x,y,w,h,gear,open,angle});return;}
 // The Kesarganj arrival uses the same aircraft relit for midnight (identical geometry).
 const k=night&&art.arrival_jet_body?'arrival_jet_':'departure_jet_';
 ctx.save();ctx.translate(x+w/2,y+h*.75);ctx.rotate(angle);ctx.translate(-w/2,-h*.75);ctx.scale(w/1200,h/360);
 if(reflect&&gear>=1){
  // Wet-tarmac mirror of the belly and gear, fading with distance below the contact line, then soft contact shadows.
  for(const [i,a] of [.2,.12,.06].entries()){
   ctx.save();ctx.beginPath();ctx.rect(0,354+i*14,1200,14);ctx.clip();ctx.globalAlpha=a;ctx.translate(0,708);ctx.scale(1,-1);
   imageAt(ctx,art,k+'gear',0,0,1200,360);imageAt(ctx,art,k+'body',0,0,1200,360);ctx.restore();
  }
  ctx.fillStyle='rgba(4,2,10,.55)';
  for(const [cx,cy,r] of JET_WHEELS){ctx.beginPath();ctx.ellipse(cx,cy+1,r*.8,6,0,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(cx,cy+1,r*1.3,9,0,0,Math.PI*2);ctx.globalAlpha=.4;ctx.fill();ctx.globalAlpha=1;}
 }
 if(gear>0){ctx.save();ctx.beginPath();ctx.rect(0,259,1200,101);ctx.clip();imageAt(ctx,art,k+'gear',0,-68*(1-gear),1200,360);ctx.restore();}
 imageAt(ctx,art,k+'body',0,0,1200,360);
 const im=art[k+'open'];
 if(open>0&&im){
  ctx.save();ctx.beginPath();ctx.rect(872,144,100*open,112);ctx.clip();imageAt(ctx,art,k+'open',0,0,1200,360);ctx.restore();
  ctx.save();ctx.beginPath();ctx.rect(0,250,1200,110);ctx.clip();ctx.translate(940,256);ctx.rotate((1-open)*2.6);ctx.drawImage(im,862,256,117,104,-78,0,117,104);ctx.restore();
 }
 ctx.restore();
}
export function papersDialogue(t) {
 if(t>=0&&t<44)return {text:'PAPERS.',start:0,end:44};
 if(t>=44&&t<160)return {text:'AND THE PROCESSING FEE.',start:44,end:160};
 if(t>=REDIRECT.fury&&t<REDIRECT.catch+14)return {text:'PAPERS!!',start:REDIRECT.fury,end:REDIRECT.catch+14};
 return null;
}
// Registration printed by tools/production/build_india_arrival.py redirection(): CHAD's grip point per spin frame
// (cell px, feet anchor 160,248), and per official frame the natural body angle (degrees, y up, caught fist -> body
// centre) and the body centre relative to the fist (cell px). The lunge frame is official.png frame 6, drawn flipped.
const SPIN={grip:[[209,138],[218,100],[216,104],[202,69],[181,85],[168,30],[138,55],[114,44],[114,51],[98,57],[96,44],[192,62],[203,238],[106,53],[217,84],[183,46],[113,49]]};
const HELD={angle:[1.6,41.5,80,103.5,155,0],com:[[95,-3],[78,-69],[19,-107],[-23,-94],[-97,-45],[0,0]]};
const LUNGE={grip:[240,86],angle:-27.2,com:[95,48]};
// The body turns around the caught wrist (y-up degrees): a slow frozen instant after the catch, then one rising
// counter-clockwise sweep that carries him head over heels over CHAD's head.
const SWING=[[230,-33],[240,-26],[242,-20],[245,0],[248,24],[251,50],[254,76],[257,100],[261,124],[266,150]];
const TUMBLE=[0,3,2,4,5,1];
const lerp=(a,b,u)=>a+(b-a)*u;
function swingAngle(t) {
 if(t<=SWING[0][0])return SWING[0][1];
 for(let i=1;i<SWING.length;i++)if(t<=SWING[i][0]){const [t0,a0]=SWING[i-1],[t1,a1]=SWING[i];return lerp(a0,a1,(t-t0)/(t1-t0));}
 return SWING[SWING.length-1][1];
}
// Spin sheet: ready, catch, A, turn, B, lift, C, over, D, snap (key poses with their in-betweens), then the later
// in-betweens 10 D->snap, 11 B->lift, 12 idle->ready, 13 C->over, 14 A->turn, 15 B/lift->lift, 16 C->C/over.
// One to three ticks each.
const SPIN_AT=[[220,12],['reach',0],['catch',1],[242,2],[244,14],['pivot',3],[247,4],[249,11],[250,15],['spiral',5],[253,6],[254,16],[255,13],['over',7],[260,8],['release',10],[269,9]];
export function spinFrame(t) {
 let f=0;for(const [k,i] of SPIN_AT)if(t>=(typeof k==='number'?k:REDIRECT[k]))f=i;return f;
}
// World position of CHAD's gripping hand in a spin frame.
export function gripPoint(frame) {
 const [x,y]=SPIN.grip[frame];return {x:ENCOUNTER.heroX+(x-160)/2,y:ENCOUNTER.y+(y-248)/2};
}
// CHAD's hand path with the pose steps smoothed out: each pose's grip holds at the middle of its ticks.
function smoothGrip(t) {
 const marks=SPIN_AT.map(([k,i],n)=>{const t0=typeof k==='number'?k:REDIRECT[k],next=SPIN_AT[n+1],t1=next?(typeof next[0]==='number'?next[0]:REDIRECT[next[0]]):t0+6;return [(t0+t1)/2,gripPoint(i)];}).slice(2);
 if(t<=marks[0][0])return marks[0][1];
 for(let n=1;n<marks.length;n++)if(t<=marks[n][0]){const [t0,a]=marks[n-1],[t1,b]=marks[n],u=(t-t0)/(t1-t0);return {x:lerp(a.x,b.x,u),y:lerp(a.y,b.y,u)};}
 return marks[marks.length-1][1];
}
const lungeX=t=>ENCOUNTER.officialX-8*ease((t-REDIRECT.lunge)/(REDIRECT.catch-REDIRECT.lunge));
// The official while CHAD holds him (reach..release): which frame, where the caught fist is, how the body is turned.
// Unwrapped angle (y-up degrees) from the locked fist to where the smooth circle wants his body.
function circleAngle(t) {
 const fist=gripPoint(spinFrame(t)),g=smoothGrip(t),a=swingAngle(t)*Math.PI/180;
 let angle=Math.atan2(-(g.y-Math.sin(a)*52-fist.y),g.x+Math.cos(a)*52-fist.x)*180/Math.PI;
 return angle<-90?angle+360:angle;
}
// The body only ever turns forward: where a pose step of CHAD's hand would swing him back, he holds his angle
// for that tick instead (monotonic, so no back-steps at pose changes).
const heldAngles=[];
function heldAngle(t) {
 const R=REDIRECT;if(heldAngles.length===0){let a=circleAngle(R.catch);heldAngles[R.catch]=a;
  for(let k=R.catch+1;k<R.release;k++){a=Math.max(circleAngle(k),a);heldAngles[k]=a;}}
 return heldAngles[Math.max(R.catch,Math.min(R.release-1,t))];
}
// The official while CHAD holds him (reach..release): which frame, where the caught fist is, how the body is turned.
export function heldAt(t) {
 const R=REDIRECT,E=ENCOUNTER;
 if(t<R.reach||t>=R.release)return null;
 let fist,angle;
 if(t<R.catch){
  // His reaching fist runs into CHAD's open hand: from where the lunge put it to the catch point.
  const u=ease((t-R.reach)/(R.catch-R.reach)),x0=lungeX(R.reach)-(LUNGE.grip[0]-96)/2,y0=E.y+(LUNGE.grip[1]-216)/2,g=gripPoint(1);
  fist={x:lerp(x0,g.x,u),y:lerp(y0,g.y,u)};angle=lerp(LUNGE.angle,SWING[0][1],u);
 } else {
  // The fist is locked in CHAD's hand, which moves in discrete poses; the heavy body follows a smooth circle around
  // the hand's smoothed path, so a pose change turns him about the wrist instead of teleporting him.
  fist=gripPoint(spinFrame(t));angle=heldAngle(t);
 }
 const frame=heldFrame(angle),natural=frame==='lunge'?LUNGE.angle:HELD.angle[frame],turn=(angle-natural)*Math.PI/180;
 const [cx,cy]=frame==='lunge'?LUNGE.com:HELD.com[frame],c=Math.cos(turn),s=Math.sin(turn);
 // Canvas y points down, so a counter-clockwise (y-up) turn is a negative canvas rotation.
 return {frame,fist,angle,rotate:-turn,com:{x:fist.x+(cx*c+cy*s)/2,y:fist.y+(-cx*s+cy*c)/2}};
}
function heldFrame(angle) {
 let frame='lunge',best=angle<-12?0:99;
 if(angle>=-12)HELD.angle.slice(0,5).forEach((a,i)=>{const d=Math.abs(angle-a);if(d<best){best=d;frame=i;}});
 return frame;
}
// Where the official is and how the camera sits on tick t of the papers scene (pure: render and checks share it).
export function papersAt(t) {
 const R=REDIRECT,E=ENCOUNTER,age=t-R.release;
 const stage=t<R.fury?'wait':t<R.catch?'lunge':t<R.release?'redirect':'after';
 const out={stage,frame:spinFrame(t),spin:t>=R.reach-2&&t<R.watch,release:t>=R.release,afterFrame:-1,held:heldAt(t),
  officialX:E.officialX,officialFrame:0,airborne:false,far:false,glint:false,shake:0,tilt:0,zoom:1,lift:0,freeze:0,swirl:0,flash:0};
 if(stage==='lunge'){out.officialFrame=t<R.lunge?4:t<R.reach?5:6;out.officialX=lungeX(t);}
 if(t>=R.catch&&t<R.release){
  // The frozen instant of the catch, then the view rolls and pushes in with the body being turned over.
  out.freeze=t<R.catch+9?1:1-ease((t-R.catch-9)/5);out.flash=t<R.catch+3?1-(t-R.catch)/3:0;
  const u=ease((t-R.pivot+6)/(R.release-R.pivot+6));out.tilt=-.05*u;out.zoom=1+.06*u;out.lift=22*ease((t-R.catch-8)/16);out.swirl=t>=R.catch+8?(t-R.catch-8)/(R.release-R.catch-8):0;
 }
 if(stage==='after'){
  out.afterFrame=t<R.watch?-1:t<R.dust?0:t<R.settle?1+(Math.floor((t-R.dust)/5)%2):t<R.light?3:t<R.puff?4:5;
  out.tilt=-.05*Math.exp(-age/6)*Math.cos(age*.45);out.zoom=1+.06*Math.exp(-age/8);out.lift=22*(1-ease(age/40));
  out.shake=age<12?Math.sin(age*2.3)*(12-age)*.25:0;
  Object.assign(out,flightAt(age));
 }
 return out;
}
// Launched from where his body was at the snap: a corkscrew rise up and over CHAD, then a long glide into the night
// sky above the jet, shrinking to a twinkle. He keeps the held pose and keeps turning the same way, speeding up from
// the swing's rate, until his head comes up; then he flails (the 'free' frame) and tumbles.
const FLIGHT_SPIN=19.5,turns=[];
export function flightTurn(age) {
 const R=REDIRECT;
 if(!turns.length){const a0=heldAngle(R.release-1),r0=a0-heldAngle(R.release-2);let a=a0,up=-1;
  for(let k=0;k<R.flight;k++){a+=lerp(r0,FLIGHT_SPIN,ease(k/8));if(up<0&&a>=265)up=k;turns.push({a});}for(const x of turns)x.up=up;}
 return turns[Math.max(0,Math.min(turns.length-1,age))];
}
export function flightAt(age) {
 const R=REDIRECT,E=ENCOUNTER,apex=26,h0=heldAt(R.release-1),h1=heldAt(R.release-2),start=h0.com,ax=E.heroX-72,ay=68,vx=E.heroX-178,vy=58;
 if(age<0||age>=R.flight)return {airborne:false,glint:age>=R.flight-6&&age<R.flight+4,far:true};
 const {a:body,up}=flightTurn(age),held=age<up,since=age-up;
 const frame=held?h0.frame:since<5?'free':TUMBLE[Math.floor((since-5)/4)%6];
 // Canvas rotation: the held frame turns from its natural angle; the free and tumble frames stand upright at 0.
 const airAngle=held?-(body-HELD.angle[h0.frame])*Math.PI/180:-(body+90)*Math.PI/180;
 if(age<apex){
  // The swing's own momentum carries through the first ticks, bending into the rise.
  const u=age/apex,rise=1-Math.pow(1-u,2),r=12*(1-u),carry=(age+1)*Math.exp(-(age+1)/5);
  return {airborne:true,far:false,airX:lerp(start.x,ax,rise)+r*Math.sin(age*.5)+(h0.com.x-h1.com.x)*carry,
   airY:lerp(start.y,ay,rise)+r*.4*Math.sin(age*.5)+(h0.com.y-h1.com.y)*carry,airScale:1-.28*rise,airAngle,airFrame:frame,airHeld:held,glint:false};
 }
 const u=(age-apex)/(R.flight-6-apex),glide=ease(Math.min(1,u));
 return {airborne:age<R.flight-6,far:u>.35,airX:lerp(ax,vx,glide),airY:lerp(ay,vy,glide)-8*Math.sin(Math.PI*Math.min(1,u)),
  airScale:Math.max(.04,Math.pow(1-glide,2.3)*.68+.04),airAngle,airFrame:frame,airHeld:held,glint:age>=R.flight-6};
}
function drawHeld(ctx,art,h) {
 ctx.save();ctx.translate(h.fist.x,h.fist.y);ctx.rotate(h.rotate);
 if(h.frame==='lunge'){ctx.scale(-1,1);if(art.official)ctx.drawImage(art.official,6*320,0,320,224,-LUNGE.grip[0]/2,-LUNGE.grip[1]/2,160,112);}
 else if(art.official_held)ctx.drawImage(art.official_held,h.frame*448,0,448,448,-112,-112,224,224);
 ctx.restore();
}
// The official in CHAD's grip, with a smear of the last two positions while he is whipped round.
function drawHeldOfficial(ctx,tr,art) {
 const h=heldAt(tr.t);if(!h)return;
 if(tr.streetLayers?.effects!==false&&tr.t>=REDIRECT.catch+10)for(const [k,a] of [[2,.14],[1,.28]]){
  const g=heldAt(tr.t-k);if(!g||Math.abs(g.angle-h.angle)<4)continue;ctx.save();ctx.globalAlpha=a;drawHeld(ctx,art,g);ctx.restore();
 }
 drawHeld(ctx,art,h);
}
function drawTumble(ctx,art,p) {
 const s=.5*p.airScale;ctx.save();ctx.translate(Math.round(p.airX),Math.round(p.airY));ctx.rotate(p.airAngle);
 // Held frames are registered on the fist; draw them about the body centre, which is what flies.
 if(p.airHeld&&art.official_held){const [cx,cy]=HELD.com[p.airFrame];ctx.drawImage(art.official_held,p.airFrame*448,0,448,448,(-224-cx)*s,(-224-cy)*s,448*s,448*s);}
 else if(p.airFrame==='free'&&art.official_held)ctx.drawImage(art.official_held,5*448,0,448,448,-224*s,-224*s,448*s,448*s);
 else if(art.official_tumble)ctx.drawImage(art.official_tumble,(p.airFrame==='free'?0:p.airFrame)*192,0,192,192,-96*s,-96*s,192*s,192*s);
 ctx.restore();
}
// The swirl trail: the recent path of his body as a tapering ribbon of wind (held spiral, then the flight). The body
// centre steps when CHAD's hand changes pose, so the path is low-passed and drawn as a curve through the midpoints.
function rawTrailPoint(t) {
 const R=REDIRECT;if(t<R.release){const h=heldAt(t);return h&&t>=R.catch+8?{x:h.com.x,y:h.com.y,w:1}:null;}
 const f=flightAt(t-R.release);return f.airborne?{x:f.airX,y:f.airY,w:f.airScale}:null;
}
export function trailPoint(t) {
 const own=rawTrailPoint(t);if(!own)return null;let x=0,y=0,w=0,n=0;
 for(const [k,q] of [[-3,1],[-2,2],[-1,3],[0,4],[1,3],[2,2],[3,1]]){const p=rawTrailPoint(t+k);if(p){x+=p.x*q;y+=p.y*q;w+=p.w*q;n+=q;}}
 return {x:x/n,y:y/n,w:w/n};
}
function drawSwirlTrail(ctx,tr) {
 if(tr.streetLayers?.effects===false)return;
 const pts=[];for(let k=15;k>=0;k--){const p=trailPoint(tr.t-k);if(p)pts.push({...p,fade:1-k/16});}
 if(pts.length<3)return;
 ctx.save();ctx.lineCap='round';
 for(const [color,alpha,width] of [['#d9b98c',.5,9],['#fff4dc',.85,3.5]])for(let i=1;i<pts.length-1;i++){
  const a=pts[i-1],b=pts[i],c=pts[i+1],w=Math.min(a.w,b.w,c.w);
  ctx.globalAlpha=b.fade*alpha*Math.min(1,w*1.6);ctx.strokeStyle=color;ctx.lineWidth=Math.max(1,width*w*b.fade);
  ctx.beginPath();ctx.moveTo((a.x+b.x)/2,(a.y+b.y)/2);ctx.quadraticCurveTo(b.x,b.y,(b.x+c.x)/2,(b.y+c.y)/2);ctx.stroke();
 }
 ctx.restore();
}
function drawLaunchedOfficial(ctx,tr,art,behind) {
 const p=papersAt(tr.t);if(!p.release||p.far!==behind)return;
 const fx=tr.streetLayers?.effects!==false,age=tr.t-REDIRECT.release;
 if(p.airborne)drawSwirlTrail(ctx,tr);
 if(p.airborne)drawTumble(ctx,art,p);
 if(p.glint&&fx){
  const g=flightAt(REDIRECT.flight-7),k=age-(REDIRECT.flight-6),r=[1,2,4,5,4,3,2,1,1,0][Math.max(0,Math.min(9,k))];
  if(r){ctx.fillStyle='#fff3cf';ctx.fillRect(Math.round(g.airX)-r,Math.round(g.airY),r*2+1,1);ctx.fillRect(Math.round(g.airX),Math.round(g.airY)-r,1,r*2+1);
   if(r>2){ctx.fillStyle='#ffe0a0';ctx.fillRect(Math.round(g.airX)-1,Math.round(g.airY)-1,3,3);}}
 }
}
export function descentFrame(t) {
 return t<64?0:t<82?1:t<94?2:t<104?3:t<114?4:t<121?5:t<128?6:7;
}
// Catch freeze, contact flash and focus wedges (world space, on CHAD's gripping hand). `screen` is the canvas
// transform before the camera roll, so the wedges can be clipped below the HUD band.
function redirectionEffects(ctx,tr,front,screen) {
 if(tr.streetLayers?.effects===false)return;
 const p=papersAt(tr.t),E=ENCOUNTER,g=gripPoint(1),hx=g.x,hy=g.y;
 if(!front){
  // Everything but the two men dims for the frozen instant of the catch.
  if(p.freeze>0){ctx.fillStyle=`rgba(6,4,18,${.45*p.freeze})`;ctx.fillRect(E.heroX-400,-60,800,400);}
  return;
 }
 if(p.freeze>0){
  // Dense tapered speed wedges converging on the caught wrist, stopping short of the two men.
  ctx.save();const cur=ctx.getTransform();ctx.setTransform(screen);ctx.beginPath();ctx.rect(0,34,W,236);ctx.clip();ctx.setTransform(cur);
  ctx.fillStyle='#fff1d6';
  for(let i=0;i<40;i++){
   const a=i*2.39996+.4,r0=52+(i*37%40),r1=300,w=.012+(i*13%7)*.004,flick=((tr.t+i*3)%4)<2?1:.8;
   ctx.globalAlpha=(.12+(i%3)*.07)*p.freeze*flick;ctx.beginPath();
   ctx.moveTo(hx+Math.cos(a)*r0,hy+Math.sin(a)*r0*.82);
   ctx.lineTo(hx+Math.cos(a-w)*r1,hy+Math.sin(a-w)*r1*.82);ctx.lineTo(hx+Math.cos(a+w)*r1,hy+Math.sin(a+w)*r1*.82);ctx.closePath();ctx.fill();
  }
  ctx.restore();
 }
 if(p.flash>0){
  ctx.save();ctx.globalAlpha=p.flash;ctx.fillStyle='#fff6e0';
  for(let i=0;i<8;i++){const a=i*Math.PI/4,r=i%2?8:15;ctx.fillRect(Math.round(hx+Math.cos(a)*r)-1,Math.round(hy+Math.sin(a)*r)-1,3,3);}
  ctx.fillRect(hx-3,hy-3,7,7);ctx.restore();
 }
}
// CHAD's cigar (after sheet, facing left), smoking as it does everywhere (cigar_smoke.js), from the
// clock: lit at the Zippo in 4 (REDIRECT.light) with a drag, the exhale leaves his lips as he goes
// to 5 (REDIRECT.puff), then the lit end trickles. Points from his feet, measured on the 224x256
// cells (drawn mirrored at half size about 104,248): 4's Zippo flame, 5's ash end and lips.
const CIGAR={4:{tip:[-8,-80.5]},5:{tip:[-6.5,-80.5],mouth:[-3,-80]}};
function drawCigarSmoke(ctx,tr,x,y,frame,since) {
 if(!CIGAR[frame]||tr.streetLayers?.effects===false)return;
 const R=REDIRECT,T=R.light+since,lit=R.light+2;
 const at=b=>{const c=b<lit?null:CIGAR[b<R.puff?4:5];return c&&{tip:[x+c.tip[0],y+c.tip[1]],mouth:c.mouth&&[x+c.mouth[0],y+c.mouth[1]],face:-1};};
 drawCigarReplay(ctx,0,T,at,{drags:[[lit,R.puff-lit]],exhales:[R.puff],trickleEvery:9});
}
// Dropped forms: they flutter down from the catch and stay on the wet tarmac.
function drawForms(ctx,tr,since) {
 if(since<0||tr.streetLayers?.effects===false)return;
 const E=ENCOUNTER,g=gripPoint(1);
 for(let i=0;i<6;i++){
  const settle=70+i*9,age=Math.min(settle,since<14?since*.2:since-11),fall=age/settle,x0=g.x+18+(i-3)*5,y0=g.y+12+i%3*5,y1=E.y-2+i%3*3;
  const x=x0+age*(i%2?.3:.08)*(1-fall*.6)+Math.sin(age*.09+i)*6*(1-fall),y=y0+(y1-y0)*ease(fall);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(fall<1?Math.sin(age*.12+i)*1.1:(i-3)*.12);ctx.scale(1,fall<1?.5+.5*Math.abs(Math.sin(age*.1+i)):.5);
  ctx.fillStyle='#e9e0c8';ctx.fillRect(-3,-2,6,4);ctx.fillStyle='#9b8f76';ctx.fillRect(-3,1,6,1);ctx.restore();
 }
}
// Two quick dust puffs off his palms while he brushes his hands clean.
function drawDustOff(ctx,tr,x,y) {
 const since=tr.t-REDIRECT.dust;if(since<0||since>=REDIRECT.settle-REDIRECT.dust+12||tr.streetLayers?.effects===false)return;
 ctx.save();ctx.fillStyle='#d8c9ae';
 for(let i=0;i<10;i++){
  const burst=Math.floor(since/10),age=since-burst*10,k=(i+burst*3)%10;if(burst>2)continue;
  ctx.globalAlpha=.55*(1-age/10);
  ctx.fillRect(Math.round(x-18+(k%5-2)*2.5-age*(.2+k%3*.15)*(k%2?1:-1)),Math.round(y-53-age*.35-(k>>1)%3),1+(k%2),1+(k%2));
 }
 ctx.restore();
}
export function groundShadow(ctx,x,y,r) {drawContactShadow(ctx,x,y,r);}
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
// Kesarganj night life, in scene coordinates of the generated plate: lamps, moths, runway lights and ground mist.
const KESARGANJ={lamps:[[782,133],[860,133],[1139,133],[328,151],[532,151],[1232,103]],tubes:[[939,122],[1088,127]],runway:[[61,129],[131,129],[170,129],[214,129]],signals:[[376,86,'#ff4a3a'],[477,91,'#58ff8a']]};
export function drawAirportEnvironment(ctx,tr,art,india=false) {
 const width=india?1280:960,key=india?'arrival_terminal':'private_apron';
 ctx.fillStyle=india?'#120c22':'#35234b';ctx.fillRect(0,0,width,270);
 if(tr.streetLayers?.architecture!==false){imageAt(ctx,art,art[key]?key:india?'india':'apron',0,0,width,270);imageAt(ctx,art,key+'_ground',0,0,width,270);}
 if(tr.streetLayers?.effects===false)return;
 const t=tr.animT;
 if(india){
  ctx.save();ctx.globalCompositeOperation='screen';
  // Warm lamp breathing and a faint pool of light; never a crossfade of opaque scenery.
  for(const [i,[x,y]] of KESARGANJ.lamps.entries()){
   const f=.1+.05*Math.sin(t*.09+i*1.7)+.03*Math.sin(t*.31+i);
   const g=ctx.createRadialGradient(x,y,1,x,y,16);g.addColorStop(0,`rgba(255,190,100,${f})`);g.addColorStop(1,'rgba(255,150,60,0)');ctx.fillStyle=g;ctx.fillRect(x-16,y-16,32,32);
  }
  // Fluorescent tubes stutter; moths circle them.
  for(const [i,[x,y]] of KESARGANJ.tubes.entries()){
   const off=(t+i*97)%260<6&&(t>>1)%2;ctx.fillStyle=`rgba(210,240,255,${off?0:.22})`;ctx.fillRect(x-9,y,18,1);
   ctx.fillStyle='#fff0c8';
   for(let m=0;m<6;m++){const a=t*(.07+m*.013)+m*1.9,r=5+m%3*3;ctx.globalAlpha=.55+.35*Math.sin(t*.5+m);ctx.fillRect(Math.round(x+Math.cos(a)*r*1.4),Math.round(y+4+Math.sin(a*1.3)*r*.7),1,1);}
   ctx.globalAlpha=1;
  }
  for(const [i,[x,y]] of KESARGANJ.runway.entries()){ctx.fillStyle=`rgba(255,200,120,${.25+.2*Math.sin(t*.05+i*.8)})`;ctx.fillRect(x-1,y-1,3,2);}
  for(const [x,y,c] of KESARGANJ.signals){ctx.globalAlpha=.3+.15*Math.sin(t*.04+x);ctx.fillStyle=c;ctx.fillRect(x-1,y-1,3,3);}
  ctx.globalAlpha=1;ctx.restore();
  // Low humid mist drifting over the fields behind the boundary wall.
  for(let i=0;i<7;i++){const x=((i*211+t*.08)%1480)-100,y=146+(i%3)*5;ctx.fillStyle=`rgba(150,140,190,${.05+.02*(i%2)})`;ctx.fillRect(Math.round(x),y,110+i%3*30,4);ctx.fillRect(Math.round(x+18),y-2,70,2);}
  // Wet tarmac catches glints under the terminal lamps.
  for(let i=0;i<9;i++){ctx.globalAlpha=.06+.05*Math.sin(t*.021+i*1.3);ctx.fillStyle='#ffc57a';ctx.fillRect(700+i*57,214+(i%4)*9,9+(i%3)*5,1);}ctx.globalAlpha=1;
 } else {
  ctx.fillStyle='#eac481';
  for(let i=0;i<8;i++){const x=75+i*141;ctx.globalAlpha=.18+.08*Math.sin(t*.023+i);ctx.fillRect(x,126,2,2);}ctx.globalAlpha=1;
  ctx.save();ctx.translate(912,132);ctx.rotate(Math.sin(t*.045)*.06);ctx.fillStyle='#dd8757';ctx.fillRect(0,0,14,3);ctx.fillStyle='#dbc4a0';ctx.fillRect(4,0,3,3);ctx.fillRect(10,0,3,3);ctx.restore();
 }
}
function staff(ctx,tr,art,india) {
 if(india||tr.streetLayers?.actors===false)return;
 const t=tr.airport?.clock??tr.t;
 if(!india){
  const poses=departureStaffAt(tr);
  frameAt(ctx,art.attendant_service,poses.attendant,224,200,DEPARTURE_JET.attendantX,DEPARTURE_JET.attendantY,.47);
  return;
 }
}
export function waitingOfficialAt(tr) {
 if(tr.phase==='landing')return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:0,visible:true};
 if(tr.phase==='disembark')return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:tr.t<60?0:1,visible:true};
 const p=papersAt(tr.t);
 if(p.stage==='lunge')return {x:p.officialX,y:ENCOUNTER.y,frame:p.officialFrame,visible:tr.phase==='papers'&&tr.t<REDIRECT.reach};
 return {x:ENCOUNTER.officialX,y:ENCOUNTER.y,frame:tr.t<44?3:tr.t<126?2:0,visible:tr.phase==='papers'&&p.stage==='wait'};
}
export function drawWaitingOfficial(ctx,tr,art) {
 const p=waitingOfficialAt(tr);if(!p.visible||tr.streetLayers?.actors===false)return;
 groundShadow(ctx,p.x-(p.frame>=5?14:0),p.y,p.frame>=5?30:20);
 ctx.save();ctx.translate(p.x,p.y);ctx.scale(-1,1);frameAt(ctx,art.official,p.frame,320,224,0,0,.5,96,216);ctx.restore();
}
// CHAD's follow-through (after sheet), facing left toward where the official vanished.
function drawAfterPose(ctx,tr,art,frame,since) {
 if(!art.chad_redirect_after)return;
 ctx.save();ctx.translate(ENCOUNTER.heroX,ENCOUNTER.y);ctx.scale(-1,1);frameAt(ctx,art.chad_redirect_after,frame,224,256,0,0,.5,104,248);ctx.restore();
 drawCigarSmoke(ctx,tr,ENCOUNTER.heroX,ENCOUNTER.y,frame,since);
}
// Arrival exit: CHAD holds his cigar pose where the papers scene left him until the player moves him.
// Released in the update, so a scrubbed or replayed render never changes it.
export function releaseArrivalHold(tr){
 const a=tr.airport,still=Math.abs(tr.x-ENCOUNTER.heroX)<.01&&Math.abs(tr.y-ENCOUNTER.y)<.01&&!tr.actor.z;
 if(a?.hold&&(!still||tr.actor.state!=='idle'))a.hold=false;
}
function drawArrivalHero(ctx,tr,art,hero) {
 const a=tr.airport;
 if(a?.hold&&tr.streetLayers?.actors!==false){groundShadow(ctx,ENCOUNTER.heroX,ENCOUNTER.y,15);drawAfterPose(ctx,tr,art,5,tr.t+460-REDIRECT.light);}
 else hero(ctx,tr,tr.x,tr.y);
}
export function drawAirport(ctx,tr,art,{hero,prompt,label}) {
 const india=['disembark','papers','arrival-exit'].includes(tr.phase),cam=tr.cam||0;
 ctx.save();const screen=ctx.getTransform();
 if(tr.phase==='papers'&&tr.streetLayers?.effects!==false){
  // Change of scenery: the whole view rolls and pushes in around CHAD while the official is turned over.
  const p=papersAt(tr.t),px=ENCOUNTER.heroX-cam,py=ENCOUNTER.y-110;
  ctx.fillStyle='#0b0816';ctx.fillRect(0,0,W,270);if(p.tilt||p.zoom!==1){ctx.translate(px,py);ctx.rotate(p.tilt);ctx.scale(p.zoom,p.zoom);ctx.translate(-px,-py);}
  // The camera also rises with the body swung overhead, keeping him clear of the HUD band.
  ctx.translate(p.shake,Math.round(p.lift));
 }
 ctx.translate(-cam,0);drawAirportEnvironment(ctx,tr,art,india);
 if(tr.phase==='papers')drawLaunchedOfficial(ctx,tr,art,true);
 let open=tr.phase==='jet-board'?1-ease((tr.t-148)/29):tr.phase==='disembark'?ease(tr.t/25):1;
 // Kesarganj: CHAD may walk behind the parked jet, so the aircraft is drawn after him there.
 const behindJet=tr.phase==='arrival-exit'&&tr.y<JET_GROUND;
 if(behindJet)drawArrivalHero(ctx,tr,art,hero);
 if(india)drawDepartureJet(ctx,art,{...JET,open,night:true,reflect:true});else drawDepartureJet(ctx,art,{open});
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
   if(down&&art.departure_jet_open){ctx.save();ctx.beginPath();ctx.moveTo(747,160);ctx.lineTo(727,222);ctx.lineTo(722,226);ctx.lineTo(743,163);ctx.closePath();ctx.clip();imageAt(ctx,art,art.arrival_jet_open?'arrival_jet_open':'departure_jet_open',JET.x,JET.y,JET.w,JET.h);ctx.restore();}
   else if(!down&&art.departure_jet_open){ctx.save();ctx.beginPath();ctx.moveTo(814,160);ctx.lineTo(794,222);ctx.lineTo(789,226);ctx.lineTo(810,163);ctx.closePath();ctx.clip();imageAt(ctx,art,'departure_jet_open',330,20,600,208);ctx.restore();}
  }
 } else if(tr.phase==='papers') {
  const p=papersAt(tr.t),actors=tr.streetLayers?.actors!==false;
  redirectionEffects(ctx,tr,false,screen);
  drawForms(ctx,tr,tr.t-REDIRECT.catch);
  if(actors){
   drawWaitingOfficial(ctx,tr,art);
   if(p.held)drawSwirlTrail(ctx,tr);
   if(p.held)drawHeldOfficial(ctx,tr,art);
   if(p.afterFrame>=0||p.spin)groundShadow(ctx,ENCOUNTER.heroX,ENCOUNTER.y,15);
   if(p.afterFrame>=0)drawAfterPose(ctx,tr,art,p.afterFrame,tr.t-REDIRECT.light);
   else if(p.spin&&art.chad_redirect)frameAt(ctx,art.chad_redirect,p.frame,320,256,ENCOUNTER.heroX,ENCOUNTER.y,.5,160,248);
   else hero(ctx,tr,tr.actor.x,tr.actor.y);
   if(p.afterFrame>=1&&p.afterFrame<=3)drawDustOff(ctx,tr,ENCOUNTER.heroX,ENCOUNTER.y);
   drawLaunchedOfficial(ctx,tr,art,false);
  }
  redirectionEffects(ctx,tr,true,screen);
 } else if(tr.phase==='arrival-exit'){
  drawForms(ctx,tr,400);
  if(!behindJet)drawArrivalHero(ctx,tr,art,hero);
 } else if(tr.phase!=='apron-arrival'||tr.t>=30)hero(ctx,tr,tr.x,tr.y);
 if(tr.streetLayers?.effects!==false){ctx.fillStyle=tr.animT%70<8?'#ffbca2':'#722921';ctx.fillRect(india?JET.x+8:338,177,2,1);}
 ctx.restore();
 if(tr.phase==='apron'&&tr.airport?.greeted){const age=tr.airport.clock-tr.airport.greetingAt;drawDialogue(ctx,{text:'Welcome aboard, sir.',x:DEPARTURE_JET.attendantX-cam,bottom:126,age,remaining:180-age});}
 if(tr.phase==='disembark'&&tr.t>=100&&tr.t<148)drawDialogue(ctx,{text:'HALT!',x:ENCOUNTER.officialX-cam,bottom:142,age:tr.t-100,remaining:148-tr.t,width:130});
 if(tr.phase==='papers'){const speech=papersDialogue(tr.t);if(speech)drawDialogue(ctx,{text:speech.text,x:ENCOUNTER.officialX-cam,bottom:142,age:tr.t-speech.start,remaining:speech.end-tr.t,width:198});}
 label(ctx,india?'KESARGANJ AIRSTRIP':'PRIVATE AVIATION',india?'INDIA':'DESTINATION: INDIA');
 if(['apron','arrival-exit'].includes(tr.phase)){
  const target=india?AIRPORT.exitX:AIRPORT.boardX,x=target-cam,onscreen=x>28&&x<W-28;
  // At the door the prompt takes over; walking up to it the marker rides above CHAD's head, never on his body.
  const atDoor=india&&nearArrivalExit(tr),close=india&&Math.abs(tr.x-target)<60&&tr.y<AIRPORT.exitY+40;
  if(!atDoor)drawDirectionArrow(ctx,{x:clamp(x,26,W-26),y:india?(close?Math.min(173,tr.y-108):173):183,direction:onscreen?'down':x<28?'left':'right',size:29,time:tr.animT});
  if(india?nearArrivalExit(tr):nearJet(tr))prompt(ctx,india?'F / LB: EXIT':'F / LB: BOARD JET');
 }
 if(tr.phase==='apron-arrival'){ctx.fillStyle=`rgba(0,0,0,${ease((tr.t-20)/9)*(1-ease((tr.t-32)/15))})`;ctx.fillRect(0,0,480,270);}
}
