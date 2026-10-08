// Shared boss-finisher effects: super dims, speed lines, auras, afterimages,
// silhouette impact frames and the generated punch/debris bursts.
import {getFrame,blit,frameW,frameH} from './sprites.js';
import {ASSETS} from './assets.js';
import {W,H} from './engine.js';

const scratch=typeof document!=='undefined'?document.createElement('canvas'):null;

export function dim(ctx,a){if(a<=0)return;ctx.fillStyle=`rgba(8,6,14,${Math.min(.8,a)})`;ctx.fillRect(0,0,W,H);}
export function flash(ctx,a,color='255,246,222'){if(a<=0)return;ctx.fillStyle=`rgba(${color},${Math.min(1,a)})`;ctx.fillRect(0,0,W,H);}

// Radial lines converging on (cx,cy); dir set -> horizontal streaks flowing that way.
export function speedLines(ctx,cx,cy,t,a,dir=0){
 if(a<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle=`rgba(255,236,196,${Math.min(1,a)*.55})`;
 for(let i=0;i<34;i++){
  const seed=(i*97+Math.floor(t/2)*31)%360,len=26+(seed*7)%60;
  ctx.lineWidth=.5+(seed%3)*.5;ctx.beginPath();
  if(dir){const y=(seed*13+i*17)%H,x=((seed*29+t*14*dir)%(W+120)+W+120)%(W+120)-60;ctx.moveTo(x,y);ctx.lineTo(x-dir*len,y);}
  else{const ang=i/34*Math.PI*2+seed*.01,r0=70+(seed%5)*16;ctx.moveTo(cx+Math.cos(ang)*(r0+len),cy+Math.sin(ang)*(r0+len)*.7);ctx.lineTo(cx+Math.cos(ang)*r0,cy+Math.sin(ang)*r0*.7);}
  ctx.stroke();
 }
 ctx.restore();
}

export function aura(ctx,x,y,r,t,a,color='255,150,40'){
 if(a<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';
 const pulse=r*(1+.08*Math.sin(t*.9)),g=ctx.createRadialGradient(x,y,2,x,y,pulse);
 g.addColorStop(0,`rgba(${color},${.55*a})`);g.addColorStop(.5,`rgba(${color},${.22*a})`);g.addColorStop(1,`rgba(${color},0)`);
 ctx.fillStyle=g;ctx.fillRect(x-pulse,y-pulse,pulse*2,pulse*2);
 // Embers rising through the aura.
 ctx.fillStyle=`rgba(255,220,150,${.8*a})`;
 for(let i=0;i<10;i++){const k=(t*1.6+i*23)%40,ex=x+Math.sin(i*2.3+t*.1)*r*.55,ey=y+r*.5-k*r/40;ctx.fillRect(Math.round(ex),Math.round(ey),1,2);}
 ctx.restore();
}

function draw(ctx,f,x,y){blit(ctx,f,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4));}
export function ghost(ctx,set,state,idx,x,y,face,a){if(a<=0)return;ctx.save();ctx.globalAlpha=a;draw(ctx,getFrame(set,state,idx,face),x,y);ctx.restore();}

// Solid-colour cut-out of a frame for the one-tick "negative" impact frame.
export function silhouette(ctx,set,state,idx,x,y,face,color){
 const f=getFrame(set,state,idx,face);if(!f||!scratch)return;
 scratch.width=f.width;scratch.height=f.height;const s=scratch.getContext('2d');
 s.clearRect(0,0,f.width,f.height);s.drawImage(f,0,0);s.globalCompositeOperation='source-in';s.fillStyle=color;s.fillRect(0,0,f.width,f.height);s.globalCompositeOperation='source-over';
 const k=f._as||1;ctx.drawImage(scratch,Math.round(x-frameW(f)/2),Math.round(y-frameH(f)+4),f.width/k,f.height/k);
}

// Six-frame 3x2 sheets: additive punch burst, keyed debris burst. Both scale about their centre.
function sheetFrame(ctx,im,frame,x,y,w,rot,op){
 if(!im)return;const cw=im.width/3,ch=im.height/2,h=w*ch/cw;
 ctx.save();ctx.globalCompositeOperation=op;ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot);
 ctx.drawImage(im,(frame%3)*cw,Math.floor(frame/3)*ch,cw,ch,-w/2,-h/2,w,h);ctx.restore();
}
export function punchBurst(ctx,t,at,x,y,w=120,rot=0,step=3){const age=t-at;if(age<0||age>=step*6)return;sheetFrame(ctx,ASSETS.fx_punch,Math.floor(age/step),x,y,w,rot,'lighter');}
export function debrisBurst(ctx,t,at,x,y,w=150,step=5){const age=t-at;if(age<0||age>=step*6)return;sheetFrame(ctx,ASSETS.fx_debris,Math.floor(age/step),x,y-w*.457,w,0,'source-over');}

// Real banknote sprites (conductor_notes strip of square slots).
export function note(ctx,i,x,y,spin,scale=.16){
 const im=ASSETS.nr_conductor_notes;if(!im)return;const n=Math.max(1,Math.round(im.width/im.height)),s=im.height;
 ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.rotate(spin);ctx.scale(Math.cos(spin*1.7)*.4+.6,1);
 ctx.drawImage(im,(i%n)*s,0,s,s,-s*scale/2,-s*scale/2,s*scale,s*scale);ctx.restore();
}

// Shera finisher gore (assets/fx/finisher_gore.png, tools/production/build_finisher_gore.py): 4x4 cells of 128 px
// at 2x. 0-5 mouth-blood bursts spraying to +x (small to large), 6-8 blood arcs, 9-12 teeth, 13-15 crack stars.
// Blood stays at the mouth (F3): bursts start at their root, so (x,y) is the mouth.
const BURST_HALF=[4,5.5,8,12.5,12.5,16.5],ARC_HALF=[17,31,21];
export function gore(ctx,i,x,y,{rot=0,flip=1,scale=1,alpha=1,squash=1}={}){
 const im=ASSETS.fx_gore;if(!im||alpha<=0)return;const c=im.width/4;
 ctx.save();ctx.globalAlpha*=Math.min(1,alpha);ctx.translate(Math.round(x),Math.round(y));ctx.rotate(rot);ctx.scale(flip*scale*.5,scale*.5*squash);
 ctx.drawImage(im,(i%4)*c,Math.floor(i/4)*c,c,c,-c/2,-c/2,c,c);ctx.restore();
}
// Spit and blood from the mouth: the burst grows out of the mouth for 3 ticks, drifts and drops, fades by 16.
export function bloodSpray(ctx,t,at,x,y,dir=1,size=0){
 const age=t-at;if(age<0||age>=16)return;const s=Math.min(1,.45+age*.2),half=BURST_HALF[size]*s;
 gore(ctx,size,x+dir*(half+age*.7),y+age*age*.035,{flip:dir,scale:s,rot:dir*age*.02,alpha:age<10?1:(16-age)/6});
}
// Blood arc thrown by the uppercut: one arc sprite leaving the mouth, unrolling for 6 ticks, then falling away.
export function bloodArc(ctx,t,at,x,y,dir=1,i=1){
 const age=t-at;if(age<0||age>=34)return;const s=Math.min(1,.4+age*.1),half=ARC_HALF[i]*s;
 gore(ctx,6+i,x+dir*(half+age*.5),y-10*s+Math.max(0,age-10)**2*.03,{flip:dir,scale:s,alpha:age<24?1:(34-age)/10});
}
// White crack star (rib crunch, jaw shatter): pops in, holds, shrinks out.
export function crackFlash(ctx,t,at,x,y,size=0,life=9){
 const age=t-at;if(age<0||age>=life)return;const s=age<2?.6+age*.3:age<life-3?1.1-age*.02:.8*(life-age)/3+.2;
 ctx.save();ctx.globalCompositeOperation='lighter';gore(ctx,13+size,x,y,{scale:s,rot:age*.05});ctx.restore();gore(ctx,13+size,x,y,{scale:s*.8,rot:age*.05,alpha:.8});
}
export function tooth(ctx,i,x,y,spin=0,scale=.55){gore(ctx,9+(i%4),x,y,{rot:spin,scale});}
// Floor decal: a burst flattened onto the boards, darkened (drawn under the actors).
export function bloodDecal(ctx,x,y,i=2,grow=1){
 ctx.save();ctx.filter='brightness(.8)';gore(ctx,i,x,y,{squash:.3,scale:grow,alpha:.95});ctx.restore();
}
