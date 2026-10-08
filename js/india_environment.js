// India-only environmental opportunities. Prop art and wreckage remain in the
// ordinary depth sort; this module owns their motion, warnings and contacts.
import {G,W,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {hurtPlayer} from './player.js';
import {spawnDust,spawnSpark} from './effects.js';

// Hazards live in intact props only: a broken prop bursts and leaves no hazard behind.
const KINDS={ic_cart:'cart',ic_boiler:'steam',ic_cargo:'cargo',ic_cabinet:'cart'};
const TELL=54, ACTIVE=42;
function redThreat(){
  return G.enemies.some(e=>!e.dead&&['windup','attack'].includes(e.state)&&
    (e.kind==='cooker'||e.kind==='bull'));
}
function state(){return G.stage?.chapter&&G.india?.environment;}
function record(event){const s=state();if(!s)return;s.events.push(event);if(s.events.length>96)s.events.splice(0,s.events.length-96);}
function visible(p){return p.x>G.camX+40&&p.x<G.camX+W-40;}
function begin(node,demo=false){
  const s=state();node.mode='tell';node.t=0;node.demo=demo;node.hits=new Set();
  node.lane=node.prop.y;node.origin=node.prop.x;node.face=1;
  s.active=node;s.dangerActive=!demo;record({t:s.t,kind:node.kind,event:'tell',x:node.origin,demo});
  G.audio.sfx('blip');
}
function finish(node){
  const s=state();node.mode='rest';node.t=0;node.cooldown=360;node.demoDone=true;
  if(!node.demo&&node.kind!=='steam')node.spent=true;
  node.prop.swing=0;
  if(s.active===node)s.active=null;s.dangerActive=false;
}
function harm(node,x,y,rx,damage,heavy=false){
  if(node.demo)return;
  const p=G.player;
  const list=[p,...G.enemies];
  for(const e of list){
    if(e.dead||e.dying||e.superLocked||e.state==='special'||node.hits.has(e)||
      ['down','thrown','getup','grabbed'].includes(e.state)||e.z>20||
      Math.abs(e.x-x)>rx||Math.abs(e.y-y)>11)continue;
    node.hits.add(e);
    const dir=Math.sign(e.x-x)||node.face||1;
    if(e===p)hurtPlayer(p,damage,dir,heavy);
    else {e.damageGuard?.(.7);e.hurt(damage+4,dir,heavy,heavy);}
    spawnSpark(e.x,e.y-25);G.audio.sfx(heavy?'heavy':'punch');
    record({t:state().t,kind:node.kind,event:'contact',target:e===p?'player':e.trainType||e.kind});
  }
}
function attach(pr){
  const s=state(),kind=KINDS[pr.prop];
  // Delhi cargo is an ordinary breakable stack, with no self-moving hazard.
  if(G.stage?.id==='delhi'&&kind==='cargo')return;
  if(!kind||pr.indiaBossProp||G.enemies.some(e=>e.rig===pr))return;
  if(pr.indiaEnvironment){if(!s.nodes.includes(pr.indiaEnvironment))s.nodes.push(pr.indiaEnvironment);return;}
  const n={prop:pr,kind,mode:'rest',t:0,cooldown:0,demoDone:false,spent:pr.broken,
    vx:0,hits:new Set(),origin:pr.x,lane:pr.y,face:1,pending:false};
  pr.indiaEnvironment=n;s.nodes.push(n);
  const hurt=pr.hurt;
  pr.hurt=(dmg,dir=1,heavy=false,launch=false)=>{
    const s=state();
    const before=pr.hp,wasBroken=pr.broken;hurt(dmg,dir,heavy,launch);
    if(pr.hp===before||wasBroken)return;
    if(n.mode==='tell'&&n.kind==='steam'){
      record({t:s.t,kind:n.kind,event:'interrupted',x:pr.x});finish(n);
    }
    if(['cart','cargo'].includes(kind)&&(heavy||launch||dmg>=14)&&!pr.broken){
      n.vx=dir*3.2;n.face=dir;n.hits=new Set([G.player]);
      record({t:s.t,kind:n.kind,event:'knocked',x:pr.x});
    }
    if(pr.broken){
      n.vx=0;pr.swing=0;
      if(s.active===n)finish(n);
      n.spent=true;
    }
  };
}
// Where a slipping cargo pallet will sweep: its own footprint plus the 48px it slides.
export function inCargoPath(pr,who){
  return Math.abs(who.y-pr.y)<12&&who.x>pr.x-pr.w*.5-10&&who.x<pr.x+48+pr.w*.5+10;
}
// A dock hand knocks the chock out: the ordinary cargo warning starts now instead of on its
// own clock. `dry` only asks whether it could (nothing else warning, not spent, no boss).
export function pullChock(pr,dry=false){
  const s=state(),n=s&&s.nodes.find(q=>q.prop===pr);
  if(!n||n.kind!=='cargo'||n.mode!=='rest'||n.spent||pr.broken||s.active||G.boss||redThreat()||!visible(pr))return false;
  if(!dry){n.demoDone=true;n.cooldown=0;begin(n);record({t:s.t,kind:'cargo',event:'chock',x:pr.x});}
  return true;
}
export function initIndiaEnvironment(){
  if(!G.stage?.chapter||!G.india)return;
  G.india.environment={t:0,props:G.props,nodes:[],active:null,dangerActive:false,events:[]};
  for(const p of G.props)attach(p);
}
export function updateIndiaEnvironment(){
  if(!G.stage?.chapter||!G.india||G.india.cinematic)return;
  if(!state())initIndiaEnvironment();
  const s=state();s.t++;
  if(s.props!==G.props){
    s.props=G.props;s.nodes=s.nodes.filter(n=>G.props.includes(n.prop));
    if(s.active&&!s.nodes.includes(s.active)){s.active=null;s.dangerActive=false;}
  }
  for(const p of G.props)attach(p);
  for(const n of s.nodes){
    const pr=n.prop;
    if(n.cooldown>0)n.cooldown--;
    if(Math.abs(n.vx)>.08&&!pr.broken){
      pr.x=clamp(pr.x+n.vx,G.camX+12,G.camX+W-12);n.vx*=.9;
      harm(n,pr.x,pr.y,pr.w*.5+10,8,true);
      if(s.t%6===0)spawnDust(pr.x-n.face*pr.w*.3,pr.y,2);
    }
    if(n.mode==='rest')continue;
    n.t++;
    if(G.boss||!visible(pr)){finish(n);continue;}
    if(n.mode==='tell'){
      // The same fixed footprint is shown for almost a second before contact.
      pr.shakeT=Math.max(pr.shakeT,2);
      if(n.t>=TELL&&!redThreat()){
        n.mode='active';n.t=0;n.hits=new Set();
        record({t:s.t,kind:n.kind,event:'active',x:pr.x,demo:n.demo});
        if(n.kind==='steam')G.audio.roomSfx?.('train_brake',.16,.85);
        else G.audio.sfx(n.kind==='cargo'?'heavy':'armor');
      }
      continue;
    }
    if(n.kind==='steam')harm(n,n.origin+55,n.lane,43,6);
    if(n.kind==='cargo'){
      const q=clamp(n.t/ACTIVE,0,1),distance=n.demo?16:48;
      pr.x=n.origin+distance*(1-(1-q)*(1-q));
      pr.swing=Math.sin(q*Math.PI*2)*.018;
      harm(n,pr.x,n.lane,pr.w*.5+10,8,true);
      if(n.t%7===0)spawnDust(pr.x-pr.w*.35,pr.y,2);
    }
    if(n.t>=ACTIVE)finish(n);
  }
  if(s.active||G.boss||redThreat())return;
  for(const n of s.nodes){
    if(n.cooldown>0||n.spent||!visible(n.prop))continue;
    if(['steam','cargo'].includes(n.kind)&&!n.prop.broken){
      if(!n.demoDone){begin(n,true);break;}
      if(G.waveActive){begin(n);break;}
    }
  }
}
// The warning on the floor: a soft glow over the exact footprint the hazard will sweep (steam: its jet;
// cargo: the pallet plus its slide), with chevrons running the way it goes. Amber while it warns, a
// hotter orange fading out while it acts. Drawn under props and actors, like the Dredger's deck paint.
function drawHazardFloor(ctx,n,camX){
  const pr=n.prop,d=n.face<0?-1:1;
  const [a0,a1]=n.kind==='steam'?[n.origin+12,n.origin+98]
    :n.kind==='cargo'?[n.origin-pr.w/2-10,n.origin+(n.demo?16:48)*d+pr.w/2+10]:[pr.x-33,pr.x+33];
  const x0=Math.round(Math.min(a0,a1)-camX),x1=Math.round(Math.max(a0,a1)-camX),cy=Math.round(n.lane),w=x1-x0;
  const tell=n.mode==='tell',k=tell?clamp(n.t/TELL,0,1):1-clamp(n.t/ACTIVE,0,1),pulse=.85+.15*Math.sin(n.t*.3);
  const rgb=tell?'240,150,60':'250,96,40',a=(tell?.24+.22*k:.36*k)*pulse;
  const g=ctx.createRadialGradient(0,0,0,0,0,1);
  g.addColorStop(0,`rgba(${rgb},${a})`);g.addColorStop(.6,`rgba(${rgb},${a*.55})`);g.addColorStop(1,`rgba(${rgb},0)`);
  ctx.save();ctx.translate((x0+x1)/2,cy);ctx.scale(w/2+6,9);ctx.fillStyle=g;ctx.fillRect(-1,-1,2,2);ctx.restore();
  if(!tell&&k<.5)return;
  // Chevrons: a bright wave running the slide direction, fading at both ends of the footprint.
  const step=14,fade=x=>clamp(Math.min(x-x0,x1-x)/18,0,1);
  for(let x=x0+8;x<x1-5;x+=step){
    const f=fade(x);if(f<=.05)continue;
    const wave=Math.max(0,Math.cos(((x-x0)*d-n.t*1.4)/step*1.2)),al=f*(tell?.45+.25*k+.3*wave:.6*k);
    ctx.globalAlpha=al;ctx.beginPath();
    ctx.moveTo(x-d*2.5,cy-3);ctx.lineTo(x-d*.5,cy-3);ctx.lineTo(x+d*2,cy);ctx.lineTo(x-d*.5,cy+3);ctx.lineTo(x-d*2.5,cy+3);ctx.lineTo(x-d*.5,cy);ctx.closePath();
    ctx.fillStyle=wave>.75&&tell?'#ffeec4':'#f0a24a';ctx.fill();ctx.strokeStyle='#4a1e0a';ctx.lineWidth=.5;ctx.stroke();
  }
  ctx.globalAlpha=1;
}
export function drawIndiaEnvironment(ctx,camX){
  const s=state();if(!s||G.india.review?.environment===false)return;
  for(const n of s.nodes){
    if(n.mode==='rest')continue;
    const y=n.lane;
    ctx.save();
    drawHazardFloor(ctx,n,camX);
    if(n.kind==='steam'&&n.mode==='active'){
      const im=ASSETS.ic_steam;
      if(im){
        const frame=Math.min(7,Math.floor(n.t/6)),fw=im.width/4,fh=im.height/2;
        ctx.drawImage(im,(frame%4)*fw,Math.floor(frame/4)*fh,fw,fh,Math.round(n.origin+12-camX),Math.round(y-56),96,56);
      }
    }
    ctx.restore();
  }
}
