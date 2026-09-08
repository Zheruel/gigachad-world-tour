// The review controls drive the shipped game instead of a separate animation mock.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const b=await chromium.launch({channel:'chrome',headless:true});try{
 const p=await b.newPage({viewport:{width:1120,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto((process.env.GAME_URL||'http://localhost:8011')+'/review-india.html?stage=refund&scene=calling');
 await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('scenery preview'),{timeout:60000});
 const game=p.frames().find(f=>f.url().includes('auto=walk'));assert(game);
 const out='tmp/review/india-explorer';fs.mkdirSync(out,{recursive:true});
 for(const effect of ['super','super-ko','ko','heavy-ko','crowd-ko']){
  await p.selectOption('#effect',effect);await p.click('#effect-show');
  const initial=await game.evaluate(()=>({n:__game.G.enemies.length,state:__game.G.player.state,fx:__game.G.effects.filter(f=>f.type==='koBurst').length}));
  if(effect.startsWith('super'))assert.equal(initial.state,'special');else assert.equal(initial.fx,effect==='crowd-ko'?5:1);
  await p.click('#step');await p.click('#step');
  await game.locator('canvas').screenshot({path:`${out}/${effect}-6.png`});
  await p.click('#reset');assert.equal(await p.locator('#time').inputValue(),'0');
  const replay=await game.evaluate(()=>({n:__game.G.enemies.length,state:__game.G.player.state,fx:__game.G.effects.filter(f=>f.type==='koBurst').length}));assert.deepEqual(replay,initial);
 }
 await p.selectOption('#scene','office');assert.equal(await game.evaluate(()=>__game.G.camX),0);
 await p.click('#scale');assert.equal(await p.locator('#game').evaluate(e=>e.clientWidth),480);
 await p.selectOption('#character','ic_closer_damaged');await p.selectOption('#action','walk');
 assert((await p.locator('#pose-status').innerText()).includes('8 poses'));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({effectPresets:5,replay:true,sceneReset:true,native:true,damagedBossWalk:true,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
