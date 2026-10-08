// The Studio adapters drive shipped gameplay; specialist pose coverage is checked separately.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
const {openStudio,load,seek,step,settings}=require('./studio_helper.cjs');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1600,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 const game=await openStudio(p,'refund/calling');const out='tmp/review/india-explorer';fs.mkdirSync(out,{recursive:true});
 for(const effect of ['super-0-survive','super-0-lethal','effect-ko','effect-heavy-ko','effect-crowd-ko']){
  await load(p,'delhi/'+effect);const state=()=>game.evaluate(()=>({n:__game.G.enemies.length,state:__game.G.player.state,fx:__game.G.effects.filter(f=>f.type==='koBurst').length}));
  const initial=await state();if(effect.startsWith('super'))assert.equal(initial.state,'special');else assert.equal(initial.fx,effect==='effect-crowd-ko'?5:1);
  await step(p,3);await step(p,3);await game.locator('canvas').screenshot({path:`${out}/${effect}-6.png`});await p.evaluate(()=>__review.restart());assert.equal(await p.evaluate(()=>__review.snapshot().tick),0);assert.deepEqual(await state(),initial);
 }
 await load(p,'refund/office');assert.equal(await game.evaluate(()=>__game.G.camX),0);
 await p.evaluate(n=>__review.setScale(+n),'1');assert.equal(await p.locator('#game').evaluate(e=>e.clientWidth),480);
 const frames=await game.evaluate(async()=>{const a=await import('/js/aiframes.js');const walk=a.getAIFrame('ic_closer_damaged','walk');return walk.f.length;});assert.equal(frames,8);
 const all=await p.evaluate(()=>__review.listScenarios());assert(all.find(s=>s.id==='refund/intro').checkpoints.some(c=>/breach/i.test(c.label)));
 for(const [stage,scene,beat]of [['delhi','intro',396],['delhi','vendor-finish',366],['delhi','dredger-finish',642],['refund','closer-finish',370]]){
  await load(p,`${stage}/${scene}`);await seek(p,beat);assert.equal(await p.evaluate(()=>__review.snapshot().tick),beat);await settings(p,{layers:{actors:false}});assert.equal(await game.evaluate(()=>__game.G.india.review.actors),false);await settings(p,{layers:{actors:true}});
 }
 await load(p,'delhi/vendor/flop');assert(await game.evaluate(()=>__game.G.boss.pattern==='flop'&&__game.G.boss.phaseTwo));
 await load(p,'delhi/dredger/grabdrop');assert(await game.evaluate(()=>__game.G.boss.phase==='machine'&&__game.G.boss.state==='dropaim'));
 await load(p,'delhi/dredger/return');assert(await game.evaluate(()=>__game.G.boss.returnT!=null&&__game.G.boss.protectedStagger>0));
 await load(p,'delhi/dredger/op-grabcall');assert(await game.evaluate(()=>__game.G.boss.phase==='operator'&&__game.G.boss.state==='call'&&__game.G.boss.grab.state==='rest'));
 // Verify that retained cinematic sheets still load in the runtime at their authored grid sizes.
 const sheets=await game.evaluate(async()=>{const {ASSETS}=await import('/js/assets.js');return Object.fromEntries(['ic_cine_chad','ic_cine_push','ic_cine_closer'].map(k=>[k,!!ASSETS[k]?.width]));});assert(Object.values(sheets).every(Boolean),JSON.stringify(sheets));
 await p.locator('#mode-inspect').click();await p.locator('#actor-controls').locator('..').evaluate(e=>e.open=true);
 for(const [key,n]of [['chad_finishers',16],['chad_cart_push',8],['closer_cascade',12]]){
  await p.selectOption('#character','cine:'+key);assert((await p.locator('#pose-status').innerText()).includes(n+' poses'));await p.click('#pose-step');assert((await p.locator('#pose-status').innerText()).includes('selected 1'));await p.locator('#pose-live').screenshot({path:`${out}/${key}-pose-1.png`});
 }
 for(const stage of ['delhi','refund']){await load(p,`${stage}/intro`);await p.evaluate(n=>__review.setScale(+n),'2');await p.screenshot({path:`${out}/${stage}-page-2x.png`});await p.evaluate(n=>__review.setScale(+n),'1');await p.screenshot({path:`${out}/${stage}-page-native.png`});await load(p,`${stage}/full`);assert.equal(await game.evaluate(()=>__game.G.stage.id),stage);assert.equal(await game.evaluate(()=>__game.G.state),'intro');}
 assert.deepEqual(errors,[]);console.log(JSON.stringify({effectPresets:5,replay:true,sceneReset:true,native:true,damagedBossWalk:true,newSequences:4,cinematicSheets:Object.keys(sheets).length,patterns:4,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
