// Delhi play prop bounds, ground registration, fragments, and original-art isolation.
const assert=require('node:assert/strict'),studio=require('./studio_helper.cjs');
(async()=>{const {page,errors,close}=await studio.launch();try{
 const frame=await studio.openStudio(page,'delhi/market');
 const result=await frame.evaluate(async()=>{
  const g=parent.__review.game,{G}=await g.importModule('js/engine.js'),{ASSETS}=await g.importModule('js/assets.js');
  const {createProp,drawProp,PROP_TYPES}=await g.importModule('js/props.js'),{frameW,frameH}=await g.importModule('js/sprites.js');
  const out=[],check=(name,value)=>out.push([name,!!value]),oldStage=G.stage,oldState=G.state;
  try{for(const kind of ['ic_stall','ic_cart','ic_boiler','ic_cargo','ic_thela']){
   const src=kind==='ic_thela'?'ic_cart':kind,im=ASSETS['prop_delhi_'+kind],original=ASSETS['prop_'+src];   // the porter's thela has its own Delhi art over the cart's fallback
   G.stage={id:'delhi'};G.state='play';const pr=createProp(kind,240,230),baseline=PROP_TYPES[kind];
   const c=document.createElement('canvas');c.width=im.width;c.height=im.height;const ctx=c.getContext('2d');ctx.drawImage(im,0,0);const a=ctx.getImageData(0,0,c.width,c.height).data;
   let left=c.width,top=c.height,right=0,bottom=0;
   for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>=128){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x+1);bottom=Math.max(bottom,y+1);}
   check(kind+'-ground-anchor',bottom===im.height);
   check(kind+'-opaque-hit-height',Math.abs(pr.h-(bottom-top)/2)<=1);
   check(kind+'-opaque-hit-width',Math.abs(pr.w-(right-left)/2)<=5);
   check(kind+'-scale',kind==='ic_boiler'?im.width===original.width&&im.height===original.height:frameW(im)>frameW(original)&&frameH(im)>frameH(original));
   const drawn=[],proxy=document.createElement('canvas').getContext('2d');proxy.drawImage=(...args)=>drawn.push(args);
   drawProp(proxy,pr,0);const args=drawn.find(d=>d[0]===im)||drawn.at(-1);drawn.length=0;check(kind+'-play-route',args[0]===im);   // the thela's wheels draw after its bodycheck(kind+'-draw-floor',args[2]+args[4]===230);
   const playBounds=[pr.w,pr.h,pr.shadowR];G.state='pause';check(kind+'-paused-bounds',JSON.stringify(playBounds)===JSON.stringify([pr.w,pr.h,pr.shadowR]));
   for(const [stage,state]of [['delhi','intro'],['refund','play'],['train','play']]){
    G.stage={id:stage};G.state=state;drawProp(proxy,pr,0);check(kind+'-'+stage+'-'+state+'-original',drawn.pop()[0]===original&&pr.w===baseline.w&&pr.h===baseline.h&&pr.shadowR===baseline.shadowR);
   }
   G.stage={id:'delhi'};G.state='play';G.effects=[];G.pickups=[];const drop=pr.drop;pr.hurt(999,1);
   const flash=G.effects.find(e=>e.type==='propFlash'),chunks=G.effects.filter(e=>e.type==='propChunk');
   check(kind+'-fragment-source',chunks.length>0&&chunks.every(e=>e.img===im));
   check(kind+'-fragment-size',flash.w===frameW(im)&&flash.h===frameH(im));
   check(kind+'-fragment-ground',chunks.every(e=>e.ground>=230&&e.ground<=234));
   check(kind+'-break-vanishes',pr.dead&&pr.broken);
   const before=drawn.length;drawProp(proxy,pr,0);check(kind+'-no-static-wreck',drawn.length===before);
   check(kind+'-drop-preserved',drop?G.pickups.length===1&&G.pickups[0].kind===drop:G.pickups.length===0);
  }
  for(const kind of ['ic_cart','ic_thela']){
   const pr=createProp(kind,240,230);pr.face=-1;
   for(const [stage,state]of [['delhi','play'],['delhi','intro'],['refund','play']]){
    G.stage={id:stage};G.state=state;let flipped=false;const ctx=document.createElement('canvas').getContext('2d');ctx.scale=(x)=>{if(x<0)flipped=true;};
    drawProp(ctx,pr,0);check(kind+'-'+stage+'-'+state+'-facing',flipped===(kind==='ic_thela'&&stage==='delhi'&&state==='play'));
   }
  }
  G.stage={id:'delhi'};G.state='play';G.effects=[];G.pickups=[];const cart=createProp('ic_thela',240,230);cart.face=-1;cart.hurt(999,1);
  const mirrored=G.effects.filter(e=>e.type==='propChunk'),flash=G.effects.find(e=>e.type==='propFlash');
  check('thela-fragments-mirrored',mirrored.every(e=>e.mirror)&&flash.mirror);
  check('thela-fragment-source-order',mirrored[0].sx>mirrored[1].sx&&mirrored[1].sx>mirrored[2].sx);
  G.stage=oldStage;G.state='play';G.enemies=[];G.props=[];G.spawnQueue=[];G.boss=null;G.player.invuln=99999;
  const owner=g.spawn('ic_heavy',120,0);check('thela-owner-initial-facing',owner.rig.face===owner.face);
  G.player.x=owner.x+100;G.player.y=owner.y;owner.state='idle';owner.atkCd=99999;g.step(1);
  check('thela-owner-updated-facing',owner.rig.face===owner.face);
  }finally{G.stage=oldStage;G.state=oldState;}
  return out;
 });assert(result.every(x=>x[1]),JSON.stringify(result.filter(x=>!x[1])));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({checks:result.length,props:5,errors}));
}finally{await close();}})().catch(e=>{console.error(e);process.exitCode=1;});
