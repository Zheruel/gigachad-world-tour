// A simulation-owned visual clock survives the combat state's protected reset.
import {getFrame,frameH} from './sprites.js';
const tops=new WeakMap();
function headY(e){
 const f=e.set&&getFrame(e.set,'hurt',0,e.face);if(!f?.getContext)return e.y-(e.h||80);
 if(!tops.has(f)){const a=f.getContext('2d').getImageData(0,0,f.width,f.height).data;let top=0;while(top<f.height){let found=false;for(let x=0;x<f.width;x++)if(a[(top*f.width+x)*4+3]>64){found=true;break;}if(found)break;top++;}tops.set(f,top/(f._as||1));}
 return e.y-frameH(f)+4+tops.get(f);
}
export function updateDaze(e){if(!e.dead&&!e.superLocked&&(e.protectedStagger>0||e.state==='stagger'))e.dazeT=(e.dazeT||0)+1;else e.dazeT=0;}
export function drawDaze(ctx,e,camX){
 if(e.dead||e.superLocked||!(e.protectedStagger>0||e.state==='stagger')||e.z>3)return;
 const t=e.dazeT||0,cx=e.x-camX,cy=headY(e)-9;
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
 if(e.dead||e.superLocked||!(e.protectedStagger>0||e.state==='stagger')||e.z>3)return false;
 ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin((e.dazeT||0)*.12)*.014);ctx.translate(-x,-y);return true;
}
