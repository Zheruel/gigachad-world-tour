// Actual Chrome renderer: route boundaries, foreground isolation and both display sizes.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:960,height:540}}),errors=[];
 p.on('pageerror',e=>errors.push(e.message));await p.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=walk');
 await p.waitForFunction(()=>window.__game?.G.state==='play',{timeout:60000});
 const out=process.env.INDIA_CAPTURE_DIR||'tmp/review/india-route';fs.mkdirSync(out,{recursive:true});let frames=0;
 async function capture(label){
  if(process.env.INDIA_CAPTURE_MATCH&&!label.includes(process.env.INDIA_CAPTURE_MATCH))return;
  await p.evaluate(()=>{__game.G.shake=0;__game.render()});
  await p.locator('canvas').screenshot({path:path.join(out,label+'-960.png')});frames++;
  await p.setViewportSize({width:480,height:270});
  await p.locator('canvas').screenshot({path:path.join(out,label+'-480.png')});
  await p.setViewportSize({width:960,height:540});
 }
 for(const id of (process.env.INDIA_PROPS_ONLY?[]:['delhi','refund'])){
  for(let i=0;i<8;i++){
   await p.evaluate(([id,i])=>{__game.indiaScene(id);const G=__game.G;G.camX=Math.min(i*810+160,G.camMax);G.player.x=G.camX+170;G.india.t=170;__game.render()},[id,i]);
   await capture(id+'-room-'+i);
  }
  for(let i=1;i<8;i++)for(const offset of [-240,-645,165]){
   const cam=Math.max(0,Math.min(6000,i*810+offset));
   await p.evaluate(([id,cam])=>{__game.indiaScene(id);const G=__game.G;G.camX=cam;G.player.x=cam+210;G.india.t=160;__game.render()},[id,cam]);
   await capture(`${id}-join-${i}-${offset}`);
  }
  await p.evaluate(id=>{__game.indiaScene(id);__game.G.india.review.environment=false;__game.render()},id);await capture(id+'-actors-isolated');
  for(const t of [0,45,195,300]){await p.evaluate(([id,t])=>__game.indiaScene(id,'clear',t),[id,t]);await capture(id+'-victory-'+t);}
 }
 for(const [id,scene]of [['delhi','vendor'],['refund','closer'],['refund','calling']])for(const broken of [false,true]){
  await p.evaluate(([id,scene,broken])=>{__game.indiaScene(id,scene,0);const G=__game.G;G.player.x=G.camX+140;
   if(broken)for(const pr of G.props){pr.broken=pr.dead=true;pr.hp=0;}G.shake=0;__game.render();},[id,scene,broken]);
  await capture(`${id}-${scene}-props-${broken?'broken':'intact'}`);
 }
 for(const x of [500,1030,1500,1960,2370,4260,4820,5260]){
  await p.evaluate(x=>{__game.indiaScene('delhi','market',0);const G=__game.G;G.camX=x-240;G.player.x=x-90;G.shake=0;__game.render();},x);
  await capture('delhi-civilian-'+x);
 }
 if(process.env.INDIA_CAPTURE_MATCH==='fall')for(let t=225;t<=270;t+=3){
  await p.evaluate(t=>__game.indiaScene('refund','finish',t),t);
  await capture('refund-fall-'+t);
 }
 assert.deepEqual(errors,[]);console.log(JSON.stringify({frames,errors,out}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
