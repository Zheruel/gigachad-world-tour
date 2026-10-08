// Puri Pop: CHAD guts Ghee Pappu, crams a fistful of chillies down his throat and he puffs up like a
// puri in hot ghee and stumbles off as he floats up. CHAD kneels into a long charge, rises through him in
// three hits and a last uppercut that pops him. His sandals, towel and crust rain over the stall, and CHAD
// catches the last burning chilli out of the air to light his cigar.
// Zero-based clock after the shared entry (camera 2670). Contact points are measured on the registered
// frames (tools/production/build_pappu_puri_finish.py): logical px from each actor's feet.
import {G,clamp} from './engine.js';
import {SPR,getFrame,blit,frameW,frameH} from './sprites.js';
import {ASSETS} from './assets.js';
import {getAIFrame} from './aiframes.js';
import {spawnDust,spawnSpark,spawnRing,spawnShock} from './effects.js';
import {flash,dim,speedLines,aura,punchBurst,bloodSpray,bloodArc,gore,bloodDecal,crackFlash} from './finisher_fx.js';
import {drawChadCigarReplay,drawCigarReplay,chadCigarAt} from './cigar_smoke.js';
import {drawContactShadow} from './contact_shadow.js';
import {wisp,embers,drawSpillLife} from './vendor_kitchen_life.js';
import {pappu} from './vendor_sound.js';

export const PB=Object.freeze({gut:38,grab:58,cram:70,release:94,gulp:112,ready:122,swell:140,charge:150,ball:166,crack:200,lunge:214,hits:Object.freeze([216,222,228]),upper:234,burst:238,land:264,cigar:274,light:292,flick:322,cool:336,end:372});
export const PURI_CAM=2670,PURI_FLOOR=236;
const PX=270,PX2=298,CIGAR_PERIOD=14;
const mix=(a,b,q)=>a+(b-a)*clamp(q,0,1),ease=q=>{q=clamp(q,0,1);return q*q*(3-2*q);};
const hash=n=>{const s=Math.sin(n*127.1+311.7)*43758.5453;return s-Math.floor(s);};
// Piecewise smoothstep through [t, value] keys.
const track=(keys,t)=>{let i=0;while(i+1<keys.length&&t>keys[i+1][0])i++;if(i===keys.length-1)return keys[i][1];const [a,va]=keys[i],[b,vb]=keys[i+1];return mix(va,vb,ease((t-a)/(b-a)));};

// Measured on demon_puri_00..05 (facing left as drawn): mouth/chillies, ear steam, ball centre and radius.
const MOUTH=[[-51,-87],[-39.5,-91]],EAR=[[-26.6,-100],[-14.4,-100],[6,-118],[-8.5,-129],[2.3,-133],[-1.6,-130]];
const BALL={x:-4,y:-77,r:63};
// Stage changes that are big jumps in size morph over MORPH ticks: [beat, from, to, x ratio, y ratio].
// Shoved off the cram he stumbles back in two staggering steps, clearing the street for CHAD's super.
const STAGGER=[[PB.release,PX],[PB.release+5,282],[PB.release+9,285],[PB.release+16,PX2]];
const pappuX=t=>track(STAGGER,t),staggerHop=t=>t>PB.release&&t<PB.release+16?Math.abs(Math.sin((t-PB.release)/8*Math.PI))*3:0;
const MORPH=14,GROW=[[PB.swell,2,3,1.22,1.06],[PB.ball,3,4,1.54,.97]];

// He stays in on the cram and steps back off the release; the lunge carries him into the ball's flank and
// each hit lifts him higher until the last uppercut, then he drops clear of the burning ghee.
const [H1,H2,H3]=PB.hits;
function chadX(t){return track([[0,198],[30,212],[44,212],[56,208],[68,206],[PB.release,206],[PB.release+16,192],[PB.lunge,192],[H1,206],[H2,212],[H3,216],[PB.upper,222],[PB.burst+10,224],[PB.land,232],[500,232]],t);}
function chadLift(t){
 if(t<H1||t>=PB.land)return 0;const top=PB.burst+10;if(t<top)return track([[H1,0],[H2,-8],[H3,-16],[PB.upper,-26],[top,-32]],t);
 const q=(t-top)/(PB.land-top);return -32*(1-q*q);
}
// Charge pulses quicken: three of 10 ticks, three of 7, then every 5 until the lunge. Phase 0..1.
function pulse(t){const e=t-PB.charge;return e<0||t>=PB.lunge?-1:e<30?e%10/10:e<51?(e-30)%7/7:(e-51)%5/5;}
const cigarArt=()=>!!getAIFrame('player','puri_cigar');
export function puriHero(t,cam=PURI_CAM){
 let chad={pose:'idle',i:Math.floor(t/10)%4};const x=chadX(t);
 if(t>=16&&t<30)chad={pose:'walk',i:Math.floor(t/4)%6};
 else if(t>=30&&t<48)chad={pose:'hook',i:t<33?0:t<PB.gut-1?1:t<44?3:2};
 else if(t>=56&&t<PB.cram)chad={pose:'puri_cram',i:0};
 else if(t>=PB.cram&&t<PB.release)chad={pose:'puri_cram',i:1};
 else if(t>=PB.release&&t<PB.ready)chad={pose:'puri_cram',i:2};
 else if(t>=PB.ready&&t<PB.charge)chad={pose:'super_electric',i:7};          // low guard: sets his feet
 else if(t>=PB.charge&&t<PB.lunge-4)chad={pose:'super_electric',i:8};        // the kneeling coil he charges in
 else if(t>=PB.lunge-4&&t<PB.lunge)chad={pose:'upper',i:1};                  // springs up out of it
 else if(t>=PB.lunge&&t<H2)chad={pose:'super_electric',i:9};                 // hit 1: rising elbow-up jab
 else if(t>=H2&&t<H3)chad={pose:'upper',i:2};                                // hit 2
 else if(t>=H3&&t<PB.burst+8)chad={pose:'upper',i:3};                        // hit 3, the uppercut and the pop
 else if(t>=PB.burst+8&&t<PB.land)chad=getAIFrame('player','jumpfall')?{pose:'jumpfall',i:0}:{pose:'upper',i:3};   // (never the code-sprite fallback while art loads)
 else if(t>=PB.land&&t<PB.cigar)chad={pose:'upper',i:1};                     // lands in a crouch
 else if(t>=PB.cigar&&!cigarArt())chad={pose:'idle_cigar',i:Math.min(5,Math.floor((t-PB.cigar)/CIGAR_PERIOD))};
 else if(t>=PB.cigar)chad=t<PB.cool?{pose:'puri_cigar',i:t<PB.light?0:t<PB.flick?1:2}:{pose:'idle_cigar',i:5};
 // heat pulses sink him into the coil; the first lunge frame starts low so he rises out of it
 const ph=pulse(t),sink=t>=PB.charge&&ph>=0&&ph<.2?2:t>=PB.lunge-4&&t<PB.lunge-1?[6,4,2][t-PB.lunge+4]:t>=PB.land&&t<PB.land+3?[4,2,1][t-PB.land]:0;
 return {x:cam+x,y:PURI_FLOOR,z:chadLift(t),sink,chad,walk:t>=16&&t<30};
}

// Pappu: dazed sway, the gut punch, the cram, then the inflation in authored stages.
function puriFrame(i){return getAIFrame('ic_vendor','demon_puri')?getFrame(SPR.ic_vendor,'demon_puri',i,1):getFrame(SPR.ic_vendor,'demon_hurt',i>1?1:0,-1);}
// Each hit knocks the ball a little higher (and a jolt it settles from).
const hitLift=t=>PB.hits.reduce((a,h)=>a+6*ease((t-h)/4),0),jolt=t=>PB.hits.reduce((a,h)=>t>=h&&t<h+6?a+(6-(t-h))/6:a,0);
function floatLift(t){if(t<PB.ball-8)return 0;const rise=26*ease((t-PB.ball+8)/40),bob=Math.sin((t-PB.ball)*.14)*2.5*clamp((t-PB.ball)/20,0,1)*(t<H1?1:0);return rise+bob+hitLift(t);}
export function puriVictim(t,cam=PURI_CAM){
 let stage=-1,squash=1,shake=0;
 if(t>=PB.gut+3&&t<PB.cram)stage=0;
 else if(t>=PB.cram&&t<PB.gulp)stage=1;
 else if(t>=PB.gulp&&t<PB.swell)stage=2;
 else if(t>=PB.swell&&t<PB.ball)stage=3;
 else if(t>=PB.ball&&t<PB.burst)stage=t>=PB.crack?5:4;
 // Each new stage lands with a little overshoot: the body bulges past its size and settles.
 const born=[PB.gut,PB.cram,PB.gulp,PB.swell,PB.ball][Math.min(4,stage)]??0,age=t-born;
 // (stages 3 and 4 grow in through a morph first, so their overshoot follows it)
 const sq=stage===3||stage===4?age-MORPH/2:age;
 if(stage>=0&&stage<5&&sq>=0&&sq<10)squash=1+.07*Math.sin(sq/10*Math.PI)*(stage>=2?1.6:1);
 if(stage===1&&t<PB.gulp)squash*=1+.025*Math.sin((t-PB.cram)*.9);   // chewing
// the hook lands on the upright body first: it sinks back and compresses before he folds
 if(stage<0&&t>=PB.gut){shake=4*(PB.gut+3-t);squash=.86;}
 if(stage>=4&&t>=PB.crack)shake=(hash(t)-.5)*mix(1,4,(t-PB.crack)/(PB.burst-PB.crack));
 const j=jolt(t);if(j>0){squash*=1+.09*j;shake+=3*j;}
 return {x:cam+pappuX(t)+shake,y:PURI_FLOOR,lift:stage>=3?floatLift(t):staggerHop(t),stage,squash,visible:t<PB.burst,head:EAR[Math.max(0,stage)]};
}
export function puriPose(t,cam=PURI_CAM){const h=puriHero(t,cam),v=puriVictim(t,cam);return {...h,vx:v.x,vy:v.y,victim:v.stage};}
export function puriBurstOrigin(cam=PURI_CAM){return [cam+PX2+BALL.x,PURI_FLOOR+BALL.y-floatLift(PB.burst)];}

// The pieces of him: [sheet cell, vx, vy, gravity, spin, ground offset, flutter]. Cells: 0/1 sandals,
// 2 towel flying (3 once it lies), 4/5 crust, 6 lungi scrap, 7 the last of the chillies.
const PIECES=[[0,-1.5,-4.6,.3,.22,4,0],[1,2.2,-5.2,.3,-.28,6,0],[4,2.8,-6,.3,.18,-2,0],[4,-2.4,-5.4,.3,-.16,3,0],[5,1,-7,.3,.3,1,0],
 [5,-2,-3.4,.3,-.36,7,0],[5,3.4,-3.6,.3,.28,-3,0],[6,1.2,-4,.13,.04,5,1],[7,-1.2,-6.4,.3,.3,10,0]];
export function puriPieces(age){
 const [x0,y0]=puriBurstOrigin();return PIECES.map(([cell,vx,vy,g,spin,dy,flutter],i)=>{
  const ground=PURI_FLOOR+dy,land=(-vy+Math.sqrt(vy*vy+2*g*(ground-y0)))/g,a=Math.min(age,land),after=Math.max(0,age-land);
  const x=x0+vx*a+(flutter?Math.sin(a*.11+i)*12*Math.min(1,a/20):0);
  const bounce=!flutter&&after<10?Math.abs(Math.sin(after/10*Math.PI))*(cell<2?5:3)*(1-after/10):0,y=y0+vy*a+.5*g*a*a-bounce;
  const lies=age>=land,rot=lies?(cell===2?0:(i%2?.2:-.15)):spin*a+(flutter?Math.sin(a*.2)*.5:0);
  return {i,cell:cell===2&&lies?3:cell,x,y,rot,landed:lies,land,size:cell===2&&lies?60:[40,40,70,60,60,44,50,34][cell]};
 });
}
// Ghee he was full of: golden drops on their own arcs, splatting on the cobbles.
function droplets(age){
 const [x0,y0]=puriBurstOrigin(),out=[];
 for(let i=0;i<40;i++){const a=hash(i)*Math.PI*2,s=2+hash(i+50)*5,vx=Math.cos(a)*s,vy=Math.sin(a)*s*.8-2.5,g=.22,ground=PURI_FLOOR+hash(i+9)*10-4;
  const land=(-vy+Math.sqrt(vy*vy+2*g*(ground-y0)))/g,q=Math.min(age,land);out.push({x:x0+vx*q,y:y0+vy*q+.5*g*q*q,landed:age>=land,age:age-land,i});}
 return out;
}

export function updatePuri(c,t,cam=PURI_CAM){
 const once=(k,at,fn)=>{if(t>=at&&!c.cues.has(k)){c.cues.add(k);fn();}},sound=(n,v=.7)=>{if(!G.audio.roomSfx(n,v))G.audio.sfx(n);};
 const v=x=>cam+x;
 once('puri-groan',4,()=>pappu('groan',v(pappuX(t)),.6));
 once('puri-gut',PB.gut,()=>{sound('heavy',.8);pappu('gut_hook',v(pappuX(t)),.9,{gap:0});spawnSpark(v(PX-40),PURI_FLOOR-66);G.shake=4;G.hitstop=Math.max(G.hitstop,5);});
 once('puri-grab',PB.grab,()=>pappu('vest_grab',v(pappuX(t)),.6));
 once('puri-cram',PB.cram,()=>{sound('punch',.7);pappu('chew',v(pappuX(t)),.8,{gap:0});G.shake=3;G.hitstop=Math.max(G.hitstop,3);});
 once('puri-quote',PB.cram+4,()=>G.audio.voice('duke_swallow_this',1620,true));
 for(const k of [80,88])once('puri-chew'+k,k,()=>pappu('chew',v(pappuX(t)),.7,{gap:0}));
 once('puri-gulp',PB.gulp,()=>pappu('glug',v(pappuX(t)),.9));
 once('puri-spicy',PB.gulp+10,()=>pappu('spicy',v(pappuX(t)),.9));
 once('puri-swell',PB.swell,()=>{pappu('flare',v(pappuX(t)),.8);sound('vendor_fry_pop_1',.4);});
 for(let k=PB.swell+6;k<PB.burst;k+=k<PB.crack?9:4)once('puri-pop'+k,k,()=>sound('vendor_fry_pop_'+(1+k%3),k<PB.crack?.25:.4));
 once('puri-hiss',PB.ball,()=>pappu('sizzle_back',v(pappuX(t)),.9));
 once('puri-strain',PB.ball+8,()=>pappu('strain',v(pappuX(t)),.8));
 once('puri-charge',PB.charge,()=>sound('charge_arm',.55));
 once('puri-charge2',PB.charge+30,()=>sound('charge_arm',.7));   // the pulses quicken
 once('puri-wheeze',PB.charge+10,()=>pappu('wheeze',v(pappuX(t)),.7));
 once('puri-crack',PB.crack,()=>{pappu('rib_crack',v(pappuX(t)),.8);G.shake=2;});
 once('puri-lunge',PB.lunge,()=>sound('neta_roof_whip',.6));
 for(const [i,h] of PB.hits.entries())once('puri-hit'+i,h,()=>{const [x,y]=fistWorld(h,cam);sound(i===1?'punch':'heavy',.7+i*.08);spawnSpark(x+6,y);G.shake=2+i;G.hitstop=Math.max(G.hitstop,3);});
 once('puri-contact',PB.upper,()=>{sound('heavy',.9);G.shake=4;G.hitstop=Math.max(G.hitstop,6);});
 once('puri-towel',TOWEL.at,()=>pappu('rip',v(pappuX(t)),.4));
 once('puri-burst',PB.burst,()=>{const [x,y]=puriBurstOrigin();sound('train_blast',.85);sound('finale_gore',1);pappu('scream_pop',x,.7);
  spawnRing(x,y,'#fff0c2');spawnShock(x,y);spawnSpark(x-50,y+30);G.shake=5;G.hitstop=Math.max(G.hitstop,3);(G.india.damage??={}).kitchen=1;});
 // the stall comes apart behind the fireball in two more steps
 once('puri-wreck2',PB.burst+8,()=>{(G.india.damage??={}).kitchen=2;sound('neta_roof_thud',.4);});
 once('puri-wreck3',PB.burst+18,()=>{(G.india.damage??={}).kitchen=3;sound('neta_roof_thud',.5);});
 for(const p of puriPieces(0))if(p.cell<2||p.i===3||p.i===9)once('puri-land'+p.i,PB.burst+Math.ceil(p.land),()=>{sound('neta_roof_thud',p.cell<2?.4:.22);spawnDust(p.x,PURI_FLOOR+2,p.cell<2?3:2);});
 once('puri-touchdown',PB.land,()=>{sound('land',.5);spawnDust(cam+chadX(PB.land),PURI_FLOOR,5);});
 if(!cigarArt()){once('puri-zippo',PB.cigar+CIGAR_PERIOD*3,()=>sound('remote_click',.45));return;}
 // the last burning chilli: caught, held to the cigar until it takes, flicked away over his shoulder
 once('puri-catch',PB.cigar,()=>sound('remote_click',.4));
 once('puri-light',PB.light+4,()=>sound('vendor_fry_pop_2',.35));
 once('puri-flick',PB.flick,()=>{sound('neta_roof_whip',.3);G.audio.voice('duke_aisle_four',2310,true);});
 once('puri-chilli-land',PB.flick+CHILLI_BACK.life,()=>{sound('vendor_fry_pop_3',.3);const [x,y]=chilliBack(CHILLI_BACK.life);spawnSpark(x,y-2);spawnDust(x,PURI_FLOOR,2);});
}

function drawPappu(ctx,t,camX,live){
 const v=puriVictim(t),f=v.stage<0?getFrame(SPR.ic_vendor,'demon_stagger_polish',Math.floor(t/12)%4,-1)||getFrame(SPR.ic_vendor,'demon_idle3',Math.floor(t/12)%4,-1):puriFrame(v.stage);
 if(!v.visible||!f)return;const x=Math.round(v.x-camX),y=Math.round(v.y-v.lift);
 if(v.lift>0)drawContactShadow(ctx,x+BALL.x,PURI_FLOOR,34,v.lift,1);
 // Squash about the feet while grounded, about the ball's centre once it floats.
 const piv=v.stage>=4?y+BALL.y:y,draw=(fr,sx,sy,a)=>{if(!fr||a<=0)return;ctx.save();ctx.globalAlpha=a;ctx.translate(x,piv);ctx.scale(sx,sy);ctx.translate(-x,-piv);blit(ctx,fr,x-Math.round(frameW(fr)/2),y-frameH(fr)+4);ctx.restore();};
 let sx=v.squash,sy=1/Math.sqrt(v.squash);
 // Big size jumps never pop: the old body stretches halfway to the new size, cuts, and the new body grows from there.
 for(const [at,,,rx,ry] of GROW){const h=MORPH/2;
  // (the new body starts a little smaller than the stretched old one: its new silhouette reads as growth, not a pop)
  if(t>=at-h&&t<at){const q=ease((t-at+h)/h);sx*=mix(1,rx**.4,q);sy*=mix(1,ry**.4,q);}
  else if(t>=at&&t<at+h){const q=ease((t-at)/h);sx*=mix(rx**-.75,1,q);sy*=mix(ry**-.75,1,q);}}
 const cut=GROW.find(([at])=>t>=at&&t<at+2);   // the outgoing body dissolves over the cut instead of popping
 if(cut&&t<cut[0]+2)draw(puriFrame(cut[1]),sx*cut[3]**.75*cut[3]**.4,sy*cut[4]**.75*cut[4]**.4,t===cut[0]?.45:.2);
 if(v.stage===5&&t<PB.crack+8){draw(puriFrame(4),sx,sy,1);draw(f,sx,sy,(t-PB.crack+1)/9);}   // the cracks light up, never flicker off
 else if(v.stage===5&&t>=H1&&t<PB.upper){// every hit blows the cracks out white for a moment
  draw(f,sx,sy,1);const j=jolt(t);if(j>0){ctx.save();ctx.globalCompositeOperation='lighter';draw(f,sx,sy,.6*j);ctx.restore();}}
 else if(v.stage===5&&t>=PB.upper){// over-inflates under the fist: swells, cracks blowing out to white
  const q=clamp((t-PB.upper)/(PB.burst-PB.upper-1),0,1),k=mix(1.15,1.32,q);draw(f,sx*k,sy*k,1);
  ctx.save();ctx.globalCompositeOperation='lighter';draw(f,sx*k,sy*k,.55+.45*q);ctx.restore();}
 else draw(f,sx,sy,1);
 if(!live||G.india?.review?.fx===false)return;
 // Heat: steam jets from the ears that grow with each stage, the crust glowing as it fries.
 if(v.stage>=2){const [ex,ey]=EAR[v.stage],n=v.stage>=4?3:2,size=[0,0,.7,1,1.2,1.3][v.stage];
  for(let i=0;i<n;i++)wisp(ctx,x+ex+4,y+ey-2-i*3,t*2,30+i,{period:22+i*5,size,alpha:.7});
  for(let i=0;i<n;i++)wisp(ctx,x+ex-14,y+ey-1-i*3,t*2,40+i,{period:24+i*5,size:size*.8,alpha:.55});}
 if(v.stage>=3){const k=v.stage===3?.35:v.stage===4?.5:.95,cx=x+BALL.x,cy=y+BALL.y;aura(ctx,cx,cy,v.stage===3?30:BALL.r,t,k,v.stage===5?'255,210,120':'255,160,60');
  embers(ctx,cx,cy+20,t,90,{n:v.stage===5?10:5,w:70,rise:60});}
 if(v.stage===5){// ghee spitting from the cracks
  ctx.save();ctx.fillStyle='#ffd25a';for(let i=0;i<10;i++){const a=hash(i*7+Math.floor(t/3))*Math.PI*2,r=BALL.r*.8+((t*3+i*11)%14);ctx.fillRect(Math.round(x+BALL.x+Math.cos(a)*r*.9),Math.round(y+BALL.y+Math.sin(a)*r*.75),2,2);}ctx.restore();}
}
function drawChad(ctx,p,camX){const f=getFrame(SPR.player,p.chad.pose,p.chad.i,1);if(f)blit(ctx,f,Math.round(p.x-camX-frameW(f)/2),Math.round(p.y+p.z+(p.sink||0)-frameH(f)+4));}
function prop(ctx,cell,x,y,rot,size){const im=ASSETS.dv_puri_props;if(!im)return;ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot);ctx.drawImage(im,cell%4*128,Math.floor(cell/4)*128,128,128,-size/2,-size/2,size,size);ctx.restore();}

// The pop: dv_puri_pop (6 square cells) grows out of the ball's centre; without it, the opening
// fireball frames of the shared explosion strip.
function popBurst(ctx,age,x,y){
 // (cell 0, the small first spark, is skipped: the fireball opens at the ball's own size)
 const pop=ASSETS.dv_puri_pop,at=[0,0,5,11,19,29,41];if(age>=at[6])return;let i=1;while(age>=at[i+1])i++;
 ctx.save();if(i===5)ctx.globalAlpha=1-(age-at[5])/12;
 if(pop){const c=pop.height,w=i===1?160+30*Math.min(1,age/5):190;ctx.drawImage(pop,i*c,0,c,c,Math.round(x-w/2),Math.round(y-w/2),Math.round(w),Math.round(w));}
 else{const im=ASSETS.nr_explosion;if(im){const fw=im.width/8,w=180;ctx.drawImage(im,Math.min(4,i)*fw,0,fw,im.height,Math.round(x-w/2),Math.round(y-w*.5),w,w*.8);}}
 ctx.restore();
}
// His shoulder towel tears off as the ball swells through it, flutters down and lands, smouldering, by the stall.
const TOWEL={at:PB.ball+3,x:-42,y:-97,vx:1.5,vy:-2.6,g:.17};
function towelPiece(t){const age=t-TOWEL.at;if(age<0)return null;const y0=PURI_FLOOR+TOWEL.y,ground=PURI_FLOOR-6,{vx,vy,g}=TOWEL,land=(-vy+Math.sqrt(vy*vy+2*g*(ground-y0)))/g,a=Math.min(age,land);
 return {x:PURI_CAM+PX2+TOWEL.x+vx*a+Math.sin(a*.12)*10*Math.min(1,a/15),y:y0+vy*a+.5*g*a*a,rot:age>=land?0:Math.sin(a*.2)*.5-.3,landed:age>=land,size:age>=land?60:62};}
function drawTowel(ctx,t,camX){const q=towelPiece(t);if(!q)return;prop(ctx,q.landed?3:2,q.x-camX,q.y-(q.landed?11:0),q.rot,q.size);
 if(q.landed){embers(ctx,q.x-camX,q.y-4,t,61,{n:3,w:24,rise:20});wisp(ctx,q.x-camX,q.y-6,t,71,{period:80,size:.8,alpha:.4,smoke:true});}}
function droppedSkimmer(ctx,t,camX){
 if(t<PB.gut)return;const im=ASSETS.dv_skimmer_floor;if(!im)return;const q=clamp((t-PB.gut)/28,0,1),x=PURI_CAM+PX-14+46*q,y=PURI_FLOOR-60+(60+2)*q*q-Math.sin(q*Math.PI)*34;
 ctx.save();ctx.translate(Math.round(x-camX),Math.round(y));ctx.rotate(mix(-1.1,.04-Math.PI*2,q))   /* one full turn in the air, flat on landing */;ctx.drawImage(im,-30,-6,60,12);ctx.restore();
}
export function drawPuriUnder(ctx,c,camX){
 const t=c.t;droppedSkimmer(ctx,t,camX);if(t<PB.burst)return;const age=t-PB.burst,[x0]=puriBurstOrigin();
 // The ghee he was full of, burning on the street where he hung.
 drawSpillLife(ctx,x0-camX+22,PURI_FLOOR+4,clamp((age-6)/50,0,1));
 bloodDecal(ctx,x0-camX+30,PURI_FLOOR+6,4,Math.min(1,age/20));
 for(const d of droplets(age))if(d.landed&&d.i%3===0)bloodDecal(ctx,d.x-camX,PURI_FLOOR+3+d.i%4,1,.5);
}
export function drawPuri(ctx,c,showChad,camX){
 const t=c.t,live=c===G.india?.cinematic,fx=G.india?.review?.fx!==false,p=puriHero(t);
 // The screen leans in for the swell, then CHAD's super: the street drops to black around him while he
 // gathers fire in his fist, the rising flame uppercut, a burning freeze on contact and the pop.
 if(live&&fx&&t>=PB.swell&&t<PB.burst+4)dim(ctx,t<PB.burst?.32*clamp((t-PB.swell)/30,0,1)+superCharge(t)*.42:.74*(1-(t-PB.burst)/4));   // the fireball lights the street back up
 if(live&&fx)drawSuperCharge(ctx,t,p,camX);
 drawPappu(ctx,t,camX,live);drawTowel(ctx,t,camX);
 // From the lunge through the pop CHAD stays in front of the ball and the fireball.
 const over=t>=PB.lunge&&t<PB.land+10;
 if(showChad&&!over){drawChad(ctx,p,camX);
  // each heat pulse of the charge flares through his body
  if(live&&fx&&t>=PB.charge&&t<PB.lunge){const ph=pulse(t);if(ph<.375){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.45*(1-ph/.375);drawChad(ctx,p,camX);ctx.restore();}}}
 if(!fx){if(showChad&&over)drawChad(ctx,p,camX);return;}
 const [bx,by]=puriBurstOrigin(),v=puriVictim(t);
 if(live&&t>=PB.gut&&t<PB.gut+2)flash(ctx,t===PB.gut?.18:.06);
 punchBurst(ctx,t,PB.gut,v.x-camX-38,PURI_FLOOR-66,90,0,2);bloodSpray(ctx,t,PB.gut+1,v.x-camX+MOUTH[0][0],PURI_FLOOR+MOUTH[0][1],-1,1);
 crackFlash(ctx,t,PB.cram,v.x-camX+MOUTH[1][0]-4,PURI_FLOOR+MOUTH[1][1],0,7);
 if(t>=PB.cram&&t<PB.cram+20)for(let i=0;i<6;i++){const a=t-PB.cram;ctx.fillStyle=i%2?'#d8241c':'#ff5a2a';ctx.fillRect(Math.round(v.x-camX+MOUTH[1][0]-6-a*(.6+i*.25)),Math.round(PURI_FLOOR+MOUTH[1][1]-4+a*a*.03*(1+i%3)-i),2,1);}
 // started 2 ticks early so the contact frame, frozen by the hitstop, already shows the full spark
 // each rising hit: a spark at the fist, then the last one (started 2 ticks early so the frozen contact frame shows it whole)
 for(const h of PB.hits){const [x,y]=fistWorld(h);punchBurst(ctx,t,h-1,x-camX+4,y,100,-.6,2);}
 punchBurst(ctx,t,PB.upper-2,p.x-camX+14,p.y+p.z-84,160,-.6,2);crackFlash(ctx,t,PB.upper-2,p.x-camX+16,p.y+p.z-86,0,12);
 if(t>=PB.burst){const age=t-PB.burst,X=bx-camX;
  // the fireball, not a flat flash, lights the dimmed street
  if(live&&age<14){const k=(14-age)/14,g=ctx.createRadialGradient(X,by,10,X,by,170);g.addColorStop(0,`rgba(255,235,170,${.85*k})`);g.addColorStop(.4,`rgba(255,140,40,${.45*k})`);g.addColorStop(1,'rgba(255,80,20,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,0,480,270);ctx.restore();}
  popBurst(ctx,age,X,by);
  for(const dir of [-1,1])bloodArc(ctx,t,PB.burst+2,X+dir*10,by+6,dir,1);
  ctx.save();for(const d of droplets(age)){if(d.landed&&d.age>6)continue;ctx.fillStyle=d.i%3?'#ffc640':'#fff0a0';ctx.fillRect(Math.round(d.x-camX),Math.round(d.y),d.landed?3:2,d.landed?1:2);}ctx.restore();
  for(const q of puriPieces(age)){prop(ctx,q.cell,q.x-camX,q.y-(q.landed?q.size*.18:0),q.rot,q.size);
   if(q.cell===3||(q.cell===2&&age>20))embers(ctx,q.x-camX,q.y-4,t,60+q.i,{n:3,w:24,rise:20});
   if(q.cell===3)wisp(ctx,q.x-camX,q.y-6,t,70+q.i,{period:80,size:.8,alpha:.4,smoke:true});}
 }
 if(showChad&&over){drawRisingFlame(ctx,t,camX,live);drawChad(ctx,p,camX);}
 if(live&&t===PB.upper&&G.hitstop>0)superFreeze(ctx,t,p,camX,showChad);
 if(live&&t>=PB.charge&&t<PB.burst+24)letterbox(ctx,t);
 if(showChad&&t>=PB.cigar&&!cigarArt())drawChadCigarReplay(ctx,camX,t,PB.cigar,CIGAR_PERIOD,p.x,p.y,1);
 if(showChad&&cigarArt())drawCigarLight(ctx,t,p,camX,live);
}

// CHAD's super. Charge ramps in over the crouch, holds through the lunge and lets go after the pop.
const superCharge=t=>t<PB.charge?0:t<PB.burst?clamp((t-PB.charge)/10,0,1):clamp(1-(t-PB.burst-4)/18,0,1);
// The fist of each pose, logical px from his feet (measured on the registered frames).
const FISTS={'super_electric:7':[25,-50],'super_electric:8':[25,-30],'upper:1':[23,-50],'super_electric:9':[20,-76],'upper:2':[18,-76],'upper:3':[14,-86]};
function fistAt(t){const c=puriHero(t).chad;return FISTS[c.pose+':'+c.i]||[20,-60];}
function fistWorld(t,cam=PURI_CAM){const q=puriHero(t,cam),[fx,fy]=fistAt(t);return [q.x+fx,q.y+q.z+fy];}
function drawSuperCharge(ctx,t,p,camX){
 if(t<PB.charge||t>=PB.upper)return;const k=superCharge(t),x=p.x-camX,y=p.y+p.z,[fx,fy]=fistAt(t);
 if(t<PB.charge+2){const a=t===PB.charge?.7:.3,g=ctx.createRadialGradient(x,y-46,4,x,y-46,300);g.addColorStop(0,`rgba(255,240,200,${a})`);g.addColorStop(.3,`rgba(255,150,40,${a*.6})`);g.addColorStop(1,'rgba(255,90,20,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,0,480,270);ctx.restore();}
 flash(ctx,k*.1,'150,40,10');
 // the build: lines rush faster into the fist and a ring of heat contracts onto him every 8 ticks
 const build=clamp((t-PB.charge)/(PB.lunge-PB.charge),0,1);speedLines(ctx,x+fx,y+fy,Math.floor((t-PB.charge)*(1+build*2.5)),k*(t<PB.lunge?.9:.5));
 if(t<PB.lunge){const ph=pulse(t);ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,180,70,${.7*k*ph})`;ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(x+fx,y+fy,8+70*(1-ph),6+42*(1-ph),0,0,Math.PI*2);ctx.stroke();ctx.restore();}
 aura(ctx,x,y-46,64,t,k*.75,'255,130,30');aura(ctx,x+fx,y+fy,30+6*Math.sin(t*.7),t,k,'255,220,120');
 // the fist's ki: a white-hot core that grows through the charge
 {const r=(3+7*build)*(1+.18*Math.sin(t*1.3));ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x+fx,y+fy,0,x+fx,y+fy,r*2.4);g.addColorStop(0,`rgba(255,255,240,${k})`);g.addColorStop(.35,`rgba(255,220,120,${.9*k})`);g.addColorStop(1,'rgba(255,120,30,0)');ctx.fillStyle=g;ctx.fillRect(x+fx-r*2.4,y+fy-r*2.4,r*4.8,r*4.8);ctx.globalCompositeOperation='source-over';ctx.strokeStyle=`rgba(60,10,0,${.6*k})`;ctx.lineWidth=2;ctx.beginPath();ctx.arc(x+fx,y+fy,r+2,0,Math.PI*2);ctx.stroke();ctx.strokeStyle=`rgba(255,255,255,${k})`;ctx.lineWidth=1;ctx.beginPath();ctx.arc(x+fx,y+fy,r,0,Math.PI*2);ctx.stroke();ctx.restore();}
 // Fire licks off his body and sparks spiral into the fist.
 ctx.save();ctx.globalCompositeOperation='lighter';
 for(let j=0;j<16;j++){const ph=(t-PB.charge+j*5)%20/20,r=(1-ph)*48,a=j*2.4+t*.05;ctx.globalAlpha=k*ph;ctx.fillStyle=j%3?'#ffd070':'#fff6d8';ctx.fillRect(Math.round(x+fx+Math.cos(a)*r),Math.round(y+fy+Math.sin(a)*r*.7),2,2);}
 const wave=ASSETS.dv_floor_wave;if(wave){const h=wave.height/4,i=(t>>2)%4,fh=10+16*k*(1+.15*Math.sin(t*.6));ctx.globalAlpha=k*.9;ctx.drawImage(wave,0,i*h,wave.width,h,Math.round(x-34),Math.round(y+4-fh),68,Math.round(fh));}
 for(let j=0;j<12;j++){const q=(t*2+j*17)%36/36,sx=x-18+hash(j)*36+Math.sin(t*.2+j)*3,sy=y-6-q*92;ctx.globalAlpha=k*(1-q)*.9;ctx.fillStyle=q<.3?'#fff0a0':q<.6?'#ff9a30':'#c0301a';ctx.fillRect(Math.round(sx),Math.round(sy),2,3-Math.round(q*2));}
 ctx.restore();
}
// The Shoryuken trail: a corkscrew of fire and burning afterimages along the rising fist.
function drawRisingFlame(ctx,t,camX,live){
 if(!live||t<PB.lunge+2||t>=PB.burst+14)return;const fade=t<PB.burst?1:1-(t-PB.burst)/14;
 for(const [back,al] of [[6,.2],[4,.35],[2,.5]]){const q=puriHero(t-back);if(t-back<PB.lunge)continue;const f=getFrame(SPR.player,q.chad.pose,q.chad.i,1);if(!f)continue;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=fade*al;ctx.filter='sepia(1) saturate(6) hue-rotate(-20deg) brightness(1.3)';blit(ctx,f,Math.round(q.x-camX-frameW(f)/2),Math.round(q.y+q.z+(q.sink||0)-frameH(f)+4));ctx.restore();}
 // the rising fire column he leaves behind: a pillar erupting from where he left the ground
 // the fire column rises with him, from the street to above his fist, and burns out by the pop
 const pil=ASSETS.dv_inferno_pillar;if(pil&&t<PB.burst+3){const age=t-PB.lunge-2,cell=age<3?0:age<7?1:2,q=puriHero(t),[,fy]=fistAt(t),top=q.y+q.z+fy-26,h=PURI_FLOOR+4-top,w=Math.min(64,h*.48),x=q.x-camX+4,a=t<PB.burst?1:1-(t-PB.burst+1)/4;
  ctx.save();ctx.globalAlpha=a*.95;ctx.drawImage(pil,cell*96,0,96,320,Math.round(x-w/2),Math.round(top),Math.round(w),Math.round(h));
  ctx.globalCompositeOperation='lighter';ctx.globalAlpha=a*.45;ctx.drawImage(pil,cell*96,0,96,320,Math.round(x-w*.3),Math.round(top+8),Math.round(w*.6),Math.round(h-8));ctx.restore();}
 ctx.save();ctx.globalCompositeOperation='lighter';
 const steps=30;for(let i=0;i<steps;i++){const tt=t-i*.5;if(tt<PB.lunge)break;const q=puriHero(Math.floor(tt)),[fx,fy]=fistAt(Math.floor(tt)),a=tt*.9+i*.5,r=10+i*.5;
  const x=q.x-camX+fx+Math.cos(a)*r,y=q.y+q.z+fy+i*2.2+Math.sin(a)*r*.35,w=Math.max(2,7-i/5);
  ctx.globalAlpha=fade*(1-i/steps);ctx.fillStyle=i<5?'#fff4c0':i<12?'#ffb040':'#e04818';ctx.fillRect(Math.round(x-w/2),Math.round(y-w/2),Math.round(w),Math.round(w));}
 ctx.restore();
}
// Contact freeze over the hitstop: two frames of burning gradient with Pappu cut out in black and CHAD
// white-hot in front of him (the fist reads against the ball), two frames easing back to colour.
const scratch=typeof document!=='undefined'?[0,1,2].map(()=>document.createElement('canvas')):null;
function cutout(ctx,i,fill,draw){const cv=ctx.canvas,c=scratch[i];c.width=cv.width;c.height=cv.height;const sc=c.getContext('2d');sc.setTransform(ctx.getTransform());draw(sc);sc.setTransform(1,0,0,1,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle=fill;sc.fillRect(0,0,cv.width,cv.height);return c;}
function superFreeze(ctx,t,p,camX,showChad){
 const hs=G.hitstop;if(!scratch)return;if(hs<5){if(hs>=3)fistStar(ctx,p,camX,t,hs===4?.8:.45,22);return;}const full=true,[fx,fy]=fistAt(t),cx=p.x-camX+fx,cy=p.y+p.z+fy,g=ctx.createRadialGradient(cx,cy,4,cx,cy,340);
 g.addColorStop(0,'#fff8e0');g.addColorStop(.18,'#ffc050');g.addColorStop(.55,'#e2401a');g.addColorStop(1,'#4a0806');
 ctx.save();ctx.globalAlpha=full?1:.35;ctx.fillStyle=g;ctx.fillRect(0,0,480,270);
 const dark=cutout(ctx,0,'#1a0806',sc=>drawPappu(sc,t,camX,false)),hot=showChad?cutout(ctx,1,'#fff3cc',sc=>drawChad(sc,p,camX)):null,rim=showChad?cutout(ctx,2,'#2a0a04',sc=>drawChad(sc,p,camX)):null;
 ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=full?1:.5;ctx.drawImage(dark,0,0);if(hot){ctx.globalAlpha=1;const d=ctx.canvas.width/480;for(const [ox,oy] of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(rim,ox*d,oy*d);ctx.drawImage(hot,0,0);}ctx.restore();   // (a dark rim keeps his white shape off the white-hot core)
 crackFlash(ctx,t,PB.upper-2,cx+2,cy-2,0,12);fistStar(ctx,p,camX,t,1,32);
}
// The impact star on the fist: four long white points and a hot core, with a crack line into the ball.
function fistStar(ctx,p,camX,t,a,r){
 const [fx,fy]=fistAt(t),x=p.x-camX+fx+4,y=p.y+p.z+fy-2;ctx.save();ctx.globalAlpha=a;ctx.fillStyle='#fffbe8';
 for(const [ang,len] of [[0,1],[Math.PI/2,1],[Math.PI,.8],[-Math.PI/2,1.1],[Math.PI/4,.45],[-Math.PI/4,.55],[3*Math.PI/4,.4],[-3*Math.PI/4,.5]]){const L=r*len,w=r*.12;ctx.beginPath();ctx.moveTo(x+Math.cos(ang)*L,y+Math.sin(ang)*L);ctx.lineTo(x+Math.cos(ang+Math.PI/2)*w,y+Math.sin(ang+Math.PI/2)*w);ctx.lineTo(x+Math.cos(ang-Math.PI/2)*w,y+Math.sin(ang-Math.PI/2)*w);ctx.fill();}
 ctx.strokeStyle='#fff3cc';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+12,y-6);ctx.lineTo(x+20,y+2);ctx.lineTo(x+30,y-4);ctx.stroke();ctx.restore();
}
// Super letterbox: bars slide in on the charge and out after the pop.
function letterbox(ctx,t){const q=t<PB.burst?ease((t-PB.charge)/8):1-ease((t-PB.burst-8)/16),h=Math.round(22*q);if(h<=0)return;ctx.fillStyle='#000';ctx.fillRect(0,0,480,h);ctx.fillRect(0,270-h,480,h);}

// The cigar. The last chilli leaves the fireball burning and drops into his raised hand on PB.cigar; he
// holds it to the cigar until it takes, flicks it back over his shoulder and settles into idle_cigar.
// Points on chad_puri_cigar1-3, logical px from his feet facing right: the chilli's flame and the lit end.
const CIG={flame:[[-6,-98],[10,-76]],tip:[null,[9,-76.5],[8.5,-77.5]],mouth:[5,-78],hand:[-14,-84]};
function chilliFlight(t){
 // from the burst origin, high over the street and into his catching hand
 const t0=PB.burst+4,[x0,y0]=puriBurstOrigin(),x1=PURI_CAM+chadX(PB.cigar)+CIG.flame[0][0],y1=PURI_FLOOR+CIG.flame[0][1]+5,q=(t-t0)/(PB.cigar-t0);
 return [mix(x0,x1,q),mix(y0,y1,q)-110*4*q*(1-q),q];
}
const CHILLI_BACK={life:16};
function chilliBack(age){const [hx,hy]=CIG.hand,x0=PURI_CAM+chadX(PB.flick)+hx,y0=PURI_FLOOR+hy,q=age/CHILLI_BACK.life;return [x0-46*q,y0-24*q+(PURI_FLOOR-2-y0+24)*q*q,q];}
function smallFlame(ctx,x,y,t,k=1){
 ctx.save();ctx.globalCompositeOperation='lighter';const r=(4+.8*Math.sin(t*1.7))*k,g=ctx.createRadialGradient(x,y,0,x,y,r*2.2);
 g.addColorStop(0,'rgba(255,250,220,.95)');g.addColorStop(.3,'rgba(255,190,70,.7)');g.addColorStop(1,'rgba(255,90,20,0)');ctx.fillStyle=g;ctx.fillRect(x-r*2.2,y-r*2.2,r*4.4,r*4.4);ctx.restore();
}
function drawCigarLight(ctx,t,p,camX,live){
 const X=x=>Math.round(x-camX);
 // in flight: the chilli spinning on its arc with a flame and a trail of sparks
 if(t>=PB.burst+4&&t<PB.cigar){const [x,y]=chilliFlight(t);prop(ctx,7,X(x),y,t*.5,18);smallFlame(ctx,X(x),y-3,t,.8);
  if(live)embers(ctx,X(x),y,t,83,{n:3,w:8,rise:14});}
 if(t<PB.cigar)return;
 const i=p.chad.pose==='puri_cigar'?p.chad.i:-1,pt=([dx,dy])=>[X(p.x+dx),Math.round(p.y+dy)];
 // in his hand (the art draws the chilli and its flame; this is its light)
 if(i===0||i===1){const [fx,fy]=pt(CIG.flame[i]);smallFlame(ctx,fx,fy,t,i===1?.7:.9);
  if(i===1&&t>=PB.light+4&&t<PB.light+10){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.5*(1-(t-PB.light-4)/6);smallFlame(ctx,fx-1,fy+1,t,1.5);ctx.restore();}}   // the cigar takes
 // flicked away: tumbling back over his shoulder, flaring as it hits the cobbles
 if(t>=PB.flick){const age=t-PB.flick;if(age<CHILLI_BACK.life){const [x,y]=chilliBack(age);prop(ctx,7,X(x),y,-age*.6,16);smallFlame(ctx,X(x),y-2,t,.7);}
  else if(age<CHILLI_BACK.life+60){const [x]=chilliBack(CHILLI_BACK.life),k=1-(age-CHILLI_BACK.life)/60;prop(ctx,7,X(x),PURI_FLOOR-4,.3,16);if(live){smallFlame(ctx,X(x),PURI_FLOOR-6,t,.5*k);wisp(ctx,X(x),PURI_FLOOR-6,t,91,{period:60,size:.6,alpha:.4*k,smoke:true});}}}
 // the lit end: a drag while it takes, the exhale once he settles, then the idle_cigar trickle
 const lit=PB.light+6,at=b=>{if(b<lit)return null;const h=puriHero(b);if(h.chad.pose==='idle_cigar')return chadCigarAt(5,h.x,h.y,1);const c=CIG.tip[h.chad.i];return c&&{tip:[h.x+c[0],h.y+c[1]],mouth:[h.x+CIG.mouth[0],h.y+CIG.mouth[1]],face:1};};
 drawCigarReplay(ctx,camX,t,at,{drags:[[lit,PB.flick-lit-2]],exhales:[PB.cool+4],trickleEvery:9});
}

export const puriFinish={label:'Puri pop',ticks:PB.end,beats:[[PB.gut,'Gut hook'],[PB.cram,'Chilli cram'],[PB.gulp,'Gulp'],[PB.swell,'Puffing up'],[PB.ball,'Floating puri'],[PB.crack,'Cracking'],[PB.charge,'Charge'],[PB.hits[0],'Rising hits'],[PB.upper,'Uppercut'],[PB.burst,'Pop'],[PB.land,'Lands'],[PB.cigar,'Catches the chilli'],[PB.light,'Lights up']],
 pose:puriPose,update:updatePuri,draw:drawPuri,drawUnder:drawPuriUnder};
