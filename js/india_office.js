// Occupied chairs belong to the authored desks. Their workers physically rise into combat.
import { G, W, clamp, laneMin } from './engine.js';
import { ASSETS } from './assets.js';
import { spawnEnemy } from './enemies.js';
const ROWS=[[[184,405,626],200],[[214,407,601],181],[[171,353,579],181],[[129,308,491],174]];
const TYPES=['ic_headset','ic_operator','ic_thrower'];
function office(){
 const s=G.india;if(G.stage.id!=='refund'||!s)return [];
 return s.office||[];
}
export function initOfficeWorkers(id,x=0){if(G.india)G.india.office=id==='refund'?ROWS.flatMap(([xs,y],i)=>xs.map((n,row)=>({x:i*810+n,y,row,kind:TYPES[row],phase:i*810+n<x-120?'gone':'working',t:0}))):[];}
export function alarmOfficeWorkers(t){
 for(const n of office())if(n.x<810&&t>=120+Math.round((n.x-150)/15))n.alarmed=true;
}
export function queueOfficeWorker(type){
 const s=G.india;if(G.stage.id!=='refund'||!s)return false;
 const node=office().find(n=>n.kind===type&&n.phase==='working'&&n.x>G.camX+35&&n.x<G.camX+W-45);
 if(!node)return false;node.phase='rising';node.t=0;s.pendingEntries=(s.pendingEntries||0)+1;return true;
}
export function updateOfficeWorkers(){
 const s=G.india;if(G.stage.id!=='refund'||!s)return;
 if(!s.office)initOfficeWorkers(G.stage.id,G.player.x);
 for(const node of office()){
  if(node.phase!=='rising')continue;node.t++;
  if(node.t===1)G.audio.roomSfx('room_page',.2);
  if(node.t===48)G.audio.roomSfx('entrance_boot',.25);
  if(node.t>=70){
   const x=node.x+32,e=spawnEnemy(node.kind,x,laneMin(x)+2);e.state='idle';e.atkCd=35;e.face=G.player.x<x?-1:1;
   node.phase='gone';s.pendingEntries=Math.max(0,(s.pendingEntries||1)-1);
  }
 }
}
export function drawOfficeWorkers(ctx,camX,frame,actor){
 const s=G.india;if(G.stage.id!=='refund'||!s)return;
 for(const n of office()){
  const x=n.x-camX;if(x < -90||x>W+90)continue;
  if(n.phase==='working'){
   const alert=n.alarmed||G.waveActive&&Math.abs(G.player.x-n.x)<400;
   frame(ctx,'ic_office_life',n.row*4+(alert?3:Math.floor((s.t+n.x)/18)%3),x,n.y,50,80,4,3);
  }else{
   const chair=ASSETS.ic_office_chair;if(chair)ctx.drawImage(chair,Math.round(x-25),n.y-50,50,50);
   if(n.phase==='rising'){
    if(n.t<48)frame(ctx,'ic_office_stand',n.row*4+Math.min(3,Math.floor(n.t/12)),x+25,n.y,100,110,4,3);
    else{const q=clamp((n.t-48)/22,0,1);actor(ctx,n.kind,'walk',Math.floor(n.t/5)%8,x+32,n.y-3+(laneMin(n.x+32)+2-n.y+3)*q,G.player.x<n.x?-1:1);}
   }
  }
 }
}
