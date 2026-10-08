import {initDelhiAmbient,updateDelhiAmbient,drawDelhiAmbient} from './delhi_ambient.js';
import { drawOfficeWorkers, updateOfficeWorkers, initOfficeWorkers } from './india_office.js';
import { updateRefundEntrance, drawRefundEntrance, drawRefundEntranceSet, drawRefundIntroOverlay } from './refund_intro.js';
import { drawRefundLife } from './refund_life.js';
import { drawRefundPanel, drawRefundFixtures, drawRefundForeground } from './refund_scenery.js';
import { updateRefundEncounters, drawRefundEncounters } from './refund_encounters.js';
import { updateIndiaCheckpoint } from './india_checkpoints.js';
// Authored street/office scenery and deterministic chapter choreography.
import { G, W, H, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { INDIA_PANELS } from './india_assets.js';
import { drawDelhiScenery } from './delhi_scenery.js';
import { drawDelhiMarketLife, updateDelhiMarketLife } from './delhi_life_market.js';
import { SPR, getFrame, blit, frameW, frameH, drawTextShadow, drawText, textWidth } from './sprites.js';
import { drawDisplayTitle } from './display_type.js';
import { spawnEnemy } from './enemies.js';
import { initIndiaEnvironment, updateIndiaEnvironment, drawIndiaEnvironment } from './india_environment.js';
import { startIndiaFinisher, updateIndiaFinisher, drawIndiaFinisher, drawIndiaSetPieces } from './india_cinematics.js';
import { updateMarketEntrance, drawMarketEntrance, drawMarketOverlay } from './delhi_intro.js';
import { drawProp } from './props.js';
export const INDIA_PANEL_W=810;
export const INDIA_AREAS={delhi:['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon'],refund:['office','annex','calling','calling_east','servers','records','executive','closer']};
export function initIndia(st){
 G.india={t:0,cues:new Set(),cinematic:null,endingDone:false,wallBroken:false,refundBreachDone:false,displayBroken:false,checkpoint:0,checkpointScore:0,review:{},bullDone:false,
  damage:{kitchen:0,dredger:0,success:0},finishersDone:new Set(),completedScenes:{},
  startCinematic:startIndiaFinisher};
 initOfficeWorkers(st.id);
 initIndiaEnvironment();
 initDelhiAmbient();
}
export function chapterFrame(ctx,key,frame,x,y,w,h,cols=4,rows=4){
 const im=ASSETS[key];if(!im)return false;
 const fw=im.width/cols,fh=im.height/rows;frame=clamp(frame,0,cols*rows-1)|0;
 ctx.drawImage(im,(frame%cols)*fw,Math.floor(frame/cols)*fh,fw,fh,Math.round(x-w/2),Math.round(y-h),w,h);return true;
}
function actor(ctx,set,pose,frame,x,y,face=1){const f=getFrame(SPR[set],pose,frame,face);if(f)blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
export function drawIndiaStage(ctx,camX){
 const s=G.india;if(!s)return;const panels=INDIA_PANELS[G.stage.id];
 ctx.fillStyle=G.stage.id==='delhi'?'#2a201b':'#172322';ctx.fillRect(0,0,W,H);
 if(s.review.environment!==false)for(let i=0;i<panels.length;i++){
  const x=i*INDIA_PANEL_W-camX;if(x>W||x+INDIA_PANEL_W<0)continue;
  if(G.stage.id==='refund')drawRefundPanel(ctx,panels[i],x,camX);
  else {const im=ASSETS[`ic_${G.stage.id}_${panels[i]}`];if(im)ctx.drawImage(im,Math.round(x),0,INDIA_PANEL_W,H);}
 }
 if(G.stage.id==='delhi'&&s.review.environment!==false)drawDelhiScenery(ctx,camX,ASSETS,s.t,s.review.ambient!==false);
 if(G.stage.id==='delhi'&&s.review.environment!==false)drawDelhiMarketLife(ctx,camX);
 if(G.stage.id==='refund'&&camX<250&&(s.wallBroken||s.wallCracked)){const wall=ASSETS[s.wallBroken?'ic_wall_b':'ic_wall_cracked'];if(wall)ctx.drawImage(wall,-camX,0,171.55,270);}
 if(G.stage.id==='refund')drawRefundEntranceSet(ctx,camX);
 drawIndiaEnvironment(ctx,camX);
 drawIndiaSetPieces(ctx,camX);
 if(s.review.ambient===false)return;
 if(G.stage.id==='delhi'){
  if(G.state!=='intro')drawDelhiAmbient(ctx,camX); // street people: delhi_life_market.js / delhi_life_river.js
 }else{
  drawRefundFixtures(ctx,camX);
  drawRefundLife(ctx,camX);
  drawOfficeWorkers(ctx,camX,chapterFrame,actor);
  drawRefundEncounters(ctx,camX);
 }
}
export function updateIndiaIntro(t){
 const s=G.india,p=G.player;s.t=t;
 p.face=1;p.z=0;p.y=236;p.invuln=10;p.vx=0;p.vz=0;
 if(G.stage.id==='delhi'){
  updateMarketEntrance(t);
  updateDelhiAmbient();updateDelhiMarketLife();
 }else updateRefundEntrance(t);
}
export function drawIndiaIntro(ctx,t){
 drawIndiaStage(ctx,G.camX);
 const p=G.player;
 if(G.stage.id==='delhi'){ctx.save();ctx.translate(-G.camX,0);drawMarketEntrance(ctx,t);ctx.restore();
  // Props past the market come into view as the camera eases onto play; the rammed cart is gone, as in play.
  if(G.india.review.props!==false)for(const pr of G.props)if(!pr.dead&&pr.x-G.camX<W+80)drawProp(ctx,pr,G.camX);if(G.india.review.ambient!==false)drawDelhiAmbient(ctx,G.camX);}
 else if(G.stage.id==='refund')drawRefundEntrance(ctx,t,chapterFrame,(pose,f,x,y)=>actor(ctx,'player',pose,f,x-G.camX,y));
 else actor(ctx,'player',p.state==='walk'?'walk':'idle',Math.floor(t/7)%8,p.x,p.y);
 if(G.stage.id==='refund')drawRefundForeground(ctx,G.camX);
 if(t>G.stage.introTicks-85){
  // Stage card: the band opens, the title slides in and settles, then the subtitle wipes across.
  const age=t-(G.stage.introTicks-85),open=Math.min(1,age/8),bh=Math.round(62*open);ctx.fillStyle='rgba(8,5,11,.74)';ctx.fillRect(26,77-bh/2,428,bh);
  if(age>=4){const q=Math.min(1,(age-4)/10),slide=1-(1-q)**3;drawDisplayTitle(ctx,G.stage.name,Math.round(240-150*(1-slide)),56,{height:27,maxWidth:398});}
  if(age>=18){const sub=G.stage.sub,w=textWidth(sub,1),x=Math.round((480-w)/2),reveal=Math.min(1,(age-18)/10);
   ctx.save();ctx.beginPath();ctx.rect(x-2,86,Math.round((w+4)*reveal),12);ctx.clip();
   for(const [dx,dy]of [[-1,0],[1,0],[0,-1],[0,1],[1,1]])drawText(ctx,sub,x+dx,93+dy,'#1a0d08',1);drawText(ctx,sub,x,93,'#ffe2b0',1);ctx.restore();}
 }
}
// Screen-space intro layers drawn over the effects (slow-motion grade, cuts, name card).
export function drawIndiaIntroOverlay(ctx,t){if(G.stage.id==='delhi')drawMarketOverlay(ctx,t);else drawRefundIntroOverlay(ctx,t);}
export function updateIndia(){
 const s=G.india;if(!G.stage.chapter||!s)return false;s.t++;updateOfficeWorkers();updateDelhiAmbient();updateDelhiMarketLife();
 updateRefundEncounters();
 if(updateIndiaFinisher())return true;
 if(G.stage.id==='delhi'&&!s.bullDone&&G.player.x>950&&!G.waveActive&&!G.boss){s.bullDone=true;spawnEnemy('bull',G.camX-50,229);}
 updateIndiaEnvironment();
 updateIndiaCheckpoint();
 return false;
}
export function drawIndiaPerformance(ctx){drawIndiaFinisher(ctx);}
