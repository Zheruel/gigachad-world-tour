// Occupied chairs belong to the authored desks. Their workers physically rise into combat.
import { G, W, clamp, laneMin } from './engine.js';
import { ASSETS } from './assets.js';
import { spawnEnemy } from './enemies.js';
import { drawContactShadow } from './contact_shadow.js';
// Keyboard/chair centres are authored against each actual desk, not a repeated
// evenly spaced crowd strip. y is the casters/boot floor plane behind the aisle.
export const OFFICE_SEATS=[
 [[213,399,630],203],[[262,519,676],184],
 [[177,407,641],183],[[200,413,614],176],
];
const TYPES=['ic_headset','ic_operator','ic_thrower'];
function office(){
 const s=G.india;if(G.stage.id!=='refund'||!s)return [];
 return s.office||[];
}
export function initOfficeWorkers(id,x=0){if(G.india)G.india.office=id==='refund'?OFFICE_SEATS.flatMap(([xs,y],i)=>xs.map((n,row)=>({x:i*810+n,y,row,kind:TYPES[row],face:-1,phase:i*810+n<x-120?'gone':'working',t:0}))):[];}
export function alarmOfficeWorkers(t){
 for(const n of office())if(n.x<810&&t>=120+Math.round((n.x-150)/15))n.alarmed=true;
}
export function queueOfficeWorker(type){
 const s=G.india;if(G.stage.id!=='refund'||!s)return false;
 const node=office().find(n=>n.kind===type&&n.phase==='working'&&n.x>G.camX+35&&n.x<G.camX+W-45);
 if(!node)return false;node.phase='rising';node.t=0;node.face=G.player.x<node.x?-1:1;
 node.exitX=clamp(node.x+node.face*32,G.camX+18,G.camX+W-18);
 s.pendingEntries=(s.pendingEntries||0)+1;return true;
}
export function updateOfficeWorkers(){
 const s=G.india;if(G.stage.id!=='refund'||!s)return;
 if(!s.office)initOfficeWorkers(G.stage.id,G.player.x);
 for(const node of office()){
  if(node.phase!=='rising')continue;node.t++;
  if(node.t===1)G.audio.roomSfx('room_page',.2);
  if(node.t===36)G.audio.roomSfx('entrance_boot',.25);
  if(node.t>=70){
   const x=node.exitX??node.x+node.face*32,e=spawnEnemy(node.kind,x,laneMin(x)+2);e.state='idle';e.atkCd=35;e.face=G.player.x<x?-1:1;
   node.phase='gone';s.pendingEntries=Math.max(0,(s.pendingEntries||1)-1);
  }
 }
}
export function officeWorkerPose(n){
 const t=n.phase==='rising'?n.t:0;
 const chairY=n.y+4*(n.phase==='gone'?1:clamp(t/18,0,1));
 if(n.phase==='gone')return{chairY,actor:null};
 if(n.phase==='working')return{chairY:n.y,actor:{x:n.x,y:n.y,pose:'seated'}};
 if(t<30)return{chairY,actor:{x:n.x,y:n.y,pose:'rise',frame:Math.floor(t/6)}};
 const exitX=n.exitX??n.x+n.face*32;
 // Clear the side of the seat first; the second step enters the foreground
 // aisle. No actor walks through the chair back or slides opposite his gait.
 const x=n.x+(exitX-n.x)*clamp((t-30)/12,0,1),y=n.y+(laneMin(exitX)+2-n.y)*clamp((t-42)/22,0,1);
 if(t<36)return{chairY,actor:{x,y,pose:'rise',frame:5}};
 if(t>=64)return{chairY,actor:{x,y,pose:'rise',frame:t<67?6:7}};
 return{chairY,actor:{x,y,pose:'walk',frame:Math.floor((t-36)/3)%8}};
}
export function drawOfficeWorkers(ctx,camX,frame,actor){
 const s=G.india;if(G.stage.id!=='refund'||!s)return;
 for(const n of office()){
  const x=n.x-camX;if(x < -90||x>W+90)continue;
  const pose=officeWorkerPose(n),a=pose.actor;
  const drawChair=()=>{const im=ASSETS.ic_office_chair;if(s.review?.chairs!==false&&im)ctx.drawImage(im,Math.round(x-32),Math.round(pose.chairY-56+3),64,56);};
  const drawWorker=()=>{
   if(s.review?.workers===false||!a)return;
   if(n.phase==='rising'&&n.t>=30)drawContactShadow(ctx,a.x-camX,a.y,12,0,.9);
   if(a.pose==='walk'){actor(ctx,n.kind,'walk',a.frame,a.x-camX,a.y,n.face);return;}
   const alert=n.alarmed||G.waveActive&&Math.abs(G.player.x-n.x)<400;
   const key=a.pose==='seated'?'ic_office_life':'ic_office_stand';
   const index=a.pose==='seated'?n.row*4+(alert?3:Math.floor((s.t+n.x)/18)%3):n.row*8+a.frame;
   ctx.save();ctx.translate(Math.round(a.x-camX),Math.round(a.y));ctx.scale(n.face,1);
   frame(ctx,key,index,0,4,144,118,a.pose==='seated'?4:8,3);ctx.restore();
  };
  // The backrest occludes a seated worker through its real silhouette. As his
  // boots pass the chair into the aisle, their depth ordering changes naturally.
  if(a&&a.y<=pose.chairY){drawWorker();drawChair();}else{drawChair();drawWorker();}
 }
}
