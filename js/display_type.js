import { drawTextShadow, textWidth } from './sprites.js';

export const DISPLAY_FILES={
 'CHAD WINS':'assets/ui/headings/chad-wins.png',
 'RANK S':'assets/ui/headings/rank-s.png',
 'RANK A':'assets/ui/headings/rank-a.png',
 'RANK B':'assets/ui/headings/rank-b.png',
 'RANK C':'assets/ui/headings/rank-c.png',
 'THE NIGHT TRAIN':'assets/ui/headings/night-train.png',
 'DIRTY DELHI':'assets/ui/headings/dirty-delhi.png',
 'WORLD TOUR':'assets/ui/headings/world-tour.png',
 'STAGE CLEAR':'assets/ui/headings/stage-clear.png',
 'GAME OVER':'assets/ui/headings/game-over.png',
 'ACT 1 / INDIA':'assets/ui/headings/act-one-india.png',
 'ACT 2 / INDIA':'assets/ui/headings/act-two-india.png',
 'ACT 3 / INDIA':'assets/ui/headings/act-three-india.png',
 'REFUND TOWER':'assets/ui/headings/refund-tower.png',
 'THE CLOSER':'assets/ui/headings/the-closer.png',
};
const artwork={};let loading;
export function loadDisplayType(){
 return loading ||= Promise.all(Object.entries(DISPLAY_FILES).map(([key,path])=>new Promise(resolve=>{
  const im=new Image();let settled=false;
  const done=value=>{if(settled)return;settled=true;clearTimeout(timeout);artwork[key]=value;resolve();};
  const timeout=setTimeout(()=>done(null),8000);
  im.onload=()=>done(im);im.onerror=()=>done(null);im.src=path.startsWith('/')?path:'/'+path;
 }))).then(()=>artwork);
}

// Authored wordmarks share placement and fallback rules across large UI headings.
// Fit within both dimensions so compact map headings retain their full silhouette.
export function drawDisplayTitle(ctx,text,cx,y,{height=26,maxWidth=400,art=artwork}={}){
 const key=String(text).toUpperCase(),im=art[key];
 if(im){
  const scale=Math.min(height/im.height,maxWidth/im.width),w=Math.round(im.width*scale),h=Math.round(im.height*scale);
  ctx.save();ctx.imageSmoothingEnabled=false;ctx.drawImage(im,Math.round(cx-w/2),Math.round(y),w,h);ctx.restore();
  return {width:w,height:h};
 }
 const scale=Math.max(1,Math.min(Math.floor(height/7),Math.floor(maxWidth/textWidth(key,1)))),w=textWidth(key,scale);
 drawTextShadow(ctx,key,Math.round(cx-w/2),Math.round(y),'#ffda86',scale,'#592719');
 return {width:w,height:scale*6};
}
