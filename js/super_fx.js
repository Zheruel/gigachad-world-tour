// Gameplay super presentation: a spotlight dim and aura while CHAD winds up, sparks on
// each contact, and a silhouette freeze plus punch burst on the final blow. Draw-only:
// everything reads the existing super clock (p.superT) and hitstop.
import {G,W,H,clamp} from './engine.js';
import {superCues} from './boxing_combos.js';
import {dim,speedLines,aura,punchBurst} from './finisher_fx.js';

const scratch=typeof document!=='undefined'?document.createElement('canvas'):null;
function state(){
 const p=G.player;if(p?.state!=='special'||!p.specialTarget)return null;
 const c=superCues(p),final=c.hits.at(-1),electric=c.finish==='upper';
 return {p,e:p.specialTarget,t:p.superT,c,final,electric,color:electric?'130,200,255':'255,150,40'};
}
const hitPos=(s,h)=>[s.e.x-s.p.face*9-G.camX,s.e.y-h.height];
const freezing=s=>!s.p.superGuarded&&s.t===s.final.at&&G.hitstop>=4;

// Under the actors: the arena darkens so CHAD and his target read as lit.
export function drawSuperUnder(ctx){
 const s=state();if(!s)return;
 const {p,t,final}=s,x=p.x-G.camX,y=p.y-p.z;
 dim(ctx,.5*clamp(t/8,0,1)*clamp((final.at+24-t)/16,0,1));
 const a=t<final.at?clamp(t/6,0,1)*(t<16?1:.55):clamp(1-(t-final.at)/10,0,1);
 aura(ctx,x,y-44,t<16?58:44,t,a,s.color);
}

// Over the actors: start-up lines, contact bursts, the final freeze and blast.
export function drawSuperOver(ctx,drawActors){
 const s=state();if(!s)return;
 const {p,t,final}=s,x=p.x-G.camX,y=p.y-p.z;
 if(t<16)speedLines(ctx,x+p.face*6,y-50,t,clamp(1-t/16,0,1)*.9);
 for(const h of s.c.hits)if(h!==final){const [hx,hy]=hitPos(s,h);punchBurst(ctx,t,h.at,hx,hy,58,s.electric?-Math.PI/2*.6:0,2);}
 const [fx,fy]=hitPos(s,final);
 if(freezing(s)&&scratch){
  const g=ctx.createRadialGradient(fx,fy,4,fx,fy,320);
  if(s.electric){g.addColorStop(0,'#f4fbff');g.addColorStop(.25,'#7cc8ff');g.addColorStop(1,'#1b2a8c');}
  else{g.addColorStop(0,'#fff6de');g.addColorStop(.25,'#ffb347');g.addColorStop(1,'#b3260f');}
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  // Cut the two fighters out as black shapes using their real draw calls.
  const cv=ctx.canvas;scratch.width=cv.width;scratch.height=cv.height;const sc=scratch.getContext('2d');
  sc.setTransform(ctx.getTransform());drawActors(sc);
  sc.setTransform(1,0,0,1,0,0);sc.globalCompositeOperation='source-in';sc.fillStyle='#1a0c08';sc.fillRect(0,0,cv.width,cv.height);
  ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.drawImage(scratch,0,0);ctx.restore();
 }
 if(t>=final.at){
  punchBurst(ctx,t,final.at,fx+p.face*6,fy,p.superGuarded?90:150,s.electric?-Math.PI/2:0,3);
  if(!p.superGuarded&&t<final.at+18)speedLines(ctx,0,0,t,.8*(1-(t-final.at)/18),p.face);
 }
}
