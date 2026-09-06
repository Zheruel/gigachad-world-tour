const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1150,height:1100}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-elevator.html?scene=papers&t=120');await page.waitForFunction(()=>document.querySelector('#status').textContent==='Arrived: papers');
 const iframe=page.frameLocator('#preview');
 for(const phase of ['apron-arrival','apron','jet-board','takeoff','flight','india-approach','landing','disembark','papers','arrival-exit']){
  await page.locator('#airport-scene').selectOption(phase);await page.locator('#timeline').fill('40');await page.locator('[data-step="1"]').click();
  assert.equal(await iframe.locator('body').evaluate(()=>__game.G.travel.t),41);
  assert.equal(await iframe.locator('body').evaluate(()=>__game.G.travel.phase),phase);
 }
 for(const layer of ['architecture','actors','effects']){await page.locator('#street-'+layer).uncheck();assert.equal(await iframe.locator('body').evaluate((_,layer)=>__game.G.travel.streetLayers[layer],layer),false);await page.locator('#street-'+layer).check();}
 fs.mkdirSync('/tmp/gachi-airport',{recursive:true});
 await page.locator('#airport-scene').selectOption('apron');await page.locator('#timeline').fill('210');await iframe.locator('#game').screenshot({path:'/tmp/gachi-airport/terminal-2x.png'});await page.locator('#scale').click();await iframe.locator('#game').screenshot({path:'/tmp/gachi-airport/terminal-1x.png'});await page.locator('#scale').click();
 await page.locator('#airport-scene').selectOption('flight');await page.locator('#timeline').fill('180');await iframe.locator('#game').screenshot({path:'/tmp/gachi-airport/review-2x.png'});
 await page.locator('#scale').click();await iframe.locator('#game').screenshot({path:'/tmp/gachi-airport/review-1x.png'});
 assert.deepEqual(errors,[]);console.log('PASS: ten airport checkpoints, frame stepping, layer controls and 1× / 2× explorer');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
