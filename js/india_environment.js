// India-only environmental opportunities. Prop art and wreckage remain in the
// ordinary depth sort; this module owns their motion, warnings and contacts.
import {G,W,clamp} from './engine.js';
import {ASSETS} from './assets.js';
import {hurtPlayer} from './player.js';
import {spawnDust,spawnSpark} from './effects.js';

const KINDS={ic_cart:'cart',ic_boiler:'steam',ic_cargo:'cargo',ic_cabinet:'cart',ic_monitor:'electric',ic_server:'electric'};
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
      if(kind==='electric'){n.pending=true;n.spent=false;n.cooldown=0;}
      else n.spent=true;
    }
  };
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
    if(n.kind==='electric'){
      harm(n,pr.x,n.lane,33,6);
      if(n.t%8===0)spawnSpark(pr.x+Math.sin(n.t)*13,pr.y-12);
    }
    if(n.t>=ACTIVE)finish(n);
  }
  if(s.active||G.boss||redThreat())return;
  for(const n of s.nodes){
    if(n.cooldown>0||n.spent||!visible(n.prop))continue;
    if(n.kind==='electric'&&n.pending){n.pending=false;begin(n);break;}
    if(['steam','cargo'].includes(n.kind)&&!n.prop.broken){
      if(!n.demoDone){begin(n,true);break;}
      if(G.waveActive){begin(n);break;}
    }
  }
}
export function drawIndiaEnvironment(ctx,camX){
  const s=state();if(!s||G.india.review?.environment===false)return;
  for(const n of s.nodes){
    if(n.mode==='rest')continue;
    const pr=n.prop,x=(n.kind==='steam'?n.origin+55:pr.x)-camX,y=n.lane;
    const width=n.kind==='steam'?86:n.kind==='cargo'?pr.w+64:66;
    ctx.save();
    const warning=n.mode==='tell';
    ctx.fillStyle=warning?'rgba(235,148,66,.23)':'rgba(242,91,37,.18)';
    ctx.fillRect(Math.round(x-width/2),Math.round(y-5),width,10);
    ctx.fillStyle=warning?'#d8a65e':'#e57d42';
    for(let i=0;i<width;i+=12)ctx.fillRect(Math.round(x-width/2+i),Math.round(y+5),6,1);
    if(n.kind==='steam'&&n.mode==='active'){
      const im=ASSETS.ic_steam;
      if(im){
        const frame=Math.min(7,Math.floor(n.t/6)),fw=im.width/4,fh=im.height/2;
        ctx.drawImage(im,(frame%4)*fw,Math.floor(frame/4)*fh,fw,fh,Math.round(n.origin+12-camX),Math.round(y-56),96,56);
      }
    }
    if(n.kind==='electric'){
      const alpha=warning?.3:.75;ctx.strokeStyle=`rgba(141,192,230,${alpha})`;ctx.lineWidth=1;
      const shift=(n.t%9)-4;ctx.beginPath();ctx.moveTo(x-19,y-8);ctx.lineTo(x-5,y-17+shift);ctx.lineTo(x+3,y-9);ctx.lineTo(x+22,y-19);ctx.stroke();
    }
    ctx.restore();
  }
}
