const assert = require('node:assert/strict');
const fs = require('node:fs');
const {chromium} = require('playwright');
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 const page=await browser.newPage({viewport:{width:960,height:540}});
 const errors=[],badRequests=[];
 page.on('pageerror',e=>errors.push(e.message));
 page.on('response',r=>{if(r.status()>=400&&!/ending_art|crowd.json/.test(r.url()))badRequests.push(r.url());});
 await page.goto((process.env.GAME_URL||'http://localhost:8011')+'/?auto=travel');
 await page.waitForFunction(()=>window.__game?.G.state==='travel');
 const checks=await page.evaluate(async()=>{
  const game=window.__game, G=game.G, results=[];
  const check=(name,value)=>{results.push({name,pass:!!value});};
  const tap=(key,n=2)=>{game.press(key);game.step(n);game.release(key);game.step(2);};
  G.freezeTime=false;
  const {TRAVEL_DURATIONS,TRAVEL_ART,TRAVEL_FILES}=await import('/js/travel.js');
  const {readProgress,writeProgress,hasCleared}=await import('/js/progress.js');
  let migrated=readProgress({unlockedStage:0,actBest:{0:200}},game.STAGES);
  check('legacy Delhi score remains Delhi',migrated.actBest[1]===200&&!Object.hasOwn(migrated.actBest,0));
  check('legacy accessible levels retained',migrated.unlockedStage===1);
  check('new save starts with train',readProgress({},game.STAGES).unlockedStage===0&&game.STAGES[0].id==='train');
  const roundtrip=readProgress(writeProgress({...G,...migrated},game.STAGES),game.STAGES);
  check('save migration roundtrip',JSON.stringify(roundtrip)===JSON.stringify(migrated));
  check('unlock does not fabricate trophy',!hasCleared(migrated,0)&&hasCleared(migrated,1));
  game.hub();game.setPlayerPos(1474,220);tap('use');game.step(40);
  check('elevator needs destination',G.state==='hub'&&G.pendingDestination===null);
  game.setPlayerPos(800,220);tap('use');tap('attack');
  check('map selects destination without teleport',G.state==='hub'&&G.pendingDestination===0);
  game.setPlayerPos(1474,220);tap('use');game.step(40);
  check('walk-up elevator enters travel',G.state==='travel');
  game.press('attack');game.step(2);
  check('elevator cannot skip',G.travel.phase==='elevator');
  game.step(40);check('held skip cannot end descent',G.travel.phase==='elevator');game.release('attack');game.step(2);
  const cabinX=G.travel.x;game.press('right');game.step(30);game.release('right');
  check('CHAD walks inside elevator',G.travel.x>cabinX&&G.travel.walking);
  tap('pause');const before=G.travel.t;game.step(90);check('pause freezes journey',G.paused&&G.travel.t===before);tap('pause');
  check('elevator waits for button',G.travel.t===0);game.press('right');game.step(150);game.release('right');tap('use');check('button starts elevator',G.travel.started);
  game.step(TRAVEL_DURATIONS.elevator-G.travel.t);check('descent arrives naturally',G.travel.phase==='lobby');game.step(192);
  game.press('right');for(let i=0;i<600&&G.travel.x<827;i++)game.step(1);game.release('right');check('walk reaches lobby exit',Math.abs(G.travel.x-827)<8&&G.travel.greeted);tap('use');game.step(110);
  check('exit reaches car',G.travel.phase==='curb');
  tap('use');check('cannot board remotely',G.travel.phase==='curb');
  game.step(134);game.press('right');for(let i=0;i<300&&G.travel.x<402;i++)game.step(1);game.release('right');tap('use');check('board car at door',G.travel.phase==='car-board');
  game.step(TRAVEL_DURATIONS['car-board']);check('boarding enters drive',G.travel.phase==='drive');
  game.step(TRAVEL_DURATIONS.drive);check('drive enters apron arrival',G.travel.phase==='apron-arrival');game.step(60);
  game.press('right');for(let i=0;i<400&&G.travel.x<774;i++)game.step(1);game.release('right');tap('use');check('walk to stairs and board jet',G.travel.phase==='jet-board');
  for(const [p,n] of [['jet-board',180],['takeoff',270],['flight',360],['india-approach',300],['landing',300],['disembark',150],['papers',460]]){
   check('natural phase '+p,G.travel.phase===p);game.step(n-G.travel.t);
  }
  G.travel.x=968;G.travel.y=208;game.step(1);tap('use');game.step(35);check('arrival exit reaches train loading',G.state==='loading'&&G.stage.id==='train'&&!G.travel);
  game.step(150);check('loading holds until F',G.state==='loading');tap('use');game.step(30);check('loading reaches station entrance',G.state==='intro'&&G.stage.id==='train');
  game.step(510);check('station starts normal gameplay',G.state==='play'&&G.stage.id==='train'&&!!G.train);
  const saved={...TRAVEL_ART};for(const k of Object.keys(TRAVEL_ART))delete TRAVEL_ART[k];
  for(const p of ['elevator','lobby','curb','drive','apron','takeoff','flight','landing']){game.travel(p);game.step(3);game.render();}
  game.travel('arrival-exit');G.travel.x=968;G.travel.y=208;game.step(1);tap('use');game.step(35);game.render();check('missing artwork cannot trap arrival',G.state==='loading');Object.assign(TRAVEL_ART,saved);
  game.travel('elevator');tap('pause');tap('back');game.step(35);check('exit clears pending state',G.state==='title'&&!G.travel&&G.pendingDestination===null);
  game.travel('drive');game.step(2);tap('attack');check('repeat departure remains unskippable',G.travel.phase==='drive');
  const timing={};for(const phase of ['elevator','lobby','drive','apron','landing']){game.travel(phase);const start=performance.now();for(let i=0;i<60;i++)game.render();timing[phase]=(performance.now()-start)/60;}
  return {results,timing,assets:Object.keys(TRAVEL_FILES).length};
 });
 // Exercise native keyboard and standard gamepad mappings in the same page.
 await page.evaluate(()=>{window.__game.travel('lobby');window.__game.G.freezeTime=false;});
 await page.keyboard.down('ArrowRight');await page.waitForTimeout(220);await page.keyboard.up('ArrowRight');
 assert(await page.evaluate(()=>window.__game.G.travel.x>100),'keyboard walking');
 await page.evaluate(()=>{const pad={connected:true,axes:[1,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};window.testPad=pad;Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});window.__game.travel('lobby');window.__game.step(20);});
 assert(await page.evaluate(()=>window.__game.G.travel.x>100),'gamepad walking');
 await page.evaluate(()=>{window.testPad.axes=[0,0];window.__game.G.travel.x=827;window.testPad.buttons[4]={pressed:true,value:1};window.__game.step(111);});
 assert(await page.evaluate(()=>window.__game.G.travel.phase==='curb'),'gamepad boarding');
 if(process.argv.includes('--screenshots')){
  await page.evaluate(()=>{Object.defineProperty(navigator,'getGamepads',{value:()=>[]});});
  for(const [phase,t] of [['elevator',350],['lobby',90],['curb',1],['drive',240],['apron',1],['takeoff',350],['flight',120],['landing',460],['loading',0]]){
   await page.evaluate(([p,t])=>{const g=window.__game;g.G.freezeTime=false;if(p==='loading')g.loading();else g.travel(p);g.step(t);g.G.freezeTime=true;g.G.fade=0;g.render();},[phase,t]);
   await page.screenshot({path:'/private/tmp/gachi-'+phase+'.png'});
  }
 }
 console.log(JSON.stringify({...checks,errors,badRequests},null,2));
 await browser.close();
 assert.equal(errors.length,0);assert.equal(badRequests.length,0);assert(checks.results.every(r=>r.pass),'journey checks failed');
})();
