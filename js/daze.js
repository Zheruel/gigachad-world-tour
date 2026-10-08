// A simulation-owned visual clock survives the combat state's protected reset.
import {getFrame,frameH} from './sprites.js';
import {getAIFrame} from './aiframes.js';
const conscious=e=>!e.dead&&!e.superLocked&&e.z<=3&&!['down','dying','corpse','thrown','getup'].includes(e.state)&&(e.protectedStagger>0||e.state==='stagger');
// left: ticks the daze has to run when the caller knows (an ordinary stagger's fixed length)
export function dazePose(e,left){
 const key=e.set?._aiKey;
 const name=['stagger_polish','stagger','hurt'].find(n=>getAIFrame(key,n))||'hurt';
 const count=getAIFrame(key,name)?.f.length||1,t=e.dazeT||0;
 // Recoil once, then visibly struggle; don't replay the impact every cycle.
 // (no wrap onto the cell it starts with: 1,2,1,3,2 then 1 again)
 const seq=e.dazeSeq||[1,2,1,3,2];
 // a cell that would get under five ticks before the closing slump (idx 3, last 8 ticks), or before the daze ends, keeps the one before it instead
 const rest=e.protectedStagger>8?e.protectedStagger-8:e.protectedStagger>0?1e9:left??1e9;
 let k=Math.floor((t-7)/9);if(k>0&&(t-7)%9+rest<5)k--;
 let idx=count>=4?(t<7?0:e.protectedStagger>0&&e.protectedStagger<=8?3:seq[k%seq.length]):Math.floor(t/10)%count;
 return {name,idx};
}
const tops=new WeakMap();
function headY(e){
 // The head of the cell on screen, so the ring follows a crouch or a sway.
 const pose=conscious(e)?dazePose(e):{name:'hurt',idx:0},f=e.set&&getFrame(e.set,pose.name,pose.idx,e.face);if(!f?.getContext)return e.y-(e.h||80);
 if(!tops.has(f)){const a=f.getContext('2d').getImageData(0,0,f.width,f.height).data;let top=0;while(top<f.height){let found=false;for(let x=0;x<f.width;x++)if(a[(top*f.width+x)*4+3]>64){found=true;break;}if(found)break;top++;}tops.set(f,top/(f._as||1));}
 return e.y-frameH(f)+4+tops.get(f);
}
export function updateDaze(e){if(conscious(e))e.dazeT=(e.dazeT||0)+1;else e.dazeT=0;
 // eased, so the ring sinks and rises with him instead of snapping between cells
 if(e.dazeT){const top=headY(e)-e.y;e.dazeHead=e.dazeT>1&&e.dazeHead!=null?e.dazeHead+(top-e.dazeHead)*.3:top;}}
export function drawDaze(ctx,e,camX){
 if(!conscious(e)||(e.dazeT||0)<8)return;
 drawDazeRing(ctx,e.x-camX,e.y+(e.dazeHead??headY(e)-e.y)-9,e.dazeT||0);
}
// Two birds and a star circling a head at (cx,cy), on clock t.
export function drawDazeRing(ctx,cx,cy,t){
 ctx.save();ctx.lineWidth=1;ctx.lineJoin='round';
 for(let i=0;i<3;i++){
  const a=t*.09+i*Math.PI*2/3,x=Math.round(cx+Math.cos(a)*12),y=Math.round(cy+Math.sin(a)*3);
  ctx.globalAlpha=.75+(Math.sin(a)+1)*.125;
  ctx.strokeStyle='#3b221e';ctx.fillStyle=i===1?'#ffcf54':'#ffe7a0';
  if(i===1){ctx.beginPath();for(let j=0;j<10;j++){const r=j%2?1.2:3,ang=j*Math.PI/5-Math.PI/2;const px=x+Math.cos(ang)*r,py=y+Math.sin(ang)*r;j?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();ctx.fill();}
  else {const flap=Math.floor(t/5+i)%2?2:-2;ctx.beginPath();ctx.moveTo(x-4,y+flap);ctx.quadraticCurveTo(x-2,y-2,x,y);ctx.quadraticCurveTo(x+2,y-2,x+4,y+flap);ctx.strokeStyle='#ffe3a0';ctx.stroke();ctx.fillRect(x,y,2,2);ctx.fillStyle='#e79b32';ctx.fillRect(x+2,y,2,1);}
 }
 ctx.restore();
}

export function beginDazePose(ctx,e,x,y){
 if(!conscious(e))return false;
 // Authored planted-foot reactions supply the motion; don't tilt their boots.
 const pose=dazePose(e);
 if((getAIFrame(e.set?._aiKey,pose.name)?.f.length||0)>1)return false;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin((e.dazeT||0)*.12)*.014);ctx.translate(-x,-y);return true;
}
