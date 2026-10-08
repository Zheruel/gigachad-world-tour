// Cinematic contacts use captured world coordinates and registered paired poses.
import {G,clamp} from './engine.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {getAIFrame} from './aiframes.js';
import {drawProp} from './props.js';
import {ASSETS} from './assets.js';
import {drawFightProps} from './train_conductor.js';
import {dim,flash,speedLines,aura,ghost,silhouette,punchBurst,debrisBurst,note} from './finisher_fx.js';
import {conductorAtChest,conductorChest,drawConductorBlood,drawConductorStains} from './conductor_gore.js';
const ease=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const actorsOn=()=>G.train?.review?.finishActors!==false;
function actor(ctx,set,state,index,x,y,face=1){if(!actorsOn())return;const f=getFrame(set,state,index,face);blit(ctx,f,x-frameW(f)/2,y-frameH(f)+4);}
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
 drawFightProps(ctx,props,cam);
}
// Fare paid: CHAD's gameplay frames with the conductor's reaction frames placed so the fist
// meets the tie, pocket or mouth. [end tick, CHAD state, index (negative: animate at that
// many ticks per frame from the beat start), conductor cell, conductor dx]
const INSPECTOR_BEATS=[[58,'throw',1,0,73],[70,'throw',0,1,62],[82,'boxing_variety',1,2,48],[94,'jab',1,3,58],[100,'jab',2,3,52],[110,'jab',3,4,58],[120,'jab',0,5,60],[136,'combo_power_finish',1,6,68],[152,'combo_power_finish',2,7,68],[156,'combo_power_finish',4,7,0],[176,'combo_power_finish',4,-1,0],[190,'combo_power_b',7,-1,0],[214,'idle',-1,-1,0],[246,'idle_shades',-8,-1,0],[Infinity,'idle_cigar',-14,-1,0]];
const DESK_X=6036,SLUMP_Y=206,CAP_REST=[5992,224];
export function inspectorPose(c){
 const t=c.t,bx=c.fromBossX??c.fromX+40,by=c.fromBossY??218;
 // Move into reach first; after the haymaker only the victim travels to the desk.
 const approach=ease(t/48),hx=c.fromX+(bx-56-c.fromX)*approach;
 const x=hx,y=c.fromY+(by-c.fromY)*approach+(c.fromX>bx?Math.sin(clamp(t/48,0,1)*Math.PI)*18:0);
 const n=INSPECTOR_BEATS.findIndex(([end])=>t<end),[,state,index,cell,dx]=INSPECTOR_BEATS[n],from=INSPECTOR_BEATS[n-1]?.[0]??0;
 return {x,y,state,index:index<0?Math.floor((t-from)/-index):index,cell,dx};
}
// Launched off the haymaker, he arcs into the desk at 198, bounces and slumps against it.
export function inspectorVictim(c,p,t=c.t){
 const hit={x:p.x+44,y:p.y-66},end=conductorChest({cell:11,x:DESK_X+4,y:SLUMP_Y});
 if(t<156){const v=conductorAtChest(7,hit.x,hit.y),q=clamp((t-148)/4,0,1);return {cell:7,x:p.x+68+(v.x-p.x-68)*q,y:p.y+(v.y-p.y)*q};}
 if(t<198){const q=clamp((t-156)/42,0,1),e=q*(2-q);return conductorAtChest(t<160?8:t<186?9:10,hit.x+(end.x-hit.x)*e,hit.y+(end.y-hit.y)*q-Math.sin(q*Math.PI)*34);}
 if(t<210)return conductorAtChest(10,end.x+(t-198)*.3,end.y-Math.sin((t-198)/12*Math.PI)*5);
 return {cell:11,x:DESK_X+4,y:SLUMP_Y};
}
// The cap is knocked off by the haymaker and comes to rest on the floor.
function inspectorCap(c,p){
 const q=clamp((c.t-152)/40,0,1);
 return {x:p.x+60+(CAP_REST[0]-p.x-60)*q,y:p.y-86+(CAP_REST[1]-p.y+86)*q-Math.sin(q*Math.PI)*46,spin:q<1?q*9:.35};
}
// The conductor's side of it (audio/sfx/cond_*): choked by his tie, the bribe wad plucked, the notes bursting out,
// his scream across the office, the stamp clattering down, the desk giving way, papers, one last groan.
const INSPECTOR_CUES={56:['cond_hurt_2',.5,.12],64:['cond_hurt_1',.45,.16],74:['cond_note_2',.8],154:['cond_note_1',.6],157:['cond_fall',.8,1],192:['cond_clatter',.6],199:['cond_crash',.65],205:['cond_papers',.35],232:['cond_papers',.25]};
export function updateInspectorFinish(c){
 const t=c.t,p=inspectorPose(c);c.endX=p.x;c.endY=p.y;
 if([28,44].includes(t))G.audio.sfx('entrance_boot');
 const q=INSPECTOR_CUES[t];if(q){if(q[2])G.audio.roomSfx?.(q[0],q[1],q[2]);else G.audio.sfx(q[0],q[1]);}
 if(t===222)G.audio.roomSfxAt?.('cond_hurt_2',.3,0,.8);  // slumped against the wreck
 if(t===98){G.audio.sfx('punch');G.shake=2;}
 if(t===104)G.audio.voice('duke_suck_it_down',1500,true);
 if(t===122)G.audio.sfx('super');
 if(t===150)G.audio.sfx('whiff');
 // The haymaker freezes on a silhouette frame, then the launch plays in slow motion.
 if(t===152){G.audio.sfx('heavy');G.audio.sfx('ko');G.audio.sfx('bone_crack');G.shake=6;G.hitstop=Math.max(G.hitstop,12);}
 if(t===156)G.slowmo=Math.max(G.slowmo,18);
 if(t===198){G.audio.sfx('slam');G.audio.sfx('entrance_crack');G.shake=8;G.hitstop=Math.max(G.hitstop,8);G.train.officeDeskBroken=true;}
 if(t===213){G.audio.sfx('land');G.shake=2;}
 if(t===250)G.audio.roomSfx?.('room_glass',.35);
 if(t>=360){G.train.inspectorBody={x:DESK_X+4,y:SLUMP_Y,cap:CAP_REST,wounded:true};G.train.officeFightProps=c.fightProps;return true;}return false;
}
// Bribe notes (cash green, like the art) and desk paperwork share one tumbling flake.
function flake(ctx,x,y,spin,note){
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(spin);
 ctx.fillStyle=note?'#7fa267':'#cbb77c';ctx.fillRect(-3,-1.5,6,3);
 ctx.fillStyle=note?'#b9d49a':'#818260';ctx.fillRect(-1,-1.5,2,3);ctx.restore();
}
function spritePiece(ctx,im,sx,sw,sh,x,y,spin,scale=.5){
 if(!im)return;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(spin);ctx.drawImage(im,sx,0,sw,sh,-sw*scale/2,-sh*scale/2,sw*scale,sh*scale);ctx.restore();
}
// The haymaker knocks the rubber stamp out of his hand; it comes to rest by the desk.
export function drawInspectorCap(ctx,x,y,spin=.35){const im=ASSETS.nr_conductor_stamp;if(im)spritePiece(ctx,im,0,im.width,im.height,x,y,spin,.5);}
const woundedSet=()=>getAIFrame('nr_conductor','finisher_gore')?.f.length===12?'finisher_gore':'finisher';
export function drawInspectorBody(ctx,body,cam){
 drawConductorStains(ctx,cam);
 const set=woundedSet();
 const f=getFrame(SPR.nr_conductor,body.wounded?set:'finisher',11,-1);blit(ctx,f,body.x-cam-frameW(f)/2,body.y-frameH(f)+4);
 if(body.cap)drawInspectorCap(ctx,body.cap[0]-cam,body.cap[1]);
}
export function drawInspectorFinish(ctx,c){
 const t=c.t,p=inspectorPose(c),cam=c.fromCam;
 if(t<48){
  actor(ctx,SPR.player,Math.abs(p.x-c.fromX)<3?'idle_knuckles':'walk',Math.floor(Math.abs(p.x-c.fromX)<3?t/8:Math.abs(p.x-c.fromX)/5.4),p.x-cam,p.y,p.x<c.fromX?-1:1);
  actor(ctx,SPR.nr_conductor,'stagger_polish',Math.floor(t/10),(c.fromBossX??c.fromX+40)-cam,c.fromBossY??218,-1);
  return;
 }
 // Super wind-up: the room drops into shadow, lines converge on the cocked fist, CHAD burns.
 const shake=t>=140&&t<152?(t%2?1:-1):t>=152&&t<156?2-(t-152):0,x=p.x-cam+shake,fist=[x+22,p.y-54];
 const charge=t<120?0:t<152?clamp((t-120)/12,0,1):clamp(1-(t-156)/24,0,1);
 dim(ctx,charge*.62);
 if(t>=120&&t<152)speedLines(ctx,fist[0],fist[1],t,charge);
 if(t>=156&&t<196)speedLines(ctx,0,0,t,clamp(1-(t-176)/20,0,1)*.8,1);
 if(t>=120&&t<156)aura(ctx,x,p.y-44,58,t,charge);
 const woundState=t>=153?woundedSet():'finisher',v=inspectorVictim(c,p);
 if(t>=198)drawConductorStains(ctx,cam,clamp((t-198)/12,.2,1));
 // Impact: one frozen negative frame of both silhouettes against the blast.
 if(t===152&&actorsOn()){
  flash(ctx,1,'255,214,120');const g=ctx.createRadialGradient(x+40,p.y-66,4,x+40,p.y-66,220);g.addColorStop(0,'rgba(255,255,255,1)');g.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=g;ctx.fillRect(0,0,480,270);
  silhouette(ctx,SPR.nr_conductor,'finisher',7,v.x-cam,v.y,-1,'#1a0c08');silhouette(ctx,SPR.player,'combo_power_finish',4,x,p.y,1,'#1a0c08');
  return;
 }
 if(p.cell>=0){if(t>=148)actor(ctx,SPR.nr_conductor,woundState,v.cell,v.x-cam,v.y,-1);else actor(ctx,SPR.nr_conductor,'finisher',p.cell,x+p.dx,p.y,-1);}
 else{
  // Launched body leaves a fading trail of afterimages while it flies.
  if(t<200)for(const [lag,a] of [[9,.16],[6,.28],[3,.42]]){const g=inspectorVictim(c,p,Math.max(156,t-lag));if(actorsOn())ghost(ctx,SPR.nr_conductor,woundState,g.cell,g.x-cam,g.y,-1,a);}
  actor(ctx,SPR.nr_conductor,woundState,v.cell,v.x-cam,v.y,-1);
 }
 if(t>=152){const k=inspectorCap(c,p);drawInspectorCap(ctx,k.x-cam,k.y,k.spin);}
 actor(ctx,SPR.player,p.state,p.index,x,p.y,1);
 if(actorsOn())drawConductorBlood(ctx,t,v,cam,{x:p.x+44,y:p.y-66});
 // CHAD lets go of the tie to pluck the bribe; it sits in his fist until it is stuffed into the mouth.
 if(t>=78&&t<100){const tip=t<82?[36,66]:t<94?[31,76]:[36,73],im=ASSETS.nr_conductor_wad;if(im)spritePiece(ctx,im,0,im.width,im.height,x+tip[0]-1,p.y-tip[1],-.2,.22);}
 contact(ctx,t,98,x+45,p.y-72);  // at his mouth as the wad goes in
 punchBurst(ctx,t,153,x+44,p.y-66,90,0,2);
 // The swallowed bribe bursts out on the haymaker; the desk sheds splinters and paperwork.
 for(let i=0;i<22;i++){
  const age=t-153-(i>>2);if(age<0||age>100)continue;
  const x0=p.x+48-cam+age*(.5+i%5*.34),y0=p.y-80-age*(1.3+i%3*.45)+age*age*.028;
  if(y0<226)note(ctx,i,x0,y0,age*.14+i);
 }
 if(t>=198){
  debrisBurst(ctx,t,198,DESK_X-cam,198,200);
  const im=ASSETS.nr_conductor_planks,slot=im?.height||0;
  for(let i=0;i<6;i++){
   const age=Math.min(t-198,34),dir=i%2?1:-1,vx=dir*(.9+i*.28),vy=-(2.6+(i%3)*.8);
   const y0=Math.min(212+i*3,168+vy*age+.2*age*age);
   spritePiece(ctx,im,i*slot,slot,slot,DESK_X-cam+dir*8+vx*age,y0,age*.12*dir*(1+i%2),.24);
  }
  for(let i=0;i<24;i++){
   const age=t-198-i;if(age<0||age>120)continue;
   const x0=DESK_X-cam+(i%2?1:-1)*(age*(.35+i%4*.16)),y0=172-age*(.9+i%3*.3)+age*age*.016;
   if(y0<=232)i%3===0?note(ctx,i,x0,y0,age*.1+i):flake(ctx,x0,y0,age*.08+i,false);
  }
  flash(ctx,.7*(1-(t-198)/6));
 }
 // Making it rain: the rest of the bribe money drifts down while CHAD lights up.
 for(let i=0;i<30;i++){
  const age=t-214-i*3;if(age<0)continue;
  const x0=p.x-40-cam+((i*53)%150)+Math.sin(age*.07+i)*8,y0=Math.min(222+(i*7)%12,-10+age*.9);
  const a=clamp((360-t)/16,0,1);if(a<=0)continue;ctx.save();ctx.globalAlpha=a;note(ctx,i,x0,y0,y0<220?Math.sin(age*.09+i)*1.2:.1*(i%5-2));ctx.restore();
 }
 flash(ctx,t>=150&&t<152?.85:t>152&&t<158?.4*(1-(t-153)/5):0);
}
// Netaji and Shera's cinematics live in train_neta_cinematics.js.
