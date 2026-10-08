// Exercise the public Studio API in real Chrome; gameplay checks remain separate.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {chromium}=require('playwright');
const base=process.env.GAME_URL||'http://localhost:8011';
const out='tmp/review/studio';
const saved={hiscore:712345,bestComboAll:17,unlockedStage:1,records:{train:{score:12345}}};
const tick=s=>s.tick??s.frame;
const identity=s=>s.scenarioId??s.id;
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const context=await browser.newContext({viewport:{width:1600,height:1050}});
  await context.addInitScript(value=>{if(!sessionStorage.getItem('studio-check-seeded')){localStorage.setItem('gigachadworldtour.save',JSON.stringify(value));sessionStorage.setItem('studio-check-seeded','yes');}},saved);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'/review.html');
  await page.waitForFunction(()=>window.__review?.listScenarios&&window.__review?.snapshot,{timeout:90000});
  const ids=await page.evaluate(()=>__review.listScenarios());
  assert(ids.length>10,'Registry must contain campaign scenarios and specialist tools');
  assert.equal(new Set(ids.map(s=>s.id)).size,ids.length,'Scenario IDs are unique');
  const load=async id=>{await page.evaluate(async id=>{await __review.load(id);__review.pause();},id);return page.evaluate(()=>__review.snapshot());};
  const selected=process.env.STUDIO_SCENARIOS?ids.filter(s=>process.env.STUDIO_SCENARIOS.split(',').includes(s.id)):ids;
  for(const scenario of selected){const s=await load(scenario.id);assert.equal(identity(s),scenario.id);assert.equal(s.playing,false,scenario.id+' loads paused');assert.equal(tick(s),0,scenario.id+' opens at frame zero');}
  const cinematic=ids.find(s=>/intro|escape/.test(s.id)&&/train|delhi/.test(s.id));
  assert(cinematic,'At least one deterministic cinematic');
  await load(cinematic.id);
  await page.evaluate(async()=>{await __review.seek(63);});
  let before=await page.evaluate(()=>__review.snapshot());assert.equal(tick(before),63);
  await page.evaluate(async()=>{await __review.step(-3);});assert.equal(tick(await page.evaluate(()=>__review.snapshot())),60);
  await page.evaluate(async()=>{await __review.step(3);});
  const replay=await page.evaluate(()=>__review.snapshot());assert.equal(tick(replay),63);
  if(before.engine&&replay.engine)assert.deepEqual(replay.engine,before.engine,'Backward replay reproduces actual engine state');
  await page.evaluate(async()=>{await __review.restart();});assert.equal(tick(await page.evaluate(()=>__review.snapshot())),0);
  await page.locator('#play').click();await page.waitForTimeout(180);await page.locator('#play').click();
  assert.equal((await page.evaluate(()=>__review.snapshot())).playing,false,'Focusing Pause must not restart playback');
  assert.equal(await page.locator('#play').innerText(),'Play cinematic','Pause immediately updates the visible button');
  const paused=await page.evaluate(()=>__review.snapshot());assert(tick(paused)>0,'Playback advances');
  await page.waitForTimeout(160);assert.equal(tick(await page.evaluate(()=>__review.snapshot())),tick(paused),'Pause freezes playback');
  await load('train/general');
  const startX=await page.evaluate(()=>__review.game.G.player.x);
  await page.evaluate(()=>__review.play());await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');await page.waitForTimeout(70);await page.evaluate(()=>__review.pause());
  const recorded=await page.evaluate(()=>__review.snapshot());assert(recorded.engine.player.x>startX,'Keyboard input reaches the focused game');
  await page.evaluate(()=>__review.seek(0));await page.evaluate(t=>__review.seek(t),tick(recorded));const inputReplay=await page.evaluate(()=>__review.snapshot());assert.deepEqual(inputReplay.engine,recorded.engine,'Recorded keyboard session replays exactly');
  await page.locator('#search').fill('vendor');assert.equal(await page.locator('#search').inputValue(),'vendor','Gameplay does not intercept search typing');
  await page.locator('#search').fill('');await page.evaluate(()=>__review.setMode('inspect'));
  await page.evaluate(n=>__review.setScale(+n),'1');assert.equal(await page.locator('#game').evaluate(e=>e.clientWidth),480);
  await page.evaluate(n=>__review.setScale(+n),'2');assert.equal(await page.locator('#game').evaluate(e=>e.clientWidth),960);
  await page.evaluate(()=>__review.setScale('fit'));assert(await page.locator('#game').evaluate(e=>e.clientWidth)>960,'The default display fills the space it has');
  const capture=await page.evaluate(()=>__review.capture(false));assert(capture.image.startsWith('data:image/png'));assert.equal(capture.metadata.scenarioId,'train/general');assert.equal(capture.metadata.tick,tick(recorded));
  await page.evaluate(()=>__review.load('delhi/market'));await page.evaluate(()=>__review.load('refund/calling'));await page.goBack();await page.waitForFunction(()=>__review.snapshot().scenarioId==='delhi/market');await page.goForward();await page.waitForFunction(()=>__review.snapshot().scenarioId==='refund/calling');
  fs.mkdirSync(out,{recursive:true});
  await page.screenshot({path:out+'/desktop.png',fullPage:true});
  await page.setViewportSize({width:900,height:800});await page.screenshot({path:out+'/narrow.png',fullPage:true});
  assert.equal(await page.evaluate(()=>localStorage.getItem('gigachadworldtour.save')),JSON.stringify(saved),'Scenario review never writes campaign progress');
  await load('trip/lobby');await page.evaluate(()=>__review.setSettings({motion:'right'}));const motionStart=await page.evaluate(()=>__review.game.G.travel.x);await page.evaluate(()=>__review.seek(30));const motionFirst=await page.evaluate(()=>({snapshot:__review.snapshot().engine,x:__review.game.G.travel.x}));assert(motionFirst.x>motionStart,'Scripted walking advances while seeking');await page.evaluate(()=>__review.seek(0));await page.evaluate(()=>__review.seek(30));assert.deepEqual(await page.evaluate(()=>({snapshot:__review.snapshot().engine,x:__review.game.G.travel.x})),motionFirst,'Scripted motion replays exactly');
  await page.evaluate(()=>__review.load('tools/presentation'));const hiddenStart=await page.evaluate(()=>__review.game.G.rawTime);await page.evaluate(()=>__review.seek(75));assert.equal(tick(await page.evaluate(()=>__review.snapshot())),75);await page.evaluate(()=>__review.step(-3));assert.equal(tick(await page.evaluate(()=>__review.snapshot())),72);await page.evaluate(()=>__review.play());await page.waitForTimeout(150);await page.evaluate(()=>__review.pause());assert(tick(await page.evaluate(()=>__review.snapshot()))>72);assert.equal(await page.evaluate(()=>__review.game.G.rawTime),hiddenStart,'Specialist play never resumes hidden game');
  const links=[['train/escape','train'],['delhi/vendor','delhi'],['refund/calling','refund']];
  for(const [id,stage]of links){await page.goto(base+'/review.html?scenario='+encodeURIComponent(id)+'&t=30');await page.waitForFunction(()=>window.__review?.snapshot?.()?.tick===30,{timeout:90000});const s=await page.evaluate(()=>__review.snapshot());assert(identity(s).includes(stage));assert.equal(s.playing,false);}
  assert.deepEqual(errors,[],'No browser exceptions');
  console.log(JSON.stringify({registry:ids.length,loaded:selected.length,replay:true,pause:true,saveIsolation:true,deepLinks:links.length,keyboardReplay:true,history:true,specialistAPI:true,captureMetadata:true,screenshots:out,errors}));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
