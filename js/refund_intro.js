// "The Callback": a caller mid-scam is reeled into the wall by his own headset cord,
// CHAD comes through the bricks holding the other end, throws him onto his desk,
// then answers the next scam call personally. Timeline-owned; the wreck persists.
import { G, clamp } from './engine.js';
import { ASSETS } from './assets.js';
import { spawnDust, spawnDebris, spawnSpark } from './effects.js';
import { updateOfficeEvacuation } from './india_office.js';
import { drawContactShadow } from './contact_shadow.js';
import { drawDialogue, updateDialogue } from './room_dialogue.js';
const mix=(a,b,q)=>a+(b-a)*clamp(q,0,1);
const ease=q=>{q=clamp(q,0,1);return q*q*(3-2*q);};
const out3=q=>1-(1-clamp(q,0,1))**3;
const hash=n=>{const v=Math.sin(n*127.1+311.7)*43758.5453;return v-Math.floor(v);};
function once(key,t,at,fn){const s=G.india;if(t>=at&&!s.cues.has(key)){s.cues.add(key);fn();}}
export const CB={line:16,tug:150,yank:176,drag:184,slam:202,splat:212,crack:234,buckle:250,boom:264,land:284,called:296,getup:326,kneel:332,
 toss:360,neck:378,walk:402,grab:430,lift:448,wind:474,release:488,crash:502,sprawl:518,ring:522,step:540,reach:556,pickup:568,
 hello:574,crush:664,open:682,flee:670,settle:772,end:940};
const LINE='Sir, your refund is ready. Just read me the gift card numb-',CALLED='You called?',HELLO='Sir, your refund is ready!';
// Stage geometry, logical px: the desk-one caller, the cable's way through the bricks (CHAD pulls from behind), the phone left on the wrecked desk.
const SEAT={x:269,y:201},JACK={x:58,y:201},ANCHOR={x:50,y:104},WALL_X=72,KNEEL={x:196,y:212},GRAB_X=144,PHONE={x:212,y:157},HOLE={x:62,y:205};
const CHAD_PHONE_X=160,DESK={x:246,y:203,z:46},SPRAWL={x:266,y:215},HEADSET_REST={x:50,y:226},TOSS_HAND={x:58,y:142};
// Atlas frames: victim 4x3 (yank, wall, thrown), CHAD 4x3 (breach, grab pair, phone), props 5x1.
const V={talk:0,jolt:1,air:2,drag:3,splat:4,blast:5,back:6,kneel:7,fly:8,tumble:9,fall:10,sprawl:11};
const C={step:0,called:1,toss:2,neck:3,grab:4,lift:5,wind:6,release:7,reach:8,ear:9,crush:10,open:11};

// Caller: [frame, x, y, z, squashX, squashY]
export function callbackVictim(t){
 if(t<CB.tug)return[V.talk,SEAT.x,SEAT.y,0];
 if(t<CB.yank)return[V.jolt,SEAT.x-Math.min(3,(t-CB.tug)*.6),SEAT.y,0];
 if(t<CB.drag){const q=(t-CB.yank)/(CB.drag-CB.yank);return[V.air,mix(SEAT.x-4,236,q),mix(SEAT.y,205,q),Math.sin(q*Math.PI)*13+4*(1-q)];}
 // Belly-down and accelerating, then the last jerk flings him up into the bricks face-first.
 if(t<CB.slam){const q=(t-CB.drag)/(CB.slam-CB.drag);return[V.drag,mix(236,WALL_X+46,q*q),mix(205,207,q),0];}
 if(t<CB.splat){const q=(t-CB.slam)/(CB.splat-CB.slam);return[V.air,mix(WALL_X+46,WALL_X+40,q)-q*q*20,mix(207,206,q),Math.sin(q*Math.PI*.8)*16];}
 if(t<CB.boom){const a=t-CB.splat;return[V.splat,WALL_X+Math.min(1,a*.25),206+Math.min(2,Math.max(0,t-CB.buckle)*.2),0,a<4?.82+a*.045:1,1];}
 if(t<CB.land){const q=(t-CB.boom)/(CB.land-CB.boom);return[V.blast,mix(WALL_X+8,KNEEL.x-6,out3(q)),mix(206,KNEEL.y,q),Math.sin(Math.sqrt(q)*Math.PI)*30];}
 if(t<CB.land+8){const a=t-CB.land;return[V.back,KNEEL.x-6,KNEEL.y,a<4?0:Math.sin((a-4)/4*Math.PI)*3,1,a<4?.84+a*.04:1];}
 if(t<CB.getup)return[V.back,KNEEL.x-6,KNEEL.y,0];
 if(t<CB.kneel)return[V.fall,KNEEL.x-3,KNEEL.y,Math.sin((t-CB.getup)/6*Math.PI)*3];
 // Groggy on hands and knees; a slow breath keeps him alive on screen.
 if(t<CB.grab)return[V.kneel,KNEEL.x+(t<CB.kneel+16?Math.round(Math.sin(t*.35)):0),KNEEL.y,0,1,(t-CB.kneel)%40<20?1:.98];
 if(t<CB.release)return null; // drawn inside CHAD's paired frames
 if(t<CB.crash){const q=(t-CB.release)/(CB.crash-CB.release);
  return[q<.35?V.fly:q<.7?V.tumble:V.fall,mix(GRAB_X+48,DESK.x,q),mix(KNEEL.y,DESK.y,q),mix(39,DESK.z,q)+Math.sin(q*Math.PI)*10];}
 // Flat on the desktop as it gives way, then he rolls off the front onto the floor.
 if(t<CB.crash+7){const a=t-CB.crash;return[V.back,DESK.x,DESK.y,DESK.z-Math.min(4,a),1,a<3?.82+a*.06:1];}
 if(t<CB.sprawl){const q=(t-CB.crash-7)/(CB.sprawl-CB.crash-7);return[V.fall,mix(DESK.x,SPRAWL.x,q),mix(DESK.y,SPRAWL.y,q),(DESK.z-4)*(1-q*q)];}
 if(t<CB.sprawl+5){const a=t-CB.sprawl;return[V.sprawl,SPRAWL.x,SPRAWL.y,0,1,a<3?.86:1];}
 return[V.sprawl,SPRAWL.x,SPRAWL.y,0];
}
// CHAD: [kind, frame, x, y, z]; kind 'cb'/'breach' are atlases, 'walk'/'idle' the gameplay sprite.
export function callbackChad(t){
 if(t<CB.boom)return null;
 if(t<CB.called){const q=(t-CB.boom)/(CB.called-CB.boom);return['cb',C.step,mix(HOLE.x,100,ease(q)),mix(HOLE.y,KNEEL.y,q),Math.abs(Math.sin(q*Math.PI*2))*2];}
 if(t<CB.toss)return['cb',C.called,100,KNEEL.y,0];
 if(t<CB.neck)return['cb',C.toss,100,KNEEL.y,0];
 if(t<CB.walk)return['cb',C.neck,100,KNEEL.y-(t>=CB.neck+12&&t<CB.neck+15?1:0),0];
 if(t<CB.grab)return['walk',null,mix(100,GRAB_X,(t-CB.walk)/(CB.grab-CB.walk)),KNEEL.y,0];
 if(t<CB.lift)return['cb',C.grab,GRAB_X,KNEEL.y,0];
 if(t<CB.wind)return['cb',C.lift,GRAB_X+(t<CB.lift+16?Math.round(Math.sin(t*1.7)):0),KNEEL.y,0];
 if(t<CB.release)return['cb',C.wind,GRAB_X-Math.min(4,t-CB.wind)*.5,KNEEL.y,0];
 if(t<CB.release+18)return['cb',C.release,GRAB_X+2,KNEEL.y,0];
 // Recover from the lunge with one planted step, then watch the wreck.
 if(t<CB.release+24)return['walk',null,GRAB_X+2+(t-CB.release-18)*.5,KNEEL.y,0,7];
 if(t<CB.step)return['breach',11,GRAB_X+5,KNEEL.y,0];
 if(t<CB.reach)return['walk',null,mix(GRAB_X+5,CHAD_PHONE_X,(t-CB.step)/(CB.reach-CB.step)),KNEEL.y,0];
 if(t<CB.pickup)return['cb',C.reach,CHAD_PHONE_X,KNEEL.y,0];
 if(t<CB.crush)return['cb',C.ear,CHAD_PHONE_X,KNEEL.y,0];
 if(t<CB.open)return['cb',C.crush,CHAD_PHONE_X+(t<CB.crush+10?Math.round(Math.sin(t*2.3)):0),KNEEL.y,0];
 // Holds the open hand through the Duke line, then brushes off the brick dust and stands ready.
 if(t<CB.settle)return['cb',C.open,CHAD_PHONE_X,KNEEL.y,0];
 const s=t-CB.settle;
 if(s<96)return['breach',s<34?8:s<70?(Math.floor((s-34)/12)%2?8:9):10,CHAD_PHONE_X,KNEEL.y,0];
 return['breach',11,CHAD_PHONE_X,KNEEL.y,0];
}
const ringing=t=>t>=CB.ring&&t<CB.pickup&&(t-CB.ring)%30<24;

export function updateRefundEntrance(t){
 const s=G.india,p=G.player,a=G.audio;s.refundBreachT=t;
 const c=callbackChad(t);
 p.x=c?c[2]:HOLE.x;p.y=c?c[3]:HOLE.y;p.z=0;p.state='idle';p.t=t;p.face=1;
 const caller=s.office?.[0];
 if(caller){caller.scripted=true;caller.chairDx=t<CB.yank?0:26*ease((t-CB.yank)/22);
  // Out of the chair for good: play resumes with this seat empty (initOfficeWorkers agrees once the wall is down).
  if(t>=CB.yank&&caller.phase!=='gone'){caller.phase='gone';caller.leftAt=s.t;}}
 if(t>=CB.line&&t<CB.tug)updateDialogue(LINE,t-CB.line,{remaining:CB.tug-t});
 if(t>=CB.called&&t<CB.toss)updateDialogue(CALLED,t-CB.called-2,{remaining:CB.toss-t});
 if(t>=CB.hello&&t<CB.crush){updateDialogue(HELLO,t-CB.hello,{remaining:CB.crush-t});
  // The pitch comes down the line: a small squawk between keystrokes.
  if((t-CB.hello)%6===3&&t-CB.hello<2*HELLO.length)a.sfx('phone_squawk');}
 // Act one: the cord.
 once('cb-tug',t,CB.tug,()=>{a.sfx('neta_roof_whip');a.sfx('neta_roof_yelp1');G.shake=1;});
 once('cb-yank',t,CB.yank,()=>{a.sfx('neta_roof_whip');a.sfx('neta_roof_scream');a.roomSfx('room_chair',.32);spawnDust(SEAT.x,SEAT.y,3);});
 for(const at of [CB.drag+4,CB.drag+10,CB.drag+15])once('cb-skid'+at,t,at,()=>spawnDust(callbackVictim(t)[1]+30,207,2));
 once('cb-jerk',t,CB.slam,()=>a.sfx('neta_roof_whip'));
 once('cb-splat',t,CB.splat,()=>{a.sfx('neta_roof_thud');a.sfx('ehurt2');G.shake=4;spawnDust(WALL_X-2,205,4);spawnDust(WALL_X-6,150,2);});
 once('cb-crack',t,CB.crack,()=>{s.wallCracked=true;a.roomSfx('entrance_crack',.3);G.shake=2;});
 once('cb-buckle',t,CB.buckle,()=>{a.roomSfx('entrance_crack',.38);G.shake=3;spawnDust(78,183,4);});
 // Act two: CHAD comes through the bricks.
 once('cb-boom',t,CB.boom,()=>{s.wallBroken=true;s.refundBreachDone=true;G.shake=10;a.sfx('entrance_slam');a.sfx('entrance_heavy');a.sfx('neta_roof_yelp3');
  spawnDebris(64,204,10,['#86472d','#a66a41','#bda082']);spawnDust(86,222,12);});
 once('cb-land',t,CB.land,()=>{a.sfx('neta_roof_drop');G.shake=3;spawnDust(KNEEL.x-6,KNEEL.y,6);});
 once('cb-boot',t,CB.boom+18,()=>a.roomSfx('entrance_boot',.42));
 once('cb-groan',t,CB.getup,()=>a.sfx('neta_roof_whimper'));
 once('cb-toss',t,CB.toss+2,()=>a.sfx('whiff'));
 once('cb-headset',t,CB.toss+14,()=>{a.sfx('cond_clatter');spawnDust(HEADSET_REST.x,HEADSET_REST.y,2);});
 once('cb-neck',t,CB.neck+12,()=>a.sfx('bone_crack'));
 once('cb-grab',t,CB.grab,()=>{a.sfx('grab');a.sfx('neta_roof_yelp2');});
 once('cb-lift',t,CB.lift,()=>a.sfx('neta_roof_whimper'));
 once('cb-throw',t,CB.release,()=>{a.sfx('throw');a.sfx('neta_roof_scream');});
 once('cb-crash',t,CB.crash,()=>{s.deskWrecked=true;G.shake=8;a.sfx('break');a.sfx('cond_crash');a.sfx('slam');spawnDust(DESK.x,DESK.y-40,6);spawnDust(DESK.x,DESK.y,5);});
 once('cb-sprawl',t,CB.sprawl,()=>{a.sfx('neta_roof_ko');G.shake=2;spawnDust(SPRAWL.x,SPRAWL.y,5);});
 // Act three: the next call.
 for(const at of [CB.ring,CB.ring+30])once('cb-ring'+at,t,at,()=>a.roomSfx('refund_ring',.42));
 once('cb-pickup',t,CB.pickup,()=>a.roomSfx('room_pen',.3));
 once('cb-crush',t,CB.crush+3,()=>{a.sfx('break_metal');a.sfx('bone_crack');G.shake=3;
  const x=CHAD_PHONE_X+15,y=KNEEL.y-70;spawnSpark(x,y);spawnDebris(x+3,y+8,12,['#141418','#2c2c33','#55555e','#8b8b93']);});
 once('cb-quote',t,CB.crush+6,()=>a.voice('duke_failure_to_communicate',3300,true));
 for(const at of [CB.settle+34,CB.settle+58])once('cb-brush'+at,t,at,()=>spawnDust(CHAD_PHONE_X,170,3));
 updateOfficeEvacuation(t,CB.boom,CB.flee);
}

const OBJECTS=[
 // [sprite, tick, x, y, horizontal speed, lift, gravity, floor, scale, seed]
 // Bricks stay close to the hole so the actor lane is clear; the desk spills forward and down, one item after another.
 // Big bricks leave the hole low and roll forward, clear of CHAD's walking lane.
 [0,CB.boom,70,190,.45,-2.2,.24,250,1,1], [1,CB.boom,74,186,.95,-2.6,.24,256,1,2],
 [3,CB.boom,78,194,1.5,-1.8,.25,246,.9,3],
 ...Array.from({length:11},(_,i)=>[i%3===0?1:2,CB.boom,62+hash(i+8)*14,150+hash(i+13)*45,.8+hash(i+18)*2.2,-2.2-hash(i+23)*3,.27,222+hash(i+28)*20,i%3===0?.52:.8,i+31]),
 [4,CB.crash,251,147,2.9,-1.2,.32,240,1,51], [5,CB.crash+3,212,150,2.4,-1.4,.32,230,1,52],
 [6,CB.crash+5,280,152,2.1,-1.6,.32,242,1,53], [8,CB.crash+2,251,155,-.4,-1.2,.32,246,1,54],
 [10,CB.crash+8,212,153,1.4,-1.4,.32,229,1,55], [7,CB.crash+6,283,146,1.8,-1,.32,224,1,56],
 ...Array.from({length:7},(_,i)=>[9,CB.crash+i,250+hash(i+41)*38,150,1.2+hash(i+51)*2.1,-1-hash(i+61)*1.2,.3,222+hash(i+71)*21,.62,i+81]),
];
const DIMS=[[34,37],[23,22],[12,7.5],[14.5,18],[36.5,33.5],[15.5,8],[7.5,9],[15,12],[32.5,24],[13.5,15],[14.5,12],[23,13.5]];
export function refundDebrisPose(d,t){
 const [i,at,x0,y0,vx,vy,g,ground,scale,seed]=d,a=t-at;if(a<0)return null;
 const angle=i===8?-Math.PI/6:(hash(seed)*2-1)*(i===9?.4:.85),hw=DIMS[i][0]*scale/2,hh=DIMS[i][1]*scale/2;
 const flat=i===8?.6:i===9?.3:i===7?.4:1;
 const bottom=Math.abs(Math.sin(angle))*hw+Math.abs(Math.cos(angle))*hh,floor=ground-bottom;
 const land=(-vy+Math.sqrt(vy*vy+2*g*Math.max(0,floor-y0)))/g;
 const up=-(vy+g*land)*.23,hop=-2*up/g;
 let x,y,rot,projection=1;
 if(a<land){x=x0+vx*a;y=y0+vy*a+g*a*a/2;rot=angle+(a-land)*.055*(seed%2?-1:1);}
 else if(a<land+hop){const b=a-land;projection=mix(1,flat,b/hop);x=x0+vx*land+vx*.33*b;y=ground-bottom*projection+up*b+g*b*b/2;rot=angle;}
 else{x=x0+vx*(land+hop*.33);projection=flat;y=ground-bottom*projection;rot=angle;}
 return{x,y,angle:rot,projection,settled:a>=land+hop,sprite:i,scale,ground};
}
const introT=()=>G.state==='intro'?(G.india.refundBreachT||0):CB.end;
// Sole-registered 2x cells; squash scales about the feet (and about the wall side for the splat).
function victimSprite(ctx,frame,x,y,z,camX,sx=1,sy=1){
 const im=ASSETS.ic_callback_victim;if(!im)return false;
 ctx.save();ctx.translate(Math.round(x-camX)+(frame===V.splat?-14:0),Math.round(y-z));ctx.scale(sx,sy);
 ctx.drawImage(im,frame%4*360,Math.floor(frame/4)*300,360,300,-90+(frame===V.splat?14:0),-146.5,180,150);ctx.restore();return true;
}
function prop(ctx,frame,x,y,camX,dx=0){
 const im=ASSETS.ic_callback_props;if(!im)return false;
 ctx.drawImage(im,frame*160,0,160,120,Math.round(x-camX+dx)-40,Math.round(y)-50,80,60);return true;
}
// The loose headset, with a faint rim so it reads against the rubble.
function headset(ctx,x,y,camX,angle=0){
 const im=ASSETS.ic_callback_props;if(!im)return;
 ctx.save();ctx.translate(Math.round(x-camX),Math.round(y));ctx.rotate(angle);
 ctx.save();ctx.filter='brightness(0) invert(1)';ctx.globalAlpha=.16;
 for(const [ox,oy]of [[-1,0],[1,0],[0,-1],[0,1]])ctx.drawImage(im,640,0,160,120,-40+ox,-29+oy,80,60);
 ctx.restore();ctx.drawImage(im,640,0,160,120,-40,-29,80,60);ctx.restore();
}
// Coiled phone cable: a dark core with curl ticks that spread out and catch more light as it stretches.
// `twang` adds a thin highlight along the top edge for the moment it snaps tight.
// Coil art (tools/production/build_refund_callback.py, 2x): 16px columns holding a seamless relaxed coil, a stretched coil and the torn end.
const CORD_ART={slack:[0,4],taut:[16,11]},CORD_W=.8;
// Lays the coil tile along the path with a continuous phase, so the coils run unbroken round bends.
function coilArt(ctx,pts,taut){
 const im=ASSETS.ic_callback_cord;if(!im)return false;
 const [sx,p]=taut>.5?CORD_ART.taut:CORD_ART.slack,w=8*CORD_W,ph=p/2;
 ctx.save();ctx.imageSmoothingEnabled=true;let s=0;
 for(let i=1;i<pts.length;i++){
  const [ax,ay]=pts[i-1],[bx,by]=pts[i],l=Math.hypot(bx-ax,by-ay);if(l<.01)continue;
  ctx.save();ctx.translate(ax,ay);ctx.rotate(Math.atan2(by-ay,bx-ax)-Math.PI/2);
  // Slightly overlapped slices hide the hairline seams at each bend.
  for(let d=0;d<l;){const off=(s+d)%ph,r=Math.min(ph-off,l-d);ctx.drawImage(im,sx,off*2,16,Math.max(.5,r*2),-w/2,d,w,r+.35);d+=r;}
  ctx.restore();s+=l;
 }
 ctx.restore();return true;
}
function coil(ctx,pts,taut=0,twang=0){
 if(coilArt(ctx,pts,taut)){if(twang){ctx.save();ctx.lineCap='round';ctx.lineWidth=.8;ctx.strokeStyle='rgba(205,200,212,.7)';ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y-.9):ctx.moveTo(x,y-.9));ctx.stroke();ctx.restore();}return;}
 const len=[0];for(let i=1;i<pts.length;i++)len.push(len[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
 const line=(dy=0)=>{ctx.beginPath();pts.forEach(([x,y],i)=>i?ctx.lineTo(x,y+dy):ctx.moveTo(x,y+dy));ctx.stroke();};
 ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
 ctx.lineWidth=2.4;ctx.strokeStyle='#0b0a0d';line();
 ctx.lineWidth=1;ctx.strokeStyle=taut?'#57525e':'#3b3741';ctx.beginPath();
 for(let d=1,j=1,step=mix(2.3,4.2,taut);d<len[len.length-1];d+=step){while(j<len.length-1&&len[j]<d)j++;
  const [ax,ay]=pts[j-1],[bx,by]=pts[j],l=Math.max(.001,len[j]-len[j-1]),q=(d-len[j-1])/l,x=mix(ax,bx,q),y=mix(ay,by,q),tx=(bx-ax)/l,ty=(by-ay)/l;
  ctx.moveTo(x-ty*1.4-tx*.7,y+tx*1.4-ty*.7);ctx.lineTo(x+ty*1.4+tx*.7,y-tx*1.4+ty*.7);}
 ctx.stroke();
 if(twang){ctx.lineWidth=.8;ctx.strokeStyle='rgba(205,200,212,.85)';line(-.9);}
 ctx.restore();
}
const straight=(x0,y0,x1,y1,sag=0)=>{const n=Math.max(4,Math.ceil(Math.hypot(x1-x0,y1-y0)/3));return Array.from({length:n+1},(_,i)=>{const q=i/n;return[mix(x0,x1,q),mix(y0,y1,q)+Math.sin(q*Math.PI)*sag];});};
function cord(ctx,x0,y0,x1,y1,sag,taut=0,twang=0){coil(ctx,straight(x0,y0,x1,y1,sag),taut,twang);}
// The slack cable during the call: down from the headset, a loose loop on the floor, then a soft droop up to the hole in the bricks.
function slackCord(camX){
 const x0=SEAT.x+7,pts=[[x0,SEAT.y-60],[x0+3,SEAT.y-34],[x0-2,SEAT.y-6]];
 for(let i=0;i<=18;i++){const q=i/18;pts.push([mix(SEAT.x-8,JACK.x+30,q),mix(SEAT.y+4,JACK.y+3,q)+Math.sin(q*8+1.3)*2*(1-q*.5)]);}
 // One lazy coil lying on the floor.
 const lx=JACK.x+46,ly=JACK.y+5;let k=pts.findIndex(([x])=>x<lx);
 const loop=Array.from({length:14},(_,i)=>{const a=i/13*Math.PI*2;return[lx-Math.sin(a)*7,ly-3+Math.cos(a)*3.2];});
 pts.splice(k,0,...loop);
 // From the floor the cable hangs up to the hole: a slack curve bellied out from the wall.
 for(let i=1;i<=14;i++){const q=i/14;pts.push([mix(JACK.x+30,ANCHOR.x,q)+Math.sin(q*Math.PI)*-4,mix(JACK.y+3,ANCHOR.y,1-(1-q)**1.8)]);}
 return pts.map(([x,y])=>[x-camX,y]);
}
// The taut cord from the caller's rear ear cup to the hole: snaps from a sagging curve to a straight line in 3 ticks.
function tautCord(ctx,t,v,camX){
 const [hx,hy]=headsetEnd(v),pull=t>=CB.splat&&[CB.crack,CB.buckle].some(at=>t>=at&&t<at+3)?1:0;
 const q=clamp((t-CB.tug)/3,0,1);
 coil(ctx,straight(hx-camX,hy,ANCHOR.x-camX-pull,ANCHOR.y,mix(26,t<CB.yank?.6:0,ease(q))),1,t-CB.tug<2||t>=CB.yank&&t-CB.yank<2||pull?1:0);
}
// The cable's exit: a punched hole in the bricks, with a few hairline cracks.
function cordHole(ctx,camX){
 const x=Math.round(ANCHOR.x-camX),y=ANCHOR.y;
 ctx.save();ctx.fillStyle='#070505';ctx.beginPath();ctx.ellipse(x,y,3,2.6,0,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='rgba(20,10,8,.85)';ctx.lineWidth=1;ctx.beginPath();
 for(const [dx,dy]of [[-6,-4],[5,-5],[-5,5],[6,3]]){ctx.moveTo(x+dx*.45,y+dy*.45);ctx.lineTo(x+dx,y+dy);}
 ctx.stroke();ctx.fillStyle='rgba(214,160,120,.55)';ctx.fillRect(x-3,y-3,2,1);ctx.fillRect(x+1,y+2,2,1);ctx.restore();
}
// The ear cup the cable leaves in each yank frame (logical px from the sprite anchor); drawn first, so it runs behind his head.
function headsetEnd(v){
 const [f,x,y,z]=v;
 return f===V.jolt||f===V.talk?[x+5,y-62]:f===V.air?[x-19,y-z-31.5]:f===V.drag?[x-17.5,y-z-24]:[x+2,y-z-84];
}
// Under the caller during the call and the jolt; later, the persistent KO'd caller and the dropped headset.
export function drawCallbackSeat(ctx,camX){
 const t=introT(),v=callbackVictim(t);
 if(t<CB.tug)coil(ctx,slackCord(camX));
 // Behind the seated caller, so it leaves his rear ear cup and never crosses his face or arms.
 else if(t<CB.yank&&v)tautCord(ctx,t,v,camX);
 if(v&&v[0]<=V.jolt)victimSprite(ctx,v[0],v[1],v[2],v[3],camX);
}
export function drawRefundEntranceSet(ctx,camX,front=false){
 const s=G.india;if(G.stage?.id!=='refund'||!s||s.review?.environment===false||!s.refundBreachDone)return;
 const t=introT();
 if(!front&&t>=CB.crash){const im=ASSETS.ic_callback_desk||ASSETS.ic_refund_entrance_desk;if(im)ctx.drawImage(im,195-camX,119,122.5,80);}
 if(!front&&t>=CB.crash)drawPhone(ctx,t,camX);
 if(!front&&G.state!=='intro'){
  // The caller stays out cold below his wrecked desk; his headset lies where CHAD dropped it.
  drawContactShadow(ctx,SPRAWL.x-camX,SPRAWL.y,24,0,.7);victimSprite(ctx,V.sprawl,SPRAWL.x,SPRAWL.y,0,camX);
  headset(ctx,HEADSET_REST.x,HEADSET_REST.y,camX,.3);
 }
 const im=ASSETS.ic_refund_entrance_debris;if(!im||s.review?.fx===false)return;
 for(const d of OBJECTS){const p=refundDebrisPose(d,t);if(!p||p.x-camX<-45||p.x-camX>525)continue;
  // Everything stays below the actors: bricks pass behind CHAD, desk items behind the caller.
  if(front)continue;
  if(p.settled)drawContactShadow(ctx,p.x-camX,p.ground,Math.max(3,DIMS[p.sprite][0]*p.scale*.42),0,.45);
  ctx.save();ctx.translate(Math.round(p.x-camX),Math.round(p.y));ctx.scale(1,p.projection);ctx.rotate(p.angle);
  ctx.drawImage(im,p.sprite%4*128,Math.floor(p.sprite/4)*128,128,128,-32*p.scale,-32*p.scale,64*p.scale,64*p.scale);ctx.restore();
 }
}
// The one phone left standing on the wreck: rings, gets answered, never rings again.
function drawPhone(ctx,t,camX){
 const ring=ringing(t),lifted=t>=CB.pickup,frame=lifted?3:ring?1+(Math.floor(t/3)%2):0;
 prop(ctx,frame,PHONE.x,PHONE.y,camX,ring?(Math.floor(t/2)%2?1:-1):0);
 if(ring){
  // Comic ring strokes: short bright bursts either side of the jumping handset.
  const x=Math.round(PHONE.x-camX)-4,y=PHONE.y-13,k=Math.floor(t/4)%2?1:0;
  ctx.save();ctx.strokeStyle='#ffe9b0';ctx.lineWidth=1;ctx.globalAlpha=.95;ctx.beginPath();
  for(const side of [-1,1])for(let i=0;i<3;i++){const ang=(-.6+i*.6)+(side<0?Math.PI:0),r0=9+k,r1=14+k;
   ctx.moveTo(x+Math.cos(ang)*r0,y+Math.sin(ang)*r0*.8);ctx.lineTo(x+Math.cos(ang)*r1,y+Math.sin(ang)*r1*.8);}
  ctx.stroke();ctx.restore();
 }
 // After the crush, the torn cord end hangs off the desk edge.
 if(t>=CB.crush+3){const im=ASSETS.ic_callback_cord;
  if(im)ctx.drawImage(im,32,0,16,42,Math.round(PHONE.x+8-camX)-4*CORD_W*2,PHONE.y-3,16*CORD_W,21*CORD_W);
  else cord(ctx,PHONE.x+3-camX,PHONE.y-3,PHONE.x+12-camX,PHONE.y+15,3);}
}
export function drawRefundEntrance(ctx,t,frame,fallback){
 const camX=G.camX,v=callbackVictim(t),c=callbackChad(t);
 if(t<CB.boom)cordHole(ctx,camX);
 // The taut cord: from the caller's headset straight back to the hole CHAD is pulling it through, until the wall comes down.
 // Before the yank it is drawn behind the seated caller (drawCallbackSeat); at the splat it stays plugged in, twitching with each pull.
 if(t>=CB.tug&&t<CB.boom&&v){
  if(t>=CB.yank)tautCord(ctx,t,v,camX);
 }
 if(v&&v[0]>V.jolt){
  drawContactShadow(ctx,v[1]-camX,Math.max(v[2],v[0]===V.splat?206:0),v[0]===V.splat||v[0]===V.kneel?12:22,v[3],.85);
  victimSprite(ctx,v[0],v[1],v[2],v[3],camX,v[4]||1,v[5]||1);
 }
 if(c){
  const [kind,f,x,y,z,wf]=c;drawContactShadow(ctx,x-camX,y,16,z,.9);
  // Phone cord from the handset in CHAD's hand back to the base on the wrecked desk.
  if(kind==='cb'&&(f===C.ear||f===C.crush&&t<CB.crush+3)){
   const hand=f===C.ear?[x+10,y-56]:[x+16,y-56];
   cord(ctx,hand[0]-camX,hand[1],PHONE.x-camX+3,PHONE.y-3,f===C.ear?10:6,.2);
  }
  const drawn=kind==='cb'?frame(ctx,'ic_callback_chad',f,x-camX,y-z+3.5,280,150,4,3):
   kind==='breach'?frame(ctx,'ic_refund_breach',f,x-camX,y-z+3.5,180,150,4,3):false;
  if(!drawn)fallback(kind==='walk'?'walk':'idle',wf??(kind==='walk'?Math.floor(t/5):Math.floor(t/7)),x,y);
 }
 // The headset leaves CHAD's backhand, spins over the rubble and clatters behind him.
 if(t>=CB.toss&&t<CB.toss+14){const q=(t-CB.toss)/14;headset(ctx,mix(TOSS_HAND.x,HEADSET_REST.x,q),mix(TOSS_HAND.y,HEADSET_REST.y,q)-Math.sin(q*Math.PI)*20,camX,q*7);}
 else if(t>=CB.toss+14)headset(ctx,HEADSET_REST.x,HEADSET_REST.y,camX,.3);
 drawRefundEntranceSet(ctx,camX,true);
 // Speech: the caller's pitch, CHAD's answer, and the same pitch again out of the handset.
 if(t>=CB.line&&t<CB.tug)drawDialogue(ctx,{text:LINE,x:SEAT.x-4-camX,bottom:SEAT.y-76,age:t-CB.line,remaining:Math.max(0,(CB.tug-t)*4),width:190});
 if(t>=CB.called&&t<CB.toss)drawDialogue(ctx,{text:CALLED,x:104-camX,bottom:KNEEL.y-94,age:t-CB.called-2,remaining:CB.toss-t,width:100});
 if(t>=CB.hello&&t<CB.crush){
  // The handset at CHAD's ear speaks: the pointer lands on the earpiece and signal arcs pulse off it.
  const hx=CHAD_PHONE_X+5-camX,hy=KNEEL.y-76;
  drawDialogue(ctx,{text:HELLO,x:hx+40,bottom:hy-14,age:t-CB.hello,remaining:CB.crush-t,width:170,tip:[hx+1,hy-5]});
  ctx.save();ctx.lineCap='round';
  for(let i=0;i<3;i++){const ph=((t-CB.hello)/5+i)%3;ctx.globalAlpha=Math.max(0,.95-ph*.3);
   for(const [w,col]of [[3.2,'#1a1012'],[1.6,'#fff0c4']]){ctx.lineWidth=w;ctx.strokeStyle=col;ctx.beginPath();ctx.arc(hx+3,hy,5+ph*4,-.85,.85);ctx.stroke();}}
  ctx.restore();
 }
}
export function drawRefundIntroOverlay(ctx,t){
 for(const [at,len,alpha]of [[CB.boom,7,.48],[CB.crash,4,.22]]){const a=t-at;
  if(a>=0&&a<len){ctx.save();ctx.globalAlpha=(1-a/len)*alpha;ctx.fillStyle='#f6e4c7';ctx.fillRect(0,0,480,270);ctx.restore();}}
 // A short settling cloud keeps the contact readable, then clears the room.
 if(t>=CB.boom&&t<CB.boom+56){const a=t-CB.boom;ctx.save();ctx.globalAlpha=.15*(1-a/56);ctx.fillStyle='#b29b80';ctx.beginPath();ctx.ellipse(70+a*.6,174,26+a*.6,35+a*.6,0,0,Math.PI*2);ctx.fill();ctx.restore();}
}
