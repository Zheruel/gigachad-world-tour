// Occupied chairs belong to the authored desks. Their workers physically rise into combat.
import { G, W, clamp, laneMin } from './engine.js';
import { ASSETS } from './assets.js';
import { spawnEnemy } from './enemies.js';
import { drawContactShadow } from './contact_shadow.js';
import { getAIFrame } from './aiframes.js';
import { refundGaitContactDistance, refundGaitFrame } from './refund_gait.js';
import { REFUND_ESCAPE_BEATS } from './refund_escape_data.js';
import { initRefundLife, updateRefundLife, refundRoomCue } from './refund_life.js';
import { drawCallbackSeat } from './refund_intro.js';
// Keyboard/chair centres are authored against each actual desk, not a repeated
// evenly spaced crowd strip. y is the casters/boot floor plane behind the aisle.
export { REFUND_SEATS as OFFICE_SEATS } from './refund_layout.js';
import { REFUND_SEATS as OFFICE_SEATS } from './refund_layout.js';
const TYPES=['ic_headset','ic_operator','ic_thrower'];
const ESCAPE_SPEED=4.2;
export function officeEscapePose(row,t){
 const beat=REFUND_ESCAPE_BEATS[row],distance=Math.max(0,t)*ESCAPE_SPEED;
 let at=distance%beat.reduce((sum,n)=>sum+n,0),frame=0;
 while(at>=beat[frame])at-=beat[frame++];
 return{distance,frame,pin:frame%8<=4?at:0};
}
// Four typing/rest poses, two headset poses, and two aisle reactions.
// The callers have different work/rest rhythms rather than a synchronized crowd strip.
const SEATED_ROUTINES=[
 [[0,11],[1,9],[2,10],[1,9],[0,12],[2,10],[3,30],[4,12],[5,66],[4,12],[3,30],[0,12]],
 [[0,8],[2,10],[1,8],[2,9],[0,11],[1,9],[3,25],[0,9],[2,10],[4,10],[5,30],[4,10],[3,24]],
 [[0,16],[1,14],[2,12],[1,14],[3,46],[0,16],[2,12],[1,14],[4,14],[5,38],[4,14],[3,44]],
];
const routineLength=r=>r.reduce((sum,[,ticks])=>sum+ticks,0);
export function officeSeatedFrame(n,t=G.india?.t||0){
 if((n.alert||0)>0)return n.alert>44?7:6;
 if(n.callAt!=null&&t-n.callAt>=18&&t-n.callAt<92)return t-n.callAt<30||t-n.callAt>=80?4:5;
 // An alerted caller occasionally checks the aisle even during a quiet beat.
 const clock=t+(n.seed??n.x);
 if(n.alarmed&&clock%251<30)return 6;
 const routine=SEATED_ROUTINES[n.row],speed=1+((n.seed??n.x)%3)*.08;
 let at=Math.floor(clock*speed)%routineLength(routine);
 for(const [frame,ticks]of routine){if(at<ticks)return frame;at-=ticks;}
 return 0;
}
function office(){
 const s=G.india;if(G.stage.id!=='refund'||!s)return [];
 return s.office||[];
}
export function initOfficeWorkers(id,x=0){
 if(!G.india)return;
 G.india.office=id==='refund'?OFFICE_SEATS.flatMap(([xs,y],i)=>xs.map((n,row)=>({x:i*810+n+24,keyboardX:i*810+n,y,row,kind:TYPES[row],face:-1,workFace:-1,
  seed:i*137+row*83+n,phase:i*810+n<x-120||(i===0&&G.india.refundBreachDone)?'gone':'working',t:0,alert:0,ready:0,alarmed:false,chairDx:i===0&&G.india.refundBreachDone?(row===0?26:8):0,leftAt:i*810+n<x-120?0:null}))):[];
 initRefundLife(id,x);
}
export function alarmOfficeWorkers(t){
 for(const n of office())if(n.x<810&&t>=120+Math.round((n.x-150)/15)&&!n.alarmed){n.alarmed=true;n.alertAt=t;}
 // Intro alarm moves through the room; it settles before the callers stand.
 for(const n of office())if(n.alertAt!=null)n.alert=Math.max(0,88-(t-n.alertAt));
 updateRefundLife();
}
// The intro owns the desk-one caller (n.scripted); the rest freeze at alertAt and run from fleeAt.
export function updateOfficeEvacuation(t,alertAt=120,fleeAt=130){
 for(const n of office()){
  if(n.x>=810||n.scripted)continue;
  const at=fleeAt+n.row*24;
  if(t<at){n.alert=t>=alertAt?72:0;continue;}
  if(n.phase==='gone')continue;
  n.phase='evacuating';n.t=t-at;n.face=1;
  n.chairDx=8*clamp(n.t/26,0,1);
  if(n.t>=46&&officeEscapePose(n.row,n.t-46).distance>=880-n.x-8){n.phase='gone';n.leftAt=t;}
 }
 updateRefundLife();
}
export function queueOfficeWorker(type){
 const s=G.india;if(G.stage.id!=='refund'||!s)return false;
 const node=office().find(n=>n.kind===type&&n.phase==='working'&&n.x>G.camX+35&&n.x<G.camX+W-45);
 if(!node)return false;node.phase='rising';node.t=0;node.face=G.player.x<node.x?-1:1;
 node.exitX=clamp(node.x+node.face*32,G.camX+18,G.camX+W-18);
 s.pendingEntries=(s.pendingEntries||0)+1;return true;
}
export function updateOfficeWorkers(){
 const s=G.india;if(G.stage.id!=='refund'||!s||G.paused||G.state!=='play'||s.cinematic||s.endingDone)return;
 if(!s.office)initOfficeWorkers(G.stage.id,G.player.x);
 updateRefundLife();
 for(const node of office()){
  if(node.phase==='working'){
   node.alert=Math.max(0,(node.alert||0)-1);
   const attack=['windup','attack','charge','special','super','hook','kick'].includes(G.player.state)&&Math.abs(G.player.x-node.x)<165;
   const impact=(G.effects||[]).some(e=>['spark','boxingImpact','koBurst','propChunk'].includes(e.type)&&e.t<5&&Math.abs(e.x-node.x)<155);
   const enemy=G.enemies.some(e=>!e.dead&&Math.abs(e.x-node.x)<145&&['windup','attack','charge'].includes(e.state));
   if(s.t>=node.ready&&(attack||impact||enemy)){node.alert=72;node.alarmed=true;node.ready=s.t+170;}
   const workPose=officeSeatedFrame(node);
   if(node.row===2&&workPose===5&&node.lastPose!=null&&node.lastPose!==5&&s.t>(s.refundLife?.nextDeskCue||0)&&
    refundRoomCue('refund_terminal',node.x,.12))s.refundLife.nextDeskCue=s.t+24;
   node.lastPose=workPose;
   // Short quiet keyboard bursts follow the animated hands and never play from empty seats.
   if(node.alert===0&&s.review?.ambient!==false&&s.t>(s.refundLife?.nextDeskCue||0)&&workPose<3&&
    (s.t+node.seed)%(62+node.seed%23)===0&&refundRoomCue('room_pen',node.x,.2,1+(node.seed%5-2)*.015))s.refundLife.nextDeskCue=s.t+12;
  }
  if(node.phase!=='rising')continue;node.t++;
  if(node.t===1)refundRoomCue('room_chair',node.x,.19);
  if(node.t===36)refundRoomCue('entrance_boot',node.x,.2);
  if(node.t>=70){
   const x=node.exitX??node.x+node.face*32,e=spawnEnemy(node.kind,x,laneMin(x)+2);e.state='idle';e.atkCd=35;e.face=G.player.x<x?-1:1;
   node.phase='gone';node.leftAt=s.t;s.pendingEntries=Math.max(0,(s.pendingEntries||1)-1);
  }
 }
}
export function officeWorkerPose(n){
 const t=['rising','evacuating'].includes(n.phase)?n.t:0;
 const chairY=n.y+4*(n.phase==='gone'?1:clamp(t/18,0,1));
 if(n.phase==='gone')return{chairY,actor:null};
 if(n.phase==='working')return{chairY:n.y,actor:{x:n.x,y:n.y,pose:'seated',face:n.workFace}};
 if(n.phase==='evacuating'){
  if(t<26)return{chairY,actor:{x:n.x,y:n.y,pose:'rise',frame:Math.min(4,Math.floor(t/5)),face:n.workFace}};
  if(t<38)return{chairY,actor:{x:n.x,y:n.y,pose:'panic-turn',frame:Math.floor((t-26)/3),face:1}};
  const y=n.y+(221-n.y)*clamp((t-38)/8,0,1);
  const run=officeEscapePose(n.row,t-46);
  return{chairY,actor:{x:n.x+8+run.distance,y,pose:t<46?'flee':'escape',frame:t<46?2:run.frame,pin:run.pin,face:1}};
 }
 if(t<30)return{chairY,actor:{x:n.x,y:n.y,pose:'rise',frame:Math.floor(t/6),face:n.workFace}};
 const exitX=n.exitX??n.x+n.face*32;
 const turning=n.face!==(n.workFace??-1),walkAt=turning?42:36;
 if(turning&&t<42)return{chairY,actor:{x:n.x,y:n.y,pose:'turn',frame:Math.floor((t-30)/2),face:1}};
 // Clear the side of the seat first; the second step enters the foreground
 // aisle. No actor walks through the chair back or slides opposite his gait.
 const exitY=laneMin(exitX)+2;
 const x=n.x+(exitX-n.x)*clamp((t-walkAt)/(63-walkAt),0,1),y=n.y+(exitY-n.y)*clamp((t-42)/21,0,1);
 if(t<36)return{chairY,actor:{x,y,pose:'rise',frame:5,face:n.workFace}};
 if(t>=64)return{chairY,actor:{x,y,pose:'rise',frame:t<67?6:7}};
 const count=getAIFrame(n.kind,'walk')?.f.length||12;
 // Fit this short authored exit to the nearest grounded stance. The final
 // walking pose has both boots planted before the settled combat guard.
 const exitDistance=Math.hypot(exitX-n.x,exitY-n.y),endDistance=refundGaitContactDistance(n.kind,exitDistance);
 const distance=Math.hypot(x-n.x,y-n.y)*(exitDistance?endDistance/exitDistance:1);
 return{chairY,actor:{x,y,pose:'walk',frame:refundGaitFrame(n.kind,distance,false,count)}};
}
export function drawOfficeWorkers(ctx,camX,frame,actor){
 const s=G.india;if(G.stage.id!=='refund'||!s)return;
 for(const n of office()){
  const x=n.x-camX;if(x < -90||x>W+90)continue;
  const pose=officeWorkerPose(n),a=pose.actor;
  const drawChair=(near=false)=>{const im=ASSETS.ic_office_chair;if(s.review?.chairs===false||!im)return;
   const face=n.workFace??-1;ctx.save();ctx.translate(Math.round(x-face*14+(n.chairDx||0)),Math.round(pose.chairY));ctx.scale(face,1);
   if(near){
    // Only the near armrest crosses the body. The backrest and cushion must
    // stay behind the posterior and thighs so the seat is visibly occupied.
    const sx=4,sy=31,sw=32,sh=11;
    ctx.drawImage(im,sx,sy,sw,sh,-17+sx/im.width*34,-49+sy/im.height*50,sw/im.width*34,sh/im.height*50);
   }else ctx.drawImage(im,-17,-49,34,50);
   ctx.restore();};
  const drawWorker=()=>{
   if(s.review?.workers===false||!a)return;
   if(['rising','evacuating'].includes(n.phase)&&n.t>=30)drawContactShadow(ctx,a.x-camX,a.y,12,0,.9);
   if(a.pose==='flee'){
    ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));
    if(!frame(ctx,'ic_office_flee_'+['caller','operator','technician'][n.row],a.frame,0,4,180,150,4,3))actor(ctx,n.kind,'walk',Math.floor(n.t/4)%20,0,0,1);
    ctx.restore();return;
   }
   if(a.pose==='walk'){actor(ctx,n.kind,'walk',a.frame,a.x-camX,a.y,n.face);return;}
   if(a.pose==='escape'){
    ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));
    const key='ic_office_escape_'+['caller','operator','technician'][n.row],base=ASSETS[key+'_body'],leg=ASSETS[key+'_support'];
    if(a.pin>0&&base&&leg){
     // The generated support leg follows its planted boot while the upper
     // body advances. The free leg keeps its authored swing unchanged.
     const sx=a.frame%4*360,sy=Math.floor(a.frame/4)*300;
     for(let y=224;y<300;y+=2){
      const dx=-Math.round(a.pin*clamp((y-224)/(293-224),0,1));
      ctx.drawImage(leg,sx,sy+y,360,2,-90+dx,-146+y/2,180,1);
     }
     frame(ctx,key+'_body',a.frame,0,4,180,150,4,4);
    }else if(!frame(ctx,key,a.frame,0,4,180,150,4,4))actor(ctx,n.kind,'walk',Math.floor(n.t/4)%20,0,0,1);
    ctx.restore();return;
   }
   if(a.pose==='panic-turn'){
    ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));
    if(!frame(ctx,'ic_office_panic_turn',n.row*4+a.frame,0,4,180,150,4,3)){
     ctx.scale(a.frame<2?n.workFace:1,1);frame(ctx,'ic_office_stand',n.row*8+5,0,4,180,150,8,3);
    }
    ctx.restore();return;
   }
   if(a.pose==='turn'){
    ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));
    if(!frame(ctx,'ic_office_turn',n.row*6+a.frame,0,4,180,150,6,3)){
     ctx.scale(a.frame<3?n.workFace:n.face,1);frame(ctx,'ic_office_stand',n.row*8+5,0,4,180,150,8,3);
    }
    ctx.restore();return;
   }
   const room=Math.floor(n.keyboardX/810),height=room===0?'high':'medium';
   const typed=`ic_office_life_${height}`;
   const key=a.pose==='seated'?(ASSETS[typed]?typed:'ic_office_life'):'ic_office_stand';
   const upgraded=ASSETS[key]?.height===900;
   const seatedFrame=officeSeatedFrame(n),cols=a.pose==='seated'&&!upgraded?4:8;
   const index=n.row*cols+(a.pose==='seated'?(upgraded?seatedFrame:[0,1,0,1,2,2,3,3][seatedFrame]):a.frame);
   ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));ctx.scale(a.face??n.face,1);
   frame(ctx,key,index,0,4,upgraded?180:144,upgraded?150:118,cols,3);ctx.restore();
  };
  drawChair();
  // During the intro the scripted caller sits in this chair until his own cord yanks him out.
  if(n.scripted&&G.state==='intro')drawCallbackSeat(ctx,camX);else drawWorker();
  if(a&&a.y<=pose.chairY)drawChair(true);
 }
}
