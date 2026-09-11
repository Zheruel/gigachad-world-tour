import {SETH_RETREAT_ANCHORS,SETH_RETREAT_FLOOR,SETH_CLIMB_HANDS} from './seth_retreat_anchors.js';
// Cinematic contacts use captured world coordinates and registered paired poses.
import {G,clamp} from './engine.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {getAIFrame} from './aiframes.js';
import {drawProp} from './props.js';
import {ASSETS} from './assets.js';
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
function actor(ctx,set,state,index,x,y,face=1){if(G.train?.review?.finishActors===false)return;const f=getFrame(set,state,index,face);blit(ctx,f,x-frameW(f)/2,y-frameH(f)+4);}
function pair(ctx,state,index,x,y){if(G.train?.review?.finishActors===false)return;if(!getAIFrame('player',state)){actor(ctx,SPR.player,'jab',1,x,y);actor(ctx,state==='inspector_pair'?SPR.nr_conductor:SPR.nr_vikram_roof,'hurt',0,x+40,y,-1);return;}const f=getFrame(SPR.player,state,index,1);blit(ctx,f,x-80,y-frameH(f)+4);}
function contact(ctx,t,at,x,y,upper=false){
 const age=t-at,im=ASSETS.boxing_impacts;if(age<0||age>=12||!im)return;
 const frame=Math.min(3,Math.floor(age/3)),w=upper?36:24,h=w*1.5;
 ctx.drawImage(im,frame*128,upper?192:0,128,192,x-w/2,y-h*.65,w,h);
}
export function drawRetainedProps(ctx,c,cam){
 for(const p of G.props||[])if(p.x>cam-80&&p.x<cam+560)drawProp(ctx,p,cam);
 drawRetainedCases(ctx,c.fightProps,cam);
}
export function drawRetainedCases(ctx,props,cam){
 for(const p of props||[])if(!p.roof){const im=ASSETS[p.broken?'prop_nr_case_b':'prop_nr_case'];if(im){const h=42*im.height/im.width;ctx.drawImage(im,p.x-cam-21,p.y-h,42,h);}}
}
export function inspectorPose(c){
 const t=c.t,bx=c.fromBossX??c.fromX+40,by=c.fromBossY??218;
 // Move into reach first; after the shoulder contact only the victim travels to the desk.
 const approach=ease(t/48),hx=c.fromX+(bx-50-c.fromX)*approach;
 const x=hx,y=c.fromY+(by-c.fromY)*approach+(c.fromX>bx?Math.sin(clamp(t/48,0,1)*Math.PI)*18:0);
 return {x,y,index:t<70?0:t<98?1:t<111?2:t<152?3:t<164?4:5};
}
export function updateInspectorFinish(c){
 const t=c.t,p=inspectorPose(c);c.endX=p.x;c.endY=p.y;
 if([28,44,145,163].includes(t))G.audio.sfx('entrance_boot');
 if([98,152,198,213].includes(t)){
  G.audio.sfx(t===98?'punch':t===198?'slam':'heavy');G.shake=t===198?5:2;
 }
 if(t===198)G.train.officeDeskBroken=true;
 if(t>=360){G.train.inspectorBody={x:6036,y:218};G.train.officeFightProps=c.fightProps;return true;}return false;
}
export function drawInspectorFinish(ctx,c){
 const t=c.t,p=inspectorPose(c),cam=c.fromCam;
 if(t<48){
  actor(ctx,SPR.player,Math.abs(p.x-c.fromX)<3?'idle_knuckles':'walk',Math.floor(Math.abs(p.x-c.fromX)<3?t/8:Math.abs(p.x-c.fromX)/5.4),p.x-cam,p.y,p.x<c.fromX?-1:1);
  actor(ctx,SPR.nr_conductor,'stagger_polish',Math.floor(t/10),(c.fromBossX??c.fromX+40)-cam,c.fromBossY??218,-1);
 }else if(t<172)pair(ctx,'inspector_pair',p.index,p.x-cam,p.y);
 else{
  actor(ctx,SPR.player,'idle',Math.floor(t/14),p.x-cam,p.y,1);
  const q=clamp((t-172)/26,0,1),bounce=t>=198&&t<217?Math.sin((t-198)/19*Math.PI)*4:0;
  actor(ctx,SPR.nr_conductor,t<198?'finisher_flight':'down',0,p.x+56+(6036-p.x-56)*q-cam,(p.y-24)+(190-(p.y-24))*q+28*ease((t-198)/28)-Math.sin(q*Math.PI)*12-bounce,t<198?1:-1);
 }
 contact(ctx,t,98,p.x+42-cam,p.y-72);contact(ctx,t,152,p.x+38-cam,p.y-48);contact(ctx,t,198,6036-cam,173,true);
 // Paperwork originates at the broken drawers and remains behind the foreground hero.
 if(t>=198)for(let i=0;i<16;i++){
  const age=t-198-i*2;if(age<0||age>110)continue;
  const x=6030-cam+(i%2?1:-1)*(age*(.3+i%4*.12)),y=174-age*(.8+i%3*.25)+age*age*.015;
  if(y>232)continue;ctx.save();ctx.translate(x,y);ctx.rotate(age*.08+i);ctx.fillStyle=i%3?'#cbb77c':'#818260';ctx.fillRect(-3,-1,6,2);ctx.restore();
 }
}
export const SETH_RETREAT_TICKS=750;
export function sethRetreatPose(t){
 if(t<82)return {x:200,y:218,idx:t<54?0:1};
 const landingHip=218-SETH_RETREAT_FLOOR+SETH_RETREAT_ANCHORS[4].hipY;
 if(t<120){const q=(t-82)/38;return {x:200+70*q,y:180+(landingHip-180)*q-36*Math.sin(q*Math.PI),idx:q<.6?2:3,pelvis:true};}
 if(t<138)return {x:270,y:landingHip-Math.sin((t-120)/18*Math.PI)*5,idx:t<124?4:5,pelvis:true};
 if(t<168)return {x:270,y:218,idx:t<150?6:7};
 if(t<270){const q=(t-168)/102;return {x:270+30*q,y:218,idx:8+Math.floor((t-168)/8.5)%4};}
 if(t<294)return {x:300,y:218,idx:12};
 if(t<318)return {x:309,y:218,idx:13};
 const step=Math.max(0,(t-318)/7),rise=Math.min(230,(Math.floor(step)+ease(clamp((step%1-.25)/.75,0,1)))*16);return {x:t<342?316:318,y:218-rise,idx:t<342?14:15};
}
export function updateSethRetreat(c){
 const t=c.t;
 if([30,54,82].includes(t)){G.audio.sfx(t===82?'slam':'punch');G.shake=t===82?4:2;}
 if(t===120||t===138){G.audio.sfx('land');G.shake=t===120?3:1;}
 if([176,193,210,227,244,261,294,318,342,365,540,563,581,606,626].includes(t))G.audio.sfx('entrance_boot');
 if(t===342){G.train.sethJacketDropped=true;G.audio.sfx('armor');}
 if(t===420)G.audio.voice('duke_come_get_some',1800,true);
}
export function drawSethInterior(ctx,c,cam,sprite,ceiling){
 const t=c.t,hx=c.fromX-cam,p=sethRetreatPose(t);
 if(t<420){
  const ready=getAIFrame('nr_vikram','injured_retreat');
  if(t>=342&&getAIFrame('nr_vikram','injured_climb')){const index=Math.floor((t-342)/7)%4;actor(ctx,SPR.nr_vikram,'injured_climb',index,332-(SETH_CLIMB_HANDS[index]-80),p.y,1);}
  else if(ready)actor(ctx,SPR.nr_vikram,'injured_retreat',p.idx,p.x,p.pelvis?p.y+SETH_RETREAT_FLOOR-SETH_RETREAT_ANCHORS[p.idx].hipY:p.y,t<82?-1:1);
  else actor(ctx,SPR.nr_vikram,t<90?'hurt':t<270?'down':'climb',0,p.x,p.y,t<270?-1:1);
 }
 if(t>=342){const im=ASSETS.nr_seth_jacket;if(im){const q=clamp((t-342)/28,0,1);const h=34*im.height/im.width;ctx.drawImage(im,307,75+(218-h-75)*q,34,h);}}
 // Actual roof silhouette hides the climbing actor, while the floor remains visible.
 if(t>=318&&t<420)ceiling();
 if(t<528){actor(ctx,SPR.player,t<96?'boxing_variety':'idle',t<20?0:t<30?8:t<42?9:t<54?4:t<66?5:t<82?14:t<96?15:0,hx,218,1);}
 else if(t<589){const x=hx+(310-hx)*(t-528)/61;actor(ctx,SPR.player,'walk',Math.floor((x-hx)/5.4),x,218,1);}
 else{
  const q=clamp((t-589)/41,0,1),pose=Math.min(3,Math.floor(q*4)),handX=[101.7,99.2,97.2,95.9][pose];
  if(!sprite(ctx,'chad_roof_climb',pose,332-handX+80,218-q*110,160,120,320,240))actor(ctx,SPR.player,'climb',0,310,218-q*110,1);
  ceiling();
 }
 for(const at of [30,54,82])contact(ctx,t,at,200,218-(at===30?46:73),at===82);
 contact(ctx,t,120,270,214);
}
export function drawSethKnockout(ctx,c){
 const t=c.t,bx=c.fromBossX??c.fromX+38,by=c.fromBossY??218,cam=c.fromCam;
 const hx=c.fromX,hy=c.fromY;
 if(t<20){actor(ctx,SPR.player,'boxing_variety',0,hx-cam,hy,1);actor(ctx,SPR.nr_vikram_roof,'stagger_polish',0,bx-cam,by,-1);}
 else if(t<90){const keys=[[20,0],[29,1],[37,2],[40,3],[44,2],[48,3],[54,4],[60,5],[66,4],[76,5]];let index=0;for(const [at,i]of keys)if(t>=at)index=i;pair(ctx,'seth_pair',index,hx-cam,hy);}
 else{
  actor(ctx,SPR.player,'idle',Math.floor(t/14),hx-cam,hy,1);
  const q=clamp((t-90)/21,0,1),bounce=t>=111&&t<129?Math.sin((t-111)/18*Math.PI)*5:0;
  actor(ctx,SPR.nr_vikram_roof,t<111?'finisher_flight':'down',0,bx+26*q-cam,by-20*(1-q)-Math.sin(q*Math.PI)*12-bounce,t<111?1:-1);
 }
 for(const at of [24,32,40,48,60,76])contact(ctx,t,at,bx-cam,by-(at<40?46:73),at===76);
 contact(ctx,t,111,bx+26-cam,by-4);
}
