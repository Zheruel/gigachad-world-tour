// Inspector reveal: physical route, deterministic review, input and lifecycle contracts.
const assert=require('node:assert/strict'),fs=require('node:fs'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:1080,height:950}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/review-train.html?scene=conductor&t=0');await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('bossintro'));
 const f=page.frames().find(f=>f.url().includes('?auto=walk'));
 const checks=await f.evaluate(async()=>{const g=__game,G=g.G,out=[],ok=(n,v)=>out.push([n,!!v]);
  g.trainScene('conductor',0);const path=[];for(let i=0;i<300;i++){path.push({x:G.boss.x,y:G.boss.y,state:G.state});g.step(1)}
  ok('300-tick reveal ends in combat',path.every(p=>p.state==='bossintro')&&G.state==='play'&&G.boss.state==='idle');
  ok('route leaves desk before stepping into lane',path.filter(p=>p.y>188).every(p=>p.x<=5935));
  ok('route has no position pops',path.slice(1).every((p,i)=>Math.abs(p.x-path[i].x)<4&&Math.abs(p.y-path[i].y)<4));
  ok('combat begins at authored floor position',G.boss.x===5935&&G.boss.y===218);
  ok('inspector combat retains carriage music',G.audio.snapshot().music===G.stage.musicB);
  g.trainScene('conductor',150);ok('inspector reveal retains carriage music',G.audio.snapshot().music===G.stage.musicB);
  g.trainScene('seth-intro',315);ok('Seth retains his final-boss music',G.audio.snapshot().music===(G.stage.bossMusicFinal||G.stage.bossMusic));
  g.trainScene('conductor',100);const px=G.player.x;g.press('right');g.press('attack');g.step(20);g.release('right');g.release('attack');ok('intro gates movement and cannot be attack skipped',G.player.x===px&&G.state==='bossintro');
  g.press('pause');g.step(1);g.release('pause');const frozen=JSON.stringify([G.boss.x,G.boss.y,G.boss.introT]);g.step(60);ok('pause freezes performance',JSON.stringify([G.boss.x,G.boss.y,G.boss.introT])===frozen);g.press('pause');g.step(1);g.release('pause');g.step(5);ok('resume advances performance',JSON.stringify([G.boss.x,G.boss.y,G.boss.introT])!==frozen);
  g.trainScene('conductor',180);const before=JSON.stringify([G.boss.x,G.boss.y,G.boss.introT,G.train]);g.render();g.render();ok('rendering remains pure',JSON.stringify([G.boss.x,G.boss.y,G.boss.introT,G.train])===before);
  const {ASSETS}=await import('./js/assets.js'),saved=ASSETS.nr_conductor_intro;ASSETS.nr_conductor_intro=null;try{g.trainScene('conductor',240);g.render();g.step(60);ok('missing acting art cannot trap introduction',G.state==='play');}finally{ASSETS.nr_conductor_intro=saved;}
  g.trainScene('conductor',0);ok('replay resets the seated performance',G.state==='bossintro'&&G.boss.x===6065&&G.boss.y===188);
  return out;
 });
 const dir='/tmp/train-conductor-intro';if(process.env.CONDUCTOR_CAPTURE)fs.mkdirSync(dir,{recursive:true});
 for(const t of [0,30,60,90,120,150,180,210,240,299,300]){await page.locator('#conductor-checkpoint').selectOption(String(t));assert.equal(await f.evaluate(()=>__game.G.state),t<300?'bossintro':'play');if(process.env.CONDUCTOR_CAPTURE){for(const size of [960,480]){if(size===480)await page.locator('#scale').click();await f.locator('canvas').screenshot({path:`${dir}/${t}-${size}.png`});if(size===480)await page.locator('#scale').click();}}}
 await page.locator('#conductor-checkpoint').selectOption('90');for(const key of ['conductorDesk','conductorActor']){await page.locator('#'+key).uncheck();assert.equal(await f.evaluate(k=>__game.G.train.review[k],key),false);if(process.env.CONDUCTOR_CAPTURE)await f.locator('canvas').screenshot({path:`${dir}/without-${key}.png`});await page.locator('#'+key).check();}
 if(process.env.CONDUCTOR_LIVE){await page.locator('#reset').click();await page.locator('#play').click();await page.waitForTimeout(5200);await page.locator('#play').click();assert.equal(await f.evaluate(()=>__game.G.state),'play');}
 console.log(JSON.stringify({checks,ui:'conductor checkpoints and layers passed',errors}));assert(checks.every(c=>c[1]),JSON.stringify(checks.filter(c=>!c[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
