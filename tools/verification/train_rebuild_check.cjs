const assert=require('node:assert/strict'),{chromium}=require('playwright');
(async()=>{const browser=await chromium.launch({channel:'chrome',headless:true});try{
 const page=await browser.newPage({viewport:{width:960,height:540}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:8011/?auto=walk');await page.waitForFunction(()=>__game?.G.state==='play');
 const results=await page.evaluate(async()=>{
  const g=__game,G=g.G,out=[],check=(name,value)=>out.push([name,!!value]);
  const {ASSETS}=await import('./js/assets.js'),{createBoss}=await import('./js/bosses.js'),{startTrainCinematic}=await import('./js/train.js');
  const step=n=>{G.hitstop=0;G.slowmo=0;g.step(n)};const fresh=a=>{g.release(a);step(1);g.press(a);step(1);g.release(a);step(1)};
  const start=()=>{g.resetInput();g.stage(0);G.freezeTime=true;G.fade=0;G.hitstop=0;G.player.invuln=999999};
  // Preparation must be silent even though startStage normally selects a track.
  const music=G.audio.music,slots=[];G.audio.music=function(s,...a){slots.push(s);return music.call(this,s,...a)};
  g.loading();step(900);check('loading waits and selects no level track',G.state==='loading'&&slots.every(s=>!s));
  fresh('attack');check('attack cannot confirm card',G.state==='loading');fresh('use');step(30);check('confirmation starts station intro and music',G.state==='intro'&&slots.at(-1)==='stage2a');G.audio.music=music;
  g.trainScene('intro',142);const intro=JSON.stringify(G.train);g.render();g.render();check('ticket intro renders without state mutation',JSON.stringify(G.train)===intro);step(4);check('barrier impact retains cinematic control',G.state==='intro'&&G.player.x===270&&G.player.y>200);step(340);check('ticket gag releases normal play',G.state==='play'&&G.player.x>=380);
  start();check('office enforcers expand route before the inspector',G.stage.waves.filter(w=>!w.boss).length===13&&G.stage.waves.filter(w=>w.boss).length===1&&G.stage.waves[7].spawns.length===2&&G.stage.waves[8].miniboss==='conductor');
  check('all wave skins are newly generated',G.stage.waves.every(w=>w.spawns.every(s=>s.startsWith('nr_'))));
  G.waveIndex=3;G.player.x=2730;G.camX=2450;G.train.arrival=240;
  step(1);check('platform camera hides coach interior',G.camX<=2400);
  g.press('use');G.train.gate=true;step(5);check('held interaction cannot board',!G.train.cinematic);
  g.release('use');step(1);G.player.z=30;fresh('use');check('airborne interaction cannot board',!G.train.cinematic);G.player.z=0;G.player.vz=0;G.player.state='idle';fresh('use');check('fresh grounded interaction boards',G.train.cinematic?.kind==='boarding');
  const c=G.train.cinematic.t;fresh('pause');const paused=G.train.cinematic.t;step(90);check('boarding pauses',G.paused&&G.train.cinematic.t===paused);fresh('pause');fresh('attack');check('attack does not skip boarding',G.train.cinematic?.kind==='boarding');step(140);check('boarding restores general coach',G.state==='play'&&G.train.aboard&&G.player.x>=2880&&G.train.checkpoint===2880);
  g.press('right');step(15);g.release('right');check('walking after boarding',G.player.x>2940);fresh('jump');step(4);check('jumping after boarding',G.player.z>0);G.player.z=0;G.player.state='idle';fresh('dashR');check('dashing after boarding',['dash','run'].includes(G.player.state));
  G.locked=false;G.waveActive=false;G.enemies=[];G.spawnQueue=[];G.waveIndex=7;G.player.x=6260;step(1);check('pantry checkpoint',G.train.checkpoint===6240);
  G.player.x=7250;G.waveIndex=9;step(1);check('preboss checkpoint',G.train.checkpoint===7200);const score=G.train.checkpointScore;G.score+=900;G.train.climbed=true;g.trainCheckpoint();check('checkpoint resets progress safely',G.player.x===7260&&G.score===score&&!G.train.climbed&&!G.boss&&G.train.scene===2);
  start();G.train.aboard=true;G.player.x=3000;step(900);check('time alone cannot reveal city',G.train.scene===0);G.player.x=4500;step(1);check('industrial reveal by milestone',G.train.scene===1);G.player.x=7400;step(1);check('dawn city by milestone',G.train.scene===2);
  start();G.train.aboard=true;G.camX=G.camLock=7680;G.player.x=7840;G.locked=true;G.waveIndex=G.stage.waves.length-1;const b=createBoss('vikram',8010,218);
  b.hurt(9999,1,true,true);check('interior cannot be one-shot past roof',b.hp===b.maxhp/2&&!b.dead&&G.train.cinematic?.kind==='roof');step(425);check('roof transition preserves actor state',G.train.climbed&&b.x>8160&&G.player.x>8160&&G.locked);
  for(const e of G.enemies)e.hurt(9999,1,true,true);step(2);G.player.x=8900;G.camX=8640;step(1);b.hurt(9999,1,true,true);step(1);check('boss defeat begins river escape',G.train.cinematic?.kind==='escape');fresh('pause');const t=G.train.cinematic.t;step(60);check('escape pauses',G.train.cinematic.t===t);fresh('pause');step(1250);step(80);check('escape finishes stage once',G.train.endingDone&&G.state==='clear');
  start();check('new run resets encounter and milestones',!G.train.aboard&&!G.train.climbed&&!G.train.cinematic&&G.train.checkpoint===0&&G.train.scene===0);
  const art=Object.fromEntries(Object.entries(ASSETS).filter(([k])=>k.startsWith('nr_')||k.startsWith('prop_nr_')));for(const k in art)ASSETS[k]=null;
  G.waveIndex=3;G.player.x=2730;G.camX=2450;G.train.arrival=240;step(1);fresh('use');g.render();step(140);check('missing art still boards',G.train.aboard&&!G.train.cinematic);startTrainCinematic('escape');g.render();step(1201);check('missing art still completes escape',G.train.endingDone);Object.assign(ASSETS,art);
  // Simulated controller interaction and held LB gating use the real input poller.
  start();G.waveIndex=3;G.player.x=2730;G.camX=2450;G.train.arrival=240;step(1);const pad={connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[pad]});step(1);pad.buttons[4]={pressed:true,value:1};step(1);check('LB boards through gamepad input',G.train.cinematic?.kind==='boarding');pad.buttons[4]={pressed:false,value:0};Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>[]});g.resetInput();
  start();G.train.aboard=true;G.train.checkpoint=7950;G.train.checkpointScore=G.score;g.trainCheckpoint();step(1);check('boss retry begins at interior reveal',G.state==='bossintro'&&G.boss?.key==='vikram'&&!G.boss.roof&&G.waveIndex===G.stage.waves.length-1);
  start();G.camX=7200;G.player.x=7370;const guard=g.spawn('nr_guard',32,0);guard.state='idle';guard.face=-1;const hp=guard.hp;guard.hurt(8,1,false,false);check('bodyguard blocks frontal jab',guard.state==='block'&&guard.hp===hp);guard.hurt(12,1,true,false);check('heavy attack breaks guard',guard.hp<hp);
  const heavy=g.spawn('nr_heavy',110,0);heavy.rig.hurt(999,1);check('suitcase break changes appearance and behavior',heavy.ramGone&&heavy.set._aiKey==='nr_heavy_unarmed'&&heavy.baseSpeed>1);
  fresh('pause');fresh('back');step(30);check('quit clears train state',G.state==='title'&&G.train===null);
  start();
  const snapshot=JSON.stringify(G.train);g.render();g.render();check('render leaves route state unchanged',snapshot===JSON.stringify(G.train));
  return out;
 });
 console.log(JSON.stringify({checks:results.length,failures:results.filter(x=>!x[1]),errors}));assert(results.every(x=>x[1]),JSON.stringify(results.filter(x=>!x[1])));assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1});
