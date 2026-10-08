// Delhi arrival: one connected train, one camera, one deterministic completion.
// Everything is a pure function of the scene clock t (finaleState / drawFinale), so the Studio can scrub it.
import {G,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {drawWheelSparks} from './effects.js';
import {drawCigarReplay} from './cigar_smoke.js';
import {gore,bloodDecal} from './finisher_fx.js';
export const FINALE_TICKS=1260;
export const FINALE_APPROACH_TICKS=180;
// "Rest in pieces" lands once Netaji's pieces have come down (805).
export const FINALE_VOICES=[{tick:188,name:'duke_getting_off',duration:1950},{tick:805,name:'duke_rest_pieces',duration:1850}];
// Locations are coach-local; damage belongs to the same registered regions as its blast.
// Blast 1 is the charge at Netaji's shoes on the roof (coach x 738).
const majorSpecs=[
 [552,'left',738,128,[5,6]],[600,'right',65,155,[0]],
 [654,'left',480,180,[3,4]],[714,'right',150,178,[1]],
 [780,'left',810,135,[7]],[846,'right',90,130,[2,3]],
 [918,'left',600,160,[0,1,2]],[990,'right',125,155,[4,5,6,7]],
];
export const FINALE_BLASTS=majorSpecs.map(([tick,carriage,x,y,damageRegions],i)=>({
 tick:tick+180,carriage,x,y,damageRegions,family:'fireball',width:i===0?260:112+i%3*18,
 // Each sample's transient is trimmed to its first sample, so the bang lands on the fireball's first frame.
 sound:i===0?'finale_blast_big':i===6?'finale_blast_glass':i%2?'finale_blast_b':'finale_blast_a',volume:i===0?.85:.5+i*.035,major:true,
}));
export const FINALE_SECONDARIES=Array.from({length:20},(_,i)=>({
 // Secondaries start after blast 1 (732); smoke puffs are silent, flashes pop and sparks crackle.
 tick:745+i*25,carriage:i%3===1?'right':'left',
 x:i%3===1?35+(i*29)%125:480+(i*61)%370,y:[128,180,213][i%3],
 width:36+(i%4)*8,family:i%3===0?'flash':i%3===1?'sparks':'smoke',
 sound:i%3===0?'finale_pop':i%3===1?'finale_crackle':null,volume:.16+(i%4)*.03,damageRegions:[],major:false,
}));
export const FINALE_EXPLOSIONS=[...FINALE_BLASTS,...FINALE_SECONDARIES].sort((a,b)=>a.tick-b.tick);
// Blast 1 punch: a 2-tick white flash, a 4-tick hitstop on the actors and the fireball, shake 6.
export const FINALE_BLAST1=FINALE_BLASTS[0].tick,FINALE_HITSTOP=4;
// ---- Netaji blown apart by blast 1 --------------------------------------------------------------
// Each piece: [fragment (0 leg, 1 torso, 2 arm, 3 shoe, 4 shades, 5 revolver, 6 briefcase, 7 cash), vx, vy, spin,
// lands on the platform (else the roof), resting angle]. The arm lands just left of CHAD and the shades at his feet.
const PIECES=[[1,-1.2,-4.2,.09,false,.15],[0,-2.6,-6.5,-.16,false,-.4],[2,1.5,-5.5,.21,true,-.55],[3,-3.4,-3,.3,false,0],
 [4,1.9,-7.5,-.25,true,0],[5,.6,-8,.35,false,.8],[6,-.4,-3.2,.05,false,0],[7,-1.8,-9,-.12,false,.2]];
const PIECE_G=.2,PIECE_SIZE=60,BURST_Y=90,ROOF_REST=121,PLATFORM_REST=241;
const landAge=p=>(-p[2]+Math.sqrt(p[2]*p[2]+2*PIECE_G*((p[4]?PLATFORM_REST:ROOF_REST)-BURST_Y)))/PIECE_G;
function pieceAt(p,a,x0){
 const [frag,vx,vy,spin,platform,rest]=p,land=landAge(p),ground=platform?PLATFORM_REST:ROOF_REST;
 if(a<land)return {frag,x:x0+vx*a,y:BURST_Y+vy*a+PIECE_G*a*a/2,angle:spin*a,landed:false};
 // One short hop and slide, then it settles at its resting angle (the nearest turn of it).
 const d=a-land,q=Math.min(1,d/10),fly=spin*land,settle=rest+2*Math.PI*Math.round((fly-rest)/(2*Math.PI));
 return {frag,x:x0+vx*land+vx*.35*Math.min(d,10)*(1-q/2),y:ground-(d<10?5*Math.sin(Math.PI*d/10):0),angle:fly+(settle-fly)*q,landed:true,ground};
}
export const NETA_BURST=FINALE_BLAST1+FINALE_HITSTOP;
// The wet burst as he goes, then a thud (or a clatter for the shades and revolver) as each piece lands.
const NETA_CUES=[{tick:NETA_BURST,sound:'finale_gore',volume:.75},...PIECES.map(p=>({tick:NETA_BURST+Math.ceil(landAge(p)),sound:p[0]===4||p[0]===5?'neta_roof_click':'neta_roof_thud',volume:p[0]===1?.5:.3}))];
export const FINALE_CUES=[
 {tick:182,sound:'train_brake',volume:.32},
 {tick:331,sound:'entrance_boot',volume:.3},{tick:387,sound:'charge_arm',volume:.45},{tick:449,sound:'entrance_boot',volume:.45},{tick:465,sound:'jump',volume:.5},
 {tick:508,sound:'land',volume:.55},{tick:524,sound:'phurt',volume:.2},{tick:553,sound:'entrance_boot',volume:.2},
 {tick:575,sound:'entrance_boot',volume:.25},{tick:715,sound:'remote_click',volume:.45},
 {tick:770,sound:'remote_click',volume:.15},
].concat(NETA_CUES,[{tick:1,sound:'train_approach',volume:.28}],FINALE_EXPLOSIONS.filter(c=>c.sound).map(({tick,sound,volume})=>({tick,sound,volume}))).sort((a,b)=>a.tick-b.tick);
function damageAt(t,carriage){
 return Array.from({length:8},(_,region)=>{
  const hit=FINALE_BLASTS.find(c=>c.carriage===carriage&&c.damageRegions.includes(region));
  const age=t-hit.tick;
  return age<10?0:age<24?1:age<40?2:age<60?3:age<80?4:5;
 });
}
const smooth=p=>p*p*(3-2*p);
const carAt=t=>{
 if(t<180)return -1600+Math.max(0,t)*10/3;
 const q=clamp((t-180)/360,0,1);return -1000+600*(2*q-q*q);
};
const cameraAt=t=>{
 if(t<180)return -1150+Math.max(0,t)*10/3;
 const p=clamp((t-180)/270,0,1);return -550+900*p-150*p*p-200*p*p*p;
};
// CHAD is drawn at gameplay scale: finale_chad cells are 2x gameplay art (crown 178, sole at row 214, body
// centre at column 120), and the scene is drawn at .8, so one cell px is .5/.8 world units.
const K=.625,CW=240,CH=224,COLS=8,SOLE=214,CX=120;
// Netaji's 400x300 cells read a touch large beside CHAD at gameplay scale; the finale draws him 14% smaller.
const NK=K*.86;
export const FINALE_CHAD_CELLS=['breath_a','breath_b','brace','glance','kneel','push',
 'sprint_0','sprint_1','sprint_2','sprint_3','sprint_4','sprint_5','takeoff','hurdle','drop','land','roll_in','roll_a',
 'roll_b','roll_exit','half_rise','remote_idle','raise','press','look_away',
 'cigar_0','cigar_1','cigar_2','cigar_3','cigar_4','cigar_5',
 'strut_0','strut_1','strut_2','strut_3','strut_4','strut_5','strut_6','strut_7'];
const CELL=Object.fromEntries(FINALE_CHAD_CELLS.map((n,i)=>[n,i]));
export const FINALE_NETA_CELLS=['stir','engulf'];
const NCELL=Object.fromEntries(FINALE_NETA_CELLS.map((n,i)=>[n,i]));
// Roof (CHAD's sole on the coach) and platform lines, Netaji's spot on the roof and where he lands.
// Lying, his back (cell row ~266) rests on the roof's far edge and the briefcase in front sits lower on the curved top;
// his shoes stay against the charge (coach 688).
const ROOF_Y=114,GROUND_Y=245,CHAD_COACH_X=585,NETA_COACH_X=731,NETA_ROOF_Y=130,LAND_X=436,STAND_X=468;
// The strut's planted foot travels 16.25 cell px per cell; the sprint's about 44.
const STRUT_STEP=16.25*K,STRUT_FROM=830,STRUT_TO=912,STRUT_END_X=STAND_X+80;
// The lit end of the cigar per cell (cell px), the mouth 12 px behind it.
const TIPS={cigar_2:[138,58],cigar_3:[140,58],cigar_4:[132,55],cigar_5:[140,56],
 strut_0:[143,66],strut_1:[142,63],strut_2:[141,64],strut_3:[142,63],strut_4:[141,66],strut_5:[142,66],strut_6:[142,64],strut_7:[142,63]};
// The charge sits on the roof against Netaji's shoes (his soles start at coach 688). CHAD dashes over and
// crouches so the fingertips of the 'land' cell (column 175) rest on the bundle, then springs from there.
const PLANT_HAND=(175-CX)*K,CHARGE_COACH_X=676,PLANT_X=CHARGE_COACH_X-PLANT_HAND-10;
function chadPose(t,carX){
 const roofX=carX+CHAD_COACH_X;
 if(t<180){const n=Math.floor(t/24)%2;return {pose:n?'breath_b':'breath_a',x:roofX,y:ROOF_Y,phase:'approach'};}
 if(t<330){const pose=t>=184&&t<214?'brace':t>=290?'glance':Math.floor((t-214)/24)%2?'breath_b':'breath_a';return {pose,x:roofX,y:ROOF_Y,phase:'reaction'};}
 if(t<344){
  // Push-off and a short dash to Netaji's feet at the sprint's stride pace (about 5 world px a tick).
  const run=PLANT_X-CHAD_COACH_X-4,x=t<334?roofX+6*(t-330)/4:roofX+6+(run-6)*(t-334)/10;
  return {pose:t<334?'push':'sprint_'+Math.min(5,Math.floor((t-334)/4.4)),x,y:ROOF_Y,phase:'run'};
 }
 const plantX=carX+PLANT_X;
 // Skid into the crouch, fingertips on the charge; coil on the push cell, then spring over him.
 if(t<465)return {pose:t<454?'land':'push',x:t<350?plantX-4+4*smooth((t-344)/6):plantX,y:ROOF_Y,phase:'plant'};
 if(t<510){
  // High hurdle clear over Netaji (apex ~84 px above the roof, beyond his feet by 495), then the feet-first
  // drop off the roof edge to the platform, landing at 508.
  const launch=carAt(465)+PLANT_X;
  if(t<495){const p=(t-465)/30;return {pose:p<.12?'takeoff':p<.8?'hurdle':'drop',x:launch+(420-launch)*p,y:ROOF_Y-336*p*(1-p)-10*p,phase:'jump'};}
  const q=t-495;return {pose:q<13?'drop':'land',x:420+(LAND_X-420)*Math.min(1,q/13),y:Math.min(GROUND_Y,104+10.9*q),phase:'jump'};
 }
 if(t<585){
  const a=t-510,x=LAND_X+(STAND_X-LAND_X)*smooth(clamp(a/50,0,1));
  const pose=a<6?'land':a<11?'roll_in':a<17?'roll_a':a<23?'roll_b':a<33?'roll_exit':a<46?'kneel':'half_rise';
  return {pose,x,y:GROUND_Y,phase:a<33?'roll':'rise'};
 }
 if(t<742){
  const pose=t<680?'remote_idle':t<714?'raise':t<730?'press':'look_away';
  return {pose,x:STAND_X,y:GROUND_Y,phase:'remote'};
 }
 if(t<STRUT_FROM){
  // The gameplay cigar light (idle_cigar 1-6): the Zippo catches at 776.
  const pose=t<754?'cigar_0':t<768?'cigar_1':t<790?'cigar_2':t<800?'cigar_3':t<818?'cigar_4':'cigar_5';
  return {pose,x:STAND_X,y:GROUND_Y,phase:'light'};
 }
 if(t<STRUT_TO){
  const d=(STRUT_END_X-STAND_X)*(t-STRUT_FROM)/(STRUT_TO-STRUT_FROM);
  return {pose:'strut_'+Math.floor(d/STRUT_STEP)%8,x:STAND_X+d,y:GROUND_Y,phase:'cigar-walk'};
 }
 // The hold: cigar in the mouth, a drag and an upward exhale while the train burns.
 const pose=t>=1030&&t<1060?'cigar_4':'cigar_5';
 return {pose,x:STRUT_END_X,y:GROUND_Y,phase:'cigar-hold'};
}
// Netaji: KO'd on the roof, stirs at the remote click, is engulfed by blast 1 and, once the hitstop releases,
// blows apart like a gore-system KO: his family debris (fragments_nr_neta) flies out of the fireball.
function netaPose(t,carX){
 const roofX=carX+NETA_COACH_X;
 if(t<715)return {cell:null,x:roofX,y:NETA_ROOF_Y,air:false,state:'rest'};
 if(t<FINALE_BLAST1)return {cell:'stir',x:roofX+(t<721?(t%2?.6:-.6):0),y:NETA_ROOF_Y,air:false,state:'stir'};
 if(t<NETA_BURST)return {cell:'engulf',x:roofX,y:BURST_Y,air:true,rot:0,state:'engulf'};
 return {cell:null,x:roofX,y:BURST_Y,air:false,state:'exploded',pieces:PIECES.map(p=>pieceAt(p,t-NETA_BURST,roofX))};
}
function finaleCigarAt(b){
 if(b<596)return null;const q=finaleState(b+180),tip=TIPS[q.pose];if(!tip)return null;
 const pt=(x,y)=>[q.heroX+(x-CX)*K,q.heroY+(y-SOLE)*K];
 return {tip:pt(tip[0],tip[1]),mouth:pt(tip[0]-12,tip[1]),face:1,moving:q.phase==='cigar-walk'};
}
export function finaleState(t){
 const timelineT=clamp(t,0,FINALE_TICKS),carX=carAt(timelineT),cameraX=cameraAt(timelineT);
 const a=Math.max(0,timelineT-180);
 // Hitstop: CHAD and Netaji hold the blast-1 frame for FINALE_HITSTOP ticks.
 const vt=timelineT>=FINALE_BLAST1&&timelineT<FINALE_BLAST1+FINALE_HITSTOP?FINALE_BLAST1:timelineT;
 const c=chadPose(vt,carAt(vt)),n=netaPose(timelineT,carX);
 const damage={left:damageAt(timelineT,'left'),right:damageAt(timelineT,'right')};
 // The charge appears under CHAD's hand as he skids in (350) and he presses it against Netaji's shoes by 366.
 const slide=clamp((timelineT-350)/16,0,1),chargeX=PLANT_X+PLANT_HAND+(CHARGE_COACH_X-PLANT_X-PLANT_HAND)*smooth(slide);
 return {t:timelineT,actionT:a,cameraX,phase:c.phase,carX,passengerX:carX+858,couplerX:carX+866,carState:Math.max(...damage.left),damage,
  heroX:c.x,heroY:c.y,pose:c.pose,cell:CELL[c.pose],neta:n,chargeX,
  chargePlaced:a>=195,chargeState:a<195?'held':a<207?'planted':'armed',
  cigarLit:a>=596,detonated:a>=535,flash:timelineT>=FINALE_BLAST1&&timelineT<FINALE_BLAST1+2,fade:0,complete:timelineT>=FINALE_TICKS};
}
export function updateFinale(c){
 for(const cue of FINALE_VOICES)if(c.t===cue.tick)G.audio.voice?.(cue.name,cue.duration,true);
 for(const cue of FINALE_CUES)if(c.t===cue.tick){
  if(!G.audio.roomSfx?.(cue.sound,cue.volume))G.audio.sfx(cue.sound);
  if(FINALE_BLASTS.some(b=>b.tick===cue.tick))G.shake=cue.tick===FINALE_BLAST1?6:3;
  if(cue.tick===508)G.shake=2;
 }
 if(c.t===FINALE_TICKS){G.audio.stopRoomAudio?.();G.audio.stopSamples?.();}
 return c.t>=FINALE_TICKS;
}
// Snap to the 2x device grid (1 world unit = 1.6 device px) so gameplay-scale cells stay crisp.
const snap=(v,cam=0)=>Math.round((v-cam)*1.6)/1.6+cam;
function sheetCell(ctx,key,i,cols,cw,ch,x,y,ax,ay,cam,k=K){
 const im=ASSETS[key];if(!im)return false;
 ctx.drawImage(im,(i%cols)*cw,Math.floor(i/cols)*ch,cw,ch,snap(x-ax*k,cam),snap(y-ay*k),cw*k,ch*k);return true;
}
function drawChad(ctx,s){
 if(sheetCell(ctx,'nr_finale_chad',s.cell,COLS,CW,CH,s.heroX,s.heroY,CX,SOLE,s.cameraX))return;
 // Missing art keeps a readable gameplay CHAD at the same scale.
 const f=getFrame(SPR.player,s.phase==='jump'?'jump':'idle',0,1);
 ctx.drawImage(f,Math.round(s.heroX-frameW(f)/1.6),Math.round(s.heroY-frameH(f)/.8+4),frameW(f)/.8,frameH(f)/.8);
}
function drawNeta(ctx,s){
 const n=s.neta;
 if(n.state==='exploded')return;
 if(!n.cell){
  // The rooftop KO pose (nr_neta ko 8) at finale scale (NK): nr_ cells are 400x300 with the sole on row 293.
  const f=getFrame(SPR.nr_neta,'ko',8,-1);if(!f)return;
  ctx.drawImage(f,snap(n.x-200*NK,s.cameraX),snap(n.y-293*NK),400*NK,300*NK);return;
 }
 const im=ASSETS.nr_finale_neta_blast,i=NCELL[n.cell];
 if(!im){const f=getFrame(SPR.nr_neta,'ko',n.air?2:8,-1);if(f)ctx.drawImage(f,snap(n.x-200*NK,s.cameraX),snap(n.y-(n.air?175:293)*NK),400*NK,300*NK);return;}
 if(n.air){
  ctx.save();ctx.translate(snap(n.x,s.cameraX),snap(n.y));if(n.rot)ctx.rotate(n.rot);
  ctx.drawImage(im,i*400,0,400,300,-200*NK,-175*NK,400*NK,300*NK);ctx.restore();
 }else ctx.drawImage(im,i*400,0,400,300,snap(n.x-200*NK,s.cameraX),snap(n.y-293*NK),400*NK,300*NK);
}
// Blast 1 tears Netaji apart: a gore-system burst (arcade_defeats' big blood star, finisher_gore sprays and
// arcs) out of the fireball, his debris flying free and blood left where it lands.
function drawNetaBurst(ctx,s){
 const n=s.neta,age=s.t-NETA_BURST,sheet=ASSETS.fragments_nr_neta;if(n.state!=='exploded')return;
 const x=snap(n.x,s.cameraX),y=n.y;
 // Stains first, under everything: the roof where he was, then each piece's landing spot.
 if(age>=6)bloodDecal(ctx,x,ROOF_REST+2,5,Math.min(1.6,.6+age*.08));
 for(const p of n.pieces)if(p.landed)bloodDecal(ctx,p.x,p.ground+4,p.frag===4||p.frag===5?1:3,.9);
 const im=ASSETS.arcade_defeats;
 if(im&&age<18){ctx.save();ctx.globalAlpha=clamp((18-age)/4,0,1);ctx.drawImage(im,(Math.min(3,age>>2))*128,128,128,128,x-80,y-80,160,160);ctx.restore();}
 if(age<26)for(let i=0;i<7;i++){
  const a=-Math.PI/2+(i-3)*.5,d=age*(2.2+i%3*.5);
  gore(ctx,3+i%3,x+Math.cos(a)*d,y+Math.sin(a)*d+age*age*.03,{rot:a,scale:1.5+i%2*.4,alpha:age<16?1:(26-age)/10});
 }
 if(age<40)for(let i=0;i<3;i++)gore(ctx,6+i,x+(i-1)*age*1.6,y-12-age*1.4+age*age*.06,{flip:i?1:-1,scale:1.3,alpha:age<28?1:(40-age)/12});
 for(const [i,p] of n.pieces.entries()){
  // A blood trail behind each piece while it flies: drops where it was 3, 6 and 9 ticks ago.
  for(const k of [3,6,9]){const q=pieceAt(PIECES[i],age-k,n.x);if(age>=k&&!q.landed)gore(ctx,0,q.x,q.y,{rot:q.angle,scale:.9-k*.05,alpha:.9-k*.07});}
  if(sheet){ctx.save();ctx.translate(Math.round(p.x),Math.round(p.y));ctx.rotate(p.angle);
   ctx.drawImage(sheet,p.frag%4*128,Math.floor(p.frag/4)*128,128,128,-PIECE_SIZE/2,-PIECE_SIZE/2,PIECE_SIZE,PIECE_SIZE);ctx.restore();}
  else{ctx.fillStyle='#7a1010';ctx.fillRect(Math.round(p.x)-4,Math.round(p.y)-4,8,8);}
 }
}
// Burning rupee notes out of the briefcase as blast 1 flings him: deterministic arcs from the clock.
function drawNotes(ctx,t){
 const im=ASSETS.nr_finale_notes,age=t-FINALE_BLAST1;if(!im||age<2||age>90)return;
 for(let i=0;i<7;i++){
  const b=age-i*3;if(b<0)continue;const vx=(i%2?1:-1)*(.6+i*.22),vy=-2.6-(i%3)*.7;
  const x=338+vx*b,y=95+vy*b+.045*b*b;if(y>GROUND_Y)continue;
  ctx.drawImage(im,Math.min(3,Math.floor(b/22))*28,0,28,28,snap(x-8.75),snap(y-8.75),17.5,17.5);
 }
}
// Debris chunks off a major blast: six per blast, spinning out and down.
function drawDebris(ctx,cue,x,age){
 const im=ASSETS.nr_finale_debris;if(!im||age<1||age>70)return;
 for(let i=0;i<6;i++){
  const a=-Math.PI*(.15+.7*((i*37+cue.tick)%11)/10),v=2.2+((i*53+cue.tick)%7)*.35;
  const px=x+Math.cos(a)*v*age,py=cue.y-cue.width*.3+Math.sin(a)*v*age+.06*age*age;
  if(py>GROUND_Y+4)continue;
  ctx.save();ctx.globalAlpha=clamp((70-age)/20,0,1);ctx.translate(snap(px),snap(py));ctx.rotate(age*.15*(i%2?1:-1));
  ctx.drawImage(im,((i+cue.tick)%6)*40,0,40,40,-12.5,-12.5,25,25);ctx.restore();
 }
}
function drawDust(ctx,x,y,age,life=24){
 const im=ASSETS.nr_finale_dust;if(!im||age<0||age>=life)return;
 ctx.save();ctx.globalAlpha=clamp((life-age)/10,0,1);
 ctx.drawImage(im,Math.min(3,Math.floor(age/life*4))*88,0,88,80,snap(x-44*K),snap(y-76*K),88*K,80*K);ctx.restore();
}
function cell(ctx,key,pose,x,y,w,h,cw,ch){const im=ASSETS[key];if(!im)return false;ctx.drawImage(im,pose*cw,0,cw,ch,Math.round(x-w/2),Math.round(y-h+3.5),w,h);return true;}
// A major blast on the front-loaded sheet (fireball from cell 0; base at row 312 of a 320 cell).
const BLAST_AT=[0,3,8,16,30,52,80,110];
function drawMajor(ctx,x,y,w,age){
 const im=ASSETS.nr_finale_blast;
 if(!im){const frame=Math.min(7,Math.floor(age/150*8));return cell(ctx,'nr_explosion',frame,x,y,w,w*.82,320,256);}
 let f=0;while(f<7&&age>=BLAST_AT[f+1])f++;
 ctx.save();if(age>120)ctx.globalAlpha=Math.max(0,(150-age)/30);
 const drift=Math.max(0,age-80)*.2;
 ctx.drawImage(im,f*320,0,320,320,Math.round(x-w/2+drift*.4),Math.round(y-w*312/320-drift),w,w);ctx.restore();
}
function gear(ctx,x,t){
 const im=ASSETS.nr_finale_bogie;if(!im)return;
 for(const bx of [110,670]){
  ctx.drawImage(im,Math.round(x+bx),207,134,32);
  // Small hub glints rotate with actual displacement, leaving the authored tyres intact.
  if(t<540)for(const wx of [29,105]){const a=carAt(t)/6;ctx.strokeStyle='#968373';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(x+bx+wx-4*Math.cos(a),227-4*Math.sin(a));ctx.lineTo(x+bx+wx+4*Math.cos(a),227+4*Math.sin(a));ctx.stroke();}
 }
}
// Adjacent masks share their exact jagged boundary: no uncovered seam or double-drawn edge.
function regionPath(ctx,x,region){
 const boundary=(i,y)=>i===0?0:i===8?1024:i*128+[0,13,-9,17,-12,5,-15,8,0,11,-7,0,0][Math.floor(y/20)%13];
 ctx.beginPath();
 for(let y=0;y<=240;y+=20){const px=x+boundary(region,y)*880/1024,py=62+y*880/1024;if(y===0)ctx.moveTo(px,py);else ctx.lineTo(px,py);}
 for(let y=240;y>=0;y-=20)ctx.lineTo(x+boundary(region+1,y)*880/1024,62+y*880/1024);
 ctx.closePath();ctx.clip();
}
function carriage(ctx,im,x,t,r,damage){
 if(r.finaleGear!==false)gear(ctx,x,t);
 if(!im)return;
 const bodyOnly=ASSETS.nr_finale_bogie&&r.finaleGear!==false;
 for(let region=0;region<8;region++){
  ctx.save();regionPath(ctx,Math.round(x),region);
  ctx.drawImage(im,damage[region]*1024,0,1024,bodyOnly?190:224,Math.round(x),62,880,bodyOnly?163.28:192.5);
  ctx.restore();
 }
}
function drawEnvironment(ctx,layer,cameraX){
 const wide=ASSETS['nr_finale_approach_'+layer],im=ASSETS['nr_finale_'+layer];
 if(wide)ctx.drawImage(wide,-1200-cameraX,-67.5,1800,337.5);
 else if(im){
  // Missing extension keeps readable scenery without preventing arrival.
  const start=Math.floor(cameraX/600)*600;
  for(let x=start;x<cameraX+600;x+=600)ctx.drawImage(im,x-cameraX,-67.5,600,337.5);
 }
}
export function drawFinale(ctx,t){
 const s=finaleState(t),a=s.actionT,r=G.train?.review||{},env=r.finaleEnvironment!==false,car=r.finaleCar!==false,actor=r.finaleActor!==false,fx=r.fx!==false;
 const neta=actor&&G.train?.knockoutBody;
 ctx.fillStyle='#15111b';ctx.fillRect(0,0,480,270);ctx.save();ctx.translate(0,54);ctx.scale(.8,.8);
 if(env)for(const layer of ['sky','station','track']){
  drawEnvironment(ctx,layer,s.cameraX);
  if(layer==='sky'&&s.cameraX<0&&ASSETS.nr_finale_approach_clouds){
   ctx.save();ctx.globalAlpha=.16*clamp(-s.cameraX/280,0,1);
   ctx.drawImage(ASSETS.nr_finale_approach_clouds,-750-s.cameraX*.35,-210,1200,400);ctx.restore();
  }
 }
 ctx.save();ctx.translate(-s.cameraX,0);
 if(car){
  carriage(ctx,ASSETS.nr_finale_passenger_damage||ASSETS.nr_train_exterior,s.passengerX,t,r,r.finaleRightDamage===false||!ASSETS.nr_finale_passenger_damage?Array(8).fill(0):s.damage.right);
  carriage(ctx,ASSETS.nr_finale_car,s.carX,t,r,r.finaleLeftDamage===false?Array(8).fill(0):s.damage.left);
  if(r.finaleCoupling!==false&&ASSETS.nr_finale_coupling)ctx.drawImage(ASSETS.nr_finale_coupling,Math.round(s.couplerX-17),218,34,12);
 }
 if(env){ctx.save();ctx.translate(s.cameraX,0);drawEnvironment(ctx,'platform',s.cameraX);ctx.restore();}
 if(fx){
  // The brakes bite as CHAD reacts and keep sparking through the jump until the train stops.
  if(t>180&&t<540){
   const q=(t-180)/360,power=clamp((t-180)/16,0,1)*clamp((540-t)/24,0,1);
   drawWheelSparks(ctx,[s.carX,s.passengerX].flatMap(x=>[110,670].flatMap(b=>[29,105].map(w=>Math.round(x+b+w)))),238,t,power*(.55+.45*(1-q)),2.4*(1-q)+.4,1);
  }
  for(const cue of FINALE_EXPLOSIONS){
   const base=cue.carriage==='left'?s.carX:s.passengerX,x=base+cue.x;
   let age=t-cue.tick;if(cue.tick===FINALE_BLAST1&&age>=0&&age<FINALE_HITSTOP)age=0;
   if(cue.major){if(age>=0&&age<150)drawMajor(ctx,x,cue.y,cue.width,age);drawDebris(ctx,cue,x,age);continue;}
   const life=70;
   if(age>=0&&age<life){
    const frame=cue.family==='smoke'?Math.min(7,5+Math.floor(age/24)):Math.min(7,Math.floor(age/life*8));
    const smokePhase=cue.family==='smoke'||frame>=5;
    const drift=cue.family==='smoke'?age:Math.max(0,age-life*5/8);
    ctx.save();
    if(smokePhase)ctx.globalAlpha=Math.max(0,1-drift/(cue.family==='smoke'?life:life*3/8));
    cell(ctx,'nr_explosion',frame,x+(smokePhase?drift*.12:0),cue.y-(smokePhase?drift*.3:0),cue.width,cue.width*.82,320,256);
    ctx.restore();
   }
  }
  // Pockets of fire survive the cascade (finale_fire loop, 8 cells at 6 ticks).
  if(a>=700)for(const [side,xs]of [['left',[490,585,710,820]],['right',[55,120]]])for(const [i,x]of xs.entries()){
   const base=side==='left'?s.carX:s.passengerX,fire=ASSETS.nr_finale_fire;
   if(fire)ctx.drawImage(fire,(Math.floor((a+i*13)/6)%8)*64,0,64,80,Math.round(base+x-20),Math.round(206-49),40,50);
   else cell(ctx,'nr_explosion',3+Math.floor((a+i*13)/14)%3,base+x,203,34,40,320,256);
  }
  drawNotes(ctx,t);
  drawDust(ctx,LAND_X,GROUND_Y,t-510);
 }
 // Draw order: explosions, then Netaji, then CHAD.
 if(neta){drawNeta(ctx,s);if(fx||actor)drawNetaBurst(ctx,s);}
 // The charge sits on the roof at Netaji's shoes (drawn over them so it reads) and blinks armed until it blows.
 if(car&&r.finaleDynamite!==false&&t>=350&&t<FINALE_BLAST1){
  const prop=ASSETS.nr_finale_dynamite;
  if(prop)ctx.drawImage(prop,(s.chargeState==='armed'&&t%16<10?2:1)*96,0,96,64,Math.round(s.carX+s.chargeX-15.5),ROOF_Y-19.5,31,21);
 }
 if(actor)drawChad(ctx,s);
 if(actor&&r.finaleCigar!==false&&fx)drawCigarReplay(ctx,0,a,finaleCigarAt,{drags:[[596,19],[818,30]],exhales:[622,852],trickleEvery:9,ember:s.cigarLit});
 ctx.restore();ctx.restore();
 if(fx&&s.flash){ctx.fillStyle=`rgba(255,250,235,${t===FINALE_BLAST1?.92:.55})`;ctx.fillRect(0,0,480,270);}
}
