const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1100,height:1000}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-level.html?option=station-grit');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('All cards ready'));
 assert.equal(await page.locator('[data-option]').count(),6);fs.mkdirSync('/tmp/gachi-level-cards',{recursive:true});
 for(const id of ['locomotive','rooftop','station','station-grit','baggage','last-stop']){
  await page.locator(`[data-option="${id}"]`).click();await page.locator('#stage').screenshot({path:`/tmp/gachi-level-cards/${id}-960.png`});
  await page.locator('#scale').click();assert.equal(await page.locator('#stage').evaluate(c=>c.clientWidth),480);await page.locator('#stage').screenshot({path:`/tmp/gachi-level-cards/${id}-480.png`});await page.locator('#scale').click();
 }
 await page.goto('http://localhost:8011/?auto=loading');await page.waitForFunction(()=>__game?.travelReady());
 const checks=await page.evaluate(()=>{
  const g=__game,G=g.G,out=[],check=(n,v)=>out.push([n,!!v]);G.freezeTime=false;
  g.press('use');g.loading();g.step(600);check('held F cannot dismiss card',G.state==='loading');g.release('use');g.step(1);g.step(1800);check('card never auto advances',G.state==='loading');
  g.press('attack');g.step(1);g.release('attack');g.step(30);check('attack does not dismiss card',G.state==='loading');
  g.press('pause');g.step(1);g.release('pause');check('card can pause',G.paused);g.press('pause');g.step(1);g.release('pause');g.step(1);
  g.press('use');g.step(1);g.release('use');g.step(30);check('fresh F enters station intro',G.state==='intro'&&G.stage.id==='train');
  g.loading();g.step(1);const pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});g.step(1);pad.buttons[4]={pressed:true,value:1};g.step(1);pad.buttons[4]={pressed:false,value:0};g.step(30);check('fresh gamepad LB enters station intro',G.state==='intro');Object.defineProperty(navigator,'getGamepads',{value:()=>[]});g.resetInput();G.freezeTime=true;return out;
 });
 assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);console.log(JSON.stringify({cards:6,scales:[480,960],checks,errors}));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
