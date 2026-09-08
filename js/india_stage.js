import { drawOfficeWorkers, updateOfficeWorkers, initOfficeWorkers, alarmOfficeWorkers } from './india_office.js';
import { updateIndiaCheckpoint } from './india_checkpoints.js';
// Authored street/office scenery and deterministic chapter choreography.
import { G, W, H, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { INDIA_PANELS } from './india_assets.js';
import { drawDelhiScenery } from './delhi_scenery.js';
import { SPR, getFrame, blit, frameW, frameH, drawTextShadow, textWidth } from './sprites.js';
import { drawDisplayTitle } from './display_type.js';
import { spawnDust, spawnDebris } from './effects.js';
import { spawnEnemy } from './enemies.js';
import { initIndiaEnvironment, updateIndiaEnvironment, drawIndiaEnvironment } from './india_environment.js';
import { drawContactShadow } from './contact_shadow.js';
import { startIndiaFinisher, updateIndiaFinisher, drawIndiaFinisher, drawIndiaSetPieces, updateMarketEntrance, drawMarketEntrance } from './india_cinematics.js';
export const INDIA_PANEL_W=810;
export const INDIA_AREAS={delhi:['market','bazaar','food','vendor','culvert','ghat','wharf','pontoon'],refund:['office','annex','calling','calling_east','servers','records','executive','closer']};
const mix=(a,b,t)=>a+(b-a)*clamp(t,0,1);
export function initIndia(st){
 G.india={t:0,cues:new Set(),cinematic:null,endingDone:false,wallBroken:false,displayBroken:false,cardReleased:false,checkpoint:0,checkpointScore:0,review:{},bullDone:false,
  damage:{kitchen:0,dredger:0,success:0},finishersDone:new Set(),completedScenes:{},
  startCinematic:startIndiaFinisher};
 initOfficeWorkers(st.id);
 initIndiaEnvironment();
}
function cue(key,t,at,fn){const s=G.india;if(t>=at&&!s.cues.has(key)){s.cues.add(key);fn();}}
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
  const im=ASSETS[`ic_${G.stage.id}_${panels[i]}`];if(im)ctx.drawImage(im,Math.round(x),0,INDIA_PANEL_W,H);
 }
 if(G.stage.id==='delhi'&&s.review.environment!==false)drawDelhiScenery(ctx,camX,ASSETS,s.t,s.review.ambient!==false);
 if(G.stage.id==='refund'&&camX<250&&(s.wallBroken||s.wallCracked)){const wall=ASSETS[s.wallBroken?'ic_wall_b':'ic_wall_cracked'];if(wall)ctx.drawImage(wall,-camX,0,171.55,270);}
 drawIndiaEnvironment(ctx,camX);
 drawIndiaSetPieces(ctx,camX);
 if(s.review.ambient===false)return;
 const t=s.t;
 if(G.stage.id==='delhi'){
  // Small separately animated rats follow the rear curb and flee nearby impacts.
  for(const base of [380,1220,2140,3540,4650,5500]){
   const phase=(t+base*3)%780;if(phase>260)continue;
   const x=base+phase*.55-camX;if(x < -30||x>W+30)continue;
   chapterFrame(ctx,'ic_rat',Math.floor(t/5)%8,x,209,27,14,8,1);
  }
  for(const [i,x]of [500,1030,1500,1960,2370,4260,4820,5260].entries()){
   const sx=x-camX;if(sx<-80||sx>W+80)continue;
   const alert=G.enemies.some(e=>!e.dead&&Math.abs(e.x-x)<110&&e.state==='attack');
   drawContactShadow(ctx,sx,210,11,0,.85);
   const role=[0,1,2,0,1,2,1,1][i];
   chapterFrame(ctx,'ic_street_life',role*4+(alert?3:Math.floor((t+i*21)/20)%3),sx,211,58,80,4,3);
  }
 }else{
  drawOfficeWorkers(ctx,camX,chapterFrame,actor);
 }
}
export function updateIndiaIntro(t){
 const s=G.india,p=G.player;s.t=t;
 p.face=1;p.z=0;p.y=236;p.invuln=10;p.vx=0;p.vz=0;
 if(G.stage.id==='delhi'){
  updateMarketEntrance(t);
 }else{
  // All travel belongs to the actual airborne/run poses. Brace and guard keep
  // planted boots instead of sliding the finished pose across the floor.
  p.x=t<120?82:mix(82,225,(t-120)/60);p.y=t<120?207:mix(207,236,(t-120)/60);p.z=t>=120&&t<180?Math.sin((t-120)/60*Math.PI)*7:0;p.state='idle';p.t=t;
  cue('wall-crack',t,103,()=>{s.wallCracked=true;G.audio.roomSfx('entrance_crack',.25);G.shake=1;});
  cue('breach',t,120,()=>{s.wallBroken=true;G.shake=7;G.audio.sfx('slam');G.audio.sfx('heavy');spawnDebris(92,173,22,['#877663','#ac967d','#453b33']);spawnDust(135,235,10);});
  alarmOfficeWorkers(t);
  for(const at of [155,180])cue('breach-boot'+at,t,at,()=>G.audio.roomSfx('entrance_boot',.35));
  cue('breach-quote',t,202,()=>G.audio.voice('duke_time_to_crash_this_party',2500,true));
 }
}
export function drawIndiaIntro(ctx,t){
 drawIndiaStage(ctx,G.camX);
 if(G.stage.id==='refund'&&t<120)return;
 const p=G.player;
 if(G.stage.id==='delhi'){ctx.save();ctx.translate(-G.camX,0);drawMarketEntrance(ctx,t);ctx.restore();}
 else if(G.stage.id==='refund'&&t<320){const f=t<180?6+Math.min(3,Math.floor((t-120)/15)):t<230?10+Math.min(2,Math.floor((t-180)/17)):t<265?13:t<290?14:15;if(!chapterFrame(ctx,'ic_breach',f,p.x,p.y-p.z,128,128))actor(ctx,'player','run',Math.floor(t/6)%8,p.x,p.y-p.z);}
 else actor(ctx,'player',p.state==='walk'?'walk':'idle',Math.floor(t/7)%8,p.x,p.y);
 if(t>G.stage.introTicks-85){const age=t-(G.stage.introTicks-85);ctx.fillStyle='rgba(8,5,11,.68)';ctx.fillRect(26,46,428,62);drawDisplayTitle(ctx,G.stage.name,240,56,{height:27,maxWidth:398});if(age>18)drawTextShadow(ctx,G.stage.sub,Math.round((480-textWidth(G.stage.sub,1))/2),93,'#d8c2a1',1);}
}
export function drawIndiaCard(ctx){
 ctx.fillStyle='#101018';ctx.fillRect(0,0,W,H);const img=ASSETS['ic_loading_'+G.stage.id];if(img)ctx.drawImage(img,0,0,W,H);
 const shade=ctx.createLinearGradient(0,164,0,270);shade.addColorStop(0,'rgba(8,5,12,0)');shade.addColorStop(1,'#08050c');ctx.fillStyle=shade;ctx.fillRect(0,164,W,106);
 drawDisplayTitle(ctx,G.stage.id==='delhi'?'ACT 2 / INDIA':'ACT 3 / INDIA',240,192,{height:15,maxWidth:180});drawDisplayTitle(ctx,G.stage.name,240,213,{height:29,maxWidth:390});
 const text='F / LB: START LEVEL';drawTextShadow(ctx,text,(W-textWidth(text,1))/2,253,'#eee3d3',1);
}
export function updateIndia(){
 const s=G.india;if(!G.stage.chapter||!s)return false;s.t++;updateOfficeWorkers();
 if(updateIndiaFinisher())return true;
 if(G.stage.id==='delhi'&&!s.bullDone&&G.player.x>950&&!G.waveActive&&!G.boss){s.bullDone=true;spawnEnemy('bull',G.camX-50,229);}
 updateIndiaEnvironment();
 updateIndiaCheckpoint();
 return false;
}
export function drawIndiaPerformance(ctx){drawIndiaFinisher(ctx);}
