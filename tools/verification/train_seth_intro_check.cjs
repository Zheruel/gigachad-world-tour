const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1080,height:850}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-train.html?scene=seth-intro&t=0');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('bossintro'));
 const f=page.frames().find(f=>f.url().includes('?auto=walk'));fs.mkdirSync('/tmp/train-seth-intro',{recursive:true});
 for(const t of [0,59,60,94,114,136,158,180,194,240,280,315,316]){
  await f.evaluate(t=>{__game.trainScene('seth-intro',t);__game.render()},t);
  for(const size of [960,480]){if(size===480)await page.locator('#scale').click();await f.locator('canvas').screenshot({path:`/tmp/train-seth-intro/${t}-${size}.png`});if(size===480)await page.locator('#scale').click();}
 }
 const checks=await f.evaluate(async()=>{const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  g.trainScene('seth-intro',100);const p=G.player.x;g.press('right');g.step(20);g.release('right');ok('introduction gates movement',G.player.x===p);
  g.press('pause');g.step(1);g.release('pause');const t=G.rawTime-G.stateT,x=G.boss.x;g.step(60);ok('pause freezes reveal',G.rawTime-G.stateT===t&&G.boss.x===x);g.press('pause');g.step(1);g.release('pause');g.step(230);ok('reveal hands off once to combat',G.state==='play'&&G.boss.key==='vikram'&&!G.boss.roof);
  g.trainScene('seth-intro',180);const snap=JSON.stringify({b:G.boss.x,tr:G.train});g.render();g.render();ok('rendering is pure',JSON.stringify({b:G.boss.x,tr:G.train})===snap);
  g.press('attack');g.step(1);g.release('attack');ok('existing fresh skip reaches stable combat pose',G.state==='play'&&G.boss.x===8044&&G.boss.y===218);
  const {ASSETS}=await import('./js/assets.js'),art=ASSETS.nr_seth_intro;ASSETS.nr_seth_intro=null;g.trainScene('seth-intro',220);g.render();g.step(100);ok('missing acting sheet cannot trap reveal',G.state==='play');ASSETS.nr_seth_intro=art;
  return out;
 });console.log(JSON.stringify({checks,errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
