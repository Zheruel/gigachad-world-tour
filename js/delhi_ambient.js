// Cosmetic simulation: never consumes combat randomness or creates combat actors.
import {G,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {drawContactShadow} from './contact_shadow.js';
import {riverQuayWalkers} from './delhi_life_river.js';
const sites=[
 [245,238,215,218,'food'],[376,237,415,218,'grain'],[560,207,610,204,'food'],
 [1030,210,1090,206,'grain'],[1420,208,1480,203,'rubbish'],
 [1860,213,1910,205,'food'],[2200,211,2270,204,'food'],[2550,208,2610,204,'rubbish'],
 [3460,208,3510,199,'drain'],[4250,208,4320,202,'grain'],[4820,211,4890,202,'rubbish'],
 [5390,208,5450,200,'grain'],[5840,209,5910,201,'drain'],
 [3190,197,3232,192,'rubbish']   // the bins by the culvert door (last, so the other sites keep their seeds)
];
const PLAY_FLOCKS={0:1,3:2,9:1,11:2};
// Feet in the original 128px cells; the clear padding below them is not floor.
const PIGEON_FEET=[110,109,112,112,110,110,110,110];
export function initDelhiAmbient(){
 if(G.stage.id!=='delhi')return;
 G.india.wildlife={tick:0,lastX:G.player?.x||0,forced:null,actors:sites.flatMap(([x,y,hx,hy,kind],i)=>{
  const a=[{kind:'rat',x,y,homeX:x,homeY:y,hx,hy,state:'idle',age:i*17,seed:i*97,frame:0,face:1,visible:false}];
  // A loose flock: uneven gaps, a bird a step forward or back, one or two facing the other way, and pecking
  // and head-bob phases well apart, so no two birds read as a stamped copy.
  if(kind==='grain'||i===0)for(let n=0;n<3;n++){const px=x+[18,37,62][n]+(i*7+n*3)%6,py=y-2+[0,2,-1][(n+i)%3];
   a.push({kind:'pigeon',site:i,slot:n,flock:PLAY_FLOCKS[i]||0,x:px,y:py,homeX:px,homeY:py,hx:x+150+n*24,hy:-36,state:'idle',age:n*23,seed:i*91+n*71+n*n*37,frame:0,face:(n+i)%3===1?-1:1,visible:false});}
  // A second rat at occasional market rubbish gaps scatters toward a different refuge.
  if(i<8&&[0,3,5,6].includes(i))a.push({kind:'rat',x:x+18,y:y-1,homeX:x+18,homeY:y-1,hx:x-34,hy:hy+1,state:'idle',age:i*31+7,seed:i*97+43,frame:0,face:-1,visible:false,playOnly:true});
  if(['food','rubbish','drain'].includes(kind))a.push({kind:'flies',x,y:kind==='food'?177:y-8,homeX:x,homeY:kind==='food'?177:y-8,state:'idle',age:0,seed:i*73,scatter:0});
  for(const b of a)b.homeFace=b.face;
  return a;
 })};
}
export function scareDelhiAmbient(x=G.player.x,y=G.player.y){if(G.india?.wildlife)G.india.wildlife.forced={x,y};}
export function updateDelhiAmbient(){
 const w=G.india?.wildlife;if(!w||G.paused)return;w.tick++;
 const p=G.player,moving=Math.abs(p.x-w.lastX)>.15;w.lastX=p.x;
 const intro=G.state==='intro'&&!!G.india.marketIntro?.scare;
 // Keep the cinematic flock, but place the bazaar birds on open paving during play.
 if(G.state!=='intro'&&!w.playConfigured){
  for(const a of w.actors)if(a.kind==='pigeon'&&a.site===3){
   a.homeX=1022+a.slot*24;a.homeY=225+a.slot;
   if(a.state==='idle'||a.state==='feed'){a.x=a.homeX;a.y=a.homeY;}
  }
  w.playConfigured=true;
 }
 const disturbances=[];
 if(w.forced)disturbances.push(w.forced);w.forced=null;
 if(moving||intro||['attack','super','kick','hook','punch'].includes(p.state))disturbances.push({x:p.x,y:p.y});
 for(const e of G.effects||[])if(['spark','boxingImpact','koBurst'].includes(e.type)&&e.t<8)disturbances.push({x:e.x,y:e.y});
 for(const e of G.enemies)if(!e.dead&&e.state==='attack')disturbances.push({x:e.x,y:e.y});
 for(const x of riverQuayWalkers())disturbances.push({x,y:199});  // the wharf's pole carriers walk through the flock's spot
 for(const n of G.india.environment?.nodes||[])if(n.mode!=='rest')disturbances.push({x:n.prop.x,y:n.prop.y});  // a creaking crate or hissing boiler clears its perch
 const counts={rat:0,pigeon:0,flies:0};
 for(const a of w.actors){
  a.age++;const visible=a.x>=G.camX-24&&a.x<=G.camX+504;
  const cinematic=G.state==='intro',enabled=cinematic?!a.playOnly:a.kind!=='pigeon'||a.slot<a.flock;
  a.visible=visible&&enabled&&(cinematic||a.state!=='hidden')&&counts[a.kind]++<({rat:4,pigeon:cinematic?6:2,flies:3}[a.kind]);
  if(!enabled)continue;
  const alarm=disturbances.some(d=>Math.abs(d.x-a.x)<(intro?150:cinematic?95:a.kind==='rat'?120:85)&&Math.abs(d.y-a.y)<90);
  if(a.kind==='flies'){
   a.scatter=alarm?45:Math.max(0,a.scatter-1);continue;
  }
  if(alarm&&['idle','feed','return'].includes(a.state)){a.state='alert';a.age=0;}
  if(a.state==='alert'&&a.age>=(a.kind==='pigeon'?8+(a.seed%3)*9:4+a.seed%14)){a.state='flee';a.age=0;if(a.kind==='pigeon'&&a.visible&&w.tick>(w.wingAt||0)){G.audio?.roomSfx?.('room_page',.08);w.wingAt=w.tick+24;}}
  if(a.state==='idle'||a.state==='feed'){
   const bird=a.kind==='pigeon';   // each pigeon on its own pecking and head-bob clock
   a.state=(Math.floor((w.tick+a.seed)/(bird?56+a.seed%19:65))%3===0)?'feed':'idle';
   a.frame=a.kind==='rat'?(a.state==='feed'?1:0):(a.state==='feed'?1:Math.floor((w.tick+a.seed)/(19+a.seed%11))%2?0:2);
  }else if(a.state==='alert'){a.frame=a.kind==='pigeon'?4:0;
  }else if(a.state==='flee'||a.state==='return'){
   const back=a.state==='return',x=back?a.homeX:a.hx,y=back?a.homeY:a.hy,dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy),speed=a.kind==='rat'?(back?.65:2.4):(back?1.4:2.8);
   a.face=dx<0?-1:1;const step=Math.min(speed,d);if(d){a.x+=dx/d*step;a.y+=dy/d*step;}
   a.frame=a.kind==='rat'?2+Math.floor(a.age/3)%6:5+Math.floor(a.age/4)%3;
   if(d<=speed){a.state=back?'idle':'hidden';a.age=0;if(back)a.face=a.homeFace??a.face;}
  }else if(a.state==='hidden'&&a.age>(cinematic?420+a.seed%180:a.kind==='pigeon'?1200+a.seed%1200:540+a.seed%480)&&disturbances.every(d=>Math.abs(d.x-a.homeX)>170)&&!G.enemies.some(e=>!e.dead&&Math.abs(e.x-a.homeX)<140)){
   a.state='return';a.age=0;
  }
 }
}
export function drawDelhiAmbient(ctx,camX){
 const w=G.india?.wildlife;if(!w)return;const review=G.india.review||{};
 for(const a of w.actors){
  if(!a.visible||a.state==='hidden'||review[a.kind=== 'rat'?'rats':a.kind==='pigeon'?'pigeons':'flies']===false)continue;
  const x=a.x-camX,y=a.y;
  if(a.kind==='flies'){
   ctx.fillStyle='#292319';for(let i=0;i<5;i++){const t=(w.tick+a.seed+i*31)*.11,r=3+i+a.scatter*.22;ctx.globalAlpha=clamp(1-a.scatter/65,.2,.8);ctx.fillRect(Math.round(x+Math.sin(t)*r),Math.round(y+Math.cos(t*1.7)*r*.45),1,1);}ctx.globalAlpha=1;continue;
  }
  const im=ASSETS[a.kind==='rat'?'ic_rat':'ic_pigeon'];if(!im)continue;
  const cols=a.kind==='rat'?8:4,rows=a.kind==='rat'?1:2,sw=im.width/cols,sh=im.height/rows;
  const dw=a.kind==='rat'?23:32,dh=a.kind==='rat'?10:32;
  const playBird=a.kind==='pigeon'&&G.state!=='intro';
  if(playBird&&['idle','feed','alert'].includes(a.state))drawContactShadow(ctx,x,y,4,0,.7);
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(a.face,1);
  const top=playBird?-PIGEON_FEET[a.frame]*dh/sh:-dh;
  ctx.drawImage(im,a.frame%cols*sw,Math.floor(a.frame/cols)*sh,sw,sh,-dw/2,top,dw,dh);ctx.restore();
 }
}
